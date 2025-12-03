import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ImageBackground,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontFamily, shadows } from '../../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, CommonActions } from '@react-navigation/native';
import { HomeStackParamList } from '../../types/navigation';
import { TierName } from '../../types/database';

type LevelUpScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'LevelUp'>;
  route: RouteProp<HomeStackParamList, 'LevelUp'>;
};

// Tier display names
const TIER_DISPLAY_NAMES: Record<TierName, string> = {
  member: 'Member',
  hero: 'Hero',
  champion: 'Champion',
  legend: 'Legend',
};

export default function LevelUpScreen({ navigation, route }: LevelUpScreenProps) {
  const { previousTier, newTier, pointsEarned, totalPoints } = route.params;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const titleSlideAnim = useRef(new Animated.Value(50)).current;

  const newTierName = TIER_DISPLAY_NAMES[newTier as TierName] || newTier;

  useEffect(() => {
    // Hide tab bar
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(titleSlideAnim, {
        toValue: 0,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  const handleContinue = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'HomeFeed' }],
      })
    );
  };

  const handleViewTiers = () => {
    // Navigate to Account tab and then to LoyaltyTiers
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'HomeFeed' }],
      })
    );
    navigation.getParent()?.navigate('Account', {
      screen: 'LoyaltyTiers',
    });
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/onboardbg.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Graphic */}
          <Animated.View
            style={[
              styles.graphicContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={require('../../../assets/images/loyaltylandingpage_graphic.png')}
              style={styles.graphic}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Title and Info */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: titleSlideAnim }],
              },
            ]}
          >
            <Text style={styles.congratsText}>Congratulations!</Text>
            <Text style={styles.levelUpTitle}>You're now a {newTierName}!</Text>
            <Text style={styles.subtitle}>{newTierName}s</Text>

            {/* Points Summary */}
            <View style={styles.pointsSummary}>
              <Text style={styles.pointsLabel}>Total Points</Text>
              <Text style={styles.pointsValue}>{totalPoints}</Text>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View style={[styles.buttonsContainer, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
              <Text style={styles.primaryButtonText}>Lets Go!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
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

  // Graphic
  graphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  graphic: {
    width: 300,
    height: 250,
  },

  // Text Container
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  congratsText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.body,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  levelUpTitle: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.headingBold,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Points Summary
  pointsSummary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayLight,
    marginBottom: spacing.xs,
  },
  pointsValue: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.headingBold,
    color: colors.accent,
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
});
