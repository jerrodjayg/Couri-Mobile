/**
 * Design Tokens
 * 
 * This file contains design tokens extracted from your Figma designs.
 * Update these values when you redesign in Figma to maintain consistency.
 * 
 * Usage:
 * import { colors, spacing, typography } from '../utils/designTokens';
 * 
 * Then use in your StyleSheet:
 * backgroundColor: colors.primary
 * padding: spacing.md
 * fontSize: typography.body.fontSize
 */

export const colors = {
  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5DC',
    card: '#FFFFFF',
  },
  
  // Text Colors
  text: {
    primary: '#000000',
    secondary: '#666666',
    light: '#999999',
    error: '#FF3B30',
  },
  
  // Accent Colors (extract from Figma)
  accent: {
    primary: '#E5E5E5',
    // Add more as you extract from Figma
  },
  
  // Border Colors
  border: {
    light: '#f0f0f0',
    medium: '#E5E5E5',
    dark: '#000000',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  
  // Common patterns from your screens
  headerPadding: 20,
  cardPadding: 20,
  cardMargin: 16,
};

export const typography = {
  // Header Styles
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  
  // Body Styles
  body: {
    fontSize: 16,
    fontWeight: 'normal',
    color: colors.text.primary,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal',
    color: colors.text.secondary,
    lineHeight: 20,
  },
  
  // Button Styles
  button: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  
  // Card Styles
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
};

export const borderRadius = {
  sm: 12,
  md: 20,
  lg: 25,
  full: 50,
  
  // From your screens
  card: 12,
  button: 20,
  buttonLarge: 50,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 15,
  },
};

/**
 * Helper function to merge custom styles with design tokens
 * 
 * Note: Import StyleSheet from 'react-native' in your component files
 * This is just a reference pattern, not an actual function
 */

/**
 * Extract design tokens from Figma
 * 
 * When you get design context from Figma, update this file with:
 * - Colors (background, text, accent)
 * - Spacing values
 * - Typography scales
 * - Border radius values
 * - Shadow definitions
 */

