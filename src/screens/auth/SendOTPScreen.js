import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity,
  TextInput, Animated, Easing, StatusBar, Image,
  ActivityIndicator, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { normalize, wp, isTablet } from '../../utils/responsive';
import { Colors } from '../../theme/colors';
import { loginWithPhone, verifyOTP } from '../../api/auth.api';
import { showToast } from '../../hooks/useToast';
import { hideLoader, showLoader } from '../../hooks/useLoader';
import { useAuthStore } from '../../store/authStore';

const C = {
  orange: Colors.primary,
  orangeD: Colors.primaryDark,
  bg: Colors.background,
  white: Colors.white,
  text: Colors.textPrimary,
  sub: Colors.textSecondary,
  border: Colors.border,
  borderFo: Colors.borderFocus,
  muted: Colors.textMuted,
  error: Colors.error,
  success: Colors.success,
};

const OTP_LENGTH = 6;

function PhoneInput({ value, onChangeText, onSubmitEditing }) {
  const [focused, setFocused] = useState(false);
  const lineAnim = useRef(new Animated.Value(0)).current;

  const onFocus = useCallback(() => {
    setFocused(true);
    Animated.timing(lineAnim, {
      toValue: 1, duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [lineAnim]);

  const onBlur = useCallback(() => {
    setFocused(false);
    if (!value) {
      Animated.timing(lineAnim, {
        toValue: 0, duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  }, [lineAnim, value]);

  const borderColor = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.borderFo],
  });

  return (
    <View style={inp.wrapper}>
      <Text style={[inp.label, { color: C.orange }]}>Mobile</Text>
      <Animated.View style={[inp.row, { borderBottomColor: borderColor }]}>
        <Ionicons
          name="call-outline"
          size={normalize(18)}
          color={C.orange}
          style={inp.icon}
        />
        <TextInput
          style={inp.field}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Enter your mobile number"
          placeholderTextColor={C.muted}
          keyboardType="phone-pad"
          maxLength={10}
          returnKeyType="done"
          autoCorrect={false}
          autoComplete="tel"
          textContentType="telephoneNumber"
          importantForAutofill="yes"
          blurOnSubmit={false}
          onSubmitEditing={onSubmitEditing}
        />
        {value.length === 10 && (
          <Ionicons name="checkmark-circle" size={normalize(20)} color={C.orange} />
        )}
      </Animated.View>
    </View>
  );
}

const inp = StyleSheet.create({
  wrapper: { marginBottom: normalize(8) },
  label: { fontSize: normalize(13), fontWeight: '600', marginBottom: normalize(6), letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, paddingBottom: normalize(10) },
  icon: { marginRight: normalize(10) },
  field: { flex: 1, fontSize: normalize(16), color: C.text, paddingVertical: 0, letterSpacing: 0.5 },
});

// OTP Box Component
function OTPBox({ value, focused, inputRef, onChangeText, onKeyPress, onFocus }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
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
    <Animated.View style={[otpStyles.wrap, { transform: [{ scale: scaleAnim }] }]}>
      <Animated.View style={[
        otpStyles.box,
        { borderColor, borderWidth },
        focused && otpStyles.boxFocused,
        value && otpStyles.boxFilled,
      ]}>
        <TextInput
          ref={inputRef}
          style={otpStyles.input}
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

const otpStyles = StyleSheet.create({
  wrap: { flex: 1 },
  box: {
    height: normalize(52), borderRadius: normalize(12),
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
  },
  boxFocused: { backgroundColor: '#FFF5EF' },
  boxFilled: { backgroundColor: C.white },
  input: {
    position: 'absolute', width: '100%', height: '100%',
    fontSize: normalize(22), fontWeight: '700', color: C.text, textAlign: 'center',
  },
});

// Resend Timer Component
function ResendTimer({ onResend, loading }) {
  const [seconds, setSeconds] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (seconds <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setSeconds((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const handle = useCallback(() => {
    if (!canResend || loading) return;
    setSeconds(30);
    setCanResend(false);
    onResend?.();
  }, [canResend, onResend, loading]);

  return (
    <View style={resendStyles.row}>
      <Text style={resendStyles.hint}>Didn't receive the code?  </Text>
      {canResend ? (
        <TouchableOpacity onPress={handle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} disabled={loading}>
          <Text style={[resendStyles.resend, loading && { opacity: 0.5 }]}>Resend OTP</Text>
        </TouchableOpacity>
      ) : (
        <Text style={resendStyles.timer}>Resend in {seconds}s</Text>
      )}
    </View>
  );
}

const resendStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: normalize(10) },
  hint: { fontSize: normalize(13), color: C.sub },
  resend: { fontSize: normalize(13), color: C.orange, fontWeight: '700' },
  timer: { fontSize: normalize(13), color: C.muted, fontWeight: '500' },
});

export default function SendOTPScreen() {
  const [mobile, setMobile] = useState('');
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusIdx, setFocusIdx] = useState(0);
  const [pressed, setPressed] = useState(false);

  const inputs = useRef([]);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tablet = isTablet();
  const setAuth = useAuthStore((s) => s.setAuth);

  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const phoneFormAnim = useRef(new Animated.Value(1)).current;
  const otpFormAnim = useRef(new Animated.Value(0)).current;

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
    ]).start();
  }, []);

  const triggerShake = useCallback(() => {
    Vibration.vibrate(80);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // Send OTP
  const handleSendOTP = useCallback(async () => {
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');
    showLoader();

    try {
      const response = await loginWithPhone(mobile);
      showToast({
        type: 'success',
        title: 'OTP Sent!',
        message: response.message ?? 'Check your mobile for the code.',
      });
      
      // Animate transition to OTP screen
      Animated.parallel([
        Animated.timing(phoneFormAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(otpFormAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep('otp');
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputs.current[0]?.focus(), 100);
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed',
        message: error.message,
      });
      setError(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
      hideLoader();
    }
  }, [mobile, phoneFormAnim, otpFormAnim]);

  // Resend OTP
  const handleResendOTP = useCallback(async () => {
    setLoading(true);
    setError('');
    showLoader();

    try {
      const response = await loginWithPhone(mobile);
      showToast({
        type: 'success',
        title: 'OTP Resent!',
        message: response.message ?? 'OTP sent successfully',
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed',
        message: error.message,
      });
      setError(error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
      hideLoader();
    }
  }, [mobile]);

  // Verify OTP
  const handleVerifyOTP = useCallback(async () => {
    const code = otpDigits.join('');
    if (code.length < OTP_LENGTH) return;

    setLoading(true);
    setError('');
    showLoader();

    try {
      const response = await verifyOTP(mobile, code);
      setAuth(response.token || 'mock_token', { mobile, ...response.user });
      showToast({
        type: 'success',
        title: 'Success!',
        message: 'Logged in successfully',
      });
      navigation.replace('HomeScreen'); 
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed',
        message: error.message || 'Incorrect OTP',
      });
      setError(error.message || 'Incorrect OTP. Please try again.');
      triggerShake();
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => {
        inputs.current[0]?.focus();
        setFocusIdx(0);
      }, 120);
    } finally {
      setLoading(false);
      hideLoader();
    }
  }, [otpDigits, mobile, setAuth, navigation, triggerShake]);

  // Auto-submit OTP when all digits are filled
  useEffect(() => {
    if (step === 'otp' && otpDigits.every(Boolean) && !loading) {
      handleVerifyOTP();
    }
  }, [otpDigits, step, loading, handleVerifyOTP]);

  // OTP input handlers
  const handleOTPChange = useCallback((val, idx) => {
    setError('');
    const updated = [...otpDigits];
    updated[idx] = val.replace(/[^0-9]/g, '').slice(-1);
    setOtpDigits(updated);
    if (val && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
      setFocusIdx(idx + 1);
    }
  }, [otpDigits]);

  const handleOTPKeyPress = useCallback(({ nativeEvent }, idx) => {
    if (nativeEvent.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      const updated = [...otpDigits];
      updated[idx - 1] = '';
      setOtpDigits(updated);
      inputs.current[idx - 1]?.focus();
      setFocusIdx(idx - 1);
    }
  }, [otpDigits]);

  const handleBackToPhone = useCallback(() => {
    Animated.parallel([
      Animated.timing(phoneFormAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(otpFormAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep('phone');
      setError('');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
    });
  }, [phoneFormAnim, otpFormAnim]);

  const isPhoneValid = mobile.length === 10;
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
            },
            tablet && {
              marginHorizontal: wp(6),
              borderTopLeftRadius: normalize(44),
              borderTopRightRadius: normalize(44),
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={[
              s.cardContent,
              tablet && { paddingHorizontal: normalize(36) },
              { paddingBottom: Math.max(insets.bottom, normalize(20)) + normalize(28) },
            ]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.title}>Getting Started</Text>
            <Text style={s.subtitle}>Login Account to Continue</Text>

            <View style={[s.illustWrap, tablet && { height: normalize(220) }]}>
              <Image
                source={require('../../../assets/login.png')}
                style={s.illustImg}
                resizeMode="contain"
                fadeDuration={0}
              />
            </View>

            {/* Phone Form */}
            <Animated.View style={[s.formContainer, { opacity: phoneFormAnim, transform: [{ scale: phoneFormAnim }] }]}>
              {step === 'phone' && (
                <>
                  <PhoneInput
                    value={mobile}
                    onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, '').slice(0, 10))}
                    onSubmitEditing={handleSendOTP}
                  />

                  {error && (
                    <View style={s.errorRow}>
                      <Ionicons name="alert-circle-outline" size={normalize(14)} color={C.error} />
                      <Text style={s.errorText}>{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      s.btn,
                      !isPhoneValid && s.btnDisabled,
                      pressed && s.btnPressed,
                      tablet && { paddingVertical: normalize(18), borderRadius: normalize(36) },
                    ]}
                    onPress={handleSendOTP}
                    onPressIn={() => setPressed(true)}
                    onPressOut={() => setPressed(false)}
                    disabled={!isPhoneValid || loading}
                    activeOpacity={1}
                  >
                    {loading ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <Text style={s.btnText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>

            {/* OTP Form */}
            <Animated.View style={[s.formContainer, { opacity: otpFormAnim, transform: [{ scale: otpFormAnim }] }]}>
              {step === 'otp' && (
                <>
                  <View style={s.otpSection}>
                    <Text style={s.otpLabel}>Mobile</Text>
                    <View style={s.mobileRow}>
                      <Ionicons name="call-outline" size={normalize(18)} color={C.orange} />
                      <Text style={s.mobileText}>{maskedMobile}</Text>
                      <TouchableOpacity onPress={handleBackToPhone}>
                        <Text style={s.editText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={s.otpSection}>
                    <Text style={s.otpLabel}>One Time Passcode</Text>
                    <Animated.View style={[s.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
                      {otpDigits.map((d, i) => (
                        <OTPBox
                          key={i}
                          value={d}
                          focused={focusIdx === i}
                          inputRef={(r) => (inputs.current[i] = r)}
                          onChangeText={(v) => handleOTPChange(v, i)}
                          onKeyPress={(e) => handleOTPKeyPress(e, i)}
                          onFocus={() => setFocusIdx(i)}
                        />
                      ))}
                    </Animated.View>
                  </View>

                  {!!error && (
                    <View style={s.errorRow}>
                      <Ionicons name="alert-circle-outline" size={normalize(14)} color={C.error} />
                      <Text style={s.errorText}>{error}</Text>
                    </View>
                  )}

                  <ResendTimer onResend={handleResendOTP} loading={loading} />

                  {loading && otpDigits.every(Boolean) && (
                    <View style={s.loadingContainer}>
                      <ActivityIndicator size="small" color={C.orange} />
                      <Text style={s.loadingText}>Verifying OTP...</Text>
                    </View>
                  )}
                </>
              )}
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.white },
  kav: { flex: 1, justifyContent: 'flex-end' },

  card: {
    backgroundColor: C.white,
    borderTopLeftRadius: normalize(30),
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

  title: { fontSize: normalize(22), fontWeight: '700', color: C.text, letterSpacing: 0.1 },
  subtitle: { fontSize: normalize(13), color: C.sub, marginTop: normalize(4), marginBottom: normalize(18) },

  illustWrap: { width: '100%', height: normalize(165), alignItems: 'center', justifyContent: 'center', marginBottom: normalize(8) },
  illustImg: { width: '90%', height: '100%' },

  formContainer: {
    position: 'relative',
  },

  otpSection: {
    marginBottom: normalize(20),
  },
  otpLabel: {
    fontSize: normalize(13),
    fontWeight: '600',
    color: C.orange,
    marginBottom: normalize(6),
    letterSpacing: 0.3,
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
    paddingBottom: normalize(10),
    gap: normalize(10),
  },
  mobileText: {
    fontSize: normalize(16),
    color: C.text,
    fontWeight: '500',
    letterSpacing: 0.3,
    flex: 1,
  },
  editText: {
    fontSize: normalize(13),
    color: C.orange,
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    gap: normalize(12),
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(5),
    backgroundColor: Colors.errorLight,
    borderRadius: normalize(10),
    paddingVertical: normalize(8),
    paddingHorizontal: normalize(12),
    marginBottom: normalize(10),
  },
  errorText: {
    fontSize: normalize(12),
    color: C.error,
    fontWeight: '500',
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(10),
    gap: normalize(8),
    marginBottom: normalize(20),
  },
  loadingText: {
    fontSize: normalize(13),
    color: C.orange,
    fontWeight: '500',
  },
  btn: {
    backgroundColor: C.orange, paddingVertical: normalize(15),
    borderRadius: normalize(28), alignItems: 'center', marginTop: normalize(14),
    shadowColor: C.orange, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38, shadowRadius: 14, elevation: 6,
  },
  btnPressed: { backgroundColor: C.orangeD, shadowOpacity: 0.18, transform: [{ scale: 0.985 }] },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  btnText: { color: C.white, fontWeight: '700', fontSize: normalize(16), letterSpacing: 0.4 },
});