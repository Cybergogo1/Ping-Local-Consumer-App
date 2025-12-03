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
  const { session, user, supabaseUser, isLoading } = useAuth();

  if (isLoading) {
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
    userId: user?.id,
  });

  // Create a unique key based on navigation state to force re-render
  const navigationKey = `${!!session}-${isEmailVerified}-${isOnboardingComplete}`;

  return (
    <Stack.Navigator key={navigationKey} screenOptions={{ headerShown: false }}>
      {!session ? (
        // Not logged in - show auth screens
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !isEmailVerified ? (
        // Has session but not verified - keep in auth flow
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !isOnboardingComplete ? (
        // Verified but onboarding not complete - show onboarding
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        // Everything complete - show main app
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        </>
      )}
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
