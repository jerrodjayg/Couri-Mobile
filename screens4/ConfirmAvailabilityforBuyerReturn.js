import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Warning/Alert Icon SVG Component matching Figma design
const WarningIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
    <Path
      d="M16 4L2 28H30L16 4Z"
      stroke="#171715"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M16 12V18"
      stroke="#171715"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 22H16.01"
      stroke="#171715"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function ConfirmAvailabilityforBuyerReturn({ navigation, route }) {
  const { transactionData, returnDetails, productDetails, userProfile } = route.params || {};
  const [deliveryTime, setDeliveryTime] = useState('3:00 PM - 4:00 PM');

  // Generate delivery time based on current time
  const generateDeliveryTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // If current time is before 9 AM or after 5 PM, schedule for next day at 9:00 AM
    if (currentHour < 9 || currentHour >= 17) {
      return '9:00 AM - 9:20 AM';
    }
    
    // If current time is within 9 AM to 5 PM, schedule 1 hour from current time
    let nextHour = currentHour + 1;
    
    // If adding 1 hour goes past 5 PM, schedule for next day at 9:00 AM
    if (nextHour >= 17) {
      return '9:00 AM - 9:20 AM';
    }
    
    // Format the time slot (1 hour from current time with 20-minute window)
    const startTime = formatTime(nextHour, 0);
    const endTime = formatTime(nextHour, 20);
    return `${startTime} - ${endTime}`;
  };

  // Format time to 12-hour format with AM/PM
  const formatTime = (hour, minute) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  useEffect(() => {
    setDeliveryTime(generateDeliveryTime());
  }, []);

  const handleYesAvailable = async () => {
    try {
      // Track that user clicked "Yes, I'm available"
      await AsyncStorage.setItem('userJourney_returnYesAvailable', 'true');
      await AsyncStorage.setItem('userJourney_returnConfirmationCompleted', 'true');
      console.log('✅ Buyer Return: Yes, I\'m available clicked - return confirmation flow completed');
    } catch (error) {
      console.error('Error tracking user journey:', error);
    }
    
    // Navigate to return tracking screen with all necessary data
    navigation.navigate('ReturnTrackingScreen', {
      ...transactionData,
      returnStatus: 'confirmed',
      deliveryTime: deliveryTime,
      userAddress: transactionData?.userAddress || route.params?.userAddress,
      productPrice: transactionData?.productPrice || route.params?.productPrice,
      productTitle: transactionData?.productTitle || route.params?.productTitle,
      productDescription: transactionData?.productDescription || route.params?.productDescription,
      returnDetails: returnDetails,
      productDetails: productDetails,
      userProfile: userProfile || transactionData?.userProfile || route.params?.userProfile
    });
  };

  const handleNoAvailable = async () => {
    try {
      // Track that user clicked "No, show me other options"
      await AsyncStorage.setItem('userJourney_returnNoAvailable', 'true');
      console.log('✅ Buyer Return: No, show me other options clicked');
    } catch (error) {
      console.error('Error tracking user journey:', error);
    }
    
    // Navigate to delay return page
    navigation.navigate('DelayArrivalforBuyerReturn', {
      transactionData,
      returnDetails,
      productDetails,
      userProfile
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBF9" />
      
      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          {/* Pink Warning Icon matching Figma design */}
          <View style={styles.iconContainer}>
            <WarningIcon />
          </View>
          <Text style={styles.title}>
            Please confirm your{'\n'}availability for return{'\n'}pickup
          </Text>
        </View>
        
        <Text style={styles.subtitle}>
          We'll send a Couri driver to your location to pickup your return item. Are you available between <Text style={styles.boldTime}>{deliveryTime}</Text>?
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.yesButton} onPress={handleYesAvailable}>
            <Text style={styles.yesButtonText}>Yes, I'm available</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.noButton} onPress={handleNoAvailable}>
            <Text style={styles.noButtonText}>No, show me other options</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBF9',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'flex-start',
    marginBottom: 32,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE8FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#171715',
    textAlign: 'left',
    lineHeight: 38,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 40,
    alignSelf: 'flex-start',
  },
  boldTime: {
    fontWeight: '700',
    color: '#171715',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  yesButton: {
    backgroundColor: '#171715',
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    // Shadow for 3D button effect
    shadowColor: '#171715',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 4,
  },
  yesButtonText: {
    color: '#FBFBF9',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  noButton: {
    backgroundColor: '#FBFBF9',
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#171715',
  },
  noButtonText: {
    color: '#171715',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
});
