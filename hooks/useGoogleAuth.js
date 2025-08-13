// hooks/useGoogleAuth.js
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Platform, Linking } from 'react-native';
import { supabase } from '../screens/supabaseClient';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);

  // Alternative Android sign-in method
  const signInAndroid = async (authUrl) => {
    console.log('📱 Using alternative Android sign-in method...');

    try {
      // Try to use Linking to open the URL directly
      const supported = await Linking.canOpenURL(authUrl);
      if (supported) {
        console.log('📱 Opening auth URL with Linking...');
        await Linking.openURL(authUrl);

        // Wait and check for session
        await new Promise(resolve => setTimeout(resolve, 5000));

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('📱 Session check after Linking:', sessionData);

        if (sessionData?.session) {
          console.log('✅ Session found after Linking - auth succeeded!');
          return { type: 'success', url: 'com.anonymous.jerrod://auth-success' };
        }
      }

      return { type: 'error', message: 'Alternative Android method failed' };
    } catch (error) {
      console.log('📱 Alternative Android method error:', error);
      return { type: 'error', message: error.message };
    }
  };

  const signIn = async () => {
    if (loading) return;
    setLoading(true);

    try {
      console.log('🔄 Starting Supabase Google OAuth...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🔗 Redirect URL:', 'com.anonymous.jerrod://');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.anonymous.jerrod://',
          scopes: 'email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (data?.url) {
        console.log('🌐 Opening OAuth URL...');
        console.log('🔗 OAuth URL:', data.url);
        console.log('🎯 Expected redirect:', 'com.anonymous.jerrod://');

        console.log('📱 About to open WebBrowser...');

        // For Android, add timeout and better error handling
        let result;
        if (Platform.OS === 'android') {
          console.log('📱 Android detected - using timeout approach...');
          console.log('📱 WebBrowser package available:', !!WebBrowser);
          console.log('📱 WebBrowser methods:', Object.keys(WebBrowser));

          // Try to warm up WebBrowser for Android
          try {
            console.log('📱 Warming up WebBrowser...');
            await WebBrowser.warmUpAsync();
            console.log('📱 WebBrowser warm-up completed');
          } catch (warmUpError) {
            console.log('📱 WebBrowser warm-up failed:', warmUpError.message);
          }

          // Check Custom Tabs support
          try {
            console.log('📱 Checking Custom Tabs support...');
            const customTabs = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
            console.log('📱 Custom Tabs browsers:', customTabs);
          } catch (customTabsError) {
            console.log('📱 Custom Tabs check failed:', customTabsError.message);
          }

          try {
            console.log('📱 Skipping problematic openAuthSessionAsync, using direct browser...');

            // Use openBrowserAsync directly instead of openAuthSessionAsync
            console.log('📱 Opening browser directly...');
            await WebBrowser.openBrowserAsync(data.url);
            console.log('📱 Browser opened successfully');

            // Wait for user to complete auth and return to app
            console.log('📱 Waiting for auth completion...');

            // OPTIMIZATION: Faster session detection (5 seconds instead of 20)
            let sessionFound = false;
            for (let i = 0; i < 10; i++) { // Check 10 times over 10 seconds
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5 seconds between checks

              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              console.log(`📱 Session check ${i + 1}/10:`, sessionData ? 'Session found' : 'No session');

              if (sessionData?.session) {
                console.log('✅ Session found after browser - auth succeeded!');
                result = { type: 'success', url: 'com.anonymous.jerrod://auth-success' };
                sessionFound = true;
                break;
              }
            }

            if (!sessionFound) {
              console.log('❌ No session found after 10 seconds');
              result = { type: 'error', message: 'Authentication incomplete - please complete sign-in in browser' };
            }
          } catch (browserError) {
            console.log('📱 Direct browser failed:', browserError.message);

            console.log('📱 Trying alternative method using Linking...');

            // Try alternative Android method using Linking
            const alternativeResult = await signInAndroid(data.url);
            if (alternativeResult.type === 'success') {
              return alternativeResult;
            }

            return { type: 'error', message: 'All Android methods failed. Please try again.' };
          }
        } else {
          // iOS - use normal approach
          result = await WebBrowser.openAuthSessionAsync(data.url, 'com.anonymous.jerrod://');
        }

        console.log('📱 OAuth result:', result);
        console.log('📱 Result type:', result.type);
        console.log('📱 Result URL:', result.url);

        // Check if the result indicates success
        if (result.type === 'success' && result.url) {
          console.log('✅ OAuth flow completed successfully');
          return result;
        } else if (result.type === 'cancel') {
          console.log('⚠️ OAuth flow was cancelled by user');
          return { type: 'error', message: 'Sign-in was cancelled' };
        } else if (result.type === 'dismiss') {
          console.log('⚠️ OAuth flow was dismissed');
          return { type: 'error', message: 'Sign-in was dismissed' };
        } else {
          console.log('❌ OAuth flow failed or incomplete');
          console.log('📱 Full result object:', JSON.stringify(result, null, 2));

          // For Android, sometimes the result comes later via deep linking
          if (Platform.OS === 'android') {
            console.log('📱 Android detected - checking for delayed deep link...');
            console.log('📱 Waiting for potential deep link response...');

            // Wait longer for Android deep linking
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Try to get the current session to see if auth succeeded
            try {
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              console.log('📱 Session check after delay:', sessionData);
              if (sessionData?.session) {
                console.log('✅ Session found after delay - auth succeeded!');
                return { type: 'success', url: 'com.anonymous.jerrod://auth-success' };
              }
            } catch (sessionErr) {
              console.log('📱 Session check error:', sessionErr);
            }
          }

          return { type: 'error', message: 'OAuth flow failed. Please try again.' };
        }
      }

      console.log('❌ No OAuth URL received from Supabase');
      return { type: 'error', message: 'No OAuth URL received' };
    } catch (err) {
      console.error('❌ Google sign-in error:', err.message);
      console.error('❌ Error stack:', err.stack);
      console.error('❌ Full error object:', JSON.stringify(err, null, 2));

      // Provide specific error messages for common issues
      let userMessage = 'Google sign-in failed. Please try again.';

      if (err.message?.includes('network')) {
        userMessage = 'Network error. Please check your internet connection.';
      } else if (err.message?.includes('cancelled')) {
        userMessage = 'Sign-in was cancelled.';
      } else if (err.message?.includes('timeout')) {
        userMessage = 'Sign-in timed out. Please try again.';
      }

      return { type: 'error', message: userMessage, originalError: err };
    } finally {
      setLoading(false);
    }
  };

  return { signIn, loading };
}
