import React, { useState, useEffect } from 'react';
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
    
    // Calculate the next available hour (rounded up)
    let nextHour = currentHour;
    if (currentMinute > 0) {
      nextHour = currentHour + 1;
    }
    
    // If it's already past 8 PM, show tomorrow's first slot
    if (nextHour > 20) {
      return 'Tomorrow 9:00 AM - 10:00 AM';
    }
    
    // Default to 3:00 PM - 4:00 PM if current time is before 3 PM
    if (nextHour < 15) {
      return '3:00 PM - 4:00 PM';
    }
    
    // Show next available hour
    const startTime = formatTime(nextHour, 0);
    const endTime = formatTime(nextHour + 1, 0);
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

  const handleYesAvailable = () => {
    // Navigate to TrackingScreen
    navigation.navigate('TrackingScreen', {
      ...transactionData,
      deliveryStatus: 'confirmed'
    });
  };

  const handleNoAvailable = () => {
    // Navigate to delayArrival page
    navigation.navigate('delayArrival', {
      transactionData
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={{ uri: 'https://cdn-icons-png.freepik.com/256/5629/5629228.png' }}
              style={styles.backArrowImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>CONFIRM AVAILABILITY</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>📅</Text>
        </View>
        
        <Text style={styles.title}>Are you available for delivery?</Text>
        
        <Text style={styles.subtitle}>
          Your Couri driver will arrive between {deliveryTime}. Please confirm if you'll be home to receive the delivery.
        </Text>

        {/* Transaction Details */}
        {transactionData && (
          <View style={styles.transactionCard}>
            <View style={styles.transactionContent}>
              <View style={styles.transactionDetails}>
                <Text style={styles.productTitle}>
                  "{transactionData.productTitle || 'Product'}"
                </Text>
                {transactionData.productDescription && (
                  <Text style={styles.productDescription}>
                    {transactionData.productDescription}
                  </Text>
                )}
              </View>
              
              {transactionData.productImage && (
                <Image 
                  source={{ uri: transactionData.productImage }} 
                  style={styles.productImage} 
                  resizeMode="cover"
                />
              )}
            </View>
          </View>
        )}

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
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  backArrowImage: {
    width: 24,
    height: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transactionDetails: {
    flex: 1,
    marginRight: 16,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  yesButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  yesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  noButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});