import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PickupAddress({ navigation, route }) {
  const [form, setForm] = useState({
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
  });
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const { productUrl, productPrice, userAddress, transactionType } = route.params || {};

  // Pre-populate form with user's current address or default pickup address if available
  useEffect(() => {
    const loadAddress = async () => {
      if (userAddress) {
        // Use user's main address as starting point
        setForm({
          address1: userAddress.street || '',
          address2: userAddress.address2 || '',
          city: userAddress.city || '',
          state: userAddress.state || '',
          zip: userAddress.zipCode || '',
        });
      } else {
        // Check if there's a default pickup address
        try {
          const defaultAddress = await AsyncStorage.getItem('defaultPickupAddress');
          if (defaultAddress) {
            const parsed = JSON.parse(defaultAddress);
            setForm({
              address1: parsed.street || '',
              address2: parsed.address2 || '',
              city: parsed.city || '',
              state: parsed.state || '',
              zip: parsed.zipCode || '',
            });
            setIsDefault(true); // Pre-check the default option
          }
        } catch (error) {
          console.log('⚠️ Error loading default pickup address:', error);
        }
      }
    };
    
    loadAddress();
  }, [userAddress]);

  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!form.address1.trim()) {
      Alert.alert('Error', 'Address Line 1 is required');
      return false;
    }
    if (!form.city.trim()) {
      Alert.alert('Error', 'City is required');
      return false;
    }
    if (!form.state.trim()) {
      Alert.alert('Error', 'State is required');
      return false;
    }
    if (!form.zip.trim()) {
      Alert.alert('Error', 'Zip Code is required');
      return false;
    }
    return true;
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Save the pickup address to AsyncStorage for this delivery session only
      const pickupAddress = {
        street: form.address1,
        city: form.city,
        state: form.state,
        zipCode: form.zip,
        address2: form.address2,
        isDefault: isDefault,
        timestamp: new Date().toISOString()
      };

      await AsyncStorage.setItem('currentPickupAddress', JSON.stringify(pickupAddress));
      
      // If user wants to set this as default pickup address, save it separately
      if (isDefault) {
        await AsyncStorage.setItem('defaultPickupAddress', JSON.stringify(pickupAddress));
        console.log('✅ Default pickup address saved for future use');
      }
      
      console.log('✅ Pickup address saved:', pickupAddress);
      
      // Navigate back to ConfirmAddress with the new pickup address
      navigation.navigate('ConfirmAddress', {
        productUrl,
        productPrice,
        userAddress,
        pickupAddress,
        transactionType,
        userProfile: userAddress // Pass the user profile data
      });
      
    } catch (error) {
      console.error('❌ Error saving pickup address:', error);
      Alert.alert('Error', 'Failed to save pickup address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../assets/backarrow.png')} 
            style={styles.backButtonImage}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PICKUP ADDRESS</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Info Note */}
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              This pickup address will only be used for this delivery and won't change your main address.
            </Text>
          </View>
          {/* Address Line 1 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address Line 1</Text>
            <TextInput
              style={styles.input}
              value={form.address1}
              onChangeText={(text) => handleChange('address1', text)}
              placeholder="Enter address"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Address Line 2 (Optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address Line 2 (Optional)</Text>
            <TextInput
              style={styles.input}
              value={form.address2}
              onChangeText={(text) => handleChange('address2', text)}
              placeholder="Apartment, suite, etc."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* City */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={styles.input}
              value={form.city}
              onChangeText={(text) => handleChange('city', text)}
              placeholder="Enter city"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* State */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>State</Text>
            <TextInput
              style={styles.input}
              value={form.state}
              onChangeText={(text) => handleChange('state', text)}
              placeholder="Enter state"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Zip Code */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Zip Code</Text>
            <TextInput
              style={styles.input}
              value={form.zip}
              onChangeText={(text) => handleChange('zip', text)}
              placeholder="Enter zip code"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Default Address Checkbox */}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, isDefault && styles.checkboxChecked]}
              onPress={() => setIsDefault(!isDefault)}
            >
              {isDefault && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>Set as default pickup address for future deliveries</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSaveChanges}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 44,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  formContainer: {
    paddingTop: 20,
  },
  infoNote: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoNoteText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  saveButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
