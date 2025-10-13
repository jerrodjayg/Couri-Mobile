# TestFlight Deep Linking Setup Guide

## Current Status: ✅ Will Work with Custom URL Schemes

Your implementation using `couri://transaction/[id]` **will work in TestFlight**, but requires:
1. App to be installed first
2. User to manually open the link after installation

## Recommended: Add Universal Links for Better UX

### Why Universal Links?
- Seamless experience: Web → App (or App Store if not installed)
- More reliable in TestFlight and production
- Better user experience (no manual link reopening needed)
- Professional https:// URLs instead of custom schemes

---

## Option 1: Keep Current Setup (Custom URL Scheme Only)

### ✅ What You Have Now
```
couri://transaction/[transaction-id]
```

### Configuration Needed:

#### 1. Update app.json
```json
{
  "expo": {
    "name": "Couri",
    "slug": "jerrod",
    "scheme": "couri",
    "ios": {
      "bundleIdentifier": "com.anonymous.jerrod",
      "supportsTablet": true,
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["couri"],
            "CFBundleURLName": "com.anonymous.jerrod"
          }
        ]
      }
    }
  }
}
```

#### 2. TestFlight Testing Process
1. Install app via TestFlight
2. Open Safari on iPhone
3. Visit your web invitation page
4. Click "Join Transaction"
5. App opens with the invitation

**Limitation**: If app isn't installed, user goes to App Store, installs, then has to manually reopen the link.

---

## Option 2: Add Universal Links (RECOMMENDED)

### ✅ Best User Experience

Universal Links let you use:
```
https://gocouri.com/transaction/[transaction-id]
```

### Setup Steps:

#### 1. Create Apple App Site Association File

Create this file and host it at `https://gocouri.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.anonymous.jerrod",
        "paths": [
          "/transaction/*",
          "/invite/*"
        ]
      }
    ]
  }
}
```

**Replace `TEAM_ID` with your Apple Team ID** (find it in Apple Developer Console)

**Important**: This file must:
- Be accessible via HTTPS
- NOT have a file extension
- Have `Content-Type: application/json` header
- Be at the root or in `.well-known/` directory

#### 2. Update app.json

```json
{
  "expo": {
    "name": "Couri",
    "slug": "jerrod",
    "scheme": "couri",
    "ios": {
      "bundleIdentifier": "com.anonymous.jerrod",
      "associatedDomains": [
        "applinks:gocouri.com"
      ],
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["couri"],
            "CFBundleURLName": "com.anonymous.jerrod"
          }
        ]
      }
    }
  }
}
```

#### 3. Update Web Invitation Page

Your web page should try Universal Link first, fall back to custom scheme:

```javascript
function handleJoinTransaction() {
  const transactionId = getTransactionId();
  
  // Try Universal Link first (works on iOS 9+)
  const universalLink = `https://gocouri.com/transaction/${transactionId}`;
  const customScheme = `couri://transaction/${transactionId}`;
  
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    // Try Universal Link first
    window.location.href = universalLink;
    
    // Fallback to App Store after 2 seconds if app doesn't open
    setTimeout(() => {
      window.location.href = CONFIG.APP_STORE_URL;
    }, 2000);
  } else {
    // Android: Use custom scheme (or Android App Links)
    window.location.href = customScheme;
    
    setTimeout(() => {
      window.location.href = CONFIG.PLAY_STORE_URL;
    }, 2000);
  }
}
```

#### 4. Update App.js Deep Link Handler

Your current handler already supports both! Just verify the linking config:

```javascript
const linking = { 
  prefixes: [
    "couri://",  // Custom URL scheme
    "https://gocouri.com",  // Universal Links
    "https://*.gocouri.com"  // Subdomain support
  ],
  config: {
    screens: {
      Welcomepage: {
        path: 'transaction/:transactionId',
        parse: {
          transactionId: (transactionId) => transactionId,
        },
      },
    }
  }
};
```

#### 5. Rebuild and Deploy to TestFlight

```bash
# Build new version with Universal Links
eas build --platform ios --profile production

