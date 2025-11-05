// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

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

// Minimal Plaid link token create request body
type LinkTokenCreateBody = {
  products?: string[]
  client_name?: string
  country_codes?: string[]
  language?: string
  user?: { client_user_id: string }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsPreflight()

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')
  const PLAID_SECRET = Deno.env.get('PLAID_SECRET')
  const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox'

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return jsonResponse({ error: 'Missing Plaid credentials' }, 500)
  }

  const plaidBase = PLAID_ENV === 'production'
    ? 'https://production.plaid.com'
    : PLAID_ENV === 'development' || PLAID_ENV === 'sandbox'
    ? 'https://sandbox.plaid.com'
    : 'https://sandbox.plaid.com'

  try {
    const incoming = await req.json().catch(() => ({})) as Partial<LinkTokenCreateBody>

    // In a real app, identify the user securely (e.g., from JWT). For now allow anonymous client_user_id.
    const clientUserId = crypto.randomUUID()

    const createBody: any = {
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      client_name: incoming.client_name || 'Couri',
      language: incoming.language || 'en',
      country_codes: incoming.country_codes || ['US'],
      user: incoming.user || { client_user_id: clientUserId },
      products: incoming.products || ['auth'],
      android_package_name: 'com.anonymous.jerrod',
    }

    // Add iOS bundle ID for iOS OAuth support
    if (PLAID_ENV === 'production' || PLAID_ENV === 'development') {
      createBody.ios_bundle_id = 'com.anonymous.jerrod'
    }

    const resp = await fetch(`${plaidBase}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    })

    const data = await resp.json()

    if (!resp.ok) {
      console.error('Plaid link/token error:', data)
      return jsonResponse({ error: 'Failed to create link token', details: data }, resp.status)
    }

    return jsonResponse({ success: true, link_token: data.link_token })
  } catch (err) {
    console.error('Unhandled error creating Plaid link token:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
