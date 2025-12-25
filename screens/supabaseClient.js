import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nfkykasruwdzpcjuufdu.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ma3lrYXNydXdkenBjanV1ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTU5OTcsImV4cCI6MjA2NTc3MTk5N30._-SBo_yqk0ABeXNHYGsKjBn2HwrFP-QCjCkJn2KqtOw';

console.log('🔄 Supabase URL:', supabaseUrl ? 'Set' : 'NOT SET');
console.log('🔄 Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'NOT SET');
console.log('🔄 Supabase URL value:', supabaseUrl);
console.log('🔄 Supabase Key length:', supabaseAnonKey?.length);

// Create a proper storage adapter for Supabase v2
const storageAdapter = {
  getItem: async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      console.log('📦 Storage getItem:', key, value ? 'Found' : 'Not found');
      return value;
    } catch (error) {
      console.error('❌ Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
      console.log('📦 Storage setItem:', key, 'saved successfully');
    } catch (error) {
      console.error('❌ Storage setItem error:', error);
      throw error;
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      console.log('📦 Storage removeItem:', key, 'removed successfully');
    } catch (error) {
      console.error('❌ Storage removeItem error:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
 auth: {
   storage: storageAdapter,
   autoRefreshToken: true,
   persistSession: true,
   detectSessionInUrl: true, // Enable to allow Supabase to auto-detect and exchange codes
   flowType: 'pkce', // Use PKCE flow for better security and compatibility
   debug: __DEV__, // Enable debug mode in development
   storageKey: 'sb-auth-token', // Explicit storage key
 },
});

console.log('🔄 Supabase client created successfully');
console.log('🔄 Supabase client URL:', supabase.supabaseUrl);
console.log('🔄 Supabase client key length:', supabase.supabaseKey?.length);

// Test AsyncStorage access on startup
AsyncStorage.getItem('sb-auth-token').then(token => {
  console.log('🔄 Existing auth token in AsyncStorage:', token ? 'Found' : 'None');
}).catch(error => {
  console.log('⚠️ Error checking AsyncStorage:', error);
});