# Complete Invitation Flow Implementation

## Overview
This document explains the complete invitation flow where Person 1 creates an invitation link and shares it with Person 2, who can then accept it through a web browser, opening the app and notifying Person 1 in real-time.

## Flow Steps

### Person 1 (Inviter) - Creating and Sharing the Invitation

1. **Navigate through the transaction flow**:
   - Person 1 starts at Welcomepage
   - Clicks "Begin a Transaction" → Opens modal to choose Buy/Sell
   - Navigates through: URL → ProductDetails → ProductPrice → PickupAddress → ConfirmAddress → Payment → **Share**

2. **Share Screen** (`screens2/Share.js`):
   - Person 1 clicks "Copy web link" or "Send Link"
   - System creates a transaction in Supabase via `createTransactionInvitation()`:
     - Stores transaction data in `transactions` table
     - Status: `'pending'`
     - Stores product details in `metadata` field
     - Returns transaction ID

3. **Web Invitation URL Generated**:
   - Format: `https://gocouri.com/invite1/?id={transactionId}`#web
   - Person 1 shares this link via any platform (text, email, social media, etc.)

4. **Person 1 clicks "I sent the invite"**:
   - Navigates to Welcomepage with transaction review state
   - Shows "The seller is reviewing your transaction" message
   - Displays transaction card with product details

### Person 2 (Invitee) - Receiving and Accepting the Invitation

1. **Person 2 clicks the link in any web browser**:
   - Opens `web-invite-accept.html` hosted at `https://gocouri.com/invite1/`#web
   - Page fetches transaction details from Supabase Edge Function:
     - Calls: `GET https://{projectRef}.functions.supabase.co/accept-invite-by-id?transactionId={id}`
     - Edge function: `supabase/functions/accept-invite-by-id/index.ts`
   - Displays:
     - Inviter name and avatar
     - Product title and image
     - Product price
     - Source (e.g., "Facebook Marketplace")

2. **Person 2 clicks "Accept Invitation" button**:
   - Triggers deep link: `com.anonymous.jerrod://transaction/{transactionId}`
   - iOS/Android attempts to open the Couri app
   - If app not installed, redirects to App Store after 3 seconds

3. **App opens via deep link** (`App.js`):
   - Deep link handler in `App.js` (lines 76-149) receives the URL
   - Checks if URL contains `transaction/{transactionId}`
   - Fetches transaction details:
     ```javascript
     fetch(`https://${projectRef}.functions.supabase.co/accept-invite-by-id?transactionId=${transactionId}`)
     ```
   - Navigates to `Welcomepage` with `inviteTransaction` params:
     ```javascript
     navigationRef.current.navigate('Welcomepage', {
       inviteTransaction: {
         id: data.transaction.id,
         title: data.transaction.metadata?.item_title,
         price: data.transaction.metadata?.amount,
         image: data.transaction.metadata?.item_image,
         seller: data.transaction.inviter?.name,
         sellerId: data.transaction.inviter?.id,
         fromDeepLink: true
       }
     });
     ```

4. **Welcomepage displays the invitation** (`screens/Welcomepage.js`):
   - `handleIncomingUrl()` function (lines 690-749) processes the invite
   - Sets invite state with transaction details
   - Shows invitation card with:
     - Headline: "You've been invited to a transaction"
     - Inviter row: "with {seller name}" + avatar
     - Product preview card: Title + Image
     - "View & Confirm Invitation" button

5. **Person 2 clicks "View & Confirm Invitation"**:
   - Opens `ConfirmInviteModal`
   - Shows product title and details
   - Buttons: "Accept" and "Cancel"

6. **Person 2 clicks "Accept"** (lines 1428-1475):
   - Gets user's Supabase session token
   - Calls Supabase Edge Function:
     ```javascript
     POST https://{projectRef}.functions.supabase.co/accept-invite-by-id
     Headers: { Authorization: Bearer {token} }
     Body: { transactionId, action: 'accept' }
     ```
   - Edge function (`supabase/functions/accept-invite-by-id/index.ts`):
     - Updates transaction status to `'accepted'`
     - Sets `invitee_id` to Person 2's user ID
     - Sets `accepted_at` timestamp
     - **Broadcasts real-time notification** via Supabase Realtime:
       ```typescript
       channel.send({
         type: 'broadcast',
         event: 'transaction-accepted',
         payload: {
           transactionId,
           acceptedAt,
           inviteeId
         }
       })
       ```
   - Shows success alert to Person 2

### Person 1 (Inviter) - Receiving Accept Notification

1. **Real-time notification** (if using `InviteScreen.tsx`):
   - Person 1's app subscribes to real-time channel: `transaction:{transactionId}`
   - When Person 2 accepts, receives broadcast event
   - Updates UI to show "Invite accepted!"
   - Toast notification: "🎉 Invite accepted! Your transaction is being processed."

2. **Or via polling** (if using Welcomepage transaction review):
   - Person 1's Welcomepage polls for status changes
   - Detects transaction status changed to `'accepted'`
   - Updates transaction card UI
   - Shows success message

## Files Involved

### React Native App
- **`App.js`** - Deep link handler for incoming transaction URLs
- **`screens/Welcomepage.js`** - Main page showing invitations and transaction status
- **`screens2/Share.js`** - Page where Person 1 creates and shares invitations
- **`src/screens/InviteScreen.tsx`** - Alternative invite creation screen with real-time updates
- **`utils/supabaseTransactionService_temp.js`** - Helper functions for transaction management

### Web
- **`web-invite-accept.html`** - Web page for viewing and accepting invitations

### Supabase Edge Functions
- **`supabase/functions/accept-invite-by-id/index.ts`** - Handles fetching and accepting transactions
  - `GET` - Fetch transaction details
  - `POST` - Accept/decline transaction + broadcast real-time event
- **`supabase/functions/create-invite/index.ts`** - Alternative invite creation endpoint

### State Management
- **`src/state/invites.ts`** - Zustand store for managing invitation state

### Components
- **`components/Toast.tsx`** - Toast notification component for success messages

## Database Schema

### `transactions` table
```sql
id (uuid, primary key)
inviter_id (uuid, foreign key to auth.users)
invitee_id (uuid, foreign key to auth.users, nullable)
status (text) - 'pending', 'accepted', 'declined'
metadata (jsonb) - Stores:
  - amount (number)
  - item_title (string)
  - item_description (string)
  - item_image (string url)
  - source (string)
  - productUrl (string)
  - offerId (string)
  - userAddress (object)
  - pickupAddress (object)
  - transactionType (string)
  - inviter_name (string)
  - fb_seller_name (string)
