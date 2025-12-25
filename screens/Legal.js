import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const Legal = ({ navigation }) => {
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
        <Text style={styles.title}>LEGAL</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Legal Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Terms of Service */}
        <View style={styles.legalCard}>
          <Text style={styles.cardTitle}>Terms of Service</Text>
          <Text style={styles.cardDescription}>
            Read our terms and conditions for using the Couri mobile application.
          </Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.buttonText}>View Terms</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Policy */}
        <View style={styles.legalCard}>
          <Text style={styles.cardTitle}>Privacy Policy</Text>
          <Text style={styles.cardDescription}>
            Learn how we collect, use, and protect your personal information.
          </Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.buttonText}>View Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Data Usage */}
        <View style={styles.legalCard}>
          <Text style={styles.cardTitle}>Data Usage</Text>
          <Text style={styles.cardDescription}>
            Understand how your data is used within our services.
          </Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.buttonText}>Learn More</Text>
          </TouchableOpacity>
        </View>

        {/* Cookie Policy */}
        <View style={styles.legalCard}>
          <Text style={styles.cardTitle}>Cookie Policy</Text>
          <Text style={styles.cardDescription}>
            Information about cookies and similar technologies we use.
          </Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.buttonText}>View Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Legal */}
        <View style={styles.legalCard}>
          <Text style={styles.cardTitle}>Contact Legal Team</Text>
          <Text style={styles.cardDescription}>
            Get in touch with our legal department for specific inquiries.
          </Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.buttonText}>Contact Us</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  legalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Legal;
