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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Offer } from '../../types/database';
import { FavouritesStackParamList } from '../../types/navigation';

type FavouritesScreenNavigationProp = StackNavigationProp<FavouritesStackParamList, 'FavouritesMain'>;

interface FavouritedOffer extends Offer {
  favourite_id: string;
}

export default function FavoritesScreen() {
  const navigation = useNavigation<FavouritesScreenNavigationProp>();
  const { user } = useAuth();
  const [favouriteOffers, setFavouriteOffers] = useState<FavouritedOffer[]>([]);
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
      // Fetch user's favorites
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('id, offer_id')
        .eq('user_id', authUser.id);

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        setFavouriteOffers([]);
        return;
      }

      if (!favoritesData || favoritesData.length === 0) {
        setFavouriteOffers([]);
        return;
      }

      // Get offer IDs
      const offerIds = favoritesData.map(f => f.offer_id);

      // Fetch offer details
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .in('id', offerIds);

      if (offersError) {
        console.error('Error fetching offers:', offersError);
        setFavouriteOffers([]);
        return;
      }

      // Combine favorites with offer details
      const combinedOffers: FavouritedOffer[] = (offersData || []).map(offer => {
        const favorite = favoritesData.find(f => f.offer_id === offer.id);
        return {
          ...offer,
          favourite_id: favorite?.id || '',
        };
      });

      setFavouriteOffers(combinedOffers);
    } catch (error) {
      console.error('Error fetching favourites:', error);
      setFavouriteOffers([]);
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

      // Update local state
      setFavouriteOffers(prev => prev.filter(o => o.favourite_id !== favouriteId));
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

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color={colors.grayMedium} />
      <Text style={styles.emptyStateTitle}>No Favourites Yet</Text>
      <Text style={styles.emptyStateText}>
        Tap the heart icon on any promotion to save it here for easy access later!
      </Text>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Favourites</Text>
          </View>
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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Favourites</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={favouriteOffers}
            renderItem={renderOfferItem}
            keyExtractor={(item) => item.favourite_id}
            contentContainerStyle={[
              styles.listContent,
              favouriteOffers.length === 0 && styles.listContentEmpty,
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
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
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
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
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
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
});
