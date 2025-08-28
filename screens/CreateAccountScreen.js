import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
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

export default function CreateAccountScreen({ navigation }) {
  console.log('🔍 CreateAccountScreen DEBUG - Component mounting');
  console.log('🔍 CreateAccountScreen DEBUG - Navigation prop:', navigation);
  console.log('🔍 CreateAccountScreen DEBUG - Available routes:', navigation?.getState()?.routes?.map(r => r.name));
  
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHandlingGoogleSignIn, setIsHandlingGoogleSignIn] = useState(false);
  const { signIn: signInGoogle, loading: googleLoading } = useGoogleAuth();
  const { signIn: signInFacebook, loading: facebookLoading } = useFacebookAuth();
  const { signIn: signInApple, loading: appleLoading } = useAppleAuth();

   // Add debugging useEffect
  useEffect(() => {
    console.log('🔍 CreateAccountScreen DEBUG - Component mounted successfully');
    console.log('🔍 CreateAccountScreen DEBUG - Navigation state:', navigation.getState()?.routes?.map(r => r.name));
    
    // Check if we can navigate back
    const canGoBack = navigation.canGoBack();
    console.log('🔍 CreateAccountScreen DEBUG - Can go back:', canGoBack);
    
    return () => {
      console.log('🔍 CreateAccountScreen DEBUG - Component unmounting');
      setIsHandlingGoogleSignIn(false);
    };
  }, [navigation]);

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return text;
    if (match[2]) return `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
    return match[1];
  };

 const handlePhoneChange = (text) => setPhone(formatPhoneNumber(text));

  const handleContinue = async () => {
 if (!phone || phone.trim().length === 0) {
 Alert.alert('Error', 'Please enter your mobile number');
 return;
 }
 if (phone.length < 10) {
 Alert.alert('Error', 'Please enter a valid phone number');
 return;
 }
 
 // Navigate to PersonalInfoScreen with the phone number
 navigation.navigate('PersonalInfo', { 
 phone: phone,
 userInfo: {
 firstName: '',
 lastName: '',
 email: '',
 phone: phone,
 address1: '',
 address2: '',
 city: '',
 state: '',
 zip: ''
 }
 });
 };

const handleGoogleSignIn = async () => {
  console.log('🔄 handleGoogleSignIn function called');
  console.log('🔍 CreateAccountScreen DEBUG - Starting Google sign-in flow');
  setLoading(true);
  setIsHandlingGoogleSignIn(true);
  
  // Add timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Google sign-in timeout after 105 seconds')), 105000);
  });
  
  try {
    console.log('🔄 Starting Google sign-in...');
    
    // Race between the actual sign-in and the timeout
    const result = await Promise.race([
      signInGoogle(),
      timeoutPromise
    ]);
    
    console.log('📱 Google sign-in result:', result);
    console.log('🔍 CreateAccountScreen DEBUG - Google sign-in result type:', result.type);
    console.log('🔍 CreateAccountScreen DEBUG - Google sign-in result URL:', result.url);

    if (result.type === 'success') {
      console.log('✅ Google sign-in successful');
      
      // Try to get user data from the result
      let userData = null;
      
      if (result.session?.user) {
        userData = result.session.user;
      } else if (result.data?.session?.user) {
        userData = result.data.session.user;
      } else if (result.user) {
        userData = result.user;
      }
      
      if (userData) {
        console.log('✅ User data found:', userData.email);
        
        // Try to save user data to database (non-blocking)
        try {
          await UserService.saveGoogleAuthUser(userData, {
            email: userData.email,
            firstName: userData.user_metadata?.first_name || userData.user_metadata?.name?.split(' ')[0] || '',
            lastName: userData.user_metadata?.last_name || userData.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
          }); 
          console.log('✅ User data saved to database successfully');
        } catch (dbError) {
          console.error('❌ Failed to save user to database:', dbError);
          console.log('⚠️ Continuing with navigation despite database error...');
        }
        
        // Navigate to PersonalInfoScreen
        navigation.replace('PersonalInfo', {
          phone: '',
          userInfo: {
            firstName: userData.user_metadata?.full_name?.split(' ')[0] || userData.user_metadata?.name?.split(' ')[0] || '',
            lastName: userData.user_metadata?.full_name?.split(' ').slice(1).join(' ') || userData.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            email: userData.email || '',
            phone: '',
            address1: '',
            address2: '',
            city: '',
            state: '',
            zip: ''
          },
          isGoogleAuth: true,
          googleUserData: userData,
          isGoogleSignUp: true
        });
        return;
      }
      
      // If no user data in result, try to get from Supabase session
      console.log('🔄 No user data in result, checking Supabase session...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('✅ Session found in Supabase:', session.user.email);
          
          // Try to save user data to database (non-blocking)
          try {
            await UserService.saveGoogleAuthUser(session.user, {
              email: session.user.email,
              firstName: session.user.user_metadata?.first_name || session.user.user_metadata?.name?.split(' ')[0] || '',
              lastName: session.user.user_metadata?.last_name || session.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            });
            console.log('✅ User data saved to database successfully');
          } catch (dbError) {
            console.error('❌ Failed to save user to database:', dbError);
            console.log('⚠️ Continuing with navigation despite database error...');
          }
          
          // Navigate to PersonalInfoScreen
          navigation.replace('PersonalInfo', {
            phone: '',
            userInfo: {
              firstName: session.user.user_metadata?.full_name?.split(' ')[0] || session.user.user_metadata?.name?.split(' ')[0] || '',
              lastName: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || session.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
              email: session.user.email || '',
              phone: '',
              address1: '',
              address2: '',
              city: '',
              state: '',
              zip: ''
            },
            isGoogleAuth: true,
            googleUserData: session.user,
            isGoogleSignUp: true
          });
          return;
        }
      } catch (sessionError) {
        console.error('❌ Error checking Supabase session:', sessionError);
      }
      
      // If we get here, we couldn't find any user data
      console.log('❌ No user data found in any location');
      Alert.alert('Error', 'Google sign-in completed but no user data was found. Please try again.');
      
    } else if (result.type === 'error') {
      console.log('❌ Google sign-in failed with error type');
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    } else {
      console.log('❌ Google sign-in failed with unknown type:', result.type);
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    }
    
  } catch (error) {
    console.error('❌ Google sign-in error:', error);
    
            if (error.message === 'Google sign-in timeout after 105 seconds') {
      Alert.alert(
        'Sign-in Timeout',
        'Google sign-in is taking too long. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    }
  } finally {
    setLoading(false);
    setIsHandlingGoogleSignIn(false);
  }
};

 const handleFacebookSignUp = async () => {
 const result = await signInFacebook();
 if (result.type === 'success') {
 const { data: sessionData } = await supabase.auth.getSession();
 const session = sessionData.session;
 if (session?.user) {
 const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'there';
 await supabase.from('profiles').upsert({
 id: session.user.id,
 email: session.user.email,
 name: session.user.user_metadata.full_name,
 avatar_url: session.user.user_metadata.avatar_url,
 });
 // ✅ Navigate to PersonalInfoScreen (first screen in the sequence) for Facebook auth users too
 navigation.replace('PersonalInfo', { 
 userInfo: {
 firstName: fullName?.split(' ')[0] || '',
 lastName: fullName?.split(' ').slice(1).join(' ') || '',
 email: session.user.email || '',
 phone: '', // Will be filled in PersonalInfoScreen
 address1: '',
 address2: '',
 city: '',
 state: '',
 zip: ''
 },
 isGoogleAuth: false,
 googleUserData: session.user,
 // Add flag to indicate this is a social sign-up flow
 isGoogleSignUp: true
 });
 }
 }
 };

 const handleAppleSignUp = async () => {
 try {
 const redirectTo = "com.anonymous.jerroddd://"; // your deep link
 const { data, error } = await supabase.auth.signInWithOAuth({
 provider: 'apple',
 options: {
 redirectTo,
 scopes: 'name email'
 }
 });

 if (error) {
 console.error('Apple sign-in error:', error);
 Alert.alert('Error', error.message);
 return;
 }

 if (data?.url) {
 const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
 console.log('WebBrowser result (Apple):', result);
 
 // ✅ If Apple sign-in is successful, navigate to PersonalInfoScreen
 if (result.type === 'success') {
 // Wait for auth state change to be handled by the useEffect hook
 // The useEffect will automatically navigate to PersonalInfoScreen
 }
 }
 } catch (err) {
 console.error('Apple sign-in unexpected error:', err);
 Alert.alert('Error', 'Apple sign-in failed. Please try again.');
 }
};

 useEffect(() => {
   const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
     console.log('🔄 Auth state changed:', event, session?.user?.email);
     
     // Don't handle navigation if we're already handling Google sign-in manually
     if (isHandlingGoogleSignIn) {
       console.log('🔍 CreateAccountScreen DEBUG - Skipping auth state navigation (handling manually)');
       return;
     }
     
     if (event === 'SIGNED_IN' && session?.user) {
       console.log('✅ User signed in successfully:', session.user.email);
       
       // Extract user info from the session
       const fullName = session.user.user_metadata?.full_name || 
       session.user.user_metadata?.name || 
       'there';
       
       console.log('✅ Extracted user info:', { 
         fullName, 
         email: session.user.email,
         provider: session.user.app_metadata?.provider 
       });
       
       // Navigate to PersonalInfoScreen (first screen in the sequence)
       console.log('✅ Navigating to PersonalInfoScreen...');
       navigation.replace('PersonalInfo', { 
         userInfo: {
           firstName: fullName?.split(' ')[0] || '',
           lastName: fullName?.split(' ').slice(1).join(' ') || '',
           email: session.user.email || '',
           phone: '', // Will be filled in PersonalInfoScreen
           address1: '',
           address2: '',
           city: '',
           state: '',
           zip: ''
         },
         isGoogleAuth: session.user.app_metadata?.provider === 'google',
         googleUserData: session.user,
         // Add flag to indicate this is a Google sign-up flow
         isGoogleSignUp: true
       });
     } else if (event === 'SIGNED_OUT') {
       console.log('🔄 User signed out');
     } else if (event === 'TOKEN_REFRESHED') {
       console.log('🔄 Token refreshed');
     }
   });
   
   return () => listener.subscription.unsubscribe();
 }, [navigation, isHandlingGoogleSignIn]);

   return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />
      

      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()}>
              <Image 
                source={require('../assets/backarrow.png')} 
                style={styles.backArrowImage}
              />
            </Pressable>
            <Text style={styles.headerTitle}>CREATE ACCOUNT</Text>
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
 
 <View style={styles.providerRow}>
 {/* Apple */}
 <TouchableOpacity
 style={[styles.providerButton, appleLoading && { opacity: 0.7 }]}
 onPress={handleAppleSignUp}
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
 onPress={handleFacebookSignUp}
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
 <Text style={styles.bottomText}>Already have an account? </Text>
 <TouchableOpacity onPress={() => navigation.navigate('Login')}>
 <Text style={[styles.bottomText, styles.link]}>Log In</Text>
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