accepted_at (timestamp, nullable)
created_at (timestamp)
updated_at (timestamp)
```

## Configuration Requirements

### Environment Variables
```bash
EXPO_PUBLIC_SUPABASE_PROJECT_REF=nfkykasruwdzpcjuufdu
EXPO_PUBLIC_SUPABASE_URL=https://nfkykasruwdzpcjuufdu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### App Configuration (`app.json`)
```json
{
  "expo": {
    "scheme": "com.anonymous.jerrod",
    "ios": {
      "bundleIdentifier": "com.anonymous.jerrod"
    },
    "android": {
      "package": "com.anonymous.jerrod"
    }
  }
}
```

### Web Page Configuration
Update `web-invite-accept.html` line 258:
```javascript
const SUPABASE_PROJECT_REF = 'nfkykasruwdzpcjuufdu';
const DEEP_LINK_SCHEME = 'com.anonymous.jerrod';
```

## Testing the Flow

### Test with Expo Go:
1. **Person 1**: 
   - Open app in Expo Go
   - Sign in
   - Go through transaction flow to Share screen
   - Click "Copy web link"
   - Send link to Person 2

2. **Person 2**:
   - Open link in mobile browser
   - Click "Accept Invitation"
   - Browser opens Expo Go app
   - Invitation appears in Welcomepage
   - Click "View & Confirm Invitation"
   - Click "Accept"

3. **Person 1**:
   - Should receive notification that invite was accepted
   - Transaction status updates automatically

### Test with Production Build:
- Same flow but uses production deep link scheme
- App opens directly instead of through Expo Go

## Troubleshooting

### Deep links not working?
- Check `app.json` scheme matches deep link URL
- For Expo Go, use: `exp://` prefix
- For production, use custom scheme from `app.json`

### Web page not fetching transaction?
- Verify Supabase Edge Function is deployed:
  ```bash
  supabase functions deploy accept-invite-by-id
  ```
- Check CORS is enabled in edge function
- Verify project ref in web page matches Supabase project

### Real-time notifications not working?
- Verify Realtime is enabled in Supabase dashboard
- Check channel name matches: `transaction:{transactionId}`
- Ensure broadcast is enabled for the channel

### Transaction not showing in Welcomepage?
- Check deep link handler in App.js is receiving URL
- Verify navigation to Welcomepage with correct params
- Check `handleIncomingUrl` in Welcomepage processes invite data

## Next Steps

### Optional Enhancements:
1. Add push notifications for when offline
2. Add email notifications as backup
3. Implement invitation expiry (already stored in metadata)
4. Add invitation history/list view
5. Add ability to resend/revoke invitations
6. Add invitation analytics/tracking

## Dependencies

```json
{
  "zustand": "^4.x.x",
  "@supabase/supabase-js": "^2.53.0",
  "expo-linking": "~8.0.8",
  "expo-clipboard": "~8.0.7"
}
```

Install with:
```bash
npm install zustand
```

## Summary

The invitation flow is now complete and functional:
- ✅ Person 1 creates invitation via Share screen
- ✅ Invitation stored in Supabase with transaction details
- ✅ Web page displays invitation details
- ✅ Deep link opens app and shows invitation
- ✅ Person 2 can accept invitation
- ✅ Acceptance updates database and broadcasts real-time event
- ✅ Person 1 receives notification of acceptance

The system uses Supabase for database, Edge Functions for API, and Realtime for instant notifications. No unnecessary pages were added, and the existing UI was preserved.


