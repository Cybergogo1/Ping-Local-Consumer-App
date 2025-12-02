import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';

import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51S0jaTD2e561klM22nIBz5A3AOE9t87uHy1XBaeTNB5W0tufDp2bH0andFHnxpm9BfiafXJZBYsaN5vYc6IXDycs00bQob2628';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    // Geologica weights
    'Geologica-Regular': require('./assets/fonts/Geologica-Regular.ttf'),
    'Geologica-Medium': require('./assets/fonts/Geologica-Medium.ttf'),
    'Geologica-SemiBold': require('./assets/fonts/Geologica-SemiBold.ttf'),
    'Geologica-Bold': require('./assets/fonts/Geologica-Bold.ttf'),
    // Montserrat weights
    'Montserrat-Regular': require('./assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('./assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-SemiBold': require('./assets/fonts/Montserrat-SemiBold.ttf'),
    'Montserrat-Bold': require('./assets/fonts/Montserrat-Bold.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.pinglocal"
      >
        <SafeAreaProvider>
          <AuthProvider>
            <NavigationContainer>
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </SafeAreaProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
