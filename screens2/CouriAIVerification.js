import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Animated } from 'react-native';

export default function CouriAIVerification({ navigation, route }) {
  const { productUrl, userAddress, userProfile, transactionType } = route.params || {};
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  
  const verificationSteps = [
    { id: 'seller', text: 'Verifying the seller', completed: false },
    { id: 'images', text: 'Analyzing images and brand data', completed: false },
    { id: 'fraud', text: 'Scanning for fraud indicators', completed: false },
    { id: 'transaction', text: 'Preparing your secure transaction', completed: false }
  ];

  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Start the verification process
    startVerificationProcess();
    
    // Animate the screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const startVerificationProcess = async () => {
    try {
      // Simulate verification steps with delays
      for (let i = 0; i < verificationSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay per step
        
        setCurrentStep(i);
        
        // Mark current step as completed
        verificationSteps[i].completed = true;
        
        // If this is the last step, wait a bit more then navigate
        if (i === verificationSteps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Extra 2 seconds for final step
          setIsProcessing(false);
          
          // Navigate to ProductDetails with the URL
          navigation.replace('ProductDetails', {
            productUrl,
            userAddress,
            userProfile,
            transactionType
          });
        }
      }
    } catch (error) {
      console.error('❌ Verification process error:', error);
      // Still navigate to ProductDetails even if verification fails
      navigation.replace('ProductDetails', {
        productUrl,
        userAddress,
        userProfile,
        transactionType
      });
    }
  };

  const renderStep = (step, index) => {
    const isActive = index === currentStep;
    const isCompleted = index < currentStep;
    
    return (
      <View key={step.id} style={styles.stepContainer}>
        <View style={[
          styles.stepIcon,
          isCompleted && styles.stepIconCompleted,
          isActive && styles.stepIconActive
        ]}>
          {isCompleted ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : isActive ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Text style={styles.stepNumber}>{index + 1}</Text>
          )}
        </View>
        <Text style={[
          styles.stepText,
          isCompleted && styles.stepTextCompleted,
          isActive && styles.stepTextActive
        ]}>
          {step.text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.gradientContainer}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>C</Text>
            </View>
          </View>

          {/* AI Assistant Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.sparkle}>✨</Text>
            <Text style={styles.title}>Couri AI assist...</Text>
            <Text style={styles.sparkle}>✨</Text>
          </View>

          {/* Verification Steps */}
          <View style={styles.stepsContainer}>
            {verificationSteps.map((step, index) => renderStep(step, index))}
          </View>

          {/* Bottom Animation */}
          <View style={styles.bottomAnimation}>
            <Text style={styles.sparkle}>✨</Text>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#8B5CF6',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginHorizontal: 10,
  },
  sparkle: {
    fontSize: 16,
  },
  stepsContainer: {
    width: '100%',
    maxWidth: 300,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 12,
  },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepIconCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
  },
  stepIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepNumber: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  stepTextCompleted: {
    color: 'white',
  },
  stepTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  bottomAnimation: {
    marginTop: 40,
  },
});
