import React, { useRef, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import {
 Animated,
 View,
 Text,
 StyleSheet,
 Image,
 TouchableOpacity,
 SafeAreaView,
 StatusBar,
} from 'react-native';

export default function Welcomepage({ route, navigation }) {
 const { user } = useUser();
 const waveAnim = useRef(new Animated.Value(0)).current;
 const name = route?.params?.name || user?.user_metadata?.full_name?.split(' ')[0] || 'there';

 const handleSignOut = () => {
 navigation.reset({
 index: 0,
 routes: [{ name: 'Splash' }],
 });
 };

 // Emoji waving animation
 useEffect(() => {
 Animated.sequence([
 Animated.timing(waveAnim, {
 toValue: 15,
 duration: 300,
 useNativeDriver: true,
 }),
 Animated.timing(waveAnim, {
 toValue: -10,
 duration: 300,
 useNativeDriver: true,
 }),
 Animated.timing(waveAnim, {
 toValue: 0,
 duration: 300,
 useNativeDriver: true,
 }),
 ]).start();
 }, []);

 return (
 <SafeAreaView style={styles.safeArea}>
 <StatusBar barStyle="dark-content" backgroundColor="#fff" />

 <View style={styles.wrapper}>
 {/* Top Bar */}
 <View style={styles.topBar}>
 <TouchableOpacity
 onPress={() =>
 navigation.reset({
 index: 0,
 routes: [{ name: 'Home' }],
 })
 }
 >
 <Image
 source={require('../assets/Logo_Dark.png')}
 style={styles.logo}
 resizeMode="contain"
 />
 </TouchableOpacity>
 <View style={styles.profilePlaceholder} />
 </View>

 {/* White Block */}
 <View style={styles.whiteBlock}>
 <View style={styles.whiteBlockInner}>
 <View style={styles.welcomeRow}>
 <Animated.Text
 style={[
 styles.wave,
 {
 transform: [
 {
 rotate: waveAnim.interpolate({
 inputRange: [-15, 15],
 outputRange: ['-15deg', '15deg'],
 }),
 },
 ],
 },
 ]}
 >
 👋🏻
 </Animated.Text>
 <Text style={styles.welcomeText}>WELCOME, {name.toUpperCase()}!</Text>
 </View>
 <Text style={styles.headline}>Let’s get started.</Text>
 <Text style={styles.subheadline}>
 You don’t have any active Couri transactions.
 </Text>
 <View style={styles.placeholderBox} />
 <TouchableOpacity style={styles.beginButton}>
 <Text style={styles.beginButtonText}>+ Begin a Transaction</Text>
 </TouchableOpacity>
 </View>
 </View>

 {/* Pink Section */}
 <View style={styles.pinkBackground}>
 <View style={styles.infoBlock}>
 <Image
 source={require('../assets/mark2_dark.png')}
 style={styles.infoLogoImage}
 resizeMode="contain"
 />
 <Text style={styles.infoTitle}>
 Couri is transforming{"\n"}peer-to-peer transactions.
 </Text>
 <Text style={styles.infoSub}>Check out how it works.</Text>

 <TouchableOpacity style={styles.signOutWhiteButton} onPress={handleSignOut}>
 <Text style={styles.signOutWhiteText}>Sign Out</Text>
 </TouchableOpacity>
 </View>
 </View>
 </View>
 </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 safeArea: { flex: 1, backgroundColor: '#fff' },
 wrapper: { flex: 1, justifyContent: 'space-between' },
 topBar: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 width: '100%',
 alignItems: 'center',
 paddingHorizontal: 24,
 marginTop: 10,
 },
 logo: { width: 70, height: 30 },
 profilePlaceholder: {
 width: 40,
 height: 40,
 borderRadius: 20,
 backgroundColor: '#ccc',
 },
 whiteBlock: {
 width: '100%',
 paddingTop: 20,
 paddingBottom: 43,
 paddingHorizontal: 24,
 alignItems: 'center',
 backgroundColor: 'transparent',
 borderBottomWidth: 1,
 borderBottomColor: '#000',
 minHeight: 400,
 },
 whiteBlockInner: { width: '100%', alignItems: 'center' },
 welcomeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
 wave: { fontSize: 28, marginRight: 8 },
 welcomeText: { fontSize: 16, fontWeight: '600' },
 headline: { fontSize: 35, fontWeight: '400', textAlign: 'center', marginTop: 20, marginBottom: 8 },
 subheadline: { fontSize: 16, color: '#444', textAlign: 'center', marginBottom: 20 },
 placeholderBox: { width: '95%', height: 140, backgroundColor: '#eee', borderRadius: 8, marginBottom: 20 },
 beginButton: { backgroundColor: '#000', paddingVertical: 19, paddingHorizontal: 33, borderRadius: 50, marginTop: 20 },
 beginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
 pinkBackground: { backgroundColor: '#FDEAFF', alignItems: 'center', paddingBottom: 30, paddingTop: 16 },
 infoBlock: { width: '100%', paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
 infoLogoImage: { width: 50, height: 50, marginBottom: 12 },
 infoTitle: { fontSize: 28, fontWeight: '300', textAlign: 'center', marginBottom: 8 },
 infoSub: { fontSize: 14, color: '#444', marginBottom: 20 },
 signOutWhiteButton: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 19, paddingHorizontal: 33, borderWidth: 1, borderColor: '#000' },
 signOutWhiteText: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#000' },
});