import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom dark map style (matching DriverPortalScreen)
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
const MODAL_MIN_HEIGHT = 180;
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.5;

export default function TrackingScreen({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [productDetails, setProductDetails] = useState({
    price: 0,
    title: '',
    description: '',
  });
  const [userLocation, setUserLocation] = useState(null);
  const [pickupAddress, setPickupAddress] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const mapRef = useRef(null);
  
  // Modal animation
  const [modalHeight, setModalHeight] = useState(MODAL_MIN_HEIGHT);

  // Get route parameters
  const {
    productPrice,
    productTitle,
    productDescription,
    pickupAddress: routePickupAddress,
    userAddress,
    userProfile: routeUserProfile,
    productName
  } = route.params || {};

  // Load user profile and product details
  useEffect(() => {
    console.log('🔍 DEBUG: Route params:', route.params);
    console.log('🔍 DEBUG: userAddress from params:', userAddress);
    console.log('🔍 DEBUG: pickupAddress from params:', routePickupAddress);
    loadUserProfile();
    loadProductDetails();
    loadPickupAddress();
    getCurrentLocation();
  }, []);

  const loadUserProfile = async () => {
    try {
      // Try to get from route params first
      if (routeUserProfile) {
        setUserProfile(routeUserProfile);
        console.log('✅ TrackingScreen - Loaded user profile from route params');
        return;
      }

      // Otherwise load from AsyncStorage
      const storedProfile = await AsyncStorage.getItem('userProfileData');
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      
      if (storedProfile || tempUserData) {
        const profileData = storedProfile ? JSON.parse(storedProfile) : {};
        const tempData = tempUserData ? JSON.parse(tempUserData) : {};
        const mergedProfile = { ...profileData, ...tempData };
        
        console.log('✅ TrackingScreen - Loaded user profile from AsyncStorage:', mergedProfile);
        setUserProfile(mergedProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadProductDetails = () => {
    // Get price from multiple possible sources
    const priceFromParams = productPrice || route.params?.productPrice;
    const titleFromParams = productTitle || route.params?.productTitle || route.params?.productName;
    const descFromParams = productDescription || route.params?.productDescription;
    
    console.log('🔍 TrackingScreen - Loading product details from params:', {
      productPrice: priceFromParams,
      productTitle: titleFromParams,
      productDescription: descFromParams
    });
    
    if (priceFromParams && titleFromParams) {
      // Parse price - remove $ sign and commas if present
      let parsedPrice = 0;
      if (typeof priceFromParams === 'string') {
        const cleanPrice = priceFromParams.replace(/[$,]/g, '').trim();
        parsedPrice = parseFloat(cleanPrice) || 0;
      } else {
        parsedPrice = parseFloat(priceFromParams) || 0;
      }
      
      console.log('💰 TrackingScreen - Product Price:', priceFromParams, '→ Parsed:', parsedPrice);
      console.log('💰 TrackingScreen - Delivery Fee (10%):', (parsedPrice * 0.10).toFixed(2));
      console.log('💰 TrackingScreen - Total Price:', (parsedPrice + (parsedPrice * 0.10)).toFixed(2));
      
      setProductDetails({
        price: parsedPrice,
        title: titleFromParams || '',
        description: descFromParams || '',
      });
    }
  };

  const loadPickupAddress = async () => {
    try {
      let addressToUse = null;
      
      // Priority 1: Check route params for pickup address
      if (routePickupAddress) {
        console.log('🔍 DEBUG: routePickupAddress from params:', routePickupAddress);
        addressToUse = routePickupAddress;
      } 
      // Priority 2: Check if userAddress from route params can be used
      else if (userAddress) {
        console.log('🔍 DEBUG: Using userAddress from route params as pickup:', userAddress);
        addressToUse = userAddress;
      }
      // Priority 3: Check AsyncStorage
      else {
        const storedAddress = await AsyncStorage.getItem('currentPickupAddress');
        if (storedAddress) {
          console.log('🔍 DEBUG: Found address in AsyncStorage:', storedAddress);
          addressToUse = JSON.parse(storedAddress);
        }
      }
      
      if (addressToUse) {
        // Format the pickup address from the object structure
        let formattedAddress = '';
        if (typeof addressToUse === 'string') {
          formattedAddress = addressToUse;
        } else if (addressToUse.street || addressToUse.address) {
          // Build address string from components
          const parts = [];
          if (addressToUse.street) parts.push(addressToUse.street);
          if (addressToUse.address2) parts.push(addressToUse.address2);
          if (addressToUse.city) parts.push(addressToUse.city);
          if (addressToUse.state) parts.push(addressToUse.state);
          if (addressToUse.zipCode) parts.push(addressToUse.zipCode);
          formattedAddress = parts.join(', ');
        } else if (addressToUse.address) {
          formattedAddress = addressToUse.address;
        }
        
        console.log('✅ Formatted address:', formattedAddress);
        
        // Geocode the address to get coordinates
        if (formattedAddress) {
          try {
            const geocoded = await Location.geocodeAsync(formattedAddress);
            if (geocoded.length > 0) {
              setPickupAddress({
                ...addressToUse,
                latitude: geocoded[0].latitude,
                longitude: geocoded[0].longitude,
                address: formattedAddress,
              });
              console.log('✅ Pickup address set with coordinates');
            } else {
              setPickupAddress({
                ...addressToUse,
                address: formattedAddress,
              });
              console.log('✅ Pickup address set without coordinates');
            }
          } catch (geocodeError) {
            console.error('Error geocoding pickup address:', geocodeError);
            setPickupAddress({
              ...addressToUse,
              address: formattedAddress,
            });
          }
        }
      } else if (userAddress) {
        // If no pickup address provided, use user address as pickup location
        console.log('🔍 DEBUG: Using userAddress:', userAddress);
        try {
          const geocoded = await Location.geocodeAsync(userAddress);
          if (geocoded.length > 0) {
            setPickupAddress({
              latitude: geocoded[0].latitude,
              longitude: geocoded[0].longitude,
              address: userAddress,
            });
            console.log('✅ User address set with coordinates');
          }
        } catch (geocodeError) {
          console.error('Error geocoding user address:', geocodeError);
          setPickupAddress({
            address: userAddress,
          });
        }
      } else {
        console.log('❌ No pickup address or user address found');
      }
    } catch (error) {
      console.error('❌ Error loading pickup address:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('🔍 DEBUG: Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🔍 DEBUG: Location permission status:', status);
      
      if (status !== 'granted') {
        console.error('❌ DEBUG: Location permission denied');
        setLocationError('Location permission denied');
        // Use fallback location
        setUserLocation({
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setLocationLoading(false);
        return;
      }

      // Check for cached location first (much faster)
      try {
        const cachedLocation = await AsyncStorage.getItem('cachedUserLocation');
        if (cachedLocation) {
          const { location: cachedLoc, timestamp } = JSON.parse(cachedLocation);
          const age = Date.now() - timestamp;
          
          // Use cached location if less than 2 minutes old
          if (age < 120000) {
            console.log('📍 Using cached user location (age:', Math.round(age / 1000), 'seconds)');
            setUserLocation({
              latitude: cachedLoc.coords.latitude,
              longitude: cachedLoc.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            setLocationError(null);
            setLocationLoading(false);
            
            // Still get fresh location in background for next time
            getFreshLocationInBackground();
            return;
          }
        }
      } catch (cacheError) {
        console.log('⚠️ Cache read error, continuing with fresh location...');
      }

      console.log('🔍 DEBUG: Getting current location with balanced accuracy...');
      
      // Try to get location with timeout and fallback accuracy
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 30000, // Accept location up to 30 seconds old
        timeout: 10000, // 10 second timeout
      });

      // Add overall timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Location timeout')), 15000);
      });

      const location = await Promise.race([locationPromise, timeoutPromise]);
      
      console.log('✅ DEBUG: Location obtained:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      setLocationError(null);
      setLocationLoading(false);
      
      // Cache the location for faster future access
      try {
        await AsyncStorage.setItem('cachedUserLocation', JSON.stringify({
          location: location,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.log('⚠️ Could not cache location:', cacheError);
      }
      
    } catch (error) {
      console.error('❌ DEBUG: Error getting location:', error);
      console.error('❌ DEBUG: Error details:', error.message);
      
      // Try fallback with lower accuracy if high accuracy failed
      try {
        console.log('🔄 Trying fallback location with lower accuracy...');
        const fallbackLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Lowest,
          maximumAge: 60000, // Accept location up to 1 minute old
          timeout: 8000, // 8 second timeout
        });
        
        setUserLocation({
          latitude: fallbackLocation.coords.latitude,
          longitude: fallbackLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setLocationError(null);
        setLocationLoading(false);
        console.log('✅ Fallback location successful');
      } catch (fallbackError) {
        setLocationError('Unable to get current location: ' + error.message);
        // Use fallback location
        setUserLocation({
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setLocationLoading(false);
      }
    }
  };

  // Get fresh location in background for caching
  const getFreshLocationInBackground = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 60000,
        timeout: 20000,
      });
      
      // Cache the fresh location
      await AsyncStorage.setItem('cachedUserLocation', JSON.stringify({
        location: location,
        timestamp: Date.now()
      }));
      console.log('✅ Fresh location cached in background');
    } catch (error) {
      console.log('⚠️ Background location update failed:', error.message);
    }
  };

  // Set up real-time location tracking
  useEffect(() => {
    let locationSubscription;
    
    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          return;
        }

        // Get initial location
        await getCurrentLocation();

        // Start watching position for real-time updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // Update every 10 seconds (less frequent for better performance)
            distanceInterval: 20, // Update when moved 20 meters
            maximumAge: 30000, // Accept location up to 30 seconds old
          },
          (location) => {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            setLocationError(null);
          }
        );
      } catch (error) {
        console.error('Error setting up location tracking:', error);
        setLocationError('Location tracking failed');
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Calculate pricing
  const deliveryFee = productDetails.price * 0.10; // 10%
  const totalPrice = productDetails.price + deliveryFee;

  // Recenter map to user's current location
  const handleRecenterMap = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };


  // Pan responder for modal
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Touch started
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = MODAL_MIN_HEIGHT - gestureState.dy;
        if (newHeight >= MODAL_MIN_HEIGHT && newHeight <= MODAL_MAX_HEIGHT) {
          setModalHeight(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldExpand = gestureState.dy < -50;
        const targetHeight = shouldExpand ? MODAL_MAX_HEIGHT : MODAL_MIN_HEIGHT;
        
        setModalHeight(targetHeight);
      },
    })
  ).current;

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

  // Get display address - check all possible sources
  const getDisplayAddress = () => {
    console.log('🔍 DEBUG: Getting display address...');
    console.log('🔍 DEBUG: pickupAddress?.address:', pickupAddress?.address);
    console.log('🔍 DEBUG: userAddress:', userAddress);
    console.log('🔍 DEBUG: route.params:', route.params);
    
    // Priority 1: Pickup address from state
    if (pickupAddress?.address) {
      console.log('✅ Using pickupAddress.address:', pickupAddress.address);
      return pickupAddress.address;
    }
    
    // Priority 2: User address from route params
    if (userAddress) {
      console.log('✅ Using userAddress from params:', userAddress);
      // If userAddress is an object, format it
      if (typeof userAddress === 'object') {
        const parts = [];
        if (userAddress.street || userAddress.address1 || userAddress.address_line_1) {
          parts.push(userAddress.street || userAddress.address1 || userAddress.address_line_1);
        }
        if (userAddress.address2 || userAddress.address_line_2) {
          parts.push(userAddress.address2 || userAddress.address_line_2);
        }
        if (userAddress.city) parts.push(userAddress.city);
        if (userAddress.state) parts.push(userAddress.state);
        if (userAddress.zipCode || userAddress.zip || userAddress.zip_code) {
          parts.push(userAddress.zipCode || userAddress.zip || userAddress.zip_code);
        }
        const formatted = parts.join(', ');
        if (formatted) return formatted;
      }
      return userAddress;
    }
    
    // Priority 3: User profile address (try to build from components)
    if (userProfile) {
      const parts = [];
      if (userProfile.address1 || userProfile.address_line_1) {
        parts.push(userProfile.address1 || userProfile.address_line_1);
      }
      if (userProfile.address2 || userProfile.address_line_2) {
        parts.push(userProfile.address2 || userProfile.address_line_2);
      }
      if (userProfile.city) parts.push(userProfile.city);
      if (userProfile.state) parts.push(userProfile.state);
      if (userProfile.zip || userProfile.zip_code) {
        parts.push(userProfile.zip || userProfile.zip_code);
      }
      const formatted = parts.join(', ');
      if (formatted) {
        console.log('✅ Using userProfile address components:', formatted);
        return formatted;
      }
      
      // Fallback to userProfile.address if available
      if (userProfile.address) {
        console.log('✅ Using userProfile.address:', userProfile.address);
        return userProfile.address;
      }
    }
    
    console.log('❌ No address found');
    return 'Address not available';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Logo_Dark.png' }}
            style={styles.couriLogo}
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={() => navigation.navigate('Welcomepage')}
          >
            <Image
              source={require('../assets/homeicon.png')}
              style={styles.homeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerRight}>
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
      </View>

      {/* Status Section */}
      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>A Couri driver is being assigned</Text>
        <Text style={styles.statusSubtitle}>We'll let you know when they're on the way.</Text>
      </View>

      {/* Map */}
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
              latitude: userLocation?.latitude || 37.78825,
              longitude: userLocation?.longitude || -122.4324,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            customMapStyle={darkMapStyle}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {/* User location marker with pink glow effect */}
            {userLocation && (
              <Marker
                coordinate={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.userDotOuter}>
                  <View style={styles.userDotInner} />
                </View>
              </Marker>
            )}
          </MapView>
        )}
      </View>

      {/* Recenter Button */}
      {!locationLoading && userLocation && (
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

      {/* Bottom Modal */}
      <Animated.View 
        style={[
          styles.modal,
          {
            height: modalHeight,
          }
        ]}
      >
        <View style={styles.modalHandleContainer} {...panResponder.panHandlers}>
          <View style={styles.modalHandle} />
        </View>
        
        <View style={styles.modalContent} {...panResponder.panHandlers}>
          {modalHeight <= MODAL_MIN_HEIGHT + 50 ? (
            // Collapsed view - show address and total
            <View style={styles.collapsedContent}>
              <View style={styles.addressSection}>
                <Text style={styles.addressLabel}>Your Address</Text>
                <Text style={styles.addressText}>
                  {getDisplayAddress()}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.totalWithArrow}>
                  <Text style={styles.totalAmount}>${totalPrice.toFixed(2)}</Text>
                  <Text style={styles.expandArrow}>^</Text>
                </View>
              </View>
            </View>
          ) : (
            // Expanded view - show full details
            <View style={styles.expandedContent}>
              <View style={styles.addressSection}>
                <Text style={styles.addressLabel}>Your Address</Text>
                <Text style={styles.addressText}>
                  {getDisplayAddress()}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.totalWithArrow}>
                  <Text style={styles.totalAmount}>${totalPrice.toFixed(2)}</Text>
                  <Text style={styles.expandArrow}>⌄</Text>
                </View>
              </View>
              
              <View style={styles.orderDetails}>
                <View style={styles.orderItem}>
                  <Text style={styles.itemName}>"{productDetails.title}"</Text>
                  <Text style={styles.itemPrice}>${productDetails.price.toFixed(2)}</Text>
                </View>
                
                <View style={styles.orderItem}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Couri Delivery & Service Fee</Text>
                    <Text style={styles.infoIcon}>ⓘ</Text>
                  </View>
                  <Text style={styles.feePrice}>${deliveryFee.toFixed(2)}</Text>
                </View>
                
                <View style={[styles.orderItem, styles.totalItem]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
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
    paddingTop: 30,
    paddingBottom: 15,
    backgroundColor: '#fafafa',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couriLogo: {
    width: 80,
    height: 32,
  },
  homeButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeIcon: {
    width: 18,
    height: 18,
    tintColor: '#000000',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#000000',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  profileInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSection: {
    backgroundColor: '#fafafa',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: 'normal',
    color: '#000',
    marginBottom: 8,
    lineHeight: 34,
  },
  statusSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
    lineHeight: 22,
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
  // User dot styles - pink glow effect
  userDotOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 182, 193, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFB6C1',
    shadowColor: '#FFB6C1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  // Recenter button styles
  recenterButton: {
    position: 'absolute',
    bottom: 200,
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
  modal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHandleContainer: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d0d0d0',
    borderRadius: 2,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  collapsedContent: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingVertical: 5,
  },
  expandedContent: {
    flex: 1,
    paddingVertical: 5,
  },
  addressSection: {
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    lineHeight: 22,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalWithArrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  expandArrow: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  orderDetails: {
    marginTop: 10,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  feeLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 5,
  },
  infoIcon: {
    fontSize: 14,
    color: '#666',
  },
  feePrice: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  totalItem: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 10,
    paddingTop: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});
