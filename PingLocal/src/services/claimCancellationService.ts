import { supabase } from '../lib/supabase';
import { PurchaseToken, Offer } from '../types/database';
import { cancelScheduledNotification } from './notificationService';
import { differenceInHours, parseISO } from 'date-fns';

/**
 * Check if a claim can be cancelled by the user.
 *
 * Cancellation is only allowed when ALL conditions are met:
 * 1. It's a "Pay on the day" offer (customer_price is null)
 * 2. Offer requires booking (requires_booking OR booking_type is 'external'/'call')
 * 3. User has confirmed a booking date (booking_confirmed is true)
 * 4. Booking date is MORE than 48 hours away
 */
export function canCancelClaim(purchaseToken: PurchaseToken, offer?: Offer): boolean {
  // Must not already be redeemed or cancelled
  if (purchaseToken.redeemed || purchaseToken.cancelled) {
    return false;
  }

  // Must be "Pay on the day" (no customer_price)
  if (purchaseToken.customer_price !== null && purchaseToken.customer_price !== undefined) {
    return false;
  }

  // Must require booking - check the offer data
  const offerData = offer || purchaseToken.offers;
  if (!offerData) {
    return false;
  }

  const requiresBooking = offerData.requires_booking ||
    offerData.booking_type === 'external' ||
    offerData.booking_type === 'call';

  if (!requiresBooking) {
    return false;
  }

  // Must have confirmed booking with a date
  if (!purchaseToken.booking_confirmed) {
    return false;
  }

  if (!purchaseToken.booking_date) {
    return false;
  }

  // Booking must be more than 48 hours away
  try {
    const bookingDate = parseISO(purchaseToken.booking_date);
    const hoursUntilBooking = differenceInHours(bookingDate, new Date());
    return hoursUntilBooking > 48;
  } catch {
    return false;
  }
}

export interface CancelClaimResult {
  success: boolean;
  error?: string;
}

/**
 * Cancel a claimed offer.
 *
 * This will:
 * 1. Set cancelled: true on the purchase_token
 * 2. Decrement the offer's number_sold
 * 3. If slot-based, decrement the offer_slot's booked_count
 * 4. Cancel any scheduled booking reminder notification
 */
export async function cancelClaim(purchaseToken: PurchaseToken): Promise<CancelClaimResult> {
  try {
    // 1. Cancel the purchase token
    const { error: tokenError } = await supabase
      .from('purchase_tokens')
      .update({ cancelled: true })
      .eq('id', purchaseToken.id);

    if (tokenError) {
      throw new Error(`Failed to cancel claim: ${tokenError.message}`);
    }

    // 2. Decrement number_sold on the offer
    if (purchaseToken.offer_id) {
      const { data: offer, error: offerFetchError } = await supabase
        .from('offers')
        .select('number_sold')
        .eq('id', purchaseToken.offer_id)
        .single();

      if (offerFetchError) {
        console.warn('Could not fetch offer for number_sold update:', offerFetchError);
      } else if (offer) {
        const newNumberSold = Math.max(0, (offer.number_sold || 1) - 1);
        const { error: offerUpdateError } = await supabase
          .from('offers')
          .update({ number_sold: newNumberSold })
          .eq('id', purchaseToken.offer_id);

        if (offerUpdateError) {
          console.warn('Could not update offer number_sold:', offerUpdateError);
        }
      }
    }

    // 3. If slot-based, decrement booked_count
    if (purchaseToken.offer_slot) {
      const { data: slot, error: slotFetchError } = await supabase
        .from('offer_slots')
        .select('booked_count')
        .eq('id', purchaseToken.offer_slot)
        .single();

      if (slotFetchError) {
        console.warn('Could not fetch slot for booked_count update:', slotFetchError);
      } else if (slot) {
        // Default party size to 1 if not stored
        const partySize = 1;
        const newBookedCount = Math.max(0, (slot.booked_count || 1) - partySize);
        const { error: slotUpdateError } = await supabase
          .from('offer_slots')
          .update({ booked_count: newBookedCount })
          .eq('id', purchaseToken.offer_slot);

        if (slotUpdateError) {
          console.warn('Could not update slot booked_count:', slotUpdateError);
        }
      }
    }

    // 4. Cancel scheduled notification reminder
    if (purchaseToken.booking_reminder_id) {
      try {
        await cancelScheduledNotification(purchaseToken.booking_reminder_id);
      } catch (notifError) {
        console.warn('Could not cancel booking reminder notification:', notifError);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling claim:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel claim'
    };
  }
}
