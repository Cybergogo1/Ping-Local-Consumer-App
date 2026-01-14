import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { ClaimedStackParamList } from '../../types/navigation';

type BillConfirmationScreenProps = {
  navigation: StackNavigationProp<ClaimedStackParamList, 'BillConfirmation'>;
  route: RouteProp<ClaimedStackParamList, 'BillConfirmation'>;
};

export default function BillConfirmationScreen({ navigation, route }: BillConfirmationScreenProps) {
  const { purchaseTokenId, redemptionTokenId, billAmount, offerName, businessName } = route.params;
  const { user, refreshUser } = useAuth();

  const [isConfirming, setIsConfirming] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Animation
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Calculate points: bill × 10
    const points = Math.floor(billAmount * 10);
    setPointsEarned(points);

    // Animate in
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [billAmount]);

  // Add realtime subscription to detect if status changes from elsewhere
  useEffect(() => {
    console.log('BillConfirmation: Setting up realtime subscription for redemptionTokenId:', redemptionTokenId);

    const channel = supabase
      .channel(`bill_confirmation_${redemptionTokenId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'redemption_tokens',
          filter: `id=eq.${redemptionTokenId}`,
        },
        (payload) => {
          console.log('BillConfirmation: Redemption token updated:', payload);
          if (payload.new && payload.new.status === 'Finished') {
            console.log('BillConfirmation: Status changed to Finished, navigating to success');
            navigation.replace('RedemptionSuccess', {
              offerName,
              businessName,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('BillConfirmation: Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [redemptionTokenId, offerName, businessName]);

  const handleConfirm = async () => {
    if (!user) return;

    console.log('=== CONFIRM BUTTON CLICKED ===');
    console.log('Confirming bill:', { redemptionTokenId, userId: user.id });
    setIsConfirming(true);

    try {
      console.log('About to call supabase.functions.invoke...');

      // Call the confirm-bill edge function
      const { data, error } = await supabase.functions.invoke('confirm-bill', {
        body: {
          redemption_token_id: redemptionTokenId,
          user_id: user.id,
        },
      });

      console.log('=== FUNCTION RESPONSE RECEIVED ===');
      console.log('Confirm bill response:', JSON.stringify({ data, error }, null, 2));

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('Function returned error:', data?.error);
        throw new Error(data?.error || 'Failed to confirm bill');
      }

      console.log('Bill confirmed successfully, refreshing user...');

      // Refresh user data to update points in context
      if (refreshUser) {
        await refreshUser();
      }

      // Navigate to success
      console.log('Navigating to success screen');
      navigation.replace('RedemptionSuccess', {
        offerName,
        businessName,
      });
    } catch (error) {
      console.error('Error confirming bill:', error);
      Alert.alert('Error', `Failed to confirm bill: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDispute = () => {
    Alert.alert(
      'Dispute Bill',
      'If the bill amount is incorrect, please speak with the staff at the venue. They will update the amount for you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wait for Update',
          onPress: async () => {
            try {
              // Set redemption token status to 'Rejected' so business app can listen for it
              const { error } = await supabase
                .from('redemption_tokens')
                .update({ status: 'Rejected' })
                .eq('id', redemptionTokenId);

              if (error) {
                console.error('Error updating redemption token status:', error);
                Alert.alert('Error', 'Failed to dispute bill. Please try again.');
                return;
              }

              navigation.replace('BillDisputeWaiting', {
                purchaseTokenId,
                redemptionTokenId,
                currentBillAmount: billAmount,
                offerName,
                businessName,
              });
            } catch (error) {
              console.error('Error disputing bill:', error);
              Alert.alert('Error', 'Failed to dispute bill. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🧾</Text>
          <Text style={styles.headerTitle}>Confirm Your Bill</Text>
          <Text style={styles.headerSubtitle}>
            The business has entered your bill amount
          </Text>
        </View>

        {/* Bill Card */}
        <Animated.View
          style={[
            styles.billCard,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.billLabel}>Bill Total</Text>
          <Text style={styles.billAmount}>£{billAmount.toFixed(2)}</Text>

          <View style={styles.divider} />

          <View style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>Points you'll earn</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsIcon}>⭐</Text>
              <Text style={styles.pointsValue}>+{pointsEarned}</Text>
            </View>
          </View>

          <Text style={styles.pointsExplainer}>
            Earn 10 points for every £1 spent
          </Text>
        </Animated.View>

        {/* Offer Info */}
        <View style={styles.offerInfo}>
          <Text style={styles.offerName}>{offerName}</Text>
          <Text style={styles.businessName}>at {businessName}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.confirmButton, isConfirming && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm & Earn Points</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.disputeButton} onPress={handleDispute}>
            <Text style={styles.disputeButtonText}>Amount incorrect?</Text>
          </TouchableOpacity>
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            By confirming, you acknowledge that you have paid this amount at {businessName}.
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
    padding: spacing.md,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.grayDark,
    textAlign: 'center',
  },

  // Bill Card
  billCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  billLabel: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginBottom: spacing.sm,
  },
  billAmount: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.grayLight,
    marginVertical: spacing.md,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.sm,
  },
  pointsLabel: {
    fontSize: fontSize.md,
    color: colors.grayDark,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  pointsIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.xs,
  },
  pointsValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  pointsExplainer: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    textAlign: 'center',
  },

  // Offer Info
  offerInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  offerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
  },

  // Buttons
  buttonsContainer: {
    marginBottom: spacing.lg,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  disputeButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  disputeButtonText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    textDecorationLine: 'underline',
  },

  // Info Note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: 'auto',
  },
  infoIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    lineHeight: fontSize.xs * 1.5,
  },
});
