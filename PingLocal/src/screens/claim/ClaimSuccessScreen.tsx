import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, CommonActions } from '@react-navigation/native';
import { HomeStackParamList } from '../../types/navigation';

type ClaimSuccessScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'ClaimSuccess'>;
  route: RouteProp<HomeStackParamList, 'ClaimSuccess'>;
};

export default function ClaimSuccessScreen({ navigation, route }: ClaimSuccessScreenProps) {
  const { purchaseTokenId, offerName, businessName } = route.params;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Circle grows
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // Checkmark appears
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in content
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Confetti effect
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(confettiOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(confettiOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleViewClaimed = () => {
    // Navigate to Claimed tab
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'HomeFeed',
          },
        ],
      })
    );
    // Then navigate to Claimed tab
    navigation.getParent()?.navigate('Claimed');
  };

  const handleBackToFeed = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'HomeFeed',
          },
        ],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Confetti Animation (simplified with emojis) */}
      <Animated.View style={[styles.confettiContainer, { opacity: confettiOpacity }]}>
        <Text style={[styles.confetti, styles.confetti1]}>🎉</Text>
        <Text style={[styles.confetti, styles.confetti2]}>🎊</Text>
        <Text style={[styles.confetti, styles.confetti3]}>✨</Text>
        <Text style={[styles.confetti, styles.confetti4]}>🎉</Text>
        <Text style={[styles.confetti, styles.confetti5]}>🎊</Text>
      </Animated.View>

      <View style={styles.content}>
        {/* Success Animation */}
        <View style={styles.successAnimationContainer}>
          <Animated.View
            style={[
              styles.successCircle,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Animated.Text
              style={[
                styles.checkmark,
                {
                  transform: [{ scale: checkmarkScale }],
                },
              ]}
            >
              ✓
            </Animated.Text>
          </Animated.View>
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

          {/* QR Info */}
          <View style={styles.qrInfoCard}>
            <Text style={styles.qrInfoIcon}>📱</Text>
            <Text style={styles.qrInfoText}>
              Your QR code is ready! Show it at {businessName} to redeem your offer.
            </Text>
          </View>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Confetti
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    fontSize: 40,
  },
  confetti1: {
    top: '10%',
    left: '10%',
  },
  confetti2: {
    top: '15%',
    right: '15%',
  },
  confetti3: {
    top: '20%',
    left: '50%',
  },
  confetti4: {
    top: '25%',
    left: '20%',
  },
  confetti5: {
    top: '12%',
    right: '25%',
  },

  // Success Animation
  successAnimationContainer: {
    marginBottom: spacing.xl,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  checkmark: {
    fontSize: 60,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },

  // Text Container
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: fontSize.md,
    color: colors.grayDark,
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
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
  },

  // QR Info Card
  qrInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
  },
  qrInfoIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  qrInfoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.grayDark,
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
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.grayLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.grayDark,
  },
});
