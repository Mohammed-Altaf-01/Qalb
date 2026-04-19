import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE } from '../theme';

const { height } = Dimensions.get('window');

export default function SplashScreen({ onComplete }) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const scale     = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const shimmer   = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const dot0      = useRef(new Animated.Value(0.3)).current;
  const dot1      = useRef(new Animated.Value(0.3)).current;
  const dot2      = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Fade + scale in (matches web: 0.9s fade, spring scale)
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 900, delay: 200, useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1, delay: 200, tension: 60, friction: 8, useNativeDriver: true,
      }),
    ]).start();

    // Bismillah gold shimmer — color oscillation (native driver off: color prop)
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ]),
    ).start();

    // Expanding gold line (matches web: line-expand 1.2s at 0.9s delay)
    Animated.timing(lineWidth, {
      toValue: 120, duration: 1200, delay: 900,
      easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();

    // Pulsing dots — staggered by 160ms each (matches web dot-pulse)
    [[dot0, 0], [dot1, 160], [dot2, 320]].forEach(([dot, delay]) => {
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
        ).start();
      }, 1500 + delay);
    });

    // Exit: slide up after 2.2s (matches web splash-exit at 2200ms)
    const exitTimer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -height,
        duration: 500,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onComplete?.());
    }, 2200);

    return () => clearTimeout(exitTimer);
  }, []);

  const shimmerColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['#8a6b2a', '#f0d898'],
  });

  return (
    <Animated.View
      testID="splash-container"
      style={[styles.container, { opacity, transform: [{ translateY }] }]}
    >
      {/* Radial glow — simulates web's radial-gradient circle */}
      <View style={styles.glow} />

      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        {/* Bismillah Arabic */}
        <Animated.Text testID="bismillah-text" style={[styles.bismillah, { color: shimmerColor }]}>
          بسم الله الرحمن الرحيم
        </Animated.Text>

        {/* Expanding gold line */}
        <Animated.View testID="gold-line" style={[styles.line, { width: lineWidth }]} />

        {/* App name */}
        <Text testID="app-name" style={styles.appName}>Qalb</Text>

        {/* Pulsing dots */}
        <View testID="dots-container" style={styles.dots}>
          {[dot0, dot1, dot2].map((dot, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0b1610',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(200,169,81,0.10)',
  },
  content: {
    alignItems: 'center',
  },
  bismillah: {
    fontFamily: 'System',
    fontSize: FONT_SIZE.arabicLg,
    textAlign: 'center',
    lineHeight: FONT_SIZE.arabicLg * 1.7,
    letterSpacing: 1,
    paddingHorizontal: 16,
  },
  line: {
    height: 1,
    backgroundColor: COLORS.accent,
    opacity: 0.6,
    marginTop: 20,
  },
  appName: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 10,
    textTransform: 'uppercase',
    color: 'rgba(200,169,81,0.65)',
    marginTop: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 40,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(200,169,81,0.7)',
  },
});
