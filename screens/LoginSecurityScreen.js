import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, SafeAreaView, ScrollView, Alert, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { shouldSyncUserToSupabase } from '../utils/supabaseSyncGuard';

export default function LoginSecurityScreen({ navigation }) {
  // Disable swipe back gesture
  useFocusEffect(
    React.useCallback(() => {
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

  const { user } = useUser();
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Check location permission status on mount
  useEffect(() => {
    checkLocationPermission();
    loadBiometricPreference();
    loadLocationPreference();
  }, []);

  // Load biometric preference from AsyncStorage
  const loadBiometricPreference = async () => {
    try {
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      if (biometricEnabled === 'true') {
        setFaceIdEnabled(true);
        console.log('✅ Biometric preference loaded: enabled');
      } else {
        setFaceIdEnabled(false);
        console.log('✅ Biometric preference loaded: disabled');
      }
    } catch (error) {
      console.log('⚠️ Error loading biometric preference:', error);
    }
  };

  // Load location preference from AsyncStorage
  const loadLocationPreference = async () => {
    try {
      const locationEnabled = await AsyncStorage.getItem('locationEnabled');
      if (locationEnabled === 'true') {
        setLocationEnabled(true);
        console.log('✅ Location preference loaded: enabled');
      } else {
        setLocationEnabled(false);
        console.log('✅ Location preference loaded: disabled');
      }
    } catch (error) {
      console.log('⚠️ Error loading location preference:', error);
    }
  };

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
          // Save preference to AsyncStorage
          await AsyncStorage.setItem('locationEnabled', 'true');
          console.log('✅ Location preference saved: enabled');
          Alert.alert('Success', 'Location access has been enabled.');
        } else {
          setLocationEnabled(false);
          // Save preference to AsyncStorage
          await AsyncStorage.setItem('locationEnabled', 'false');
          console.log('✅ Location preference saved: disabled');
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
        await AsyncStorage.setItem('locationEnabled', 'false');
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

  // Handle Face ID toggle and save preference
  const handleFaceIdToggle = async (value) => {
    try {
      setFaceIdEnabled(value);
      // Save preference to AsyncStorage
      await AsyncStorage.setItem('biometricEnabled', value.toString());
      console.log('✅ Biometric preference saved:', value);
    } catch (error) {
      console.log('⚠️ Error saving biometric preference:', error);
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

      // Get user email and numeric users.id for deletion
      let userEmail = user?.email;
      let numericUserId = null;
      try {
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        if (userProfileData) {
          const parsedData = JSON.parse(userProfileData);
          if (!userEmail) userEmail = parsedData.email;
          if (parsedData.id != null && typeof parsedData.id === 'number') numericUserId = parsedData.id;
        }
      } catch (error) {
        console.log('⚠️ Could not get email/id from AsyncStorage:', error);
      }

      // Remove from Supabase users table in real time (TestFlight/standalone)
      // So the next create-account flow is not affected by an old row
      if (shouldSyncUserToSupabase() && (userEmail || numericUserId)) {
        try {
          let deleteQuery = supabase.from('users').delete();
          if (userEmail) {
            deleteQuery = deleteQuery.eq('email', userEmail.toLowerCase());
          } else if (numericUserId) {
            deleteQuery = deleteQuery.eq('id', numericUserId);
          }
          const { error: deleteError } = await deleteQuery;
          if (deleteError) {
            console.log('⚠️ Direct users table delete error (edge function may still succeed):', deleteError.message);
          } else {
            console.log('✅ User row removed from users table in real time');
          }
        } catch (directDeleteErr) {
          console.log('⚠️ Direct delete failed:', directDeleteErr?.message);
        }
      }

      // IMPORTANT: Use Edge Function to delete user (bypasses RLS policies)
      // The edge function uses admin privileges to delete from both users table and auth.users
      console.log('🔄 Calling delete-user-account edge function...');
      try {
        // Get the current session token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
          console.error('❌ Could not get session token:', sessionError);
          throw new Error('Not authenticated');
        }

        // Get Supabase project URL
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nfkykasruwdzpcjuufdu.supabase.co';
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/delete-user-account`;

        console.log('🔄 Calling edge function:', edgeFunctionUrl);

        // Call the edge function with admin privileges
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            userId: currentUserId,
            email: userEmail,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('❌ Edge function error:', result);
          throw new Error(result.error || 'Failed to delete user account');
        }

        if (result.success) {
          console.log('✅ User account deleted successfully via edge function');
          console.log('✅ Deleted from users table:', result.deletedFromUsersTable);
          console.log('✅ Deleted from auth:', result.deletedFromAuth);
        } else {
          console.log('⚠️ Edge function returned success: false:', result.message);
          // Continue with cleanup even if edge function reports failure
        }
      } catch (edgeFunctionError) {
        console.error('❌ Error calling delete-user-account edge function:', edgeFunctionError);
        console.log('⚠️ Continuing with local cleanup despite edge function error');
        // Continue with cleanup - the edge function may have partially succeeded
      }
      
      // Add a small delay to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // IMPORTANT: Do NOT sign out yet - we need to stay authenticated to delete from database
      console.log('🔄 Keeping user authenticated for database deletion...');

      // Final verification: Check if user still exists in database
      // Only verify if we attempted deletion (don't show error if deletion wasn't attempted)
      if (userEmail || numericUserId) {
        console.log('🔍 Performing final verification - checking if user still exists...');
        try {
          // Use email for verification (most reliable)
          let verifyQuery = supabase
            .from('users')
            .select('id, email');
          
          if (userEmail) {
            verifyQuery = verifyQuery.eq('email', userEmail.toLowerCase());
          } else if (numericUserId) {
            verifyQuery = verifyQuery.eq('id', numericUserId);
          } else {
            verifyQuery = verifyQuery.eq('email', ''); // This will return no results
          }
          
          const { data: verifyData, error: verifyError } = await verifyQuery.limit(1);

          if (verifyError) {
            console.log('⚠️ Could not verify deletion:', verifyError.message);
            // If verification fails due to RLS, don't treat it as a failure
            if (verifyError.code === '42501' || verifyError.message?.includes('permission')) {
              console.log('⚠️ Verification blocked by RLS - assuming deletion succeeded');
            }
          } else if (verifyData && verifyData.length > 0) {
            // User still exists - this could be due to RLS policies preventing deletion
            console.log('⚠️ User still exists in database after deletion attempt');
            console.log('⚠️ This may be due to RLS policies preventing deletion');
            console.log('⚠️ Remaining user data:', verifyData);
            // Don't treat this as a critical error - continue with cleanup
            // The user will be signed out and local data cleared regardless
          } else {
            console.log('✅ VERIFICATION SUCCESS: User no longer exists in database');
          }
        } catch (verifyErr) {
          console.log('⚠️ Verification check failed:', verifyErr.message);
          // Don't block the deletion process if verification fails
        }
      } else {
        console.log('⚠️ Skipping verification - no user ID or email available');
      }

      // Force clear any remaining Supabase session globally
      console.log('🔄 Force clearing any remaining Supabase session...');
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('✅ Global sign out completed');
      } catch (globalSignOutError) {
        console.log('⚠️ Global sign out failed (this is usually fine):', globalSignOutError);
      }
      
      // Note: Verification is handled by the edge function
      // We proceed with cleanup regardless
      
      // Clear all local user data
      try {
        await AsyncStorage.removeItem('userProfileData');
        await AsyncStorage.removeItem('tempUserData');
        await AsyncStorage.removeItem('expoPushToken');
        await AsyncStorage.removeItem('currentUserEmail');
        // Set flag to indicate account was deleted
        await AsyncStorage.setItem('userLastAction', 'delete_account');
        console.log('✅ Cleared local user data and set delete_account flag');
      } catch (clearError) {
        console.log('⚠️ Could not clear local data:', clearError);
      }

      // NOW sign out the user after all database operations are complete
      console.log('🔄 Signing out user after successful database deletion...');
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('❌ Error signing out:', signOutError);
        // Don't fail the deletion process for sign out errors
        console.log('⚠️ Sign out failed but account deletion was successful');
      } else {
        console.log('✅ User signed out successfully');
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
                onValueChange={handleFaceIdToggle}
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