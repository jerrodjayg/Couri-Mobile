import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions for design (using iPhone 12 Pro as reference)
const baseWidth = 390;
const baseHeight = 844;

// Responsive scaling functions
export const scale = (size) => {
 const newSize = size * (SCREEN_WIDTH / baseWidth);
 if (Platform.OS === 'ios') {
 return Math.round(PixelRatio.roundToNearestPixel(newSize));
 } else {
 return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
 }
};

export const verticalScale = (size) => {
 const newSize = size * (SCREEN_HEIGHT / baseHeight);
 return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const moderateScale = (size, factor = 0.5) => {
 return size + (scale(size) - size) * factor;
};

// Responsive font sizes
export const fontSize = {
 xs: scale(10),
 sm: scale(12),
 base: scale(14),
 lg: scale(16),
 xl: scale(18),
 '2xl': scale(20),
 '3xl': scale(24),
 '4xl': scale(32),
 '5xl': scale(40),
};

// Responsive spacing
export const spacing = {
 xs: scale(4),
 sm: scale(8),
 base: scale(16),
 lg: scale(20),
 xl: scale(24),
 '2xl': scale(32),
 '3xl': scale(40),
 '4xl': scale(48),
 '5xl': scale(64),
};

// Responsive padding and margins
export const padding = {
 xs: scale(8),
 sm: scale(12),
 base: scale(16),
 lg: scale(20),
 xl: scale(24),
 '2xl': scale(32),
 '3xl': scale(40),
};

// Responsive border radius
export const borderRadius = {
 sm: scale(8),
 base: scale(12),
 lg: scale(16),
 xl: scale(20),
 '2xl': scale(24),
 full: scale(50),
};

// Responsive button sizes
export const buttonSizes = {
 sm: {
 paddingVertical: scale(8),
 paddingHorizontal: scale(16),
 borderRadius: scale(20),
 },
 base: {
 paddingVertical: scale(12),
 paddingHorizontal: scale(24),
 borderRadius: scale(25),
 },
 lg: {
 paddingVertical: scale(16),
 paddingHorizontal: scale(32),
 borderRadius: scale(25),
 },
};

// Responsive input sizes
export const inputSizes = {
 sm: {
 height: scale(40),
 fontSize: fontSize.base,
 paddingHorizontal: scale(12),
 },
 base: {
 height: scale(50),
 fontSize: fontSize.lg,
 paddingHorizontal: scale(16),
 },
 lg: {
 height: scale(60),
 fontSize: fontSize.xl,
 paddingHorizontal: scale(20),
 },
};

// Responsive image sizes
export const imageSizes = {
 xs: scale(16),
 sm: scale(24),
 base: scale(32),
 lg: scale(48),
 xl: scale(64),
 '2xl': scale(80),
 '3xl': scale(120),
 '4xl': scale(160),
};

// Responsive icon sizes
export const iconSizes = {
 xs: scale(12),
 sm: scale(16),
 base: scale(20),
 lg: scale(24),
 xl: scale(32),
 '2xl': scale(40),
};

// Screen size breakpoints
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;
export const isTablet = SCREEN_WIDTH >= 768;

// Platform-specific adjustments
export const platformAdjustments = {
 ios: {
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.1,
 shadowRadius: 4,
 },
 android: {
 elevation: 3,
 },
};

// Responsive container styles
export const containerStyles = {
 safe: {
 flex: 1,
 backgroundColor: '#fff',
 },
 scroll: {
 flex: 1,
 },
 scrollContent: {
 flexGrow: 1,
 minHeight: '100%',
 },
 content: {
 flex: 1,
 paddingHorizontal: padding.xl,
 paddingVertical: padding.lg,
 justifyContent: 'center',
 alignItems: 'center',
 },
 header: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 width: '100%',
 paddingHorizontal: padding.sm,
 marginBottom: spacing.xl,
 },
};

// Responsive text styles
export const textStyles = {
 header: {
 fontSize: fontSize.lg,
 fontWeight: '600',
 color: '#000',
 },
 title: {
 fontSize: fontSize.xl,
 fontWeight: 'bold',
 color: '#000',
 textAlign: 'center',
 },
 subtitle: {
 fontSize: fontSize.base,
 color: '#666',
 textAlign: 'center',
 lineHeight: fontSize.lg,
 },
 body: {
 fontSize: fontSize.base,
 color: '#000',
 lineHeight: fontSize.lg,
 },
 caption: {
 fontSize: fontSize.sm,
 color: '#666',
 textAlign: 'center',
 },
};

// Responsive button styles
export const buttonStyles = {
 primary: {
 backgroundColor: '#000',
 paddingVertical: buttonSizes.base.paddingVertical,
 paddingHorizontal: buttonSizes.base.paddingHorizontal,
 borderRadius: buttonSizes.base.borderRadius,
 alignItems: 'center',
 justifyContent: 'center',
 width: '100%',
 maxWidth: 300,
 ...platformAdjustments.ios,
 ...platformAdjustments.android,
 },
 secondary: {
 backgroundColor: '#fff',
 borderWidth: 1,
 borderColor: '#000',
 paddingVertical: buttonSizes.base.paddingVertical,
 paddingHorizontal: buttonSizes.base.paddingHorizontal,
 borderRadius: buttonSizes.base.borderRadius,
 alignItems: 'center',
 justifyContent: 'center',
 width: '100%',
 maxWidth: 300,
 ...platformAdjustments.ios,
 ...platformAdjustments.android,
 },
};

// Responsive input styles
export const inputStyles = {
 base: {
 borderBottomWidth: 1,
 borderBottomColor: '#000',
 paddingVertical: spacing.sm,
 marginBottom: spacing.sm,
 width: '100%',
 textAlign: 'center',
 ...inputSizes.base,
 },
};

// Export screen dimensions for use in components
export const screenDimensions = {
 width: SCREEN_WIDTH,
 height: SCREEN_HEIGHT,
 baseWidth,
 baseHeight,
};

// Helper function to get responsive value based on screen size
export const getResponsiveValue = (small, medium, large) => {
 if (isSmallDevice) return small;
 if (isMediumDevice) return medium;
 return large;
};

// Helper function to get responsive padding
export const getResponsivePadding = (horizontal = 'base', vertical = 'base') => {
 return {
 paddingHorizontal: padding[horizontal],
 paddingVertical: padding[vertical],
 };
};

// Helper function to get responsive margin
export const getResponsiveMargin = (top = 0, right = 0, bottom = 0, left = 0) => {
 return {
 marginTop: spacing[top] || top,
 marginRight: spacing[right] || right,
 marginBottom: spacing[bottom] || bottom,
 marginLeft: spacing[left] || left,
 };
}; 