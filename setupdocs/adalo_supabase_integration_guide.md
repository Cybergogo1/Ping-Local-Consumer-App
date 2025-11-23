# Adalo to Supabase Integration Guide

## Overview

This guide explains how to connect your existing Adalo business/admin app to the new Supabase database, allowing both systems to work simultaneously during the transition period.

## Integration Strategy: Three Approaches

### Option 1: Supabase Edge Functions as API (RECOMMENDED ⭐)

**Best For**: Quick integration with minimal Adalo changes

**How It Works**:
1. Create Edge Functions in Supabase that expose REST API endpoints
2. Configure Adalo Custom Actions to call these Edge Functions
3. Edge Functions handle all database operations
4. Both Adalo and Native app use same database

**Pros**:
- Minimal changes to Adalo
- Single source of truth (Supabase)
- Easier to maintain
- Clear API boundaries

**Cons**:
- Requires creating Edge Functions
- Slight learning curve for Edge Functions

---

### Option 2: Adalo External Collections

**Best For**: Long-term Adalo usage alongside native app

**How It Works**:
1. Use Adalo's External Collections feature
2. Connect Adalo directly to Supabase PostgreSQL REST API
3. Map Adalo collections to Supabase tables
4. Configure authentication between systems

**Pros**:
- Native Adalo feature
- No custom code needed
- Adalo UI unchanged

**Cons**:
- Requires Adalo business plan
- Complex setup for relationships
- May need restructuring Adalo screens

---

### Option 3: Sync Service (Dual Write)

**Best For**: Gradual migration, maintaining Adalo as backup

**How It Works**:
1. Native app writes to Supabase
2. Sync service watches Supabase changes
3. Sync service updates Adalo via Adalo API
4. Adalo continues using its own database

**Pros**:
- Adalo remains unchanged
- Safe fallback to Adalo
- Gradual transition

**Cons**:
- Complex synchronization logic
- Potential sync delays/conflicts
- Maintenance overhead
- Two sources of truth (risky)

---

## RECOMMENDED APPROACH: Edge Functions + Custom Actions

### Step-by-Step Implementation

## Part 1: Set Up Supabase Edge Functions

### 1.1 Install Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

### 1.2 Create Edge Functions Directory Structure

```bash
supabase functions new get-businesses
supabase functions new create-business
supabase functions new update-business
supabase functions new delete-business

supabase functions new get-offers
supabase functions new create-offer
supabase functions new update-offer
supabase functions new delete-offer

supabase functions new get-user-offers
supabase functions new create-user-offer
supabase functions new redeem-user-offer

supabase functions new get-notifications
supabase functions new mark-notification-read
```

### 1.3 Example Edge Function: Get Businesses

