import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';

const ONBOARDING_COMPLETE_KEY = 'onboarding_completed';

interface PendingLevelUp {
  previousTier: string;
  newTier: string;
  totalPoints: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  isRecoveringPassword: boolean;
  signUp: (email: string, password: string, firstName: string, surname: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ error: Error | null }>;
  resendVerification: () => Promise<{ error: Error | null }>;
  refreshUser: () => Promise<void>;
  completeOnboarding: () => Promise<{ error: Error | null }>;
  updateNotificationPermission: (status: 'not_asked' | 'granted' | 'denied' | 'dismissed') => Promise<void>;
  shouldShowOnboarding: () => boolean;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  verifyPasswordResetOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  finishPasswordRecovery: () => void;
  checkPendingLevelUp: () => Promise<PendingLevelUp | null>;
  clearPendingLevelUp: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    let isInitialized = false;

    // 5-second failsafe timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!isInitialized) {
        console.warn('Auth initialization timed out after 5 seconds');
        setIsLoading(false);
      }
    }, 5000);

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProfile(session.user.id, session.user.email);
        } else {
          setIsLoading(false);
        }
        isInitialized = true;
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        setIsLoading(false);
        isInitialized = true;
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

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
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

      // Ensure auth_id is set (maps Supabase Auth UUID to this user record)
      if (data && !data.auth_id && userId) {
        await supabase
          .from('users')
          .update({ auth_id: userId })
          .eq('email', email);
        console.log('Set auth_id for user:', userId);
      }

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
    } catch (error: any) {
      console.error('Error fetching user profile:', error);

      // If user profile not found (deleted user), sign them out
      if (error?.code === 'PGRST116') {
        console.log('User profile not found - signing out');
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, surname: string) => {
    try {
      console.log('Starting signup for:', email);

      // Clear any existing local storage onboarding flag for this email
      // This ensures new signups don't inherit old onboarding state
      const localOnboardingKey = `${ONBOARDING_COMPLETE_KEY}_${email}`;
      await AsyncStorage.removeItem(localOnboardingKey);

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

      // Create or reset user profile in users table
      if (data.user) {
        console.log('Setting up user profile...');

        // Check if user profile already exists (e.g., from previous signup attempt)
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (existingUser) {
          // Reset existing user profile for new signup
          console.log('Resetting existing user profile...');
          const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update({
              first_name: firstName,
              surname,
              loyalty_points: 0,
              loyalty_tier: 'Ping Local Member',
              verified: false,
              onboarding_completed: false,
              notification_permission_status: 'not_asked',
              updated: new Date().toISOString(),
              auth_id: data.user.id, // Map Supabase Auth UUID to this user
            })
            .eq('email', email)
            .select();

          if (updateError) {
            console.error('Profile update error:', updateError);
            throw updateError;
          }
          console.log('Profile reset successful:', updateData);
        } else {
          // Create new user profile
          console.log('Creating new user profile...');
          const { data: insertData, error: profileError } = await supabase.from('users').insert({
            email,
            first_name: firstName,
            surname,
            loyalty_points: 0,
            loyalty_tier: 'Ping Local Member',
            verified: false,
            onboarding_completed: false,
            notification_permission_status: 'not_asked',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            is_admin: false,
            is_business: false,
            api_requires_sync: false,
            auth_id: data.user.id, // Map Supabase Auth UUID to this user
          }).select();

          if (profileError) {
            console.error('Profile insert error:', profileError);
            throw profileError;
          }
          console.log('Profile insert successful:', insertData);
        }
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
      console.log('completeOnboarding called, user:', user);
      if (!user) {
        console.error('completeOnboarding: No user found in state');
        return { error: new Error('No user logged in') };
      }

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
      console.log('updateNotificationPermission called, status:', status, 'user:', user?.email);
      if (!user) {
        console.error('updateNotificationPermission: No user found in state');
        return;
      }

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

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyPasswordResetOtp = async (email: string, token: string) => {
    try {
      // Set flag to prevent navigation while in recovery mode
      setIsRecoveringPassword(true);
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (error) {
        setIsRecoveringPassword(false);
        throw error;
      }
      return { error: null };
    } catch (error) {
      setIsRecoveringPassword(false);
      return { error: error as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    console.log('[AuthContext] updatePassword called');
    try {
      // Check current session state
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('[AuthContext] Current session:', {
        hasSession: !!sessionData.session,
        userId: sessionData.session?.user?.id,
        email: sessionData.session?.user?.email
      });

      if (!sessionData.session) {
        throw new Error('No active session for password update');
      }

      console.log('[AuthContext] Calling Supabase REST API to update password...');

      // Use the Supabase REST API directly to avoid the hanging issue with supabase.auth.updateUser
      const response = await fetch(
        'https://pyufvauhjqfffezptuxl.supabase.co/auth/v1/user',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dWZ2YXVoanFmZmZlenB0dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTExMDQsImV4cCI6MjA3OTMyNzEwNH0.IEhzK1gNDqaS2q9656CBsx9JZBRHYZAfHYYKIVd4S5g',
          },
          body: JSON.stringify({ password: newPassword }),
        }
      );

      console.log('[AuthContext] REST API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthContext] REST API error:', errorData);
        throw new Error(errorData.message || errorData.error_description || 'Failed to update password');
      }

      console.log('[AuthContext] Password updated successfully');

      // Don't clear recovery flag here - let the calling screen handle it
      // via finishPasswordRecovery() after showing success message
      return { error: null };
    } catch (error) {
      console.error('[AuthContext] updatePassword error:', error);
      return { error: error as Error };
    }
  };

  const finishPasswordRecovery = () => {
    setIsRecoveringPassword(false);
  };

  const checkPendingLevelUp = async (): Promise<PendingLevelUp | null> => {
    try {
      if (!user) return null;

      // Refresh user data to get latest pending_level_up status
      const { data, error } = await supabase
        .from('users')
        .select('pending_level_up, pending_level_up_from, pending_level_up_to, loyalty_points')
        .eq('email', user.email)
        .single();

      if (error || !data) return null;

      if (data.pending_level_up && data.pending_level_up_from && data.pending_level_up_to) {
        return {
          previousTier: data.pending_level_up_from,
          newTier: data.pending_level_up_to,
          totalPoints: data.loyalty_points || 0,
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking pending level up:', error);
      return null;
    }
  };

  const clearPendingLevelUp = async () => {
    try {
      if (!user) return;

      await supabase
        .from('users')
        .update({
          pending_level_up: false,
          pending_level_up_from: null,
          pending_level_up_to: null,
        })
        .eq('email', user.email);

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        pending_level_up: false,
        pending_level_up_from: undefined,
        pending_level_up_to: undefined,
      } : prev);
    } catch (error) {
      console.error('Error clearing pending level up:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        supabaseUser,
        isLoading,
        isRecoveringPassword,
        signUp,
        signIn,
        signOut,
        verifyEmail,
        resendVerification,
        refreshUser,
        completeOnboarding,
        updateNotificationPermission,
        shouldShowOnboarding,
        requestPasswordReset,
        verifyPasswordResetOtp,
        updatePassword,
        finishPasswordRecovery,
        checkPendingLevelUp,
        clearPendingLevelUp,
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
