import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';

type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined' | null;

interface LocationContextType {
  userLocation: { latitude: number; longitude: number } | null;
  locationPermission: LocationPermissionStatus;
  isLocationLoading: boolean;
  requestLocation: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<LocationPermissionStatus>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  // Fetch location using fast strategy: last known first, then fresh
  const fetchLocation = useCallback(async () => {
    setIsLocationLoading(true);
    try {
      // Step 1: Try last known position first (instant if available)
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        setUserLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
      }

      // Step 2: Get fresh position with balanced accuracy (faster than high accuracy)
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: fresh.coords.latitude,
        longitude: fresh.coords.longitude,
      });
    } catch (error) {
      console.error('Error fetching location:', error);
      // Keep last known location if fresh fetch fails
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  // Check permission status and fetch location if already granted
  const checkPermissionAndFetch = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status === 'granted') {
      setLocationPermission('granted');
      // Permission already granted - fetch proactively in background
      fetchLocation();
    } else if (status === 'denied') {
      setLocationPermission('denied');
    } else {
      setLocationPermission('undetermined');
    }
  }, [fetchLocation]);

  // Request location permission and fetch location
  const requestLocation = useCallback(async (): Promise<boolean> => {
    setIsLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setLocationPermission('granted');
        await fetchLocation();
        return true;
      } else {
        setLocationPermission('denied');
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions in your device settings to sort by distance.'
        );
        setIsLocationLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setIsLocationLoading(false);
      return false;
    }
  }, [fetchLocation]);

  // Refresh location (force get fresh position)
  const refreshLocation = useCallback(async () => {
    if (locationPermission === 'granted') {
      await fetchLocation();
    }
  }, [locationPermission, fetchLocation]);

  // Proactively fetch location when user completes onboarding
  useEffect(() => {
    if (user?.onboarding_completed) {
      checkPermissionAndFetch();
    }
  }, [user?.onboarding_completed, checkPermissionAndFetch]);

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        locationPermission,
        isLocationLoading,
        requestLocation,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
