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

    console.log('🔍 Fetching product metadata from URL:', url)

    // Determine source from URL
    let source = 'Unknown'
    if (url.includes('facebook.com') || url.includes('fb.com')) {
      source = 'Facebook Marketplace'
    } else if (url.includes('craigslist')) {
      source = 'Craigslist'
    } else if (url.includes('ebay')) {
      source = 'eBay'
    } else if (url.includes('amazon')) {
      source = 'Amazon'
    } else if (url.includes('etsy')) {
      source = 'Etsy'
    }

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

    // Check if we got a login page instead of the actual content
    const isLoginPage = html.includes('Log into Facebook') || 
                       html.includes('log in to facebook') ||
                       html.includes('Log In to Facebook') ||
                       html.includes('id="login_form"') ||
                       (html.includes('facebook') && html.includes('log in') && !html.includes('marketplace'))
    
    if (isLoginPage && source === 'Facebook Marketplace') {
      console.log('⚠️ Detected Facebook login page - returning null to trigger client-side scraping')
      return new Response(
        JSON.stringify({ 
          title: null, 
          image: null, 
          source: source, 
          description: '',
          error: 'Login page detected - requires client-side scraping'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract data from HTML
    const extractedData = extractProductData(html, url, source)
    
    console.log('✅ Extracted data:', extractedData)

    return new Response(
      JSON.stringify(extractedData),
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

function extractProductData(html: string, url: string, source: string) {
  const data: any = {
    title: null,
    image: null,
    source: source,
    description: '',
  }

  // Extract title from meta tags (Open Graph)
  const titlePatterns = [
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']og:title["']\s+content=[""]([^""]+)[""]/i,
    /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]

  for (const pattern of titlePatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      let title = decodeHTMLEntities(match[1]).trim()
      // Filter out Facebook-specific titles and JavaScript bundle names
      const titleLower = title.toLowerCase()
      const isBundleName = /^(worker|entrypoint|bundle|chunk|module|component)[a-z0-9]*$/i.test(title) ||
                          /[A-Z][a-z]+[A-Z][a-z]+[A-Z]/.test(title) && title.length > 20 && !title.includes(' ')
      if (title.length > 5 && 
          !titleLower.includes('facebook') && 
          !titleLower.includes('log in') &&
          !titleLower.includes('sign up') &&
          !titleLower.includes('worker') &&
          !titleLower.includes('entrypoint') &&
          !titleLower.includes('bundle') &&
          !isBundleName &&
          title !== 'Facebook' &&
          title !== 'Home' &&
          title.length < 200) { // Reasonable title length
        data.title = title
        console.log('📝 Found title:', data.title)
        break
      }
    }
  }

  // Extract image from meta tags (Open Graph)
  const imagePatterns = [
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']og:image["']\s+content=[""]([^""]+)[""]/i,
    /<meta\s+property=["']og:image:url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
  ]

  for (const pattern of imagePatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      let imageUrl = decodeHTMLEntities(match[1]).trim()
      // Filter out profile/avatar images
      if (imageUrl.startsWith('http') && 
          !imageUrl.includes('/profile/') && 
          !imageUrl.includes('/avatar/') &&
          !imageUrl.includes('/user/') &&
          !imageUrl.includes('profile_pic') &&
          imageUrl.length > 20) {
        data.image = imageUrl
        console.log('🖼️ Found image:', data.image)
        break
      }
    }
  }

  // Extract description from meta tags
  const descPatterns = [
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
  ]

  for (const pattern of descPatterns) {
    const match = html.match(pattern)
    if (match && match[1] && match[1].length > 10) {
      data.description = decodeHTMLEntities(match[1]).trim()
      console.log('📄 Found description')
      break
    }
  }

  // Try to extract from JSON-LD structured data
  if (!data.title || !data.image) {
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    if (jsonLdMatches) {
      for (const scriptTag of jsonLdMatches) {
        try {
          const jsonMatch = scriptTag.match(/>([\s\S]*?)</)
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1])
            const products = Array.isArray(jsonData) ? jsonData.filter((item: any) => item['@type'] === 'Product') : 
                            (jsonData['@type'] === 'Product' ? [jsonData] : [])
            for (const product of products) {
              if (!data.title && product.name) data.title = product.name
              if (!data.title && product.title) data.title = product.title
              if (!data.image && product.image) {
                data.image = typeof product.image === 'string' ? product.image : 
                           (product.image.url || (Array.isArray(product.image) ? product.image[0] : product.image))
              }
              if (!data.description && product.description) data.description = product.description
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  // Try to extract from Facebook's internal data structures
  if ((!data.title || !data.image) && source === 'Facebook Marketplace') {
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi)
    if (scriptMatches) {
      for (const scriptTag of scriptMatches) {
        const content = scriptTag
        if (content.includes('marketplace') || content.includes('listing') || content.includes('item_title')) {
          // Try to find title
          if (!data.title) {
            const titleMatches = [
              /"marketplace_listing"[^}]*"title"\s*:\s*"([^"]+)"/i,
              /"listing"[^}]*"title"\s*:\s*"([^"]+)"/i,
              /"item_title"\s*:\s*"([^"]+)"/i,
              /"name"\s*:\s*"([^"]+)"[^}]*"marketplace/i,
            ]
            for (const pattern of titleMatches) {
              const match = content.match(pattern)
              if (match && match[1] && match[1].length > 5) {
                let title = match[1]
                  .replace(/\\u([0-9a-f]{4})/gi, (m, code) => String.fromCharCode(parseInt(code, 16)))
                  .replace(/\\"/g, '"')
                  .replace(/\\'/g, "'")
                  .trim()
                // Filter out bundle names and invalid titles
                const titleLower = title.toLowerCase()
                const isBundleName = /^(worker|entrypoint|bundle|chunk|module|component)[a-z0-9]*$/i.test(title) ||
                                    /[A-Z][a-z]+[A-Z][a-z]+[A-Z]/.test(title) && title.length > 20 && !title.includes(' ')
                if (title.length < 200 && 
                    !titleLower.includes('worker') &&
                    !titleLower.includes('entrypoint') &&
                    !titleLower.includes('bundle') &&
                    !isBundleName) {
                  data.title = title
                  console.log('📝 Found title in script:', data.title)
                  break
                }
              }
            }
          }
          // Try to find image
          if (!data.image) {
            const imageMatches = [
              /"marketplace_listing"[^}]*"image"\s*:\s*"([^"]+)"/i,
              /"listing"[^}]*"image"\s*:\s*"([^"]+)"/i,
              /"item_image"\s*:\s*"([^"]+)"/i,
              /(https?:\/\/[^"'\s]*scontent[^"'\s]*\.fbcdn\.net[^"'\s]*\.(jpg|jpeg|png|webp))/i,
            ]
            for (const pattern of imageMatches) {
              const match = content.match(pattern)
              if (match && match[1] && match[1].includes('http')) {
                let imgUrl = match[1]
                  .replace(/\\u([0-9a-f]{4})/gi, (m, code) => String.fromCharCode(parseInt(code, 16)))
                  .replace(/\\"/g, '"')
                if (imgUrl.startsWith('http') && !imgUrl.includes('/profile/')) {
                  data.image = imgUrl
                  console.log('🖼️ Found image in script:', data.image)
                  break
                }
              }
            }
          }
        }
      }
    }
  }

  // Fallback: try to extract from URL if no data found
  if (!data.title) {
    try {
      const urlObj = new URL(url)
      const title = urlObj.searchParams.get('title') || urlObj.searchParams.get('text')
      if (title) {
        data.title = decodeURIComponent(title)
        console.log('📝 Extracted title from URL:', data.title)
      }
    } catch (e) {
      console.log('⚠️ Could not parse URL for fallback data')
    }
  }

  // Check if we got generic Facebook content (login page, home page, etc.)
  const isGenericContent = data.description && (
    data.description.toLowerCase().includes('log into facebook') ||
    data.description.toLowerCase().includes('start sharing and connecting') ||
    data.description.toLowerCase().includes('welcome to facebook')
  )
  
  // Set defaults if nothing found or if it's generic content
  if (!data.title || data.title === '' || isGenericContent) {
    data.title = null // Return null so client-side scraping can try
  }
  if (!data.image || data.image === '' || isGenericContent) {
    data.image = null
  }
  if (isGenericContent) {
    data.description = ''
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

