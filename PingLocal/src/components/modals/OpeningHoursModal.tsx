import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../../theme';
import { OpeningTime } from '../../types/database';

interface OpeningHoursModalProps {
  visible: boolean;
  onClose: () => void;
  openingTimes: OpeningTime[];
  businessName: string;
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getCurrentDayNumber(): number {
  const day = new Date().getDay();
  // JavaScript: 0=Sunday, 1=Monday, etc.
  // Our format: 1=Monday, 2=Tuesday, ... 7=Sunday
  return day === 0 ? 7 : day;
}

export default function OpeningHoursModal({
  visible,
  onClose,
  openingTimes,
  businessName,
}: OpeningHoursModalProps) {
  const currentDayNumber = getCurrentDayNumber();

  // Sort opening times by day number
  const sortedTimes = [...openingTimes].sort((a, b) => a.day_number - b.day_number);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Text style={styles.icon}>🕐</Text>
          <Text style={styles.title}>Opening Hours</Text>
          <Text style={styles.subtitle}>{businessName}</Text>

          <ScrollView style={styles.hoursContainer} showsVerticalScrollIndicator={false}>
            {sortedTimes.map((time) => {
              const isToday = time.day_number === currentDayNumber;
              return (
                <View
                  key={time.id}
                  style={[
                    styles.dayRow,
                    isToday && styles.todayRow,
                  ]}
                >
                  <View style={styles.dayNameContainer}>
                    <Text style={[styles.dayName, isToday && styles.todayText]}>
                      {time.name}
                    </Text>
                    {isToday && <Text style={styles.todayBadge}>Today</Text>}
                  </View>
                  <Text style={[styles.dayHours, isToday && styles.todayText]}>
                    {time.is_open
                      ? `${formatTime(time.opening_time)} - ${formatTime(time.closing_time)}`
                      : 'Closed'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.gotItButton} onPress={onClose}>
            <Text style={styles.gotItButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Helper function to get today's opening status for preview
export function getTodayOpeningStatus(openingTimes: OpeningTime[]): {
  isOpen: boolean;
  statusText: string;
} {
  const currentDayNumber = getCurrentDayNumber();
  const today = openingTimes.find((t) => t.day_number === currentDayNumber);

  if (!today) {
    return { isOpen: false, statusText: 'Hours not available' };
  }

  if (!today.is_open) {
    return { isOpen: false, statusText: 'Closed today' };
  }

  const openTime = formatTime(today.opening_time);
  const closeTime = formatTime(today.closing_time);

  // Check if currently open
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  if (today.opening_time && today.closing_time) {
    const openDate = new Date(today.opening_time);
    const closeDate = new Date(today.closing_time);
    const openMinutes = openDate.getHours() * 60 + openDate.getMinutes();
    const closeMinutes = closeDate.getHours() * 60 + closeDate.getMinutes();

    if (currentTime >= openMinutes && currentTime < closeMinutes) {
      return { isOpen: true, statusText: `Open until ${closeTime}` };
    } else if (currentTime < openMinutes) {
      return { isOpen: false, statusText: `Opens at ${openTime}` };
    } else {
      return { isOpen: false, statusText: `Closed - Opens ${openTime}` };
    }
  }

  return { isOpen: true, statusText: `${openTime} - ${closeTime}` };
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
    maxHeight: '80%',
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  hoursContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  todayRow: {
    backgroundColor: colors.accent + '20',
    borderRadius: borderRadius.sm,
    borderBottomColor: 'transparent',
    marginVertical: 2,
  },
  dayNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.grayDark,
  },
  todayText: {
    color: colors.primary,
    fontFamily: fontFamily.bodyBold,
  },
  todayBadge: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodyMedium,
    color: colors.white,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  dayHours: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
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
