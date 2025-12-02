import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO, isSameDay, addDays, startOfDay } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { OfferSlot } from '../../types/database';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../types/navigation';

type SlotBookingScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'SlotBooking'>;
  route: RouteProp<HomeStackParamList, 'SlotBooking'>;
};

export default function SlotBookingScreen({ navigation, route }: SlotBookingScreenProps) {
  const { offerId, offer } = route.params;

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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select a Slot</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No available slots for this offer</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select a Slot</Text>
        <View style={styles.headerSpacer} />
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
    fontWeight: fontWeight.semibold,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: fontSize.lg,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  headerSpacer: {
    width: 40,
  },

  scrollView: {
    flex: 1,
  },

  // Offer Summary
  offerSummary: {
    padding: spacing.md,
    backgroundColor: colors.grayLight,
  },
  offerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
  },

  // Calendar Section
  calendarSection: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
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
    color: colors.grayDark,
    marginBottom: 2,
  },
  calendarDayNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  calendarDayMonth: {
    fontSize: fontSize.xs,
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
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  slotTimeSelected: {
    color: colors.white,
  },
  slotCapacity: {
    fontSize: fontSize.xs,
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
    fontWeight: fontWeight.bold,
  },
  partySizeValue: {
    alignItems: 'center',
    marginHorizontal: spacing.xl,
  },
  partySizeNumber: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  partySizeLabel: {
    fontSize: fontSize.sm,
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
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  selectedInfoSubtext: {
    fontSize: fontSize.xs,
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
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
