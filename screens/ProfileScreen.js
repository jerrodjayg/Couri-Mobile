import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { useFocusEffect } from '@react-navigation/native';

export default function ProfileScreen({ navigation, route }) {
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState(null);
  const [userInitials, setUserInitials] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    name: '',
    phone: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    fullAddress: '',
  });

  // Fetch user profile from AsyncStorage or context
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // First check route params for user data with initials
        if (route?.params?.userData?.userInitials) {
          setUserInitials(route.params.userData.userInitials);
        }
        
        // Check AsyncStorage for comprehensive user data
        const tempUserData = await AsyncStorage.getItem('tempUserData');
        if (tempUserData) {
          const parsedData = JSON.parse(tempUserData);
          if (parsedData.userInitials && !userInitials) {
            setUserInitials(parsedData.userInitials);
          }
          
          // Update profile data with comprehensive user information
          setProfileData({
            firstName: parsedData.firstName || parsedData.first_name || '',
            lastName: parsedData.lastName || parsedData.last_name || '',
            name: parsedData.full_name || parsedData.name || `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim(),
            phone: parsedData.phone || '',
            email: parsedData.email || '',
            address1: parsedData.address1 || '',
            address2: parsedData.address2 || '',
            city: parsedData.city || '',
            state: parsedData.state || '',
            zip: parsedData.zip || '',
            fullAddress: formatFullAddress(parsedData),
          });
          
          // Update userProfile with profile picture if available
          // BUT only if user didn't skip photo upload
          if (!parsedData.hasSkippedPhoto && (parsedData.avatar_url || parsedData.profileImageUri)) {
            setUserProfile(prev => ({
              ...prev,
              avatar_url: parsedData.avatar_url || parsedData.profileImageUri
            }));
          } else if (parsedData.hasSkippedPhoto) {
            // User explicitly skipped photo - show initials
            setUserProfile(prev => ({
              ...prev,
              avatar_url: '' // Force empty to show initials
            }));
          }
        }
        
        // Check for userProfileData (from OAuth flow)
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        if (userProfileData) {
          const parsedUserData = JSON.parse(userProfileData);
          console.log('✅ Profile - Found persistent user data in AsyncStorage:', parsedUserData);
          
          setUserProfile({
            id: parsedUserData.id,
            name: parsedUserData.name,
            full_name: parsedUserData.full_name,
            avatar_url: parsedUserData.avatar_url,
            email: parsedUserData.email
          });
          
          // Update profile data with OAuth user information
          setProfileData(prev => ({
            ...prev,
            name: parsedUserData.full_name || parsedUserData.name || prev.name,
            email: parsedUserData.email || prev.email,
          }));
        }
        
        // Fallback to user context if no AsyncStorage data
        if (user && !tempUserData && !userProfileData) {
          setUserProfile({
            id: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name,
            full_name: user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.avatar_url,
            email: user.email
          });
          
          setProfileData(prev => ({
            ...prev,
            name: user.user_metadata?.full_name || user.user_metadata?.name || prev.name,
            email: user.email || prev.email,
          }));
        }
      } catch (error) {
        console.log('⚠️ Error fetching user profile in ProfileScreen:', error);
      }
    };

    fetchUserProfile();
  }, [user, route?.params?.userData, userInitials]);

  // Refresh profile picture when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshProfilePicture = async () => {
        try {
          // Check for updated profile picture in tempUserData
          const tempUserData = await AsyncStorage.getItem('tempUserData');
          if (tempUserData) {
            const parsedData = JSON.parse(tempUserData);
            if (parsedData.avatar_url || parsedData.profileImageUri) {
              setUserProfile(prev => ({
                ...prev,
                avatar_url: parsedData.avatar_url || parsedData.profileImageUri
              }));
            }
          }
        } catch (error) {
          console.log('⚠️ Error refreshing profile picture:', error);
        }
      };

      refreshProfilePicture();
    }, [])
  );

  const formatFullAddress = (userData) => {
    const parts = [];
    if (userData.address1) parts.push(userData.address1);
    if (userData.address2) parts.push(userData.address2);
    if (userData.city) parts.push(userData.city);
    if (userData.state) parts.push(userData.state);
    if (userData.zip) parts.push(userData.zip);
    return parts.join(', ');
  };

  // Phone number formatting function (same as LogInScreen and CreateAccountScreen)
  const formatPhoneNumber = (text) => {
    if (!text) return 'Not provided';
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return text;
    if (match[2]) return `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
    return match[1];
  };

  const handleCameraPress = () => {
    // Navigate to photo upload screen
    // Use user ID from AsyncStorage data if available, otherwise fallback to user context
    const userId = userProfile?.id || user?.id;
    console.log('🔄 ProfileScreen - Navigating to UploadPhoto with userId:', userId);
    navigation.navigate('UploadPhoto', { userId: userId, fromProfile: true });
  };

  const getUserInitials = () => {
    // First check if we have stored initials from skipping photo upload
    if (userInitials) {
      return userInitials;
    }
    
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
    
    // Final fallback
    return 'U';
  };

  const handleEditPress = (field) => {
    // Placeholder for edit functionality
    console.log(`Edit ${field} pressed`);
    Alert.alert('Edit', `Edit ${field} functionality will be implemented here`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PROFILE</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={styles.contentWrapper}>
            {/* Profile Picture Section */}
            <View style={styles.profilePictureSection}>
              <View style={styles.profilePictureContainer}>
                {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
                  <Image 
                    source={{ uri: userProfile.avatar_url }} 
                    style={styles.profilePicture}
                  />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Text style={styles.profilePictureText}>
                      {getUserInitials()}
                    </Text>
                  </View>
                )}
                
                {/* Camera Button Overlay */}
                <TouchableOpacity style={styles.cameraButton} onPress={handleCameraPress}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Information Sections */}
            <View style={styles.infoContainer}>
              {/* Name Section */}
              <View style={styles.infoSection}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>
                    {profileData.name || `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || 'Not provided'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => handleEditPress('Name')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Phone Section */}
              <View style={styles.infoSection}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>
                    {formatPhoneNumber(profileData.phone)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => handleEditPress('Phone')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Email Section */}
              <View style={styles.infoSection}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>
                    {profileData.email || 'Not provided'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => handleEditPress('Email')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Full Address Section */}
              <View style={styles.infoSection}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Full Address</Text>
                  <Text style={styles.infoValue}>
                    {profileData.fullAddress || 'Not provided'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => handleEditPress('Full Address')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
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
    paddingHorizontal: Math.min(24, 20),
    paddingVertical: Math.min(16, 14),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backArrow: {
    fontSize: Math.min(24, 22),
    color: '#000',
  },
  headerTitle: {
    fontSize: Math.min(18, 16),
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%'
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Math.min(24, 20),
    paddingVertical: Math.min(40, 30),
    alignItems: 'center',
    justifyContent: 'center'
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: Math.min(40, 30),
    width: '100%',
    marginBottom: Math.min(40, 30)
  },
  profilePictureContainer: {
    position: 'relative',
    alignItems: 'center'
  },
  profilePicture: {
    width: Math.min(120, 100),
    height: Math.min(120, 100),
    borderRadius: Math.min(60, 50),
  },
  profilePicturePlaceholder: {
    width: Math.min(120, 100),
    height: Math.min(120, 100),
    borderRadius: Math.min(60, 50),
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  profilePictureText: {
    fontSize: Math.min(48, 40),
    fontWeight: 'bold',
    color: '#444444',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: Math.min(36, 32),
    height: Math.min(36, 32),
    borderRadius: Math.min(18, 16),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cameraIcon: {
    fontSize: Math.min(20, 18),
  },
  infoContainer: {
    paddingHorizontal: Math.min(24, 20),
    width: '100%',
    maxWidth: 400
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Math.min(20, 16),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    width: '100%'
  },
  infoContent: {
    flex: 1,
    marginRight: Math.min(16, 12)
  },
  infoLabel: {
    fontSize: Math.min(14, 13),
    color: '#666',
    marginBottom: 4,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: Math.min(16, 15),
    color: '#000',
    fontWeight: '500',
    flexWrap: 'wrap'
  },
  editButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: Math.min(16, 14),
    paddingVertical: Math.min(8, 6),
    borderRadius: 16,
    marginLeft: Math.min(16, 12),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  editButtonText: {
    fontSize: Math.min(14, 13),
    color: '#666',
    fontWeight: '500',
  },
});
