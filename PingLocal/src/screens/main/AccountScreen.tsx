import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, fontSize, fontFamily, spacing, borderRadius, shadows } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PurchaseToken, TIER_THRESHOLDS, getTierFromPoints } from '../../types/database';
import { AccountStackParamList } from '../../types/navigation';
 
type AccountScreenNavigationProp = StackNavigationProp<AccountStackParamList, 'AccountMain'>;

const TIER_DISPLAY_NAMES: Record<string, string> = {
  member: 'Ping Local Member',
  hero: 'Ping Local Hero',
  champion: 'Ping Local Champion',
  legend: 'Ping Local Legend',
};

const TIER_ICONS = {
  member: require('../../../assets/images/loyaltytiericon_member.png'),
  hero: require('../../../assets/images/loyaltytiericon_hero.png'),
  champion: require('../../../assets/images/loyaltytiericon_champion.png'),
  legend: require('../../../assets/images/loyaltytiericon_legend.png'),
};

const getNextTierInfo = (points: number) => {
  const currentTier = getTierFromPoints(points);
  const thresholds = TIER_THRESHOLDS;

  switch (currentTier) {
    case 'member':
      return { nextTier: 'hero', pointsNeeded: thresholds.hero.min - points, nextThreshold: thresholds.hero.min };
    case 'hero':
      return { nextTier: 'champion', pointsNeeded: thresholds.champion.min - points, nextThreshold: thresholds.champion.min };
    case 'champion':
      return { nextTier: 'legend', pointsNeeded: thresholds.legend.min - points, nextThreshold: thresholds.legend.min };
    case 'legend':
      return { nextTier: null, pointsNeeded: 0, nextThreshold: points }; // Already at max
    default:
      return { nextTier: 'hero', pointsNeeded: thresholds.hero.min - points, nextThreshold: thresholds.hero.min };
  }
};

const getProgressPercentage = (points: number) => {
  const currentTier = getTierFromPoints(points);
  const thresholds = TIER_THRESHOLDS;

  switch (currentTier) {
    case 'member':
      return (points / thresholds.hero.min) * 100;
    case 'hero':
      return ((points - thresholds.hero.min) / (thresholds.champion.min - thresholds.hero.min)) * 100;
    case 'champion':
      return ((points - thresholds.champion.min) / (thresholds.legend.min - thresholds.champion.min)) * 100;
    case 'legend':
      return 100;
    default:
      return 0;
  }
};

