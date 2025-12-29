import { supabase } from '../screens/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

// Polyfill Buffer if needed
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

const projectRef = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF || 'nfkykasruwdzpcjuufdu';

/**
 * Generate a unique invite token for a transaction
 */
const generateInviteToken = async () => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  // Convert to base64url format (URL-safe)
  return Buffer.from(randomBytes).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generate deep link URL for transaction
 */
const generateTransactionDeepLink = (inviteToken) => {
  // Use production URL format
  return `https://gocouri.com/transaction/${inviteToken}`;
};

/**
 * Create a new transaction with invite token
 * @param {Object} previewData - The Facebook preview data (title, image, price, url)
 * @param {Object} userProfile - Current user profile
 * @returns {Promise<Object>} Transaction object with inviteToken and deepLink
 */
export const createTransaction = async (previewData, userProfile) => {
  try {
    console.log('📤 Creating transaction with preview data:', previewData);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Generate unique invite token
    const inviteToken = await generateInviteToken();
    console.log('🔑 Generated invite token:', inviteToken);

    // Prepare transaction data
    const cleanPrice = previewData.productPrice ? previewData.productPrice.toString().replace(/[^0-9.]/g, '') : '';
    const parsedAmount = cleanPrice ? parseFloat(cleanPrice) : null;

    const metadata = {
      amount: parsedAmount,
      item_title: previewData.productTitle || 'Untitled Item',
      item_description: previewData.productDescription || '',
      item_image: previewData.productImage || null,
      source: 'Facebook Marketplace',
      transaction_type: 'invitation',
      productUrl: previewData.productUrl,
      transactionType: previewData.transactionType || 'buy',
      sellerName: previewData.sellerName || '',
      buyerUserId: user.id,
      inviteToken: inviteToken,
    };

    // Create transaction record in Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        inviter_id: user.id,
        invitee_id: null,
        status: 'pending',
        metadata: metadata
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating transaction:', error);
      throw error;
    }

    // Generate deep link
    const deepLink = generateTransactionDeepLink(inviteToken);
    
    // Update transaction with invite token in metadata (for easy lookup)
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        metadata: {
          ...metadata,
          deepLink: deepLink
        }
      })
      .eq('id', data.id);

    if (updateError) {
      console.error('⚠️ Error updating transaction with deep link:', updateError);
    }

    console.log('✅ Transaction created:', data.id);
    console.log('🔗 Deep link:', deepLink);

    return {
      ...data,
      inviteToken: inviteToken,
      deepLink: deepLink
    };
    
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    throw error;
  }
};

/**
 * Fetch transaction by invite token
 * Uses Supabase Edge Function for better JSON querying
 * @param {string} token - The invite token
 * @returns {Promise<Object>} Transaction object
 */
export const fetchTransactionByToken = async (token) => {
  try {
    console.log('🔍 Fetching transaction by token:', token);

    // Use Supabase Edge Function to fetch by token
    const projectRef = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF || 'nfkykasruwdzpcjuufdu';
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;

    const response = await fetch(
      `https://${projectRef}.functions.supabase.co/fetch-transaction-by-token?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {})
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch transaction');
    }

    const result = await response.json();
    
    if (!result.transaction) {
      throw new Error('Transaction not found');
    }

    const transaction = result.transaction;

    // Extract preview data from metadata
    const previewData = {
      productTitle: transaction.metadata?.item_title || 'Product',
      productImage: transaction.metadata?.item_image || '',
      productPrice: transaction.metadata?.amount || 0,
      productUrl: transaction.metadata?.productUrl || '',
      productDescription: transaction.metadata?.item_description || '',
      sellerName: transaction.metadata?.sellerName || '',
      transactionType: transaction.metadata?.transactionType || 'buy',
    };

    return {
      id: transaction.id,
      status: transaction.status,
      buyerUserId: transaction.metadata?.buyerUserId,
      inviterId: transaction.inviter_id,
      inviter: transaction.inviter,
      previewData: previewData,
      createdAt: transaction.created_at,
    };
    
  } catch (error) {
    console.error('❌ Error fetching transaction by token:', error);
    throw error;
  }
};

/**
 * Accept a transaction
 * @param {string} transactionId - The transaction ID
 * @returns {Promise<Object>} Updated transaction
 */
export const acceptTransaction = async (transactionId) => {
  try {
    console.log('✅ Accepting transaction:', transactionId);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Update transaction status
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

    console.log('✅ Transaction accepted:', data.id);
    return data;
    
  } catch (error) {
    console.error('❌ Error accepting transaction:', error);
    throw error;
  }
};

/**
 * Decline a transaction
 * @param {string} transactionId - The transaction ID
 * @returns {Promise<Object>} Updated transaction
 */
export const declineTransaction = async (transactionId) => {
  try {
    console.log('❌ Declining transaction:', transactionId);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get transaction to find buyerUserId
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('metadata')
      .eq('id', transactionId)
      .single();

    if (fetchError || !transaction) {
      throw new Error('Transaction not found');
    }

    const buyerUserId = transaction.metadata?.buyerUserId;

    // Update transaction status
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

    // Send push notification to buyer
    if (buyerUserId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;

        await fetch(
          `https://${projectRef}.functions.supabase.co/send-transaction-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {})
            },
            body: JSON.stringify({
              transactionId: transactionId,
              action: 'declined',
              buyerUserId: buyerUserId
            })
          }
        );
        console.log('✅ Push notification sent to buyer');
      } catch (notifError) {
        console.error('⚠️ Error sending push notification:', notifError);
        // Don't fail the transaction if notification fails
      }
    }

    console.log('❌ Transaction declined:', data.id);
    return data;
    
  } catch (error) {
    console.error('❌ Error declining transaction:', error);
    throw error;
  }
};

/**
 * Store pending transaction token in AsyncStorage
 */
export const storePendingToken = async (token) => {
  try {
    await AsyncStorage.setItem('pendingTransactionToken', token);
    console.log('💾 Stored pending transaction token');
  } catch (error) {
    console.error('❌ Error storing pending token:', error);
  }
};

/**
 * Get pending transaction token from AsyncStorage
 */
export const getPendingToken = async () => {
  try {
    const token = await AsyncStorage.getItem('pendingTransactionToken');
    return token;
  } catch (error) {
    console.error('❌ Error getting pending token:', error);
    return null;
  }
};

/**
 * Clear pending transaction token from AsyncStorage
 */
export const clearPendingToken = async () => {
  try {
    await AsyncStorage.removeItem('pendingTransactionToken');
    console.log('🗑️ Cleared pending transaction token');
  } catch (error) {
    console.error('❌ Error clearing pending token:', error);
  }
};

