# Google Authentication Flow Debugging Guide

## Overview
This document outlines the comprehensive debugging added to track the Google authentication flow and identify potential issues in the user sign-up and sign-in process.

## Debug Logs Added

### 1. CreateAccountScreen.js
**Purpose**: Track new user Google sign-up flow
**Key Debug Points**:
- `🔍 CreateAccountScreen DEBUG - Starting Google sign-in flow`
- `🔍 CreateAccountScreen DEBUG - Google sign-in result type/URL`
- `🔍 CreateAccountScreen DEBUG - Session details`
- `🔍 CreateAccountScreen DEBUG - User metadata`
- `🔍 CreateAccountScreen DEBUG - Navigating with user data`

**What to Look For**:
- Ensure Google sign-in result type is 'success'
- Verify session is established with user data
- Check that navigation to PersonalInfoScreen includes proper user data

### 2. PersonalInfoScreen.js
**Purpose**: Track user data collection and form population
**Key Debug Points**:
- `🔍 PersonalInfoScreen DEBUG - Component mounted`
- `🔍 PersonalInfoScreen DEBUG - Route params`
- `🔍 PersonalInfoScreen DEBUG - Google auth user data`
- `🔍 PersonalInfoScreen DEBUG - Form validation passed`

**What to Look For**:
- Verify user data is properly passed from CreateAccountScreen
- Check that Google user data pre-fills form fields
- Ensure form validation passes before navigation

### 3. PushNotiScreen.js
**Purpose**: Track final user data saving and navigation
**Key Debug Points**:
- `🔍 PushNotiScreen DEBUG - Starting user data processing`
- `🔍 PushNotiScreen DEBUG - Starting Google user database save`
- `🔍 PushNotiScreen DEBUG - User data stored in AsyncStorage`
- `🔍 PushNotiScreen DEBUG - Navigating to UploadPhoto`

**What to Look For**:
- Verify user data is properly received from previous screens
- Check that database save operations complete successfully
- Ensure AsyncStorage contains user data
- Confirm navigation to next screen with proper data

### 4. LogInScreen.js
**Purpose**: Track returning user Google sign-in
**Key Debug Points**:
- `🔍 LogInScreen DEBUG - Starting Google sign-in for returning user`
- `🔍 LogInScreen DEBUG - User existence check result`
- `🔍 LogInScreen DEBUG - User found in database`
- `🔍 LogInScreen DEBUG - Navigating to Welcomepage with user data`

**What to Look For**:
- Verify returning user is found in database
- Check that user data is properly retrieved and stored
- Ensure navigation to Welcomepage includes complete user data

### 5. Welcomepage.js
**Purpose**: Track user session management and sign out
**Key Debug Points**:
- `🔍 Welcomepage DEBUG - Component mounted`
- `🔍 Welcomepage DEBUG - Current session on focus`
- `🔍 Welcomepage DEBUG - handleSignOut called`
- `🔍 Welcomepage DEBUG - Navigating to HomeScreen`

**What to Look For**:
- Verify user data is properly displayed
- Check that sign out clears all user data
- Ensure navigation returns to HomeScreen (not Splash)

## Expected Flow for New Users

1. **CreateAccountScreen** → Google Sign-in
   - Should show: `🔍 CreateAccountScreen DEBUG - Starting Google sign-in flow`
   - Success: Navigate to PersonalInfoScreen with user data

2. **PersonalInfoScreen** → Collect additional info
   - Should show: `🔍 PersonalInfoScreen DEBUG - Google auth user detected`
   - Form should be pre-filled with Google data
   - Navigate to CreatePassword

3. **PushNotiScreen** → Save user data
   - Should show: `🔍 PushNotiScreen DEBUG - Starting Google user database save`
   - User data saved to database and AsyncStorage
   - Navigate to UploadPhoto

4. **Welcomepage** → Display user data
   - Should show: `🔍 Welcomepage DEBUG - Found user data from route params`
   - User profile displayed with saved data

## Expected Flow for Returning Users

1. **LogInScreen** → Google Sign-in
   - Should show: `🔍 LogInScreen DEBUG - Starting Google sign-in for returning user`
   - User existence check should return true
   - Navigate directly to Welcomepage

2. **Welcomepage** → Display saved user data
   - Should show: `🔍 Welcomepage DEBUG - Found persistent user data in AsyncStorage`
   - All previous user data should be displayed

## Sign Out Flow

1. **Welcomepage** → Sign Out button pressed
   - Should show: `🔍 Welcomepage DEBUG - handleSignOut called`
   - Supabase session cleared
   - AsyncStorage cleared
   - Navigate to HomeScreen

## Common Issues to Check

### 1. Session Not Established
**Symptoms**: User stuck on CreateAccountScreen after Google sign-in
**Debug**: Look for session check logs and verify OAuth completion

### 2. User Data Not Passed
**Symptoms**: Empty forms or missing user information
**Debug**: Check route params and navigation data logs

### 3. Database Save Failures
**Symptoms**: User data not persisted
**Debug**: Look for database error logs in PushNotiScreen

### 4. Navigation Issues
**Symptoms**: Wrong screen or missing data
**Debug**: Check navigation logs and route params

### 5. AsyncStorage Issues
**Symptoms**: User data lost between app sessions
**Debug**: Check AsyncStorage read/write logs

## Testing Steps

1. **Fresh Install Test**:
   - Install app fresh
   - Go to CreateAccount → Google Sign-in
   - Complete onboarding flow
   - Verify data is saved

2. **Returning User Test**:
   - Sign out from Welcomepage
   - Go to LogIn → Google Sign-in
   - Verify direct navigation to Welcomepage
   - Check all previous data is displayed

3. **Data Persistence Test**:
   - Complete onboarding with Google
   - Close app completely
   - Reopen and sign in with Google
   - Verify data is still there

## Debug Commands

To see all debug logs:
```bash
# Filter for debug logs only
adb logcat | grep "🔍.*DEBUG"

# Filter for specific screen
adb logcat | grep "PersonalInfoScreen DEBUG"

# Filter for errors
adb logcat | grep "❌"
```

## Key Success Indicators

- ✅ Google sign-in completes with 'success' type
- ✅ Session established with user data
- ✅ User data properly passed between screens
- ✅ Database save operations complete
- ✅ AsyncStorage contains user data
- ✅ Navigation flows correctly
- ✅ Sign out returns to HomeScreen
- ✅ Returning users skip onboarding

## Troubleshooting

If issues persist:
1. Check console logs for specific error messages
2. Verify Supabase configuration
3. Check database table structure
4. Verify OAuth redirect URLs
5. Test on both iOS and Android
6. Check network connectivity
7. Verify Google OAuth app configuration

