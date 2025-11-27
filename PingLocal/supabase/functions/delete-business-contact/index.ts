// supabase/functions/delete-business-contact/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Debug logging
    const url = new URL(req.url);
    console.log("Full URL:", req.url);
    console.log("Query params:", url.searchParams.toString());
    console.log("Method:", req.method);

    // Try to get ID from URL first (for Adalo compatibility)
    let contactId = url.searchParams.get("id");
    console.log("ID from query params:", contactId);

    // If not in URL, try to parse body
    if (!contactId) {
      try {
        const text = await req.text();
        console.log("Request body:", text);
        if (text) {
          const body = JSON.parse(text);
          contactId = body.contact_id || body.contactId || body.id;
          console.log("ID from body:", contactId);
        }
      } catch (e) {
        console.log("Body parsing error:", e.message);
      }
    }

    if (!contactId) throw new Error("contact_id is required");

    const { data: contact } = await supabaseClient
      .from("business_contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    if (!contact) throw new Error(`Contact with id ${contactId} not found`);

    const { error } = await supabaseClient
      .from("business_contacts")
      .delete()
      .eq("id", contactId);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, deleted_contact: contact }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
