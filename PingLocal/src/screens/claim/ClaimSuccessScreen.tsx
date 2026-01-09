import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ImageBackground,
  Image,
  Linking,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontFamily, shadows } from '../../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, CommonActions } from '@react-navigation/native';
import { HomeStackParamList } from '../../types/navigation';
import { TIER_THRESHOLDS, TierName } from '../../types/database';
import BookingConfirmationModal from '../../components/modals/BookingConfirmationModal';

type ClaimSuccessScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'ClaimSuccess'>;
  route: RouteProp<HomeStackParamList, 'ClaimSuccess'>;
};

// Tier display names
const TIER_DISPLAY_NAMES: Record<TierName, string> = {
  member: 'Member',
  hero: 'Hero',
  champion: 'Champion',
  legend: 'Legend',
};

export default function ClaimSuccessScreen({ navigation, route }: ClaimSuccessScreenProps) {
  const {
    purchaseTokenId,
    offerName,
    businessName,
    pointsEarned,
    previousTier,
    newTier,
    totalPoints,
    // External/call booking params
    isExternalBooking,
    bookingType,
    bookingUrl,
    businessPhoneNumber,
  } = route.params;

  // Check if this was a paid offer (has points)
  const hasPaidWithPoints = pointsEarned !== undefined && pointsEarned > 0;
  const leveledUp = previousTier && newTier && previousTier !== newTier;

  // External booking state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const hasOpenedExternalLink = useRef(false);

  // Animation values
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pointsScaleAnim = useRef(new Animated.Value(0)).current;

  // Calculate progress to next tier
  const getProgressInfo = () => {
    if (!totalPoints || !newTier) return { progress: 0, nextTierPoints: 0, currentTierMin: 0 };

    const currentTierData = TIER_THRESHOLDS[newTier as TierName];
    const nextTierPoints = currentTierData.max;
    const currentTierMin = currentTierData.min;

    if (nextTierPoints === Infinity) {
      return { progress: 100, nextTierPoints: totalPoints, currentTierMin };
    }

    const tierRange = nextTierPoints - currentTierMin;
    const pointsInTier = totalPoints - currentTierMin;
    const progress = Math.min((pointsInTier / tierRange) * 100, 100);

    return { progress, nextTierPoints, currentTierMin };
  };

  const { progress, nextTierPoints } = getProgressInfo();

  useEffect(() => {
    // Hide tab bar when this screen is focused
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });

    // Fade in content
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Animate points badge
    if (hasPaidWithPoints) {
      Animated.sequence([
        Animated.delay(500),
        Animated.spring(pointsScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1000,
        delay: 800,
        useNativeDriver: false,
      }).start();
    }

    // Show tab bar again when leaving this screen
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation, hasPaidWithPoints, progress]);

  const handleViewClaimed = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'HomeFeed' }],
      })
    );
    navigation.getParent()?.navigate('Claimed');
  };

  const handleBackToFeed = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'HomeFeed' }],
      })
    );
  };

  const handleViewLevelUp = () => {
    if (previousTier && newTier && pointsEarned !== undefined && totalPoints !== undefined) {
      navigation.navigate('LevelUp', {
        previousTier,
        newTier,
        pointsEarned,
        totalPoints,
      });
    }
  };

  // Handle Book Now button press
  const handleBookNow = async () => {
    hasOpenedExternalLink.current = true;

    if (bookingType === 'call' && businessPhoneNumber) {
      const phoneUrl = `tel:${businessPhoneNumber}`;
      try {
        await Linking.openURL(phoneUrl);
      } catch (error) {
        Alert.alert('Error', 'Unable to make phone call');
      }
    } else if (bookingType === 'external' && bookingUrl) {
      try {
        const supported = await Linking.canOpenURL(bookingUrl);
        if (supported) {
          await Linking.openURL(bookingUrl);
        } else {
          Alert.alert('Error', 'Unable to open booking link');
        }
      } catch (error) {
        Alert.alert('Error', 'Unable to open booking link');
      }
    }
  };

  // Handle booking confirmation
  const handleBookingConfirmed = (date: Date) => {
    setBookingConfirmed(true);
    console.log('Booking confirmed for:', date);
  };

  // AppState listener for detecting return from external link
  useEffect(() => {
    if (!isExternalBooking) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        hasOpenedExternalLink.current
      ) {
        // User has returned to the app after opening external link
        hasOpenedExternalLink.current = false;
        setShowBookingModal(true);
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isExternalBooking]);

  return (
    <ImageBackground
      source={require('../../../assets/images/onboardbg.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Success Image */}
          <View style={styles.successAnimationContainer}>
            <Image
              source={require('../../../assets/images/howdiditgo_graphic.png')}
              style={styles.successImage}
              resizeMode="contain"
            />
          </View>

          {/* Success Text */}
          <Animated.View style={[styles.textContainer, { opacity: opacityAnim }]}>
            <Text style={styles.successTitle}>Claimed!</Text>
            <Text style={styles.successSubtitle}>
              Your offer has been successfully claimed
            </Text>

            {/* Offer Details */}
            <View style={styles.offerSummary}>
              <Text style={styles.offerName}>{offerName}</Text>
              <Text style={styles.businessName}>at {businessName}</Text>
            </View>

            {/* Loyalty Points Section - Only for paid offers */}
            {hasPaidWithPoints && (
              <View style={styles.loyaltySection}>
                <View style={styles.loyaltyRow}>
                  {/* Points Earned Badge */}
                  <Animated.View
                    style={[
                      styles.pointsBadge,
                      { transform: [{ scale: pointsScaleAnim }] },
                    ]}
                  >
                    <Text style={styles.pointsEarnedLabel}>Points Earned</Text>
                    <Text style={styles.pointsEarnedValue}>+{pointsEarned}</Text>
                  </Animated.View>

                  {/* Current Tier & Progress */}
                  <View style={styles.tierProgressContainer}>
                    <View style={styles.tierRow}>
                      <Text style={styles.currentTierLabel}>
                        {TIER_DISPLAY_NAMES[newTier as TierName] || 'Member'}
                      </Text>
                      <Text style={styles.pointsTotal}>{totalPoints} pts</Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          {
                            width: progressAnim.interpolate({
                              inputRange: [0, 100],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    </View>

                    {nextTierPoints !== totalPoints && (
                      <Text style={styles.nextTierText}>
                        {nextTierPoints - (totalPoints || 0)} pts to next level
                      </Text>
                    )}
                  </View>
                </View>

                {/* Level Up Button - Centered below the row */}
                {leveledUp && (
                  <TouchableOpacity style={styles.levelUpButton} onPress={handleViewLevelUp}>
                    <Text style={styles.levelUpButtonText}>
                      You leveled up! View your new status
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* QR Info - Only for non-paid offers */}
            {!hasPaidWithPoints && (
              <View style={styles.qrInfoCard}>
                <Image
                  source={require('../../../assets/images/logo_icononly.png')}
                  style={styles.qrInfoIcon}
                />
                <Text style={styles.qrInfoText}>
                  Your QR code is ready! Show it at {businessName} to redeem your offer.
                </Text>
              </View>
            )}

            {/* Book Now Button - for external/call bookings */}
            {isExternalBooking && !bookingConfirmed && (
              <TouchableOpacity style={styles.bookNowButton} onPress={handleBookNow}>
                <Text style={styles.bookNowButtonIcon}>
                  {bookingType === 'call' ? '📞' : '🔗'}
                </Text>
                <Text style={styles.bookNowButtonText}>
                  {bookingType === 'call' ? 'Call to Book' : 'Book Now'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Booking Confirmed Badge */}
            {isExternalBooking && bookingConfirmed && (
              <View style={styles.bookingConfirmedBadge}>
                <Text style={styles.bookingConfirmedIcon}>✓</Text>
                <Text style={styles.bookingConfirmedText}>Booking Saved!</Text>
              </View>
            )}
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View style={[styles.buttonsContainer, { opacity: opacityAnim }]}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleViewClaimed}>
              <Text style={styles.primaryButtonText}>View My Claims</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToFeed}>
              <Text style={styles.secondaryButtonText}>Back to Feed</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>

      {/* Booking Confirmation Modal */}
      <BookingConfirmationModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        purchaseTokenId={purchaseTokenId}
        businessName={businessName}
        onBookingConfirmed={handleBookingConfirmed}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Success Image
  successAnimationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successImage: {
    width: 350,
    height: 250,
  },

  // Text Container
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.headingBold,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Offer Summary
  offerSummary: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  offerName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.grayLight,
  },

  // Loyalty Section
  loyaltySection: {
    width: '100%',
    alignItems: 'center',
  },
  loyaltyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pointsBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    height: 93,
  },
  pointsEarnedLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  pointsEarnedValue: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
  },

  // Tier Progress
  tierProgressContainer: {
    width: '100%',
    marginBottom: spacing.md,
    maxWidth: 200,
    marginLeft: 20,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  currentTierLabel: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.accent,
  },
  pointsTotal: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.white,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  nextTierText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayLight,
    textAlign: 'center',
  },

  // Level Up Button
  levelUpButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  levelUpButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.white,
  },

  // QR Info Card
  qrInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.transparent,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.white,
  },
  qrInfoIcon: {
    width: 22,
    height: 32,
    marginRight: spacing.md,
  },
  qrInfoText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.white,
    lineHeight: fontSize.sm * 1.5,
  },

  // Buttons
  buttonsContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.transparent,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.grayMedium,
  },

  // Book Now Button
  bookNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  bookNowButtonIcon: {
    fontSize: fontSize.lg,
  },
  bookNowButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },

  // Booking Confirmed Badge
  bookingConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  bookingConfirmedIcon: {
    fontSize: fontSize.md,
    color: colors.white,
  },
  bookingConfirmedText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.white,
  },
});
