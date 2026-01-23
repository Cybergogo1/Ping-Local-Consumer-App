import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FavouritesStackParamList } from '../types/navigation';
import FavoritesScreen from '../screens/main/FavoritesScreen';
import OfferDetailScreen from '../screens/main/OfferDetailScreen';
import BusinessDetailScreen from '../screens/main/BusinessDetailScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import NotificationDetailScreen from '../screens/main/NotificationDetailScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import ChangePasswordScreen from '../screens/main/ChangePasswordScreen';
import NotificationPreferencesScreen from '../screens/main/NotificationPreferencesScreen';
import FAQsScreen from '../screens/main/FAQsScreen';
import OnboardingReplayScreen from '../screens/onboarding/OnboardingReplayScreen';
import SlotBookingScreen from '../screens/claim/SlotBookingScreen';
import ExternalBookingScreen from '../screens/claim/ExternalBookingScreen';
import ClaimScreen from '../screens/claim/ClaimScreen';
import ClaimSuccessScreen from '../screens/claim/ClaimSuccessScreen';
import LevelUpScreen from '../screens/claim/LevelUpScreen';

const Stack = createStackNavigator<FavouritesStackParamList>();

export default function FavouritesStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="FavouritesMain" component={FavoritesScreen} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
      <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="FAQs" component={FAQsScreen} />
      <Stack.Screen name="OnboardingReplay" component={OnboardingReplayScreen} />
      <Stack.Screen name="SlotBooking" component={SlotBookingScreen} />
      <Stack.Screen name="ExternalBooking" component={ExternalBookingScreen} />
      <Stack.Screen name="Claim" component={ClaimScreen} />
      <Stack.Screen name="ClaimSuccess" component={ClaimSuccessScreen} />
      <Stack.Screen name="LevelUp" component={LevelUpScreen} />
    </Stack.Navigator>
  );
}
