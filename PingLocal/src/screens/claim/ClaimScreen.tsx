import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../types/navigation';

const placeholderImage = require('../../../assets/images/placeholder_offer.jpg');

type ClaimScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'Claim'>;
  route: RouteProp<HomeStackParamList, 'Claim'>;
};

export default function ClaimScreen({ navigation, route }: ClaimScreenProps) {
  const { offerId, offer, selectedSlot, partySize = 1 } = route.params;
  const { user, refreshUser } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const isPayUpfront = offer.offer_type === 'Pay up front';
  const hasSlot = !!selectedSlot;
  const businessName = offer.business_name || offer.businesses?.name || 'Unknown Business';
  const businessId = offer.business_id || offer.businesses?.id;

  // Calculate total
  const unitPrice = offer.price_discount || 0;
  const total = unitPrice * quantity;

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const incrementQuantity = () => {
    // Check if there's a quantity limit
    const maxQuantity = offer.quantity ? offer.quantity - offer.number_sold : 10;
    if (quantity < maxQuantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleClaim = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to claim offers');
      return;
    }

    setIsProcessing(true);

    try {
      // For "Pay on the Day" offers, fetch business lead_rate to calculate ping_local_take
      let pingLocalTake = null;
      if (!isPayUpfront && businessId) {
        const { data: business } = await supabase
          .from('businesses')
          .select('lead_rate')
          .eq('id', businessId)
          .single();

        if (business?.lead_rate) {
          // Calculate lead fee based on party size or quantity
          const unitCount = partySize > 1 ? partySize : quantity;
          pingLocalTake = business.lead_rate * unitCount;
        }
      }

      // Create purchase token - matching actual Supabase table columns
      const purchaseTokenData = {
        user_id: user.id,
        user_email: user.email,
        offer_id: offerId,
        offer_name: offer.name,
        purchase_type: offer.offer_type || 'Pay on the day',
        customer_price: isPayUpfront ? total : null,
        ping_local_take: pingLocalTake,
        offer_slot: selectedSlot?.id || null,
        redeemed: false,
        cancelled: false,
        ping_invoiced: false,
        api_requires_sync: false,
      };

      const { data, error } = await supabase
        .from('purchase_tokens')
        .insert(purchaseTokenData)
        .select()
        .single();

      if (error) throw error;

      // If there's a booking slot, increment the booked count
      if (selectedSlot) {
        await supabase
          .from('offer_slots')
          .update({ booked_count: selectedSlot.booked_count + partySize })
          .eq('id', selectedSlot.id);
      }

      // Increment number_sold on the offer
      await supabase
        .from('offers')
        .update({ number_sold: offer.number_sold + quantity })
        .eq('id', offerId);

      // Navigate to success screen
      navigation.navigate('ClaimSuccess', {
        purchaseTokenId: data.id,
        offerName: offer.name,
        businessName,
      });
    } catch (error) {
      console.error('Error claiming offer:', error);
      Alert.alert('Error', 'Failed to claim offer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to purchase offers');
      return;
    }

    if (!businessId) {
      Alert.alert('Error', 'Business information not found');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create payment intent via edge function
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: {
            amount: total,
            offer_id: offerId,
            business_id: businessId,
            user_id: user.id,
            user_email: user.email,
            offer_name: offer.name,
            quantity: quantity,
          },
        }
      );

      if (paymentError || !paymentData?.clientSecret) {
        throw new Error(paymentError?.message || 'Failed to create payment intent');
      }

      // 2. Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: paymentData.clientSecret,
        merchantDisplayName: 'Ping Local',
        defaultBillingDetails: {
          email: user.email,
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // User cancelled - not an error
          setIsProcessing(false);
          return;
        }
        throw new Error(presentError.message);
      }

      // 4. Payment successful - create the purchase token with payment info
      const purchaseTokenData = {
        user_id: user.id,
        user_email: user.email,
        offer_id: offerId,
        offer_name: offer.name,
        purchase_type: offer.offer_type || 'Pay up front',
        customer_price: total,
        ping_local_take: paymentData.platformFee / 100, // Convert from cents
        offer_slot: selectedSlot?.id || null,
        redeemed: false,
        cancelled: false,
        ping_invoiced: false,
        api_requires_sync: false,
      };

      const { data, error } = await supabase
        .from('purchase_tokens')
        .insert(purchaseTokenData)
        .select()
        .single();

      if (error) throw error;

      // If there's a booking slot, increment the booked count
      if (selectedSlot) {
        await supabase
          .from('offer_slots')
          .update({ booked_count: selectedSlot.booked_count + partySize })
          .eq('id', selectedSlot.id);
      }

      // Increment number_sold on the offer
      await supabase
        .from('offers')
        .update({ number_sold: offer.number_sold + quantity })
        .eq('id', offerId);

      // Award loyalty points for Pay Up Front purchases (total × 10)
      const pointsEarned = Math.floor(total * 10);
      if (pointsEarned > 0) {
        // Update user's loyalty points
        const newPoints = (user.loyalty_points || 0) + pointsEarned;
        await supabase
          .from('users')
          .update({ loyalty_points: newPoints })
          .eq('id', user.id);

        // Create loyalty points record
        await supabase.from('loyalty_points').insert({
          user_id: user.id,
          points: pointsEarned,
          reason: `Purchased: ${offer.name}`,
          offer_id: offerId,
        });

        // Refresh user data to update points in context
        if (refreshUser) {
          await refreshUser();
        }
      }

      // Navigate to success screen
      navigation.navigate('ClaimSuccess', {
        purchaseTokenId: data.id,
        offerName: offer.name,
        businessName,
        pointsEarned, // Pass points to success screen
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isPayUpfront ? 'Complete Purchase' : 'Confirm Claim'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Offer Summary Card */}
        <View style={styles.offerCard}>
          <Image
            source={offer.featured_image ? { uri: offer.featured_image } : placeholderImage}
            style={styles.offerImage}
            resizeMode="cover"
          />
          <View style={styles.offerDetails}>
            <Text style={styles.offerName}>{offer.name}</Text>
            <Text style={styles.offerBusiness}>{businessName}</Text>
            {offer.location_area && (
              <Text style={styles.offerLocation}>📍 {offer.location_area}</Text>
            )}
          </View>
        </View>

        {/* Booking Details (if applicable) */}
        {hasSlot && selectedSlot && (
          <View style={styles.bookingDetailsCard}>
            <Text style={styles.cardTitle}>Booking Details</Text>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>📅 Date</Text>
              <Text style={styles.bookingValue}>
                {format(parseISO(selectedSlot.slot_date), 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>🕐 Time</Text>
              <Text style={styles.bookingValue}>{formatTime(selectedSlot.slot_time)}</Text>
            </View>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>👥 Party Size</Text>
              <Text style={styles.bookingValue}>
                {partySize} {partySize === 1 ? 'person' : 'people'}
              </Text>
            </View>
          </View>
        )}

        {/* Party Size (if no slot but has booking) */}
        {!hasSlot && partySize > 0 && (
          <View style={styles.bookingDetailsCard}>
            <Text style={styles.cardTitle}>Booking Details</Text>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>👥 Party Size</Text>
              <Text style={styles.bookingValue}>
                {partySize} {partySize === 1 ? 'person' : 'people'}
              </Text>
            </View>
          </View>
        )}

        {/* Quantity Selector (if quantity_item) */}
        {offer.quantity_item && (
          <View style={styles.quantityCard}>
            <Text style={styles.cardTitle}>Quantity</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  quantity <= 1 && styles.quantityButtonDisabled,
                ]}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>

              <View style={styles.quantityValue}>
                <Text style={styles.quantityNumber}>{quantity}</Text>
              </View>

              <TouchableOpacity
                style={styles.quantityButton}
                onPress={incrementQuantity}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.cardTitle}>Price Details</Text>

          {unitPrice > 0 && (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  {offer.name} {offer.quantity_item && `x ${quantity}`}
                </Text>
                <Text style={styles.priceValue}>£{(unitPrice * quantity).toFixed(2)}</Text>
              </View>

              <View style={styles.priceDivider} />

              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>£{total.toFixed(2)}</Text>
              </View>
            </>
          )}

          {!unitPrice && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>This offer is free!</Text>
              <Text style={styles.priceValue}>£0.00</Text>
            </View>
          )}

          {!isPayUpfront && unitPrice > 0 && (
            <View style={styles.payOnDayNote}>
              <Text style={styles.payOnDayIcon}>ℹ️</Text>
              <Text style={styles.payOnDayText}>
                You'll pay when you visit. Show your QR code to redeem.
              </Text>
            </View>
          )}
        </View>

        {/* Terms Notice */}
        <View style={styles.termsNotice}>
          <Text style={styles.termsText}>
            By {isPayUpfront ? 'purchasing' : 'claiming'} this offer, you agree to the{' '}
            <Text style={styles.termsLink}>Terms & Conditions</Text>
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        {isPayUpfront ? (
          <TouchableOpacity
            style={[styles.actionButton, isProcessing && styles.actionButtonDisabled]}
            onPress={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.actionButtonText}>
                  Pay £{total.toFixed(2)}
                </Text>
                <Text style={styles.actionButtonSubtext}>Secure payment with Stripe</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, isProcessing && styles.actionButtonDisabled]}
            onPress={handleClaim}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.actionButtonText}>Claim Offer</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: fontSize.lg,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  headerSpacer: {
    width: 40,
  },

  scrollView: {
    flex: 1,
  },

  // Offer Card
  offerCard: {
    flexDirection: 'row',
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  offerImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  offerDetails: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  offerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  offerBusiness: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    marginBottom: spacing.xs,
  },
  offerLocation: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
  },

  // Booking Details Card
  bookingDetailsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bookingLabel: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
  },
  bookingValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Quantity Card
  quantityCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: colors.grayMedium,
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: fontSize.xl,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  quantityValue: {
    alignItems: 'center',
    marginHorizontal: spacing.xl,
  },
  quantityNumber: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  // Price Card
  priceCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    flex: 1,
  },
  priceValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.grayLight,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  payOnDayNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accent,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  payOnDayIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  payOnDayText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.grayDark,
  },

  // Terms Notice
  termsNotice: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  termsText: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  // Bottom Container
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
    ...shadows.lg,
  },
  actionButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  actionButtonSubtext: {
    fontSize: fontSize.xs,
    color: colors.grayDark,
    marginTop: 2,
  },
});
