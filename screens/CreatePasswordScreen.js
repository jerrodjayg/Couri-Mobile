import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CreatePasswordScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isValid, setIsValid] = useState({});

  useEffect(() => {
    if (password.length > 0) {
      validatePassword(password);
    } else {
      setIsValid({});
    }
  }, [password]);

  const validatePassword = (pwd) => {
    const rules = {
      minLength: pwd.length >= 8,
      maxLength: pwd.length <= 80,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      symbol: /[!%&@#$^*?_~]/.test(pwd),
      noEmoji: /^[\u0000-\u007F]*$/.test(pwd),
    };
    setIsValid(rules);
  };

  const allValid =
    Object.values(isValid).length > 0 &&
    Object.values(isValid).every(Boolean) &&
    password === confirmPassword;

  const RuleItem = ({ rule, valid, show }) => (
    <Text style={styles.requirement}>
      {show ? (
        <Ionicons
          name={valid ? 'checkmark-circle' : 'close-circle'}
          size={16}
          color={valid ? 'green' : 'red'}
        />
      ) : (
        <Ionicons name="ellipse-outline" size={16} color="gray" />
      )}
      {'  '}
      {rule}
    </Text>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>CREATE PASSWORD</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              secureTextEntry={!showPassword}
              style={[styles.input, styles.placeholderText]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#000"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="gray" />
            </TouchableOpacity>
          </View>

          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password requirements:</Text>
            <RuleItem rule="Min. 8 characters" valid={isValid.minLength} show={password.length > 0} />
            <RuleItem rule="Max. 80 characters" valid={isValid.maxLength} show={password.length > 0} />
            <RuleItem rule="Must include uppercase letter" valid={isValid.upper} show={password.length > 0} />
            <RuleItem rule="Must include lowercase letter" valid={isValid.lower} show={password.length > 0} />
            <RuleItem rule="Must include a symbol (!%&@#$^*?_~)" valid={isValid.symbol} show={password.length > 0} />
            <RuleItem rule="Can't include emojis" valid={isValid.noEmoji} show={password.length > 0} />
            <RuleItem
              rule="Passwords match"
              valid={password === confirmPassword && confirmPassword.length > 0}
              show={confirmPassword.length > 0}
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              secureTextEntry={!showConfirm}
              style={[styles.input, styles.placeholderText]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              placeholderTextColor="#000"
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye' : 'eye-off'} size={20} color="gray" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: allValid ? '#000' : '#fff',
                borderWidth: 1,
                borderColor: '#000',
              },
            ]}
            disabled={!allValid}
            onPress={() => {
              if (allValid) {
                navigation.navigate('FaceID');
              }
            }}
          >
            <Text
              style={[
                styles.continueText,
                {
                  color: allValid ? '#fff' : '#000',
                },
              ]}
            >
              Continue
            </Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 66,
  },
  backArrow: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
  },
  placeholderText: {
    fontSize: 26,
    fontWeight: '200', // thinner
    color: '#000',
  },
  requirementsBox: {
    paddingVertical: 12,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueButton: {
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 32, // more space below inputs
  },
  continueText: {
    fontWeight: '700',
    fontSize: 18,
  },
});