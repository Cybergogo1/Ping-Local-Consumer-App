import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, PUT, PATCH, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Accept POST, PUT, or PATCH (Adalo may use POST for updates)
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const url = new URL(req.url)

    // Log the incoming request for debugging
    console.log('Received method:', req.method)
    console.log('Received URL:', req.url)
    console.log('Received body:', JSON.stringify(body, null, 2))

    // Support multiple Adalo formats - Adalo often nests data
    const requestData = body.fields || body.record || body.action?.fields || body.data || body

    // Get ID from URL path (e.g., /update-user/123)
    const pathParts = url.pathname.split('/')
    const pathId = pathParts[pathParts.length - 1]
    // Only use pathId if it looks like a valid ID (not 'update-user')
    const idFromPath = pathId && pathId !== 'update-user' && !pathId.includes('update') ? pathId : null

    // Get ID from multiple possible locations (Adalo can send it various ways)
    const id = url.searchParams.get('id')
      || url.searchParams.get('Id')
      || idFromPath
      || requestData.id
      || requestData.Id
      || requestData.user_id
      || requestData.userId
      || body.id
      || body.Id
      || body.user_id
      || body.userId

    console.log('URL pathname:', url.pathname)
    console.log('Path parts:', pathParts)
    console.log('ID from path:', idFromPath)
    console.log('Final extracted ID:', id)

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'id is required', received_body: body }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Log the ID we're searching for
    console.log('Searching for user with ID:', id, 'Type:', typeof id)

    // Check if record exists
    const { data: existingRecord, error: fetchError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    console.log('Fetch result - data:', existingRecord, 'error:', fetchError)

    if (fetchError || !existingRecord) {
      return new Response(
        JSON.stringify({
          error: 'User not found',
          searched_id: id,
          id_type: typeof id,
          fetch_error: fetchError?.message || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {
      updated: new Date().toISOString()
    }

    // Support multiple field name formats
    const email = requestData.email ?? requestData.Email
    const firstName = requestData.first_name ?? requestData.firstName ?? requestData['First Name']
    const surname = requestData.surname ?? requestData.Surname ?? requestData['Last Name']
    const phoneNo = requestData.phone_no ?? requestData.phoneNo ?? requestData['Phone No']
    const loyaltyPoints = requestData.loyalty_points ?? requestData.loyaltyPoints ?? requestData['Loyalty Points']
    const loyaltyTier = requestData.loyalty_tier ?? requestData.loyaltyTier ?? requestData['Loyalty Tier']
    const verified = requestData.verified ?? requestData.Verified
    const onboardingCompleted = requestData.onboarding_completed ?? requestData.onboardingCompleted ?? requestData['Onboarding Completed']
    const notificationPermissionStatus = requestData.notification_permission_status ?? requestData.notificationPermissionStatus
    const profilePic = requestData.profile_pic ?? requestData.profilePic ?? requestData['Profile Pic']
    const activateNotifications = requestData.activate_notifications ?? requestData.activateNotifications ?? requestData['Activate Notifications']
    const selectedLocation = requestData.selected_location ?? requestData.selectedLocation ?? requestData['Selected Location']
    const selectedLocationId = requestData.selected_location_id ?? requestData.selectedLocationId ?? requestData['Selected Location Id']

    if (email !== undefined) updateData.email = email
    if (firstName !== undefined) updateData.first_name = firstName
    if (surname !== undefined) updateData.surname = surname
    if (phoneNo !== undefined) updateData.phone_no = phoneNo
    if (loyaltyPoints !== undefined) updateData.loyalty_points = Number(loyaltyPoints)
    if (loyaltyTier !== undefined) updateData.loyalty_tier = loyaltyTier
    if (verified !== undefined) updateData.verified = Boolean(verified)
    if (onboardingCompleted !== undefined) updateData.onboarding_completed = Boolean(onboardingCompleted)
    if (notificationPermissionStatus !== undefined) updateData.notification_permission_status = notificationPermissionStatus
    if (profilePic !== undefined) updateData.profile_pic = profilePic
    if (activateNotifications !== undefined) updateData.activate_notifications = Boolean(activateNotifications)
    if (selectedLocation !== undefined) updateData.selected_location = selectedLocation
    if (selectedLocationId !== undefined) updateData.selected_location_id = selectedLocationId ? Number(selectedLocationId) : null

    // Check if there's anything meaningful to update (besides updated timestamp)
    if (Object.keys(updateData).length === 1) {
      return new Response(
        JSON.stringify({ error: 'No fields to update provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { data, error } = await supabaseClient
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Return in Adalo-compatible format (with values for all fields)
    const responseData = {
      id: String(data.id),
      email: data.email || '',
      first_name: data.first_name || '',
      surname: data.surname || '',
      phone_no: data.phone_no || '',
      loyalty_points: data.loyalty_points ?? 0,
      loyalty_tier: data.loyalty_tier || '',
      verified: data.verified ?? false,
      onboarding_completed: data.onboarding_completed ?? false,
      notification_permission_status: data.notification_permission_status || 'not_asked',
      profile_pic: data.profile_pic || '',
      activate_notifications: data.activate_notifications ?? false,
      selected_location: data.selected_location || '',
      selected_location_id: data.selected_location_id ? String(data.selected_location_id) : '',
      created: data.created || '',
      updated: data.updated || '',
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
