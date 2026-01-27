import { supabase } from '../screens/supabaseClient';

// Temporary version that works with current table structure
// This stores transaction data in the metadata field until you run the migration

// Create a new transaction invitation in Supabase (temporary version)
export const createTransactionInvitation = async (transactionData) => {
  try {
    console.log('📤 Creating transaction invitation (temp version):', transactionData);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Store all transaction data in metadata for now
    console.log('💰 Original price from transactionData:', transactionData.price);
    const cleanPrice = transactionData.price ? transactionData.price.toString().replace(/[^0-9.]/g, '') : '';
    const parsedAmount = cleanPrice ? parseFloat(cleanPrice) : null;
    console.log('💰 Cleaned price:', cleanPrice, 'Parsed amount:', parsedAmount);
    
    const metadata = {
      amount: parsedAmount,
      item_title: transactionData.title || 'Untitled Item',
      item_description: transactionData.description || '',
      item_image: transactionData.image || null,
      source: transactionData.source || 'Facebook Marketplace',
      transaction_type: 'invitation',
      productUrl: transactionData.fbUrl,
      offerId: transactionData.offerId,
      userAddress: transactionData.userAddress,
      pickupAddress: transactionData.pickupAddress,
      transactionType: transactionData.transactionType,
      inviter_name: transactionData.userAddress?.full_name || transactionData.userAddress?.name || 'User',
      fb_seller_name: transactionData.fbSellerName || 'Facebook Seller', // Add Facebook seller name
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };

    // Create transaction record in Supabase with current table structure
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        inviter_id: user.id,
        invitee_id: null, // Will be set when someone accepts the invitation
        status: 'pending',
        metadata: metadata
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating transaction:', error);
      throw error;
    }

    console.log('✅ Transaction invitation created (temp version):', data.id);
    return data;
    
  } catch (error) {
    console.error('❌ Error creating transaction invitation:', error);
    throw error;
  }
};

// Get transaction by ID (temporary version)
export const getTransactionById = async (transactionId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        inviter:auth.users!transactions_inviter_id_fkey(*),
        invitee:auth.users!transactions_invitee_id_fkey(*)
      `)
      .eq('id', transactionId)
      .single();

    if (error) {
      console.error('❌ Error fetching transaction:', error);
      throw error;
    }

    // Extract data from metadata
    const transaction = {
      ...data,
      amount: data.metadata?.amount || 0,
      item_title: data.metadata?.item_title || 'Untitled Item',
      item_description: data.metadata?.item_description || '',
      item_image: data.metadata?.item_image || null,
      source: data.metadata?.source || 'Facebook Marketplace',
      transaction_type: data.metadata?.transaction_type || 'invitation',
      expires_at: data.metadata?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    return transaction;
  } catch (error) {
    console.error('❌ Error getting transaction:', error);
    throw error;
  }
};

// Update transaction status (temporary version)
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

// Get user's transactions (temporary version)
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
        inviter:auth.users!transactions_inviter_id_fkey(*),
        invitee:auth.users!transactions_invitee_id_fkey(*)
      `)
      .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user transactions:', error);
      throw error;
    }

    // Extract data from metadata for each transaction
    const transactions = data.map(transaction => ({
      ...transaction,
      amount: transaction.metadata?.amount || 0,
      item_title: transaction.metadata?.item_title || 'Untitled Item',
      item_description: transaction.metadata?.item_description || '',
      item_image: transaction.metadata?.item_image || null,
      source: transaction.metadata?.source || 'Facebook Marketplace',
      transaction_type: transaction.metadata?.transaction_type || 'invitation',
      expires_at: transaction.metadata?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }));

    return transactions;
  } catch (error) {
    console.error('❌ Error getting user transactions:', error);
    throw error;
  }
};

// Generate web invitation URL
export const generateWebInvitationUrl = (transactionId) => {
  // Use /invite1 to match Squarespace page URL slug
  // This path is excluded in the AASA file (NOT /invite1/*)
  return `https://gocouri.com/invite1?id=${transactionId}#web`;
};

// Generate deep link URL for app
export const generateDeepLinkUrl = (transactionId) => {
  return `couri://transaction/${transactionId}`;
};

// Check if transaction exists and is valid (temporary version)
export const validateTransactionInvitation = async (transactionId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('status', 'pending')
      .single();

    if (error || !data) {
      return { valid: false, error: 'Transaction not found' };
    }

    // Check expiry from metadata
    const expiresAt = data.metadata?.expires_at;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return { valid: false, error: 'Transaction expired' };
    }

    return { valid: true, transaction: data };
  } catch (error) {
    console.error('❌ Error validating transaction:', error);
    return { valid: false, error: 'Failed to validate transaction' };
  }
};

// Accept transaction invitation (temporary version)
export const acceptTransactionInvitation = async (transactionId) => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({
        invitee_id: user.id,
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .eq('status', 'pending')
      .select()
      .single();

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

// Decline transaction invitation (temporary version)
export const declineTransactionInvitation = async (transactionId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .eq('status', 'pending')
      .select()
      .single();

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

