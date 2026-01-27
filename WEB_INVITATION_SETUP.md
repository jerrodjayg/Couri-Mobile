# Web Invitation System Setup Guide

## Overview
This system allows you to send web-based transaction invitations that work in any browser. Recipients can view transaction details and download the app to join.

## Files Created

### 1. Web Pages (for gocouri.com)
- `web-invite.html` - Main invitation page
- `web-accepted.html` - Transaction accepted page
- `web-config.js` - Configuration file

### 2. Database Schema
- `supabase/transactions_table.sql` - Transaction table with invitation support

### 3. React Native Integration
- `utils/supabaseTransactionService.js` - Supabase transaction service
- Updated `screens2/Share.js` - Added web invitation sharing
- Updated `App.js` - Added deep linking support

## Setup Steps

### 1. Database Setup
Run the SQL migration in your Supabase project:

```sql
-- Run the contents of supabase/transactions_table.sql
-- This creates the transactions table with invitation support
```

### 2. Web Page Hosting
Upload these files to your gocouri.com server:

```
gocouri.com/
├── invite/
│   └── [transaction-id] -> web-invite.html
├── accepted/
│   └── [transaction-id] -> web-accepted.html
└── config.js -> web-config.js
```

### 3. Update Configuration
Edit `web-config.js` with your actual credentials:

```javascript
const CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key',
  APP_STORE_URL: 'https://apps.apple.com/app/couri/id1234567890',
  // ... other settings
};
```

### 4. URL Routing
Set up server routing so that:
- `gocouri.com/invite/[transaction-id]` serves `web-invite.html`
- `gocouri.com/accepted/[transaction-id]` serves `web-accepted.html`

### 5. App Store Configuration
Update your App Store URL in the config files:
- Replace `id1234567890` with your actual App Store ID
- Add Google Play URL if needed

## How It Works

### 1. Creating Invitations
- User taps "Copy web link" or "Share web link" in the Share screen
- App creates transaction in Supabase database
- Generates web URL: `https://gocouri.com/invite/[transaction-id#web]`

### 2. Web Invitation Flow
- Recipient clicks link → sees transaction details
- Clicks "Join Transaction" → redirects to App Store or opens app
- Clicks "Decline" → updates database and shows declined message

### 3. App Deep Linking
- When app is opened via deep link: `couri://transaction/[id]`
- App navigates to transaction details screen
- User can accept/decline from within the app

## Features

### Web Pages Include:
- ✅ Transaction details display
- ✅ App detection (iOS/Android)
- ✅ App Store/Google Play redirects
- ✅ Deep linking to app
- ✅ Supabase integration
- ✅ Responsive design
- ✅ Error handling

### App Integration:
- ✅ Web invitation creation
- ✅ Deep link handling
- ✅ Supabase transaction sync
- ✅ Fallback to local storage

## Testing

### 1. Test Web Pages
1. Create a transaction invitation
2. Copy the web link
3. Open in browser
4. Test "Join Transaction" and "Decline" buttons

### 2. Test Deep Linking
1. Install app on device
2. Click "Join Transaction" on web page
3. Verify app opens to correct transaction

### 3. Test App Store Redirect
1. Uninstall app from device
2. Click "Join Transaction" on web page
3. Verify redirects to App Store

## Troubleshooting

### Common Issues:
1. **Web pages not loading**: Check Supabase credentials in config
2. **Deep links not working**: Verify URL scheme in app configuration
3. **App Store not opening**: Update App Store URL in config
4. **Database errors**: Check RLS policies and table permissions

### Debug Steps:
1. Check browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Check React Native logs for deep link issues
4. Verify URL routing on your web server

## Security Notes

- All database operations use Row Level Security (RLS)
- Invitations expire after 7 days
- Only authenticated users can create invitations
- Transaction data is validated before display

## Next Steps

1. Set up your Supabase project and run the migration
2. Configure your web server to serve the HTML files
3. Update the configuration with your actual credentials
4. Test the complete flow
5. Deploy to production

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase connection and credentials
3. Test deep linking with a real device
4. Check server logs for routing issues

