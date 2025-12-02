// supabase/functions/create-payment-intent/index.ts
// Creates a Stripe Payment Intent for "Pay Up Front" offers
// Uses Stripe Connect to split payment between platform and business

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const requestData = body.fields || body

    // Validate required fields
    const { amount, offer_id, business_id, user_id, user_email, offer_name, quantity } = requestData

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valid amount is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: 'business_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch business details to get stripe_account_no and cut_percent
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('stripe_account_no, cut_percent, name')
      .eq('id', business_id)
      .single()

    if (businessError || !business) {
      throw new Error('Business not found')
    }

    // Calculate platform fee (Ping Local's cut)
    const cutPercent = business.cut_percent || 10 // Default to 10% if not set
    const amountInCents = Math.round(amount * 100) // Convert to cents
    const platformFeeInCents = Math.round(amountInCents * (cutPercent / 100))

    // Create payment intent options
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: 'gbp',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        offer_id: String(offer_id || ''),
        business_id: String(business_id),
        user_id: String(user_id || ''),
        user_email: user_email || '',
        offer_name: offer_name || '',
        quantity: String(quantity || 1),
        platform_fee: String(platformFeeInCents),
      },
    }

    // If business has a connected Stripe account, use Connect to split payment
    if (business.stripe_account_no) {
      paymentIntentData.transfer_data = {
        destination: business.stripe_account_no,
      }
      paymentIntentData.application_fee_amount = platformFeeInCents
    }

    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

    // Return the client secret and other details
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amountInCents,
        platformFee: platformFeeInCents,
        businessTake: amountInCents - platformFeeInCents,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Payment intent error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
