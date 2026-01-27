# Create Account & Login Flow — Simple Summary

This doc describes what happens when things **work** and when they **don’t**, in plain language.

---

## Create Account Flow

### When it works

1. **CreateAccountScreen**  
   User taps “Sign up with Google.”

2. **Google sign-in**  
   Browser opens → user signs in with Google → app gets back an auth code and turns it into a session. Name and email come from Google.

3. **PersonalInfoScreen**  
   App goes to PersonalInfo with name/email pre-filled. User can edit and add phone, address, etc.

4. **BiometricSetupScreen**  
   User sets up Face ID or fingerprint for the app.

5. **PushNotiScreen**  
   User sees the push notification permission screen.

6. **TutorialScreen**  
   Optional tutorial.

7. **Welcomepage**  
   When Welcomepage loads, it **saves the user to the database** (`users` table). The account is fully created and the user is “in.”

**In short:**  
CreateAccount → Google → PersonalInfo → BiometricSetup → PushNoti → Tutorial → Welcomepage → **database save on Welcomepage**.

---

### When it doesn’t work

| What went wrong | What the user sees / what happens |
|-----------------|-----------------------------------|
| **No internet** | “Google sign-in is taking too long” or similar; flow stops. |
| **User closes Google without signing in** | Usually no big error; they stay on Create Account. |
| **Google or our backend fails** (no auth code, session never created, etc.) | “Google auth isn’t working” / “We couldn’t complete sign-up with Google. Please try again or use another method.” |
| **Success from Google but we never get a user/session** | Same “Google auth isn’t working” message, or sometimes we send them to the Login screen to try again. |
| **Any unexpected error in this flow** | Same “Google auth isn’t working” / sign-up failure message. |

**Important:** The user is **only** written to the `users` table when they reach **Welcomepage**. If they never get there (e.g. they quit on PersonalInfo or we hit an error before that), **no account is created** in our database.

---

## Login Flow

### When it works

**Option A — Google login (returning user)**

1. **LogInScreen**  
   User taps “Sign in with Google.”

2. **Google OAuth**  
   Same as sign-up: browser, sign in, redirect back with code, we get a session.

3. **Database check**  
   We call `UserService.checkUserExists(email)`. For a **returning** user, we find a row in the `users` table.

4. **Update and go home**  
   We update their record if needed, store user data in the app, then go to **Welcomepage** (or DriverPortal if driver flow).

**In short:**  
LogIn → Google → session → **user exists in DB** → Welcomepage (or DriverPortal).

---

**Option B — Google login (user not in DB yet)**

1. Same as above through “database check.”
2. **`checkUserExists(email)`** returns “does not exist.”
3. We **create** a user with `UserService.saveGoogleAuthUser(...)` and then send them through a short onboarding: **BiometricSetup → PushNoti → Tutorial → Welcomepage** (same as create-account tail).
4. When they hit Welcomepage, they’re treated as “logged in” and their account is fully in the system.

**In short:**  
LogIn → Google → **user not in DB** → we create them → BiometricSetup → PushNoti → Tutorial → Welcomepage.

---

**Option C — Face ID / biometric login**

1. User taps the Face ID (or fingerprint) option on LogInScreen.
2. We load **saved user data** from the device (e.g. `tempUserData` / `userProfileData`).
3. If we have that data and the user **exists in the database** (and, for Google users, we have a valid session), we log them in and go to **Welcomepage**.

**In short:**  
LogIn → Face ID → read saved data → **user in DB + valid session** → Welcomepage.

---

**Option D — Email/password login**

1. User enters email and password (on LogInScreen or a dedicated password-login screen).
2. We call Supabase `signInWithPassword` and, if that works, load profile data.
3. Then we go to **Welcomepage** (or the right home screen).

**In short:**  
LogIn → email + password → Supabase sign-in → profile load → Welcomepage.

---

### When it doesn’t work

| What went wrong | What the user sees / what happens |
|-----------------|-----------------------------------|
| **No internet (before Google)** | “No Internet Connection” / “Please check your internet connection and try again.” |
| **Google sign-in never really starts / times out** | “Sign-in Issue” / “Google sign-in is not responding…” |
| **Google sign-in or session creation fails** | “Google auth isn’t working” / “We couldn’t sign you in with Google. Please try again or use another method.” |
| **User closes Google without signing in** | No alert; they stay on the login screen. |
| **Account was previously deleted** | “Account Deleted” / “Your account was previously deleted. Please create a new account.” with options like “Create Account” or “Cancel.” |
| **Face ID: no saved account on device** | “No Account Found” / “You need to create an account first before using biometric login.” with “Create Account” and “Cancel.” |
| **Face ID: user was a Google user and session is gone** | We ask them to sign in with Google again for security. |
| **Email/password: wrong or unknown user** | “Invalid email or password” or “This email is not registered. Please sign up first.” |
| **Any other error during Google login** | “Google auth isn’t working” or “Sign-in Timeout” if it was a timeout. |

---

## One-sentence recap

- **Create account:**  
  Sign up with Google → PersonalInfo → BiometricSetup → PushNoti → Tutorial → **Welcomepage saves the user to the DB**. If anything fails before or during that, we show an error and **no account is created** in our system.

- **Login:**  
  We support Google, Face ID, and email/password. For **Google**, we check the DB: **exists** → go to Welcomepage; **doesn’t exist** → we create the user and send them through BiometricSetup → PushNoti → Tutorial → Welcomepage. For **Face ID**, we need saved data and a user in the DB (and for Google users, a valid session). When anything in that chain fails, we show the matching error from the table above instead of logging them in.
