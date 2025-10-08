import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, SafeAreaView, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';

export default function LoginSecurityScreen({ navigation }) {
  const { user } = useUser();
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Create profiles table if it doesn't exist
  const createProfilesTable = async () => {
    try {
      console.log('🔄 Creating profiles table...');
      
      // Create the profiles table directly with SQL
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            full_name TEXT,
            phone TEXT,
            address1 TEXT,
            address2 TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            avatar_url TEXT DEFAULT '',
            is_google_auth BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create updated_at trigger if it doesn't exist
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ language 'plpgsql';
          
          DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
          CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `
      });
      
      if (error) {
        console.log('⚠️ Could not create table via RPC:', error);
        // Try alternative approach - just check if table exists
        const { error: checkError } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);
        
        if (checkError && checkError.code === '42P01') {
          console.log('🔄 Profiles table still does not exist after creation attempt');
          console.log('🔄 You may need to create the table manually in Supabase dashboard');
        } else {
          console.log('✅ Profiles table is accessible');
        }
      } else {
        console.log('✅ Profiles table created successfully');
      }
    } catch (error) {
      console.log('⚠️ Error creating profiles table:', error);
      console.log('🔄 You may need to create the table manually in Supabase dashboard');
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
        Alert.alert('Error', 'User not authenticated. Please try logging in again.');
        setLoading(false);
        return;
      }

      console.log('🔄 Using user ID for deletion:', currentUserId);

      // Delete user profile from profiles table
      console.log('🔄 Deleting user profile from profiles table...');
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', currentUserId);

        if (profileError) {
          if (profileError.code === '42P01') {
            console.log('⚠️ Profiles table does not exist, creating it first...');
            // Try to create the profiles table
            await createProfilesTable();
            // Retry the deletion
            const { error: retryError } = await supabase
              .from('profiles')
              .delete()
              .eq('id', currentUserId);
            if (retryError) {
              console.error('❌ Error deleting profile after table creation:', retryError);
            } else {
              console.log('✅ Profile data deleted successfully after table creation');
            }
          } else {
            console.error('❌ Error deleting profile:', profileError);
            Alert.alert('Error', 'Failed to delete profile data. Please try again.');
            setLoading(false);
            return;
          }
        } else {
          console.log('✅ Profile data deleted successfully');
        }
      } catch (profileError) {
        console.log('⚠️ Profiles table operation failed:', profileError);
      }

      // Try to delete from users table if it exists
      console.log('🔄 Attempting to delete user data from users table...');
      try {
        // First check if the users table exists and what the ID column type is
        const { data: tableInfo, error: tableError } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        if (tableError) {
          if (tableError.code === '42P01') {
            console.log('⚠️ Users table does not exist, creating it first...');
            // Try to create the users table
            await createUsersTable();
            // Retry the deletion
            const { error: retryError } = await supabase
              .from('users')
              .delete()
              .ilike('email', user?.email || 'unknown@email.com');
            if (retryError) {
              console.error('❌ Error deleting user after table creation:', retryError);
            } else {
              console.log('✅ User data deleted successfully after table creation');
            }
          } else {
            console.error('❌ Error checking users table:', tableError);
          }
        } else {
          // Try to delete by email instead of ID (more reliable)
          const { error: userError } = await supabase
            .from('users')
            .delete()
            .ilike('email', user?.email || 'unknown@email.com');

          if (userError) {
            console.error('❌ Error deleting user data:', userError);
          } else {
            console.log('✅ User data deleted successfully');
          }
        }
      } catch (userError) {
        console.log('⚠️ Users table operation failed:', userError);
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