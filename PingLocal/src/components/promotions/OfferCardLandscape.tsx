import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { Offer } from '../../types/database';

const placeholderImage = require('../../../assets/images/placeholder_offer.jpg');

interface OfferCardLandscapeProps {
  offer: Offer;
  onPress: () => void;
}

export default function OfferCardLandscape({ offer, onPress }: OfferCardLandscapeProps) {
  const formatPrice = (price?: number) => {
    if (!price) return null;
    return `£${price.toFixed(2)}`;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      <View style={styles.card}>
        <Image
          source={offer.featured_image ? { uri: offer.featured_image } : placeholderImage}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Gradient overlay at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        >
          <Text style={styles.title} numberOfLines={1}>
            {offer.name}
          </Text>
          {offer.price_discount && (
            <Text style={styles.price}>
              {formatPrice(offer.price_discount)}
              {offer.unit_of_measurement ? ` ${offer.unit_of_measurement}` : ''}
            </Text>
          )}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.md,
  },
  card: {
    width: 160,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.grayLight,
    ...shadows.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  price: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.accent,
  },
});
