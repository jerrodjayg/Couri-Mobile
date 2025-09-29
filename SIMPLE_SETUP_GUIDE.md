# Simple Setup Guide for gocouri.com Invitation Pages

## 🎯 What You Need to Do

### Option 1: Add to Your Existing gocouri.com (Recommended)

1. **Upload Files to Your Server:**
   - Upload `web-invite-gocouri.html` to your server as:
     - `gocouri.com/invite/index.html` (for clean URLs)
     - OR `gocouri.com/invite.html` (for simple URLs)

2. **Update Configuration:**
   - Edit the HTML file and update these lines:
   ```javascript
   const CONFIG = {
       SUPABASE_URL: 'https://nfkykasruwdzpcjuufdu.supabase.co', // Your actual URL
       SUPABASE_ANON_KEY: 'your-actual-anon-key-here', // Your actual key
       APP_STORE_URL: 'https://apps.apple.com/app/couri/id1234567890', // Your actual App Store URL
   };
   ```

3. **Test the URL:**
   - Your invitation URLs will be: `https://gocouri.com/invite1/?id=[transaction-id]`
   - Example: `https://gocouri.com/invite1/?id=abc123`

### Option 2: Use a Free Hosting Service (If you can't modify gocouri.com)

#### Quick Netlify Setup (5 minutes):
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub/Google
3. Drag and drop the HTML file
4. Get URL like: `https://amazing-name-123456.netlify.app`
5. Update your app configuration:

```javascript
// In utils/supabaseTransactionService_temp.js
export const generateWebInvitationUrl = (transactionId) => {
  return `https://amazing-name-123456.netlify.app/invite/${transactionId}`;
};
```

#### Quick Vercel Setup (5 minutes):
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import/create new project
4. Upload HTML file
5. Get URL like: `https://couri-invites.vercel.app`

### Option 3: Use a Different Domain

If you have another domain, just upload the HTML file there and update the URL in your app.

## 🔧 Update Your App

After setting up the web pages, update your app's URL generation:

```javascript
// In utils/supabaseTransactionService_temp.js
export const generateWebInvitationUrl = (transactionId) => {
  // Choose one of these:
  return `https://gocouri.com/invite/${transactionId}`; // Option 1
  // return `https://your-netlify-url.netlify.app/invite/${transactionId}`; // Option 2
  // return `https://your-domain.com/invite/${transactionId}`; // Option 3
};
```

## 🧪 Test Everything

1. **Create a transaction invitation** in your app
2. **Copy the web link**
3. **Open it in a browser** - should show the invitation page
4. **Click "Join Transaction"** - should redirect to App Store
5. **Click "Decline"** - should show declined message

## 🚀 That's It!

Your web invitation system will work with any of these options. The easiest is Option 2 (Netlify) if you can't modify gocouri.com.
