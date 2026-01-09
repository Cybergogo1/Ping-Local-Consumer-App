import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, shadows, fontFamily } from '../../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, CommonActions } from '@react-navigation/native';
import { ClaimedStackParamList } from '../../types/navigation';
import { RedemptionToken } from '../../types/database';

type RedemptionWaitingScreenProps = {
  navigation: StackNavigationProp<ClaimedStackParamList, 'RedemptionWaiting'>;
  route: RouteProp<ClaimedStackParamList, 'RedemptionWaiting'>;
};

export default function RedemptionWaitingScreen({ navigation, route }: RedemptionWaitingScreenProps) {
  const {
    purchaseTokenId,
    redemptionTokenId,
    offerName,
    businessName,
  } = route.params;

  // Pulse animation for the icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Subscribe to realtime updates on the redemption token
  // Navigate when:
  // - status='Submitted' with bill amount -> BillConfirmation (pay on the day)
  // - status='Finished' without bill amount -> RedemptionSuccess (regular offers)
  useEffect(() => {
    const channel = supabase
      .channel(`redemption_waiting_${redemptionTokenId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'redemption_tokens',
          filter: `id=eq.${redemptionTokenId}`,
        },
        (payload) => {
          console.log('Redemption token updated during waiting:', payload);
          if (payload.new) {
            const updatedToken = payload.new as RedemptionToken;
            const billAmount = updatedToken.bill_input_total || updatedToken.bill_amount;

            // Pay on the day: status='Submitted' with bill amount -> go to bill confirmation
            if (updatedToken.status === 'Submitted' && billAmount) {
              navigation.replace('BillConfirmation', {
                purchaseTokenId,
                redemptionTokenId,
                billAmount,
                offerName,
                businessName,
              });
              return;
            }

            // Regular offer: status='Finished' -> go to success
            if (updatedToken.status === 'Finished') {
              navigation.replace('RedemptionSuccess', {
                offerName,
                businessName,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [redemptionTokenId, purchaseTokenId, offerName, businessName]);

  const handleCancel = () => {
    // Navigate back to Claimed main screen
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'ClaimedMain' }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.iconText}>📱</Text>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>QR Code Scanned!</Text>

        {/* Message */}
        <Text style={styles.message}>
          The business is now processing your redemption. Please stay on this screen.
        </Text>

        {/* Spinner */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>What's happening?</Text>
          <Text style={styles.infoText}>
            Staff are confirming your offer details. This screen will automatically update when they're done.
          </Text>
        </View>

        {/* Offer Details */}
        <View style={styles.offerDetails}>
          <Text style={styles.offerName}>{offerName}</Text>
          <Text style={styles.businessName}>at {businessName}</Text>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel & Go Back</Text>
        </TouchableOpacity>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpIcon}>ℹ️</Text>
          <Text style={styles.helpText}>
            Please don't close this screen. The business needs to complete the redemption process on their end.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  iconText: {
    fontSize: 48,
  },

  // Title
  title: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // Message
  message: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  // Spinner
  spinnerContainer: {
    marginBottom: spacing.xl,
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  infoLabel: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },

  // Offer Details
  offerDetails: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  offerName: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
  },

  // Cancel Button
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.grayMedium,
    marginBottom: spacing.lg,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.grayMedium,
  },

  // Help Container
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: 'auto',
    width: '100%',
  },
  helpIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  helpText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    lineHeight: fontSize.xs * 1.5,
  },
});
