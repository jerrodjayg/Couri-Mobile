import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../screens/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const projectRef = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF || 'nfkykasruwdzpcjuufdu';

/**
 * Configure notification handler
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async () => {
  try {
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications require a physical device');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Notification permissions not granted');
      return false;
    }

    // Set Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get Expo push token and store it
 */
export const registerForPushNotifications = async (userId) => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const tokenObj = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    
    const expoToken = tokenObj?.data;
    if (!expoToken) {
      console.log('⚠️ No Expo push token received');
      return null;
    }

    console.log('📱 Expo push token:', expoToken);

    // Store token locally
    await AsyncStorage.setItem('expoPushToken', expoToken);

    // Store token in backend
    if (userId) {
      await storePushTokenInBackend(expoToken, userId);
    }

    return expoToken;
  } catch (error) {
    console.error('❌ Error registering for push notifications:', error);
    return null;
  }
};

/**
 * Store push token in backend
 */
const storePushTokenInBackend = async (token, userId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;

    const response = await fetch(
      `https://${projectRef}.functions.supabase.co/store-push-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {})
        },
        body: JSON.stringify({
          token: token,
          userId: userId
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to store push token');
    }

    console.log('✅ Push token stored in backend');
  } catch (error) {
    console.error('❌ Error storing push token in backend:', error);
  }
};

/**
 * Set up notification listeners
 * @param {Function} onNotificationReceived - Callback when notification is received
 */
export const setupNotificationListeners = (onNotificationReceived) => {
  // Listener for notifications received while app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('📬 Notification received (foreground):', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👆 Notification tapped:', response);
    const data = response.notification.request.content.data;
    
    // Handle transaction notification
    if (data?.transactionId) {
      // Navigate to transaction details or welcome screen
      // This will be handled by the app's navigation
    }
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
};

