# 🚀 Universal Links Setup Guide - Step-by-Step

**Your Team ID:** S4VHGX8378 ✅  
**Your Domain:** gocouri.com  
**Website:** Squarespace  
**Domain Registrar:** GoDaddy  

---

## **📋 Overview: What You'll Do**

1. Create free Cloudflare account (2 min)
2. Add gocouri.com to Cloudflare (3 min)
3. Update nameservers at GoDaddy (5 min)
4. Create Worker with my code (3 min)
5. Test it works (1 min)
6. Rebuild TestFlight (20 min)
7. Test on device (2 min)

**Total: ~35 minutes** (plus DNS wait time: 5-60 min)

---

## **STEP 1: Create Cloudflare Account**

### **1.1 Sign Up**
1. Go to: https://dash.cloudflare.com/sign-up
2. Enter your email
3. Create a password
4. Click **"Create Account"**
5. Verify your email (check inbox)

### **1.2 Login**
1. Go to: https://dash.cloudflare.com/login
2. Sign in with your email/password

✅ **You should see:** Cloudflare dashboard

---

## **STEP 2: Add Your Domain to Cloudflare**

### **2.1 Add Site**
1. Click **"Add a Site"** (big button, or in sidebar)
2. Type: `gocouri.com`
3. Click **"Add site"**

### **2.2 Select Plan**
1. Scroll down to **"Free"** plan
2. Click **"Continue"**

### **2.3 Review DNS Records**
1. Cloudflare will scan your current DNS records
2. You'll see a list of records like:
   ```
   A     @          123.45.67.89
   CNAME www        gocouri.squarespace.com
   ```
3. These should match what you have in GoDaddy
4. Click **"Continue"**

### **2.4 Get Nameservers**
Cloudflare shows you **2 nameservers** like:
```
bob.ns.cloudflare.com
sara.ns.cloudflare.com
```

📝 **WRITE THESE DOWN!** You'll need them in Step 3.

**Example:**
```
Nameserver 1: __________________.ns.cloudflare.com
Nameserver 2: __________________.ns.cloudflare.com
```

⚠️ **DON'T CLICK "DONE" YET!** Leave this page open.

---

## **STEP 3: Update Nameservers at GoDaddy**

### **3.1 Open GoDaddy in New Tab**
1. Go to: https://dcc.godaddy.com/domains
2. Sign in to your GoDaddy account
3. Find `gocouri.com` in your domain list
4. Click **"DNS"** or **"Manage DNS"**

### **3.2 Change Nameservers**
1. Scroll to **"Nameservers"** section
2. Click **"Change"** or **"Manage"**
3. Select **"Custom"** or **"I'll use my own nameservers"**
4. **Replace** the existing nameservers with Cloudflare's:
   - Remove GoDaddy's nameservers
   - Add the 2 Cloudflare nameservers you wrote down
5. Click **"Save"**

### **3.3 Confirm**
GoDaddy will warn you: "This will affect your site"
- Click **"Continue"** or **"I understand"**

✅ **Done at GoDaddy!** You can close that tab.

### **3.4 Back to Cloudflare**
1. Go back to the Cloudflare tab
2. Click **"Done, check nameservers"**

Cloudflare will check if nameservers are updated:
- ⏳ **Pending:** DNS is propagating (wait 5-60 min)
- ✅ **Active:** DNS is ready!

⚠️ **Your Squarespace site will keep working!** DNS propagation doesn't break your site.

---

## **STEP 4: Wait for DNS Propagation (Optional)**

You can continue to Step 5 immediately, or wait for DNS to fully propagate.

**Check status:**
- Go to: https://dash.cloudflare.com
- Look for your site `gocouri.com`
- Status should change from "Pending" to "Active"

**Usually takes:** 5-30 minutes  
**Can take up to:** 24 hours (rare)

---

## **STEP 5: Create Cloudflare Worker**

### **5.1 Navigate to Workers**
1. In Cloudflare dashboard, click **"Workers & Pages"** (left sidebar)
2. Click **"Create Application"**
3. Click **"Create Worker"** (on the right side)

### **5.2 Name Your Worker**
1. Name it: `aasa-handler`
2. Click **"Deploy"**

### **5.3 Edit Worker Code**
1. After it deploys, click **"Edit Code"** (top right)
2. You'll see a code editor with default code
3. **DELETE ALL** the existing code (select all, delete)
4. **COPY the code from your file:** `cloudflare-worker-aasa.js`
5. **PASTE it** into the editor
6. Click **"Save and Deploy"** (top right)

✅ **Worker is now deployed!**

---

## **STEP 6: Add Route to Your Domain**

### **6.1 Go to Triggers**
1. Click **"Triggers"** tab (at the top of the page)
2. Scroll to **"Routes"** section
3. Click **"Add Route"**

