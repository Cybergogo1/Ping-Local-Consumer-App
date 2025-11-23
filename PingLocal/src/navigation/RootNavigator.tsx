import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types/navigation';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#36566F" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        // Not logged in - show auth screens
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !user?.is_verified ? (
        // Logged in but not verified - stay in auth for verification
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !user?.has_completed_onboarding ? (
        // Verified but hasn't completed onboarding
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        // Fully authenticated and onboarded
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
