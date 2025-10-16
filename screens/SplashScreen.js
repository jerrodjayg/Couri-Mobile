import { supabase } from './supabaseClient';
import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import imagePreloader from '../utils/imagePreloader';

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const preWarmLocationPermissions = async () => {
      // Pre-warm location permissions for faster location detection later
      try {
        console.log('📍 Pre-warming location permissions...');
        await Location.requestForegroundPermissionsAsync();
        console.log('✅ Location permissions pre-warmed');
      } catch (error) {
        console.log('⚠️ Location permission pre-warm failed (non-blocking):', error);
      }
    };

    const preloadCriticalAssets = async () => {
      // Preload critical images for faster app performance
      try {
        console.log('🖼️ Preloading critical images...');
        await imagePreloader.preloadCriticalImages();
        console.log('✅ Critical images preloaded');
      } catch (error) {
        console.log('⚠️ Image preloading failed (non-blocking):', error);
      }
    };

    const checkSession = async () => {
      try {
        // Pre-warm location permissions and images in background
        preWarmLocationPermissions();
        preloadCriticalAssets();
        // Check for user's last action first
        const lastAction = await AsyncStorage.getItem('userLastAction');
        console.log('🔍 SplashScreen: User last action:', lastAction);
        
        // If user deleted account, go to Home screen
        if (lastAction === 'delete_account') {
          console.log('✅ SplashScreen: User deleted account, navigating to Home');
          // Clear the last action flag
          await AsyncStorage.removeItem('userLastAction');
          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }).start(() => {
              navigation.replace('Home');
            });
          }, 2000);
          return;
        }
        
        // If user signed out, check if they have saved data and go to Welcomepage
        if (lastAction === 'sign_out') {
          console.log('✅ SplashScreen: User signed out, checking for saved data');
          // Clear the last action flag
          await AsyncStorage.removeItem('userLastAction');
          
          // Check if user has saved data in AsyncStorage
          const tempUserData = await AsyncStorage.getItem('tempUserData');
          const userProfileData = await AsyncStorage.getItem('userProfileData');
          
          if (tempUserData || userProfileData) {
            console.log('✅ SplashScreen: Found saved user data, navigating to Welcomepage');
            setTimeout(() => {
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }).start(() => {
                navigation.replace('Welcomepage');
              });
            }, 2000);
            return;
          } else {
            console.log('✅ SplashScreen: No saved data found, navigating to Home');
            setTimeout(() => {
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }).start(() => {
                navigation.replace('Home');
              });
            }, 2000);
            return;
          }
        }
        
        // Check if user just completed account creation
        const justCreatedAccount = await AsyncStorage.getItem('justCreatedAccount');
        if (justCreatedAccount === 'true') {
          console.log('✅ SplashScreen: User just created account, navigating to Welcomepage');
          // Clear the flag
          await AsyncStorage.removeItem('justCreatedAccount');
          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }).start(() => {
              navigation.replace('Welcomepage');
            });
          }, 2000);
          return;
        }
        
        const { data } = await supabase.auth.getSession();
        
        // If user has a valid session, check if they exist in database
        if (data?.session?.user) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', data.session.user.email)
            .single();
          
          if (userData && !error) {
            // User exists in database - go to BiometricAuth screen for returning users
            console.log('✅ SplashScreen: Returning user found, navigating to BiometricAuth screen');
            setTimeout(() => {
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }).start(() => {
                navigation.replace('BiometricAuth');
              });
            }, 2000);
            return;
          }
        }
        
        // No session or user not in database - go to Home screen
        console.log('✅ SplashScreen: No session or new user, navigating to Home');
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }).start(() => {
            navigation.replace('Home');
          });
        }, 2000);
      } catch (error) {
        console.error('❌ SplashScreen: Error checking session:', error);
        // On error, go to Home screen
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }).start(() => {
            navigation.replace('Home');
          });
        }, 2000);
      }
    };

    checkSession();
  }, [fadeAnim, navigation]);


  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../assets/Logo_Dark.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 100,
    marginBottom: 60,
  },
});