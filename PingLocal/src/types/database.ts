export interface User {
  id: string;
  email: string;
  first_name?: string;
  surname?: string;
  phone_no?: string;
  loyalty_points: number;
  loyalty_tier: string;
  verified: boolean;
  onboarding_completed: boolean;
  notification_permission_status: 'not_asked' | 'granted' | 'denied' | 'dismissed';
  profile_pic?: any;
  activate_notifications?: boolean;
  selected_location?: string;
  selected_location_id?: number;
  pending_level_up?: boolean;
  pending_level_up_from?: string;
  pending_level_up_to?: string;
  created: string;
  updated: string;
}

export interface Business {
  id: number;
  name: string;
  email?: string;
  description?: string;
  description_summary?: string;
  location?: string;
  location_area?: string;
  latitude?: number;
  longitude?: number;
  phone_number?: string;
  opening_times?: string;
  featured_image?: string;
  category?: string;
  sub_categories?: string;
  is_featured: boolean;
  is_signed_off: boolean;
  currently_trading: boolean;
  available_promotion_types?: string;
  stripe_account_no?: string;
  lead_rate?: number;
  cut_percent?: number;
  created: string;
  updated: string;
}

export interface Offer {
  id: number;
  name: string;
  summary?: string;
  full_description?: string;
  special_notes?: string;
  offer_type?: string; // 'Pay up front' or 'Pay on the day'
  requires_booking: boolean;
  booking_type?: string; // 'external', 'call', null
  booking_url?: string;
  one_per_customer: boolean;
  price_discount?: number;
  unit_of_measurement?: string;
  quantity?: number;
  number_sold: number;
  quantity_item: boolean;
  status?: string; // 'Signed Off' = live, 'draft' = pending
  start_date?: string;
  end_date?: string;
  finish_time?: string;
  business_id?: number;
  business_name?: string;
  featured_image?: string;
  category?: string;
  customer_bill_input: boolean;
  change_button_text?: string;
  custom_feed_text?: string;
  business_policy?: string;
  policy_notes?: string;
  location_area?: string;
  business_location?: string;
  created: string;
  updated: string;
  // Joined data
  businesses?: Business;
  gallery_images?: ImageGalleryItem[];
}

// Legacy - keeping for reference but using PurchaseToken/RedemptionToken instead
export interface UserOffer {
  id: string;
  user_id: string;
  offer_id: string;
  business_id: string;
  status: 'claimed' | 'purchased' | 'redeemed' | 'expired';
  qr_code_data: string;
  party_size?: number;
  amount_paid?: number;
  points_earned?: number;
  claimed_at: string;
  redeemed_at?: string;
  created_at: string;
}

// Purchase Token - Created when user claims/buys an offer (QR code = this ID)
// Column names match actual Supabase table
export interface PurchaseToken {
  id: number;
  name?: string;
  purchase_type?: string;
  customer_price?: number;
  ping_local_take?: number;
  redeemed: boolean;
  cancelled: boolean;
  offer_slot?: number;
  offer_name?: string;
  offer_id?: number;
  promotion_token?: string;
  user_email?: string;
  user_id?: number;
  ping_invoiced: boolean;
  ping_invoice_date?: string;
  api_requires_sync: boolean;
  api_last_sync_date?: string;
  created: string;
  updated: string;
  // External/call booking tracking
  booking_date?: string; // Date user says they booked for (YYYY-MM-DD)
  booking_confirmed?: boolean; // Whether user confirmed they made a booking
  booking_reminder_id?: string; // ID of scheduled reminder notification
  // Joined data
  offers?: Offer;
  businesses?: Business;
  offer_slots?: OfferSlot;
}

// Redemption Token - Created when user opens QR, tracks redemption process
export interface RedemptionToken {
  id: number;
  purchase_token_id: number;
  scanned: boolean;
  status: 'Pending' | 'In Progress' | 'Finished' | 'Cancelled';
  bill_input_total?: number; // Bill amount entered by business (Pay on Day)
  customer_name?: string;
  customer_id?: number;
  offer_name?: string;
  business_name?: string;
  promotion_id?: number;
  completed: boolean;
  time_redeemed?: string;
  date_redeemed?: string;
  created: string;
  updated: string;
  // Legacy alias for bill_input_total (used in navigation)
  bill_amount?: number;
  // Joined data
  purchase_tokens?: PurchaseToken;
}

// Offer Slot - Available booking slots for an offer
export interface OfferSlot {
  id: number;
  offer_id: number;
  slot_date: string; // YYYY-MM-DD
  slot_time: string; // HH:MM
  capacity: number;
  booked_count: number;
  available: boolean;
  created: string;
  updated: string;
  // Computed
  available_capacity?: number;
}

export interface Tag {
  id: string;
  name: string;
  type: 'category' | 'tag';
}

export interface LocationArea {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  offer_id?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  business_id?: number;
  offer_id?: number;
  created_at: string;
}

export interface ImageGalleryItem {
  id: number;
  imageable_type: string;
  imageable_id: number;
  image_url: string;
  display_order: number;
  created: string;
}

export interface OpeningTime {
  id: number;
  name: string; // Day name: Monday, Tuesday, etc.
  day_number: number; // 1=Monday, 2=Tuesday, ... 7=Sunday
  is_open: boolean;
  opening_time?: string; // ISO timestamp
  closing_time?: string; // ISO timestamp
  is_special_date: boolean;
  special_date?: string;
  business_name: string;
  created: string;
  updated: string;
}

// Tier thresholds
export const TIER_THRESHOLDS = {
  member: { min: 0, max: 10 },
  hero: { min: 10, max: 1200 },
  champion: { min: 1200, max: 10000 },
  legend: { min: 10000, max: Infinity },
} as const;

export type TierName = keyof typeof TIER_THRESHOLDS;

export function getTierFromPoints(points: number): TierName {
  if (points >= TIER_THRESHOLDS.legend.min) return 'legend';
  if (points >= TIER_THRESHOLDS.champion.min) return 'champion';
  if (points >= TIER_THRESHOLDS.hero.min) return 'hero';
  return 'member';
}
