import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity,
  TextInput, Animated, Easing, StatusBar,
  ActivityIndicator, Vibration,
  Platform, Keyboard, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { OtpInput } from 'react-native-otp-entry';
import LottieView from 'lottie-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { showToast } from '../../hooks/useToast';
import { loginWithPhone, verifyOTP } from '../../api/auth.api';
import { hideLoader, showLoader } from '../../hooks/useLoader';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const COUNTRY_CODE = '+91';
const MAX_PHONE_LENGTH = 10;

// Responsive sizing helpers
const normalize = (size) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Math.round(newSize);
};

const isTablet = () => {
  const pixelDensity = Dimensions.get('window').scale;
  return SCREEN_WIDTH >= 768 && pixelDensity < 2;
};

// Theme Colors
const Colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  white: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#6C6C70',
  textMuted: '#8E8E93',
  border: '#E5E5EA',
  borderFocus: '#FF6B35',
  error: '#FF3B30',
  errorLight: '#FFE5E5',
  success: '#34C759',
};

// ============================================================================
// PhoneInput Component
// ============================================================================

function PhoneInput({ value, onChangeText, onSubmitEditing, editable = true, inputRef }) {
  const lineAnim = useRef(new Animated.Value(0)).current;

  const animateLine = useCallback((toValue, duration) => {
    Animated.timing(lineAnim, {
      toValue, duration,
      easing: toValue ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [lineAnim]);

  const borderColor = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.borderFocus],
  });

  return (
    <View style={phoneStyles.wrapper}>
      <Text style={[phoneStyles.label, { color: Colors.primary }]}>Mobile Number</Text>
      <Animated.View style={[phoneStyles.row, { borderBottomColor: borderColor }]}>
        <View style={phoneStyles.countryCodeContainer}>
          <Text style={phoneStyles.countryCode}>{COUNTRY_CODE}</Text>
        </View>
        <TextInput
          ref={inputRef}
          style={phoneStyles.field}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => animateLine(1, 200)}
          onBlur={() => !value && animateLine(0, 180)}
          placeholder="Enter your mobile number"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          maxLength={MAX_PHONE_LENGTH}
          returnKeyType="done"
          autoCorrect={false}
          autoComplete="tel"
          textContentType="telephoneNumber"
          importantForAutofill="yes"
          blurOnSubmit={false}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
        />
        {value.length === MAX_PHONE_LENGTH && (
          <Ionicons name="checkmark-circle" size={normalize(20)} color={Colors.primary} />
        )}
      </Animated.View>
    </View>
  );
}

const phoneStyles = StyleSheet.create({
  wrapper: { marginBottom: normalize(8) },
  label: {
    fontSize: normalize(13), fontWeight: '600',
    marginBottom: normalize(6), letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.5, paddingBottom: normalize(10),
  },
  countryCodeContainer: {
    marginRight: normalize(8),
    paddingRight: normalize(8),
    borderRightWidth: 1.5,
    borderRightColor: Colors.border,
  },
  countryCode: {
    fontSize: normalize(16),
    color: Colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  field: {
    flex: 1, fontSize: normalize(16), color: Colors.textPrimary,
    paddingVertical: 0, letterSpacing: 0.5, marginLeft: normalize(8),
  },
});

// ============================================================================
// ResendTimer Component
// ============================================================================

function ResendTimer({ onResend, loading }) {
  const [secs, setSecs] = useState(RESEND_SECONDS);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecs(RESEND_SECONDS);
    timerRef.current = setInterval(() => {
      setSecs((n) => {
        if (n <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const canResend = secs === 0;

  const handleResend = useCallback(() => {
    if (!canResend || loading) return;
    startTimer();
    onResend?.();
  }, [canResend, loading, onResend, startTimer]);

  return (
    <View style={resendStyles.row}>
      <Text style={resendStyles.hint}>Didn't receive the code?{'  '}</Text>
      {canResend ? (
        <TouchableOpacity
          onPress={handleResend}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={loading}
        >
          <Text style={[resendStyles.resend, loading && resendStyles.dim]}>Resend OTP</Text>
        </TouchableOpacity>
      ) : (
        <Text style={resendStyles.timer}>Resend in {secs}s</Text>
      )}
    </View>
  );
}

const resendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: normalize(10),
  },
  hint: { fontSize: normalize(13), color: Colors.textSecondary },
  resend: { fontSize: normalize(13), color: Colors.primary, fontWeight: '700' },
  timer: { fontSize: normalize(13), color: Colors.textMuted, fontWeight: '500' },
  dim: { opacity: 0.5 },
});

const errorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(5),
    backgroundColor: Colors.errorLight, borderRadius: normalize(10),
    paddingVertical: normalize(8), paddingHorizontal: normalize(12),
    marginBottom: normalize(10),
  },
  text: { fontSize: normalize(12), color: Colors.error, fontWeight: '500', flex: 1 },
});

