import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../screens/supabaseClient';

WebBrowser.maybeCompleteAuthSession();

export function useAppleAuth() {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    try {
      const redirectTo = 'com.anonymous.jerroddd://'; // <-- same as in Google & FB
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo },
      });

      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        console.log('Apple Auth WebBrowser result:', result);
        return result;
      }
    } catch (err) {
      console.error('Apple sign-in error:', err);
      return { type: 'error', error: err };
    } finally {
      setLoading(false);
    }
  };

  return { signIn, loading };
}