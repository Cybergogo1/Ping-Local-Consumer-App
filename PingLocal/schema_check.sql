


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."update_tokens_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tokens_modified_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."business_tags" (
    "business_id" integer NOT NULL,
    "tag_id" integer NOT NULL
);


ALTER TABLE "public"."business_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."businesses" (
    "name" "text" NOT NULL,
    "featured_image" "text",
    "email" "text",
    "description" "text",
    "description_summary" "text",
    "location" "text",
    "phone_number" "text",
    "opening_times" "text",
    "available_promotion_types" "text",
    "is_featured" boolean DEFAULT false,
    "is_signed_off" boolean DEFAULT false,
    "location_area" "text",
    "primary_user" "text",
    "owner_id" integer,
    "category" "text",
    "sub_categories" "text",
    "stripe_account_no" "text",
    "lead_rate" numeric,
    "cut_percent" numeric,
    "api_requires_sync" boolean DEFAULT false,
    "api_last_sync_date" timestamp without time zone,
    "currently_trading" boolean DEFAULT false,
    "created" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."businesses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "offer_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."image_gallery" (
    "id" integer NOT NULL,
    "imageable_type" "text",
    "imageable_id" integer,
    "image_data" "jsonb",
    "display_order" integer DEFAULT 0,
    "created" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."image_gallery" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."image_gallery_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."image_gallery_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."image_gallery_id_seq" OWNED BY "public"."image_gallery"."id";



CREATE TABLE IF NOT EXISTS "public"."location_areas" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "featured_image" "jsonb",
    "description" "text",
    "location" "text",
    "map_location" "text",
    "created" timestamp without time zone DEFAULT "now"(),
    "updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."location_areas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."location_areas_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."location_areas_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."location_areas_id_seq" OWNED BY "public"."location_areas"."id";



CREATE TABLE IF NOT EXISTS "public"."loyalty_points" (
    "id" integer NOT NULL,
    "name" "text",
    "amount" numeric,
    "user_id" integer,
    "reason" "text",
    "date_received" timestamp without time zone,
    "created" timestamp without time zone DEFAULT "now"(),
    "updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."loyalty_points" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."loyalty_points_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."loyalty_points_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."loyalty_points_id_seq" OWNED BY "public"."loyalty_points"."id";



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" integer NOT NULL,
    "name" "text",
    "content" "text",
    "read" boolean DEFAULT false,
    "trigger_user_id" integer,
    "receiver_id" integer,
    "offer_id" integer,
    "notifications_categories" "text",
    "created" timestamp without time zone DEFAULT "now"(),
    "updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."notifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notifications_id_seq" OWNED BY "public"."notifications"."id";



CREATE TABLE IF NOT EXISTS "public"."offer_slots" (
    "id" integer NOT NULL,
    "offer_id" integer,
    "slot_date" "date",
    "slot_time" time without time zone,
    "capacity" integer,
    "booked_count" integer DEFAULT 0,
    "available" boolean DEFAULT true,
    "created" timestamp without time zone DEFAULT "now"(),
    "updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."offer_slots" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."offer_slots_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."offer_slots_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."offer_slots_id_seq" OWNED BY "public"."offer_slots"."id";



CREATE TABLE IF NOT EXISTS "public"."offer_tags" (
    "offer_id" integer NOT NULL,
    "tag_id" integer NOT NULL
);


ALTER TABLE "public"."offer_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "summary" "text",
    "full_description" "text",
    "special_notes" "text",
    "offer_type" "text",
    "requires_booking" boolean DEFAULT false,
    "booking_type" "text",
    "one_per_customer" boolean DEFAULT false,
    "price_discount" numeric,
    "unit_of_measurement" "text",
    "quantity" integer,
    "number_sold" integer DEFAULT 0,
    "quantity_item" boolean DEFAULT false,
    "status" "text",
    "finish_time" timestamp without time zone,
    "booking_url" "text",
    "business_id" integer,
    "business_name" "text",
    "featured_image" "text",
    "category" "text",
    "customer_bill_input" boolean DEFAULT false,
    "start_date" timestamp without time zone,
    "end_date" timestamp without time zone,
    "created_by_id" integer,
    "created_by_name" "text",
    "signed_off_by_name" "text",
    "signed_off_by_id" integer,
    "rejection_reason" "text",
    "business_policy" "text",
    "policy_notes" "text",
    "pricing_complete" boolean DEFAULT false,
    "api_requires_sync" boolean DEFAULT false,
    "api_last_sync_date" timestamp without time zone,
    "business_location" "text",
    "location_area" "text",
    "change_button_text" "text",
    "custom_feed_text" "text",
    "created" timestamp without time zone DEFAULT "now"(),
    "updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."offers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."offers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."offers_id_seq" OWNED BY "public"."offers"."id";



CREATE TABLE IF NOT EXISTS "public"."purchase_tokens" (
    "id" bigint NOT NULL,
    "name" "text",
    "purchase_type" "text",
    "customer_price" numeric(10,2),
    "ping_local_take" numeric(10,2),
    "redeemed" boolean DEFAULT false,
    "cancelled" boolean DEFAULT false,
    "offer_slot" "text",
    "offer_name" "text",
    "offer_id" bigint,
    "promotion_token" "text",
    "user_email" "text",
    "user_id" bigint,
    "ping_invoiced" boolean DEFAULT false,
    "ping_invoice_date" timestamp with time zone,
    "api_requires_sync" boolean DEFAULT false,
    "api_last_sync_date" timestamp with time zone,
    "created" timestamp with time zone DEFAULT "now"(),
    "updated" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "purchase_tokens_purchase_type_check" CHECK (("purchase_type" = ANY (ARRAY['Pay up front'::"text", 'Pay on the day'::"text"])))
);


ALTER TABLE "public"."purchase_tokens" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."purchase_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."purchase_tokens_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."purchase_tokens_id_seq" OWNED BY "public"."purchase_tokens"."id";



CREATE TABLE IF NOT EXISTS "public"."redemption_tokens" (
    "id" bigint NOT NULL,
    "name" "text",
    "scanned" boolean DEFAULT false,
    "customer_name" "text",
    "customer_id" bigint,
    "promotion_id" bigint,
    "business_name" "text",
    "status" "text",
    "bill_input_total" numeric(10,2),
    "completed" boolean DEFAULT false,
    "completed_timestamp" numeric,
    "time_redeemed" timestamp with time zone,
    "date_redeemed" "date",
    "offer_name" "text",
    "purchase_token" "text",
    "purchase_token_id" bigint,
    "api_requires_sync" boolean DEFAULT false,
    "api_last_sync_date" timestamp with time zone,
    "adjusted_bill" numeric(10,2),
    "created" timestamp with time zone DEFAULT "now"(),
    "updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."redemption_tokens" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."redemption_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."redemption_tokens_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."redemption_tokens_id_seq" OWNED BY "public"."redemption_tokens"."id";



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "created" timestamp without time zone DEFAULT "now"(),
    "updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."tags_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tags_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tags_id_seq" OWNED BY "public"."tags"."id";



CREATE TABLE IF NOT EXISTS "public"."user_offers" (
    "id" integer NOT NULL,
    "user_id" integer,
    "offer_id" integer,
    "business_id" integer,
    "quantity" integer DEFAULT 1,
    "total_paid" numeric,
    "party_size" integer,
    "booking_slot_date" "date",
    "booking_slot_time" time without time zone,
    "status" "text",
    "qr_code_data" "text",
    "claimed_at" timestamp without time zone DEFAULT "now"(),
    "redeemed_at" timestamp without time zone,
    "loyalty_points_earned" integer DEFAULT 0,
    "created" timestamp without time zone DEFAULT "now"(),
    "updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_offers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_offers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_offers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_offers_id_seq" OWNED BY "public"."user_offers"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" integer NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "surname" "text",
    "password" "text",
    "phone_no" "text",
    "profile_pic" "jsonb",
    "loyalty_points" integer DEFAULT 0,
    "is_admin" boolean DEFAULT false,
    "is_business" boolean DEFAULT false,
    "viewing_date" timestamp without time zone,
    "last_notify_clear" timestamp without time zone,
    "business" "text",
    "activate_notifications" boolean DEFAULT false,
    "favourite_business" "text",
    "verification_code" "text",
    "verified" boolean DEFAULT false,
    "api_requires_sync" boolean DEFAULT false,
    "api_last_sync_date" timestamp without time zone,
    "loyalty_tier" "text" DEFAULT 'Ping Local Member'::"text",
    "selected_location" "text",
    "selected_location_id" integer,
    "selected_tags" "text"[],
    "created" timestamp without time zone DEFAULT "now"(),
    "updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_id_seq" OWNED BY "public"."users"."id";



ALTER TABLE ONLY "public"."image_gallery" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."image_gallery_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."location_areas" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."location_areas_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."loyalty_points" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."loyalty_points_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."offer_slots" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."offer_slots_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."offers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."offers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."purchase_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."purchase_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."redemption_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."redemption_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tags" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tags_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_offers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_offers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."business_tags"
    ADD CONSTRAINT "business_tags_pkey" PRIMARY KEY ("business_id", "tag_id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_offer_id_key" UNIQUE ("user_id", "offer_id");



ALTER TABLE ONLY "public"."image_gallery"
    ADD CONSTRAINT "image_gallery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_areas"
    ADD CONSTRAINT "location_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_points"
    ADD CONSTRAINT "loyalty_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_slots"
    ADD CONSTRAINT "offer_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_tags"
    ADD CONSTRAINT "offer_tags_pkey" PRIMARY KEY ("offer_id", "tag_id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_tokens"
    ADD CONSTRAINT "purchase_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."redemption_tokens"
    ADD CONSTRAINT "redemption_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_offers"
    ADD CONSTRAINT "user_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_favorites_offer_id" ON "public"."favorites" USING "btree" ("offer_id");



CREATE INDEX "idx_favorites_user_id" ON "public"."favorites" USING "btree" ("user_id");



CREATE INDEX "idx_purchase_tokens_offer_id" ON "public"."purchase_tokens" USING "btree" ("offer_id");



CREATE INDEX "idx_purchase_tokens_redeemed" ON "public"."purchase_tokens" USING "btree" ("redeemed");



CREATE INDEX "idx_purchase_tokens_user_email" ON "public"."purchase_tokens" USING "btree" ("user_email");



CREATE INDEX "idx_purchase_tokens_user_id" ON "public"."purchase_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_redemption_tokens_customer_id" ON "public"."redemption_tokens" USING "btree" ("customer_id");



CREATE INDEX "idx_redemption_tokens_promotion_id" ON "public"."redemption_tokens" USING "btree" ("promotion_id");



CREATE INDEX "idx_redemption_tokens_purchase_token_id" ON "public"."redemption_tokens" USING "btree" ("purchase_token_id");



CREATE INDEX "idx_redemption_tokens_status" ON "public"."redemption_tokens" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "update_purchase_tokens_modtime" BEFORE UPDATE ON "public"."purchase_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_tokens_modified_column"();

ALTER TABLE "public"."purchase_tokens" DISABLE TRIGGER "update_purchase_tokens_modtime";



CREATE OR REPLACE TRIGGER "update_redemption_tokens_modtime" BEFORE UPDATE ON "public"."redemption_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_tokens_modified_column"();

ALTER TABLE "public"."redemption_tokens" DISABLE TRIGGER "update_redemption_tokens_modtime";



ALTER TABLE ONLY "public"."business_tags"
    ADD CONSTRAINT "business_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id");



ALTER TABLE ONLY "public"."loyalty_points"
    ADD CONSTRAINT "loyalty_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_trigger_user_id_fkey" FOREIGN KEY ("trigger_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."offer_slots"
    ADD CONSTRAINT "offer_slots_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id");



ALTER TABLE ONLY "public"."offer_tags"
    ADD CONSTRAINT "offer_tags_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id");



ALTER TABLE ONLY "public"."offer_tags"
    ADD CONSTRAINT "offer_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id");



ALTER TABLE ONLY "public"."user_offers"
    ADD CONSTRAINT "user_offers_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id");



ALTER TABLE ONLY "public"."user_offers"
    ADD CONSTRAINT "user_offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



CREATE POLICY "Users can delete own favorites" ON "public"."favorites" FOR DELETE USING (true);



CREATE POLICY "Users can insert own favorites" ON "public"."favorites" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can view own favorites" ON "public"."favorites" FOR SELECT USING (true);



ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tokens_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tokens_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tokens_modified_column"() TO "service_role";



GRANT ALL ON TABLE "public"."business_tags" TO "anon";
GRANT ALL ON TABLE "public"."business_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."business_tags" TO "service_role";



GRANT ALL ON TABLE "public"."businesses" TO "anon";
GRANT ALL ON TABLE "public"."businesses" TO "authenticated";
GRANT ALL ON TABLE "public"."businesses" TO "service_role";



GRANT ALL ON TABLE "public"."favorites" TO "anon";
GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";



GRANT ALL ON TABLE "public"."image_gallery" TO "anon";
GRANT ALL ON TABLE "public"."image_gallery" TO "authenticated";
GRANT ALL ON TABLE "public"."image_gallery" TO "service_role";



GRANT ALL ON SEQUENCE "public"."image_gallery_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."image_gallery_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."image_gallery_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."location_areas" TO "anon";
GRANT ALL ON TABLE "public"."location_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."location_areas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."location_areas_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."location_areas_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."location_areas_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_points" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_points" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_points" TO "service_role";



GRANT ALL ON SEQUENCE "public"."loyalty_points_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."loyalty_points_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."loyalty_points_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."offer_slots" TO "anon";
GRANT ALL ON TABLE "public"."offer_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."offer_slots" TO "service_role";



GRANT ALL ON SEQUENCE "public"."offer_slots_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."offer_slots_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."offer_slots_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."offer_tags" TO "anon";
GRANT ALL ON TABLE "public"."offer_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."offer_tags" TO "service_role";



GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."offers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."offers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."offers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_tokens" TO "anon";
GRANT ALL ON TABLE "public"."purchase_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_tokens" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_tokens_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_tokens_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_tokens_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."redemption_tokens" TO "anon";
GRANT ALL ON TABLE "public"."redemption_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."redemption_tokens" TO "service_role";



GRANT ALL ON SEQUENCE "public"."redemption_tokens_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."redemption_tokens_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."redemption_tokens_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_offers" TO "anon";
GRANT ALL ON TABLE "public"."user_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."user_offers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_offers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_offers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_offers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







