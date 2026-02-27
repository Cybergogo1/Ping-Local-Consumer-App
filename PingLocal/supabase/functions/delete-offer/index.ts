// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "DELETE, POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Allow DELETE or POST (for Adalo compatibility)
  if (req.method !== "DELETE" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ data: null, error: "Method not allowed. Use DELETE or POST." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const url = new URL(req.url);
    let id: string | null = null;
    let softDelete = url.searchParams.get("soft") === "true";

    // Try to get ID from URL path first (Adalo sends /delete-offer/{id})
    const pathParts = url.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && !isNaN(Number(lastPart))) {
      id = lastPart;
    }

    // If not in path, try query params
    if (!id) {
      id = url.searchParams.get("id");
    }

    // If still not found, try to parse body (for POST requests)
    if (!id || req.method === "POST") {
      try {
        const text = await req.text();
        if (text) {
          const body = JSON.parse(text);
          const requestData = body.fields || body.record || body.action?.fields || body;
          if (!id) {
            id = String(requestData.id || requestData.Id || requestData.offer_id || requestData.offerId || body.id || body.offer_id || "");
            if (id === "" || id === "undefined" || id === "null") id = null;
          }
          if (body.soft !== undefined) {
            softDelete = body.soft === true || body.soft === "true";
          }
          if (requestData.soft !== undefined) {
            softDelete = requestData.soft === true || requestData.soft === "true";
          }
        }
      } catch {
        // Body parsing failed, continue with URL/path params
      }
    }

    if (!id) {
      return new Response(
        JSON.stringify({ data: null, error: "Offer ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if offer exists first
    const { data: existingOffer, error: fetchError } = await supabaseClient
      .from("offers")
      .select("id, name, status")
      .eq("id", id)
      .single();

    if (fetchError || !existingOffer) {
      return new Response(
        JSON.stringify({ data: null, error: "Offer not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    if (softDelete) {
      // Soft delete - update status to 'deleted'
      const { data, error } = await supabaseClient
        .from("offers")
        .update({ status: "deleted" })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          data: { ...data, deleted: true, soft_delete: true },
          error: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Hard delete - permanently remove from database
      const { error } = await supabaseClient
        .from("offers")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          data: {
            id: parseInt(id),
            name: existingOffer.name,
            deleted: true,
            soft_delete: false,
            message: "Offer permanently deleted",
          },
          error: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ data: null, error: error.message, details: String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

/* To invoke:

  URL: https://pyufvauhjqfffezptuxl.supabase.co/functions/v1/delete-offer
  Method: DELETE or POST

  Headers:
    Authorization: Bearer YOUR_SUPABASE_ANON_KEY
    Content-Type: application/json

  Option 1 - Query params (DELETE):
    DELETE /delete-offer?id=123
    DELETE /delete-offer?id=123&soft=true  (soft delete)

  Option 2 - Body (POST, Adalo compatible):
    {
      "id": 123,
      "soft": true  // optional, defaults to hard delete
    }

  Response:
    {
      "data": {
        "id": 123,
        "name": "Offer Name",
        "deleted": true,
        "soft_delete": false,
        "message": "Offer permanently deleted"
      },
      "error": null
    }

*/
