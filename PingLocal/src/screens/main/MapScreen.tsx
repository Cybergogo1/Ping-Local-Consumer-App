import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import { supabase } from '../../lib/supabase';
import { Business, Offer } from '../../types/database';
import { HomeStackParamList } from '../../types/navigation';

const { width } = Dimensions.get('window');

type MapScreenNavigationProp = StackNavigationProp<HomeStackParamList>;

interface BusinessWithOffers extends Business {
  offers?: Offer[];
  latitude?: number;
  longitude?: number;
}

// Default location (Wirral, UK - where Ping Local operates)
const DEFAULT_REGION = {
  latitude: 53.3727,
  longitude: -3.0738,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function MapScreen() {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  const [businesses, setBusinesses] = useState<BusinessWithOffers[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithOffers | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);

  useEffect(() => {
    requestLocationPermission();
    fetchBusinesses();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } else {
        setLocationPermission(false);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationPermission(false);
    }
  };

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      // Fetch all active businesses (same filter as DirectoryScreen)
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_signed_off', true);

      if (businessError) throw businessError;
      console.log('Map: Fetched businesses:', businessData?.length || 0);

      // Fetch all active offers
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('id, name, summary, price_discount, status, end_date, business_name')
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString());

      if (offersError) throw offersError;
      console.log('Map: Fetched offers:', offersData?.length || 0);

      // Group offers by business_name (since businesses table has no 'id' column)
      const offersByBusiness: Record<string, Offer[]> = {};
      (offersData || []).forEach((offer) => {
        const offerTyped = offer as Offer;
        if (offerTyped.business_name) {
          if (!offersByBusiness[offerTyped.business_name]) {
            offersByBusiness[offerTyped.business_name] = [];
          }
          offersByBusiness[offerTyped.business_name].push(offerTyped);
        }
      });
      console.log('Map: Businesses with offers:', Object.keys(offersByBusiness));

      // Filter businesses that have at least one active offer
      // and parse location data
      const businessesWithLocation = (businessData || [])
        .filter(business => {
          return offersByBusiness[business.name] && offersByBusiness[business.name].length > 0;
        })
        .map(business => {
          // Try to extract coordinates from location string
          // Format might be "lat,lng" or full address - we'll need geocoding for addresses
          let latitude: number | undefined;
          let longitude: number | undefined;

          // For now, generate random coordinates around Wirral for demo
          // In production, you'd geocode the address or store lat/lng in the database
          if (business.location_area) {
            const areaCoords: Record<string, { lat: number; lng: number }> = {
              'Oxton': { lat: 53.3847, lng: -3.0414 },
              'West Kirby': { lat: 53.3728, lng: -3.1840 },
              'Heswall': { lat: 53.3271, lng: -3.0977 },
              'Birkenhead': { lat: 53.3934, lng: -3.0145 },
              'Hoylake': { lat: 53.3900, lng: -3.1818 },
              'Bebington': { lat: 53.3511, lng: -3.0033 },
              'Wallasey': { lat: 53.4243, lng: -3.0486 },
            };

            const coords = areaCoords[business.location_area];
            if (coords) {
              // Add small random offset to prevent markers from overlapping
              latitude = coords.lat + (Math.random() - 0.5) * 0.01;
              longitude = coords.lng + (Math.random() - 0.5) * 0.01;
            }
          }

          // Default to Wirral center if no area match
          if (!latitude || !longitude) {
            latitude = 53.3727 + (Math.random() - 0.5) * 0.05;
            longitude = -3.0738 + (Math.random() - 0.5) * 0.05;
          }

          return {
            ...business,
            offers: offersByBusiness[business.name] || [],
            latitude,
            longitude,
          };
        });

      console.log('Map: Final businesses with location:', businessesWithLocation.length, businessesWithLocation.map(b => b.name));
      setBusinesses(businessesWithLocation);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkerPress = (business: BusinessWithOffers) => {
    setSelectedBusiness(business);
  };

  const handleBusinessPress = () => {
    if (selectedBusiness) {
      // Use business name as identifier since businesses table has no 'id' column
      navigation.navigate('BusinessDetail', { businessId: selectedBusiness.name as any });
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  const activeOffersCount = (business: BusinessWithOffers) => {
    // Offers are already filtered for active status when fetched
    return business.offers?.length || 0;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        showsUserLocation={locationPermission === true}
        showsMyLocationButton={false}
        onPress={() => setSelectedBusiness(null)}
      >
        {businesses.map((business) => (
          business.latitude && business.longitude && (
            <Marker
              key={business.name}
              coordinate={{
                latitude: business.latitude,
                longitude: business.longitude,
              }}
              onPress={() => handleMarkerPress(business)}
            >
              <View style={styles.markerContainer}>
                <View style={[
                  styles.marker,
                  selectedBusiness?.name === business.name && styles.markerSelected
                ]}>
                  <Ionicons name="location" size={24} color={colors.white} />
                </View>
                {activeOffersCount(business) > 0 && (
                  <View style={styles.markerBadge}>
                    <Text style={styles.markerBadgeText}>{activeOffersCount(business)}</Text>
                  </View>
                )}
              </View>
            </Marker>
          )
        ))}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore Nearby</Text>
          <Text style={styles.headerSubtitle}>
            {businesses.length} businesses with active offers
          </Text>
        </View>
      </SafeAreaView>

      {/* Location button */}
      {locationPermission && (
        <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={24} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Selected business card */}
      {selectedBusiness && (
        <TouchableOpacity
          style={styles.businessCard}
          onPress={handleBusinessPress}
          activeOpacity={0.9}
        >
          <View style={styles.businessCardImage}>
            {selectedBusiness.featured_image ? (
              <Image
                source={{ uri: selectedBusiness.featured_image }}
                style={styles.businessImage}
              />
            ) : (
              <View style={styles.businessImagePlaceholder}>
                <Ionicons name="business" size={32} color={colors.grayMedium} />
              </View>
            )}
          </View>
          <View style={styles.businessCardContent}>
            <Text style={styles.businessName} numberOfLines={1}>
              {selectedBusiness.name}
            </Text>
            <Text style={styles.businessLocation} numberOfLines={1}>
              {selectedBusiness.location_area || selectedBusiness.location}
            </Text>
            <View style={styles.businessOffers}>
              <Ionicons name="pricetag" size={14} color={colors.accent} />
              <Text style={styles.businessOffersText}>
                {activeOffersCount(selectedBusiness)} active offer{activeOffersCount(selectedBusiness) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.businessCardArrow}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
      )}

      {/* No location permission banner */}
      {locationPermission === false && (
        <View style={styles.permissionBanner}>
          <Ionicons name="location-outline" size={20} color={colors.white} />
          <Text style={styles.permissionText}>
            Enable location to see businesses near you
          </Text>
          <TouchableOpacity onPress={requestLocationPermission}>
            <Text style={styles.permissionButton}>Enable</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.grayMedium,
  },
  map: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    backgroundColor: 'rgba(54, 86, 111, 0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginTop: 2,
  },
  locationButton: {
    position: 'absolute',
    right: spacing.md,
    top: 140,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.md,
  },
  markerSelected: {
    backgroundColor: colors.accent,
  },
  markerBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  markerBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  businessCard: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    ...shadows.lg,
  },
  businessCardImage: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  businessImage: {
    width: '100%',
    height: '100%',
  },
  businessImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessCardContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  businessName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  businessLocation: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginBottom: spacing.xs,
  },
  businessOffers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  businessOffersText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  businessCardArrow: {
    padding: spacing.xs,
  },
  permissionBanner: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  permissionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.white,
  },
  permissionButton: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
});
