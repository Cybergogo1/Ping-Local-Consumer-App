import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const businessId = url.searchParams.get("business_id");
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const tag = url.searchParams.get("tag");
    const locationArea = url.searchParams.get("location_area");
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");

    // Build select query with appropriate joins based on filters
    let selectQuery = `
      *,
      businesses!offers_business_id_fkey (
        id,
        name,
        featured_image,
        location_area,
        location,
        is_signed_off
      )
    `;

    // If filtering by category or tag, add joins for offer_tags and tags
    if (category || tag) {
      selectQuery = `
        *,
        businesses!offers_business_id_fkey (
          id,
          name,
          featured_image,
          location_area,
          location,
          is_signed_off
        ),
        offer_tags!inner (
          tag_id,
          tags!inner (
            id,
            name,
            type
          )
        )
      `;
    }

    let query = supabaseClient
      .from("offers")
      .select(selectQuery);

    // Filter by specific offer ID
    if (id) {
      query = query.eq("id", id);
    }

    // Filter by business ID
    if (businessId) {
      query = query.eq("business_id", businessId);
    }

    // Filter by status (default to 'Signed Off' for live offers)
    if (status) {
      query = query.eq("status", status);
    }

    // Filter by category using the junction table
    if (category) {
      query = query.eq("offer_tags.tags.name", category).eq("offer_tags.tags.type", "Category");
    }

    // Filter by tag using the junction table
    if (tag) {
      query = query.eq("offer_tags.tags.name", tag).eq("offer_tags.tags.type", "tags");
    }

    // Filter by location area using business's location_area
    if (locationArea) {
      query = query.eq("businesses.location_area", locationArea);
    }

    // Order by created date descending (newest first)
    query = query.order("created", { ascending: false });

    // Pagination
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    if (offset) {
      query = query.range(
        parseInt(offset),
        parseInt(offset) + (parseInt(limit || "10") - 1)
      );
    }

    const { data, error } = id ? await query.single() : await query;

    if (error) {
      throw error;
    }

    // Deduplicate results if filtering by category or tag (junction table can return duplicates)
    let uniqueData = data;
    if (Array.isArray(data) && (category || tag)) {
      const seenIds = new Set();
      uniqueData = data.filter((record: any) => {
        if (seenIds.has(record.id)) {
          return false;
        }
        seenIds.add(record.id);
        return true;
      });
    }

    // Transform to Airtable-style format for Adalo compatibility
    const transformRecord = (record: Record<string, unknown>) => {
      const { id, created, ...fields } = record;
      return {
        id: String(id),
        fields,
        createdTime: created,
      };
    };

    const records = Array.isArray(uniqueData)
      ? uniqueData.map(transformRecord)
      : [transformRecord(uniqueData)];

    return new Response(JSON.stringify({ records }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
