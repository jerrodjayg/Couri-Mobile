// PersonalInfoScreen.js
import { supabase } from './supabaseClient';
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
  FlatList,
} from 'react-native';
import base64 from 'react-native-base64';


export default function PersonalInfoScreen({ navigation, route }) {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const { userInfo, phone } = route.params || {};

  // Test Supabase connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing Supabase connection...');
        console.log('Supabase URL:', supabase.supabaseUrl);
        
        // First test basic connection
        const { data: testData, error: testError } = await supabase
          .from('users')
          .select('*')
          .limit(1);
        
        if (testError) {
          console.error('Supabase connection test failed:', testError);
          console.error('Error code:', testError.code);
          console.error('Error message:', testError.message);
        } else {
          console.log('Supabase connection test successful');
          console.log('Test data:', testData);
        }
      } catch (err) {
        console.error('Supabase connection test error:', err);
      }
    };
    
    testConnection();
  }, []);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: phone || '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
  });

  // Phone number formatting function (same as LogInScreen and CreateAccountScreen)
  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return text;
    if (match[2]) return `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
    return match[1];
  };

  // Populate form with userInfo from route params if it exists
  useEffect(() => {
    console.log('🔍 PersonalInfoScreen DEBUG - Component mounted');
    console.log('🔍 PersonalInfoScreen DEBUG - Route params:', route?.params);
    console.log('🔍 PersonalInfoScreen DEBUG - User info from params:', userInfo);
    console.log('🔍 PersonalInfoScreen DEBUG - Phone from params:', phone);
    
    if (userInfo) {
      console.log('🔍 PersonalInfoScreen DEBUG - Setting form with user info');
      setForm({
        firstName: userInfo.firstName || '',
        lastName: userInfo.lastName || '',
        email: userInfo.email || '',
        phone: userInfo.phone || phone || '',
        address1: userInfo.address1 || '',
        address2: userInfo.address2 || '',
        city: userInfo.city || '',
        state: userInfo.state || '',
        zip: userInfo.zip || '',
      });
    }
    
    // If this is a Google auth user, pre-fill some fields and make email read-only
    if (route.params?.isGoogleAuth && userInfo?.email) {
      console.log('✅ Google auth user detected, pre-filling form');
      console.log('🔍 PersonalInfoScreen DEBUG - Google auth user data:', route.params?.googleUserData);
      
      // Pre-fill with Google user data if available
      if (route.params?.googleUserData) {
        const googleData = route.params.googleUserData;
        console.log('🔍 PersonalInfoScreen DEBUG - Processing Google user data:', googleData);
        
        // Extract names from Google user metadata
        const fullName = googleData.user_metadata?.full_name || googleData.user_metadata?.name || '';
        const firstName = fullName.split(' ')[0] || '';
        const lastName = fullName.split(' ').slice(1).join(' ') || '';
        
        console.log('🔍 PersonalInfoScreen DEBUG - Extracted names:', { fullName, firstName, lastName });
        
        setForm(prev => ({
          ...prev,
          firstName: firstName || userInfo.firstName || '',
          lastName: lastName || userInfo.lastName || '',
          email: googleData.email || userInfo.email || '',
        }));
        
        console.log('🔍 PersonalInfoScreen DEBUG - Form updated with Google data');
      }
    }
  }, [userInfo, phone, route.params?.isGoogleAuth, route.params?.googleUserData]);

  // Log form state after it's updated
  useEffect(() => {
    console.log('🔍 PersonalInfoScreen DEBUG - Current form state:', form);
  }, [form]);

  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);


  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');

    // Only fetch Smarty suggestions if editing address1
    if (name === 'address1') {
      // Clear any existing timeout
      if (window.suggestionTimeout) {
        clearTimeout(window.suggestionTimeout);
      }
      
      // Add a small delay to prevent too many API calls
      window.suggestionTimeout = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    }
  };

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
      const url = `https://us-autocomplete.api.smarty.com/lookup?search=${encodedInput}&auth-id=${SMARTY_AUTH_ID}&auth-token=${SMARTY_AUTH_TOKEN}&max_suggestions=10`;

      console.log('Calling:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Smarty API error:', response.status, response.statusText, errText);
        setSuggestions([]);
        return;
      }

      const data = await response.json();
      console.log('Smarty API response:', data);

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


  const handleSuggestionPress = (suggestion) => {
    setSuggestions([]);

    setForm((prev) => ({
      ...prev,
      address1: suggestion.street_line || '',
      city: suggestion.city || '',
      state: suggestion.state || '',
      zip: suggestion.zipcode || '',
    }));
  };


  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const allRequiredFieldsFilled = () => {
    const required = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'zip'];
    
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

    console.log('🔍 PersonalInfoScreen DEBUG - Form validation passed, navigating to CreatePassword');
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
    console.log('🔍 PersonalInfoScreen DEBUG - Navigating with data:', {
      userInfo: form,
      isGoogleAuth: route.params?.isGoogleAuth || false,
      googleUserData: route.params?.googleUserData || null
    });

    // Don't save to database here - just navigate with form data
    // The user will be created in the onboarding flow when they reach PushNotiScreen
    navigation.navigate('CreatePassword', { 
      userInfo: form,
      savedUser: null, // No saved user yet
      isGoogleAuth: route.params?.isGoogleAuth || false,
      googleUserData: route.params?.googleUserData || null
    });
  };

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.backButtonContainer}>
            <Pressable onPress={() => navigation.goBack()}>
              <Image
                source={{ uri: 'https://cdn-icons-png.freepik.com/256/5629/5629228.png' }}
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
        >
          <Text style={styles.sectionTitle}>Personal Info</Text>
          
          {/* Debug Button */}
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => {
              console.log('🔍 PersonalInfoScreen DEBUG - Current form state:', form);
              Alert.alert('Debug Info', 'Check console for current form state');
            }}
          >
            <Text style={styles.debugButtonText}>Show Form State (Debug)</Text>
          </TouchableOpacity>
          
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

          <TextInput placeholder="Address Line 1*" 
            value={form.address1} 
            onChangeText={(text) => handleChange('address1', text)} 
            style={styles.input} />
          
          {isLoadingSuggestions && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading suggestions...</Text>
            </View>
          )}
          
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsList}>
                {suggestions.map((item, index) => (
                  <TouchableOpacity 
                    key={`${item.street_line}-${item.city}-${item.state}-${index}`}
                    onPress={() => handleSuggestionPress(item)} 
                    style={[
                      styles.suggestionItem,
                      index === suggestions.length - 1 && styles.suggestionItemLast
                    ]}
                  >
                    <Text style={styles.suggestionText}>
                      {item.street_line}
                      {item.city && item.state && `, ${item.city}, ${item.state}`}
                      {item.zipcode && ` ${item.zipcode}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContainer: { flex: 1 },
  formContainer: { padding: 24, paddingBottom: 80 },
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
  suggestionsContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 1000,
  },
  loadingContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
});
