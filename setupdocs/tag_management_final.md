# Tag Management: Complete Guide (Final Version)

## Overview

This guide implements a proper tag management system where:
- **Supabase** is the single source of truth
- **Adalo** shows tags with selected/unselected visual states
- **Native app** queries tags directly from Supabase

This is the **optimal approach** given your tech stack. We're not working around limitations - we're using Edge Functions as a proper API layer between Adalo and Supabase.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                │
│                                                                 │
│  ┌─────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │  tags   │    │ business_tags │    │  offer_tags  │           │
│  │  table  │    │ junction table│    │junction table│           │
│  └─────────┘    └──────────────┘    └──────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    EDGE FUNCTIONS                        │   │
│  │  • get-tags-for-business (returns all tags + is_selected)│   │
│  │  • toggle-business-tag (add or remove in one call)       │   │
│  │  • get-tags, create-tag, delete-tag (admin functions)    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ADALO                                  │
│                                                                 │
│  External Collection: "TagsForBusiness"                         │
│  Returns: [{ id, name, is_selected: true/false }, ...]         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Single list with conditional styling:                   │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ [✓] Restaurant         (highlighted/filled)      │   │   │
│  │  │ [ ] Cafe               (not highlighted/outline) │   │   │
│  │  │ [✓] Family Friendly    (highlighted/filled)      │   │   │
│  │  │ [ ] Pet Friendly       (not highlighted/outline) │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │  Tap any item → toggle-business-tag → refresh list       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight:** The Edge Function does the heavy lifting - it returns ALL tags with an `is_selected` boolean. Adalo just displays the list and uses conditional styling based on that field.

---

## Part 1: Edge Functions

### Functions You Need

| Function | Purpose | Used By |
|----------|---------|---------|
| `get-tags` | Get all tags (for admin list, native app filters) | Admin, Native App |
| `create-tag` | Create a new tag | Admin |
| `delete-tag` | Delete a tag | Admin |
| `get-tags-for-business` | Get all tags with `is_selected` for a business | Adalo |
| `get-tags-for-offer` | Get all tags with `is_selected` for an offer | Adalo |
| `toggle-business-tag` | Add or remove a tag from a business | Adalo |
| `toggle-offer-tag` | Add or remove a tag from an offer | Adalo |
| `get-business-tags` | Get only assigned tags for a business | Native App |
| `get-offer-tags` | Get only assigned tags for an offer | Native App |

---

### 1.1 `get-tags` - Get All Tags

