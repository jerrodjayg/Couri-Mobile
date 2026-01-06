# Squarespace Invite Page Setup Instructions

## The Problem
You're getting a 404 error when accessing `https://gocouri.com/invite?id=TRANSACTION_ID`

This means the page doesn't exist or isn't configured correctly on Squarespace.

## Solution: Create/Configure the Invite Page

### Step 1: Check if the Page Exists
1. Log into Squarespace
2. Go to **Pages** in the left sidebar
3. Look for a page called **"invite"** or **"Invite"**
4. Check if it's:
   - ✅ Published (not hidden)
   - ✅ URL slug is set to **"invite"** (Settings → URL Slug)

### Step 2: If Page Doesn't Exist - Create It
1. In Squarespace, click **Pages** → **+ Add Page**
2. Choose **Blank Page**
3. Name it: **"Invite"**
4. Click **Settings** (gear icon) → **URL Slug**
5. Set URL slug to: **"invite"** (lowercase, no spaces)
6. Click **Save**

### Step 3: Add the HTML Code
1. On the "Invite" page, click **Edit**
2. Click **+ Add Block**
3. Search for **"Code"** block
4. Add the **Code** block to the page
5. Open the file: `web-invite-squarespace-code.html`
6. Copy **ALL** the content (from the first `<!--` to the last `</script>`)
7. Paste it into the Code block
8. Click **Save**
9. Click **Publish** (top right)

### Step 4: Test the Page
1. Visit: `https://gocouri.com/invite`
2. You should see the invitation page (even without an ID, it will show "Invalid Link")
3. Test with a transaction ID: `https://gocouri.com/invite?id=TEST123`

## Alternative: If You Can't Create the Page

If you can't create or edit the "invite" page, we can use a different URL format:

### Option A: Use a Different Path
Update the URL generation to use a path that works:
- `/web-invite` 
- `/invitation`
- `/join`

### Option B: Use a Subdomain
Host the page on a subdomain like:
- `invite.gocouri.com`
- `app.gocouri.com`

### Option C: Use a Different Hosting Service
- Upload to Netlify, Vercel, or GitHub Pages
- Update the URL in the code

## Quick Test
Try accessing these URLs directly in your browser:
- `https://gocouri.com/invite` - Should show the page (or 404 if it doesn't exist)
- `https://gocouri.com/invite/` - With trailing slash
- `https://www.gocouri.com/invite` - With www

Let me know which one works (or if they all give 404) and I'll update the code accordingly.