### **6.2 Configure Route**
Fill in:
- **Route:** `gocouri.com/.well-known/*`
- **Zone:** Select `gocouri.com` from dropdown

Click **"Add Route"**

### **6.3 Add Second Route (for www)**
Click **"Add Route"** again:
- **Route:** `www.gocouri.com/.well-known/*`
- **Zone:** Select `gocouri.com` from dropdown

Click **"Add Route"**

✅ **Routes configured!**

**What this means:**
- Requests to `gocouri.com/.well-known/*` → Your Worker handles
- All other requests to `gocouri.com` → Go to Squarespace (normal)

---

## **STEP 7: Test It's Working**

### **7.1 Test in Browser**
1. Open browser
2. Go to: `https://gocouri.com/.well-known/apple-app-site-association`

**You should see:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "S4VHGX8378.com.anonymous.jerrod",
        "paths": [
          "/deeplink/i/*",
          "/i/*"
        ]
      }
    ]
  }
}
```

✅ **If you see this JSON, it's working!**

### **7.2 Test Content-Type**
Open browser developer tools (F12):
1. Go to **Network** tab
2. Reload the page
3. Click on the `apple-app-site-association` request
4. Look at **Headers** → **Response Headers**
5. Find `Content-Type`

**Should show:** `application/json`

✅ **If Content-Type is correct, you're done with Cloudflare!**

### **7.3 Verify Your Main Site Still Works**
1. Go to: `https://gocouri.com`
2. Your Squarespace site should load normally

✅ **Both should work!**

---

## **STEP 8: Rebuild for TestFlight**

Now that Universal Links are configured, rebuild your app:

### **8.1 Commit Updated Config**
```bash
git add app.json public/.well-known/apple-app-site-association
git commit -m "Add Universal Links configuration with Team ID"
git push
```

### **8.2 Build for TestFlight**
```bash
eas build --platform ios --profile preview
```

**Wait ~20 minutes** for build to complete.

### **8.3 Upload to TestFlight**
The build will automatically upload to TestFlight when done.

---

## **STEP 9: Test Universal Links**

### **9.1 Install Fresh**
1. Install the new TestFlight build on your device
2. Open the app
3. Sign in

### **9.2 Test Universal Link**
1. Open Notes app or Messages on your iPhone
2. Type: `https://gocouri.com/deeplink/i/test123`
3. Tap the link

**What should happen:**
- ✅ Opens your Couri app in TestFlight
- ✅ Shows invitation (or error if token doesn't exist)

**What should NOT happen:**
- ❌ Opens Safari
- ❌ Goes to App Store

### **9.3 Test Real Flow**
Follow the complete flow:
- Person 1: Create invitation
- Person 2: Tap link
- Should open TestFlight app
- See invitation card
- Accept
- Person 1 gets notification

---

## **🐛 Troubleshooting**

### **Problem: "Cannot connect to Cloudflare"**
**Solution:** DNS hasn't propagated yet. Wait 30 more minutes.

### **Problem: "404 Not Found" for AASA file**
**Solution:** 
- Check Worker is deployed
- Check Routes are added correctly
- Route should be: `gocouri.com/.well-known/*`

### **Problem: "Universal Link opens Safari, not app"**
**Solution:**
- Uninstall TestFlight app
- Reinstall from TestFlight
- iOS caches AASA files, fresh install clears cache

### **Problem: "Content-Type is text/html"**
**Solution:**
- Worker code might not be saved
- Re-edit Worker, make sure code is correct
- Click "Save and Deploy"

---

## **📝 Summary of What You'll Do:**

| Step | Action | Time | Status |
|------|--------|------|--------|
| 1 | Create Cloudflare account | 2 min | ⬜ |
| 2 | Add gocouri.com to Cloudflare | 3 min | ⬜ |
| 3 | Update nameservers at GoDaddy | 5 min | ⬜ |
| 4 | Wait for DNS propagation | 5-60 min | ⬜ |
| 5 | Create Worker in Cloudflare | 3 min | ⬜ |
| 6 | Add routes in Cloudflare | 2 min | ⬜ |
| 7 | Test AASA file | 1 min | ⬜ |
| 8 | Rebuild TestFlight | 20 min | ⬜ |
| 9 | Test on device | 2 min | ⬜ |

---

## **🎯 Ready to Start?**

I've prepared:
- ✅ Updated AASA file with your Team ID: S4VHGX8378
- ✅ Complete Worker code in `cloudflare-worker-aasa.js`
- ✅ Step-by-step guide above

**Next:** 
1. Start with **STEP 1** above (create Cloudflare account)
2. **Tell me when you complete each step**
3. I'll help if you get stuck anywhere
4. When you get to STEP 5, just copy the code from `cloudflare-worker-aasa.js`

**Ready to start with Step 1?** Just tell me "Starting Step 1" and let me know if you have any questions! 🚀
