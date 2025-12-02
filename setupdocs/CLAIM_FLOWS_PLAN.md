# Ping Local - Claim Flows & Slot Integration

## Context & Progress Tracker

**Target Completion**: Thursday/Friday
**Stripe Status**: API keys ready and tested in Adalo

---

## Current State

### Working
- Pay on Day + No Booking flow
- Pay on Day + External/Call Booking flow
- QR Code Generation (purchase_token ID)
- Redemption Flow with realtime updates

### Known Issues
1. **Column mismatch**: DB has `slot_date`/`slot_time`, frontend queries `date`/`time`
2. **No slot creation**: Adalo can't add slots to offers
3. **Stripe stubbed**: ClaimScreen shows Alert, not payment sheet

---

## Batches

### BATCH 1: Slot Creation Edge Function
**Status**: [x] COMPLETE

**Task 1.1**: Create `create-offer-slot` edge function
- File: `PingLocal/supabase/functions/create-offer-slot/index.ts` (NEW)
- Input: `{ offer_id, slot_date, slot_time, capacity }`
- Output: Created slot object
- Deploy to Supabase

**Task 1.2**: Create `get-offer-slots` edge function (for Adalo to list slots)
- File: `PingLocal/supabase/functions/get-offer-slots/index.ts` (NEW)
- Input: `{ offer_id }`
- Output: Array of slots

**Task 1.3**: Create `delete-offer-slot` edge function
- File: `PingLocal/supabase/functions/delete-offer-slot/index.ts` (NEW)
- Input: `{ slot_id }`

**Test**: Create slots via edge function, verify in Supabase dashboard

---

### BATCH 2: Fix Frontend Column Names
**Status**: [x] COMPLETE

**Task 2.1**: Update OfferSlot TypeScript interface
- File: `PingLocal/src/types/database.ts` (lines 138-148)
- Change: `date` → `slot_date`, `time` → `slot_time`

**Task 2.2**: Update SlotBookingScreen queries
- File: `PingLocal/src/screens/claim/SlotBookingScreen.tsx`
- Lines 46-48: Fix `.gte('date', ...)` → `.gte('slot_date', ...)`
- Lines 47-48: Fix `.order('date', ...)` → `.order('slot_date', ...)`
- Line 62: Fix `slot.date` → `slot.slot_date`
- Line 74: Fix `slot.date` → `slot.slot_date`

**Task 2.3**: Update ClaimScreen slot references
- File: `PingLocal/src/screens/claim/ClaimScreen.tsx`
- Check any references to slot.date/slot.time

**Test**: Run app, navigate to SlotBookingScreen, verify slots load

---

### BATCH 3: Stripe Setup
**Status**: [x] COMPLETE

**Task 3.1**: Install Stripe SDK
```bash
cd PingLocal
npx expo install @stripe/stripe-react-native
```

**Task 3.2**: Create `.env` file (if not exists)
```
EXPO_PUBLIC_SUPABASE_URL=https://pyufvauhjqfffezptuxl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Task 3.3**: Add Stripe secret to Supabase
- Go to Supabase Dashboard → Settings → Edge Functions → Secrets
- Add: `STRIPE_SECRET_KEY=sk_test_...`

**Task 3.4**: Create StripeProvider wrapper in App
- Wrap app with `<StripeProvider publishableKey={...}>`

---

### BATCH 4: Payment Intent Edge Function
**Status**: [x] COMPLETE

**Task 4.1**: Create `create-payment-intent` edge function
- File: `PingLocal/supabase/functions/create-payment-intent/index.ts` (NEW)
- Input: `{ amount, offer_id, user_id, offer_name, business_id }`
- Output: `{ clientSecret, paymentIntentId }`
- Uses `STRIPE_SECRET_KEY` from Supabase secrets

**Test**: Call edge function directly, verify payment intent created in Stripe dashboard

---

### BATCH 5: ClaimScreen Stripe Integration
**Status**: [x] COMPLETE

**Task 5.1**: Update ClaimScreen payment handler
- File: `PingLocal/src/screens/claim/ClaimScreen.tsx` (lines 125-136)
- Replace Alert with:
  1. Call `create-payment-intent` edge function
  2. Initialize payment sheet with clientSecret
  3. Present payment sheet
  4. On success, call `handleClaim()`

**Test**: Complete "Pay up front" offer purchase with test card

---

### BATCH 6: End-to-End Testing
**Status**: [ ] Not Started

| # | Offer Type | Booking | Flow | Test Status |
|---|------------|---------|------|-------------|
| 1 | Pay on day | None | Direct claim | [ ] |
| 2 | Pay on day | External | External → Claim | [ ] |
| 3 | Pay on day | Online | Slots → Claim | [ ] |
| 4 | Pay up front | None | Direct → Stripe → Claim | [ ] |
| 5 | Pay up front | External | External → Stripe → Claim | [ ] |
| 6 | Pay up front | Online | Slots → Stripe → Claim | [ ] |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `supabase/functions/create-offer-slot/index.ts` | NEW - Adalo creates slots |
| `supabase/functions/get-offer-slots/index.ts` | NEW - Adalo lists slots |
| `supabase/functions/create-payment-intent/index.ts` | NEW - Stripe backend |
| `src/screens/claim/SlotBookingScreen.tsx` | Fix column names |
| `src/screens/claim/ClaimScreen.tsx` | Add Stripe payment |
| `src/types/database.ts` | Fix OfferSlot interface |

---

## Database Schema Reference

**offer_slots table** (already exists):
```sql
id: integer (PK)
offer_id: integer (FK → offers)
slot_date: date
slot_time: time
capacity: integer
booked_count: integer (default 0)
available: boolean (default true)
created: timestamp
updated: timestamp
```

---

## Quick Commands

```bash
# Deploy edge function
cd PingLocal
npx supabase functions deploy create-offer-slot

# Install Stripe
npx expo install @stripe/stripe-react-native

# Run app
npx expo start
```
