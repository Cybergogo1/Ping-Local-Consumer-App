import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ClaimedStackParamList } from '../types/navigation';

import ClaimedScreen from '../screens/main/ClaimedScreen';
import QRCodeScreen from '../screens/redemption/QRCodeScreen';
import RedemptionWaitingScreen from '../screens/redemption/RedemptionWaitingScreen';
import RedemptionSuccessScreen from '../screens/redemption/RedemptionSuccessScreen';
import BillConfirmationScreen from '../screens/redemption/BillConfirmationScreen';
import BillDisputeWaitingScreen from '../screens/redemption/BillDisputeWaitingScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import NotificationDetailScreen from '../screens/main/NotificationDetailScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Stack = createStackNavigator<ClaimedStackParamList>();

export default function ClaimedStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ClaimedMain" component={ClaimedScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
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
