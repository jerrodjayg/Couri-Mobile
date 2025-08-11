import React, { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../screens/supabaseClient';

// Required for Expo AuthSession to complete sessions properly
WebBrowser.maybeCompleteAuthSession();

export function useFacebookAuth() {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    try {
      setLoading(true);

      const redirectTo = "com.anonymous.jerroddd://"; // Match your app deep link
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo },
      });

      if (error) {
        console.error("Supabase Facebook Auth Error:", error.message);
        return { type: 'error', error };
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        console.log("Facebook Auth WebBrowser result:", result);
        return { type: 'success', result };
      }

      return { type: 'error', error: new Error("No auth URL returned") };
    } catch (err) {
      console.error("Facebook sign-in failed:", err);
      return { type: 'error', error: err };
    } finally {
      setLoading(false);
    }
  };

  return { signIn, loading };
}
