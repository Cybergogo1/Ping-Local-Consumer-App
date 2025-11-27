import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "PUT, PATCH, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "PUT" && req.method !== "PATCH") {
    return new Response(
      JSON.stringify({ data: null, error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();

    const url = new URL(req.url);
    let id = url.searchParams.get("id");

    // If no ID in query params, try to get it from request body
    if (!id && body.id) {
      id = body.id;
    }

    if (!id) {
      return new Response(
        JSON.stringify({ data: null, error: "Contact ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      created_at: _created,
      ...updateData
    } = body;

    // Only include fields that were provided
    const cleanedData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "email",
      "phone_no",
      "role",
      "business_id",
    ];

    for (const field of allowedFields) {
      if (field in updateData) {
        cleanedData[field] = updateData[field];
      }
    }

    if (Object.keys(cleanedData).length === 0) {
      return new Response(
        JSON.stringify({ data: null, error: "No valid fields to update" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Add updated_at timestamp
    cleanedData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseClient
      .from("business_contacts")
      .update(cleanedData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return new Response(
        JSON.stringify({ data: null, error: "Contact not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    return new Response(JSON.stringify({ data, error: null }), {
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
