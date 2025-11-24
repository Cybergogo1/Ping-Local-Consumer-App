import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { Business } from '../../types/database';

interface BusinessCardProps {
  business: Business;
  onPress: () => void;
  liveOffersCount?: number;
  variant?: 'default' | 'featured';
}

export default function BusinessCard({
  business,
  onPress,
  liveOffersCount = 0,
  variant = 'default',
}: BusinessCardProps) {
  const isFeatured = variant === 'featured';

  // Safety check - if business is invalid, don't render
  if (!business || !business.name) {
    return null;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.card, isFeatured && styles.featuredCard]}>
        {/* Featured Image */}
        <View style={[styles.imageContainer, isFeatured && styles.featuredImageContainer]}>
          {business.featured_image ? (
            <Image
              source={{ uri: business.featured_image }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>
                {business.name?.charAt(0)?.toUpperCase() || 'B'}
              </Text>
            </View>
          )}

          {/* Featured Badge */}
          {business.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={isFeatured ? 2 : 1}>
            {business.name}
          </Text>

          {business.location_area && (
            <Text style={styles.location} numberOfLines={1}>
              {business.location_area}
            </Text>
          )}

          {/* Category Tags */}
          {business.category && (
            <View style={styles.tagContainer}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{business.category}</Text>
              </View>
            </View>
          )}

          {/* Live Offers Count */}
          {liveOffersCount > 0 && (
            <View style={styles.offersRow}>
              <View style={styles.offersBadge}>
                <Text style={styles.offersText}>
                  {liveOffersCount} live offer{liveOffersCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Description Summary (for featured cards) */}
          {isFeatured && business.description_summary && (
            <Text style={styles.description} numberOfLines={2}>
              {business.description_summary}
            </Text>
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
    overflow: 'hidden',
    ...shadows.md,
  },
  featuredCard: {
    width: 280,
    marginRight: spacing.md,
  },
  imageContainer: {
    height: 120,
    backgroundColor: colors.grayLight,
    position: 'relative',
  },
  featuredImageContainer: {
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  placeholderText: {
    color: colors.white,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  featuredBadgeText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  content: {
    padding: spacing.md,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  location: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginBottom: spacing.sm,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
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
  offersRow: {
    flexDirection: 'row',
  },
  offersBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  offersText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    marginTop: spacing.sm,
    lineHeight: fontSize.sm * 1.4,
  },
});
