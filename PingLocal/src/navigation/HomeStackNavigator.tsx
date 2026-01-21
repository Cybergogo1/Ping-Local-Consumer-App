import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeStackParamList } from '../types/navigation';

import HomeScreen from '../screens/main/HomeScreen';
import MapScreen from '../screens/main/MapScreen';
import OfferDetailScreen from '../screens/main/OfferDetailScreen';
import BusinessDetailScreen from '../screens/main/BusinessDetailScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import NotificationDetailScreen from '../screens/main/NotificationDetailScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import ChangePasswordScreen from '../screens/main/ChangePasswordScreen';
import NotificationPreferencesScreen from '../screens/main/NotificationPreferencesScreen';
import FAQsScreen from '../screens/main/FAQsScreen';
import OnboardingReplayScreen from '../screens/onboarding/OnboardingReplayScreen';

// Claim flow screens
import SlotBookingScreen from '../screens/claim/SlotBookingScreen';
import ExternalBookingScreen from '../screens/claim/ExternalBookingScreen';
import ClaimScreen from '../screens/claim/ClaimScreen';
import ClaimSuccessScreen from '../screens/claim/ClaimSuccessScreen';
import LevelUpScreen from '../screens/claim/LevelUpScreen';

const Stack = createStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeFeed" component={HomeScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
      <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="FAQs" component={FAQsScreen} />
      <Stack.Screen name="OnboardingReplay" component={OnboardingReplayScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
      {/* Claim Flow */}
      <Stack.Screen name="SlotBooking" component={SlotBookingScreen} />
      <Stack.Screen name="ExternalBooking" component={ExternalBookingScreen} />
      <Stack.Screen name="Claim" component={ClaimScreen} />
      <Stack.Screen name="ClaimSuccess" component={ClaimSuccessScreen} />
      <Stack.Screen name="LevelUp" component={LevelUpScreen} />
    </Stack.Navigator>
  );
}
