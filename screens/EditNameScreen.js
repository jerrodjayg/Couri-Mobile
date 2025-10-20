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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { useUser } from '../contexts/UserContext';
import { useFocusEffect } from '@react-navigation/native';

export default function EditNameScreen({ navigation, route }) {
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load current user data
    const loadUserData = async () => {
      try {
        const tempUserData = await AsyncStorage.getItem('tempUserData');
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        
        let userData = {};
        if (userProfileData) {
          userData = { ...userData, ...JSON.parse(userProfileData) };
        }
        if (tempUserData) {
          userData = { ...userData, ...JSON.parse(tempUserData) };
        }
        
        setFirstName(userData.firstName || userData.first_name || '');
        setLastName(userData.lastName || userData.last_name || '');
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter both first and last name.');
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
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);

      if (error) {
        console.error('❌ Error updating name:', error);
        Alert.alert('Error', 'Failed to update name. Please try again.');
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

      const updatedData = {
        ...existingData,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        full_name: `${firstName.trim()} ${lastName.trim()}`,
      };

      await AsyncStorage.setItem('tempUserData', JSON.stringify(updatedData));
      await AsyncStorage.setItem('userProfileData', JSON.stringify(updatedData));

      Alert.alert('Success', 'Name updated successfully!', [
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
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>EDIT NAME</Text>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* First Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={[styles.textInput, { fontWeight: 'normal' }]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#CCCCCC"
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <View style={styles.underline} />
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={[styles.textInput, { fontWeight: 'normal' }]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor="#CCCCCC"
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <View style={styles.underline} />
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
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
