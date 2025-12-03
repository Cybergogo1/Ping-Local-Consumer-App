import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DirectoryStackParamList } from '../types/navigation';

import DirectoryScreen from '../screens/main/DirectoryScreen';
import BusinessDetailScreen from '../screens/main/BusinessDetailScreen';
import OfferDetailScreen from '../screens/main/OfferDetailScreen';

// Claim flow screens
import SlotBookingScreen from '../screens/claim/SlotBookingScreen';
import ExternalBookingScreen from '../screens/claim/ExternalBookingScreen';
import ClaimScreen from '../screens/claim/ClaimScreen';
import ClaimSuccessScreen from '../screens/claim/ClaimSuccessScreen';
import LevelUpScreen from '../screens/claim/LevelUpScreen';

const Stack = createStackNavigator<DirectoryStackParamList>();

export default function DirectoryStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="DirectoryMain" component={DirectoryScreen} />
      <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
      {/* Claim Flow */}
      <Stack.Screen name="SlotBooking" component={SlotBookingScreen} />
      <Stack.Screen name="ExternalBooking" component={ExternalBookingScreen} />
      <Stack.Screen name="Claim" component={ClaimScreen} />
      <Stack.Screen name="ClaimSuccess" component={ClaimSuccessScreen} />
      <Stack.Screen name="LevelUp" component={LevelUpScreen} />
    </Stack.Navigator>
  );
}
