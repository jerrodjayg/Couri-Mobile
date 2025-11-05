import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import FacebookGraphService from '../utils/facebookGraphService';

export default function FacebookTestComponent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const handleFacebookLogin = async () => {
    try {
      console.log('🔐 Testing Facebook login...');
      
      const accessToken = await FacebookGraphService.getAccessToken();
      
      if (accessToken) {
        console.log('✅ Facebook login successful');
        setIsLoggedIn(true);
        
        // Get user info
        const info = await FacebookGraphService.getUserInfo();
        setUserInfo(info);
        
        Alert.alert('Success', 'Facebook login successful!');
      } else {
        Alert.alert('Error', 'Failed to login to Facebook');
      }
    } catch (error) {
      console.error('❌ Facebook login error:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleTestMarketplace = async () => {
    try {
      const testUrl = 'https://www.facebook.com/marketplace/item/123456789';
      const productData = await FacebookGraphService.extractProductDataFromUrl(testUrl);
      
      Alert.alert('Success', `Extracted: ${productData.productName}`);
    } catch (error) {
      console.error('❌ Marketplace test error:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Facebook Graph API Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleFacebookLogin}>
        <Text style={styles.buttonText}>
          {isLoggedIn ? 'Already Logged In' : 'Login to Facebook'}
        </Text>
      </TouchableOpacity>
      
      {isLoggedIn && (
        <TouchableOpacity style={styles.button} onPress={handleTestMarketplace}>
          <Text style={styles.buttonText}>Test Marketplace Extraction</Text>
        </TouchableOpacity>
      )}
      
      {userInfo && (
        <View style={styles.userInfo}>
          <Text style={styles.userText}>Logged in as: {userInfo.name}</Text>
          <Text style={styles.userText}>Email: {userInfo.email}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    backgroundColor: '#1877f2',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    width: '100%',
  },
  userText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
});
