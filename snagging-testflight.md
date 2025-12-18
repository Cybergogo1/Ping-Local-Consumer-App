# TestFlight Snagging List

## Issues to Fix

### 1. Sign In Screen - Email Field Jitter
- **Status:** 🟢 Complete
- **Issue:** Every time you enter a new character into the email field, it 'jumps' and looks jittery/awkward
- **Location:** `LoginScreen.tsx`
- **Fix:** Fixed input container height, added `overflow: hidden`, set `includeFontPadding: false`

### 2. Location/Filter Menu - Safe Area Issue
- **Status:** 🟢 Complete (Round 2)
- **Issue:** The location and filter menu titles go into the notification bar and break out of the 'safe area' - content overlapping notch/status bar
- **Location:** `HomeScreen.tsx` - modal components
- **Fix:** Replaced SafeAreaView with View + dynamic `paddingTop: insets.top` using `useSafeAreaInsets()` hook for reliable safe area handling in modals

### 3. Loyalty Scheme Screen - Sticky Header Issue
- **Status:** 🟢 Complete
- **Issue:** The top section (image, title, paragraph) is 'sticky' but shouldn't be - leaves very small scrollable window on smaller screens
- **Location:** `LoyaltyTiersScreen.tsx`
- **Fix:** Restructured component to put header section inside ScrollView, back button remains fixed

### 4. Notification Preferences - Update Errors
- **Status:** 🟢 Complete (Round 2)
- **Issue:** Notification options other than 'push notifications' all give 'failed to update preference' error - UUID error `"1"`
- **Location:** `NotificationPreferencesScreen.tsx`
- **Fix:** Changed from using `user.id` (internal integer ID) to `supabaseUser.id` (auth UUID) for the `notification_preferences` table which expects a UUID

### 5. QR Code Screen - Size/Scroll Issues
- **Status:** 🟢 Complete
- **Issue:** QR code may be too big on smaller devices, locks content below. Screen needs to be scrollable, QR code should cap at ~70% screen width
- **Location:** `QRCodeScreen.tsx`
- **Fix:** Added ScrollView wrapper, capped QR code size at 70% of screen width (max 280px)

### 6. Map Pins Not Clickable
- **Status:** 🟢 Complete
- **Issue:** Map pins aren't clickable on the map view on TestFlight
- **Location:** `MapScreen.tsx`
- **Fix:** Wrapped marker content in TouchableOpacity, added `tracksViewChanges={false}` and `stopPropagation={true}` to Marker

### 7. MainTabNavigator Grey Background (iPhone 11)
- **Status:** 🟢 Complete
- **Issue:** Grey background appears on iPhone 11 TestFlight only, not on iPhone SE
- **Location:** `MainTabNavigator.tsx`
- **Fix:** Added dynamic safe area insets using `useSafeAreaInsets()` instead of hardcoded paddingBottom

### 8. Header Section Spacing (iPhone Small Screens)
- **Status:** 🟢 Complete (Round 2)
- **Issue:** 'Hello user' and tier name section looks very tight on iPhone small screens - needed more spacing
- **Location:** `HomeScreen.tsx`
- **Fix:** Changed `marginBottom` from `-3` to `0` on small devices for more breathing room between greeting and tier name

### 9. Tier Icon Padding/Cropping
- **Status:** 🟢 Complete (Round 2)
- **Issue:** Tier icon padding in header crops the icon slightly - needed smaller icon within the container
- **Location:** `HomeScreen.tsx`
- **Fix:** Reduced avatar image size from 28/32px to 24/28px (small/large devices) to give more visual margin within the container

### 10. Category Tag List in Filter Menu - Empty
- **Status:** 🟢 Complete
- **Issue:** Category tag list was always empty because offers didn't have category tags attached
- **Location:** `HomeScreen.tsx` - filter logic
- **Fix:** Changed approach to use business `category` field instead of offer tags:
  - Fetches unique categories from businesses that have active offers
  - Filters offers by the business's category instead of offer-level category tags
  - This allows filtering by "Cafe", "Restaurant", etc. based on the business type

---

## Progress Tracking

| # | Issue | Status |
|---|-------|--------|
| 1 | Email field jitter | 🟢 |
| 2 | Safe area issues | 🟢 |
| 3 | Sticky header | 🟢 |
| 4 | Notification errors | 🟢 |
| 5 | QR code size | 🟢 |
| 6 | Map pins | 🟢 |
| 7 | Tab navigator bg | 🟢 |
| 8 | Header spacing | 🟢 |
| 9 | Tier icon crop | 🟢 |
| 10 | Category tags | 🟢 |

Legend: 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

## Summary of All Fixes (Round 2)

All 10 issues have been addressed. Key changes in this round:

1. **Safe Area Modals** - Used `useSafeAreaInsets()` hook with dynamic paddingTop for reliable notch handling
2. **Notification UUID** - Switched from `user.id` to `supabaseUser.id` for proper UUID
3. **Header Spacing** - Increased margin between greeting and tier name on small devices
4. **Tier Icon** - Made the icon smaller (24/28px) within its container for better visual margin
5. **Category Filter** - Now uses business categories instead of offer tags, so categories actually appear and filter correctly
