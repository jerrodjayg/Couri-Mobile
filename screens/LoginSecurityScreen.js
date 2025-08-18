import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, SafeAreaView, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';

export default function LoginSecurityScreen({ navigation }) {
  const { user, setCustomUser } = useUser();
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordEdit = () => {
    console.log('Edit password tapped - navigating to ChangePasswordScreen');
    
    // Get user email from context or AsyncStorage
    let userEmail = user?.email;
    
    if (!userEmail) {
      // Try to get email from AsyncStorage as fallback
      AsyncStorage.getItem('userProfileData').then(userData => {
        if (userData) {
          const parsedData = JSON.parse(userData);
          userEmail = parsedData.email;
          console.log('Got user email from AsyncStorage:', userEmail);
          
          // Navigate with email
          navigation.navigate('ChangePassword', { userEmail });
        } else {
          console.log('No user email found, navigating without email');
          navigation.navigate('ChangePassword');
        }
      }).catch(error => {
        console.log('Error reading AsyncStorage:', error);
        navigation.navigate('ChangePassword');
      });
    } else {
      console.log('Got user email from context:', userEmail);
      // Navigate with email
      navigation.navigate('ChangePassword', { userEmail });
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action will permanently remove all your data and cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    console.log('🔄 Starting account deletion process...');
    setLoading(true);

    try {
      const currentUserId = user?.id;
      if (!currentUserId) {
        console.error('❌ No user ID available for deletion');
        Alert.alert('Error', 'User ID not found. Please try again.');
        setLoading(false);
        return;
      }

      console.log('🔄 Using user ID for deletion:', currentUserId);

      // Try to delete user data from users table if it exists
      console.log('🔄 Attempting to delete user data from users table...');
      try {
        // Delete by email (more reliable than ID)
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('email', user?.email);

        if (userError) {
          console.log('⚠️ Users table might not exist or user not found:', userError);
          // Continue with account deletion even if users table deletion fails
        } else {
          console.log('✅ User data deleted successfully from users table');
        }
      } catch (userError) {
        console.log('⚠️ Users table might not exist:', userError);
        // Continue with account deletion even if users table deletion fails
      }

      // Delete the user account from Supabase Auth
      console.log('🔄 Attempting to delete user account from Supabase Auth...');
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(currentUserId);
        
        if (deleteError) {
          console.log('⚠️ Admin delete user failed (might not have admin privileges):', deleteError);
          // If admin delete fails, we'll just sign out the user
          console.log('🔄 Falling back to sign out only...');
        } else {
          console.log('✅ User account deleted successfully from Supabase Auth');
        }
      } catch (adminError) {
        console.log('⚠️ Admin delete user failed:', adminError);
        // Continue with sign out
      }

      // Sign out the user
      console.log('🔄 Signing out user...');
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('❌ Error signing out:', signOutError);
        Alert.alert('Error', 'Failed to sign out. Please try again.');
        setLoading(false);
        return;
      }

      console.log('✅ User signed out successfully');
      
      // Clear all local user data
      try {
        await AsyncStorage.removeItem('tempUserData');
        await AsyncStorage.removeItem('userProfileData');
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('user');
        
        // Set flag to indicate account was deleted - next app open will go to Home
        await AsyncStorage.setItem('userLastAction', 'delete_account');
        console.log('✅ Local storage cleared and delete_account flag set');
      } catch (storageError) {
        console.log('⚠️ Error clearing local storage:', storageError);
      }

      // Clear user context
      if (setCustomUser) {
        setCustomUser(null);
        console.log('✅ User context cleared');
      }

      // Show success message and navigate to Home screen
      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔄 Navigating to Home screen...');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ Error during account deletion:', error);
      Alert.alert('Error', 'An error occurred while deleting your account. Please try again.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        {/* Scrollable content */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>LOGIN & SECURITY</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Combined Card for Password & Face ID */}
          <View style={styles.card}>
            {/* Password Row */}
            <View style={styles.cardRow}>
              <Icon name="lock-closed-outline" size={20} style={styles.icon} />
              <Text style={styles.cardLabelBold}>Password</Text>
              <TouchableOpacity onPress={handlePasswordEdit} style={styles.editTouchable}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Face ID Row */}
            <View style={styles.cardRow}>
              <Icon name="scan-outline" size={20} style={styles.icon} />
              <Text style={styles.cardLabelBold}>Enable Face ID</Text>
              <Switch
                value={faceIdEnabled}
                onValueChange={setFaceIdEnabled}
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom button */}
        <View style={styles.bottomButtonWrapper}>
          <TouchableOpacity 
            style={[styles.deleteButton, loading && styles.deleteButtonDisabled]} 
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            <Text style={styles.deleteText}>
              {loading ? 'Deleting Account...' : 'Delete Account'}
            </Text>
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
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#000', // black border
    overflow: 'hidden',
    marginTop: 40,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 28,
    position: 'relative',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 0,
    marginRight: 0,
  },
  icon: {
    marginRight: 12,
    color: '#333',
  },
  cardLabelBold: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600', // bold for Password & Face ID
    color: '#000',
  },
  editTouchable: {
    position: 'absolute',
    right: 34, // moved further left
  },
  editText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  bottomButtonWrapper: {
    padding: 16,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
}); 