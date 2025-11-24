// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed. Use POST.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 405
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // Parse Adalo-formatted request body
    const body = await req.json();
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
    };
    // Check if updating (id provided) or creating
    let result;
    if (body.id) {
      // Update existing
      result = await supabaseClient.from('businesses').update(businessData).eq('id', body.id).select().single();
    } else {
      // Create new
      result = await supabaseClient.from('businesses').insert({
        ...businessData,
        created: new Date().toISOString()
      }).select().single();
    }
    if (result.error) throw result.error;
    // Transform back to Adalo format
    const business = result.data;
    const response = {
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
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: String(error)
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
}) /* To invoke from Adalo:

  URL: https://pyufvauhjqfffezptuxl.supabase.co/functions/v1/create-business
  Method: POST

  Headers:
    Authorization: Bearer YOUR_SUPABASE_ANON_KEY
    Content-Type: application/json

  Body (Adalo format):
  {
    "Name": "Business Name",
    "Email": "email@example.com",
    "Description": "...",
    ...
  }

  To update, include "id" in the body.

*/ ;
