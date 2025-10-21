import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { url } = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Scraping Facebook URL:', url)

    // Fetch the page with proper headers to mimic a real browser
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    })

    if (!response.ok) {
      console.error('❌ Failed to fetch URL:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = await response.text()
    console.log('📄 HTML fetched, length:', html.length)

    // Extract data from HTML
    const extractedData = extractFacebookData(html, url)
    
    console.log('✅ Extracted data:', extractedData)

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Scraping error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function extractFacebookData(html: string, url: string) {
  const data: any = {
    productName: null,
    price: null,
    description: null,
    imageUrl: null,
    images: [],
    sellerName: null,
  }

  // Extract title from meta tags
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
  if (titleMatch) {
    data.productName = decodeHTMLEntities(titleMatch[1])
    console.log('📝 Found title:', data.productName)
  }

  // Extract description from meta tags
  const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
  if (descMatch) {
    data.description = decodeHTMLEntities(descMatch[1])
    console.log('📄 Found description:', data.description)
  }

  // Extract image from meta tags
  const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
  if (imageMatch) {
    data.imageUrl = decodeHTMLEntities(imageMatch[1])
    data.images = [data.imageUrl]
    console.log('🖼️ Found image:', data.imageUrl)
  }

  // Try to extract price from various patterns
  const pricePatterns = [
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
    /"price"\s*:\s*"?\$?(\d+(?:\.\d{2})?)"?/gi,
    /price["\s:]+\$?(\d+(?:\.\d{2})?)/gi,
    /"amount"\s*:\s*"?(\d+(?:\.\d{2})?)"?/gi,
  ]

  for (const pattern of pricePatterns) {
    const matches = [...html.matchAll(pattern)]
    for (const match of matches) {
      const priceValue = parseFloat(match[1].replace(/,/g, ''))
      // Only accept reasonable prices (between $1 and $100,000)
      if (priceValue >= 1 && priceValue <= 100000) {
        data.price = `$${priceValue.toFixed(2)}`
        console.log('💰 Found price:', data.price)
        break
      }
    }
    if (data.price) break
  }

  // Extract seller name
  const sellerPatterns = [
    /<meta\s+property="product:retailer"\s+content="([^"]+)"/i,
    /"seller"\s*:\s*"([^"]+)"/i,
    /"sellerName"\s*:\s*"([^"]+)"/i,
  ]

  for (const pattern of sellerPatterns) {
    const match = html.match(pattern)
    if (match) {
      data.sellerName = decodeHTMLEntities(match[1])
      console.log('👤 Found seller:', data.sellerName)
      break
    }
  }

  // Try to extract multiple images
  const imageRegex = /"(?:image|photo)(?:Url)?"\s*:\s*"([^"]+)"/gi
  const imageMatches = [...html.matchAll(imageRegex)]
  const extractedImages = imageMatches
    .map(match => decodeHTMLEntities(match[1]))
    .filter(img => img.startsWith('http') && !img.includes('profile') && !img.includes('avatar'))
    .slice(0, 5) // Limit to 5 images

  if (extractedImages.length > 0) {
    data.images = [...new Set([...data.images, ...extractedImages])] // Remove duplicates
    console.log('🖼️ Found', data.images.length, 'images total')
  }

  // Fallback: try to extract from URL if no data found
  if (!data.productName || data.productName === '') {
    try {
      const urlObj = new URL(url)
      const title = urlObj.searchParams.get('title') || urlObj.searchParams.get('text')
      if (title) {
        data.productName = decodeURIComponent(title)
        console.log('📝 Extracted title from URL:', data.productName)
      }
      
      const priceParam = urlObj.searchParams.get('price')
      if (priceParam && !data.price) {
        data.price = `$${parseFloat(priceParam).toFixed(2)}`
        console.log('💰 Extracted price from URL:', data.price)
      }
    } catch (e) {
      console.log('⚠️ Could not parse URL for fallback data')
    }
  }

  // Set defaults if nothing found
  if (!data.productName || data.productName === '') {
    data.productName = 'Facebook Marketplace Product'
  }
  if (!data.price || data.price === '') {
    data.price = '$0.00'
  }
  if (!data.description || data.description === '') {
    data.description = 'Product from Facebook Marketplace'
  }
  if (!data.imageUrl || data.imageUrl === '') {
    data.imageUrl = 'https://via.placeholder.com/300x300?text=No+Image'
  }

  return data
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
}

