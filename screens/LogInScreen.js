import React, { useState, useEffect } from 'react';
import {
 View, Text, StyleSheet, TextInput, TouchableOpacity,
 Pressable, SafeAreaView, StatusBar, KeyboardAvoidingView,
 Platform, ScrollView, Image, Alert
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useFacebookAuth } from '../hooks/useFacebookAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';

WebBrowser.maybeCompleteAuthSession();

const upsertProfile = async (session) => {
 if (!session?.user) return;

 const { id, email, user_metadata } = session.user;
 const name = user_metadata?.full_name || '';
 const avatar_url = user_metadata?.avatar_url || '';

 const { error } = await supabase
 .from('profiles')
 .upsert({
 id,
 email,
 name,
 avatar_url,
 });

 if (error) console.error('Profile upsert error:', error);
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
 const handleContinue = () => navigation.navigate('Welcomepage');
 const handlePasswordLogin = () => navigation.navigate('PasswordLogin');

 const handleAppleSignIn = async () => {
 try {
 const { data, error } = await supabase.auth.signInWithOAuth({
 provider: 'apple',
 options: { redirectTo: 'com.anonymous.jerroddd://' },
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
 await upsertProfile(session); // <-- ensures profile is stored
 const firstName = session.user.user_metadata?.full_name?.split(' ')[0] || 'there';
 navigation.replace('Welcomepage', { name: firstName });
 }
 }, 1000);
 } catch (err) {
 console.error('Apple sign-in error:', err);
 Alert.alert('Error', 'Apple sign-in failed. Please try again.');
 }
};



 const handleFacebookSignIn = async () => {
 try {
 const { data, error } = await supabase.auth.signInWithOAuth({
 provider: 'facebook',
 options: { redirectTo: 'com.anonymous.jerroddd://' },
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
 const firstName = session.user.user_metadata?.full_name?.split(' ')[0] || 'there';
 navigation.replace('Welcomepage', { name: firstName });
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
 onPress={signInGoogle}
 disabled={googleLoading}
 >
 <Image
 source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/googleicon.png' }}
 style={styles.providerLogo}
 resizeMode="contain"
 />
 </TouchableOpacity>

 {/* Facebook */}
 <TouchableOpacity
 style={[styles.providerButton, facebookLoading && { opacity: 0.7 }]}
 onPress={handleFacebookSignIn}
 disabled={facebookLoading}
 >
 <Image
 source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/facebookicon.png' }}
 style={styles.providerLogo}
 resizeMode="contain"
 />
 </TouchableOpacity>
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
 safeArea: { flex: 1, backgroundColor: 'white' },
 container: { flexGrow: 1, padding: 24, backgroundColor: 'white', justifyContent: 'flex-start' },
 header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 66 },
 backArrow: { fontSize: 24, color: '#000' },
 headerTitle: { fontSize: 16, color: '#000' },
 input: { borderBottomWidth: 1, borderBottomColor: '#222', paddingVertical: 12, marginBottom: 8, fontSize: 41 },
 subText: { fontSize: 12, color: '#000', marginBottom: 24 },
 button: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000', paddingVertical: 16, borderRadius: 50, alignItems: 'center', marginTop: 10, marginBottom: 22, elevation: 6 },
 buttonText: { fontSize: 16, fontWeight: '600', color: '#000' },
 socialLabel: { fontSize: 14, marginBottom: 16, color: '#000' },
 passwordButton: { backgroundColor: '#fff', borderWidth: 1, width: '100%', borderColor: '#000', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 50, marginBottom: 20, elevation: 3, alignItems: 'center' },
 passwordButtonText: { textAlign: 'center', fontSize: 16, fontWeight: '450', color: '#000' },
 providerRow: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%' },
 providerButton: { width: 90, height: 60, borderRadius: 30, borderWidth: 1, borderColor: '#000', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10, elevation: 4 },
 providerLogo: { width: 24, height: 24 },
 socialBox: { borderWidth: 1, borderColor: '#000', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, marginBottom: 24, backgroundColor: '#fff', alignItems: 'center' },
 signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
 bottomText: { textAlign: 'center', fontSize: 14, color: '#000' },
 link: { textDecorationLine: 'underline', fontWeight: 'bold', color: '#000' },
});