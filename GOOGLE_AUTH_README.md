# Google Authentication Flow - Couri Mobile App

## Overview

This document describes the improved Google authentication flow that allows users to:
1. Sign up with Google and create a Couri account
2. Sign back in with the same Google account and access their existing Couri account
3. Maintain consistent user data across sessions

## Architecture

### Components

1. **UserService** (`utils/userService.js`)
   - Centralized service for all user data operations
   - Handles both `users` and `profiles` tables with fallback logic
   - Provides consistent API for user operations

2. **Enhanced Google Auth Hook** (`hooks/useGoogleAuth.js`)
   - Improved OAuth flow handling
   - Returns user data directly after successful authentication
   - Eliminates complex session management code

3. **Updated UserContext** (`contexts/UserContext.js`)
   - Automatically loads user profile data from database
   - Combines Supabase auth user with database profile
   - Maintains user state across app sessions

### Database Tables

The app supports two table structures:

1. **`users` table** (primary)
   - `id` (UUID from Supabase auth)
   - `email`, `first_name`, `last_name`
   - `phone`, `address_line_1`, `address_line_2`
   - `city`, `state`, `zip_code`
   - `avatar_url`, `created_at`, `updated_at`

2. **`profiles` table** (fallback)
   - `id` (UUID from Supabase auth)
   - `email`, `name` (combined first + last)
   - `avatar_url`, `updated_at`

## Authentication Flow

### New User Sign Up

1. User clicks "Sign in with Google"
2. Google OAuth flow completes
3. App checks if user exists in database
4. If new user → Navigate to PersonalInfoScreen for onboarding
5. User completes profile information
6. User data saved to database via UserService
7. User continues through onboarding flow

### Existing User Sign In

1. User clicks "Sign in with Google"
2. Google OAuth flow completes
3. App checks if user exists in database
4. If existing user → Load user profile and navigate to Welcomepage
5. User is signed in to their existing Couri account

### User Data Persistence

- **Supabase Auth**: Handles authentication and session management
- **Database**: Stores user profile information (users table preferred, profiles table fallback)
- **UserContext**: Combines auth user with database profile for complete user object
- **AsyncStorage**: Caches user data for offline access

## Key Features

### 1. Consistent User Lookup
- Uses email as unique identifier
- Checks both database tables with fallback logic
- Handles edge cases gracefully

### 2. Automatic Profile Loading
- UserContext automatically loads profile data on sign-in
- Combines auth user with database profile seamlessly
- Updates user state when profile changes

### 3. Robust Error Handling
- Graceful fallbacks between database tables
- Comprehensive error logging
- User-friendly error messages

### 4. Session Management
- Automatic token refresh
- Persistent sessions across app restarts
- Proper cleanup on sign-out

## Usage Examples

### Checking if User Exists
```javascript
import { UserService } from '../utils/userService';

const userCheck = await UserService.checkUserExists(email);
if (userCheck.exists) {
  // User exists, sign them in
  const existingUser = userCheck.user;
} else {
  // New user, proceed to onboarding
}
```

### Saving User Data
```javascript
const userData = {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1234567890',
  // ... other fields
};

const result = await UserService.saveUser(userData, supabaseUserId);
```

### Loading User Profile
```javascript
import { useUser } from '../contexts/UserContext';

const { user, loadUserProfile } = useUser();

// user object contains both auth and profile data
console.log(user.firstName, user.lastName, user.email);
```

## Migration Notes

### From Old Implementation
- Removed complex OAuth URL parsing
- Eliminated manual session management
- Simplified Google sign-in handlers
- Centralized user data operations

### Database Compatibility
- Works with existing `users` table structure
- Falls back to `profiles` table if needed
- No database schema changes required

## Testing

### Test Scenarios
1. **New Google User Sign Up**
   - Complete OAuth flow
   - Verify user data saved to database
   - Confirm onboarding flow works

2. **Existing Google User Sign In**
   - Sign in with existing Google account
   - Verify existing profile loaded
   - Confirm navigation to welcome screen

3. **Data Consistency**
   - Sign out and sign back in
   - Verify user data persists
   - Check profile updates are saved

### Debug Logging
The implementation includes comprehensive logging:
- `🔄` for operations in progress
- `✅` for successful operations
- `❌` for errors
- `⚠️` for warnings

## Troubleshooting

### Common Issues

1. **User not found after Google sign-in**
   - Check database tables for user data
   - Verify email matching logic
   - Check UserService logs

2. **Profile data not loading**
   - Verify database connection
   - Check table permissions
   - Review UserContext logs

3. **OAuth flow failures**
   - Check Google OAuth configuration
   - Verify redirect URLs
   - Review useGoogleAuth logs

### Debug Commands
```javascript
// Check current user
console.log('Current user:', user);

// Check database connection
const { data, error } = await supabase.from('users').select('*').limit(1);

// Test UserService
const userCheck = await UserService.checkUserExists('test@example.com');
console.log('User check result:', userCheck);
```

## Future Enhancements

1. **Multi-provider Support**
   - Extend to Facebook, Apple authentication
   - Unified user service for all providers

2. **Enhanced Profile Management**
   - Profile picture upload
   - Address validation
   - Preference settings

3. **Offline Support**
   - Local user data caching
   - Sync when online
   - Conflict resolution

4. **Analytics Integration**
   - Authentication success rates
   - User onboarding completion
   - Session duration tracking
