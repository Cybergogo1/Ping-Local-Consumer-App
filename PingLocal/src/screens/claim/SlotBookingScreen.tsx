import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO, isSameDay, addDays, startOfDay } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontFamily, shadows } from '../../theme';
import { OfferSlot } from '../../types/database';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../types/navigation';
import { useNotifications } from '../../contexts/NotificationContext';

type SlotBookingScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'SlotBooking'>;
  route: RouteProp<HomeStackParamList, 'SlotBooking'>;
};

export default function SlotBookingScreen({ navigation, route }: SlotBookingScreenProps) {
  const { offerId, offer } = route.params;
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  const [slots, setSlots] = useState<OfferSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<OfferSlot | null>(null);
  const [partySize, setPartySize] = useState(1);

  useEffect(() => {
    fetchSlots();
  }, [offerId]);

  const fetchSlots = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('offer_slots')
        .select('*')
        .eq('offer_id', offerId)
        .gte('slot_date', today)
        .order('slot_date', { ascending: true })
        .order('slot_time', { ascending: true });

      if (error) throw error;

      // Calculate available capacity
      const slotsWithCapacity = (data || []).map(slot => ({
        ...slot,
        available_capacity: slot.capacity - slot.booked_count,
      }));

      setSlots(slotsWithCapacity);

      // Set initial selected date to first available date
      if (slotsWithCapacity.length > 0) {
        setSelectedDate(parseISO(slotsWithCapacity[0].slot_date));
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique dates that have available slots
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    slots.forEach(slot => {
      if ((slot.available_capacity || 0) > 0) {
        dates.add(slot.slot_date);
      }
    });
    return Array.from(dates).map(d => parseISO(d));
  }, [slots]);

  // Get slots for selected date
  const slotsForSelectedDate = useMemo(() => {
    return slots.filter(slot =>
      isSameDay(parseISO(slot.slot_date), selectedDate) &&
      (slot.available_capacity || 0) > 0
    );
  }, [slots, selectedDate]);

  // Generate calendar days (next 30 days)
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 30; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, []);

  const isDateAvailable = (date: Date) => {
    return availableDates.some(d => isSameDay(d, date));
  };

  const formatTime = (timeString: string) => {
    // timeString is in HH:MM format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleContinue = () => {
    if (!selectedSlot) return;

    navigation.navigate('Claim', {
      offerId,
      offer,
      selectedSlot,
      partySize,
    });
  };

  const incrementPartySize = () => {
    if (selectedSlot && partySize < (selectedSlot.available_capacity || 1)) {
      setPartySize(prev => prev + 1);
    }
  };

  const decrementPartySize = () => {
    if (partySize > 1) {
      setPartySize(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Image source={require('../../../assets/images/iconback.png')} style={styles.headerButtonIcon} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.headerButton}
            >
              <Image source={require('../../../assets/images/iconnotifications.png')} style={styles.headerButtonIcon} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.headerButton}
            >
              <Image source={require('../../../assets/images/iconsettings.png')} style={styles.headerButtonIcon} />
            </TouchableOpacity>
          </View>
        </View>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No available slots for this offer</Text>
            <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconnotifications.png')} style={styles.headerButtonIcon} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconsettings.png')} style={styles.headerButtonIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Offer Summary */}
        <View style={styles.offerSummary}>
          <Text style={styles.offerName}>{offer.name}</Text>
          <Text style={styles.businessName}>{offer.business_name || offer.businesses?.name}</Text>
        </View>

        {/* Calendar Strip */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.calendarStrip}
            contentContainerStyle={styles.calendarStripContent}
          >
            {calendarDays.map((day, index) => {
              const isAvailable = isDateAvailable(day);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    isSelected && styles.calendarDaySelected,
                    !isAvailable && styles.calendarDayUnavailable,
                  ]}
                  onPress={() => isAvailable && setSelectedDate(day)}
                  disabled={!isAvailable}
                >
                  <Text style={[
                    styles.calendarDayName,
                    isSelected && styles.calendarDayTextSelected,
                    !isAvailable && styles.calendarDayTextUnavailable,
                  ]}>
                    {format(day, 'EEE')}
                  </Text>
                  <Text style={[
                    styles.calendarDayNumber,
                    isSelected && styles.calendarDayTextSelected,
                    !isAvailable && styles.calendarDayTextUnavailable,
                  ]}>
                    {format(day, 'd')}
                  </Text>
                  <Text style={[
                    styles.calendarDayMonth,
                    isSelected && styles.calendarDayTextSelected,
                    !isAvailable && styles.calendarDayTextUnavailable,
                  ]}>
                    {format(day, 'MMM')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Slots */}
        <View style={styles.slotsSection}>
          <Text style={styles.sectionTitle}>
            Available Times - {format(selectedDate, 'EEEE, MMMM d')}
          </Text>

          {slotsForSelectedDate.length === 0 ? (
            <Text style={styles.noSlotsText}>No available slots for this date</Text>
          ) : (
            <View style={styles.slotsGrid}>
              {slotsForSelectedDate.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.slotCard,
                      isSelected && styles.slotCardSelected,
                    ]}
                    onPress={() => {
                      setSelectedSlot(slot);
                      setPartySize(1); // Reset party size when changing slot
                    }}
                  >
                    <Text style={[
                      styles.slotTime,
                      isSelected && styles.slotTimeSelected,
                    ]}>
                      {formatTime(slot.slot_time)}
                    </Text>
                    <Text style={[
                      styles.slotCapacity,
                      isSelected && styles.slotCapacitySelected,
                    ]}>
                      {slot.available_capacity} spots left
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Party Size Selector */}
        {selectedSlot && (
          <View style={styles.partySizeSection}>
            <Text style={styles.sectionTitle}>Party Size</Text>
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
                style={[
                  styles.partySizeButton,
                  partySize >= (selectedSlot.available_capacity || 1) && styles.partySizeButtonDisabled,
                ]}
                onPress={incrementPartySize}
                disabled={partySize >= (selectedSlot.available_capacity || 1)}
              >
                <Text style={styles.partySizeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button */}
      {selectedSlot && (
        <View style={styles.bottomContainer}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedInfoText}>
              {format(selectedDate, 'EEE, MMM d')} at {formatTime(selectedSlot.slot_time)}
            </Text>
            <Text style={styles.selectedInfoSubtext}>
              {partySize} {partySize === 1 ? 'person' : 'people'}
            </Text>
          </View>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
      </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    marginBottom: spacing.md,
  },
  goBackButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  goBackButtonText: {
    color: colors.white,
    fontFamily: fontFamily.bodySemiBold,
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

  // Offer Summary
  offerSummary: {
    padding: spacing.md,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  offerName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
  },

  // Calendar Section
  calendarSection: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  calendarStrip: {
    marginHorizontal: -spacing.md,
  },
  calendarStripContent: {
    paddingHorizontal: spacing.md,
  },
  calendarDay: {
    width: 60,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  calendarDaySelected: {
    backgroundColor: colors.primary,
  },
  calendarDayUnavailable: {
    backgroundColor: colors.grayLight,
    opacity: 0.5,
  },
  calendarDayName: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    marginBottom: 2,
  },
  calendarDayNumber: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
  },
  calendarDayMonth: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
  },
  calendarDayTextSelected: {
    color: colors.white,
  },
  calendarDayTextUnavailable: {
    color: colors.grayMedium,
  },

  // Slots Section
  slotsSection: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  noSlotsText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  slotCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  slotCardSelected: {
    backgroundColor: colors.primary,
  },
  slotTime: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  slotTimeSelected: {
    color: colors.white,
  },
  slotCapacity: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
  },
  slotCapacitySelected: {
    color: colors.accent,
  },

  // Party Size Section
  partySizeSection: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
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
  selectedInfo: {
    marginBottom: spacing.sm,
  },
  selectedInfoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  selectedInfoSubtext: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
  },
  continueButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
});
