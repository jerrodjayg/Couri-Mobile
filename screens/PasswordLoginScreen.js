import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { supabase } from './supabaseClient';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserService } from '../utils/userService';
import * as Notifications from 'expo-notifications';

export default function PasswordLoginScreen({ navigation }) {
  const userContext = useUser();
  const { setCustomUser } = userContext;
  
  console.log('🔍 PasswordLoginScreen - userContext:', {
    user: userContext.user?.id,
    customUser: userContext.customUser?.id,
    setCustomUser: typeof userContext.setCustomUser,
    loading: userContext.loading
  });
  
  // Safety check for setCustomUser
  if (!setCustomUser) {
    console.error('❌ setCustomUser is not available in context!');
    console.error('❌ Full context:', userContext);
  }
  
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');



  const handlePasswordLogin = async () => {
    if (!emailOrMobile || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Test database connection first
      console.log('🔍 Testing database connection...');
      const connectionTest = await UserService.testDatabaseConnection();
      if (!connectionTest.success) {
        console.error('❌ Database connection test failed:', connectionTest.error);
        setError('Database connection issue. Please check your internet connection and try again.');
        setLoading(false);
        return;
      }
      console.log(`✅ Database connection test passed in ${connectionTest.queryTime}ms`);

      // Normalize email to lowercase for consistent comparison
      const normalizedEmail = emailOrMobile.toLowerCase().trim();
      console.log('🔍 Attempting login with normalized email:', normalizedEmail);

      // Use UserService to check if user exists with timeout protection
      console.log('🔍 Starting user existence check...');
      let exists = false;
      let existingUser = null;
      
      // Skip UserService if database connection test was slow (>3 seconds)
      const skipUserService = connectionTest.queryTime > 3000;
      
      if (skipUserService) {
        console.log('⚠️ Database connection was slow, skipping UserService and using direct query');
        try {
          const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('*')
            .ilike('email', normalizedEmail)
            .single();
          
          if (dbError && dbError.code !== 'PGRST116') {
            console.error('❌ Direct database check error:', dbError);
            throw new Error('Database check failed');
          }
          
          exists = !!userData;
          existingUser = userData;
          console.log('✅ Direct database check completed (skipped UserService):', { exists, existingUser });
        } catch (fallbackError) {
          console.error('❌ Direct database check failed:', fallbackError);
          throw new Error('Unable to verify user account. Please try again.');
        }
      } else {
        try {
          const userCheckPromise = UserService.checkUserExists(normalizedEmail);
          
          // Add timeout protection (15 seconds instead of 5)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('User check timeout')), 15000)
          );
          
          const result = await Promise.race([userCheckPromise, timeoutPromise]);
          exists = result.exists;
          existingUser = result.user;
          console.log('✅ UserService check completed:', { exists, existingUser });
        } catch (userServiceError) {
          console.log('⚠️ UserService failed, trying direct database check:', userServiceError);
          
          // Fallback: Direct database check
          try {
            const { data: userData, error: dbError } = await supabase
              .from('users')
              .select('*')
              .ilike('email', normalizedEmail)
              .single();
            
            if (dbError && dbError.code !== 'PGRST116') {
              console.error('❌ Direct database check error:', dbError);
              throw new Error('Database check failed');
            }
            
            exists = !!userData;
            existingUser = userData;
            console.log('✅ Direct database check completed:', { exists, existingUser });
          } catch (fallbackError) {
            console.error('❌ Fallback database check also failed:', fallbackError);
            throw new Error('Unable to verify user account. Please try again.');
          }
        }
      }
      
      console.log('✅ User existence check completed:', { exists, existingUser });

      if (!exists || !existingUser) {
        // User not found - show phone notification and error
        console.log('🔍 User not found in database, showing phone notification');
        
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Account Not Found',
              body: 'This email is not registered. Please go to Create Account first.',
              data: { type: 'password_login_error' },
            },
            trigger: null, // Show immediately
          });
          console.log('✅ Phone notification sent for unregistered user');
        } catch (notificationError) {
          console.error('❌ Failed to send phone notification:', notificationError);
        }
        
        setError('This email is not registered. Please sign up first.');
        setLoading(false);
        return;
      }

      // User exists - verify password
      console.log('🔐 Verifying password for user:', existingUser.email);
      console.log('🔍 Available user fields:', Object.keys(existingUser));
      console.log('🔍 User data received:', existingUser);
      console.log('Input password length:', password.length);
      console.log('🔍 Input password (first 3 chars):', password.substring(0, 3) + '...');
      
      // Check if this is a Google OAuth user (no password field)
      if (!existingUser.password_hash && !existingUser.password && !existingUser.passwordHash && !existingUser.passwordhash) {
        console.log('🔍 This appears to be a Google OAuth user (no password field)');
        
        // Show phone notification for Google OAuth users without passwords
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Google Account Detected',
              body: 'This account was created with Google. You can either use Google Sign-In or set up a password in your account settings.',
              data: { type: 'google_oauth_user_no_password' },
            },
            trigger: null, // Show immediately
          });
          console.log('✅ Phone notification sent for Google OAuth user without password');
        } catch (notificationError) {
          console.error('❌ Failed to send phone notification:', notificationError);
        }
        
        setError('This account was created with Google. You can either use Google Sign-In or set up a password in your account settings.');
        setLoading(false);
        return;
      }
      
      // Check for password in different possible field names
      const passwordHash = existingUser.password_hash || existingUser.password || existingUser.passwordHash || existingUser.passwordhash;
      console.log('🔍 Password field found:', {
        password_hash: existingUser.password_hash,
        password: existingUser.password,
        passwordHash: existingUser.passwordHash,
        passwordhash: existingUser.passwordhash,
        finalPasswordHash: passwordHash
      });
      console.log('Stored password hash length:', passwordHash?.length);
      console.log('🔍 Stored password (first 3 chars):', passwordHash ? passwordHash.substring(0, 3) + '...' : 'undefined');

      if (!passwordHash) {
        console.error('No password hash found for user');
        console.error('Available fields:', Object.keys(existingUser));
        setError('Account setup incomplete. Please contact support.');
        setLoading(false);
        return;
      }

      // Enhanced password comparison logging
      console.log('🔍 Password comparison details:');
      console.log('  - Input password length:', password.length);
      console.log('  - Stored password length:', passwordHash.length);
      console.log('  - Input password type:', typeof password);
      console.log('  - Stored password type:', typeof passwordHash);
      console.log('  - Passwords match exactly:', password === passwordHash);
      console.log('  - Input password trimmed:', `"${password.trim()}"`);
      console.log('  - Stored password trimmed:', `"${passwordHash.trim()}"`);
      console.log('  - Trimmed passwords match:', password.trim() === passwordHash.trim());

      if (password !== passwordHash) {
        console.log('❌ Password mismatch:');
        console.log(' Input password:', `"${password}"`);
        console.log(' Stored password:', `"${passwordHash}"`);
        console.log(' Input password (hex):', Buffer.from(password).toString('hex'));
        console.log(' Stored password (hex):', Buffer.from(passwordHash).toString('hex'));
        setError('Email and password don\'t match');
        setLoading(false);
        return;
      }

      // ✅ Login successful - prepare complete user data
      console.log('✅ Login successful for user:', existingUser.email);
      
      // Create complete user data object
      const completeUserData = {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.first_name || '',
        lastName: existingUser.last_name || '',
        name: existingUser.first_name || existingUser.last_name ? `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim() : '',
        full_name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim(),
        phone: existingUser.phone || '',
        address1: existingUser.address_line_1 || '',
        address2: existingUser.address_line_2 || '',
        city: existingUser.city || '',
        state: existingUser.state || '',
        zip: existingUser.zip_code || '',
        avatar_url: existingUser.avatar_url || '',
        profileImageUri: existingUser.avatar_url || '',
        isGoogleAuth: false, // Default to false since is_google_auth field doesn't exist in database
        created_at: existingUser.created_at,
        updated_at: existingUser.updated_at
      };
      
      console.log('📋 Complete user data prepared:', completeUserData);
      
      // Store complete user data in AsyncStorage for other screens
      console.log('💾 Storing user data in AsyncStorage...');
      await AsyncStorage.setItem('tempUserData', JSON.stringify(completeUserData));
      await AsyncStorage.setItem('userProfileData', JSON.stringify(completeUserData));
      
      // Store user email for push notifications
      await AsyncStorage.setItem('currentUserEmail', completeUserData.email);
      
      // Clear any previous profile picture data from other sessions
      await AsyncStorage.removeItem('previousProfilePicture');
      await AsyncStorage.removeItem('storedProfilePicture');
      
      console.log('✅ User data stored in AsyncStorage');
      
      // Set user in context (with safety check)
      if (setCustomUser && typeof setCustomUser === 'function') {
        setCustomUser(completeUserData);
        console.log('👤 User set in context');
      } else {
        console.error('❌ setCustomUser is not available or not a function');
        console.error('❌ setCustomUser type:', typeof setCustomUser);
        console.error('❌ setCustomUser value:', setCustomUser);
        // Continue without setting context - user data is already in AsyncStorage
      }
      
      // Navigate to Welcomepage with complete user data
      console.log('🔄 Preparing navigation to Welcomepage...');
      const fullName = existingUser.first_name && existingUser.last_name 
        ? `${existingUser.first_name} ${existingUser.last_name}`
        : existingUser.first_name || existingUser.last_name || 'there';
      
      console.log('🔄 Navigating to Welcomepage with name:', fullName);
      navigation.replace('Welcomepage', { 
        name: fullName,
        userData: completeUserData
      });
      
      console.log('✅ Navigation to Welcomepage completed with user data');
      
    } catch (error) {
      console.error('❌ Login error:', error);
      if (error.message === 'User check timeout') {
        setError('Login is taking too long. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailOrMobile) {
      setError('Please enter your email address first');
      return;
    }

    const isEmail = emailOrMobile.includes('@');
    
    if (!isEmail) {
      setError('Password reset is only available via email address');
      return;
    }

    try {
      // Normalize email to lowercase for consistent comparison
      const normalizedEmail = emailOrMobile.toLowerCase().trim();
      console.log('🔍 Checking password reset for normalized email:', normalizedEmail);

      // Check if the email exists in the database
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', normalizedEmail)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          setError('Account doesn\'t exist. Please check your email or sign up first.');
        } else {
          console.error('Error checking user account:', userError);
          setError('Error checking user account. Please try again.');
        }
        return;
      }

      if (!existingUser) {
        setError('Account doesn\'t exist. Please check your email or sign up first.');
        return;
      }

      // Use the exact email case that exists in the database
      const exactEmail = existingUser.email;
      console.log('Found user with email:', exactEmail);
      console.log('Original input email:', emailOrMobile);
      
      // If email exists, navigate to ChangePasswordScreen with the exact email from database
      navigation.navigate('ChangePassword', { userEmail: exactEmail });
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to process password reset request');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()}>
                <Image 
                  source={require('../assets/backarrow.png')} 
                  style={styles.backArrowImage}
                />
              </Pressable>
              <Text style={styles.headerTitle}>LOG IN</Text>
              <View style={{ width: 24 }} />
            </View>

                         {/* Email Input */}
             <TextInput
               style={[
                 styles.input,
                 { borderBottomColor: error ? '#FF3B30' : '#222' }
               ]}
               placeholder="Email"
               placeholderTextColor="#000"
               value={emailOrMobile}
               onChangeText={(text) => {
                 setEmailOrMobile(text);
                 if (error) setError('');
               }}
               autoCapitalize="none"
               keyboardType="email-address"
             />

                         {/* Password Input */}
             <View style={[
               styles.passwordContainer,
               { borderBottomColor: error ? '#FF3B30' : '#222' }
             ]}>
               <TextInput
                 style={styles.passwordInput}
                 placeholder="Password"
                 placeholderTextColor="#000"
                 value={password}
                 onChangeText={(text) => {
                   setPassword(text);
                   if (error) setError('');
                 }}
                 secureTextEntry={!showPassword}
                 autoCapitalize="none"
               />
               <TouchableOpacity
                 style={styles.eyeIcon}
                 onPress={() => setShowPassword(!showPassword)}
               >
                 <Text style={styles.eyeIconText}>👁️‍🗨️</Text>
               </TouchableOpacity>
             </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password</Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handlePasswordLogin}
              disabled={loading}
            >
              <Text style={[styles.buttonText, loading && styles.buttonTextDisabled]}>
                {loading ? 'Signing In...' : 'Continue'}
              </Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpRow}>
              <Text style={styles.bottomText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
                <Text style={[styles.bottomText, styles.link]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconContainer}>
                <Text style={styles.errorIcon}>!</Text>
              </View>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 66,
  },
  backArrowImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 12,
    marginBottom: 24,
    fontSize: 24,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 24,
  },
  eyeIcon: {
    padding: 8,
  },
  eyeIconText: {
    fontSize: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#000',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  buttonTextDisabled: {
    color: '#666',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  bottomText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#000',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    color: '#000',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  errorIcon: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
});