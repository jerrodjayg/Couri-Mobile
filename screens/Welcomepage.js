import React, { useRef, useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';

export default function Welcomepage({ route, navigation }) {
  const { user, setCustomUser } = useUser();
  const waveAnim = useRef(new Animated.Value(0)).current;
  const [userProfile, setUserProfile] = useState(null);
  const [profileImageKey, setProfileImageKey] = useState(0);
  const hasRetriedRef = useRef(false); // prevents infinite onError loops
  const [hasError, setHasError] = useState(false);

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
        // First check if we have userData from route params (from Google Auth flow)
        if (route?.params?.userData) {
          const userData = route.params.userData;
          console.log('✅ Welcomepage - Found user data from route params:', userData);
          
          const userProfileData = {
            id: userData.id,
            name: userData.firstName || userData.name,
            full_name: `${userData.firstName} ${userData.lastName}`.trim(),
            avatar_url: userData.avatar_url || userData.profileImageUri,
            email: userData.email
          };
          
          setUserProfile(userProfileData);
          
          // Also store in userProfileData for other screens to access
          if (userData.avatar_url || userData.profileImageUri) {
            AsyncStorage.setItem('userProfileData', JSON.stringify(userProfileData))
              .then(() => console.log('✅ Profile picture stored in userProfileData for other screens'))
              .catch(error => console.log('⚠️ Error storing profile picture:', error));
          } else if (userData.hasSkippedPhoto) {
            // User skipped photo - ensure no profile picture is stored
            AsyncStorage.setItem('userProfileData', JSON.stringify({
              ...userProfileData,
              avatar_url: '' // Force empty
            }))
              .then(() => console.log('✅ UserProfileData stored with NO profile picture (user skipped)'))
              .catch(error => console.log('⚠️ Error storing userProfileData:', error));
          }
          
          return;
        }

        // Then try to get user data from persistent AsyncStorage (from OAuth flow)
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        if (userProfileData) {
          const parsedUserData = JSON.parse(userProfileData);
          console.log('✅ Welcomepage - Found persistent user data in AsyncStorage:', parsedUserData);
          
          setUserProfile({
            id: parsedUserData.id,
            name: parsedUserData.name,
            full_name: parsedUserData.full_name,
            avatar_url: parsedUserData.avatar_url,
            email: parsedUserData.email
          });
        } else {
          // Fallback to user context
          if (user) {
            setUserProfile({
              id: user.id,
              name: user.user_metadata?.name || user.user_metadata?.full_name,
              full_name: user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url,
              email: user.email
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching user profile in Welcomepage:', error);
      }
    };

    fetchUserProfile();
  }, [user, route?.params?.userData]);

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
    return '?';
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
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: 'white',
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
});
