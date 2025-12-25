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
  Platform,
  Modal,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';

export default function PickupAddress({ navigation, route }) {
  const [form, setForm] = useState({
    fullAddress: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
  });
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showDifferentAddressModal, setShowDifferentAddressModal] = useState(false);

  const { 
    productUrl, 
    productPrice, 
    productTitle,
    productDescription,
    productImage,
    userAddress,
    transactionType,
    userProfile
  } = route.params || {};

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
    setForm(prev => ({ ...prev, [field]: value }));
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

      // Check for cached location first (much faster)
      try {
        const cachedLocation = await AsyncStorage.getItem('cachedLocation');
        if (cachedLocation) {
          const { location: cachedLoc, timestamp } = JSON.parse(cachedLocation);
          const age = Date.now() - timestamp;
          
          // Use cached location if less than 5 minutes old
          if (age < 300000) {
            console.log('📍 Using cached location (age:', Math.round(age / 1000), 'seconds)');
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: cachedLoc.coords.latitude,
              longitude: cachedLoc.coords.longitude,
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
              
              setIsGettingLocation(false);
              return;
            }
          }
        }
      } catch (cacheError) {
        console.log('⚠️ Cache error (non-blocking):', cacheError);
      }

      // Get current location with optimized settings for speed
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Faster than High accuracy
        maximumAge: 30000, // Use cached location if less than 30 seconds old
        timeout: 8000, // Reduced timeout to 8 seconds
      });

      // Cache the location for future use
      try {
        await AsyncStorage.setItem('cachedLocation', JSON.stringify({
          location: location,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.log('⚠️ Failed to cache location:', cacheError);
      }

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
    if (!form.fullAddress.trim()) {
      Alert.alert('Error', 'Address is required');
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
      
      // Navigate to TrackingScreen with the pickup address and product details
      navigation.navigate('TrackingScreen', {
        ...(route.params || {}), // ✅ forward everything (title/image, etc.)
        productUrl,
        productPrice,
        productTitle,
        productDescription,
        productImage,
        userAddress,
        pickupAddress,
        transactionType,
        userProfile: userProfile || userAddress // Pass the user profile data
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

  const handleUseDifferentAddress = () => {
    setShowDifferentAddressModal(true);
  };

  const handleClearAddress = () => {
    setForm({
      fullAddress: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
    });
    setIsDefault(false);
    setShowDifferentAddressModal(false);
  };

  const handleCloseModal = () => {
    setShowDifferentAddressModal(false);
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
            source={require('../assets/backarrow1.png')} 
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

          {/* Use Different Address Button */}
          <TouchableOpacity
            style={styles.differentAddressButton}
            onPress={handleUseDifferentAddress}
          >
            <Text style={styles.differentAddressButtonText}>
              Use a different pickup address
            </Text>
          </TouchableOpacity>

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
          {/* Address Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address*</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your address"
              placeholderTextColor="#9CA3AF"
              value={form.fullAddress}
              onChangeText={(text) => handleChange('fullAddress', text)}
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

      {/* Different Address Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDifferentAddressModal}
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>

              {/* Title */}
              <Text style={styles.modalTitle}>Use Different Address</Text>

              {/* Options */}
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleClearAddress}
              >
                <Text style={styles.modalOptionText}>Clear current address</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => {
                  handleCloseModal();
                  getCurrentLocation();
                }}
              >
                <Text style={styles.modalOptionText}>Use current location</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalOptionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  differentAddressButton: {
    marginBottom: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  differentAddressButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '300',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
  },
});
