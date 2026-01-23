import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ClaimedStackParamList } from '../types/navigation';

import ClaimedScreen from '../screens/main/ClaimedScreen';
import OfferDetailScreen from '../screens/main/OfferDetailScreen';
import QRCodeScreen from '../screens/redemption/QRCodeScreen';
import RedemptionWaitingScreen from '../screens/redemption/RedemptionWaitingScreen';
import RedemptionSuccessScreen from '../screens/redemption/RedemptionSuccessScreen';
import BillConfirmationScreen from '../screens/redemption/BillConfirmationScreen';
import BillDisputeWaitingScreen from '../screens/redemption/BillDisputeWaitingScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import NotificationDetailScreen from '../screens/main/NotificationDetailScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import ChangePasswordScreen from '../screens/main/ChangePasswordScreen';
import NotificationPreferencesScreen from '../screens/main/NotificationPreferencesScreen';
import FAQsScreen from '../screens/main/FAQsScreen';
import OnboardingReplayScreen from '../screens/onboarding/OnboardingReplayScreen';

const Stack = createStackNavigator<ClaimedStackParamList>();

export default function ClaimedStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ClaimedMain" component={ClaimedScreen} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="FAQs" component={FAQsScreen} />
      <Stack.Screen name="OnboardingReplay" component={OnboardingReplayScreen} />
      <Stack.Screen
        name="QRCode"
        component={QRCodeScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="RedemptionWaiting" component={RedemptionWaitingScreen} />
      <Stack.Screen name="RedemptionSuccess" component={RedemptionSuccessScreen} />
      <Stack.Screen name="BillConfirmation" component={BillConfirmationScreen} />
      <Stack.Screen name="BillDisputeWaiting" component={BillDisputeWaitingScreen} />
    </Stack.Navigator>
  );
}
