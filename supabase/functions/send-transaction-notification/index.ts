import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    const jwt = authHeader?.replace('Bearer ', '');

    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { transactionId, action, buyerUserId } = await req.json();

    if (!transactionId || !action || !buyerUserId) {
      return new Response(
        JSON.stringify({ error: 'transactionId, action, and buyerUserId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get buyer's push token
    const { data: buyerData, error: buyerError } = await supabaseAdmin.auth.admin.getUserById(buyerUserId);
    if (buyerError || !buyerData) {
      return new Response(
        JSON.stringify({ error: 'Buyer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pushToken = buyerData.user.user_metadata?.expo_push_token;
    if (!pushToken) {
      return new Response(
        JSON.stringify({ error: 'Buyer has no push token registered' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('metadata')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const itemTitle = transaction.metadata?.item_title || 'Item';
    const actionText = action === 'accepted' ? 'accepted' : 'declined';

    // Send push notification via Expo Push Notification API
    const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
    const notification = {
      to: pushToken,
      sound: 'default',
      title: `Transaction ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
      body: action === 'accepted' 
        ? `Great news! The seller accepted your transaction for "${itemTitle}".`
        : `The seller declined your transaction for "${itemTitle}".`,
      data: {
        transactionId: transactionId,
        action: action,
        type: 'transaction_update',
      },
    };

    const pushResponse = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    if (!pushResponse.ok) {
      const errorText = await pushResponse.text();
      throw new Error(`Failed to send push notification: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

