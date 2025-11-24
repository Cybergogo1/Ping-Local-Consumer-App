import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { PurchaseToken } from '../../types/database';

const placeholderImage = require('../../../assets/images/placeholder_offer.jpg');

interface ClaimedOfferCardProps {
  purchaseToken: PurchaseToken;
  onPress: () => void;
  onShowQR: () => void;
}

export default function ClaimedOfferCard({
  purchaseToken,
  onPress,
  onShowQR,
}: ClaimedOfferCardProps) {
  // Use data directly from purchase token (no joins available)
  const offerName = purchaseToken.offer_name || 'Unknown Offer';
  const businessName = 'Business'; // Not stored on purchase_tokens currently

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


  // Use 'created' field instead of 'created_at'
  const claimedDate = purchaseToken.created ? format(parseISO(purchaseToken.created), 'MMM d, yyyy') : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Image - always use placeholder since we don't have featured_image on purchase_tokens */}
      <Image
        source={placeholderImage}
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
        <Text style={styles.claimedDate}>Claimed {claimedDate}</Text>

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
      </View>
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
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  content: {
    padding: spacing.md,
  },
  offerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    marginBottom: spacing.sm,
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
    fontWeight: fontWeight.medium,
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
  },
  claimedDate: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    marginBottom: spacing.md,
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
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
