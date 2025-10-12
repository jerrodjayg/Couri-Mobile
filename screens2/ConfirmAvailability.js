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

export default function ConfirmAvailability({ navigation, route }) {
  const { transactionData } = route.params || {};
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
      await AsyncStorage.setItem('userJourney_yesAvailable', 'true');
      await AsyncStorage.setItem('userJourney_confirmationCompleted', 'true');
      console.log('✅ User journey: Yes, I\'m available clicked - confirmation flow completed');
    } catch (error) {
      console.error('Error tracking user journey:', error);
    }
    
    // Navigate to TrackingScreen with all necessary data
    navigation.navigate('TrackingScreen', {
      ...transactionData,
      deliveryStatus: 'confirmed',
      userAddress: transactionData?.userAddress || route.params?.userAddress,
      productPrice: transactionData?.productPrice || route.params?.productPrice,
      productTitle: transactionData?.productTitle || route.params?.productTitle,
      productDescription: transactionData?.productDescription || route.params?.productDescription,
      pickupAddress: transactionData?.pickupAddress || route.params?.pickupAddress,
      userProfile: transactionData?.userProfile || route.params?.userProfile
    });
  };

  const handleNoAvailable = async () => {
    try {
      // Track that user clicked "No, show me other options"
      await AsyncStorage.setItem('userJourney_noAvailable', 'true');
      console.log('✅ User journey: No, show me other options clicked');
    } catch (error) {
      console.error('Error tracking user journey:', error);
    }
    
    // Navigate to delayArrival page
    navigation.navigate('delayArrival', {
      transactionData
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F8F8" />
      
      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>⚠</Text>
          </View>
          <Text style={styles.title}>
            Please confirm your{'\n'}availability for product{'\n'}pickup
          </Text>
        </View>
        
        <Text style={styles.subtitle}>
          We'll send a Couri driver to your location to pickup your product. Are you available between <Text style={styles.boldTime}>{deliveryTime}</Text>?
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
    backgroundColor: '#F8F8F8',
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
  iconText: {
    fontSize: 32,
    color: '#000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'normal',
    color: '#000',
    textAlign: 'left',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    color: '#000',
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 40,
  },
  boldTime: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  yesButton: {
    backgroundColor: '#000',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  yesButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  noButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});