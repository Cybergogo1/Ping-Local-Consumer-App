import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  StatusBar,
  Animated,
  PanResponder,
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

type Step = 'party' | 'datetime' | 'slots';

// Extended slot with computed fields for filtering/sorting
interface FilteredSlot extends OfferSlot {
  applicabilityScore: number;
  slotDisplayText: string;
  timeDistance?: number; // Distance from preferred time in minutes
}

// Helper functions defined outside component to avoid recreation
const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  return `${hour12}${minutes !== '00' ? ':' + minutes : ''}${ampm}`;
};

const formatSlotText = (slot: OfferSlot): string => {
  const time = formatTime(slot.slot_time);
  if (slot.min_people === slot.capacity) {
    return `${time} for ${slot.capacity} people`;
  }
  return `${time} for ${slot.min_people}-${slot.capacity} people`;
};

const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Time Picker Wheel Component
const TimePickerWheel = ({
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
}: {
  selectedHour: number;
  selectedMinute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}) => {
  // Hours 1-12 (we'll combine with AM/PM)
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = [0, 15, 30, 45];
  const periods = ['AM', 'PM'];

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const periodScrollRef = useRef<ScrollView>(null);
  const itemHeight = 60;
  const visibleItems = 3;
  const containerHeight = itemHeight * visibleItems;
  const paddingVertical = itemHeight;

  // Convert 24h to 12h format
  const displayHour = selectedHour > 12 ? selectedHour - 12 : (selectedHour === 0 ? 12 : selectedHour);
  const isPM = selectedHour >= 12;

  useEffect(() => {
    // Scroll to selected hour on mount
    const hourIndex = hours.indexOf(displayHour);
    if (hourIndex >= 0 && hourScrollRef.current) {
      setTimeout(() => {
        hourScrollRef.current?.scrollTo({ y: hourIndex * itemHeight, animated: false });
      }, 50);
    }
  }, []);

  useEffect(() => {
    // Scroll to selected minute on mount
    const minuteIndex = minutes.indexOf(selectedMinute);
    if (minuteIndex >= 0 && minuteScrollRef.current) {
      setTimeout(() => {
        minuteScrollRef.current?.scrollTo({ y: minuteIndex * itemHeight, animated: false });
      }, 50);
    }
  }, []);

  useEffect(() => {
    // Scroll to selected period on mount
    const periodIndex = isPM ? 1 : 0;
    if (periodScrollRef.current) {
      setTimeout(() => {
        periodScrollRef.current?.scrollTo({ y: periodIndex * itemHeight, animated: false });
      }, 50);
    }
  }, []);

  const handleHourScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < hours.length) {
      const newDisplayHour = hours[index];
      // Convert back to 24h format
      let newHour24: number;
      if (isPM) {
        newHour24 = newDisplayHour === 12 ? 12 : newDisplayHour + 12;
      } else {
        newHour24 = newDisplayHour === 12 ? 0 : newDisplayHour;
      }
      // Clamp to valid range (10am - 11pm)
      newHour24 = Math.max(10, Math.min(23, newHour24));
      onHourChange(newHour24);
    }
  };

  const handleMinuteScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < minutes.length) {
      onMinuteChange(minutes[index]);
    }
  };

  const handlePeriodScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < periods.length) {
      const newIsPM = index === 1;
      // Only update if period actually changed
      if (newIsPM !== isPM) {
        // Convert current hour to new period, keeping the same display hour
        let newHour24: number;
        if (newIsPM) {
          newHour24 = displayHour === 12 ? 12 : displayHour + 12;
        } else {
          newHour24 = displayHour === 12 ? 0 : displayHour;
        }
        // Clamp to valid range (10am - 11pm) but try to keep display hour when possible
        if (newHour24 < 10) {
          newHour24 = 10; // 10am is minimum
        } else if (newHour24 > 23) {
          newHour24 = 23; // 11pm is maximum
        }
        onHourChange(newHour24);
      }
    }
  };

  return (
    <View style={[styles.timePickerContainer, { height: containerHeight }]}>
      {/* Center highlight band */}
      <View style={[styles.timePickerHighlight, { top: itemHeight, height: itemHeight }]} />

      {/* Hours wheel */}
      <View style={[styles.timePickerWheel, { height: containerHeight }]}>
        <ScrollView
          ref={hourScrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onMomentumScrollEnd={handleHourScroll}
          onScrollEndDrag={handleHourScroll}
          contentContainerStyle={{ paddingVertical }}
          nestedScrollEnabled={true}
        >
          {hours.map((hour) => {
            const isSelected = hour === displayHour;
            return (
              <View key={hour} style={[styles.timePickerItem, { height: itemHeight }]}>
                <Text style={[styles.timePickerItemTextLarge, isSelected && styles.timePickerItemTextSelected]}>
                  {hour}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Colon separator */}
      <Text style={styles.timePickerSeparatorLarge}>:</Text>

      {/* Minutes wheel */}
      <View style={[styles.timePickerWheel, { height: containerHeight }]}>
        <ScrollView
          ref={minuteScrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMinuteScroll}
          onScrollEndDrag={handleMinuteScroll}
          contentContainerStyle={{ paddingVertical }}
          nestedScrollEnabled={true}
        >
          {minutes.map((minute) => {
            const isSelected = minute === selectedMinute;
            return (
              <View key={minute} style={[styles.timePickerItem, { height: itemHeight }]}>
                <Text style={[styles.timePickerItemTextLarge, isSelected && styles.timePickerItemTextSelected]}>
                  {minute.toString().padStart(2, '0')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* AM/PM wheel */}
      <View style={[styles.timePickerWheel, { height: containerHeight }]}>
        <ScrollView
          ref={periodScrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onMomentumScrollEnd={handlePeriodScroll}
          onScrollEndDrag={handlePeriodScroll}
          contentContainerStyle={{ paddingVertical }}
          nestedScrollEnabled={true}
        >
          {periods.map((period) => {
            const isSelected = (period === 'PM') === isPM;
            return (
              <View key={period} style={[styles.timePickerItem, { height: itemHeight }]}>
                <Text style={[styles.timePickerItemTextLarge, isSelected && styles.timePickerItemTextSelected]}>
                  {period}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

export default function SlotBookingScreen({ navigation, route }: SlotBookingScreenProps) {
  const { offerId, offer } = route.params;
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  // Core state
  const [slots, setSlots] = useState<OfferSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<Step>('party');

  // User selections
  const [partySize, setPartySize] = useState<number>(2);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [preferredHour, setPreferredHour] = useState<number>(19); // Default 7pm
  const [preferredMinute, setPreferredMinute] = useState<number>(0);
  const [showAllSlots, setShowAllSlots] = useState<boolean>(false); // Default to using preferred time
  const [selectedSlots, setSelectedSlots] = useState<OfferSlot[]>([]);

  const calendarScrollRef = useRef<ScrollView>(null);

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

      // Calculate available capacity and ensure min_people has a default
      const slotsWithCapacity = (data || []).map(slot => ({
        ...slot,
        min_people: slot.min_people || 1,
        available_capacity: slot.capacity - slot.booked_count,
      }));

      setSlots(slotsWithCapacity);
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate max party size based on all available slots
  const maxPartySize = useMemo(() => {
    const totalCapacity = slots.reduce((sum, slot) => sum + (slot.available_capacity || 0), 0);
    return Math.min(totalCapacity, 20); // Cap at 20
  }, [slots]);

  // Get unique dates that have slots that could potentially fit the party size
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    slots.forEach(slot => {
      if ((slot.available_capacity || 0) > 0) {
        // Check if this date has any slot that could work for the party
        const dateSlots = slots.filter(
          s => s.slot_date === slot.slot_date && (s.available_capacity || 0) > 0
        );
        // Can this party fit in one or more slots on this date?
        const maxSingleCapacity = Math.max(...dateSlots.map(s => s.capacity), 0);
        const totalCapacity = dateSlots.reduce((sum, s) => sum + (s.available_capacity || 0), 0);

        if (partySize <= maxSingleCapacity || partySize <= totalCapacity) {
          dates.add(slot.slot_date);
        }
      }
    });
    return Array.from(dates).map(d => parseISO(d));
  }, [slots, partySize]);

  // Generate calendar days (next 30 days)
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 30; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, []);

  // Find the index of the first available date for scrolling
  const firstAvailableDateIndex = useMemo(() => {
    if (availableDates.length === 0) return 0;
    const firstAvailable = availableDates[0];
    return calendarDays.findIndex(day => isSameDay(day, firstAvailable));
  }, [availableDates, calendarDays]);

  // Scroll to first available date when entering datetime step
  useEffect(() => {
    if (step === 'datetime' && calendarScrollRef.current && firstAvailableDateIndex > 0) {
      // Scroll to show the first available date
      setTimeout(() => {
        calendarScrollRef.current?.scrollTo({
          x: firstAvailableDateIndex * 68, // 60 width + 8 margin
          animated: true,
        });
      }, 100);
    }
  }, [step, firstAvailableDateIndex]);

  // Auto-select first available date when entering datetime step
  useEffect(() => {
    if (step === 'datetime' && !selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [step, availableDates]);

  const isDateAvailable = (date: Date) => {
    return availableDates.some(d => isSameDay(d, date));
  };

  // Get preferred time as string for filtering
  const preferredTime = useMemo(() => {
    if (showAllSlots) return null;
    return `${preferredHour.toString().padStart(2, '0')}:${preferredMinute.toString().padStart(2, '0')}`;
  }, [showAllSlots, preferredHour, preferredMinute]);

  // Formatted preferred time for display
  const formattedPreferredTime = useMemo(() => {
    const hour12 = preferredHour > 12 ? preferredHour - 12 : preferredHour;
    const ampm = preferredHour >= 12 ? 'pm' : 'am';
    return `${hour12}:${preferredMinute.toString().padStart(2, '0')}${ampm}`;
  }, [preferredHour, preferredMinute]);

  // Filter and sort slots based on party size
  const { filteredSlots, requiresMultiSlot } = useMemo(() => {
    if (!selectedDate || !partySize) {
      return { filteredSlots: [], requiresMultiSlot: false };
    }

    // Get slots for selected date with available capacity
    const dateSlots = slots.filter(slot =>
      isSameDay(parseISO(slot.slot_date), selectedDate) &&
      (slot.available_capacity || 0) > 0
    );

    // Find max single slot capacity
    const maxSingleCapacity = Math.max(...dateSlots.map(s => s.capacity), 0);
    const needsMultiSlot = partySize > maxSingleCapacity;

    let applicableSlots: FilteredSlot[];

    if (needsMultiSlot) {
      // Multi-slot mode: show ALL available slots, prefer larger ones
      applicableSlots = dateSlots.map(slot => ({
        ...slot,
        applicabilityScore: 1000 - slot.capacity, // Prefer larger slots
        slotDisplayText: formatSlotText(slot),
      }));
    } else {
      // Single slot mode: filter by min_people <= partySize <= capacity
      const exactFits = dateSlots.filter(slot =>
        slot.min_people <= partySize &&
        partySize <= slot.capacity &&
        (slot.available_capacity || 0) >= partySize
      );

      if (exactFits.length > 0) {
        applicableSlots = exactFits.map(slot => ({
          ...slot,
          // Priority: smallest capacity that fits, then highest min_people
          applicabilityScore: (slot.capacity * 100) - slot.min_people,
          slotDisplayText: formatSlotText(slot),
        }));
      } else {
        // No exact fit, show larger slots that could accommodate
        applicableSlots = dateSlots
          .filter(slot =>
            partySize <= slot.capacity &&
            (slot.available_capacity || 0) >= partySize
          )
          .map(slot => ({
            ...slot,
            applicabilityScore: slot.capacity * 100,
            slotDisplayText: formatSlotText(slot),
          }));
      }

      // Deduplicate by time - show only the best slot per time
      const seenTimes = new Map<string, FilteredSlot>();
      applicableSlots.forEach(slot => {
        const existing = seenTimes.get(slot.slot_time);
        if (!existing || slot.applicabilityScore < existing.applicabilityScore) {
          seenTimes.set(slot.slot_time, slot);
        }
      });
      applicableSlots = Array.from(seenTimes.values());
    }

    // Sort by applicability score
    applicableSlots.sort((a, b) => a.applicabilityScore - b.applicabilityScore);

    // If preferred time is set, sort by proximity to it
    if (preferredTime) {
      const preferredMinutes = timeToMinutes(preferredTime);
      applicableSlots = applicableSlots.map(slot => ({
        ...slot,
        timeDistance: Math.abs(timeToMinutes(slot.slot_time) - preferredMinutes),
      }));
      applicableSlots.sort((a, b) => (a.timeDistance || 0) - (b.timeDistance || 0));

      // If not multi-slot and we have a preferred time, only show the best match
      // unless the time distance is very large (more than 2 hours)
      if (!needsMultiSlot && applicableSlots.length > 1) {
        const bestMatch = applicableSlots[0];
        if (bestMatch.timeDistance !== undefined && bestMatch.timeDistance <= 120) {
          // Only show the best match if it's within 2 hours of preferred time
          applicableSlots = [bestMatch];
        }
      }
    }

    return { filteredSlots: applicableSlots, requiresMultiSlot: needsMultiSlot };
  }, [slots, selectedDate, partySize, preferredTime]);

  // Auto pre-select logic
  useEffect(() => {
    if (step !== 'slots' || requiresMultiSlot || filteredSlots.length === 0) {
      return;
    }

    // Pre-select the best matching slot
    const bestSlot = filteredSlots[0];
    if (bestSlot) {
      setSelectedSlots([bestSlot]);
    }
  }, [filteredSlots, step, requiresMultiSlot]);

  // Calculate total selected capacity
  const totalSelectedCapacity = useMemo(() => {
    return selectedSlots.reduce((sum, slot) => sum + (slot.available_capacity || slot.capacity), 0);
  }, [selectedSlots]);

  const canContinue = totalSelectedCapacity >= partySize && selectedSlots.length > 0;
  const canProceedFromDatetime = selectedDate !== null;

  const handleSlotToggle = (slot: OfferSlot) => {
    if (requiresMultiSlot) {
      // Toggle selection for multi-slot mode
      const isSelected = selectedSlots.some(s => s.id === slot.id);
      if (isSelected) {
        setSelectedSlots(prev => prev.filter(s => s.id !== slot.id));
      } else {
        setSelectedSlots(prev => [...prev, slot]);
      }
    } else {
      // Single select mode
      setSelectedSlots([slot]);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlots([]); // Clear selections when date changes
  };

  const handleDatetimeContinue = () => {
    if (!canProceedFromDatetime) return;
    setStep('slots');
  };

  const handleContinue = () => {
    if (!canContinue) return;

    navigation.navigate('Claim', {
      offerId,
      offer,
      selectedSlot: selectedSlots[0], // For backwards compatibility
      selectedSlots: selectedSlots.length > 1 ? selectedSlots : undefined,
      partySize,
    });
  };

  const incrementPartySize = () => {
    if (partySize < maxPartySize) {
      setPartySize(prev => prev + 1);
    }
  };

  const decrementPartySize = () => {
    if (partySize > 1) {
      setPartySize(prev => prev - 1);
    }
  };

  // Render header (shared across all steps)
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <TouchableOpacity onPress={() => {
        if (step === 'party') {
          navigation.goBack();
        } else if (step === 'datetime') {
          setStep('party');
        } else {
          setStep('datetime');
          setSelectedSlots([]);
        }
      }} style={styles.headerButton}>
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
  );

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
        {renderHeader()}
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
      {renderHeader()}

      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            {/* Step 1 */}
            <View style={styles.progressStepColumn}>
              <View style={[styles.progressStep, step === 'party' && styles.progressStepActive]}>
                <Text style={[styles.progressStepText, step === 'party' && styles.progressStepTextActive]}>1</Text>
              </View>
              <Text style={[styles.progressLabel, step === 'party' && styles.progressLabelActive]}>Party Size</Text>
            </View>

            <View style={[styles.progressLine, (step === 'datetime' || step === 'slots') && styles.progressLineActive]} />

            {/* Step 2 */}
            <View style={styles.progressStepColumn}>
              <View style={[styles.progressStep, step === 'datetime' && styles.progressStepActive]}>
                <Text style={[styles.progressStepText, step === 'datetime' && styles.progressStepTextActive]}>2</Text>
              </View>
              <Text style={[styles.progressLabel, step === 'datetime' && styles.progressLabelActive]}>Date & Time</Text>
            </View>

            <View style={[styles.progressLine, step === 'slots' && styles.progressLineActive]} />

            {/* Step 3 */}
            <View style={styles.progressStepColumn}>
              <View style={[styles.progressStep, step === 'slots' && styles.progressStepActive]}>
                <Text style={[styles.progressStepText, step === 'slots' && styles.progressStepTextActive]}>3</Text>
              </View>
              <Text style={[styles.progressLabel, step === 'slots' && styles.progressLabelActive]}>Select Slot</Text>
            </View>
          </View>
        </View>

        {/* Offer Summary */}
        <View style={styles.offerSummary}>
          <Text style={styles.offerName}>{offer.name}</Text>
          <Text style={styles.businessName}>{offer.business_name || offer.businesses?.name}</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Step 1: Party Size */}
          {step === 'party' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>How many people?</Text>
              <Text style={styles.stepSubtitle}>Select the size of your party</Text>

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
                    partySize >= maxPartySize && styles.partySizeButtonDisabled,
                  ]}
                  onPress={incrementPartySize}
                  disabled={partySize >= maxPartySize}
                >
                  <Text style={styles.partySizeButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setStep('datetime')}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Date & Time Selection */}
          {step === 'datetime' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>When would you like to visit?</Text>
              <Text style={styles.stepSubtitle}>
                Party of {partySize} {partySize === 1 ? 'person' : 'people'}
              </Text>

              {availableDates.length === 0 && (
                <View style={styles.noAvailabilityMessage}>
                  <Text style={styles.noAvailabilityText}>
                    No availability for a party of {partySize}. Try a smaller party size or another date.
                  </Text>
                </View>
              )}

              {/* Calendar Strip */}
              <View style={styles.calendarSection}>
                <Text style={styles.sectionTitle}>Select Date</Text>
                <ScrollView
                  ref={calendarScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.calendarStrip}
                  contentContainerStyle={styles.calendarStripContent}
                >
                  {calendarDays.map((day, index) => {
                    const isAvailable = isDateAvailable(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.calendarDaySelected,
                          !isAvailable && styles.calendarDayUnavailable,
                        ]}
                        onPress={() => isAvailable && handleDateSelect(day)}
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

              {/* Preferred Time */}
              <View style={styles.timeSection}>
                <Text style={styles.sectionTitle}>Preferred Time</Text>
                {!showAllSlots && (
                  <>
                    <Text style={styles.sectionSubtitle}>
                      We'll find the closest available slot
                    </Text>

                    <TimePickerWheel
                      selectedHour={preferredHour}
                      selectedMinute={preferredMinute}
                      onHourChange={setPreferredHour}
                      onMinuteChange={setPreferredMinute}
                    />
                  </>
                )}

                <TouchableOpacity
                  style={styles.showAllSlotsToggle}
                  onPress={() => setShowAllSlots(!showAllSlots)}
                >
                  <View style={[styles.checkbox, showAllSlots && styles.checkboxChecked]}>
                    {showAllSlots && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.showAllSlotsText}>Show all available slots instead</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 100 }} />
            </View>
          )}

          {/* Step 3: Slot Selection */}
          {step === 'slots' && selectedDate && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>
                {requiresMultiSlot ? 'Select Tables' : 'Confirm Your Slot'}
              </Text>
              <Text style={styles.stepSubtitle}>
                {format(selectedDate, 'EEEE, MMMM d')}{!showAllSlots ? ` around ${formattedPreferredTime}` : ''} - Party of {partySize}
              </Text>

              {/* Notice when best match is more than 1 hour from preferred time */}
              {!showAllSlots && filteredSlots.length > 0 && filteredSlots[0].timeDistance !== undefined && filteredSlots[0].timeDistance > 60 && (
                <View style={styles.timeNoticeMessage}>
                  <Text style={styles.timeNoticeText}>
                    We don't have your specific time, but this is the closest slot available.
                  </Text>
                </View>
              )}

              {requiresMultiSlot && (
                <View style={styles.multiSlotInfo}>
                  <Text style={styles.multiSlotInfoText}>
                    Your party is larger than a single {offer.unit_of_measurement || 'slot'}. Please select multiple {offer.unit_of_measurement ? `${offer.unit_of_measurement}s` : 'slots'}.
                  </Text>
                  <View style={styles.multiSlotProgress}>
                    <Text style={styles.multiSlotProgressText}>
                      {totalSelectedCapacity >= partySize
                        ? `Great! You have ${totalSelectedCapacity} seats for your party of ${partySize}`
                        : `Select ${offer.unit_of_measurement ? `${offer.unit_of_measurement}s` : 'slots'} for ${partySize - totalSelectedCapacity} more people`
                      }
                    </Text>
                  </View>
                </View>
              )}

              {filteredSlots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
                  <Text style={styles.noSlotsText}>
                    No available slots for this date. Please select a different date.
                  </Text>
                  <TouchableOpacity
                    style={styles.changeDateButton}
                    onPress={() => {
                      setStep('datetime');
                      setSelectedSlots([]);
                    }}
                  >
                    <Text style={styles.changeDateButtonText}>Change Date</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {filteredSlots.map((slot, index) => {
                    const isSelected = selectedSlots.some(s => s.id === slot.id);
                    const isClosestToPreferred = !showAllSlots && index === 0;
                    const isSingleSlot = filteredSlots.length === 1;

                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[
                          styles.slotCard,
                          isSingleSlot && styles.slotCardFullWidth,
                          isSelected && styles.slotCardSelected,
                        ]}
                        onPress={() => handleSlotToggle(slot)}
                      >
                        {isClosestToPreferred && (
                          <View style={styles.closestBadge}>
                            <Text style={styles.closestBadgeText}>
                              Best match
                            </Text>
                          </View>
                        )}
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
                          {slot.min_people === slot.capacity
                            ? `for ${slot.capacity} people`
                            : `for ${slot.min_people}-${slot.capacity} people`
                          }
                        </Text>
                        {requiresMultiSlot && (
                          <Text style={[
                            styles.slotAvailable,
                            isSelected && styles.slotAvailableSelected,
                          ]}>
                            {slot.available_capacity} available
                          </Text>
                        )}
                        {isSelected && (
                          <View style={styles.selectedCheck}>
                            <Text style={styles.selectedCheckText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={{ height: 100 }} />
            </View>
          )}
        </ScrollView>

        {/* Bottom Continue Button for datetime step */}
        {step === 'datetime' && (
          <View style={styles.bottomContainer}>
            <View style={styles.selectedInfo}>
              {selectedDate && (
                <Text style={styles.selectedInfoText}>
                  {format(selectedDate, 'EEEE, MMMM d')}
                  {!showAllSlots && ` around ${formattedPreferredTime}`}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.continueButton, !canProceedFromDatetime && styles.continueButtonDisabled]}
              onPress={handleDatetimeContinue}
              disabled={!canProceedFromDatetime}
            >
              <Text style={[styles.continueButtonText, !canProceedFromDatetime && styles.continueButtonTextDisabled]}>
                Find Slots
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Continue Button (for slot selection step) */}
        {step === 'slots' && filteredSlots.length > 0 && (
          <View style={styles.bottomContainer}>
            <View style={styles.selectedInfo}>
              {selectedSlots.length > 0 && selectedDate && (
                <>
                  <Text style={styles.selectedInfoText}>
                    {format(selectedDate, 'EEE, MMM d')} at {selectedSlots.map(s => formatTime(s.slot_time)).join(' & ')}
                  </Text>
                  <Text style={styles.selectedInfoSubtext}>
                    {partySize} {partySize === 1 ? 'person' : 'people'}
                    {selectedSlots.length > 1 && ` across ${selectedSlots.length} ${offer.unit_of_measurement ? `${offer.unit_of_measurement}s` : 'slots'}`}
                  </Text>
                </>
              )}
            </View>
            <TouchableOpacity
              style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!canContinue}
            >
              <Text style={[styles.continueButtonText, !canContinue && styles.continueButtonTextDisabled]}>
                Continue
              </Text>
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

  // Progress Indicator
  progressContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#f9f9f9',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  progressStepColumn: {
    alignItems: 'center',
    width: 80,
  },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  progressStepActive: {
    backgroundColor: colors.primary,
  },
  progressStepText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.grayMedium,
  },
  progressStepTextActive: {
    color: colors.white,
  },
  progressLine: {
    width: 30,
    height: 2,
    backgroundColor: colors.grayLight,
    marginTop: 13, // Half of step circle height to center vertically
  },
  progressLineActive: {
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    textAlign: 'center',
  },
  progressLabelActive: {
    color: colors.primary,
    fontFamily: fontFamily.bodySemiBold,
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

  scrollView: {
    flex: 1,
  },

  // Step Container
  stepContainer: {
    padding: spacing.md,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    marginBottom: spacing.md,
  },

  // Party Size Selector
  partySizeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  partySizeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partySizeButtonDisabled: {
    backgroundColor: colors.grayMedium,
    opacity: 0.5,
  },
  partySizeButtonText: {
    fontSize: fontSize.xxl,
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
  },
  partySizeValue: {
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    minWidth: 80,
  },
  partySizeNumber: {
    fontSize: 56,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
  },
  partySizeLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
  },

  // Calendar Section
  calendarSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    marginBottom: spacing.sm,
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

  // Time Section
  timeSection: {
    marginBottom: spacing.lg,
  },

  // Time Picker
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  timePickerWheel: {
    flex: 1,
    overflow: 'hidden',
    maxWidth: 70,
  },
  timePickerHighlight: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: borderRadius.sm,
    zIndex: 0,
  },
  timePickerItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerItemTextLarge: {
    fontSize: 35,
    fontFamily: fontFamily.headingBold,
    color: colors.grayMedium,
  },
  timePickerItemTextSelected: {
    color: colors.primary,
  },
  timePickerSeparatorLarge: {
    fontSize: 35,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    zIndex: 2,
  },

  // Show all slots toggle
  showAllSlotsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.grayMedium,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTick: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fontFamily.bodyBold,
  },
  showAllSlotsText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
  },

  // No Availability Message
  noAvailabilityMessage: {
    padding: spacing.md,
    backgroundColor: '#FFF3E0',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  noAvailabilityText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: '#E65100',
    textAlign: 'center',
  },

  // Time Notice Message (when slot is >1hr from preferred)
  timeNoticeMessage: {
    padding: spacing.md,
    backgroundColor: '#E3F2FD',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  timeNoticeText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: '#1565C0',
    textAlign: 'center',
  },

  // Multi-slot Info
  multiSlotInfo: {
    backgroundColor: '#E3F2FD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  multiSlotInfoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: '#1565C0',
    marginBottom: spacing.sm,
  },
  multiSlotProgress: {
    backgroundColor: '#BBDEFB',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  multiSlotProgressText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: '#1565C0',
    textAlign: 'center',
  },

  // No Slots Container
  noSlotsContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  noSlotsText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  changeDateButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.full,
  },
  changeDateButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },

  // Slots Grid
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
    position: 'relative',
  },
  slotCardFullWidth: {
    width: '100%',
    marginHorizontal: 0,
  },
  slotCardSelected: {
    backgroundColor: colors.primary,
  },
  slotTime: {
    fontSize: fontSize.lg,
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
    color: colors.grayDark,
  },
  slotCapacitySelected: {
    color: colors.accent,
  },
  slotAvailable: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    marginTop: spacing.xs,
  },
  slotAvailableSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  selectedCheck: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodyBold,
  },
  closestBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  closestBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
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
    minHeight: 36,
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
});
