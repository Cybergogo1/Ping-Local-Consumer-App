import React from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

/**
 * Component that handles push notification registration and navigation.
 * Should be placed inside AuthProvider and NavigationContainer.
 */
export function PushNotificationHandler({ children }: { children: React.ReactNode }) {
  // Initialize push notifications
  usePushNotifications();

  return <>{children}</>;
}
