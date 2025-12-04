// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response('Server configuration error', { status: 500 })
  }

  // Get transaction ID from URL
  const url = new URL(req.url)
  const transactionId = url.searchParams.get('id') || url.searchParams.get('t')
  
  if (!transactionId) {
    return new Response(generateErrorHTML('Invalid invitation link'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' }
    })
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
    return new Response(generateErrorHTML('Transaction not found'), {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    })
  }

  // Extract transaction details from metadata
  const metadata = transaction.metadata || {}
  const inviterName = transaction.inviter?.raw_user_meta_data?.full_name || 
                     transaction.inviter?.raw_user_meta_data?.name ||
                     metadata.inviter_name ||
                     metadata.userAddress?.full_name ||
                     'A Couri User'
  
  const itemTitle = metadata.item_title || metadata.title || 'Product'
  const price = metadata.amount || metadata.price || '0'
  const description = metadata.item_description || metadata.description || `${inviterName} invited you to a transaction on Couri`
  const image = metadata.item_image || metadata.image || 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Logo_Dark.png'
  const fbSellerName = metadata.fb_seller_name && metadata.fb_seller_name !== 'Facebook Seller' 
    ? metadata.fb_seller_name 
    : ''

  // Generate HTML with Open Graph meta tags
  const html = generateInviteHTML({
    transactionId,
    inviterName,
    itemTitle,
    price,
    description,
    image,
    fbSellerName
  })

  return new Response(html, {
    status: 200,
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    }
  })
})

