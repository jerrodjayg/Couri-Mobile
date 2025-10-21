import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import imagePreloader from '../utils/imagePreloader';

const OptimizedImage = ({
  source,
  style,
  placeholder,
  showLoadingIndicator = true,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset states when source changes
    setIsLoading(true);
    setHasError(false);

    // Check if image is already preloaded
    if (imagePreloader.isPreloaded(source)) {
      setIsLoading(false);
    }
  }, [source]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad();
  };

  const handleError = (error) => {
    setIsLoading(false);
    setHasError(true);
    console.log('❌ Image load error:', error);
    if (onError) onError(error);
  };

  const getImageSource = () => {
    if (typeof source === 'string') {
      return { uri: source };
    }
    return source;
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        source={getImageSource()}
        style={[styles.image, style]}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {isLoading && showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
      
      {hasError && placeholder && (
        <View style={styles.placeholderOverlay}>
          {placeholder}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default OptimizedImage;
