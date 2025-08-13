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
        
        // Check AsyncStorage for user data with initials
        const tempUserData = await AsyncStorage.getItem('tempUserData');
        if (tempUserData) {
          const parsedData = JSON.parse(tempUserData);
          if (parsedData.userInitials && !userInitials) {
            setUserInitials(parsedData.userInitials);
          }
          
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
        
        // First try to get user data from persistent AsyncStorage (from OAuth flow)
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        if (userProfileData) {
          const parsedUserData = JSON.parse(userProfileData);
          console.log('✅ MyAccount - Found persistent user data in AsyncStorage:', parsedUserData);
          
          setUserProfile({
            id: parsedUserData.id, // Add user ID
            name: parsedUserData.name,
            full_name: parsedUserData.full_name,
            avatar_url: parsedUserData.avatar_url,
            email: parsedUserData.email
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
          }
        }
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

  const handleLogOut = async () => {
    // Navigate back to home/login screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
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
    } else if (menuItem === 'Support') {
      console.log('Navigating to Support screen');
      navigation.navigate('Support');
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
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MY ACCOUNT</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Profile Section */}
          <TouchableOpacity style={styles.profileSection} onPress={handleViewProfile}>
            <View style={styles.profileInfo}>
              <View style={styles.profileImageContainer}>
                {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
                  <Image 
                    source={{ uri: userProfile.avatar_url }} 
                    style={styles.profileImage}
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
  backArrow: {
    fontSize: 24,
    color: '#000',
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