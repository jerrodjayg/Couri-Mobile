import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Image, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabaseClient';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useFacebookAuth } from '../hooks/useFacebookAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';
import { UserService } from '../utils/userService';

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      // Error handling removed - only phone notifications now
    });

    return unsubscribe;
  }, [navigation]);

  const handlePhoneChange = (text) => {
    setPhoneNumber(formatPhoneNumber(text));
    // Error clearing removed - only phone notifications now
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
  const handlePasswordLogin = () => navigation.navigate('PasswordLogin');

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

  const handleGoogleSignIn = async () => {
    console.log('🔄 handleGoogleSignIn called');
    console.log('🔍 LogInScreen DEBUG - Starting Google sign-in for returning user');
    
    try {
      const result = await signInGoogle();
      console.log('📱 Google sign-in result:', result);
      console.log('🔍 LogInScreen DEBUG - Google sign-in result type:', result.type);
      console.log('🔍 LogInScreen DEBUG - Full OAuth result:', result);

      if (result.type !== 'success') {
        console.log('🔍 LogInScreen DEBUG - Google sign-in failed or incomplete');
        
        // Handle specific error messages from the hook
        if (result.message) {
          console.log('🔍 LogInScreen DEBUG - Error message from hook:', result.message);
        } else {
          console.log('🔍 LogInScreen DEBUG - Generic error message');
        }
        
        Alert.alert('Error', result.message || 'Google sign-in failed. Please try again.');
        return;
      }

      // Wait for session to be established (Google OAuth can take a moment)
      console.log('🔍 LogInScreen DEBUG - Waiting for session to be established...');
      let userEmail = null;
      let userData = null;
      let attempts = 0;
      const maxAttempts = 10; // Wait up to 10 seconds

      // First check if the result already has session data
      if (result.session?.user) {
        userData = result.session.user;
        userEmail = userData.email;
        console.log('🔍 LogInScreen DEBUG - User data from OAuth result session:', userData);
      } else {
        // Fallback: wait for session to be established
        while (attempts < maxAttempts) {
          attempts++;
          console.log(`🔍 LogInScreen DEBUG - Session check attempt ${attempts}/${maxAttempts}`);
          
          // Check if we have session data from the OAuth result
          if (result.session?.user) {
            userData = result.session.user;
            userEmail = userData.email;
            console.log('🔍 LogInScreen DEBUG - User data from OAuth session:', userData);
            break;
          } else {
            // Fallback: try to get user from current session
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              userData = session.user;
              userEmail = session.user.email;
              console.log('🔍 LogInScreen DEBUG - User data from current session:', userData);
              break;
            } else {
              console.log(`🔍 LogInScreen DEBUG - No session yet, attempt ${attempts}/${maxAttempts}`);
              // Wait 1 second before next attempt
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }

      if (!userEmail) {
        console.log('🔍 LogInScreen DEBUG - No email available after waiting for session');
        Alert.alert('Error', 'Unable to retrieve user information. Please try again.');
        return;
      }

      const email = userEmail.toLowerCase();
      console.log('🔍 LogInScreen DEBUG - Processing email:', email);

      // Check if this email already exists in our DB (users table)
      console.log('🔍 LogInScreen DEBUG - Checking if user exists in database...');
      const { exists, user: existingUser } = await UserService.checkUserExists(email);
      console.log('🔍 LogInScreen DEBUG - User existence check result:', { exists, existingUser });

      if (!exists) {
        console.log('🔍 LogInScreen DEBUG - User not found in database, staying on LogInScreen');
        // Not registered — sign out the auth session so we don't keep a ghost login
        await supabase.auth.signOut();
        
        // Show phone notification error message (no on-screen error)
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Account Not Found',
              body: 'This Google email is not registered. Please go to Create Account first.',
              data: { type: 'google_signin_error' },
            },
            trigger: null, // Show immediately
          });
          console.log('✅ Phone notification sent for unregistered Google user');
        } catch (notificationError) {
          console.error('❌ Failed to send phone notification:', notificationError);
        }
        
        Alert.alert(
          'Account Not Created',
          'This Google email is not registered. Please go to Create Account first.',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Create Account',
              onPress: () => {
                console.log('🔍 LogInScreen DEBUG - User chose to create account, navigating to CreateAccount');
                console.log('🔍 LogInScreen DEBUG - Current navigation state:', navigation.getState());
                console.log('🔍 LogInScreen DEBUG - Available routes:', navigation.getState()?.routes?.map(r => r.name));
                
                try {
                  // Simple navigation to CreateAccount
                  console.log('🔍 LogInScreen DEBUG - Attempting navigation to CreateAccount...');
                  
                  // Navigate to CreateAccount
                  navigation.navigate('CreateAccount');
                  console.log('✅ LogInScreen DEBUG - Navigation to CreateAccount initiated');
                  
                } catch (error) {
                  console.error('❌ LogInScreen DEBUG - Navigation error:', error);
                  Alert.alert('Navigation Error', 'Failed to navigate to Create Account screen. Please try again.');
                }
              }
            }
          ]
        );
        
        // CRITICAL: Stay on LogInScreen - don't navigate anywhere
        console.log('🔍 LogInScreen DEBUG - User stays on LogInScreen after account not found error');
        return;
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
        const fullName = userToUse.first_name && userToUse.last_name 
          ? `${userToUse.first_name} ${userToUse.last_name}`
          : userData.user_metadata?.full_name || userData.user_metadata?.name || 'there';
        
        // Pass the complete user data to Welcomepage
        navigation.replace('Welcomepage', { 
          name: fullName,
          userData: {
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
            isGoogleAuth: true
          }
        });
        console.log('✅ LogInScreen DEBUG - Navigation to Welcomepage completed with complete user data');

      } catch (error) {
        console.error('❌ LogInScreen DEBUG - Google sign-in error:', error);
        Alert.alert('Error', 'Google sign-in failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ LogInScreen DEBUG - Google sign-in error:', error);
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
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
      
      // CRITICAL FIX: Don't auto-navigate if user doesn't exist in database
      if (event === 'SIGNED_IN' && session?.user) {
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
               const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'there';
               console.log('🔍 LogInScreen DEBUG - Navigating to Welcomepage with name:', fullName);
               console.log('🔍 LogInScreen DEBUG - About to call navigation.replace...');
               try {
                 navigation.replace('Welcomepage', { name: fullName });
                 console.log('✅ LogInScreen DEBUG - Navigation to Welcomepage successful');
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
              <Text style={styles.backArrow}>←</Text>
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
            
            <TouchableOpacity style={styles.passwordButton} onPress={handlePasswordLogin}>
              <Text style={styles.passwordButtonText}>Password Log In</Text>
            </TouchableOpacity>
            
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
                style={[styles.providerButton, googleLoading && { opacity: 0.7 }]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
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
  backArrow: {
    fontSize: 24,
    color: '#000'
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
  passwordButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    width: '100%',
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 20,
    elevation: 3,
    alignItems: 'center'
  },
  passwordButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '450',
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
    marginTop: 10
  },
  bottomText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#000'
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    color: '#000'
  }
});
