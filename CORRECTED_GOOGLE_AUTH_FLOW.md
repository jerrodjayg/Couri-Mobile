# Corrected Google Authentication Flow Guide

## 🚨 **Issue Identified and Fixed**

**Problem**: The original flow had UploadPhotoScreen appearing **twice**, causing data loss and confusion.

**Root Cause**: PushNotiScreen was navigating to UploadPhotoScreen instead of directly to Welcomepage.

## ✅ **Corrected Flow for New Users**

```
CreateAccountScreen → PersonalInfoScreen → CreatePasswordScreen → FaceIDScreen → UploadPhotoScreen → PushNotiScreen → Welcomepage
```

**Key Changes**:
- ❌ **Before**: PushNotiScreen → UploadPhotoScreen (duplicate)
- ✅ **After**: PushNotiScreen → Welcomepage (direct)

## 🔍 **What Data is Being Saved**

### 1. **Database (users table)**
- `id` - User ID (UUID or temporary)
- `email` - User's email address
- `first_name` - First name
- `last_name` - Last name
- `phone` - Phone number
- `address_line_1` - Street address
- `address_line_2` - Apartment/unit (optional)
- `city` - City
- `state` - State
- `zip_code` - ZIP code
- `avatar_url` - Profile picture URL (if uploaded)
- `is_google_auth` - Boolean flag for Google users
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### 2. **AsyncStorage (Local Storage)**
- `tempUserData` - Complete user profile data
- `userProfileData` - Profile display data (name, avatar, etc.)

## 📱 **Screen-by-Screen Data Flow**

### **CreateAccountScreen**
- **Input**: User clicks Google Sign-in
- **Output**: Google OAuth result with user metadata
- **Data Saved**: None yet
- **Navigation**: → PersonalInfoScreen

### **PersonalInfoScreen**
- **Input**: Google user data + additional form fields
- **Output**: Complete user profile form
- **Data Saved**: None yet (form data only)
- **Navigation**: → CreatePasswordScreen

### **CreatePasswordScreen**
- **Input**: User profile + password
- **Output**: User profile + password
- **Data Saved**: None yet
- **Navigation**: → FaceIDScreen

### **FaceIDScreen**
- **Input**: User profile + password + Face ID setup
- **Output**: User profile + Face ID enabled
- **Data Saved**: None yet
- **Navigation**: → UploadPhotoScreen

### **UploadPhotoScreen** ⭐ **CRITICAL SCREEN**
- **Input**: User profile + Face ID + photo choice
- **Output**: User profile with photo OR initials
- **Data Saved**: 
  - `tempUserData` in AsyncStorage
  - `userProfileData` in AsyncStorage
- **Navigation**: → PushNotiScreen

### **PushNotiScreen**
- **Input**: User profile + photo/initials
- **Output**: User profile + notification preferences
- **Data Saved**: 
  - User data to database (users table)
  - Push notification token
- **Navigation**: → Welcomepage (direct)

### **Welcomepage**
- **Input**: Complete user profile from database + AsyncStorage
- **Output**: User dashboard with profile data
- **Data Saved**: None (display only)
- **Navigation**: Various app screens

## 🔄 **Returning User Flow**

### **LogInScreen**
- **Input**: Google Sign-in
- **Process**: Check if email exists in users table
- **Decision**:
  - ✅ **Found**: Navigate directly to Welcomepage
  - ❌ **Not Found**: Show error "Create account first"

### **Welcomepage (Returning User)**
- **Input**: User data from database + AsyncStorage
- **Output**: User dashboard with all previous data
- **Data Retrieved**: All profile info, settings, preferences

## 🚪 **Sign Out Flow**

### **Welcomepage**
- **Input**: User clicks Sign Out
- **Process**:
  1. Clear Supabase session
  2. Clear AsyncStorage (`tempUserData`, `userProfileData`)
  3. Clear user context
- **Navigation**: → HomeScreen (not Splash)

## 🧪 **Testing the Corrected Flow**

### **Test 1: New User Complete Flow**
1. Fresh install → CreateAccount → Google Sign-in
2. Complete PersonalInfo form
3. Set password
4. Enable Face ID
5. Upload photo OR skip (choose initials)
6. Enable/disable notifications
7. **Should land on Welcomepage with all data**

### **Test 2: Returning User Flow**
1. Sign out from Welcomepage
2. Go to LogIn → Google Sign-in
3. **Should skip to Welcomepage with all previous data**

### **Test 3: Data Persistence**
1. Complete onboarding
2. Close app completely
3. Reopen → LogIn → Google Sign-in
4. **Should show all previous data**

## 🔍 **Debug Commands**

```bash
# Track the corrected flow
adb logcat | grep "🔍.*DEBUG"

# Check for UploadPhotoScreen being called twice
adb logcat | grep "UploadPhotoScreen DEBUG"

# Verify data saving
adb logcat | grep "User data stored"

# Check navigation flow
adb logcat | grep "Navigating to"
```

## ⚠️ **Common Issues to Check**

### **1. UploadPhotoScreen Called Twice**
- **Symptom**: User sees photo upload screen twice
- **Debug**: Check PushNotiScreen navigation logs
- **Fix**: Ensure PushNotiScreen goes directly to Welcomepage

### **2. Data Not Saved to Database**
- **Symptom**: User data lost after app restart
- **Debug**: Check PushNotiScreen database save logs
- **Fix**: Verify `saveGoogleUserToDatabase` function completes

### **3. AsyncStorage Data Missing**
- **Symptom**: Profile data not displayed on Welcomepage
- **Debug**: Check AsyncStorage read/write logs
- **Fix**: Ensure both `tempUserData` and `userProfileData` are saved

### **4. Navigation Wrong Screen**
- **Symptom**: User lands on wrong screen after flow
- **Debug**: Check navigation logs in each screen
- **Fix**: Verify navigation targets in each screen

## 🎯 **Key Success Indicators**

- ✅ UploadPhotoScreen appears only **once**
- ✅ User data saved to database successfully
- ✅ AsyncStorage contains complete user data
- ✅ Welcomepage displays all user information
- ✅ Sign out returns to HomeScreen
- ✅ Returning users skip onboarding
- ✅ All user data persists between sessions

## 🚀 **Next Steps**

1. **Test the corrected flow** with the debugging enabled
2. **Check console logs** for any remaining issues
3. **Verify database saves** are working correctly
4. **Test data persistence** between app sessions
5. **Confirm sign out** returns to HomeScreen

The corrected flow should now work properly with user data being saved at the right points and no duplicate screens!

