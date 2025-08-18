import React, { useRef, useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserService } from '../utils/userService';
import { useFocusEffect } from '@react-navigation/native';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';

export default function Welcomepage({ route, navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [justCompletedAccountCreation, setJustCompletedAccountCreation] = useState(false);
  const { user, customUser, setCustomUser } = useUser();
  const waveAnim = useRef(new Animated.Value(0)).current;
  const [profileImageKey, setProfileImageKey] = useState(0);
  const hasRetriedRef = useRef(false); // prevents infinite onError loops

  // Safety check: Prevent any navigation to Home if user just completed account creation
  useEffect(() => {
    const checkJustCreatedAccount = async () => {
      const justCreatedAccount = await AsyncStorage.getItem('justCreatedAccount');
      if (justCreatedAccount === 'true') {
        console.log('🔒 Welcomepage: Safety check - User just completed account creation, preventing Home navigation');
        setJustCompletedAccountCreation(true);
        return;
      }
      
      // Additional check: If user has route params with userData, they likely just completed account creation
      if (route?.params?.userData) {
        console.log('🔒 Welcomepage: Safety check - Route params contain userData, user likely just completed account creation');
        setJustCompletedAccountCreation(true);
        // Set the flag to ensure it persists
        await AsyncStorage.setItem('justCreatedAccount', 'true');
        console.log('✅ Welcomepage: Safety check - Set justCreatedAccount flag to true');
      }
    };
    
    checkJustCreatedAccount();
  }, [route?.params?.userData]);
  
  // DEBUG: Add comprehensive logging for user data flow
  useEffect(() => {
    console.log('🔍 Welcomepage DEBUG - Component mounted');
    console.log('🔍 Welcomepage DEBUG - Route params:', route?.params);
    console.log('🔍 Welcomepage DEBUG - User context:', user);
    console.log('🔍 Welcomepage DEBUG - User context ID:', user?.id);
    console.log('🔍 Welcomepage DEBUG - User context email:', user?.email);
    console.log('🔍 Welcomepage DEBUG - User context metadata:', user?.user_metadata);
    
    // Check AsyncStorage for user data
    const checkAsyncStorage = async () => {
      try {
        const tempUserData = await AsyncStorage.getItem('tempUserData');
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        console.log('🔍 Welcomepage DEBUG - tempUserData from AsyncStorage:', tempUserData ? JSON.parse(tempUserData) : null);
        console.log('🔍 Welcomepage DEBUG - userProfileData from AsyncStorage:', userProfileData ? JSON.parse(userProfileData) : null);
      } catch (error) {
        console.log('🔍 Welcomepage DEBUG - AsyncStorage check error:', error);
      }
    };
    
    checkAsyncStorage();
    
    // CRITICAL: Check if user should be on this screen
    const checkUserAccess = async () => {
      try {
        console.log('🔍 Welcomepage DEBUG - checkUserAccess called');
        
        // FINAL SAFETY CHECK: If user just completed account creation, NEVER redirect to Home
        if (justCompletedAccountCreation) {
          console.log('🔒 Welcomepage: FINAL SAFETY CHECK - User just completed account creation, staying on Welcomepage');
          return;
        }
        
        // First check if user just completed account creation
        const justCreatedAccount = await AsyncStorage.getItem('justCreatedAccount');
        console.log('🔍 Welcomepage DEBUG - justCreatedAccount flag:', justCreatedAccount);
        
        if (justCreatedAccount === 'true') {
          console.log('🔍 Welcomepage DEBUG - User just completed account creation, allowing access');
          setJustCompletedAccountCreation(true);
          return; // Don't redirect, allow user to stay on Welcomepage
        }
        
        // Additional check: If user has route params with userData, they likely just completed account creation
        if (route?.params?.userData) {
          console.log('🔍 Welcomepage DEBUG - Route params contain userData, user likely just completed account creation');
          setJustCompletedAccountCreation(true);
          // Set the flag to ensure it persists
          await AsyncStorage.setItem('justCreatedAccount', 'true');
          console.log('✅ Welcomepage DEBUG - Set justCreatedAccount flag to true');
          return; // Don't redirect, allow user to stay on Welcomepage
        }
        
        // If we already know the user just completed account creation, don't check anything else
        if (justCompletedAccountCreation) {
          console.log('🔍 Welcomepage DEBUG - User already confirmed as just completed account creation, staying');
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 Welcomepage DEBUG - Session check on mount:', session);
        console.log('🔍 Welcomepage DEBUG - User context:', { user, customUser });
        
        // If no session and no user context, redirect to Home
        if (!session?.user && !user && !customUser) {
          console.log('🔍 Welcomepage DEBUG - No valid session or user, redirecting to Home');
          navigation.replace('Home');
          return;
        }
        
        // If session exists but user was deleted from database, redirect to Home
        if (session?.user) {
          try {
            console.log('🔍 Welcomepage DEBUG - Checking if user exists in database:', session.user.email);
            const { exists } = await UserService.checkUserExists(session.user.email);
            console.log('🔍 Welcomepage DEBUG - Database check result:', exists);
            
            if (!exists) {
              console.log('🔍 Welcomepage DEBUG - User deleted from database, redirecting to Home');
              await supabase.auth.signOut();
              navigation.replace('Home');
              return;
            }
          } catch (dbCheckError) {
            console.log('🔍 Welcomepage DEBUG - Database check error (non-blocking):', dbCheckError);
          }
        }
        
        console.log('🔍 Welcomepage DEBUG - User access check passed, staying on Welcomepage');
      } catch (error) {
        console.log('🔍 Welcomepage DEBUG - User access check error:', error);
      }
    };
    
    // Delay checkUserAccess to ensure safety check runs first
    const timer = setTimeout(() => {
      checkUserAccess();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [user, customUser, navigation, justCompletedAccountCreation]);

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      console.log('🚨 Welcomepage error boundary caught error:', error);
      setHasError(true);
    };

    // Add global error handler
    const originalConsoleError = console.error;
    console.error = (...args) => {
      console.log('🚨 Console error in Welcomepage:', args);
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Navigation state logging
  useEffect(() => {
    console.log('🔄 Welcomepage mounted with route params:', route?.params);
    console.log('🔄 Welcomepage navigation state:', navigation.getState());
    
    const unsubscribe = navigation.addListener('state', (e) => {
      console.log('🔄 Welcomepage navigation state changed:', e.data);
    });

    const focusListener = navigation.addListener('focus', () => {
      console.log('🔄 Welcomepage focused');
      // DEBUG: Check current user state when screen focuses
      const checkCurrentState = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('🔍 Welcomepage DEBUG - Current session on focus:', session);
          console.log('🔍 Welcomepage DEBUG - Session user:', session?.user);
          
          if (session?.user) {
            console.log('🔍 Welcomepage DEBUG - User is authenticated:', session.user.email);
          } else {
            console.log('🔍 Welcomepage DEBUG - No active session found');
          }
        } catch (error) {
          console.log('🔍 Welcomepage DEBUG - Session check error:', error);
        }
      };
      checkCurrentState();
    });

    const blurListener = navigation.addListener('blur', () => {
      console.log('🔄 Welcomepage blurred');
    });

    return () => {
      console.log('🔄 Welcomepage unmounting');
      unsubscribe();
      focusListener();
      blurListener();
    };
  }, [navigation]);

  // If there's an error, show a simple fallback
  if (hasError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.wrapper}>
          <Text>Something went wrong. Please try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get name from user data, or show default if signed out
  const name = userProfile 
    ? (route?.params?.name || route?.params?.userData?.firstName || userProfile?.full_name?.split(' ')[0] || 'there')
    : 'there';

  // Build a URL from a storage path (public or private)
  const resolveAvatarUrlFromPath = async (path) => {
    if (!path) return null;

    // Try public URL first (works if bucket is public)
    const pub = supabase.storage.from('avatars').getPublicUrl(path)?.data?.publicUrl;
    if (pub) return `${pub}?v=${Date.now()}`;

    // If bucket is private, generate a short-lived signed URL
    try {
      const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 600);
      return data?.signedUrl || null;
    } catch {
      return null;
    }
  };

  // Fetch user profile from AsyncStorage or context (same pattern as other screens)
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log('🔍 Welcomepage DEBUG - Starting fetchUserProfile');
        
        // First check if we have userData from route params (from Google Auth flow)
        if (route?.params?.userData) {
          const userData = route.params.userData;
          console.log('✅ Welcomepage - Found user data from route params:', userData);
          
          // Create comprehensive user profile data
          const userProfileData = {
            // PRESERVE ALL ORIGINAL USER DATA FIRST using spread operator
            ...userData,
            // Then add/update specific fields (but don't override if they're already in userData)
            id: userData.id || 'temp_user',
            name: userData.firstName || userData.name || userData.full_name || '',
            full_name: userData.full_name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || '',
            avatar_url: userData.avatar_url || userData.profileImageUri || '',
            profileImageUri: userData.profileImageUri || userData.avatar_url || '',
            email: userData.email || '',
            firstName: userData.firstName || userData.name?.split(' ')[0] || '',
            lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || '',
            phone: userData.phone || '',
            address1: userData.address1 || userData.address_line_1 || '',
            address2: userData.address2 || userData.address_line_2 || '',
            city: userData.city || '',
            state: userData.state || '',
            zip: userData.zip || userData.zip_code || '',
            isGoogleAuth: userData.isGoogleAuth || false,
          };
          
          console.log('🔍 Welcomepage DEBUG - Processed userProfileData:', userProfileData);
          setUserProfile(userProfileData);
          
          // Store in both tempUserData and userProfileData for consistency across the app
          try {
            await AsyncStorage.setItem('tempUserData', JSON.stringify(userProfileData));
            await AsyncStorage.setItem('userProfileData', JSON.stringify(userProfileData));
            
            // Clear the userLastAction flag since user is successfully accessing Welcomepage
            await AsyncStorage.removeItem('userLastAction');
            console.log('✅ Welcomepage - User data stored and userLastAction flag cleared');
            
            // Clear the justCreatedAccount flag since user successfully completed account creation
            // Add a delay to ensure the user stays on the page
            setTimeout(async () => {
              await AsyncStorage.removeItem('justCreatedAccount');
              setJustCompletedAccountCreation(false);
              console.log('✅ Welcomepage - justCreatedAccount flag cleared after delay');
            }, 2000);
            console.log('✅ Welcomepage - justCreatedAccount flag will be cleared in 2 seconds');
            
            console.log('✅ Welcomepage - User data stored in both tempUserData and userProfileData');
            console.log('🔍 Welcomepage DEBUG - COMPLETE userData received from route params:', JSON.stringify(userData, null, 2));
            console.log('🔍 Welcomepage DEBUG - COMPLETE userProfileData being stored:', JSON.stringify(userProfileData, null, 2));
            console.log('🔍 Welcomepage DEBUG - Data comparison - Received vs Stored:', {
              receivedKeys: Object.keys(userData || {}),
              storedKeys: Object.keys(userProfileData),
              hasAllReceivedData: Object.keys(userData || {}).every(key => userProfileData.hasOwnProperty(key))
            });
            
            // Additional logging for debugging
            console.log('🔍 Welcomepage DEBUG - Stored data verification:');
            console.log('  - tempUserData stored:', await AsyncStorage.getItem('tempUserData') ? 'YES' : 'NO');
            console.log('  - userProfileData stored:', await AsyncStorage.getItem('userProfileData') ? 'YES' : 'NO');
            
          } catch (storageError) {
            console.log('⚠️ Welcomepage - Error storing user data in AsyncStorage:', storageError);
          }
          
          return;
        }

        // Then try to get user data from persistent AsyncStorage (from OAuth flow)
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        if (userProfileData) {
          const parsedUserData = JSON.parse(userProfileData);
          console.log('✅ Welcomepage - Found persistent user data in AsyncStorage:', parsedUserData);
          
          // Clear the userLastAction flag since user is successfully accessing Welcomepage
          await AsyncStorage.removeItem('userLastAction');
          console.log('✅ Welcomepage - userLastAction flag cleared for persistent user');
          
          // Clear the justCreatedAccount flag since user successfully accessed Welcomepage
          // Add a delay to ensure the user stays on the page
          setTimeout(async () => {
            await AsyncStorage.removeItem('justCreatedAccount');
            setJustCompletedAccountCreation(false);
            console.log('✅ Welcomepage - justCreatedAccount flag cleared after delay for persistent user');
          }, 2000);
          console.log('✅ Welcomepage - justCreatedAccount flag will be cleared in 2 seconds for persistent user');
          
          setUserProfile({
            id: parsedUserData.id,
            name: parsedUserData.name || parsedUserData.full_name || `${parsedUserData.firstName || ''} ${parsedUserData.lastName || ''}`.trim(),
            full_name: parsedUserData.full_name || parsedUserData.name || `${parsedUserData.firstName || ''} ${parsedUserData.lastName || ''}`.trim(),
            avatar_url: parsedUserData.avatar_url || parsedUserData.profileImageUri || '',
            profileImageUri: parsedUserData.profileImageUri || parsedUserData.avatar_url || '',
            email: parsedUserData.email,
            firstName: parsedUserData.firstName || parsedUserData.name?.split(' ')[0] || '',
            lastName: parsedUserData.lastName || parsedUserData.name?.split(' ').slice(1).join(' ') || '',
            phone: parsedUserData.phone || '',
            address1: parsedUserData.address1 || parsedUserData.address_line_1 || '',
            address2: parsedUserData.address2 || parsedUserData.address_line_2 || '',
            city: parsedUserData.city || '',
            state: parsedUserData.state || '',
            zip: parsedUserData.zip || parsedUserData.zip_code || '',
            isGoogleAuth: parsedUserData.isGoogleAuth || false,
          });
        } else {
          // Fallback to user context
          if (user) {
            console.log('🔍 Welcomepage DEBUG - Using user context as fallback');
            setUserProfile({
              id: user.id,
              name: user.user_metadata?.name || user.user_metadata?.full_name,
              full_name: user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url,
              email: user.email
            });
          } else {
            console.log('🔍 Welcomepage DEBUG - No user data found in any source');
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching user profile in Welcomepage:', error);
      }
    };

    fetchUserProfile();
  }, [user, route?.params?.userData]);

  // Refresh profile picture when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshProfilePicture = async () => {
        try {
          // Check for updated profile picture in AsyncStorage
          const tempUserData = await AsyncStorage.getItem('tempUserData');
          const userProfileData = await AsyncStorage.getItem('userProfileData');
          
          if (tempUserData || userProfileData) {
            const tempData = tempUserData ? JSON.parse(tempUserData) : {};
            const profileData = userProfileData ? JSON.parse(userProfileData) : {};
            
            // Merge data to get the most up-to-date information
            const mergedData = { ...profileData, ...tempData };
            
            if (mergedData.avatar_url || mergedData.profileImageUri) {
              setUserProfile(prev => ({
                ...prev,
                avatar_url: mergedData.avatar_url || mergedData.profileImageUri,
                profileImageUri: mergedData.profileImageUri || mergedData.avatar_url
              }));
              console.log('✅ Welcomepage - Profile picture refreshed from AsyncStorage');
            }
          }
        } catch (error) {
          console.log('⚠️ Error refreshing profile picture:', error);
        }
      };

      refreshProfilePicture();
    }, [])
  );

  // DEBUG: Add handleSignOut function with comprehensive logging
  const handleSignOut = async () => {
    console.log('🔍 Welcomepage DEBUG - handleSignOut called');
    
    try {
      // Check current session before signing out
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 Welcomepage DEBUG - Current session before sign out:', session);
      
      if (session?.user) {
        console.log('🔍 Welcomepage DEBUG - Signing out user:', session.user.email);
        
        // Sign out from Supabase
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error('❌ Welcomepage DEBUG - Supabase sign out error:', signOutError);
        } else {
          console.log('✅ Welcomepage DEBUG - Supabase sign out successful');
        }
      } else {
        console.log('🔍 Welcomepage DEBUG - No active session to sign out');
      }
      
      // Clear AsyncStorage
      try {
        await AsyncStorage.removeItem('tempUserData');
        await AsyncStorage.removeItem('userProfileData');
        
        // Set flag to indicate user signed out - next app open will go to Home
        await AsyncStorage.setItem('userLastAction', 'sign_out');
        console.log('✅ Welcomepage DEBUG - AsyncStorage cleared and sign_out flag set');
      } catch (storageError) {
        console.log('⚠️ Welcomepage DEBUG - AsyncStorage clear error:', storageError);
      }
      
      // Clear user context
      if (setCustomUser) {
        setCustomUser(null);
        console.log('✅ Welcomepage DEBUG - User context cleared');
      }
      
      // Navigate to HomeScreen (not Splash)
      console.log('🔍 Welcomepage DEBUG - Navigating to HomeScreen');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      
    } catch (error) {
      console.error('❌ Welcomepage DEBUG - handleSignOut error:', error);
      // Still try to navigate even if there's an error
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  };

  // CRITICAL: Add handleDeleteAccount function to completely remove user data
  const handleDeleteAccount = async () => {
    console.log('🔍 Welcomepage DEBUG - handleDeleteAccount called');
    
    try {
      // Set loading state immediately
      setLoading(true);
      
      // 1. Clear AsyncStorage first (fast operation)
      try {
        await AsyncStorage.removeItem('tempUserData');
        await AsyncStorage.removeItem('userProfileData');
        
        // Set flag to indicate account was deleted - next app open will go to Home
        await AsyncStorage.setItem('userLastAction', 'delete_account');
        console.log('✅ Welcomepage DEBUG - AsyncStorage cleared and delete_account flag set');
      } catch (storageError) {
        console.log('⚠️ Welcomepage DEBUG - AsyncStorage clear error:', storageError);
      }
      
      // 2. Clear user context
      if (setCustomUser) {
        setCustomUser(null);
        console.log('✅ Welcomepage DEBUG - User context cleared');
      }
      
      // 3. Sign out from Supabase (this will handle database cleanup)
      try {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.log('⚠️ Welcomepage DEBUG - Supabase sign out error:', signOutError);
        } else {
          console.log('✅ Welcomepage DEBUG - Supabase sign out successful');
        }
      } catch (signOutError) {
        console.log('⚠️ Welcomepage DEBUG - Sign out error (non-blocking):', signOutError);
      }
      
      // 4. Navigate to Home screen immediately
      console.log('🔍 Welcomepage DEBUG - Navigating to HomeScreen after account deletion');
      navigation.replace('Home');
      
    } catch (error) {
      console.error('❌ Welcomepage DEBUG - handleDeleteAccount error:', error);
      // Still navigate even if there's an error
      navigation.replace('Home');
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    // Get initials from userProfile data
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    // Fallback to name if full_name not available
    if (userProfile?.name) {
      const names = userProfile.name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    // Fallback to route params if available
    if (route?.params?.userData?.firstName && route?.params?.userData?.lastName) {
      return (route.params.userData.firstName.charAt(0) + route.params.userData.lastName.charAt(0)).toUpperCase();
    }
    
    // Check if user skipped photo and has initials stored
    if (route?.params?.userData?.userInitials) {
      return route.params.userData.userInitials;
    }
    
    // Final fallback
    return 'U';
  };

  const handleProfilePress = () => {
    if (userProfile) {
      // Pass user data including initials to MyAccount screen
      const userDataToPass = {
        ...route?.params?.userData,
        userInitials: getUserInitials(),
      };
      navigation.navigate('MyAccount', { userData: userDataToPass });
    } else {
      // If not signed in, go to login
      navigation.navigate('Login');
    }
  };

  // Waving animation
  useEffect(() => {
    Animated.sequence([
      Animated.timing(waveAnim, { toValue: 15, duration: 300, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: -10, duration: 300, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.wrapper}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View>
            <Image
              source={require('../assets/Logo_Dark.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          {/* Profile Picture Circle - Shows default when signed out */}
          <TouchableOpacity onPress={userProfile ? handleProfilePress : () => navigation.navigate('Login')} style={styles.profileContainer}>
            {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
              <Image 
                source={{ uri: userProfile.avatar_url }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitials}>
                  {userProfile ? getUserInitials() : '?'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* White Block */}
        <View style={styles.whiteBlock}>
          <View style={styles.whiteBlockInner}>
            <View style={styles.welcomeRow}>
              <Animated.Text
                style={[
                  styles.wave,
                  {
                    transform: [
                      {
                        rotate: waveAnim.interpolate({
                          inputRange: [-15, 15],
                          outputRange: ['-15deg', '15deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                👋🏻
              </Animated.Text>
              <Text style={styles.welcomeText}>WELCOME, {name.toUpperCase()}!</Text>
            </View>
            <Text style={styles.headline}>Let's get started.</Text>
            <Text style={styles.subheadline}>
              You don't have any active Couri transactions.
            </Text>
            <View style={styles.placeholderBox} />
            {userProfile ? (
              <TouchableOpacity style={styles.beginButton}>
                <Text style={styles.beginButtonText}>+ Begin a Transaction</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.beginButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.beginButtonText}>Sign In to Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Pink Section */}
        <View style={styles.pinkBackground}>
          <View style={styles.infoBlock}>
            <Image
              source={require('../assets/mark2_dark.png')}
              style={styles.infoLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.infoTitle}>
              Couri is transforming{'\n'}peer-to-peer transactions.
            </Text>
            <Text style={styles.infoSub}>Check out how it works.</Text>

            <TouchableOpacity style={styles.learnMoreButton} onPress={() => {}}>
              <Text style={styles.learnMoreText}>
                Learn More
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          
          {/* Delete Account Button */}
          <TouchableOpacity 
            style={[styles.deleteAccountButton, loading && styles.deleteAccountButtonDisabled]} 
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone and will remove all your data permanently.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: handleDeleteAccount
                  }
                ]
              );
            }}
            disabled={loading}
          >
            <Text style={styles.deleteAccountText}>
              {loading ? 'Deleting...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  wrapper: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
  },
  logoContainer: {
    width: 70,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: { width: 70, height: 30 },
  profileContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#444444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  whiteBlock: {
    width: '100%',
    paddingTop: 20,
    paddingBottom: 43,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 400,
  },
  whiteBlockInner: { width: '100%', alignItems: 'center' },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  wave: { fontSize: 28, marginRight: 8 },
  welcomeText: { fontSize: 16, fontWeight: '600' },
  headline: { fontSize: 35, fontWeight: '400', textAlign: 'center', marginTop: 20, marginBottom: 8 },
  subheadline: { fontSize: 16, color: '#444', textAlign: 'center', marginBottom: 20 },
  placeholderBox: { width: '95%', height: 140, backgroundColor: '#eee', borderRadius: 8, marginBottom: 20 },
  beginButton: { backgroundColor: '#000', paddingVertical: 19, paddingHorizontal: 33, borderRadius: 50, marginTop: 20 },
  beginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  pinkBackground: { backgroundColor: '#FDEAFF', alignItems: 'center', paddingBottom: 30, paddingTop: 16 },
  infoBlock: { width: '100%', paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
  infoLogoImage: { width: 50, height: 50, marginBottom: 12 },
  infoTitle: { fontSize: 28, fontWeight: '300', textAlign: 'center', marginBottom: 8 },
  infoSub: { fontSize: 14, color: '#444', marginBottom: 20 },
  learnMoreButton: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 19, paddingHorizontal: 33, borderWidth: 1, borderColor: '#000' },
  learnMoreText: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#000' },
  signOutContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteAccountButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#FF0000',
    marginTop: 12,
  },
  deleteAccountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteAccountButtonDisabled: {
    opacity: 0.7,
  },
});
