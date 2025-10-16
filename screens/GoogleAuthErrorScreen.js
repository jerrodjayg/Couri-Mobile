import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Image } from 'react-native';

export default function GoogleAuthErrorScreen({ navigation }) {
  const handleGoToLogin = () => {
    // Navigate back to the login screen
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.container}>
        {/* App Logo */}
        <Image 
          source={require('../assets/Logo_Dark.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        {/* Error Icon */}
        <View style={styles.errorIconContainer}>
          <Text style={styles.errorIcon}>!</Text>
        </View>
        
        {/* Error Heading */}
        <Text style={styles.errorHeading}>We couldn't create your account</Text>
        
        {/* Error Description */}
        <Text style={styles.errorDescription}>
          We weren't able to connect with Google. Try again, or try another method.
        </Text>
        
        {/* Go to Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleGoToLogin}>
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'white',
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 60,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  errorIcon: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  errorHeading: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
  },
  errorDescription: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  loginButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    minWidth: 200,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
});
