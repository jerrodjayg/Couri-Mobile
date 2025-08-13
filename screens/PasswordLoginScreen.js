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
} from 'react-native';
import { supabase } from './supabaseClient';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      // Normalize email to lowercase for consistent comparison
      const normalizedEmail = emailOrMobile.toLowerCase().trim();
      console.log('🔍 Attempting login with normalized email:', normalizedEmail);

      // Check if user exists and get password hash in a single query
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', normalizedEmail)
        .single();

      console.log('User lookup result:', { userData, userError });

      if (userError) {
        if (userError.code === 'PGRST116') {
          // No user found
          setError('This email is not registered. Please sign up first.');
        } else {
          console.error('Database error:', userError);
          setError('Error checking user account. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (!userData) {
        setError('This email is not registered. Please sign up first.');
        setLoading(false);
        return;
      }

      // Verify password
      console.log('🔐 Verifying password for user:', userData.email);
      console.log('Input password length:', password.length);
      console.log('Stored password hash length:', userData.password_hash?.length);

      if (!userData.password_hash) {
        console.error('No password hash found for user');
        setError('Account setup incomplete. Please contact support.');
        setLoading(false);
        return;
      }

      if (userData.password_hash !== password) {
        console.log('❌ Password mismatch:');
        console.log(' Input password:', `"${password}"`);
        console.log(' Stored password:', `"${userData.password_hash}"`);
        setError('Email and password don\'t match');
        setLoading(false);
        return;
      }

      // ✅ Login successful - prepare complete user data
      console.log('✅ Login successful for user:', userData.email);
      
      // Create complete user data object
      const completeUserData = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        phone: userData.phone || '',
        address1: userData.address_line_1 || '',
        address2: userData.address_line_2 || '',
        city: userData.city || '',
        state: userData.state || '',
        zip: userData.zip_code || '',
        avatar_url: userData.avatar_url || '',
        isGoogleAuth: userData.is_google_auth || false,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };
      
      console.log('📋 Complete user data prepared:', completeUserData);
      
      // Store complete user data in AsyncStorage for other screens
      await AsyncStorage.setItem('tempUserData', JSON.stringify(completeUserData));
      await AsyncStorage.setItem('userProfileData', JSON.stringify(completeUserData));
      
      // Store user email for push notifications
      await AsyncStorage.setItem('currentUserEmail', completeUserData.email);
      
      // Clear any previous profile picture data from other sessions
      await AsyncStorage.removeItem('previousProfilePicture');
      await AsyncStorage.removeItem('storedProfilePicture');
      
      console.log('💾 User data stored in AsyncStorage');
      
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
      navigation.replace('Welcomepage', { 
        name: completeUserData.firstName || completeUserData.full_name?.split(' ')[0] || 'there',
        userData: completeUserData
      });
      
    } catch (error) {
      console.error('❌ Login error:', error);
      setError('An unexpected error occurred. Please try again.');
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
                <Text style={styles.backArrow}>←</Text>
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
  backArrow: {
    fontSize: 24,
    color: '#000',
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