// ============================================================================
// SendButton Component
// ============================================================================

function SendButton({ onPress, loading, disabled, tablet, label }) {
  const [pressed, setPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    setPressed(true);
    Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    setPressed(false);
    Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          buttonStyles.btn,
          disabled && buttonStyles.disabled,
          pressed && buttonStyles.pressed,
          tablet && { paddingVertical: normalize(18), borderRadius: normalize(36) },
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        {loading
          ? <ActivityIndicator color={Colors.white} size="small" />
          : <Text style={buttonStyles.label}>{label}</Text>
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

const buttonStyles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: normalize(15),
    borderRadius: normalize(28),
    alignItems: 'center',
    marginTop: normalize(14),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38, shadowRadius: 14, elevation: 6,
  },
  pressed: { backgroundColor: Colors.primaryDark, shadowOpacity: 0.18 },
  disabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  label: { color: Colors.white, fontWeight: '700', fontSize: normalize(16), letterSpacing: 0.4 },
});

// ============================================================================
// Main Screen Component
// ============================================================================

export default function SendOTPScreen() {
  const scrollRef = useRef(null);
  const phoneInputRef = useRef(null);
  const otpRef = useRef(null);
  const lottieRef = useRef(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mobile, setMobile] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpValueRef = useRef('');
  const verifyingRef = useRef(false);
  const timeoutRefs = useRef([]);

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tablet = isTablet();

  useEffect(() => {
    return () => timeoutRefs.current.forEach((t) => clearTimeout(t));
  }, []);

  // Entrance animations
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lottieScale = useRef(new Animated.Value(0.3)).current;
  const lottieFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0, duration: 500,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.spring(lottieScale, {
            toValue: 1, damping: 12, stiffness: 100,
            useNativeDriver: true,
          }),
          Animated.timing(lottieFade, {
            toValue: 1, duration: 350,
            easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  // OTP input auto-focus
  useEffect(() => {
    if (step !== 'otp') return;
    const delay = Platform.OS === 'android' ? 500 : 200;
    const t = setTimeout(() => {
      if (otpRef.current) {
        otpRef.current.focus();
      }
    }, delay);
    timeoutRefs.current.push(t);
    return () => clearTimeout(t);
  }, [step]);

  // Shake animation for error
  const shakeAnim = useRef(new Animated.Value(0)).current;
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

  // Send OTP - FIXED VERSION
  const handleSendOTP = useCallback(async () => {
    // Validation
    if (mobile.length !== MAX_PHONE_LENGTH) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (loading) return;

    setLoading(true);
    setError('');
    showLoader();

    try {
      const response = await loginWithPhone(mobile);

      // Check if response indicates success
      if (response && response.status === true) {
        showToast({
          type: 'success',
          title: 'OTP Sent!',
          message: `OTP sent to ${COUNTRY_CODE} ${mobile}`
        });

        // Reset OTP states
        otpValueRef.current = '';
        verifyingRef.current = false;

        // Clear OTP input if exists
        if (otpRef.current) {
          otpRef.current.clear();
        }

        // Move to OTP step
        setStep('otp');
        setError('');
      } else {
        throw new Error(response?.message || 'Failed to send OTP');
      }
    } catch (e) {
      const errorMessage = e.message || 'Failed to send OTP. Please try again.';
      showToast({
        type: 'error',
        title: 'Failed',
        message: errorMessage
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
      hideLoader();
    }
  }, [mobile, loading]);

  // Resend OTP - FIXED VERSION
  const handleResendOTP = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError('');
    showLoader();

    try {
      const response = await loginWithPhone(mobile);


      if (response && response.status === true) {
        showToast({
          type: 'success',
          title: 'OTP Resent!',
          message: `OTP resent to ${COUNTRY_CODE} ${mobile}`
        });

        // Clear OTP input
        if (otpRef.current) {
          otpRef.current.clear();
        }
        otpValueRef.current = '';
        verifyingRef.current = false;
        setError('');
      } else {
        throw new Error(response?.message || 'Failed to resend OTP');
      }
    } catch (e) {
      const errorMessage = e.message || 'Failed to resend OTP';
      showToast({
        type: 'error',
        title: 'Failed',
        message: errorMessage
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
      hideLoader();
    }
  }, [mobile, loading]);

  // Verify OTP - FIXED VERSION
  const handleVerifyOTP = useCallback(async (code) => {
    if (!code || code.length < OTP_LENGTH) return;
    if (verifyingRef.current) return;

    verifyingRef.current = true;
    setLoading(true);
    setError('');
    showLoader();

    try {
      const response = await verifyOTP(mobile, code);

      console.log('OTP Response:', response);

      if (response?.status === true && response?.data?.accessToken) {
        const userData = response.data;

        await setAuth(userData.accessToken, {
          id: userData._id,
          name: userData.fullname,
          phone: userData.phone,
          email: userData.email,
        });

        showToast({
          type: 'success',
          title: 'Success',
          message: 'Logged in successfully',
        });

        // ❌ NO navigation.replace
        // ❌ NO navigation.reset
      } else {
        throw new Error(response?.message || 'Invalid OTP');
      }

    } catch (e) {
      const msg = e.message || 'Invalid OTP';

      setError(msg);
      triggerShake();

      otpRef.current?.clear();
      otpValueRef.current = '';
      verifyingRef.current = false;

      showToast({
        type: 'error',
        title: 'Error',
        message: msg,
      });

    } finally {
      setLoading(false);
      hideLoader();
    }
  }, [mobile]);

  // Back to phone
  const handleBackToPhone = useCallback(() => {
    if (otpRef.current) {
      otpRef.current.clear();
    }
    otpValueRef.current = '';
    verifyingRef.current = false;
    setError('');
    setStep('phone');
  }, []);

  // Derived values
  const isPhoneValid = mobile.length === MAX_PHONE_LENGTH;
  const fullPhoneNumber = `${COUNTRY_CODE} ${mobile.replace(/(\d{3})(\d{4})(\d{3})/, '$1 **** $3')}`;

  const handlePhoneSubmitEditing = useCallback(() => {
    if (isPhoneValid && !loading) {
      Keyboard.dismiss();
      handleSendOTP();
    }
  }, [isPhoneValid, loading, handleSendOTP]);

  const bottomPad = Math.max(insets.bottom, normalize(16));
  const cardRadius = tablet ? normalize(52) : normalize(36);
  const lottieSize = tablet ? normalize(300) : normalize(220);

  // OTP theme
  const otpTheme = useMemo(() => ({
    containerStyle: {
      width: 'auto',
      gap: normalize(tablet ? 12 : 6),
    },
    pinCodeContainerStyle: {
      width: normalize(tablet ? 56 : 48),
      height: normalize(tablet ? 64 : 54),
      borderRadius: normalize(12),
      borderWidth: 1.5,
      borderColor: Colors.border,
      backgroundColor: Colors.white,
    },
    focusedPinCodeContainerStyle: {
      borderColor: Colors.primary,
      borderWidth: 2,
      backgroundColor: '#FFF5EF',
    },
    filledPinCodeContainerStyle: {
      borderColor: Colors.primary,
      backgroundColor: Colors.white,
    },
    pinCodeTextStyle: {
      fontSize: normalize(tablet ? 24 : 20),
      fontWeight: '700',
      color: Colors.textPrimary,
    },
    focusStickStyle: {
      backgroundColor: Colors.primary,
      width: 1.5,
    },
  }), [tablet]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} translucent={false} />

      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={normalize(80)}
        extraHeight={normalize(80)}
        keyboardOpeningTime={0}
      >
        {/* Lottie Animation */}
        <View style={styles.lottieSection}>
          <Animated.View
            style={[
              styles.lottieWrapper,
              {
                opacity: lottieFade,
                transform: [{ scale: lottieScale }],
              },
            ]}
          >
            <View style={[styles.lottieContainer, { width: lottieSize, height: lottieSize }]}>
              <LottieView
                ref={lottieRef}
                source={require('../../../assets/Food.json')}
                style={styles.lottie}
                autoPlay
                loop
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </View>

        {/* Bottom Card */}
        <Animated.View
          style={[
            styles.card,
            {
              borderTopLeftRadius: cardRadius,
              borderTopRightRadius: cardRadius,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handleWrapper} pointerEvents="none">
            <View style={styles.handle} />
          </View>

          <View
            style={[
              styles.cardContent,
              tablet && styles.tabletCardContent,
              { paddingBottom: bottomPad + normalize(24) },
            ]}
          >
            <Text style={styles.title}>All set, No stress</Text>
            <Text style={styles.subtitle}>Login to continue your journey</Text>

            {/* Phone Step */}
            {step === 'phone' ? (
              <View>
                <PhoneInput
                  inputRef={phoneInputRef}
                  value={mobile}
                  onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, '').slice(0, MAX_PHONE_LENGTH))}
                  onSubmitEditing={handlePhoneSubmitEditing}
                  editable={!loading}
                />
                <SendButton
                  onPress={handleSendOTP}
                  loading={loading}
                  disabled={!isPhoneValid || loading}
                  tablet={tablet}
                  label="Send OTP"
                />
              </View>
            ) : (
              /* OTP Step */
              <View>
                <View style={styles.mobileRow}>
                  <Text style={styles.fieldLabel}>Mobile Number</Text>
                  <View style={styles.mobileValueRow}>
                    <Ionicons name="call-outline" size={normalize(18)} color={Colors.primary} />
                    <Text style={styles.mobileText}>{fullPhoneNumber}</Text>
                    <TouchableOpacity
                      onPress={handleBackToPhone}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={loading}
                    >
                      <Text style={[styles.editText, loading && { opacity: 0.4 }]}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.otpSection}>
                  <Text style={styles.fieldLabel}>One Time Passcode</Text>
                  <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <OtpInput
                      ref={otpRef}
                      numberOfDigits={OTP_LENGTH}
                      autoFocus={false}
                      type="numeric"
                      secureTextEntry={false}
                      blurOnFilled={false}
                      disabled={loading}
                      focusColor={Colors.primary}
                      onTextChange={(text) => {
                        setError('');
                        otpValueRef.current = text;
                      }}
                      onFilled={(code) => handleVerifyOTP(code)}
                      textInputProps={{
                        autoComplete: 'sms-otp',
                        textContentType: 'oneTimeCode',
                      }}
                      theme={otpTheme}
                    />
                  </Animated.View>
                </View>

                <ResendTimer onResend={handleResendOTP} loading={loading} />

                {loading && (
                  <View style={styles.verifyRow}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.verifyText}>Verifying...</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

// Styles remain the same as your original
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: normalize(23),
  },
  lottieSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    backgroundColor: Colors.white,
  },
  lottieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieContainer: {
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  lottie: {
    width: '100%',
    height: '70%',
    transform: [{ scale: 1.9 }],
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(28, 28, 28, 0.7)',
    borderBottomWidth: 0,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingTop: normalize(12),
  },
  handle: {
    width: normalize(40),
    height: normalize(4),
    borderRadius: normalize(99),
    backgroundColor: 'rgba(28, 28, 28, 0.2)',
  },
  cardContent: {
    paddingHorizontal: normalize(24),
    paddingTop: 0,
    paddingBottom: normalize(32),
  },
  tabletCardContent: {
    paddingHorizontal: normalize(48),
  },
  title: {
    fontSize: normalize(26),
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: normalize(4),
    paddingTop: normalize(10),
  },
  subtitle: {
    fontSize: normalize(14),
    color: Colors.textSecondary,
    marginBottom: normalize(24),
  },
  fieldLabel: {
    fontSize: normalize(13),
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: normalize(6),
    letterSpacing: 0.3,
  },
  mobileRow: {
    marginBottom: normalize(24),
  },
  mobileValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingBottom: normalize(10),
    gap: normalize(10),
  },
  mobileText: {
    flex: 1,
    fontSize: normalize(16),
    color: Colors.textPrimary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  editText: {
    fontSize: normalize(13),
    color: Colors.primary,
    fontWeight: '600',
  },
  otpSection: {
    marginBottom: normalize(20),
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(10),
    gap: normalize(8),
    marginBottom: normalize(16),
  },
  verifyText: {
    fontSize: normalize(13),
    color: Colors.primary,
    fontWeight: '500',
  },
});