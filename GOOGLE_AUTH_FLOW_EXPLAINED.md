# Google Auth: How It Works (Log In & Sign Up)

This doc explains the full Google auth flow, where errors can occur, and how login vs sign-up differ.

---

## 1. Shared pieces

### `useGoogleAuth` hook (`hooks/useGoogleAuth.js`)

Both **Log In** and **Sign Up** use the same hook:

```js
const { signIn: signInGoogle, loading: googleLoading } = useGoogleAuth();
// ...
const result = await signInGoogle();
```

The hook returns an object like:

- `{ type: 'success', url?, session? }` — OAuth completed; `session` may be present.
- `{ type: 'error', message, shouldShowErrorScreen }` — Something failed.
- `{ type: 'cancel' }` or `{ type: 'dismiss' }` — User closed/cancelled (no alert).

---

### Supabase client (`screens/supabaseClient.js`)

- **PKCE**: `flowType: 'pkce'` — auth uses PKCE; Supabase stores `code_verifier` in AsyncStorage (`sb-auth-token` and related keys).
- **Redirect**: `com.anonymous.jerrod://` on iOS/Android; on web, `window.location.origin`.
- **Session**: `persistSession: true` and custom `storageAdapter` (AsyncStorage) so tokens survive app restarts.
- **Storage key**: `sb-auth-token` for the main auth payload.

---

## 2. What `signInGoogle()` does (step by step)

### Step 1: Guards and timeouts

- If `loading` is already true → returns without doing anything.
- A **global timeout** runs (30s web, 90s mobile). If it fires → `alert('Google sign-in is taking too long...')` and `setLoading(false)`.

### Step 2: Network check

- `fetch('https://www.google.com', { method: 'HEAD' })` with retries.
- On repeated failure → throws: *"No internet connection. Please check your network and try again."*  
  → Caught in hook’s `catch` → returns `{ type: 'error', message: '...', shouldShowErrorScreen: true }`.

### Step 3: Get OAuth URL from Supabase

- `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, scopes: 'email profile', queryParams: { access_type: 'offline', prompt: 'consent' } } })`
- 15s timeout on this call.
- **Supabase/network error** → hook maps to a message and returns `{ type: 'error', ... }`.
- **No `data.url`** → returns `{ type: 'error', message: 'No OAuth URL received...', shouldShowErrorScreen: true }`.

### Step 4: Open browser and wait for redirect

- **Web**: `window.open(data.url)` or fallback `window.location.href = data.url`; result treated as `{ type: 'success', url: data.url }` (no real redirect callback on web in this flow).
- **iOS / Android**: `WebBrowser.openAuthSessionAsync(data.url, redirectTo)`.
  - When the user finishes on Google, Google redirects to `com.anonymous.jerrod://?code=...` (and possibly `state`, etc.).
  - `openAuthSessionAsync` resolves with `{ type, url }`:
    - `type: 'success'`, `url` = that redirect URL (includes `code=...`).
    - `type: 'cancel'` or `'dismiss'` → user closed the browser without completing.

### Step 5: When `type === 'success'` and `url` has `code=`

1. **Wait 2s** for Supabase to pick up the code (it can do so via `detectSessionInUrl` and PKCE).
2. **`supabase.auth.getSession()`** (with 10s timeout):
   - If `session` exists → return `{ type: 'success', url, session }`.
3. If no session, **manual code exchange**:
   - Parse `code` from `url` (handles `com.anonymous.jerrod://?code=...` and `...://?code=...`).
   - `supabase.auth.exchangeCodeForSession(code)` (15s timeout).
   - Success → return `{ type: 'success', url, session }`.
   - **Exchange fails** → still return `{ type: 'success', url, needsSessionCheck: true }` so the **screen** can try again (e.g. LogInScreen does its own `exchangeCodeForSession`).
