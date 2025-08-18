// screens/ChatHistroy.js
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function ChatHistroy({ navigation }) {
  const openSupportChat = () => {
    // hook up when ready
    // navigation.navigate('Support');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHATS</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.topDivider} />

      <TouchableOpacity style={styles.row} onPress={openSupportChat} activeOpacity={0.7}>
        <View style={styles.avatarWrap}>
          <Image
            source={require('../assets/mark2_dark.png')}
            style={styles.avatar}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            Couri Support
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Get help
          </Text>
        </View>

        <Icon name="chevron-forward" size={22} color="#000" />
      </TouchableOpacity>

      <View style={styles.bottomDivider} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#000' },

  topDivider: { height: 1, backgroundColor: '#e6e6e6' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,          // bigger touch area
    backgroundColor: '#fff',
  },
  avatarWrap: {
    width: 56,                    // bigger box
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F3F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatar: {
    width: 36,                    // bigger logo
    height: 36,
  },
  textCol: { flex: 1 },
  title: {
    fontSize: 18,                 // bigger text
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  sub: {
    fontSize: 15,                 // bigger subtitle
    color: '#666',
  },

  bottomDivider: { height: 1, backgroundColor: '#e6e6e6' },
});
