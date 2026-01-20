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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Use fields directly from purchase token (no joins)
  const offerName = purchaseToken.offer_name || 'Your Offer';
  const businessName = 'Business'; // We don't have business name on purchase_tokens currently

  // Create redemption token on mount, delete on unmount if not scanned
  useEffect(() => {
    let createdTokenId: number | null = null;
    let isMounted = true;

    console.log('[QR] === useEffect MOUNT === purchaseToken.id:', purchaseToken.id);

    const createRedemptionToken = async () => {
      try {
        console.log('[QR] Step 1: Checking for existing tokens...');

        // Check if there's a finished redemption (already fully redeemed)
        const { data: finishedToken } = await supabase
          .from('redemption_tokens')
          .select('id, status')
          .eq('purchase_token_id', purchaseToken.id)
          .eq('status', 'Finished')
          .single();

        if (finishedToken) {
          console.log('[QR] Found finished token, offer already redeemed:', finishedToken.id);
          // Could show an error to user here if needed
          return;
        }

        // Delete any unscanned tokens (abandoned attempts) for database tidiness
        // Keep scanned tokens so Adalo can still use them
        console.log('[QR] Deleting any previous unscanned tokens...');
        const deleteResult = await supabase
          .from('redemption_tokens')
          .delete()
          .eq('purchase_token_id', purchaseToken.id)
          .eq('scanned', false);

        console.log('[QR] Delete result:', deleteResult.error ? deleteResult.error : 'success');

        // Check if component unmounted during the delete
        if (!isMounted) {
          console.log('[QR] Component unmounted during delete, aborting');
          return;
        }

        console.log('[QR] Step 2: Creating new redemption token...');

        // Create new redemption token
        const { data, error } = await supabase
          .from('redemption_tokens')
          .insert({
            purchase_token_id: purchaseToken.id,
            customer_id: purchaseToken.user_id,
            customer_name: purchaseToken.user_email,
            customer_phone_no: purchaseToken.customer_phone_no || null,
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
          console.error('[QR] ERROR creating redemption token:', error);
          return;
        }

        console.log('[QR] Created token successfully. ID:', data.id);

        // Check if component unmounted during the insert
        if (!isMounted) {
          console.log('[QR] Component unmounted during insert, cleaning up token:', data.id);
          // Clean up the token we just created since component is gone
          await supabase
            .from('redemption_tokens')
            .delete()
            .eq('id', data.id)
            .eq('scanned', false);
          return;
        }

        createdTokenId = data.id;
        console.log('[QR] Step 3: Setting state. redemptionTokenId =', data.id);
        setRedemptionTokenId(data.id);
      } catch (error) {
        console.error('[QR] EXCEPTION in createRedemptionToken:', error);
      }
    };

    createRedemptionToken();

    // Cleanup: delete token only if it hasn't been scanned yet
    return () => {
      console.log('[QR] === useEffect CLEANUP ===');
      console.log('[QR] createdTokenId:', createdTokenId);

      isMounted = false;
      if (createdTokenId) {
        console.log('[QR] Deleting unscanned token:', createdTokenId);
        supabase
          .from('redemption_tokens')
          .delete()
          .eq('id', createdTokenId)
          .eq('scanned', false) // Only delete if NOT scanned - keep scanned tokens for Adalo
          .then(({ error }) => {
            if (error) {
              console.error('[QR] ERROR deleting token in cleanup:', error);
            } else {
              console.log('[QR] Successfully deleted token in cleanup:', createdTokenId);
            }
          });
      } else {
        console.log('[QR] No token to delete');
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [purchaseToken.id]);

  // Subscribe to redemption token updates - only when we have a valid redemptionTokenId
  useEffect(() => {
    console.log('[QR] === Subscription useEffect === redemptionTokenId:', redemptionTokenId);

    if (!redemptionTokenId) {
      console.log('[QR] No redemptionTokenId yet, skipping subscription setup');
      return;
    }

    // Use redemptionTokenId in channel name to ensure unique subscription per token
    const channelName = `redemption_token_${redemptionTokenId}_${Date.now()}`;
    console.log('[QR] Setting up realtime subscription. Channel:', channelName);
    console.log('[QR] Filter: id=eq.' + redemptionTokenId);

    const redemptionChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'redemption_tokens',
          filter: `id=eq.${redemptionTokenId}`,
        },
        (payload) => {
          console.log('[QR] ========== REALTIME EVENT RECEIVED ==========');
          console.log('[QR] Event type:', payload.eventType);
          console.log('[QR] Old:', JSON.stringify(payload.old));
          console.log('[QR] New:', JSON.stringify(payload.new));

          if (payload.new) {
            const newToken = payload.new as RedemptionToken;
            console.log('[QR] Token scanned:', newToken.scanned, 'status:', newToken.status);
            setRedemptionToken(newToken);

            // Get bill amount (database uses bill_input_total)
            const billAmount = newToken.bill_input_total || newToken.bill_amount;

            // Pay on the day: status='Submitted' with bill amount -> go to bill confirmation
            if (newToken.status === 'Submitted' && billAmount) {
              console.log('[QR] Navigating to BillConfirmation');
              navigation.replace('BillConfirmation', {
                purchaseTokenId: purchaseToken.id,
                redemptionTokenId: newToken.id,
                billAmount: billAmount,
                offerName,
                businessName,
              });
              return;
            }

            // If scanned or status is 'In Progress', navigate to waiting screen
            // This applies to ALL promotions
            if ((newToken.scanned || newToken.status === 'In Progress') && newToken.status !== 'Finished') {
              console.log('[QR] Navigating to RedemptionWaiting');
              navigation.replace('RedemptionWaiting', {
                purchaseTokenId: purchaseToken.id,
                redemptionTokenId: newToken.id,
                offerName,
                businessName,
              });
              return;
            }

            // Regular offer: status='Finished' -> go to success
            if (newToken.status === 'Finished') {
              console.log('[QR] Navigating to RedemptionSuccess');
              navigation.replace('RedemptionSuccess', {
                offerName,
                businessName,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[QR] Subscription status:', status);
      });

    return () => {
      console.log('[QR] Removing subscription channel:', channelName);
      supabase.removeChannel(redemptionChannel);
    };
  }, [redemptionTokenId, purchaseToken.id]);

  const fetchRedemptionToken = async () => {
    try {
      const { data, error } = await supabase
        .from('redemption_tokens')
        .select('*')
        .eq('purchase_token_id', purchaseToken.id)
        .single();

      if (data && !error) {
        setRedemptionToken(data);

        // Get bill amount (database uses bill_input_total)
        const billAmount = data.bill_input_total || data.bill_amount;

        // Pay on the day: status='Submitted' with bill amount -> go to bill confirmation
        if (data.status === 'Submitted' && billAmount) {
          navigation.replace('BillConfirmation', {
            purchaseTokenId: purchaseToken.id,
            redemptionTokenId: data.id,
            billAmount: billAmount,
            offerName,
            businessName,
          });
          return;
        }

        // If scanned or status is 'In Progress', navigate to waiting screen
        // This applies to ALL promotions
        if ((data.scanned || data.status === 'In Progress') && data.status !== 'Finished') {
          navigation.replace('RedemptionWaiting', {
            purchaseTokenId: purchaseToken.id,
            redemptionTokenId: data.id,
            offerName,
            businessName,
          });
          return;
        }

        // Regular offer: status='Finished' -> go to success
        if (data.status === 'Finished') {
          navigation.replace('RedemptionSuccess', {
            offerName,
            businessName,
          });
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
