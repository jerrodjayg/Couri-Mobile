import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Modal,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4b6878' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#14171b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2c3a4b' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#98a5be' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2c3a4b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1626' }],
  },
];

export default function HeadToSeller({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Get route parameters
  const {
    userProfile: routeUserProfile,
    productDetails,
    orderDetails,
    sellerInfo,
    pickupLocation,
    earnings,
    arrivalTime,
    distance,
    arrivalNotes,
    productName,
  } = route.params || {};

  // Default seller info
  const defaultSeller = {
    name: 'Chris G.',
    address: '1234 Melrose Ave',
    city: 'Los Angeles, CA',
    phone: '+1234567890',
    avatar: null,
  };

  // Default pickup location (Los Angeles area)
  const defaultPickup = {
    latitude: 34.0837,
    longitude: -118.3610,
  };

  // Current driver location (simulated)
  const driverLocation = {
    latitude: 34.0922,
    longitude: -118.3280,
  };

  const seller = sellerInfo || defaultSeller;
  const pickup = pickupLocation || defaultPickup;

  // Calculate map region
  const getMapRegion = () => {
    const midLat = (driverLocation.latitude + pickup.latitude) / 2;
    const midLng = (driverLocation.longitude + pickup.longitude) / 2;
    const latDelta = Math.abs(driverLocation.latitude - pickup.latitude) * 2.5;
    const lngDelta = Math.abs(driverLocation.longitude - pickup.longitude) * 2.5;

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(latDelta, 0.03),
      longitudeDelta: Math.max(lngDelta, 0.03),
    };
  };

  // Disable swipe back gesture
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        gestureEnabled: false,
      });

      return () => {
        navigation.getParent()?.setOptions({
          gestureEnabled: true,
        });
      };
    }, [navigation])
  );

  // Load user profile
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      if (routeUserProfile) {
        setUserProfile(routeUserProfile);
        console.log('✅ HeadToSeller - Loaded user profile from route params');
        return;
      }

      const storedProfile = await AsyncStorage.getItem('userProfileData');
      const tempUserData = await AsyncStorage.getItem('tempUserData');

      if (storedProfile || tempUserData) {
        const profileData = storedProfile ? JSON.parse(storedProfile) : {};
        const tempData = tempUserData ? JSON.parse(tempUserData) : {};
        const mergedProfile = { ...profileData, ...tempData };

        console.log('✅ HeadToSeller - Loaded user profile from AsyncStorage:', mergedProfile);
        setUserProfile(mergedProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Get user initials for profile fallback
  const getUserInitials = () => {
    if (!userProfile) return 'U';
    const firstName = userProfile.firstName || userProfile.first_name || '';
    const lastName = userProfile.lastName || userProfile.last_name || '';
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return userProfile.email?.charAt(0)?.toUpperCase() || 'U';
    return name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase();
  };

  // Get profile image
  const getProfileImage = () => {
    if (userProfile?.avatar_url || userProfile?.profileImageUri) {
      return userProfile.avatar_url || userProfile.profileImageUri;
    }
    return null;
  };

  // Handle Navigate to seller - opens maps app
  const handleNavigateToSeller = () => {
    const address = `${seller.address}, ${seller.city}`;
    const encodedAddress = encodeURIComponent(address);

    if (Platform.OS === 'ios') {
      // Open Apple Maps
      Linking.openURL(`maps://app?daddr=${encodedAddress}`);
    } else {
      // Open Google Maps on Android
      Linking.openURL(`google.navigation:q=${encodedAddress}`);
    }
  };

  // Handle Arrived at seller's location
  const handleArrivedAtSeller = () => {
    navigation.navigate('AtSellerHouse', {
      productDetails,
      orderDetails,
      userProfile,
      sellerInfo: seller,
    });
  };

  // Handle Call seller
  const handleCallSeller = () => {
    const phoneNumber = seller.phone || '+1234567890';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  // Toggle more details modal
  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBF9" />

      {/* Top Header Section */}
      <SafeAreaView style={styles.headerSection}>
        <View style={styles.headerContent}>
          {/* Couri Logo */}
          <Image
            source={require('../assets/Logo_Dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Profile Picture */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('MyAccount')}
          >
            {getProfileImage() ? (
              <Image source={{ uri: getProfileImage() }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileFallback}>
                <Text style={styles.profileInitials}>{getUserInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Head to the seller for product pickup</Text>

          {/* Navigate to seller link */}
          <TouchableOpacity style={styles.navigateLink} onPress={handleNavigateToSeller}>
            <Text style={styles.navigateLinkText}>Navigate to seller</Text>
            <Text style={styles.navigateArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={getMapRegion()}
          customMapStyle={darkMapStyle}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {/* Route line */}
          <Polyline
            coordinates={[
              { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
              { latitude: pickup.latitude, longitude: pickup.longitude },
            ]}
            strokeColor="#FFFFFF"
            strokeWidth={2}
            lineDashPattern={[10, 5]}
          />

          {/* Driver location marker */}
          <Marker coordinate={driverLocation}>
            <View style={styles.driverMarker}>
              <View style={styles.driverMarkerInner}>
                <Text style={styles.markerIcon}>∞</Text>
              </View>
            </View>
          </Marker>

          {/* Seller location marker */}
          <Marker coordinate={pickup}>
            <View style={styles.sellerMarker}>
              <Text style={styles.markerIcon}>👤</Text>
            </View>
          </Marker>

          {/* Destination marker (faded) */}
          <Marker
            coordinate={{
              latitude: pickup.latitude - 0.01,
              longitude: pickup.longitude + 0.02,
            }}
          >
            <View style={[styles.sellerMarker, { opacity: 0.5 }]}>
              <Text style={styles.markerIcon}>🏠</Text>
            </View>
          </Marker>
        </MapView>

        {/* Arrived Button overlaid on map */}
        <View style={styles.arrivedButtonContainer}>
          <TouchableOpacity style={styles.arrivedButton} onPress={handleArrivedAtSeller}>
            <Text style={styles.arrivedButtonText}>Arrived at seller's location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Info Row */}
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            {arrivalTime || '12 min'} arrival {'  |  '} {distance || '4 miles'}
          </Text>
          <Text style={styles.earningsText}>{earnings || '$21.50'}</Text>
        </View>

        <View style={styles.divider} />

        {/* Seller Info */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerAvatar}>
            {seller.avatar ? (
              <Image source={{ uri: seller.avatar }} style={styles.sellerAvatarImage} />
            ) : (
              <View style={styles.sellerAvatarFallback}>
                <Text style={styles.sellerAvatarInitial}>{seller.name?.charAt(0) || 'C'}</Text>
              </View>
            )}
          </View>

          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{seller.name}</Text>
            <Text style={styles.sellerAddress}>{seller.address}</Text>
            <Text style={styles.sellerCity}>{seller.city}</Text>
          </View>

          <TouchableOpacity style={styles.callButton} onPress={handleCallSeller}>
            <Text style={styles.callIcon}>📞</Text>
            <Text style={styles.callText}>Call</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* More Details */}
        <TouchableOpacity style={styles.moreDetailsRow} onPress={toggleModal}>
          <Text style={styles.moreDetailsText}>More details</Text>
          <Text style={styles.chevron}>{isModalVisible ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {/* More Details Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={toggleModal} />
          <View style={styles.modalContent}>
            {/* Info Row */}
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                {arrivalTime || '12 min'} arrival {'  |  '} {distance || '4 miles'}
              </Text>
              <Text style={styles.earningsText}>{earnings || '$21.50'}</Text>
            </View>

            <View style={styles.divider} />

            {/* More Details Header */}
            <TouchableOpacity style={styles.moreDetailsRow} onPress={toggleModal}>
              <Text style={styles.moreDetailsText}>More details</Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Arrival Notes */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Arrival notes</Text>
              <Text style={styles.detailContent}>
                {arrivalNotes || 'Do not park in driveway, park on street.'}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Product to be picked up */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Product to be picked up</Text>
              <Text style={styles.detailContent}>
                {productName || productDetails?.name || 'Item details will appear here'}
              </Text>
            </View>

            {/* Close button area */}
            <View style={styles.modalCloseArea}>
              <TouchableOpacity style={styles.closeButton} onPress={toggleModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBF9',
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
  },
  logo: {
    width: 65,
    height: 30,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#171715',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D2691E',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  titleSection: {
    paddingHorizontal: 26,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171715',
    lineHeight: 29,
    marginBottom: 12,
  },
  navigateLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigateLinkText: {
    fontSize: 16,
    color: '#171715',
    textDecorationLine: 'underline',
  },
  navigateArrow: {
    fontSize: 20,
    color: '#171715',
    marginLeft: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  driverMarker: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE8FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sellerMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFE8FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerIcon: {
    fontSize: 16,
  },
  arrivedButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 22,
    right: 22,
  },
  arrivedButton: {
    backgroundColor: '#FFE8FD',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE8FD',
    // Shadow effect
    shadowColor: '#171715',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  arrivedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171715',
  },
  bottomSheet: {
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#171715',
  },
  earningsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171715',
  },
  divider: {
    height: 1,
    backgroundColor: '#82827F',
    opacity: 0.3,
    marginVertical: 12,
  },
  sellerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  sellerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  sellerAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#D2691E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#171715',
    marginBottom: 4,
  },
  sellerAddress: {
    fontSize: 14,
    color: '#171715',
    lineHeight: 20,
  },
  sellerCity: {
    fontSize: 14,
    color: '#171715',
    lineHeight: 20,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECECE8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 60,
  },
  callIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  callText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171715',
  },
  moreDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  moreDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171715',
  },
  chevron: {
    fontSize: 12,
    color: '#171715',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  detailSection: {
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#171715',
    marginBottom: 8,
  },
  detailContent: {
    fontSize: 14,
    color: '#171715',
    lineHeight: 24,
  },
  modalCloseArea: {
    marginTop: 20,
    alignItems: 'center',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171715',
    textDecorationLine: 'underline',
  },
});
