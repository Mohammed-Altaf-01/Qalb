import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE } from '../theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onComplete }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade + scale in
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, delay: 200 }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        delay: 200,
        tension: 60,
        friction: 8,
      }),
    ]).start();

    // Gold shimmer loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();

    // Fade out and complete after 2.8s
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => onComplete());
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const shimmerColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.accent, COLORS.accentLight],
  });

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        {/* Kaaba icon placeholder — decorative squares */}
        <View style={styles.kaabaIcon}>
          <View style={styles.kaabaBody} />
          <View style={styles.kaabaKiswah} />
        </View>

        <Animated.Text style={[styles.bismillah, { color: shimmerColor }]}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </Animated.Text>

        <Text style={styles.appName}>Qalb</Text>
        <Text style={styles.tagline}>قلب · Heart</Text>
        <Text style={styles.subtitle}>Your Quran Companion</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  kaabaIcon: {
    width: 64,
    height: 72,
    marginBottom: 8,
    alignItems: 'center',
  },
  kaabaBody: {
    width: 64,
    height: 64,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: 4,
  },
  kaabaKiswah: {
    position: 'absolute',
    top: 16,
    left: 8,
    right: 8,
    height: 20,
    backgroundColor: COLORS.accentDim,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.accent,
  },
  bismillah: {
    fontSize: 22,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 36,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 2,
    marginTop: 8,
  },
  tagline: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
