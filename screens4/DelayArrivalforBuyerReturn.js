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

export default function DelayArrivalforBuyerReturn({ navigation, route }) {
  const { transactionData, returnDetails, productDetails, userProfile } = route.params || {};
  const [selectedTime, setSelectedTime] = useState(null);
  const [todaySlots, setTodaySlots] = useState([]);
  const [tomorrowSlots, setTomorrowSlots] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Generate time slots based on current time
  // Available slots: 9:00 AM to 6:00 PM (last slot 5:00 PM - 6:00 PM)
  // Each slot is 1 hour interval
  const generateTimeSlots = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const todaySlotsArray = [];
    const tomorrowSlotsArray = [];
    let id = 1;

    // Calculate the next available hour (rounded up to next full hour)
    // e.g., if current time is 2:36 PM, next available is 3:00 PM
    let nextAvailableHour = currentHour;
    if (currentMinute > 0) {
      nextAvailableHour = currentHour + 1;
    }

    // Generate today's remaining slots
    // Only show today's slots if we're within business hours (9 AM - 6 PM)
    // And if there are still slots available
    if (nextAvailableHour >= 9 && nextAvailableHour < 18) {
      // Generate slots from next available hour up to 6 PM
      // Last slot starts at 5 PM (17:00) and ends at 6 PM (18:00)
      for (let hour = nextAvailableHour; hour <= 17; hour++) {
        const startHour = hour;
        const endHour = hour + 1;
        
        const startTime = formatTime(startHour, 0);
        const endTime = formatTime(endHour, 0);
        
        todaySlotsArray.push({
          id: id.toString(),
          label: `${startTime} - ${endTime}`,
          value: `today-${startHour}:00-${endHour}:00`,
          isToday: true,
          startHour: startHour,
          endHour: endHour
        });
        id++;
      }
    }

    // Generate tomorrow's slots (always all slots from 9 AM to 6 PM)
    for (let hour = 9; hour <= 17; hour++) {
      const startHour = hour;
      const endHour = hour + 1;
      
      const startTime = formatTime(startHour, 0);
      const endTime = formatTime(endHour, 0);
      
      tomorrowSlotsArray.push({
        id: id.toString(),
        label: `${startTime} - ${endTime}`,
        value: `tomorrow-${startHour}:00-${endHour}:00`,
        isToday: false,
        startHour: startHour,
        endHour: endHour
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

  // Format time range for modal display (e.g., "3:00 to 4:00 PM")
  const formatTimeRange = (timeSlot) => {
    if (!timeSlot) return '';
    const startHour = timeSlot.startHour;
    const endHour = timeSlot.endHour;
    
    // Format start time (without AM/PM if same period as end time)
    const startPeriod = startHour >= 12 ? 'PM' : 'AM';
    const endPeriod = endHour >= 12 ? 'PM' : 'AM';
    
    const startDisplayHour = startHour > 12 ? startHour - 12 : (startHour === 0 ? 12 : startHour);
    const endDisplayHour = endHour > 12 ? endHour - 12 : (endHour === 0 ? 12 : endHour);
    
    // If same period, only show period at end
    if (startPeriod === endPeriod) {
      return `${startDisplayHour}:00 to ${endDisplayHour}:00 ${endPeriod}`;
    } else {
      return `${startDisplayHour}:00 ${startPeriod} to ${endDisplayHour}:00 ${endPeriod}`;
    }
  };

  // Get formatted date for display
  const getFormattedDate = (isToday) => {
    const date = new Date();
    if (!isToday) {
      date.setDate(date.getDate() + 1);
    }
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
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
        // Track that user confirmed time range for return
        await AsyncStorage.setItem('userJourney_returnTimeConfirmed', 'true');
        await AsyncStorage.setItem('userJourney_returnConfirmationCompleted', 'true');
        console.log('✅ Buyer Return: Time range confirmed - return confirmation flow completed');
      } catch (error) {
        console.error('Error tracking user journey:', error);
      }
      
      // Navigate to TrackingScreen with updated transaction data
      navigation.navigate('TrackingScreen', {
        ...transactionData,
        returnStatus: 'scheduled',
        deliveryTime: selectedTime.label,
        deliveryDay: selectedTime.isToday ? 'today' : 'tomorrow',
        userAddress: transactionData?.userAddress || route.params?.userAddress,
        productPrice: transactionData?.productPrice || route.params?.productPrice,
        productTitle: transactionData?.productTitle || route.params?.productTitle,
        productDescription: transactionData?.productDescription || route.params?.productDescription,
        returnDetails: returnDetails,
        productDetails: productDetails,
        userProfile: userProfile || transactionData?.userProfile || route.params?.userProfile
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
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBF9" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
        <Text style={styles.pageTitle}>Delay Return Pickup</Text>
        
        <Text style={styles.instructionText}>
          Choose a time range in the next 24 hours when you will be home to meet a Couri driver for your return pickup:
        </Text>

        {/* Today Time Slots */}
        {todaySlots.length > 0 && (
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>Today - {getFormattedDate(true)}</Text>
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
          <Text style={styles.sectionTitle}>Tomorrow - {getFormattedDate(false)}</Text>
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
          {/* Close button - positioned above modal */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleCloseModal}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Animated.View 
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Modal title */}
            <Text style={styles.modalTitle}>
              Confirm your availability between{'\n'}{selectedTime ? formatTimeRange(selectedTime) : ''} {selectedTime?.isToday ? 'today' : 'tomorrow'}?
            </Text>

            {/* Confirm button with 3D effect */}
            <View style={styles.buttonContainer}>
              {/* Shadow/border layer for 3D effect */}
              <View style={styles.buttonShadowLayer} />
              {/* Main button */}
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleConfirmTime}
              >
                <Text style={styles.confirmButtonText}>Confirm time range</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FBFBF9',
  },
  backButton: {
    padding: 4,
  },
  headerRight: {
    flex: 1,
  },
  backArrowImage: {
    width: 24,
    height: 24,
    tintColor: '#171715',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#171715',
    marginBottom: 16,
    lineHeight: 38,
  },
  instructionText: {
    fontSize: 16,
    color: '#4A4A4A',
    lineHeight: 24,
    marginBottom: 32,
  },
  timeSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171715',
    marginBottom: 16,
  },
  timeSlot: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeSlotSelected: {
    backgroundColor: '#171715',
    borderColor: '#171715',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#171715',
    fontWeight: '600',
  },
  timeSlotTextSelected: {
    color: '#FBFBF9',
    fontWeight: '600',
  },
  contactSection: {
    marginTop: 8,
    marginBottom: 40,
    alignItems: 'center',
  },
  contactText: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: '#FBFBF9',
    paddingVertical: 18,
    paddingHorizontal: 64,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#171715',
    alignItems: 'center',
    width: '100%',
  },
  contactButtonText: {
    fontSize: 16,
    color: '#171715',
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  closeButton: {
    position: 'absolute',
    bottom: 235,
    right: 22,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  modalContent: {
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 45,
    paddingBottom: 50,
    minHeight: 228,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0.32,
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
});
