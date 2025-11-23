# Ping Local - Tech Stack Analysis & Recommendations

## Proposed Tech Stack Review

### ✅ Excellent Choices

1. **React Native with Expo** - Perfect for this use case
   - Fast iteration and development
   - Easy deployment with EAS Build
   - Great for location-based features
   - Cross-platform with shared codebase
   - Expo Go for rapid testing
   - Over-the-air updates for quick fixes

2. **TypeScript** - Essential
   - Type safety for complex data structures (promotions, bookings, etc.)
   - Better IDE support
   - Catches errors at compile time
   - Makes refactoring safer

3. **Supabase** - Ideal choice
   - Built on PostgreSQL (robust, scalable)
   - Real-time subscriptions (perfect for QR redemption updates)
   - Built-in auth with email verification
   - Row Level Security for multi-tenant data
   - Storage for images
   - Edge Functions for server-side logic
   - Easy to migrate from Adalo

4. **Stripe** - Industry standard
   - Robust payment processing
   - React Native SDK available
   - Strong fraud prevention
   - Good documentation
   - PCI compliance handled

### ✅ Good Choices with Notes

5. **React Navigation** - Solid choice
   - Industry standard for React Native
   - Tab navigator perfect for your bottom nav
   - Stack navigator for detail screens
   - Deep linking support
   - **Recommendation**: Use v6+ for latest features

6. **React Context API** - Appropriate for your scale
   - Built-in, no extra dependencies
   - Good for auth state, user profile, notifications
   - **Consider**: If state management becomes complex (lots of nested updates, many consumers), you could add Zustand (tiny library, ~1KB)
   - **When to upgrade**: If you notice performance issues with frequent re-renders

7. **NativeWind** - Modern, good choice
   - Tailwind utility classes in React Native
   - Consistent styling system
   - Small learning curve if you know Tailwind
   - **Note**: Relatively newer library, ensure you're using v4+ for best stability
   - **Alternative**: If you encounter issues, styled-components or React Native's built-in StyleSheet are solid fallbacks

8. **Lottie** - Perfect for animations
   - Lightweight animations from After Effects
   - Great for onboarding and success screens
   - Much smaller than video files
   - **Recommendation**: Use `lottie-react-native` with latest version

