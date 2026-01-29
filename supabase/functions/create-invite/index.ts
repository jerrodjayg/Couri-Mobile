// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  })
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsPreflight()

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Missing env configuration' }, 500)
  }

  const authHeader = req.headers.get('authorization') || ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined
  if (!jwt) return jsonResponse({ error: 'Missing Bearer token' }, 401)

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  // Get current user
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const inviterId = userData.user.id

  try {
    const body = await req.json().catch(() => ({})) as {
      inviteeIdentifier?: string
      metadata?: any
    }

    // Create a new transaction with 'pending' status
    const { data: transaction, error: insertErr } = await supabase
      .from('transactions')
      .insert({
        inviter_id: inviterId,
        status: 'pending',
        metadata: body.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (insertErr || !transaction) {
      console.error('Error creating transaction:', insertErr)
      return jsonResponse({ error: 'Failed to create transaction' }, 400)
    }

    const transactionId = transaction.id

    // Generate web URL for the invitation
    // This should point to your hosted web-invite.html page
    const baseUrl = Deno.env.get('WEB_BASE_URL') || 'https://gocouri.com'
    const url = `${baseUrl}/invite/${transactionId}#web`

    return jsonResponse({
      success: true,
      transactionId,
      url
    })

  } catch (error) {
    console.error('Error in create-invite:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})


