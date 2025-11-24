import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FavouritesStackParamList } from '../types/navigation';
import FavoritesScreen from '../screens/main/FavoritesScreen';
import OfferDetailScreen from '../screens/main/OfferDetailScreen';
import BusinessDetailScreen from '../screens/main/BusinessDetailScreen';
import SlotBookingScreen from '../screens/claim/SlotBookingScreen';
import ExternalBookingScreen from '../screens/claim/ExternalBookingScreen';
import ClaimScreen from '../screens/claim/ClaimScreen';
import ClaimSuccessScreen from '../screens/claim/ClaimSuccessScreen';

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
      <Stack.Screen name="SlotBooking" component={SlotBookingScreen} />
      <Stack.Screen name="ExternalBooking" component={ExternalBookingScreen} />
      <Stack.Screen name="Claim" component={ClaimScreen} />
      <Stack.Screen name="ClaimSuccess" component={ClaimSuccessScreen} />
    </Stack.Navigator>
  );
}
