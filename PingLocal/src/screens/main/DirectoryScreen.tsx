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
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight, fontFamily } from '../../theme';
import { Business } from '../../types/database';
import { DirectoryStackParamList } from '../../types/navigation';
import BusinessCard from '../../components/business/BusinessCard';

type NavigationProp = StackNavigationProp<DirectoryStackParamList>;

interface BusinessWithOfferCount extends Business {
  offers_count?: number;
}

export default function DirectoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchBusinesses();
    setIsRefreshing(false);
  }, []);

  const handleBusinessPress = (business: Business) => {
    // Use business name as identifier since there's no 'id' column in the table
    navigation.navigate('BusinessDetail', { businessId: business.name as any });
  };

  const filteredBusinesses = businesses.filter(business =>
    business?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false
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
      <StatusBar barStyle="light-content" />
      {/* Header - extends edge to edge */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Image source={require('../../../assets/images/iconback.png')} style={styles.accountBackButton}/>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications' as any)}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconnotifications.png')} style={styles.notificationButtonIcon}/>
            {/* Notification badge - could add unread count here */}
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>N..</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as any)}
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
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </TouchableOpacity>
          )}
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
});
