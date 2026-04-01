import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  Animated, Easing, StatusBar, Image,
  ActivityIndicator, Vibration,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { normalize, wp, isTablet } from '../../utils/responsive';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../theme/colors';

const C = {
  orange:   Colors.primary,
  orangeD:  Colors.primaryDark,
  bg:       Colors.background,
  white:    Colors.white,
  text:     Colors.textPrimary,
  sub:      Colors.textSecondary,
  border:   Colors.border,
  borderFo: Colors.borderFocus,
  muted:    Colors.textMuted,
  success:  Colors.success,
  error:    Colors.error,
};

const OTP_LENGTH = 6;

// ─── Single OTP box ───────────────────────────────────────────────────────────
function OTPBox({ value, focused, inputRef, onChangeText, onKeyPress, onFocus }) {
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0, duration: 180,
      easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();
  }, [focused]);

  useEffect(() => {
    if (value) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.13, duration: 80, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.00, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [value]);

  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.orange] });
  const borderWidth = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [1.5, 2.5] });

  return (
    <Animated.View style={[otp.wrap, { transform: [{ scale: scaleAnim }] }]}>
      <Animated.View style={[
        otp.box,
        { borderColor, borderWidth },
        focused && otp.boxFocused,
        value   && otp.boxFilled,
      ]}>
        <TextInput
          ref={inputRef}
          style={otp.input}
          value={value}
          onChangeText={onChangeText}
          onKeyPress={onKeyPress}
          onFocus={onFocus}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          caretHidden
          selectTextOnFocus
          autoCorrect={false}
          spellCheck={false}
          contextMenuHidden
          importantForAutofill="no"
        />
      </Animated.View>
    </Animated.View>
  );
}

const otp = StyleSheet.create({
  wrap:       { flex: 1 },
  box: {
    height: normalize(52), borderRadius: normalize(12),
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
  },
  boxFocused: { backgroundColor: '#FFF5EF' },
  boxFilled:  { backgroundColor: C.white },
  input: {
    position: 'absolute', width: '100%', height: '100%',
    fontSize: normalize(22), fontWeight: '700', color: C.text, textAlign: 'center',
  },
});

