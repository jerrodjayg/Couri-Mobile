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

    const response = await fetch(`${API_BASE_URL}/get-invite-by-token?token=${token}`, {
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
    
    return data.invite;
  } catch (error) {
    console.error('❌ Error fetching invite:', error);
    throw error;
  }
}

/**
 * Accept an invite
 * @param {string} inviteId - The invite ID
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

    const response = await fetch(`${API_BASE_URL}/accept-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      credentials: 'include',
      body: JSON.stringify({ inviteId })
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific error cases
      if (error.code === 'INVITE_EXPIRED') {
        throw new Error('This invitation has expired. Please request a new one.');
      } else if (error.code === 'INVITE_ALREADY_ACCEPTED') {
        throw new Error('This invitation has already been accepted.');
      } else if (error.code === 'INVITE_NOT_FOUND') {
        throw new Error('Invitation not found.');
      }
      
      throw new Error(error.message || 'Failed to accept invite');
    }

    const data = await response.json();
    console.log('✅ Invite accepted successfully:', data);
    
    return data.invite;
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

    const queryParams = new URLSearchParams();
    if (options.mine) queryParams.append('mine', 'true');
    if (options.status) queryParams.append('status', options.status);

    const response = await fetch(`${API_BASE_URL}/list-invites?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch invites');
    }

    const data = await response.json();
    console.log('✅ Invites fetched successfully:', data.invites?.length || 0, 'invites');
    
    return data.invites || [];
  } catch (error) {
    console.error('❌ Error fetching invites:', error);
    throw error;
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

    const response = await fetch(`${API_BASE_URL}/create-invite-with-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      credentials: 'include',
      body: JSON.stringify(inviteData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create invite');
    }

    const data = await response.json();
    console.log('✅ Invite created successfully:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Error creating invite:', error);
    throw error;
  }
}

