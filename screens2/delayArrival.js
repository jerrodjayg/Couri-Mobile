import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Animated,
  Linking,
} from 'react-native';

export default function DelayArrival({ navigation, route }) {
  const { transactionData } = route.params || {};
  const [selectedTime, setSelectedTime] = useState(null);
  const [todaySlots, setTodaySlots] = useState([]);
  const [tomorrowSlots, setTomorrowSlots] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Generate time slots based on current time
  const generateTimeSlots = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const todaySlotsArray = [];
    const tomorrowSlotsArray = [];
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
        
        todaySlotsArray.push({
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
      
      tomorrowSlotsArray.push({
        id: id.toString(),
        label: `${startTime} - ${endTime}`,
        value: `tomorrow-${startHour}:00-${endHour}:00`,
        isToday: false
      });
      id++;
    }

    return { todaySlots: todaySlotsArray, tomorrowSlots: tomorrowSlotsArray };
  };

  // Format time to 12-hour format with AM/PM
  const formatTime = (hour, minute) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  useEffect(() => {
    const { todaySlots, tomorrowSlots } = generateTimeSlots();
    setTodaySlots(todaySlots);
    setTomorrowSlots(tomorrowSlots);
  }, []);

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setShowConfirmModal(true);
    // Animate modal sliding up
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleConfirmTime = async () => {
    if (selectedTime) {
      setShowConfirmModal(false);
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

  const handleCloseModal = () => {
    // Animate modal sliding down
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowConfirmModal(false);
      setSelectedTime(null);
    });
  };

  const handleContactSupport = () => {
    Linking.openURL('https://gocouri.com');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/backarrow.png')}
            style={styles.backArrowImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Delay Arrival</Text>
        
        <Text style={styles.instructionText}>
          Choose a time range in the next 24 hours when you will be home to meet a Couri driver:
        </Text>

        {/* Today Time Slots */}
        {todaySlots.length > 0 && (
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>Today</Text>
            {todaySlots.map((time) => (
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
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tomorrow Time Slots */}
        <View style={styles.timeSection}>
          <Text style={styles.sectionTitle}>Tomorrow</Text>
          {tomorrowSlots.map((time) => (
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
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Support */}
        <View style={styles.contactSection}>
          <Text style={styles.contactText}>None of these work?</Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Close button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            {/* Modal title */}
            <Text style={styles.modalTitle}>
              Confirm your availability between{'\n'}{selectedTime?.label} {selectedTime?.isToday ? 'today' : 'tomorrow'}?
            </Text>

            {/* Confirm button */}
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirmTime}
            >
              <Text style={styles.confirmButtonText}>Confirm time range</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20,
  },
  headerRight: {
    flex: 1,
  },
  backArrowImage: {
    width: 24,
    height: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 32,
  },
  timeSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#333',
    marginBottom: 16,
  },
  timeSlot: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeSlotSelected: {
    backgroundColor: '#10B981',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  timeSlotTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  contactSection: {
    marginTop: 0,
    marginBottom: 40,
    alignItems: 'center',
  },
  contactText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingBottom: 60,
    minHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: -49,
    right: 7,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 35,
    color: '#fff',

  },
  modalTitle: {
    fontSize: 18,
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmButton: {
    backgroundColor: '#000',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});