export default function AccountScreen() {
  const navigation = useNavigation<AccountScreenNavigationProp>();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [redeemedOffers, setRedeemedOffers] = useState<PurchaseToken[]>([]);
  const [claimedCount, setClaimedCount] = useState(0);
  const [sharedCount, setSharedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAccountData();
    }
  }, [user]);

  const fetchAccountData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch redeemed purchase tokens
      const { data: redeemed, error: redeemedError } = await supabase
        .from('purchase_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('redeemed', true)
        .order('updated', { ascending: false })
        .limit(10);

      if (redeemedError) throw redeemedError;

      // Fetch offer details for each redeemed token
      if (redeemed && redeemed.length > 0) {
        const offerIds = redeemed.map(t => t.offer_id).filter(Boolean);
        if (offerIds.length > 0) {
          const { data: offersData } = await supabase
            .from('offers')
            .select('id, name, business_name, featured_image')
            .in('id', offerIds);

          const offersMap: Record<number, any> = {};
          (offersData || []).forEach(o => { offersMap[o.id] = o; });

          const redeemedWithOffers = redeemed.map(token => ({
            ...token,
            offers: token.offer_id ? offersMap[token.offer_id] : undefined,
          }));
          setRedeemedOffers(redeemedWithOffers);
        } else {
          setRedeemedOffers(redeemed);
        }
      } else {
        setRedeemedOffers([]);
      }

      // Fetch claimed count (all purchase tokens for user)
      const { count: claimed, error: claimedError } = await supabase
        .from('purchase_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (claimedError) throw claimedError;
      setClaimedCount(claimed || 0);

      // Shared count would come from a shares table - placeholder for now
      setSharedCount(0);
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fullName = user ? `${user.first_name || ''} ${user.surname || ''}`.trim() || 'User' : 'User';
  const joinDate = user?.created ? new Date(user.created).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) : '';
  const loyaltyPoints = user?.loyalty_points || 0;
  const currentTier = getTierFromPoints(loyaltyPoints);
  const tierDisplayName = TIER_DISPLAY_NAMES[currentTier];
  const { pointsNeeded, nextTier } = getNextTierInfo(loyaltyPoints);
  const progressPercentage = getProgressPercentage(loyaltyPoints);

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
            {/* Notification badge - could add unread count here */}
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>N..</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconsettings.png')} style={styles.settingsButtonIcon}/>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={[styles.headerButton, styles.signOutButton]}>
            <Ionicons name="log-out-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <Image source={TIER_ICONS[currentTier]} style={styles.profileImage} />
            </View>
            <Text style={styles.fullName}>{fullName}</Text>
            <Text style={styles.joinDate}>Joined {joinDate}</Text>

            {/* Tier Display */}
            <Text style={styles.tierTitle}>You're a {tierDisplayName.split(' ').pop()}!</Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }]} />
              </View>
              {nextTier && (
                <Text style={styles.progressText}>
                  {pointsNeeded} points to {TIER_DISPLAY_NAMES[nextTier].split(' ').pop()}!
                </Text>
              )}
              {!nextTier && (
                <Text style={styles.progressText}>You've reached the highest tier!</Text>
              )}
            </View>
          </View>

          {/* Stats Pills */}
          <View style={styles.statsContainer}>
            <View style={styles.statPill}>
              <Ionicons name="location" size={18} color={colors.white} />
              <Text style={styles.statText}>{claimedCount} Pings Claimed</Text>
            </View>
            <View style={[styles.statPill, styles.statPillOutline]}>
              <Ionicons name="share-social" size={18} color={colors.primary} />
              <Text style={[styles.statText, styles.statTextOutline]}>{sharedCount} Pings Shared</Text>
            </View>
          </View>

          {/* Loyalty Scheme Card */}
          <TouchableOpacity
            style={styles.loyaltyCard}
            onPress={() => navigation.navigate('LoyaltyTiers')}
          >
            <View style={styles.loyaltyCardContent}>
              <Text style={styles.loyaltyCardTitle}>Our Loyalty Scheme</Text>
              <Text style={styles.loyaltyCardSubtitle}>How it works for you!</Text>
            </View>
            <Image
              source={require('../../../assets/images/account_loyaltyschemebutton_graphic.png')}
              style={styles.loyaltyCardImage}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Redeemed Promotions Section */}
          <View style={styles.redeemedSection}>
            <Text style={styles.sectionTitle}>Your Redeemed Promotions</Text>

            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : redeemedOffers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={colors.grayMedium} />
                <Text style={styles.emptyStateText}>No redeemed promotions yet</Text>
              </View>
            ) : (
              redeemedOffers.map((token) => (
                <View key={token.id} style={styles.redeemedCard}>
                  <View style={styles.redeemedImageContainer}>
                    {token.offers?.featured_image ? (
                      <Image
                        source={{ uri: token.offers.featured_image }}
                        style={styles.redeemedImage}
                      />
                    ) : (
                      <View style={styles.redeemedImagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color={colors.grayMedium} />
                      </View>
                    )}
                  </View>
                  <View style={styles.redeemedInfo}>
                    <Text style={styles.redeemedName}>{token.offer_name || token.offers?.name}</Text>
                    <Text style={styles.redeemedDate}>
                      Redeemed on: {formatDate(token.updated)}
                    </Text>
                    <Text style={styles.redeemedBusiness}>
                      {token.offers?.business_name}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
    paddingVertical: spacing.sm,
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
  signOutButton: {
    backgroundColor: colors.accent,
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
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    borderWidth: 6,
    borderColor: colors.accent,
    overflow: 'hidden',
    marginBottom: spacing.md,
    padding: 15,
    backgroundColor: colors.white,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullName: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  joinDate: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayMedium,
    marginBottom: spacing.sm,
  },
  tierTitle: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  progressContainer: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  progressBar: {
    height: 22,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.xs,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayMedium,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#042D44',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    width: '48%',
  },
  statPillOutline: {
    backgroundColor: '#042D44',
  },
  statText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.white,
  },
  statTextOutline: {
    color: colors.white,
  },
  loyaltyCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f8f8f8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'center',
  },
  loyaltyCardImage: {
    width: '40%',
    height: '100%',
  },
  loyaltyCardContent: {
    flexDirection: 'column',
    justifyContent: 'center',
    padding: spacing.md,
  },
  loyaltyCardTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.grayDark,
    marginBottom: spacing.xs,
  },
  loyaltyCardSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayMedium,
  },
  redeemedSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.grayDark,
    marginBottom: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayMedium,
    marginTop: spacing.sm,
  },
  redeemedCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#eee',
  },
  redeemedImageContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  redeemedImage: {
    width: '100%',
    height: '100%',
  },
  redeemedImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemedInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  redeemedName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
    marginBottom: 1,
  },
  redeemedDate: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayMedium,
    marginBottom: 2,
  },
  redeemedBusiness: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodyRegular,
    color: colors.primary,
  },
});
