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

type BillDisputeWaitingScreenProps = {
  navigation: StackNavigationProp<ClaimedStackParamList, 'BillDisputeWaiting'>;
  route: RouteProp<ClaimedStackParamList, 'BillDisputeWaiting'>;
};

export default function BillDisputeWaitingScreen({ navigation, route }: BillDisputeWaitingScreenProps) {
  const {
    purchaseTokenId,
    redemptionTokenId,
    currentBillAmount,
    offerName,
    businessName,
  } = route.params;

  // Pulse animation for the spinner
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
  // Listen for status change to 'Submitted' when business resubmits a new bill amount
  useEffect(() => {
    const channel = supabase
      .channel(`redemption_dispute_${redemptionTokenId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'redemption_tokens',
          filter: `id=eq.${redemptionTokenId}`,
        },
        (payload) => {
          console.log('Redemption token updated during dispute:', payload);
          if (payload.new) {
            const updatedToken = payload.new as RedemptionToken;
            const newBillAmount = updatedToken.bill_input_total || updatedToken.bill_amount;

            // Check if status changed to 'Submitted' (business resubmitted bill)
            // or if bill amount has changed
            if (updatedToken.status === 'Submitted' && newBillAmount) {
              // Navigate to BillConfirmation with the new amount
              navigation.replace('BillConfirmation', {
                purchaseTokenId,
                redemptionTokenId,
                billAmount: newBillAmount,
                offerName,
                businessName,
              });
            } else if (newBillAmount && newBillAmount !== currentBillAmount) {
              // Fallback: also navigate if bill amount changed (even without status change)
              navigation.replace('BillConfirmation', {
                purchaseTokenId,
                redemptionTokenId,
                billAmount: newBillAmount,
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
  }, [redemptionTokenId, currentBillAmount, purchaseTokenId, offerName, businessName]);

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
          <Text style={styles.iconText}>🧾</Text>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Waiting for Staff</Text>

        {/* Message */}
        <Text style={styles.message}>
          The staff are confirming your bill. Please wait and stay on this screen.
        </Text>

        {/* Spinner */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>

        {/* Current Amount Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Previous bill amount</Text>
          <Text style={styles.infoAmount}>£{currentBillAmount.toFixed(2)}</Text>
          <Text style={styles.infoNote}>
            Speak to staff if you believe this is incorrect
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
            The screen will automatically update when staff enter a new bill amount.
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
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    marginBottom: spacing.xs,
  },
  infoAmount: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.headingBold,
    color: colors.grayMedium,
    marginBottom: spacing.sm,
    textDecorationLine: 'line-through',
  },
  infoNote: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    textAlign: 'center',
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
