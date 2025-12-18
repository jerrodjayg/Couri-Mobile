import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0d' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#0d0d0d' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#121212' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1f1f1f' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#141414' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a8a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b3b3b3' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#080808' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3d3d3d' }],
  },
];

export default function DriverPortalScreen({ navigation, route }) {
  const [isOnline, setIsOnline] = useState(false);
  const [servicesToday, setServicesToday] = useState(7);
  const [showServiceCompleteModal, setShowServiceCompleteModal] = useState(false);
  const [serviceData, setServiceData] = useState({
    basePay: '$21.50',
    serviceTime: '25 min',
    todaysEarnings: '$43.00',
  });
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const mapRef = useRef(null);
  
  // Get the selected driver name from route params
  const driverName = route?.params?.selectedPerson || 'Brandon';

  // Get user's current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        setLocationLoading(true);
        setLocationError(null);

        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          // Use fallback location (West Hollywood)
          setDriverLocation({
            latitude: 34.0900,
            longitude: -118.3617,
          });
          setLocationLoading(false);
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setDriverLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLocationLoading(false);
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationError('Could not get location');
        // Use fallback location
        setDriverLocation({
          latitude: 34.0900,
          longitude: -118.3617,
        });
        setLocationLoading(false);
      }
    };

    getLocation();
  }, []);

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

  // Recenter map to driver's current location
  const handleRecenterMap = () => {
    if (mapRef.current && driverLocation) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
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
        <View style={styles.statusSubtitleRow}>
          <Text style={styles.statusSubtitle}>
            {isOnline 
              ? "Waiting for opportunities..." 
              : "Go online to receive new opportunities"
            }
          </Text>
          {isOnline && (
            <ActivityIndicator size="small" color="#007AFF" style={styles.waitingIndicator} />
          )}
        </View>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        {locationLoading ? (
          <View style={styles.mapLoadingContainer}>
            <ActivityIndicator size="large" color="#FFB6C1" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: driverLocation?.latitude || 34.0900,
              longitude: driverLocation?.longitude || -118.3617,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            customMapStyle={darkMapStyle}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {/* Driver location marker - changes color based on online status */}
            {driverLocation && (
              <Marker
                coordinate={driverLocation}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[
                  styles.driverDotOuter,
                  isOnline ? styles.driverDotOuterOnline : styles.driverDotOuterOffline
                ]}>
                  <View style={[
                    styles.driverDotInner,
                    isOnline ? styles.driverDotInnerOnline : styles.driverDotInnerOffline
                  ]} />
                </View>
              </Marker>
            )}
          </MapView>
        )}
        
      </View>

      {/* Recenter Button - positioned above bottom card */}
      {!locationLoading && driverLocation && (
        <TouchableOpacity 
          style={styles.recenterButton}
          onPress={handleRecenterMap}
          activeOpacity={0.8}
        >
          <View style={styles.recenterIconContainer}>
            <View style={styles.recenterCrosshair}>
              <View style={styles.recenterDot} />
              <View style={[styles.recenterLine, styles.recenterLineTop]} />
              <View style={[styles.recenterLine, styles.recenterLineBottom]} />
              <View style={[styles.recenterLine, styles.recenterLineLeft]} />
              <View style={[styles.recenterLine, styles.recenterLineRight]} />
            </View>
          </View>
        </TouchableOpacity>
      )}

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
          <Text style={[styles.goOnlineButtonText, isOnline && styles.goOnlineButtonTextActive]}>
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
  statusSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waitingIndicator: {
    marginLeft: 8,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoadingContainer: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#757575',
    marginTop: 12,
    fontSize: 14,
  },
  // Driver dot styles - changes color based on online/offline status
  driverDotOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDotOuterOffline: {
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
  },
  driverDotOuterOnline: {
    backgroundColor: 'rgba(255, 182, 193, 0.35)',
  },
  driverDotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  driverDotInnerOffline: {
    backgroundColor: '#1e1e1e',
    borderWidth: 2,
    borderColor: '#3a3a3a',
    shadowColor: '#000',
  },
  driverDotInnerOnline: {
    backgroundColor: '#FFB6C1',
    shadowColor: '#FFB6C1',
  },
  // Recenter button styles
  recenterButton: {
    position: 'absolute',
    bottom: 175,
    right: 16,
    zIndex: 100,
  },
  recenterIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  recenterCrosshair: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recenterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  recenterLine: {
    position: 'absolute',
    backgroundColor: '#007AFF',
  },
  recenterLineTop: {
    width: 2,
    height: 6,
    top: 0,
    left: 11,
  },
  recenterLineBottom: {
    width: 2,
    height: 6,
    bottom: 0,
    left: 11,
  },
  recenterLineLeft: {
    width: 6,
    height: 2,
    left: 0,
    top: 11,
  },
  recenterLineRight: {
    width: 6,
    height: 2,
    right: 0,
    top: 11,
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
    borderRadius: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  goOnlineButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#000',
  },
  goOnlineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  goOnlineButtonTextActive: {
    color: '#000',
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