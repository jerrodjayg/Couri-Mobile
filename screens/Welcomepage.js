import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';

export default function Welcomepage({ route }) {
  const { name } = route.params || { name: 'Lana' };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Row */}
        <View style={styles.headerRow}>
          <Image
            source={require('../assets/Logo Dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Welcome */}
        <Text style={styles.wave}>👋</Text>
        <Text style={styles.greeting}>WELCOME, {name.toUpperCase()}!</Text>
        <Text style={styles.title}>Let’s get started.</Text>
        <Text style={styles.subtitle}>
          You don’t have any active Couri transactions.
        </Text>

        {/* Begin a Transaction Button */}
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>+  Begin a Transaction</Text>
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.infoBlock}>
          <Text style={styles.infoIcon}>👓</Text>
          <Text style={styles.infoTitle}>
            Couri is transforming peer-to-peer transactions.
          </Text>
          <Text style={styles.infoSub}>Check out how it works.</Text>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Learn more</Text>
          </TouchableOpacity>
        </View>

        {/* Promo Section */}
        <View style={styles.promoBlock}>
          <View style={styles.promoTextContainer}>
            <Text style={styles.promoText}>Get hype,{"\n"}something big is coming</Text>
            <Text style={styles.arrow}>→</Text>
          </View>
          <Image
            source={require('../assets/sneaker-promo.PNG')}
            style={styles.promoImage}
            resizeMode="contain"
          />
        </View>

        {/* Footer Strip */}
        <View style={styles.footerStrip}>
          <Text style={styles.footerText}>
            . COURI EXCLUSIVE . COURI EXCLUSIVE . COURI EXCLUSIVE
          </Text>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 80,
    height: 40,
  },
  wave: {
    fontSize: 30,
    marginTop: 10,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 16,
    marginBottom: 32,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBlock: {
    backgroundColor: '#FDEAFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  infoIcon: {
    fontSize: 28,
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
  secondaryButton: {
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    elevation: 6,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  promoBlock: {
    backgroundColor: '#000',
    width: '100%',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoTextContainer: {
    flex: 1,
  },
  promoText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  arrow: {
    fontSize: 26,
    color: '#fff',
  },
  promoImage: {
    width: 120,
    height: 120,
    marginLeft: 12,
  },
  footerStrip: {
    backgroundColor: '#FBFFB1',
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
