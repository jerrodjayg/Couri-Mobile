import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { Image } from 'react-native';
import axios from 'axios';
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
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';

const GEOAPIFY_API_KEY = 'd32e033d549b4ad5a9f56bd0519f87e3';

export default function CreateAccountScreen({ navigation }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = (name, value) => {
    setForm({ ...form, [name]: value });
    setError('');

    // Trigger address suggestions if editing address1
    if (name === 'address1' && value.length > 3) {
      fetchSuggestions(value);
    } else if (name === 'address1') {
      setSuggestions([]);
    }
  };

  const fetchSuggestions = async (text) => {
    try {
      const res = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
        params: {
          text,
          apiKey: GEOAPIFY_API_KEY,
          filter: 'countrycode:us',
          limit: 5,
        },
      });

      if (res.data && res.data.features) {
        setSuggestions(res.data.features);
      }
    } catch (err) {
      console.error('Autocomplete fetch error:', err);
    }
  };

  const selectSuggestion = (item) => {
    const { housenumber, street, city, state, postcode } = item.properties;

    setForm({
      ...form,
      address1: `${housenumber ? housenumber + ' ' : ''}${street}`,
      city: city || '',
      state: state || '',
      zip: postcode || '',
    });
    setSuggestions([]);
  };

  const isValidEmail = (email) => email.includes('@');

  const allRequiredFieldsFilled = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'zip', 'password'];
    return requiredFields.every((field) => form[field].trim() !== '');
  };

  const onContinue = async () => {
    setError('');

    if (!allRequiredFieldsFilled()) {
      setError('missingFields');
      return;
    }

    if (!isValidEmail(form.email)) {
      setError('invalidEmail');
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpError) {
      console.error(signUpError);
      setError('emailExists');
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert([
      {
        id: data.user.id,
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        zip: form.zip,
      },
    ]);

    if (profileError) {
      console.error(profileError);
      setError('profileSaveFailed');
      return;
    }

    navigation.navigate('Welcomepage', { name: form.firstName });
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
      case 'emailExists':
        message = 'Account already exists with that email';
        break;
      case 'profileSavedFailed':
          message = 'Failed to save your profile info';
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()}>
              <Image 
              source={{ uri: 'https://cdn-icons-png.freepik.com/256/5629/5629228.png?ga=GA1.1.769728529.1750374396&semt=ais_hybrid' }}
              style={styles.backArrowImage}
              resizeMode="contain"
             />
          </Pressable>
          <Text style={styles.headerTitle}>CREATE ACCOUNT</Text>
          <View style={{ width: 24 }} />
        </View>

          {renderError()}

          <Text style={styles.sectionTitle}>Personal Info</Text>
          <TextInput placeholder="First Name*" value={form.firstName} onChangeText={(text) => handleChange('firstName', text)} style={styles.input} />
          <TextInput placeholder="Last Name*" value={form.lastName} onChangeText={(text) => handleChange('lastName', text)} style={styles.input} />
          <TextInput placeholder="Email Address*" value={form.email} onChangeText={(text) => handleChange('email', text)} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
          <TextInput placeholder="Mobile Number*" value={form.phone} onChangeText={(text) => handleChange('phone', text)} keyboardType="phone-pad" style={styles.input} />
          <TextInput placeholder="Password*" value={form.password} onChangeText={(text) => handleChange('password', text)} secureTextEntry style={styles.input} />

          <Text style={styles.sectionTitle}>Home Address</Text>
          <TextInput
            placeholder="Address Line 1*"
            value={form.address1}
            onChangeText={(text) => handleChange('address1', text)}
            style={styles.input}
          />

          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableWithoutFeedback onPress={() => selectSuggestion(item)}>
                    <View style={styles.suggestionItem}>
                      <Text>{item.properties.formatted}</Text>
                    </View>
                  </TouchableWithoutFeedback>
                )}
              />
            </View>
          )}

          <TextInput
            placeholder="Address Line 2 (Optional)"
            value={form.address2}
            onChangeText={(text) => handleChange('address2', text)}
            style={styles.input}
          />
          <TextInput placeholder="City*" value={form.city} onChangeText={(text) => handleChange('city', text)} style={styles.input} />
          <View style={styles.row}>
            <TextInput
              placeholder="State*"
              value={form.state}
              onChangeText={(text) => handleChange('state', text)}
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              placeholder="Zip*"
              value={form.zip}
              onChangeText={(text) => handleChange('zip', text)}
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <Text style={styles.legal}>
            By creating an account, you agree to Couri’s{' '}
            <Text style={[styles.legal, styles.link]}>Terms of Use</Text> and{' '}
            <Text style={[styles.legal, styles.link]}>Privacy Policy</Text>.
          </Text>

          <TouchableOpacity style={styles.button} onPress={onContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { padding: 24, backgroundColor: 'transparent', paddingBottom: 80, flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backArrow: { fontSize: 24 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  sectionTitle: { fontSize: 20, fontWeight: '500', marginBottom: 12, marginTop: 20 },
  input: { borderBottomWidth: 1, borderBottomColor: '#222', paddingVertical: 12, marginBottom: 16, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  legal: { fontSize: 12, color: '#444', marginTop: 20, marginBottom: 20 },
  link: { textDecorationLine: 'underline', color: '#000' },
  button: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 50, alignItems: 'center', marginBottom: 50 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  errorIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  errorIconText: { color: 'white', fontWeight: 'bold', fontSize: 14, lineHeight: 14 },
  errorText: { color: 'red', fontWeight: '600' },

  // New styles for address suggestions
  suggestionBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backArrowImage: {
    width: 24,
    height: 24,
  },
  suggestionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  }
});
