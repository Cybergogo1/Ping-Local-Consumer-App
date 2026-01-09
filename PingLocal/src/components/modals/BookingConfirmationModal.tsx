import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../../theme';
import { supabase } from '../../lib/supabase';
import { scheduleLocalNotification, cancelScheduledNotification } from '../../services/notificationService';

interface BookingConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  purchaseTokenId: number;
  businessName: string;
  existingBookingDate?: string;
  existingReminderId?: string;
  onBookingConfirmed?: (date: Date) => void;
}

export default function BookingConfirmationModal({
  visible,
  onClose,
  purchaseTokenId,
  businessName,
  existingBookingDate,
  existingReminderId,
  onBookingConfirmed,
}: BookingConfirmationModalProps) {
  const isEditing = !!existingBookingDate;
  const [step, setStep] = useState<'ask' | 'date' | 'time' | 'notyet'>(isEditing ? 'date' : 'ask');
  const [bookingDate, setBookingDate] = useState(
    existingBookingDate ? new Date(existingBookingDate) : new Date()
  );
  const [bookingTime, setBookingTime] = useState(() => {
    if (existingBookingDate) {
      const existing = new Date(existingBookingDate);
      // Check if time was stored (not midnight)
      if (existing.getHours() !== 0 || existing.getMinutes() !== 0) {
        return existing;
      }
    }
    // Default to 12:00 PM
    const defaultTime = new Date();
    defaultTime.setHours(12, 0, 0, 0);
    return defaultTime;
  });
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
  const [isSaving, setIsSaving] = useState(false);

  // Reset to date step when modal opens
  useEffect(() => {
    if (visible) {
      setStep(isEditing ? 'date' : 'ask');
      setShowDatePicker(Platform.OS === 'ios');
      setShowTimePicker(Platform.OS === 'ios');
    }
  }, [visible, isEditing]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBookingDate(selectedDate);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setBookingTime(selectedTime);
    }
  };

  // Combine date and time into a single datetime
  const getCombinedDateTime = () => {
    const combined = new Date(bookingDate);
    combined.setHours(bookingTime.getHours(), bookingTime.getMinutes(), 0, 0);
    return combined;
  };

  const handleConfirm = async () => {
    setIsSaving(true);

    try {
      const combinedDateTime = getCombinedDateTime();

      // Cancel existing reminder if there is one
      if (existingReminderId) {
        try {
          await cancelScheduledNotification(existingReminderId);
        } catch (e) {
          console.log('Could not cancel existing reminder:', e);
        }
      }

      // Calculate reminder time (day before at 10am)
      const reminderDate = new Date(combinedDateTime);
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(10, 0, 0, 0);

      const now = new Date();
      const secondsUntilReminder = Math.max(
        (reminderDate.getTime() - now.getTime()) / 1000,
        60 // Minimum 60 seconds
      );

      // Schedule notification if reminder is in the future
      let notificationId: string | null = null;
      if (reminderDate > now) {
        notificationId = await scheduleLocalNotification(
          'Booking Reminder',
          `Don't forget your booking at ${businessName} tomorrow!`,
          { type: 'booking_reminder', purchaseTokenId },
          secondsUntilReminder
        );
      }

      // Update purchase token with booking info (store full datetime)
      const { error } = await supabase
        .from('purchase_tokens')
        .update({
          booking_date: combinedDateTime.toISOString(),
          booking_confirmed: true,
          booking_reminder_id: notificationId,
        })
        .eq('id', purchaseTokenId);

      if (error) throw error;

      onBookingConfirmed?.(combinedDateTime);
      onClose();
    } catch (error) {
      console.error('Error saving booking confirmation:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotYet = () => {
    setStep('notyet');
  };

  const handleYes = () => {
    setStep('date');
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
    }
  };

  const handleDateNext = () => {
    setStep('time');
    if (Platform.OS === 'android') {
      setShowTimePicker(true);
    }
  };

  const handleBackToDate = () => {
    setStep('date');
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
    }
  };

  const resetAndClose = () => {
    setStep(isEditing ? 'date' : 'ask');
    setShowDatePicker(Platform.OS === 'ios');
    setShowTimePicker(Platform.OS === 'ios');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={resetAndClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={resetAndClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          {step === 'ask' && (
            <>
              <Text style={styles.icon}>📅</Text>
              <Text style={styles.title}>Did you manage to book?</Text>
              <Text style={styles.subtitle}>
                Let us know if you've made your booking with {businessName}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.yesButton}
                  onPress={handleYes}
                >
                  <Text style={styles.yesButtonText}>Yes, I booked</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.noButton}
                  onPress={handleNotYet}
                >
                  <Text style={styles.noButtonText}>Not yet</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'date' && (
            <>
              <Text style={styles.icon}>📅</Text>
              <Text style={styles.title}>
                {isEditing ? 'Update Booking Date' : 'What date is your booking?'}
              </Text>
              <Text style={styles.subtitle}>
                Select the date you've booked for
              </Text>

              {Platform.OS === 'android' && !showDatePicker && (
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {bookingDate.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={bookingDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                  style={styles.datePicker}
                />
              )}

              {Platform.OS === 'ios' && (
                <Text style={styles.selectedDateText}>
                  Selected: {bookingDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              )}

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleDateNext}
              >
                <Text style={styles.confirmButtonText}>Next</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'time' && (
            <>
              <Text style={styles.icon}>🕐</Text>
              <Text style={styles.title}>What time is your booking?</Text>
              <Text style={styles.subtitle}>
                We'll send you a reminder the day before
              </Text>

              {Platform.OS === 'android' && !showTimePicker && (
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {bookingTime.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={bookingTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  style={styles.datePicker}
                />
              )}

              {Platform.OS === 'ios' && (
                <Text style={styles.selectedDateText}>
                  {bookingDate.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })} at {bookingTime.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToDate}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButtonFlex, isSaving && styles.confirmButtonDisabled]}
                  onPress={handleConfirm}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.confirmButtonText}>
                      {isEditing ? 'Update' : 'Confirm'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'notyet' && (
            <>
              <Text style={styles.icon}>👍</Text>
              <Text style={styles.title}>No problem!</Text>
              <Text style={styles.subtitle}>
                You can book anytime from your Claimed offers. The booking link will be available there.
              </Text>

              <TouchableOpacity
                style={styles.gotItButton}
                onPress={resetAndClose}
              >
                <Text style={styles.gotItButtonText}>Got it</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.xl,
    color: colors.grayDark,
    lineHeight: 28,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  yesButton: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  yesButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
  noButton: {
    flex: 1,
    backgroundColor: colors.grayLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  noButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.grayDark,
  },
  dateButton: {
    backgroundColor: colors.grayLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  datePicker: {
    width: '100%',
    marginBottom: spacing.md,
  },
  selectedDateText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    width: '100%',
  },
  confirmButtonFlex: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.grayLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.grayDark,
  },
  gotItButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    width: '100%',
  },
  gotItButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.white,
  },
});
