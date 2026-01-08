import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types/navigation';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, user, supabaseUser, isLoading, isRecoveringPassword } = useAuth();

  // Keep loading if:
  // 1. Initial auth state is loading, OR
  // 2. We have a session but user profile hasn't loaded yet (unless recovering password)
  if (isLoading || (session && !user && !isRecoveringPassword)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#36566F" />
      </View>
    );
  }

  const isEmailVerified = Boolean(supabaseUser?.email_confirmed_at);
  const isOnboardingComplete = user?.onboarding_completed === true;

  console.log('RootNavigator state:', {
    hasSession: !!session,
    isEmailVerified,
    isOnboardingComplete,
    isRecoveringPassword,
    userId: user?.id,
  });

  // Create a unique key based on navigation state to force re-render
  const navigationKey = `${!!session}-${isEmailVerified}-${isOnboardingComplete}`;

  // During password recovery, keep user in Auth flow to complete password reset
  // Also show Auth for non-authenticated or non-verified users
  if (!session || !isEmailVerified || isRecoveringPassword) {
    return (
      <Stack.Navigator key="auth" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
      </Stack.Navigator>
    );
  }

  if (!isOnboardingComplete) {
    return (
      <Stack.Navigator key="onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      </Stack.Navigator>
    );
  }

  // Everything complete - show main app
  // Note: Onboarding replay is handled via AccountStack (OnboardingReplayScreen)
  return (
    <Stack.Navigator
      key="main"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Main" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
