import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Tier thresholds - must match the app's TIER_THRESHOLDS
const TIER_THRESHOLDS = {
  member: { min: 0, max: 10 },
  hero: { min: 10, max: 1200 },
  champion: { min: 1200, max: 10000 },
  legend: { min: 10000, max: Infinity },
}

type TierName = 'member' | 'hero' | 'champion' | 'legend'

function getTierFromPoints(points: number): TierName {
  if (points >= TIER_THRESHOLDS.legend.min) return 'legend'
  if (points >= TIER_THRESHOLDS.champion.min) return 'champion'
  if (points >= TIER_THRESHOLDS.hero.min) return 'hero'
  return 'member'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
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

    // Log the incoming request for debugging
    console.log('Received body:', JSON.stringify(body, null, 2))

    // Support multiple Adalo formats:
    // 1. Direct fields: { user_id: 123 }
    // 2. Wrapped in 'fields': { fields: { user_id: 123 } }
    // 3. Wrapped in 'record': { record: { user_id: 123 } }
    // 4. Adalo action format: { action: { fields: { user_id: 123 } } }
    const requestData = body.fields || body.record || body.action?.fields || body

    // Support multiple field name formats from Adalo
    const name = requestData.name || requestData.Name || body.name
    const amount = requestData.amount ?? requestData.Amount ?? body.amount
    const userId = requestData.user_id || requestData.userId || requestData['User Id'] || requestData['user id'] || body.user_id
    const reason = requestData.reason || requestData.Reason || body.reason
    const dateReceived = requestData.date_received || requestData.dateReceived || requestData['Date Received'] || body.date_received

    // Validate required fields
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (amount === undefined || amount === null) {
      return new Response(
        JSON.stringify({ error: 'amount is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create the loyalty points record
    const loyaltyPointsData: Record<string, unknown> = {
      user_id: Number(userId),
      amount: Number(amount),
      name: name || null,
      reason: reason || null,
      date_received: dateReceived || new Date().toISOString(),
    }

    const { data, error } = await supabaseClient
      .from('loyalty_points')
      .insert(loyaltyPointsData)
      .select()
      .single()

    if (error) throw error

    // Check for tier upgrade
    let leveledUp = false
    let previousTier: TierName | null = null
    let newTier: TierName | null = null
    let newTotalPoints = 0

    try {
      // Get user's current data
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('loyalty_points, loyalty_tier')
        .eq('id', userId)
        .single()

      if (!userError && userData) {
        const currentPoints = userData.loyalty_points || 0
        const currentTier = (userData.loyalty_tier || 'member') as TierName
        newTotalPoints = currentPoints + Number(amount)

        // Calculate new tier based on total points
        const calculatedNewTier = getTierFromPoints(newTotalPoints)

        // Check if user leveled up
        if (calculatedNewTier !== currentTier) {
          const tierOrder: TierName[] = ['member', 'hero', 'champion', 'legend']
          const currentTierIndex = tierOrder.indexOf(currentTier)
          const newTierIndex = tierOrder.indexOf(calculatedNewTier)

          if (newTierIndex > currentTierIndex) {
            leveledUp = true
            previousTier = currentTier
            newTier = calculatedNewTier

            // Update user's tier and points
            await supabaseClient
              .from('users')
              .update({
                loyalty_tier: calculatedNewTier,
                loyalty_points: newTotalPoints,
                pending_level_up: true,
                pending_level_up_from: currentTier,
                pending_level_up_to: calculatedNewTier,
                updated: new Date().toISOString(),
              })
              .eq('id', userId)

            console.log(`User ${userId} leveled up from ${currentTier} to ${calculatedNewTier}!`)
          }
        }

        // If no level up, just update the points
        if (!leveledUp) {
          await supabaseClient
            .from('users')
            .update({
              loyalty_points: newTotalPoints,
              updated: new Date().toISOString(),
            })
            .eq('id', userId)
        }
      }
    } catch (tierError) {
      console.error('Error checking tier upgrade:', tierError)
    }

    // Create in-app notification directly (bypasses inter-function call issues)
    try {
      // Determine notification content based on reason
      let notificationBody = `You've been awarded ${Number(amount)} loyalty points!`
      if (reason) {
        const lowerReason = reason.toLowerCase()
        if (lowerReason.includes('purchase') || lowerReason.includes('pay up front')) {
          notificationBody = `You earned ${Number(amount)} loyalty points for your purchase!`
        } else if (lowerReason.includes('redeem') || lowerReason.includes('pay on the day')) {
          notificationBody = `You earned ${Number(amount)} loyalty points for redeeming your offer!`
        }
      }

      // Insert notification directly into notifications table
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: Number(userId),
          name: 'Loyalty Points Earned!',
          content: notificationBody,
          read: false,
          notifications_categories: 'points',
        })

      if (notifError) {
        console.error('Error creating notification:', notifError)
      } else {
        console.log('Notification created successfully for user', userId)
      }

      // Create level up notification if user leveled up
      if (leveledUp && newTier) {
        const { error: levelUpNotifError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: Number(userId),
            name: 'Congratulations!',
            content: `You've reached ${newTier} status!`,
            read: false,
            notifications_categories: 'loyalty',
          })

        if (levelUpNotifError) {
          console.error('Error creating level up notification:', levelUpNotifError)
        } else {
          console.log('Level up notification created for user', userId)
        }
      }
    } catch (notificationError) {
      // Log but don't fail the request if notification fails
      console.error('Error creating notification:', notificationError)
    }

    // Return in Adalo-compatible format (lowercase only to avoid duplicate fields)
    const responseData = {
      id: String(data.id),
      name: data.name,
      amount: data.amount,
      user_id: data.user_id ? String(data.user_id) : null,
      reason: data.reason,
      date_received: data.date_received,
      created: data.created,
      updated: data.updated,
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
