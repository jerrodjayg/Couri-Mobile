import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../screens/supabaseClient';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
 const [loading, setLoading] = useState(false);

 const signIn = async () => {
 if (loading) return;
 setLoading(true);

 try {
 console.log('🔄 Starting Supabase Google OAuth...');
 
 const { data, error } = await supabase.auth.signInWithOAuth({
 provider: 'google',
 options: {
 redirectTo: 'com.anonymous.jerroddd://',
 scopes: 'email profile',
 queryParams: {
 access_type: 'offline',
 prompt: 'consent',
 },
 },
 });

 if (error) {
 console.error('❌ OAuth error:', error);
 throw error;
 }

 if (data?.url) {
 console.log('🌐 Opening OAuth URL...');
 const result = await WebBrowser.openAuthSessionAsync(data.url, 'com.anonymous.jerroddd://');
 console.log('📱 OAuth result:', result);
 return result;
 }

 return { type: 'error', message: 'No OAuth URL received' };
 } catch (err) {
 console.error('❌ Google sign-in error:', err.message);
 return { type: 'error', message: err.message };
 } finally {
 setLoading(false);
 }
 };

 return { signIn, loading };
}