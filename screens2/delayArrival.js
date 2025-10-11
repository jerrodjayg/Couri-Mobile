import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';

export default function DelayArrival({ navigation, route }) {
  const { transactionData } = route.params || {};
  const [selectedTime, setSelectedTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  // Generate time slots based on current time
  const generateTimeSlots = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Time slots: 9 AM to 6 PM with 1-hour intervals
    // 9-10 AM, 10-11 AM, 11 AM-12 PM, 12-1 PM, 1-2 PM, 2-3 PM, 3-4 PM, 4-5 PM, 5-6 PM
    
    const slots = [];
    let id = 1;

    // Calculate the next available hour (rounded up)
    let nextHour = currentHour;
    if (currentMinute > 0) {
      nextHour = currentHour + 1;
    }

    // If current time is within business hours (9 AM - 5 PM), show remaining today's slots
    if (currentHour >= 9 && currentHour < 17) {
      // Generate remaining today's slots (from next available hour to 5 PM, ending at 6 PM)
      for (let hour = nextHour; hour <= 17; hour++) {
        // Skip if we've already passed this hour
        if (hour < 9) continue;
        if (hour > 17) break;
        
        const startHour = hour;
        const endHour = hour + 1;
        
        const startTime = formatTime(startHour, 0);
        const endTime = formatTime(endHour, 0);
        
        slots.push({
          id: id.toString(),
          label: `${startTime} - ${endTime}`,
          value: `${startHour}:00-${endHour}:00`,
          isToday: true
        });
        id++;
      }
    }

    // Always show tomorrow's slots (9 AM to 6 PM)
    // Last slot starts at 5 PM and ends at 6 PM (hour 17 to 18)
    for (let hour = 9; hour <= 17; hour++) {
      const startHour = hour;
      const endHour = hour + 1;
      
      const startTime = formatTime(startHour, 0);
      const endTime = formatTime(endHour, 0);
      
      slots.push({
        id: id.toString(),
        label: `Tomorrow ${startTime} - ${endTime}`,
        value: `tomorrow-${startHour}:00-${endHour}:00`,
        isToday: false
      });
      id++;
    }

    return slots;
  };

  // Format time to 12-hour format with AM/PM
  const formatTime = (hour, minute) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, []);

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  const handleConfirmTime = async () => {
    if (selectedTime) {
      try {
        // Track that user confirmed time range
        await AsyncStorage.setItem('userJourney_timeConfirmed', 'true');
        await AsyncStorage.setItem('userJourney_confirmationCompleted', 'true');
        console.log('✅ User journey: Time range confirmed - confirmation flow completed');
      } catch (error) {
        console.error('Error tracking user journey:', error);
      }
      
      // Navigate to TrackingScreen with updated transaction data
      navigation.navigate('TrackingScreen', {
        ...transactionData,
        status: 'delayed',
        deliveryTime: selectedTime.label,
        deliveryStatus: 'scheduled',
        userAddress: transactionData?.userAddress || route.params?.userAddress,
        productPrice: transactionData?.productPrice || route.params?.productPrice,
        productTitle: transactionData?.productTitle || route.params?.productTitle,
        productDescription: transactionData?.productDescription || route.params?.productDescription,
        pickupAddress: transactionData?.pickupAddress || route.params?.pickupAddress,
        userProfile: transactionData?.userProfile || route.params?.userProfile
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={require('../assets/backarrow.png')}
              style={styles.backArrowImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>SELECT DELIVERY TIME</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>⏰</Text>
        </View>
        
        <Text style={styles.title}>Choose a new delivery time</Text>
        
        <Text style={styles.subtitle}>
          Select when you'll be available to receive your delivery.
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

        {/* Time Slots */}
        <View style={styles.timeSlotsContainer}>
          <Text style={styles.timeSlotsTitle}>Available Time Slots</Text>
          {timeSlots.map((time) => (
            <TouchableOpacity
              key={time.id}
              style={[
                styles.timeSlot,
                selectedTime?.id === time.id && styles.timeSlotSelected
              ]}
              onPress={() => handleTimeSelect(time)}
            >
              <Text style={[
                styles.timeSlotText,
                selectedTime?.id === time.id && styles.timeSlotTextSelected
              ]}>
                {time.label}
              </Text>
              {selectedTime?.id === time.id && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.confirmButton,
            !selectedTime && styles.confirmButtonDisabled
          ]}
          onPress={handleConfirmTime}
          disabled={!selectedTime}
        >
          <Text style={[
            styles.confirmButtonText,
            !selectedTime && styles.confirmButtonTextDisabled
          ]}>
            Confirm time range
          </Text>
        </TouchableOpacity>
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
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'center',
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
  timeSlotsContainer: {
    marginBottom: 32,
  },
  timeSlotsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  timeSlot: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeSlotSelected: {
    backgroundColor: '#e8f4fd',
    borderColor: '#007AFF',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: '#999',
  },
});