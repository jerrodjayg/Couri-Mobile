import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';

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
  });

  const handleChange = (name, value) => {
    setForm({ ...form, [name]: value });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>CREATE ACCOUNT</Text>
        <View style={{ width: 24 }} /> {/* Filler for alignment */}
      </View>

      {/* Personal Info */}
      <Text style={styles.sectionTitle}>Personal Info</Text>
      <TextInput
        placeholder="First Name*"
        value={form.firstName}
        onChangeText={(text) => handleChange('firstName', text)}
        style={styles.input}
      />
      <TextInput
        placeholder="Last Name*"
        value={form.lastName}
        onChangeText={(text) => handleChange('lastName', text)}
        style={styles.input}
      />
      <TextInput
        placeholder="Email Address*"
        value={form.email}
        onChangeText={(text) => handleChange('email', text)}
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Mobile Number*"
        value={form.phone}
        onChangeText={(text) => handleChange('phone', text)}
        keyboardType="phone-pad"
        style={styles.input}
      />

      {/* Address */}
      <Text style={styles.sectionTitle}>Home Address</Text>
      <TextInput
        placeholder="Address Line 1*"
        value={form.address1}
        onChangeText={(text) => handleChange('address1', text)}
        style={styles.input}
      />
      <TextInput
        placeholder="Address Line 2 (Optional)"
        value={form.address2}
        onChangeText={(text) => handleChange('address2', text)}
        style={styles.input}
      />
      <TextInput
        placeholder="City*"
        value={form.city}
        onChangeText={(text) => handleChange('city', text)}
        style={styles.input}
      />
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

      {/* Legal Text (FIXED) */}
      <Text style={styles.legal}>
        By creating an account, you agree to Couri’s{' '}
        <Text style={[styles.legal, styles.link]}>Terms of Use</Text> and{' '}
        <Text style={[styles.legal, styles.link]}>Privacy Policy</Text>.
      </Text>

      {/* Continue Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backArrow: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 12,
    marginTop: 20,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  legal: {
    fontSize: 12,
    color: '#444',
    marginTop: 20,
    marginBottom: 20,
  },
  link: {
    textDecorationLine: 'underline',
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 50,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
