# Ping Local Business App - Complete Build Prompt

You are building the **Ping Local Business App**, a React Native / Expo companion app for an existing consumer app called "Ping Local". The consumer app lets users discover, claim, and redeem promotions from local businesses. This business app lets those businesses manage their presence on the platform.

**Both apps share the same Supabase database.** The business app reads and writes to the same tables (businesses, offers, purchase_tokens, redemption_tokens, etc.) but through a business-scoped auth context.

---

## Table of Contents

1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [Project Setup](#2-project-setup)
3. [Design System](#3-design-system)
4. [Database Schema](#4-database-schema)
5. [Authentication & Business Users](#5-authentication--business-users)
6. [Navigation Structure](#6-navigation-structure)
7. [Screen Specifications](#7-screen-specifications)
8. [Onboarding Flow](#8-onboarding-flow)
9. [Promotion Creation & Management](#9-promotion-creation--management)
10. [QR Scanning & Redemption Flow](#10-qr-scanning--redemption-flow)
11. [Stripe Connect Integration](#11-stripe-connect-integration)
12. [Analytics](#12-analytics)
13. [Orders & Purchase History](#13-orders--purchase-history)
14. [Policies Management](#14-policies-management)
15. [FAQ System](#15-faq-system)
16. [Notifications](#16-notifications)
17. [Support](#17-support)
18. [Cloud Functions](#18-cloud-functions)
19. [Verification & Testing](#19-verification--testing)
20. [Adalo Migration](#20-adalo-migration)

---

## 1. Tech Stack & Dependencies

Use the **exact same stack** as the consumer app:

```json
{
  "dependencies": {
    "expo": "~54.0.26",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "typescript": "~5.9.2",

    "@react-navigation/native": "^7.1.21",
    "@react-navigation/stack": "^7.6.7",
    "@react-navigation/bottom-tabs": "^7.8.6",

    "@supabase/supabase-js": "^2.84.0",
    "react-native-url-polyfill": "^2.0.0",

    "expo-camera": "~16.1.6",
    "expo-barcode-scanner": "~13.0.1",

    "react-hook-form": "^7.66.1",

    "expo-notifications": "^0.32.13",
    "expo-secure-store": "^15.0.7",
    "@react-native-async-storage/async-storage": "^2.2.0",

    "expo-font": "^14.0.9",
    "expo-splash-screen": "~0.30.8",
    "expo-status-bar": "~2.2.3",
    "expo-image": "^3.0.10",
    "expo-linear-gradient": "^15.0.7",
    "expo-linking": "~7.0.5",
    "expo-web-browser": "~14.0.2",

    "react-native-gesture-handler": "~2.28.0",
    "react-native-safe-area-context": "^5.6.2",
    "react-native-screens": "~4.11.1",

    "date-fns": "^4.1.0",
    "@react-native-community/datetimepicker": "^8.2.0",

    "react-native-qrcode-svg": "^6.3.20"
  }
}
```

**Key differences from the consumer app:**
- **ADD** `expo-camera` and/or `expo-barcode-scanner` (for QR code scanning - the business scans consumer QR codes)
- **ADD** `expo-web-browser` (for Stripe Connect onboarding in an in-app browser)
- **KEEP** `react-native-qrcode-svg` (businesses have a QR code on their profile page that customers can scan to redeem claimed offers - this feature will be fully designed post-MVP but the dependency should be included now)
- **REMOVE** `react-native-maps` and `expo-location` (businesses don't need a map view or location services)
- **REMOVE** `@stripe/stripe-react-native` (businesses don't make payments - they receive them via Stripe Connect, handled via web browser)

---

## 2. Project Setup

### 2.1 Create the Expo Project

```bash
npx create-expo-app PingLocalBusiness --template blank-typescript
cd PingLocalBusiness
```

### 2.2 App Configuration (app.json)

```json
{
  "expo": {
    "name": "Ping Local Business",
    "slug": "ping-local-business",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "pinglocalbusiness",
    "ios": {
      "bundleIdentifier": "com.pinglocal.business",
      "supportsTablet": false,
      "infoPlist": {
        "NSCameraUsageDescription": "We need camera access to scan customer QR codes for offer redemption."
      }
    },
    "android": {
      "package": "com.pinglocal.business",
      "adaptiveIcon": {
        "backgroundColor": "#36566F"
      },
      "permissions": ["CAMERA"]
    },
    "plugins": [
      "expo-camera",
      "expo-notifications",
      "expo-secure-store",
      "expo-font"
    ]
  }
}
```

### 2.3 Folder Structure

```
PingLocalBusiness/
├── src/
│   ├── components/
│   │   ├── common/          (shared UI: Button, Card, Input, Modal, Badge, EmptyState)
│   │   ├── promotions/      (PromotionCard, PromotionForm, PromotionPreview)
│   │   ├── orders/          (OrderCard, RedemptionCard)
│   │   ├── scanner/         (QRScanner, ScanResult)
│   │   └── PushNotificationHandler.tsx
│   ├── screens/
│   │   ├── auth/            (Welcome, Login, SignUp, Verification, ForgotPassword, ResetPassword)
│   │   ├── onboarding/      (BusinessOnboarding)
│   │   ├── dashboard/       (DashboardHome, Analytics)
│   │   ├── promotions/      (PromotionsList, CreatePromotion, EditPromotion, PromotionDetail, PromotionPreview, ManageSlots)
│   │   ├── scanner/         (QRScannerScreen, ScanResultScreen, EnterBillScreen, RedemptionCompleteScreen)
│   │   ├── orders/          (OrdersList, OrderDetail, RedemptionHistory)
│   │   └── more/             (MoreMenu, BusinessProfile, EditProfile, OpeningHours, StripeConnect, Policies, ManageUsers, FAQ, Support, Settings, NotificationPreferences, BusinessQRCode)
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── OnboardingNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   ├── DashboardStackNavigator.tsx
│   │   ├── PromotionsStackNavigator.tsx
│   │   ├── ScannerStackNavigator.tsx
│   │   ├── OrdersStackNavigator.tsx
│   │   └── MoreStackNavigator.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx    (business auth - links to business_users + businesses tables)
│   │   └── NotificationContext.tsx
│   ├── services/
│   │   ├── notificationService.ts
│   │   └── promotionService.ts
│   ├── hooks/
│   │   └── usePushNotifications.ts
│   ├── lib/
│   │   └── supabase.ts       (same Supabase project connection)
│   ├── theme/
│   │   ├── index.ts           (IDENTICAL to consumer app)
│   │   └── commonStyles.ts    (IDENTICAL to consumer app)
│   ├── types/
│   │   ├── navigation.ts
│   │   └── database.ts        (same interfaces + new BusinessUser interface)
│   ├── constants/
│   │   └── typography.ts
│   └── utils/
│       ├── errorMessages.ts
│       └── responsive.ts
├── assets/
│   ├── fonts/                 (Geologica + Montserrat - same font files)
│   └── images/                (business app specific images)
├── App.tsx
└── app.json
```

### 2.4 Supabase Client (src/lib/supabase.ts)

**Uses the SAME Supabase project** as the consumer app:

```typescript
import 'react-native-url-polyfill';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = 'https://pyufvauhjqfffezptuxl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dWZ2YXVoanFmZmZlenB0dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTExMDQsImV4cCI6MjA3OTMyNzEwNH0.IEhzK1gNDqaS2q9656CBsx9JZBRHYZAfHYYKIVd4S5g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 2.5 App Entry Point (App.tsx)

```typescript
import React, { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { LinkingOptions } from '@react-navigation/native';

import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { PushNotificationHandler } from './src/components/PushNotificationHandler';
import { setNavigationRef } from './src/hooks/usePushNotifications';
import RootNavigator from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

const linking: LinkingOptions<any> = {
  prefixes: ['pinglocalbusiness://', 'https://business.pinglocal.co.uk'],
  config: {
    screens: {
      Main: {
        screens: {
          Dashboard: { screens: { DashboardHome: '' } },
          Promotions: { screens: { PromotionsList: 'promotions' } },
          Scanner: { screens: { QRScanner: 'scan' } },
          Orders: { screens: { OrdersList: 'orders' } },
          More: { screens: { MoreMenu: 'more', BusinessProfile: 'profile' } },
        },
      },
    },
  },
};

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Geologica-Regular': require('./assets/fonts/Geologica-Regular.ttf'),
    'Geologica-Medium': require('./assets/fonts/Geologica-Medium.ttf'),
    'Geologica-SemiBold': require('./assets/fonts/Geologica-SemiBold.ttf'),
    'Geologica-Bold': require('./assets/fonts/Geologica-Bold.ttf'),
    'Montserrat-Regular': require('./assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('./assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-SemiBold': require('./assets/fonts/Montserrat-SemiBold.ttf'),
    'Montserrat-Bold': require('./assets/fonts/Montserrat-Bold.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <NavigationContainer
              ref={navigationRef}
              linking={linking}
              onReady={() => setNavigationRef(navigationRef.current)}
            >
              <PushNotificationHandler>
                <StatusBar style="light" />
                <RootNavigator />
              </PushNotificationHandler>
            </NavigationContainer>
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

Note: No `StripeProvider` needed - businesses don't make payments in the app. They onboard to Stripe Connect via a web browser flow.

---

## 3. Design System

The business app must look **IDENTICAL** to the consumer app. Copy the theme files verbatim.

### 3.1 Theme (src/theme/index.ts)

```typescript
import { isSmallDevice } from '../utils/responsive';

export const colors = {
  primary: '#36566F',
  primaryLight: '#63829D',
  accent: '#F4E364',
  white: '#FFFFFF',
  black: '#000000',
  grayLight: '#F5F5F5',
  grayMedium: '#9CA3AF',
  grayDark: '#374151',
  error: '#EF4444',
  success: '#10B981',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// IMPORTANT: With static fonts, do NOT combine fontFamily with fontWeight.
// The weight is embedded in the font name.
export const fontFamily = {
  heading: 'Geologica-Bold',
  headingRegular: 'Geologica-Regular',
  headingMedium: 'Geologica-Medium',
  headingSemiBold: 'Geologica-SemiBold',
  headingBold: 'Geologica-Bold',
  body: 'Montserrat-Regular',
  bodyRegular: 'Montserrat-Regular',
  bodyMedium: 'Montserrat-Medium',
  bodySemiBold: 'Montserrat-SemiBold',
  bodyBold: 'Montserrat-Bold',
  label: 'Montserrat-Medium',
  regular: 'Montserrat-Regular',
};

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const responsiveSpacing = {
  buttonPaddingVertical: isSmallDevice ? 14 : spacing.md,
  buttonPaddingHorizontal: isSmallDevice ? 20 : spacing.lg,
};

export default { colors, spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows, responsiveSpacing };
```

### 3.2 Common Styles (src/theme/commonStyles.ts)

```typescript
import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from './index';

export const commonStyles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.white },
  containerPrimary: { flex: 1, backgroundColor: colors.primary },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  paddingHorizontal: { paddingHorizontal: spacing.lg },
  paddingVertical: { paddingVertical: spacing.md },
  padding: { padding: spacing.md },

  textCenter: { textAlign: 'center' },
  textWhite: { color: colors.white },
  textPrimary: { color: colors.primary },
  textGray: { color: colors.grayMedium },

  heading1: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.white },
  heading2: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.white },
  heading3: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.white },

  bodyText: { fontSize: fontSize.md, color: colors.white },
  smallText: { fontSize: fontSize.sm, color: colors.grayMedium },

  buttonPrimary: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
  buttonTextWhite: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.white },

  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.grayDark,
  },

  imageFill: { width: '100%', height: '100%' },
});

export default commonStyles;
```

### 3.3 Key UI Patterns to Follow

**Buttons:** Always fully rounded (`borderRadius: 9999`). Primary = accent yellow background with primary text. Secondary = primaryLight background with white text.

**Cards:** White background, `borderRadius: 16` (lg), shadow sm or md, padding 16px.

**Inputs:** White background, fully rounded, `paddingHorizontal: 24`, `paddingVertical: 16`, subtle 1px border `#eee`.

**Headers:** Primary color (`#36566F`) background, white text, row layout with left content and right action icons.

**Modals:** Centered on screen, white background, `borderRadius: 24` (xl), semi-transparent overlay `rgba(0,0,0,0.5)`.

**Tab Bar:** Primary color background, 5 tabs, center tab elevated above the bar (same pattern as consumer app). See Section 6 for implementation.

**Empty States:** Centered icon/image, title in `fontSize.lg` primary color, subtitle in `fontSize.md` gray.

**Loading States:** `ActivityIndicator` with `color={colors.primary}`, centered.

---

## 4. Database Schema

### 4.1 Existing Tables (shared with consumer app)

#### businesses
```typescript
interface Business {
  id: number;
  name: string;
  email?: string;
  description?: string;
  description_summary?: string;
  location?: string;
  location_area?: string;
  latitude?: number;
  longitude?: number;
  phone_number?: string;
  opening_times?: string;
  featured_image?: string;
  category?: string;
  sub_categories?: string;
  is_featured: boolean;
  is_signed_off: boolean;       // Whether Ping Local has approved this business
  currently_trading: boolean;
  available_promotion_types?: string;
  stripe_account_no?: string;   // Stripe Connect account ID
  lead_rate?: number;           // Lead fee for "Pay on the day" offers
  cut_percent?: number;         // Platform fee percentage (default 10%)
  created: string;
  updated: string;
}
```

#### offers
```typescript
interface Offer {
  id: number;
  name: string;
  summary?: string;
  full_description?: string;
  special_notes?: string;
  offer_type?: string;          // 'Pay up front' or 'Pay on the day'
  requires_booking: boolean;
  booking_type?: string;        // 'external', 'call', null
  booking_url?: string;
  one_per_customer: boolean;
  price_discount?: number;
  unit_of_measurement?: string;
  slot_name?: string;
  quantity?: number;            // Total available (null = unlimited)
  number_sold: number;          // Current count sold/claimed
  quantity_item: boolean;       // If true, quantity represents items not slots
  status?: string;              // 'Signed Off' = live, 'draft', 'Under Review', 'Finished'
  start_date?: string;
  end_date?: string;
  finish_time?: string;
  business_id?: number;
  business_name?: string;
  featured_image?: string;
  category?: string;
  customer_bill_input: boolean; // If true, business enters bill amount at redemption
  change_button_text?: string;   // Custom button text on the offer card (replaces "Book Now")
  custom_feed_text?: string;     // Custom text displayed on the feed card price badge
  auto_redeem_months?: number;   // Auto-redeem unredeemed claims after X months (null = disabled)
  business_policy_id?: number;
  policy_notes?: string;
  location_area?: string;
  business_location?: string;
  created: string;
  updated: string;
  // Joined data
  businesses?: Business;
  gallery_images?: ImageGalleryItem[];
  business_policy?: BusinessPolicy;
}
```

#### purchase_tokens (created when a consumer claims/buys an offer)
```typescript
interface PurchaseToken {
  id: number;
  name?: string;
  purchase_type?: string;
  customer_price?: number;      // null for "Pay on the day"
  ping_local_take?: number;
  redeemed: boolean;
  cancelled: boolean;
  cancellation_type?: string;   // 'Business Cancelled' | 'Customer Cancelled' | 'Other' | 'Auto-redeemed'
  cancellation_reason?: string; // Free text reason for cancellation
  offer_slot?: number;
  offer_name?: string;
  offer_id?: number;
  promotion_token?: string;     // The QR code data = this token's ID
  user_email?: string;
  user_id?: number;
  ping_invoiced: boolean;
  api_requires_sync: boolean;
  quantity?: number;            // Party size or item quantity
  customer_phone_no?: string;
  booking_date?: string;
  booking_confirmed?: boolean;
  booking_reminder_id?: string;
  created: string;
  updated: string;
  // Joined data
  offers?: Offer;
  businesses?: Business;
  offer_slots?: OfferSlot;
}
```

#### redemption_tokens (created when consumer opens QR, updated when business scans)
```typescript
interface RedemptionToken {
  id: number;
  purchase_token_id: number;
  scanned: boolean;
  status: 'Pending' | 'In Progress' | 'Finished' | 'Cancelled' | 'Rejected' | 'Submitted';
  bill_input_total?: number;    // Bill amount entered by business (Pay on Day)
  customer_name?: string;
  customer_id?: number;
  customer_phone_no?: string;
  offer_name?: string;
  business_name?: string;
  promotion_id?: number;
  completed: boolean;
  time_redeemed?: string;
  date_redeemed?: string;
  created: string;
  updated: string;
  purchase_tokens?: PurchaseToken;
}
```

#### offer_slots
```typescript
interface OfferSlot {
  id: number;
  offer_id: number;
  slot_date: string;    // YYYY-MM-DD
  slot_time: string;    // HH:MM
  capacity: number;
  min_people: number;
  booked_count: number;
  available: boolean;
  created: string;
  updated: string;
}
```

#### business_policies
```typescript
interface BusinessPolicy {
  id: number;
  name: string;
  returns_policy?: string;
  redemption?: string;
  category?: string;
  created_by_ping?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

#### image_gallery
```typescript
interface ImageGalleryItem {
  id: number;
  imageable_type: string;    // 'offer' or 'business'
  imageable_id: number;
  image_url: string;
  display_order: number;
  created: string;
}
```

#### opening_times
```typescript
interface OpeningTime {
  id: number;
  name: string;              // Day name: Monday, Tuesday, etc.
  day_number: number;        // 1=Monday, 7=Sunday
  is_open: boolean;
  opening_time?: string;
  closing_time?: string;
  is_special_date: boolean;
  special_date?: string;
  business_name: string;
  created: string;
  updated: string;
}
```

#### tags
```typescript
interface Tag {
  id: string;
  name: string;
  type: 'category' | 'tag';
}
```

### 4.2 New Table: business_users

This table links Supabase Auth users to businesses. Run this SQL in the Supabase dashboard:

```sql
CREATE TABLE business_users (
  id SERIAL PRIMARY KEY,
  auth_id UUID NOT NULL,
  business_id INTEGER REFERENCES businesses(id),
  email TEXT NOT NULL,
  first_name TEXT,
  surname TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  onboarding_completed BOOLEAN DEFAULT false,
  notification_permission_status TEXT DEFAULT 'not_asked'
    CHECK (notification_permission_status IN ('not_asked', 'granted', 'denied', 'dismissed')),
  created TIMESTAMPTZ DEFAULT NOW(),
  updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_users_auth_id ON business_users(auth_id);
CREATE INDEX idx_business_users_business_id ON business_users(business_id);
CREATE INDEX idx_business_users_email ON business_users(email);
```

### 4.4 Schema Migrations for New Fields

These ALTER statements add new columns to existing tables. Run in the Supabase SQL editor:

```sql
-- Add cancellation tracking to purchase_tokens
ALTER TABLE purchase_tokens ADD COLUMN IF NOT EXISTS cancellation_type TEXT
  CHECK (cancellation_type IN ('Business Cancelled', 'Customer Cancelled', 'Other', 'Auto-redeemed'));
ALTER TABLE purchase_tokens ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add auto-redeem setting to offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS auto_redeem_months INTEGER;
```

**Role Definitions:**
- **admin** - Full access. The user who originally signs up and creates the business is automatically set to `admin`. Can do everything including Stripe Connect, editing business details, managing other users, and deleting the business.
- **manager** - Can create/edit promotions, scan QR codes, view orders and analytics, manage policies. CANNOT access Stripe Connect, edit core business details (name, location, category), or manage users.
- **staff** - Can scan QR codes and view orders only. CANNOT create/edit promotions, view analytics, access Stripe, or edit any business details.

**Permission Matrix:**

| Feature | Admin | Manager | Staff |
|---------|-------|---------|-------|
| Dashboard (view) | Yes | Yes | Yes |
| Analytics | Yes | Yes | No |
| Create/Edit Promotions | Yes | Yes | No |
| Delete Promotions | Yes | No | No |
| Scan QR Codes | Yes | Yes | Yes |
| View Orders | Yes | Yes | Yes |
| Stripe Connect | Yes | No | No |
| Edit Business Profile | Yes | No | No |
| Cancel Claims | Yes | Yes | No |
| Redeem Without QR | Yes | Yes | No |
| Manage Opening Hours | Yes | No | No |
| Manage Policies | Yes | Yes | No |
| Manage Users (invite/remove) | Yes | No | No |
| View FAQ | Yes | Yes | Yes |
| Contact Support | Yes | Yes | Yes |
| Notification Preferences | Yes | Yes | Yes |

**Implementation:** Create a `usePermissions` hook that reads `businessUser.role` from AuthContext and exposes boolean flags like `canEditBusiness`, `canManageStripe`, `canCreatePromotions`, etc. Use these to conditionally render UI elements and protect navigation routes.

### 4.3 New TypeScript Interface

```typescript
interface BusinessUser {
  id: number;
  auth_id: string;
  business_id?: number;
  email: string;
  first_name?: string;
  surname?: string;
  role: 'admin' | 'manager' | 'staff';
  onboarding_completed: boolean;
  notification_permission_status: 'not_asked' | 'granted' | 'denied' | 'dismissed';
  created: string;
  updated: string;
  // Joined data
  businesses?: Business;
}
```

---

## 5. Authentication & Business Users

### 5.1 Auth Context (src/contexts/AuthContext.tsx)

The business AuthContext follows the same pattern as the consumer app but uses the `business_users` table instead of `users`, and also fetches the associated `businesses` record.

**State:**
```typescript
interface AuthState {
  session: Session | null;
  businessUser: BusinessUser | null;
  business: Business | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  isRecoveringPassword: boolean;
}
```

**Key methods:**
- `signUp(email, password, firstName, surname)` - Creates Supabase Auth user, creates `business_users` record. Does NOT create a `businesses` record yet (that happens during onboarding).
- `signIn(email, password)` - Signs in, fetches `business_users` record by `auth_id`, fetches associated `businesses` record.
- `signOut()` - Clears session and state.
- `verifyEmail(otp)` - Verifies email via OTP.
- `requestPasswordReset(email)` - Sends reset OTP.
- `verifyPasswordResetOtp(email, otp)` - Validates reset token.
- `updatePassword(newPassword)` - Updates password.
- `completeOnboarding()` - Sets `onboarding_completed = true` on `business_users`.
- `updateNotificationPermission(status)` - Updates notification permission status.
- `refreshBusiness()` - Re-fetches the `businesses` record (call after profile edits).

**Auth flow:**
1. On app load, check for existing session.
2. If session exists, fetch `business_users` where `auth_id = session.user.id`.
3. If `business_users` record has `business_id`, fetch the `businesses` record.
4. RootNavigator decides which flow to show based on:
   - No session → Auth flow
   - Session but no `business_users` record → Error/re-register
   - `business_users.onboarding_completed = false` → Onboarding flow
   - `business_users.business_id` is null → Onboarding flow (business profile not yet created)
   - Everything complete → Main app

### 5.2 Sign Up Flow

**SignUp screen fields:**
- First Name (required)
- Surname (required)
- Email (required, validated)
- Password (required, min 8 characters)
- "By signing up, you agree to our Terms of Service"

**On submit:**
1. Call `supabase.auth.signUp({ email, password, options: { data: { first_name, surname } } })`
2. Create `business_users` record: `{ auth_id: user.id, email, first_name, surname, role: 'admin' }` (the person who signs up is always the admin)
3. Navigate to Verification screen

### 5.3 Verification Flow
Same as consumer app - email OTP verification. After verification, navigate to onboarding.

---

## 6. Navigation Structure

### 6.1 Root Navigator

```
RootNavigator (based on auth state)
├── AuthNavigator (unauthenticated)
│   ├── Welcome
│   ├── Login
│   ├── SignUp
│   ├── Verification
│   ├── ForgotPassword
│   └── ResetPassword
│
├── OnboardingNavigator (authenticated but not onboarded)
│   └── BusinessOnboarding
│
└── MainTabNavigator (authenticated + onboarded + business profile exists)
    ├── Dashboard (DashboardStackNavigator)
    │   ├── DashboardHome
    │   ├── Analytics
    │   ├── Notifications
    │   ├── NotificationDetail
    │   └── Settings
    │       ├── EditProfile
    │       ├── ChangePassword
    │       ├── NotificationPreferences
    │       └── OnboardingReplay
    │
    ├── Promotions (PromotionsStackNavigator)
    │   ├── PromotionsList
    │   ├── CreatePromotion
    │   ├── EditPromotion
    │   ├── PromotionDetail
    │   ├── PromotionPreview
    │   └── ManageSlots
    │
    ├── Scan (ScannerStackNavigator) ← CENTER ELEVATED TAB
    │   ├── QRScanner
    │   ├── ScanResult
    │   ├── EnterBill
    │   └── RedemptionComplete
    │
    ├── Orders (OrdersStackNavigator)
    │   ├── OrdersList
    │   ├── OrderDetail
    │   └── RedemptionHistory
    │
    └── More (MoreStackNavigator)
        ├── MoreMenu (hub page with all options)
        ├── BusinessProfile
        ├── EditBusinessProfile
        ├── StripeConnect
        ├── Policies
        ├── CreatePolicy
        ├── EditPolicy
        ├── ManageUsers (admin only - invite/remove team members)
        ├── FAQ
        ├── Support
        ├── Settings
        │   ├── ChangePassword
        │   ├── NotificationPreferences
        │   └── OnboardingReplay
        └── BusinessQRCode (displays the business's scannable QR code)
```

### 6.2 Custom Tab Bar

Use the **exact same** custom tab bar pattern as the consumer app - 5 tabs with the center "Scan" tab elevated above the bar.

**Tab configuration:**

| Tab | Label | Icon | Stack |
|-----|-------|------|-------|
| 1 | Dashboard | Dashboard/home icon | DashboardStackNavigator |
| 2 | Promotions | Promotion/tag icon | PromotionsStackNavigator |
| 3 | Scan | QR/camera icon (ELEVATED) | ScannerStackNavigator |
| 4 | Orders | Receipt/list icon | OrdersStackNavigator |
| 5 | More | Menu/grid icon | MoreStackNavigator |

Hide the tab bar on: QRScanner, ScanResult, EnterBill, RedemptionComplete screens.

The center tab uses the same elevated pattern:
```typescript
centerTabContainer: {
  position: 'absolute',
  left: '50%',
  marginLeft: -35,
  top: -15,
  alignItems: 'center',
  justifyContent: 'center',
},
centerTabIcon: {
  width: 70,
  height: 70,
},
```

---

## 7. Screen Specifications

### 7.1 Welcome Screen
- App logo/branding for "Ping Local Business"
- Tagline: "A business app for local treasures"
- Subtext: "Organise your Ping Local Business"
- "Log In" button (primary)
- "Sign Up" button (secondary)
- Same primary background with accent buttons as consumer

### 7.2 Dashboard Home

**Header:**
- Business name (left)
- Notification bell with badge (right)
- Settings gear icon (right)
- Primary background, same style as consumer

**Content (scrollable):**

**Quick Stats Row (3 cards):**
- Active Promotions count
- Total Claims (this month)
- Revenue (this month)
- Each card: white background, shadow sm, icon + number + label

**Recent Activity Section:**
- Title: "Recent Activity"
- List of the 5 most recent purchase_tokens for the business
- Each item: customer name, offer name, time ago, amount (if Pay Up Front)
- "View All Orders" link at bottom

**Promotions Summary Section:**
- Title: "Your Promotions"
- Horizontal scroll of PromotionCards for active offers
- "View All" link

**Stripe Status Card:**
- If Stripe not connected: Yellow warning card with "Connect Stripe" CTA
- If connected: Green success indicator with "Stripe Connected"

### 7.3 Analytics Screen

**Data derived from existing tables** (no new analytics table needed):

- **Total Claims**: `COUNT(*) FROM purchase_tokens WHERE business_id = X AND cancelled = false`
- **Total Redemptions**: `COUNT(*) FROM redemption_tokens WHERE business_name = X AND status = 'Finished'`
- **Revenue (Pay Up Front)**: `SUM(customer_price) FROM purchase_tokens WHERE business_id = X AND redeemed = true AND purchase_type = 'Pay up front'`
- **Claims per promotion**: Group purchase_tokens by offer_id
- **Claims over time**: Group purchase_tokens by created date (last 30 days)
- **Top performing promotions**: Order by number_sold DESC

**Layout:**
- Date range selector (This Week / This Month / All Time)
- Summary stat cards at top
- Simple bar/list views showing per-promotion performance (no complex charts needed - use styled list items with progress bars)
- Each promotion row: name, claims count, redemptions count, revenue

### 7.4 Notifications Screen
Same pattern as consumer app - list of notifications filtered by the business. Uses the existing `notifications` table. Subscribe to realtime updates for notifications where the business_id matches.

### 7.5 More Menu Screen

This is the hub screen for the "More" tab. It presents a grid/list of options, showing or hiding items based on the user's role.

**Layout:** ScrollView with grouped option cards, each with an icon, label, and chevron.

**Section: Business**
- Business Profile (view/edit business details) — admin only for editing
- Opening Hours (manage weekly opening times) — admin only
- Business QR Code (view/share business QR) — all roles
- Stripe Connect (payment setup) — admin only
- Manage Team (invite/remove users) — admin only

**Section: Promotions**
- Policies (manage business policies) — admin + manager
- Analytics (detailed stats) — admin + manager

**Section: Support**
- FAQs
- Contact Support
- Replay Onboarding

**Section: Settings**
- Change Password
- Notification Preferences
- Privacy Policy (link)
- Terms of Service (link)

**Section: Account**
- Sign Out (with confirmation alert)

Use the `usePermissions` hook to conditionally show admin-only items. Non-permitted items should be hidden entirely (not greyed out).

### 7.6 Opening Hours Screen

**Access:** More menu → Opening Hours (admin only)

This screen allows the business to manage their weekly opening hours, which are displayed to consumers on the business profile in the consumer app. Uses the existing `opening_times` table.

**Layout:**
- Header: "Opening Hours" with "Save" button (accent)
- List of 7 days (Monday → Sunday), each as an expandable card
- Each day card shows:
  - Day name (left)
  - Current status: "9:00 - 17:00" or "Closed" (right, grey for closed)
  - Toggle switch for "Open" / "Closed"
  - When open: time pickers for opening time and closing time

**Day Editor (expanded):**
```
┌─────────────────────────────────────────┐
│  Monday                          [ON]   │
│  ─────────────────────────────────────  │
│  Opens:    [09:00]  ▼                   │
│  Closes:   [17:00]  ▼                   │
└─────────────────────────────────────────┘
```

- Use `@react-native-community/datetimepicker` in time mode for the pickers
- Times stored as "HH:MM" strings (e.g., "09:00", "17:30")

**Special Dates Section (below weekly schedule):**
- "Add Special Date" button
- For bank holidays or unusual hours
- Each special date: date picker + open/closed toggle + time pickers
- Maps to `opening_times` rows where `is_special_date = true`

**Data operations:**
```typescript
// Load opening hours
const { data: hours } = await supabase
  .from('opening_times')
  .select('*')
  .eq('business_name', businessName)
  .order('day_number', { ascending: true });

// Save (upsert each day)
for (const day of days) {
  await supabase.from('opening_times').upsert({
    name: day.name,          // 'Monday', 'Tuesday', etc.
    day_number: day.number,  // 1-7
    is_open: day.isOpen,
    opening_time: day.openTime,
    closing_time: day.closeTime,
    is_special_date: false,
    business_name: businessName,
  }, { onConflict: 'business_name,name,is_special_date' });
}
```

**Initial state:** If no opening_times exist for the business, show all 7 days as "Closed" and prompt: "Set your opening hours so customers know when to visit."

---

## 8. Onboarding Flow

The onboarding flow is a warm, friendly carousel that also collects business profile information. It serves two purposes: introduce the app AND set up the business profile.

### 8.1 Slides

**Slide 1: "Welcome to Ping Local"**
- Image: Business-themed illustration
- Title: "Discover" (accent color, 45px, Geologica Bold)
- Description: "Apply to join Wirral’s community of independents and get ready to be discovered by people who truly value what you do."

**Slide 2: "How It Works"**
- Image: Promotion flow illustration
- Title: "Love"
- Description: "We will connect you with local customers who’ll love your passion, your craft, and everything that makes your business unique."

**Slide 3: "Get Paid"**
- Image: Payment illustration
- Title: "Support"
- Description: "We will connect you with local customers who’ll love your passion, your craft, and everything that makes your business unique."

**Slide 3: "Get Paid"**
- Image: Payment illustration
- Title: "Engage"
- Description: "Your next loyal customer could be one tap away! Start by adding a crafted promotion—simple, smart, and perfectly targeted."

**Slide 5: "Set Up Your Business"**
- This slide transitions to a multi-step form (not a carousel slide):

**Business Profile Form (after carousel):**

Step 1 - Basic Info:
- Business Name (required)
- Business Email (pre-filled from auth)
- Phone Number
- Categories (multi-select pill picker, max 5 selections. Options: Restaurant, Cafe, Bar, Retail, Beauty, Health, Entertainment, Services, Other. Use the same pill/tag UI pattern as the consumer app's filter pills - active = accent background, inactive = light primary with opacity. Show a counter like "2/5 selected" and disable further selection when 5 are reached.)

Step 2 - Location:
- Address / Location description (text)
- Location Area (dropdown from `location_areas` table)

Step 3 - Description:
- Business Description — label: "Tell us why you're a great fit for Ping Local's values in 2000 characters or less!" (multiline textarea, max 2000 chars, show character counter)
- Description Summary (max 250 chars, label: "Write a short summary for your business listing")

Step 4 - Notifications:
- Push notification permission request
- "Get Started" button

**On completion:**
1. Call the `create-business` edge function with the form data. Set `is_signed_off: false` and `currently_trading: true`.
2. Update `business_users` record with the new `business_id`.
3. Set `onboarding_completed = true`.
4. **Notify Ping Local admin** — Call a new `notify-new-business-signup` edge function (or use the existing `send-email` function) to send an email to the Ping Local admin team (e.g., `admin@pinglocal.co.uk`) with the business name, email, category, and description. This alerts the team that a new business needs review.
5. Navigate to Main app.

Note: The business starts with `is_signed_off: false`. Ping Local admins will review and approve the business, setting `is_signed_off: true`. The app should show an "Under Review" banner on the Dashboard until approved.

### 8.2 Onboarding UI Pattern - Clone from Consumer App

**IMPORTANT: Directly clone the consumer app's `OnboardingScreen.tsx` component** from `PingLocal/src/screens/onboarding/OnboardingScreen.tsx`. The structure, animations, and styling should be identical - only swap the slide content (titles, descriptions, images) and replace the post-carousel logic with the business profile form steps.

**Consumer onboarding component structure to replicate:**
- Full-screen `ImageBackground` with `onboardbg.jpg` pattern (copy this image asset)
- Horizontal `FlatList` with `pagingEnabled`, `showsHorizontalScrollIndicator={false}`
- `onViewableItemsChanged` callback to track current slide index
- Each slide: centered `Image` (300x300), title (45px, accent, Geologica Bold), description (fontSize.lg, white, Montserrat Medium, centered), optional secondary text (fontSize.sm, accent)
- Bottom navigation with:
  - Progress dots (8px circles, `marginHorizontal: 4`, active = accent `#F4E364`, inactive = gray `#9CA3AF`)
  - Back button (40x40 circle, `#203C50` background, only shown after slide 1)
  - Next button (accent background, `paddingVertical: sm+4`, `paddingHorizontal: xxl`, fully rounded)
  - Last slide button text: "Get Started" (triggers notification permission + transitions to business profile form)
- `SafeAreaView` wrapping everything
- `StatusBar barStyle="light-content"`

Copy the entire StyleSheet from the consumer component. The only changes needed are the slide data array (titles/descriptions/images) and what happens after the last slide.

---

## 9. Promotion Creation & Management

### 9.1 Promotions List Screen

**Header:** "Your Promotions" with "+" create button (accent color)

**Filter tabs (horizontal scroll):**
- All
- Active (status = 'Signed Off' AND not expired)
- Pending (status = 'Under Review')
- Draft (status = 'draft')
- Finished (expired or manually ended)

**Promotion Cards:**
Each card shows:
- Featured image thumbnail (or placeholder)
- Promotion name
- Status badge (colored pill: green=Active, yellow=Pending, gray=Draft, red=Finished)
- Date range (start_date - end_date)
- Claims count (`number_sold`)
- Price/discount info

**Card actions:**
- Tap → PromotionDetail
- Long press or "..." menu → Edit, Preview, Clone, Delete (if draft)

**Empty state per filter:** "No [status] promotions" with illustration

### 9.2 Create Promotion Screen

Multi-step form using `react-hook-form`.

**Step 1: Basic Details**
- Promotion Name (required, max 100 chars)
- Summary (max 250 chars)
- Full Description (multiline, max 2000 chars)
- Special Notes (optional, multiline)
- Feed Image (image picker) — **Note: labelled "Feed Image" not "Featured Image"** — this is the main image shown on the consumer feed card
- Custom Feed Text (optional, text input) — custom text displayed on the feed card price badge (e.g., "50% Off!", "Free Dessert"). Maps to `custom_feed_text` field. Placeholder: "Leave blank for default"
- Custom Button Text (optional, text input) — custom text for the offer detail CTA button (replaces "Book Now"). Maps to `change_button_text` field. Placeholder: "Leave blank for 'Book Now'"

**Step 2: Offer Type & Pricing**
- Offer Type: "Pay Up Front" or "Pay on the Day" (radio buttons)
  - If "Pay Up Front": Price/Discount field (required, number input)
  - If "Pay on the Day": Customer Bill Input toggle
- Unit of Measurement (optional: "per person", "per item", etc.)
- One Per Customer toggle

**Step 3: Availability**
- Quantity (optional number - leave blank for unlimited)
- Quantity Item toggle - this gets ticked if the user fills the above in, so if it's set to 10, then we tick the 'quantity item' if it's left empty then it's unticked.
- Start Date (date picker)
- End Date (date picker)
- Finish Time (optional time picker)
- Auto-Redeem After (optional number input, months) — If set, unredeemed claims for this promotion will be automatically redeemed at a fixed value after X months. Maps to `auto_redeem_months`. Info tooltip: "Claims not redeemed within this period will be auto-completed at the original purchase price. Leave blank to disable."

**Step 4: Booking Settings**
- Requires Booking toggle
  - If yes: Booking Type (None/External/Call/slots)
    - uses in app slot system (slots shown in consumer side when promotion is set to 'online')
    - External: Booking URL field
    - Call: Uses business phone number
  - Slot Name (what to call the slot, e.g., "Table", "Appointment")

**Step 5: Policy**
- Select existing policy (dropdown from business_policies)
- Or "Create New Policy" button → navigates to CreatePolicy
- Policy Notes (optional)

**Step 6: Review & Submit**
- Summary of all fields
- "Preview" button → shows PromotionPreview
- "Save as Draft" button
- "Submit for Review" button (sets status = 'Under Review')

**On submit, call the `create-offer` edge function with payload:**
```typescript
{
  name: string,
  summary: string,
  full_description: string,
  special_notes: string,
  offer_type: 'Pay up front' | 'Pay on the day',
  requires_booking: boolean,
  booking_type: 'external' | 'call' | null,
  booking_url: string | null,
  one_per_customer: boolean,
  price_discount: number | null,
  unit_of_measurement: string | null,
  slot_name: string | null,
  quantity: number | null,
  quantity_item: boolean,
  status: 'draft' | 'Under Review',
  start_date: string | null,
  end_date: string | null,
  finish_time: string | null,
  business_id: number,
  business_name: string,
  featured_image: string | null,
  category: string | null,
  customer_bill_input: boolean,
  change_button_text: string | null,
  custom_feed_text: string | null,
  auto_redeem_months: number | null,
  business_policy_id: number | null,
  policy_notes: string | null,
  business_location: string | null,
}
```

### 9.3 Edit Promotion Screen
Same form as Create, pre-filled with existing data. Calls `update-offer` edge function.

**Rules:**
- Can edit drafts freely
- Can edit "Under Review" promotions (resets to draft if modified)
- CANNOT edit "Signed Off" (active/live) promotions - show read-only view with note "Contact Ping Local to modify active promotions"

**On submit for review:** When a promotion is submitted with `status: 'Under Review'`, trigger a `promotion_submitted` notification to the Ping Local admin (via the `send-push-notification` and `send-email` edge functions). Include the promotion name, business name, and a link/ID for the admin to review.

### 9.8 Promotion Cancellation & Deletion Rules

Promotions with outstanding (unredeemed) claims cannot be freely cancelled or deleted. The business app must enforce these rules:

**Deletion rules:**
- **Draft promotions**: Can be deleted freely (no claims exist)
- **Under Review**: Can be deleted freely (no claims exist)
- **Active (Signed Off) promotions WITH unredeemed claims**: CANNOT be deleted. Show message: "This promotion has [X] unredeemed claims and cannot be deleted. You can end the promotion early instead."
- **Active promotions with NO unredeemed claims**: Can be ended (set `status = 'Finished'`) but not deleted from the database
- **Finished promotions**: Can only be deleted if they have zero unredeemed purchase_tokens

**Pay Up Front cancellation blocking:**
- **Pay Up Front claims CANNOT be cancelled by the business** — the business has no refund capability through the app. Show message: "Pay Up Front claims cannot be cancelled as a refund would be required. Please contact Ping Local support for assistance."
- Only Ping Local admin can process refunds (out of scope for business app)

**Pay on the Day cancellation:**
- Business CAN cancel unredeemed Pay on the Day claims (no money has changed hands)
- Must provide a structured cancellation reason (see Section 13.4)

**Check for outstanding claims:**
```typescript
const { count: unredeemedClaims } = await supabase
  .from('purchase_tokens')
  .select('*', { count: 'exact', head: true })
  .eq('offer_id', offerId)
  .eq('redeemed', false)
  .eq('cancelled', false);
```

### 9.4 Promotion Detail Screen
Read-only view of all promotion data:
- Featured image
- All text fields
- Status with badge
- Dates
- Claims count + revenue
- Link to orders for this promotion
- Action buttons: Edit, Preview, Clone (if eligible), Manage Slots (if booking)

### 9.5 Promotion Preview Screen

**This is the most critical screen for business confidence.** It must render the promotion EXACTLY as it appears on the consumer app's OfferDetail screen.

Replicate the consumer app's `OfferDetailScreen` layout:
- Hero image (250px height) with gallery
- Price box overlapping (-40px) with accent "Claim Now" button
- Title + business name + location with icons
- Tags in horizontal flex wrap
- "Promotion Details" expandable section
- Special notes
- Terms & Conditions
- Business card at bottom

Add a banner at top: "This is how your promotion will appear to customers" (info blue background).

### 9.6 Clone Promotion

Available for promotions where: `status = 'Finished'` AND `end_date` is more than 2 weeks ago.

**Flow:**
1. Tap "Re-create" on eligible promotion card
2. Navigate to CreatePromotion with all fields pre-filled from the original
3. Reset: `status → 'draft'`, `number_sold → 0`, clear dates, clear slots
4. Business modifies and submits as new

### 9.7 Manage Slots Screen (for booking-based promotions)

**Layout:**
- Promotion name at top
- "Add Slot" button
- Calendar strip showing dates with slots
- For each date: list of time slots with capacity info

**Add Slot Form:**
- Date picker
- Time picker
- Capacity (number)
- Minimum party size (number, default 1)

**Calls:** `create-offer-slot` and `delete-offer-slot` edge functions.

---

## 10. QR Scanning & Redemption Flow

This is the business-side counterpart to the consumer's QR display. The business scans the consumer's QR code using the camera.

### 10.1 QR Scanner Screen (Center Tab)

**Layout:**
- Full-screen camera view
- Overlay with scanning frame (bordered rectangle in center)
- Title: "Scan Customer QR Code" at top
- Subtitle: "Ask the customer to show their QR code"
- Torch/flashlight toggle button
- Cancel/close button

**Implementation:**
Use `expo-camera` with `BarCodeScanner`:
```typescript
import { CameraView, useCameraPermissions } from 'expo-camera';

// On barcode scanned:
const handleBarCodeScanned = ({ data }: { data: string }) => {
  // data = the purchase_token_id (the QR code encodes the purchase token ID)
  // Navigate to ScanResult with this ID
};
```

**Permission handling:**
- Request camera permission on first access
- If denied: show explanation with "Open Settings" button

### 10.2 Scan Result Screen

After scanning, call the `scan-redemption-token` edge function:

**Request:**
```typescript
POST /functions/v1/scan-redemption-token
{
  "purchase_token_id": <scanned_value>,
  "scanned_by": <business_user_id>
}
```

**Response (success):**
```typescript
{
  "success": true,
  "redemption_token_id": number,
  "purchase_token_id": number,
  "offer_name": string,
  "customer_name": string,
  "customer_email": string,
  "purchase_type": string,     // 'Pay up front' or 'Pay on the day'
  "customer_price": number,    // null for Pay on Day
  "offer_id": number
}
```

**Screen layout:**
- Success checkmark animation
- "QR Code Scanned!" heading
- Customer name
- Offer name
- Purchase type badge

**Then, based on offer type:**
- **Pay Up Front**: Show "Complete Redemption" button → calls `complete-redemption` → navigates to RedemptionComplete
- **Pay on the Day**: Show "Enter Bill Amount" button → navigates to EnterBill

**Error handling:**
- "Redemption token not found" → "Customer hasn't opened their QR code yet. Ask them to open it first."
- "Already redeemed" → "This offer has already been redeemed."
- Network error → retry option

### 10.3 Enter Bill Screen (Pay on the Day only)

**Layout:**
- Customer name and offer name at top
- Large number input for bill amount (currency formatted, e.g., "12.50")
- Numeric keypad or standard input
- Summary: "Customer: [name], Offer: [name]"
- "Submit Bill" button (accent)
- "Cancel" button (ghost)

**On submit, call `complete-redemption`:**
```typescript
POST /functions/v1/complete-redemption
{
  "redemption_token_id": <from_scan_result>,
  "bill_amount": <entered_amount>,
  "completed_by": <business_user_id>
}
```

**Response:**
```typescript
{
  "success": true,
  "redemption_token_id": number,
  "status": "Submitted",       // Pay on Day → awaits customer confirmation
  "is_pay_on_day": true,
  "bill_amount": number,
  "requires_customer_confirmation": true
}
```

### 10.4 Redemption Complete Screen (Pay Up Front)

For Pay Up Front, `complete-redemption` returns:
```typescript
{
  "success": true,
  "status": "Finished",
  "is_pay_on_day": false,
  "requires_customer_confirmation": false
}
```

**Layout:**
- Large success checkmark/emoji
- "Redemption Complete!" heading
- Offer and customer details
- For Pay on Day: "Bill submitted! Waiting for customer to confirm." with info box
- For Pay Up Front: "All done! The customer's offer has been redeemed."
- "Scan Another" button (primary)
- "Back to Dashboard" button (secondary)

### 10.5 Customer-Not-Present Redemption Flow

Sometimes a customer may not be physically present to show their QR code (e.g., they booked in advance, or the business is completing a service after the customer has left). The business needs a way to redeem on the customer's behalf without scanning a QR code.

**Access:** From the Orders tab or from a specific order detail, show a "Redeem Without QR" button on unredeemed active orders.

**Flow:**
1. Business navigates to an unredeemed order (via Orders list or Dashboard recent activity)
2. Taps "Redeem Without QR" button on the order detail
3. Confirmation modal appears:
   - "Redeem this claim without scanning?"
   - Shows customer name, offer name, claim date
   - "This will mark the claim as redeemed. The customer will be notified."
   - "Confirm" (accent) and "Cancel" buttons
4. On confirm:
   - If **Pay Up Front**: Directly call `complete-redemption` with the `redemption_token_id` (look up from `purchase_token_id`). If no redemption_token exists yet, create one first via `scan-redemption-token`, then immediately complete it.
   - If **Pay on the Day**: Navigate to EnterBill screen (same as QR flow) to enter the bill amount, then call `complete-redemption`.
5. Show RedemptionComplete screen as normal

**Implementation notes:**
- The `scan-redemption-token` function already accepts `purchase_token_id` — it creates/finds the redemption token. Call it first, then immediately call `complete-redemption`.
- Add `redeemed_without_qr: true` flag to the update data so the system can distinguish manual redemptions for reporting purposes.
- Requires admin or manager role (use `usePermissions` hook). Staff cannot redeem without QR.

### 10.6 Complete Flow Summary

```
FLOW A: QR Scan (standard)
  Business opens Scan tab
    → Camera opens
    → Scans QR code (gets purchase_token_id)
    → Calls scan-redemption-token API
    → Shows ScanResult with customer + offer info
    → If Pay Up Front:
        → Tap "Complete Redemption"
        → Calls complete-redemption (no bill amount)
        → Shows "Redemption Complete!" (status: Finished)
    → If Pay on Day:
        → Tap "Enter Bill Amount"
        → Enter bill amount screen
        → Calls complete-redemption (with bill amount)
        → Shows "Bill Submitted!" (status: Submitted)
        → Consumer app shows Bill Confirmation screen
        → Consumer confirms → status: Finished (handled by consumer app)

FLOW B: Customer Not Present (manual redemption)
  Business opens Orders tab → finds unredeemed order
    → Taps "Redeem Without QR" on order detail
    → Confirmation modal
    → Calls scan-redemption-token (creates redemption token)
    → If Pay Up Front: immediately calls complete-redemption → Finished
    → If Pay on Day: navigate to EnterBill → submit → Submitted
    → Shows RedemptionComplete screen
```

---

## 11. Stripe Connect Integration

Businesses need to connect their Stripe account to receive payments from "Pay Up Front" offers.

### 11.1 New Edge Functions Needed

#### create-stripe-connect-account
```typescript
// Creates a Stripe Connect Express account and generates an onboarding link
// POST body: { business_id: number, business_email: string, business_name: string }
// Response: { url: string, account_id: string }

import Stripe from 'stripe';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// 1. Create or retrieve the connected account
const account = await stripe.accounts.create({
  type: 'express',
  email: business_email,
  business_profile: { name: business_name },
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// 2. Save account ID to businesses table
await supabaseClient.from('businesses')
  .update({ stripe_account_no: account.id })
  .eq('id', business_id);

// 3. Create an account link for onboarding
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'pinglocalbusiness://stripe-connect-refresh',
  return_url: 'pinglocalbusiness://stripe-connect-return',
  type: 'account_onboarding',
});

// Return the onboarding URL
return { url: accountLink.url, account_id: account.id };
```

#### get-stripe-connect-status
```typescript
// Checks if a business has completed Stripe onboarding
// POST body: { business_id: number }
// Response: { connected: boolean, details_submitted: boolean, charges_enabled: boolean, payouts_enabled: boolean }

const { data: business } = await supabaseClient.from('businesses')
  .select('stripe_account_no')
  .eq('id', business_id)
  .single();

if (!business?.stripe_account_no) {
  return { connected: false };
}

const account = await stripe.accounts.retrieve(business.stripe_account_no);

return {
  connected: true,
  details_submitted: account.details_submitted,
  charges_enabled: account.charges_enabled,
  payouts_enabled: account.payouts_enabled,
};
```

### 11.2 Stripe Connect Screen

**Layout when NOT connected:**
- Info card explaining why Stripe is needed
- "To receive payments from customers, you need to connect a Stripe account."
- Bullet points: "Secure payments", "Direct to your bank", "Simple setup"
- "Connect Stripe Account" button (accent, prominent)
- "Learn More" link

**Flow:**
1. Tap "Connect Stripe Account"
2. Call `create-stripe-connect-account` edge function
3. Open returned URL using `expo-web-browser`:
   ```typescript
   import * as WebBrowser from 'expo-web-browser';
   await WebBrowser.openBrowserAsync(url);
   ```
4. Stripe's hosted onboarding collects business info + bank details
5. On completion, Stripe redirects to `pinglocalbusiness://stripe-connect-return`
6. App calls `get-stripe-connect-status` to verify
7. If `charges_enabled` and `payouts_enabled` are true: trigger `stripe_connected` push notification and show success state
8. Show success celebration with confetti/checkmark: "You're all set! Your Stripe account is connected and ready to receive payments."

**Layout when CONNECTED:**
- Green success card: "Stripe Connected"
- Status indicators: Charges Enabled, Payouts Enabled
- "Manage in Stripe Dashboard" link
- "Disconnect" option (with confirmation warning)

---

## 12. Analytics

### 12.1 Analytics Screen

Accessible from Dashboard → "View Analytics" or from the Dashboard stack.

**Date range filter:** This Week | This Month | All Time (pill buttons at top)

**Summary Cards (2x2 grid):**
- Total Claims (icon + number)
- Total Redemptions (icon + number)
- Revenue Earned (icon + formatted amount)
- Avg. Claims per Promotion

**Per-Promotion Performance (scrollable list):**
Each item:
- Promotion name
- Status badge
- Claims: X | Redeemed: X | Revenue: X
- Visual progress bar (claims vs quantity if limited)

**Queries (via Supabase client directly):**
```typescript
// Total claims for business
const { count: totalClaims } = await supabase
  .from('purchase_tokens')
  .select('*', { count: 'exact', head: true })
  .eq('business_id', businessId)
  .eq('cancelled', false)
  .gte('created', startDate)
  .lte('created', endDate);

// Revenue
const { data: revenue } = await supabase
  .from('purchase_tokens')
  .select('customer_price')
  .eq('business_id', businessId)
  .eq('redeemed', true)
  .not('customer_price', 'is', null)
  .gte('created', startDate)
  .lte('created', endDate);

const totalRevenue = revenue?.reduce((sum, t) => sum + (t.customer_price || 0), 0) || 0;

// Per-promotion stats
const { data: promotionStats } = await supabase
  .from('offers')
  .select('id, name, status, number_sold, quantity')
  .eq('business_id', businessId)
  .order('number_sold', { ascending: false });
```

---

## 13. Orders & Purchase History

### 13.1 Orders List Screen

**Header:** "Orders" with filter icon

**Filter tabs:**
- All
- Active (purchased but not redeemed)
- Redeemed
- Cancelled

**Sort options:** Newest First (default), Oldest First, Booking Date

**Each order card shows:**
- Customer name/email
- Offer name
- Date claimed
- Amount (if Pay Up Front) or "Pay on Day"
- Status badge: Active (blue), Redeemed (green), Cancelled (red)
- **Booking date/time prominently displayed** (if applicable) — shown as a highlighted row below the offer name with a calendar icon
- **Stale claim warning** — if the claim is 3+ months old AND has no booking date AND is not redeemed, show an amber warning badge: "3+ months unredeemed" (see Section 13.5)

**Data source:** Query `purchase_tokens` where `business_id = currentBusiness.id`, joined with `offers` for offer details.

```typescript
const { data: orders } = await supabase
  .from('purchase_tokens')
  .select(`
    *,
    offers!purchase_tokens_offer_id_fkey (
      name, offer_type, featured_image, auto_redeem_months
    )
  `)
  .eq('business_id', businessId)
  .order('created', { ascending: false })
  .range(offset, offset + limit);
```

**Action buttons on order cards (unredeemed only):**
- "Redeem Without QR" button (see Section 10.5 — admin/manager only)
- "Cancel Claim" button (Pay on Day only — see Section 13.4)

### 13.2 Order Detail Screen

Full details of a single purchase_token. This screen should prioritise **booking information** prominently at the top when a booking date exists.

**Layout:**
- **Booking Banner (if booking_date exists):** Prominent accent-coloured banner at the top showing:
  - Booking date (formatted: "Saturday 15 March 2025")
  - Booking time (if from offer_slot)
  - Booking confirmed status (green tick or amber "Pending")
  - Party size / quantity
- **Customer Info Card:**
  - Customer name
  - Customer email (tappable → mailto)
  - Customer phone (tappable → tel)
- **Offer Info Card:**
  - Offer name (tappable → navigates to PromotionDetail)
  - Offer type badge (Pay Up Front / Pay on Day)
  - Customer price (if Pay Up Front) or "Bill to be entered" (if Pay on Day)
- **Claim Info:**
  - Date claimed
  - Quantity / party size
  - Payment amount and Ping Local take
- **Redemption Info (if redeemed):**
  - Redemption date
  - Bill amount (Pay on Day)
  - Redeemed via: "QR Scan" or "Manual" (based on `redeemed_without_qr` flag)
- **Cancellation Info (if cancelled):**
  - Cancellation type and reason
  - Date cancelled
- **Actions (if unredeemed):**
  - "Redeem Without QR" button (admin/manager)
  - "Cancel Claim" button (Pay on Day only)
  - "Contact Customer" button (opens email/phone)

### 13.3 Redemption History Screen

Alternative view showing `redemption_tokens` for the business:
- Filter by status: All, Completed, Pending, Submitted
- Each item: customer name, offer name, status, date, bill amount
- Useful for Pay on Day tracking

### 13.4 Claim Cancellation Flow

When a business needs to cancel a customer's claim, they must provide a structured reason. This ensures transparency and the customer is always notified.

**Cancellation rules:**
- **Pay Up Front claims CANNOT be cancelled** by the business (no refund capability). Show: "Pay Up Front claims cannot be cancelled. Contact Ping Local support for refund assistance."
- **Pay on the Day claims CAN be cancelled** (no money has changed hands)
- Only admin and manager roles can cancel claims

**Cancellation modal:**
1. Select cancellation type (required):
   - "Business Cancelled" — the business is cancelling (e.g., fully booked, can't fulfil)
   - "Customer Cancelled" — the customer requested cancellation
   - "Other" — any other reason
2. Enter reason (required for "Business Cancelled" and "Other", optional for "Customer Cancelled"):
   - Text input, max 500 chars
   - Placeholder varies by type:
     - Business: "Why is this claim being cancelled?"
     - Customer: "Optional: any details from the customer"
     - Other: "Please explain the reason"
3. Confirmation: "Cancel this claim? The customer will be notified."
4. On confirm, call `cancel-claim` edge function (see Section 18.2)

**After cancellation:**
- `purchase_tokens` row updated: `cancelled = true`, `cancellation_type`, `cancellation_reason`
- Push notification sent to customer: "Your claim for '[Offer Name]' has been cancelled. Reason: [reason]"
- Email sent to customer with full details
- The promotion's `number_sold` is decremented (freeing up a slot if quantity-limited)

### 13.5 Unredeemed Claims Management

The Orders list has special visual treatment for unredeemed claims to help businesses track outstanding obligations.

**Booking date highlighting:**
- Orders with a `booking_date` show the date prominently on the card with a calendar icon
- Past booking dates (booking_date < today AND not redeemed) are highlighted in amber: "Booking date passed"
- Upcoming booking dates within 48 hours are highlighted in blue: "Upcoming"

**Stale claim detection (3+ months):**
- Claims that are 3+ months old with NO booking date and NOT redeemed are flagged with an amber warning badge
- Calculation: `Date.now() - new Date(purchase_token.created).getTime() > 90 * 24 * 60 * 60 * 1000`
- These appear at the top of the "Active" filter tab with a section header: "Attention Needed"
- Each stale claim card shows: "Claimed [X] months ago — no booking date set"

**Sorting:** When viewing "Active" claims, default sort should be:
1. Stale claims (3+ months, no booking) at the top
2. Past booking dates (unredeemed) next
3. Upcoming booking dates
4. All other active claims by newest first

### 13.6 Auto-Redeem System

Promotions can be configured with an `auto_redeem_months` value (set during promotion creation, Step 3). When set, unredeemed claims are automatically completed after the specified number of months.

**How it works:**
- A scheduled edge function (`auto-redeem-stale-claims`) runs daily via a cron job
- It queries all unredeemed `purchase_tokens` where:
  - `redeemed = false` AND `cancelled = false`
  - The linked offer has `auto_redeem_months` set (NOT null)
  - `created` date + `auto_redeem_months` months < current date
- For each matching claim:
  1. Create a redemption token (via `scan-redemption-token` logic)
  2. Complete the redemption at the original `customer_price` (Pay Up Front) or at a fixed value of £0 (Pay on Day — since no bill was entered)
  3. Set `cancellation_type = 'Auto-redeemed'` on the purchase_token for tracking
  4. Send notification to business: "Claim for '[Offer]' by [Customer] was auto-redeemed after [X] months"
  5. Send notification to customer: "Your claim for '[Offer]' has been automatically completed"

**Display in orders:**
- Auto-redeemed claims show a distinct badge: "Auto-redeemed" (purple/info colour) instead of the normal "Redeemed" (green)
- The order detail shows: "This claim was automatically redeemed after [X] months as per the promotion settings"

**Dashboard alert:**
- When auto-redeems happen, show a notification card on the Dashboard: "[X] claims were auto-redeemed today"

---

## 14. Policies Management

### 14.1 Policies List Screen

**Layout:**
- "Your Policies" header with "+" create button
- List of business_policies created by this business
- Ping Local default policies shown separately (created_by_ping = true)
- Each item: policy name, category, truncated preview

### 14.2 Create/Edit Policy Screen

**Fields:**
- Policy Name (required)
- Category (dropdown: "Returns", "Redemption", "General", "Custom")
- Returns Policy (multiline text)
- Redemption Terms (multiline text)

**On save:** Call `create-business-policy` or update directly via Supabase.

### 14.3 Policy Association
When creating/editing a promotion, the business selects a policy from their list. The `business_policy_id` is stored on the offer.

---

## 15. FAQ System

The business FAQ should be comprehensive and explain how the platform works from the business perspective.

### 15.1 FAQ Screen Layout

Same UI pattern as consumer app:
- Header with back button
- Intro card: "How can we help?" with help icon
- Categorized accordion sections
- Support card at bottom

### 15.2 FAQ Categories & Content

**Getting Started:**
- "What is Ping Local?" → Explain the platform connecting local businesses with customers through exclusive promotions.
- "How do I set up my business?" → Walk through the onboarding process and what happens after submission.
- "How long does approval take?" → Explain the review process (Ping Local reviews and approves businesses).
- "How do I replay the onboarding tutorial?" → Settings → Replay Onboarding.

**Creating Promotions:**
- "How do I create a promotion?" → Step-by-step guide through the creation form.
- "What's the difference between 'Pay Up Front' and 'Pay on the Day'?" → Explain both models.
  - Pay Up Front: Customer pays through the app when claiming. You receive the payment minus the platform fee.
  - Pay on the Day: Customer claims for free, pays you directly when they visit. A small lead fee applies.
- "What happens after I submit a promotion?" → It goes to 'Under Review'. Ping Local reviews and approves it, changing status to 'Signed Off' (live).
- "Can I edit an active promotion?" → No, contact Ping Local support to modify active promotions.
- "How do I manage booking slots?" → Explain the slot system for booking-based promotions.
- "What does 'One Per Customer' mean?" → Each customer can only claim this offer once.
- "How do I re-create a past promotion?" → Promotions that ended 2+ weeks ago show a "Re-create" button.

**Payments & Revenue:**
- "How do I get paid?" → Explain Stripe Connect setup.
- "What are the platform fees?" → Your cut_percent (default 10%) is the platform fee on Pay Up Front offers. Lead fees apply to Pay on the Day.
- "When do I receive my money?" → Explain Stripe's payout schedule (typically 2-3 business days).
- "How do I connect my Stripe account?" → Walk through the Stripe Connect flow.
- "What if a customer disputes a payment?" → Explain the dispute process.

**Scanning & Redemption:**
- "How do I scan a customer's QR code?" → Open the Scan tab, point camera at QR code.
- "What if the QR code won't scan?" → Ensure the customer's screen is bright, try manual entry if available.
- "What's the difference between the redemption flows?" → Explain Pay Up Front (instant) vs Pay on Day (enter bill → customer confirms).
- "What happens if a customer cancels?" → Explain cancellation policy (48+ hours before booking).
- "The customer says they opened their QR code but I can't scan it?" → The customer needs to keep the QR screen open. Ask them to close and reopen it.

**Managing Your Business:**
- "How do I update my business details?" → Account → Edit Business Profile.
- "How do I manage my opening hours?" → Business profile editing.
- "How do I create business policies?" → Account → Policies.
- "Can I have multiple staff scan QR codes?" → Explain the role system (owner, manager, staff).

**Notifications:**
- "What notifications will I receive?" → New claims, redemptions, weekly summaries, payment confirmations.
- "How do I manage notification preferences?" → Settings → Notification Preferences.

**Account & Support:**
- "How do I change my password?" → Settings → Change Password.
- "How do I contact Ping Local support?" → Account → Support (opens email).
- "How do I delete my account?" → Contact Ping Local support.

### 15.3 FAQ Accordion Component
```
Each FAQ item:
┌─────────────────────────────────────┐
│ Question text            ▼ chevron  │
│─────────────────────────────────────│
│ Answer text (shown when expanded)   │
│ with lineHeight 22, fontSize.sm     │
└─────────────────────────────────────┘
```

Use `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` for smooth expand/collapse.

---

## 16. Notifications

### 16.1 Push Notification Types for Business

| Type | Trigger | Content |
|------|---------|---------|
| `new_claim` | Customer claims an offer | "[Customer] claimed [Offer Name]" |
| `new_redemption` | Customer redeems an offer | "[Customer] redeemed [Offer Name]" |
| `bill_confirmed` | Customer confirms bill (Pay on Day) | "[Customer] confirmed bill of [Amount] for [Offer]" |
| `offer_approved` | Ping Local approves a promotion | "Your promotion '[Name]' has been approved and is now live!" |
| `offer_rejected` | Ping Local rejects a promotion | "Your promotion '[Name]' needs changes. Tap to see details." |
| `promotion_submitted` | Business submits promotion for review | **Sent to Ping Local admin** — "New promotion submitted: '[Name]' by [Business Name] needs review" |
| `business_approved` | Admin approves business application | **Sent to business** — "Congratulations! Your business '[Name]' has been approved. You can now create promotions!" |
| `stripe_connected` | Business completes Stripe Connect onboarding | "Your Stripe account is now connected! You're ready to receive payments." |
| `weekly_summary` | Weekly cron job | "This week: [X] claims, [Y] redemptions, [Z] revenue" |
| `payment_received` | Stripe payout processed | "Payment of [Amount] has been sent to your bank account" |
| `claim_cancelled` | Business or customer cancels a claim | **Sent to customer** — "Your claim for '[Offer Name]' has been cancelled. Reason: [reason]" |
| `claim_auto_redeemed` | Auto-redeem triggered on stale claim | **Sent to business** — "Claim for '[Offer Name]' by [Customer] was auto-redeemed after [X] months" |
| `new_business_signup` | Business completes onboarding | **Sent to Ping Local admin** — "New business signup: [Business Name] ([Category]) needs review" |

### 16.2 Notification Context
Same pattern as consumer app - subscribe to `notifications` table for rows matching `business_id`. Track unread count. Display badge on notification bell.

### 16.3 Email Notifications
Leverage existing `send-email` edge function:
- New claim confirmation
- Daily/weekly summary digest
- Payment confirmation
- Account verification
- Business approval notification (congratulations email with next steps)
- Promotion submitted for review (to Ping Local admin)
- Stripe Connect success confirmation
- Claim cancellation notification (to customer, with reason)

---

## 17. Support

### 17.1 Support Screen

**Layout:**
- "Contact Support" heading
- Info text: "Have a question or need help? Get in touch with our team."
- "Email Us" button → opens email client with pre-filled to address
  ```typescript
  import { Linking } from 'react-native';
  Linking.openURL('mailto:support@pinglocal.co.uk?subject=Business App Support - [Business Name]');
  ```
- "Call Us" button (if phone number available)
- Business hours info: "We typically respond within 24 hours"
- Link to FAQ: "Check our FAQ for quick answers"

---

## 18. Cloud Functions

### 18.1 Existing Functions to Use (no changes needed)

| Function | Purpose | Business App Usage |
|----------|---------|-------------------|
| `create-offer` | Create a new promotion | Called from CreatePromotion screen |
| `update-offer` | Update an existing promotion | Called from EditPromotion screen |
| `delete-offer` | Delete a promotion | Called from PromotionDetail |
| `get-offers` | List offers with filters | Called from PromotionsList |
| `scan-redemption-token` | Mark QR as scanned | Called when QR scanned |
| `complete-redemption` | Complete/submit redemption | Called from ScanResult/EnterBill |
| `create-offer-slot` | Create a booking slot | Called from ManageSlots |
| `delete-offer-slot` | Delete a booking slot | Called from ManageSlots |
| `get-offer-slots` | Get slots for an offer | Called from ManageSlots |
| `create-business` | Create a new business | Called during onboarding |
| `update-business` | Update business profile | Called from EditProfile |
| `create-business-policy` | Create a policy | Called from CreatePolicy |
| `manage-policy-associations` | Link policies to offers | Called from CreatePromotion |
| `send-push-notification` | Send push notification | Triggered by other functions |
| `send-email` | Send email | Triggered by other functions |
| `create-image-gallery` | Upload offer/business images | Called from promotion/profile editing |
| `update-image-gallery` | Update image | Called from editing screens |
| `delete-image-gallery` | Delete image | Called from editing screens |
| `get-image-gallery` | Get images | Called when displaying galleries |
| `get-tags` | Get available tags | Called in promotion creation |
| `toggle-offer-tag` | Add/remove tags from offer | Called in promotion creation |

### 18.2 New Functions to Create

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `create-stripe-connect-account` | Create Stripe Express account + onboarding link | See Section 11.1 |
| `get-stripe-connect-status` | Check Stripe onboarding completion | See Section 11.1 |
| `get-business-analytics` | Aggregated business stats | See below |
| `get-business-orders` | Paginated order list for business | See below |
| `cancel-claim` | Cancel a purchase_token with structured reason | See below |
| `auto-redeem-stale-claims` | Cron job: auto-redeem old claims | See below |
| `notify-business-approved` | Notify business when admin approves them | See below |
| `notify-new-business-signup` | Email admin when new business completes onboarding | Called at end of onboarding |
| `migrate-business-user` | One-time migration for Adalo users | See Section 20 |

#### get-business-analytics
```typescript
// POST body: { business_id: number, start_date?: string, end_date?: string }
// Returns aggregated stats

const { count: totalClaims } = await supabaseClient
  .from('purchase_tokens')
  .select('*', { count: 'exact', head: true })
  .eq('business_id', business_id)
  .eq('cancelled', false);

const { data: revenueData } = await supabaseClient
  .from('purchase_tokens')
  .select('customer_price')
  .eq('business_id', business_id)
  .eq('redeemed', true)
  .not('customer_price', 'is', null);

const totalRevenue = revenueData?.reduce((sum, t) => sum + (t.customer_price || 0), 0) || 0;

const { data: promotions } = await supabaseClient
  .from('offers')
  .select('id, name, status, number_sold, quantity, start_date, end_date')
  .eq('business_id', business_id)
  .order('number_sold', { ascending: false });

return {
  total_claims: totalClaims,
  total_revenue: totalRevenue,
  promotions: promotions,
};
```

#### get-business-orders
```typescript
// POST body: { business_id: number, status?: string, offset?: number, limit?: number }
// Returns paginated purchase tokens with joined offer data

let query = supabaseClient
  .from('purchase_tokens')
  .select(`*, offers!purchase_tokens_offer_id_fkey (name, offer_type, featured_image)`)
  .eq('business_id', business_id)
  .order('created', { ascending: false })
  .range(offset, offset + limit - 1);

if (status === 'active') query = query.eq('redeemed', false).eq('cancelled', false);
if (status === 'redeemed') query = query.eq('redeemed', true);
if (status === 'cancelled') query = query.eq('cancelled', true);

const { data, count } = await query;
return { orders: data, total: count };
```

#### cancel-claim
```typescript
// POST body: { purchase_token_id: number, cancellation_type: string, cancellation_reason: string, cancelled_by: string }
// Cancels a purchase_token and notifies the customer

// Validate cancellation type
const validTypes = ['Business Cancelled', 'Customer Cancelled', 'Other'];
if (!validTypes.includes(cancellation_type)) {
  return { error: 'Invalid cancellation type' };
}

// Get the purchase token
const { data: token } = await supabaseClient
  .from('purchase_tokens')
  .select('*, offers!purchase_tokens_offer_id_fkey (name, offer_type, number_sold)')
  .eq('id', purchase_token_id)
  .single();

if (!token) return { error: 'Purchase token not found' };
if (token.redeemed) return { error: 'Cannot cancel a redeemed claim' };
if (token.cancelled) return { error: 'Already cancelled' };

// Block Pay Up Front cancellations
if (token.offers?.offer_type === 'Pay up front') {
  return { error: 'Pay Up Front claims cannot be cancelled. Contact Ping Local support for refund assistance.' };
}

// Cancel the claim
await supabaseClient
  .from('purchase_tokens')
  .update({
    cancelled: true,
    cancellation_type,
    cancellation_reason: cancellation_reason || null,
    updated: new Date().toISOString(),
  })
  .eq('id', purchase_token_id);

// Decrement number_sold on the offer (free up the slot)
if (token.offer_id) {
  await supabaseClient.rpc('decrement_offer_sold', { offer_id: token.offer_id });
  // OR: UPDATE offers SET number_sold = number_sold - 1 WHERE id = offer_id AND number_sold > 0
}

// Cancel any associated redemption tokens
await supabaseClient
  .from('redemption_tokens')
  .update({ status: 'Cancelled', updated: new Date().toISOString() })
  .eq('purchase_token_id', purchase_token_id);

// Notify customer via push + email
const reason = cancellation_reason
  ? `${cancellation_type}: ${cancellation_reason}`
  : cancellation_type;

// Call send-push-notification for the customer
// Call send-email with cancellation details

return { success: true, cancelled_token_id: purchase_token_id };
```

#### auto-redeem-stale-claims
```typescript
// Scheduled function — runs daily via Supabase cron (pg_cron)
// No request body — triggered automatically
//
// Cron setup (run in Supabase SQL editor):
// SELECT cron.schedule('auto-redeem-stale-claims', '0 3 * * *',
//   $$SELECT net.http_post(
//     url := 'https://pyufvauhjqfffezptuxl.supabase.co/functions/v1/auto-redeem-stale-claims',
//     headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
//   )$$
// );

// 1. Find all offers with auto_redeem_months set
const { data: offers } = await supabaseClient
  .from('offers')
  .select('id, name, auto_redeem_months, business_id, business_name, offer_type')
  .not('auto_redeem_months', 'is', null);

let totalAutoRedeemed = 0;

for (const offer of offers || []) {
  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - offer.auto_redeem_months);

  // 2. Find unredeemed claims older than cutoff
  const { data: staleClaims } = await supabaseClient
    .from('purchase_tokens')
    .select('*')
    .eq('offer_id', offer.id)
    .eq('redeemed', false)
    .eq('cancelled', false)
    .lt('created', cutoffDate.toISOString());

  for (const claim of staleClaims || []) {
    const now = new Date();

    // 3. Create redemption token
    const { data: redemptionToken } = await supabaseClient
      .from('redemption_tokens')
      .insert({
        purchase_token_id: claim.id,
        scanned: true,
        status: 'Finished',
        completed: true,
        customer_name: claim.name,
        customer_id: claim.user_id,
        offer_name: offer.name,
        business_name: offer.business_name,
        promotion_id: offer.id,
        bill_input_total: claim.customer_price || 0,
        time_redeemed: now.toISOString(),
        date_redeemed: now.toISOString().split('T')[0],
        created: now.toISOString(),
        updated: now.toISOString(),
      })
      .select()
      .single();

    // 4. Mark purchase token as redeemed + auto-redeemed
    await supabaseClient
      .from('purchase_tokens')
      .update({
        redeemed: true,
        cancellation_type: 'Auto-redeemed',
        updated: now.toISOString(),
      })
      .eq('id', claim.id);

    // 5. Notify business and customer
    // ... call send-push-notification for both parties

    totalAutoRedeemed++;
  }
}

return { success: true, auto_redeemed_count: totalAutoRedeemed };
```

#### notify-business-approved
```typescript
// POST body: { business_id: number }
// Called when a Ping Local admin approves a business (sets is_signed_off = true)
// Sends push notification + email to all admin users of the business

const { data: business } = await supabaseClient
  .from('businesses')
  .select('id, name, email')
  .eq('id', business_id)
  .single();

if (!business) return { error: 'Business not found' };

// Get all admin users for this business
const { data: adminUsers } = await supabaseClient
  .from('business_users')
  .select('auth_id, email, first_name')
  .eq('business_id', business_id)
  .eq('role', 'admin');

for (const admin of adminUsers || []) {
  // Send push notification
  // "Congratulations! Your business '[Name]' has been approved. You can now create promotions!"

  // Send congratulations email with next steps:
  // - Create your first promotion
  // - Connect your Stripe account
  // - Set your opening hours
}

return { success: true, notified_users: adminUsers?.length || 0 };
```

---

## 19. Verification & Testing

### 19.1 Auth Flow
1. Sign up with a new email → receive verification email → enter OTP → complete onboarding → land on Dashboard
2. Log out and log back in → should land on Dashboard directly
3. Test forgot password flow

### 19.2 Onboarding
1. After verification, should see carousel slides
2. Complete business profile form → business record created
3. Verify `business_users.business_id` is set and `onboarding_completed = true`
4. Dashboard should show "Under Review" banner (business `is_signed_off = false`)

### 19.3 Promotion Creation
1. Create a draft promotion → verify it appears in Drafts filter
2. Submit for review → verify status changes to "Under Review"
3. In Supabase dashboard, manually set `status = 'Signed Off'` → verify it appears as Active
4. Check the PromotionPreview looks identical to consumer app's OfferDetail

### 19.4 QR Scanning Flow
1. On consumer app: claim an offer, open QR code screen
2. On business app: open Scan tab, scan the QR code
3. Verify ScanResult shows correct customer + offer info
4. For Pay Up Front: tap "Complete Redemption" → verify success
5. For Pay on Day: enter bill amount → verify consumer receives bill confirmation
6. Verify consumer app updates in real-time

### 19.5 Stripe Connect
1. Tap "Connect Stripe Account" → verify browser opens Stripe onboarding
2. Complete Stripe test onboarding
3. Return to app → verify status shows "Connected"
4. Verify `businesses.stripe_account_no` is set in database

### 19.6 Orders & Analytics
1. After some test claims/redemptions, verify orders appear in Orders list
2. Check Analytics screen shows correct aggregated numbers
3. Test date range filtering

### 19.7 Clone Promotion
1. Create a promotion and manually set its end_date to 3+ weeks ago
2. Verify "Re-create" button appears on the promotion card
3. Tap it → verify CreatePromotion form is pre-filled with correct data
4. Status should be 'draft', number_sold should be 0, dates should be cleared

### 19.8 Customer-Not-Present Redemption
1. On consumer app: claim an offer (don't open QR screen)
2. On business app: go to Orders → find the unredeemed claim
3. Tap "Redeem Without QR" → confirm in modal
4. For Pay Up Front: should complete immediately → verify redeemed status
5. For Pay on Day: should navigate to EnterBill → enter amount → verify "Submitted" status
6. Verify the order detail shows "Manual" redemption type

### 19.9 Claim Cancellation
1. Claim a "Pay on Day" offer on the consumer app
2. On business app: go to Orders → find the unredeemed claim → tap "Cancel Claim"
3. Select "Business Cancelled" and enter a reason
4. Verify: purchase_token.cancelled = true, cancellation_type and cancellation_reason set
5. Verify customer receives a cancellation notification
6. Attempt to cancel a "Pay Up Front" claim → verify it's blocked with the appropriate message

### 19.10 Promotion Deletion Rules
1. Create a promotion, have a consumer claim it
2. Try to delete the promotion → verify it's blocked ("has unredeemed claims")
3. Cancel or redeem all claims → verify promotion can now be ended/deleted
4. Try to delete a draft promotion with no claims → verify it succeeds

### 19.11 Opening Hours
1. Go to More → Opening Hours
2. Set hours for several days → save
3. Verify opening_times records created in database
4. Verify consumer app displays the correct hours on the business profile

### 19.12 Auto-Redeem
1. Create a promotion with `auto_redeem_months: 1`
2. Have a consumer claim the offer
3. In the database, manually backdate the purchase_token's `created` field to 2+ months ago
4. Manually trigger the `auto-redeem-stale-claims` function
5. Verify: purchase_token.redeemed = true, cancellation_type = 'Auto-redeemed'
6. Verify redemption_token created with status 'Finished'
7. Verify notifications sent to both business and customer

### 19.13 Notifications
1. Submit a promotion for review → verify admin receives `promotion_submitted` notification
2. In Supabase, set business `is_signed_off = true` and call `notify-business-approved` → verify business receives approval notification
3. Complete Stripe Connect → verify `stripe_connected` notification appears

---

## 20. Adalo Migration

There are existing business users on an Adalo-based business app that need to be migrated to this new React Native app. The existing Supabase database already contains business records (in the `businesses` table) that were migrated from Adalo. The `businesses` table has `owner_id` and `primary_user` fields linking to legacy user references.

### 20.1 Migration Strategy (Recommended: Invite-Based Migration)

Rather than bulk-migrating auth credentials (which is complex and error-prone), use an **invite-based approach**:

1. **Create a `migrate-business-user` edge function** that:
   - Takes `{ business_id, email }` as input
   - Verifies the email matches the business's existing email
   - Creates a Supabase Auth user with a random temporary password
   - Creates a `business_users` record with `role: 'admin'` linked to the existing `business_id`
   - Sends a password reset email so the user can set their own password
   - Sets `onboarding_completed: true` (they don't need to re-onboard since the business already exists)

2. **Run the migration script** (one-time):
   - Query all businesses from the `businesses` table
   - For each business with an email, call `migrate-business-user`
   - Log results for audit

3. **User experience:**
   - Migrated users receive an email: "Welcome to the new Ping Local Business app! Click here to set your password."
   - On first login, they set their password via the reset flow
   - They land directly on the Dashboard (onboarding already complete)
   - Their existing business profile, promotions, and order history are all intact (same database)

### 20.2 Migration Edge Function

```typescript
// supabase/functions/migrate-business-user/index.ts
// One-time migration: creates auth + business_users record for existing businesses

// 1. Check if business exists and get its details
const { data: business } = await supabaseClient
  .from('businesses')
  .select('id, name, email')
  .eq('id', business_id)
  .single();

// 2. Check if already migrated (business_users record exists for this business)
const { data: existing } = await supabaseClient
  .from('business_users')
  .select('id')
  .eq('business_id', business_id)
  .limit(1);

if (existing && existing.length > 0) {
  return { error: 'Business already has a user account' };
}

// 3. Create Supabase Auth user (with admin API / service role)
const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
  email: email,
  email_confirm: true, // Skip email verification for migrated users
  user_metadata: { migrated_from: 'adalo', business_id: business_id },
});

// 4. Create business_users record
await supabaseClient.from('business_users').insert({
  auth_id: authUser.user.id,
  business_id: business_id,
  email: email,
  role: 'admin',
  onboarding_completed: true,
});

// 5. Send password reset email
await supabaseClient.auth.admin.generateLink({
  type: 'recovery',
  email: email,
});

return { success: true, business_id, email };
```

### 20.3 Migration Checklist
- [ ] Create `business_users` table in Supabase
- [ ] Deploy `migrate-business-user` edge function
- [ ] Run migration for all existing businesses with email addresses
- [ ] Verify migrated users can log in and see their existing data
- [ ] Send welcome/onboarding email to all migrated users

---

## Implementation Order

Build the app in this order for the smoothest development experience:

1. **Project scaffolding** - Create Expo project, install dependencies, set up folder structure
2. **Theme & common components** - Copy theme files, build Button, Card, Input, Modal components
3. **Supabase client** - Set up connection, create business_users table
4. **Auth context & screens** - Welcome, SignUp, Login, Verification, ForgotPassword
5. **Onboarding flow** - Carousel + business profile creation
6. **Navigation structure** - RootNavigator, MainTabNavigator, all stack navigators
7. **Dashboard** - Basic dashboard with quick stats
8. **Promotions list & detail** - CRUD screens for promotions
9. **Promotion creation form** - Multi-step form with validation
10. **Promotion preview** - Consumer-identical preview screen
11. **QR scanner** - Camera setup, barcode scanning
12. **Scan result & redemption** - Complete the scanning flow (both pay types)
13. **Orders** - Order list, detail, history screens
14. **Stripe Connect** - Create edge functions, build connection screen
15. **Analytics** - Stats screen with date filtering
16. **Policies** - CRUD screens for policies
17. **FAQ** - Comprehensive business FAQ
18. **Notifications** - Push notification setup, notification screen
19. **Account & settings** - Profile editing, settings, support
20. **Polish** - Empty states, loading states, error handling, animations

---

*This prompt contains everything needed to build the Ping Local Business App. The business app shares the same Supabase database, the same design system, and communicates with existing cloud functions. Focus on making the UI identical in style to the consumer app while providing business-specific functionality.*
