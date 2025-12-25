import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const SupportScreen = ({ navigation }) => {
  // Disable swipe back gesture
  useFocusEffect(
    React.useCallback(() => {
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

  const handleCallSupport = () => {
    // Call support implementation will go here
    console.log('Call support pressed');
  };

  const handleEmailSupport = () => {
    // Email support implementation will go here
    console.log('Email support pressed');
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
              <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Image 
            source={require('../assets/backarrow1.png')} 
            style={styles.backArrowImage}
          />
        </TouchableOpacity>
        <Text style={styles.title}>SUPPORT</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Support Options Card */}
      <View style={styles.supportCard}>
        {/* Call Support Row */}
        <View style={styles.supportRow}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎧</Text>
          </View>
          <Text style={styles.supportText}>Call Support</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleCallSupport}>
            <Text style={styles.buttonText}>Call Now</Text>
          </TouchableOpacity>
        </View>

        {/* Separator Line */}
        <View style={styles.separator} />

        {/* Email Support Row */}
        <View style={styles.supportRow}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✉️</Text>
          </View>
          <Text style={styles.supportText}>Email Support</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleEmailSupport}>
            <Text style={styles.buttonText}>Email Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  backArrowImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 30,
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  supportText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 15,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 5,
  },
});

export default SupportScreen;