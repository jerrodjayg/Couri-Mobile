import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Image, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from './supabaseClient';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useFacebookAuth } from '../hooks/useFacebookAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';
import { UserService } from '../utils/userService';
import { useFocusEffect } from '@react-navigation/native';

WebBrowser.maybeCompleteAuthSession();

const upsertProfile = async (session) => {
  if (!session?.user) {
    console.log('❌ No user in session for upsertProfile');
    return;
  }

  const { id, email, user_metadata } = session.user;
  const name = user_metadata?.full_name || '';
  const avatar_url = user_metadata?.avatar_url || '';

  console.log('🔄 Upserting profile with data:', { id, email, name, avatar_url });

  // Check if we have a valid ID
  if (!id) {
    console.log('❌ No user ID available for upsertProfile');
    return;
  }

  // Try profiles table first (but skip if it consistently fails)
  console.log('🔄 Attempting profiles table upsert...');
  let { data, error } = await supabase
    .from('profiles')
    .upsert({
      id,
      email,
      name,
      avatar_url,
    });

  if (error) {
    console.error('❌ Profile upsert error:', error);
    if (error && typeof error === 'object') {
      console.error('❌ Error details:', {
        message: error.message || 'No message available',
        details: error.details || 'No details available',
        hint: error.hint || 'No hint available',
        code: error.code || 'No code available'
      });
    } else {
      console.error('❌ Error is not a proper error object:', typeof error, error);
    }
    console.log('⚠️ Profiles table seems to have issues, proceeding to users table...');
  } else {
    console.log('✅ Profile upsert successful:', data);
    return; // Exit early if profiles table worked
  }

  // Always try users table as fallback (since profiles table has issues)
  console.log('🔄 Trying users table as fallback...');
  
  // Split the full name into first and last name
  const nameParts = name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  console.log('🔄 Splitting name:', { fullName: name, firstName, lastName });

  // Try to update existing user first, then insert if not found
  console.log('🔄 Checking if user already exists...');
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .ilike('email', email)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('❌ Error checking existing user:', checkError);
    if (checkError && typeof checkError === 'object') {
      console.error('❌ Check error details:', {
        message: checkError.message || 'No message available',
        code: checkError.code || 'No code available'
      });
    }
  }

  if (existingUser) {
    console.log('🔄 User already exists, updating profile...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        // Update other fields if needed
      })
      .ilike('email', email);

    if (userError) {
      console.error('❌ User update error:', userError);
      if (userError && typeof userError === 'object') {
        console.error('❌ Update error details:', {
          message: userError.message || 'No message available',
          code: userError.code || 'No code available'
        });
      }
    } else {
      console.log('✅ User profile updated successfully:', userData);
    }
  } else {
    console.log('🔄 User not found, creating new user...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        // Add other required fields with defaults
        address_line_1: '',
        city: '',
        state: '',
        zip_code: '',
        phone: '',
      });

    if (userError) {
      console.error('❌ User creation error:', userError);
    } else {
      console.log('✅ New user created successfully:', userData);
    }
  }
  // Error handling is now done in the individual update/insert operations above
};

