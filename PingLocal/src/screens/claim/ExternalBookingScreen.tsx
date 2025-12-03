import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontFamily, shadows } from '../../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../types/navigation';

const placeholderImage = require('../../../assets/images/placeholder_offer.jpg');

type ExternalBookingScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'ExternalBooking'>;
  route: RouteProp<HomeStackParamList, 'ExternalBooking'>;
};

export default function ExternalBookingScreen({ navigation, route }: ExternalBookingScreenProps) {
  const { offerId, offer } = route.params;
  const insets = useSafeAreaInsets();

  const [partySize, setPartySize] = useState(1);
  const [hasBooked, setHasBooked] = useState(false);

  const isCallBooking = offer.booking_type === 'call';
  const isExternalBooking = offer.booking_type === 'external';

  const handleBookExternal = async () => {
    if (isExternalBooking && offer.booking_url) {
      try {
        const supported = await Linking.canOpenURL(offer.booking_url);
        if (supported) {
          await Linking.openURL(offer.booking_url);
        } else {
          Alert.alert('Error', 'Unable to open booking link');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open booking link');
      }
    }
  };

  const handleCallBusiness = async () => {
    const phoneNumber = offer.businesses?.phone_number;
    if (phoneNumber) {
      const phoneUrl = `tel:${phoneNumber}`;
      try {
        const supported = await Linking.canOpenURL(phoneUrl);
        if (supported) {
          await Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Unable to make phone call');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to make phone call');
      }
    } else {
      Alert.alert('Error', 'No phone number available for this business');
    }
  };

  const handleContinue = () => {
    navigation.navigate('Claim', {
      offerId,
      offer,
      partySize,
    });
  };

  const incrementPartySize = () => {
    setPartySize(prev => prev + 1);
  };

  const decrementPartySize = () => {
    if (partySize > 1) {
      setPartySize(prev => prev - 1);
    }
  };

  const businessName = offer.business_name || offer.businesses?.name || 'the business';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header - extends edge to edge */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Image source={require('../../../assets/images/iconback.png')} style={styles.headerButtonIcon} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications' as any)}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconnotifications.png')} style={styles.headerButtonIcon} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>N..</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as any)}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconsettings.png')} style={styles.headerButtonIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Offer Card */}
        <View style={styles.offerCard}>
          <Image
            source={offer.featured_image ? { uri: offer.featured_image } : placeholderImage}
            style={styles.offerImage}
            resizeMode="cover"
          />
          <View style={styles.offerInfo}>
            <Text style={styles.offerName}>{offer.name}</Text>
            <Text style={styles.offerBusiness}>{businessName}</Text>
            {offer.price_discount && (
              <Text style={styles.offerPrice}>£{offer.price_discount.toFixed(2)}</Text>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsIcon}>
            {isCallBooking ? '📞' : '🌐'}
          </Text>
          <Text style={styles.instructionsTitle}>
            {isCallBooking ? 'Book by Phone' : 'Book Online'}
          </Text>
          <Text style={styles.instructionsText}>
            {isCallBooking
              ? `Call ${businessName} to book your slot. Make sure to mention you're using a Ping Local promotion!`
              : `Visit ${businessName}'s booking page to reserve your slot. Remember to mention Ping Local when you arrive!`
            }
          </Text>
        </View>

        {/* Booking Button */}
        <View style={styles.bookingButtonSection}>
          {isCallBooking ? (
            <TouchableOpacity style={styles.bookingButton} onPress={handleCallBusiness}>
              <Text style={styles.bookingButtonIcon}>📞</Text>
              <Text style={styles.bookingButtonText}>Call to Book</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.bookingButton} onPress={handleBookExternal}>
              <Text style={styles.bookingButtonIcon}>🔗</Text>
              <Text style={styles.bookingButtonText}>Open Booking Page</Text>
            </TouchableOpacity>
          )}

          {offer.businesses?.phone_number && !isCallBooking && (
            <Text style={styles.phoneNumber}>
              Or call: {offer.businesses.phone_number}
            </Text>
          )}
        </View>

        {/* Party Size Selector */}
        <View style={styles.partySizeSection}>
          <Text style={styles.sectionTitle}>How many people?</Text>
          <View style={styles.partySizeSelector}>
            <TouchableOpacity
              style={[
                styles.partySizeButton,
                partySize <= 1 && styles.partySizeButtonDisabled,
              ]}
              onPress={decrementPartySize}
              disabled={partySize <= 1}
            >
              <Text style={styles.partySizeButtonText}>-</Text>
            </TouchableOpacity>

            <View style={styles.partySizeValue}>
              <Text style={styles.partySizeNumber}>{partySize}</Text>
              <Text style={styles.partySizeLabel}>
                {partySize === 1 ? 'Person' : 'People'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.partySizeButton}
              onPress={incrementPartySize}
            >
              <Text style={styles.partySizeButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirmation Checkbox */}
        <TouchableOpacity
          style={styles.confirmationRow}
          onPress={() => setHasBooked(!hasBooked)}
        >
          <View style={[styles.checkbox, hasBooked && styles.checkboxChecked]}>
            {hasBooked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.confirmationText}>
            I've made my booking with {businessName}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !hasBooked && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!hasBooked}
        >
          <Text style={[
            styles.continueButtonText,
            !hasBooked && styles.continueButtonTextDisabled,
          ]}>
            Continue to Claim
          </Text>
        </TouchableOpacity>
        {!hasBooked && (
          <Text style={styles.helperText}>
            Confirm you've made your booking to continue
          </Text>
        )}
      </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#203C50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButtonIcon: {
    width: 16,
    height: 16,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },

  scrollView: {
    flex: 1,
  },

  // Offer Card
  offerCard: {
    flexDirection: 'row',
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.lg,
  },
  offerImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  offerInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  offerName: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  offerBusiness: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    marginBottom: spacing.xs,
  },
  offerPrice: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },

  // Instructions Section
  instructionsSection: {
    alignItems: 'center',
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#eee',
  },
  instructionsIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  instructionsTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },

  // Booking Button Section
  bookingButtonSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  bookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  bookingButtonIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  bookingButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.white,
  },
  phoneNumber: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    marginTop: spacing.md,
  },

  // Party Size Section
  partySizeSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  partySizeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partySizeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partySizeButtonDisabled: {
    backgroundColor: colors.grayMedium,
    opacity: 0.5,
  },
  partySizeButtonText: {
    fontSize: fontSize.xl,
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
  },
  partySizeValue: {
    alignItems: 'center',
    marginHorizontal: spacing.xl,
  },
  partySizeNumber: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
  },
  partySizeLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
  },

  // Confirmation Row
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
  },
  confirmationText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
  },

  // Bottom Container
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
    ...shadows.lg,
  },
  continueButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.grayLight,
  },
  continueButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
  continueButtonTextDisabled: {
    color: colors.grayMedium,
  },
  helperText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
