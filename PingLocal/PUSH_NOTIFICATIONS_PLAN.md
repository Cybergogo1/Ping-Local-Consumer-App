# PingLocal Push Notifications Implementation Plan

**Created:** December 4, 2025
**Status:** Planning
**Priority:** HIGH

---

## Overview

This document outlines the complete push notification system for PingLocal, including:
1. Device token registration and management
2. Database-triggered notifications via Supabase
3. Notification types and scenarios
4. Implementation steps

---

## Notification Scenarios

### 1. New Offer from Favorited Business
**Trigger:** Business creates a new offer in Adalo
**Recipients:** All users who have favorited that business
**Message Example:** "📍 New offer from [Business Name]: [Offer Title]"

### 2. Offer Expiring Soon
**Trigger:** Offer expires within 24 hours
**Recipients:** Users who have favorited the business OR claimed but not redeemed
**Message Example:** "⏰ [Offer Title] expires tomorrow! Don't miss out."

### 3. Offer Claimed - Redemption Reminder
**Trigger:** 24 hours before slot time (for booked offers) OR 3 days after claim (for non-booked)
**Recipients:** User who claimed the offer
**Message Example:** "🎟️ Don't forget to redeem your [Offer Title] at [Business Name]!"

### 4. New Business in Area (Future)
**Trigger:** New business joins PingLocal near user's location
**Recipients:** Users within X km radius
**Message Example:** "🆕 [Business Name] just joined PingLocal near you!"

### 5. Loyalty Tier Upgrade
**Trigger:** User reaches new loyalty tier
**Recipients:** The user
**Message Example:** "🎉 Congratulations! You've reached Gold status!"

### 6. Weekly Digest (Future)
**Trigger:** Scheduled (e.g., Sunday evening)
**Recipients:** Users with digest notifications enabled
**Message Example:** "📬 12 new offers this week near you!"

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Adalo App     │     │    Supabase     │     │  PingLocal App  │
│  (Business)     │     │                 │     │   (Consumer)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  Create Offer         │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │              ┌────────┴────────┐              │
         │              │ Database Trigger │              │
         │              │ (on INSERT to    │              │
         │              │  offers table)   │              │
         │              └────────┬────────┘              │
         │                       │                       │
         │              ┌────────┴────────┐              │
         │              │ Edge Function:   │              │
         │              │ send-push-       │              │
         │              │ notification     │              │
         │              └────────┬────────┘              │
         │                       │                       │
         │                       │  Query user_favorites │
         │                       │  Get push tokens      │
         │                       │                       │
         │              ┌────────┴────────┐              │
         │              │ Expo Push       │              │
         │              │ Notification    │              │
         │              │ Service         │              │
         │              └────────┬────────┘              │
         │                       │                       │
         │                       │    Push Notification  │
         │                       │──────────────────────>│
         │                       │                       │
```

---

## Database Schema

### New Table: `push_tokens`

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android')),
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, expo_push_token)
);

-- Index for quick lookups
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);
```

### New Table: `notification_preferences`

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  new_offers_from_favorites BOOLEAN DEFAULT true,
  offer_expiring_soon BOOLEAN DEFAULT true,
  redemption_reminders BOOLEAN DEFAULT true,
  loyalty_updates BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT false,
  marketing_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

### New Table: `notification_log`

```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  expo_ticket_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics and debugging
CREATE INDEX idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX idx_notification_log_created ON notification_log(created_at);
```

---

## Implementation Steps

### Phase 1: Client-Side Setup (App)

#### Step 1.1: Update app.json for notifications

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FF6B35",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "permissions": ["NOTIFICATIONS"]
    }
  }
}
```

#### Step 1.2: Create notification service

**File:** `src/services/notificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Must be a physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token - permission not granted');
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'YOUR_EAS_PROJECT_ID', // Replace with actual project ID
  });
  token = tokenData.data;

  // Android-specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    });

    await Notifications.setNotificationChannelAsync('offers', {
      name: 'New Offers',
      description: 'Notifications about new offers from businesses you follow',
      importance: Notifications.AndroidImportance.HIGH,
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      description: 'Reminders about your claimed offers',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token;
}

export async function savePushTokenToDatabase(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('No user logged in - cannot save push token');
    return;
  }

  const { error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: user.id,
      expo_push_token: token,
      device_type: Platform.OS,
      device_name: Device.deviceName || 'Unknown',
      is_active: true,
      updated_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,expo_push_token',
    });

  if (error) {
    console.error('Error saving push token:', error);
  }
}

