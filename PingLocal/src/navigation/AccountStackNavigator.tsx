import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AccountStackParamList } from '../types/navigation';
import AccountScreen from '../screens/main/AccountScreen';
import LoyaltyTiersScreen from '../screens/main/LoyaltyTiersScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

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
      {/* FAQs, EditProfile, Notifications screens to be added */}
    </Stack.Navigator>
  );
}
