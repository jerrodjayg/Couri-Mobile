import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
  TutorialWelcomeImage, 
  TutorialMeetupsImage, 
  TutorialTrackingImage, 
  TutorialPaymentsImage 
} from '../components/TutorialPlaceholders';

const { width, height } = Dimensions.get('window');

const tutorialData = [
  {
    id: 1,
    title: "Welcome to Couri",
    description: "Buying and selling just got easier. Couri takes the stress out of peer-to-peer transactions.",
    component: TutorialWelcomeImage,
  },
  {
    id: 2,
    title: "Skip the meetups",
    description: "Forget awkward parking lot handoffs. Couri picks up and delivers every item for you.",
    component: TutorialMeetupsImage,
  },
  {
    id: 3,
    title: "In-app tracking",
    description: "Track your Couri driver in real time, right in the app.",
    component: TutorialTrackingImage,
  },
  {
    id: 4,
    title: "Safe & secure payments",
    description: "Your money is protected in escrow until delivery is complete. Peace of mind, guaranteed.",
    component: TutorialPaymentsImage,
  },
];

export default function TutorialScreen({ navigation, route }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { userInfo } = route.params || {};

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

  const handleNext = () => {
    if (currentSlide < tutorialData.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Tutorial completed, go to Welcomepage
      navigation.replace('Welcomepage', { 
        name: userInfo?.firstName || userInfo?.name || 'there',
        userData: userInfo
      });
    }
  };

  const handleSkip = () => {
    // Skip tutorial, go directly to Welcomepage
    navigation.replace('Welcomepage', { 
      name: userInfo?.firstName || userInfo?.name || 'there',
      userData: userInfo
    });
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const currentTutorial = tutorialData[currentSlide];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        {currentSlide > 0 && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Image
              source={require('../assets/backarrow1.png')}
              style={styles.backArrow}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Logo_Dark.png'}}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Image Placeholder */}
        <View style={styles.imageContainer}>
          <currentTutorial.component />
        </View>

        {/* Title */}
        <Text style={styles.title}>{currentTutorial.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{currentTutorial.description}</Text>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {tutorialData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressBar,
                index === currentSlide ? styles.progressBarActive : styles.progressBarInactive,
                index === 0 && styles.progressBarFirst,
                index === tutorialData.length - 1 && styles.progressBarLast,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentSlide === tutorialData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
    paddingTop: 25,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: 24,
    height: 24,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    
  
  },
  logo: {
    width: 80,
    height: 28.7,
    
  },
  skipButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 18,
    color: '#000',
    textDecorationLine: 'underline',
    fontFamily: 'Neue Haas Unica W1G',

  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  imageContainer: {
    width: width * 0.7,
    height: height * 0.28,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 58,
  },
  tutorialImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 39,
    fontWeight: '400',
    color: '#000',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 60,
    fontVariant: 'Area Normal Trial',
  },
  description: {
    fontSize: 15,
    color: '#171715',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 30,
    fontWeight: 500,
    fontVariant: 'Area Normal',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  progressBar: {
    width: 20,
    height: 4,
    borderRadius: 0,
    marginHorizontal: 0,
  },
  progressBarActive: {
    backgroundColor: '#242422', // Dark color for active slide
  },
  progressBarInactive: {
    backgroundColor: '#D6DFEE', // Light blue/lavender for inactive slides
  },
  progressBarFirst: {
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  progressBarLast: {
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  buttonContainer: {
    paddingHorizontal: 26,
    paddingBottom: 20,
  },
  nextButton: {
    backgroundColor: '#242422',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'semibold',
  },
});
