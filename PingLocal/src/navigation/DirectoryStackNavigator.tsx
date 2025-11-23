import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DirectoryStackParamList } from '../types/navigation';

import DirectoryScreen from '../screens/main/DirectoryScreen';
import BusinessDetailScreen from '../screens/main/BusinessDetailScreen';
import OfferDetailScreen from '../screens/main/OfferDetailScreen';

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
    </Stack.Navigator>
  );
}
