import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ClaimedStackParamList } from '../types/navigation';

import ClaimedScreen from '../screens/main/ClaimedScreen';
import QRCodeScreen from '../screens/redemption/QRCodeScreen';
import RedemptionSuccessScreen from '../screens/redemption/RedemptionSuccessScreen';
import BillConfirmationScreen from '../screens/redemption/BillConfirmationScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';

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
      <Stack.Screen
        name="QRCode"
        component={QRCodeScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="RedemptionSuccess" component={RedemptionSuccessScreen} />
      <Stack.Screen name="BillConfirmation" component={BillConfirmationScreen} />
    </Stack.Navigator>
  );
}
