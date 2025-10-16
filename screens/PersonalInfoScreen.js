// PersonalInfoScreen.js
import { supabase } from './supabaseClient';
import { UserService } from '../utils/userService';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import base64 from 'react-native-base64';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function PersonalInfoScreen({ navigation, route }) {
  console.log('🔍 PersonalInfoScreen DEBUG - Component mounting');
  console.log('🔍 PersonalInfoScreen DEBUG - Route params:', route?.params);
  console.log('🔍 PersonalInfoScreen DEBUG - Supabase client:', typeof supabase);
  console.log('🔍 PersonalInfoScreen DEBUG - Supabase client methods:', Object.keys(supabase || {}));
  
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  console.log('🔍 PersonalInfoScreen DEBUG - selectedPlace state initialized');
  
  const { userInfo, phone } = route.params || {};
  console.log('🔍 PersonalInfoScreen DEBUG - Destructuring completed');
  
  console.log('🔍 PersonalInfoScreen DEBUG - User info from params:', userInfo);
  console.log('🔍 PersonalInfoScreen DEBUG - Phone from params:', phone);

  // Test Supabase connection on component mount - TEMPORARILY DISABLED FOR DEBUGGING
  useEffect(() => {
    console.log('🔍 PersonalInfoScreen DEBUG - First useEffect starting (Supabase test disabled)');
    // Temporarily disabled Supabase connection test to isolate the filter error
    /*
    try {
      console.log('🔍 PersonalInfoScreen DEBUG - First useEffect starting');
      const testConnection = async () => {
      try {
        console.log('🔍 PersonalInfoScreen DEBUG - Inside testConnection function');
        console.log('Testing Supabase connection...');
        console.log('Supabase URL:', supabase.supabaseUrl);
        
        // First test basic connection
        console.log('🔍 PersonalInfoScreen DEBUG - About to make Supabase query');
        const { data: testData, error: testError } = await supabase
          .from('users')
          .select('*')
          .limit(1);
        console.log('🔍 PersonalInfoScreen DEBUG - Supabase query completed');
        
        if (testError) {
          console.error('🔍 PersonalInfoScreen DEBUG - Supabase connection test failed:', testError);
          console.error('Error code:', testError.code);
          console.error('Error message:', testError.message);
        } else {
          console.log('🔍 PersonalInfoScreen DEBUG - Supabase connection test successful');
          console.log('Test data:', testData);
        }
      } catch (err) {
        console.error('🔍 PersonalInfoScreen DEBUG - Supabase connection test error:', err);
      }
    };
    
      console.log('🔍 PersonalInfoScreen DEBUG - About to call testConnection');
      testConnection();
      console.log('🔍 PersonalInfoScreen DEBUG - testConnection called');
    } catch (error) {
      console.error('🔍 PersonalInfoScreen DEBUG - Error in first useEffect:', error);
    }
    */
  }, []);

  console.log('🔍 PersonalInfoScreen DEBUG - About to initialize form state');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: phone || '',
    fullAddress: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
  });
  console.log('🔍 PersonalInfoScreen DEBUG - Form state initialized');

  // Phone number formatting function (same as LogInScreen and CreateAccountScreen)
  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return text;
    if (match[2]) return `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
    return match[1];
  };

  // Fetch address suggestions from Geoapify API (free alternative)
  const fetchAddressSuggestions = async (input) => {
    if (!input || input.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingAddresses(true);
    
    try {
      const apiKey = 'd32e033d549b4ad5a9f56bd0519f87e3';
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(input)}&apiKey=${apiKey}&filter=countrycode:us&limit=5`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        // Transform Geoapify response to show full address in dropdown
        const suggestions = data.features.map(feature => {
          const props = feature.properties;
          const streetOnly = `${props.housenumber || ''} ${props.street || ''}`.trim();
          
          // Build full address display for dropdown
          const parts = [
            streetOnly,
            props.city,
            props.state_code || props.state,
            props.postcode
          ].filter(Boolean);
          
          const fullDisplay = parts.join(', ');
          
          return {
            place_id: feature.properties.place_id || `${feature.properties.lat}_${feature.properties.lon}`,
            description: fullDisplay,           // Show full address in dropdown
            streetOnly: streetOnly,             // Store street for Address Line 1
            properties: feature.properties
          };
        });
        setAddressSuggestions(suggestions);
      } else {
        setAddressSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Get place details from Geoapify
  const getPlaceDetails = async (suggestion) => {
    try {
      const props = suggestion.properties;
      
      // Use the pre-extracted street-only value from suggestion
      const streetAddress = suggestion.streetOnly || `${props.housenumber || ''} ${props.street || ''}`.trim();
      
      return {
        streetNumber: props.housenumber || '',
        route: props.street || '',
        city: props.city || '',
        state: props.state_code || props.state || '',
        zipCode: props.postcode || '',
        fullAddress: streetAddress, // Only street info for Address Line 1
        address1: streetAddress,    // Only street number + street name
        address2: props.address_line2 || '',
        city: props.city || '',
        state: props.state_code || props.state || '',
        zip: props.postcode || ''
      };
    } catch (error) {
      console.error('Error parsing place details:', error);
      return null;
    }
  };

  // Parse address components from Google Places API response
  const parseAddressComponents = (addressComponents, formattedAddress) => {
    let streetNumber = '';
    let route = '';
    let city = '';
    let state = '';
    let zipCode = '';

    addressComponents.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) {
        route = component.long_name;
      } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.short_name;
      } else if (types.includes('postal_code')) {
        zipCode = component.long_name;
      }
    });

    return {
      streetNumber,
      route,
      city,
      state,
      zipCode,
      fullAddress: formattedAddress || `${streetNumber} ${route}`.trim(),
      address1: `${streetNumber} ${route}`.trim(),
      address2: '',
      city,
      state,
      zip: zipCode
    };
  };

  // Handle address selection
  const handleAddressSelect = async (suggestion) => {
    console.log('🔍 Address selected:', suggestion);
    setIsLoadingAddresses(true);
    
    const details = await getPlaceDetails(suggestion);
    
    if (details) {
      console.log('🔍 Parsed address details:', details);
      setForm(prev => ({
        ...prev,
        fullAddress: details.fullAddress,
        address1: details.address1,
        city: details.city,
        state: details.state,
        zip: details.zip,
      }));
    }
    
    setAddressSuggestions([]);
    setIsLoadingAddresses(false);
  };

  // Populate form with userInfo from route params if it exists
  useEffect(() => {
    try {
      console.log('🔍 PersonalInfoScreen DEBUG - Component mounted');
      console.log('🔍 PersonalInfoScreen DEBUG - Route params:', route?.params);
      console.log('🔍 PersonalInfoScreen DEBUG - User info from params:', userInfo);
      console.log('🔍 PersonalInfoScreen DEBUG - Phone from params:', phone);
      
      if (userInfo) {
        console.log('🔍 PersonalInfoScreen DEBUG - Setting form with user info');
        console.log('🔍 PersonalInfoScreen DEBUG - userInfo keys:', Object.keys(userInfo || {}));
        setForm({
          firstName: userInfo.firstName || '',
          lastName: userInfo.lastName || '',
          email: userInfo.email || '',
          phone: userInfo.phone || phone || '',
          fullAddress: userInfo.fullAddress || '',
          address1: userInfo.address1 || '',
          address2: userInfo.address2 || '',
          city: userInfo.city || '',
          state: userInfo.state || '',
          zip: userInfo.zip || '',
        });
        console.log('🔍 PersonalInfoScreen DEBUG - Form set successfully');
      }
    } catch (error) {
      console.error('❌ PersonalInfoScreen DEBUG - Error in useEffect:', error);
    }
    
    // If this is a Google auth user, pre-fill some fields and make email read-only
    try {
      if (route.params?.isGoogleAuth && userInfo?.email) {
        console.log('✅ Google auth user detected, pre-filling form');
        console.log('🔍 PersonalInfoScreen DEBUG - Google auth user data:', route.params?.googleUserData);
        
        // Pre-fill with Google user data if available
        if (route.params?.googleUserData) {
          const googleData = route.params.googleUserData;
          console.log('🔍 PersonalInfoScreen DEBUG - Processing Google user data:', googleData);
          
          // Use the names that were already processed in CreateAccountScreen
          // Don't re-extract names to avoid duplication
          setForm(prev => ({
            ...prev,
            firstName: userInfo.firstName || '',
            lastName: userInfo.lastName || '',
            email: googleData.email || userInfo.email || '',
          }));
          
          console.log('🔍 PersonalInfoScreen DEBUG - Form updated with Google data');
        }
      }
    } catch (error) {
      console.error('❌ PersonalInfoScreen DEBUG - Error in Google auth section:', error);
    }
  }, [userInfo, phone, route.params?.isGoogleAuth, route.params?.googleUserData]);

  // Log form state after it's updated
  useEffect(() => {
    console.log('🔍 PersonalInfoScreen DEBUG - Current form state:', form);
  }, [form]);

  console.log('🔍 PersonalInfoScreen DEBUG - About to initialize error state');
  const [error, setError] = useState('');
  console.log('🔍 PersonalInfoScreen DEBUG - Error state initialized');


  console.log('🔍 PersonalInfoScreen DEBUG - About to define handleChange function');
  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    
    // Trigger address suggestions when typing in fullAddress field
    if (name === 'fullAddress') {
      if (value.length >= 3) {
        // Debounce the API call
        if (window.addressTimeout) {
          clearTimeout(window.addressTimeout);
        }
        window.addressTimeout = setTimeout(() => {
          fetchAddressSuggestions(value);
        }, 300);
      } else {
        setAddressSuggestions([]);
      }
    }
  };
  console.log('🔍 PersonalInfoScreen DEBUG - handleChange function defined');



  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  console.log('🔍 PersonalInfoScreen DEBUG - About to define allRequiredFieldsFilled function');
  const allRequiredFieldsFilled = () => {
    console.log('🔍 PersonalInfoScreen DEBUG - Inside allRequiredFieldsFilled function');
    const required = ['firstName', 'lastName', 'email', 'phone', 'fullAddress', 'city', 'state', 'zip'];
    console.log('🔍 PersonalInfoScreen DEBUG - Required array created:', required);
    
    console.log('🔍 PersonalInfoScreen DEBUG - Checking required fields:');
    required.forEach(field => {
      const value = form[field];
      const isEmpty = !value || value.trim() === '';
      console.log(`  ${field}: "${value}" (empty: ${isEmpty})`);
    });
    
    const allFilled = required.every((field) => form[field] && form[field].trim() !== '');
    console.log('🔍 PersonalInfoScreen DEBUG - All required fields filled:', allFilled);
    
    return allFilled;
  };
  console.log('🔍 PersonalInfoScreen DEBUG - allRequiredFieldsFilled function defined');



  console.log('🔍 PersonalInfoScreen DEBUG - About to define onContinue function');
  const onContinue = async () => {
    console.log('🔍 PersonalInfoScreen DEBUG - onContinue called');
    console.log('🔍 PersonalInfoScreen DEBUG - Current form data:', form);
    console.log('🔍 PersonalInfoScreen DEBUG - Route params:', route?.params);
    
    setError('');

    if (!allRequiredFieldsFilled()) {
      console.log('🔍 PersonalInfoScreen DEBUG - Missing required fields');
      setError('missingFields');
      return;
    }

    if (!isValidEmail(form.email)) {
      console.log('🔍 PersonalInfoScreen DEBUG - Invalid email format');
      setError('invalidEmail');
      return;
    }

    // Check if email already exists in database
    console.log('🔍 PersonalInfoScreen DEBUG - Checking if email already exists in database');
    try {
      const { exists } = await UserService.checkUserExists(form.email.toLowerCase());
      if (exists) {
        console.log('🔍 PersonalInfoScreen DEBUG - Email already exists in database');
        setError('emailExists');
        return;
      }
      console.log('🔍 PersonalInfoScreen DEBUG - Email is available');
    } catch (dbError) {
      console.error('❌ PersonalInfoScreen DEBUG - Error checking email existence:', dbError);
      // Continue with account creation if database check fails
    }

    console.log('🔍 PersonalInfoScreen DEBUG - Form validation passed, navigating to PushNoti');
    console.log('🔍 PersonalInfoScreen DEBUG - Form data being passed:', {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      state: form.state,
      zip: form.zip
    });

    // CRITICAL FIX: Save form data to AsyncStorage before navigating
    try {
      const userDataToStore = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        zip: form.zip,
        // Also include database format for consistency
        address_line_1: form.address1,
        address_line_2: form.address2,
        zip_code: form.zip,
        // Include Google auth info if applicable
        isGoogleAuth: route.params?.isGoogleAuth || false,
        googleUserData: route.params?.googleUserData || null,
        // Create a name field for consistency
        name: `${form.firstName} ${form.lastName}`.trim(),
        full_name: `${form.firstName} ${form.lastName}`.trim()
      };

      // Store in both AsyncStorage keys for consistency across the app
      await AsyncStorage.setItem('tempUserData', JSON.stringify(userDataToStore));
      await AsyncStorage.setItem('userProfileData', JSON.stringify(userDataToStore));
      
      console.log('✅ PersonalInfoScreen - User data saved to AsyncStorage before navigation');
      console.log('🔍 PersonalInfoScreen DEBUG - Data saved to AsyncStorage:', userDataToStore);
      
    } catch (storageError) {
      console.error('❌ PersonalInfoScreen - Error saving to AsyncStorage:', storageError);
      // Don't block navigation if storage fails
    }

    console.log('🔍 PersonalInfoScreen DEBUG - Navigating with data:', {
      userInfo: form,
      isGoogleAuth: route.params?.isGoogleAuth || false,
      googleUserData: route.params?.googleUserData || null
    });

    // Navigate to PushNoti with form data (skipping password creation)
    navigation.navigate('PushNoti', { 
      userInfo: form,
      savedUser: null, // No saved user yet
      isGoogleAuth: route.params?.isGoogleAuth || false,
      googleUserData: route.params?.googleUserData || null
    });
  };
  console.log('🔍 PersonalInfoScreen DEBUG - onContinue function defined');

  console.log('🔍 PersonalInfoScreen DEBUG - About to define renderError function');
  const renderError = () => {
    if (!error) return null;

    let message = '';
    switch (error) {
      case 'missingFields':
        message = 'All fields must be completed';
        break;
      case 'invalidEmail':
        message = 'Enter a valid email address';
        break;
      case 'emailExists':
        message = 'This email is already assigned to an account';
        break;
      case 'databaseError':
        message = 'Failed to save your information. Please try again.';
        break;
      default:
        return null;
    }

    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>!</Text>
        </View>
        <Text style={styles.errorText}>{message}</Text>
      </View>
    );
  };
  console.log('🔍 PersonalInfoScreen DEBUG - renderError function defined');

  console.log('🔍 PersonalInfoScreen DEBUG - About to render component');
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <View style={styles.backButtonContainer}>
            <Pressable onPress={() => navigation.goBack()}>
              <Image
                source={require('../assets/backarrow.png')}
                style={styles.backArrowImage}
                resizeMode="contain"
              />
            </Pressable>
          </View>
          <Text style={styles.headerTitle}>CREATE ACCOUNT</Text>
          <View style={styles.backButtonContainer} />
        </View>

        {renderError()}

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <Text style={styles.sectionTitle}>Personal Info</Text>
          

          
          
          <TextInput placeholder="First Name*" value={form.firstName} onChangeText={(text) => handleChange('firstName', text)} style={styles.input} />
          <TextInput placeholder="Last Name*" value={form.lastName} onChangeText={(text) => handleChange('lastName', text)} style={styles.input} />
          <TextInput 
            placeholder="Email Address*" 
            value={form.email} 
            onChangeText={(text) => handleChange('email', text)} 
            keyboardType="email-address" 
            autoCapitalize="none" 
            style={[styles.input, route.params?.isGoogleAuth && styles.readOnlyInput]} 
            editable={!route.params?.isGoogleAuth}
          />
          <TextInput 
            placeholder="Mobile Number*" 
            value={form.phone} 
            onChangeText={(text) => {
              const formatted = formatPhoneNumber(text);
              handleChange('phone', formatted);
            }} 
            keyboardType="phone-pad" 
            style={styles.input} 
          />

          <Text style={styles.sectionTitle}>Home Address</Text>

          <View style={{ position: 'relative', zIndex: 1000 }}>
            <TextInput 
              placeholder="Street Address*" 
              value={form.fullAddress} 
              onChangeText={(text) => handleChange('fullAddress', text)} 
              style={styles.input} 
            />
            
            {addressSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {addressSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.suggestionItem}
                    onPress={() => handleAddressSelect(item)}
                  >
                    <Text style={styles.suggestionText}>{item.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {isLoadingAddresses && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
          </View>

          <TextInput placeholder="Address Line 2 (Optional)" value={form.address2} onChangeText={(text) => handleChange('address2', text)} style={styles.input} />
          <TextInput placeholder="City*" value={form.city} onChangeText={(text) => handleChange('city', text)} style={styles.input} />
          <View style={styles.row}>
            <TextInput placeholder="State*" value={form.state} onChangeText={(text) => handleChange('state', text)} style={[styles.input, styles.halfInput]} />
            <TextInput placeholder="Zip*" value={form.zip} onChangeText={(text) => handleChange('zip', text)} keyboardType="numeric" style={[styles.input, styles.halfInput]} />
          </View>

          <Text style={styles.legal}>
            By creating an account, you agree to Couri's <Text style={[styles.legal, styles.link]}>Terms of Use</Text> and{' '}
            <Text style={[styles.legal, styles.link]}>Privacy Policy</Text>.
          </Text>

          <TouchableOpacity 
            style={styles.button}
            onPress={onContinue}
          >
            <Text style={styles.buttonText}>
              Continue
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContainer: { flex: 1 },
  formContainer: { padding: 24, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 8, paddingTop: 8 },
  backButtonContainer: { width: 44, alignItems: 'flex-start' },
  backArrowImage: { width: 24, height: 24, marginLeft: 20, marginTop: 4 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#000', flex: 1, textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '500', marginBottom: 12, marginTop: 20 },
  input: { borderBottomWidth: 1, borderBottomColor: '#222', paddingVertical: 12, marginBottom: 16, fontSize: 16, fontWeight: 'normal' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  legal: { fontSize: 12, color: '#444', marginTop: 20, marginBottom: 20 },
  link: { textDecorationLine: 'underline', color: '#000' },
  button: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 50, alignItems: 'center', marginBottom: 50 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  debugButton: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    marginBottom: 20,
    alignItems: 'center'
  },
  debugButtonText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  suggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1001,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  loadingContainer: {
    position: 'absolute',
    top: 52,
    right: 16,
  },
  loadingText: {
    fontSize: 12,
    color: '#999',
  },
  errorIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  errorIconText: { color: 'white', fontWeight: 'bold', fontSize: 14, lineHeight: 14 },
  errorText: { color: 'red', fontWeight: '600' },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionsList: {
    maxHeight: 150,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
});