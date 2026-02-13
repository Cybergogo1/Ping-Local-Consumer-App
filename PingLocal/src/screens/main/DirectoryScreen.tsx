import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Image,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows } from '../../theme';
import { Business, LocationArea, Tag } from '../../types/database';
import { DirectoryStackParamList } from '../../types/navigation';
import { useNotifications } from '../../contexts/NotificationContext';
import BusinessCard from '../../components/business/BusinessCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = SCREEN_WIDTH * 0.75;

type NavigationProp = StackNavigationProp<DirectoryStackParamList>;

interface BusinessWithOfferCount extends Business {
  offers_count?: number;
}

export default function DirectoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  const [businesses, setBusinesses] = useState<BusinessWithOfferCount[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<BusinessWithOfferCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state
  const [locationAreas, setLocationAreas] = useState<LocationArea[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [businessTagsMap, setBusinessTagsMap] = useState<Record<number, Tag[]>>({});

  // Modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const locationSlideAnim = useRef(new Animated.Value(-MODAL_WIDTH)).current;
  const filterSlideAnim = useRef(new Animated.Value(-MODAL_WIDTH)).current;

  useEffect(() => {
    fetchBusinesses();
    fetchFilters();
  }, []);

  const fetchBusinesses = async () => {
    try {
      // Fetch all businesses
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_signed_off', true)
        .order('is_featured', { ascending: false })
        .order('name');

      if (businessError) throw businessError;

      // Fetch offer counts per business (using business_name since businesses table has no id column)
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('business_name')
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString());

      if (offersError) throw offersError;

      // Count offers per business name
      const offerCounts: Record<string, number> = {};
      (offersData || []).forEach(offer => {
        if (offer.business_name) {
          offerCounts[offer.business_name] = (offerCounts[offer.business_name] || 0) + 1;
        }
      });

      if (businessData) {
        console.log('Fetched', businessData.length, 'businesses');
        // Log first business to see column names and how to identify it
        if (businessData.length > 0) {
          console.log('First business keys:', Object.keys(businessData[0]));
          console.log('First business name:', businessData[0].name);
          // Check if there's any ID-like field
          console.log('owner_id:', businessData[0].owner_id);
          console.log('primary_user:', businessData[0].primary_user);
        }

        // Add offer counts to businesses (using name as identifier)
        const businessesWithCounts = businessData.map(business => ({
          ...business,
          offers_count: offerCounts[business.name] || 0,
        }));

        // Separate featured and regular businesses
        const featured = businessesWithCounts.filter(b => b.is_featured === true);
        console.log('Featured businesses:', featured.length, featured.map(b => b.name));
        const all = businessesWithCounts;

        setFeaturedBusinesses(featured);
        setBusinesses(all);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      // Fetch location areas
      const { data: locations } = await supabase
        .from('location_areas')
        .select('*')
        .order('name');

      if (locations) {
        setLocationAreas(locations);
      }

      // Fetch tags that are actually used by signed-off businesses
      const { data: businessTagData } = await supabase
        .from('business_tags')
        .select('business_id, tags(id, name, type)');

      if (businessTagData) {
        // Build a map of business_id -> tags
        const tagMap: Record<number, Tag[]> = {};
        const allTagsMap = new Map<string, Tag>();

        businessTagData.forEach((bt: any) => {
          if (bt.tags) {
            const tag = bt.tags as Tag;
            if (!tagMap[bt.business_id]) {
              tagMap[bt.business_id] = [];
            }
            tagMap[bt.business_id].push(tag);
            allTagsMap.set(tag.id, tag);
          }
        });

        setBusinessTagsMap(tagMap);
        setTags(
          Array.from(allTagsMap.values())
            .filter(t => t.type === 'tag' || t.type === 'tags')
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
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

  const handleLocationSelect = (locationName: string | null) => {
    setSelectedLocation(locationName);
    closeLocationModal();
  };

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
  };

  const activeFilterCount = selectedTags.length;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchBusinesses();
    await fetchFilters();
    setIsRefreshing(false);
  }, []);

  const handleBusinessPress = (business: Business) => {
    // Use business name as identifier since there's no 'id' column in the table
    navigation.navigate('BusinessDetail', { businessId: business.name as any });
  };

  const filteredBusinesses = businesses.filter(business => {
    // Text search filter
    const matchesSearch = business?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false;
    if (!matchesSearch) return false;

    // Location filter
    if (selectedLocation && business.location_area?.toLowerCase() !== selectedLocation.toLowerCase()) {
      return false;
    }

    // Tags filter (AND logic - business must have ALL selected tags)
    if (selectedTags.length > 0) {
      const bTags = businessTagsMap[business.id] || [];
      const bTagNames = bTags.map(t => t.name);
      const hasAllTags = selectedTags.every(tag => bTagNames.includes(tag));
      if (!hasAllTags) return false;
    }

    return true;
  });

  const filteredFeaturedBusinesses = featuredBusinesses.filter(business => {
    if (selectedLocation && business.location_area?.toLowerCase() !== selectedLocation.toLowerCase()) {
      return false;
    }
    if (selectedTags.length > 0) {
      const bTags = businessTagsMap[business.id] || [];
      const bTagNames = bTags.map(t => t.name);
      if (!selectedTags.every(tag => bTagNames.includes(tag))) return false;
    }
    return true;
  });

  // Get location areas that have at least one business
  const availableLocations = locationAreas.filter(area =>
    businesses.some(b => b.location_area?.toLowerCase() === area.name.toLowerCase())
  );

  // Get tags that are available given current filters
  const availableTags = tags.filter(tag => {
    // Check if any business matching current filters has this tag
    return filteredBusinesses.some(business => {
      const bTags = businessTagsMap[business.id] || [];
      return bTags.some(t => t.name === tag.name);
    });
  });

  const renderFeaturedSection = () => {
    if (filteredFeaturedBusinesses.length === 0) return null;

    return (
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured Businesses</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
        >
          {filteredFeaturedBusinesses.map((business) => (
            <BusinessCard
              key={business.name}
              business={business}
              onPress={() => handleBusinessPress(business)}
              liveOffersCount={business.offers_count}
              variant="featured"
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Featured Section */}
      {!searchQuery && renderFeaturedSection()}

      {/* All Businesses Header */}
      <View style={styles.allBusinessesHeader}>
        <Text style={styles.sectionTitle}>
          {searchQuery ? 'Search Results' : 'All Businesses'}
        </Text>
        <Text style={styles.businessCount}>
          {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''}
        </Text>
      </View>
    </View>
  );

  const renderBusinessItem = ({ item }: { item: BusinessWithOfferCount }) => (
    <View style={styles.businessItemContainer}>
      <BusinessCard
        business={item}
        onPress={() => handleBusinessPress(item)}
        liveOffersCount={item.offers_count}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No businesses found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedLocation || selectedTags.length > 0
          ? 'Try adjusting your search or filters'
          : 'Check back later for new businesses'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header - extends edge to edge */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Image source={require('../../../assets/images/iconback.png')} style={styles.accountBackButton}/>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconnotifications.png')} style={styles.notificationButtonIcon}/>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconsettings.png')} style={styles.settingsButtonIcon}/>
          </TouchableOpacity>
        </View>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        {/* Search Bar - outside FlatList to prevent keyboard dismissal */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses..."
            placeholderTextColor={colors.grayMedium}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.searchClearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.searchClearButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <View style={styles.filterBarInner}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={openLocationModal}
            >
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.locationButtonText}>Location</Text>
            </TouchableOpacity>
            <Text style={styles.showingText}>
              Showing: {selectedLocation || 'All'}
            </Text>
          </View>
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
              color={colors.primary}
            />
            <Text style={[
              styles.filterButtonText,
              activeFilterCount > 0 && styles.filterButtonTextActive,
            ]}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredBusinesses}
          keyExtractor={(item, index) => item?.name || `business-${index}`}
          renderItem={renderBusinessItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

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

                {availableLocations.map((area) => (
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

      {/* Tags Filter Slide-Out Modal */}
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
                <Text style={styles.modalTitle}>Filter by Tags</Text>
                <TouchableOpacity onPress={closeFilterModal}>
                  <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
                <Text style={styles.filterSectionTitle}>Tags</Text>
                <View style={styles.pillsContainer}>
                  {tags.map((tag) => {
                    const isActive = selectedTags.includes(tag.name);
                    const isAvailable = availableTags.some(t => t.name === tag.name);
                    const isInactive = !isActive && !isAvailable;

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

              {activeFilterCount > 0 && (
                <View style={[styles.clearFilterContainer, { paddingBottom: insets.bottom }]}>
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={clearAllFilters}
                  >
                    <Text style={styles.clearFilterButtonText}>Clear All Filters</Text>
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
    backgroundColor: colors.white,
  },
  safeArea: {
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
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#203C50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  accountBackButton: {
    width: 16,
    height: 16,
  },
  notificationButtonIcon: {
    width: 16,
    height: 16,
  },
  settingsButtonIcon: {
    width: 16,
    height: 16,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grayLight,
  },
  headerContainer: {
    backgroundColor: colors.white,
    paddingBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.full,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayDark,
    paddingVertical: spacing.md,
  },
  searchClearButton: {
    padding: spacing.xs,
  },
  searchClearButtonText: {
    fontSize: fontSize.xl,
    color: colors.grayMedium,
  },
  featuredSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.headingSemiBold,
    color: colors.primary,
    marginHorizontal: spacing.md,
  },
  featuredScroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  allBusinessesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  businessCount: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginRight: spacing.lg,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  businessItemContainer: {
    flex: 1,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  listContent: {
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
    fontWeight: fontWeight.semibold,
    color: colors.grayDark,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
    textAlign: 'center',
  },
  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
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
    color: colors.grayDark,
    textAlign: 'left',
    marginHorizontal: spacing.sm,
    fontFamily: fontFamily.bodyRegular,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
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
    fontFamily: fontFamily.bodyRegular,
  },
  modalItemTextActive: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  // Filter modal pill styles
  filterSectionTitle: {
    fontSize: fontSize.lg,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    letterSpacing: 1,
    fontFamily: fontFamily.bodyBold,
  },
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
  clearFilterContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primaryLight,
  },
  clearFilterButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  clearFilterButtonText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontFamily: fontFamily.bodySemiBold,
  },
});
