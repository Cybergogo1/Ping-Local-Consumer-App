import { supabase } from '../lib/supabase';
import { LoyaltyPoints } from '../types/database';

/**
 * Response type for loyalty points operations
 */
interface LoyaltyPointsResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Parameters for creating a loyalty points record
 */
interface CreateLoyaltyPointsParams {
  user_id: string;
  points: number;
  reason: string;
  offer_id?: string;
}

/**
 * Parameters for updating a loyalty points record
 */
interface UpdateLoyaltyPointsParams {
  points?: number;
  reason?: string;
  offer_id?: string | null;
}

/**
 * Parameters for querying loyalty points
 */
interface GetLoyaltyPointsParams {
  user_id?: string;
  offer_id?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'points';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Get a single loyalty points record by ID
 * @param id The loyalty points record ID
 * @returns The loyalty points record or null if not found
 */
export async function getLoyaltyPointsById(
  id: string
): Promise<LoyaltyPointsResponse<LoyaltyPoints>> {
  try {
    const { data, error } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching loyalty points by ID:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching loyalty points by ID:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get loyalty points records for a user
 * @param userId The user ID to fetch points for
 * @param params Optional query parameters
 * @returns Array of loyalty points records
 */
export async function getLoyaltyPointsByUserId(
  userId: string,
  params?: Omit<GetLoyaltyPointsParams, 'user_id'>
): Promise<LoyaltyPointsResponse<LoyaltyPoints[]>> {
  try {
    let query = supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', userId);

    // Apply ordering
    const orderBy = params?.orderBy || 'created_at';
    const orderDirection = params?.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Apply pagination
    if (params?.limit) {
      const offset = params?.offset || 0;
      query = query.range(offset, offset + params.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching loyalty points by user ID:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching loyalty points by user ID:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all loyalty points records with optional filtering
 * @param params Optional query parameters
 * @returns Array of loyalty points records
 */
export async function getLoyaltyPoints(
  params?: GetLoyaltyPointsParams
): Promise<LoyaltyPointsResponse<LoyaltyPoints[]>> {
  try {
    let query = supabase.from('loyalty_points').select('*');

    // Apply filters
    if (params?.user_id) {
      query = query.eq('user_id', params.user_id);
    }
    if (params?.offer_id) {
      query = query.eq('offer_id', params.offer_id);
    }

    // Apply ordering
    const orderBy = params?.orderBy || 'created_at';
    const orderDirection = params?.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Apply pagination
    if (params?.limit) {
      const offset = params?.offset || 0;
      query = query.range(offset, offset + params.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching loyalty points:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching loyalty points:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get total points for a user (sum of all points records)
 * @param userId The user ID
 * @returns The total points
 */
export async function getTotalPointsByUserId(
  userId: string
): Promise<LoyaltyPointsResponse<number>> {
  try {
    const { data, error } = await supabase
      .from('loyalty_points')
      .select('points')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching total points:', error);
      return { data: null, error: new Error(error.message) };
    }

    const total = (data || []).reduce((sum, record) => sum + record.points, 0);
    return { data: total, error: null };
  } catch (error) {
    console.error('Error fetching total points:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create a new loyalty points record
 * @param params The loyalty points data to create
 * @returns The created loyalty points record
 */
export async function createLoyaltyPoints(
  params: CreateLoyaltyPointsParams
): Promise<LoyaltyPointsResponse<LoyaltyPoints>> {
  try {
    const { data, error } = await supabase
      .from('loyalty_points')
      .insert({
        user_id: params.user_id,
        points: params.points,
        reason: params.reason,
        offer_id: params.offer_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating loyalty points:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error creating loyalty points:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing loyalty points record
 * @param id The loyalty points record ID to update
 * @param params The fields to update
 * @returns The updated loyalty points record
 */
export async function updateLoyaltyPoints(
  id: string,
  params: UpdateLoyaltyPointsParams
): Promise<LoyaltyPointsResponse<LoyaltyPoints>> {
  try {
    const updateData: Record<string, unknown> = {};

    if (params.points !== undefined) {
      updateData.points = params.points;
    }
    if (params.reason !== undefined) {
      updateData.reason = params.reason;
    }
    if (params.offer_id !== undefined) {
      updateData.offer_id = params.offer_id;
    }

    const { data, error } = await supabase
      .from('loyalty_points')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating loyalty points:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error updating loyalty points:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a loyalty points record by ID
 * @param id The loyalty points record ID to delete
 * @returns Success status
 */
export async function deleteLoyaltyPoints(
  id: string
): Promise<LoyaltyPointsResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('loyalty_points')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting loyalty points:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error deleting loyalty points:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete all loyalty points records for a user
 * @param userId The user ID
 * @returns Success status
 */
export async function deleteLoyaltyPointsByUserId(
  userId: string
): Promise<LoyaltyPointsResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('loyalty_points')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting loyalty points by user ID:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error deleting loyalty points by user ID:', error);
    return { data: null, error: error as Error };
  }
}
