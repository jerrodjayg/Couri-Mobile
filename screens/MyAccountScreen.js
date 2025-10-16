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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from './supabaseClient';

export default function MyAccountScreen({ navigation, route }) {
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState(null);
  const [userInitials, setUserInitials] = useState(null);

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
        
        let mergedUserData = {};
        
        // Merge data from both sources, with userProfileData taking precedence
        if (userProfileData) {
          const parsedUserData = JSON.parse(userProfileData);
          console.log('✅ MyAccount - Found persistent user data in AsyncStorage:', parsedUserData);
          mergedUserData = { ...parsedUserData };
        }
        
        if (tempUserData) {
          const parsedData = JSON.parse(tempUserData);
          if (parsedData.userInitials && !userInitials) {
            setUserInitials(parsedData.userInitials);
          }
          
          // Merge tempUserData with existing merged data
          mergedUserData = { ...mergedUserData, ...parsedData };
        }
        
        // Always update userProfile with the merged data
        const avatarUrl = mergedUserData.avatar_url || mergedUserData.profileImageUri;
        setUserProfile({
          id: mergedUserData.id || 'temp_user',
          name: mergedUserData.name || mergedUserData.full_name || mergedUserData.firstName || 'User',
          full_name: mergedUserData.full_name || mergedUserData.name || `${mergedUserData.firstName || ''} ${mergedUserData.lastName || ''}`.trim(),
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
        }
        
        console.log('🔍 MyAccount - Final merged user data:', mergedUserData);
        console.log('🔍 MyAccount - Final user profile:', userProfile);
        
      } catch (error) {
        console.log('⚠️ Error fetching user profile in MyAccount:', error);
      }
    };

    fetchUserProfile();
  }, [user, route?.params?.userData, userInitials]);

  // Refresh profile picture when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshProfilePicture = async () => {
        try {
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
            console.log('✅ MyAccount - Refreshing profile picture:', avatarUrl);
            setUserProfile(prev => ({
              ...prev,
              id: mergedData.id || prev?.id || 'temp_user',
              name: mergedData.name || mergedData.full_name || mergedData.firstName || prev?.name || 'User',
              full_name: mergedData.full_name || mergedData.name || prev?.full_name || 'User',
              avatar_url: `${avatarUrl}?v=${Date.now()}`,
              email: mergedData.email || prev?.email
            }));
          }
        } catch (error) {
          console.log('⚠️ Error refreshing profile picture:', error);
        }
      };

      refreshProfilePicture();
    }, [])
  );

  const handleLogOut = async () => {
    try {
      // Sign out from Supabase but preserve user data in AsyncStorage
      await supabase.auth.signOut();
      
      // Set flag to indicate user logged out (but keep data)
      await AsyncStorage.setItem('userLastAction', 'sign_out');
      
      // Navigate back to home screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still navigate even if logout fails
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  };

  const handleViewProfile = () => {
    // Pass user data including initials to Profile screen
    const userDataToPass = {
      ...route?.params?.userData,
      userInitials: getUserInitials(),
    };
    navigation.navigate('Profile', { userData: userDataToPass });
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

  const handleMenuPress = (menuItem) => {
    console.log(`Menu item pressed: ${menuItem}`);
    
    // Handle specific menu items
    if (menuItem === 'Login & Security') {
      console.log('Navigating to LoginSecurity screen');
      navigation.navigate('LoginSecurity');
    } else if (menuItem === 'Banks & Cards') {
      console.log('Navigating to BankInfo screen');
      navigation.navigate('BankInfo');
    } else if (menuItem === 'Transactions') {
      console.log('Navigating to Transactions screen');
      navigation.navigate('Transactions');
    } else if (menuItem === 'Chat History') {
      console.log('Navigating to ChatHistory screen');
      navigation.navigate('ChatHistory');
    } else if (menuItem === 'Notification Settings') {
      console.log('Navigating to Notification screen');
      navigation.navigate('Notification');
    } else if (menuItem === 'Support') {
      console.log('Navigating to Support screen');
      navigation.navigate('Support');
    } else if (menuItem === 'Legal') {
      console.log('Navigating to Legal screen');
      navigation.navigate('Legal');
    } else {
      // Placeholder for other menu items
      console.log(`Pressed: ${menuItem} - no navigation implemented yet`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image 
              source={require('../assets/backarrow.png')} 
              style={styles.backArrowImage}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MY ACCOUNT</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Profile Section */}
          <TouchableOpacity style={styles.profileSection} onPress={handleViewProfile}>
            <View style={styles.profileInfo}>
              <View style={styles.profileImageContainer}>
                {userProfile?.avatar_url && userProfile.avatar_url !== '' && !userProfile.avatar_url.includes('undefined') ? (
                  <Image 
                    source={{ uri: userProfile.avatar_url }} 
                    style={styles.profileImage}
                    key={userProfile.avatar_url}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileImageText}>
                      {getUserInitials()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.profileText}>
                <Text style={styles.userName}>
                  {userProfile?.full_name || userProfile?.name || 'User Name'}
                </Text>
                <Text style={styles.viewProfileText}>View profile</Text>
              </View>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleMenuPress('Login & Security')}
            >
              <View style={styles.menuIcon}>
                <Image 
                  source={require('../assets/lock.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.menuText}>Login & Security</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleMenuPress('Banks & Cards')}
            >
              <View style={styles.menuIcon}>
                <Image 
                  source={require('../assets/bank.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.menuText}>Banks & Cards</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleMenuPress('Transactions')}
            >
              <View style={styles.menuIcon}>
                <Image 
                  source={require('../assets/transaction.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.menuText}>Transactions</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleMenuPress('Chat History')}
            >
              <View style={styles.menuIcon}>
                <Image 
                  source={require('../assets/chat.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.menuText}>Chat History</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleMenuPress('Notification Settings')}
            >
              <View style={styles.menuIcon}>
                <Image 
                  source={require('../assets/notification.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.menuText}>Notification Settings</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleMenuPress('Support')}
            >
              <View style={styles.menuIcon}>
                <Image 
                  source={require('../assets/support.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.menuText}>Support</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleMenuPress('Legal')}
            >
              <View style={styles.menuIcon}>
                <Image 
                  source={require('../assets/legal.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.menuText}>Legal</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Log Out Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.logOutButton} onPress={handleLogOut}>
            <Text style={styles.logOutText}>Log Out</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  content: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#000',
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#444444',
  },
  profileText: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  viewProfileText: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    fontSize: 18,
    color: '#666',
  },
  menuContainer: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  menuArrow: {
    fontSize: 16,
    color: '#666',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logOutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
}); 