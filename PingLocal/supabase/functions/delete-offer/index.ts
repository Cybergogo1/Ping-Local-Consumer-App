import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "DELETE") {
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ data: null, error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const softDelete = url.searchParams.get("soft") === "true";

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
      // Soft delete - update status to 'deleted' or 'archived'
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
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
