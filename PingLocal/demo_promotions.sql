-- ============================================================================
-- DEMO PROMOTIONS FOR PING LOCAL
-- Run this in Supabase SQL Editor after uploading images to storage
-- ============================================================================

-- IMPORTANT: Update these image URLs after uploading to Supabase Storage
-- Upload the 3 example images from PingLocal/assets/example/ to your storage bucket
-- Then replace the placeholder URLs below with the actual public URLs

-- Image URL placeholders (update these after upload):
-- example.jpg -> Friends dining together image
-- bakery.jpg -> Toasted sandwich image
-- food.jpg -> Tapas spread image

-- ============================================================================
-- First, ensure we have a test business to link promotions to
-- ============================================================================

-- Insert a demo business if it doesn't exist (you may want to use an existing business_id instead)
INSERT INTO businesses (id, name, email, description, description_summary, location, phone_number, opening_times, location_area, category, is_signed_off, currently_trading)
VALUES
  (9001, 'The Brunch Club', 'hello@thebrunchclub.com', 'A cozy spot for all-day brunch and great coffee. We source locally and serve seasonally.', 'All-day brunch cafe with locally sourced ingredients', '42 High Street, Manchester', '0161 234 5678', 'Mon-Sun: 8am-4pm', 'Manchester', 'Food & Drink', true, true),
  (9002, 'Nonna''s Kitchen', 'info@nonnaskitchen.com', 'Authentic Italian cuisine passed down through generations. Fresh pasta made daily on-site.', 'Traditional Italian restaurant with homemade pasta', '15 Chapel Lane, Manchester', '0161 987 6543', 'Tue-Sun: 12pm-10pm', 'Manchester', 'Food & Drink', true, true),
  (9003, 'The Wellness Studio', 'bookings@wellnessstudio.com', 'Your sanctuary for yoga, pilates and meditation. Expert instructors and calming atmosphere.', 'Yoga and wellness centre', '8 Park Avenue, Manchester', '0161 555 1234', 'Mon-Sat: 6am-9pm', 'Manchester', 'Health & Wellness', true, true),
  (9004, 'Craft & Co', 'hello@craftandco.com', 'Independent craft beer bar with 20 rotating taps and a curated bottle selection from local breweries.', 'Craft beer bar with rotating taps', '27 Northern Quarter, Manchester', '0161 444 7890', 'Mon-Thu: 4pm-11pm, Fri-Sun: 12pm-12am', 'Manchester', 'Food & Drink', true, true),
  (9005, 'Glow Beauty Bar', 'appointments@glowbeautybar.com', 'Premium beauty treatments in a relaxed environment. Specialists in facials, nails and lash extensions.', 'Beauty salon specialising in facials and nails', '33 King Street, Manchester', '0161 222 3344', 'Mon-Sat: 9am-7pm', 'Manchester', 'Beauty', true, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO PROMOTIONS - Various types and configurations
-- ============================================================================

INSERT INTO offers (
  name, summary, full_description, special_notes, offer_type, requires_booking, booking_type,
  one_per_customer, price_discount, unit_of_measurement, quantity, status, business_id,
  business_name, featured_image, category, start_date, end_date, business_location, location_area
) VALUES

-- 1. PAY UPFRONT + SLOT BOOKING (quantity item)
(
  'Weekend Brunch for Two',
  'Full brunch spread with unlimited coffee for two people',
  'Treat yourself and a friend to our signature weekend brunch experience. Includes two mains from our brunch menu, a sharing platter of pastries, and unlimited filter coffee or tea. Perfect for catching up over a leisurely meal.',
  'Please mention Ping Local when you arrive. Dietary requirements can be accommodated - just let us know when booking.',
  'Pay up front',
  true,
  'online',
  false,
  32.00,
  'per booking',
  20,
  'Active',
  9001,
  'The Brunch Club',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/bakery.jpg"}',
  'Food & Drink',
  NOW(),
  NOW() + INTERVAL '30 days',
  '42 High Street, Manchester',
  'Manchester'
),

-- 2. PAY ON DAY + NO BOOKING REQUIRED (walk-in discount)
(
  '25% Off Your Bill',
  'Quarter off your total spend - no booking needed',
  'Pop in anytime and enjoy 25% off your entire bill. Valid for food and drinks. Whether it''s a quick coffee or a full meal, the discount applies to everything on your table.',
  'Show your Ping Local voucher to your server before ordering. Cannot be combined with other offers.',
  'Pay on the day',
  false,
  null,
  false,
  25.00,
  '% discount',
  50,
  'Active',
  9001,
  'The Brunch Club',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/bakery.jpg"}',
  'Food & Drink',
  NOW(),
  NOW() + INTERVAL '14 days',
  '42 High Street, Manchester',
  'Manchester'
),

-- 3. PAY UPFRONT + EXTERNAL BOOKING (restaurant with own booking system)
(
  'Pasta Masterclass',
  'Learn to make fresh pasta with our head chef',
  'Join our head chef Maria for an intimate pasta-making workshop. You''ll learn to make three types of fresh pasta from scratch, prepare traditional sauces, and sit down to enjoy your creations with a glass of wine. Take home recipe cards and a portion of fresh pasta.',
  'Booking required through our website. Please arrive 10 minutes early. Aprons provided.',
  'Pay up front',
  true,
  'external',
  true,
  45.00,
  'per person',
  12,
  'Active',
  9002,
  'Nonna''s Kitchen',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/food.jpg"}',
  'Food & Drink',
  NOW(),
  NOW() + INTERVAL '60 days',
  '15 Chapel Lane, Manchester',
  'Manchester'
),

-- 4. PAY ON DAY + CALL TO BOOK
(
  'Midweek Supper Deal',
  'Three courses for the price of two, Tuesday to Thursday',
  'Our midweek treat: choose any starter, main and dessert from our menu and we''ll knock off the price of your starter. That''s three courses of authentic Italian cooking for the price of two.',
  'Call to reserve your table. Available Tuesday to Thursday evenings only.',
  'Pay on the day',
  true,
  'call',
  false,
  null,
  'meal deal',
  30,
  'Active',
  9002,
  'Nonna''s Kitchen',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/bakery.jpg"}',
  'Food & Drink',
  NOW(),
  NOW() + INTERVAL '45 days',
  '15 Chapel Lane, Manchester',
  'Manchester'
),

-- 5. PAY UPFRONT + SLOT BOOKING (wellness/class)
(
  'Sunrise Yoga - 5 Class Bundle',
  'Five early morning yoga sessions to start your day right',
  'Kickstart your mornings with our popular sunrise yoga class. This bundle gives you five sessions valid over 8 weeks. Classes run at 6:30am and include a herbal tea afterwards. Suitable for all levels.',
  'Book your preferred dates through the app. Mats and props provided. Please arrive 5 minutes early.',
  'Pay up front',
  true,
  'online',
  true,
  35.00,
  'per bundle',
  25,
  'Active',
  9003,
  'The Wellness Studio',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/example.jpg"}',
  'Health & Wellness',
  NOW(),
  NOW() + INTERVAL '90 days',
  '8 Park Avenue, Manchester',
  'Manchester'
),

-- 6. PAY ON DAY + NO BOOKING (simple walk-in offer)
(
  'First Pint Free',
  'Your first craft beer is on us',
  'New to Craft & Co? We want to introduce you to our world of craft beer. Claim this offer and your first pint from our rotating tap selection is completely free. Our staff will help you pick something you''ll love.',
  'One per customer. Must be over 18. Show voucher at the bar.',
  'Pay on the day',
  false,
  null,
  true,
  7.50,
  'free item',
  100,
  'Active',
  9004,
  'Craft & Co',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/example.jpg"}',
  'Food & Drink',
  NOW(),
  NOW() + INTERVAL '21 days',
  '27 Northern Quarter, Manchester',
  'Manchester'
),

-- 7. PAY UPFRONT + SLOT BOOKING (beauty treatment)
(
  'Signature Glow Facial',
  'Our bestselling 60-minute facial treatment',
  'Experience our signature facial designed to leave your skin radiant. Includes deep cleanse, exfoliation, extractions if needed, a custom mask, and facial massage. We use premium products tailored to your skin type.',
  'Patch test required 48 hours before if you''re a new client. Please arrive makeup-free.',
  'Pay up front',
  true,
  'online',
  false,
  55.00,
  'per treatment',
  40,
  'Active',
  9005,
  'Glow Beauty Bar',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/bakery.jpg"}',
  'Beauty',
  NOW(),
  NOW() + INTERVAL '30 days',
  '33 King Street, Manchester',
  'Manchester'
),

-- 8. PAY ON DAY + EXTERNAL BOOKING (beauty with own system)
(
  'Gel Manicure',
  'Long-lasting gel polish that stays chip-free for weeks',
  'Treat your hands to a professional gel manicure. Includes nail shaping, cuticle care, and your choice of gel colour from our extensive range. Chip-free for up to three weeks.',
  'Book through our online system. Please avoid applying hand cream on the day of your appointment.',
  'Pay on the day',
  true,
  'external',
  false,
  28.00,
  'per treatment',
  60,
  'Active',
  9005,
  'Glow Beauty Bar',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/bakery.jpg"}',
  'Beauty',
  NOW(),
  NOW() + INTERVAL '45 days',
  '33 King Street, Manchester',
  'Manchester'
),

-- 9. PAY UPFRONT + NO BOOKING (prepaid voucher style)
(
  'Beer Tasting Flight',
  'Sample six craft beers with tasting notes',
  'Can''t decide what to drink? Our tasting flight lets you try six different beers served in taster glasses. Comes with a card explaining each beer''s flavour profile, origin and brewing style. A great way to discover your new favourite.',
  'Redeem at the bar anytime during opening hours. Selection varies based on what''s currently on tap.',
  'Pay up front',
  false,
  null,
  false,
  15.00,
  'per flight',
  80,
  'Active',
  9004,
  'Craft & Co',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/food.jpg"}',
  'Food & Drink',
  NOW(),
  NOW() + INTERVAL '60 days',
  '27 Northern Quarter, Manchester',
  'Manchester'
),

-- 10. PAY ON DAY + SLOT BOOKING (service with specific times)
(
  'Lunchtime Express Treatment',
  'Quick 30-minute pick-me-up facial',
  'Short on time? Our express facial delivers visible results in just half an hour. Perfect for a lunch break refresh. Includes cleanse, targeted treatment and moisturise. No downtime - head straight back to work with glowing skin.',
  'Available Monday to Friday, 11am-2pm slots only. Book in advance to secure your preferred time.',
  'Pay on the day',
  true,
  'online',
  false,
  null,
  'per treatment',
  50,
  'Active',
  9005,
  'Glow Beauty Bar',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/example.jpg"}',
  'Beauty',
  NOW(),
  NOW() + INTERVAL '30 days',
  '33 King Street, Manchester',
  'Manchester'
),

-- 11. PAY UPFRONT + CALL TO BOOK (high-value experience)
(
  'Private Dining Experience',
  'Exclusive 5-course tasting menu for up to 8 guests',
  'Host an unforgettable evening in our private dining room. Your group will enjoy a bespoke five-course tasting menu designed by our chef, with wine pairings available. Perfect for celebrations, anniversaries or impressing clients.',
  'Call to discuss your requirements and preferred date. Minimum 4 guests, maximum 8. Wine pairings additional.',
  'Pay up front',
  true,
  'call',
  true,
  280.00,
  'per table',
  8,
  'Active',
  9002,
  'Nonna''s Kitchen',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/food.jpg"}',
  'Food & Drink',
  NOW(),
  NOW() + INTERVAL '90 days',
  '15 Chapel Lane, Manchester',
  'Manchester'
),

-- 12. PAY ON DAY + NO BOOKING (percentage discount)
(
  '20% Student Discount',
  'Show your student ID and save',
  'Students get 20% off all treatments every day. Just show valid student ID when you arrive. Applies to all our services from facials to nail treatments.',
  'Valid student ID required. Cannot be combined with other promotions.',
  'Pay on the day',
  false,
  null,
  false,
  20.00,
  '% discount',
  200,
  'Active',
  9005,
  'Glow Beauty Bar',
  '{"url": "https://pyufvauhjqfffezptuxl.supabase.co/storage/v1/object/public/offer-images/bakery.jpg"}',
  'Beauty',
  NOW(),
  NOW() + INTERVAL '120 days',
  '33 King Street, Manchester',
  'Manchester'
);

-- ============================================================================
-- Optional: Add some slots for offers that use online booking
-- ============================================================================

-- Get the offer IDs for slot-based promotions (adjust based on actual inserted IDs)
-- You may need to run a SELECT first to get the correct offer IDs

-- Example slots for "Weekend Brunch for Two" (assuming it gets a specific ID)
-- INSERT INTO offer_slots (offer_id, slot_date, slot_time, capacity, booked_count, available)
-- SELECT o.id, date_val, time_val, 4, 0, true
-- FROM offers o
-- CROSS JOIN (
--   SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', '1 day')::date AS date_val
-- ) dates
-- CROSS JOIN (
--   SELECT '09:00'::time AS time_val
--   UNION SELECT '10:30'::time
--   UNION SELECT '12:00'::time
-- ) times
-- WHERE o.name = 'Weekend Brunch for Two'
-- AND EXTRACT(DOW FROM date_val) IN (0, 6); -- Weekend only

-- ============================================================================
-- Verify the inserts
-- ============================================================================

SELECT id, name, offer_type, requires_booking, booking_type, price_discount, quantity, business_name
FROM offers
WHERE business_id IN (9001, 9002, 9003, 9004, 9005)
ORDER BY id;
