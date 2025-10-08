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
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_MIN_HEIGHT = 120;
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.8;

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
  const [mapHtml, setMapHtml] = useState('');
  
  // Modal animation
  const [modalHeight, setModalHeight] = useState(MODAL_MIN_HEIGHT);
  const modalTranslateY = useRef(new Animated.Value(0)).current;

  // Get route parameters
  const {
    productPrice,
    productTitle,
    productDescription,
    pickupAddress: routePickupAddress,
    userAddress,
    userProfile: routeUserProfile
  } = route.params || {};

  // Load user profile and product details
  useEffect(() => {
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
        return;
      }

      // Otherwise load from AsyncStorage
      const storedProfile = await AsyncStorage.getItem('userProfileData');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadProductDetails = () => {
    if (productPrice && productTitle) {
      setProductDetails({
        price: parseFloat(productPrice) || 0,
        title: productTitle || '',
        description: productDescription || '',
      });
    }
  };

  const loadPickupAddress = async () => {
    if (routePickupAddress) {
      setPickupAddress(routePickupAddress);
    } else if (userAddress) {
      // If no pickup address provided, use user address as pickup location
      try {
        const geocoded = await Location.geocodeAsync(userAddress);
        if (geocoded.length > 0) {
          setPickupAddress({
            latitude: geocoded[0].latitude,
            longitude: geocoded[0].longitude,
            address: userAddress,
          });
        }
      } catch (error) {
        console.error('Error geocoding user address:', error);
      }
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('🔍 DEBUG: Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🔍 DEBUG: Location permission status:', status);
      
      if (status !== 'granted') {
        console.error('❌ DEBUG: Location permission denied');
        setLocationError('Location permission denied');
        return;
      }

      console.log('🔍 DEBUG: Getting current location with high accuracy...');
      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
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
    } catch (error) {
      console.error('❌ DEBUG: Error getting location:', error);
      console.error('❌ DEBUG: Error details:', error.message);
      setLocationError('Unable to get current location: ' + error.message);
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
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // Update every 5 seconds
            distanceInterval: 10, // Update when moved 10 meters
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
  const deliveryFee = productDetails.price * 0.0893; // 8.93%
  const totalPrice = productDetails.price + deliveryFee;

  // Generate HTML for live Google Maps with WebView
  const generateMapHtml = () => {
    const userLat = userLocation?.latitude || 37.78825;
    const userLng = userLocation?.longitude || -122.4324;
    const pickupLat = pickupAddress?.latitude || userLat;
    const pickupLng = pickupAddress?.longitude || userLng;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html { 
              margin: 0; 
              padding: 0; 
              height: 100%; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            #map { 
              width: 100%; 
              height: 100%; 
            }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(255,255,255,0.95);
              padding: 20px;
              border-radius: 10px;
              text-align: center;
              z-index: 1000;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .error {
              color: #ff4444;
              font-weight: bold;
            }
            .coordinates {
              font-size: 12px;
              color: #666;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div class="loading" id="loading">
            <div>🗺️ Loading Google Maps...</div>
            <div class="coordinates">
              📍 Your Location: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}
            </div>
          </div>
          <script>
            let map;
            let userMarker;
            let pickupMarker;
            let loadingElement = document.getElementById('loading');
            
            // Comprehensive debugging
            console.log('🔍 DEBUG: Starting Google Maps initialization...');
            console.log('🔍 DEBUG: User location:', { lat: ${userLat}, lng: ${userLng} });
            console.log('🔍 DEBUG: Pickup location:', { lat: ${pickupLat}, lng: ${pickupLng} });
            console.log('🔍 DEBUG: API Key:', 'AIzaSyDb06-8lffU7CmFoZtJJkR0d6dQkZqA_mw');
            
            // Error handling with detailed logging
            window.gm_authFailure = function() {
              console.error('❌ DEBUG: Google Maps API authentication failed');
              console.error('❌ DEBUG: This usually means:');
              console.error('   - API key is invalid or expired');
              console.error('   - API key restrictions are blocking this domain');
              console.error('   - Billing is not enabled on the Google Cloud project');
              console.error('   - Required APIs are not enabled');
              loadingElement.innerHTML = '<div class="error">❌ Google Maps API Error</div><div>Check console for details</div>';
            };
            
            function showError(message) {
              console.error('❌ DEBUG: Error:', message);
              loadingElement.innerHTML = '<div class="error">❌ ' + message + '</div>';
            }
            
            // Test network connectivity
            function testNetworkConnectivity() {
              console.log('🔍 DEBUG: Testing network connectivity...');
              fetch('https://maps.googleapis.com/maps/api/js?key=AIzaSyDb06-8lffU7CmFoZtJJkR0d6dQkZqA_mw')
                .then(response => {
                  console.log('✅ DEBUG: Network test successful, status:', response.status);
                  if (response.status === 200) {
                    console.log('✅ DEBUG: Google Maps API endpoint is accessible');
                  } else {
                    console.error('❌ DEBUG: Google Maps API returned status:', response.status);
                  }
                })
                .catch(error => {
                  console.error('❌ DEBUG: Network test failed:', error);
                  console.error('❌ DEBUG: This could mean no internet connection or firewall blocking');
                });
            }
            
            // Run network test
            testNetworkConnectivity();
            
            function initMap() {
              try {
                console.log('🔍 DEBUG: initMap() called');
                console.log('🔍 DEBUG: window.google exists:', !!window.google);
                console.log('🔍 DEBUG: window.google.maps exists:', !!(window.google && window.google.maps));
                
                if (!window.google) {
                  console.error('❌ DEBUG: window.google is undefined - API script failed to load');
                  showError('Google Maps API script failed to load');
                  return;
                }
                
                if (!window.google.maps) {
                  console.error('❌ DEBUG: window.google.maps is undefined - Maps library failed to load');
                  showError('Google Maps library failed to load');
                  return;
                }
                
                console.log('✅ DEBUG: Google Maps API loaded successfully');
                console.log('🔍 DEBUG: Available Google Maps objects:', Object.keys(window.google.maps));
                
                const userLocation = { lat: ${userLat}, lng: ${userLng} };
                const pickupLocation = { lat: ${pickupLat}, lng: ${pickupLng} };
                
                console.log('🔍 DEBUG: Creating map with locations:', { userLocation, pickupLocation });
                console.log('🔍 DEBUG: Map container element:', document.getElementById("map"));
                
                map = new google.maps.Map(document.getElementById("map"), {
                  zoom: 13,
                  center: userLocation,
                  mapTypeId: 'roadmap',
                  mapTypeControl: true,
                  streetViewControl: true,
                  fullscreenControl: true,
                  zoomControl: true,
                  gestureHandling: 'greedy',
                  styles: [
                    {
                      "featureType": "poi",
                      "stylers": [{ "visibility": "on" }]
                    },
                    {
                      "featureType": "transit",
                      "stylers": [{ "visibility": "on" }]
                    }
                  ]
                });
                
                // User location marker (Delivery Person)
                userMarker = new google.maps.Marker({
                  position: userLocation,
                  map: map,
                  title: "Your Location (Driver)",
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 15,
                    fillColor: '#FFE8FD',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 4
                  },
                  label: {
                    text: '🚗',
                    fontSize: '20px'
                  }
                });
                
                // Pickup location marker (Customer)
                if (${pickupLat} !== ${userLat} || ${pickupLng} !== ${userLng}) {
                  pickupMarker = new google.maps.Marker({
                    position: pickupLocation,
                    map: map,
                    title: "Pickup Location (Customer)",
                    icon: {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 12,
                      fillColor: '#FF4444',
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 3
                    },
                    label: {
                      text: '📍',
                      fontSize: '18px'
                    }
                  });
                  
                  // Draw delivery route using Directions API
                  console.log('🔍 DEBUG: Initializing Directions API...');
                  
                  if (!google.maps.DirectionsService) {
                    console.error('❌ DEBUG: DirectionsService not available - Directions API not loaded');
                    showError('Directions API not available');
                    return;
                  }
                  
                  const directionsService = new google.maps.DirectionsService();
                  const directionsRenderer = new google.maps.DirectionsRenderer({
                    suppressMarkers: true, // We'll use our custom markers
                    polylineOptions: {
                      strokeColor: '#007AFF',
                      strokeWeight: 5,
                      strokeOpacity: 0.8
                    },
                    directionsText: true
                  });
                  
                  directionsRenderer.setMap(map);
                  console.log('✅ DEBUG: Directions renderer created and attached to map');
                  
                  // Calculate route
                  console.log('🔍 DEBUG: Calculating route from', userLocation, 'to', pickupLocation);
                  directionsService.route({
                    origin: userLocation,
                    destination: pickupLocation,
                    travelMode: google.maps.TravelMode.DRIVING,
                    avoidHighways: false,
                    avoidTolls: false
                  }, (result, status) => {
                    console.log('🔍 DEBUG: Directions API response - Status:', status);
                    
                    if (status === 'OK') {
                      console.log('✅ DEBUG: Route calculated successfully');
                      directionsRenderer.setDirections(result);
                      
                      // Display route information
                      const route = result.routes[0];
                      const leg = route.legs[0];
                      
                      console.log('✅ DEBUG: Route details:');
                      console.log('   Distance:', leg.distance.text);
                      console.log('   Duration:', leg.duration.text);
                      console.log('   Start address:', leg.start_address);
                      console.log('   End address:', leg.end_address);
                      
                      // Update UI with route info (you can customize this)
                      const routeInfo = document.createElement('div');
                      routeInfo.innerHTML = \`
                        <div style="
                          position: absolute;
                          top: 10px;
                          left: 10px;
                          background: rgba(255,255,255,0.9);
                          padding: 10px;
                          border-radius: 8px;
                          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          font-size: 14px;
                          z-index: 1000;
                        ">
                          <div style="font-weight: bold; margin-bottom: 5px;">🚗 Delivery Route</div>
                          <div>📏 Distance: \${leg.distance.text}</div>
                          <div>⏱️ Time: \${leg.duration.text}</div>
                        </div>
                      \`;
                      document.body.appendChild(routeInfo);
                      
                    } else {
                      console.error('❌ DEBUG: Directions request failed with status:', status);
                      console.error('❌ DEBUG: Common status codes:');
                      console.error('   - REQUEST_DENIED: API key restrictions or billing issues');
                      console.error('   - INVALID_REQUEST: Invalid parameters');
                      console.error('   - OVER_QUERY_LIMIT: Quota exceeded');
                      console.error('   - NOT_FOUND: Address not found');
                      console.error('   - ZERO_RESULTS: No route found');
                      showError('Could not calculate route: ' + status);
                    }
                  });
                  
                  // Fit map to show both locations
                  const bounds = new google.maps.LatLngBounds();
                  bounds.extend(userLocation);
                  bounds.extend(pickupLocation);
                  map.fitBounds(bounds);
                  
                } else {
                  // If same location, just center on user
                  map.setCenter(userLocation);
                  map.setZoom(15);
                }
                
                // Hide loading
                loadingElement.style.display = 'none';
                console.log('Google Maps with Directions initialized successfully');
                
              } catch (error) {
                console.error('Error initializing map:', error);
                showError('Failed to initialize map: ' + error.message);
              }
            }
            
            // Fallback if Google Maps fails to load
            setTimeout(function() {
              if (!window.google || !window.google.maps) {
                showError('Google Maps failed to load. Check your internet connection.');
              }
            }, 10000);
          </script>
          <script 
            async 
            defer 
            src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDb06-8lffU7CmFoZtJJkR0d6dQkZqA_mw&callback=initMap&libraries=geometry,places&v=3.52"
            onerror="window.gm_authFailure()"
            onload="console.log('Google Maps script loaded successfully')"
          ></script>
        </body>
      </html>
    `;
  };

  // Update map HTML when locations change
  useEffect(() => {
    console.log('🔍 DEBUG: useEffect triggered - userLocation:', userLocation);
    console.log('🔍 DEBUG: useEffect triggered - pickupAddress:', pickupAddress);
    
    if (userLocation) {
      console.log('🔍 DEBUG: Generating map HTML with userLocation:', userLocation);
      const html = generateMapHtml();
      console.log('🔍 DEBUG: Map HTML generated, length:', html.length);
      setMapHtml(html);
    } else {
      console.log('🔍 DEBUG: No userLocation available, not generating map HTML');
    }
  }, [userLocation, pickupAddress]);


  // Pan responder for modal
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
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
        
        Animated.spring(modalTranslateY, {
          toValue: targetHeight - MODAL_MIN_HEIGHT,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/couri-logo.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.messageButton}>
            <Image
              source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/message-icon.png' }}
              style={styles.messageIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileButton}>
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

      {/* Map */}
      <View style={styles.mapContainer}>
        {mapHtml ? (
          <WebView
            style={styles.map}
            source={{ html: mapHtml }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ DEBUG: WebView error:', nativeEvent);
              console.error('❌ DEBUG: Error details:', nativeEvent.description);
              setLocationError('WebView failed to load: ' + nativeEvent.description);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ DEBUG: WebView HTTP error:', nativeEvent);
              console.error('❌ DEBUG: HTTP status:', nativeEvent.statusCode);
              setLocationError('HTTP error: ' + nativeEvent.statusCode);
            }}
            onLoadStart={() => {
              console.log('🔍 DEBUG: WebView started loading');
            }}
            onLoadEnd={() => {
              console.log('✅ DEBUG: WebView loaded successfully');
            }}
            onMessage={(event) => {
              console.log('🔍 DEBUG: WebView message:', event.nativeEvent.data);
            }}
            onLoadProgress={(syntheticEvent) => {
              console.log('🔍 DEBUG: WebView load progress:', syntheticEvent.nativeEvent.progress);
            }}
          />
        ) : locationError ? (
          <View style={[styles.map, styles.errorContainer]}>
            <Text style={styles.errorText}>{locationError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.map, styles.loadingContainer]}>
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}
      </View>

      {/* Bottom Modal */}
      <Animated.View 
        style={[
          styles.modal,
          {
            height: modalHeight,
            transform: [{ translateY: modalTranslateY }],
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.modalHandle} />
        
        <View style={styles.modalContent}>
          {modalHeight <= MODAL_MIN_HEIGHT + 50 ? (
            // Collapsed view - show price only
            <View style={styles.collapsedContent}>
              <Text style={styles.priceLabel}>Product Price</Text>
              <Text style={styles.priceValue}>${productDetails.price.toFixed(2)}</Text>
            </View>
          ) : (
            // Expanded view - show full details
            <View style={styles.expandedContent}>
              <Text style={styles.productTitle}>{productDetails.title}</Text>
              
              <View style={styles.priceBreakdown}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Product Price</Text>
                  <Text style={styles.priceValue}>${productDetails.price.toFixed(2)}</Text>
                </View>
                
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Couri Delivery & Service Fee</Text>
                  <Text style={styles.priceValue}>${deliveryFee.toFixed(2)}</Text>
                </View>
                
                <View style={[styles.priceRow, styles.totalRow]}>
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
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 30,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  messageIcon: {
    width: 20,
    height: 20,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
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
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d0d0d0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  collapsedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    flex: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  priceBreakdown: {
    flex: 1,
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 10,
    paddingTop: 15,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
