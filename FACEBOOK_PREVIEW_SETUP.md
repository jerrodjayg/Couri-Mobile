# Facebook Preview with Open Graph Meta Tags - Setup Guide

## Overview

When you share a Couri invitation link on Facebook, Messenger, WhatsApp, Twitter, or other social platforms, they will now show a beautiful preview with:
- ✅ Product image
- ✅ Product title and price
- ✅ Seller/inviter name
- ✅ Couri branding

This is achieved using **Open Graph meta tags** served by a Supabase Edge Function.

## How It Works

### The Problem (Before)
Your invitation pages loaded data via JavaScript, which Facebook's scraper can't execute. So Facebook saw blank/loading pages with no preview.

### The Solution (Now)
A Supabase Edge Function (`invite-preview`) generates HTML server-side with Open Graph meta tags already filled in with the transaction data. When Facebook scrapes the link, it gets the complete preview information.

## What Changed

### 1. New Supabase Edge Function
**File:** `supabase/functions/invite-preview/index.ts`

This function:
- Takes transaction ID from URL (`?id=xxx`)
- Fetches transaction data from Supabase
- Generates complete HTML with Open Graph meta tags
- Returns the HTML with all transaction details pre-rendered

### 2. Updated URL Generation
**File:** `utils/supabaseTransactionService_temp.js`

Changed from:
```javascript
https://gocouri.com/invite1/?id=xxx#web
```

To:
```javascript
https://nfkykasruwdzpcjuufdu.functions.supabase.co/invite-preview?id=xxx#web
```

## Deployment Instructions

### Step 1: Deploy the Edge Function

Open your terminal and run:

```bash
# Login to Supabase (if not already)
npx supabase login

# Link to your project
npx supabase link --project-ref nfkykasruwdzpcjuufdu

# Deploy the invite-preview function
npx supabase functions deploy invite-preview
```

### Step 2: Verify Deployment

Test the function by visiting:
```
https://nfkykasruwdzpcjuufdu.functions.supabase.co/invite-preview?id=YOUR_TRANSACTION_ID#web
```

Replace `YOUR_TRANSACTION_ID` with an actual transaction ID from your database.

### Step 3: Test Facebook Preview

1. Create a new invitation in your app
2. Copy the web link
3. Paste it into Facebook, Messenger, or use [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/)
4. You should see:
   - Product image
   - Title: "[Inviter Name] invited you to a transaction on Couri"
   - Description: "[Product Title]" - $[Price]

## What Gets Shown in the Preview

### Open Graph Meta Tags Generated:

```html
<!-- Title -->
<meta property="og:title" content="John Smith invited you to a transaction on Couri">

<!-- Description -->
<meta property="og:description" content="&quot;Vintage Chair&quot; - $280 from Facebook Marketplace">

<!-- Image -->
<meta property="og:image" content="[Product Image URL]">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<!-- URL -->
<meta property="og:url" content="https://...">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Couri">

<!-- Twitter Cards -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:title" content="...">
<meta property="twitter:description" content="...">
<meta property="twitter:image" content="...">
```

## Testing the Preview

### Facebook Sharing Debugger
1. Go to: https://developers.facebook.com/tools/debug/
2. Paste your invitation URL
3. Click "Debug"
4. You'll see what Facebook will display

### Other Platforms
- **WhatsApp**: Paste link in a chat
- **Twitter**: Paste link in a tweet
- **LinkedIn**: Paste link in a post
- **iMessage**: Paste link in a message
- **Slack**: Paste link in a channel

## Image Requirements

For best preview results:
- **Recommended size**: 1200x630 pixels
- **Minimum size**: 600x315 pixels
- **Aspect ratio**: 1.91:1 (Facebook's recommended)
- **Format**: JPG, PNG, or GIF

The function automatically uses:
1. Product image (from Facebook Marketplace scraping)
2. Fallback to Couri logo if no image available

## Troubleshooting

### Preview Not Showing on Facebook

**Problem**: Facebook shows old preview or no preview

**Solution**: 
1. Clear Facebook's cache using [Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Click "Scrape Again" button
3. Facebook caches previews for 24 hours

### "Transaction Not Found" Error

**Problem**: Edge Function returns error

**Possible causes**:
- Transaction ID is invalid
- Transaction was deleted
- Database permissions issue

**Solution**: Check Supabase logs:
```bash
npx supabase functions logs invite-preview
```

### Image Not Loading in Preview

**Problem**: Preview shows but no image

**Possible causes**:
- Image URL is invalid
- Image is too small
- Image requires authentication

**Solution**: 
- Ensure images are publicly accessible
- Use Supabase Storage for reliable hosting
- Check image dimensions (min 600x315px)

### Deploy Failed

**Problem**: Function won't deploy

**Solution**:
```bash
# Check you're logged in
npx supabase status

# If not, login again
npx supabase login

# Link to your project
npx supabase link --project-ref nfkykasruwdzpcjuufdu

# Try deploying again
npx supabase functions deploy invite-preview --no-verify-jwt
```

## Advanced Customization

### Change Preview Title Format

Edit `supabase/functions/invite-preview/index.ts`:

```typescript
const ogTitle = `${data.inviterName} invited you to a transaction on Couri`
// Change to:
const ogTitle = `Check out this ${data.itemTitle} on Couri!`
```

### Change Preview Description

```typescript
const ogDescription = `"${data.itemTitle}" - $${data.price}...`
// Change to whatever format you prefer
```

### Add Custom Logo

```typescript
const image = data.image || 'https://your-custom-logo-url.com/logo.png'
```

## Performance

- **Cache**: Function responses are cached for 5 minutes
- **Load time**: ~200-500ms typical response time
- **Cost**: Supabase Edge Functions are free for first 500k requests/month

## Security

- ✅ No authentication required (public invitations)
- ✅ Only reads public transaction data
- ✅ No sensitive data exposed in meta tags
- ✅ Rate limiting handled by Supabase

## Next Steps

1. **Deploy the function** (see Step 1 above)
2. **Test with a real transaction** in your app
3. **Share the link** on Facebook to see the preview
4. **Celebrate!** 🎉 Your links now have beautiful previews

## Support

If you encounter any issues:

1. Check Supabase logs: `npx supabase functions logs invite-preview`
2. Test the URL directly in a browser
3. Use Facebook's Sharing Debugger to see what Facebook sees
4. Verify the transaction exists in your database

## Additional Resources

- [Open Graph Protocol](https://ogp.me/)
- [Facebook Sharing Best Practices](https://developers.facebook.com/docs/sharing/best-practices)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)


