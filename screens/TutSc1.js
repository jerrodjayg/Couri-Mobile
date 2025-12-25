import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const tutorialData = [
  {
    id: 1,
    title: "Welcome to Couri",
    description: "Buying and selling just got easier. Couri takes the stress out of peer-to-peer transactions.",
    image: require('../assets/defaulti.png'),
  },
  {
    id: 2,
    title: "Skip the meetups",
    description: "Forget awkward parking lot handoffs. Couri picks up and delivers every item for you.",
    image: require('../assets/defaulti.png'),
  },
  {
    id: 3,
    title: "In-app tracking",
    description: "Track your Couri driver in real time, right in the app.",
    image: require('../assets/defaulti.png'),
  },
  {
    id: 4,
    title: "Safe & secure payments",
    description: "Your money is protected in escrow until delivery is complete. Peace of mind, guaranteed.",
    image: require('../assets/defaulti.png'),
  },
];

export default function TutSc1({ navigation, route }) {
  const { userInfo } = route.params || {};
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const animateToNext = () => {
    if (isAnimating.current || currentSlide >= tutorialData.length - 1) return;
    
    isAnimating.current = true;
    const nextSlide = currentSlide + 1;
    
    // Animate current slide out to left and new slide in from right simultaneously
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSlide(nextSlide);
      slideAnim.setValue(0);
      isAnimating.current = false;
    });
  };

  const animateToPrevious = () => {
    if (isAnimating.current || currentSlide === 0) return;
    
    isAnimating.current = true;
    const prevSlide = currentSlide - 1;
    
    // Animate current slide out to right and previous slide in from left simultaneously
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSlide(prevSlide);
      slideAnim.setValue(0);
      isAnimating.current = false;
    });
  };

  const handleNext = () => {
    if (currentSlide < tutorialData.length - 1) {
      animateToNext();
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
      animateToPrevious();
    } else {
      navigation.goBack();
    }
  };

  const currentTutorial = tutorialData[currentSlide];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image
            source={require('../assets/backarrow1.png')}
            style={styles.backArrow}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/Logo_Dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content with Animation */}
      <View style={styles.content}>
        <View style={styles.slideContainer}>
          {tutorialData.map((tutorial, index) => {
            // Calculate position based on current slide
            const position = (index - currentSlide) * width;
            const animatedPosition = slideAnim.interpolate({
              inputRange: [-width, 0, width],
              outputRange: [position - width, position, position + width],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={tutorial.id}
                style={[
                  styles.slide,
                  {
                    transform: [{ translateX: animatedPosition }],
                  },
                ]}
                pointerEvents={index === currentSlide ? 'auto' : 'none'}
              >
                {/* Main Image */}
                <View style={styles.imageContainer}>
                  <Image 
                    source={tutorial.image} 
                    style={styles.defaultImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Title */}
                <Text style={styles.title}>{tutorial.title}</Text>

                {/* Description */}
                <Text style={styles.description}>
                  {tutorial.description}
                </Text>
              </Animated.View>
            );
          })}
        </View>

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
  slideContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  slide: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  imageContainer: {
    width: width * 0.7,
    height: height * 0.28,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 40,
    marginTop: 58,
    backgroundColor: '#ededed',
  },
  defaultImage: {
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
    fontFamily: 'Area Normal Trial',
  },
  description: {
    fontSize: 15,
    color: '#171715',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 30,
    fontWeight: '500',
    fontFamily: 'Area Normal',
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
    backgroundColor: '#242422',
  },
  progressBarInactive: {
    backgroundColor: '#D6DFEE',
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
    borderWidth: 1,
    borderColor: '#fff',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'semibold',
  },
});