```typescript
// supabase/functions/get-tags/index.ts
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    let query = supabaseClient.from('tags').select('*').order('name')
    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) throw error

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

### 1.2 `create-tag` - Create New Tag

```typescript
// supabase/functions/create-tag/index.ts
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    const { data, error } = await supabaseClient
      .from('tags')
      .insert({
        name: body.name || body.Name,
        type: body.type || body.Type || 'tags'
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, tag: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

### 1.3 `delete-tag` - Delete Tag

```typescript
// supabase/functions/delete-tag/index.ts
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const tagId = body.tag_id || body.tagId || body.id

    if (!tagId) throw new Error('tag_id is required')

    const { data: tag } = await supabaseClient
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single()

    if (!tag) throw new Error(`Tag with id ${tagId} not found`)

    const { error } = await supabaseClient
      .from('tags')
      .delete()
      .eq('id', tagId)

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, deleted_tag: tag }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

### 1.4 `get-tags-for-business` - All Tags with Selection State ⭐

**This is the key function that enables the toggle UI in Adalo.**

```typescript
// supabase/functions/get-tags-for-business/index.ts
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const businessId = url.searchParams.get('business_id')
    const tagType = url.searchParams.get('type')

    if (!businessId) throw new Error('business_id is required')

    // Get ALL tags
    let tagsQuery = supabaseClient.from('tags').select('*').order('name')
    if (tagType) {
      tagsQuery = tagsQuery.eq('type', tagType)
    }
    const { data: allTags, error: tagsError } = await tagsQuery
    if (tagsError) throw tagsError

    // Get assigned tag IDs for this business
    const { data: businessTags } = await supabaseClient
      .from('business_tags')
      .select('tag_id')
      .eq('business_id', parseInt(businessId))

    const assignedTagIds = new Set(businessTags?.map(bt => bt.tag_id) || [])

    // Merge: add is_selected to each tag
    const tagsWithSelection = allTags?.map(tag => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
      // Boolean for logic
      is_selected: assignedTagIds.has(tag.id),
      // Text version (Adalo handles this better sometimes)
      selected_text: assignedTagIds.has(tag.id) ? 'true' : 'false',
      // Visual checkmark
      selected_icon: assignedTagIds.has(tag.id) ? '✓' : '',
      // Reference
      business_id: parseInt(businessId)
    })) || []

    return new Response(
      JSON.stringify(tagsWithSelection),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

### 1.5 `get-tags-for-offer` - All Tags with Selection State

```typescript
// supabase/functions/get-tags-for-offer/index.ts
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const offerId = url.searchParams.get('offer_id')
    const tagType = url.searchParams.get('type')

    if (!offerId) throw new Error('offer_id is required')

    let tagsQuery = supabaseClient.from('tags').select('*').order('name')
    if (tagType) {
      tagsQuery = tagsQuery.eq('type', tagType)
    }
    const { data: allTags, error: tagsError } = await tagsQuery
    if (tagsError) throw tagsError

    const { data: offerTags } = await supabaseClient
      .from('offer_tags')
      .select('tag_id')
      .eq('offer_id', parseInt(offerId))

    const assignedTagIds = new Set(offerTags?.map(ot => ot.tag_id) || [])

    const tagsWithSelection = allTags?.map(tag => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
      is_selected: assignedTagIds.has(tag.id),
      selected_text: assignedTagIds.has(tag.id) ? 'true' : 'false',
      selected_icon: assignedTagIds.has(tag.id) ? '✓' : '',
      offer_id: parseInt(offerId)
    })) || []

    return new Response(
      JSON.stringify(tagsWithSelection),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

### 1.6 `toggle-business-tag` - Add or Remove in One Call ⭐

**This simplifies Adalo to one button per tag instead of separate Add/Remove.**

```typescript
// supabase/functions/toggle-business-tag/index.ts
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const businessId = body.business_id || body.businessId
    const tagId = body.tag_id || body.tagId
    
    // Current state - accepts boolean or string
    const currentlySelected = 
      body.is_selected === true || 
      body.is_selected === 'true' || 
      body.selected_text === 'true'

    if (!businessId || !tagId) {
      throw new Error('business_id and tag_id are required')
    }

    let action: string
    let newState: boolean

    if (currentlySelected) {
      // Remove
      await supabaseClient
        .from('business_tags')
        .delete()
        .eq('business_id', businessId)
        .eq('tag_id', tagId)
      
      action = 'removed'
      newState = false
    } else {
      // Add
      await supabaseClient
        .from('business_tags')
        .upsert({ business_id: businessId, tag_id: tagId })
      
      action = 'added'
      newState = true
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        tag_id: tagId,
        business_id: businessId,
        is_selected: newState
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

### 1.7 `toggle-offer-tag` - Add or Remove in One Call

```typescript
// supabase/functions/toggle-offer-tag/index.ts
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const offerId = body.offer_id || body.offerId
    const tagId = body.tag_id || body.tagId
    const currentlySelected = 
      body.is_selected === true || 
      body.is_selected === 'true' || 
      body.selected_text === 'true'

    if (!offerId || !tagId) {
      throw new Error('offer_id and tag_id are required')
    }

    let action: string
    let newState: boolean

    if (currentlySelected) {
      await supabaseClient
        .from('offer_tags')
        .delete()
        .eq('offer_id', offerId)
        .eq('tag_id', tagId)
      
      action = 'removed'
      newState = false
    } else {
      await supabaseClient
        .from('offer_tags')
        .upsert({ offer_id: offerId, tag_id: tagId })
      
      action = 'added'
      newState = true
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        tag_id: tagId,
        offer_id: offerId,
        is_selected: newState
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

### 1.8 `get-business-tags` - Only Assigned Tags (for Native App)

```typescript
// supabase/functions/get-business-tags/index.ts
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const businessId = url.searchParams.get('business_id')

    if (!businessId) throw new Error('business_id is required')

    const { data, error } = await supabaseClient
      .from('business_tags')
      .select('tags(id, name, type)')
      .eq('business_id', businessId)

    if (error) throw error

    const tags = data?.map((bt: any) => bt.tags) || []

    return new Response(
      JSON.stringify(tags),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

### 1.9 `get-offer-tags` - Only Assigned Tags (for Native App)

```typescript
// supabase/functions/get-offer-tags/index.ts
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const offerId = url.searchParams.get('offer_id')

    if (!offerId) throw new Error('offer_id is required')

    const { data, error } = await supabaseClient
      .from('offer_tags')
      .select('tags(id, name, type)')
      .eq('offer_id', offerId)

    if (error) throw error

    const tags = data?.map((ot: any) => ot.tags) || []

    return new Response(
      JSON.stringify(tags),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

## Part 2: Deploy Edge Functions

```bash
# Login and link (if not already)
supabase login
supabase link --project-ref pyufvauhjqfffezptuxl

# Deploy all functions
supabase functions deploy get-tags
supabase functions deploy create-tag
supabase functions deploy delete-tag
supabase functions deploy get-tags-for-business
supabase functions deploy get-tags-for-offer
supabase functions deploy toggle-business-tag
supabase functions deploy toggle-offer-tag
supabase functions deploy get-business-tags
supabase functions deploy get-offer-tags
```

**Test a function:**
```bash
curl "https://pyufvauhjqfffezptuxl.supabase.co/functions/v1/get-tags-for-business?business_id=1" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## Part 3: Adalo Configuration

### 3.1 Create External Collection: "TagsForBusiness"

This is the main collection for the tag picker UI.

1. **Database** → **Add Collection** → **External Collection**

2. **Settings:**
   | Field | Value |
   |-------|-------|
   | Name | `TagsForBusiness` |
   | Base URL | `https://pyufvauhjqfffezptuxl.supabase.co/functions/v1` |

3. **Headers:** (Add all three)
   | Header | Value |
   |--------|-------|
   | `apikey` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dWZ2YXVoanFmZmZlenB0dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTExMDQsImV4cCI6MjA3OTMyNzEwNH0.IEhzK1gNDqaS2q9656CBsx9JZBRHYZAfHYYKIVd4S5g` |
   | `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dWZ2YXVoanFmZmZlenB0dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTExMDQsImV4cCI6MjA3OTMyNzEwNH0.IEhzK1gNDqaS2q9656CBsx9JZBRHYZAfHYYKIVd4S5g` |
   | `Content-Type` | `application/json` |

4. **Endpoint:**
   | Field | Value |
   |-------|-------|
   | Name | `Get All` |
   | Method | `GET` |
   | Path | `/get-tags-for-business` |

5. **Query Parameters:**
   | Name | Type |
   |------|------|
   | `business_id` | Number |

6. **Run Test Request** with `business_id = 1`

7. **Map Response Fields:**
   | Field | Type |
   |-------|------|
   | `id` | Number |
   | `name` | Text |
   | `type` | Text |
   | `is_selected` | True/False |
   | `selected_text` | Text |
   | `selected_icon` | Text |
   | `business_id` | Number |

8. **Save**

---

### 3.2 Create External Collection: "TagsForOffer"

Same as above but:
- **Name:** `TagsForOffer`
- **Path:** `/get-tags-for-offer`
- **Query Parameter:** `offer_id` (Number)
- **Additional field:** `offer_id` instead of `business_id`

---

### 3.3 Create External Collection: "AllTags"

For admin management screen.

- **Name:** `AllTags`
- **Path:** `/get-tags`
- **Query Parameter:** `type` (Text, optional)
- **Fields:** `id`, `name`, `type`, `created`, `updated`

---

### 3.4 Create Custom Action: "Toggle Business Tag"

1. **Settings** → **Custom Actions** → **New Action**

2. **Configuration:**
   | Field | Value |
   |-------|-------|
   | Name | `Toggle Business Tag` |
   | Method | `POST` |
   | URL | `https://pyufvauhjqfffezptuxl.supabase.co/functions/v1/toggle-business-tag` |

3. **Headers:** (same as External Collections)

4. **Inputs:**
   | Name | Type |
   |------|------|
   | `business_id` | Number |
   | `tag_id` | Number |
   | `is_selected` | True/False |

5. **Body:**
   ```json
   {
     "business_id": {{business_id}},
     "tag_id": {{tag_id}},
     "is_selected": {{is_selected}}
   }
   ```

6. **Save**

---

### 3.5 Create Custom Action: "Toggle Offer Tag"

Same as above but:
- **Name:** `Toggle Offer Tag`
- **URL:** `.../toggle-offer-tag`
- **Inputs:** `offer_id`, `tag_id`, `is_selected`
- **Body:** Use `offer_id` instead of `business_id`

---

### 3.6 Create Custom Action: "Create Tag"

- **Name:** `Create Tag`
- **Method:** `POST`
- **URL:** `.../create-tag`
- **Inputs:** `name` (Text), `type` (Text)
- **Body:**
  ```json
  {
    "name": "{{name}}",
    "type": "{{type}}"
  }
  ```

---

### 3.7 Create Custom Action: "Delete Tag"

- **Name:** `Delete Tag`
- **Method:** `POST`
- **URL:** `.../delete-tag`
- **Inputs:** `tag_id` (Number)
- **Body:**
  ```json
  {
    "tag_id": {{tag_id}}
  }
  ```

---

## Part 4: Build Adalo Screens

### 4.1 Edit Business Tags Screen

**This is the key screen with toggle functionality.**

#### Screen Setup
- Create new screen: "Edit Business Tags"
- Add **Screen Parameter:** Receives `Current Business` (or business ID)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back           Select Tags                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tags for: [Business Name]                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐
│  │                                                         │
│  │   ┌───────────────────────────────────────────────┐    │
│  │   │  ✓  Restaurant                                │    │  ← Selected (highlighted)
│  │   └───────────────────────────────────────────────┘    │
│  │   ┌───────────────────────────────────────────────┐    │
│  │   │     Cafe                                      │    │  ← Not selected (outline)
│  │   └───────────────────────────────────────────────┘    │
│  │   ┌───────────────────────────────────────────────┐    │
│  │   │  ✓  Family Friendly                           │    │  ← Selected
│  │   └───────────────────────────────────────────────┘    │
│  │   ┌───────────────────────────────────────────────┐    │
│  │   │     Pet Friendly                              │    │  ← Not selected
│  │   └───────────────────────────────────────────────┘    │
│  │   ┌───────────────────────────────────────────────┐    │
│  │   │     Outdoor Seating                           │    │  ← Not selected
│  │   └───────────────────────────────────────────────┘    │
│  │                                                         │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│                        [Done]                               │
└─────────────────────────────────────────────────────────────┘
```

#### Building It Step-by-Step

**Step 1: Add a Simple List**

1. Add **Simple List** component
2. **What is this a list of?** → `TagsForBusiness`
3. **Filter:** Set `business_id` equal to `Current Business` → `id`

**Step 2: Design the List Item**

Inside the list item:

1. Add a **Rectangle** (or Card) as the background
2. Add **Text** showing `Current TagsForBusiness` → `name`
3. Add **Text** showing `Current TagsForBusiness` → `selected_icon` (this shows ✓ or empty)

**Step 3: Add Conditional Styling (Selected State)**

This is where the magic happens!

1. Select the **Rectangle/Card** background
2. Go to **Edit Styles**
3. Click **Add Condition** (or "Sometimes" in newer Adalo)
4. Set condition: `Current TagsForBusiness` → `is_selected` → `is true`
5. Change the styling for selected state:
   - Background color: Your primary blue (`#36566F`) or a light tint
   - Border: Solid instead of outline
   - Or any visual difference you want

**Alternative: Use Two Overlapping Elements**

If conditional styling is tricky:

1. Add two versions of the row design (one selected, one unselected)
2. Set visibility:
   - Selected version: Visible when `is_selected` is `true`
   - Unselected version: Visible when `is_selected` is `false`

**Step 4: Add Toggle Action**

1. Make the entire list item **clickable** (or add an invisible button overlay)
2. **On Click:**
   - Action: **Custom Action** → `Toggle Business Tag`
   - `business_id`: `Current Business` → `id`
   - `tag_id`: `Current TagsForBusiness` → `id`
   - `is_selected`: `Current TagsForBusiness` → `is_selected`

**Step 5: Handle List Refresh**

After the toggle action, the list needs to refresh to show the new state.

**Option A: Navigate Back and Forward**
- Add action after Custom Action: **Link** → **Back**
- User returns to see updated list

**Option B: Same Screen Refresh**
- Sometimes Adalo auto-refreshes External Collections
- If not, add a "Refresh" button that links to the same screen

**Option C: Use a Refresh Trigger**
- Add a hidden input field
- After toggle, set it to current timestamp
- This can trigger Adalo to re-fetch

---

### 4.2 Edit Offer Tags Screen

Identical to above but:
- Use `TagsForOffer` External Collection
- Filter by `offer_id`
- Use `Toggle Offer Tag` Custom Action

---

### 4.3 Manage Tags Screen (Admin)

For creating and deleting tags.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back              Manage Tags                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CREATE NEW TAG                                             │
│  ┌─────────────────────────────────────────────────────────┐
│  │  Name:  [_______________________]                       │
│  │  Type:  [Category          ▼]                           │
│  │                                                         │
│  │              [Create Tag]                               │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│  ALL TAGS                                                   │
│  ┌─────────────────────────────────────────────────────────┐
│  │  Restaurant (Category)                    [Delete]      │
│  │  Cafe (Category)                          [Delete]      │
│  │  Family Friendly (tags)                   [Delete]      │
│  │  Pet Friendly (tags)                      [Delete]      │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

**Build it:**

1. **Text Input** for tag name
2. **Dropdown** for type: Options = "Category", "tags"
3. **Create Button:**
   - Action: `Create Tag` Custom Action
   - Inputs from the form fields
   - After: Clear inputs (set to empty)

4. **Simple List** connected to `AllTags` External Collection
5. **Delete Button** on each row:
   - Action: `Delete Tag` Custom Action
   - Input: `Current AllTags` → `id`
   - Consider adding a confirmation popup first!

---

## Part 5: Native App Implementation

In your React Native app, you query Supabase directly (no Edge Functions needed for reads).

### Fetch Offers with Tags

```typescript
const { data: offers } = await supabase
  .from('offers')
  .select(`
    *,
    businesses(id, name, location_area),
    offer_tags(
      tags(id, name, type)
    )
  `)
  .eq('status', 'Signed Off')
  .gte('end_date', new Date().toISOString())

// Transform for easier use
const offersWithTags = offers?.map(offer => ({
  ...offer,
  tags: offer.offer_tags?.map(ot => ot.tags) || []
}))
```

### Filter by Tags

```typescript
const selectedTagIds = [1, 5, 12] // User's selected filter tags

const { data: filtered } = await supabase
  .from('offers')
  .select(`
    *,
    businesses(*),
    offer_tags!inner(tag_id)
  `)
  .eq('status', 'Signed Off')
  .in('offer_tags.tag_id', selectedTagIds)
```

### Display Tags

```tsx
// Tag chips on detail screen
<View style={styles.tagContainer}>
  {offer.tags?.map(tag => (
    <View key={tag.id} style={styles.tagChip}>
      <Text style={styles.tagText}>{tag.name}</Text>
    </View>
  ))}
</View>
```

### Filter UI

```tsx
const [selectedTags, setSelectedTags] = useState<number[]>([])

const toggleTagFilter = (tagId: number) => {
  setSelectedTags(prev =>
    prev.includes(tagId)
      ? prev.filter(id => id !== tagId)
      : [...prev, tagId]
  )
}

// Render filter chips
{allTags.map(tag => (
  <TouchableOpacity
    key={tag.id}
    onPress={() => toggleTagFilter(tag.id)}
    style={[
      styles.filterChip,
      selectedTags.includes(tag.id) && styles.filterChipActive
    ]}
  >
    <Text>{tag.name}</Text>
  </TouchableOpacity>
))}
```

---

## Summary

### What Makes This Solution "Proper"

1. **Single Source of Truth:** All data in Supabase
2. **Clean API Layer:** Edge Functions handle the logic
3. **Toggle UI Works:** `is_selected` field enables visual states in Adalo
4. **No Sync Issues:** No duplicate data between Adalo and Supabase
5. **Native App Simple:** Direct Supabase queries, no workarounds

### Edge Functions to Deploy

```bash
supabase functions deploy get-tags
supabase functions deploy create-tag
supabase functions deploy delete-tag
supabase functions deploy get-tags-for-business
supabase functions deploy get-tags-for-offer
supabase functions deploy toggle-business-tag
supabase functions deploy toggle-offer-tag
supabase functions deploy get-business-tags
supabase functions deploy get-offer-tags
```

### Adalo Setup Checklist

- [ ] External Collection: `TagsForBusiness`
- [ ] External Collection: `TagsForOffer`
- [ ] External Collection: `AllTags`
- [ ] Custom Action: `Toggle Business Tag`
- [ ] Custom Action: `Toggle Offer Tag`
- [ ] Custom Action: `Create Tag`
- [ ] Custom Action: `Delete Tag`
- [ ] Screen: Edit Business Tags (with conditional styling)
- [ ] Screen: Edit Offer Tags
- [ ] Screen: Manage Tags (admin)

---

## Troubleshooting

### Tags not showing selected state
- Verify `is_selected` is mapped as True/False in External Collection
- Check conditional styling is set up correctly
- Test the Edge Function directly to confirm it returns `is_selected: true`

### Toggle not working
- Check Custom Action body format matches function expectations
- Look at Supabase Edge Function logs for errors
- Verify `is_selected` is being passed correctly

### List not refreshing after toggle
- Try navigating away and back
- Add a manual refresh mechanism
- Check if Adalo's auto-refresh is working

### Conditional styling not applying
- Try using "Sometimes" visibility instead
- Create two overlapping elements with opposite visibility conditions
- Ensure the condition references `is_selected` correctly
