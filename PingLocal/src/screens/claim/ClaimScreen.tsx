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
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize, fontFamily, shadows } from '../../theme';
import { getTierFromPoints } from '../../types/database';
import { useNotifications } from '../../contexts/NotificationContext';
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
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const isPayUpfront = offer.offer_type === 'Pay up front';
  const hasSlot = !!selectedSlot;
  const businessName = offer.business_name || offer.businesses?.name || 'Unknown Business';
  const businessId = offer.business_id || offer.businesses?.id;

  // Check if this is an external/call booking offer
  const isExternalBooking = offer.booking_type === 'external';
  const isCallBooking = offer.booking_type === 'call';
  const requiresExternalBooking = isExternalBooking || isCallBooking;

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
        business_id: businessId || null,
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
          .update({ booked_count: (selectedSlot.booked_count || 0) + partySize })
          .eq('id', selectedSlot.id);
      }

      // Increment number_sold on the offer
      await supabase
        .from('offers')
        .update({ number_sold: (offer.number_sold || 0) + quantity })
        .eq('id', offerId);

      // Send purchase notification to business
      try {
        const customerName = user.first_name && user.surname
          ? `${user.first_name} ${user.surname}`
          : user.email || 'A customer';

        await supabase.functions.invoke('notify-purchase', {
          body: {
            offer_id: offerId,
            offer_name: offer.name,
            business_id: businessId,
            business_name: businessName,
            consumer_user_id: user.id,
            consumer_name: customerName,
            amount: null, // Pay on the day
            purchase_type: 'Pay on the day',
            booking_date: selectedSlot?.slot_date,
            booking_time: selectedSlot?.slot_time,
          },
        });
      } catch (notifError) {
        // Don't fail the purchase if notification fails
        console.error('Error sending purchase notification:', notifError);
      }

      // Send notification to user (creates in-app notification)
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            type: 'offer_claimed',
            user_id: user.id,
            offer_id: offerId.toString(),
            offer_title: offer.name,
            business_id: businessId?.toString(),
            business_name: businessName,
            purchase_type: 'claim',
            claim_id: data.id.toString(),
          },
        });
      } catch (notifError) {
        console.error('Error sending user notification:', notifError);
      }

      // Navigate to success screen
      navigation.navigate('ClaimSuccess', {
        purchaseTokenId: data.id,
        offerName: offer.name,
        businessName,
        // External/call booking data
        isExternalBooking: requiresExternalBooking,
        bookingType: offer.booking_type as 'external' | 'call' | undefined,
        bookingUrl: offer.booking_url,
        businessPhoneNumber: offer.businesses?.phone_number,
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
        business_id: businessId || null,
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
          .update({ booked_count: (selectedSlot.booked_count || 0) + partySize })
          .eq('id', selectedSlot.id);
      }

      // Increment number_sold on the offer
      await supabase
        .from('offers')
        .update({ number_sold: (offer.number_sold || 0) + quantity })
        .eq('id', offerId);

      // Award loyalty points for Pay Up Front purchases (total × 10)
      const pointsEarned = Math.floor(total * 10);
      const oldPoints = user.loyalty_points || 0;
      const newPoints = oldPoints + pointsEarned;

      // Detect tier change
      const previousTier = getTierFromPoints(oldPoints);
      const newTier = getTierFromPoints(newPoints);

      if (pointsEarned > 0) {
        // Update user's loyalty points
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

        // Send loyalty points notification to user
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              type: 'loyalty_points_earned',
              user_id: user.id,
              points_earned: pointsEarned,
              reason: 'purchase',
              offer_id: offerId.toString(),
              offer_title: offer.name,
            },
          });
        } catch (notifError) {
          console.error('Error sending loyalty points notification:', notifError);
        }

        // If tier changed, send tier upgrade notification
        if (newTier !== previousTier) {
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                type: 'loyalty_upgrade',
                user_id: user.id,
                new_tier: newTier,
              },
            });
          } catch (notifError) {
            console.error('Error sending tier upgrade notification:', notifError);
          }
        }

        // Refresh user data to update points in context
        if (refreshUser) {
          await refreshUser();
        }
      }

      // Send purchase notification to business
      try {
        const customerName = user.first_name && user.surname
          ? `${user.first_name} ${user.surname}`
          : user.email || 'A customer';

        await supabase.functions.invoke('notify-purchase', {
          body: {
            offer_id: offerId,
            offer_name: offer.name,
            business_id: businessId,
            business_name: businessName,
            consumer_user_id: user.id,
            consumer_name: customerName,
            amount: total,
            purchase_type: 'Pay up front',
            booking_date: selectedSlot?.slot_date,
            booking_time: selectedSlot?.slot_time,
          },
        });
      } catch (notifError) {
        // Don't fail the purchase if notification fails
        console.error('Error sending purchase notification:', notifError);
      }

      // Send notification to user (creates in-app notification)
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            type: 'offer_claimed',
            user_id: user.id,
            offer_id: offerId.toString(),
            offer_title: offer.name,
            business_id: businessId?.toString(),
            business_name: businessName,
            purchase_type: 'purchase',
            claim_id: data.id.toString(),
          },
        });
      } catch (notifError) {
        console.error('Error sending user notification:', notifError);
      }

      // Navigate to success screen with tier info
      navigation.navigate('ClaimSuccess', {
        purchaseTokenId: data.id,
        offerName: offer.name,
        businessName,
        pointsEarned,
        previousTier,
        newTier,
        totalPoints: newPoints,
        // External/call booking data
        isExternalBooking: requiresExternalBooking,
        bookingType: offer.booking_type as 'external' | 'call' | undefined,
        bookingUrl: offer.booking_url,
        businessPhoneNumber: offer.businesses?.phone_number,
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header - extends edge to edge */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Image source={require('../../../assets/images/iconback.png')} style={styles.headerButtonIcon} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconnotifications.png')} style={styles.headerButtonIcon} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconsettings.png')} style={styles.headerButtonIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
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
                <View style={styles.locationNameRow}>
                  <Image
                    source={require('../../../assets/images/iconlocation.png')}
                    style={styles.locationIcon}
                  />
                  <Text style={styles.offerLocation}>{offer.location_area}</Text>
                </View>
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

        {/* Party Size (if no slot but has booking and requires_booking is true, exclude external/call bookings) */}
        {!hasSlot && partySize > 0 && offer.requires_booking && !requiresExternalBooking && (
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

        {/* External/Call Booking Notice */}
        {requiresExternalBooking && (
          <View style={styles.externalBookingNotice}>
            <View style={styles.externalBookingIconContainer}>
              <Text style={styles.externalBookingIcon}>
                {isCallBooking ? '📞' : '🌐'}
              </Text>
            </View>
            <View style={styles.externalBookingContent}>
              <Text style={styles.externalBookingTitle}>
                {isCallBooking ? 'Book by Phone' : 'Book Online'}
              </Text>
              <Text style={styles.externalBookingText}>
                After claiming, you'll need to {isCallBooking ? 'call' : 'visit'} {businessName} directly to make your booking. Make sure to mention you're using a Ping Local promotion!
              </Text>
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
                  {offer.name}{offer.quantity_item ? ` x ${quantity}` : ''}
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

          {!unitPrice && isPayUpfront && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>This offer is free!</Text>
              <Text style={styles.priceValue}>£0.00</Text>
            </View>
          )}

          {!isPayUpfront && (
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
            <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>Terms & Conditions</Text>
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

      {/* Terms & Conditions Modal */}
      <Modal
        visible={showTermsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTermsModal(false)}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {/* Business Policy */}
              {offer?.business_policy && (
                <>
                  <Text style={styles.modalSectionTitle}>Business Policy</Text>
                  <Text style={styles.modalText}>{offer.business_policy}</Text>
                </>
              )}

              {/* Policy Notes */}
              {offer?.policy_notes && (
                <>
                  <Text style={[styles.modalSectionTitle, { marginTop: spacing.md }]}>
                    Additional Notes
                  </Text>
                  <Text style={styles.modalText}>{offer.policy_notes}</Text>
                </>
              )}

              {/* Fallback if no policy exists */}
              {!offer?.business_policy && !offer?.policy_notes && (
                <>
                  <Text style={styles.modalSectionTitle}>Standard Terms</Text>
                  <Text style={styles.modalText}>
                    • This offer is subject to availability{'\n'}
                    • Cannot be combined with other offers{'\n'}
                    • Must be redeemed within the validity period{'\n'}
                    • The business reserves the right to refuse service{'\n'}
                    • No cash alternative available
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#203C50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButtonIcon: {
    width: 16,
    height: 16,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
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
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  offerBusiness: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    marginBottom: spacing.xs,
  },
  locationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: spacing.xs,
  },
  locationIcon: {
    width: 16,
    height: 16,
    marginRight: spacing.xs,
  },
  offerLocation: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
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
    fontFamily: fontFamily.headingBold,
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
    fontFamily: fontFamily.body,
    color: colors.grayDark,
  },
  bookingValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
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
    fontFamily: fontFamily.bodyBold,
  },
  quantityValue: {
    alignItems: 'center',
    marginHorizontal: spacing.xl,
  },
  quantityNumber: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.headingBold,
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
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    flex: 1,
  },
  priceValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.grayLight,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
  },
  payOnDayNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  payOnDayIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  payOnDayText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    marginTop: spacing.xs,
  },

  // Terms Notice
  termsNotice: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  termsText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fontFamily.bodySemiBold,
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
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
  actionButtonSubtext: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    marginTop: 2,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: fontSize.xl,
    color: colors.grayDark,
    lineHeight: 28,
  },
  modalBody: {
    padding: spacing.md,
  },
  modalSectionTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingSemiBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  modalText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    lineHeight: 22,
  },

  // External/Call Booking Notice
  externalBookingNotice: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FFF9E6',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#F5D75A30',
  },
  externalBookingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5D75A40',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  externalBookingIcon: {
    fontSize: fontSize.lg,
  },
  externalBookingContent: {
    flex: 1,
  },
  externalBookingTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  externalBookingText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    lineHeight: 18,
  },
});
