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
            
            // Check for session with timeout
            const sessionPromise = supabase.auth.getSession();
            const sessionTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session check timeout')), 5000)
            );
            
            try {
              const { data: sessionData, error: sessionError } = await Promise.race([
                sessionPromise,
                sessionTimeoutPromise
              ]);
              
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
              }
            } catch (sessionErr) {
              console.log('❌ Session check failed or timed out:', sessionErr);
              console.log('🔄 Proceeding to manual code exchange...');
            }
          } else {
            console.log('❌ No authorization code found in redirect URL');
            return { 
              type: 'error', 
              message: 'OAuth completed but no authorization code received.'
            };
          }
          
          // Try to manually exchange the code if session check failed
          if (redirectUrl) {
            try {
              console.log('🔍 useGoogleAuth DEBUG - Attempting manual code exchange...');
              console.log('🔍 useGoogleAuth DEBUG - Redirect URL for parsing:', redirectUrl);
              
              const url = new URL(redirectUrl);
              const code = url.searchParams.get('code');
              
              console.log('🔍 useGoogleAuth DEBUG - Parsed code from URL:', code ? 'EXISTS' : 'NULL');
              console.log('🔍 useGoogleAuth DEBUG - Code length:', code?.length || 0);
              
              if (code) {
                console.log('🔑 Attempting manual code exchange with code:', code.substring(0, 10) + '...');
                console.log('🔍 useGoogleAuth DEBUG - Creating exchange promise...');
                
                // Add timeout to prevent hanging - increased to 15 seconds
                const exchangePromise = supabase.auth.exchangeCodeForSession(code);
                console.log('🔍 useGoogleAuth DEBUG - Exchange promise created');
                
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => {
                    console.log('🔍 useGoogleAuth DEBUG - Exchange timeout reached (15 seconds)');
                    reject(new Error('Code exchange timeout'));
                  }, 15000)
                );
                
                console.log('🔍 useGoogleAuth DEBUG - Racing exchange promise with timeout...');
                const { data: exchangeData, error: exchangeError } = await Promise.race([
                  exchangePromise,
                  timeoutPromise
                ]);
                
                console.log('🔍 useGoogleAuth DEBUG - Exchange completed');
                console.log('🔍 useGoogleAuth DEBUG - Exchange error:', exchangeError);
                console.log('🔍 useGoogleAuth DEBUG - Exchange data:', exchangeData);
                
                if (exchangeError) {
                  console.error('❌ Code exchange error:', exchangeError);
                  console.error('🔍 useGoogleAuth DEBUG - Error message:', exchangeError.message);
                  console.error('🔍 useGoogleAuth DEBUG - Error status:', exchangeError.status);
                  throw exchangeError;
                }
                
                if (exchangeData?.session) {
                  console.log('✅ Manual code exchange successful');
                  console.log('🔍 useGoogleAuth DEBUG - Session user email:', exchangeData.session.user?.email);
                  return { 
                    type: 'success', 
                    url: redirectUrl,
                    session: exchangeData.session
                  };
                } else {
                  console.log('🔍 useGoogleAuth DEBUG - Exchange succeeded but no session data');
                  console.log('🔍 useGoogleAuth DEBUG - Exchange data keys:', Object.keys(exchangeData || {}));
                }
              } else {
                console.log('🔍 useGoogleAuth DEBUG - No code found in URL');
              }
            } catch (exchangeErr) {
              console.error('❌ Manual code exchange failed:', exchangeErr);
              console.error('🔍 useGoogleAuth DEBUG - Exchange error type:', typeof exchangeErr);
              console.error('🔍 useGoogleAuth DEBUG - Exchange error message:', exchangeErr.message);
              console.error('🔍 useGoogleAuth DEBUG - Exchange error stack:', exchangeErr.stack);
              
              // If code exchange fails, still return success with the redirect URL
              // The LogInScreen will handle the session check
              console.log('🔄 Code exchange failed, returning success to let LogInScreen handle session');
              return { 
                type: 'success', 
                url: redirectUrl,
                message: 'OAuth completed, session will be established by app'
              };
            }
          } else {
            console.log('🔍 useGoogleAuth DEBUG - No redirect URL found in result');
          }
          
          // If we get here, the code exchange failed
          return { 
            type: 'error', 
            message: 'OAuth completed but session establishment failed. Please try again.'
          };
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
