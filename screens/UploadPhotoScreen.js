import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UploadPhotoScreen({ navigation, route }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { userInfo, savedUser } = route.params || {};

  useEffect(() => {
    // Request permissions on component mount
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      setIsLoading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      setIsLoading(true);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedImage) {
      Alert.alert('Photo Required', 'Please select or take a photo to continue.');
      return;
    }

    try {
      // Store the image URI temporarily (we'll handle actual upload later)
      const userData = {
        ...userInfo,
        profileImageUri: selectedImage,
        isGoogleAuth: route.params?.isGoogleAuth || false,
      };

      // Store in AsyncStorage for the welcome screen to access
      await AsyncStorage.setItem('tempUserData', JSON.stringify(userData));
      console.log('✅ User data with photo stored in AsyncStorage');

      // Navigate to Welcomepage with the user data
      navigation.replace('Welcomepage', { 
        name: userInfo?.firstName || userInfo?.name || 'there',
        userData: userData
      });
    } catch (error) {
      console.error('Error storing user data:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    }
  };

  const handleSkip = async () => {
    try {
      // Store user data without photo
      const userData = {
        ...userInfo,
        isGoogleAuth: route.params?.isGoogleAuth || false,
      };

      await AsyncStorage.setItem('tempUserData', JSON.stringify(userData));
      console.log('✅ User data without photo stored in AsyncStorage');

      // Navigate to Welcomepage
      navigation.replace('Welcomepage', { 
        name: userInfo?.firstName || userInfo?.name || 'there',
        userData: userData
      });
    } catch (error) {
      console.error('Error storing user data:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.backButtonContainer}>
            <Pressable onPress={() => navigation.goBack()}>
              <Image
                source={{ uri: 'https://cdn-icons-png.freepik.com/256/5629/5629228.png' }}
                style={styles.backArrowImage}
                resizeMode="contain"
              />
            </Pressable>
          </View>
          <Text style={styles.headerTitle}>UPLOAD PHOTO</Text>
          <View style={styles.backButtonContainer} />
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Add a Profile Photo</Text>
          <Text style={styles.subtitle}>
            Help your friends recognize you by adding a profile photo
          </Text>

          <View style={styles.photoContainer}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Image 
                  source={require('../assets/face-id.png')} 
                  style={styles.placeholderIcon}
                  resizeMode="contain"
                />
                <Text style={styles.placeholderText}>No photo selected</Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.photoButton, styles.primaryButton]} 
              onPress={pickImage}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Loading...' : 'Choose from Library'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.photoButton, styles.secondaryButton]} 
              onPress={takePhoto}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>
                {isLoading ? 'Loading...' : 'Take Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleContinue}
              disabled={!selectedImage || isLoading}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContainer: { flex: 1 },
  contentContainer: { padding: 24, paddingBottom: 80 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24, 
    paddingHorizontal: 8, 
    paddingTop: 8 
  },
  backButtonContainer: { width: 44, alignItems: 'flex-start' },
  backArrowImage: { width: 24, height: 24, marginLeft: 20, marginTop: 4 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#000', flex: 1, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32, textAlign: 'center' },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#000',
  },
  placeholderContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  placeholderIcon: {
    width: 40,
    height: 40,
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  buttonContainer: {
    marginBottom: 32,
  },
  photoButton: {
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderColor: '#000',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  actionContainer: {
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});