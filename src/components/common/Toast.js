import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View, Text, StyleSheet, Animated,
  Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { normalize } from '../../utils/responsive';
import { Colors } from '../../theme/colors';

const TOAST_TYPES = {
  success: {
    icon:    'checkmark-circle',
    bg:      Colors.success,
    border:  '#27ae60',
  },
  error: {
    icon:    'alert-circle',
    bg:      Colors.error,
    border:  '#c0392b',
  },
  warning: {
    icon:    'warning',
    bg:      '#f39c12',
    border:  '#e67e22',
  },
  info: {
    icon:    'information-circle',
    bg:      Colors.primary,
    border:  Colors.primaryDark,
  },
};

const DURATION   = 3000; // auto-dismiss after 3s
const ANIM_IN    = 320;
const ANIM_OUT   = 260;

const Toast = forwardRef((_, ref) => {
  const [visible,  setVisible]  = useState(false);
  const [toast,    setToast]    = useState({ type: 'success', title: '', message: '' });

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef(null);
  const insets     = useSafeAreaInsets();

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120, duration: ANIM_OUT,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0, duration: ANIM_OUT,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [translateY, opacity]);

  const show = useCallback(({ type = 'success', title = '', message = '' }) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset animation values
    translateY.setValue(-120);
    opacity.setValue(0);

    setToast({ type, title, message });
    setVisible(true);

    // Slide in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0, duration: ANIM_IN,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: ANIM_IN,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    timerRef.current = setTimeout(() => hide(), DURATION);
  }, [translateY, opacity, hide]);

  // Expose show/hide to parent via ref
  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!visible) return null;

  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

  return (
    <Animated.View
      style={[
        s.container,
        {
          top: insets.top + normalize(12),
          transform: [{ translateY }],
          opacity,
          borderLeftColor: config.border,
          backgroundColor: config.bg,
        },
      ]}
      pointerEvents="none"
    >
      <View style={s.iconWrap}>
        <Ionicons name={config.icon} size={normalize(22)} color="#fff" />
      </View>
      <View style={s.textWrap}>
        {!!toast.title && (
          <Text style={s.title} numberOfLines={1}>{toast.title}</Text>
        )}
        {!!toast.message && (
          <Text style={s.message} numberOfLines={2}>{toast.message}</Text>
        )}
      </View>
    </Animated.View>
  );
});

export default Toast;

const s = StyleSheet.create({
  container: {
    position:  'absolute',
    left:       normalize(16),
    right:      normalize(16),
    zIndex:     9999,
    flexDirection: 'row',
    alignItems:    'center',
    borderRadius:  normalize(14),
    borderLeftWidth: normalize(5),
    paddingVertical:   normalize(12),
    paddingHorizontal: normalize(14),
    gap: normalize(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius:  10,
    elevation: 10,
  },
  iconWrap: {
    width:  normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize:   normalize(14),
    fontWeight: '700',
    color:      '#fff',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  message: {
    fontSize:    normalize(13),
    color:       'rgba(255,255,255,0.92)',
    lineHeight:  normalize(18),
    fontWeight: '500',
  },
});