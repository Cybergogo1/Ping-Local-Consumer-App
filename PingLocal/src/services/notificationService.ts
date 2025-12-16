import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// EAS Project ID from app.json
const EAS_PROJECT_ID = 'e3a2debb-38ae-4e21-bb81-5668f8cb0aee';

/**
 * Register for push notifications and get the Expo push token
 * @returns The Expo push token or null if registration failed
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Must be a physical device for push notifications
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token - permission not granted');
    return null;
  }

  try {
    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    token = tokenData.data;
    console.log('Expo push token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }

  // Android-specific channel setup
  if (Platform.OS === 'android') {
    await setupAndroidNotificationChannels();
  }

  return token;
}

/**
 * Set up Android notification channels for different notification types
 */
async function setupAndroidNotificationChannels(): Promise<void> {
  // Default channel
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B35',
  });

  // Offers channel - for new offers from favorited businesses
  await Notifications.setNotificationChannelAsync('offers', {
    name: 'New Offers',
    description: 'Notifications about new offers from businesses you follow',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B35',
  });

  // Reminders channel - for redemption reminders and expiring offers
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    description: 'Reminders about your claimed offers',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
  });
}

/**
 * Save the push token to the database
 * @param token The Expo push token to save
 */
export async function savePushTokenToDatabase(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('No user logged in - cannot save push token');
    return;
  }

  try {
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        expo_push_token: token,
        device_type: Platform.OS,
        device_name: Device.deviceName || 'Unknown Device',
        is_active: true,
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,expo_push_token',
      });

    if (error) {
      console.error('Error saving push token:', error);
    } else {
      console.log('Push token saved successfully');
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Deactivate the current device's push token (e.g., on logout)
 */
export async function deactivatePushToken(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });

    await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('expo_push_token', tokenData.data);

    console.log('Push token deactivated');
  } catch (error) {
    console.error('Error deactivating push token:', error);
  }
}

/**
 * Remove all push tokens for the current user (e.g., on account deletion)
 */
export async function removeAllPushTokens(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  try {
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', user.id);

    console.log('All push tokens removed');
  } catch (error) {
    console.error('Error removing push tokens:', error);
  }
}

/**
 * Update the last_used_at timestamp for the current token
 * Call this periodically to track active devices
 */
export async function updateTokenLastUsed(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });

    await supabase
      .from('push_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('expo_push_token', tokenData.data);
  } catch (error) {
    // Silent fail - not critical
    console.error('Error updating token last used:', error);
  }
}

/**
 * Add notification listeners for received and tapped notifications
 * @param onNotificationReceived Callback when notification is received while app is foregrounded
 * @param onNotificationResponse Callback when user taps on a notification
 * @returns Cleanup function to remove listeners
 */
export function addNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
): () => void {
  const notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}

/**
 * Get the badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications from the notification center
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await setBadgeCount(0);
}

/**
 * Schedule a local notification (useful for testing or local reminders)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  triggerSeconds?: number
): Promise<string> {
  const trigger: Notifications.NotificationTriggerInput = triggerSeconds
    ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds }
    : null;

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger,
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Schedule a booking reminder notification for the day before
 * @param bookingDate The date of the booking
 * @param businessName The business name for the notification
 * @param purchaseTokenId The purchase token ID for navigation
 * @returns The notification ID or null if scheduling failed
 */
export async function scheduleBookingReminder(
  bookingDate: Date,
  businessName: string,
  purchaseTokenId: number
): Promise<string | null> {
  const reminderDate = new Date(bookingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(10, 0, 0, 0); // 10am day before

  const now = new Date();
  if (reminderDate <= now) {
    console.log('Booking reminder date is in the past, skipping');
    return null;
  }

  const secondsUntilReminder = (reminderDate.getTime() - now.getTime()) / 1000;

  return await scheduleLocalNotification(
    'Booking Reminder',
    `Don't forget your booking at ${businessName} tomorrow!`,
    {
      type: 'booking_reminder',
      purchaseTokenId,
      screen: 'Claimed',
    },
    secondsUntilReminder
  );
}
