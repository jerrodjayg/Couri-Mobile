import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Image, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabaseClient';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useFacebookAuth } from '../hooks/useFacebookAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';

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
    .eq('email', email)
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
      .eq('email', email);

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
  const [phone, setPhone] = useState('');
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

  const handlePhoneChange = (text) => setPhone(formatPhoneNumber(text));
  const handleContinue = () => {
    if (!phone || phone.trim().length === 0) {
      Alert.alert('Error', 'Please enter your mobile number');
      return;
    }
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid mobile number');
      return;
    }
    navigation.navigate('Welcomepage');
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
    console.log('🔄 handleGoogleSignIn function called');
    try {
      console.log('🔄 Starting Google sign-in...');
      const result = await signInGoogle();
      console.log('📱 Google sign-in result:', result);

      if (result.type === 'success') {
        console.log('✅ Google sign-in successful');
        
        // Extract user info from the URL fragment
        const url = result.url;
        console.log('✅ OAuth result URL:', url);
        console.log('✅ URL includes access_token:', url && url.includes('access_token'));
        
        if (url && url.includes('access_token')) {
          // Parse the URL to get user info
          const fragment = url.split('#')[1];
          console.log('✅ URL fragment:', fragment);
          const params = new URLSearchParams(fragment);
          console.log('✅ URL params:', Object.fromEntries(params.entries()));
          
          // Wait for the session to be established and get user info
          console.log('🔄 Waiting for Google OAuth session to be established...');
          
          // Wait for the session to be properly established
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to get the session multiple times
          let currentSession = null;
          let retryCount = 0;
          const maxRetries = 5;
          
          while (!currentSession && retryCount < maxRetries) {
            console.log(`🔄 Attempt ${retryCount + 1} to get session...`);
            
            try {
              const { data: { session: sessionData }, error: sessionError } = await supabase.auth.getSession();
              console.log('🔄 Session data:', sessionData);
              console.log('🔄 Session error:', sessionError);
              
              currentSession = sessionData;
              
              if (!currentSession) {
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (error) {
              console.error('❌ Error getting session:', error);
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          if (currentSession?.user) {
            console.log('✅ Session established successfully');
            console.log('✅ User metadata:', currentSession.user.user_metadata);
            console.log('✅ Full user object:', currentSession.user);
            
            // Check if user already exists in the database
            console.log('🔄 Checking if user already exists in database...');
            const { data: existingUser, error: userCheckError } = await supabase
              .from('users')
              .select('*')
              .eq('email', currentSession.user.email)
              .single();
            
            if (userCheckError && userCheckError.code !== 'PGRST116') {
              console.error('❌ Error checking existing user:', userCheckError);
            }
            
            if (existingUser) {
              console.log('✅ User already exists in database, signing in...');
              
              // User exists, save profile and navigate to welcome screen
              try {
                await upsertProfile(currentSession);
                console.log('✅ Profile updated successfully');
              } catch (profileError) {
                console.log('⚠️ Profile update failed, but continuing:', profileError);
              }
              
              // Navigate to welcome screen for existing users
              const fullName = existingUser.first_name && existingUser.last_name 
                ? `${existingUser.first_name} ${existingUser.last_name}`
                : currentSession.user.user_metadata?.full_name || 
                  currentSession.user.user_metadata?.name || 
                  'there';
              
              navigation.replace('Welcomepage', { name: fullName });
              return;
            } else {
              console.log('🔄 User does not exist, proceeding to onboarding...');
              
              // User doesn't exist, navigate to PersonalInfoScreen for onboarding
              navigation.replace('PersonalInfo', { 
                userInfo: {
                  firstName: currentSession.user.user_metadata?.given_name || 
                    currentSession.user.user_metadata?.name?.split(' ')[0] || '',
                  lastName: currentSession.user.user_metadata?.family_name || 
                    currentSession.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
                  email: currentSession.user.email || '',
                  phone: '',
                  address1: '',
                  address2: '',
                  city: '',
                  state: '',
                  zip: '',
                },
                isGoogleAuth: true,
                googleUserData: {
                  id: currentSession.user.id,
                  email: currentSession.user.email,
                  user_metadata: currentSession.user.user_metadata,
                  app_metadata: currentSession.user.app_metadata
                }
              });
              return;
            }
          } else {
            console.log('❌ Failed to establish session after multiple retries');
            
            // Try to get user info from the OAuth result URL as fallback
            try {
              console.log('🔄 Trying to extract user info from OAuth URL...');
              
              const fragment = url.split('#')[1];
              const params = new URLSearchParams(fragment);
              const providerToken = params.get('provider_token');
              
              if (providerToken) {
                console.log('🔄 Found provider token, trying to get user info...');
                
                // Try to get user info using the provider token (Google OAuth token)
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: {
                    'Authorization': `Bearer ${providerToken}`,
                    'Accept': 'application/json'
                  }
                });
                
                if (userInfoResponse.ok) {
                  const userInfoData = await userInfoResponse.json();
                  console.log('✅ Got user info from Google API:', userInfoData);
                  
                  // Check if user exists in database
                  const { data: existingUser, error: userCheckError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', userInfoData.email)
                    .single();
                  
                  if (userCheckError && userCheckError.code !== 'PGRST116') {
                    console.error('❌ Error checking existing user:', userCheckError);
                  }
                  
                  if (existingUser) {
                    console.log('✅ User already exists in database, navigating to welcome...');
                    const fullName = existingUser.first_name && existingUser.last_name 
                      ? `${existingUser.first_name} ${existingUser.last_name}`
                      : userInfoData.name || 'there';
                    
                    navigation.replace('Welcomepage', { name: fullName });
                    return;
                  } else {
                    console.log('🔄 User does not exist, proceeding to onboarding...');
                    navigation.replace('PersonalInfo', { 
                      userInfo: {
                        firstName: userInfoData.given_name || userInfoData.name?.split(' ')[0] || '',
                        lastName: userInfoData.family_name || userInfoData.name?.split(' ').slice(1).join(' ') || '',
                        email: userInfoData.email || '',
                        phone: '',
                        address1: '',
                        address2: '',
                        city: '',
                        state: '',
                        zip: '',
                      },
                      isGoogleAuth: true,
                      googleUserData: {
                        email: userInfoData.email,
                        user_metadata: {
                          full_name: userInfoData.name,
                          given_name: userInfoData.given_name,
                          family_name: userInfoData.family_name,
                          avatar_url: userInfoData.picture
                        }
                      }
                    });
                    return;
                  }
                } else {
                  console.log('❌ Failed to get user info from Google API');
                  // Fallback to PersonalInfoScreen
                  navigation.replace('PersonalInfo', { 
                    userInfo: {
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      address1: '',
                      address2: '',
                      city: '',
                      state: '',
                      zip: '',
                    },
                    isGoogleAuth: true
                  });
                }
              } else {
                console.log('❌ No provider token found, fallback to PersonalInfoScreen');
                navigation.replace('PersonalInfo', { 
                  userInfo: {
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    address1: '',
                    address2: '',
                    city: '',
                    state: '',
                    zip: '',
                  },
                  isGoogleAuth: true
                });
              }
            } catch (error) {
              console.error('❌ Error extracting user info:', error);
              // Fallback to PersonalInfoScreen
              navigation.replace('PersonalInfo', { 
                userInfo: {
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  address1: '',
                  address2: '',
                  city: '',
                  state: '',
                  zip: '',
                },
                isGoogleAuth: true
              });
            }
          }
        } else {
          console.log('❌ No access token in URL');
          Alert.alert('Error', 'Authentication failed. Please try again.');
        }
      } else {
        console.log('❌ Google sign-in failed:', result.type);
        Alert.alert('Error', 'Google sign-in failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      Alert.alert('Error', 'An error occurred during sign-in.');
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
      if (event === 'SIGNED_IN' && session?.user) {
        const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'there';
        navigation.replace('Welcomepage', { name: fullName });
      }
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
            value={phone}
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
    fontSize: 41
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
