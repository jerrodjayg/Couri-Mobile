// Cloudflare Worker for Apple App Site Association
// Copy and paste this entire code into your Cloudflare Worker editor

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    console.log('📍 Request received:', url.pathname);
    
    // Handle Apple App Site Association file
    if (url.pathname === '/.well-known/apple-app-site-association') {
      console.log('📱 Serving AASA file for gocouri.com');
      
      const aasa = {
        "applinks": {
          "apps": [],
          "details": [
            {
              "appID": "S4VHGX8378.com.anonymous.jerrod",
              "paths": [
                "/deeplink/i/*",
                "/i/*",
                "NOT /web-invite.html",
                "NOT /web-accepted.html",
                "NOT /web-invite.html/*",
                "NOT /web-accepted.html/*",
                "NOT /invite1",
                "NOT /invite1/*",
                "NOT /invite1?*",
                "NOT /invite",
                "NOT /invite/*",
                "NOT /invite?*",
                "NOT /continue1",
                "NOT /continue1/*",
                "NOT /continue1?*"
              ]
            }
          ]
        }
      };
      
      return new Response(JSON.stringify(aasa, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // For all other requests, pass through to your Squarespace site
    console.log('🌐 Proxying to Squarespace:', url.pathname);
    return fetch(request);
  }
}

