import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';

export default function Welcomepage({ route, navigation }) {
  const { name } = route.params || { name: 'Lana' };

  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: -1000,
        duration: 15000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleSignOut = () => {
    navigation.replace('Login'); // You can also use navigate if you want to preserve stack
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Image
            source={require('../assets/Logo Dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.profilePlaceholder} />
        </View>

        {/* Welcome Block */}
        <Text style={styles.wave}>👋</Text>
        <Text style={styles.welcome}>WELCOME, {name.toUpperCase()}!</Text>
        <Text style={styles.headline}>Let’s get started.</Text>
        <Text style={styles.subheadline}>
          You don’t have any active Couri transactions.
        </Text>

        <TouchableOpacity style={styles.beginButton}>
          <Text style={styles.beginButtonText}>+  Begin a Transaction</Text>
        </TouchableOpacity>

        {/* Middle Info Block */}
        <View style={styles.infoBlock}>
          <Text style={styles.infoIcon}>👓</Text>
          <Text style={styles.infoTitle}>Couri is transforming{"\n"}peer-to-peer transactions.</Text>
          <Text style={styles.infoSub}>Check out how it works.</Text>
          <TouchableOpacity style={styles.learnMoreButton}>
            <Text style={styles.learnMoreText}>Learn more</Text>
          </TouchableOpacity>
        </View>

        {/* Black Promo Section */}
        <View style={styles.promoSection}>
          <View style={styles.promoTextBlock}>
            <Text style={styles.promoHeadline}>Get hype,{"\n"}something big is coming</Text>
            <Text style={styles.arrow}>➝</Text>
          </View>
        </View>

        {/* Footer Strip with scrolling text */}
        <View style={styles.footer}>
          <Animated.Text
            style={[styles.footerText, { transform: [{ translateX: scrollX }] }]}
            numberOfLines={1}
          >
            {'. COURI EXCLUSIVE '.repeat(20)}
          </Animated.Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 90,
    height: 40,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
  },
  wave: {
    fontSize: 28,
  },
  welcome: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  headline: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  subheadline: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  beginButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginBottom: 32,
  },
  beginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBlock: {
    width: '100%',
    backgroundColor: '#FDEAFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  infoIcon: {
    fontSize: 24,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoSub: {
    fontSize: 14,
    color: '#444',
    marginBottom: 20,
  },
  learnMoreButton: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 50,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 6,
  },
  learnMoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
  promoSection: {
    width: '100%',
    backgroundColor: '#000',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  promoTextBlock: {
    flex: 1,
  },
  promoHeadline: {
    fontSize: 26,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 12,
  },
  arrow: {
    fontSize: 24,
    color: '#fff',
  },
  footer: {
    backgroundColor: '#FBFFB1',
    width: '100%',
    overflow: 'hidden',
    height: 40,
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontWeight: '600',
    color: '#000',
    fontSize: 14,
    paddingLeft: '100%',
  },
  signOutButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 50,
    backgroundColor: '#E74C3C',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
