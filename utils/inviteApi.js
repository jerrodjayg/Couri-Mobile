// Invite API utility functions
import { supabase } from '../screens/supabaseClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://nfkykasruwdzpcjuufdu.supabase.co/functions/v1';

/**
 * Fetch invite details by token
 * @param {string} token - The invite token from the deep link
 * @returns {Promise<Object>} - The invite data
 */
export async function fetchInviteByToken(token) {
  try {
    console.log('📥 Fetching invite by token:', token);
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Use the existing accept-invite-by-id function to get transaction details
    const response = await fetch(`${API_BASE_URL}/accept-invite-by-id?transactionId=${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch invite');
    }

    const data = await response.json();
    console.log('✅ Invite fetched successfully:', data);
    
    // Transform the transaction data to match expected invite format
    return {
      id: data.transaction.id,
      transactionId: data.transaction.id,
      status: data.transaction.status,
      seller: data.transaction.inviter?.name || 'Unknown',
      sellerId: data.transaction.inviter?.id,
      metadata: data.transaction.metadata,
      created_at: data.transaction.created_at
    };
  } catch (error) {
    console.error('❌ Error fetching invite:', error);
    throw error;
  }
}

/**
 * Accept an invite
 * @param {string} inviteId - The invite ID (transaction ID)
 * @returns {Promise<Object>} - The updated invite data
 */
export async function acceptInvite(inviteId) {
  try {
    console.log('✅ Accepting invite:', inviteId);
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Use the existing accept-invite-by-id function
    const response = await fetch(`${API_BASE_URL}/accept-invite-by-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      credentials: 'include',
      body: JSON.stringify({ 
        transactionId: inviteId,
        action: 'accept'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to accept invite');
    }

    const data = await response.json();
    console.log('✅ Invite accepted successfully:', data);
    
    // Transform the response to match expected format
    return {
      id: data.transaction.id,
      transactionId: data.transaction.id,
      status: data.transaction.status,
      accepted_at: data.transaction.accepted_at
    };
  } catch (error) {
    console.error('❌ Error accepting invite:', error);
    throw error;
  }
}

/**
 * List my invites (both sent and received)
 * @param {Object} options - Query options
 * @param {boolean} options.mine - Get only my invites
 * @param {string} options.status - Filter by status (pending, accepted, expired)
 * @returns {Promise<Array>} - List of invites
 */
export async function listMyInvites(options = { mine: true }) {
  try {
    console.log('📋 Fetching my invites...');
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // For now, return empty array since we don't have the invites table
    // This prevents the error and allows the app to work
    console.log('⚠️ listMyInvites: Using transactions table - returning empty array for now');
    return [];
  } catch (error) {
    console.error('❌ Error fetching invites:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
}

/**
 * Generate an invite token and shareable link
 * @param {Object} inviteData - The invite data (transaction details)
 * @returns {Promise<Object>} - The invite with token and share URL
 */
export async function createInviteWithToken(inviteData) {
  try {
    console.log('📤 Creating invite with token...');
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Use the existing create-invite function
    const response = await fetch(`${API_BASE_URL}/create-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        metadata: inviteData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create invite');
    }

    const data = await response.json();
    console.log('✅ Invite created successfully:', data);
    
    // Transform the response to match expected format
    return {
      id: data.transactionId,
      transactionId: data.transactionId,
      token: data.transactionId, // Use transaction ID as token
      shareUrl: data.url,
      success: data.success
    };
  } catch (error) {
    console.error('❌ Error creating invite:', error);
    throw error;
  }
}