export async function removePushToken(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'YOUR_EAS_PROJECT_ID',
  });

  await supabase
    .from('push_tokens')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('expo_push_token', tokenData.data);
}

export function addNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  const notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
```

#### Step 1.3: Initialize notifications in App.tsx

```typescript
// In App.tsx or main app component
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  savePushTokenToDatabase,
  addNotificationListeners
} from './services/notificationService';
import { useNavigation } from '@react-navigation/native';

function App() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const navigation = useNavigation();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        savePushTokenToDatabase(token);
      }
    });

    // Set up notification listeners
    const cleanup = addNotificationListeners(
      // When notification is received while app is foregrounded
      (notification) => {
        console.log('Notification received:', notification);
      },
      // When user taps on notification
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data, navigation);
      }
    );

    return cleanup;
  }, []);

  // ... rest of app
}

function handleNotificationNavigation(data: any, navigation: any) {
  if (data?.type === 'new_offer' && data?.offerId) {
    navigation.navigate('OfferDetails', { offerId: data.offerId });
  } else if (data?.type === 'redemption_reminder' && data?.claimId) {
    navigation.navigate('ClaimedOffers');
  } else if (data?.type === 'loyalty_upgrade') {
    navigation.navigate('Profile');
  }
}
```

---

### Phase 2: Database Triggers (Supabase)

#### Step 2.1: Create database function for new offers

```sql
-- Function to notify users when a favorited business creates an offer
CREATE OR REPLACE FUNCTION notify_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  business_name TEXT;
BEGIN
  -- Only trigger for active, published offers
  IF NEW.status = 'active' AND NEW.is_active = true THEN
    -- Get business name
    SELECT name INTO business_name FROM businesses WHERE id = NEW.business_id;

    -- Call edge function to send notifications
    PERFORM net.http_post(
      url := 'https://pyufvauhjqfffezptuxl.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'new_offer',
        'business_id', NEW.business_id,
        'business_name', business_name,
        'offer_id', NEW.id,
        'offer_title', NEW.title
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_new_offer_created ON offers;
CREATE TRIGGER on_new_offer_created
  AFTER INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_offer();
```

#### Step 2.2: Create trigger for offer updates (going live)

```sql
-- Function to notify when an offer becomes active
CREATE OR REPLACE FUNCTION notify_offer_activated()
RETURNS TRIGGER AS $$
DECLARE
  business_name TEXT;
BEGIN
  -- Only trigger when status changes to active
  IF OLD.status != 'active' AND NEW.status = 'active' AND NEW.is_active = true THEN
    SELECT name INTO business_name FROM businesses WHERE id = NEW.business_id;

    PERFORM net.http_post(
      url := 'https://pyufvauhjqfffezptuxl.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'new_offer',
        'business_id', NEW.business_id,
        'business_name', business_name,
        'offer_id', NEW.id,
        'offer_title', NEW.title
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_offer_activated ON offers;
CREATE TRIGGER on_offer_activated
  AFTER UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_offer_activated();
```

---

### Phase 3: Edge Functions (Supabase)

#### Step 3.1: Create send-push-notification Edge Function

**File:** `supabase/functions/send-push-notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  type: 'new_offer' | 'offer_expiring' | 'redemption_reminder' | 'loyalty_upgrade';
  business_id?: string;
  business_name?: string;
  offer_id?: string;
  offer_title?: string;
  user_id?: string;
  claim_id?: string;
  new_tier?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotificationPayload = await req.json();

    let tokens: string[] = [];
    let title = '';
    let body = '';
    let data: Record<string, any> = {};

    switch (payload.type) {
      case 'new_offer':
        // Get all users who favorited this business
        const { data: favorites } = await supabase
          .from('user_favorites')
          .select('user_id')
          .eq('business_id', payload.business_id)
          .eq('is_business', true);

        if (favorites && favorites.length > 0) {
          const userIds = favorites.map(f => f.user_id);

          // Get users with new_offers_from_favorites enabled
          const { data: preferences } = await supabase
            .from('notification_preferences')
            .select('user_id')
            .in('user_id', userIds)
            .eq('new_offers_from_favorites', true);

          const enabledUserIds = preferences?.map(p => p.user_id) || userIds;

          // Get push tokens for these users
          const { data: pushTokens } = await supabase
            .from('push_tokens')
            .select('expo_push_token')
            .in('user_id', enabledUserIds)
            .eq('is_active', true);

          tokens = pushTokens?.map(t => t.expo_push_token) || [];
        }

        title = `📍 New from ${payload.business_name}`;
        body = payload.offer_title || 'Check out their latest offer!';
        data = { type: 'new_offer', offerId: payload.offer_id };
        break;

      case 'offer_expiring':
        // Similar logic - get users who claimed but haven't redeemed
        const { data: claims } = await supabase
          .from('claimed_offers')
          .select('user_id')
          .eq('offer_id', payload.offer_id)
          .eq('status', 'claimed');

        if (claims && claims.length > 0) {
          const claimUserIds = claims.map(c => c.user_id);

          const { data: pushTokens } = await supabase
            .from('push_tokens')
            .select('expo_push_token')
            .in('user_id', claimUserIds)
            .eq('is_active', true);

          tokens = pushTokens?.map(t => t.expo_push_token) || [];
        }

        title = '⏰ Offer Expiring Soon';
        body = `${payload.offer_title} expires tomorrow!`;
        data = { type: 'offer_expiring', offerId: payload.offer_id };
        break;

      case 'redemption_reminder':
        // Single user notification
        if (payload.user_id) {
          const { data: pushTokens } = await supabase
            .from('push_tokens')
            .select('expo_push_token')
            .eq('user_id', payload.user_id)
            .eq('is_active', true);

          tokens = pushTokens?.map(t => t.expo_push_token) || [];
        }

        title = '🎟️ Redemption Reminder';
        body = `Don't forget to redeem your ${payload.offer_title}!`;
        data = { type: 'redemption_reminder', claimId: payload.claim_id };
        break;

      case 'loyalty_upgrade':
        if (payload.user_id) {
          const { data: pushTokens } = await supabase
            .from('push_tokens')
            .select('expo_push_token')
            .eq('user_id', payload.user_id)
            .eq('is_active', true);

          tokens = pushTokens?.map(t => t.expo_push_token) || [];
        }

        title = '🎉 Congratulations!';
        body = `You've reached ${payload.new_tier} status!`;
        data = { type: 'loyalty_upgrade' };
        break;
    }

    // Send notifications via Expo Push API
    if (tokens.length > 0) {
      const messages = tokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      }));

      // Batch notifications (Expo recommends max 100 per request)
      const batches = [];
      for (let i = 0; i < messages.length; i += 100) {
        batches.push(messages.slice(i, i + 100));
      }

      for (const batch of batches) {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
        });

        const result = await response.json();

        // Log notifications
        for (let i = 0; i < batch.length; i++) {
          await supabase.from('notification_log').insert({
            notification_type: payload.type,
            title,
            body,
            data,
            expo_ticket_id: result.data?.[i]?.id,
            status: result.data?.[i]?.status === 'ok' ? 'sent' : 'error',
            error_message: result.data?.[i]?.message,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: tokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### Step 3.2: Create scheduled function for expiring offers

**File:** `supabase/functions/check-expiring-offers/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Find offers expiring in the next 24 hours
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: expiringOffers } = await supabase
    .from('offers')
    .select('id, title, business_id')
    .eq('status', 'active')
    .gte('end_date', new Date().toISOString())
    .lte('end_date', tomorrow.toISOString());

  // Trigger notification for each expiring offer
  for (const offer of expiringOffers || []) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        type: 'offer_expiring',
        offer_id: offer.id,
        offer_title: offer.title,
        business_id: offer.business_id,
      }),
    });
  }

  return new Response(JSON.stringify({ checked: expiringOffers?.length || 0 }));
});
```

---

### Phase 4: Notification Preferences UI

#### Step 4.1: Update NotificationSettingsScreen

```typescript
// src/screens/main/NotificationSettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationPreferences {
  new_offers_from_favorites: boolean;
  offer_expiring_soon: boolean;
  redemption_reminders: boolean;
  loyalty_updates: boolean;
  weekly_digest: boolean;
  marketing_notifications: boolean;
}

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    new_offers_from_favorites: true,
    offer_expiring_soon: true,
    redemption_reminders: true,
    loyalty_updates: true,
    weekly_digest: false,
    marketing_notifications: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setPreferences(data);
    }
    setLoading(false);
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    setSaving(true);
    setPreferences(prev => ({ ...prev, [key]: value }));

    await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user?.id,
        [key]: value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    setSaving(false);
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Offer Notifications</Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>New offers from favorites</Text>
          <Text style={styles.settingDescription}>
            Get notified when businesses you follow post new offers
          </Text>
        </View>
        <Switch
          value={preferences.new_offers_from_favorites}
          onValueChange={(v) => updatePreference('new_offers_from_favorites', v)}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Expiring soon</Text>
          <Text style={styles.settingDescription}>
            Reminder when offers you've claimed are about to expire
          </Text>
        </View>
        <Switch
          value={preferences.offer_expiring_soon}
          onValueChange={(v) => updatePreference('offer_expiring_soon', v)}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Redemption reminders</Text>
          <Text style={styles.settingDescription}>
            Don't forget to redeem your claimed offers
          </Text>
        </View>
        <Switch
          value={preferences.redemption_reminders}
          onValueChange={(v) => updatePreference('redemption_reminders', v)}
        />
      </View>

      <Text style={styles.sectionTitle}>Account Notifications</Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Loyalty updates</Text>
          <Text style={styles.settingDescription}>
            Get notified when you reach a new loyalty tier
          </Text>
        </View>
        <Switch
          value={preferences.loyalty_updates}
          onValueChange={(v) => updatePreference('loyalty_updates', v)}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Weekly digest</Text>
          <Text style={styles.settingDescription}>
            Summary of new offers in your area each week
          </Text>
        </View>
        <Switch
          value={preferences.weekly_digest}
          onValueChange={(v) => updatePreference('weekly_digest', v)}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Marketing</Text>
          <Text style={styles.settingDescription}>
            Tips, news, and special promotions
          </Text>
        </View>
        <Switch
          value={preferences.marketing_notifications}
          onValueChange={(v) => updatePreference('marketing_notifications', v)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
```

---

## Deployment Checklist

### Database Setup
- [x] Create `push_tokens` table - **DONE** (migration file created)
- [x] Create `notification_preferences` table - **DONE** (migration file created)
- [x] Create `notification_log` table - **DONE** (migration file created)
- [x] Add RLS policies - **DONE** (included in migration)
- [x] Create notification triggers via Edge Functions - **DONE** (in create-offer and update-offer)
- [ ] Run migration on Supabase (execute 20251204_create_push_notification_tables.sql)

### Edge Functions
- [x] Deploy `send-push-notification` function - **DONE** (function created)
- [ ] Deploy `check-expiring-offers` function (future enhancement)
- [ ] Set up cron job for expiring offers check (daily) (future enhancement)
- [ ] Test functions with sample data

### App Updates
- [x] Update app.json with notification config - **DONE**
- [x] Create notification service - **DONE** (src/services/notificationService.ts)
- [x] Initialize notifications in App.tsx - **DONE** (PushNotificationHandler)
- [x] Build notification preferences screen - **DONE** (NotificationPreferencesScreen.tsx)
- [x] Handle notification deep linking - **DONE** (usePushNotifications hook)
- [ ] Test on physical devices (iOS and Android)

### Production Setup
- [x] Get EAS project ID - **DONE** (e3a2debb-38ae-4e21-bb81-5668f8cb0aee)
- [ ] Configure FCM for Android (automatic with Expo)
- [ ] Configure APNs for iOS (automatic with EAS)
- [ ] Test end-to-end notification flow
- [ ] Monitor delivery rates

---

## Testing Plan

### Unit Tests
1. Token registration saves correctly
2. Token removal deactivates token
3. Preferences save and load correctly

### Integration Tests
1. New offer triggers notification to favoriters
2. Expiring offer triggers reminder
3. Notification preferences are respected
4. Deep linking from notification works

### Manual Testing
1. Create offer in Adalo → Consumer app receives notification
2. Tap notification → Opens correct offer
3. Disable notifications → No longer received
4. Multiple devices → All devices receive

---

## Monitoring & Analytics

### Key Metrics to Track
- Notification delivery rate
- Notification open rate
- Time to open
- Opt-out rate by notification type
- Error rate by device type

### Alerts to Set Up
- Delivery rate drops below 90%
- Error rate exceeds 5%
- Edge function failures

---

## Future Enhancements

1. **Rich notifications** - Include offer images
2. **Geofenced notifications** - "You're near [Business]!"
3. **Smart timing** - Send at optimal engagement times
4. **A/B testing** - Test different notification copy
5. **Notification center** - In-app notification history

---

**Document Version:** 1.0
**Last Updated:** December 4, 2025
