# Create Account Flow — Easy-to-Read Summary

This document explains **exactly** what happens when a user creates an account (phone or Google). It matches how the app is built today.

---

## How Do You Get to Create Account?

- **From Home:** Tap **"Create Account"**
- **From Login:** Tap **"Sign Up"** (or from alerts like "No Account Found" → **"Create Account"**)
- **From Prompt:** Choose the option that goes to Create Account

User lands on **CreateAccountScreen** (the "SIGN UP" screen with phone field and “Continue” / “Log in with Google”).

---

## Two Ways to Create an Account

### Path A — Create Account with **Phone Number**

1. **CreateAccountScreen**
   - User enters a **10-digit mobile number**
   - Taps **"Continue"**

2. **PersonalInfoScreen**
   - App goes to Personal Info with **only the phone** pre-filled
   - User fills in: **First name, Last name, Email, Address** (and can edit phone)
   - Taps **Continue**
   - Data is saved to AsyncStorage (`tempUserData`, `userProfileData`); **nothing is written to the database yet**

3. **BiometricSetupScreen**
   - User is asked to turn on **Face ID / Touch ID / Fingerprint** for quicker login later
   - Can choose **Allow**, **Maybe Later**, or **Don’t Allow**
   - If the device has no biometrics, this step is skipped

4. **PushNotiScreen**
   - User is asked to **enable push notifications**
   - Can choose **Enable** or **Maybe Later**

5. **TutorialScreen**
   - Short optional tutorial for new users

6. **Welcomepage**
   - **First time the user is written to the Supabase `users` table**
   - Account is fully created; user is "in" the app

**In one line:**  
Create Account (phone) → Personal Info → Biometric Setup → Push Notifications → Tutorial → **Welcomepage** (DB save here).

---

### Path B — Create Account with **Google**

1. **CreateAccountScreen**
   - User taps **"Log in with Google"**
   - Browser / Google sign-in opens → user signs in with Google

2. **PersonalInfoScreen** (same screen as Path A)
   - App goes to Personal Info with **First name, Last name, Email** pre-filled from Google
   - User can edit and must fill in **Phone, Address**, etc.
   - Taps **Continue**
   - Data is saved to AsyncStorage; **still no database write**

3. **BiometricSetupScreen**
   - Same as Path A (Face ID / Touch ID or skip)

4. **PushNotiScreen**
   - Same as Path A (enable or skip push)

5. **TutorialScreen**
   - Same as Path A

6. **Welcomepage**
   - **User is saved to the `users` table here**
   - Account is fully created

**In one line:**  
Create Account (Google) → Google sign-in → Personal Info → Biometric Setup → Push Notifications → Tutorial → **Welcomepage** (DB save here).

---

## Driver Flow (Create Account as Driver)

If the user started as a **driver** (e.g. from Home with driver flow):

- After **PushNotiScreen**, they go to **DriverPortal** instead of Tutorial → Welcomepage.
- The **database save** for drivers still happens when they reach the screen that does the “create user” logic (e.g. Welcomepage-equivalent or that step in the driver flow).

---

## When Things Go Wrong

| What went wrong | What happens |
|-----------------|--------------|
| **No internet** | Google sign-in can time out or fail; user may see “Google auth isn’t working” or similar. |
| **User closes Google without signing in** | They stay on Create Account; no account is created. |
| **Google succeeds but we never get user/session** | “We couldn’t complete sign-up with Google. Please try again or use another method.” |
| **User leaves before Welcomepage** | **No row is created in the `users` table.** They’d have to start again from Create Account. |

**Important:** A row in the **Supabase `users` table** is created **only when they reach Welcomepage** (or the equivalent step in the driver flow). If they stop at Personal Info, Biometric Setup, or Push Notifications, **no account exists in the database yet**.

---

## Create Account vs Login (Quick Comparison)

| | **Create Account** | **Login** |
|--|--------------------|-----------|
| **Goal** | New user → add them to the app and DB | Existing user → verify identity and load their data |
| **Phone** | Enter phone → Personal Info → … → Welcomepage (DB save at end) | Enter phone → DB check → if **found**: Code Verify (e.g. 1111) → Welcomepage with their data; if **not found**: “No Account Found” → Create Account |
| **Google** | Google → Personal Info → … → Welcomepage (DB save at end) | Google → wait 3 seconds → DB check by email → if **found**: Welcomepage with their data; if **not found**: sign out, “No Account Found” → Create Account |
| **DB write** | Only when they reach **Welcomepage** | We **never** create a new user on Login; we only load existing users. |

---

## Full Flow Diagram (Create Account)

```
[CreateAccountScreen]
        |
        |── Phone + Continue ──► [PersonalInfo] (phone pre-filled)
        |
        |── "Log in with Google" ──► [Google OAuth] ──► [PersonalInfo] (name, email pre-filled)
        |
        ▼
[PersonalInfo] — user fills/edits name, email, phone, address, taps Continue
        |
        ▼
[BiometricSetup] — set up Face ID / fingerprint or skip
        |
        ▼
[PushNoti] — enable push or skip
        |
        ├── Driver flow? ──► [DriverPortal]
        |
        └── Normal flow ──► [Tutorial] ──► [Welcomepage]  ◄── DB save here
```

---

If you want, this can be merged into your main flow doc or kept as a separate **Create Account** reference.
