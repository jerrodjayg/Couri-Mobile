// hooks/useGoogleAuth.js
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../screens/supabaseClient';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);

  // Create redirect URI based on platform
  const redirectTo = Platform.OS === 'web' 
    ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:19006')  // Redirect back to the main app URL
    : 'com.anonymous.jerrod://';

  const signIn = async (retryCount = 0) => {
    console.log('🚀 useGoogleAuth.signIn() called - function entry point');
    console.log('🔍 Current loading state:', loading);
    console.log('🔍 Retry count:', retryCount);
    
    if (loading) {
      console.log('⚠️ Already loading, returning early');
      return;
    }
    
    console.log('✅ Setting loading to true...');
    setLoading(true);
    console.log('✅ Loading state set, proceeding with OAuth...');

    // Add timeout to prevent infinite loading (longer timeout for mobile/Expo Go)
    const timeoutDuration = Platform.OS === 'web' ? 30000 : 90000; // 30s web, 90s mobile/Expo Go
    const timeoutId = setTimeout(() => {
      console.error('❌ Google sign-in timeout - taking too long');
      setLoading(false);
      if (typeof alert !== 'undefined') {
        alert('Google sign-in is taking too long. Please try again.');
      }
    }, timeoutDuration);

    try {
      console.log('🔄 Starting Supabase Google OAuth...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🔗 Redirect URL:', redirectTo);
      console.log('🌐 Current URL:', Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : 'N/A');
      console.log('🌐 Window available:', Platform.OS === 'web' && typeof window !== 'undefined');

      // Test network connectivity first
      console.log('🌐 Testing network connectivity...');
      try {
        const testResponse = await fetch('https://www.google.com', { 
          method: 'HEAD', 
          timeout: 5000 
        });
        console.log('✅ Network connectivity test passed:', testResponse.status);
      } catch (networkError) {
        console.error('❌ Network connectivity test failed:', networkError.message);
        if (retryCount < 2) {
          console.log(`🔄 Retrying network test (attempt ${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return signIn(retryCount + 1);
        }
        throw new Error('No internet connection. Please check your network and try again.');
      }

      console.log('🔄 Calling Supabase OAuth...');
      console.log('⏰ Starting OAuth call with timeout protection...');
      
      // Add timeout around Supabase OAuth call to prevent hanging
      const oauthCallPromise = supabase.auth.signInWithOAuth({
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
      
      const oauthCallTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Supabase OAuth call timeout - request took more than 15 seconds'));
        }, 15000); // 15 second timeout for the OAuth call itself
      });
      
      let oauthResult;
      try {
        oauthResult = await Promise.race([oauthCallPromise, oauthCallTimeoutPromise]);
        console.log('✅ Supabase OAuth call completed');
      } catch (raceError) {
        console.error('❌ OAuth call failed or timed out:', raceError.message);
        throw raceError;
      }
      
      const { data, error } = oauthResult;

      if (error) {
        console.error('❌ OAuth error:', error);
        console.error('❌ OAuth error details:', {
          message: error.message,
          status: error.status,
          platform: Platform.OS
        });
        
        // Provide more specific error messages
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        } else if (error.status === 0) {
          throw new Error('Connection failed. Please check your internet connection.');
        } else if (error.status >= 500) {
          throw new Error('Server error. Please try again in a few moments.');
        } else if (error.status === 400) {
          throw new Error('Invalid request. Please check your OAuth configuration.');
        } else {
          throw error;
        }
      }

      if (!data?.url) {
        console.error('❌ No OAuth URL received from Supabase');
        console.error('❌ Data received:', data);
        throw new Error('No OAuth URL received from authentication provider');
      }

      if (data?.url) {
        console.log('🌐 Opening OAuth URL...');
        console.log('🔗 OAuth URL:', data.url);
        console.log('🎯 Expected redirect:', 'com.anonymous.jerrod://');
        console.log('⏰ Timeout duration:', timeoutDuration + 'ms');

        let result;
        
        if (Platform.OS === 'web') {
          console.log('🌐 Web platform detected - opening OAuth in new tab...');
          console.log('🔗 OAuth URL:', data.url);
          console.log('🎯 Redirect URL:', redirectTo);
          
          // Try to open OAuth URL in new tab
          try {
            if (typeof window !== 'undefined' && window.open) {
              const newWindow = window.open(data.url, '_blank', 'width=500,height=600,scrollbars=yes,resizable=yes');
              
              if (!newWindow) {
                console.error('❌ Popup blocked - trying direct redirect');
                // If popup is blocked, show user message and try direct redirect
                if (typeof alert !== 'undefined') {
                  alert('Please allow popups for this site, then try again. Or the page will redirect to Google.');
                }
                setTimeout(() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.location.href = data.url;
                  }
                }, 2000);
              } else {
                console.log('✅ OAuth opened in new tab');
              }
            } else {
              console.log('❌ Window not available - trying direct redirect');
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.location.href = data.url;
              }
            }
            
            // Return success regardless
            result = { type: 'success', url: data.url };
            
          } catch (openError) {
            console.error('❌ Failed to open OAuth window:', openError);
            // Fallback: direct redirect
            console.log('🔄 Falling back to direct redirect...');
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.href = data.url;
            }
            result = { type: 'success', url: data.url };
          }
          
        } else if (Platform.OS === 'android') {
          console.log('📱 Android detected - using WebBrowser...');
          console.log('⏰ Starting Android OAuth flow...');
          console.log('📱 Running in Expo Go - OAuth may take longer');
          console.log('🔗 OAuth URL to open:', data.url.substring(0, 100) + '...');
          console.log('🎯 Redirect URI:', redirectTo);
          
          try {
            console.log('📱 Warming up WebBrowser...');
            await WebBrowser.warmUpAsync();
            console.log('✅ WebBrowser warm-up completed');
          } catch (warmUpError) {
            console.log('⚠️ WebBrowser warm-up failed (non-critical):', warmUpError.message);
          }

          console.log('📱 About to call WebBrowser.openAuthSessionAsync...');
          console.log('⏰ This call should open the browser - if it hangs here, WebBrowser is the issue');
          const openStartTime = Date.now();
          result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          const openDuration = Date.now() - openStartTime;
          console.log('✅ Android auth session completed in', openDuration, 'ms');
          console.log('📱 Result type:', result?.type);
          console.log('📱 Result URL:', result?.url ? 'Present' : 'Missing');
          
        } else {
          console.log('📱 iOS detected - using WebBrowser...');
          console.log('⏰ Starting iOS OAuth flow...');
          console.log('📱 Running in Expo Go - OAuth may take longer');
          console.log('🔗 OAuth URL to open:', data.url.substring(0, 100) + '...');
          console.log('🎯 Redirect URI:', redirectTo);
          
          console.log('📱 About to call WebBrowser.openAuthSessionAsync...');
          console.log('⏰ This call should open the browser - if it hangs here, WebBrowser is the issue');
          const openStartTime = Date.now();
          result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          const openDuration = Date.now() - openStartTime;
          console.log('✅ iOS auth session completed in', openDuration, 'ms');
          console.log('📱 Result type:', result?.type);
          console.log('📱 Result URL:', result?.url ? 'Present' : 'Missing');
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
            
            // Wait briefly for the session to be established
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Check for session
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
                  session: sessionData.session
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
              message: 'OAuth completed but no authorization code received.',
              shouldShowErrorScreen: true
            };
          }
          
          // Try to manually exchange the code if session check failed
          if (redirectUrl) {
            try {
              console.log('🔍 useGoogleAuth DEBUG - Attempting manual code exchange...');
              console.log('🔍 useGoogleAuth DEBUG - Redirect URL for parsing:', redirectUrl);
              
              // Handle both URL formats: com.anonymous.jerrod://?code=... and com.anonymous.jerrod:?code=...
              let code;
              try {
                // Try parsing as full URL first (with //)
                const url = redirectUrl.startsWith('http') 
                  ? new URL(redirectUrl)
                  : new URL(redirectUrl.replace(/^([^:]+):([^/])/, '$1://$2')); // Add // if missing
                code = url.searchParams.get('code');
              } catch (urlError) {
                // Fallback: extract code manually using regex
                console.log('⚠️ URL parsing failed, trying regex extraction:', urlError.message);
                const codeMatch = redirectUrl.match(/[?&]code=([^&]+)/);
                code = codeMatch ? codeMatch[1] : null;
              }
              
              console.log('🔍 useGoogleAuth DEBUG - Parsed code from URL:', code ? 'EXISTS' : 'NULL');
              console.log('🔍 useGoogleAuth DEBUG - Code length:', code?.length || 0);
              
              if (code) {
                console.log('🔑 Attempting manual code exchange with code:', code.substring(0, 10) + '...');
                
                // Exchange the code for a session with timeout
                console.log('⏰ Starting code exchange (8s timeout)...');
                const exchangeStartTime = Date.now();
                
                let exchangeTimeoutId;
                const exchangePromise = supabase.auth.exchangeCodeForSession(code).finally(() => {
                  if (exchangeTimeoutId) {
                    clearTimeout(exchangeTimeoutId);
                  }
                });
                
                const exchangeTimeoutPromise = new Promise((_, reject) => {
                  exchangeTimeoutId = setTimeout(() => {
                    reject(new Error('Code exchange timeout - took more than 8 seconds'));
                  }, 8000);
                });
                
                let exchangeData, exchangeError;
                try {
                  const exchangeResult = await Promise.race([exchangePromise, exchangeTimeoutPromise]);
                  exchangeData = exchangeResult.data;
                  exchangeError = exchangeResult.error;
                  const exchangeDuration = Date.now() - exchangeStartTime;
                  console.log('✅ Code exchange completed in', exchangeDuration, 'ms');
                } catch (exchangeErr) {
                  console.error('❌ Code exchange failed or timed out:', exchangeErr.message);
                  exchangeError = exchangeErr;
                  // Clear timeout if it was set
                  if (exchangeTimeoutId) {
                    clearTimeout(exchangeTimeoutId);
                  }
                }
                
                console.log('🔍 useGoogleAuth DEBUG - Exchange completed');
                console.log('🔍 useGoogleAuth DEBUG - Exchange error:', exchangeError);
                console.log('🔍 useGoogleAuth DEBUG - Exchange data:', exchangeData ? 'Present' : 'Missing');
                
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
              console.log('🔍 useGoogleAuth DEBUG - Returning success with URL:', redirectUrl);
              return { 
                type: 'success', 
                url: redirectUrl,
                message: 'OAuth completed, session will be established by app',
                needsSessionCheck: true
              };
            }
          } else {
            console.log('🔍 useGoogleAuth DEBUG - No redirect URL found in result');
          }
          
          // If we get here, the code exchange failed
          return { 
            type: 'error', 
            message: 'OAuth completed but session establishment failed. Please try again.',
            shouldShowErrorScreen: true
          };
        } else if (result.type === 'cancel') {
          console.log('⚠️ OAuth flow was cancelled by user');
          return { type: 'error', message: 'Sign-in was cancelled', shouldShowErrorScreen: false };
        } else if (result.type === 'dismiss') {
          console.log('⚠️ OAuth flow was dismissed');
          return { type: 'error', message: 'Sign-in was dismissed', shouldShowErrorScreen: false };
        } else {
          console.log('❌ OAuth flow failed or incomplete');
          return { type: 'error', message: 'OAuth flow failed. Please try again.', shouldShowErrorScreen: true };
        }
      } else {
        console.log('❌ No OAuth URL received from Supabase');
        return { type: 'error', message: 'No OAuth URL received', shouldShowErrorScreen: true };
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
      
      return { type: 'error', message: userMessage, originalError: err, shouldShowErrorScreen: true };
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return { signIn, loading };
}
