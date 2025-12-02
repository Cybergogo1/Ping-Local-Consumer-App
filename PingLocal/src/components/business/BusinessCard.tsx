import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, shadows, fontFamily } from '../../theme';
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ flex: 1 }}>
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

          {/* Overlay text on image for featured cards */}
          {isFeatured && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageOverlay}
            >
              <Text style={styles.overlayName} numberOfLines={2}>
                {business.name}
              </Text>
              {business.location_area && (
                <Text style={styles.overlayLocation} numberOfLines={1}>
                  {business.location_area}
                </Text>
              )}
            </LinearGradient>
          )}
        </View>

        {/* Content - only show for non-featured cards */}
        {!isFeatured && (
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={1}>
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
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  featuredCard: {
    width: 280,
    marginRight: spacing.md,
  },
  imageContainer: {
    height: 100,
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
    fontFamily: fontFamily.headingBold,
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  featuredBadgeText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl,
  },
  overlayName: {
    fontSize: fontSize.lg,
    color: colors.white,
    marginBottom: spacing.xs,
    fontFamily: fontFamily.headingBold,
  },
  overlayLocation: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.9,
    fontFamily: fontFamily.body,
  },
  content: {
    padding: spacing.sm,
  },
  name: {
    fontSize: fontSize.md,
    color: colors.primary,
    marginBottom: 2,
    fontFamily: fontFamily.headingBold,
  },
  location: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginBottom: 2,
    fontFamily: fontFamily.body,
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
    borderWidth: 1,
    borderColor: '#eee',
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.grayDark,
    fontFamily: fontFamily.body,
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
    fontFamily: fontFamily.bodySemiBold,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    marginTop: spacing.sm,
    lineHeight: fontSize.sm * 1.4,
    fontFamily: fontFamily.body,
  },
});
