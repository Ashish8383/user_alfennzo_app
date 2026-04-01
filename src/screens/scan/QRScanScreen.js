import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, Easing, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { normalize, scale } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW, height: SH } = Dimensions.get('window');

const CORNER_SIZE        = scale(40);
const CORNER_LINE_WIDTH  = scale(4);
const CORNER_LINE_LENGTH = scale(20);
const SEARCH_BAR_HEIGHT  = scale(48);
const ACTIVE_AREA_HEIGHT = SH - SEARCH_BAR_HEIGHT;
const ACTIVE_AREA_WIDTH  = SW;
const ZOOM_DURATION      = 1500;
const PAUSE_DURATION     = 500;
const G                  = Colors.primary;

export default function QRScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,     setScanned]       = useState(false);
  const [torchOn,     setTorchOn]       = useState(false);
  const [showSuccess, setShowSuccess]   = useState(false);

  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const isFocused  = useIsFocused();

  const zoomAnim         = useRef(new Animated.Value(1)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  // Use a ref to track if animation should keep looping
  const isAnimatingRef   = useRef(false);

  // ── Camera permission ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!permission?.granted && permission) requestPermission();
  }, [permission]);

  // ── Zoom animation — simple recursive loop, no useCallback ────────────────
  useEffect(() => {
    if (!isFocused) return;

    isAnimatingRef.current = true;

    const loop = () => {
      if (!isAnimatingRef.current) return;

      Animated.sequence([
        Animated.timing(zoomAnim, {
          toValue: 1.08,
          duration: ZOOM_DURATION,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(PAUSE_DURATION),
        Animated.timing(zoomAnim, {
          toValue: 1,
          duration: ZOOM_DURATION,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(PAUSE_DURATION),
      ]).start(({ finished }) => {
        if (finished && isAnimatingRef.current) loop();
      });
    };

    loop();

    return () => {
      isAnimatingRef.current = false;
      zoomAnim.stopAnimation();
      zoomAnim.setValue(1);
    };
  }, [isFocused]); // re-runs only when focus changes

  // ── Reset state when screen loses focus ───────────────────────────────────
  useEffect(() => {
    if (!isFocused) {
      setTorchOn(false);
      setScanned(false);
      setShowSuccess(false);
      successScaleAnim.setValue(0);
    }
  }, [isFocused]);

  // ── QR scan handler ────────────────────────────────────────────────────────
  const handleScan = ({ data }) => {
    if (scanned) return; // simple guard — no isFocused check here
    setScanned(true);
    setShowSuccess(true);

    Animated.spring(successScaleAnim, {
      toValue: 1, friction: 5, tension: 40, useNativeDriver: true,
    }).start();

    setTimeout(() => {
      try {
        const url  = new URL(data);
        const qrId = url.searchParams.get('qrId');

        if (qrId) {
          navigation.navigate('OutletMenu', { qrId });
        } else {
          throw new Error('No qrId found');
        }
      } catch {
        Alert.alert('Invalid QR', 'Please scan a valid Alfennzo QR code.', [{
          text: 'Try Again',
          onPress: () => {
            setScanned(false);
            setShowSuccess(false);
            successScaleAnim.setValue(0);
          },
        }]);
      }
    }, 900);
  };

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <View style={s.permScreen}>
        <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
        <Text style={s.permTitle}>Camera access needed</Text>
        <Text style={s.permSub}>Allow camera to scan QR codes</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnTxt}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Camera only mounts when screen is focused */}
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleScan}
          enableTorch={torchOn}
          facing="back"
        />
      )}

      {/* ── Corner scanner frame ── */}
      <View
        style={[s.activeAreaContainer, { height: ACTIVE_AREA_HEIGHT }]}
        pointerEvents="none"
      >
        <Animated.View
          style={[s.scanFrameContainer, { transform: [{ scale: zoomAnim }] }]}
        >
          <View style={[s.corner, s.topLeft]}>
            <View style={[s.cornerLine, s.horizontalLine, s.topLeftHorizontal]} />
            <View style={[s.cornerLine, s.verticalLine,   s.topLeftVertical]}   />
          </View>
          <View style={[s.corner, s.topRight]}>
            <View style={[s.cornerLine, s.horizontalLine, s.topRightHorizontal]} />
            <View style={[s.cornerLine, s.verticalLine,   s.topRightVertical]}   />
          </View>
          <View style={[s.corner, s.bottomLeft]}>
            <View style={[s.cornerLine, s.horizontalLine, s.bottomLeftHorizontal]} />
            <View style={[s.cornerLine, s.verticalLine,   s.bottomLeftVertical]}   />
          </View>
          <View style={[s.corner, s.bottomRight]}>
            <View style={[s.cornerLine, s.horizontalLine, s.bottomRightHorizontal]} />
            <View style={[s.cornerLine, s.verticalLine,   s.bottomRightVertical]}   />
          </View>

          <LinearGradient
            colors={['transparent', G + '10', 'transparent']}
            style={s.innerGlow}
            pointerEvents="none"
          />
        </Animated.View>
      </View>

      {/* ── UI layer ── */}
      <View style={s.uiLayer} pointerEvents="box-none">
        <View style={[s.statusBarBg, { height: insets.top, backgroundColor: 'rgba(0,0,0,0.4)' }]} />

        <View style={[s.header, { marginTop: insets.top }]}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={normalize(24)} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Scan QR code</Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={s.bottomRow}>
          <TouchableOpacity
            style={[s.roundBtn, torchOn && s.roundBtnActive]}
            onPress={() => setTorchOn(v => !v)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={torchOn ? 'flashlight' : 'flashlight-outline'}
              size={normalize(22)}
              color={torchOn ? Colors.primary : '#fff'}
            />
          </TouchableOpacity>
        </View>

        <View style={[s.searchWrap, { paddingBottom: insets.bottom + scale(10) }]}>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={normalize(18)} color="#888" />
            <Text style={s.searchTxt}>Enter outlet name or number...</Text>
            <View style={s.searchAvatar}>
              <Text style={s.searchAvatarTxt}>AS</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Success overlay ── */}
      {showSuccess && (
        <Animated.View style={[s.successOverlay, { transform: [{ scale: successScaleAnim }] }]}>
          <View style={s.successCircle}>
            <Ionicons name="checkmark" size={normalize(52)} color="#fff" />
          </View>
          <Text style={s.successTxt}>QR Scanned!</Text>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  permScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: scale(28), backgroundColor: '#111',
  },
  permTitle: {
    fontSize: normalize(18), fontWeight: '700', color: '#fff',
    marginTop: scale(16), marginBottom: scale(8), textAlign: 'center',
  },
  permSub: {
    fontSize: normalize(14), color: '#999', textAlign: 'center',
    marginBottom: scale(28), lineHeight: normalize(21),
  },
  permBtn: {
    backgroundColor: Colors.primary, borderRadius: scale(28),
    paddingHorizontal: scale(28), paddingVertical: scale(14),
  },
  permBtnTxt: { fontSize: normalize(15), fontWeight: '700', color: '#fff' },

  activeAreaContainer: {
    position: 'absolute', top: 0, left: 0,
    width: ACTIVE_AREA_WIDTH, overflow: 'visible',
    zIndex: 10, alignItems: 'center', justifyContent: 'center',
  },
  scanFrameContainer: {
    width: scale(280), height: scale(280), position: 'relative',
  },
  corner:         { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cornerLine:     { position: 'absolute', backgroundColor: Colors.primary },
  horizontalLine: { width: CORNER_LINE_LENGTH, height: CORNER_LINE_WIDTH },
  verticalLine:   { width: CORNER_LINE_WIDTH,  height: CORNER_LINE_LENGTH },

  topLeft:               { top: 0,    left: 0  },
  topLeftHorizontal:     { top: 0,    left: 0  },
  topLeftVertical:       { top: 0,    left: 0  },
  topRight:              { top: 0,    right: 0 },
  topRightHorizontal:    { top: 0,    right: 0 },
  topRightVertical:      { top: 0,    right: 0 },
  bottomLeft:            { bottom: 0, left: 0  },
  bottomLeftHorizontal:  { bottom: 0, left: 0  },
  bottomLeftVertical:    { bottom: 0, left: 0  },
  bottomRight:           { bottom: 0, right: 0 },
  bottomRightHorizontal: { bottom: 0, right: 0 },
  bottomRightVertical:   { bottom: 0, right: 0 },

  innerGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: scale(20),
  },

  uiLayer:     { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  statusBarBg: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 21 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(8), paddingVertical: scale(12),
    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 22,
  },
  headerBtn: {
    width: scale(44), height: scale(44),
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: normalize(17), fontWeight: '700', color: '#fff', letterSpacing: 0.1,
  },

  bottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: scale(20), gap: scale(12), marginBottom: scale(16),
  },
  roundBtn: {
    width: scale(60), height: scale(60), borderRadius: scale(34),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  roundBtnActive: { backgroundColor: 'rgba(255,255,255,0.92)' },

  searchWrap: {
    paddingHorizontal: scale(12), paddingTop: scale(15),
    backgroundColor: '#000',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: scale(28),
    paddingHorizontal: scale(16), paddingVertical: scale(13), gap: scale(10),
  },
  searchTxt:       { flex: 1, fontSize: normalize(14), color: '#777' },
  searchAvatar: {
    width: scale(32), height: scale(32), borderRadius: scale(16),
    backgroundColor: '#C9B8F0', alignItems: 'center', justifyContent: 'center',
  },
  searchAvatarTxt: { fontSize: normalize(11), fontWeight: '800', color: '#5A2D9C' },

  successOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center', justifyContent: 'center',
  },
  successCircle: {
    width: scale(90), height: scale(90), borderRadius: scale(45),
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  successTxt: {
    fontSize: normalize(18), fontWeight: '700', color: '#fff', marginTop: scale(20),
  },
});