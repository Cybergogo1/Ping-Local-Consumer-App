import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeStackParamList } from '../types/navigation';

import HomeScreen from '../screens/main/HomeScreen';
import OfferDetailScreen from '../screens/main/OfferDetailScreen';
import BusinessDetailScreen from '../screens/main/BusinessDetailScreen';

const Stack = createStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeFeed" component={HomeScreen} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
      <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
    </Stack.Navigator>
  );
}
