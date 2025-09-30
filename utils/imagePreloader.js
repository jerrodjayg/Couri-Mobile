import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Image preloader utility for faster image loading
class ImagePreloader {
  constructor() {
    this.preloadedImages = new Set();
    this.cacheKey = 'preloaded_images_cache';
  }

  // Preload a single image
  async preloadImage(imageSource) {
    if (!imageSource) return false;
    
    const imageUri = this.getImageUri(imageSource);
    if (!imageUri) return false;

    // Check if already preloaded
    if (this.preloadedImages.has(imageUri)) {
      return true;
    }

    try {
      await new Promise((resolve, reject) => {
        Image.prefetch(imageUri)
          .then(() => {
            this.preloadedImages.add(imageUri);
            resolve(true);
          })
          .catch((error) => {
            console.log('⚠️ Failed to preload image:', imageUri, error);
            reject(error);
          });
      });
      return true;
    } catch (error) {
      console.log('⚠️ Image preload error:', error);
      return false;
    }
  }

  // Preload multiple images
  async preloadImages(imageSources) {
    if (!Array.isArray(imageSources)) return;
    
    const preloadPromises = imageSources.map(source => this.preloadImage(source));
    
    try {
      await Promise.allSettled(preloadPromises);
      console.log('✅ Batch image preloading completed');
    } catch (error) {
      console.log('⚠️ Batch image preloading error:', error);
    }
  }

  // Get image URI from various source formats
  getImageUri(source) {
    if (typeof source === 'string') {
      return source;
    }
    if (source?.uri) {
      return source.uri;
    }
    return null;
  }

  // Preload critical app images (called on app start)
  async preloadCriticalImages() {
    const criticalImages = [
      // Supabase hosted images
      'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Logo_Dark.png',
      'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Mark%202%20Dark.png',
      'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/plaid-logo.png',
      'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/plaid-logo2.png',
      'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/appleicon.png',
      'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/googleicon.png',
      'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/facebookicon.png',
    ];

    console.log('🚀 Preloading critical images...');
    await this.preloadImages(criticalImages);
    console.log('✅ Critical images preloaded');
  }

  // Preload screen-specific images
  async preloadScreenImages(screenName, imageSources) {
    console.log(`🖼️ Preloading images for ${screenName}...`);
    await this.preloadImages(imageSources);
    console.log(`✅ ${screenName} images preloaded`);
  }

  // Check if image is preloaded
  isPreloaded(imageSource) {
    const imageUri = this.getImageUri(imageSource);
    return imageUri ? this.preloadedImages.has(imageUri) : false;
  }

  // Clear preloaded images cache
  async clearCache() {
    this.preloadedImages.clear();
    try {
      await AsyncStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.log('⚠️ Failed to clear image cache:', error);
    }
  }

  // Save preloaded images to cache
  async saveCache() {
    try {
      const cacheData = Array.from(this.preloadedImages);
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.log('⚠️ Failed to save image cache:', error);
    }
  }

  // Load preloaded images from cache
  async loadCache() {
    try {
      const cacheData = await AsyncStorage.getItem(this.cacheKey);
      if (cacheData) {
        const cachedImages = JSON.parse(cacheData);
        this.preloadedImages = new Set(cachedImages);
        console.log('✅ Loaded cached images:', cachedImages.length);
      }
    } catch (error) {
      console.log('⚠️ Failed to load image cache:', error);
    }
  }
}

// Create singleton instance
const imagePreloader = new ImagePreloader();

export default imagePreloader;
