// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  })
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsPreflight()

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Missing env configuration' }, 500)
  }

  // GET: Fetch transaction details (for displaying invite)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const transactionId = url.searchParams.get('transactionId')
    
    if (!transactionId) {
      return jsonResponse({ error: 'Missing transactionId' }, 400)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Fetch transaction with inviter details
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        inviter:inviter_id(id, email, raw_user_meta_data)
      `)
      .eq('id', transactionId)
      .single()

    if (error || !transaction) {
      return jsonResponse({ error: 'Transaction not found' }, 404)
    }

    // Return transaction details for display
    return jsonResponse({
      transaction: {
        id: transaction.id,
        status: transaction.status,
        metadata: transaction.metadata,
        inviter: {
          id: transaction.inviter?.id,
          email: transaction.inviter?.email,
          name: transaction.inviter?.raw_user_meta_data?.full_name || 
                transaction.inviter?.raw_user_meta_data?.name ||
                'Unknown User'
        }
      }
    })
  }

  // POST: Accept the invitation
  if (req.method === 'POST') {
    const authHeader = req.headers.get('authorization') || ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined
    if (!jwt) return jsonResponse({ error: 'Missing Bearer token' }, 401)

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })

    const body = await req.json().catch(() => ({})) as { 
      transactionId: string
      action: 'accept' | 'decline'
    }

    if (!body.transactionId || !body.action) {
      return jsonResponse({ error: 'Missing transactionId or action' }, 400)
    }

    // Get current user
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const inviteeId = userData.user.id

    // Fetch transaction to check it exists and is pending
    const { data: transaction, error: fetchErr } = await supabase
      .from('transactions')
      .select('id, status, inviter_id')
      .eq('id', body.transactionId)
      .single()

    if (fetchErr || !transaction) {
      return jsonResponse({ error: 'Transaction not found' }, 404)
    }

    if (transaction.status !== 'pending') {
      return jsonResponse({ 
        error: 'Transaction already processed',
        status: transaction.status 
      }, 400)
    }

    // Update transaction
    const newStatus = body.action === 'accept' ? 'accepted' : 'declined'
    const updateData: any = { 
      status: newStatus,
      invitee_id: inviteeId
    }
    
    if (body.action === 'accept') {
      updateData.accepted_at = new Date().toISOString()
    }

    const { data: updatedTransaction, error: updateErr } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', body.transactionId)
      .select('id, status, accepted_at, inviter_id')
      .single()

    if (updateErr) {
      return jsonResponse({ error: 'Failed to update transaction' }, 400)
    }

    // Broadcast realtime notification to inviter
    try {
      const channelName = `transaction:${updatedTransaction.id}`
      const channel = supabase.channel(channelName)
      
      if (body.action === 'accept') {
        await channel.send({
          type: 'broadcast',
          event: 'transaction-accepted',
          payload: {
            transactionId: updatedTransaction.id,
            acceptedAt: updatedTransaction.accepted_at,
            inviteeId: inviteeId
          }
        })
      } else if (body.action === 'decline') {
        await channel.send({
          type: 'broadcast',
          event: 'transaction-declined',
          payload: {
            transactionId: updatedTransaction.id,
            inviteeId: inviteeId
          }
        })
      }
    } catch (e) {
      console.error('Realtime broadcast error:', e)
      // Don't fail the request if broadcast fails
    }

    return jsonResponse({
      success: true,
      transaction: updatedTransaction
    })
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
})