export default function LogInScreen({ navigation }) {
  // Disable swipe back gesture
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({
        gestureEnabled: false,
      });
      
      return () => {
        navigation.getParent()?.setOptions({
          gestureEnabled: true,
        });
      };
    }, [navigation])
  );

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingSignIn, setIsProcessingSignIn] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);
  const { signIn: signInGoogle, loading: googleLoading } = useGoogleAuth();
  const { signIn: signInFacebook, loading: facebookLoading } = useFacebookAuth();
  const { signIn: signInApple, loading: appleLoading } = useAppleAuth();

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return text;
    if (match[2]) return `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
    return match[1];
  };

  // Clear error messages when component unmounts or navigation changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Reset loading states when user returns to this screen
      setIsProcessingSignIn(false);
      console.log('🔍 LogInScreen DEBUG - Screen focused, reset loading states');
    });

    return unsubscribe;
  }, [navigation]);

  // Check biometric availability
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        setHasBiometricHardware(hasHardware && isEnrolled);
        
        if (hasHardware && isEnrolled) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          
          if (Platform.OS === 'ios') {
            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
              setBiometricLabel('Face ID');
            } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
              setBiometricLabel('Touch ID');
            }
          } else {
            if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
              setBiometricLabel('Fingerprint');
            } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
              setBiometricLabel('Face Recognition');
            }
          }
        }
      } catch (error) {
        console.error('❌ Biometric detection error:', error);
        setHasBiometricHardware(false);
      }
    };

    checkBiometricAvailability();
  }, []);

  const handlePhoneChange = (text) => {
    setPhoneNumber(formatPhoneNumber(text));
    // Error clearing removed - only phone notifications now
  };

  const handleBiometricLogin = async () => {
    try {
      // First check if user has saved data in AsyncStorage
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      const userProfileData = await AsyncStorage.getItem('userProfileData');
      
      if (!tempUserData && !userProfileData) {
        Alert.alert(
          'No Account Found',
          'You need to create an account first before using biometric login.',
          [
            {
              text: 'Create Account',
              onPress: () => navigation.navigate('CreateAccount'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            }
          ]
        );
        return;
      }

      // Check biometric availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        Alert.alert('Error', 'Biometric hardware not available on this device.');
        return;
      }

      if (!isEnrolled) {
        Alert.alert('Error', `No ${biometricLabel} data found. Please enroll first.`);
        return;
      }

      // Perform biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate using ${biometricLabel}`,
        fallbackLabel: 'Use device passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log('✅ Biometric authentication successful');
        
        // Load user data from AsyncStorage
        let userData = null;
        if (tempUserData) {
          userData = JSON.parse(tempUserData);
        } else if (userProfileData) {
          userData = JSON.parse(userProfileData);
        }

        if (userData) {
          // Verify user exists in Supabase database before logging in
          const userEmail = userData.email || userData.userEmail;
          
          console.log('📦 Full userData from AsyncStorage:', JSON.stringify(userData, null, 2));
          console.log('📧 Extracted email:', userEmail);
          console.log('📧 Email type:', typeof userEmail);
          console.log('📧 Email length:', userEmail?.length);
          
          if (!userEmail) {
            Alert.alert(
              'No Account Found',
              'No email found in saved data. Please create an account first.',
              [
                {
                  text: 'Create Account',
                  onPress: () => navigation.navigate('CreateAccount'),
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                }
              ]
            );
            return;
          }

          try {
            console.log('🔍 Checking if user exists in Supabase:', userEmail);
            console.log('🔍 Checking with email (lowercase):', userEmail.toLowerCase());
            console.log('🔍 About to query users table...');
            
            // Add timeout to database query (5 seconds)
            const queryPromise = supabase
              .from('users')
              .select('*')
              .eq('email', userEmail.toLowerCase());
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database query timeout')), 5000)
            );
            
            // Race between query and timeout
            const { data: existingUsers, error: checkError } = await Promise.race([
              queryPromise,
              timeoutPromise
            ]).catch(err => {
              console.log('⚠️ Database query failed or timed out:', err.message);
              console.log('ℹ️ Proceeding with cached data only (RLS may be blocking database access)');
              
              // Return empty result so we can skip to cached data
              return { data: null, error: { message: err.message } };
            });

            console.log('✅ Query completed');
            console.log('🔍 Raw query response - data:', existingUsers);
            console.log('🔍 Raw query response - error:', checkError);
            console.log('🔍 Data type:', typeof existingUsers);
            console.log('🔍 Is array?:', Array.isArray(existingUsers));
            console.log('🔍 Number of users found:', existingUsers?.length || 0);
            
            if (existingUsers) {
              console.log('🔍 First user in array:', existingUsers[0]);
            }

            if (checkError) {
              console.error('❌ Database query error:', checkError);
              console.error('❌ Error code:', checkError.code);
              console.error('❌ Error message:', checkError.message);
              console.error('❌ Error details:', checkError.details);
            }

            // Check if we found at least one user
            if (!existingUsers || existingUsers.length === 0) {
              console.log('⚠️ User not found in database or query blocked by RLS');
              console.log('🔍 Searched for email:', userEmail.toLowerCase());
              console.log('🔍 Query returned:', existingUsers);
              
              // If we have cached data and the query just timed out (not an actual error),
              // allow login with cached data
              if (checkError && checkError.message === 'Database query timeout') {
                console.log('ℹ️ Database query timed out (likely RLS blocking)');
                console.log('✅ Using cached data from AsyncStorage for Face ID login');
                
                // Navigate to Welcomepage with cached user data
                navigation.replace('Welcomepage', {
                  name: userData.firstName || userData.name || 'there',
                  userData: userData
                });
                return;
              }
              
              // If it's a real "not found" (not just RLS blocking), show error
              Alert.alert(
                'No Account Found',
                'You don\'t have an account with Couri. Please create an account first.',
                [
                  {
                    text: 'Create Account',
                    onPress: () => navigation.navigate('CreateAccount'),
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  }
                ]
              );
              return;
            }

            const existingUser = existingUsers[0];
            console.log('✅ User found in Supabase database');
            console.log('✅ User email from DB:', existingUser.email);
            console.log('✅ User ID:', existingUser.id);
            console.log('✅ User first name:', existingUser.first_name);
            console.log('✅ User last name:', existingUser.last_name);
            
            // Update userData with database info to ensure consistency
            userData = {
              ...userData,
              id: existingUser.id,
              email: existingUser.email,
              firstName: existingUser.first_name || userData.firstName,
              lastName: existingUser.last_name || userData.lastName,
              phone: existingUser.phone || userData.phone,
              address1: existingUser.address_line_1 || userData.address1,
              address2: existingUser.address_line_2 || userData.address2,
              city: existingUser.city || userData.city,
              state: existingUser.state || userData.state,
              zip: existingUser.zip_code || userData.zip,
            };
            
            console.log('✅ Face ID login successful, proceeding to Welcomepage');
            
            // Navigate to Welcomepage with user data from database
            navigation.replace('Welcomepage', {
              name: userData.firstName || userData.name || 'there',
              userData: userData
            });
          } catch (error) {
            console.error('❌ Error verifying user in Supabase:', error);
            console.log('ℹ️ Database verification failed, but proceeding with cached data');
            console.log('✅ Using AsyncStorage data for Face ID login');
            
            // Allow login with cached data even if database check fails
            navigation.replace('Welcomepage', {
              name: userData.firstName || userData.name || 'there',
              userData: userData
            });
          }
        } else {
          Alert.alert('Error', 'Unable to load user data. Please try again.');
        }
      } else {
        console.log('❌ Biometric authentication failed or cancelled');
      }
    } catch (error) {
      console.error('❌ Biometric authentication error:', error);
      Alert.alert('Error', 'Something went wrong during biometric authentication.');
    }
  };
  const handleContinue = () => {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      Alert.alert('Error', 'Please enter your mobile number');
      return;
    }
    
    // Clean the phone number and check if it has at least 10 digits
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid mobile number with at least 10 digits');
      return;
    }
            navigation.navigate('Home');
  };

  const handleAppleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'com.anonymous.jerroddd://',
        },
      });

      if (error) {
        Alert.alert('Error', `Apple sign-in failed: ${error.message}`);
        return;
      }

      // Wait a moment for Supabase to finalize session
      setTimeout(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (session?.user) {
          await upsertProfile(session);
          const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'there';
          navigation.replace('Welcomepage', { name: fullName });
        }
      }, 1000);
    } catch (err) {
      console.error('Apple sign-in error:', err);
      Alert.alert('Error', 'Apple sign-in failed. Please try again.');
    }
  };

  // Helper function to wait for session establishment
  const waitForSession = () => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 10;
      const interval = 400;
      
      const checkSession = async () => {
        attempts++;
        console.log(`🔍 LogInScreen DEBUG - Session check attempt ${attempts}/${maxAttempts}`);
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.log(`🔍 LogInScreen DEBUG - Session error:`, error.message);
          } else if (session?.user) {
            console.log('🔍 LogInScreen DEBUG - Session established successfully');
            resolve(session);
            return;
          } else {
            console.log(`🔍 LogInScreen DEBUG - No session yet, attempt ${attempts}/${maxAttempts}`);
          }
          
          if (attempts >= maxAttempts) {
            console.log('🔍 LogInScreen DEBUG - Max attempts reached, rejecting');
            reject(new Error('Session establishment timeout'));
            return;
          }
          
          // Continue checking
          setTimeout(checkSession, interval);
        } catch (sessionErr) {
          console.log(`🔍 LogInScreen DEBUG - Session check error:`, sessionErr.message);
          
          if (attempts >= maxAttempts) {
            reject(sessionErr);
            return;
          }
          
          // Continue checking
          setTimeout(checkSession, interval);
        }
      };
      
      // Start checking after a brief delay to allow auth state change to process
      setTimeout(checkSession, 500);
    });
  };

  const handleGoogleSignIn = async () => {
    // Prevent multiple simultaneous sign-in attempts
    if (isLoading || isProcessingSignIn) {
      console.log('🔍 LogInScreen DEBUG - Sign-in already in progress, ignoring request');
      return;
    }
    
    setIsProcessingSignIn(true);
    
    console.log('🔄 handleGoogleSignIn called');
    console.log('🔍 LogInScreen DEBUG - Starting Google sign-in for returning user');
    console.log('🔍 LogInScreen DEBUG - Current navigation state:', navigation.getState());
    
    // Add timeout to detect if Google auth doesn't proceed
    const errorTimeoutId = setTimeout(() => {
      console.log('⏱️ Google auth timeout - resetting loading state');
      setIsProcessingSignIn(false);
      // Don't navigate to error screen, just reset state
    }, 5000); // 5 seconds
    
    try {
      const currentSession = await supabase.auth.getSession();
      console.log('🔍 LogInScreen DEBUG - Current user session before OAuth:', currentSession);
    } catch (sessionError) {
      console.log('🔍 LogInScreen DEBUG - Error getting current session (non-blocking):', sessionError.message);
    }
    
    try {
      console.log('🔍 LogInScreen DEBUG - About to call signInGoogle()...');
      const result = await signInGoogle();
      console.log('📱 Google sign-in result:', result);
      console.log('🔍 LogInScreen DEBUG - Google sign-in result type:', result.type);
      console.log('🔍 LogInScreen DEBUG - Full OAuth result:', result);
      console.log('🔍 LogInScreen DEBUG - Result URL:', result?.url);
      console.log('🔍 LogInScreen DEBUG - Result session:', result?.session);

      // Clear the timeout since we got a response
      clearTimeout(errorTimeoutId);

      if (result.type !== 'success') {
        console.log('🔍 LogInScreen DEBUG - Google sign-in failed or incomplete');
        if (result.message) {
          console.log('🔍 LogInScreen DEBUG - Error message from hook:', result.message);
        } else {
          console.log('🔍 LogInScreen DEBUG - Generic error message');
        }
        setIsProcessingSignIn(false);
        if (result.type === 'cancel' || result.type === 'dismiss') {
          return;
        }
        Alert.alert(
          "Google auth isn't working",
          "We couldn't sign you in with Google. Please try again or use another method.",
          [{ text: 'OK' }]
        );
        return;
      }

      // Wait for session to be established (Google OAuth can take a moment)
      console.log('🔍 LogInScreen DEBUG - Waiting for session to be established...');
      let userEmail = null;
      let userData = null;
      
      // First check if the result already has session data
      if (result.session?.user) {
        userData = result.session.user;
        userEmail = userData.email;
        console.log('🔍 LogInScreen DEBUG - User data from OAuth result session:', userData);
      } else {
        // Wait for session with improved logic using Promise-based approach
        console.log('🔍 LogInScreen DEBUG - Session not in result, waiting for auth state change...');
        
        try {
          // Wait for session to be established with a more reliable approach
          const sessionData = await waitForSession();
          if (sessionData) {
            userData = sessionData.user;
            userEmail = sessionData.user.email;
            console.log('🔍 LogInScreen DEBUG - User data from established session:', userData);
          }
        } catch (sessionError) {
          console.log('🔍 LogInScreen DEBUG - Failed to establish session:', sessionError.message);
        }
      }

      if (!userEmail) {
        console.log('🔍 LogInScreen DEBUG - No email available after waiting for session');
        console.log('🔍 LogInScreen DEBUG - This might be a new Google user, attempting to create session');
        
        // Check if we have a valid OAuth result with a code
        console.log('🔍 LogInScreen DEBUG - Checking OAuth result URL:', result?.url);
        console.log('🔍 LogInScreen DEBUG - URL contains code?', result?.url?.includes('code='));
        
        if (result?.url && result.url.includes('code=')) {
          console.log('🔍 LogInScreen DEBUG - OAuth completed successfully, treating as new Google user');
          console.log('🔍 LogInScreen DEBUG - Full result URL:', result.url);
          
          try {
            // Extract the code from the URL
            console.log('🔍 LogInScreen DEBUG - Parsing URL to extract code...');
            const url = new URL(result.url);
            console.log('🔍 LogInScreen DEBUG - Parsed URL:', url.toString());
            console.log('🔍 LogInScreen DEBUG - URL search params:', url.searchParams.toString());
            
            const code = url.searchParams.get('code');
            console.log('🔍 LogInScreen DEBUG - Extracted code:', code ? 'EXISTS' : 'NULL');
            
            if (code) {
              console.log('🔍 LogInScreen DEBUG - Attempting to exchange code for session');
              console.log('🔍 LogInScreen DEBUG - Code length:', code.length);
              console.log('🔍 LogInScreen DEBUG - Code first 10 chars:', code.substring(0, 10));
              
              try {
                console.log('🔍 LogInScreen DEBUG - Creating exchange promise...');
                // Timeout to fail faster and show error sooner
                const exchangePromise = supabase.auth.exchangeCodeForSession(code);
                console.log('🔍 LogInScreen DEBUG - Exchange promise created, starting race with timeout...');
                
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => {
                    console.log('🔍 LogInScreen DEBUG - Timeout reached (12 seconds)');
                    reject(new Error('Code exchange timeout'));
                  }, 12000)
                );
                
                console.log('🔍 LogInScreen DEBUG - Racing exchange promise with timeout...');
                const { data: exchangeData, error: exchangeError } = await Promise.race([
                  exchangePromise,
                  timeoutPromise
                ]);
                
                console.log('🔍 LogInScreen DEBUG - Exchange completed, processing results...');
                console.log('🔍 LogInScreen DEBUG - Exchange error:', exchangeError);
                console.log('🔍 LogInScreen DEBUG - Exchange data:', exchangeData);
                
                if (exchangeError) {
                  console.log('🔍 LogInScreen DEBUG - Code exchange failed:', exchangeError);
                  console.log('🔍 LogInScreen DEBUG - Error message:', exchangeError.message);
                  console.log('🔍 LogInScreen DEBUG - Error status:', exchangeError.status);
                  console.log('🔍 LogInScreen DEBUG - Full error details:', JSON.stringify(exchangeError, null, 2));
                  // Fall through to error handling
                } else if (exchangeData?.session?.user) {
                  console.log('🔍 LogInScreen DEBUG - Code exchange successful, got user:', exchangeData.session.user.email);
                  console.log('🔍 LogInScreen DEBUG - User ID:', exchangeData.session.user.id);
                  userData = exchangeData.session.user;
                  userEmail = exchangeData.session.user.email;
                } else {
                  console.log('🔍 LogInScreen DEBUG - Code exchange returned no session data');
                  console.log('🔍 LogInScreen DEBUG - Exchange data keys:', Object.keys(exchangeData || {}));
                  console.log('🔍 LogInScreen DEBUG - Exchange data:', JSON.stringify(exchangeData, null, 2));
                }
              } catch (exchangeErr) {
                console.log('🔍 LogInScreen DEBUG - Code exchange failed or timed out:', exchangeErr.message);
                console.log('🔍 LogInScreen DEBUG - Exchange error type:', typeof exchangeErr);
                console.log('🔍 LogInScreen DEBUG - Exchange error stack:', exchangeErr.stack);
                console.log('🔍 LogInScreen DEBUG - Full exchange error:', JSON.stringify(exchangeErr, null, 2));
                // Fall through to error handling
              }
            } else {
              console.log('🔍 LogInScreen DEBUG - No code found in URL parameters');
            }
          } catch (exchangeErr) {
            console.log('🔍 LogInScreen DEBUG - URL parsing error:', exchangeErr);
            console.log('🔍 LogInScreen DEBUG - URL parsing error message:', exchangeErr.message);
          }
        } else {
          console.log('🔍 LogInScreen DEBUG - No valid OAuth URL with code found');
          console.log('🔍 LogInScreen DEBUG - Result URL:', result?.url);
        }
        
        // If still no email, reset loading state and return
        if (!userEmail) {
          console.log('🔍 LogInScreen DEBUG - Still no email available, resetting loading state');
          setIsProcessingSignIn(false);
          Alert.alert(
            "Google auth isn't working",
            "We couldn't sign you in with Google. Please try again or use another method.",
            [{ text: 'OK' }]
          );
          return;
        }
      }

      const email = userEmail.toLowerCase();
      console.log('🔍 LogInScreen DEBUG - Processing email:', email);

      // Check if this email already exists in our DB (users table)
      console.log('🔍 LogInScreen DEBUG - Checking if user exists in database...');
      
      // Add timeout to prevent hanging - increased to 15 seconds
      const checkUserPromise = UserService.checkUserExists(email);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database check timeout')), 15000)
      );
      
      let exists, existingUser;
      try {
        const result = await Promise.race([checkUserPromise, timeoutPromise]);
        exists = result.exists;
        existingUser = result.user;
        console.log('🔍 LogInScreen DEBUG - User existence check result:', { exists, existingUser });
      } catch (error) {
        console.log('🔍 LogInScreen DEBUG - Database check failed or timed out:', error);
        // If database check fails, assume new user and proceed
        exists = false;
        existingUser = null;
        console.log('🔍 LogInScreen DEBUG - Assuming new user due to database error');
      }

      if (!exists) {
        console.log('🔍 LogInScreen DEBUG - User not found in database, creating new Google user session');
        
        // New Google user - create a minimal user session and navigate to Welcomepage
        try {
          console.log('🔍 LogInScreen DEBUG - Creating Google user data from:', userData);
          
          // Create user data from Google information
          const googleUserData = {
            id: userData.id,
            email: userData.email,
            name: userData.user_metadata?.full_name || userData.user_metadata?.name || '',
            full_name: userData.user_metadata?.full_name || userData.user_metadata?.name || '',
            firstName: userData.user_metadata?.full_name?.split(' ')[0] || '',
            lastName: userData.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            avatar_url: userData.user_metadata?.avatar_url || userData.user_metadata?.picture || '',
            profileImageUri: userData.user_metadata?.avatar_url || userData.user_metadata?.picture || '',
            isGoogleAuth: true,
            hasSkippedPhoto: false, // Google users have profile pictures
            userInitials: userData.user_metadata?.full_name ? 
              userData.user_metadata.full_name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() : 
              userData.email.charAt(0).toUpperCase()
          };

          console.log('🔍 LogInScreen DEBUG - Created Google user data for new user:', googleUserData);

          // Save the Google user to the database
          console.log('🔍 LogInScreen DEBUG - Saving Google user to database...');
          try {
            const saveResult = await UserService.saveGoogleAuthUser(userData, googleUserData);
            console.log('✅ LogInScreen DEBUG - Google user saved to database:', saveResult);
            
            if (saveResult.success && saveResult.user) {
              // Update googleUserData with the database user data
              const dbUser = saveResult.user;
              googleUserData.id = dbUser.id; // Use the database ID
              googleUserData.firstName = dbUser.first_name || googleUserData.firstName;
              googleUserData.lastName = dbUser.last_name || googleUserData.lastName;
              console.log('🔍 LogInScreen DEBUG - Updated Google user data with database info:', googleUserData);
            }
          } catch (saveError) {
            console.error('❌ LogInScreen DEBUG - Error saving Google user to database:', saveError);
            console.error('❌ LogInScreen DEBUG - Save error details:', JSON.stringify(saveError, null, 2));
            // Continue with AsyncStorage even if database save fails
          }

          // Store the Google user data in AsyncStorage for the session
          console.log('🔍 LogInScreen DEBUG - Storing Google user data in AsyncStorage...');
          await AsyncStorage.setItem('tempUserData', JSON.stringify(googleUserData));
          await AsyncStorage.setItem('userProfileData', JSON.stringify(googleUserData));
          console.log('✅ LogInScreen DEBUG - Google user data stored in AsyncStorage');
          
          // Navigate to Tutorial for new Google users
          console.log('🔍 LogInScreen DEBUG - Navigating new Google user to Tutorial...');
          console.log('🔍 LogInScreen DEBUG - Navigation params:', { 
            userInfo: googleUserData,
            isNewGoogleUser: true 
          });
          console.log('🔍 LogInScreen DEBUG - Current navigation state before navigate:', navigation.getState());
          console.log('🔍 LogInScreen DEBUG - Available routes:', navigation.getState()?.routes?.map(r => r.name));
          
          try {
            navigation.navigate('Tutorial', { 
              userInfo: googleUserData,
              isNewGoogleUser: true 
            });
            console.log('✅ LogInScreen DEBUG - Navigation.navigate() called successfully');
            
            // Wait a moment and check if navigation actually happened
            setTimeout(() => {
              console.log('🔍 LogInScreen DEBUG - Navigation state after 1 second:', navigation.getState());
            }, 1000);
            
          } catch (navError) {
            console.error('❌ LogInScreen DEBUG - Navigation error:', navError);
            console.error('❌ LogInScreen DEBUG - Navigation error message:', navError.message);
          }
          
          console.log('✅ LogInScreen DEBUG - New Google user navigation completed');
          return;

        } catch (error) {
          console.error('❌ LogInScreen DEBUG - Error creating new Google user session:', error);
          await supabase.auth.signOut();
          setIsProcessingSignIn(false);
          Alert.alert(
            "Google auth isn't working",
            "We couldn't sign you in with Google. Please try again or use another method.",
            [{ text: 'OK' }]
          );
          return;
        }
      }

      console.log('🔍 LogInScreen DEBUG - User found in database, proceeding with sign-in');
      console.log('🔍 LogInScreen DEBUG - Existing user data:', existingUser);

      // User exists in database - proceed with sign-in
      // Use the new function to handle existing Google users gracefully
      try {
        console.log('🔍 LogInScreen DEBUG - Handling existing Google user...');
        const result = await UserService.handleExistingGoogleUser(userData, existingUser);
        console.log('✅ LogInScreen DEBUG - Existing user handled successfully:', result);
        
        // Use the updated user data if available
        const userToUse = result.user;
        
        // Store complete user data in AsyncStorage for the app to use
        console.log('🔍 LogInScreen DEBUG - Storing complete user data in AsyncStorage...');
        try {
          const completeUserData = {
            id: userToUse.id || 'temp_user',
            email: email,
            firstName: userToUse.first_name || '',
            lastName: userToUse.last_name || '',
            name: userToUse.first_name || userToUse.last_name ? `${userToUse.first_name || ''} ${userToUse.last_name || ''}`.trim() : '',
            full_name: userToUse.first_name && userToUse.last_name ? `${userToUse.first_name} ${userToUse.last_name}` : '',
            phone: userToUse.phone || '',
            address1: userToUse.address_line_1 || '',
            address2: userToUse.address_line_2 || '',
            city: userToUse.city || '',
            state: userToUse.state || '',
            zip: userToUse.zip_code || '',
            avatar_url: userData.user_metadata?.avatar_url || userToUse.avatar_url || '',
            profileImageUri: userData.user_metadata?.avatar_url || userToUse.avatar_url || '',
            isGoogleAuth: true,
            // Include any additional fields from the database
            ...userToUse
          };

          console.log('🔍 LogInScreen DEBUG - Complete user data prepared:', completeUserData);

          // Store in both tempUserData and userProfileData for consistency
          await AsyncStorage.setItem('tempUserData', JSON.stringify(completeUserData));
          await AsyncStorage.setItem('userProfileData', JSON.stringify(completeUserData));
          
          console.log('✅ LogInScreen DEBUG - Complete user data stored in AsyncStorage');
          console.log('✅ LogInScreen DEBUG - Data stored in both tempUserData and userProfileData');
          
          // Verify the data was stored correctly
          const storedTempData = await AsyncStorage.getItem('tempUserData');
          const storedProfileData = await AsyncStorage.getItem('userProfileData');
          console.log('🔍 LogInScreen DEBUG - Verification - tempUserData stored:', storedTempData ? 'YES' : 'NO');
          console.log('🔍 LogInScreen DEBUG - Verification - userProfileData stored:', storedProfileData ? 'YES' : 'NO');
          
        } catch (storageError) {
          console.log('⚠️ LogInScreen DEBUG - AsyncStorage error (non-blocking):', storageError);
        }

        // Navigate to Welcomepage for returning users with complete data
        console.log('🔍 LogInScreen DEBUG - Navigating to Welcomepage for returning user');
        
        const userDataToPass = {
          id: userToUse.id || 'temp_user',
          email: email,
          firstName: userToUse.first_name || userData.user_metadata?.given_name || '',
          lastName: userToUse.last_name || userData.user_metadata?.family_name || '',
          name: userToUse.first_name || userToUse.last_name ? `${userToUse.first_name || ''} ${userToUse.last_name || ''}`.trim() : '',
          full_name: userToUse.first_name && userToUse.last_name ? `${userToUse.first_name} ${userToUse.last_name}` : '',
          phone: userToUse.phone || '',
          address1: userToUse.address_line_1 || '',
          address2: userToUse.address_line_2 || '',
          city: userToUse.city || '',
          state: userToUse.state || '',
          zip: userToUse.zip_code || '',
          avatar_url: userData.user_metadata?.avatar_url || userToUse.avatar_url || '',
          profileImageUri: userData.user_metadata?.avatar_url || userToUse.avatar_url || '',
          isGoogleAuth: true
        };
        
        // Use only the first name for the greeting
        const firstName = userDataToPass.firstName || 'there';
        console.log('🔍 LogInScreen DEBUG - First name for returning user:', firstName);
        console.log('🔍 LogInScreen DEBUG - Current navigation state before replace:', navigation.getState());
        console.log('🔍 LogInScreen DEBUG - Available routes:', navigation.getState()?.routes?.map(r => r.name));
        console.log('🔍 LogInScreen DEBUG - User data to pass to Welcomepage:', userDataToPass);
        
        try {
          // Pass the complete user data to Welcomepage
          navigation.replace('Welcomepage', { 
            name: firstName,
            userData: userDataToPass
          });
          console.log('✅ LogInScreen DEBUG - Navigation.replace() called successfully for returning user');
          
          // Wait a moment and check if navigation actually happened
          setTimeout(() => {
            console.log('🔍 LogInScreen DEBUG - Navigation state after 1 second (returning user):', navigation.getState());
          }, 1000);
          
        } catch (navError) {
          console.error('❌ LogInScreen DEBUG - Navigation error for returning user:', navError);
          console.error('❌ LogInScreen DEBUG - Navigation error message:', navError.message);
        }
        
        console.log('✅ LogInScreen DEBUG - Navigation to Welcomepage completed with complete user data');

      } catch (error) {
        console.error('❌ LogInScreen DEBUG - Google sign-in error:', error);
        setIsProcessingSignIn(false);
        Alert.alert(
          "Google auth isn't working",
          "We couldn't sign you in with Google. Please try again or use another method.",
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ LogInScreen DEBUG - Google sign-in error (outer catch):', error);
      console.error('❌ LogInScreen DEBUG - Error message:', error.message);
      console.error('❌ LogInScreen DEBUG - Error stack:', error.stack);
      console.error('❌ LogInScreen DEBUG - Full error details:', JSON.stringify(error, null, 2));
      
      clearTimeout(errorTimeoutId);
      setIsProcessingSignIn(false);
      Alert.alert(
        "Google auth isn't working",
        "We couldn't sign you in with Google. Please try again or use another method.",
        [{ text: 'OK' }]
      );
    }
  };



  const handleFacebookSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: 'com.anonymous.jerroddd://',
        },
      });

      if (error) {
        Alert.alert('Error', `Facebook sign-in failed: ${error.message}`);
        return;
      }

      setTimeout(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (session?.user) {
          await upsertProfile(session);
          const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'there';
          navigation.replace('Welcomepage', { name: fullName });
        }
      }, 1000);
    } catch (err) {
      console.error('Facebook sign-in error:', err);
      Alert.alert('Error', 'Facebook sign-in failed. Please try again.');
    }
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      // CRITICAL FIX: Don't auto-navigate if user doesn't exist in database or if we're processing sign-in
      if (event === 'SIGNED_IN' && session?.user && !isProcessingSignIn) {
        console.log('🔍 LogInScreen DEBUG - Auth state change: SIGNED_IN detected');
        
        // Check if this user actually exists in our database before navigating
                 try {
           const email = session.user.email?.toLowerCase();
           console.log('🔍 LogInScreen DEBUG - Email from session:', email);
           
           if (email) {
             console.log('🔍 LogInScreen DEBUG - Checking database existence for auth state change...');
             console.log('🔍 LogInScreen DEBUG - About to call UserService.checkUserExists...');
             
             const { exists, user: existingUser } = await UserService.checkUserExists(email);
             console.log('🔍 LogInScreen DEBUG - Database check result:', { exists, existingUser });
             
             if (exists) {
               console.log('🔍 LogInScreen DEBUG - User exists in database, allowing navigation');
               
               // Prepare complete user data for Welcomepage
               const userDataToPass = {
                 id: existingUser.id || session.user.id,
                 email: email,
                 firstName: existingUser.first_name || session.user.user_metadata?.given_name || '',
                 lastName: existingUser.last_name || session.user.user_metadata?.family_name || '',
                 name: existingUser.first_name && existingUser.last_name ? `${existingUser.first_name} ${existingUser.last_name}` : existingUser.first_name || existingUser.last_name || '',
                 full_name: existingUser.first_name && existingUser.last_name ? `${existingUser.first_name} ${existingUser.last_name}` : existingUser.first_name || existingUser.last_name || '',
                 phone: existingUser.phone || '',
                 address1: existingUser.address_line_1 || '',
                 address2: existingUser.address_line_2 || '',
                 city: existingUser.city || '',
                 state: existingUser.state || '',
                 zip: existingUser.zip_code || '',
                 avatar_url: session.user.user_metadata?.avatar_url || existingUser.avatar_url || '',
                 profileImageUri: session.user.user_metadata?.avatar_url || existingUser.avatar_url || '',
                 isGoogleAuth: true
               };
               
               // Use only the first name for the greeting
               const firstName = userDataToPass.firstName || 'there';
               console.log('🔍 LogInScreen DEBUG - Navigating to Welcomepage with firstName:', firstName);
               console.log('🔍 LogInScreen DEBUG - About to call navigation.replace...');
               
               try {
                 navigation.replace('Welcomepage', { 
                   name: firstName,
                   userData: userDataToPass
                 });
                 console.log('✅ LogInScreen DEBUG - Navigation to Welcomepage successful with complete user data');
               } catch (navError) {
                 console.error('❌ LogInScreen DEBUG - Navigation error:', navError);
               }
             } else {
               console.log('🔍 LogInScreen DEBUG - User NOT found in database, preventing auto-navigation');
               console.log('🔍 LogInScreen DEBUG - Signing out from Supabase...');
               // Sign out the session since user doesn't exist in database
               await supabase.auth.signOut();
               console.log('🔍 LogInScreen DEBUG - Sign out completed, staying on LogInScreen');
               // Don't navigate - keep user on LogInScreen
             }
           } else {
             console.log('🔍 LogInScreen DEBUG - No email in session, preventing navigation');
             console.log('🔍 LogInScreen DEBUG - Signing out from Supabase...');
             await supabase.auth.signOut();
             console.log('🔍 LogInScreen DEBUG - Sign out completed, staying on LogInScreen');
           }
                  } catch (error) {
           console.error('🔍 LogInScreen DEBUG - Error checking database in auth state change:', error);
           console.log('🔍 LogInScreen DEBUG - Error details:', {
             message: error.message,
             stack: error.stack,
             type: error.type
           });
           // On error, sign out and stay on LogInScreen
           console.log('🔍 LogInScreen DEBUG - Signing out due to error...');
           await supabase.auth.signOut();
           console.log('🔍 LogInScreen DEBUG - Sign out completed after error, staying on LogInScreen');
         }
       }
       
       console.log('🔍 LogInScreen DEBUG - Auth state change handler completed for event:', event);
     });
     return () => listener.subscription.unsubscribe();
   }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()}>
              <Image 
                source={require('../assets/backarrow1.png')} 
                style={styles.backArrowImage}
              />
            </Pressable>
            <Text style={styles.headerTitle}>LOG IN</Text>
            <View style={{ width: 24 }} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor="#000"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            autoCapitalize="none"
            keyboardType="phone-pad"
            maxLength={14}
          />

          <Text style={styles.subText}>Message and data rates may apply.</Text>

          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.socialBox}>
            <Text style={styles.socialLabel}>or continue with</Text>
            
            
            <View style={styles.providerRow}>
              {/* Apple */}
              <TouchableOpacity
                style={[styles.providerButton, appleLoading && { opacity: 0.7 }]}
                onPress={handleAppleSignIn}
                disabled={appleLoading}
              >
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/appleicon.png' }}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Google */}
              <TouchableOpacity
                style={[styles.providerButton, (googleLoading || isProcessingSignIn) && { opacity: 0.7 }]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading || isProcessingSignIn}
              >
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/googleicon.png' }}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Facebook - Hidden but functionality preserved */}
              {/* <TouchableOpacity
                style={[styles.providerButton, facebookLoading && { opacity: 0.7 }]}
                onPress={handleFacebookSignIn}
                disabled={facebookLoading}
              >
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/facebookicon.png' }}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity> */}
            </View>
          </View>

          {/* Biometric Login Section - Moved to bottom */}
          {hasBiometricHardware && (
            <TouchableOpacity 
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
            >
              <Image
                source={require('../assets/face-id.png')}
                style={styles.biometricIcon}
                resizeMode="contain"
                tintColor="#8B5CF6"
              />
              <Text style={styles.biometricText}>Log in with {biometricLabel}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.signUpRow}>
            <Text style={styles.bottomText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
              <Text style={[styles.bottomText, styles.link]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white'
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: 'white',
    justifyContent: 'flex-start'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 66
  },
  backArrowImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain'
  },
  headerTitle: {
    fontSize: 16,
    color: '#000'
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 12,
    marginBottom: 8,
    fontSize: 27
  },
  subText: {
    fontSize: 12,
    color: '#000',
    marginBottom: 24
  },
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 22,
    elevation: 6
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  socialLabel: {
    fontSize: 14,
    marginBottom: 16,
    color: '#000'
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingLeft: 10,
    paddingRight: 30
  },
  providerButton: {
    width: 90,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 4
  },
  providerLogo: {
    width: 24,
    height: 24
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: -4,
  },
  biometricIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8B5CF6', // Purple text
  },
  socialBox: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 24,
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 225
  },
  bottomText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#000'
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    color: '#000'
  }
});
