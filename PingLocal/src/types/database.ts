export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  loyalty_points: number;
  tier: 'member' | 'hero' | 'champion' | 'legend';
  is_verified: boolean;
  has_completed_onboarding: boolean;
  notification_preferences?: {
    push_enabled: boolean;
    email_enabled: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  location_area_id: string;
  address: string;
  phone?: string;
  website?: string;
  featured_image_url?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  is_featured: boolean;
  stripe_account_id?: string;
  created_at: string;
}

export interface Offer {
  id: string;
  business_id: string;
  title: string;
  description: string;
  original_price: number;
  offer_price: number;
  discount_percentage?: number;
  payment_type: 'pay_upfront' | 'pay_on_day';
  booking_required: boolean;
  booking_type?: 'none' | 'external_url' | 'phone';
  booking_url?: string;
  booking_phone?: string;
  max_party_size?: number;
  terms_and_conditions?: string;
  image_url?: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'signed_off' | 'expired';
  created_at: string;
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
