import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nfkykasruwdzpcjuufdu.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ma3lrYXNydXdkenBjanV1ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTU5OTcsImV4cCI6MjA2NTc3MTk5N30._-SBo_yqk0ABeXNHYGsKjBn2HwrFP-QCjCkJn2KqtOw';

console.log('🔄 Supabase URL:', supabaseUrl ? 'Set' : 'NOT SET');
console.log('🔄 Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'NOT SET');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
 auth: {
   storage: AsyncStorage,
   autoRefreshToken: true,
   persistSession: true,
   detectSessionInUrl: false,
 },
});