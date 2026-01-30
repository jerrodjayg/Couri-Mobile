# Login & Create Account — Backend and Database Summary

This doc explains **how the app talks to the database**, **when data is read vs written**, and **why TestFlight can behave differently from Expo Go**. Use it to understand the logic and debug TestFlight issues.

---

## 1. How the app connects to the database

### Supabase client (`screens/supabaseClient.js`)

- **One shared client:** The app uses a single `supabase` client created at load time.
- **URL and key** come from (in order):
  1. `Constants.expoConfig.extra.supabaseUrl` / `extra.supabaseAnonKey` (from `app.json` → `extra`)
  2. Env: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  3. Hardcoded fallbacks in the file

- **Auth session** is stored in AsyncStorage (key `sb-auth-token`). So:
  - **Supabase Auth** (Google sign-in, session) always uses the same client and always works for **reads** and **session** in both Expo Go and TestFlight.
  - The only thing that changes between environments is **whether we write** to the `users` table (see below).

### Table used for “account”

- **`users`** (Supabase table): one row per account.
- Typical columns: `id`, `email`, `first_name`, `last_name`, `phone`, `address_line_1`, `address_line_2`, `city`, `state`, `zip_code`, `avatar_url`, `auth_user_id`, `created_at`, `updated_at`.
- **Conflict key** for upserts: `email` (unique).

---

## 2. The “sync guard” — when we write to the database

### File: `utils/supabaseSyncGuard.js`

```js
export function shouldSyncUserToSupabase() {
  const ownership = Constants.appOwnership ?? null;
  if (ownership === 'expo') return false;  // Expo Go → don't write
  return true;   // TestFlight, standalone, or undefined → write
}
```

- **Expo Go:** `Constants.appOwnership === 'expo'` → `shouldSyncUserToSupabase()` is **false** → **no** inserts/updates to `users`.
- **TestFlight / EAS Build (standalone):** `appOwnership` is usually `'standalone'` → **true** → **writes run**.

So:

- **Reads** from `users` (e.g. “does this email/phone exist?”) **always** hit Supabase in every build.
- **Writes** to `users` (create/update account) **only** happen when `shouldSyncUserToSupabase()` is true (i.e. **not** in Expo Go).

If TestFlight isn’t writing users, the first thing to check is whether `shouldSyncUserToSupabase()` is actually `true` in that build (see “TestFlight checks” below).

---

## 3. Where we READ from the database (always)

These run in **every** environment (Expo Go and TestFlight). They **do not** use the sync guard.

| Where | What | Table | Purpose |
|-------|------|--------|---------|
| **UserService.checkUserExists(email)** | `select` by email | `users` | Login (Google): “Is this email already an account?” Splash: “Should we auto-login?” |
| **UserService.getUserByEmail(email)** | `select *` by email | `users` | Get full row for Welcomepage (Google login, Splash auto-login). |
| **UserService.getUserByPhone(phone)** | `select *` then match 10 digits on `phone` | `users` | Phone login: “Is this number linked to an account?” |

So:

- **Login** (phone or Google) and **Splash** logic always use the **real** Supabase `users` table.
- If “user not found” or “wrong data” happens in TestFlight, it’s not because reads are disabled — it’s either the same DB/project or network/RLS.

---

## 4. Where we WRITE to the database (only when sync is on)

Every **write** to `users` is behind `shouldSyncUserToSupabase()`. If it returns false (Expo Go), we skip the Supabase write but still update AsyncStorage/local state.

### 4.1 Create account — first time a user gets into the DB

- **When:** User reaches **Welcomepage** after completing the create-account flow (phone or Google).
- **Where:** `screens/Welcomepage.js` → `saveUserToDatabase()` (in a `useEffect` on mount).
- **What:** Builds `userDataForDatabase` from AsyncStorage + route params (and Supabase session for `auth_user_id`), then:
  - **If `shouldSyncUserToSupabase()`:** `supabase.from('users').upsert(..., { onConflict: 'email' })`.
  - **If not:** no Supabase call; only AsyncStorage flags like `userSavedToDatabase` are set.
- **Important:** The **only** place we **insert** a new account into `users` for the create-account flow is here. If the user never reaches Welcomepage, they are **never** in the DB.

So in **TestFlight**, a new user (phone or Google) is written to `users` **only once** they land on Welcomepage. In **Expo Go**, that upsert is skipped.

### 4.2 Profile updates (after account exists)

- **Where:** Edit screens and `UserService`:
  - **EditNameScreen, EditEmailScreen, EditPhoneScreen, EditAddressScreen:** On save, they call Supabase `update` on `users` **only if** `shouldSyncUserToSupabase()`.
  - **UserService.updateUserProfile(email, patch):** Same — guarded.
  - **UserService.saveUser(userData):** Upsert by email — guarded.
  - **UserService.saveGoogleAuthUser(...):** Insert or update — guarded (and only used in flows that we still use; create-account now relies on Welcomepage).
  - **UserService.handleExistingGoogleUser(...):** Update avatar/name/auth_user_id — guarded.

So in **TestFlight**, edits and Google “existing user” updates are written to Supabase. In **Expo Go**, they are not.

---

## 5. Login flows — no DB writes

Login **never** creates a row in `users`. It only **reads** and then navigates.

### 5.1 Phone login

