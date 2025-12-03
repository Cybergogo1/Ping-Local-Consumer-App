import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';

const ONBOARDING_COMPLETE_KEY = 'onboarding_completed';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  signUp: (email: string, password: string, firstName: string, surname: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ error: Error | null }>;
  resendVerification: () => Promise<{ error: Error | null }>;
  refreshUser: () => Promise<void>;
  completeOnboarding: () => Promise<{ error: Error | null }>;
  updateNotificationPermission: (status: 'not_asked' | 'granted' | 'denied' | 'dismissed') => Promise<void>;
  shouldShowOnboarding: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      // Query by email since the users table (from Adalo) uses numeric IDs
      // while Supabase Auth uses UUIDs
      if (!email) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        email = authUser?.email;
      }

      if (!email) {
        console.error('No email available to fetch user profile');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;

      // Check local storage for onboarding completion as fallback
      const localOnboardingKey = `${ONBOARDING_COMPLETE_KEY}_${email}`;
      const localOnboardingComplete = await AsyncStorage.getItem(localOnboardingKey);

      // Use local storage value if DB says false but local says true
      // This handles cases where DB update failed but user did complete onboarding
      const effectiveOnboardingComplete = data?.onboarding_completed || localOnboardingComplete === 'true';

      console.log('Fetched user profile:', {
        id: data?.id,
        email: data?.email,
        db_onboarding_completed: data?.onboarding_completed,
        local_onboarding_completed: localOnboardingComplete,
        effective_onboarding_completed: effectiveOnboardingComplete
      });

      // Set user with effective onboarding status
      setUser({
        ...data,
        onboarding_completed: effectiveOnboardingComplete
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, surname: string) => {
    try {
      console.log('Starting signup for:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, surname },
        },
      });

      if (error) {
        console.error('Auth signup error:', error);
        throw error;
      }

      console.log('Auth signup successful, user:', data.user?.id);

      // Create user profile in users table (Adalo format - uses auto-increment integer ID)
      // Don't specify 'id' - let the database auto-generate it
      if (data.user) {
        console.log('Inserting into users table...');
        const { data: insertData, error: profileError } = await supabase.from('users').insert({
          email,
          first_name: firstName,
          surname,
          loyalty_points: 0,
          loyalty_tier: 'Ping Local Member',
          verified: false,
          onboarding_completed: false,
          notification_permission_status: 'not_asked',
        }).select();

        if (profileError) {
          console.error('Profile insert error:', profileError);
          throw profileError;
        }

        console.log('Profile insert successful:', insertData);
      }

      return { error: null };
    } catch (error) {
      console.error('SignUp caught error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const verifyEmail = async (token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token,
        type: 'email',
        email: supabaseUser?.email || '',
      });

      if (error) throw error;

      // Update user profile
      if (user) {
        await supabase
          .from('users')
          .update({ verified: true })
          .eq('id', user.id);

        await refreshUser();
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: supabaseUser?.email || '',
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshUser = async () => {
    if (supabaseUser) {
      await fetchUserProfile(supabaseUser.id);
    }
  };

  const completeOnboarding = async () => {
    try {
      if (!user) return { error: new Error('No user logged in') };

      console.log('Completing onboarding for user:', user.id, 'email:', user.email);

      // Save to local storage FIRST as reliable fallback
      const localOnboardingKey = `${ONBOARDING_COMPLETE_KEY}_${user.email}`;
      await AsyncStorage.setItem(localOnboardingKey, 'true');
      console.log('Onboarding saved to local storage');

      // Then try to save to database
      const { data, error } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('email', user.email)
        .select();

      if (error) {
        console.error('Database update failed (but local storage saved):', error);
        // Don't throw - local storage will handle persistence
      } else {
        console.log('Onboarding marked complete in DB:', data);
      }

      // Update local state immediately
      setUser(prev => prev ? { ...prev, onboarding_completed: true } : prev);

      console.log('User state updated - onboarding complete');
      return { error: null };
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return { error: error as Error };
    }
  };

  const updateNotificationPermission = async (status: 'not_asked' | 'granted' | 'denied' | 'dismissed') => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({ notification_permission_status: status })
        .eq('email', user.email);

      if (error) throw error;

      // Update local state immediately
      setUser(prev => prev ? { ...prev, notification_permission_status: status } : prev);
    } catch (error) {
      console.error('Error updating notification permission:', error);
    }
  };

  const shouldShowOnboarding = () => {
    if (!user || !supabaseUser) return false;
    return supabaseUser.email_confirmed_at !== null && !user.onboarding_completed;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        supabaseUser,
        isLoading,
        signUp,
        signIn,
        signOut,
        verifyEmail,
        resendVerification,
        refreshUser,
        completeOnboarding,
        updateNotificationPermission,
        shouldShowOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
