import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { Business, Offer } from '../../types/database';
import { BusinessDetailScreenProps } from '../../types/navigation';
import OfferCardLandscape from '../../components/promotions/OfferCardLandscape';

const mapPinIcon = require('../../../assets/images/logo_icondark.avif');

export default function BusinessDetailScreen({ navigation, route }: BusinessDetailScreenProps) {
  const { businessId } = route.params;

  const [business, setBusiness] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  useEffect(() => {
    fetchBusiness();
    fetchOffers();
  }, [businessId]);

  const fetchBusiness = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      setBusiness(data);
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString())
        .order('created', { ascending: false });

      if (error) throw error;
      if (data) setOffers(data);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const handleGetDirections = () => {
    if (!business?.location) return;
    const encodedAddress = encodeURIComponent(business.location);
    Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`);
  };

  const handleOfferPress = (offer: Offer) => {
    navigation.navigate('OfferDetail', { offerId: offer.id });
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Business not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image with Overlay - Edge to Edge */}
        <View style={styles.heroContainer}>
          {business.featured_image ? (
            <Image
              source={{ uri: business.featured_image }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>
                {business.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Buttons within SafeArea */}
          <SafeAreaView style={styles.heroButtonsContainer} edges={['top']}>
            <View style={styles.heroButtonsRow}>
              {/* Back Button */}
              <TouchableOpacity
                style={styles.heroBackButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.heroBackButtonText}>‹</Text>
              </TouchableOpacity>

              {/* Favorite Button */}
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={toggleFavorite}
              >
                <Text style={styles.favoriteButtonText}>
                  {isFavorite ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Gradient Overlay with Business Name */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.heroGradient}
          >
            <Text style={styles.heroTitle}>{business.name}</Text>
            {business.location_area && (
              <Text style={styles.heroLocation}>{business.location_area}</Text>
            )}
          </LinearGradient>
        </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Category Tag */}
            {business.category && (
              <View style={styles.tagsContainer}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{business.category}</Text>
                </View>
              </View>
            )}

            {/* About Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Who is {business.name}?</Text>
              <Text style={styles.descriptionText} numberOfLines={3}>
                {business.description_summary || business.description || 'No description available.'}
              </Text>
              {(business.description || business.description_summary) && (
                <TouchableOpacity
                  style={styles.readMoreButton}
                  onPress={() => setShowDescriptionModal(true)}
                >
                  <Text style={styles.readMoreText}>Read More</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Latest Promotions Carousel */}
            {offers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Latest Promotions</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promotionsCarousel}
                >
                  {offers.map((offer) => (
                    <OfferCardLandscape
                      key={offer.id}
                      offer={offer}
                      onPress={() => handleOfferPress(offer)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Map Section */}
            {business.location && (
              <View style={styles.mapSection}>
                <View style={styles.mapHeader}>
                  <View style={styles.mapIconContainer}>
                    <Image source={mapPinIcon} style={styles.mapPinImage} />
                  </View>
                  <Text style={styles.mapTitle}>Where to find {business.name}</Text>
                  <Text style={styles.mapAddress}>{business.location}</Text>
                </View>

                <TouchableOpacity
                  style={styles.mapContainer}
                  onPress={handleGetDirections}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{
                      uri: `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(business.location)}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${encodeURIComponent(business.location)}&key=AIzaSyA3UvWRia-94eCIGPuyr4mMm3p-UJVpeGQ`
                    }}
                    style={styles.mapImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

      {/* Description Modal */}
      <Modal
        visible={showDescriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDescriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About {business?.name}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDescriptionModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalDescription}>
                {business?.description || business?.description_summary || 'No description available.'}
              </Text>
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
    backgroundColor: colors.white,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.grayDark,
    marginBottom: spacing.md,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  backButtonText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  heroContainer: {
    height: 280,
    backgroundColor: colors.grayLight,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grayLight,
  },
  heroPlaceholderText: {
    color: colors.grayMedium,
    fontSize: 60,
    fontWeight: fontWeight.bold,
  },
  heroButtonsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  heroBackButton: {
    backgroundColor: colors.white,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  heroBackButtonText: {
    fontSize: 24,
    color: colors.grayDark,
    marginTop: -2,
  },
  favoriteButton: {
    backgroundColor: colors.white,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  favoriteButtonText: {
    fontSize: 18,
    color: colors.grayDark,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl,
  },
  heroTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  heroLocation: {
    fontSize: fontSize.sm,
    color: colors.white,
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  content: {
    padding: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grayMedium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagText: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    lineHeight: fontSize.sm * 1.6,
  },
  readMoreButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.grayMedium,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
  },
  promotionsCarousel: {
    paddingRight: spacing.md,
  },
  mapSection: {
    backgroundColor: '#F8F8F8',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  mapHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mapIconContainer: {
    marginBottom: spacing.xs,
  },
  mapPinImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  mapTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.black,
    textAlign: 'center',
  },
  mapAddress: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  mapContainer: {
    height: 150,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.grayLight,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinContainer: {
    marginBottom: spacing.xs,
  },
  mapPinIcon: {
    fontSize: 32,
  },
  mapTapText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
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
    fontWeight: fontWeight.bold,
    color: colors.black,
    flex: 1,
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
    fontSize: fontSize.md,
    color: colors.grayDark,
  },
  modalScrollView: {
    padding: spacing.md,
  },
  modalDescription: {
    fontSize: fontSize.md,
    color: colors.grayDark,
    lineHeight: fontSize.md * 1.6,
  },
});
