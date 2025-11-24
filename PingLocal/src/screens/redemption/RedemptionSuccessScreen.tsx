import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, CommonActions } from '@react-navigation/native';
import { ClaimedStackParamList } from '../../types/navigation';

type RedemptionSuccessScreenProps = {
  navigation: StackNavigationProp<ClaimedStackParamList, 'RedemptionSuccess'>;
  route: RouteProp<ClaimedStackParamList, 'RedemptionSuccess'>;
};

export default function RedemptionSuccessScreen({ navigation, route }: RedemptionSuccessScreenProps) {
  const { offerName, businessName } = route.params;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

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
  }, []);

  const handleDone = () => {
    // Go back to claimed list
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'ClaimedMain',
          },
        ],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.successTitle}>Redeemed!</Text>
          <Text style={styles.successSubtitle}>
            Your offer has been successfully redeemed
          </Text>

          {/* Offer Details */}
          <View style={styles.offerSummary}>
            <Text style={styles.offerName}>{offerName}</Text>
            <Text style={styles.businessName}>at {businessName}</Text>
          </View>

          {/* Thank You Message */}
          <View style={styles.thankYouCard}>
            <Text style={styles.thankYouIcon}>🎉</Text>
            <Text style={styles.thankYouText}>
              Thank you for using Ping Local! Enjoy your experience at {businessName}.
            </Text>
          </View>
        </Animated.View>

        {/* Done Button */}
        <Animated.View style={[styles.buttonContainer, { opacity: opacityAnim }]}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
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

  // Thank You Card
  thankYouCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
  },
  thankYouIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  thankYouText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.grayDark,
    lineHeight: fontSize.sm * 1.5,
  },

  // Button
  buttonContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...shadows.sm,
  },
  doneButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
