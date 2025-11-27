import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows, fontFamily } from '../../theme';
import { Offer, LocationArea, Tag } from '../../types/database';
import { HomeStackParamList } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import PromotionCard from '../../components/promotions/PromotionCard';

type NavigationProp = StackNavigationProp<HomeStackParamList>;

const ITEMS_PER_PAGE = 20;

type SortOption = 'newest' | 'ending_soon' | 'proximity';

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

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
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Fetch location areas and categories on mount
  useEffect(() => {
    fetchFilters();
  }, []);

  // Fetch offers when filters change
  useEffect(() => {
    setPage(0);
    setOffers([]);
    setHasMore(true);
    fetchOffers(0, true);
  }, [selectedLocation, selectedCategory, selectedTag, sortBy]);

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

      // Fetch category tags
      const { data: categoryTags } = await supabase
        .from('tags')
        .select('*')
        .eq('type', 'Category')
        .order('name');

      if (categoryTags) {
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

  const fetchOffers = async (pageNum: number, isInitial: boolean = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // Build the select query with joins for filtering
      let selectQuery = '*, businesses!inner(location_area)';

      // If filtering by category or tag, we need to join with offer_tags and tags
      if (selectedCategory || selectedTag) {
        selectQuery = '*, businesses!inner(location_area), offer_tags!inner(tag_id, tags!inner(name, type))';
      }

      let query = supabase
        .from('offers')
        .select(selectQuery)
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString());

      // Apply location filter using business's location_area
      if (selectedLocation) {
        query = query.eq('businesses.location_area', selectedLocation);
      }

      // Apply category filter using the junction table
      if (selectedCategory) {
        query = query.eq('offer_tags.tags.name', selectedCategory).eq('offer_tags.tags.type', 'Category');
      }

      // Apply tag filter using the junction table
      if (selectedTag) {
        query = query.eq('offer_tags.tags.name', selectedTag).eq('offer_tags.tags.type', 'tags');
      }

      // Apply sorting
      switch (sortBy) {
        case 'ending_soon':
          query = query.order('end_date', { ascending: true });
          break;
        case 'newest':
        default:
          query = query.order('created', { ascending: false });
          break;
      }

      // Pagination
      query = query.range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Transform the data to match the Offer interface
        // Remove duplicates that may occur due to multiple tags
        const uniqueOffers = data.reduce((acc: Offer[], curr: any) => {
          const exists = acc.find(offer => offer.id === curr.id);
          if (!exists) {
            // Extract just the offer properties, excluding the joined data
            const { businesses, offer_tags, tags, ...offerData } = curr;
            acc.push(offerData as Offer);
          }
          return acc;
        }, []);

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
  }, [selectedLocation, selectedCategory, selectedTag, sortBy]);

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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Location Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            !selectedLocation && styles.filterChipActive,
          ]}
          onPress={() => setSelectedLocation(null)}
        >
          <Text style={[
            styles.filterChipText,
            !selectedLocation && styles.filterChipTextActive,
          ]}>
            All Locations
          </Text>
        </TouchableOpacity>

        {locationAreas.map((area) => (
          <TouchableOpacity
            key={area.id}
            style={[
              styles.filterChip,
              selectedLocation === area.name && styles.filterChipActive,
            ]}
            onPress={() => setSelectedLocation(
              selectedLocation === area.name ? null : area.name
            )}
          >
            <Text style={[
              styles.filterChipText,
              selectedLocation === area.name && styles.filterChipTextActive,
            ]}>
              {area.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.categoryChipText,
            !selectedCategory && styles.categoryChipTextActive,
          ]}>
            All
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategory === cat.name && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(
              selectedCategory === cat.name ? null : cat.name
            )}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === cat.name && styles.categoryChipTextActive,
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tag Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedTag && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedTag(null)}
        >
          <Text style={[
            styles.categoryChipText,
            !selectedTag && styles.categoryChipTextActive,
          ]}>
            All Tags
          </Text>
        </TouchableOpacity>

        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.categoryChip,
              selectedTag === tag.name && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedTag(
              selectedTag === tag.name ? null : tag.name
            )}
          >
            <Text style={[
              styles.categoryChipText,
              selectedTag === tag.name && styles.categoryChipTextActive,
            ]}>
              {tag.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Options */}
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
      </View>
    </View>
  );

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleMapViewPress = () => {
    navigation.navigate('Map');
  };

  const userName = user?.first_name || 'Guest';
  const userTier = user?.loyalty_tier || 'Ping Local Member';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          {/* Left side - Avatar and User info */}
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>Hello {userName}</Text>
              <Text style={styles.tierName}>{userTier}</Text>
            </View>
          </View>

          {/* Right side - Icons */}
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconButton}>
              <Text style={styles.headerIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.headerIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
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
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
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
          <Text style={styles.mapViewText}>Map View</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
    fontFamily: fontFamily.heading,
  },
  tierName: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  headerIcon: {
    fontSize: 18,
  },
  mapViewButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  mapViewIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  mapViewText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
    marginBottom: spacing.md,
  },
  filterScroll: {
    marginTop: spacing.sm,
  },
  categoryScroll: {
    marginTop: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
  },
  filterChip: {
    backgroundColor: colors.grayLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  categoryChip: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.grayMedium,
  },
  categoryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    fontWeight: fontWeight.medium,
  },
  categoryChipTextActive: {
    color: colors.primary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sortLabel: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginRight: spacing.sm,
  },
  sortOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  sortOptionActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  sortOptionText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    fontWeight: fontWeight.medium,
  },
  sortOptionTextActive: {
    color: colors.primary,
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
    fontWeight: fontWeight.semibold,
    color: colors.grayDark,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.heading,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
