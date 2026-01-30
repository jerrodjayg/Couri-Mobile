# TestFlight Readiness — Login & Create Account Flows

This doc explains what’s already set up so **Login** and **Create Account** work correctly in **TestFlight** (and other production/standalone builds), and what to confirm before shipping.

---

## 1. What’s already correct for TestFlight

### Supabase writes only in production builds

- **`utils/supabaseSyncGuard.js`**  
  `shouldSyncUserToSupabase()` returns:
  - **`false`** only when `Constants.appOwnership === 'expo'` (Expo Go).
  - **`true`** for TestFlight, EAS Build (internal/store), and any build where ownership is not `'expo'`.

So in TestFlight, **all Supabase user writes run** (Welcomepage save, UserService save/update, profile edits). In Expo Go they are skipped.

### Reads always hit the database

- **Phone login:** `UserService.getUserByPhone()` — always queries Supabase (no guard).
- **Google login:** `UserService.checkUserExists()` and `getUserByEmail()` — always query Supabase.
- **SplashScreen:** `UserService.checkUserExists()` / `getUserByEmail()` — always query Supabase.

So in TestFlight, **login and session checks use the real DB**.

### Create Account — phone number already in use

- **`screens/CreateAccountScreen.js`** — Before navigating to PersonalInfo, the app calls `UserService.getUserByPhone(cleanPhone)` (a **read**, no sync guard).
- If a user with that phone already exists, the user sees: **"Number already in use — There is already an account with this number. Log in or use another number."** with options **Use another number** / **Log in**.
- This check runs in **all builds including TestFlight**; no special config needed.

### Delete Account — real-time removal from DB

- **`screens/LoginSecurityScreen.js`** — When the user confirms account deletion, the app first does a direct `supabase.from('users').delete()` when `shouldSyncUserToSupabase()` is true (i.e. **TestFlight / standalone**).
- The user row is removed from the `users` table **in real time**, so the next time they create an account (same phone/email) the create-account flow is not affected by an old row.
- The edge function is still called afterward for auth cleanup; the direct delete ensures the row is gone even if the edge function fails or is slow.

### OAuth redirect for native builds

- **`hooks/useGoogleAuth.js`** uses `redirectTo: 'com.anonymous.jerrod://'` on iOS/Android.
- **`app.json`** has `"scheme": "com.anonymous.jerrod"`.

TestFlight builds use that scheme, so the redirect after Google sign-in is correct for native.

### Supabase config in builds

- **`app.json` → `extra`** has `supabaseUrl` and `supabaseAnonKey`.
- **`screens/supabaseClient.js`** reads from `Constants.expoConfig?.extra` and falls back to env/hardcoded values.

EAS Build injects `extra` from `app.json`, so TestFlight gets the right Supabase URL and anon key.

---

## 2. Checklist before TestFlight

Confirm these in your environment and dashboards:

### Supabase dashboard

1. **Redirect URLs (Authentication → URL config)**  
   Ensure the redirect used by the app is allowed. For native, that usually means Supabase’s default callback plus any **custom scheme** you use, e.g.:
   - `com.anonymous.jerrod://`
   - or the exact callback URL your Supabase project shows for “Redirect URLs”.

2. **Google provider**  
   Under Authentication → Providers → Google:
   - Google provider is enabled.
   - Client ID and secret are for the same OAuth client that has your app’s bundle ID / scheme in its allowed redirect URIs.

### Apple / Google OAuth config (for Google sign-in)

1. **iOS:** In Apple Developer / Google Cloud Console, the OAuth client used by Supabase for “Google” has:
   - Bundle ID: `com.anonymous.jerrod` (or whatever is in `app.json`).
   - Redirect URI / scheme matching what Supabase and `useGoogleAuth` use (e.g. `com.anonymous.jerrod://` or the Supabase callback URL Supabase uses for mobile).

2. **Android:** Same idea: package and redirect/scheme consistent with `app.json` and Supabase.

### EAS / build

1. **Profile used for TestFlight**  
   Typically `eas build --profile preview` (internal) or `--profile production` (store). Both produce standalone builds, so `Constants.appOwnership !== 'expo'` and `shouldSyncUserToSupabase()` is `true`.

2. **`app.json` `extra`**  
   No need to change code; just ensure `extra.supabaseUrl` and `extra.supabaseAnonKey` (or env) point at the Supabase project you want TestFlight to use.

---

## 3. Quick behavior matrix (TestFlight vs Expo Go)

| Action                         | Expo Go                          | TestFlight                       |
|--------------------------------|----------------------------------|----------------------------------|
| **Login – phone**              | DB read + Code Verify + Welcome | Same                             |
| **Login – Google (existing)**  | DB read + Welcome                | Same                             |
| **Login – Google (no account)**| Sign out + “No Account Found”     | Same                             |
| **Create Account – phone/Google** | PersonalInfo → … → Welcomepage | Same                             |
| **Create Account – phone already in DB** | Alert: “Number already in use”, Log in / Use another number | Same (read runs in both) |
| **Save user to DB (Welcomepage)** | Skipped (no Supabase write)   | **Runs** (user stored in `users`) |
| **Profile edits (name/email/phone/address)** | Local/AsyncStorage only | **Supabase updated**             |
| **Delete Account**                | Local cleanup only (no DB delete in Expo Go) | **User row removed from `users` in real time** + edge function |

---

## 4. If something breaks only in TestFlight

- **Google sign-in never returns to the app**  
  Check redirect URL in Supabase and in the Google OAuth client (iOS/Android). It must match the scheme and path your app uses (e.g. `com.anonymous.jerrod://` and any path Supabase appends).

- **Users don’t appear in Supabase `users` table**  
  1. Confirm the build is not Expo Go (e.g. install from TestFlight, not “Open in Expo Go”).  
  2. Add a temporary `console.log(Constants.appOwnership, shouldSyncUserToSupabase())` early in Welcomepage or after a successful Create Account; in TestFlight you should see `standalone` (or non-`expo`) and `true`.

- **“No Account Found” for an email you know exists**  
  Check that the TestFlight build talks to the same Supabase project (same `extra` / env) and same `users` table you’re inspecting in the dashboard.

---

## 5. One-line summary

**TestFlight:** All login and create-account flows run the same as in dev, **and** Supabase user writes (Welcomepage save, profile updates) are **on**. Expo Go keeps Supabase writes **off** so dev data doesn’t pollute production. In TestFlight you also get: **create-account phone check** (duplicate number → “Number already in use”) and **delete-account real-time DB removal** (user row deleted from `users` immediately).
