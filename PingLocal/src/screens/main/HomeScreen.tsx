import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Modal,
  Animated,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, shadows, fontFamily, responsiveSpacing } from '../../theme';
import { isSmallDevice } from '../../utils/responsive';
import { Offer, LocationArea, Tag, getTierFromPoints } from '../../types/database';
import { HomeStackParamList } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useNotifications } from '../../contexts/NotificationContext';
import PromotionCard from '../../components/promotions/PromotionCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = SCREEN_WIDTH * 0.75;

const TIER_ICONS = {
  member: require('../../../assets/images/loyaltytiericon_member.png'),
  hero: require('../../../assets/images/loyaltytiericon_hero.png'),
  champion: require('../../../assets/images/loyaltytiericon_champion.png'),
  legend: require('../../../assets/images/loyaltytiericon_legend.png'),
};

const TIER_DISPLAY_NAMES: Record<string, string> = {
  member: 'Ping Local Member',
  hero: 'Ping Local Hero',
  champion: 'Ping Local Champion',
  legend: 'Ping Local Legend',
};

// Area coordinates for distance calculations
const areaCoords: Record<string, { lat: number; lng: number }> = {
  'Oxton': { lat: 53.3847, lng: -3.0414 },
  'West Kirby': { lat: 53.3728, lng: -3.1840 },
  'Heswall': { lat: 53.3271, lng: -3.0977 },
  'Birkenhead': { lat: 53.3934, lng: -3.0145 },
  'Hoylake': { lat: 53.3900, lng: -3.1818 },
  'Bebington': { lat: 53.3511, lng: -3.0033 },
  'Wallasey': { lat: 53.4243, lng: -3.0486 },
  'Chester': { lat: 53.1930, lng: -2.8931 },
  'Liverpool': { lat: 53.4084, lng: -2.9916 },
};

type NavigationProp = StackNavigationProp<HomeStackParamList>;

const ITEMS_PER_PAGE = 20;

