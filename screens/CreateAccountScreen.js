import React, { useState, useEffect } from 'react';
import {
 View, Text, StyleSheet, TextInput, TouchableOpacity,
 Pressable, SafeAreaView, StatusBar, KeyboardAvoidingView,
 Platform, ScrollView, Image, Alert
} from 'react-native';
import { supabase } from '../supabase';
import * as WebBrowser from 'expo-web-browser';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useFacebookAuth } from '../hooks/useFacebookAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';

WebBrowser.maybeCompleteAuthSession();

export default function CreateAccountScreen({ navigation }) {
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
  // Skip phone number for now and pass dummy value
  const dummyPhone = '+11234567890';

  navigation.navigate('CreatePassword', {
    phone: dummyPhone,
  });
};

 // Will uncomment this bloc after twilio verification
 {/*
 const handleContinue = async () => {
 if (!phone.trim()) {
 Alert.alert('Error', 'Please enter your phone number');
 return;
 }

 const numericPhone = phone.replace(/\D/g, '');
 const e164Phone = `+1${numericPhone}`;

 try {
 const { error } = await supabase.auth.signInWithOtp({ phone: e164Phone });
 if (error) {
 Alert.alert('Error', error.message);
 } else {
 navigation.navigate('CodeVerify', { phone: e164Phone, type: 'create' });
 }
 } catch (error) {
 Alert.alert('Error', 'Failed to send verification code');
 }
 };
 */}

 const handleGoogleSignUp = async () => {
 const result = await signInGoogle();
 if (result.type === 'success') {
 const { data: sessionData } = await supabase.auth.getSession();
 const session = sessionData.session;
 if (session?.user) {
 const firstName = session.user.user_metadata?.full_name?.split(' ')[0] || 'there';
 await supabase.from('profiles').upsert({
 id: session.user.id,
 email: session.user.email,
 name: session.user.user_metadata.full_name,
 avatar_url: session.user.user_metadata.avatar_url,
 });
 navigation.replace('Welcomepage', { name: firstName });
 }
 }
 };

 const handleFacebookSignUp = async () => {
 const result = await signInFacebook();
 if (result.type === 'success') {
 const { data: sessionData } = await supabase.auth.getSession();
 const session = sessionData.session;
 if (session?.user) {
 const firstName = session.user.user_metadata?.full_name?.split(' ')[0] || 'there';
 await supabase.from('profiles').upsert({
 id: session.user.id,
 email: session.user.email,
 name: session.user.user_metadata.full_name,
 avatar_url: session.user.user_metadata.avatar_url,
 });
 navigation.replace('Welcomepage', { name: firstName });
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
 }
 } catch (err) {
 console.error('Apple sign-in unexpected error:', err);
 Alert.alert('Error', 'Apple sign-in failed. Please try again.');
 }
};


 useEffect(() => {
 const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
 console.log('Auth state changed:', event, session?.user?.email);
 if (event === 'SIGNED_IN' && session?.user) {
 const firstName = session.user.user_metadata?.full_name?.split(' ')[0] || 'there';
 navigation.replace('Welcomepage', { name: firstName });
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
 <Text style={styles.headerTitle}>SIGN UP</Text>
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

 <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
 <Text style={styles.continueText}>Continue</Text>
 </TouchableOpacity>

 <View style={styles.socialBox}>
 <Text style={styles.socialLabel}>or sign up with</Text>
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
 />
 </TouchableOpacity>

 {/* Google */}
 <TouchableOpacity
 style={[styles.providerButton, googleLoading && { opacity: 0.7 }]}
 onPress={handleGoogleSignUp}
 disabled={googleLoading}
 >
 <Image
 source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/googleicon.png' }}
 style={styles.providerLogo}
 />
 </TouchableOpacity>

 {/* Facebook */}
 <TouchableOpacity
 style={[styles.providerButton, facebookLoading && { opacity: 0.7 }]}
 onPress={handleFacebookSignUp}
 disabled={facebookLoading}
 >
 <Image
 source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/facebookicon.png' }}
 style={styles.providerLogo}
 />
 </TouchableOpacity>
 </View>
 </View>

 <View style={styles.signUpRow}>
 <Text style={styles.bottomText}>Already have an account? </Text>
 <TouchableOpacity onPress={() => navigation.navigate('Login')}>
 <Text style={[styles.bottomText, styles.link]}>Login</Text>
 </TouchableOpacity>
 </View>
 </ScrollView>
 </KeyboardAvoidingView>
 </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 safeArea: { flex: 1, backgroundColor: '#fff' },
 container: { flexGrow: 1, padding: 24, backgroundColor: '#fff' },
 header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 66 },
 backArrow: { fontSize: 24, color: '#000' },
 headerTitle: { fontSize: 16, color: '#000', fontWeight: '600' },
 input: { borderBottomWidth: 1, borderBottomColor: '#000', fontSize: 41, paddingVertical: 12, marginBottom: 8 },
 subText: { fontSize: 12, color: '#000', marginBottom: 45 },
 continueButton: {
 backgroundColor: '#fff',
 borderWidth: 1,
 borderColor: '#000',
 paddingVertical: 16,
 borderRadius: 50,
 alignItems: 'center',
 marginBottom: 30,
 elevation: 6,
 },
 continueText: { fontSize: 16, fontWeight: '600', color: '#000' },
 socialBox: {
 borderWidth: 1,
 borderColor: '#000',
 borderRadius: 16,
 paddingVertical: 16,
 alignItems: 'center',
 marginBottom: 24,
 },
 socialLabel: { fontSize: 16.8, marginBottom: 24, color: '#000' },
 providerRow: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%' },
 providerButton: {
 width: 90,
 height: 60,
 borderRadius: 30,
 borderWidth: 1,
 borderColor: '#000',
 justifyContent: 'center',
 alignItems: 'center',
 marginHorizontal: 10,
 backgroundColor: '#fff',
 elevation: 4,
 },
 providerLogo: { width: 24, height: 24 },
 signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
 bottomText: { fontSize: 14, color: '#000' },
 link: { textDecorationLine: 'underline', fontWeight: 'bold' },
});