function generateInviteHTML(data: {
  transactionId: string
  inviterName: string
  itemTitle: string
  price: string
  description: string
  image: string
  fbSellerName: string
}) {
  const pageUrl = `https://nfkykasruwdzpcjuufdu.functions.supabase.co/invite-preview?id=${data.transactionId}`
  const appStoreUrl = 'https://apps.apple.com/app/couri/id6736088504'
  const ogTitle = `${data.inviterName} invited you to a transaction on Couri`
  const ogDescription = `"${data.itemTitle}" - $${data.price}${data.fbSellerName ? ` from ${data.fbSellerName}` : ' on Facebook Marketplace'}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${ogTitle}</title>
  <meta name="title" content="${ogTitle}">
  <meta name="description" content="${ogDescription}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${data.image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Couri">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${pageUrl}">
  <meta property="twitter:title" content="${ogTitle}">
  <meta property="twitter:description" content="${ogDescription}">
  <meta property="twitter:image" content="${data.image}">
  
  <style>
    :root {
      --bg: #f8f8fb;
      --text: #0b0b0f;
      --muted: #6b7280;
      --primary: #000000;
      --accent: #e9eef6;
      --card: #ffffff;
      --blue: #1877F2;
      --pill: #111111;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--text);
      background: #fff;
    }
    
    body {
      min-height: 100vh;
    }

    .preview {
      width: 100%;
      min-height: 100vh;
      background: #fff;
      position: relative;
    }
    
    main {
      padding: 120px 20px 120px;
      width: 100%;
    }

    .brand {
      display: flex;
      justify-content: center;
      margin-top: 8px;
    }
    
    .logo {
      height: 32px;
      width: auto;
      margin-bottom: 20px;
    }
    
    .logo img {
      height: 100%;
      width: auto;
    }

    .hero {
      margin: 10px 14px 24px;
      text-align: center;
    }
    
    .hero h1 {
      font-size: 28px;
      line-height: 1.2;
      margin: 6px 0 8px;
      font-weight: 700;
    }
    
    .sub {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      color: #4b5563;
      font-size: 15px;
    }
    
    .avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      overflow: hidden;
      display: inline-grid;
      place-items: center;
      background: #cdd7eb;
    }
    
    .avatar span {
      font-size: 11px;
      font-weight: 700;
      color: #1f2937;
    }

    .card {
      margin: 16px auto 14px;
      border: 1.5px solid #e5e7eb;
      border-radius: 12px;
      display: flex;
      align-items: center;
      padding: 12px 12px 12px 14px;
      gap: 12px;
      max-width: 100%;
      background: var(--card);
    }
    
    .item-info {
      flex: 1 1 auto;
    }
    
    .price {
      color: #2563eb;
      font-weight: 800;
      font-size: 18px;
      margin-bottom: 2px;
    }
    
    .title {
      font-size: 14.5px;
      line-height: 1.25;
      color: #111;
      margin: 0;
    }
    
    .subtitle {
      font-size: 13px;
      color: #6b7280;
      margin-top: 2px;
    }
    
    .thumb {
      flex: 0 0 82px;
      width: 82px;
      height: 82px;
      border-radius: 8px;
      background: #e6e6e6;
      overflow: hidden;
    }
    
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .source {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      color: #4b5563;
      font-size: 13px;
      margin: 6px 0 20px;
    }
    
    .fb {
      width: 16px;
      height: 16px;
      display: inline-block;
    }

    .btn {
      display: block;
      width: calc(100% - 40px);
      max-width: 300px;
      margin: 0 auto 12px;
      padding: 16px 18px;
      border-radius: 26px;
      text-align: center;
      font-weight: 700;
      border: 0;
      cursor: pointer;
      font-size: 16px;
      position: relative;
      z-index: 10;
      text-decoration: none;
    }
    
    .btn.primary {
      background: var(--pill);
      color: #fff;
      box-shadow: 0 6px 12px rgba(0,0,0,.18);
    }
    
    .decline {
      display: block;
      text-align: center;
      color: #111;
      text-decoration: underline;
      font-size: 15px;
      margin-top: 2px;
    }

    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(180deg,#eef3ff, #e6ebf7);
      padding: 20px 40px 16px;
      z-index: 10;
    }
    
    .safety {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    
    .badge {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #fff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 3px 8px rgba(0,0,0,.06);
    }
    
    .badge img {
      width: 60%;
      height: 60%;
      object-fit: contain;
    }
    
    .tag {
      font-size: 12.4px;
      letter-spacing: .3px;
      color: #111;
    }

    @media (max-width: 414px) {
      main {
        padding: 110px 16px 120px;
      }
      
      .footer {
        padding: 20px 30px 16px;
      }
      
      .hero h1 {
        font-size: 26px;
        margin: 8px 0 10px;
      }
      
      .logo {
        height: 28px;
      }
      
      .card {
        padding: 14px;
        margin: 14px auto 12px;
      }
      
      .btn {
        padding: 18px 20px;
        font-size: 17px;
        width: calc(100% - 32px);
        max-width: 280px;
      }
    }
  </style>
</head>
<body>
  <div class="preview">
    <main>
      <div class="brand">
        <div class="logo">
          <img src="https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Logo_Dark.png" alt="Couri" />
        </div>
      </div>

      <section class="hero">
        <h1>You've been invited<br/>to a transaction</h1>
        <div class="sub">
          with <span>${data.inviterName}</span>
          <span class="avatar">
            <span>${data.inviterName.charAt(0).toUpperCase()}</span>
          </span>
        </div>
      </section>

      <section class="card">
        <div class="item-info">
          <div class="price">$${data.price}</div>
          <p class="title">"${data.itemTitle}"</p>
          ${data.fbSellerName ? `<p class="subtitle">${data.fbSellerName}</p>` : ''}
        </div>
        <div class="thumb">
          <img src="${data.image}" alt="${data.itemTitle}" onerror="this.style.display='none'"/>
        </div>
      </section>

      <div class="source">
        <span class="fb" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12.06C22 6.504 17.523 2 12 2S2 6.504 2 12.06C2 17.083 5.657 21.246 10.438 22v-7.02H7.898v-2.92h2.54V9.846c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.196 2.238.196v2.48h-1.26c-1.242 0-1.63.776-1.63 1.572v1.885h2.774l-.443 2.92h-2.331V22C18.343 21.246 22 17.083 22 12.06z" fill="#1877F2"/>
          </svg>
        </span>
        <span>from Facebook Marketplace</span>
      </div>

      <a href="${appStoreUrl}" class="btn primary">Join Transaction</a>
      <a class="decline" href="#">Decline</a>
    </main>

    <footer class="footer">
      <div class="safety">
        <div class="badge" aria-hidden="true">
          <img src="https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Mark%202%20Dark.png" alt="Couri" />
        </div>
        <div class="tag">SECURE PAYMENTS, SAFE PICKUP & DELIVERY</div>
      </div>
    </footer>
  </div>

  <script>
    // Redirect to app store when Join Transaction is clicked
    document.querySelector('.btn.primary').addEventListener('click', function(e) {
      e.preventDefault();
      
      // Try to open app with deep link
      const deepLink = 'couri://transaction/${data.transactionId}';
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      
      // Fallback to App Store after short delay
      setTimeout(() => {
        window.location.href = '${appStoreUrl}';
      }, 1000);
    });
    
    // Handle decline
    document.querySelector('.decline').addEventListener('click', function(e) {
      e.preventDefault();
      alert('To decline this invitation, please open the Couri app.');
    });
  </script>
</body>
</html>`
}

function generateErrorHTML(message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Couri - Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f8f9fa;
    }
    .error-container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    h1 { color: #dc3545; margin-bottom: 16px; }
    p { color: #666; margin-bottom: 24px; }
    a { 
      display: inline-block;
      background: #000;
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>⚠️ Error</h1>
    <p>${message}</p>
    <a href="https://apps.apple.com/app/couri/id6736088504">Download Couri App</a>
  </div>
</body>
</html>`
}

