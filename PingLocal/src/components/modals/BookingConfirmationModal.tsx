import React, { useState } from 'react';
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
  const [step, setStep] = useState<'ask' | 'date' | 'notyet'>(isEditing ? 'date' : 'ask');
  const [bookingDate, setBookingDate] = useState(
    existingBookingDate ? new Date(existingBookingDate) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [isSaving, setIsSaving] = useState(false);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBookingDate(selectedDate);
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);

    try {
      // Cancel existing reminder if there is one
      if (existingReminderId) {
        try {
          await cancelScheduledNotification(existingReminderId);
        } catch (e) {
          console.log('Could not cancel existing reminder:', e);
        }
      }

      // Calculate reminder time (day before at 10am)
      const reminderDate = new Date(bookingDate);
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

      // Update purchase token with booking info
      const { error } = await supabase
        .from('purchase_tokens')
        .update({
          booking_date: bookingDate.toISOString().split('T')[0],
          booking_confirmed: true,
          booking_reminder_id: notificationId,
        })
        .eq('id', purchaseTokenId);

      if (error) throw error;

      onBookingConfirmed?.(bookingDate);
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

  const resetAndClose = () => {
    setStep(isEditing ? 'date' : 'ask');
    setShowDatePicker(Platform.OS === 'ios');
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
                {isEditing ? 'Update Booking Date' : 'When is your booking?'}
              </Text>
              <Text style={styles.subtitle}>
                We'll send you a reminder the day before
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
                style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {isEditing ? 'Update Booking' : 'Confirm Booking'}
                  </Text>
                )}
              </TouchableOpacity>
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
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
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
