import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Alert, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from './supabaseClient'; // adjust if your file path differs
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PushNotiScreen({ navigation, route }) {
  const { user } = useUser();
  const userFromParams = route?.params?.user;
  const isGoogleAuth = route?.params?.isGoogleAuth;
  const googleUserData = route?.params?.googleUserData;

  // Ensure Android channel exists
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  }, []);

  // If permission already granted when landing here, save silently
  useFocusEffect(
    useCallback(() => {
      (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        const userId = await resolveUserId();
        if (userId) {
          const { data: existing } = await supabase
            .from('push_tokens')
            .select('expo_push_token')
            .eq('user_id', userId)
            .maybeSingle(); // works even if zero rows

          if (!existing) {
            await getTokenAndSave();
            }
          }
        }
      })();
    }, [])
  );

  // Resolve the best email we can (context -> params -> AsyncStorage -> Supabase auth)
  const resolveEmailLower = async () => {
    if (user?.email) return user.email.toLowerCase();
    if (userFromParams?.email) return userFromParams.email.toLowerCase();

    const storedEmail = await AsyncStorage.getItem('currentUserEmail');
    if (storedEmail) return storedEmail.toLowerCase();

    const { data: { user: supaUser }, error } = await supabase.auth.getUser();
    if (error) console.log('supabase.auth.getUser error:', error.message);
    if (supaUser?.email) return supaUser.email.toLowerCase();

    return null;
  };

  // Store user email in AsyncStorage if we have it from route params
  useEffect(() => {
    const storeUserEmail = async () => {
      if (userFromParams?.email) {
        await AsyncStorage.setItem('currentUserEmail', userFromParams.email);
        console.log('User email stored in AsyncStorage from route params:', userFromParams.email);
      }
    };
    
    storeUserEmail();
  }, [userFromParams]);

  const resolveUserId = async () => {
  // Prefer context if it has id
  if (user?.id) return user.id;

  // Fallback to Supabase auth
  const { data: { user: supaUser }, error } = await supabase.auth.getUser();
  if (error) {
    console.log('supabase.auth.getUser error:', error.message);
    return null;
  }
  return supaUser?.id ?? null;
};

  // Save Google Auth user to database
  const saveGoogleUserToDatabase = async () => {
    try {
      console.log('🔄 Saving Google Auth user to database...');
      
      if (!userFromParams) {
        console.log('❌ No user data available to save');
        return;
      }

      // Get the current Supabase user
      const { data: { user: supaUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !supaUser) {
        console.error('❌ Error getting Supabase user:', userError);
        throw new Error('No authenticated user found');
      }

      console.log('✅ Supabase user found:', supaUser.id);

      // First try to save to profiles table (without the invalid full_name column)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: supaUser.id,
          email: userFromParams.email,
          name: `${userFromParams.firstName} ${userFromParams.lastName}`.trim(),
          avatar_url: googleUserData?.user_metadata?.avatar_url || '',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select();

      if (profileError) {
        console.log('⚠️ Profile save failed, trying users table:', profileError);
        
        // Fallback to users table - ensure id is treated as UUID, not bigint
        const { data: userData, error: userInsertError } = await supabase
          .from('users')
          .upsert({
            id: supaUser.id, // This should be a UUID, not bigint
            email: userFromParams.email,
            first_name: userFromParams.firstName,
            last_name: userFromParams.lastName,
            phone: userFromParams.phone || '',
            address_line_1: userFromParams.address1 || '',
            address_line_2: userFromParams.address2 || null,
            city: userFromParams.city || '',
            state: userFromParams.state || '',
            zip_code: userFromParams.zip || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
          .select();

        if (userInsertError) {
          console.error('❌ User table save failed:', userInsertError);
          throw userInsertError;
        }

        console.log('✅ User saved to users table:', userData);
      } else {
        console.log('✅ User saved to profiles table:', profileData);
      }

      // Store user data in AsyncStorage for the welcome screen
      const userDataToStore = {
        id: supaUser.id,
        email: userFromParams.email,
        firstName: userFromParams.firstName,
        lastName: userFromParams.lastName,
        phone: userFromParams.phone,
        address1: userFromParams.address1,
        address2: userFromParams.address2,
        city: userFromParams.city,
        state: userFromParams.state,
        zip: userFromParams.zip,
        avatar_url: googleUserData?.user_metadata?.avatar_url || '',
        isGoogleAuth: true
      };

      await AsyncStorage.setItem('tempUserData', JSON.stringify(userDataToStore));
      console.log('✅ User data stored in AsyncStorage');

    } catch (error) {
      console.error('❌ Error saving Google Auth user to database:', error);
      throw error;
    }
  };

 const getTokenAndSave = async () => {
  try {
    if (!Device.isDevice) {
      Alert.alert('Push notifications require a physical device.');
      return;
    }

    // Resolve current user UUID (auth.users.id)
    const userId = await resolveUserId();
    console.log('PushNotiScreen: resolved userId:', userId);
    if (!userId) {
      console.log('No authenticated user; cannot save token under RLS.');
      return;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    const tokenObj = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoToken = tokenObj?.data;
    console.log('Expo push token:', expoToken);
    if (!expoToken) return;

    // One token per user: upsert on user_id
    const { data, error: upsertErr } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, expo_push_token: expoToken, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' } // 👈 matches the one-per-user unique index
      )
      .select();

    if (upsertErr) {
      console.log('Supabase upsert error:', upsertErr.message || upsertErr);
    } else {
      console.log('✅ Push token saved to Supabase for user', userId, data);
    }
  } catch (e) {
    console.log('getTokenAndSave error:', e?.message || String(e));
  }
};


  const handleEnableNotifications = async () => {
    try {
      if (!Device.isDevice) {
        Alert.alert('Push notifications require a physical device.');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in Settings to get updates.',
          [
            { text: 'Settings', onPress: () => Notifications.openSettingsAsync?.() },
            { text: 'OK' },
          ]
        );
        return;
      }

      await getTokenAndSave();
      
      // For Google Auth users, save to database and navigate to UploadPhoto
      if (isGoogleAuth && userFromParams) {
        await saveGoogleUserToDatabase();
        navigation.navigate('UploadPhoto', { 
          userInfo: userFromParams,
          isGoogleAuth: true,
          googleUserData: googleUserData
        });
      } else {
        navigation.navigate('Welcomepage');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      Alert.alert('Error', 'Failed to enable push notifications. Please try again.');
    }
  };

  const handleMaybeLater = async () => {
    // For Google Auth users, save to database and navigate to UploadPhoto
    if (isGoogleAuth && userFromParams) {
      try {
        await saveGoogleUserToDatabase();
        navigation.navigate('UploadPhoto', { 
          userInfo: userFromParams,
          isGoogleAuth: true,
          googleUserData: googleUserData
        });
      } catch (error) {
        console.error('Error saving user data:', error);
        Alert.alert('Error', 'Failed to save your information. Please try again.');
      }
    } else {
      navigation.navigate('Welcomepage');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/Logo_Dark.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.placeholder} />
      </View>

      {/* Main */}
      <View style={styles.content}>
        <Image source={require('../assets/notification-bell.png')} style={styles.bellIcon} resizeMode="contain" />
        <Text style={styles.title}>Allow push notifications?</Text>
        <Text style={styles.description}>
          We'll use push notifications to update you on transaction status, delivery tracking, and promotions.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleEnableNotifications}>
          <Text style={styles.primaryButtonText}>Enable push notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleMaybeLater}>
          <Text style={styles.secondaryLink}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
  },
  backArrow: { fontSize: 24, color: '#000', fontWeight: 'bold' },
  logo: { width: 80, height: 40 },
  placeholder: { width: 24 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  bellIcon: { width: 80, height: 80, marginBottom: 32 },
  title: { fontSize: 27, fontWeight: '250', color: '#000', textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 60, paddingHorizontal: 20 },
  primaryButton: { backgroundColor: '#000', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 50, marginBottom: 28, width: '100%', alignItems: 'center', elevation: 12 },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  secondaryLink: { color: '#000', fontSize: 14, textDecorationLine: 'underline' },
});
