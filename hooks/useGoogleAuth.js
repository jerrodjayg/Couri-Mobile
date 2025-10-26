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
    if (loading) return;
    setLoading(true);

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
          
          try {
            await WebBrowser.warmUpAsync();
            console.log('📱 WebBrowser warm-up completed');
          } catch (warmUpError) {
            console.log('📱 WebBrowser warm-up failed:', warmUpError.message);
          }

          console.log('📱 Opening Android auth session...');
          result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          console.log('📱 Android auth session completed:', result?.type);
          
        } else {
          console.log('📱 iOS detected - using WebBrowser...');
          console.log('⏰ Starting iOS OAuth flow...');
          console.log('📱 Running in Expo Go - OAuth may take longer');
          
          console.log('📱 Opening iOS auth session...');
          result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          console.log('📱 iOS auth session completed:', result?.type);
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
            
            // Check for session with a more generous timeout
            const sessionPromise = supabase.auth.getSession();
            const sessionTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session check timeout')), 10000)
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
              
              const url = new URL(redirectUrl);
              const code = url.searchParams.get('code');
              
              console.log('🔍 useGoogleAuth DEBUG - Parsed code from URL:', code ? 'EXISTS' : 'NULL');
              console.log('🔍 useGoogleAuth DEBUG - Code length:', code?.length || 0);
              
              if (code) {
                console.log('🔑 Attempting manual code exchange with code:', code.substring(0, 10) + '...');
                
                // Exchange the code for a session
                const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                
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
