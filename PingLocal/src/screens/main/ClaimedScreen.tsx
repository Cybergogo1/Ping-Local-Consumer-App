import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows, fontFamily } from '../../theme';
import { PurchaseToken } from '../../types/database';
import ClaimedOfferCard from '../../components/claimed/ClaimedOfferCard';

type FilterType = 'active' | 'redeemed' | 'cancelled' | 'all';

export default function ClaimedScreen() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [purchaseTokens, setPurchaseTokens] = useState<PurchaseToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('active');

  const fetchPurchaseTokens = async () => {
    if (!user) return;

    try {
      // Query purchase tokens by user_email
      const { data: tokens, error } = await supabase
        .from('purchase_tokens')
        .select('*')
        .eq('user_email', user.email)
        .order('created', { ascending: false });

      if (error) throw error;

      // Fetch offer details for tokens that have offer_id (no FK relationship exists)
      if (tokens && tokens.length > 0) {
        const offerIds = [...new Set(tokens.filter(t => t.offer_id).map(t => t.offer_id))];

        if (offerIds.length > 0) {
          const { data: offers } = await supabase
            .from('offers')
            .select('id, featured_image, business_name, booking_type, booking_url')
            .in('id', offerIds);

          // Get unique business names to fetch phone numbers
          const businessNames = [...new Set(offers?.filter(o => o.business_name).map(o => o.business_name) || [])];
          let businessesMap = new Map<string, { phone_number?: string }>();

          if (businessNames.length > 0) {
            const { data: businesses } = await supabase
              .from('businesses')
              .select('name, phone_number')
              .in('name', businessNames);

            businessesMap = new Map(businesses?.map(b => [b.name, { phone_number: b.phone_number }]) || []);
          }

          // Map offers to tokens with business phone numbers
          const offersMap = new Map(offers?.map(o => [o.id, {
            ...o,
            businesses: o.business_name ? businessesMap.get(o.business_name) : undefined,
          }]) || []);

          const tokensWithOffers = tokens.map(token => ({
            ...token,
            offers: token.offer_id ? offersMap.get(token.offer_id) : undefined,
          }));

          setPurchaseTokens(tokensWithOffers);
          return;
        }
      }

      setPurchaseTokens(tokens || []);
    } catch (error) {
      console.error('Error fetching purchase tokens:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchPurchaseTokens();
    }, [user])
  );

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('claimed_offers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_tokens',
          filter: `user_email=eq.${user.email}`,
        },
        (payload) => {
          console.log('Purchase token change:', payload);
          // Refresh the list when any change happens
          fetchPurchaseTokens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPurchaseTokens();
  };

  const handleShowQR = (purchaseToken: PurchaseToken) => {
    navigation.navigate('QRCode', { purchaseToken });
  };

  const handleCardPress = (purchaseToken: PurchaseToken) => {
    // Could navigate to a detail view, for now just show QR
    if (!purchaseToken.redeemed) {
      handleShowQR(purchaseToken);
    }
  };

  // Filter tokens based on active filter
  const filteredTokens = purchaseTokens.filter((token) => {
    if (activeFilter === 'active') {
      // Active = not redeemed AND not cancelled
      return !token.redeemed && !token.cancelled;
    }
    if (activeFilter === 'redeemed') {
      return token.redeemed;
    }
    if (activeFilter === 'cancelled') {
      return token.cancelled;
    }
    return true; // 'all'
  });

  const activeCount = purchaseTokens.filter((t) => !t.redeemed && !t.cancelled).length;
  const redeemedCount = purchaseTokens.filter((t) => t.redeemed).length;
  const cancelledCount = purchaseTokens.filter((t) => t.cancelled).length;

  const renderEmptyState = () => {
    if (activeFilter === 'active') {
      return (
        <View style={styles.emptyContainer}>
          <Image
            source={require('../../../assets/images/claimed_emptyfeed_graphic.png')}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No Active Claims</Text>
          <Text style={styles.emptyText}>
            When you claim offers, they'll appear here ready to redeem!
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.getParent()?.navigate('Feed')}
          >
            <Text style={styles.browseButtonText}>Browse Offers</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeFilter === 'redeemed') {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Redeemed Offers</Text>
          <Text style={styles.emptyText}>
            Your redemption history will appear here
          </Text>
        </View>
      );
    }

    if (activeFilter === 'cancelled') {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✕</Text>
          <Text style={styles.emptyTitle}>No Cancelled Bookings</Text>
          <Text style={styles.emptyText}>
            Any bookings you cancel will appear here
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../../../assets/images/claimed_emptyfeed_graphic.png')}
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>No Claims Yet</Text>
        <Text style={styles.emptyText}>
          Start exploring offers and claim your first deal!
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.getParent()?.navigate('Feed')}
        >
          <Text style={styles.browseButtonText}>Browse Offers</Text>
        </TouchableOpacity>
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

      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'active' && styles.filterTabActive]}
            onPress={() => setActiveFilter('active')}
          >
            <Text style={[
              styles.filterTabText,
              activeFilter === 'active' && styles.filterTabTextActive,
            ]}>
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'redeemed' && styles.filterTabActive]}
            onPress={() => setActiveFilter('redeemed')}
          >
            <Text style={[
              styles.filterTabText,
              activeFilter === 'redeemed' && styles.filterTabTextActive,
            ]}>
              Redeemed ({redeemedCount})
            </Text>
          </TouchableOpacity>

          {cancelledCount > 0 && (
            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'cancelled' && styles.filterTabActive]}
              onPress={() => setActiveFilter('cancelled')}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === 'cancelled' && styles.filterTabTextActive,
              ]}>
                Cancelled ({cancelledCount})
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[
              styles.filterTabText,
              activeFilter === 'all' && styles.filterTabTextActive,
            ]}>
              All
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* List */}
        <FlatList
          data={filteredTokens}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ClaimedOfferCard
              purchaseToken={item}
              onPress={() => handleCardPress(item)}
              onShowQR={() => handleShowQR(item)}
              onBookingUpdated={fetchPurchaseTokens}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            filteredTokens.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grayLight,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
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

  // Filter Tabs
  filterScrollView: {
    flexGrow: 0,
    paddingBottom: spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#eee',
    minHeight: 37,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.grayDark,
  },
  filterTabTextActive: {
    color: colors.white,
  },

  // List
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyImage: {
    width: 280,
    height: 280,
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: fontSize.md * 1.5,
  },
  browseButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    fontFamily: fontFamily.bodySemiBold,
  },
  browseButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
