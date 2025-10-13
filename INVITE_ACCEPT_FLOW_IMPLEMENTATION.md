# Invite Accept Flow - Complete Implementation

## Overview
This system allows users to send invitation links via the web, and when recipients click "Join Transaction," they're taken to the app where they can accept or decline the invitation. The inviter receives real-time notifications when their invite is accepted or declined.

## How It Works

### 1. Web Invitation Flow
1. **User creates an invite** using the `InviteScreen.tsx`
2. **Share invite link** - generates URL like: `https://[project].functions.supabase.co/accept-invite?token=...`
3. **Recipient clicks link** on web browser (mobile or desktop)
4. **Web page displays** invitation details (product, price, seller info)
5. **User clicks "Join Transaction"** button

### 2. Deep Link to App
When "Join Transaction" is clicked:
1. Web page triggers deep link: `couri://transaction/[transaction-id]`
2. App opens (or redirects to App Store if not installed)
3. **App.js** intercepts the deep link:
   - Extracts the transaction ID
   - Fetches transaction details from `accept-invite-by-id` Edge Function
   - Navigates to **Welcomepage** with invite data

### 3. Accept/Decline in App
On the Welcomepage:
1. **Invitation card is displayed** with:
   - Product name and image
   - Price
   - Seller information
   - Accept/Decline buttons
2. **User clicks "Accept" or "Decline"**:
   - Calls `accept-invite-by-id` Edge Function
   - Updates transaction status in database
   - Broadcasts real-time notification to inviter

### 4. Inviter Receives Notification
The person who sent the invite:
1. **Real-time notification** via Supabase Realtime channel
2. **Toast message** appears: "🎉 Invite accepted! Your transaction is being processed."
3. **Transaction status updated** in the invites store

## Files Created/Modified

### New Files
- **`supabase/functions/accept-invite-by-id/index.ts`**
  - Edge Function to handle invite acceptance/decline
  - GET: Fetch transaction details for display
  - POST: Accept or decline invitation
  - Broadcasts real-time notifications

### Modified Files
- **`App.js`**
  - Added deep link handler for `couri://transaction/[id]`
  - Fetches transaction details and navigates to Welcomepage

- **`screens/Welcomepage.js`**
  - Added support for incoming invites from deep links
  - Updated `ConfirmInviteModal` with Accept/Decline functionality
  - Calls Edge Function to process acceptance/decline
  - Shows loading states during processing

- **`src/screens/InviteScreen.tsx`**
  - Enhanced real-time listener for both accept and decline events
  - Added detailed console logging for debugging
  - Shows toast notifications when invites are accepted/declined

## API Endpoints

### GET /accept-invite-by-id
Fetch transaction details for displaying an invite.

**Query Parameters:**
- `transactionId` (required): The transaction UUID

**Response:**
```json
{
  "transaction": {
    "id": "uuid",
    "status": "pending",
    "metadata": {
      "item_title": "Product Name",
      "amount": 100,
      "item_image": "https://...",
      "item_description": "Description",
      "source": "Facebook Marketplace"
    },
    "inviter": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

### POST /accept-invite-by-id
Accept or decline an invitation.

**Headers:**
- `Authorization: Bearer [jwt-token]`
- `Content-Type: application/json`

**Body:**
```json
{
  "transactionId": "uuid",
  "action": "accept" // or "decline"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "status": "accepted",
    "accepted_at": "2025-01-01T00:00:00Z"
  }
}
```

## Real-time Notifications

### Channel Setup
- Channel name: `transaction:[transaction-id]`
- The inviter subscribes to this channel when they create an invite
- The channel automatically unsubscribes when the component unmounts

### Events

#### transaction-accepted
Broadcasted when someone accepts an invitation.

**Payload:**
```json
{
  "transactionId": "uuid",
  "acceptedAt": "2025-01-01T00:00:00Z",
  "inviteeId": "uuid"
}
```

#### transaction-declined
Broadcasted when someone declines an invitation.

**Payload:**
```json
{
  "transactionId": "uuid",
  "inviteeId": "uuid"
}
```

## Database Schema

### transactions table
```sql
id UUID PRIMARY KEY
inviter_id UUID REFERENCES auth.users(id)
invitee_id UUID REFERENCES auth.users(id)
status TEXT -- 'pending', 'accepted', 'declined', etc.
accepted_at TIMESTAMP WITH TIME ZONE
metadata JSONB
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
```

**Key Fields:**
- `inviter_id`: User who created the invitation
- `invitee_id`: User who accepted (set when accepting)
- `status`: Current transaction status
- `metadata`: Stores product details, images, etc.

## Security

### Row Level Security (RLS)
- Users can view transactions they're involved in
- Users can only accept invitations (not modify other fields)
- Service role is used in Edge Functions for admin operations

### Authentication
- All API calls require valid JWT token
- Deep links work for unauthenticated users (they can view invite)
- Must be authenticated to accept/decline

## Testing the Flow

### 1. Create an Invite
```typescript
// In InviteScreen.tsx
1. Enter email/phone (optional)
2. Click "Create Invite"
3. Share the generated URL
```

### 2. Test Deep Link (iOS Simulator)
```bash
xcrun simctl openurl booted "couri://transaction/YOUR-TRANSACTION-ID"
```

### 3. Test Deep Link (Android)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "couri://transaction/YOUR-TRANSACTION-ID"
```

### 4. Verify Real-time Notifications
1. Open app on two devices (or simulator + physical device)
2. Device A: Create invite and keep app open on InviteScreen
3. Device B: Open the invite link → Accept
4. Device A should show toast: "🎉 Invite accepted!"

## Environment Variables

Make sure these are set in your `.env` or Expo configuration:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://nfkykasruwdzpcjuufdu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_PROJECT_REF=nfkykasruwdzpcjuufdu
```

## Troubleshooting

### Deep Links Not Working
- Verify URL scheme in `app.json`: `"scheme": "couri"`
- iOS: Check Associated Domains in Xcode
- Android: Check `AndroidManifest.xml` intent filters

### Real-time Notifications Not Received
- Check that inviter is subscribed to channel before invite is accepted
- Verify Supabase Realtime is enabled in project settings
- Check browser console for WebSocket connection errors

### Transaction Not Found
- Verify transaction ID in deep link URL is correct
- Check that transaction exists in database
- Ensure Edge Function is deployed: `supabase functions deploy accept-invite-by-id`

## Future Enhancements

### Push Notifications
To add push notifications when invites are accepted:

1. Install Expo Notifications
2. Get push token and store in user profile
3. In `accept-invite-by-id` Edge Function, send push notification:

```typescript
// Send push notification to inviter
const { data: inviter } = await supabase
  .from('profiles')
  .select('push_token')
  .eq('id', transaction.inviter_id)
  .single()

if (inviter?.push_token) {
  await sendPushNotification(inviter.push_token, {
    title: 'Invite Accepted!',
    body: 'Your transaction invite was accepted.',
    data: { transactionId: updatedTransaction.id }
  })
}
```

### Analytics
Track invite acceptance rates:
- Number of invites created
- Number of invites accepted vs declined
- Time to acceptance
- Conversion funnel from web to app

## Support
For issues or questions, check:
1. Supabase logs for Edge Function errors
2. React Native logs for app errors
3. Network tab for API call failures
4. Supabase Realtime dashboard for connection issues

