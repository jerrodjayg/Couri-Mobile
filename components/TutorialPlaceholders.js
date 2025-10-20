// Placeholder images for tutorial screens
// These are simple placeholder components that will display a generic image icon
// In production, you would replace these with actual tutorial images

import React from 'react';
import { View, StyleSheet } from 'react-native';

// Placeholder for "Welcome to Couri" tutorial
export const TutorialWelcomeImage = () => (
  <View style={styles.placeholder}>
    <View style={styles.iconContainer}>
      <View style={styles.mountain} />
      <View style={styles.sun} />
    </View>
  </View>
);

// Placeholder for "Skip the meetups" tutorial
export const TutorialMeetupsImage = () => (
  <View style={styles.placeholder}>
    <View style={styles.iconContainer}>
      <View style={styles.mountain} />
      <View style={styles.sun} />
    </View>
  </View>
);

// Placeholder for "In-app tracking" tutorial
export const TutorialTrackingImage = () => (
  <View style={styles.placeholder}>
    <View style={styles.iconContainer}>
      <View style={styles.mountain} />
      <View style={styles.sun} />
    </View>
  </View>
);

// Placeholder for "Safe & secure payments" tutorial
export const TutorialPaymentsImage = () => (
  <View style={styles.placeholder}>
    <View style={styles.iconContainer}>
      <View style={styles.mountain} />
      <View style={styles.sun} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  iconContainer: {
    position: 'relative',
    width: 100,
    height: 80,
  },
  mountain: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderBottomWidth: 50,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ccc',
  },
  sun: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffd700',
  },
});
