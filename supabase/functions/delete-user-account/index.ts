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
    
    // Create admin client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    const jwt = authHeader?.replace('Bearer ', '');

    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user with regular client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body (optional - can use authenticated user's ID)
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || user.id;
    const targetEmail = body.email || user.email;

    console.log('🔄 Deleting user account:', { targetUserId, targetEmail });

    // Step 1: Delete from users table by email (most reliable)
    let usersTableDeleted = false;
    if (targetEmail) {
      try {
        const { data: deleteResult, error: deleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('email', targetEmail.toLowerCase())
          .select();

        if (deleteError) {
          console.error('❌ Error deleting from users table:', deleteError);
        } else {
          usersTableDeleted = deleteResult && deleteResult.length > 0;
          console.log('✅ Deleted from users table:', deleteResult?.length || 0, 'records');
        }
      } catch (error) {
        console.error('❌ Exception deleting from users table:', error);
      }
    }

    // Step 2: Also try deleting by ID if we have a numeric ID
    if (targetUserId && !targetUserId.includes('-')) {
      // Numeric ID (bigint)
      try {
        const numericId = typeof targetUserId === 'string' ? parseInt(targetUserId, 10) : targetUserId;
        if (!isNaN(numericId)) {
          const { data: deleteResult, error: deleteError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', numericId)
            .select();

          if (!deleteError && deleteResult && deleteResult.length > 0) {
            usersTableDeleted = true;
            console.log('✅ Deleted from users table by ID:', deleteResult.length, 'records');
          }
        }
      } catch (error) {
        console.error('❌ Exception deleting from users table by ID:', error);
      }
    }

    // Step 3: Delete from auth.users (Supabase Auth)
    let authUserDeleted = false;
    try {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (authDeleteError) {
        console.error('❌ Error deleting auth user:', authDeleteError);
      } else {
        authUserDeleted = true;
        console.log('✅ Deleted auth user:', user.id);
      }
    } catch (error) {
      console.error('❌ Exception deleting auth user:', error);
    }

    // Return success if at least one deletion succeeded
    if (usersTableDeleted || authUserDeleted) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User account deleted successfully',
          deletedFromUsersTable: usersTableDeleted,
          deletedFromAuth: authUserDeleted
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to delete user account',
          message: 'User may not exist or deletion was blocked'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ Error in delete-user-account function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

