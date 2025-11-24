import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeStackParamList } from '../types/navigation';

import HomeScreen from '../screens/main/HomeScreen';
import MapScreen from '../screens/main/MapScreen';
import OfferDetailScreen from '../screens/main/OfferDetailScreen';
import BusinessDetailScreen from '../screens/main/BusinessDetailScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

// Claim flow screens
import SlotBookingScreen from '../screens/claim/SlotBookingScreen';
import ExternalBookingScreen from '../screens/claim/ExternalBookingScreen';
import ClaimScreen from '../screens/claim/ClaimScreen';
import ClaimSuccessScreen from '../screens/claim/ClaimSuccessScreen';

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
      {/* Claim Flow */}
      <Stack.Screen name="SlotBooking" component={SlotBookingScreen} />
      <Stack.Screen name="ExternalBooking" component={ExternalBookingScreen} />
      <Stack.Screen name="Claim" component={ClaimScreen} />
      <Stack.Screen name="ClaimSuccess" component={ClaimSuccessScreen} />
    </Stack.Navigator>
  );
}