type SortOption = 'newest' | 'ending_soon' | 'proximity';

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, supabaseUser, checkPendingLevelUp, clearPendingLevelUp } = useAuth();
  const { userLocation, locationPermission, isLocationLoading, requestLocation } = useLocation();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const hasCheckedLevelUp = useRef(false);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [locationAreas, setLocationAreas] = useState<LocationArea[]>([]);
  const [categories, setCategories] = useState<Tag[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Available filters (dynamic based on current selections)
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const locationSlideAnim = useRef(new Animated.Value(-MODAL_WIDTH)).current;
  const filterSlideAnim = useRef(new Animated.Value(-MODAL_WIDTH)).current;

  // Check for pending level up when screen loads
  useEffect(() => {
    const checkLevelUp = async () => {
      if (user && !hasCheckedLevelUp.current) {
        hasCheckedLevelUp.current = true;
        const pendingLevelUp = await checkPendingLevelUp();
        if (pendingLevelUp) {
          // Navigate to LevelUp screen
          navigation.navigate('LevelUp', {
            previousTier: pendingLevelUp.previousTier,
            newTier: pendingLevelUp.newTier,
            pointsEarned: 0, // Not tracked in this flow
            totalPoints: pendingLevelUp.totalPoints,
          });
          // Clear the pending level up flag
          await clearPendingLevelUp();
        }
      }
    };
    checkLevelUp();
  }, [user, checkPendingLevelUp, clearPendingLevelUp, navigation]);

  // Fetch location areas and categories on mount
  useEffect(() => {
    fetchFilters();
    // Also fetch initial available filters (all available)
    fetchAvailableLocations();
    fetchAvailableCategories();
    fetchAvailableTags();
  }, []);

  // Fetch available filters when selections change
  useEffect(() => {
    fetchAvailableLocations();
    fetchAvailableCategories();
    fetchAvailableTags();
  }, [selectedLocation, selectedCategory, selectedTags]);

  // Fetch offers when filters change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchOffers(0, true);
  }, [selectedLocation, selectedCategory, selectedTags, sortBy, userLocation]);

  const fetchFilters = async () => {
    try {
      // Fetch location areas
      const { data: locations, error: locError } = await supabase
        .from('location_areas')
        .select('*')
        .order('name');

      console.log('[DEBUG fetchFilters] location_areas query:', {
        error: locError,
        locations: locations?.map(l => ({ id: l.id, name: l.name })),
      });

      if (locations) {
        setLocationAreas(locations);
      }

      // Fetch unique business categories from businesses with active offers
      const { data: offersWithBusiness } = await supabase
        .from('offers')
        .select('business_id, businesses!inner(category)')
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString());

      if (offersWithBusiness) {
        // Extract unique categories from businesses
        const categorySet = new Set<string>();
        offersWithBusiness.forEach((offer: any) => {
          const category = offer.businesses?.category;
          if (category) {
            categorySet.add(category);
          }
        });

        // Convert to Tag-like objects for compatibility with existing UI
        const categoryTags: Tag[] = Array.from(categorySet)
          .sort()
          .map((name, index) => ({
            id: String(index + 1),
            name,
            type: 'category' as const,
          }));

        setCategories(categoryTags);
      }

      // Fetch regular tags
      const { data: regularTags } = await supabase
        .from('tags')
        .select('*')
        .eq('type', 'tags')
        .order('name');

      if (regularTags) {
        setTags(regularTags);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  // Fetch available locations based on current category/tags selections
  const fetchAvailableLocations = async () => {
    try {
      let query = supabase
        .from('offers')
        .select('*, businesses!inner(location_area, name), offer_tags(tags(id, name, type))')
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString());

      const { data, error } = await query;

      console.log('[DEBUG fetchAvailableLocations] Raw query result:', {
        error,
        offerCount: data?.length,
        offers: data?.map((o: any) => ({
          id: o.id,
          title: o.title,
          status: o.status,
          end_date: o.end_date,
          business_name: o.businesses?.name,
          business_location_area: o.businesses?.location_area,
          offer_location_area: o.location_area,
        })),
      });

      if (error) throw error;

      if (data) {
        // Filter client-side to only include offers matching category AND all selected tags
        const filteredOffers = data.filter((offer: any) => {
          let includeOffer = true;

          // Check category filter
          if (selectedCategory && offer.offer_tags) {
            const offerTagsArray = Array.isArray(offer.offer_tags) ? offer.offer_tags : [offer.offer_tags];
            const hasCategory = offerTagsArray.some((ot: any) =>
              ot.tags?.name === selectedCategory && ot.tags?.type === 'Category'
            );
            if (!hasCategory) includeOffer = false;
          }

          // Check all selected tags (AND logic)
          if (selectedTags.length > 0 && offer.offer_tags) {
            const offerTagsArray = Array.isArray(offer.offer_tags) ? offer.offer_tags : [offer.offer_tags];
            const offerTagNames = offerTagsArray
              .filter((ot: any) => ot.tags?.type === 'tags')
              .map((ot: any) => ot.tags?.name);

            const hasAllTags = selectedTags.every(selectedTag =>
              offerTagNames.includes(selectedTag)
            );
            if (!hasAllTags) includeOffer = false;
          }

          return includeOffer;
        });

        // Extract unique location areas from filtered offers (check both offer and business)
        const locationSet = new Set<string>();
        filteredOffers.forEach((offer: any) => {
          const locationArea = offer.businesses?.location_area || offer.location_area;
          if (locationArea) {
            locationSet.add(locationArea);
          }
        });

        const uniqueLocations = Array.from(locationSet).sort();
        console.log('[DEBUG fetchAvailableLocations] Extracted unique locations:', uniqueLocations);
        console.log('[DEBUG fetchAvailableLocations] locationAreas from table:', locationAreas.map(a => a.name));
        setAvailableLocations(uniqueLocations);
      }
    } catch (error) {
      console.error('Error fetching available locations:', error);
    }
  };

  // Fetch available categories based on current location/tags selections
  const fetchAvailableCategories = async () => {
    try {
      let query = supabase
        .from('offers')
        .select('*, businesses!inner(location_area, category), offer_tags(tags(id, name, type))')
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString());

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Filter client-side to only include offers matching location AND all selected tags
        const filteredOffers = data.filter((offer: any) => {
          let includeOffer = true;

          // Check location filter (case-insensitive)
          if (selectedLocation && offer.businesses?.location_area?.toLowerCase() !== selectedLocation.toLowerCase()) {
            includeOffer = false;
          }

          // Check all selected tags (AND logic)
          if (selectedTags.length > 0 && offer.offer_tags) {
            const offerTagsArray = Array.isArray(offer.offer_tags) ? offer.offer_tags : [offer.offer_tags];
            const offerTagNames = offerTagsArray
              .filter((ot: any) => ot.tags?.type === 'tags')
              .map((ot: any) => ot.tags?.name);

            const hasAllTags = selectedTags.every(selectedTag =>
              offerTagNames.includes(selectedTag)
            );
            if (!hasAllTags) includeOffer = false;
          }

          return includeOffer;
        });

        // Extract unique business categories from filtered offers
        const categorySet = new Set<string>();
        filteredOffers.forEach((offer: any) => {
          const businessCategory = offer.businesses?.category;
          if (businessCategory) {
            categorySet.add(businessCategory);
          }
        });

        // Convert to Tag-like objects
        const uniqueCategories: Tag[] = Array.from(categorySet)
          .sort()
          .map((name, index) => ({
            id: String(index + 1),
            name,
            type: 'category' as const,
          }));
        setAvailableCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching available categories:', error);
    }
  };

  // Fetch available tags based on current location/category/selectedTags
  const fetchAvailableTags = async () => {
    try {
      let query = supabase
        .from('offers')
        .select('*, businesses!inner(location_area, category), offer_tags(tags(id, name, type))')
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString());

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Filter client-side to only include offers matching location, category AND all currently selected tags
        const filteredOffers = data.filter((offer: any) => {
          let includeOffer = true;

          // Check location filter (case-insensitive)
          if (selectedLocation && offer.businesses?.location_area?.toLowerCase() !== selectedLocation.toLowerCase()) {
            includeOffer = false;
          }

          // Check category filter (using business category)
          if (selectedCategory && offer.businesses?.category !== selectedCategory) {
            includeOffer = false;
          }

          // Check all currently selected tags (AND logic)
          if (selectedTags.length > 0 && offer.offer_tags) {
            const offerTagsArray = Array.isArray(offer.offer_tags) ? offer.offer_tags : [offer.offer_tags];
            const offerTagNames = offerTagsArray
              .filter((ot: any) => ot.tags?.type === 'tags')
              .map((ot: any) => ot.tags?.name);

            const hasAllTags = selectedTags.every(selectedTag =>
              offerTagNames.includes(selectedTag)
            );
            if (!hasAllTags) includeOffer = false;
          }

          return includeOffer;
        });

        // Extract unique tags from filtered offers (these are tags available to add to the filter)
        const tagMap = new Map<number, Tag>();
        filteredOffers.forEach((offer: any) => {
          if (offer.offer_tags) {
            const offerTagsArray = Array.isArray(offer.offer_tags) ? offer.offer_tags : [offer.offer_tags];
            offerTagsArray.forEach((ot: any) => {
              if (ot.tags && ot.tags.type === 'tags') {
                tagMap.set(ot.tags.id, ot.tags);
              }
            });
          }
        });

        const uniqueTags = Array.from(tagMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setAvailableTags(uniqueTags);
      }
    } catch (error) {
      console.error('Error fetching available tags:', error);
    }
  };

  const fetchOffers = async (pageNum: number, isInitial: boolean = false) => {
    // Only show full-screen loading on first ever load (no existing data)
    if (isInitial && offers.length === 0) {
      setIsLoading(true);
    } else if (!isInitial) {
      setIsLoadingMore(true);
    }

    try {
      // Build the select query with joins - always include offer_tags for display and business category for filtering
      const selectQuery = '*, businesses!inner(location_area, category), offer_tags(tag_id, tags(id, name, type))';

      let query = supabase
        .from('offers')
        .select(selectQuery)
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString());

      // Apply location filter using business's location_area (case-insensitive with ilike)
      if (selectedLocation) {
        query = query.ilike('businesses.location_area', selectedLocation);
      }

      // For category and tags, we'll fetch all candidates and filter client-side for AND logic
      // This is because Supabase doesn't easily support "offers with ALL of these tags"

      // Apply sorting (for non-proximity sorts)
      if (sortBy !== 'proximity') {
        switch (sortBy) {
          case 'ending_soon':
            query = query.order('end_date', { ascending: true });
            break;
          case 'newest':
          default:
            query = query.order('created', { ascending: false });
            break;
        }
      } else {
        // For proximity, we'll sort client-side, but still need a default order
        query = query.order('created', { ascending: false });
      }

      // Pagination
      query = query.range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Transform the data to match the Offer interface
        // Remove duplicates that may occur due to multiple tags
        let uniqueOffers = data.reduce((acc: Offer[], curr: any) => {
          const exists = acc.find(offer => offer.id === curr.id);
          if (!exists) {
            // Extract offer properties and include location_area from businesses
            const { businesses, tags, ...offerData } = curr;
            const offerWithLocation = {
              ...offerData,
              location_area: businesses?.location_area || offerData.location_area,
              offer_tags: curr.offer_tags, // Include offer_tags for PromotionCard display
            } as Offer;

            // Apply client-side filtering for category and tags (AND logic)
            let includeOffer = true;

            // Check if offer's business has the selected category (if any)
            if (selectedCategory && businesses?.category !== selectedCategory) {
              includeOffer = false;
            }

            // Check if offer has ALL selected tags (if any)
            if (selectedTags.length > 0 && curr.offer_tags) {
              const offerTagsArray = Array.isArray(curr.offer_tags) ? curr.offer_tags : [curr.offer_tags];
              const offerTagNames = offerTagsArray
                .filter((ot: any) => ot.tags?.type === 'tags')
                .map((ot: any) => ot.tags?.name);

              const hasAllTags = selectedTags.every(selectedTag =>
                offerTagNames.includes(selectedTag)
              );
              if (!hasAllTags) includeOffer = false;
            }

            if (includeOffer) {
              acc.push(offerWithLocation);
            }
          }
          return acc;
        }, []);

        // Apply proximity sorting client-side if needed
        if (sortBy === 'proximity' && userLocation) {
          uniqueOffers = uniqueOffers.sort((a, b) => {
            const aCoords = areaCoords[a.location_area || ''];
            const bCoords = areaCoords[b.location_area || ''];

            // If no coords found, put at end
            if (!aCoords && !bCoords) return 0;
            if (!aCoords) return 1;
            if (!bCoords) return -1;

            const distA = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              aCoords.lat,
              aCoords.lng
            );
            const distB = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              bCoords.lat,
              bCoords.lng
            );

            return distA - distB;
          });
        }

        if (isInitial) {
          setOffers(uniqueOffers);
        } else {
          setOffers(prev => {
            const combined = [...prev, ...uniqueOffers];
            // Remove duplicates from pagination
            return combined.filter((offer, index, self) =>
              index === self.findIndex(o => o.id === offer.id)
            );
          });
        }
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(0);
    await fetchOffers(0, true);
    setIsRefreshing(false);
  }, [selectedLocation, selectedCategory, selectedTags, sortBy, userLocation]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOffers(nextPage);
    }
  };

  const handleOfferPress = (offer: Offer) => {
    navigation.navigate('OfferDetail', { offerId: offer.id });
  };

  // Modal animation functions
  const openLocationModal = () => {
    setShowLocationModal(true);
    Animated.timing(locationSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeLocationModal = () => {
    Animated.timing(locationSlideAnim, {
      toValue: -MODAL_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowLocationModal(false));
  };

  const openFilterModal = () => {
    setShowFilterModal(true);
    Animated.timing(filterSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(filterSlideAnim, {
      toValue: -MODAL_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowFilterModal(false));
  };

  // Distance calculation for proximity sorting
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleProximitySortSelect = async () => {
    if (locationPermission === 'granted' && userLocation) {
      // Location already available - just switch sort
      setSortBy('proximity');
    } else if (locationPermission === 'granted' && !userLocation) {
      // Permission granted but still loading - set sort, will update when location arrives
      setSortBy('proximity');
    } else {
      // Need to request permission first
      const granted = await requestLocation();
      if (granted) {
        setSortBy('proximity');
      }
    }
  };

  // Select location from modal
  const handleLocationSelect = (locationName: string | null) => {
    setSelectedLocation(locationName);
    closeLocationModal();
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
  };

  // Handle tag selection (multi-select)
  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagName)) {
        // Remove tag from selection
        return prev.filter(t => t !== tagName);
      } else {
        // Add tag to selection
        return [...prev, tagName];
      }
    });
  };

  // Determine pill state for a tag
  const getTagPillState = (tagName: string): 'active' | 'available' | 'inactive' => {
    // If tag is selected, it's active
    if (selectedTags.includes(tagName)) {
      return 'active';
    }
    // If tag is in availableTags, it's available (can be selected)
    if (availableTags.some(t => t.name === tagName)) {
      return 'available';
    }
    // Otherwise it's inactive (would produce 0 results)
    return 'inactive';
  };

  // Determine pill state for a category
  const getCategoryPillState = (categoryName: string): 'active' | 'available' | 'inactive' => {
    // If category is selected, it's active
    if (selectedCategory === categoryName) {
      return 'active';
    }
    // If category is in availableCategories, it's available
    if (availableCategories.some(c => c.name === categoryName)) {
      return 'available';
    }
    // Otherwise it's inactive
    return 'inactive';
  };

  // Calculate active filter count
  const activeFilterCount = (selectedCategory ? 1 : 0) + selectedTags.length;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No promotions found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your filters or check back later
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const handleMapViewPress = () => {
    navigation.navigate('Map');
  };

  const userName = user?.first_name || 'Guest';
  const currentTier = getTierFromPoints(user?.loyalty_points || 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          {/* Left side - Avatar and User info */}
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => navigation.getParent()?.navigate('Account')}
          >
            <View style={styles.avatarContainer}>
              <Image source={TIER_ICONS[currentTier]} style={styles.avatarImage} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>Hello {userName}</Text>
              <Text style={styles.tierName}>{TIER_DISPLAY_NAMES[currentTier]}</Text>
            </View>
          </TouchableOpacity>

          {/* Right side - Icons */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Image source={require('../../../assets/images/iconnotifications.png')} style={styles.headerIcon}/>
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Image source={require('../../../assets/images/iconsettings.png')} style={styles.headerIcon}/>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <View style={styles.filterBarInner}>
            {/* Location Button */}
            <TouchableOpacity
              style={styles.locationButton}
              onPress={openLocationModal}
            >
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.locationButtonText}>Location</Text>
            </TouchableOpacity>

            {/* Showing Text */}
            <Text style={styles.showingText}>
              Showing: {selectedLocation || 'All Locations'}
            </Text>
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
            ]}
            onPress={openFilterModal}
          >
            <Ionicons
              name="filter"
              size={16}
              color={activeFilterCount > 0 ? colors.primary : colors.accent}
            />
            <Text style={[
              styles.filterButtonText,
              activeFilterCount > 0 && styles.filterButtonTextActive,
            ]}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.contentArea}>
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <PromotionCard
              offer={item}
              onPress={() => handleOfferPress(item)}
              userLocation={userLocation}
              userId={supabaseUser?.id}
            />
          )}
          ListHeaderComponent={
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'newest' && styles.sortOptionActive]}
                onPress={() => setSortBy('newest')}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === 'newest' && styles.sortOptionTextActive,
                ]}>
                  Newest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'ending_soon' && styles.sortOptionActive]}
                onPress={() => setSortBy('ending_soon')}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === 'ending_soon' && styles.sortOptionTextActive,
                ]}>
                  Ending Soon
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortOption, sortBy === 'proximity' && styles.sortOptionActive]}
                onPress={handleProximitySortSelect}
                disabled={sortBy === 'proximity' && isLocationLoading}
              >
                {sortBy === 'proximity' && isLocationLoading ? (
                  <View style={styles.sortOptionLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.sortOptionText, styles.sortOptionTextActive]}>
                      Finding location...
                    </Text>
                  </View>
                ) : (
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === 'proximity' && styles.sortOptionTextActive,
                  ]}>
                    Closest to Me
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Map View Floating Button */}
        <TouchableOpacity
          style={styles.mapViewButton}
          onPress={handleMapViewPress}
        >
          <Image source={require('../../../assets/images/iconmap.png')} style={styles.mapViewIcon}/>
          <Text style={styles.mapViewText}>Map View</Text>
        </TouchableOpacity>
      </View>

      {/* Location Slide-Out Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeLocationModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeLocationModal}
          />
          <Animated.View
            style={[
              styles.slideModal,
              { transform: [{ translateX: locationSlideAnim }] },
            ]}
          >
            <View style={[styles.modalSafeArea, { paddingTop: insets.top }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Location</Text>
                <TouchableOpacity onPress={closeLocationModal}>
                  <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
                {/* All Locations Option */}
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    !selectedLocation && styles.modalItemActive,
                  ]}
                  onPress={() => handleLocationSelect(null)}
                >
                  <Text style={[
                    styles.modalItemText,
                    !selectedLocation && styles.modalItemTextActive,
                  ]}>
                    All Locations
                  </Text>
                  {!selectedLocation && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>

                {/* Location Areas - Only show available locations (case-insensitive match) */}
                {console.log('[DEBUG Modal Render] locationAreas:', locationAreas.map(a => a.name), 'availableLocations:', availableLocations, 'filtered:', locationAreas.filter((area) => availableLocations.some(loc => loc.toLowerCase() === area.name.toLowerCase())).map(a => a.name))}
                {locationAreas
                  .filter((area) => availableLocations.some(
                    loc => loc.toLowerCase() === area.name.toLowerCase()
                  ))
                  .map((area) => (
                    <TouchableOpacity
                      key={area.id}
                      style={[
                        styles.modalItem,
                        selectedLocation === area.name && styles.modalItemActive,
                      ]}
                      onPress={() => handleLocationSelect(area.name)}
                    >
                      <Text style={[
                        styles.modalItemText,
                        selectedLocation === area.name && styles.modalItemTextActive,
                      ]}>
                        {area.name}
                      </Text>
                      {selectedLocation === area.name && (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Filter Slide-Out Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeFilterModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeFilterModal}
          />
          <Animated.View
            style={[
              styles.slideModal,
              { transform: [{ translateX: filterSlideAnim }] },
            ]}
          >
            <View style={[styles.modalSafeArea, { paddingTop: insets.top }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={closeFilterModal}>
                  <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
                {/* Categories Section */}
                <Text style={styles.filterSectionTitle}>Categories</Text>
                <View style={styles.pillsContainer}>
                  {/* All Categories pill */}
                  <TouchableOpacity
                    style={[
                      styles.pill,
                      !selectedCategory ? styles.pillActive : styles.pillAvailable,
                    ]}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text style={[
                      styles.pillText,
                      !selectedCategory ? styles.pillTextActive : styles.pillTextAvailable,
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>

                  {/* Category pills - show all categories */}
                  {categories.map((cat) => {
                    const pillState = getCategoryPillState(cat.name);
                    const isActive = pillState === 'active';
                    const isInactive = pillState === 'inactive';

                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.pill,
                          isActive && styles.pillActive,
                          !isActive && !isInactive && styles.pillAvailable,
                          isInactive && styles.pillInactive,
                        ]}
                        onPress={() => {
                          if (!isInactive) {
                            setSelectedCategory(isActive ? null : cat.name);
                          }
                        }}
                        disabled={isInactive}
                      >
                        <Text style={[
                          styles.pillText,
                          isActive && styles.pillTextActive,
                          !isActive && !isInactive && styles.pillTextAvailable,
                          isInactive && styles.pillTextInactive,
                        ]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Tags Section */}
                <Text style={[styles.filterSectionTitle, { marginTop: spacing.lg }]}>Tags</Text>
                <View style={styles.pillsContainer}>
                  {/* Tag pills - show all tags, multi-select */}
                  {tags.map((tag) => {
                    const pillState = getTagPillState(tag.name);
                    const isActive = pillState === 'active';
                    const isInactive = pillState === 'inactive';

                    return (
                      <TouchableOpacity
                        key={tag.id}
                        style={[
                          styles.pill,
                          isActive && styles.pillActive,
                          !isActive && !isInactive && styles.pillAvailable,
                          isInactive && styles.pillInactive,
                        ]}
                        onPress={() => {
                          if (!isInactive) {
                            handleTagToggle(tag.name);
                          }
                        }}
                        disabled={isInactive}
                      >
                        <Text style={[
                          styles.pillText,
                          isActive && styles.pillTextActive,
                          !isActive && !isInactive && styles.pillTextAvailable,
                          isInactive && styles.pillTextInactive,
                        ]}>
                          {tag.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Clear All Button */}
              {activeFilterCount > 0 && (
                <View style={[styles.clearButtonContainer, { paddingBottom: insets.bottom }]}>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearAllFilters}
                  >
                    <Text style={styles.clearButtonText}>Clear All Filters</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  headerSafeArea: {
    backgroundColor: colors.primary,
  },
  contentArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: isSmallDevice ? spacing.xs : spacing.sm,
    flexShrink: 1,
  },
  greeting: {
    fontSize: isSmallDevice ? fontSize.xs : fontSize.sm,
    color: colors.white,
    fontFamily: fontFamily.bodyMedium,
    marginBottom: isSmallDevice ? 0 : -2,
  },
  tierName: {
    fontSize: isSmallDevice ? fontSize.sm : fontSize.md,
    color: colors.accent,
    fontFamily: fontFamily.headingSemiBold,
    marginTop: -3,
  },
  avatarContainer: {
    width: isSmallDevice ? 38 : 44,
    height: isSmallDevice ? 38 : 44,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: isSmallDevice ? 19 : 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontFamily: fontFamily.headingBold,
  },
  avatarImage: {
    width: isSmallDevice ? 24 : 28,
    height: isSmallDevice ? 24 : 28,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#203C50',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    overflow: 'visible',
  },
  headerIcon: {
    width: 18,
    height: 18,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
  mapViewButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: responsiveSpacing.buttonPaddingHorizontal,
    paddingVertical: responsiveSpacing.buttonPaddingVertical,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  mapViewIcon: {
    width: 18,
    height: 18,
    marginTop: -4,
    marginRight: spacing.sm,
  },
  mapViewText: {
    fontSize: fontSize.lg,
    color: '#fff',
    fontFamily: fontFamily.bodySemiBold,
  },
  // Filter Bar Styles
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  filterBarInner: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    maxWidth: '70%',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  locationButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.bodySemiBold,
  },
  showingText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.white,
    textAlign: 'left',
    marginHorizontal: spacing.sm,
    fontFamily: fontFamily.body,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontFamily: fontFamily.bodySemiBold,
  },
  filterButtonTextActive: {
    color: colors.primary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  slideModal: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: MODAL_WIDTH,
    backgroundColor: colors.primary,
    ...shadows.lg,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#fff2',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    color: colors.white,
    fontFamily: fontFamily.headingBold,
  },
  modalContent: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#fff1',
  },
  modalItemActive: {
    backgroundColor: colors.accent,
  },
  modalItemText: {
    fontSize: fontSize.md,
    color: colors.grayLight,
    fontFamily: fontFamily.body,
  },
  modalItemTextActive: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  filterSectionTitle: {
    fontSize: fontSize.lg,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    letterSpacing: 1,
    fontFamily: fontFamily.bodyBold,
  },
  clearButtonContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primaryLight,
  },
  clearButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  clearButtonText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontFamily: fontFamily.bodySemiBold,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    marginTop: -8,
  },
  sortLabel: {
    fontSize: fontSize.xs,
    color: colors.grayDark,
    marginRight: spacing.sm,
    fontFamily: fontFamily.body,
  },
  sortOption: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  sortOptionActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  sortOptionText: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    fontFamily: fontFamily.bodyMedium,
  },
  sortOptionTextActive: {
    color: colors.primary,
  },
  sortOptionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    color: colors.grayDark,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.headingSemiBold,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
    textAlign: 'center',
    fontFamily: fontFamily.body,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  // Pill/Chip styles for category and tag filters
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillAvailable: {
    backgroundColor: colors.primaryLight,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: colors.primaryLight,
    opacity: 0.4,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
  },
  pillTextAvailable: {
    color: colors.white,
  },
  pillTextActive: {
    color: colors.primary,
  },
  pillTextInactive: {
    color: colors.white,
  },
});
