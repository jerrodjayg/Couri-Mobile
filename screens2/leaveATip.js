import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Keyboard,
} from 'react-native';

export default function LeaveATip({ navigation, route }) {
  const [selectedTip, setSelectedTip] = useState('2%'); // Default to 2% selected
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [hasCustomTip, setHasCustomTip] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Calculate tip amounts based on order total (you can make this dynamic)
  const orderTotal = 280; // This could be passed from route params
  const tipPercentages = [
    { percent: '1%', amount: (orderTotal * 0.01).toFixed(2) },
    { percent: '2%', amount: (orderTotal * 0.02).toFixed(2) },
    { percent: '3%', amount: (orderTotal * 0.03).toFixed(2) },
  ];

  const handleTipSelect = (percent) => {
    setSelectedTip(percent);
    setHasCustomTip(false);
  };

  const handleCustomAmountPress = () => {
    setShowCustomModal(true);
  };

  const handleCloseModal = () => {
    setShowCustomModal(false);
    setCustomAmount(''); // Reset input field when closing
  };

  const handleSaveCustomTip = () => {
    if (customAmount.trim() === '') {
      // If nothing entered, set to $0.00
      setCustomAmount('0.00');
      setHasCustomTip(true);
      setSelectedTip(null);
    } else {
      // Format the amount properly
      let formattedAmount = customAmount;
      if (!customAmount.includes('.')) {
        formattedAmount = customAmount + '.00';
      } else {
        const parts = customAmount.split('.');
        if (parts[1] && parts[1].length === 1) {
          formattedAmount = parts[0] + '.' + parts[1] + '0';
        } else if (!parts[1]) {
          formattedAmount = parts[0] + '.00';
        }
      }
      setCustomAmount(formattedAmount);
      setHasCustomTip(true);
      setSelectedTip(null);
    }
    setShowCustomModal(false);
  };


  const handleSubmitTip = () => {
    console.log('Tip submitted:', hasCustomTip ? customAmount : selectedTip);
    // Add navigation to next screen or handle tip submission
  };

  const handleNoThanks = () => {
    console.log('No tip selected');
    // Add navigation to next screen
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leave a tip</Text>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.contentContainer}>
          {/* Golden Coin Icon */}
          <View style={styles.coinContainer}>
            <Text style={styles.coinIcon}>🪙</Text>
            <View style={styles.sparkles}>
              <Text style={styles.sparkle1}>✨</Text>
              <Text style={styles.sparkle2}>✨</Text>
            </View>
          </View>

          {/* Main Title */}
          <Text style={styles.mainTitle}>
            Make your driver's day with a tip!
          </Text>

          {/* Driver Information Box */}
          <View style={styles.driverInfoBox}>
            <Text style={styles.driverLabel}>YOUR COURI DRIVER</Text>
          </View>

          {/* Tip Description */}
          <Text style={styles.tipDescription}>
            100% of your tip goes to the driver. Suggested tips are based on your order:
          </Text>

          {/* Suggested Tip Buttons */}
          <View style={styles.tipButtonsContainer}>
            {tipPercentages.map((tip) => (
              <TouchableOpacity
                key={tip.percent}
                style={[
                  styles.tipButton,
                  selectedTip === tip.percent && styles.tipButtonSelected
                ]}
                onPress={() => handleTipSelect(tip.percent)}
              >
                <Text style={[
                  styles.tipAmount,
                  selectedTip === tip.percent && styles.tipTextSelected
                ]}>
                  ${tip.amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount Button */}
          <View style={styles.customAmountContainer}>
            {hasCustomTip ? (
              <View style={styles.customAmountDisplay}>
                <Text style={styles.customAmountText}>
                  Custom tip: ${customAmount}
                </Text>
                <TouchableOpacity onPress={handleCustomAmountPress}>
                  <Text style={styles.changeAmountText}>Change amount</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.customAmountButton}
                onPress={handleCustomAmountPress}
              >
                <Text style={styles.customAmountText}>Enter custom amount</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleNoThanks}>
          <Text style={styles.noThanksText}>No thanks</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmitTip}
        >
          <Text style={styles.submitButtonText}>Submit Tip</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Tip Modal */}
      <Modal
        visible={showCustomModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            // Dismiss keyboard when tapping outside
            Keyboard.dismiss();
            setShowCustomModal(false);
            setCustomAmount(''); // Reset input field when tapping outside
          }}
        >
          <TouchableOpacity 
            style={[
              styles.modalContainer,
              { marginBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }
            ]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            {/* Modal Content */}
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter custom tip amount</Text>
              
              {/* Input Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={customAmount}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  editable={true}
                  autoFocus={true}
                  onFocus={() => {
                    // Add cursor styling on focus
                  }}
                  onChangeText={(text) => {
                    // Allow only numbers and decimal point
                    let cleanedText = text.replace(/[^0-9.]/g, '');
                    
                    // Ensure only one decimal point
                    const parts = cleanedText.split('.');
                    if (parts.length > 2) {
                      cleanedText = parts[0] + '.' + parts.slice(1).join('');
                    }
                    
                    // Limit to 2 decimal places - don't allow input if trying to exceed
                    if (cleanedText.includes('.')) {
                      const [whole, decimal] = cleanedText.split('.');
                      if (decimal && decimal.length > 2) {
                        // Don't update the state - ignore the input
                        return;
                      }
                    }
                    
                    setCustomAmount(cleanedText);
                  }}
                />
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveCustomTip}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
  coinContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  coinIcon: {
    fontSize: 48,
  },
  sparkles: {
    position: 'absolute',
    top: -5,
    left: -10,
  },
  sparkle1: {
    fontSize: 16,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sparkle2: {
    fontSize: 12,
    position: 'absolute',
    top: 5,
    right: -15,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 32,
  },
  driverInfoBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 24,
    minWidth: 200,
    alignItems: 'center',
  },
  driverLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    letterSpacing: 1,
  },
  tipDescription: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  tipButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  tipButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tipPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  tipAmount: {
    fontSize: 14,
    color: '#333333',
  },
  tipTextSelected: {
    color: '#fff',
  },
  customAmountContainer: {
    marginBottom: 40,
  },
  customAmountButton: {
    alignItems: 'center',
  },
  customAmountDisplay: {
    alignItems: 'center',
  },
  customAmountText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  changeAmountText: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  noThanksText: {
    fontSize: 16,
    color: '#333333',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    height: 280,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 24,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#333333',
    fontWeight: 'bold',
  },
  modalContent: {
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 18,
    color: '#333333',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dollarSign: {
    fontSize: 24,
    color: '#333333',
    marginRight: 8,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    color: '#333333',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    paddingVertical: 12,
    marginRight: 16,
    textAlign: 'left',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { supabase } from '../screens/supabaseClient';