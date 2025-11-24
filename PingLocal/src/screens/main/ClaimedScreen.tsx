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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import { PurchaseToken } from '../../types/database';
import ClaimedOfferCard from '../../components/claimed/ClaimedOfferCard';

type FilterType = 'active' | 'redeemed' | 'all';

export default function ClaimedScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [purchaseTokens, setPurchaseTokens] = useState<PurchaseToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('active');

  const fetchPurchaseTokens = async () => {
    if (!user) return;

    try {
      // Query purchase tokens by user_email
      // No foreign key join - offer_name is stored directly on the token
      const { data, error } = await supabase
        .from('purchase_tokens')
        .select('*')
        .eq('user_email', user.email)
        .order('created', { ascending: false });

      if (error) throw error;
      setPurchaseTokens(data || []);
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
      return !token.redeemed;
    }
    if (activeFilter === 'redeemed') {
      return token.redeemed;
    }
    return true; // 'all'
  });

  const activeCount = purchaseTokens.filter((t) => !t.redeemed).length;
  const redeemedCount = purchaseTokens.filter((t) => t.redeemed).length;

  const renderEmptyState = () => {
    if (activeFilter === 'active') {
      return (
        <View style={styles.emptyContainer}>
          <Image
            source={require('../../../assets/images/claimed_emptyfeed_graphic.avif')}
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

    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../../../assets/images/claimed_emptyfeed_graphic.avif')}
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
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Claims</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
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
        </View>

        {/* List */}
        <FlatList
          data={filteredTokens}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ClaimedOfferCard
              purchaseToken={item}
              onPress={() => handleCardPress(item)}
              onShowQR={() => handleShowQR(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
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

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.grayLight,
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
    width: 200,
    height: 200,
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
    ...shadows.sm,
  },
  browseButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
