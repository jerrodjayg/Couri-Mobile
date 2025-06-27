import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Image
          source={require('../assets/Logo_Dark.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.welcomeText}>
          Welcome to the{"\n"}future of peer-to-peer{"\n"}shopping.
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('CreateAccount')}
        >
          <Text style={styles.primaryText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.secondaryText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  top: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    width: '100%',
  },
  logo: {
    width: 80,
    height: 40,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 31,
    textAlign: 'center',
    color: '#000',
    lineHeight: 45,
    fontWeight: '300', // thinner text
    width: '90%',
  },
  buttonGroup: {
    width: '100%',
    paddingBottom: 60,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    marginBottom: 20,
    elevation: 12,
  },
  primaryText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: '#fff',
    elevation: 6,
  },
  secondaryText: {
    color: '#000',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
});
