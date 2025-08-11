import React, { useState, useEffect } from 'react';
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

export default function ProfileScreen({ navigation }) {
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState(null);
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  // Fetch user profile from AsyncStorage or context
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // First try to get user data from persistent AsyncStorage (from OAuth flow)
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        if (userProfileData) {
          const parsedUserData = JSON.parse(userProfileData);
          console.log('✅ Profile - Found persistent user data in AsyncStorage:', parsedUserData);
          
          setUserProfile({
            id: parsedUserData.id, // Add user ID
            name: parsedUserData.name,
            full_name: parsedUserData.full_name,
            avatar_url: parsedUserData.avatar_url,
            email: parsedUserData.email
          });
          
          // Update profile data with real user information
          setProfileData({
            name: parsedUserData.full_name || parsedUserData.name || '',
            phone: '', // Leave blank as we don't have phone from OAuth
            email: parsedUserData.email || '',
            address: '', // Leave blank as we don't have address from OAuth
          });
        } else {
          // Fallback to user context
          if (user) {
            setUserProfile({
              id: user.id, // Add user ID
              name: user.user_metadata?.name || user.user_metadata?.full_name,
              full_name: user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url,
              email: user.email
            });
            
            setProfileData({
              name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              phone: '', // Leave blank as we don't have phone from OAuth
              email: user.email || '',
              address: '', // Leave blank as we don't have address from OAuth
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching user profile in ProfileScreen:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleCameraPress = () => {
    // Navigate to photo upload screen
    // Use user ID from AsyncStorage data if available, otherwise fallback to user context
    const userId = userProfile?.id || user?.id;
    console.log('🔄 ProfileScreen - Navigating to UploadPhoto with userId:', userId);
    navigation.navigate('UploadPhoto', { userId: userId, fromProfile: true });
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
                {userProfile?.avatar_url ? (
                  <Image 
                    source={{ uri: userProfile.avatar_url }} 
                    style={styles.profilePicture}
                  />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Text style={styles.profilePictureText}>
                      {userProfile?.full_name?.charAt(0) || userProfile?.name?.charAt(0) || 'U'}
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
                    {profileData.name || 'Not provided'}
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
                    {profileData.phone || 'Not provided'}
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

              {/* Home Address Section */}
              <View style={styles.infoSection}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Home Address</Text>
                  <Text style={styles.infoValue}>
                    {profileData.address || 'Not provided'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => handleEditPress('Home Address')}
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
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  profilePictureText: {
    fontSize: Math.min(48, 40),
    fontWeight: 'bold',
    color: '#666',
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