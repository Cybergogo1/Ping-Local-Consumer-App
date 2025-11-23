import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { Business } from '../../types/database';
import { DirectoryStackParamList } from '../../types/navigation';
import BusinessCard from '../../components/business/BusinessCard';

type NavigationProp = StackNavigationProp<DirectoryStackParamList>;

interface BusinessWithOfferCount extends Business {
  offers_count?: number;
}

export default function DirectoryScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [businesses, setBusinesses] = useState<BusinessWithOfferCount[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<BusinessWithOfferCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      // Fetch all businesses with their live offer counts
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          offers!left(id)
        `)
        .eq('is_signed_off', true)
        .order('is_featured', { ascending: false })
        .order('name');

      if (error) throw error;

      if (data) {
        // Calculate offer counts
        const businessesWithCounts = data.map(business => ({
          ...business,
          offers_count: Array.isArray(business.offers) ? business.offers.length : 0,
          offers: undefined, // Remove the offers array from the object
        }));

        // Separate featured and regular businesses
        const featured = businessesWithCounts.filter(b => b.is_featured);
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchBusinesses();
    setIsRefreshing(false);
  }, []);

  const handleBusinessPress = (business: Business) => {
    navigation.navigate('BusinessDetail', { businessId: business.id });
  };

  const filteredBusinesses = businesses.filter(business =>
    business.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFeaturedSection = () => {
    if (featuredBusinesses.length === 0) return null;

    return (
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured Businesses</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
        >
          {featuredBusinesses.map((business) => (
            <BusinessCard
              key={business.id}
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
      {/* Search Bar */}
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
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

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
        {searchQuery
          ? 'Try a different search term'
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
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Directory</Text>
        </View>

        <FlatList
          data={filteredBusinesses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBusinessItem}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
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
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.grayDark,
    paddingVertical: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearButtonText: {
    fontSize: fontSize.xl,
    color: colors.grayMedium,
  },
  featuredSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  featuredScroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  allBusinessesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  businessCount: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
  },
  businessItemContainer: {
    marginHorizontal: spacing.md,
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
});