// ─── Resend timer ─────────────────────────────────────────────────────────────
function ResendTimer({ onResend }) {
  const [seconds,   setSeconds]   = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (seconds <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setSeconds((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const handle = useCallback(() => {
    if (!canResend) return;
    setSeconds(30); setCanResend(false); onResend?.();
  }, [canResend, onResend]);

  return (
    <View style={tm.row}>
      <Text style={tm.hint}>Didn't receive the code?  </Text>
      {canResend ? (
        <TouchableOpacity onPress={handle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={tm.resend}>Resend OTP</Text>
        </TouchableOpacity>
      ) : (
        <Text style={tm.timer}>Resend in {seconds}s</Text>
      )}
    </View>
  );
}

const tm = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: normalize(10) },
  hint:   { fontSize: normalize(13), color: C.sub },
  resend: { fontSize: normalize(13), color: C.orange, fontWeight: '700' },
  timer:  { fontSize: normalize(13), color: C.muted, fontWeight: '500' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function VerifyOTPScreen() {
  const [digits,   setDigits]   = useState(Array(OTP_LENGTH).fill(''));
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [pressed,  setPressed]  = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);

  const inputs     = useRef([]);
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const setAuth    = useAuthStore((s) => s.setAuth);
  const tablet     = isTablet();
  const { mobile } = route.params ?? {};

  // Simple one-time entry animation — same as SendOTPScreen.
  // No PanResponder, no drag. Card is permanently fixed at the bottom.
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0, duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => inputs.current[0]?.focus());
  }, []);

  // ── shake row on wrong OTP ─────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    Vibration.vibrate(80);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   7, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  -7, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 35, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── OTP input ──────────────────────────────────────────────────────────────
  const handleChange = useCallback((val, idx) => {
    setError('');
    const updated = [...digits];
    updated[idx]  = val.replace(/[^0-9]/g, '').slice(-1);
    setDigits(updated);
    if (val && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
      setFocusIdx(idx + 1);
    }
  }, [digits]);

  const handleKeyPress = useCallback(({ nativeEvent }, idx) => {
    if (nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      const updated = [...digits];
      updated[idx - 1] = '';
      setDigits(updated);
      inputs.current[idx - 1]?.focus();
      setFocusIdx(idx - 1);
    }
  }, [digits]);

  const handleVerify = useCallback(async () => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) return;
    setLoading(true); setError('');
    try {
      await new Promise((r) => setTimeout(r, 1200)); // ← replace with real API
      setAuth('mock_token', { mobile });
    } catch {
      setLoading(false);
      setError('Incorrect OTP. Please try again.');
      triggerShake();
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => { inputs.current[0]?.focus(); setFocusIdx(0); }, 120);
    }
  }, [digits, mobile, setAuth, triggerShake]);

  // auto-submit when all 6 filled
  useEffect(() => {
    if (digits.every(Boolean)) handleVerify();
  }, [digits]);

  const isReady      = digits.every(Boolean);
  const maskedMobile = mobile
    ? mobile.replace(/(\d{3})(\d{4})(\d{3})/, '$1 **** $3')
    : '';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} translucent={false} />

      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.orange }]} />
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            s.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              marginBottom: -insets.bottom, 
            },
            tablet && {
              marginHorizontal: wp(6),
              borderTopLeftRadius:  normalize(44),
              borderTopRightRadius: normalize(44),
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={[
              s.cardContent,
              tablet && { paddingHorizontal: normalize(36) },
              { paddingBottom: Math.max(normalize(20), normalize(28)) }
            ]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.title}>Getting Started</Text>
            <Text style={s.subtitle}>Login Account to Continue</Text>

            {/* illustration */}
            <View style={[s.illustWrap, tablet && { height: normalize(200) }]}>
              <Image
                source={require('../../../assets/login.png')}
                style={s.illustImg}
                resizeMode="contain"
                fadeDuration={0}
              />
            </View>

            {/* mobile display */}
            <Text style={s.fieldLabel}>Mobile</Text>
            <View style={s.mobileRow}>
              <Ionicons name="mail-outline" size={normalize(17)} color={C.muted} />
              <Text style={s.mobileValue}>{maskedMobile || 'Alfennzo@gmail.com'}</Text>
            </View>

            {/* OTP */}
            <View style={s.otpHeader}>
              <Text style={s.fieldLabel}>One Time Passcode</Text>
              <Ionicons name="call-outline" size={normalize(15)} color={C.muted} />
            </View>

            {/* OTP boxes — shake animation applied only to this row */}
            <Animated.View
              style={[s.otpRow, { transform: [{ translateX: shakeAnim }] }]}
            >
              {digits.map((d, i) => (
                <OTPBox
                  key={i}
                  value={d}
                  focused={focusIdx === i}
                  inputRef={(r) => (inputs.current[i] = r)}
                  onChangeText={(v) => handleChange(v, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  onFocus={() => setFocusIdx(i)}
                />
              ))}
            </Animated.View>

            {/* error */}
            {!!error && (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={normalize(14)} color={C.error} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <ResendTimer onResend={() => {}} />

            <TouchableOpacity style={s.termsRow}>
              <Text style={s.termsText}>Terms & Conditions</Text>
            </TouchableOpacity>
            <View style={{ height: normalize(8) }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.white }, // Changed to white
  topSafe: { zIndex: 10, backgroundColor: 'transparent' },
  kav:     { flex: 1, justifyContent: 'flex-end' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: normalize(20), paddingTop: normalize(6), paddingBottom: normalize(4),
  },
  backBtn: {
    width: normalize(38), height: normalize(38), borderRadius: normalize(12),
    backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center',
  },
  helpText: { fontSize: normalize(13), color: C.white, fontWeight: '600', letterSpacing: 0.2 },

  // Card — permanently at the bottom of the screen
  card: {
    backgroundColor: C.white,
    borderTopLeftRadius:  normalize(30),
    borderTopRightRadius: normalize(30),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    zIndex: 1,
  },
  cardContent: {
    paddingTop: normalize(28),
    paddingHorizontal: normalize(24),
    paddingBottom: normalize(8),
  },

  title:    { fontSize: normalize(22), fontWeight: '700', color: C.text, letterSpacing: 0.1 },
  subtitle: { fontSize: normalize(13), color: C.sub, marginTop: normalize(4), marginBottom: normalize(14) },

  illustWrap: { width: '100%', height: normalize(145), alignItems: 'center', justifyContent: 'center', marginBottom: normalize(12) },
  illustImg:  { width: '85%', height: '100%' },

  fieldLabel: { fontSize: normalize(13), fontWeight: '600', color: C.orange, marginBottom: normalize(6), letterSpacing: 0.3 },

  mobileRow: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(8),
    borderBottomWidth: 1.5, borderBottomColor: C.border,
    paddingBottom: normalize(10), marginBottom: normalize(16),
  },
  mobileValue: { fontSize: normalize(15), color: C.text, fontWeight: '500', letterSpacing: 0.3 },

  otpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: normalize(12) },
  otpRow:    { flexDirection: 'row', gap: normalize(8), marginBottom: normalize(12) },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(5),
    backgroundColor: Colors.errorLight, borderRadius: normalize(10),
    paddingVertical: normalize(8), paddingHorizontal: normalize(12),
    marginBottom: normalize(10),
  },
  errorText: { fontSize: normalize(12), color: C.error, fontWeight: '500' },

  termsRow:  { alignItems: 'center', paddingVertical: normalize(6), marginBottom: normalize(4) },
  termsText: { fontSize: normalize(13), color: C.sub, textDecorationLine: 'underline', fontWeight: '500' },

  btn: {
    backgroundColor: C.orange, paddingVertical: normalize(15),
    borderRadius: normalize(28), alignItems: 'center', marginTop: normalize(10),
    shadowColor: C.orange, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38, shadowRadius: 14, elevation: 6,
  },
  btnPressed:  { backgroundColor: C.orangeD, shadowOpacity: 0.18, transform: [{ scale: 0.985 }] },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  btnText:     { color: C.white, fontWeight: '700', fontSize: normalize(16), letterSpacing: 0.4 },
    displayText: {
    fontSize: normalize(24),
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    lineHeight: normalize(52),
  },
});