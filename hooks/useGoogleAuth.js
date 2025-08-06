import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const redirectTo = "com.anonymous.jerroddd://"; // match app.json + Supabase OAuth settings
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        console.log('Google Auth result:', result);

        if (result.type !== 'success') {
          console.log('User cancelled Google login');
        }
      }
    } catch (err) {
      console.error('Google sign-in error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return { signIn, loading };
}