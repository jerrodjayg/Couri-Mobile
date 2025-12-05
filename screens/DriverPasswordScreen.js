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
import { useFocusEffect } from '@react-navigation/native';

export default function DriverPasswordScreen({ navigation, route }) {
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

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleCodeChange = (text) => {
    setCode(text);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleContinue = async () => {
    if (!code.trim()) {
      setError('try again');
      return;
    }

    // Check if code is correct
    if (code === '2154') {
      // Show modal instead of navigating directly
      setShowModal(true);
    } else {
      // Show error message
      setError('try again');
    }
  };

  const handlePersonSelect = (personName) => {
    setShowModal(false);
    // Navigate to DriverPortal after person is selected
    navigation.navigate('DriverPortal', { selectedPerson: personName });
  };

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
              <Text style={styles.headerTitle}>ENTER CODE</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Content Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enter Code</Text>
              <Text style={styles.sectionSubtitle}>
                Please enter the driver access code.
              </Text>
              
              {/* Code Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Code*
                </Text>
                <TextInput
                  style={[
                    styles.codeInput,
                    error && styles.inputError
                  ]}
                  placeholder="Enter code"
                  placeholderTextColor="#666"
                  value={code}
                  onChangeText={handleCodeChange}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  maxLength={10}
                />
                {error && (
                  <Text style={styles.errorText}>{error}</Text>
                )}
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={loading}
            >
              <Text style={[styles.buttonText, loading && styles.buttonTextDisabled]}>
                {loading ? 'Creating...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Who Are You Modal */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Title */}
            <Text style={styles.modalTitle}>Who are you?</Text>

            {/* Person Selection Buttons */}
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handlePersonSelect('Ed')}
              >
                <Text style={styles.modalButtonText}>Ed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handlePersonSelect('Kwesi')}
              >
                <Text style={styles.modalButtonText}>Kwesi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handlePersonSelect('Kenny')}
              >
                <Text style={styles.modalButtonText}>Kenny</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handlePersonSelect('Basil')}
              >
                <Text style={styles.modalButtonText}>Basil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  codeInput: {
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
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
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
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: '90%',
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 32,
    textAlign: 'center',
  },
  modalButtonsContainer: {
    width: '100%',
    gap: 16,
  },
  modalButton: {
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
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

