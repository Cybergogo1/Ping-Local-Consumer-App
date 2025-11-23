import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';

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
        fetchUserProfile(session.user.id);
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
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, surname: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, surname },
        },
      });

      if (error) throw error;

      // Create user profile in users table
      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          email,
          first_name: firstName,
          surname,
          loyalty_points: 0,
          loyalty_tier: 'Ping Local Member',
          verified: false,
        });

        if (profileError) throw profileError;
      }

      return { error: null };
    } catch (error) {
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
