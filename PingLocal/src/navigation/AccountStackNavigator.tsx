import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AccountStackParamList } from '../types/navigation';
import AccountScreen from '../screens/main/AccountScreen';
import LoyaltyTiersScreen from '../screens/main/LoyaltyTiersScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import NotificationDetailScreen from '../screens/main/NotificationDetailScreen';
import NotificationPreferencesScreen from '../screens/main/NotificationPreferencesScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import FAQsScreen from '../screens/main/FAQsScreen';
import OnboardingReplayScreen from '../screens/onboarding/OnboardingReplayScreen';

const Stack = createStackNavigator<AccountStackParamList>();

export default function AccountStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AccountMain" component={AccountScreen} />
      <Stack.Screen name="LoyaltyTiers" component={LoyaltyTiersScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="FAQs" component={FAQsScreen} />
      <Stack.Screen name="OnboardingReplay" component={OnboardingReplayScreen} />
    </Stack.Navigator>
  );
}