4. If `url` has no `code` → return `{ type: 'error', message: 'OAuth completed but no authorization code received.', shouldShowErrorScreen: true }`.
5. If session never obtained and no `url` to retry → return `{ type: 'error', message: 'OAuth completed but session establishment failed...', shouldShowErrorScreen: true }`.

### Step 6: When `type === 'cancel'` or `'dismiss'`

- Returns `{ type: 'error', message: 'Sign-in was cancelled'/'dismissed', shouldShowErrorScreen: false }`.  
  Screens do **not** show “Google auth isn’t working” for these.

### Step 7: Hook `catch`

- Network / timeout / “Invalid request” / “Server error” etc. are turned into a `userMessage` and returned as `{ type: 'error', message: userMessage, shouldShowErrorScreen: true }`.

---

## 3. Sign up with Google (`CreateAccountScreen`)

- **Button**: “Sign up with Google” → `handleGoogleSignIn`.

### Before OAuth

1. **Clear Supabase session** (`supabase.auth.signOut()` if there is one).
2. **Clear** `tempUserData` and `userProfileData` from AsyncStorage.
3. `setLoading(true)`, `setIsHandlingGoogleSignIn(true)`.
4. A **5s timeout** only resets loading if `signInGoogle()` never resolves; it’s cleared as soon as we get a `result`.

### Call `signInGoogle()`

- `const result = await signInGoogle();`  
  No extra timeout in CreateAccountScreen; it relies on the hook’s 90s.

### If `result.type === 'success'`

1. **User from result**  
   - `result.session?.user` or `result.data?.session?.user` or `result.user` → treat as `userData`.
2. If **userData** exists:
   - `navigation.replace('PersonalInfo', { userInfo: { firstName, lastName, email, ... }, isGoogleAuth: true, googleUserData, isGoogleSignUp: true, isDriverFlow })`  
   - User is **not** written to `users` here; that happens later (e.g. Welcomepage).
3. If **no userData in result**:
   - Wait 3s.
   - `supabase.auth.getSession()`:
     - If `session?.user` → `navigation.replace('PersonalInfo', { ... })` as above.
4. If **still no user**:
   - If `result.needsSessionCheck` → `navigation.replace('LogIn')` so LogInScreen can run its heavier session/code-exchange logic.
   - Else → **“Google auth isn’t working”** / *“We couldn’t complete sign-up with Google. Please try again or use another method.”*

### If `result.type === 'error'`

- Reset loading.
- If `result.shouldShowErrorScreen !== false` → **“Google auth isn’t working”** / *“We couldn’t complete sign-up with Google…”*
- If `shouldShowErrorScreen === false` (e.g. cancel) → no alert.

### If `result.type` is anything else

- **“Google auth isn’t working”** / *“We couldn’t complete sign-up with Google…”*

### `catch` (e.g. `signInGoogle` throws)

- **“Google auth isn’t working”** / *“We couldn’t complete sign-up with Google…”*

### After PersonalInfo (sign-up path)

- From PersonalInfo, user goes through: **BiometricSetup → PushNoti (and possibly more)**.  
- **Welcomepage** (or the step that ultimately lands there) is where the app writes the user into the `users` table (e.g. `auth_user_id`, `email`, etc.), not in CreateAccountScreen.

---

## 4. Log in with Google (`LogInScreen`)

- **Button**: “Log in with Google” → `handleGoogleSignIn`.

### Before OAuth

1. **Network check**: `fetch('https://www.google.com', { method: 'HEAD' })`.  
   - Failure → **“No Internet Connection”** / *“Please check your internet connection and try again.”* → return.
2. `setIsProcessingSignIn(true)`.
3. **10s “browser” timeout**:  
   - If `signInGoogle()` hasn’t even started (or we never set `oauthStarted`) and 10s pass → **“Sign-in Issue”** / *“Google sign-in is not responding. This might be due to: …”*  
   - Cleared once we call `signInGoogle()` and set `oauthStarted = true`.
4. **30s “completion” timeout**:  
   - If OAuth has started but we never set `oauthCompleted` (i.e. we never reached the “navigated” path) → we just reset `isProcessingSignIn`; no extra alert from this timer.

