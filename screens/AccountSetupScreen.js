import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { supabase } from './supabaseClient';

export default function AccountSetupScreen({ navigation, route }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    fullAddress: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Get user data from previous screen
  const { user } = route.params || {};

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };


  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    if (!formData.fullAddress.trim()) newErrors.fullAddress = 'Address is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Update user profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.mobileNumber,
          full_address: formData.fullAddress,
          address_line_1: formData.addressLine1,
          address_line_2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip,
          updated_at: new Date(),
        });

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to save your information. Please try again.');
        return;
      }

      // Navigate to PersonalInfoScreen to continue the flow
      navigation.navigate('PersonalInfo', { 
        userInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.mobileNumber,
          fullAddress: formData.fullAddress,
          address1: formData.addressLine1,
          address2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip: formData.zip
        },
        isGoogleAuth: false,
        savedUser: user
      });
    } catch (error) {
      console.error('Account setup error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (field, placeholder, keyboardType = 'default', required = true) => (
    <View key={field} style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {placeholder}{required ? '*' : ''}
      </Text>
      <TextInput
        style={[
          styles.input,
          errors[field] && styles.inputError
        ]}
        placeholder={placeholder}
        placeholderTextColor="#000"
        value={formData[field]}
        onChangeText={(text) => updateFormData(field, text)}
        keyboardType={keyboardType}
        autoCapitalize={field.includes('Name') ? 'words' : 'none'}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()}>
                <Image 
                  source={require('../assets/backarrow.png')} 
                  style={styles.backArrowImage}
                />
              </Pressable>
              <Text style={styles.headerTitle}>CREATE ACCOUNT</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Personal Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Info</Text>
              <Text style={styles.sectionSubtitle}>
                Only your first name and last initial will be visible to others.
              </Text>
              
              {renderInputField('firstName', 'First Name')}
              {renderInputField('lastName', 'Last Name')}
              {renderInputField('email', 'Email Address', 'email-address')}
              {renderInputField('mobileNumber', 'Mobile Number', 'phone-pad')}
            </View>

            {/* Home Address Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Home Address</Text>
              <Text style={styles.sectionSubtitle}>
                Only assigned Couri Drivers will see your address.
              </Text>
              
              {/* Address Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Address*</Text>
                <TextInput
                  style={[styles.input, errors.fullAddress && styles.inputError]}
                  placeholder="Enter your address"
                  placeholderTextColor="#000"
                  value={formData.fullAddress}
                  onChangeText={(text) => updateFormData('fullAddress', text)}
                />
                {errors.fullAddress && (
                  <Text style={styles.errorText}>{errors.fullAddress}</Text>
                )}
              </View>

              {/* Display parsed address components as read-only */}
              {formData.addressLine1 && (
                <View style={styles.parsedAddressContainer}>
                  <Text style={styles.parsedAddressLabel}>Parsed Address:</Text>
                  <Text style={styles.parsedAddressText}>
                    {formData.addressLine1}
                    {formData.city && `, ${formData.city}`}
                    {formData.state && `, ${formData.state}`}
                    {formData.zip && ` ${formData.zip}`}
                  </Text>
                </View>
              )}

              {renderInputField('addressLine2', 'Address Line 2 (Optional)', 'default', false)}
            </View>

            {/* Terms and Privacy */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to Couri's{' '}
                <Text style={styles.link}>Terms of Use</Text> and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={loading}
            >
              <Text style={[styles.buttonText, loading && styles.buttonTextDisabled]}>
                {loading ? 'Creating Account...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  backArrowImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  inputError: {
    borderBottomColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  rightMargin: {
    marginRight: 8,
  },
  termsContainer: {
    marginBottom: 32,
  },
  termsText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    textAlign: 'center',
  },
  link: {
    textDecorationLine: 'underline',
    color: '#000',
  },
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  buttonTextDisabled: {
    color: '#666',
  },
}); 