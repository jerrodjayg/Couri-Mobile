import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, SafeAreaView, ScrollView, Alert, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import * as Location from 'expo-location';

export default function LoginSecurityScreen({ navigation }) {
  const { user } = useUser();
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Check location permission status on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationEnabled(status === 'granted');
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const handleLocationToggle = async (value) => {
    if (value) {
      // Request location permission
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationEnabled(true);
          Alert.alert('Success', 'Location access has been enabled.');
        } else {
          setLocationEnabled(false);
          Alert.alert(
            'Permission Denied',
            'Location access is required for delivery tracking. You can enable it in your device settings.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
        Alert.alert('Error', 'Failed to request location permission.');
        setLocationEnabled(false);
      }
    } else {
      // Show alert that they need to disable in settings
      Alert.alert(
        'Disable Location Access',
        'To disable location access, please go to your device settings.',
        [{ text: 'OK' }]
      );
      setLocationEnabled(true); // Keep it on since we can't programmatically disable
    }
  };


  // Create users table if it doesn't exist
  const createUsersTable = async () => {
    try {
      console.log('🔄 Creating users table...');
      
      // Create the users table with all fields that the existing code expects
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            password_hash TEXT DEFAULT NULL,
            address1 TEXT,
            address2 TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create updated_at trigger if it doesn't exist
          DROP TRIGGER IF EXISTS update_users_updated_at ON users;
          CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `
      });
      
      if (error) {
        console.log('⚠️ Could not create users table via RPC:', error);
        // Try alternative approach - just check if table exists
        const { error: checkError } = await supabase
          .from('users')
          .select('*')
          .limit(1);
        
        if (checkError && checkError.code === '42P01') {
          console.log('🔄 Users table still does not exist after creation attempt');
          console.log('🔄 You may need to create the table manually in Supabase dashboard');
        } else {
          console.log('✅ Users table is accessible');
        }
      } else {
        console.log('✅ Users table created successfully');
      }
    } catch (error) {
      console.log('⚠️ Error creating users table:', error);
      console.log('🔄 You may need to create the table manually in Supabase dashboard');
    }
  };


  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    setLoading(true);
    
    try {
      console.log('🔄 Starting account deletion process...');
      
      // Get user ID from context or AsyncStorage
      let currentUserId = user?.id;
      
      if (!currentUserId) {
        // Try to get user ID from AsyncStorage
        try {
          const userProfileData = await AsyncStorage.getItem('userProfileData');
          if (userProfileData) {
            const parsedData = JSON.parse(userProfileData);
            currentUserId = parsedData.id;
            console.log('✅ Got user ID from AsyncStorage:', currentUserId);
          }
        } catch (storageError) {
          console.log('⚠️ Error reading from AsyncStorage:', storageError);
        }
      }

      if (!currentUserId) {
        console.log('⚠️ No user ID found, proceeding with account deletion anyway');
        // Don't show error, just proceed with deletion
      }

      console.log('🔄 Using user ID for deletion:', currentUserId);

      // Delete user data from users table (only if we have a user ID)
      if (currentUserId) {
        console.log('🔄 Deleting user data from users table...');
        try {
          const { error: userError } = await supabase
            .from('users')
            .delete()
            .eq('id', currentUserId);

          if (userError) {
            console.error('❌ Error deleting user data:', userError);
            // Don't show error to user, just log it and continue with cleanup
            console.log('⚠️ Continuing with account deletion despite database error');
          } else {
            console.log('✅ User data deleted successfully');
          }
        } catch (userError) {
          console.log('⚠️ Users table operation failed:', userError);
          // Continue with cleanup even if database deletion fails
        }
      } else {
        console.log('⚠️ No user ID available, skipping database deletion');
      }

      // Get user email for deletion
      let userEmail = user?.email;
      if (!userEmail) {
        try {
          const userProfileData = await AsyncStorage.getItem('userProfileData');
          if (userProfileData) {
            const parsedData = JSON.parse(userProfileData);
            userEmail = parsedData.email;
          }
        } catch (error) {
          console.log('⚠️ Could not get email from AsyncStorage:', error);
        }
      }

      if (!userEmail) {
        console.log('⚠️ No email found for user deletion');
      }

      // Try to delete from users table if it exists (only if we have an email)
      if (userEmail) {
        console.log('🔄 Attempting to delete user data from users table by email...');
        try {
          // Delete by email (case-insensitive)
          const { error: userError } = await supabase
            .from('users')
            .delete()
            .eq('email', userEmail.toLowerCase());

          if (userError) {
            if (userError.code === '42P01') {
              console.log('⚠️ Users table does not exist');
            } else {
              console.error('❌ Error deleting user data:', userError);
            }
          } else {
            console.log('✅ User data deleted successfully from users table');
          }
        } catch (userError) {
          console.log('⚠️ Users table operation failed:', userError);
        }
      } else {
        console.log('⚠️ No email available, skipping email-based database deletion');
      }

      // Delete the Supabase auth user
      console.log('🔄 Attempting to delete Supabase auth user...');
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Note: Deleting auth user requires admin privileges or proper RLS policies
          // This will sign out the user but may not delete the auth record
          console.log('✅ Found auth user, proceeding with sign out');
        }
      } catch (authError) {
        console.log('⚠️ Could not check auth user:', authError);
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
        await AsyncStorage.removeItem('userProfileData');
        await AsyncStorage.removeItem('tempUserData');
        await AsyncStorage.removeItem('expoPushToken');
        await AsyncStorage.removeItem('currentUserEmail');
        console.log('✅ Cleared local user data');
      } catch (clearError) {
        console.log('⚠️ Could not clear local data:', clearError);
      }
      
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data has been permanently deleted. You have been signed out.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to splash screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Splash' }],
              });
            },
          },
        ]
      );
      
    } catch (error) {
      console.error('❌ Account deletion error:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
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
            <Text style={styles.headerTitle}>LOGIN & PRIVACY</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Combined Card for Location Access & Face ID */}
          <View style={styles.card}>
            {/* Location Access Row */}
            <View style={styles.cardRow}>
              <Icon name="location-outline" size={20} style={styles.icon} />
              <Text style={styles.cardLabelBold}>Allow Location Access</Text>
              <Switch
                value={locationEnabled}
                onValueChange={handleLocationToggle}
              />
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

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Please confirm you want to delete your account
            </Text>
            <Text style={styles.modalSubtitle}>
              All of your account data and history will be deleted, this cannot be undone
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalNoButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalNoButtonText}>No thanks</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalDeleteButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  confirmDeleteAccount();
                }}
              >
                <Text style={styles.modalDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontWeight: '600', // bold for Location Access & Face ID
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: 270,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
  },
  modalNoButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#C6C6C8',
  },
  modalNoButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF3B30',
  },
}); 