import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'

type Props = {
  message: string
  visible: boolean
  onHide?: () => void
  durationMs?: number
}

export default function Toast({ message, visible, onHide, durationMs = 2500 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(durationMs),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onHide?.()
      })
    }
  }, [visible, durationMs, onHide, opacity])

  if (!visible) return null

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View style={[styles.toast, { opacity }]}> 
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '90%',
  },
  text: {
    color: '#fff',
  },
})

