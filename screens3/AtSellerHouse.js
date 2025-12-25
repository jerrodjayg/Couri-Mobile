import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function AtSellerHouse({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);

  // Get route parameters
  const {
    userProfile: routeUserProfile,
    productDetails,
    orderDetails,
  } = route.params || {};

  // Disable swipe back gesture
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        gestureEnabled: false,
      });
      
      return () => {
        navigation.getParent()?.setOptions({
          gestureEnabled: true,
        });
      };
    }, [navigation])
  );

  // Load user profile
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      // Try to get from route params first
      if (routeUserProfile) {
        setUserProfile(routeUserProfile);
        console.log('✅ AtSellerHouse - Loaded user profile from route params');
        return;
      }

      // Otherwise load from AsyncStorage
      const storedProfile = await AsyncStorage.getItem('userProfileData');
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      
      if (storedProfile || tempUserData) {
        const profileData = storedProfile ? JSON.parse(storedProfile) : {};
        const tempData = tempUserData ? JSON.parse(tempUserData) : {};
        const mergedProfile = { ...profileData, ...tempData };
        
        console.log('✅ AtSellerHouse - Loaded user profile from AsyncStorage:', mergedProfile);
        setUserProfile(mergedProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Get user initials for profile fallback
  const getUserInitials = () => {
    if (!userProfile) return 'U';
    const firstName = userProfile.firstName || userProfile.first_name || '';
    const lastName = userProfile.lastName || userProfile.last_name || '';
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return userProfile.email?.charAt(0)?.toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  // Get profile image
  const getProfileImage = () => {
    if (userProfile?.avatar_url || userProfile?.profileImageUri) {
      return userProfile.avatar_url || userProfile.profileImageUri;
    }
    return null;
  };

  // Handle I'm here button
  const handleImHere = () => {
    // Navigate to RetrieveFromSeller screen
    navigation.navigate('RetrieveFromSeller', {
      productDetails,
      orderDetails,
      userProfile,
    });
  };

  // Handle contact support
  const handleContactSupport = () => {
    navigation.navigate('Support');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image 
              source={require('../assets/backarrow1.png')} 
              style={styles.backArrowImage}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PICKUP</Text>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('MyAccount')}
          >
            {getProfileImage() ? (
              <Image
                source={{ uri: getProfileImage() }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileFallback}>
                <Text style={styles.profileInitials}>{getUserInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Glasses Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBox}>
            <Text style={styles.glassesIcon}>👓</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.arrivalLabel}>ARRIVAL</Text>
          <Text style={styles.title}>Park and head to the{'\n'}seller's front door</Text>
          <Text style={styles.description}>
            Once you're at their door, tap "I'm here" below and we'll notify them.
          </Text>

          {/* I'm here Button */}
          <TouchableOpacity 
            style={styles.hereButton}
            onPress={handleImHere}
          >
            <Text style={styles.hereButtonText}>I'm here</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.divider} />
          <Text style={styles.wrongText}>Did something go wrong?</Text>
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={handleContactSupport}
          >
            <Text style={styles.supportIcon}>🎧</Text>
            <Text style={styles.supportButtonText}>Contact support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  backArrowImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#000',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  iconContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  iconBox: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassesIcon: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  arrivalLabel: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: '#000',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 30,
  },
  hereButton: {
    backgroundColor: '#000',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  hereButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },
  wrongText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  supportIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  supportButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

