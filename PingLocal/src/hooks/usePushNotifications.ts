import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation, NavigationContainerRef } from '@react-navigation/native';
import {
  registerForPushNotificationsAsync,
  savePushTokenToDatabase,
  addNotificationListeners,
  updateTokenLastUsed,
} from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

// Navigation reference for handling notifications when app is not mounted
let navigationRef: NavigationContainerRef<any> | null = null;

export function setNavigationRef(ref: NavigationContainerRef<any> | null) {
  navigationRef = ref;
}

interface NotificationData {
  type?: string;
  offerId?: string;
  businessId?: string;
  claimId?: string;
  newTier?: string;
}

/**
 * Hook to handle push notification registration and navigation
 * Should be used in the main App component or a top-level provider
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const { refreshUnreadCount } = useNotifications();
  const appState = useRef(AppState.currentState);

  // Handle notification navigation
  const handleNotificationNavigation = useCallback((data: NotificationData) => {
    if (!navigationRef) {
      console.log('Navigation ref not set');
      return;
    }

    try {
      switch (data.type) {
        case 'new_offer':
          if (data.offerId) {
            // Navigate to offer details
            navigationRef.navigate('HomeStack', {
              screen: 'OfferDetail',
              params: { offerId: data.offerId },
            });
          }
          break;

        case 'offer_expiring':
          if (data.offerId) {
            navigationRef.navigate('ClaimedStack', {
              screen: 'Claimed',
            });
          }
          break;

        case 'redemption_reminder':
          navigationRef.navigate('ClaimedStack', {
            screen: 'Claimed',
          });
          break;

        case 'loyalty_upgrade':
          navigationRef.navigate('AccountStack', {
            screen: 'Account',
          });
          break;

        default:
          // Default to home
          navigationRef.navigate('HomeStack', {
            screen: 'Home',
          });
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
    }
  }, []);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (!user) return;

    const registerPushNotifications = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await savePushTokenToDatabase(token);
      }
    };

    registerPushNotifications();
  }, [user]);

  // Set up notification listeners
  useEffect(() => {
    if (!user) return;

    const cleanup = addNotificationListeners(
      // When notification is received while app is in foreground
      (notification: Notifications.Notification) => {
        console.log('Notification received in foreground:', notification);
        // Refresh unread count when a new notification arrives
        refreshUnreadCount();
      },
      // When user taps on notification
      (response: Notifications.NotificationResponse) => {
        console.log('Notification tapped:', response);
        const data = response.notification.request.content.data as NotificationData;
        handleNotificationNavigation(data);
      }
    );

    return cleanup;
  }, [user, handleNotificationNavigation, refreshUnreadCount]);

  // Handle app state changes to update token last used
  useEffect(() => {
    if (!user) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground - update token last used and refresh notification count
        updateTokenLastUsed();
        refreshUnreadCount();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, refreshUnreadCount]);

  // Check if app was opened from a notification
  useEffect(() => {
    const checkInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const data = response.notification.request.content.data as NotificationData;
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          handleNotificationNavigation(data);
        }, 1000);
      }
    };

    if (user) {
      checkInitialNotification();
    }
  }, [user, handleNotificationNavigation]);

  return {
    handleNotificationNavigation,
  };
}