### Call `signInGoogle()` with an outer timeout

- `signInPromise = signInGoogle()`  
- `Promise.race(signInPromise, signInTimeoutPromise)`:
  - **Web**: 45s
  - **Mobile**: 120s  
- On timeout → reject with `'signInGoogle timeout'` → caught in the inner `catch` of the `try` that wraps the post-result logic (see below).

### If `result.type !== 'success'`

- `cancel` / `dismiss` → return, no alert.
- Any other → **“Google auth isn’t working”** / *“We couldn’t sign you in with Google. Please try again or use another method.”*

### If `result.type === 'success'` — get `userEmail` and `userData`

1. **From `result.session.user`**  
   - If present → `userData = result.session.user`, `userEmail = userData.email`.
2. **From `result.url` with `code=`**  
   - Parse `code` from URL.  
   - `supabase.auth.exchangeCodeForSession(code)` (with 5s + 25s timeouts).  
   - On success → `userData` and `userEmail` from `exchangeData.session.user`.
3. **If still no `userEmail`**  
   - Try **another** code exchange from `result.url` (another 30s) and/or `waitForSession()`.  
   - If **still** no `userEmail` → **“Google auth isn’t working”** / *“We couldn’t sign you in with Google…”* and return.

### If we have `userEmail` (and `userData`)

1. **“Account deleted”**  
   - If `userLastAction === 'delete_account'` in AsyncStorage → `signOut`, clear flag, **“Account Deleted”** / *“Your account was previously deleted. Please create a new account.”* with Create Account / Cancel.  
   - Return.

2. **User exists?**  
   - `UserService.checkUserExists(email)` (10s timeout).  
   - On timeout/error → treat as “does not exist” and continue as **new user**.

3. **New user** (`!exists`):
   - Build `googleUserData` from `userData` (id, email, name, avatar, etc.).
   - `UserService.saveGoogleAuthUser(userData, googleUserData)` (writes/updates `users`; may fail, we continue).
   - `AsyncStorage`: `tempUserData`, `userProfileData` = `googleUserData`.
   - `AsyncStorage.setItem('hasLoggedInBefore', 'true')`.
   - **Navigate**:
     - Driver flow → `navigation.replace('DriverPortal')`.
     - Else → `navigation.replace('BiometricSetup', { userInfo: googleUserData, savedUser: null, isGoogleAuth: true, googleUserData })`.
   - If an error happens in this block (e.g. saving, building data) → **“Google auth isn’t working”** / *“We couldn’t sign you in with Google…”*.

4. **Returning user** (`exists`):
   - `UserService.handleExistingGoogleUser(userData, existingUser)` (updates `auth_user_id`, avatar, name if needed).
   - Store `tempUserData` and `userProfileData` in AsyncStorage.
   - `AsyncStorage.setItem('hasLoggedInBefore', 'true')`.
   - **Navigate**:
     - Driver → `navigation.replace('DriverPortal')`.
     - Else → `navigation.replace('Welcomepage', { name: firstName, userData: userDataToPass })`.
   - If `handleExistingGoogleUser` or the code around it throws → inner `catch`:
     - If `error.message === 'signInGoogle timeout'` → **“Sign-in Timeout”** / *“Google sign-in is taking too long. …”*.
     - Else → **“Google auth isn’t working”** / *“We couldn’t sign you in with Google…”*.

### Outer `catch` (e.g. `signInGoogle` throws or the 45s/120s timeout)

- **“Google auth isn’t working”** / *“We couldn’t sign you in with Google…”*.

### `finally`

- Clears the 10s and 30s timeouts and `timeoutId`, and sets `isProcessingSignIn = false`.

---

## 5. Error summary

