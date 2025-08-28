// hooks/useGoogleAuth.js
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../screens/supabaseClient';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);

  // Create redirect URI for Expo Go compatibility
  const redirectTo = 'com.anonymous.jerrod://';

  const signIn = async () => {
    if (loading) return;
    setLoading(true);

    try {
      console.log('🔄 Starting Supabase Google OAuth...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🔗 Redirect URL:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
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
        console.log('🔗 OAuth URL:', data.url);
        console.log('🎯 Expected redirect:', 'com.anonymous.jerrod://');

        let result;
        
        if (Platform.OS === 'android') {
          console.log('📱 Android detected - using WebBrowser...');
          
          try {
            await WebBrowser.warmUpAsync();
            console.log('📱 WebBrowser warm-up completed');
          } catch (warmUpError) {
            console.log('📱 WebBrowser warm-up failed:', warmUpError.message);
          }

          // Add timeout handling for Android
          result = await Promise.race([
            WebBrowser.openAuthSessionAsync(data.url, redirectTo),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Sign-in timeout')), 105000) // 105 second timeout (60 + 45)
            )
          ]);
        } else {
          console.log('📱 iOS detected - using WebBrowser...');
          // Add timeout handling for iOS
          result = await Promise.race([
            WebBrowser.openAuthSessionAsync(data.url, redirectTo),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Sign-in timeout')), 105000) // 105 second timeout (60 + 45)
            )
          ]);
        }

        console.log('📱 OAuth result:', result);
        console.log('📱 Result type:', result.type);
        console.log('📱 Result URL:', result.url);

        if (result.type === 'success') {
          console.log('✅ OAuth flow completed successfully');
          
          // Extract the authorization code from the redirect URL
          const redirectUrl = result.url;
          console.log('🔗 Redirect URL received:', redirectUrl);
          
          if (redirectUrl && redirectUrl.includes('code=')) {
            console.log('🔑 Authorization code found in redirect URL');
            
            // Let Supabase handle the code exchange automatically
            // The session should be established now
            console.log('🔄 Waiting for Supabase to establish session...');
            
            // Wait a bit for the session to be established
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check for session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionData?.session) {
              console.log('✅ Session established successfully');
              console.log('🔑 User email:', sessionData.session.user?.email);
              
              return { 
                type: 'success', 
                url: redirectUrl,
                session: sessionData.session  // FIX: Return sessionData.session directly, not wrapped
              };
            } else {
              console.log('❌ Session not established, trying to exchange code manually...');
              
              // Try to manually exchange the code
              try {
                const code = new URL(redirectUrl).searchParams.get('code');
                if (code) {
                  console.log('🔑 Attempting manual code exchange with code:', code);
                  
                  // Use the exchangeCodeForSession method
                  const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                  
                  if (exchangeError) {
                    console.error('❌ Code exchange error:', exchangeError);
                    throw exchangeError;
                  }
                  
                  if (exchangeData?.session) {
                    console.log('✅ Manual code exchange successful');
                    return { 
                      type: 'success', 
                      url: redirectUrl,
                      session: exchangeData.session  // FIX: Return exchangeData.session directly, not wrapped
                    };
                  }
                }
              } catch (exchangeErr) {
                console.error('❌ Manual code exchange failed:', exchangeErr);
              }
              
              // If we get here, the code exchange failed
              return { 
                type: 'error', 
                message: 'OAuth completed but session establishment failed. Please try again.'
              };
            }
          } else {
            console.log('❌ No authorization code found in redirect URL');
            return { 
              type: 'error', 
              message: 'OAuth completed but no authorization code received.'
            };
          }
        } else if (result.type === 'cancel') {
          console.log('⚠️ OAuth flow was cancelled by user');
          return { type: 'error', message: 'Sign-in was cancelled' };
        } else if (result.type === 'dismiss') {
          console.log('⚠️ OAuth flow was dismissed');
          return { type: 'error', message: 'Sign-in was dismissed' };
        } else {
          console.log('❌ OAuth flow failed or incomplete');
          return { type: 'error', message: 'OAuth flow failed. Please try again.' };
        }
      } else {
        console.log('❌ No OAuth URL received from Supabase');
        return { type: 'error', message: 'No OAuth URL received' };
      }
    } catch (err) {
      console.error('❌ Google sign-in error:', err.message);
      console.error('❌ Error stack:', err.stack);
      
      let userMessage = 'Google sign-in failed. Please try again.';
      
      if (err.message?.includes('network')) {
        userMessage = 'Network error. Please check your internet connection.';
      } else if (err.message?.includes('cancelled')) {
        userMessage = 'Sign-in was cancelled.';
      } else if (err.message?.includes('timeout')) {
        userMessage = 'Sign-in timed out. Please try again.';
      } else if (err.message?.includes('Sign-in timeout')) {
        userMessage = 'Sign-in is taking too long. Please check your internet connection and try again.';
      }
      
      return { type: 'error', message: userMessage, originalError: err };
    } finally {
      setLoading(false);
    }
  };

  return { signIn, loading };
}
