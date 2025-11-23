import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { Offer } from '../../types/database';

// Placeholder image when no featured image is available
const placeholderImage = require('../../../assets/images/placeholder_offer.jpg');

interface PromotionCardProps {
  offer: Offer;
  onPress: () => void;
}

export default function PromotionCard({ offer, onPress }: PromotionCardProps) {
  const formatEndDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getDaysRemaining = (dateString?: string) => {
    if (!dateString) return null;
    const endDate = new Date(dateString);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining(offer.end_date);
  const isEndingSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0;
  const businessName = offer.business_name || offer.businesses?.name || 'Unknown Business';
  const locationArea = offer.location_area || offer.businesses?.location_area || '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View style={styles.card}>
        {/* Featured Image */}
        <View style={styles.imageContainer}>
          <Image
            source={offer.featured_image ? { uri: offer.featured_image } : placeholderImage}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Quantity Badge */}
          {offer.quantity_item && offer.quantity && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>
                {(offer.quantity - offer.number_sold)} remaining
              </Text>
            </View>
          )}

          {/* Ending Soon Badge */}
          {isEndingSoon && (
            <View style={styles.endingSoonBadge}>
              <Text style={styles.endingSoonText}>
                Ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {offer.name}
          </Text>

          <Text style={styles.businessName} numberOfLines={1}>
            {businessName}
          </Text>

          <View style={styles.metaRow}>
            {locationArea ? (
              <Text style={styles.location}>{locationArea}</Text>
            ) : null}

            {locationArea && offer.end_date ? (
              <Text style={styles.separator}>•</Text>
            ) : null}

            {offer.end_date && (
              <Text style={styles.endDate}>
                Ends: {formatEndDate(offer.end_date)}
              </Text>
            )}
          </View>

          {/* Price */}
          {offer.price_discount && (
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                £{offer.price_discount.toFixed(2)}
              </Text>
              {offer.unit_of_measurement && (
                <Text style={styles.unit}>
                  {offer.unit_of_measurement}
                </Text>
              )}
            </View>
          )}

          {/* Category Tag */}
          {offer.category && (
            <View style={styles.tagContainer}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{offer.category}</Text>
              </View>
            </View>
          )}
        </View>
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
  imageContainer: {
    height: 180,
    backgroundColor: colors.grayLight,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  quantityBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  quantityText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  endingSoonBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  endingSoonText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.grayDark,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  location: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
  },
  separator: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginHorizontal: spacing.xs,
  },
  endDate: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  unit: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginLeft: spacing.xs,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.grayLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.grayDark,
  },
});