| Where | Condition | User sees |
|-------|-----------|-----------|
| **useGoogleAuth** | Overall 30s/90s timeout | `alert('Google sign-in is taking too long...')` |
| **useGoogleAuth** | Network check fails (after retries) | `{ type: 'error' }` → screen shows “Google auth isn’t working” (or sign-up variant) |
| **useGoogleAuth** | Supabase OAuth error / no URL | `{ type: 'error' }` → “Google auth isn’t working” |
| **useGoogleAuth** | `type: 'success'` but no `code` in URL | `{ type: 'error', shouldShowErrorScreen: true }` → “Google auth isn’t working” |
| **useGoogleAuth** | Session + code exchange both fail | `{ type: 'error', shouldShowErrorScreen: true }` → “Google auth isn’t working” |
| **useGoogleAuth** | `type: 'cancel'` or `'dismiss'` | `shouldShowErrorScreen: false` → **no** “Google auth isn’t working” |
| **CreateAccountScreen** | `success` but no user in `result` and no session and not `needsSessionCheck` | “Google auth isn’t working” / sign-up message |
| **CreateAccountScreen** | `result.type === 'error'` and `shouldShowErrorScreen !== false` | “Google auth isn’t working” / sign-up message |
| **CreateAccountScreen** | `result.type` other than success/error | “Google auth isn’t working” / sign-up message |
| **CreateAccountScreen** | `catch` | “Google auth isn’t working” / sign-up message |
| **LogInScreen** | Pre-check: no network | “No Internet Connection” |
| **LogInScreen** | 10s and `signInGoogle` never “started” | “Sign-in Issue” / “Google sign-in is not responding…” |
| **LogInScreen** | `result.type !== 'success'` and not cancel/dismiss | “Google auth isn’t working” / sign-in message |
| **LogInScreen** | `success` but we never get `userEmail` | “Google auth isn’t working” / sign-in message |
| **LogInScreen** | New-user path throws | “Google auth isn’t working” / sign-in message |
| **LogInScreen** | Returning-user path: `signInGoogle timeout` | “Sign-in Timeout” / “Google sign-in is taking too long…” |
| **LogInScreen** | Returning-user path: other error | “Google auth isn’t working” / sign-in message |
| **LogInScreen** | Outer `catch` | “Google auth isn’t working” / sign-in message |

---

## 6. Flow diagrams

### Sign up with Google (high level)

```
CreateAccountScreen
  → signOut if session, clear AsyncStorage
  → signInGoogle()
       → Supabase signInWithOAuth(google) → URL
       → WebBrowser.openAuthSessionAsync(URL, com.anonymous.jerrod://)
       → User signs in on Google; redirect to com.anonymous.jerrod://?code=...
       → getSession or exchangeCodeForSession(code)
       → return { type: 'success', session? or needsSessionCheck }
  ← result
  → if session or getSession: user
       → navigation.replace('PersonalInfo', { isGoogleAuth, googleUserData, isGoogleSignUp })
  → else if needsSessionCheck
       → navigation.replace('LogIn')
  → else
       → "Google auth isn't working" (sign-up)
```

### Log in with Google (high level)

```
LogInScreen
  → network check → fail: "No Internet Connection"
  → signInGoogle() [with 45s/120s race]
       [same as above: OAuth URL → browser → redirect with code → session / exchange]
  ← result
  → if result.type !== 'success'
       → cancel/dismiss: return
       → else: "Google auth isn't working" (sign-in)
  → get userData/userEmail from result.session or result.url+exchange or waitForSession
  → if !userEmail: "Google auth isn't working" (sign-in)
  → if userLastAction === 'delete_account': "Account Deleted" + signOut
  → UserService.checkUserExists(email)
  → if !exists (new user)
       → saveGoogleAuthUser, AsyncStorage, hasLoggedInBefore
       → BiometricSetup (or DriverPortal)
       → on error: "Google auth isn't working" (sign-in)
  → if exists (returning user)
       → handleExistingGoogleUser, AsyncStorage, hasLoggedInBefore
       → Welcomepage (or DriverPortal)
       → on error: "Sign-in Timeout" or "Google auth isn't working" (sign-in)
  → outer catch: "Google auth isn't working" (sign-in)
```

