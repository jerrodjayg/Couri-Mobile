import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Green Checkmark Icon PNG from assets
const greenCheckmarkIcon = require('../assets/green_checkmark_screens4.png');

// Support/Headset Icon PNG from assets
const supportIcon = require('../assets/support.png');

// Couri Logo PNG from assets
const couriLogo = require('../assets/Logo_Dark.png');

export default function ConfirmProductHandoff({ navigation, route }) {
  const { transactionData, returnDetails, productDetails, userProfile } = route.params || {};

  const handleDriverHasProduct = async () => {
    try {
      await AsyncStorage.setItem('userJourney_productHandoffConfirmed', 'true');
      console.log('✅ Product handoff confirmed - driver has the product');
    } catch (error) {
      console.error('Error tracking user journey:', error);
    }
    
    // Navigate to next screen in return flow
    navigation.navigate('ReturnTrackingScreen', {
      ...transactionData,
      returnStatus: 'handoff_confirmed',
      returnDetails: returnDetails,
      productDetails: productDetails,
      userProfile: userProfile
    });
  };

  const handleContactSupport = () => {
    navigation.navigate('Support');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBF9" />
      
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image 
          source={couriLogo} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Main Content - Centered */}
      <View style={styles.mainContent}>
        <View style={styles.contentContainer}>
          {/* Green Checkmark Icon */}
          <View style={styles.iconContainer}>
            <Image 
              source={greenCheckmarkIcon} 
              style={styles.checkmarkIcon} 
              resizeMode="contain" 
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            Please confirm{'\n'}product handoff
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Your product is ready for return to the seller. Let us know when your Couri driver has left with the product.
          </Text>

          {/* Button with 3D Effect */}
          <View style={styles.buttonContainer}>
            {/* Shadow/border layer for 3D effect */}
            <View style={styles.buttonShadowLayer} />
            {/* Main button */}
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleDriverHasProduct}
            >
              <Text style={styles.confirmButtonText}>The driver has the product</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Divider Line */}
        <View style={styles.divider} />

        {/* Did something go wrong? */}
        <Text style={styles.wrongText}>Did something go wrong?</Text>

        {/* Contact Support Button */}
        <TouchableOpacity 
          style={styles.supportButton}
          onPress={handleContactSupport}
        >
          <Image 
            source={supportIcon} 
            style={styles.supportIcon} 
            resizeMode="contain" 
          />
          <Text style={styles.supportButtonText}>Contact support</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBF9',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  logo: {
    width: 65,
    height: 28,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  contentContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  checkmarkIcon: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    position: 'relative',
    width: '100%',
    height: 56,
  },
  buttonShadowLayer: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    height: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#171715',
    backgroundColor: 'transparent',
  },
  confirmButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 4,
    backgroundColor: '#171715',
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#171715',
  },
  confirmButtonText: {
    color: '#FBFBF9',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.15,
    lineHeight: 20,
  },
  bottomSection: {
    paddingHorizontal: 22,
    paddingBottom: 40,
    alignItems: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#82827F',
    marginBottom: 30,
  },
  wrongText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEFED',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 60,
    gap: 4,
  },
  supportIcon: {
    width: 20,
    height: 20,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171715',
    lineHeight: 24,
  },
});

