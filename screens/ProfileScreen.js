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
import { supabase } from './supabaseClient';
import { UserService } from '../utils/userService';

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

  const [lastEditPressTime, setLastEditPressTime] = useState(0);

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
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        const userAddress = await AsyncStorage.getItem('userAddress');
        
        console.log('🔍 Profile - Raw AsyncStorage data:');
        console.log('🔍 Profile - tempUserData:', tempUserData);
        console.log('🔍 Profile - userProfileData:', userProfileData);
        console.log('🔍 Profile - userAddress:', userAddress);
        
        let mergedUserData = {};
        
        // Merge data from both sources, with userProfileData taking precedence
        if (userProfileData) {
          const parsedUserData = JSON.parse(userProfileData);
          console.log('✅ Profile - Found persistent user data in AsyncStorage:', parsedUserData);
          mergedUserData = { ...parsedUserData };
        }
        
        if (tempUserData) {
          const parsedData = JSON.parse(tempUserData);
          console.log('✅ Profile - Found temp user data in AsyncStorage:', parsedData);
          if (parsedData.userInitials && !userInitials) {
            setUserInitials(parsedData.userInitials);
          }
          
          // Merge tempUserData with existing merged data
          mergedUserData = { ...mergedUserData, ...parsedData };
        }
        
        console.log('🔍 Profile - Final mergedUserData after merging:', mergedUserData);

        // Load address data from the same source as ConfirmAddress and PersonalInfoScreen
        let addressData = null;
        let phoneNumber = '';
        
        // First, try to get phone number from mergedUserData (PersonalInfoScreen format)
        phoneNumber = mergedUserData.phone || mergedUserData.phoneNumber || '';
        console.log('🔍 Profile - Phone number found:', phoneNumber);
        console.log('🔍 Profile - mergedUserData keys:', Object.keys(mergedUserData));
        console.log('🔍 Profile - mergedUserData.address1:', mergedUserData.address1);
        console.log('🔍 Profile - mergedUserData.city:', mergedUserData.city);
        console.log('🔍 Profile - mergedUserData.state:', mergedUserData.state);
        console.log('🔍 Profile - mergedUserData.zip:', mergedUserData.zip);
        
        // Check if address data is stored in the same format as PersonalInfoScreen (this should be the primary source)
        if (mergedUserData.address1 && mergedUserData.city && mergedUserData.state && mergedUserData.zip) {
          addressData = {
            street: mergedUserData.address1,
            city: mergedUserData.city,
            state: mergedUserData.state,
            zipCode: mergedUserData.zip
          };
          console.log('✅ Profile - Address loaded from PersonalInfoScreen format:', addressData);
        } else if (mergedUserData.address_line_1 && mergedUserData.city && mergedUserData.state && mergedUserData.zip_code) {
          // Check for database format (address_line_1, zip_code)
          addressData = {
            street: mergedUserData.address_line_1,
            city: mergedUserData.city,
            state: mergedUserData.state,
            zipCode: mergedUserData.zip_code
          };
          console.log('✅ Profile - Address loaded from database format:', addressData);
        } else if (userAddress) {
          addressData = JSON.parse(userAddress);
          console.log('✅ Profile - Address loaded from AsyncStorage userAddress:', addressData);
        } else if (mergedUserData.address) {
          addressData = mergedUserData.address;
          console.log('✅ Profile - Address loaded from user profile address:', addressData);
        } else {
          // Only set default address if we have NO address data at all
          console.log('⚠️ Profile - No address data found anywhere, setting default');
          console.log('🔍 Profile - Available data in mergedUserData:', {
            address1: mergedUserData.address1,
            address_line_1: mergedUserData.address_line_1,
            city: mergedUserData.city,
            state: mergedUserData.state,
            zip: mergedUserData.zip,
            zip_code: mergedUserData.zip_code
          });
          // Don't auto-populate with hardcoded data - just show "Not provided"
          addressData = {
            street: '',
            city: '',
            state: '',
            zipCode: ''
          };
          console.log('✅ Profile - No address data available, will show "Not provided"');
        }
        
        // Update profile data with comprehensive user information including address
        setProfileData({
          firstName: mergedUserData.firstName || mergedUserData.first_name || '',
          lastName: mergedUserData.lastName || mergedUserData.last_name || '',
          name: mergedUserData.full_name || mergedUserData.name || `${mergedUserData.firstName || ''} ${mergedUserData.lastName || ''}`.trim(),
          phone: phoneNumber,
          email: mergedUserData.email || '',
          address1: addressData.street || '',
          address2: mergedUserData.address2 || '',
          city: addressData.city || '',
          state: addressData.state || '',
          zip: addressData.zipCode || '',
          fullAddress: `${addressData.street}, ${addressData.city}, ${addressData.state} ${addressData.zipCode}`,
        });
        
        // Always update userProfile with the merged data
        const avatarUrl = mergedUserData.avatar_url || mergedUserData.profileImageUri;
        setUserProfile({
          id: mergedUserData.id || 'temp_user',
          name: mergedUserData.name || mergedUserData.full_name || 'User',
          full_name: mergedUserData.full_name || mergedUserData.name || 'User',
          avatar_url: avatarUrl ? `${avatarUrl}?v=${Date.now()}` : '',
          email: mergedUserData.email
        });
        
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
        
        console.log('🔍 Profile - Final merged user data:', mergedUserData);
        console.log('🔍 Profile - Final profile data:', profileData);
        console.log('🔍 Profile - Address data:', addressData);
        console.log('🔍 Profile - Phone number loaded:', phoneNumber);
        console.log('🔍 Profile - Address1 from mergedUserData:', mergedUserData.address1);
        console.log('🔍 Profile - City from mergedUserData:', mergedUserData.city);
        console.log('🔍 Profile - State from mergedUserData:', mergedUserData.state);
        console.log('🔍 Profile - Zip from mergedUserData:', mergedUserData.zip);
        
      } catch (error) {
        console.log('⚠️ Error fetching user profile in ProfileScreen:', error);
      }
    };

    fetchUserProfile();
  }, [user, route?.params?.userData]);

  // Refresh profile picture when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshProfilePicture = async () => {
        try {
          console.log('🔄 ProfileScreen - Screen focused, refreshing profile picture');
          // Check for updated profile picture in both storage locations
          const tempUserData = await AsyncStorage.getItem('tempUserData');
          const userProfileData = await AsyncStorage.getItem('userProfileData');
          
          let mergedData = {};
          
          if (userProfileData) {
            mergedData = { ...JSON.parse(userProfileData) };
          }
          
          if (tempUserData) {
            const parsedTemp = JSON.parse(tempUserData);
            mergedData = { ...mergedData, ...parsedTemp };
          }
          
          const avatarUrl = mergedData.avatar_url || mergedData.profileImageUri;
          
          if (avatarUrl) {
            console.log('✅ ProfileScreen - Refreshing profile picture:', avatarUrl);
            setUserProfile(prev => ({
              ...prev,
              id: mergedData.id || prev?.id || 'temp_user',
              name: mergedData.name || mergedData.full_name || prev?.name || 'User',
              full_name: mergedData.full_name || mergedData.name || prev?.full_name || 'User',
              avatar_url: `${avatarUrl}?v=${Date.now()}`,
              email: mergedData.email || prev?.email
            }));
          }
        } catch (error) {
          console.log('⚠️ Error refreshing profile picture in ProfileScreen:', error);
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
    const currentTime = Date.now();
    
    // Prevent rapid button presses (debounce)
    if (currentTime - lastEditPressTime < 500) {
      console.log('Button pressed too quickly, ignoring');
      return;
    }
    
    console.log(`Edit ${field} pressed`);
    
    setLastEditPressTime(currentTime);
    
    // Navigate to dedicated edit screens
    switch (field) {
      case 'Name':
        navigation.navigate('EditName');
        break;
      case 'Phone':
        navigation.navigate('EditPhone');
        break;
      case 'Email':
        navigation.navigate('EditEmail');
        break;
      case 'Full Address':
        navigation.navigate('EditAddress');
        break;
      default:
        console.log('Unknown field:', field);
    }
  };


  // Debug function to update AsyncStorage with test data
  const handleDebugUpdate = async () => {
    try {
      console.log('🔧 Debug: Updating AsyncStorage with test data...');
      
      // Create test user data with phone and address
      const testUserData = {
        id: 156,
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone: '(555) 123-4567', // Test phone number
        address_line_1: '123 Test Street', // Test address
        address_line_2: '',
        city: 'Test City',
        state: 'CA',
        zip_code: '90210',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        avatar_url: '',
        avatar_path: null,
        auth_user_id: 'test-uuid-123',
        firstName: 'Test',
        lastName: 'User',
        address1: '123 Test Street', // PersonalInfoScreen format
        address2: '',
        zip: '90210',
        name: 'Test User',
        full_name: 'Test User',
        profileImageUri: '',
        isGoogleAuth: false
      };

      // Also create a minimal userProfileData version to test the merge logic
      const testUserProfileData = {
        id: 156,
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
        full_name: 'Test User',
        email: 'test@example.com',
        phone: '(555) 123-4567',
        address1: '123 Test Street',
        address2: '',
        city: 'Test City',
        state: 'CA',
        zip: '90210',
        address_line_1: '123 Test Street',
        address_line_2: '',
        zip_code: '90210',
        avatar_url: '',
        isGoogleAuth: false
      };

      // Update both AsyncStorage keys with test data
      await AsyncStorage.setItem('tempUserData', JSON.stringify(testUserData));
      await AsyncStorage.setItem('userProfileData', JSON.stringify(testUserProfileData));
      
      console.log('✅ Debug: AsyncStorage updated with test data');
      Alert.alert('Debug Update', 'AsyncStorage has been updated with test data. Please refresh the screen.');
      
      // Refresh the profile data
      const fetchUserProfile = async () => {
        try {
          // First check route params for user data with initials
          if (route?.params?.userData?.userInitials) {
            setUserInitials(route.params.userData.userInitials);
          }
          
          // Check AsyncStorage for comprehensive user data
          const tempUserData = await AsyncStorage.getItem('tempUserData');
          const userProfileData = await AsyncStorage.getItem('userProfileData');
          const userAddress = await AsyncStorage.getItem('userAddress');
          
          console.log('🔍 Profile - Raw AsyncStorage data after population:');
          console.log('🔍 Profile - tempUserData:', tempUserData);
          console.log('🔍 Profile - userProfileData:', userProfileData);
          console.log('🔍 Profile - userAddress:', userAddress);
          
          let mergedUserData = {};
          
          // Merge data from both sources, with userProfileData taking precedence
          if (userProfileData) {
            const parsedUserData = JSON.parse(userProfileData);
            console.log('✅ Profile - Found persistent user data in AsyncStorage:', parsedUserData);
            mergedUserData = { ...parsedUserData };
          }
          
          if (tempUserData) {
            const parsedData = JSON.parse(tempUserData);
            console.log('✅ Profile - Found temp user data in AsyncStorage:', parsedData);
            
            // Merge tempUserData with existing merged data
            mergedUserData = { ...mergedUserData, ...parsedData };
          }
          
          console.log('🔍 Profile - Final mergedUserData after merging:', mergedUserData);

          // Load address data from the same source as ConfirmAddress and PersonalInfoScreen
          let addressData = null;
          let phoneNumber = '';
          
          // First, try to get phone number from mergedUserData (PersonalInfoScreen format)
          phoneNumber = mergedUserData.phone || mergedUserData.phoneNumber || '';
          console.log('🔍 Profile - Phone number found:', phoneNumber);
          console.log('🔍 Profile - mergedUserData keys:', Object.keys(mergedUserData));
          console.log('🔍 Profile - mergedUserData.address1:', mergedUserData.address1);
          console.log('🔍 Profile - mergedUserData.city:', mergedUserData.city);
          console.log('🔍 Profile - mergedUserData.state:', mergedUserData.state);
          console.log('🔍 Profile - mergedUserData.zip:', mergedUserData.zip);
          
          // Check if address data is stored in the same format as PersonalInfoScreen (this should be the primary source)
          if (mergedUserData.address1 && mergedUserData.city && mergedUserData.state && mergedUserData.zip) {
            addressData = {
              street: mergedUserData.address1,
              city: mergedUserData.city,
              state: mergedUserData.state,
              zipCode: mergedUserData.zip
            };
            console.log('✅ Profile - Address loaded from PersonalInfoScreen format:', addressData);
          } else if (mergedUserData.address_line_1 && mergedUserData.city && mergedUserData.state && mergedUserData.zip_code) {
            // Check for database format (address_line_1, zip_code)
            addressData = {
              street: mergedUserData.address_line_1,
              city: mergedUserData.city,
              state: mergedUserData.state,
              zipCode: mergedUserData.zip_code
            };
            console.log('✅ Profile - Address loaded from database format:', addressData);
          } else {
            // Only set default address if we have NO address data at all
            console.log('⚠️ Profile - No address data found anywhere, setting default');
            console.log('🔍 Profile - Available data in mergedUserData:', {
              address1: mergedUserData.address1,
              address_line_1: mergedUserData.address_line_1,
              city: mergedUserData.city,
              state: mergedUserData.state,
              zip: mergedUserData.zip,
              zip_code: mergedUserData.zip_code
            });
            addressData = {
              street: '',
              city: '',
              state: '',
              zipCode: ''
            };
            console.log('✅ Profile - No address data available, will show "Not provided"');
          }
          
          // Update profile data with comprehensive user information including address
          setProfileData({
            firstName: mergedUserData.firstName || mergedUserData.first_name || '',
            lastName: mergedUserData.lastName || mergedUserData.last_name || '',
            name: mergedUserData.full_name || mergedUserData.name || `${mergedUserData.firstName || ''} ${mergedUserData.lastName || ''}`.trim(),
            phone: phoneNumber,
            email: mergedUserData.email || '',
            address1: addressData.street || '',
            address2: mergedUserData.address2 || '',
            city: addressData.city || '',
            state: addressData.state || '',
            zip: addressData.zipCode || '',
            fullAddress: addressData.street && addressData.city && addressData.state && addressData.zipCode 
              ? `${addressData.street}, ${addressData.city}, ${addressData.state} ${addressData.zipCode}`
              : 'Not provided',
          });
          
          // Update userProfile with profile picture if available
          // Show profile picture if it exists, regardless of hasSkippedPhoto status
          if (mergedUserData.avatar_url || mergedUserData.profileImageUri) {
            setUserProfile(prev => ({
              ...prev,
              id: mergedUserData.id || 'temp_user',
              name: mergedUserData.name || mergedUserData.full_name,
              full_name: mergedUserData.full_name || mergedUserData.name,
              avatar_url: mergedUserData.avatar_url || mergedUserData.profileImageUri,
              email: mergedUserData.email
            }));
          } else {
            // No profile picture available - show initials
            setUserProfile(prev => ({
              ...prev,
              id: mergedUserData.id || 'temp_user',
              name: mergedUserData.name || mergedUserData.full_name,
              full_name: mergedUserData.full_name || mergedUserData.name,
              avatar_url: '', // Force empty to show initials
              email: mergedUserData.email
            }));
          }
          
          console.log('🔍 Profile - Final merged user data:', mergedUserData);
          console.log('🔍 Profile - Final profile data:', profileData);
          console.log('🔍 Profile - Address data:', addressData);
          console.log('🔍 Profile - Phone number loaded:', phoneNumber);
          
        } catch (error) {
          console.log('⚠️ Error fetching user profile in ProfileScreen:', error);
        }
      };
      
      fetchUserProfile();
      
    } catch (error) {
      console.error('❌ Debug: Error updating AsyncStorage:', error);
      Alert.alert('Debug Error', 'Failed to update AsyncStorage: ' + error.message);
    }
  };

  // Debug function to show current AsyncStorage data
  const handleDebugShow = async () => {
    try {
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      const userProfileData = await AsyncStorage.getItem('userProfileData');
      const userAddress = await AsyncStorage.getItem('userAddress');
      
      console.log('🔍 Debug: Current AsyncStorage data:');
      console.log('tempUserData:', tempUserData);
      console.log('userProfileData:', userProfileData);
      console.log('userAddress:', userAddress);
      
      // Parse and show the actual data structure
      if (tempUserData) {
        const parsed = JSON.parse(tempUserData);
        console.log('🔍 Parsed tempUserData keys:', Object.keys(parsed));
        console.log('🔍 Parsed tempUserData phone:', parsed.phone);
        console.log('🔍 Parsed tempUserData address1:', parsed.address1);
        console.log('🔍 Parsed tempUserData city:', parsed.city);
        console.log('🔍 Parsed tempUserData state:', parsed.state);
        console.log('🔍 Parsed tempUserData zip:', parsed.zip);
      }
      
      if (userProfileData) {
        const parsed = JSON.parse(userProfileData);
        console.log('🔍 Parsed userProfileData keys:', Object.keys(parsed));
        console.log('🔍 Parsed userProfileData phone:', parsed.phone);
        console.log('🔍 Parsed userProfileData address1:', parsed.address1);
        console.log('🔍 Parsed userProfileData city:', parsed.city);
        console.log('🔍 Parsed userProfileData state:', parsed.state);
        console.log('🔍 Parsed userProfileData zip:', parsed.zip);
      }
      
      // Also check if there are any other relevant AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🔍 All AsyncStorage keys:', allKeys);
      
      // Check for any other user-related keys
      const userRelatedKeys = allKeys.filter(key => 
        key.includes('user') || key.includes('profile') || key.includes('temp')
      );
      console.log('🔍 User-related AsyncStorage keys:', userRelatedKeys);
      
      Alert.alert('Debug Info', 'Check console for current AsyncStorage data');
      
    } catch (error) {
      console.error('❌ Debug: Error reading AsyncStorage:', error);
      Alert.alert('Debug Error', 'Failed to read AsyncStorage: ' + error.message);
    }
  };

  // Function to manually populate AsyncStorage with test data
  const handlePopulateWithTestData = async () => {
    try {
      console.log('🔧 Populating AsyncStorage with test data...');
      
      // Test data for demonstration
      const testUserData = {
        id: 'test-uuid-123',
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
        full_name: 'Test User',
        email: 'test@example.com',
        phone: '(555) 123-4567',
        address1: '123 Test Street',
        address2: '',
        city: 'Test City',
        state: 'CA',
        zip: '90210',
        address_line_1: '123 Test Street',
        address_line_2: '',
        zip_code: '90210',
        avatar_url: '',
        isGoogleAuth: false
      };

      // Store in both AsyncStorage keys
      await AsyncStorage.setItem('tempUserData', JSON.stringify(testUserData));
      await AsyncStorage.setItem('userProfileData', JSON.stringify(testUserData));
      
      console.log('✅ AsyncStorage populated with test data:', testUserData);
      Alert.alert('Success', 'AsyncStorage has been populated with test data. Please refresh the screen.');
      
      // Refresh the profile data
      const fetchUserProfile = async () => {
        try {
          // Check AsyncStorage for comprehensive user data
          const tempUserData = await AsyncStorage.getItem('tempUserData');
          const userProfileData = await AsyncStorage.getItem('userProfileData');
          const userAddress = await AsyncStorage.getItem('userAddress');
          
          console.log('🔍 Profile - Raw AsyncStorage data after population:');
          console.log('🔍 Profile - tempUserData:', tempUserData);
          console.log('🔍 Profile - userProfileData:', userProfileData);
          console.log('🔍 Profile - userAddress:', userAddress);
          
          let mergedUserData = {};
          
          // Merge data from both sources, with userProfileData taking precedence
          if (userProfileData) {
            const parsedUserData = JSON.parse(userProfileData);
            console.log('✅ Profile - Found persistent user data in AsyncStorage:', parsedUserData);
            mergedUserData = { ...parsedUserData };
          }
          
          if (tempUserData) {
            const parsedData = JSON.parse(tempUserData);
            console.log('✅ Profile - Found temp user data in AsyncStorage:', parsedData);
            
            // Merge tempUserData with existing merged data
            mergedUserData = { ...mergedUserData, ...parsedData };
          }
          
          console.log('🔍 Profile - Final mergedUserData after merging:', mergedUserData);

          // Load address data from the same source as ConfirmAddress and PersonalInfoScreen
          let addressData = null;
          let phoneNumber = '';
          
          // First, try to get phone number from mergedUserData (PersonalInfoScreen format)
          phoneNumber = mergedUserData.phone || mergedUserData.phoneNumber || '';
          console.log('🔍 Profile - Phone number found:', phoneNumber);
          console.log('🔍 Profile - mergedUserData keys:', Object.keys(mergedUserData));
          console.log('🔍 Profile - mergedUserData.address1:', mergedUserData.address1);
          console.log('🔍 Profile - mergedUserData.city:', mergedUserData.city);
          console.log('🔍 Profile - mergedUserData.state:', mergedUserData.state);
          console.log('🔍 Profile - mergedUserData.zip:', mergedUserData.zip);
          
          // Check if address data is stored in the same format as PersonalInfoScreen (this should be the primary source)
          if (mergedUserData.address1 && mergedUserData.city && mergedUserData.state && mergedUserData.zip) {
            addressData = {
              street: mergedUserData.address1,
              city: mergedUserData.city,
              state: mergedUserData.state,
              zipCode: mergedUserData.zip
            };
            console.log('✅ Profile - Address loaded from PersonalInfoScreen format:', addressData);
          } else if (mergedUserData.address_line_1 && mergedUserData.city && mergedUserData.state && mergedUserData.zip_code) {
            // Check for database format (address_line_1, zip_code)
            addressData = {
              street: mergedUserData.address_line_1,
              city: mergedUserData.city,
              state: mergedUserData.state,
              zipCode: mergedUserData.zip_code
            };
            console.log('✅ Profile - Address loaded from database format:', addressData);
          } else if (userAddress) {
            addressData = JSON.parse(userAddress);
            console.log('✅ Profile - Address loaded from AsyncStorage userAddress:', addressData);
          } else if (mergedUserData.address) {
            addressData = mergedUserData.address;
            console.log('✅ Profile - Address loaded from user profile address:', addressData);
          } else {
            // Only set default address if we have NO address data at all
            console.log('⚠️ Profile - No address data found anywhere, setting default');
            console.log('🔍 Profile - Available data in mergedUserData:', {
              address1: mergedUserData.address1,
              address_line_1: mergedUserData.address_line_1,
              city: mergedUserData.city,
              state: mergedUserData.state,
              zip: mergedUserData.zip,
              zip_code: mergedUserData.zip_code
            });
            addressData = {
              street: '1234 Address Street',
              city: 'Richmond',
              state: 'VA',
              zipCode: '23220'
            };
            console.log('✅ Profile - Default address set:', addressData);
          }
          
          // Update profile data with comprehensive user information including address
          setProfileData({
            firstName: mergedUserData.firstName || mergedUserData.first_name || '',
            lastName: mergedUserData.lastName || mergedUserData.last_name || '',
            name: mergedUserData.full_name || mergedUserData.name || `${mergedUserData.firstName || ''} ${mergedUserData.lastName || ''}`.trim(),
            phone: phoneNumber,
            email: mergedUserData.email || '',
            address1: addressData.street || '',
            address2: mergedUserData.address2 || '',
            city: addressData.city || '',
            state: addressData.state || '',
            zip: addressData.zipCode || '',
            fullAddress: addressData.street && addressData.city && addressData.state && addressData.zipCode 
              ? `${addressData.street}, ${addressData.city}, ${addressData.state} ${addressData.zipCode}`
              : 'Not provided',
          });
          
          // Update userProfile with profile picture if available
          // Show profile picture if it exists, regardless of hasSkippedPhoto status
          if (mergedUserData.avatar_url || mergedUserData.profileImageUri) {
            setUserProfile(prev => ({
              ...prev,
              id: mergedUserData.id || 'temp_user',
              name: mergedUserData.name || mergedUserData.full_name,
              full_name: mergedUserData.full_name || mergedUserData.name,
              avatar_url: mergedUserData.avatar_url || mergedUserData.profileImageUri,
              email: mergedUserData.email
            }));
          } else {
            // No profile picture available - show initials
            setUserProfile(prev => ({
              ...prev,
              id: mergedUserData.id || 'temp_user',
              name: mergedUserData.name || mergedUserData.full_name,
              full_name: mergedUserData.full_name || mergedUserData.name,
              avatar_url: '', // Force empty to show initials
              email: mergedUserData.email
            }));
          }
          
          console.log('🔍 Profile - Final merged user data:', mergedUserData);
          console.log('🔍 Profile - Final profile data:', profileData);
          console.log('🔍 Profile - Address data:', addressData);
          console.log('🔍 Profile - Phone number loaded:', phoneNumber);
          
        } catch (error) {
          console.log('⚠️ Error fetching user profile in ProfileScreen:', error);
        }
      };
      
      fetchUserProfile();
      
    } catch (error) {
      console.error('❌ Error populating AsyncStorage:', error);
      Alert.alert('Error', 'Failed to populate AsyncStorage: ' + error.message);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image 
              source={require('../assets/backarrow.png')} 
              style={styles.backArrowImage}
            />
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
                {userProfile?.avatar_url && userProfile.avatar_url !== '' && !userProfile.avatar_url.includes('undefined') ? (
                  <Image 
                    source={{ uri: userProfile.avatar_url }} 
                    style={styles.profilePicture}
                    key={userProfile.avatar_url}
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
                  <Image 
                    source={require('../assets/camera.png')}
                    style={styles.cameraIcon}
                    resizeMode="contain"
                  />
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
    backgroundColor: '#fff',
  },
  backArrowImage: {
    width: Math.min(36, 32),
    height: Math.min(36, 32),
    resizeMode: 'contain',
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
    paddingTop: 10,
  },
  contentWrapper: {
    width: '100%',
    paddingHorizontal: Math.min(24, 20),
    paddingTop: 10,
    paddingBottom: Math.min(40, 30),
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
    width: '100%',
    marginBottom: 20,
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
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  cameraIcon: {
    width: Math.min(28, 26),
    height: Math.min(28, 26),
    zIndex: 11,
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
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
    fontWeight: 'bold'
  },
  infoValue: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'normal',
    flexWrap: 'wrap'
  },
  editButton: {
    backgroundColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: Math.min(16, 12),
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  editButtonText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
});
