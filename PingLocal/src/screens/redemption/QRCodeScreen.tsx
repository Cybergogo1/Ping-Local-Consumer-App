import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ImageBackground,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows, fontFamily } from '../../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { ClaimedStackParamList } from '../../types/navigation';
import { RedemptionToken } from '../../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_QR_SIZE = Math.min(SCREEN_WIDTH * 0.5, 260); // Cap at 60% screen width or 260px

type QRCodeScreenProps = {
  navigation: StackNavigationProp<ClaimedStackParamList, 'QRCode'>;
  route: RouteProp<ClaimedStackParamList, 'QRCode'>;
};

export default function QRCodeScreen({ navigation, route }: QRCodeScreenProps) {
  const { purchaseToken } = route.params;
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [redemptionToken, setRedemptionToken] = useState<RedemptionToken | null>(null);
  const [redemptionTokenId, setRedemptionTokenId] = useState<number | null>(null);
  const isScannedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Use fields directly from purchase token (no joins)
  const offerName = purchaseToken.offer_name || 'Your Offer';
  const businessName = 'Business'; // We don't have business name on purchase_tokens currently

  // Create redemption token on mount, delete on unmount if not scanned
  useEffect(() => {
    let createdTokenId: number | null = null;

    const createRedemptionToken = async () => {
      try {
        // Check if a redemption token already exists for this purchase
        const { data: existing } = await supabase
          .from('redemption_tokens')
          .select('id, scanned, status')
          .eq('purchase_token_id', purchaseToken.id)
          .single();

        if (existing) {
          // If token exists but wasn't scanned, we can reuse it
          if (!existing.scanned && existing.status === 'Pending') {
            createdTokenId = existing.id;
            setRedemptionTokenId(existing.id);
            isScannedRef.current = false;
            return;
          }

          // If token was scanned or is in progress/finished, delete it and create fresh
          // (This handles the case where user left screen and came back)
          if (!existing.scanned || existing.status === 'Pending') {
            await supabase
              .from('redemption_tokens')
              .delete()
              .eq('id', existing.id);
          } else {
            // Token was already scanned, use it
            createdTokenId = existing.id;
            setRedemptionTokenId(existing.id);
            isScannedRef.current = existing.scanned;
            return;
          }
        }

        // Create new redemption token
        const { data, error } = await supabase
          .from('redemption_tokens')
          .insert({
            purchase_token_id: purchaseToken.id,
            customer_id: purchaseToken.user_id,
            customer_name: purchaseToken.user_email,
            offer_name: purchaseToken.offer_name,
            promotion_id: purchaseToken.offer_id,
            business_id: purchaseToken.business_id,
            scanned: false,
            status: 'Pending',
            completed: false,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating redemption token:', error);
          return;
        }

        createdTokenId = data.id;
        setRedemptionTokenId(data.id);
        console.log('Created redemption token:', data.id);
      } catch (error) {
        console.error('Error in createRedemptionToken:', error);
      }
    };

    createRedemptionToken();

    // Cleanup: delete token if not scanned when user leaves
    return () => {
      if (createdTokenId && !isScannedRef.current) {
        supabase
          .from('redemption_tokens')
          .delete()
          .eq('id', createdTokenId)
          .eq('scanned', false) // Only delete if still not scanned
          .then(({ error }) => {
            if (error) {
              console.error('Error deleting redemption token:', error);
            } else {
              console.log('Deleted unused redemption token:', createdTokenId);
            }
          });
      }
    };
  }, [purchaseToken.id]);

  // Pulse animation for the QR code
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Subscribe to realtime updates on this purchase token
  useEffect(() => {
    const channel = supabase
      .channel(`purchase_token_${purchaseToken.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'purchase_tokens',
          filter: `id=eq.${purchaseToken.id}`,
        },
        (payload) => {
          console.log('Purchase token updated:', payload);
          if (payload.new && (payload.new as any).redeemed === true) {
            setIsRedeemed(true);
            // Check for redemption token to get bill amount
            fetchRedemptionToken();
          }
        }
      )
      .subscribe();

    // Also subscribe to redemption_tokens for this purchase
    const redemptionChannel = supabase
      .channel(`redemption_token_${purchaseToken.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'redemption_tokens',
          filter: `purchase_token_id=eq.${purchaseToken.id}`,
        },
        (payload) => {
          console.log('Redemption token update:', payload);
          if (payload.new) {
            const newToken = payload.new as RedemptionToken;
            setRedemptionToken(newToken);

            // Update scanned ref so cleanup doesn't delete
            if (newToken.scanned) {
              isScannedRef.current = true;
            }

            // Get bill amount (database uses bill_input_total)
            const billAmount = newToken.bill_input_total || newToken.bill_amount;

            // If finished and has bill amount, navigate to bill confirmation
            if (newToken.status === 'Finished' && billAmount) {
              navigation.replace('BillConfirmation', {
                purchaseTokenId: purchaseToken.id,
                redemptionTokenId: newToken.id,
                billAmount: billAmount,
                offerName,
                businessName,
              });
            } else if (newToken.status === 'Finished') {
              // No bill amount needed, go to success
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
      supabase.removeChannel(redemptionChannel);
    };
  }, [purchaseToken.id]);

  const fetchRedemptionToken = async () => {
    try {
      const { data, error } = await supabase
        .from('redemption_tokens')
        .select('*')
        .eq('purchase_token_id', purchaseToken.id)
        .single();

      if (data && !error) {
        setRedemptionToken(data);

        // Update scanned ref
        if (data.scanned) {
          isScannedRef.current = true;
        }

        // Get bill amount (database uses bill_input_total)
        const billAmount = data.bill_input_total || data.bill_amount;

        // Navigate based on status
        if (data.status === 'Finished') {
          if (billAmount) {
            navigation.replace('BillConfirmation', {
              purchaseTokenId: purchaseToken.id,
              redemptionTokenId: data.id,
              billAmount: billAmount,
              offerName,
              businessName,
            });
          } else {
            navigation.replace('RedemptionSuccess', {
              offerName,
              businessName,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching redemption token:', error);
    }
  };

  // Check if already redeemed on mount
  useEffect(() => {
    if (purchaseToken.redeemed) {
      setIsRedeemed(true);
      fetchRedemptionToken();
    }
  }, []);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../../assets/images/onboardbg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Here's your QR Code!</Text>
              <Text style={styles.instructionsText}>
                Present this to staff at {businessName} to redeem your offer
              </Text>
            </View>

            {/* QR Code */}
            <Animated.View
              style={[
                styles.qrContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.qrWrapper}>
                <QRCode
                  value={String(purchaseToken.id)}
                  size={MAX_QR_SIZE}
                  backgroundColor={colors.white}
                  color={colors.primary}
                />
              </View>

              {/* Scanning indicator */}
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.scanningText}>Waiting to be scanned...</Text>
              </View>
            </Animated.View>

            {/* Offer Details */}
            <View style={styles.offerDetails}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, color: colors.grayLight }}>Redeeming</Text>
              <Text style={styles.offerName}>{offerName}</Text>
              <Text style={styles.businessName}>{businessName}</Text>
            </View>

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpIcon}>ℹ️</Text>
              <Text style={styles.helpText}>
                Keep this screen visible until staff confirm your redemption. The screen will automatically update when complete.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  backgroundImage: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 35,
    color: colors.primary,
    fontFamily: fontFamily.body,
  },

  // Instructions
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  instructionsTitle: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.headingBold,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  // QR Container
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  qrWrapper: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.full,
  },
  scanningText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.white,
    marginLeft: spacing.sm,
  },

  // Offer Details
  offerDetails: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  offerName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  detailIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },

  // Help Container
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  helpIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  helpText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: fontSize.sm * 1.5,
  },
});
