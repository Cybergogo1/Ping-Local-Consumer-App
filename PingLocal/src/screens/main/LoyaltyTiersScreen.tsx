import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSize, fontFamily, spacing, borderRadius, shadows } from '../../theme';
import { TIER_THRESHOLDS } from '../../types/database';

const TIER_ICONS: Record<string, any> = {
  member: require('../../../assets/images/loyaltytiericon_member.png'),
  hero: require('../../../assets/images/loyaltytiericon_hero.png'),
  champion: require('../../../assets/images/loyaltytiericon_champion.png'),
  legend: require('../../../assets/images/loyaltytiericon_legend.png'),
};

const TIERS = [
  {
    key: 'member',
    name: 'Ping Local Member',
    shortName: 'Member',
    pointsRange: '0 - 10 points',
    description: 'Start your journey with Ping Local',
    benefits: ['Access to all local deals', 'Earn points on every purchase'],
    color: '#8B9DC3',
  },
  {
    key: 'hero',
    name: 'Ping Local Hero',
    shortName: 'Hero',
    pointsRange: '10 - 1,200 points',
    description: 'You\'re making a difference locally!',
    benefits: ['All Member benefits', 'Early access to new offers', 'Priority support'],
    color: '#5B7FA3',
  },
  {
    key: 'champion',
    name: 'Ping Local Champion',
    shortName: 'Champion',
    pointsRange: '1,200 - 10,000 points',
    description: 'A true local champion!',
    benefits: ['All Hero benefits', 'Exclusive Champion deals', 'Monthly bonus points'],
    color: '#36566F',
  },
  {
    key: 'legend',
    name: 'Ping Local Legend',
    shortName: 'Legend',
    pointsRange: '10,000+ points',
    description: 'You\'re a local legend!',
    benefits: ['All Champion benefits', 'VIP access to events', 'Double points days', 'Personal concierge'],
    color: '#1E3A4C',
  },
];

export default function LoyaltyTiersScreen() {
  const navigation = useNavigation();
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openTierModal = (tier: typeof TIERS[0]) => {
    setSelectedTier(tier);
    setModalVisible(true);
  };

  const closeTierModal = () => {
    setModalVisible(false);
    setSelectedTier(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Tier Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTierModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeTierModal}>
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>

            {selectedTier && (
              <>
                <View style={styles.modalIconContainer}>
                  <Image
                    source={TIER_ICONS[selectedTier.key]}
                    style={styles.modalTierIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.modalTitle}>{selectedTier.name}</Text>
                <Text style={styles.modalPoints}>{selectedTier.pointsRange}</Text>
                <Text style={styles.modalBlurb}>
                  {selectedTier.description || 'Unlock exclusive benefits and rewards as you progress through our loyalty tiers. Keep earning points to level up!'}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header Section with Trophy */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Trophy Illustration */}
          <View style={styles.trophyContainer}>
            <Image
              source={require('../../../assets/images/loyaltylandingpage_graphic.png')}
              style={styles.loyaltyTierImage}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.headerTitle}>Our Loyalty Scheme</Text>
          <Text style={styles.headerSubtitle}>Earn points while saving money!</Text>
          <Text style={styles.headerDescription}>
            Every 10p spent gets you 10 points in app - these count towards your Ping Local Level.
            Saving enough points will let you upgrade and gain more benefits!
          </Text>
        </View>

        {/* Tiers List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {TIERS.map((tier, index) => (
            <View key={tier.key} style={styles.tierCard}>
              <View style={[styles.tierImageContainer, { backgroundColor: colors.white }]}>
                <Image
                  source={TIER_ICONS[tier.key]}
                  style={styles.tierIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.tierInfo}>
                <Text style={styles.tierName}>{tier.shortName}</Text>
                <Text style={styles.tierPoints}>{tier.pointsRange}</Text>
              </View>
              <TouchableOpacity style={styles.viewButton} onPress={() => openTierModal(tier)}>
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* How Points Work Section */}
          <View style={styles.howItWorksSection}>
            <Text style={styles.sectionTitle}>How Points Work</Text>

            <View style={styles.pointsInfoCard}>
              <View style={styles.pointsRow}>
                <Ionicons name="cart-outline" size={24} color={colors.primary} />
                <View style={styles.pointsRowText}>
                  <Text style={styles.pointsRowTitle}>Earn Points</Text>
                  <Text style={styles.pointsRowDescription}>
                    Get 10 points for every 10p spent on promotions
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.pointsRow}>
                <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
                <View style={styles.pointsRowText}>
                  <Text style={styles.pointsRowTitle}>Level Up</Text>
                  <Text style={styles.pointsRowDescription}>
                    Accumulate points to unlock higher tiers
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.pointsRow}>
                <Ionicons name="gift-outline" size={24} color={colors.primary} />
                <View style={styles.pointsRowText}>
                  <Text style={styles.pointsRowTitle}>Unlock Benefits</Text>
                  <Text style={styles.pointsRowDescription}>
                    Each tier unlocks exclusive perks and rewards
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  headerSection: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  trophyContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  loyaltyTierImage: {
    width: 200,
    height: 200,
    marginLeft: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.headingBold,
    color: colors.accent,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingMedium,
    color: colors.white,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  headerDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tierImageContainer: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  tierIcon: {
    width: 50,
    height: 50,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  tierPoints: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayMedium,
  },
  viewButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  viewButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  howItWorksSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  pointsInfoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pointsRowText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pointsRowTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginBottom: 2,
  },
  pointsRowDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayMedium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.grayLight,
    marginVertical: spacing.xs,
  },
  bottomSpacing: {
    height: spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '85%',
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  modalIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  modalTierIcon: {
    width: 80,
    height: 80,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.headingBold,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalPoints: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalBlurb: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyRegular,
    color: colors.grayLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
