# Database Fixes for Profile Picture Persistence

## Overview
This update fixes several critical issues with the user authentication and profile management system:

1. **Profile pictures not being saved** - Google auth users' profile pictures are now properly persisted
2. **Local storage dependency removal** - All user data is now saved to Supabase instead of AsyncStorage
3. **Email-based user identification** - Users are now identified by email instead of UUID to avoid conflicts
4. **Database persistence** - All user data is properly saved to and retrieved from Supabase

## Key Changes Made

### 1. Updated UserService (`utils/userService.js`)
- **Primary identifier changed from UUID to email**
- Added `saveGoogleAuthUser()` method specifically for Google auth users
- Enhanced profile picture extraction from Google metadata
- Improved error handling and logging
- Added fallback mechanisms for both `users` and `profiles` tables

### 2. Updated Authentication Flow
- **LogInScreen**: Now uses email-based profile updates
- **PushNotiScreen**: Uses new `UserService.saveGoogleAuthUser()` method
- **UserContext**: Enhanced to load profile data from database with fallback to Supabase metadata

### 3. Removed Local Storage Dependencies
- **ProfileScreen**: No longer uses AsyncStorage, gets data from UserContext
- **MyAccountScreen**: No longer uses AsyncStorage, gets data from UserContext  
- **Welcomepage**: No longer uses AsyncStorage, gets data from UserContext

### 4. Profile Picture Persistence Fix
The key fix is in the `saveGoogleAuthUser()` method which properly extracts and saves the profile picture URL:

```javascript
// Extract profile picture from Google metadata
const avatarUrl = googleUserData.user_metadata?.avatar_url || 
                 googleUserData.user_metadata?.picture ||
                 googleUserData.avatar_url || '';

// Save to database with avatar_url field
const userData = {
  // ... other fields
  avatar_url: avatarUrl, // This ensures profile picture is saved
};
```

## How It Works Now

### Google Auth Flow:
1. User signs in with Google
2. Profile data (including picture) is extracted from Google metadata
3. User completes onboarding (PersonalInfo → CreatePassword → FaceID → PushNoti)
4. **At PushNotiScreen**: User data is saved to Supabase using `UserService.saveGoogleAuthUser()`
5. Profile picture URL is stored in the `avatar_url` field in the database
6. On subsequent logins, the profile picture is loaded from the database

### User Data Retrieval:
1. **Primary**: Load user profile from Supabase database using email
2. **Fallback**: Use Supabase auth user metadata if no database profile exists
3. **No more AsyncStorage**: All data comes from Supabase

## Testing the Fixes

### 1. Test Database Connection
Run the test script to verify database connectivity:
```bash
node test-database.js
```

### 2. Test Google Auth Flow
1. Sign out completely
2. Sign in with Google
3. Complete the onboarding flow
4. Check that profile picture appears
5. Sign out and sign back in
6. Verify profile picture persists

### 3. Check Database
In your Supabase dashboard, verify:
- Users are being created in the `users` table
- `avatar_url` field contains the Google profile picture URL
- Users can be found by email address

## Database Schema Requirements

Ensure your `users` table has these fields:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  avatar_url TEXT,  -- This field is crucial for profile pictures
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Troubleshooting

### Profile Picture Still Not Showing
1. Check browser console for errors
2. Verify `avatar_url` field in database contains valid URL
3. Check if the URL is accessible (not blocked by CORS)
4. Ensure the image URL from Google is still valid

### Database Connection Issues
1. Verify Supabase credentials in `supabaseClient.js`
2. Check RLS (Row Level Security) policies
3. Ensure database tables exist and have correct schema
4. Run the test script to diagnose connection issues

### User Not Found Errors
1. Check if user exists in database by email
2. Verify email case sensitivity (should be lowercase)
3. Check both `users` and `profiles` tables
4. Ensure RLS policies allow user access to their own data

## Benefits of These Changes

1. **Reliability**: No more lost profile pictures or user data
2. **Consistency**: All user data is stored in one place (Supabase)
3. **Scalability**: Email-based identification is more reliable than UUIDs
4. **Maintainability**: Cleaner code with fewer dependencies
5. **User Experience**: Profile pictures persist across sessions and devices

## Next Steps

1. Test the Google auth flow end-to-end
2. Verify profile pictures persist after logout/login
3. Check that existing users can still access their accounts
4. Monitor database for any errors during user creation/updates
5. Consider adding profile picture upload functionality for non-Google users
