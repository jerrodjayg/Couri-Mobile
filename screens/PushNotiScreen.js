import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';

export default function PushNotiScreen({ navigation }) {
  const handleEnableNotifications = async () => {
    try {
      // Request permission for push notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Push notifications are required for the best experience. You can enable them in your device settings.',
          [
            { text: 'OK', onPress: () => navigation.navigate('Home') },
            { text: 'Settings', onPress: () => Notifications.openSettingsAsync() }
          ]
        );
        return;
      }

      // Try to get the token for push notifications
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        console.log('Push token:', token);
        
        // Send token to server
        try {
          const response = await fetch('http://localhost:3000/api/store-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: token.data,
              userId: 'user123' // Replace with actual user ID from your auth system
            }),
          });
          
          const result = await response.json();
          if (result.success) {
            console.log('Token stored on server successfully');
          } else {
            console.log('Failed to store token on server:', result.error);
          }
        } catch (serverError) {
          console.log('Server error (this is normal in Expo Go):', serverError.message);
        }
      } catch (tokenError) {
        // Handle the case where projectId is not available (Expo Go)
        console.log('Push token not available in Expo Go:', tokenError.message);
        // Still proceed since permission was granted
      }

      // Navigate to home screen after successful permission
      navigation.navigate('Welcomepage');
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      Alert.alert('Error', 'Failed to enable push notifications. Please try again.');
    }
  };

  const handleMaybeLater = () => {
    navigation.navigate('Welcomepage');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Image
          source={require('../assets/Logo_Dark.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Image
          source={require('../assets/notification-bell.png')}
          style={styles.bellIcon}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Allow push notifications?</Text>
        
        <Text style={styles.description}>
          We'll use push notifications to update you on transaction status, delivery tracking, and to let you know about promotions and new releases.
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backArrow: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  logo: {
    width: 80,
    height: 40,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  bellIcon: {
    width: 80,
    height: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 27,
    fontWeight: '250',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginBottom: 28,
    width: '100%',
    alignItems: 'center',
    elevation: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryLink: {
    color: '#000',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
