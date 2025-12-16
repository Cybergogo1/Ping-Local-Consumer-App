import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, shadows, fontFamily } from '../../theme';
import { Offer } from '../../types/database';
import { supabase } from '../../lib/supabase';

// Placeholder image when no featured image is available
const placeholderImage = require('../../../assets/images/placeholder_offer.jpg');

// Area coordinates for distance calculations
const areaCoords: Record<string, { lat: number; lng: number }> = {
  'Oxton': { lat: 53.3847, lng: -3.0414 },
  'West Kirby': { lat: 53.3728, lng: -3.1840 },
  'Heswall': { lat: 53.3271, lng: -3.0977 },
  'Birkenhead': { lat: 53.3934, lng: -3.0145 },
  'Hoylake': { lat: 53.3900, lng: -3.1818 },
  'Bebington': { lat: 53.3511, lng: -3.0033 },
  'Wallasey': { lat: 53.4243, lng: -3.0486 },
  'Chester': { lat: 53.1930, lng: -2.8931 },
  'Liverpool': { lat: 53.4084, lng: -2.9916 },
};

interface PromotionCardProps {
  offer: Offer;
  onPress: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
  userId?: string | null;
}

export default function PromotionCard({ offer, onPress, userLocation, userId }: PromotionCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const formatEndDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const businessName = offer.business_name || offer.businesses?.name || 'Unknown Business';
  const locationArea = offer.location_area || offer.businesses?.location_area || '';

  // Calculate distance if user location is available
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getDistanceText = (): string | null => {
    if (!userLocation) return null;

    const coords = areaCoords[locationArea];
    if (!coords) return null;

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      coords.lat,
      coords.lng
    );

    if (distance < 0.1) {
      return 'Nearby';
    } else if (distance < 1) {
      return `${(distance * 10).toFixed(0)}00m away`;
    } else {
      return `${distance.toFixed(1)} miles`;
    }
  };

  const distanceText = getDistanceText();

  // Check if offer is favorited on mount
  useEffect(() => {
    if (userId) {
      checkIfFavorited();
    }
  }, [userId, offer.id]);

  const checkIfFavorited = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('offer_id', offer.id)
        .single();

      if (!error && data) {
        setIsFavorite(true);
      }
    } catch {
      // Not favorited or error - leave as false
    }
  };

  const handleToggleFavorite = async () => {
    if (!userId || isTogglingFavorite) return;

    setIsTogglingFavorite(true);

    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('offer_id', offer.id);

        if (!error) {
          setIsFavorite(false);
        }
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: userId,
            offer_id: offer.id,
          });

        if (!error) {
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

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

          {/* Proximity Badge - Top Left */}
          {distanceText && (
            <View style={styles.proximityBadge}>
              <Ionicons name="location" size={12} color={colors.white} />
              <Text style={styles.proximityText}>{distanceText}</Text>
            </View>
          )}

          {/* Quantity Badge - Below Proximity or Top Left if no proximity */}
          {offer.quantity_item && offer.quantity && (
            <View style={[
              styles.quantityBadge,
              distanceText && styles.quantityBadgeWithProximity
            ]}>
              <Text style={styles.quantityText}>
                {(offer.quantity - (offer.number_sold || 0))} remaining
              </Text>
            </View>
          )}

          {/* Favorite Toggle - Top Right */}
          {userId && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleToggleFavorite}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isTogglingFavorite ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isFavorite ? colors.white : colors.white}
                />
              )}
            </TouchableOpacity>
          )}

          {/* End Date Badge - Bottom Left */}
          {offer.end_date && (
            <View style={styles.endDateBadge}>
              <Text style={styles.endDateBadgeText}>
                Ends: {formatEndDate(offer.end_date)}
              </Text>
            </View>
          )}

          {/* Price/CTA Badge - Bottom Right */}
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>
              {offer.price_discount
                ? `£${offer.price_discount.toFixed(2)}`
                : offer.custom_feed_text || 'Book Now'}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {offer.name}
          </Text>

          <Text style={styles.businessName} numberOfLines={1}>
            {businessName}{locationArea ? `, ${locationArea}` : ''}
          </Text>

          {/* Tags from offer_tags junction table */}
          {(() => {
            // Extract tags from offer_tags if available (only tags with type 'tags', not 'Category')
            const offerTags = (offer as any).offer_tags;
            const tagsArray = offerTags
              ? (Array.isArray(offerTags) ? offerTags : [offerTags])
                  .filter((ot: any) => ot?.tags?.name && ot?.tags?.type === 'tags')
                  .map((ot: any) => ot.tags.name)
                  .slice(0, 8)
              : [];

            // Fallback to category if no tags with type 'tags'
            const displayTags = tagsArray.length > 0 ? tagsArray : (offer.category ? [offer.category] : []);

            return displayTags.length > 0 ? (
              <View style={styles.tagContainer}>
                {displayTags.map((tagName: string, index: number) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tagName}</Text>
                  </View>
                ))}
              </View>
            ) : null;
          })()}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee'
  },
  imageContainer: {
    height: 140,
    backgroundColor: colors.grayLight,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  proximityBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proximityText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
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
  quantityBadgeWithProximity: {
    top: spacing.sm + 28, // Below the proximity badge
  },
  quantityText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(54, 86, 111, 1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endDateBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  endDateBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
  },
  priceBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  priceBadgeText: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
  },
  content: {
    paddingLeft: '4%',
    paddingTop: '2.5%',
    paddingBottom: '4%',
  },
  title: {
    fontSize: fontSize.lg,
    color: colors.primary,
    marginBottom: 2,
    fontFamily: fontFamily.headingSemiBold,
  },
  businessName: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    fontFamily: fontFamily.bodyRegular,
    paddingBottom: 5,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xs,
    marginTop: spacing.xs,
  },
  tag: {
    backgroundColor: colors.grayLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
  },
});
