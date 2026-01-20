# QR Code Redemption Flow - Context for New Chat

## The Problem
When user clicks "Show QR Code", cancels, and tries again - the flow breaks. Works first time, not second time.

## Key Files
- `PingLocal/src/screens/redemption/QRCodeScreen.tsx` - Creates redemption token, shows QR, listens for realtime updates
- `PingLocal/supabase/functions/scan-redemption-token/index.ts` - Called by Adalo business app when QR is scanned

## Current Flow
1. User opens QRCodeScreen → creates `redemption_token` in DB with `purchase_token_id`
2. QR code displays `purchaseToken.id` (e.g., 90)
3. Adalo scans QR → calls `scan-redemption-token` with `purchase_token_id: 90`
4. Function finds redemption token, updates `scanned=true, status='In Progress'`
5. Function returns: `{ redemption_token_id: 168, purchase_token_id: 90, offer_name, ... }`
6. Consumer app listens via Supabase realtime for token updates → navigates to waiting screen

## What's Working
- Token creation works
- Scan function works - logs show correct response: `redemption_token_id: 168, purchase_token_id: 90`
- Realtime subscription sets up correctly

## What's NOT Working
- On second attempt, Adalo business app shows wrong/broken content
- User reports: "pulling through purchase_token_id in adalo is pulling through the redemption token id instead"
- BUT the API log shows correct values being returned

## Recent Changes Made (may need review/rollback)
1. Changed cleanup to only delete tokens where `scanned=false` (not `status != Finished`)
2. Changed initial delete to only remove `scanned=false` tokens
3. Added lots of logging with `[QR]` and `[SCAN]` prefixes

## Likely Issue
The scan-redemption-token function IS returning correct data (verified in logs). The issue is likely:
1. Adalo field mapping configuration
2. Or something about how Adalo caches/uses the response from the first scan vs second scan

## To Investigate
- How is Adalo configured to use the scan-redemption-token response?
- Is Adalo caching the first response?
- Check `get-redemption-tokens` function - Adalo may be filtering lists by wrong field
