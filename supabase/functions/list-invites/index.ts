import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get query parameters
    const url = new URL(req.url)
    const mine = url.searchParams.get('mine') === 'true'
    const status = url.searchParams.get('status')

    let query = supabaseClient
      .from('invites')
      .select(`
        *,
        inviter:inviter_id (
          id,
          name,
          email,
          avatar_url
        ),
        invitee:invitee_id (
          id,
          name,
          email,
          avatar_url
        )
      `)

    // Filter by user
    if (mine) {
      query = query.or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false })

    const { data: invites, error: invitesError } = await query

    if (invitesError) {
      console.error('Error fetching invites:', invitesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch invites' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ invites: invites || [] }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in list-invites:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
