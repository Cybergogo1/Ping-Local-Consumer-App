import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, fontSize, fontFamily, spacing, borderRadius, shadows } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Offer, Business } from '../../types/database';
import { FavouritesStackParamList } from '../../types/navigation';

type FavouritesScreenNavigationProp = StackNavigationProp<FavouritesStackParamList, 'FavouritesMain'>;

interface FavouritedOffer extends Offer {
  favourite_id: string;
}

interface FavouritedBusiness extends Business {
  favourite_id: string;
}

export default function FavoritesScreen() {
  const navigation = useNavigation<FavouritesScreenNavigationProp>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'offers' | 'businesses'>('offers');
  const [favouriteOffers, setFavouriteOffers] = useState<FavouritedOffer[]>([]);
  const [favouriteBusinesses, setFavouriteBusinesses] = useState<FavouritedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchFavourites();
      } else {
        setIsLoading(false);
      }
    }, [user])
  );

  const fetchFavourites = async (refresh = false) => {
    // Get the Supabase Auth user ID (UUID) for favorites
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch user's favorites (both offers and businesses)
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('id, offer_id, business_id')
        .eq('user_id', authUser.id);

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        setFavouriteOffers([]);
        setFavouriteBusinesses([]);
        return;
      }

      // Separate offer and business favorites
      const offerFavorites = (favoritesData || []).filter(f => f.offer_id);
      const businessFavorites = (favoritesData || []).filter(f => f.business_id);

      // Fetch offer details
      if (offerFavorites.length > 0) {
        const offerIds = offerFavorites.map(f => f.offer_id);
        const { data: offersData } = await supabase
          .from('offers')
          .select('*')
          .in('id', offerIds);

        const combinedOffers: FavouritedOffer[] = (offersData || []).map(offer => ({
          ...offer,
          favourite_id: offerFavorites.find(f => f.offer_id === offer.id)?.id || '',
        }));
        setFavouriteOffers(combinedOffers);
      } else {
        setFavouriteOffers([]);
      }

      // Fetch business details
      if (businessFavorites.length > 0) {
        const businessIds = businessFavorites.map(f => f.business_id);
        const { data: businessesData } = await supabase
          .from('businesses')
          .select('*')
          .in('id', businessIds);

        const combinedBusinesses: FavouritedBusiness[] = (businessesData || []).map(business => ({
          ...business,
          favourite_id: businessFavorites.find(f => f.business_id === business.id)?.id || '',
        }));
        setFavouriteBusinesses(combinedBusinesses);
      } else {
        setFavouriteBusinesses([]);
      }
    } catch (error) {
      console.error('Error fetching favourites:', error);
      setFavouriteOffers([]);
      setFavouriteBusinesses([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const removeFavourite = async (favouriteId: string) => {
    // Get the Supabase Auth user to verify logged in
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favouriteId);

      if (error) {
        console.error('Error removing favourite:', error);
        return;
      }

      // Update local state for both offers and businesses
      setFavouriteOffers(prev => prev.filter(o => o.favourite_id !== favouriteId));
      setFavouriteBusinesses(prev => prev.filter(b => b.favourite_id !== favouriteId));
    } catch (error) {
      console.error('Error removing favourite:', error);
    }
  };

  const getTimeRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Ends today';
    if (diffDays === 1) return 'Ends tomorrow';
    return `Ends in ${diffDays} days`;
  };

  const renderOfferItem = ({ item }: { item: FavouritedOffer }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OfferDetail', { offerId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        {item.featured_image ? (
          <Image source={{ uri: item.featured_image }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="pricetag" size={32} color={colors.grayMedium} />
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        {item.end_date && (
          <Text style={styles.cardDate}>{getTimeRemaining(item.end_date)}</Text>
        )}
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {item.business_name}{item.location_area ? `, ${item.location_area}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.heartButton}
        onPress={() => removeFavourite(item.favourite_id)}
      >
        <Ionicons name="heart" size={24} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderBusinessItem = ({ item }: { item: FavouritedBusiness }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BusinessDetail', { businessId: item.name })}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        {item.featured_image ? (
          <Image source={{ uri: item.featured_image }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="business" size={32} color={colors.grayMedium} />
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {item.location_area || 'No location'}
        </Text>
        {item.category && (
          <Text style={styles.cardDate}>{item.category}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.heartButton}
        onPress={() => removeFavourite(item.favourite_id)}
      >
        <Ionicons name="heart" size={24} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart" size={64} color={colors.primary} />
      <Text style={styles.emptyStateTitle}>No Favourites Yet</Text>
      <Text style={styles.emptyStateText}>
        Tap the heart icon on any {activeTab === 'offers' ? 'promotion' : 'business'} to save it here for easy access later!
      </Text>
    </View>
  );

  if (!user) {
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
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={64} color={colors.grayMedium} />
            <Text style={styles.emptyStateTitle}>Sign In Required</Text>
            <Text style={styles.emptyStateText}>
              Please sign in to view and manage your favourite promotions.
            </Text>
          </View>
        </SafeAreaView>
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

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'offers' && styles.tabActive]}
            onPress={() => setActiveTab('offers')}
          >
            <Text style={[styles.tabText, activeTab === 'offers' && styles.tabTextActive]}>
              Offers ({favouriteOffers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'businesses' && styles.tabActive]}
            onPress={() => setActiveTab('businesses')}
          >
            <Text style={[styles.tabText, activeTab === 'businesses' && styles.tabTextActive]}>
              Businesses ({favouriteBusinesses.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={activeTab === 'offers' ? favouriteOffers : favouriteBusinesses}
            renderItem={activeTab === 'offers' ? renderOfferItem : renderBusinessItem}
            keyExtractor={(item) => (item as any).favourite_id}
            contentContainerStyle={[
              styles.listContent,
              (activeTab === 'offers' ? favouriteOffers : favouriteBusinesses).length === 0 && styles.listContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchFavourites(true)}
                tintColor={colors.primary}
              />
            }
          />
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardImageContainer: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
  },
  heartButton: {
    padding: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    columnGap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  tabTextActive: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.white,
  },
});
