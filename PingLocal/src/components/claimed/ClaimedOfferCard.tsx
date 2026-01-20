import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  AppState,
  AppStateStatus,
  ActivityIndicator,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { colors, spacing, borderRadius, fontSize, shadows, fontFamily } from '../../theme';
import { PurchaseToken } from '../../types/database';
import BookingConfirmationModal from '../modals/BookingConfirmationModal';
import { canCancelClaim, cancelClaim } from '../../services/claimCancellationService';

const placeholderImage = require('../../../assets/images/placeholder_offer.jpg');

interface ClaimedOfferCardProps {
  purchaseToken: PurchaseToken;
  onPress: () => void;
  onShowQR: () => void;
  onViewOffer?: () => void; // Navigate to offer detail screen
  onBookingUpdated?: () => void; // Callback to refresh list after booking update
}

export default function ClaimedOfferCard({
  purchaseToken,
  onPress,
  onShowQR,
  onViewOffer,
  onBookingUpdated,
}: ClaimedOfferCardProps) {
  // Use data from purchase token and joined offer data
  const offerName = purchaseToken.offer_name || 'Unknown Offer';
  const businessName = purchaseToken.offers?.business_name || 'Business';
  const featuredImage = purchaseToken.offers?.featured_image;

  // External/call booking data
  const bookingType = purchaseToken.offers?.booking_type as 'external' | 'call' | undefined;
  const bookingUrl = purchaseToken.offers?.booking_url;
  const businessPhoneNumber = purchaseToken.offers?.businesses?.phone_number;
  const isExternalBooking = bookingType === 'external' || bookingType === 'call';
  const hasBookingConfirmed = purchaseToken.booking_confirmed === true;
  const bookingDate = purchaseToken.booking_date;

  // Modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const hasOpenedExternalLink = React.useRef(false);
  const appStateRef = React.useRef(AppState.currentState);

  // Check if this claim can be cancelled
  const showCancelButton = canCancelClaim(purchaseToken);

  // We don't have expiry date without joining to offers table
  const daysUntilExpiry = null;

  // Determine status badge
  const getStatusBadge = () => {
    if (purchaseToken.redeemed) {
      return { text: 'Redeemed', color: colors.grayMedium };
    }
    if (purchaseToken.cancelled) {
      return { text: 'Cancelled', color: colors.error };
    }
    if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
      return { text: 'Expired', color: colors.error };
    }
    if (daysUntilExpiry !== null && daysUntilExpiry <= 3) {
      return { text: `${daysUntilExpiry} days left`, color: '#F59E0B' }; // Orange/warning
    }
    return { text: 'Active', color: colors.success };
  };

  const statusBadge = getStatusBadge();
  const isRedeemable = !purchaseToken.redeemed && !purchaseToken.cancelled && (daysUntilExpiry === null || daysUntilExpiry >= 0);

  // Show Book Now button for external/call offers that haven't confirmed booking yet
  const showBookNowButton = isExternalBooking && !hasBookingConfirmed && isRedeemable;

  // Handle Book Now button press
  const handleBookNow = async () => {
    hasOpenedExternalLink.current = true;

    if (bookingType === 'call' && businessPhoneNumber) {
      const phoneUrl = `tel:${businessPhoneNumber}`;
      try {
        await Linking.openURL(phoneUrl);
      } catch (error) {
        Alert.alert('Error', 'Unable to make phone call');
      }
    } else if (bookingType === 'external' && bookingUrl) {
      try {
        await Linking.openURL(bookingUrl);
      } catch (error) {
        Alert.alert('Error', 'Unable to open booking link');
      }
    }
  };

  // Handle edit booking date
  const handleEditBooking = () => {
    setShowBookingModal(true);
  };

  // Handle booking confirmation
  const handleBookingConfirmed = () => {
    setShowBookingModal(false);
    onBookingUpdated?.();
  };

  // Handle cancel booking press
  const handleCancelPress = () => {
    Alert.alert(
      'Cancel Booking?',
      'Are you sure you want to cancel this booking? You can reclaim this offer afterwards.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            const result = await cancelClaim(purchaseToken);
            setIsCancelling(false);

            if (result.success) {
              Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.');
              onBookingUpdated?.();
            } else {
              Alert.alert('Error', result.error || 'Failed to cancel booking. Please try again.');
            }
          },
        },
      ]
    );
  };

  // AppState listener for detecting return from external link
  React.useEffect(() => {
    if (!isExternalBooking || hasBookingConfirmed) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        hasOpenedExternalLink.current
      ) {
        hasOpenedExternalLink.current = false;
        setShowBookingModal(true);
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isExternalBooking, hasBookingConfirmed]);

  // Use 'created' field instead of 'created_at'
  const claimedDate = purchaseToken.created ? format(parseISO(purchaseToken.created), 'MMM d, yyyy') : '';

  // Format booking date for display (include time if set)
  const formattedBookingDate = bookingDate
    ? (() => {
        const parsed = parseISO(bookingDate);
        // Check if time was stored (not midnight UTC)
        const hasTime = parsed.getHours() !== 0 || parsed.getMinutes() !== 0;
        if (hasTime) {
          return format(parsed, 'EEE, MMM d, yyyy \'at\' h:mm a');
        }
        return format(parsed, 'EEE, MMM d, yyyy');
      })()
    : null;

  // Handle card press - navigate to offer detail if available
  const handleCardPress = () => {
    if (onViewOffer && purchaseToken.offer_id) {
      onViewOffer();
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.8}>
      {/* Image - use featured_image from joined offer data */}
      <Image
        source={featuredImage ? { uri: featuredImage } : placeholderImage}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
        <Text style={styles.statusBadgeText}>{statusBadge.text}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.offerName} numberOfLines={2}>{offerName}</Text>
        <Text style={styles.businessName}>{businessName}</Text>

        {/* Booking Slot Info - not available without joining */}

        {/* Claimed Date */}
        {claimedDate && (
          <Text style={styles.claimedDate}>Claimed {claimedDate}</Text>
        )}

        {/* Booking Date Display - for confirmed external/call bookings */}
        {isExternalBooking && hasBookingConfirmed && formattedBookingDate && (
          <TouchableOpacity
            style={styles.bookingDateContainer}
            onPress={(e) => {
              e.stopPropagation();
              handleEditBooking();
            }}
          >
            <Text style={styles.bookingDateIcon}>📅</Text>
            <Text style={styles.bookingDateText}>{formattedBookingDate}</Text>
            <Text style={styles.bookingDateEdit}>Edit</Text>
          </TouchableOpacity>
        )}

        {/* Book Now Button - for external/call offers without confirmed booking */}
        {showBookNowButton && (
          <TouchableOpacity
            style={styles.bookNowButton}
            onPress={(e) => {
              e.stopPropagation();
              handleBookNow();
            }}
          >
            <Text style={styles.bookNowButtonIcon}>
              {bookingType === 'call' ? '📞' : '🔗'}
            </Text>
            <Text style={styles.bookNowButtonText}>
              {bookingType === 'call' ? 'Call to Book' : 'Book Now'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Action Button */}
        {isRedeemable && (
          <TouchableOpacity
            style={styles.qrButton}
            onPress={(e) => {
              e.stopPropagation();
              onShowQR();
            }}
          >
            <Text style={styles.qrButtonIcon}>📱</Text>
            <Text style={styles.qrButtonText}>Show QR Code</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Button - Only shown for eligible bookings */}
        {showCancelButton && (
          <TouchableOpacity
            style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]}
            onPress={(e) => {
              e.stopPropagation();
              if (!isCancelling) {
                handleCancelPress();
              }
            }}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Text style={styles.cancelButtonIcon}>✕</Text>
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Booking Confirmation Modal */}
      <BookingConfirmationModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        purchaseTokenId={purchaseToken.id}
        businessName={businessName}
        existingBookingDate={bookingDate}
        existingReminderId={purchaseToken.booking_reminder_id}
        onBookingConfirmed={handleBookingConfirmed}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  image: {
    width: '100%',
    height: 140,
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontFamily: fontFamily.bodySemiBold,
  },
  content: {
    padding: spacing.md,
  },
  offerName: {
    fontSize: fontSize.md,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontFamily: fontFamily.headingBold,
  },
  businessName: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.body,
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  slotIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  slotText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
  },
  partyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  partyIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  partyText: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    fontFamily: fontFamily.body,
  },
  claimedDate: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    marginBottom: spacing.md,
    fontFamily: fontFamily.body,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  qrButtonIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  qrButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.bodyBold,
  },

  // Booking Date Display
  bookingDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  bookingDateIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  bookingDateText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  bookingDateEdit: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.success,
  },

  // Book Now Button
  bookNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  bookNowButtonIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  bookNowButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.bodySemiBold,
  },

  // Cancel Button
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  cancelButtonDisabled: {
    opacity: 0.7,
  },
  cancelButtonIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
    color: colors.error,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontFamily: fontFamily.bodySemiBold,
  },
});
