export interface User {
  id: string;
  email: string;
  first_name?: string;
  surname?: string;
  phone_no?: string;
  loyalty_points: number;
  loyalty_tier: string;
  verified: boolean;
  profile_pic?: any;
  activate_notifications?: boolean;
  selected_location?: string;
  selected_location_id?: number;
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
}

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
  business_id?: string;
  offer_id?: string;
  created_at: string;
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