# Or if using Expo managed workflow
expo build:ios
```

#### 6. Verify Apple App Site Association

Test your file is accessible:
```
https://gocouri.com/.well-known/apple-app-site-association
```

Should return JSON without authentication.

Apple's validator:
```
https://search.developer.apple.com/appsearch-validation-tool/
```

---

## Testing in TestFlight

### With Custom URL Scheme (Current)

**Test Steps:**
1. Install app from TestFlight
2. Open Safari → go to your invite page
3. Click "Join Transaction"
4. iOS shows "Open in Couri?" → Tap Open
5. ✅ App opens with invitation

### With Universal Links (Recommended)

**Test Steps:**
1. Install app from TestFlight
2. Open Safari → go to `https://gocouri.com/transaction/[id]`
3. App opens **automatically** (no prompt!)
4. ✅ Seamless transition from web to app

**If app not installed:**
1. Safari → `https://gocouri.com/transaction/[id]`
2. Web page detects app not installed
3. Shows "Get the app" button → App Store
4. After installation, link works automatically

---

## Troubleshooting

### Custom URL Scheme Not Working in TestFlight

**Check:**
1. ✅ `scheme: "couri"` in app.json
2. ✅ Rebuilt app after adding scheme
3. ✅ App is installed on device
4. ✅ Safari is blocking the redirect (check Safari settings)

**Fix:**
```bash
# Rebuild with proper scheme
eas build --platform ios
```

### Universal Links Not Working

**Common Issues:**

1. **Apple App Site Association file not found**
   ```bash
   # Test it:
   curl https://gocouri.com/.well-known/apple-app-site-association
   ```
   - Must be valid JSON
   - Must return `Content-Type: application/json`
   - No authentication required

2. **Wrong Team ID**
   - Go to: https://developer.apple.com/account
   - Click "Membership" → copy Team ID
   - Update in apple-app-site-association file

3. **Domain not verified**
   - Apple checks the file when app is installed
   - Delete app, reinstall from TestFlight
   - Wait 15 minutes for Apple's CDN to cache

4. **Associated Domains not in entitlements**
   - Check `ios/[YourApp]/[YourApp].entitlements`
   - Should have: `com.apple.developer.associated-domains`

---

## Quick Start for TestFlight

### Minimal Setup (Works Now)

1. ✅ Your current code already works!
2. Add to `app.json` if not present:
   ```json
   {
     "expo": {
       "scheme": "couri"
     }
   }
   ```
3. Build and upload to TestFlight
4. Test with `couri://transaction/[id]`

### Recommended Setup (Better UX)

1. Host `apple-app-site-association` file on gocouri.com
2. Add `associatedDomains` to app.json
3. Update web page to use `https://` URLs
4. Build and upload to TestFlight
5. Test with `https://gocouri.com/transaction/[id]`

---

## File Hosting for apple-app-site-association

### Option 1: Static Hosting (Recommended)

If you have access to gocouri.com server:

```nginx
# nginx config
location /.well-known/apple-app-site-association {
  default_type application/json;
  add_header Content-Type application/json;
  add_header Access-Control-Allow-Origin *;
}
```

### Option 2: Cloudflare Workers

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  if (url.pathname === '/.well-known/apple-app-site-association') {
    return new Response(JSON.stringify({
      "applinks": {
        "apps": [],
        "details": [{
          "appID": "YOUR_TEAM_ID.com.anonymous.jerrod",
          "paths": ["/transaction/*", "/invite/*"]
        }]
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
  
  return fetch(request)
}
```

---

## Summary: What Works in TestFlight

| Feature | Custom URL Scheme | Universal Links |
|---------|------------------|----------------|
| Works in TestFlight | ✅ Yes | ✅ Yes |
| App must be installed first | ✅ Yes | ❌ No (graceful fallback) |
| Requires user confirmation | ✅ "Open in Couri?" prompt | ❌ Opens automatically |
| Setup complexity | 🟢 Easy | 🟡 Medium |
| Production ready | 🟡 Acceptable | ✅ Recommended |
| User experience | 🟡 Good | ✅ Excellent |

## Recommendation

**For TestFlight Testing Now:**
- ✅ Your current implementation works fine!
- Just ensure `scheme: "couri"` is in app.json

**Before Production Launch:**
- ✅ Add Universal Links for better UX
- Host apple-app-site-association file
- Update web page to use https:// URLs

Both will work perfectly in TestFlight. Universal Links are just a better long-term solution. 🚀

