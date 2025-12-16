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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize, fontFamily, shadows } from '../../theme';
import { Business, Offer, OpeningTime, Tag } from '../../types/database';
import { BusinessDetailScreenProps } from '../../types/navigation';
import OfferCardLandscape from '../../components/promotions/OfferCardLandscape';
import OpeningHoursModal, { getTodayOpeningStatus } from '../../components/modals/OpeningHoursModal';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const mapPinIcon = require('../../../assets/images/logo_icondark.png');

export default function BusinessDetailScreen({ navigation, route }: BusinessDetailScreenProps) {
  const { businessId } = route.params;
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [openingTimes, setOpeningTimes] = useState<OpeningTime[]>([]);
  const [businessTags, setBusinessTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [favouriteId, setFavouriteId] = useState<string | null>(null);
  const [showOpeningHoursModal, setShowOpeningHoursModal] = useState(false);

  useEffect(() => {
    fetchBusiness();
    fetchOffers();
    fetchOpeningTimes();
    if (user && business) {
      checkFavouriteStatus();
    }
  }, [businessId, user, business?.id]);

  useEffect(() => {
    if (business?.id) {
      fetchBusinessTags();
    }
  }, [business?.id]);

  const fetchBusiness = async () => {
    try {
      console.log('Fetching business with identifier:', businessId, 'type:', typeof businessId);

      // Handle undefined businessId
      if (businessId === undefined || businessId === null) {
        console.error('businessId is undefined or null');
        setIsLoading(false);
        return;
      }

      // Fetch business by name (since there's no 'id' column in the businesses table)
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('name', businessId)
        .single();

      if (error) {
        console.error('Business fetch error details:', JSON.stringify(error));
        throw error;
      }

      console.log('Business fetched successfully:', data?.name);
      setBusiness(data);
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      console.log('Fetching offers for business name:', businessId);

      if (businessId === undefined || businessId === null) {
        console.error('businessId is undefined or null for offers fetch');
        return;
      }

      // Fetch offers by business_name since businesses table has no 'id' column
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('business_name', businessId)
        .eq('status', 'Signed Off')
        .gte('end_date', new Date().toISOString());

      if (error) {
        console.error('Offers fetch error details:', JSON.stringify(error));
        throw error;
      }
      console.log('Offers fetched:', data?.length || 0, 'offers');
      if (data) setOffers(data);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const fetchOpeningTimes = async () => {
    try {
      if (businessId === undefined || businessId === null) {
        return;
      }

      const { data, error } = await supabase
        .from('opening_times')
        .select('*')
        .eq('business_name', businessId)
        .order('day_number', { ascending: true });

      if (error) {
        console.error('Opening times fetch error:', error);
        return;
      }

      if (data) {
        setOpeningTimes(data);
      }
    } catch (error) {
      console.error('Error fetching opening times:', error);
    }
  };

  const fetchBusinessTags = async () => {
    try {
      if (!business?.id) return;

      const { data, error } = await supabase
        .from('business_tags')
        .select('tags(id, name, type)')
        .eq('business_id', business.id);

      if (error) {
        console.error('Business tags fetch error:', error);
        return;
      }

      if (data) {
        const tags = data.map((bt: any) => bt.tags).filter((tag: Tag | null) => tag !== null);
        setBusinessTags(tags);
      }
    } catch (error) {
      console.error('Error fetching business tags:', error);
    }
  };

  const checkFavouriteStatus = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || !business?.id) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('business_id', business.id)
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

  const toggleFavourite = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || !business?.id) {
      console.log('User must be logged in to favorite businesses');
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
            business_id: business.id,
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

  const handleGetDirections = () => {
    if (!business?.location) return;
    const encodedAddress = encodeURIComponent(business.location);
    Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`);
  };

  const handleOfferPress = (offer: Offer) => {
    navigation.navigate('OfferDetail', { offerId: offer.id });
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
                <Image source={require('../../../assets/images/iconback.png')} style={styles.heroBackButtonText}/>
              </TouchableOpacity>

              {/* Favorite Button */}
              <TouchableOpacity
                style={styles.heroFavoriteButton}
                onPress={toggleFavourite}
              >
                <Ionicons
                  name={isFavourited ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavourited ? colors.white : colors.white}
                />
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
            {(business.category || businessTags.length > 0) && (
              <View style={styles.tagsWrapper}>
                {business.category && (
                  <View style={styles.tagsContainer}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{business.category}</Text>
                    </View>
                  </View>
                )}
                {businessTags.length > 0 && (
                  <View style={styles.subTagsContainer}>
                    {businessTags.map((tag) => (
                      <View key={tag.id} style={styles.subTag}>
                        <Text style={styles.subTagText}>{tag.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* About Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Who is {business.name}?</Text>
              {(business.description_summary || business.description) && (
                <Text style={styles.descriptionText}>
                  {business.description_summary || 'No description available.'}
                </Text>
              )}

              {isDescriptionExpanded && business.description && (
                <Text style={styles.fullDescriptionText}>{business.description}</Text>
              )}

              {business.description && (
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

            {/* Opening Hours Section */}
            {openingTimes.length > 0 && (
              <TouchableOpacity
                style={styles.openingHoursSection}
                onPress={() => setShowOpeningHoursModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.openingHoursLeft}>
                  <Text style={styles.openingHoursIcon}>🕐</Text>
                  <View>
                    <Text style={styles.openingHoursLabel}>Opening Hours</Text>
                    <Text style={[
                      styles.openingHoursStatus,
                      getTodayOpeningStatus(openingTimes).isOpen && styles.openingHoursStatusOpen
                    ]}>
                      {getTodayOpeningStatus(openingTimes).statusText}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.grayMedium} />
              </TouchableOpacity>
            )}

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

      {/* Opening Hours Modal */}
      <OpeningHoursModal
        visible={showOpeningHoursModal}
        onClose={() => setShowOpeningHoursModal(false)}
        openingTimes={openingTimes}
        businessName={business.name}
      />
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
    fontFamily: fontFamily.bodySemiBold,
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
    fontFamily: fontFamily.headingBold,
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
    backgroundColor: colors.primary,
    width: 38,
    height: 38,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBackButtonText: {
    width: 16,
    height: 16,
  },
  heroFavoriteButton: {
    backgroundColor: colors.primary,
    width: 38,
    height: 38,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: fontFamily.headingBold,
    color: colors.white,
  },
  heroLocation: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.white,
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  content: {
    padding: spacing.md,
  },
  tagsWrapper: {
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
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
  subTag: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#eee',
  },
  subTagText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    lineHeight: fontSize.sm * 1.6,
  },
  readMoreButton: {
    marginTop: spacing.sm,
  },
  readMoreText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
  },
  fullDescriptionText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    lineHeight: fontSize.sm * 1.6,
    marginTop: spacing.sm,
  },
  promotionsCarousel: {
    paddingRight: spacing.md,
  },
  openingHoursSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  openingHoursLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  openingHoursIcon: {
    fontSize: 28,
  },
  openingHoursLabel: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.black,
  },
  openingHoursStatus: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    marginTop: 2,
  },
  openingHoursStatusOpen: {
    color: colors.success,
    fontFamily: fontFamily.bodySemiBold,
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
    fontFamily: fontFamily.bodySemiBold,
    color: colors.black,
    textAlign: 'center',
  },
  mapAddress: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
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
});
