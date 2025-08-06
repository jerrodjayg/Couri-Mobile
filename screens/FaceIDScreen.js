import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

// Import the logo image
import Logo from '../assets/Logo_Dark.png';

export default function FaceIDScreen({ navigation }) {
  const handleFaceIDAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert('Error', 'Biometric authentication is not available on this device.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate with Face ID or Touch ID',
      fallbackLabel: 'Enter passcode',
    });

    if (result.success) {
      Alert.alert('Success', 'Authentication successful!');
      // You can now navigate to the main app screen or perform a secure action
      navigation.navigate('Home'); // replace 'Home' with your intended screen
    } else {
      Alert.alert('Failed', 'Authentication failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image source={Logo} style={styles.logoImage} resizeMode="contain" />
      <Image
        source={require('../assets/face-id.png')}
        style={styles.faceIcon}
        resizeMode="contain"
      />
      <Text style={styles.title}>Login with Face ID</Text>
      <Text style={styles.subtitle}>
        Enabling Face ID allows you quick and secure access to your account.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleFaceIDAuth}>
        <Text style={styles.buttonText}>Allow Face ID access</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>Maybe later</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoImage: {
    width: 120,
    height: 40,
    marginBottom: 60,
  },
  faceIcon: {
    width: 60,
    height: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    marginBottom: 12,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  linkText: {
    color: '#000',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});