Create `supabase/functions/get-businesses/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Parse query parameters (for Adalo compatibility)
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const featured = url.searchParams.get('featured')
    const locationArea = url.searchParams.get('location_area')

    // Build query
    let query = supabaseClient
      .from('businesses')
      .select('*')
      .order('created', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }
    if (locationArea) {
      query = query.eq('location_area', locationArea)
    }

    const { data, error } = await query

    if (error) throw error

    // Transform to Adalo format (if needed)
    const transformedData = data.map(business => ({
      id: business.id,
      Name: business.name,
      'Featured Image': business.featured_image,
      Email: business.email,
      Description: business.description,
      DescriptionSummary: business.description_summary,
      Location: business.location,
      'Phone Number': business.phone_number,
      'Opening Times': business.opening_times,
      'AvailablePromotionTypes': business.available_promotion_types,
      'IsFeatured?': business.is_featured,
      'IsSignedOff?': business.is_signed_off,
      'Location Area': business.location_area,
      'Primary User': business.primary_user,
      OwnerID: business.owner_id,
      Category: business.category,
      'Sub Categories': business.sub_categories,
      'Stripe Account No.': business.stripe_account_no,
      LeadRate: business.lead_rate,
      CutPercent: business.cut_percent,
      'Currently Trading': business.currently_trading,
      Created: business.created,
      Updated: business.updated
    }))

    return new Response(
      JSON.stringify(transformedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

### 1.4 Example Edge Function: Create/Update Business

Create `supabase/functions/create-business/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_KEY') ?? '' // Use service key for write operations
    )

    // Parse Adalo-formatted request body
    const body = await req.json()

    // Transform from Adalo format to Supabase format
    const businessData = {
      name: body.Name,
      featured_image: body['Featured Image'],
      email: body.Email,
      description: body.Description,
      description_summary: body.DescriptionSummary,
      location: body.Location,
      phone_number: body['Phone Number'],
      opening_times: body['Opening Times'],
      available_promotion_types: body.AvailablePromotionTypes,
      is_featured: body['IsFeatured?'],
      is_signed_off: body['IsSignedOff?'],
      location_area: body['Location Area'],
      primary_user: body['Primary User'],
      owner_id: body.OwnerID,
      category: body.Category,
      sub_categories: body['Sub Categories'],
      stripe_account_no: body['Stripe Account No.'],
      lead_rate: body.LeadRate,
      cut_percent: body.CutPercent,
      currently_trading: body['Currently Trading'],
      updated: new Date().toISOString()
    }

    // Check if updating (id provided) or creating
    let result
    if (body.id) {
      // Update existing
      result = await supabaseClient
        .from('businesses')
        .update(businessData)
        .eq('id', body.id)
        .select()
        .single()
    } else {
      // Create new
      result = await supabaseClient
        .from('businesses')
        .insert({ ...businessData, created: new Date().toISOString() })
        .select()
        .single()
    }

    if (result.error) throw result.error

    // Transform back to Adalo format
    const response = {
      id: result.data.id,
      Name: result.data.name,
      'Featured Image': result.data.featured_image,
      // ... (same transformation as GET)
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

### 1.5 Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy get-businesses
supabase functions deploy create-business
supabase functions deploy update-business
# ... deploy all others
```

---

## Part 2: Configure Adalo Custom Actions

### 2.1 Get Edge Function URLs

After deploying, your Edge Functions will be available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-businesses
https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-business
etc.
```

### 2.2 Create Custom Action in Adalo

1. **Go to Adalo App Settings → Integrations → Custom Actions**

2. **Click "New Custom Action"**

3. **Configure for "Get Businesses":**
   - **Name**: "Get Businesses from Supabase"
   - **Method**: GET
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-businesses`
   - **Headers**:
     ```
     apikey: YOUR_SUPABASE_ANON_KEY
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
     ```
   - **Query Parameters** (optional):
     - `page`: Number (default: 1)
     - `limit`: Number (default: 50)
     - `featured`: Text
     - `location_area`: Text

4. **Response Mapping**:
   - Map the JSON response array to Adalo's business collection fields
   - Adalo will auto-detect the structure from a test call

5. **Save the Custom Action**

### 2.3 Create More Custom Actions

Repeat for each operation:
- **Create Business**: POST to `/functions/v1/create-business`
- **Update Business**: POST to `/functions/v1/update-business` (with id in body)
- **Delete Business**: DELETE to `/functions/v1/delete-business?id={id}`
- **Get Offers**: GET to `/functions/v1/get-offers`
- **Create Offer**: POST to `/functions/v1/create-offer`
- etc.

---

## Part 3: Update Adalo Screens to Use Custom Actions

### 3.1 Replace List Components

**Original Adalo Setup**:
- List component connected to "Businesses" collection

**Updated Setup**:
1. Add a button/trigger on screen load
2. Configure button action: "Custom Actions → Get Businesses from Supabase"
3. Store response in a Custom List variable
4. Update list component to use Custom List data

**Example Flow**:
```
Screen Loads → 
Trigger Custom Action "Get Businesses" → 
Store Response in "Business List" variable →
List Component displays "Business List"
```

### 3.2 Replace Form Submissions

**Original**:
- Form submission directly creates/updates Adalo collection

**Updated**:
1. Form collects data into variables
2. On Submit → Custom Action "Create Business" with form variables as body
3. Handle success/error responses
4. Refresh list by calling "Get Businesses" again

---

## Part 4: Handle Image Uploads

### 4.1 Create Image Upload Edge Function

`supabase/functions/upload-image/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
  )

  const formData = await req.formData()
  const file = formData.get('file') as File
  const bucket = formData.get('bucket') as string || 'images'

  // Generate unique filename
  const filename = `${Date.now()}-${file.name}`

  // Upload to Supabase Storage
  const { data, error } = await supabaseClient
    .storage
    .from(bucket)
    .upload(filename, file)

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabaseClient
    .storage
    .from(bucket)
    .getPublicUrl(filename)

  // Return in Adalo-compatible format
  return new Response(
    JSON.stringify({
      url: filename, // Store relative path
      publicUrl: publicUrl, // Full URL
      size: file.size,
      width: 0, // Would need to process image to get dimensions
      height: 0,
      filename: file.name,
      metadata: {
        blurHash: '', // Would need to generate
        blurHashWidth: 32
      }
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### 4.2 Configure Image Upload in Adalo

1. Create Custom Action "Upload Image"
2. Method: POST
3. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/upload-image`
4. Body: Form Data
   - Field: `file` (File input from Adalo)
   - Field: `bucket` (Text: "business_images" or "offer_images")

5. On Image Picker change:
   - Trigger "Upload Image" custom action
   - Store response in a variable
   - Use that variable when creating/updating business/offer

---

## Part 5: Authentication Integration

### 5.1 Create Auth Edge Functions

**Login Function** (`login/index.ts`):

```typescript
serve(async (req) => {
  const { email, password } = await req.json()
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // Authenticate user
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error

  // Fetch full user details from users table
  const { data: userData } = await supabaseClient
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  return new Response(
    JSON.stringify({
      token: data.session.access_token,
      user: {
        id: userData.id,
        email: userData.email,
        'First Name': userData.first_name,
        Surname: userData.surname,
        'Is Business?': userData.is_business,
        'IsAdmin?': userData.is_admin,
        'Verified?': userData.verified
      }
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### 5.2 Configure Adalo Login

1. Create Custom Action "Login to Supabase"
2. Call on login form submit
3. Store token in app variable
4. Include token in subsequent API calls:
   - Header: `Authorization: Bearer {token}`

---

## Part 6: Real-time Updates (Advanced)

### For QR Code Redemption

Since Adalo doesn't natively support WebSocket subscriptions, use polling:

### 6.1 Create Status Check Edge Function

```typescript
serve(async (req) => {
  const url = new URL(req.url)
  const userOfferId = url.searchParams.get('id')

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  const { data, error } = await supabaseClient
    .from('user_offers')
    .select('status, redeemed_at, total_paid')
    .eq('id', userOfferId)
    .single()

  return new Response(
    JSON.stringify(data),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### 6.2 Configure Polling in Adalo

1. Create Custom Action "Check User Offer Status"
2. On business redemption screen, use a timer component (if available)
3. Every 2-3 seconds, call the status check
4. Update UI based on response

---

## Testing Your Integration

### Test Checklist:

1. **Data Read**:
   - [ ] Adalo can fetch businesses from Supabase
   - [ ] Adalo can fetch offers from Supabase
   - [ ] Adalo can fetch user offers from Supabase
   - [ ] Data displays correctly in Adalo lists

2. **Data Write**:
   - [ ] Creating business in Adalo creates in Supabase
   - [ ] Updating business in Adalo updates in Supabase
   - [ ] Creating offer in Adalo creates in Supabase
   - [ ] Deleting in Adalo deletes in Supabase

3. **Images**:
   - [ ] Uploading image in Adalo stores in Supabase Storage
   - [ ] Image URLs work in both Adalo and native app
   - [ ] Featured images display correctly

4. **Authentication**:
   - [ ] Login in Adalo authenticates against Supabase
   - [ ] User permissions work correctly
   - [ ] Session persists appropriately

5. **Cross-App Consistency**:
   - [ ] Create offer in Adalo → Visible in native app
   - [ ] Claim offer in native app → Visible in Adalo
   - [ ] Business updates offer in Adalo → Reflects in native app

---

## Troubleshooting Common Issues

### Issue: Adalo Can't Connect to Edge Functions

**Solution**:
- Check CORS headers are set correctly
- Verify apikey is included in headers
- Check Edge Function is deployed: `supabase functions list`
- Test Edge Function directly with curl or Postman first

### Issue: Data Format Mismatch

**Solution**:
- Ensure field name transformation is correct (Adalo uses title case with spaces)
- Check JSON structure matches what Adalo expects
- Use console.log in Edge Functions to debug

### Issue: Images Not Displaying

**Solution**:
- Verify Supabase Storage buckets are public
- Check image URLs are full URLs, not relative paths
- Ensure CORS is configured on Storage bucket

### Issue: Authentication Failing

**Solution**:
- Check password hashing format matches
- Verify email exists in both Supabase Auth and users table
- Ensure JWT token is being passed correctly in subsequent requests

---

## Rollback Plan

If integration fails:

1. **Keep Adalo Database Active**: Don't delete Adalo collections during testing
2. **Toggle Back**: Remove custom actions, reconnect original Adalo collections
3. **Data Sync**: Export from Supabase, import back to Adalo if needed

---

## Monitoring and Maintenance

### Set Up Logging

In each Edge Function, add logging:

```typescript
console.log('Request received:', {
  method: req.method,
  url: req.url,
  timestamp: new Date().toISOString()
})
```

View logs:
```bash
supabase functions logs get-businesses
```

### Set Up Alerts

- Monitor Edge Function errors in Supabase dashboard
- Set up alerts for failed API calls
- Track API usage and rate limits

---

## Cost Considerations

**Supabase Edge Functions**:
- 500,000 invocations/month free
- $2 per 1M invocations after

**Adalo Custom Actions**:
- Included in business plans
- No additional cost for API calls

**Estimated monthly costs for 1,000 active users**:
- Supabase: ~$25 (Pro plan + storage)
- Adalo: ~$50-200 (depending on plan)
- Total: ~$75-225/month

---

## Next Steps After Integration

1. **Test thoroughly** with sample data
2. **Run parallel** (both systems) for 1-2 weeks
3. **Monitor for issues** and fix Edge Functions as needed
4. **Gradually migrate** business users to new system
5. **Plan full Adalo deprecation** once native app is stable
6. **Build admin dashboard** in Next.js/React to eventually replace Adalo completely

---

## Summary

**Quick Setup (1-2 days)**:
1. Create Supabase Edge Functions for CRUD operations
2. Deploy Edge Functions
3. Configure Adalo Custom Actions to call Edge Functions
4. Update key Adalo screens to use Custom Actions
5. Test thoroughly

**This approach gives you**:
- ✅ Single source of truth (Supabase)
- ✅ Minimal Adalo changes
- ✅ Native app and Adalo working together
- ✅ Clear path to full migration
- ✅ Maintainable codebase

**Your Adalo business/admin app continues working while the native user app provides better performance!**