---

## 7. Redirect and PKCE (what actually happens)

1. **Redirect URI**  
   - Must match in: `app.json` scheme, Supabase Auth URL config, and **Google Cloud Console** OAuth client (e.g. `com.anonymous.jerrod://` for the app).

2. **PKCE**  
   - Supabase generates `code_verifier` and stores it (AsyncStorage).  
   - The OAuth URL includes `code_challenge`.  
   - When `com.anonymous.jerrod://?code=...` is opened, `exchangeCodeForSession(code)` uses the stored `code_verifier` so Supabase can get tokens.  
   - `code` is one-time; if exchange fails, the screen may retry with the same `result.url` only if the hook returned it (e.g. `needsSessionCheck` or `result.url` with `code=`).

3. **`WebBrowser.maybeCompleteAuthSession()`**  
   - Called so the in-app browser/auth session can close correctly when the redirect back into the app happens.

---

## 8. “Google auth isn’t working” vs other messages

- **“Google auth isn’t working”** (and the sign-in/sign-up body) is used when:
  - The OAuth or session/code-exchange flow fails in a way that is **not** “user cancelled” or “user dismissed”.
  - Or when the flow returns success but the **screen** cannot get a user or navigate (e.g. no session, no userData, DB/AsyncStorage/navigation error).
- **“Sign-in Timeout”** (LogInScreen only): when the error is specifically `error.message === 'signInGoogle timeout'` (the 45s/120s race).
- **“Sign-in Issue”** (LogInScreen only): when the 10s “browser didn’t open” timeout fires.
- **“No Internet Connection”** (LogInScreen only): pre-OAuth `fetch` to google.com fails.
- **“Account Deleted”** (LogInScreen only): `userLastAction === 'delete_account'`.

---

## 9. Files involved

| File | Role |
|------|------|
| `hooks/useGoogleAuth.js` | `signIn()`: network check, `signInWithOAuth`, `openAuthSessionAsync`, getSession, `exchangeCodeForSession`, return `{ type, session?, url?, needsSessionCheck?, shouldShowErrorScreen }` |
| `screens/supabaseClient.js` | Supabase client: PKCE, `redirectTo`, `persistSession`, AsyncStorage |
| `screens/CreateAccountScreen.js` | `handleGoogleSignIn`: clear session/storage, `signInGoogle()`, on success → PersonalInfo or LogIn; else or on error → “Google auth isn’t working” (sign-up) |
| `screens/LogInScreen.js` | `handleGoogleSignIn`: network check, timeouts, `signInGoogle()`, get userEmail/userData, checkUserExists, new→BiometricSetup / returning→Welcomepage; errors → “Google auth isn’t working” or “Sign-in Timeout” or “No Internet Connection” or “Account Deleted” |
| `utils/userService.js` | `checkUserExists`, `saveGoogleAuthUser`, `handleExistingGoogleUser` (users table, `auth_user_id`, etc.) |

---

## 10. Google Cloud / Supabase checklist

For Google auth to work in the real app (including TestFlight):

- **Google Cloud Console**  
  - OAuth 2.0 Client (iOS/Android or Web) with redirect URI exactly: `com.anonymous.jerrod://` (and any web origin if you use web).  
  - Client ID (and secret for web if used) configured in Supabase.
- **Supabase Dashboard**  
  - Auth → Providers → Google: enabled, correct Client ID and Secret.  
  - URL configuration: redirect URLs include `com.anonymous.jerrod://`.
- **App**  
  - `app.json` scheme `com.anonymous.jerrod` so the system can open the app from that redirect.

If any of these are wrong, you typically get:

- No `code` in the redirect, or  
- `exchangeCodeForSession` / `getSession` never sees a session, or  
- Supabase/Google errors in the hook,  

which leads to `{ type: 'error' }` or “success but no user/session” and then **“Google auth isn’t working”** on the screen.
