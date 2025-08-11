import React, { useState } from 'react';
import {
 View,
 Text,
 StyleSheet,
 TouchableOpacity,
 SafeAreaView,
 StatusBar,
 Alert,
 ScrollView,
} from 'react-native';
import { useUser } from '../contexts/UserContext';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginSecurityScreen({ navigation }) {
 const { user } = useUser();
 const [loading, setLoading] = useState(false);

 const handleDeleteAccount = () => {
 Alert.alert(
 'Delete Account Data',
 'Are you sure you want to delete your profile data? This action will remove your data from the database and sign you out.',
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
 
 // Get user ID from AsyncStorage since user context might be null
 let currentUserId = user?.id;
 
 if (!currentUserId) {
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

 // Try to delete user profile from profiles table (if it exists)
 console.log('🔄 Attempting to delete user profile...');
 try {
 const { error: profileError } = await supabase
 .from('profiles')
 .delete()
 .eq('id', currentUserId);

 if (profileError) {
 if (profileError.code === '42P01') {
 console.log('⚠️ Profiles table does not exist, skipping profile deletion');
 } else {
 console.error('❌ Error deleting profile:', profileError);
 // Don't return here, continue with other cleanup
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
 const { error: userError } = await supabase
 .from('users')
 .delete()
 .eq('id', currentUserId);

 if (userError) {
 if (userError.code === '42P01') {
 console.log('⚠️ Users table does not exist, skipping user deletion');
 } else {
 console.error('❌ Error deleting user data:', userError);
 }
 } else {
 console.log('✅ User data deleted successfully');
 }
 } catch (userError) {
 console.log('⚠️ Users table operation failed:', userError);
 }
 
 // Delete the actual Supabase auth user
 console.log('🔄 Deleting Supabase auth user...');
 try {
 const { error: authDeleteError } = await supabase.auth.admin.deleteUser(currentUserId);
 if (authDeleteError) {
 console.log('⚠️ Could not delete auth user (may require admin privileges):', authDeleteError);
 } else {
 console.log('✅ Supabase auth user deleted successfully');
 }
 } catch (authError) {
 console.log('⚠️ Auth user deletion failed:', authError);
 }
 
 console.log('🔄 Signing out user...');
 
 // Sign out the user
 const { error: signOutError } = await supabase.auth.signOut();
 
 if (signOutError) {
 console.error('❌ Error signing out:', signOutError);
 Alert.alert('Error', 'Failed to sign out. Please try again.');
 return;
 }

 console.log('✅ User signed out successfully');
 
 // Clear all local user data
 try {
 await AsyncStorage.removeItem('userProfileData');
 await AsyncStorage.removeItem('tempUserData');
 console.log('✅ Cleared local user data');
 } catch (clearError) {
 console.log('⚠️ Could not clear local data:', clearError);
 }
 
 Alert.alert(
 'Account Data Deleted',
 'Your local profile data has been cleared and you have been signed out. To completely delete your account, please contact support.',
 [
 {
 text: 'OK',
 onPress: () => {
 navigation.reset({
 index: 0,
 routes: [{ name: 'SplashScreen' }],
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
 <StatusBar barStyle="dark-content" backgroundColor="#fff" />
 
 <View style={styles.container}>
 {/* Header */}
 <View style={styles.header}>
 <TouchableOpacity onPress={() => navigation.goBack()}>
 <Text style={styles.backArrow}>←</Text>
 </TouchableOpacity>
 <Text style={styles.headerTitle}>LOGIN & SECURITY</Text>
 <View style={{ width: 24 }} />
 </View>

 <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
 {/* Account Information */}
 <View style={styles.section}>
 <Text style={styles.sectionTitle}>Account Information</Text>
 <View style={styles.infoItem}>
 <Text style={styles.infoLabel}>Email</Text>
 <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
 </View>
 <View style={styles.infoItem}>
 <Text style={styles.infoLabel}>User ID</Text>
 <Text style={styles.infoValue}>{user?.id || 'Not available'}</Text>
 </View>
 </View>

 {/* Security Options */}
 <View style={styles.section}>
 <Text style={styles.sectionTitle}>Security</Text>
 
 <TouchableOpacity style={styles.menuItem}>
 <View style={styles.menuIcon}>
 <Text style={styles.iconText}>🔐</Text>
 </View>
 <Text style={styles.menuText}>Change Password</Text>
 <Text style={styles.menuArrow}>→</Text>
 </TouchableOpacity>

 <TouchableOpacity style={styles.menuItem}>
 <View style={styles.menuIcon}>
 <Text style={styles.iconText}>📱</Text>
 </View>
 <Text style={styles.menuText}>Two-Factor Authentication</Text>
 <Text style={styles.menuArrow}>→</Text>
 </TouchableOpacity>

 <TouchableOpacity style={styles.menuItem}>
 <View style={styles.menuIcon}>
 <Text style={styles.iconText}>📧</Text>
 </View>
 <Text style={styles.menuText}>Email Notifications</Text>
 <Text style={styles.menuArrow}>→</Text>
 </TouchableOpacity>
 </View>

 {/* Danger Zone */}
 <View style={styles.section}>
 <Text style={styles.sectionTitle}>Danger Zone</Text>
 
 <TouchableOpacity 
 style={[styles.deleteButton, loading && styles.deleteButtonDisabled]} 
 onPress={handleDeleteAccount}
 disabled={loading}
 >
 <View style={styles.deleteButtonContent}>
 <Text style={styles.deleteIcon}>🗑️</Text>
 <Text style={styles.deleteButtonText}>
 {loading ? 'Deleting Account...' : 'Delete Account'}
 </Text>
 </View>
 </TouchableOpacity>
 
 <Text style={styles.deleteWarning}>
 This action will delete your profile data from the database and sign you out. To completely delete your account, please contact support.
 </Text>
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
 section: {
 paddingHorizontal: 24,
 paddingVertical: 20,
 borderBottomWidth: 1,
 borderBottomColor: '#f0f0f0',
 },
 sectionTitle: {
 fontSize: 16,
 fontWeight: 'bold',
 color: '#000',
 marginBottom: 16,
 },
 infoItem: {
 marginBottom: 12,
 },
 infoLabel: {
 fontSize: 14,
 color: '#666',
 marginBottom: 4,
 },
 infoValue: {
 fontSize: 16,
 color: '#000',
 fontWeight: '500',
 },
 menuItem: {
 flexDirection: 'row',
 alignItems: 'center',
 paddingVertical: 16,
 borderBottomWidth: 1,
 borderBottomColor: '#f0f0f0',
 },
 menuIcon: {
 width: 40,
 height: 40,
 borderRadius: 20,
 backgroundColor: '#f8f8f8',
 justifyContent: 'center',
 alignItems: 'center',
 marginRight: 16,
 },
 iconText: {
 fontSize: 18,
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
 deleteButton: {
 backgroundColor: '#ff4444',
 borderRadius: 12,
 paddingVertical: 16,
 paddingHorizontal: 20,
 marginBottom: 12,
 },
 deleteButtonDisabled: {
 backgroundColor: '#ffaaaa',
 },
 deleteButtonContent: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'center',
 },
 deleteIcon: {
 fontSize: 18,
 marginRight: 8,
 },
 deleteButtonText: {
 fontSize: 16,
 fontWeight: '600',
 color: '#fff',
 },
 deleteWarning: {
 fontSize: 12,
 color: '#666',
 textAlign: 'center',
 lineHeight: 16,
 },
}); 