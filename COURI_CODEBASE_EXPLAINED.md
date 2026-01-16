# Couri Codebase Explained: A Beginner's Guide
## (For When You Were Just Vibe Coding This Whole Time 😅)

---

## Table of Contents
1. [What Even Is This App?](#what-even-is-this-app)
2. [The Big Picture](#the-big-picture)
3. [How The App Works (In Simple Terms)](#how-the-app-works-in-simple-terms)
4. [The Folder Structure (Where Everything Lives)](#the-folder-structure-where-everything-lives)
5. [Key Concepts Explained Simply](#key-concepts-explained-simply)
6. [The Main User Flows](#the-main-user-flows)
7. [Important Files and What They Do](#important-files-and-what-they-do)
8. [How Data Flows Through The App](#how-data-flows-through-the-app)
9. [Common Patterns You'll See](#common-patterns-youll-see)
10. [Things You Might Want to Know](#things-you-might-want-to-know)

---

## What Even Is This App?

**Couri** is basically like a middleman app for Facebook Marketplace (and other marketplaces). Here's the vibe:

- **Buyer** finds something on Facebook Marketplace
- **Buyer** pastes the link into your app
- App extracts the product info (title, price, image)
- **Buyer** creates a transaction and sends an invite link to the **Seller**
- **Seller** clicks the link, opens the app, accepts or declines
- If accepted, a **Driver** can pick it up and deliver it
- Everyone tracks the delivery in real-time

Think of it like Uber Eats, but for Facebook Marketplace items instead of food.

---

## The Big Picture

### Tech Stack (What You Built This With)

**Frontend (The App People See):**
- **React Native** - This lets you write one codebase that works on both iPhone and Android
- **Expo** - Makes React Native development way easier (handles a lot of the annoying setup)
- **React Navigation** - Handles moving between screens (like going from login → home → product details)

**Backend (The Server Stuff):**
- **Supabase** - Your entire backend in one service:
  - Database (stores users, transactions, etc.)
  - Authentication (login, signup, Google OAuth)
  - Edge Functions (little serverless functions that do specific tasks)
  - Realtime (live updates when things change)
  - Storage (for images and files)

**Other Important Libraries:**
- `AsyncStorage` - Saves data on the phone (like remembering login)
- `expo-linking` - Handles deep links (when someone clicks a link and it opens your app)
- `react-native-maps` - Shows maps and locations
- `expo-local-authentication` - Face ID / Touch ID login

---

## How The App Works (In Simple Terms)

### 1. **User Opens App**
   - App checks: "Are you logged in?"
   - If yes → Go to Welcomepage
   - If no → Go to Login screen

### 2. **User Wants to Buy Something**
   - Clicks "Buy" button
   - Pastes Facebook Marketplace URL
   - App sends URL to backend
   - Backend scrapes/extracts product info
   - Shows preview: "Is this the right item?"
   - User confirms price
   - User enters addresses (pickup & delivery)
   - User connects payment (Plaid)
   - User gets a shareable link
   - User sends link to seller

### 3. **Seller Receives Link**
   - Clicks link in browser
   - Sees preview of the transaction
   - Clicks "Open in App"
   - App opens (or downloads if not installed)
   - Seller sees invitation card
   - Seller clicks Accept or Decline

### 4. **Buyer Gets Notified**
   - When seller accepts, buyer gets instant notification
   - Transaction status updates in real-time
   - Buyer can track the delivery

### 5. **Driver Delivers**
   - Driver sees available deliveries
   - Accepts delivery
   - Goes through steps: Pick up → Drive → Deliver → Photo proof

---

## The Folder Structure (Where Everything Lives)

```
jerrod/
├── screens/          ← Main screens (login, profile, account stuff)
├── screens2/         ← Transaction flow screens (buy/sell process)
├── screens3/         ← Driver delivery screens
├── screens4/         ← Return/refund screens
├── components/       ← Reusable UI pieces (buttons, cards, etc.)
├── contexts/         ← Global state (like who's logged in)
├── hooks/            ← Custom React hooks (reusable logic)
├── utils/            ← Helper functions & API calls
├── supabase/
│   └── functions/    ← Backend functions (server-side code)
└── App.js            ← The main file that sets everything up
```

**Think of it like this:**
- `screens/` = Different pages of your app
- `components/` = Reusable pieces (like a button you use everywhere)
- `utils/` = Helper functions (like "format this price" or "call this API")
- `contexts/` = Global state (like "who is the current user?")
- `supabase/functions/` = Backend code that runs on a server

---

## Key Concepts Explained Simply

### 1. **React Native Components**
A component is like a LEGO block. You build screens out of components.

```javascript
// This is a component
function Welcomepage() {
  return (
    <View>
      <Text>Welcome!</Text>
    </View>
  );
}
```

### 2. **State (useState)**
State is like a variable that, when it changes, the screen updates automatically.

```javascript
const [count, setCount] = useState(0);
// count is the value
// setCount is how you change it
// When you call setCount(5), the screen automatically re-renders
```

### 3. **Navigation**
Moving between screens. Like clicking links on a website.

```javascript
navigation.navigate('Welcomepage'); // Go to Welcomepage
navigation.goBack(); // Go back
```

### 4. **AsyncStorage**
Saving data on the phone that persists even after the app closes.

```javascript
await AsyncStorage.setItem('key', 'value'); // Save
const value = await AsyncStorage.getItem('key'); // Read
```

### 5. **Supabase**
Your backend. It's like a database + authentication + API all in one.

```javascript
// Get data from database
const { data } = await supabase.from('users').select('*');

// Sign in user
const { user } = await supabase.auth.signInWithPassword({ email, password });
```

### 6. **Deep Linking**
When someone clicks a link and it opens your app (instead of a browser).

```
https://gocouri.com/invite/12345
↓
Opens your app
↓
App reads "12345" and shows that invitation
```

### 7. **Edge Functions**
Little programs that run on Supabase's servers. They do things like:
- Scrape Facebook Marketplace
- Create transactions
- Send notifications

---

## The Main User Flows

### Flow 1: New User Signs Up

```
SplashScreen
  ↓
PromptScreen (Choose: Create Account or Login)
  ↓
CreateAccountScreen (Enter email/password)
  ↓
AccountSetupScreen (Enter name, etc.)
  ↓
BiometricSetupScreen (Set up Face ID)
  ↓
TutorialScreen (4 slides explaining the app)
  ↓
Welcomepage (Main screen)
```

### Flow 2: Existing User Logs In

```
SplashScreen
  ↓
PromptScreen
  ↓
LogInScreen (Email/password or Google)
  ↓
Welcomepage
```

### Flow 3: Buyer Creates Transaction

```
Welcomepage
  ↓ (Click "Buy")
URL Screen (Paste Facebook link)
  ↓
ProductPreview (See product details)
  ↓
ProductPrice (Confirm/edit price)
  ↓
PickupAddress (Where to pick up item)
  ↓
ConfirmAddress (Where to deliver)
  ↓
PlaidConnect (Connect bank account)
  ↓
Share Screen (Get shareable link)
  ↓
Welcomepage (Wait for seller to accept)
```

### Flow 4: Seller Accepts Transaction

```
Seller clicks link in browser
  ↓
Web page shows preview
  ↓
Seller clicks "Open in App"
  ↓
App opens → Welcomepage
  ↓
Invitation card appears
  ↓
Seller clicks "Accept"
  ↓
Buyer gets notified instantly
```

### Flow 5: Driver Delivers

```
DriverPortalScreen (See available deliveries)
  ↓
DriverAcceptDelivery (Accept a delivery)
  ↓
HeadToSeller (Navigate to seller)
  ↓
AtSellerHouse (Arrive at seller)
  ↓
RetrieveFromSeller (Pick up item)
  ↓
HeadToBuyer (Navigate to buyer)
  ↓
DeliverToBuyer (Arrive at buyer)
  ↓
HandtoBuyer (Complete delivery)
```

---

## Important Files and What They Do

### `App.js` - The Main Entry Point
**What it does:** Sets up navigation, handles deep links, wraps everything in providers.

**Key things:**
- Defines all your screens
- Handles deep linking (when someone clicks a link)
- Sets up navigation structure

**Think of it as:** The table of contents for your app.

---

### `screens/Welcomepage.js` - The Home Screen
**What it does:** The main landing page. Shows different things based on state:
- Default: "Welcome back!" with Buy/Sell buttons
- If you just sent an invite: Shows transaction preview
- If you received an invite: Shows invitation card

**Key concepts:**
- Uses `useState` to track what to show
- Uses `useEffect` to load data when screen opens
- Conditionally renders different UI based on state

**Think of it as:** The main dashboard that changes based on what's happening.

---

### `screens/LogInScreen.js` - Login Screen
**What it does:** Handles user authentication.

**Key things:**
- Email/password login
- Google OAuth login
- Biometric login (Face ID)
- Navigates to Welcomepage after successful login

**Think of it as:** The front door to your app.

---

### `screens2/Share.js` - Share Screen
**What it does:** Creates the transaction invitation and generates the shareable link.

**Key things:**
- Takes all the product data (title, price, image, addresses)
- Creates a transaction in the database
- Generates a web URL that sellers can click
- Copies link to clipboard
- Navigates back to Welcomepage with preview data

**Think of it as:** The "send invitation" screen.

---

### `screens2/ProductPreview.js` - Product Preview
**What it does:** Shows the product details extracted from Facebook Marketplace.

**Key things:**
- Displays product image, title, price
- Lets user edit/confirm details
- Navigates to next step in flow

**Think of it as:** The "is this the right item?" screen.

---

### `utils/transactionApi.js` - Transaction API
**What it does:** Functions that talk to the backend about transactions.

**Key functions:**
- `createTransaction()` - Creates a new transaction
- `fetchTransactionByToken()` - Gets transaction by invite token
- `acceptTransaction()` - Seller accepts a transaction
- `declineTransaction()` - Seller declines a transaction

**Think of it as:** The helper functions for transaction stuff.

---

### `contexts/UserContext.js` - User Context
**What it does:** Keeps track of who's logged in globally.

**Key things:**
- Stores current user
- Loads user data from database
- Provides user data to any component that needs it

**Think of it as:** A global variable that any screen can access to know who's logged in.

---

### `supabase/functions/scrape-facebook/index.ts` - Facebook Scraper
**What it does:** Takes a Facebook Marketplace URL and extracts product info.

**How it works:**
1. Receives URL from app
2. Fetches the HTML of that page
3. Parses HTML to find title, price, image
4. Returns structured data

**Think of it as:** A robot that reads Facebook pages and extracts the important info.

---

### `supabase/functions/create-invite/index.ts` - Create Invite Function
**What it does:** Creates a transaction invitation in the database.

**How it works:**
1. Receives product data from app
2. Creates a transaction record with status "pending"
3. Returns transaction ID
4. App uses this ID to create the shareable link

**Think of it as:** The backend function that saves transactions.

---

### `supabase/functions/accept-invite-by-id/index.ts` - Accept Invite Function
**What it does:** Handles when a seller accepts or declines an invitation.

**How it works:**
1. Receives transaction ID and action (accept/decline)
2. Updates transaction status in database
3. Sends real-time notification to buyer
4. Returns updated transaction

**Think of it as:** The backend function that processes accept/decline actions.

---

## How Data Flows Through The App

### Example: Creating a Transaction

```
1. User on Share.js screen
   ↓
2. User clicks "Copy Link"
   ↓
3. Share.js calls createTransactionInvitation()
   ↓
4. Function sends data to Supabase Edge Function
   ↓
5. Edge Function creates record in database
   ↓
6. Edge Function returns transaction ID
   ↓
7. Share.js generates web URL: https://gocouri.com/invite/{id}
   ↓
8. Share.js saves preview data to AsyncStorage
   ↓
9. Share.js navigates to Welcomepage
   ↓
10. Welcomepage reads AsyncStorage
   ↓
11. Welcomepage shows transaction preview
```

### Example: Seller Accepts Invitation

```
1. Seller clicks link: https://gocouri.com/invite/12345
   ↓
2. Web page loads, fetches transaction from Edge Function
   ↓
3. Seller clicks "Open in App"
   ↓
4. Deep link opens app: couri://invite/12345
   ↓
5. App.js receives deep link
   ↓
6. App.js calls fetchInviteByToken()
   ↓
7. Edge Function returns transaction data
   ↓
8. App.js navigates to Welcomepage with invite data
   ↓
9. Welcomepage shows invitation card
   ↓
10. Seller clicks "Accept"
   ↓
11. Welcomepage calls acceptTransaction()
   ↓
12. Edge Function updates database
   ↓
13. Edge Function broadcasts real-time event
   ↓
14. Buyer's Welcomepage receives real-time update
   ↓
15. Buyer sees notification: "Invite accepted!"
```

---

## Common Patterns You'll See

### 1. **Loading States**
Almost every screen has a loading state:

```javascript
const [loading, setLoading] = useState(true);

useEffect(() => {
  // Load data
  setLoading(false);
}, []);

if (loading) {
  return <Text>Loading...</Text>;
}
```

**Why:** Shows a spinner while data is being fetched.

---

### 2. **Navigation Params**
Passing data between screens:

```javascript
// Screen A: Navigate with data
navigation.navigate('ScreenB', { 
  productTitle: 'iPhone',
  price: '$500'
});

// Screen B: Receive data
const { productTitle, price } = route.params || {};
```

**Why:** Lets you pass information from one screen to another.

---

### 3. **AsyncStorage for Persistence**
Saving data that should survive app restarts:

```javascript
// Save
await AsyncStorage.setItem('marketplacePreview', JSON.stringify(data));

// Load
const saved = await AsyncStorage.getItem('marketplacePreview');
const data = JSON.parse(saved);
```

**Why:** Keeps data even if the user closes the app.

---

### 4. **Conditional Rendering**
Showing different UI based on state:

```javascript
{marketplacePreview ? (
  <View>
    <Text>Transaction Preview</Text>
  </View>
) : (
  <View>
    <Text>Welcome Screen</Text>
  </View>
)}
```

**Why:** The screen changes based on what's happening.

---

### 5. **useEffect for Side Effects**
Running code when something changes:

```javascript
useEffect(() => {
  // This runs when the component mounts
  loadUserData();
}, []); // Empty array = run once on mount

useEffect(() => {
  // This runs whenever 'userId' changes
  fetchTransactions(userId);
}, [userId]); // Runs when userId changes
```

**Why:** Loads data when the screen opens or when dependencies change.

---

### 6. **Error Handling**
Catching and displaying errors:

```javascript
try {
  const data = await fetchData();
} catch (error) {
  console.error('Error:', error);
  Alert.alert('Error', 'Something went wrong');
}
```

**Why:** Prevents the app from crashing when something goes wrong.

---

## Things You Might Want to Know

### 1. **Why Multiple Screen Folders?**
You have `screens/`, `screens2/`, `screens3/`, `screens4/`. This is probably because you added features over time and organized them by flow:
- `screens/` = Core app screens (auth, profile)
- `screens2/` = Transaction flow (buy/sell)
- `screens3/` = Driver delivery flow
- `screens4/` = Return/refund flow

**Could you organize better?** Yes, but it works! Don't fix what isn't broken.

---

### 2. **Why So Many Edge Functions?**
Each Edge Function does one specific thing:
- `scrape-facebook` - Scrapes Facebook
- `create-invite` - Creates invitations
- `accept-invite-by-id` - Handles accept/decline
- `fetch-product-metadata` - Gets product info
- etc.

**Why separate?** Easier to maintain, test, and debug. Each function has one job.

---

### 3. **The Deep Linking Setup**
Your app handles multiple types of links:
- `com.anonymous.jerrod://` - Custom scheme (works everywhere)
- `https://gocouri.com` - Universal links (iOS/Android native)
- `https://www.gocouri.com` - Same but with www

**Why multiple?** Different platforms prefer different formats. You're covering all bases.

---

### 4. **Real-time Updates**
You use Supabase Realtime to get instant updates:
- When seller accepts → buyer sees it immediately
- No need to refresh or poll

**How it works:** Supabase opens a WebSocket connection and pushes updates when the database changes.

---

### 5. **The Transaction Status Flow**
Transactions have different statuses:
- `pending` - Waiting for seller to accept
- `accepted` - Seller accepted, ready for driver
- `declined` - Seller declined
- `in_progress` - Driver is delivering
- `completed` - Delivery done

**Why:** Tracks where each transaction is in the process.

---

### 6. **Why AsyncStorage for Preview Data?**
When a buyer creates a transaction, you save the preview to AsyncStorage so:
- If the app closes, the preview is still there when they reopen
- The preview persists across navigation
- You can show it on Welcomepage even after navigating away

**Why not just use state?** State is lost when the component unmounts. AsyncStorage persists.

---

### 7. **The Invite Token System**
When creating a transaction, you generate a unique token:
- Token is URL-safe (base64url format)
- Used in the deep link
- Backend can look up transaction by token

**Why tokens?** More secure than using transaction IDs directly. Tokens can expire, be revoked, etc.

---

## Common Issues and How They're Handled

### Issue 1: User Not Logged In When Opening Deep Link
**Solution:** Store the token in AsyncStorage, then check after login.

```javascript
// App.js - Store token
await AsyncStorage.setItem('pendingTransactionToken', token);

// After login - Check for pending token
const token = await AsyncStorage.getItem('pendingTransactionToken');
if (token) {
  // Fetch transaction and show it
}
```

---

### Issue 2: Facebook Requires Login
**Solution:** Try server-side scraping first, fall back to client-side if it detects a login page.

```javascript
// Edge Function detects login page
if (isLoginPage) {
  return { error: 'Login page detected - requires client-side scraping' };
}

// App falls back to client-side scraping
```

---

### Issue 3: Network Errors
**Solution:** Try/catch blocks everywhere, show user-friendly error messages.

```javascript
try {
  const data = await fetchData();
} catch (error) {
  if (error.message.includes('network')) {
    Alert.alert('No Internet', 'Please check your connection');
  } else {
    Alert.alert('Error', 'Something went wrong');
  }
}
```

---

## Tips for Understanding the Code

### 1. **Start with App.js**
This is your roadmap. See what screens exist and how they connect.

### 2. **Follow the User Flow**
Pick a flow (like "buyer creates transaction") and trace it through the code:
- Which screen?
- What functions are called?
- What data is passed?
- Where does it go next?

### 3. **Read the Console Logs**
You have a LOT of console.log statements. They're your friend! They show:
- What's happening
- Where data is flowing
- When errors occur

### 4. **Check the Edge Functions**
The backend functions are in `supabase/functions/`. Read them to understand what the backend does.

### 5. **Use the React DevTools**
If you're running in Expo Go, you can use React DevTools to see:
- Component state
- Props
- Component tree

---

## What You've Built (A Summary)

You've built a **full-stack marketplace transaction app** with:

✅ **Authentication** - Login, signup, Google OAuth, biometric  
✅ **Product Scraping** - Extracts data from Facebook Marketplace  
✅ **Transaction Management** - Create, accept, decline transactions  
✅ **Deep Linking** - Links that open your app  
✅ **Real-time Updates** - Instant notifications  
✅ **Payment Integration** - Plaid for bank connections  
✅ **Delivery Tracking** - Driver flow with step-by-step tracking  
✅ **User Profiles** - Account management, settings  
✅ **Web Invitations** - Shareable links that work in browsers  

**That's a lot!** You've basically built a mini marketplace platform. 🎉

---

## Next Steps (If You Want to Improve)

1. **Organize the screens folders** - Maybe consolidate into feature-based folders
2. **Add error boundaries** - Catch errors before they crash the app
3. **Add loading skeletons** - Better loading states
4. **Add unit tests** - Test your functions
5. **Add TypeScript** - Catch errors before runtime
6. **Document your API** - Write down what each Edge Function does
7. **Add analytics** - Track user behavior
8. **Optimize images** - Use smaller images, lazy loading

But honestly? **What you have works.** Don't let perfect be the enemy of good.

---

## Final Thoughts

You've built something pretty complex here. Even if you were "just vibe coding," you've created:
- A React Native app
- A backend with Supabase
- Deep linking
- Real-time updates
- Payment integration
- A delivery tracking system

**That's impressive!** 🚀

The code might not be perfect, but it works. And that's what matters. You can always refactor later.

---

## Quick Reference: Common Commands

```bash
# Start the app
npm start
# or
expo start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Deploy Edge Function
supabase functions deploy function-name
```

---

## Glossary

- **Component** - A reusable piece of UI
- **State** - Data that changes and causes re-renders
- **Props** - Data passed to a component
- **Navigation** - Moving between screens
- **AsyncStorage** - Local storage on the device
- **Supabase** - Your backend (database + auth + functions)
- **Edge Function** - Serverless function that runs on Supabase
- **Deep Link** - A URL that opens your app
- **Realtime** - Live updates via WebSocket
- **OAuth** - Third-party login (like Google Sign-In)

---

**You got this!** 💪

If you have questions about specific parts, just search the codebase for keywords or check the console logs. They'll guide you.

---

*Generated for: Someone who was just vibe coding but wants to understand what they built*  
*Date: 2025*  
*App: Couri (Jerrod)*

