import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Animated, Easing, Dimensions, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { normalize, wp, scale } from '../../utils/responsive';

const { width: SW } = Dimensions.get('window');

const FAB_H = scale(56);
const FAB_PILL_W = scale(160);
const FAB_ICON_W = scale(56);

// ─── Sub-components ───────────────────────────────────────────────────────────

const LoveCard = memo(() => (
  <View style={s.loveCard}>
    <View style={s.loveCircleTopRight} />
    <View style={s.loveCircleBottomLeft} />
    <Text style={s.loveHeading}>
      {'You '}
      <Text style={s.loveHeart}>❤️</Text>
      {'  Alfennzo'}
    </Text>
    <Text style={s.loveSub}>
      Your friends are going to{'\n'}love us too!
    </Text>
    <TouchableOpacity style={s.loveBtn} activeOpacity={0.85}>
      <Text style={s.loveBtnTxt}>Share Now</Text>
      <Ionicons name="arrow-forward" size={normalize(14)} color={Colors.primary} />
    </TouchableOpacity>
  </View>
));

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const fabWidth = useRef(new Animated.Value(FAB_PILL_W)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const isCollapsed = useRef(false);
  const timer = useRef(null);

  const collapseFAB = useCallback(() => {
    if (isCollapsed.current) return;
    isCollapsed.current = true;
    fabWidth.stopAnimation();
    textOpacity.stopAnimation();
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 0, duration: 80, useNativeDriver: true,
      }),
      Animated.timing(fabWidth, {
        toValue: FAB_ICON_W, duration: 220, delay: 60,
        easing: Easing.in(Easing.exp), useNativeDriver: false,
      }),
    ]).start();
  }, [fabWidth, textOpacity]);

  const expandFAB = useCallback(() => {
    isCollapsed.current = false;
    fabWidth.stopAnimation();
    textOpacity.stopAnimation();
    Animated.parallel([
      Animated.timing(fabWidth, {
        toValue: FAB_PILL_W, duration: 240,
        easing: Easing.out(Easing.exp), useNativeDriver: false,
      }),
      Animated.timing(textOpacity, {
        toValue: 1, duration: 160, delay: 80,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();
  }, [fabWidth, textOpacity]);

  const handleScroll = useCallback(() => {
    collapseFAB();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(expandFAB, 700);
  }, [collapseFAB, expandFAB]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const fabBottom = insets.bottom + scale(14);
  const scrollPaddingBottom = insets.bottom + FAB_H + scale(52);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <SafeAreaView style={s.safe} edges={['top']}>

        {/* ── Header: Logo left, Profile right ── */}
        <View style={s.header}>
          <Image
            source={require('../../../assets/applogo.webp')}
            style={s.logo}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={s.profileBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={s.profileCircle}>
              <Ionicons name="person" size={normalize(20)} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={150}
          onScroll={handleScroll}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={[s.scroll, { paddingBottom: scrollPaddingBottom }]}
        >
          <LoveCard />
        </ScrollView>

      </SafeAreaView>

      {/* ── FAB ── */}
      <View style={[s.fabWrapper, { bottom: fabBottom }]} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => navigation.navigate('QRScan')}
          activeOpacity={0.88}
          style={s.fabTouchTarget}
        >
          <Animated.View style={[s.fab, { width: fabWidth }]}>
            <View style={s.fabIconSlot}>
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={normalize(23)}
                color={Colors.white}
              />
            </View>
            <Animated.Text
              style={[s.fabText, { opacity: textOpacity }]}
              numberOfLines={1}
            >
              Scan QR
            </Animated.Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1, backgroundColor: Colors.background },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: scale(10),
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    height: scale(36),
    width: scale(130),
  },
  profileBtn: {
    padding: scale(2),
  },
  profileCircle: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },

  scroll: { paddingHorizontal: wp(4), paddingTop: scale(16) },

  // ── Love Card ────────────────────────────────────────────────────────────
  loveCard: {
    backgroundColor: Colors.white,
    borderRadius: scale(20),
    paddingVertical: scale(32),
    paddingHorizontal: scale(24),
    alignItems: 'center',
    marginBottom: scale(8),
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05, shadowRadius: scale(10), elevation: 2,
  },
  loveCircleTopRight: {
    position: 'absolute', top: scale(-28), right: scale(-28),
    width: scale(100), height: scale(100), borderRadius: scale(50),
    backgroundColor: Colors.primaryBg,
  },
  loveCircleBottomLeft: {
    position: 'absolute', bottom: scale(-24), left: scale(-24),
    width: scale(80), height: scale(80), borderRadius: scale(40),
    backgroundColor: Colors.primaryBg,
  },
  loveHeading: {
    fontSize: normalize(22), fontWeight: '900', color: Colors.textPrimary,
    letterSpacing: -0.3, marginBottom: scale(8), textAlign: 'center',
  },
  loveHeart: { fontSize: normalize(22) },
  loveSub: {
    fontSize: normalize(14), color: Colors.textSecondary,
    textAlign: 'center', lineHeight: normalize(21), marginBottom: scale(22),
  },
  loveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: scale(30), paddingHorizontal: scale(20), paddingVertical: scale(10),
  },
  loveBtnTxt: { fontSize: normalize(14), fontWeight: '700', color: Colors.primary },

  // ── FAB ──────────────────────────────────────────────────────────────────
  fabWrapper: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    paddingBottom: normalize(20)
  },
  fabTouchTarget: {
    height: FAB_H,
    minWidth: FAB_ICON_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    height: FAB_H,
    borderRadius: FAB_H / 2,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.38, shadowRadius: scale(14), elevation: 12,
  },
  fabIconSlot: {
    width: FAB_ICON_W, height: FAB_H,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fabText: {
    fontSize: normalize(15), fontWeight: '800',
    color: Colors.white, letterSpacing: 0.3,
    marginRight: scale(20), flexShrink: 0,
  },
});