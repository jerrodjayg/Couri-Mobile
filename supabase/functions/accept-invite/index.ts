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

    // Get the invite ID from the request body
    const { inviteId } = await req.json()

    if (!inviteId) {
      return new Response(
        JSON.stringify({ error: 'Invite ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if invite exists and is pending
    const { data: invite, error: inviteError } = await supabaseClient
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .single()

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invite not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if invite is already accepted
    if (invite.status === 'accepted') {
      return new Response(
        JSON.stringify({ 
          error: 'Invite already accepted',
          code: 'INVITE_ALREADY_ACCEPTED'
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if invite is expired
    const now = new Date()
    const expiresAt = new Date(invite.expires_at)
    
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ 
          error: 'Invite has expired',
          code: 'INVITE_EXPIRED'
        }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update the invite status to accepted
    const { data: updatedInvite, error: updateError } = await supabaseClient
      .from('invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        invitee_id: user.id
      })
      .eq('id', inviteId)
      .select(`
        *,
        inviter:inviter_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating invite:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to accept invite' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Broadcast realtime notification to inviter
    try {
      const channelName = `invite:${invite.inviter_id}`
      const channel = supabaseClient.channel(channelName)
      
      await channel.send({
        type: 'broadcast',
        event: 'invite-accepted',
        payload: {
          inviteId: inviteId,
          acceptedAt: updatedInvite.accepted_at,
          inviteeId: user.id
        }
      })
    } catch (e) {
      console.error('Realtime broadcast error:', e)
      // Don't fail the request if broadcast fails
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        invite: updatedInvite
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in accept-invite:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
