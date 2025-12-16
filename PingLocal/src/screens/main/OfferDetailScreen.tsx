import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize, fontFamily, shadows } from '../../theme';
import { Offer, ImageGalleryItem } from '../../types/database';
import { OfferDetailScreenProps } from '../../types/navigation';
import { ImageCarousel } from '../../components/ImageCarousel';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function OfferDetailScreen({ navigation, route }: OfferDetailScreenProps) {
  const { offerId } = route.params;
  const { user } = useAuth();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [favouriteId, setFavouriteId] = useState<string | null>(null);
  const [offerTags, setOfferTags] = useState<{ id: number; name: string; type: string }[]>([]);
  const [hasAlreadyClaimed, setHasAlreadyClaimed] = useState(false);
  const [showAlreadyClaimedModal, setShowAlreadyClaimedModal] = useState(false);

  useEffect(() => {
    fetchOffer();
    fetchOfferTags();
    if (user) {
      checkFavouriteStatus();
    }
  }, [offerId, user]);

  // Check if user has already claimed this one_per_customer offer
  useEffect(() => {
    if (offer?.one_per_customer && user?.email) {
      checkExistingClaim();
    }
  }, [offer?.id, offer?.one_per_customer, user?.email]);

  const fetchOffer = async () => {
    try {
      // First fetch the offer
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .single();

      if (offerError) throw offerError;

      // Fetch gallery images for this offer
      const { data: galleryData } = await supabase
        .from('image_gallery')
        .select('*')
        .eq('offer_id', offerId)
        .order('display_order', { ascending: true });

      // Map gallery data to ImageGalleryItem format
      const galleryImages: ImageGalleryItem[] = (galleryData || []).map((item: any) => ({
        id: item.id,
        imageable_type: item.imageable_type,
        imageable_id: item.imageable_id,
        image_url: item.image_url || item.image_data, // Support both column names
        display_order: item.display_order,
        created: item.created,
      }));

      // If offer has a business_name, fetch the business details by name
      if (offerData?.business_name) {
        const { data: businessData } = await supabase
          .from('businesses')
          .select('id, name, location_area, featured_image, location, phone_number, description_summary, created')
          .eq('name', offerData.business_name)
          .single();

        setOffer({ ...offerData, businesses: businessData || undefined, gallery_images: galleryImages });
      } else {
        setOffer({ ...offerData, gallery_images: galleryImages });
      }
    } catch (error) {
      console.error('Error fetching offer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOfferTags = async () => {
    try {
      // Fetch tag IDs associated with this offer
      const { data: offerTagData, error: offerTagError } = await supabase
        .from('offer_tags')
        .select('tag_id')
        .eq('offer_id', offerId);

      if (offerTagError) throw offerTagError;

      if (offerTagData && offerTagData.length > 0) {
        const tagIds = offerTagData.map(ot => ot.tag_id);

        // Fetch the actual tag details
        const { data: tagsData, error: tagsError } = await supabase
          .from('tags')
          .select('id, name, type')
          .in('id', tagIds);

        if (tagsError) throw tagsError;
        setOfferTags(tagsData || []);
      }
    } catch (error) {
      console.error('Error fetching offer tags:', error);
    }
  };

  const checkFavouriteStatus = async () => {
    // Get the Supabase Auth user ID (UUID) for favorites
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('offer_id', offerId)
        .maybeSingle();

      if (error) {
        console.error('Error checking favourite status:', error);
        return;
      }

      if (data) {
        setIsFavourited(true);
        setFavouriteId(data.id);
      } else {
        setIsFavourited(false);
        setFavouriteId(null);
      }
    } catch (error) {
      console.error('Error checking favourite status:', error);
    }
  };

  const checkExistingClaim = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('purchase_tokens')
        .select('id')
        .eq('user_email', user.email)
        .eq('offer_id', offerId)
        .eq('cancelled', false)
        .limit(1);

      if (error) {
        console.error('Error checking existing claim:', error);
        return;
      }

      if (data && data.length > 0) {
        setHasAlreadyClaimed(true);
      }
    } catch (error) {
      console.error('Error checking existing claim:', error);
    }
  };

  const toggleFavourite = async () => {
    // Get the Supabase Auth user ID (UUID) for favorites
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      // Could show a login prompt here
      console.log('User must be logged in to favorite offers');
      return;
    }

    try {
      if (isFavourited && favouriteId) {
        // Remove favorite
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('id', favouriteId);

        if (error) {
          console.error('Error removing favourite:', error);
          return;
        }

        setIsFavourited(false);
        setFavouriteId(null);
      } else {
        // Add favorite
        const { data, error } = await supabase
          .from('favorites')
          .insert({
            user_id: authUser.id,
            offer_id: offerId,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error adding favourite:', error);
          return;
        }

        setIsFavourited(true);
        setFavouriteId(data.id);
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatJoinedDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isExpired = () => {
    if (!offer?.end_date) return false;
    return new Date(offer.end_date) < new Date();
  };

  const isSoldOut = () => {
    if (!offer?.quantity) return false;
    return offer.quantity - (offer.number_sold || 0) <= 0;
  };

  const getButtonText = () => {
    if (!offer) return 'Buy Now';

    if (isSoldOut()) {
      return 'Sold Out';
    }

    // 'Pay on the day' means booking only, otherwise it's a purchase
    if (offer.offer_type === 'Pay on the day') {
      return 'Book Now';
    }

    return 'Buy Now';
  };

  const handleClaimPress = () => {
    if (!offer) return;

    // Check one_per_customer restriction
    if (offer.one_per_customer && hasAlreadyClaimed) {
      setShowAlreadyClaimedModal(true);
      return;
    }

    // Route based on booking type
    if (offer.booking_type === 'online' || (offer.requires_booking && !offer.booking_type)) {
      // Slot-based booking - go to calendar
      navigation.navigate('SlotBooking', { offerId: offer.id, offer });
    } else {
      // External/call booking or no booking - go directly to claim
      // For external/call, user will book AFTER claiming via ClaimSuccessScreen
      navigation.navigate('Claim', { offerId: offer.id, offer });
    }
  };

  const handleBusinessPress = () => {
    if (!offer?.businesses?.name) return;
    navigation.navigate('BusinessDetail', { businessId: offer.businesses.name as any });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Offer not found</Text>
        <TouchableOpacity
          style={styles.errorBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const expired = isExpired();
  const soldOut = isSoldOut();
  const businessName = offer.business_name || offer.businesses?.name || 'Unknown Business';
  const locationArea = offer.location_area || offer.businesses?.location_area || '';
  const quantityRemaining = offer.quantity ? offer.quantity - (offer.number_sold || 0) : null;

  // Build carousel images array: featured_image first, then gallery images
  const carouselImages: string[] = [];

  // Add featured_image as the first image
  if (offer.featured_image) {
    carouselImages.push(offer.featured_image);
  }

  // Add gallery images after featured_image
  if (offer.gallery_images && offer.gallery_images.length > 0) {
    offer.gallery_images.forEach((img) => {
      if (img.image_url) carouselImages.push(img.image_url);
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Image Section */}
        <View style={styles.heroContainer}>
          <ImageCarousel images={carouselImages} height={250} />

          {/* Top Navigation Buttons - positioned in safe area */}
          <SafeAreaView style={styles.heroButtonsContainer} edges={['top']}>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => navigation.goBack()}
            >
              <Image source={require('../../../assets/images/iconback.png')} style={styles.heroButtonText}/>
            </TouchableOpacity>

            <TouchableOpacity style={styles.heroButton} onPress={toggleFavourite}>
              <Ionicons
                name={isFavourited ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavourited ? colors.white : colors.white}
              />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Quantity Badge - bottom left */}
          {offer.quantity_item && quantityRemaining !== null && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>{quantityRemaining} Left!</Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.contentWrapper}>
          {/* Left side - Title, Business, Location */}
          <View style={styles.contentLeft}>
            <Text style={styles.title} numberOfLines={2}>{offer.name}</Text>

            <TouchableOpacity onPress={handleBusinessPress} style={styles.businessNameRow}>
              <Image
                source={require('../../../assets/images/iconbusinesses.png')}
                style={styles.businessIcon}
              />
              <Text style={styles.businessName}>{businessName}</Text>
            </TouchableOpacity>

            {locationArea && (
              <View style={styles.locationNameRow}>
                <Image
                  source={require('../../../assets/images/iconlocation.png')}
                  style={styles.locationIcon}
                />
                <Text style={styles.location}>{locationArea}</Text>
              </View>
            )}

          </View>

          {/* Right side - Price Box (overlapping image) */}
          {!expired && (
            <View style={styles.priceBoxWrapper}>
              <View style={styles.priceBox}>
                <TouchableOpacity
                  style={[
                    styles.buyButton,
                    soldOut && styles.buyButtonSoldOut,
                    (offer.one_per_customer && hasAlreadyClaimed) && styles.buyButtonClaimed,
                  ]}
                  onPress={handleClaimPress}
                  disabled={soldOut}
                >
                  <Text style={[
                    styles.buyButtonText,
                    soldOut && styles.buyButtonTextSoldOut,
                    (offer.one_per_customer && hasAlreadyClaimed) && styles.buyButtonTextClaimed,
                  ]}>
                    {(offer.one_per_customer && hasAlreadyClaimed) ? 'Already Claimed' : getButtonText()}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.priceAmount}>
                  {offer.price_discount
                    ? `£${offer.price_discount.toFixed(2)}`
                    : offer.custom_feed_text || 'Book Now'}
                </Text>
                {!!offer.price_discount && offer.unit_of_measurement && (
                  <Text style={styles.priceUnit}>per {offer.unit_of_measurement}</Text>
                )}

                {offer.end_date && (
                  <Text style={styles.endDate}>Ends {formatDate(offer.end_date)}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.tagsWrapper}>
          {/* Tags */}
            {offerTags.length > 0 && (
              <View style={styles.tagContainer}>
                {offerTags.map((tag) => (
                  <View key={tag.id} style={styles.tag}>
                    <Text style={styles.tagText}>{tag.name}</Text>
                  </View>
                ))}
              </View>
            )}
        </View>

        {/* One Per Customer Notice */}
        {offer.one_per_customer && (
          <View style={styles.onePerCustomerSection}>
            <View style={styles.onePerCustomerBadge}>
              <Text style={styles.onePerCustomerBadgeText}>1</Text>
            </View>
            <View style={styles.onePerCustomerContent}>
              <Text style={styles.onePerCustomerTitle}>
                {hasAlreadyClaimed ? "You've Already Claimed This Offer" : "Limited to 1 Per Customer"}
              </Text>
              <Text style={styles.onePerCustomerText}>
                {hasAlreadyClaimed
                  ? "You can view your claimed offer in the 'Claimed' section."
                  : "This offer can only be claimed once per customer."
                }
              </Text>
            </View>
          </View>
        )}

        {/* Expired Banner */}
        {expired && (
          <View style={styles.expiredBanner}>
            <View style={styles.expiredTextContainer}>
              <Text style={styles.expiredTitle}>This Promotion ended {formatDate(offer.end_date)}</Text>
              <Text style={styles.expiredSubtitle}>
                Check out your feed for more great promotions, or add this business to your favourites to be notified!
              </Text>
            </View>
          </View>
        )}

        {/* Promotion Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotion Details</Text>
          {offer.summary && (
            <Text style={styles.summaryText}>{offer.summary}</Text>
          )}

          {isDescriptionExpanded && offer.full_description && (
            <Text style={styles.fullDescriptionText}>{offer.full_description}</Text>
          )}

          {offer.full_description && (
            <TouchableOpacity
              style={styles.readMoreButton}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsDescriptionExpanded(!isDescriptionExpanded);
              }}
            >
              <Text style={styles.readMoreText}>
                {isDescriptionExpanded ? 'Show less' : 'Read more...'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Special Notes */}
        {offer.special_notes && (
          <View style={styles.specialNotesSection}>
            <View style={styles.specialNotesContent}>
              <Text style={styles.specialNotesTitle}>Special Note from {businessName}</Text>
              <Text style={styles.specialNotesText}>{offer.special_notes}</Text>
            </View>
          </View>
        )}

        {/* Terms & Conditions */}
        <TouchableOpacity
          style={styles.termsButton}
          onPress={() => setShowTermsModal(true)}
        >
          <Text style={styles.termsIcon}>📄</Text>
          <Text style={styles.termsText}>View Terms and Conditions</Text>
        </TouchableOpacity>

        {/* Business Card */}
        {offer.businesses && (
          <TouchableOpacity
            style={styles.businessCard}
            onPress={handleBusinessPress}
            activeOpacity={0.7}
          >
            <View style={styles.businessCardLeft}>
              {offer.businesses.featured_image ? (
                <Image
                  source={{ uri: offer.businesses.featured_image }}
                  style={styles.businessCardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.businessCardImage, styles.businessCardImagePlaceholder]}>
                  <Text style={styles.businessCardImageText}>
                    {offer.businesses.name?.charAt(0) || 'B'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.businessCardRight}>
              <View style={styles.businessCardHeader}>
                <Text style={styles.businessCardName}>{offer.businesses.name}</Text>
              </View>
              <Text style={styles.businessCardJoined}>
                Joined {formatJoinedDate(offer.businesses.created)}
              </Text>

              <TouchableOpacity
                style={styles.viewOnMapButton}
                onPress={handleBusinessPress}
              >
                <Text style={styles.viewOnMapText}>View on Map</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* Bottom spacing */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
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
                    • Cannot be used in conjunction with other offers{'\n'}
                    • Non-transferable and non-refundable{'\n'}
                    • Valid until the end date specified{'\n'}
                    • {offer?.businesses?.name || 'The business'} reserves the right to refuse service{'\n'}
                    • Please present your QR code when claiming this offer
                  </Text>
                </>
              )}

              {/* Business Contact Info */}
              <Text style={[styles.modalSectionTitle, { marginTop: spacing.md }]}>
                Business Contact
              </Text>
              <Text style={styles.modalText}>
                {offer?.businesses?.name || 'Business'}
                {'\n'}
                {offer?.businesses?.location ? `${offer.businesses.location}\n` : ''}
                {offer?.businesses?.phone_number ? `Phone: ${offer.businesses.phone_number}` : ''}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Already Claimed Modal */}
      <Modal
        visible={showAlreadyClaimedModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAlreadyClaimedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alreadyClaimedModalContent}>
            <View style={styles.alreadyClaimedIcon}>
              <Text style={styles.alreadyClaimedIconText}>!</Text>
            </View>
            <Text style={styles.alreadyClaimedTitle}>Already Claimed</Text>
            <Text style={styles.alreadyClaimedMessage}>
              You've already claimed this offer. This promotion is limited to one per customer.
            </Text>
            <TouchableOpacity
              style={styles.alreadyClaimedViewButton}
              onPress={() => {
                setShowAlreadyClaimedModal(false);
                navigation.navigate('Claimed' as any);
              }}
            >
              <Text style={styles.alreadyClaimedViewButtonText}>View My Claims</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.alreadyClaimedCloseButton}
              onPress={() => setShowAlreadyClaimedModal(false)}
            >
              <Text style={styles.alreadyClaimedCloseButtonText}>Close</Text>
            </TouchableOpacity>
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
    fontFamily: fontFamily.body,
  },
  errorBackButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  errorBackButtonText: {
    color: colors.white,
    fontFamily: fontFamily.bodySemiBold,
  },

  // Hero Section
  heroContainer: {
    height: 250,
    backgroundColor: colors.grayLight,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroButtonsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  heroButtonText: {
    width: 14,
    height: 14,
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
  },
  quantityBadge: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  quantityText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
  },

  // Content Section
  contentWrapper: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    marginTop: -20, // Pull up slightly to overlap with price box
  },
  contentLeft: {
    flex: 1,
    paddingRight: spacing.md,
    paddingTop: 20, // Compensate for the margin-top above
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  businessIcon: {
    width: 16,
    height: 16,
    marginRight: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
  },
  location: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
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
  tagsWrapper: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  tagContainer: {
    paddingTop: '3%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.grayLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
  },

  // Price Box
  priceBoxWrapper: {
    width: 140,
    marginTop: -40, // Overlap with hero image
  },
  priceBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: borderRadius.lg,
    padding: '10%',
    ...shadows.sm,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  buyButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    textAlign: 'center',
  },
  buyButtonSoldOut: {
    backgroundColor: colors.grayLight,
  },
  buyButtonTextSoldOut: {
    color: colors.grayMedium,
  },
  priceAmount: {
    fontSize: fontSize.xxl,
    color: colors.primary,
    fontFamily: fontFamily.bodyBold,
    textAlign: 'center',
    marginBottom: 3,
  },
  priceUnit: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
  },
  endDate: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    textAlign: 'center',
    fontFamily: fontFamily.body,
  },

  // Expired Banner
  expiredBanner: {
    backgroundColor: '#FFF5F5',
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#6F363624',
  },
  expiredIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.sm,
  },
  expiredTextContainer: {
    flex: 1,
  },
  expiredTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: '#6F3E36',
    marginBottom: spacing.xs,
  },
  expiredSubtitle: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    fontFamily: fontFamily.body,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.headingSemiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    lineHeight: fontSize.sm * 1.6,
    fontFamily: fontFamily.body,
  },
  fullDescriptionText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    lineHeight: fontSize.sm * 1.6,
    fontFamily: fontFamily.body,
    marginTop: spacing.sm,
  },
  readMoreButton: {
    marginTop: spacing.sm,
  },
  readMoreText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
  },

  // Special Notes
  specialNotesSection: {
    backgroundColor: '#F5FAFF',
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#36566F24',
  },
  specialNotesIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  specialNotesContent: {
    flex: 1,
  },
  specialNotesTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  specialNotesText: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    fontFamily: fontFamily.body,
  },

  // Terms
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#eee',
    marginHorizontal: spacing.md,
    backgroundColor: '#f9f9f9',
    borderRadius: borderRadius.full,

  },
  termsIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  termsText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
  },

  // Business Card
  businessCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.lg,
  },
  businessCardLeft: {
    marginRight: spacing.md,
  },
  businessCardImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
  },
  businessCardImagePlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessCardImageText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.headingBold,
  },
  businessCardRight: {
    flex: 1,
  },
  businessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  businessCardIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  businessCardName: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingSemiBold,
    color: colors.primary,
  },
  businessCardJoined: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.body,
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  viewOnMapIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  viewOnMapText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
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
    fontFamily: fontFamily.body,
  },
  modalBody: {
    padding: spacing.md,
  },
  modalText: {
    fontSize: fontSize.md,
    color: colors.grayDark,
    lineHeight: fontSize.md * 1.6,
    fontFamily: fontFamily.body,
  },
  modalSectionTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },

  // One Per Customer Notice
  onePerCustomerSection: {
    backgroundColor: '#F5FAFF',
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#36566F24',
    alignItems: 'center',
  },
  onePerCustomerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  onePerCustomerBadgeText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingBold,
  },
  onePerCustomerContent: {
    flex: 1,
  },
  onePerCustomerTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  onePerCustomerText: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    fontFamily: fontFamily.body,
  },

  // Buy Button Claimed State
  buyButtonClaimed: {
    backgroundColor: colors.grayLight,
  },
  buyButtonTextClaimed: {
    color: colors.grayMedium,
  },

  // Already Claimed Modal
  alreadyClaimedModalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '85%',
    alignItems: 'center',
  },
  alreadyClaimedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  alreadyClaimedIconText: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.headingBold,
    color: '#D97706',
  },
  alreadyClaimedTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  alreadyClaimedMessage: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: fontSize.sm * 1.5,
  },
  alreadyClaimedViewButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  alreadyClaimedViewButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
  alreadyClaimedCloseButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  alreadyClaimedCloseButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.grayMedium,
  },
});