9. **Expo Notifications** - Good for push notifications
   - Works well with Expo ecosystem
   - Easy setup for local and push notifications
   - **Note**: Requires physical device for push notifications (won't work in simulator)
   - **Setup**: You'll need to configure Firebase (Android) and APNs (iOS)

---

## Additional Recommendations

### Consider Adding

1. **React Native Maps** (you'll need this)
   - For the map view with business pins
   - Already mentioned in your requirements
   - `react-native-maps` or `expo-maps`

2. **React Native QR Code Scanner**
   - `react-native-qrcode-svg` for generation
   - `expo-camera` with barcode scanning for reading (business side)
   - Or `react-native-qr-scanner` as alternative

3. **Date/Time Handling**
   - `date-fns` or `dayjs` for date manipulation (slot bookings, expiry calculations)
   - Lightweight and tree-shakeable

4. **Form Handling**
   - `react-hook-form` for complex forms (sign up, settings, payment details)
   - Reduces re-renders, great validation support

5. **AsyncStorage**
   - `@react-native-async-storage/async-storage`
   - For caching user preferences, loyalty tier, etc.
   - Offline support for basic data

6. **Image Handling**
   - `expo-image` for optimized image loading with placeholders
   - Better performance than default Image component

7. **Error Tracking**
   - Sentry for crash reporting and error monitoring
   - Essential for production app
   - Catches errors you won't see in testing

8. **Analytics**
   - Expo Application Services (EAS) includes basic analytics
   - Or Amplitude/Mixpanel for user behavior tracking
   - Important for understanding user engagement

---

## Potential Concerns & Solutions

### 1. Real-time QR Redemption Updates

**Challenge**: User needs to know when business scans their QR code

**Solution**:
- Use Supabase Realtime subscriptions
- Subscribe to `user_offers` table changes when QR modal is open
- Update status from "claimed" to "redeemed" in real-time
- Show success animation immediately

**Implementation**:
```typescript
// Subscribe to changes on the specific user offer
const subscription = supabase
  .channel('user_offer_updates')
  .on('postgres_changes', 
    { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'user_offers',
      filter: `id=eq.${userOfferId}`
    }, 
    (payload) => {
      if (payload.new.status === 'redeemed') {
        showSuccessAnimation();
      }
    }
  )
  .subscribe();
```

### 2. Loyalty Point Calculation & Tier Updates

**Challenge**: Complex tier logic, needs to update across app

**Solution**:
- Database trigger to auto-update tier when points change
- Context API to hold current tier state
- Refresh context after any points-awarding action

**Supabase Function Example**:
```sql
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.loyalty_points >= 10000 THEN
    NEW.loyalty_tier := 'Local Legend';
  ELSIF NEW.loyalty_points >= 1200 THEN
    NEW.loyalty_tier := 'Local Champion';
  ELSIF NEW.loyalty_points >= 10 THEN
    NEW.loyalty_tier := 'Local Hero';
  ELSE
    NEW.loyalty_tier := 'Local Member';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loyalty_tier_update
BEFORE UPDATE OF loyalty_points ON users
FOR EACH ROW
EXECUTE FUNCTION update_loyalty_tier();
```

### 3. Stripe Payment Flow

**Challenge**: Secure payment processing in mobile app

**Solution**:
- Use Stripe Payment Sheet for native UX
- Create payment intent server-side (Supabase Edge Function)
- Confirm payment client-side with Stripe SDK
- Use webhook to verify payment completion

**Flow**:
1. User clicks "Pay Now"
2. App calls Supabase Edge Function with order details
3. Edge Function creates Stripe Payment Intent, returns client secret
4. App opens Stripe Payment Sheet with client secret
5. User completes payment in Payment Sheet
6. Stripe webhook confirms payment to your backend
7. Backend creates user_offer record
8. App receives success, awards loyalty points, shows confirmation

### 4. Location-Based Sorting

**Challenge**: Sort promotions by proximity to user

**Solution**:
- Use PostGIS extension in Supabase (PostgreSQL)
- Store business coordinates (lat, long)
- Calculate distance in database query

**Supabase Query Example**:
```typescript
const { data } = await supabase
  .rpc('get_nearby_promotions', {
    user_lat: userLatitude,
    user_lng: userLongitude,
    max_distance_km: 50 // Wirral area radius
  });

// PostgreSQL function
CREATE OR REPLACE FUNCTION get_nearby_promotions(
  user_lat float,
  user_lng float,
  max_distance_km float
)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.*,
    b.name as business_name,
    b.latitude,
    b.longitude,
    (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(b.latitude)) * 
        cos(radians(b.longitude) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(b.latitude))
      )
    ) AS distance_km
  FROM promotions p
  JOIN businesses b ON p.business_id = b.id
  WHERE p.status = 'active'
  AND (
    6371 * acos(
      cos(radians(user_lat)) * 
      cos(radians(b.latitude)) * 
      cos(radians(b.longitude) - radians(user_lng)) + 
      sin(radians(user_lat)) * 
      sin(radians(b.latitude))
    )
  ) <= max_distance_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;
```

### 5. Calendar/Slot Booking UI

**Challenge**: User-friendly calendar for slot selection

**Solution**:
- Use `react-native-calendars` library
- Fetch available slots from `promotion_slots` table
- Mark available dates, disable unavailable ones
- Show time slot picker after date selection

**Component Structure**:
```
SlotBookingScreen
  ├─ Calendar (mark dates with availability)
  ├─ TimeSlotList (shows slots for selected date)
  └─ ContinueButton (enabled when slot selected)
```

### 6. Adalo → Supabase Migration

**Challenge**: Moving data without downtime

**Solution**:
- Export all Adalo data to CSV/JSON
- Create migration scripts to transform and import to Supabase
- Run in staging environment first
- Set up dual-write period if needed (write to both systems)
- Gradually migrate admin/business apps to Supabase
- Eventually deprecate Adalo

**Migration Checklist**:
- [ ] Map Adalo collections to Supabase tables
- [ ] Export all users (with hashed passwords if possible)
- [ ] Export all businesses, promotions, bookings
- [ ] Handle image uploads (migrate to Supabase Storage)
- [ ] Preserve user favorites and claimed promotions
- [ ] Test data integrity after import
- [ ] Set up Adalo webhooks to Supabase during transition (if dual operation needed)

---

## Project Structure Recommendation

```
ping-local-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base components (Button, Card, Input)
│   │   ├── promotions/     # Promotion-specific (PromotionCard, etc.)
│   │   ├── business/       # Business-specific components
│   │   └── loyalty/        # Loyalty tier icons, progress bars
│   ├── screens/            # Screen components
│   │   ├── auth/           # Login, SignUp, Onboarding
│   │   ├── home/           # Home feed, map view
│   │   ├── promotions/     # Detail, booking, payment
│   │   ├── business/       # Directory, detail
│   │   ├── favorites/      # Favorites list
│   │   ├── account/        # Account, settings, claimed
│   │   └── qr/             # QR generator, scanner
│   ├── navigation/         # Navigation configuration
│   ├── contexts/           # React Context providers
│   ├── hooks/              # Custom hooks
│   ├── services/           # API calls, Supabase client
│   ├── utils/              # Helper functions
│   ├── constants/          # App constants, colors, sizes
│   ├── types/              # TypeScript types/interfaces
│   └── assets/             # Images, fonts, animations
├── app.json                # Expo configuration
├── tsconfig.json           # TypeScript config
└── tailwind.config.js      # NativeWind/Tailwind config
```

---

## Development Workflow Recommendations

1. **Start with Supabase Setup**
   - Create project, set up database schema
   - Configure RLS policies
   - Set up auth and test with dummy users

2. **Build Core Navigation**
   - Set up tab and stack navigators
   - Create placeholder screens
   - Test navigation flow

3. **Implement Authentication**
   - Build auth screens
   - Integrate Supabase Auth
   - Test email verification

4. **Build Component Library**
   - Create reusable components (buttons, cards, inputs)
   - Set up NativeWind styling patterns
   - Create Storybook or simple preview screen

5. **Develop Feature by Feature**
   - Home feed → Promotion detail → Purchase flow
   - Map view → Business directory
   - Favorites → Account → QR redemption
   - Test each feature thoroughly before moving to next

6. **Integrate Payments Last**
   - Payment integration can be complex
   - Build all other flows first
   - Use Stripe test mode extensively

7. **Polish & Test**
   - Add animations and loading states
   - Implement error handling
   - Test on physical devices
   - Gather user feedback

---

## Estimated Timeline

**8-10 weeks for MVP** (full-time developer)

- **Week 1-2**: Setup, database, auth, navigation
- **Week 3-4**: Core screens (feed, detail, directory)
- **Week 4-5**: Purchase/claim flow, booking calendar
- **Week 5-6**: QR codes, redemption, real-time updates
- **Week 6-7**: Payments, loyalty system, polish
- **Week 7-8**: Testing, bug fixes, deployment prep
- **Week 8-10**: Beta testing, refinement, launch

**Key Milestones**:
- Week 2: Users can sign up and browse promotions
- Week 4: Users can favorite and filter
- Week 6: Users can claim promotions (no payment)
- Week 7: Full payment flow working
- Week 8: QR redemption working end-to-end

---

## Cost Estimates (Monthly, Post-Launch)

- **Expo EAS**: Free for development, ~$29/month for production builds
- **Supabase**: Free tier for MVP, ~$25/month for Pro (more storage, better performance)
- **Stripe**: 2.9% + 30¢ per transaction (no monthly fee)
- **Sentry**: Free tier covers ~5,000 events/month
- **Push Notifications**: Free with Expo
- **App Store**: $99/year (Apple), $25 one-time (Google)

**Total Estimated**: ~$50-100/month + transaction fees

---

## Risk Mitigation

### Technical Risks

1. **Adalo Data Export Issues**
   - **Mitigation**: Start data export early, validate completely
   - Have backup plan for manual data entry if needed

2. **QR Code Security**
   - **Mitigation**: Use signed/encrypted QR data
   - Add expiry timestamps to prevent reuse
   - Server-side verification before redemption

3. **Payment Processing Errors**
   - **Mitigation**: Extensive testing in Stripe test mode
   - Handle all error scenarios gracefully
   - Implement idempotency to prevent double charges

4. **Performance with Large Datasets**
   - **Mitigation**: Implement pagination early
   - Use database indexes properly
   - Cache frequently accessed data

5. **Real-time Sync Issues**
   - **Mitigation**: Fallback to polling if WebSocket fails
   - Test with poor network conditions
   - Implement offline queue for actions

### Business Risks

1. **User Migration from Adalo App**
   - **Mitigation**: Seamless account transfer process
   - Preserve all claimed promotions
   - In-app messaging about transition

2. **Business App Integration**
   - **Mitigation**: Ensure QR scanning works across both platforms during transition
   - Provide clear documentation for businesses
   - Test heavily with pilot businesses

---

## Success Metrics to Track

1. **User Engagement**
   - Daily/Monthly Active Users
   - Promotions viewed vs. claimed
   - Average session duration
   - Retention rate (Day 1, 7, 30)

2. **Transaction Metrics**
   - Conversion rate (view → claim/purchase)
   - Average transaction value
   - Payment success rate
   - QR redemption rate

3. **Technical Metrics**
   - App load time
   - Screen load times
   - Crash-free rate
   - API response times

4. **Business Health**
   - Number of active promotions
   - Business engagement rate
   - User reviews and ratings

---

## Final Recommendations

### Your tech stack is solid! Here's what I'd emphasize:

1. **Prioritize Supabase setup** - Get the database schema right from the start. It's the foundation of everything.

2. **Start simple with Context API** - Don't overcomplicate state management initially. Add Zustand only if needed.

3. **Use Expo managed workflow** - Don't eject to bare workflow unless absolutely necessary. Expo has everything you need.

4. **Focus on real-time features** - The QR redemption flow is your key differentiator. Make it bulletproof.

5. **Test payments extensively** - Use Stripe's test cards, test refunds, test failures. Payment bugs are critical.

6. **Plan for the migration** - Have a solid strategy for moving from Adalo. This is as important as building the new app.

7. **Build for offline** - Users might be in areas with poor signal. Cache essential data.

8. **Invest in error tracking** - Set up Sentry from day one. You'll thank yourself later.

### What could go wrong (and how to prevent it):

- **Complexity creep**: Start with MVP, resist feature additions
- **Poor data migration**: Test migration extensively in staging
- **Payment issues**: Use Stripe's testing tools religiously
- **Performance problems**: Profile early, optimize as you build
- **Real-time failures**: Have fallback mechanisms for WebSocket failures

### Your biggest advantages:

- You already have a working Adalo version (proven concept)
- Clear user flows and requirements documented
- Manageable scope for initial release
- Modern, well-supported tech stack

**You're in a great position to build this successfully!** The tech stack choices are appropriate, and the project is well-scoped. The comprehensive prompt I've created should give Claude Code everything needed to build this effectively.
