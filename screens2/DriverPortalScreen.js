import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';

export default function DriverPortalScreen({ navigation }) {
  const [isOnline, setIsOnline] = useState(false);
  const [servicesToday, setServicesToday] = useState(7);

  const handleGoOnline = () => {
    setIsOnline(!isOnline);
    console.log(`Driver ${isOnline ? 'went offline' : 'went online'}`);
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
            <Text style={styles.profileInitials}>B</Text>
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
          <Text style={styles.mapPlaceholderText}>🗺️ Map will go here</Text>
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
            <Text style={styles.userName}>Brandon</Text>
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
});