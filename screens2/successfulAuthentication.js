import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';

export default function SuccessfulAuthentication({ navigation, route }) {
  const handleDriverHasProduct = () => {
    console.log('Driver has the product confirmed');
    navigation.navigate('LeaveATip');
  };

  const handleContactSupport = () => {
    console.log('Contact Support pressed');
    // Add navigation to support screen or contact functionality
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.contentContainer}>
          {/* Logo */}
          <Text style={styles.logo}>couri</Text>

          {/* Confirmation Section */}
          <View style={styles.confirmationSection}>
            {/* Checkmark Icon */}
            <View style={styles.checkmarkContainer}>
              <View style={styles.checkmarkIcon}>
                <Text style={styles.checkmarkSymbol}>✓</Text>
              </View>
            </View>

            {/* Main Title */}
            <Text style={styles.mainTitle}>
              Please confirm product handoff
            </Text>

            {/* Descriptive Text */}
            <Text style={styles.descriptiveText}>
              Your product is ready for delivery to the buyer. Let us know when your Couri driver has left with the product.
            </Text>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleDriverHasProduct}
          >
            <Text style={styles.primaryButtonText}>The driver has the product</Text>
          </TouchableOpacity>

          {/* Support Section */}
          <View style={styles.supportSection}>
            <Text style={styles.supportQuestion}>Did something go wrong?</Text>
            
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={handleContactSupport}
            >
              <View style={styles.supportButtonContent}>
                <Text style={styles.headphoneIcon}>🎧</Text>
                <Text style={styles.supportButtonText}>Contact support</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#424242', // Dark grey border/background
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#fff', // White content area
    margin: 20, // Creates the dark grey border effect
    borderRadius: 0, // Keep sharp corners as shown in image
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'normal',
    color: '#333333', // Dark grey
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1,
  },
  confirmationSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  checkmarkContainer: {
    marginBottom: 32,
  },
  checkmarkIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#268057', // Teal/mint green background
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkSymbol: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333', // Dark grey
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 32,
    maxWidth: 280,
  },
  descriptiveText: {
    fontSize: 16,
    color: '#666666', // Lighter grey
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 60,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  supportSection: {
    alignItems: 'center',
  },
  supportQuestion: {
    fontSize: 16,
    color: '#666666', // Lighter grey
    textAlign: 'center',
    marginBottom: 16,
  },
  supportButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CCCCCC', // Light grey border
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  supportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headphoneIcon: {
    fontSize: 16,
  },
  supportButtonText: {
    fontSize: 14,
    color: '#333333', // Dark grey
    fontWeight: '500',
  },
});
