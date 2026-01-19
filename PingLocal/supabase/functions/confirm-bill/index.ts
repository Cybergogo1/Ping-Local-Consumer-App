// supabase/functions/confirm-bill/index.ts
// Called by consumer app when customer confirms the bill amount for Pay on Day offers
// Sets redemption_token status to 'Finished', marks as completed
// Awards loyalty points to the customer
// Marks purchase_token as redeemed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Loyalty tier thresholds (matching consumer app logic)
const getTierFromPoints = (points: number): string => {
  if (points >= 5000) return 'Platinum'
  if (points >= 2500) return 'Gold'
  if (points >= 1000) return 'Silver'
  return 'Bronze'
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
    const requestData = body.fields || body

    const { redemption_token_id, user_id } = requestData

    console.log('Confirm bill called:', { redemption_token_id, user_id })

    if (!redemption_token_id) {
      return new Response(
        JSON.stringify({ error: 'redemption_token_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get the redemption token
    const { data: redemptionToken, error: findError } = await supabaseClient
      .from('redemption_tokens')
      .select('*')
      .eq('id', redemption_token_id)
      .single()

    if (findError) {
      console.error('Error fetching redemption token:', findError)
      return new Response(
        JSON.stringify({ error: 'Redemption token not found', details: findError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (!redemptionToken) {
      return new Response(
        JSON.stringify({ error: 'Redemption token not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Redemption token status:', redemptionToken.status)

    // Get purchase token and offer name
    let offerName = 'Offer'
    let offerId = null
    let businessId = null
    if (redemptionToken.purchase_token_id) {
      const { data: purchaseToken } = await supabaseClient
        .from('purchase_tokens')
        .select('offer_name, offer_id, business_id')
        .eq('id', redemptionToken.purchase_token_id)
        .single()

      if (purchaseToken) {
        offerName = purchaseToken.offer_name || offerName
        offerId = purchaseToken.offer_id
        businessId = purchaseToken.business_id
      }
    }

    // Verify status is 'Submitted' (business has entered bill)
    if (redemptionToken.status !== 'Submitted') {
      return new Response(
        JSON.stringify({
          error: `Cannot confirm bill. Current status is '${redemptionToken.status}'. Expected 'Submitted'.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if already completed
    if (redemptionToken.completed) {
      return new Response(
        JSON.stringify({ error: 'This redemption has already been completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const billAmount = redemptionToken.bill_input_total
    if (!billAmount || billAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid bill amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get business cut_percent to calculate PingTake
    let pingTake = 0
    if (businessId) {
      const { data: business } = await supabaseClient
        .from('businesses')
        .select('cut_percent')
        .eq('id', businessId)
        .single()

      if (business && business.cut_percent) {
        pingTake = billAmount * (business.cut_percent / 100)
      }
    }

    const now = new Date()

    // Calculate loyalty points: bill × 10
    const pointsEarned = Math.floor(billAmount * 10)

    // Get current user points
    const { data: user, error: userFindError } = await supabaseClient
      .from('users')
      .select('loyalty_points')
      .eq('id', user_id)
      .single()

    if (userFindError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const oldPoints = user.loyalty_points || 0
    const newPoints = oldPoints + pointsEarned

    // Detect tier change
    const previousTier = getTierFromPoints(oldPoints)
    const newTier = getTierFromPoints(newPoints)
    const tierChanged = newTier !== previousTier

    // Update user loyalty points
    const { error: userUpdateError } = await supabaseClient
      .from('users')
      .update({
        loyalty_points: newPoints,
        updated: now.toISOString(),
      })
      .eq('id', user_id)

    if (userUpdateError) {
      throw userUpdateError
    }

    // Create loyalty points record
    const { error: loyaltyError } = await supabaseClient
      .from('loyalty_points')
      .insert({
        user_id: user_id,
        points: pointsEarned,
        reason: `Redeemed: ${offerName}`,
        offer_id: offerId,
      })

    if (loyaltyError) {
      console.error('Error creating loyalty points record:', loyaltyError)
      // Don't fail the request, points have been added to user
    }

    // Update redemption token to finished
    const { error: redemptionUpdateError } = await supabaseClient
      .from('redemption_tokens')
      .update({
        status: 'Finished',
        completed: true,
        time_redeemed: now.toISOString(),
        date_redeemed: now.toISOString().split('T')[0],
        updated: now.toISOString(),
        PingTake: pingTake,
      })
      .eq('id', redemption_token_id)

    if (redemptionUpdateError) {
      console.error('Error updating redemption token:', redemptionUpdateError)
      throw redemptionUpdateError
    }

    console.log('Redemption token updated to Finished')

    // Mark purchase token as redeemed
    if (redemptionToken.purchase_token_id) {
      const { error: purchaseUpdateError } = await supabaseClient
        .from('purchase_tokens')
        .update({
          redeemed: true,
          updated: now.toISOString(),
        })
        .eq('id', redemptionToken.purchase_token_id)

      if (purchaseUpdateError) {
        console.error('Error updating purchase token:', purchaseUpdateError)
        // Don't fail the whole request, redemption is still complete
      }
    }

    // Send loyalty points notification to user
    try {
      await supabaseClient.functions.invoke('send-push-notification', {
        body: {
          type: 'loyalty_points_earned',
          user_id: user_id,
          points_earned: pointsEarned,
          reason: 'redemption',
          offer_title: offerName,
        },
      })
    } catch (notifError) {
      console.error('Error sending loyalty points notification:', notifError)
      // Don't fail the request
    }

    // If tier changed, send tier upgrade notification
    if (tierChanged) {
      try {
        await supabaseClient.functions.invoke('send-push-notification', {
          body: {
            type: 'loyalty_upgrade',
            user_id: user_id,
            new_tier: newTier,
          },
        })
      } catch (notifError) {
        console.error('Error sending tier upgrade notification:', notifError)
        // Don't fail the request
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        redemption_token_id: redemption_token_id,
        status: 'Finished',
        points_earned: pointsEarned,
        new_points_total: newPoints,
        previous_tier: previousTier,
        new_tier: newTier,
        tier_changed: tierChanged,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Confirm bill error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
