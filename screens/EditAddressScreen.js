import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { useUser } from '../contexts/UserContext';
import { useFocusEffect } from '@react-navigation/native';

export default function EditAddressScreen({ navigation, route }) {
  const { user } = useUser();
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadUserData = async () => {
    try {
      console.log('📍 EditAddress - Starting to load user data...');
      
      // First, try to get data from Supabase
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (currentUser && !userError) {
        console.log('📍 EditAddress - Current user email:', currentUser.email);
        const { data: dbUserData, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('email', currentUser.email)
          .single();

        if (dbUserData && !dbError) {
          console.log('📍 EditAddress - Loaded from DB:', {
            address_line_1: dbUserData.address_line_1,
            address_line_2: dbUserData.address_line_2,
            city: dbUserData.city,
            state: dbUserData.state,
            zip_code: dbUserData.zip_code
          });
          setAddress1(dbUserData.address_line_1 || '');
          setAddress2(dbUserData.address_line_2 || '');
          setCity(dbUserData.city || '');
          setState(dbUserData.state || '');
          setZip(dbUserData.zip_code || '');
          return;
        } else {
          console.log('📍 EditAddress - DB error or no data:', dbError);
        }
      }

      // Fallback to AsyncStorage if Supabase fails
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      const userProfileData = await AsyncStorage.getItem('userProfileData');
      
      let userData = {};
      if (userProfileData) {
        const parsed = JSON.parse(userProfileData);
        userData = { ...userData, ...parsed };
        console.log('📍 EditAddress - userProfileData:', parsed);
      }
      if (tempUserData) {
        const parsed = JSON.parse(tempUserData);
        userData = { ...userData, ...parsed };
        console.log('📍 EditAddress - tempUserData:', parsed);
      }
      
      console.log('📍 EditAddress - Merged AsyncStorage data:', {
        address1: userData.address1,
        address_line_1: userData.address_line_1,
        city: userData.city,
        state: userData.state,
        zip: userData.zip,
        zip_code: userData.zip_code
      });
      
      setAddress1(userData.address1 || userData.address_line_1 || '');
      setAddress2(userData.address2 || userData.address_line_2 || '');
      setCity(userData.city || '');
      setState(userData.state || '');
      setZip(userData.zip || userData.zip_code || '');
    } catch (error) {
      console.error('📍 EditAddress - Error loading user data:', error);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const handleSave = async () => {
    if (!address1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      Alert.alert('Error', 'Please fill in all required address fields.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Get current user email for database lookup
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        Alert.alert('Error', 'Unable to identify user. Please try again.');
        return;
      }

      const userEmail = currentUser.email;
      
      // Update in database
      const { data, error } = await supabase
        .from('users')
        .update({
          address_line_1: address1.trim(),
          address_line_2: address2.trim(),
          city: city.trim(),
          state: state.trim(),
          zip_code: zip.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);

      if (error) {
        console.error('❌ Error updating address:', error);
        Alert.alert('Error', 'Failed to update address. Please try again.');
        return;
      }

      // Update local storage
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      const userProfileData = await AsyncStorage.getItem('userProfileData');
      
      let existingData = {};
      if (userProfileData) {
        existingData = { ...existingData, ...JSON.parse(userProfileData) };
      }
      if (tempUserData) {
        existingData = { ...existingData, ...JSON.parse(tempUserData) };
      }

      const fullAddress = `${address1.trim()}${address2.trim() ? ', ' + address2.trim() : ''}, ${city.trim()}, ${state.trim()} ${zip.trim()}`;

      const updatedData = {
        ...existingData,
        address1: address1.trim(),
        address2: address2.trim(),
        address_line_1: address1.trim(),
        address_line_2: address2.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        zip_code: zip.trim(),
        fullAddress: fullAddress,
      };

      await AsyncStorage.setItem('tempUserData', JSON.stringify(updatedData));
      await AsyncStorage.setItem('userProfileData', JSON.stringify(updatedData));

      Alert.alert('Success', 'Address updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      
    } catch (error) {
      console.error('❌ Error in handleSave:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>EDIT ADDRESS</Text>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Address Line 1 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address Line 1</Text>
            <TextInput
              style={[styles.textInput, { fontWeight: 'normal' }]}
              value={address1}
              onChangeText={setAddress1}
              placeholder="Enter street address"
              placeholderTextColor="#CCCCCC"
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <View style={styles.underline} />
          </View>

          {/* Address Line 2 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address Line 2 (Optional)</Text>
            <TextInput
              style={[styles.textInput, { fontWeight: 'normal' }]}
              value={address2}
              onChangeText={setAddress2}
              placeholder="Apartment, suite, etc."
              placeholderTextColor="#CCCCCC"
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <View style={styles.underline} />
          </View>

          {/* City */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={[styles.textInput, !city && styles.textInputPlaceholder]}
              value={city}
              onChangeText={setCity}
              placeholder="Enter city"
              placeholderTextColor="#CCCCCC"
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <View style={styles.underline} />
          </View>

          {/* State and Zip Code Row */}
          <View style={styles.rowContainer}>
            {/* State */}
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={[styles.textInput, !state && styles.textInputPlaceholder]}
                value={state}
                onChangeText={setState}
                placeholder="Enter state"
                placeholderTextColor="#CCCCCC"
                autoCorrect={false}
                autoCapitalize="characters"
                returnKeyType="next"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <View style={styles.underline} />
            </View>

            {/* Zip Code */}
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Zip Code</Text>
              <TextInput
                style={[styles.textInput, !zip && styles.textInputPlaceholder]}
                value={zip}
                onChangeText={setZip}
                placeholder="Enter zip code"
                placeholderTextColor="#CCCCCC"
                keyboardType="numeric"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <View style={styles.underline} />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    flex: 1,
    fontFamily: 'Overused Grotesk',
  },
  closeButton: {
    fontSize: 45,
    color: '#000',
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  textInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    paddingVertical: 8,
    fontFamily: 'Overused Grotesk',
  },
  textInputPlaceholder: {
    fontWeight: 'normal',
  },
  underline: {
    height: 2,
    backgroundColor: '#666666',
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 5,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fff',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
