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
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../../theme';
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
    <ImageBackground
      source={require('../../../assets/images/onboardbg.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Success Graphic */}
          <Animated.View
            style={[
              styles.successAnimationContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={require('../../../assets/images/welcomescreen_graphic.png')}
              style={styles.successGraphic}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Success Text */}
          <Animated.View style={[styles.textContainer, { opacity: opacityAnim }]}>
            <Text style={styles.successTitle}>Redeemed!</Text>
            <Text style={styles.successSubtitle}>
              Your offer has been successfully redeemed
            </Text>

            {/* Offer Details */}
            <View style={styles.offerSummary}>
              <Text style={styles.offerName}>{offerName}</Text>
              <Text style={styles.businessNameText}>at {businessName}</Text>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
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

  // Success Graphic
  successAnimationContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  successGraphic: {
    width: 300,
    height: 300,
  },

  // Text Container
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
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
    fontFamily: fontFamily.headingSemiBold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  businessNameText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.grayLight,
  },

  // Thank You Card
  thankYouCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.transparent,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  thankYouIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  thankYouText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.white,
    lineHeight: fontSize.sm * 1.5,
  },

  // Button
  buttonContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  doneButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
});
