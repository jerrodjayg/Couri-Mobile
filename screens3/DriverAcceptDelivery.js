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
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64779e' }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4b6878' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334e87' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#14171b' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#283d6a' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6f9ba5' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#1a3130' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3C7680' }],
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
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2c3a4b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0d5ce' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#14171b' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#98a5be' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry.fill',
    stylers: [{ color: '#283d6a' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#3a4762' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1626' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4e6d70' }],
  },
];

export default function DriverAcceptDelivery({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);

  // Get route parameters
  const {
    userProfile: routeUserProfile,
    productDetails,
    orderDetails,
    pickupLocation,
    deliveryLocation,
    earnings,
    distance,
    expectedTime,
  } = route.params || {};

  // Default locations (Los Angeles area as shown in Figma)
  const defaultPickup = {
    latitude: 34.0837,
    longitude: -118.3610,
    address: 'Melrose Ave, Los Angeles',
    title: 'Pickup from seller',
  };

  const defaultDelivery = {
    latitude: 34.0522,
    longitude: -118.2437,
    address: 'Main St, Los Angeles',
    title: 'Deliver to buyer',
  };

  const pickup = pickupLocation || defaultPickup;
  const delivery = deliveryLocation || defaultDelivery;
  
  // Calculate map region to show both markers
  const getMapRegion = () => {
    const midLat = (pickup.latitude + delivery.latitude) / 2;
    const midLng = (pickup.longitude + delivery.longitude) / 2;
    const latDelta = Math.abs(pickup.latitude - delivery.latitude) * 1.8;
    const lngDelta = Math.abs(pickup.longitude - delivery.longitude) * 1.8;
    
    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(latDelta, 0.02),
      longitudeDelta: Math.max(lngDelta, 0.02),
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
        console.log('✅ DriverAcceptDelivery - Loaded user profile from route params');
        return;
      }

      const storedProfile = await AsyncStorage.getItem('userProfileData');
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      
      if (storedProfile || tempUserData) {
        const profileData = storedProfile ? JSON.parse(storedProfile) : {};
        const tempData = tempUserData ? JSON.parse(tempUserData) : {};
        const mergedProfile = { ...profileData, ...tempData };
        
        console.log('✅ DriverAcceptDelivery - Loaded user profile from AsyncStorage:', mergedProfile);
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
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  // Get profile image
  const getProfileImage = () => {
    if (userProfile?.avatar_url || userProfile?.profileImageUri) {
      return userProfile.avatar_url || userProfile.profileImageUri;
    }
    return null;
  };

  // Handle Accept delivery
  const handleAccept = () => {
    navigation.navigate('HeadToSeller', {
      productDetails,
      orderDetails,
      userProfile,
      pickupLocation: pickup,
      deliveryLocation: delivery,
      earnings: earnings || '$21.50',
      arrivalTime: '12 min',
      distance: distance || '4 miles',
    });
  };

  // Handle Decline delivery
  const handleDecline = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Map Background */}
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
              { latitude: pickup.latitude, longitude: pickup.longitude },
              { latitude: delivery.latitude, longitude: delivery.longitude },
            ]}
            strokeColor="#FFFFFF"
            strokeWidth={2}
            lineDashPattern={[10, 5]}
          />
          
          {/* Pickup Marker */}
          <Marker
            coordinate={{
              latitude: pickup.latitude,
              longitude: pickup.longitude,
            }}
          >
            <View style={styles.pickupMarker}>
              <Text style={styles.markerIcon}>👤</Text>
            </View>
          </Marker>
          
          {/* Delivery Marker */}
          <Marker
            coordinate={{
              latitude: delivery.latitude,
              longitude: delivery.longitude,
            }}
          >
            <View style={styles.deliveryMarker}>
              <Text style={styles.markerIcon}>🏠</Text>
            </View>
          </Marker>
        </MapView>
        
        {/* Gradient overlay at top */}
        <View style={styles.gradientOverlay} />
      </View>

      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/Logo_Dark.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('MyAccount')}
          >
            {getProfileImage() ? (
              <Image
                source={{ uri: getProfileImage() }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileFallback}>
                <Text style={styles.profileInitials}>{getUserInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Route indicator circle */}
      <View style={styles.routeIndicator}>
        <View style={styles.routeIndicatorInner} />
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Green Banner */}
        <View style={styles.greenBanner}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconContainer}>
              <Text style={styles.bannerIconText}>∞</Text>
            </View>
            <Text style={styles.bannerText}>Pickup & deliver</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.sheetContent}>
          {/* Earnings Section */}
          <View style={styles.earningsSection}>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsAmount}>{earnings || '$21.50'}+</Text>
              <Text style={styles.earningsTip}>Final earnings may include tips</Text>
            </View>
            <Text style={styles.distanceTime}>
              {distance || '4 min (0.2 mi)'} from me  •  {expectedTime || '22 min'} expected time
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Locations Section */}
          <View style={styles.locationsSection}>
            {/* Pickup Location */}
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <View style={[styles.locationIcon, styles.pickupIcon]}>
                  <Text style={styles.locationIconText}>📍</Text>
                </View>
                <View style={styles.locationLine} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Pickup from seller</Text>
                <Text style={styles.locationAddress}>{pickup.address}</Text>
              </View>
            </View>

            {/* Delivery Location */}
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <View style={[styles.locationIcon, styles.deliveryIcon]}>
                  <Text style={styles.locationIconText}>🏠</Text>
                </View>
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Deliver to buyer</Text>
                <Text style={styles.locationAddress}>{delivery.address}</Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={handleAccept}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.declineButton}
              onPress={handleDecline}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#14171b',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(20, 23, 27, 0.7)',
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  logo: {
    width: 65,
    height: 30,
    tintColor: '#fff',
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  routeIndicator: {
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 200, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  routeIndicatorInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffccff',
  },
  pickupMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFE8FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  deliveryMarker: {
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
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 35,
    elevation: 20,
  },
  greenBanner: {
    backgroundColor: '#27C193',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerIconText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  bannerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#171715',
  },
  sheetContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
  },
  earningsSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '600',
    color: '#171715',
    marginRight: 12,
  },
  earningsTip: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  distanceTime: {
    fontSize: 13,
    color: '#4A4A4A',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#82827F',
    opacity: 0.3,
    marginVertical: 16,
  },
  locationsSection: {
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationIconContainer: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  locationIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupIcon: {
    backgroundColor: '#FFE8FD',
  },
  deliveryIcon: {
    backgroundColor: '#FFE8FD',
  },
  locationIconText: {
    fontSize: 10,
  },
  locationLine: {
    width: 1,
    height: 40,
    backgroundColor: '#171715',
    marginTop: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171715',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  buttonsContainer: {
    alignItems: 'center',
  },
  acceptButton: {
    width: '100%',
    backgroundColor: '#171715',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    // Shadow effect for 3D button look
    shadowColor: '#171715',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FBFBF9',
    letterSpacing: 0.15,
  },
  declineButton: {
    paddingVertical: 8,
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171715',
    textDecorationLine: 'underline',
    letterSpacing: 0.15,
  },
});
