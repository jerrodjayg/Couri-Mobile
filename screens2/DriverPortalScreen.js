import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DriverPortalScreen({ navigation, route }) {
  const [isOnline, setIsOnline] = useState(false);
  const [servicesToday, setServicesToday] = useState(7);
  const [showServiceCompleteModal, setShowServiceCompleteModal] = useState(false);
  const [serviceData, setServiceData] = useState({
    basePay: '$21.50',
    serviceTime: '25 min',
    todaysEarnings: '$43.00',
  });
  
  // Get the selected driver name from route params
  const driverName = route?.params?.selectedPerson || 'Driver';

  // Check if we should show the service complete popup
  useEffect(() => {
    if (route?.params?.showServiceComplete) {
      setServiceData({
        basePay: route.params.basePay || '$21.50',
        serviceTime: route.params.serviceTime || '25 min',
        todaysEarnings: route.params.todaysEarnings || '$43.00',
      });
      setShowServiceCompleteModal(true);
      // Clear the param so it doesn't show again on re-render
      navigation.setParams({ showServiceComplete: false });
    }
  }, [route?.params?.showServiceComplete]);

  // Handle finish button in modal
  const handleFinishService = () => {
    setShowServiceCompleteModal(false);
    setIsOnline(false);
  };

  const handleGoOnline = () => {
    if (!isOnline) {
      // Going online
      setIsOnline(true);
      console.log('Driver went online');
      // Navigate to DriverAcceptDelivery after 2 seconds
      setTimeout(() => {
        navigation.navigate('DriverAcceptDelivery', { driverName });
      }, 2000);
    } else {
      // Going offline
      setIsOnline(false);
      console.log('Driver went offline');
    }
  };

  const handleSeeAllServices = () => {
    console.log('Navigate to services history');
    // TODO: Navigate to services history screen
  };

  const handleProfilePress = () => {
    console.log('Navigate to driver profile');
    // TODO: Navigate to driver profile screen
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../assets/Logo_Dark.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity onPress={handleProfilePress} style={styles.profileContainer}>
          <View style={styles.profileImage}>
            <Text style={styles.profileInitials}>{driverName.charAt(0).toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Status Section */}
      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>
          {isOnline ? "You're online" : "You're offline"}
        </Text>
        <Text style={styles.statusSubtitle}>
          {isOnline 
            ? "Ready to receive new opportunities" 
            : "Go online to receive new opportunities"
          }
        </Text>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>Map will go here</Text>
          <Text style={styles.mapSubtext}>Driver location tracking</Text>
        </View>
      </View>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <View style={styles.userInfo}>
          <View style={styles.checkmarkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{driverName}</Text>
            <View style={styles.servicesRow}>
              <Text style={styles.servicesText}>{servicesToday} services today</Text>
              <Text style={styles.dot}>•</Text>
              <TouchableOpacity onPress={handleSeeAllServices}>
                <Text style={styles.seeAllText}>See all services</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.goOnlineButton, isOnline && styles.goOnlineButtonActive]} 
          onPress={handleGoOnline}
        >
          <Text style={styles.goOnlineButtonText}>
            {isOnline ? 'Go offline' : 'Go online'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Service Complete Modal */}
      <Modal
        visible={showServiceCompleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowServiceCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Close button */}
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowServiceCompleteModal(false)}
            >
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>

            {/* Header with checkmark */}
            <View style={styles.modalHeader}>
              <View style={styles.checkmarkCircle}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
              <Text style={styles.modalTitle}>Service complete!</Text>
            </View>

            {/* Divider */}
            <View style={styles.modalDivider} />

            {/* Base Pay Section */}
            <View style={styles.basePaySection}>
              <Text style={styles.basePayAmount}>{serviceData.basePay}</Text>
              <Text style={styles.basePayLabel}>Base Pay</Text>
            </View>
            <Text style={styles.tipNotifyText}>
              We'll notify you when a customer adds a tip
            </Text>

            {/* Divider */}
            <View style={styles.modalDivider} />

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>SERVICE TIME</Text>
                <Text style={styles.statValue}>{serviceData.serviceTime}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>TODAY'S EARNINGS</Text>
                <Text style={styles.statValue}>{serviceData.todaysEarnings}</Text>
              </View>
            </View>

            {/* Finish Button */}
            <TouchableOpacity 
              style={styles.finishButton}
              onPress={handleFinishService}
            >
              <Text style={styles.finishButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flex: 1,
  },
  logoImage: {
    width: 80,
    height: 32,
  },
  profileContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D2691E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 16,
    color: '#8e8e93',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicesText: {
    fontSize: 14,
    color: '#666',
  },
  dot: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  goOnlineButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  goOnlineButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  goOnlineButtonText: {
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
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 22,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseIcon: {
    fontSize: 18,
    color: '#82827F',
    fontWeight: '300',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmarkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2DD4A8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkmarkText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#82827F',
    opacity: 0.3,
    marginVertical: 20,
  },
  basePaySection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  basePayAmount: {
    fontSize: 32,
    fontWeight: '600',
    color: '#171715',
    marginRight: 8,
  },
  basePayLabel: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  tipNotifyText: {
    fontSize: 14,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    borderWidth: 1.25,
    borderColor: '#E7E7E2',
    borderRadius: 9,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    color: '#000',
    letterSpacing: 0.44,
  },
  finishButton: {
    backgroundColor: '#171715',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    // Shadow effect
    shadowColor: '#171715',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});