// supabase/functions/delete-tag/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Accept both POST (for Adalo) and DELETE methods
  if (req.method !== "POST" && req.method !== "DELETE") {
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

    // Debug logging
    const url = new URL(req.url);
    console.log("=== DELETE TAG REQUEST ===");
    console.log("Full URL:", req.url);
    console.log("Pathname:", url.pathname);
    console.log("Query params:", url.searchParams.toString());
    console.log("Method:", req.method);

    let id: string | null = null;

    // Try to get ID from URL path first (Adalo sends /delete-tag/{id})
    const pathParts = url.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    // Check if last part is a number (the ID)
    if (lastPart && !isNaN(Number(lastPart))) {
      id = lastPart;
      console.log("ID from URL path:", id);
    }

    // If not in path, try query params
    if (!id) {
      id = url.searchParams.get("id");
      console.log("ID from query params:", id);
    }

    // If still not found, try to parse body (for POST requests)
    if (!id && req.method === "POST") {
      try {
        const text = await req.text();
        console.log("Request body:", text);
        if (text) {
          const body = JSON.parse(text);
          const requestData = body.fields || body.record || body.action?.fields || body;
          id = String(requestData.id || requestData.Id || requestData.tag_id || requestData.tagId || body.id || body.tag_id);
          console.log("ID from body:", id);
        }
      } catch (e) {
        console.log("Body parsing error:", e.message);
      }
    }

    console.log("Final Tag ID to delete:", id);

    if (!id || id === "undefined" || id === "null") {
      return new Response(
        JSON.stringify({ data: null, error: "Tag ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if tag exists first
    const { data: existingTag, error: fetchError } = await supabaseClient
      .from("tags")
      .select("id, name, type")
      .eq("id", id)
      .single();

    console.log("Existing tag:", existingTag);
    console.log("Fetch error:", fetchError);

    if (fetchError || !existingTag) {
      return new Response(
        JSON.stringify({ data: null, error: "Tag not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Manually delete related records first (cascade not working in DB)
    console.log("Deleting related business_tags...");
    const { error: businessTagsError } = await supabaseClient
      .from("business_tags")
      .delete()
      .eq("tag_id", id);

    if (businessTagsError) {
      console.log("Error deleting business_tags:", businessTagsError);
    }

    console.log("Deleting related offer_tags...");
    const { error: offerTagsError } = await supabaseClient
      .from("offer_tags")
      .delete()
      .eq("tag_id", id);

    if (offerTagsError) {
      console.log("Error deleting offer_tags:", offerTagsError);
    }

    // Now delete the tag
    console.log("Deleting tag...");
    const { error } = await supabaseClient
      .from("tags")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("Delete error:", error);
      throw error;
    }

    console.log("Tag deleted successfully");

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: parseInt(id),
          name: existingTag.name,
          deleted: true,
          message: "Tag permanently deleted",
        },
        error: null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.log("Caught error:", error);
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
