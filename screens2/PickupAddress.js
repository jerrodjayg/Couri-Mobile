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
  FlatList,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';

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
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { productUrl, productPrice, userAddress } = route.params || {};

  // Pre-populate form with user's current address if available
  useEffect(() => {
    if (userAddress) {
      setForm({
        address1: userAddress.street || '',
        address2: userAddress.address2 || '',
        city: userAddress.city || '',
        state: userAddress.state || '',
        zip: userAddress.zipCode || '',
      });
    }
  }, [userAddress]);

  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Trigger address suggestions if editing address1
    if (field === 'address1') {
      if (value.length > 2) {
        fetchSuggestions(value);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  // Address autocomplete using Smarty API
  const fetchSuggestions = async (input) => {
    if (!input || input.trim().length < 3) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const SMARTY_AUTH_ID = 'af0d27eb-c903-f64d-47eb-c8c06d7819e7';
      const SMARTY_AUTH_TOKEN = '9NOFpSJMo87AMyFoHs3R';

      const encodedInput = encodeURIComponent(input.trim());
      const url = `https://us-autocomplete.api.smarty.com/lookup?search=${encodedInput}&auth-id=${SMARTY_AUTH_ID}&auth-token=${SMARTY_AUTH_TOKEN}&max_suggestions=5`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Smarty API error:', response.status, response.statusText);
        setSuggestions([]);
        return;
      }

      const data = await response.json();

      if (data && data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Smarty API error:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionPress = (suggestion) => {
    setForm(prev => ({
      ...prev,
      address1: suggestion.street_line,
      city: suggestion.city,
      state: suggestion.state,
      zip: suggestion.zipcode,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Get current location and reverse geocode
  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to auto-fill your address.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        setForm(prev => ({
          ...prev,
          address1: `${address.streetNumber || ''} ${address.street || ''}`.trim(),
          city: address.city || '',
          state: address.region || '',
          zip: address.postalCode || '',
        }));
        
        Alert.alert(
          'Success',
          'Address auto-filled from your current location!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Could not determine address from your location.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Error',
        'Failed to get your location. Please enter address manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
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
        pickupAddress
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
      <View style={styles.mainContent}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
          {/* Info Note */}
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              This pickup address will only be used for this delivery and won't change your main address.
            </Text>
          </View>

          {/* Auto-fill Location Button */}
          <TouchableOpacity
            style={[styles.autoFillButton, isGettingLocation && styles.autoFillButtonDisabled]}
            onPress={getCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Image 
                source={require('../assets/mountain.png')} 
                style={styles.locationIcon}
              />
            )}
            <Text style={styles.autoFillButtonText}>
              {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>
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
            
            {/* Address Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {isLoadingSuggestions ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={styles.loadingText}>Finding addresses...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item, index) => `${item.street_line}-${index}`}
                    renderItem={({ item }) => (
                      <TouchableWithoutFeedback onPress={() => handleSuggestionPress(item)}>
                        <View style={styles.suggestionItem}>
                          <Text style={styles.suggestionText}>
                            {item.street_line}
                          </Text>
                          <Text style={styles.suggestionSubtext}>
                            {item.city}, {item.state} {item.zipcode}
                          </Text>
                        </View>
                      </TouchableWithoutFeedback>
                    )}
                    style={styles.suggestionsList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            )}
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
      </View>

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
  // Auto-fill button styles
  autoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  autoFillButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  locationIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff',
  },
  autoFillButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Address suggestions styles
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 4,
  },
  suggestionSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