1. User enters phone → **UserService.getUserByPhone(cleanPhone)** (read).
2. **No user:** Alert “No Account Found” → Create Account.
3. **User found:** Navigate to **CodeVerify** with `userData` from DB. User enters **1111** → we write to **AsyncStorage** (tempUserData, userProfileData, etc.) and **replace** to **Welcomepage** with that `userData`. No Supabase write in this step.

### 5.2 Google login

1. User completes Google OAuth → we get session + email.
2. Wait 3 seconds, then **UserService.checkUserExists(email)** (read).
3. **Not in DB:** Sign out, alert “No Account Found” → Create Account.
4. **In DB:** **UserService.getUserByEmail(email)** (read full row), then **UserService.handleExistingGoogleUser(...)** (optional **update** in DB only if `shouldSyncUserToSupabase()`). Then we write to AsyncStorage and **replace** to **Welcomepage**. So the only possible write on Google *login* is that optional update; the main “create user” is not here.

### 5.3 Face ID login

- Uses **saved data in AsyncStorage** + optional **UserService.getUserByEmail** to refresh from DB. No new row created.

---

## 6. Create account flows — DB write only on Welcomepage

- **Phone:** CreateAccountScreen → PersonalInfo → BiometricSetup → PushNoti → Tutorial → **Welcomepage** → `saveUserToDatabase()` runs (guarded).
- **Google:** CreateAccountScreen (Google) → PersonalInfo → same chain → **Welcomepage** → same `saveUserToDatabase()`.

Until the user reaches Welcomepage, **no** row is created in `users`. So if TestFlight “doesn’t save” new users, either:

- They never reached Welcomepage, or  
- `shouldSyncUserToSupabase()` is false in that build (see below).

---

## 7. Data flow diagram (simplified)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SUPABASE (project)                                                      │
│  - Auth: sessions, Google OAuth (same in Expo Go & TestFlight)           │
│  - Table: users (reads always; writes only when shouldSyncUserToSupabase) │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  supabase.from('users').select / insert / update / upsert
         │  (reads: always; writes: only if !Expo Go)
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  APP                                                                     │
│  - supabaseClient.js: one client, URL/key from extra or env              │
│  - UserService: checkUserExists, getUserByEmail, getUserByPhone,         │
│    saveUser, saveGoogleAuthUser, handleExistingGoogleUser,               │
│    updateUserProfile (all writes gated by shouldSyncUserToSupabase)      │
│  - Welcomepage: saveUserToDatabase() → upsert to users (guarded)         │
│  - Edit* screens: update users (guarded)                                 │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  AsyncStorage: tempUserData, userProfileData, userSavedToDatabase,
         │  hasLoggedInBefore, userLastAction, sb-auth-token (session)
         ▼
  UI (Login, CreateAccount, CodeVerify, Welcomepage, Splash, etc.)
```

---

## 8. TestFlight checks (why it might “not work” like Expo Go)

### 8.1 Confirm we’re actually in a standalone build

In Expo Go, `Constants.appOwnership === 'expo'` so we **never** write to `users`. In TestFlight we expect `'standalone'`.

Add temporarily (e.g. in Welcomepage when saving, or on Splash):

```js
import Constants from 'expo-constants';
import { shouldSyncUserToSupabase } from '../utils/supabaseSyncGuard';

console.log('appOwnership:', Constants.appOwnership);
console.log('shouldSyncUserToSupabase:', shouldSyncUserToSupabase());
```

- In **TestFlight** you should see `appOwnership: 'standalone'` and `shouldSyncUserToSupabase: true`.
- If you see `'expo'` or `false` in a TestFlight build, the build isn’t being detected as standalone (rare); then we’d need to adjust the guard or build config.

### 8.2 Same project and table

- Supabase URL and anon key in TestFlight come from **app.json `extra`** (or env in EAS). Ensure they point to the **same** Supabase project you use in the dashboard.
- All logic uses the **`users`** table. If RLS or table name differs, reads/writes can fail or seem to “not save.”

### 8.3 Welcomepage must run for new users

- New users (phone or Google create-account) are inserted **only** when **Welcomepage** runs its `saveUserToDatabase()`.
- If the app crashes or the user leaves before Welcomepage, no row is created. So “users not in DB” in TestFlight can mean:
  - They didn’t complete the flow to Welcomepage, or
  - `shouldSyncUserToSupabase()` was false, or
  - The upsert failed (check Supabase logs / RLS).

### 8.4 Auth vs `users` table

- **Supabase Auth** (Google sign-in, session) works independently of the sync guard. So in TestFlight, login can “work” (session exists) but the **app** checks the **`users`** table to decide “existing account” vs “no account.” If the row was never created (e.g. never reached Welcomepage), Google login will correctly say “No Account Found” and send them to Create Account.

---

## 9. One-paragraph summary

The app uses a **single Supabase client** (URL/key from `app.json` extra or env). It **always reads** from the `users` table for login and Splash (checkUserExists, getUserByEmail, getUserByPhone). It **only writes** to `users` when **not** in Expo Go: `shouldSyncUserToSupabase()` is true in TestFlight/standalone and false in Expo Go. The **only** place we **create** a new account row for the create-account flow is **Welcomepage**’s `saveUserToDatabase()`; profile updates and “existing Google user” updates also go through guarded code in UserService and Edit screens. So for TestFlight: ensure the build is standalone (so the guard is true), that Welcomepage is reached for new users, and that the same Supabase project/table is used; then add the short logs above if something still doesn’t match expectations.
