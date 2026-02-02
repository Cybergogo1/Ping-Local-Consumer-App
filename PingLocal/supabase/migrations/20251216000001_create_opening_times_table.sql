-- Create opening_times table for business opening hours
-- Each business has 7 rows (one per day of the week)

CREATE TABLE IF NOT EXISTS "public"."opening_times" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL, -- Day name: Monday, Tuesday, etc.
    "day_number" INTEGER NOT NULL, -- 1=Monday, 2=Tuesday, ... 7=Sunday
    "is_open" BOOLEAN DEFAULT FALSE,
    "opening_time" TIMESTAMP,
    "closing_time" TIMESTAMP,
    "is_special_date" BOOLEAN DEFAULT FALSE,
    "special_date" DATE,
    "business_name" TEXT NOT NULL, -- References businesses by name
    "created" TIMESTAMP DEFAULT NOW(),
    "updated" TIMESTAMP DEFAULT NOW()
);

-- Create index for faster business lookup
CREATE INDEX idx_opening_times_business_name ON opening_times(business_name);
CREATE INDEX idx_opening_times_day_number ON opening_times(day_number);

-- Grant permissions
GRANT ALL ON TABLE "public"."opening_times" TO "anon";
GRANT ALL ON TABLE "public"."opening_times" TO "authenticated";
GRANT ALL ON TABLE "public"."opening_times" TO "service_role";
GRANT ALL ON SEQUENCE "public"."opening_times_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."opening_times_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."opening_times_id_seq" TO "service_role";
