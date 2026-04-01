import React, { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated,
  Easing, Modal,
} from 'react-native';
import { normalize } from '../../utils/responsive';
import { Colors } from '../../theme/colors';

const DOT_COUNT  = 3;
const DOT_SIZE   = normalize(10);
const ANIM_DELAY = 160;

// ── Bouncing dots ─────────────────────────────────────────────────────────────
function BouncingDots() {
  const anims = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * ANIM_DELAY),
          Animated.timing(anim, {
            toValue: -normalize(10),
            duration: 320,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 320,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay((DOT_COUNT - i) * ANIM_DELAY),
        ])
      )
    );

    const parallel = Animated.parallel(animations);
    parallel.start();
    return () => parallel.stop();
  }, []);

  return (
    <View style={d.row}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[d.dot, { transform: [{ translateY: anim }] }]}
        />
      ))}
    </View>
  );
}

const d = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           normalize(8),
    marginTop:     normalize(16),
  },
  dot: {
    width:         DOT_SIZE,
    height:        DOT_SIZE,
    borderRadius:  DOT_SIZE / 2,
    backgroundColor: Colors.primary,
  },
});

// ── Spinner ring ──────────────────────────────────────────────────────────────
function SpinnerRing() {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spinAnim, {
        toValue:  1,
        duration: 900,
        easing:   Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const rotate = spinAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[sp.ring, { transform: [{ rotate }] }]} />
  );
}

const sp = StyleSheet.create({
  ring: {
    width:        normalize(48),
    height:       normalize(48),
    borderRadius: normalize(24),
    borderWidth:  normalize(4),
    borderColor:  Colors.primary,
    borderTopColor: 'transparent',
  },
});

// ── Loader component ──────────────────────────────────────────────────────────
const Loader = forwardRef((_, ref) => {
  const [visible, setVisible]   = useState(false);
  const [message, setMessage]   = useState('');
  const [variant, setVariant]   = useState('spinner'); // 'spinner' | 'dots'

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const show = useCallback(({ message: msg = 'Loading...', variant: v = 'spinner' } = {}) => {
    setMessage(msg);
    setVariant(v);
    setVisible(true);

    fadeAnim.setValue(0);
    scaleAnim.setValue(0.85);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 7, tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85, duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [fadeAnim, scaleAnim]);

  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            s.card,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {variant === 'spinner' ? <SpinnerRing /> : <BouncingDots />}
          {!!message && (
            <Text style={s.message}>{message}</Text>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

export default Loader;

const s = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  card: {
    backgroundColor:  '#fff',
    borderRadius:     normalize(20),
    paddingVertical:  normalize(28),
    paddingHorizontal: normalize(36),
    alignItems:       'center',
    justifyContent:   'center',
    minWidth:         normalize(140),
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 8 },
    shadowOpacity:    0.14,
    shadowRadius:     20,
    elevation:        12,
  },
  message: {
    marginTop:    normalize(14),
    fontSize:     normalize(14),
    fontWeight:   '600',
    color:        Colors.textSecondary,
    letterSpacing: 0.2,
    textAlign:    'center',
  },
});