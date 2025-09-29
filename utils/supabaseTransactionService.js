import { supabase } from '../screens/supabaseClient';

// Create a new transaction invitation in Supabase
export const createTransactionInvitation = async (transactionData) => {
  try {
    console.log('📤 Creating transaction invitation:', transactionData);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Create transaction record in Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        amount: parseFloat(transactionData.price),
        item_title: transactionData.title || 'Untitled Item',
        item_description: transactionData.description || '',
        item_image: transactionData.image || null,
        source: transactionData.source || 'Facebook Marketplace',
        inviter_id: user.id,
        status: 'pending',
        transaction_type: 'invitation',
        metadata: {
          productUrl: transactionData.fbUrl,
          offerId: transactionData.offerId,
          userAddress: transactionData.userAddress,
          pickupAddress: transactionData.pickupAddress,
          transactionType: transactionData.transactionType,
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating transaction:', error);
      throw error;
    }

    console.log('✅ Transaction invitation created:', data.id);
    return data;
    
  } catch (error) {
    console.error('❌ Error creating transaction invitation:', error);
    throw error;
  }
};

// Get transaction by ID
export const getTransactionById = async (transactionId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        inviter:users!transactions_inviter_id_fkey(*),
        invitee:users!transactions_invitee_id_fkey(*)
      `)
      .eq('id', transactionId)
      .single();

    if (error) {
      console.error('❌ Error fetching transaction:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error getting transaction:', error);
    throw error;
  }
};

// Update transaction status
export const updateTransactionStatus = async (transactionId, status, inviteeId = null) => {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (inviteeId) {
      updateData.invitee_id = inviteeId;
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating transaction status:', error);
      throw error;
    }

    console.log('✅ Transaction status updated:', status);
    return data;
  } catch (error) {
    console.error('❌ Error updating transaction status:', error);
    throw error;
  }
};

// Get user's transactions
export const getUserTransactions = async (userId = null) => {
  try {
    // If no userId provided, get current user
    if (!userId) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        inviter:users!transactions_inviter_id_fkey(*),
        invitee:users!transactions_invitee_id_fkey(*)
      `)
      .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user transactions:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error getting user transactions:', error);
    throw error;
  }
};

// Generate web invitation URL
export const generateWebInvitationUrl = (transactionId) => {
  return `https://gocouri.com/invite/${transactionId}`;
};

// Generate deep link URL for app
export const generateDeepLinkUrl = (transactionId) => {
  return `couri://transaction/${transactionId}`;
};

// Check if transaction exists and is valid
export const validateTransactionInvitation = async (transactionId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return { valid: false, error: 'Transaction not found or expired' };
    }

    return { valid: true, transaction: data };
  } catch (error) {
    console.error('❌ Error validating transaction:', error);
    return { valid: false, error: 'Failed to validate transaction' };
  }
};

// Accept transaction invitation
export const acceptTransactionInvitation = async (transactionId) => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('accept_transaction_invitation', {
      transaction_id: transactionId,
      user_id: user.id
    });

    if (error) {
      console.error('❌ Error accepting transaction:', error);
      throw error;
    }

    console.log('✅ Transaction invitation accepted');
    return data;
  } catch (error) {
    console.error('❌ Error accepting transaction invitation:', error);
    throw error;
  }
};

// Decline transaction invitation
export const declineTransactionInvitation = async (transactionId) => {
  try {
    const { data, error } = await supabase.rpc('decline_transaction_invitation', {
      transaction_id: transactionId
    });

    if (error) {
      console.error('❌ Error declining transaction:', error);
      throw error;
    }

    console.log('✅ Transaction invitation declined');
    return data;
  } catch (error) {
    console.error('❌ Error declining transaction invitation:', error);
    throw error;
  }
};
