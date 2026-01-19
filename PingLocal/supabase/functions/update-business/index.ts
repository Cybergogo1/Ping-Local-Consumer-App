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
  // Only allow PUT/PATCH requests for updates
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed. Use PUT, PATCH, or POST.'
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

    // Debug logging - see what Adalo is sending
    console.log('=== UPDATE BUSINESS REQUEST ===');
    console.log('Request body:', JSON.stringify(body, null, 2));
    console.log('Stripe Account No. value:', body['Stripe Account No.']);
    console.log('All keys in body:', Object.keys(body));

    // Get id from body OR from URL path (e.g., /update-business/123)
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const urlId = pathParts[pathParts.length - 1];
    const id = body.id || (urlId && urlId !== 'update-business' ? urlId : null);
    // Require id for updates
    if (!id) {
      return new Response(JSON.stringify({
        error: 'id is required for updates'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Build update object - only include fields that are provided
    const businessData = {
      updated: new Date().toISOString()
    };
    // Map Adalo fields to Supabase fields - only if provided
    if (body.Name !== undefined) businessData.name = body.Name;
    if (body['Featured Image'] !== undefined) businessData.featured_image = body['Featured Image'];
    if (body.Email !== undefined) businessData.email = body.Email;
    if (body.Description !== undefined) businessData.description = body.Description;
    if (body.DescriptionSummary !== undefined) businessData.description_summary = body.DescriptionSummary;
    if (body.Location !== undefined) businessData.location = body.Location;
    if (body['Phone Number'] !== undefined) businessData.phone_number = body['Phone Number'];
    if (body['Opening Times'] !== undefined) businessData.opening_times = body['Opening Times'];
    if (body.AvailablePromotionTypes !== undefined) businessData.available_promotion_types = body.AvailablePromotionTypes;
    if (body['IsFeatured?'] !== undefined) businessData.is_featured = body['IsFeatured?'];
    if (body['IsSignedOff?'] !== undefined) businessData.is_signed_off = body['IsSignedOff?'];
    if (body['Location Area'] !== undefined) businessData.location_area = body['Location Area'];
    if (body['Primary User'] !== undefined) businessData.primary_user = body['Primary User'];
    if (body.OwnerID !== undefined) businessData.owner_id = body.OwnerID;
    if (body.Category !== undefined) businessData.category = body.Category;
    if (body['Sub Categories'] !== undefined) businessData.sub_categories = body['Sub Categories'];
    // Accept both with and without period for Stripe Account No
    const stripeAcctNo = body['Stripe Account No'] ?? body['Stripe Account No.'];
    if (stripeAcctNo !== undefined && stripeAcctNo !== null && typeof stripeAcctNo === 'string') {
      businessData.stripe_account_no = stripeAcctNo;
    }
    if (body.LeadRate !== undefined) businessData.lead_rate = body.LeadRate;
    if (body.CutPercent !== undefined) businessData.cut_percent = body.CutPercent;
    if (body['Currently Trading'] !== undefined) businessData.currently_trading = body['Currently Trading'];
    if (body.latitude !== undefined) businessData.latitude = body.latitude;
    if (body.longitude !== undefined) businessData.longitude = body.longitude;
    // Update the business
    const { data, error } = await supabaseClient.from('businesses').update(businessData).eq('id', id).select().single();
    if (error) throw error;
    // Transform back to Adalo format
    const response = {
      id: data.id,
      Name: data.name,
      'Featured Image': data.featured_image,
      Email: data.email,
      Description: data.description,
      DescriptionSummary: data.description_summary,
      Location: data.location,
      'Phone Number': data.phone_number,
      'Opening Times': data.opening_times,
      'AvailablePromotionTypes': data.available_promotion_types,
      'IsFeatured?': data.is_featured,
      'IsSignedOff?': data.is_signed_off,
      'Location Area': data.location_area,
      'Primary User': data.primary_user,
      OwnerID: data.owner_id,
      Category: data.category,
      'Sub Categories': data.sub_categories,
      'Stripe Account No': data.stripe_account_no,
      LeadRate: data.lead_rate,
      CutPercent: data.cut_percent,
      'Currently Trading': data.currently_trading,
      latitude: data.latitude,
      longitude: data.longitude,
      Created: data.created,
      Updated: data.updated
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

  URL: https://pyufvauhjqfffezptuxl.supabase.co/functions/v1/update-business
  Method: PUT or PATCH or POST

  Headers:
    Authorization: Bearer YOUR_SUPABASE_ANON_KEY
    Content-Type: application/json

  Body (Adalo format) - id is REQUIRED, other fields are optional:
  {
    "id": 123,
    "Description": "New description text"
  }

  Only the fields you include will be updated.

*/ ;
