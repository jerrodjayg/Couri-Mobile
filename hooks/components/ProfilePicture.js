import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function ProfilePicture({ user, size = 50, style }) {
  const getInitials = (user) => {
    if (!user) return '?';
    
    const fullName = user.user_metadata?.full_name || user.email || '';
    const names = fullName.split(' ');
    
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else if (names.length === 1) {
      return names[0][0].toUpperCase();
    } else {
      return user.email ? user.email[0].toUpperCase() : '?';
    }
  };

  const getBackgroundColor = (user) => {
    if (!user) return '#ccc';
    
    const name = user.user_metadata?.full_name || user.email || '';
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];
    
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Check if we have a profile picture URL
  const hasProfilePicture = user?.user_metadata?.avatar_url || user?.avatar_url;

  if (hasProfilePicture) {
    return (
      <Image
        source={{ uri: hasProfilePicture }}
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style
        ]}
        resizeMode="cover"
      />
    );
  }

  // Fallback to initials if no profile picture
  return (
    <View 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: getBackgroundColor(user)
        },
        style
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>
        {getInitials(user)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});