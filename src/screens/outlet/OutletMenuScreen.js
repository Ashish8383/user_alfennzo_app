/**
 * OutletMenuScreen.jsx — Fully revamped per design reference
 * Fixes: ADD on image overlay, exact modal sheet, animated tick, address card,
 * full-width grid ADD btn with orange border, no desc on cards, sticky header
 * Updated: Modal with proper safe area handling, improved gesture navigation
 */

import React, {
  useEffect, useState, useCallback, useMemo, useRef,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
  Animated, StatusBar, Dimensions, Modal,
  ScrollView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { normalize, scale } from '../../utils/responsive';
import {
  getOutletData,
  selectRestaurant,
  selectMenuCategories,
  selectLiveCombos,
} from '../../api/menu.api';
import { FlashList } from '@shopify/flash-list';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Design Tokens (UPDATED) ────────────────────────────────────────────────
const PRIMARY = Colors.primary;
const PRIMARY_LIGHT = Colors.primaryLight;
const PRIMARY_DARK = Colors.primaryDark;
const PRIMARY_BG = Colors.primaryBg;

const BG = Colors.background;
const CARD_BG = Colors.surface;
const CARD_ALT = Colors.surfaceAlt;

const TEXT_DARK = Colors.textPrimary;
const TEXT_MED = Colors.textSecondary;
const TEXT_LIGHT = Colors.textMuted;

const BORDER = Colors.border;
const DIVIDER = Colors.divider;

const SUCCESS = Colors.success;
const SUCCESS_LIGHT = Colors.successLight;

const ERROR = Colors.error;
const WARNING = Colors.warning;

const VEG_GREEN = '#2E7D32';
const NONVEG_RED = '#C62828';

// ─── Layout ─────────────────────────────────────────────────────────────────
const H_PAD = scale(16);
const GRID_GAP = scale(10);
const GRID_W = (SCREEN_WIDTH - H_PAD * 2 - GRID_GAP) / 2;
const COMBO_W = (SCREEN_WIDTH - scale(16) * 2 - scale(10)) / 2;
const VERT_IMG_SIZE = scale(108);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (p) => { const n = parseFloat(p); return isNaN(n) ? '0' : (n % 1 === 0 ? String(n) : n.toFixed(2)); };

const getDiscountedPrice = (item) => {
  const orig = item.price?.full ?? 0;
  if (item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0)
    return Math.round(orig * (1 - item.discountinPercentageByRestraurant / 100));
  return orig;
};

// ─── Veg/Non-veg Symbol ──────────────────────────────────────────────────────
const VegSymbol = React.memo(({ isVeg, size = 14 }) => {
  const color = isVeg ? VEG_GREEN : NONVEG_RED;
  return (
    <View style={{ width: size, height: size, borderRadius: 2, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <View style={{ width: size * 0.44, height: size * 0.44, borderRadius: size * 0.22, backgroundColor: color }} />
    </View>
  );
});

// ─── Animated Add Button (with tick on success) ──────────────────────────────
const AddButton = React.memo(({ qty, onAdd, onRemove, variant = 'overlay', onSuccess }) => {
  const [ticked, setTicked] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleAdd = useCallback(() => {
    if (variant === 'modal') {
      setTicked(true);
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.08, useNativeDriver: true, speed: 30 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
      ]).start();
      onAdd();
      setTimeout(() => { setTicked(false); onSuccess?.(); }, 900);
    } else {
      onAdd();
    }
  }, [variant, onAdd, onSuccess, scaleAnim]);
  // Add these to the AddButton component
  if (variant === 'comboCard' || variant === 'gridCard') {
    if (qty > 0) {
      return (
        <View style={cardBtnStyles.qtyRow}>
          <TouchableOpacity onPress={onRemove} style={cardBtnStyles.qtyBtn} hitSlop={6}>
            <Text style={cardBtnStyles.qtyBtnTxt}>−</Text>
          </TouchableOpacity>
          <Text style={cardBtnStyles.qtyNum}>{qty}</Text>
          <TouchableOpacity onPress={onAdd} style={cardBtnStyles.qtyBtn} hitSlop={6}>
            <Text style={cardBtnStyles.qtyBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={handleAdd} style={cardBtnStyles.addBtn} activeOpacity={0.85}>
        <Text style={cardBtnStyles.addTxt}>ADD</Text>
      </TouchableOpacity>
    );
  }
  if (variant === 'modal') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity onPress={handleAdd} activeOpacity={0.85}
          style={[modalBtnStyles.btn, ticked && modalBtnStyles.btnTicked]}>
          {ticked
            ? <><Ionicons name="checkmark-circle" size={normalize(20)} color="#fff" /><Text style={modalBtnStyles.txt}> Added!</Text></>
            : <Text style={modalBtnStyles.txt}>+ Add to Cart</Text>}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'overlay') {
    if (qty > 0) {
      return (
        <View style={overlayStyles.qtyRow}>
          <TouchableOpacity onPress={onRemove} style={overlayStyles.qtyBtn} hitSlop={6}><Text style={overlayStyles.qtyBtnTxt}>−</Text></TouchableOpacity>
          <Text style={overlayStyles.qtyNum}>{qty}</Text>
          <TouchableOpacity onPress={onAdd} style={overlayStyles.qtyBtn} hitSlop={6}><Text style={overlayStyles.qtyBtnTxt}>+</Text></TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={handleAdd} style={overlayStyles.addBtn} activeOpacity={0.85}>
        <Text style={overlayStyles.addTxt}>ADD</Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'gridFull') {
    if (qty > 0) {
      return (
        <View style={gridBtnStyles.qtyRow}>
          <TouchableOpacity onPress={onRemove} style={gridBtnStyles.qtyBtn} hitSlop={6}><Text style={gridBtnStyles.qtyBtnTxt}>−</Text></TouchableOpacity>
          <Text style={gridBtnStyles.qtyNum}>{qty}</Text>
          <TouchableOpacity onPress={onAdd} style={gridBtnStyles.qtyBtn} hitSlop={6}><Text style={gridBtnStyles.qtyBtnTxt}>+</Text></TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={handleAdd} style={gridBtnStyles.addBtn} activeOpacity={0.85}>
        <Text style={gridBtnStyles.addTxt}>ADD</Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    if (qty > 0) {
      return (
        <View style={compactStyles.qtyRow}>
          <TouchableOpacity onPress={onRemove} style={compactStyles.qtyBtn} hitSlop={6}><Text style={compactStyles.qtyBtnTxt}>−</Text></TouchableOpacity>
          <Text style={compactStyles.qtyNum}>{qty}</Text>
          <TouchableOpacity onPress={onAdd} style={compactStyles.qtyBtn} hitSlop={6}><Text style={compactStyles.qtyBtnTxt}>+</Text></TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={handleAdd} style={compactStyles.addBtn} activeOpacity={0.85}>
        <Text style={compactStyles.addTxt}>ADD</Text>
      </TouchableOpacity>
    );
  }

  return null;
});
const ORANGE_DARK = '#ca4700';

const cardBtnStyles = StyleSheet.create({
  addBtn: {
    backgroundColor: PRIMARY,
    borderRadius: scale(10),
    height: scale(36),
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: ORANGE_DARK,
  },
  addTxt: {
    color: '#fff',
    fontSize: normalize(12),
    fontWeight: '800',
    letterSpacing: 1,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: scale(10),
    overflow: 'hidden',
    width: '90%',
    borderWidth: 1.5,
    borderColor: ORANGE_DARK,
  },
  qtyBtn: {
    flex: 1,
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: {
    color: '#fff',
    fontSize: normalize(16),
    fontWeight: '800',
  },
  qtyNum: {
    flex: 1,
    color: '#fff',
    fontSize: normalize(13),
    fontWeight: '800',
    textAlign: 'center',
  },
});
const modalBtnStyles = StyleSheet.create({
  btn: {
    backgroundColor: PRIMARY,
    borderRadius: scale(14),
    paddingVertical: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnTicked: {
    backgroundColor: SUCCESS,
  },
  txt: {
    color: Colors.textOnPrimary,
    fontSize: normalize(16),
    fontWeight: '800',
  },
});

const overlayStyles = StyleSheet.create({
  addBtn: {
    backgroundColor: PRIMARY,
    borderRadius: scale(7),
    paddingHorizontal: scale(18),
    paddingVertical: scale(7),
    borderWidth: 1.5,
    borderColor: PRIMARY_DARK,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addTxt: {
    color: Colors.textOnPrimary,
    fontSize: normalize(12),
    fontWeight: '800',
    letterSpacing: 1,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: scale(7),
    overflow: 'hidden',
    minWidth: scale(80),
    borderWidth: 1.5,
    borderColor: PRIMARY_DARK,
  },
  qtyBtn: {
    width: scale(30),
    height: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: {
    color: Colors.textOnPrimary,
    fontSize: normalize(16),
    fontWeight: '800',
  },
  qtyNum: {
    flex: 1,
    color: Colors.textOnPrimary,
    fontSize: normalize(13),
    fontWeight: '800',
    textAlign: 'center',
  },
});

const gridBtnStyles = StyleSheet.create({
  addBtn: {
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: scale(8),
    paddingVertical: scale(7),
    alignItems: 'center',
    width: '90%',
  },
  addTxt: {
    color: PRIMARY,
    fontSize: normalize(12),
    fontWeight: '800',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: scale(8),
    overflow: 'hidden',
    width: '90%',
    borderWidth: 2,
    borderColor: PRIMARY_DARK,
  },
  qtyBtn: {
    flex: 1,
    height: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: {
    color: Colors.textOnPrimary,
    fontSize: normalize(16),
    fontWeight: '800',
  },
  qtyNum: {
    flex: 1,
    color: Colors.textOnPrimary,
    fontSize: normalize(13),
    fontWeight: '800',
    textAlign: 'center',
  },
});

const compactStyles = StyleSheet.create({
  addBtn: {
    backgroundColor: PRIMARY,
    borderRadius: scale(8),
    height: scale(34),
    width: '90%', // Changed from 100% to 90%
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: ORANGE_DARK,
  },
  addTxt: {
    color: '#fff',
    fontSize: normalize(12),
    fontWeight: '800',
    letterSpacing: 1,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: scale(8),
    overflow: 'hidden',
    width: '90%', // Changed from 100% to 90%
    borderWidth: 1.5,
    borderColor: ORANGE_DARK,
  },
  qtyBtn: {
    flex: 1,
    height: scale(34),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: {
    color: '#fff',
    fontSize: normalize(16),
    fontWeight: '800',
  },
  qtyNum: {
    flex: 1,
    color: '#fff',
    fontSize: normalize(13),
    fontWeight: '800',
    textAlign: 'center',
  },
});
// ─── Category Card ───────────────────────────────────────────────────────────
const CategoryCard = React.memo(({ item, active, onPress }) => {
  const isActive = active === item._id;
  return (
    <TouchableOpacity onPress={() => onPress(item._id)} activeOpacity={0.75} style={catStyles.wrap}>
      <View style={[catStyles.imgWrap, isActive && catStyles.imgWrapActive]}>
        {item.categoryImage
          ? <Image source={{ uri: item.categoryImage }} style={catStyles.img} resizeMode="cover" />
          : <Ionicons name="restaurant-outline" size={normalize(20)} color={isActive ? '#fff' : PRIMARY} />}
      </View>
      <Text style={[catStyles.label, isActive && catStyles.labelActive]} numberOfLines={1}>{item.categoryName}</Text>
      {isActive && <View style={catStyles.dot} />}
    </TouchableOpacity>
  );
});

const catStyles = StyleSheet.create({
  wrap: { alignItems: 'center', width: scale(68), paddingVertical: scale(4) },
  imgWrap: {
    width: scale(58), height: scale(58), borderRadius: scale(29),
    backgroundColor: SUCCESS_LIGHT, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent', overflow: 'hidden', marginBottom: scale(5),
  },
  imgWrapActive: { borderColor: PRIMARY, backgroundColor: PRIMARY },
  img: { width: '100%', height: '100%' },
  label: { fontSize: normalize(10), fontWeight: '500', color: TEXT_MED, textAlign: 'center' },
  labelActive: { color: PRIMARY, fontWeight: '700' },
  dot: { marginTop: 3, width: scale(5), height: scale(5), borderRadius: scale(2.5), backgroundColor: PRIMARY },
});

// ─── Grid Card (2-column, ADD button below price) ─────────────────────────────
// ─── Grid Card (orange price, fixed spacing) ─────────────────────────────────
const GRID_IMG_H = scale(120);

const GridCard = React.memo(({ item, onAdd, onRemove, qty, onPress }) => {
  const [imgErr, setImgErr] = useState(false);
  const orig = item.price?.full ?? 0;
  const disc = getDiscountedPrice(item);
  const hasDsc = orig > disc;

  return (
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.88} style={gridStyles.card}>
      <View style={gridStyles.imgBox}>
        {item.image && !imgErr
          ? <Image source={{ uri: item.image }} style={gridStyles.img} resizeMode="cover" onError={() => setImgErr(true)} />
          : <View style={[gridStyles.img, gridStyles.imgPh]}><Ionicons name="fast-food-outline" size={normalize(30)} color="#ccc" /></View>}
        {hasDsc && (
          <View style={gridStyles.discBadge}>
            <Text style={gridStyles.discTxt}>{item.discountinPercentageByRestraurant}% OFF</Text>
          </View>
        )}
        <View style={gridStyles.vegBadge}>
          <VegSymbol isVeg={item.isVeg} />
        </View>
      </View>
      <View style={gridStyles.info}>
        <Text style={gridStyles.name} numberOfLines={2}>{item.itemName}</Text>
        <View style={gridStyles.priceRow}>
          <Text style={gridStyles.price}>₹{fmt(disc)}</Text>
          {hasDsc && <Text style={gridStyles.orig}>₹{fmt(orig)}</Text>}
        </View>

        <View style={gridStyles.addContainer}>
          <AddButton
            qty={qty}
            onAdd={() => onAdd(item)}
            onRemove={() => onRemove(item)}
            variant="gridCard"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const gridStyles = StyleSheet.create({
  card: {
    width: GRID_W,
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  imgBox: {
    width: GRID_W,
    height: GRID_IMG_H,
    position: 'relative',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgPh: {
    backgroundColor: SUCCESS_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: PRIMARY,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discTxt: {
    fontSize: normalize(9),
    fontWeight: '800',
    color: '#fff',
  },
  vegBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  info: {
    padding: scale(10),
    paddingTop: scale(10),
    paddingBottom: scale(8),
  },
  name: {
    fontSize: normalize(12),
    fontWeight: '700',
    color: TEXT_DARK,
    lineHeight: normalize(17),
    marginBottom: 6,
    // REMOVE the minHeight constraint
    // minHeight: normalize(34),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginBottom: 10,
  },
  price: {
    fontSize: normalize(15),
    fontWeight: '800',
    color: PRIMARY,
  },
  orig: {
    fontSize: normalize(10),
    color: TEXT_LIGHT,
    textDecorationLine: 'line-through',
  },
  addContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
});

// ─── Vertical Card (orange price, fixed spacing) ─────────────────────────────
// ─── Vertical Card (ADD button below image - matching search screen) ─────────
const VertCard = React.memo(({ item, onAdd, onRemove, qty, onPress }) => {
  const [imgErr, setImgErr] = useState(false);
  const orig = item.price?.full ?? 0;
  const disc = getDiscountedPrice(item);
  const hasDsc = orig > disc;
  const saved = orig - disc;

  return (
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.9} style={vertStyles.card}>
      {/* LEFT SECTION - Content */}
      <View style={vertStyles.left}>
        <View style={vertStyles.topRow}>
          <VegSymbol isVeg={item.isVeg} />
          {hasDsc && (
            <View style={vertStyles.saveTag}>
              <Text style={vertStyles.saveTxt}>Save ₹{fmt(saved)}</Text>
            </View>
          )}
        </View>

        <Text style={vertStyles.name} numberOfLines={2}>{item.itemName}</Text>

        <View style={vertStyles.priceRow}>
          <Text style={vertStyles.price}>₹{fmt(disc)}</Text>
          {hasDsc && <Text style={vertStyles.orig}>₹{fmt(orig)}</Text>}
        </View>
      </View>

      {/* RIGHT SECTION - Image + Button below */}
      <View style={vertStyles.right}>
        {/* Image */}
        <View style={vertStyles.imgWrap}>
          <Image
            source={{ uri: imgErr ? 'https://via.placeholder.com/110x110?text=Food' : (item.image || '') }}
            style={vertStyles.img}
            resizeMode="cover"
            onError={() => setImgErr(true)}
          />
          {hasDsc && (
            <View style={vertStyles.imgBadge}>
              <Text style={vertStyles.imgBadgeTxt}>{item.discountinPercentageByRestraurant}%</Text>
            </View>
          )}
        </View>

        {/* ADD Button below image - matching search screen */}
        <View style={vertStyles.addWrapper}>
          <AddButton
            qty={qty}
            onAdd={() => onAdd(item)}
            onRemove={() => onRemove(item)}
            variant="compact"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const vertStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    padding: scale(14),
    paddingBottom: scale(26),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  left: {
    flex: 1,
    marginRight: scale(12),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  saveTag: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveTxt: {
    fontSize: normalize(9),
    fontWeight: '700',
    color: SUCCESS,
  },
  name: {
    fontSize: normalize(14),
    fontWeight: '700',
    color: TEXT_DARK,
    lineHeight: normalize(19),
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 0,
  },
  price: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: PRIMARY,
  },
  orig: {
    fontSize: normalize(11),
    color: TEXT_LIGHT,
    textDecorationLine: 'line-through',
  },
  right: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  imgWrap: {
    width: VERT_IMG_SIZE,
    height: VERT_IMG_SIZE,
    borderRadius: scale(12),
    overflow: 'hidden',
    backgroundColor: SUCCESS_LIGHT,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: PRIMARY,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  imgBadgeTxt: {
    fontSize: normalize(9),
    fontWeight: '800',
    color: '#fff',
  },
  addWrapper: {
    position: 'absolute',
    bottom: -scale(16),
    width: VERT_IMG_SIZE,
    alignItems: 'center',
  },
});

const ComboCard = React.memo(({ item, onAdd, onRemove, qty, onPress }) => {
  const [imgErr, setImgErr] = useState(false);
  const hasDsc = item.discountinPercentageByRestraurant > 0;
  const origPrice = hasDsc
    ? Math.round(item.comboprice / (1 - item.discountinPercentageByRestraurant / 100))
    : item.comboprice;
  const saved = origPrice - item.comboprice;

  return (
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.88} style={comboStyles.card}>
      <View style={comboStyles.imgBox}>
        {item.image && !imgErr
          ? <Image source={{ uri: item.image }} style={comboStyles.img} resizeMode="cover" onError={() => setImgErr(true)} />
          : <View style={[comboStyles.img, comboStyles.imgPh]}><Ionicons name="fast-food-outline" size={normalize(28)} color="#ccc" /></View>}
        {hasDsc && (
          <View style={comboStyles.discBadge}>
            <Text style={comboStyles.discTxt}>{item.discountinPercentageByRestraurant}% OFF</Text>
          </View>
        )}
      </View>
      <View style={comboStyles.info}>
        <Text style={comboStyles.name} numberOfLines={1}>{item.combofoodName}</Text>

        {/* REMOVED includes items text */}

        <View style={comboStyles.priceRow}>
          <Text style={comboStyles.price}>₹{fmt(item.comboprice)}</Text>
          {hasDsc && <Text style={comboStyles.orig}>₹{fmt(origPrice)}</Text>}
        </View>
        {hasDsc && saved > 0 && <Text style={comboStyles.save}>Save ₹{fmt(saved)}</Text>}

        <View style={comboStyles.addContainer}>
          <AddButton
            qty={qty}
            onAdd={() => onAdd(item)}
            onRemove={() => onRemove(item)}
            variant="comboCard"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const COMBO_IMG_H = scale(110);

// Update ComboCard styles (around line 530-570)

const comboStyles = StyleSheet.create({
  card: {
    width: COMBO_W,
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    // Remove any margin that might cause gaps
    marginVertical: 0,
  },
  imgBox: {
    width: COMBO_W,
    height: COMBO_IMG_H,
    position: 'relative',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgPh: {
    backgroundColor: SUCCESS_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: PRIMARY,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discTxt: {
    fontSize: normalize(9),
    fontWeight: '800',
    color: '#fff',
  },
  info: {
    padding: scale(10),
    paddingTop: scale(10),
    paddingBottom: scale(10),
  },
  name: {
    fontSize: normalize(13),
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  price: {
    fontSize: normalize(15),
    fontWeight: '800',
    color: PRIMARY,
  },
  orig: {
    fontSize: normalize(10),
    color: TEXT_LIGHT,
    textDecorationLine: 'line-through',
  },
  save: {
    fontSize: normalize(10),
    fontWeight: '600',
    color: PRIMARY,
    marginTop: 2,
    marginBottom: 6,
  },
  addContainer: {
    marginTop: 6,
    alignItems: 'center',
  },
});
// ─── Detail Modal — with improved safe area handling ──────────────────────────
const DetailModal = ({ visible, item, onClose, onAdd, onRemove, qty }) => {
  const [imgErr, setImgErr] = useState(false);
  const insets = useSafeAreaInsets();

  if (!item) return null;

  const isCombo = !!item.ComboItems;
  const orig = isCombo
    ? (item.discountinPercentageByRestraurant > 0
      ? Math.round(item.comboprice / (1 - item.discountinPercentageByRestraurant / 100))
      : item.comboprice)
    : (item.price?.full ?? 0);
  const display = isCombo ? item.comboprice : getDiscountedPrice(item);
  const saved = orig - display;
  const hasDsc = saved > 0;
  const discPct = isCombo ? item.discountinPercentageByRestraurant : item.discountinPercentageByRestraurant;
  const MOD_IMG = scale(140);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={modStyles.sheet}>
          {/* Handle */}
          <View style={modStyles.handle} />

          {/* Close button */}
          <TouchableOpacity style={modStyles.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={normalize(18)} color={TEXT_MED} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={modStyles.scroll}>

            {/* Small image — top center like reference */}
            <View style={[modStyles.imgBox, { width: MOD_IMG, height: MOD_IMG, borderRadius: scale(16) }]}>
              <Image
                source={{ uri: imgErr ? 'https://via.placeholder.com/200x200?text=Food' : (item.image || '') }}
                style={modStyles.img}
                resizeMode="cover"
                onError={() => setImgErr(true)}
              />
              <View style={modStyles.vegOnImg}><VegSymbol isVeg={item.isVeg !== false} size={16} /></View>
            </View>

            {/* Name */}
            <Text style={modStyles.name}>{item.itemName || item.combofoodName}</Text>

            {/* Price + strikethrough */}
            <View style={modStyles.priceRow}>
              <Text style={modStyles.price}>₹{fmt(display)}</Text>
              {hasDsc && <Text style={modStyles.orig}>₹{fmt(orig)}</Text>}
            </View>

            {/* Save banner — green pill like reference */}
            {hasDsc && (
              <View style={modStyles.saveBanner}>
                <Text style={modStyles.saveTxt}>Save ₹{fmt(saved)} ({discPct}% OFF)</Text>
              </View>
            )}

            <View style={modStyles.divider} />

            {/* Description (only in modal) */}
            {!!item.description && !isCombo && (
              <>
                <Text style={modStyles.sectionTitle}>About</Text>
                <Text style={modStyles.desc}>{item.description}</Text>
                <View style={modStyles.divider} />
              </>
            )}

            {/* Combo includes */}
            {isCombo && item.ComboItems?.length > 0 && (
              <>
                <Text style={modStyles.sectionTitle}>Includes:</Text>
                <View style={modStyles.includesBox}>
                  {item.ComboItems.map((ci, i) => (
                    <View key={i} style={modStyles.includeRow}>
                      <Text style={modStyles.includeName}>{ci.foodName}{ci.quantity > 1 ? ` ×${ci.quantity}` : ''}</Text>
                      <Text style={modStyles.includePrice}>₹{fmt(ci.price)}</Text>
                    </View>
                  ))}
                </View>

                {/* Summary box like reference */}
                <View style={modStyles.summaryBox}>
                  <View style={modStyles.summaryRow}>
                    <Text style={modStyles.summaryLabel}>Total Value</Text>
                    <Text style={modStyles.summaryOrig}>₹{fmt(orig)}</Text>
                  </View>
                  <View style={[modStyles.summaryRow, modStyles.summaryPriceRow]}>
                    <Text style={modStyles.summaryLabel}>Combo Price</Text>
                    <Text style={modStyles.summaryPrice}>₹{fmt(display)}</Text>
                  </View>
                  {hasDsc && (
                    <View style={modStyles.youSaveBox}>
                      <View>
                        <Text style={modStyles.youSaveLabel}>You Save</Text>
                        {discPct > 0 && <Text style={modStyles.youSaveSub}>{discPct}% discount on this combo</Text>}
                      </View>
                      <Text style={modStyles.youSaveAmt}>₹{fmt(saved)}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Customizations */}
            {item.customization?.length > 0 && (
              <>
                <Text style={modStyles.sectionTitle}>Customizations</Text>
                {item.customization.map((c, i) => (
                  <View key={i} style={modStyles.includeRow}>
                    <Text style={modStyles.includeName}>{c.name}</Text>
                    <Text style={modStyles.includePrice}>+₹{fmt(c.price)}</Text>
                  </View>
                ))}
                <View style={modStyles.divider} />
              </>
            )}

            {/* Add extra bottom padding to ensure content doesn't get hidden behind button */}
            <View style={{ height: scale(20) }} />
          </ScrollView>

          {/* Single ADD button at bottom — shows tick then auto-closes */}
          <View style={[modStyles.footer, { paddingBottom: Math.max(insets.bottom, scale(14)) }]}>
            <AddButton
              qty={0}
              onAdd={() => onAdd(item)}
              onRemove={() => onRemove(item)}
              variant="modal"
              onSuccess={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: CARD_BG, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24),
    maxHeight: SCREEN_HEIGHT * 0.92, // Increased from 0.88 to show more content
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: { width: scale(38), height: 4, borderRadius: 2, backgroundColor: '#D5D5D5', alignSelf: 'center', marginTop: scale(12) },
  closeBtn: {
    position: 'absolute', top: scale(14), right: scale(16), zIndex: 10,
    width: scale(32), height: scale(32), borderRadius: scale(16),
    backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: scale(20), paddingTop: scale(10), paddingBottom: scale(8), alignItems: 'center' },
  imgBox: {
    alignSelf: 'center', marginBottom: scale(14), marginTop: scale(6),
    backgroundColor: SUCCESS_LIGHT, position: 'relative', overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
  vegOnImg: { position: 'absolute', top: 8, left: 8 },
  name: { fontSize: normalize(20), fontWeight: '800', color: TEXT_DARK, textAlign: 'center', marginBottom: scale(6) },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: scale(8), justifyContent: 'center', marginBottom: scale(10) },
  price: { fontSize: normalize(24), fontWeight: '900', color: TEXT_DARK },
  orig: { fontSize: normalize(14), color: TEXT_LIGHT, textDecorationLine: 'line-through' },
  saveBanner: {
    alignSelf: 'stretch', backgroundColor: SUCCESS_LIGHT, borderRadius: scale(8),
    paddingVertical: scale(10), paddingHorizontal: scale(16), alignItems: 'center', marginBottom: scale(14),
  },
  saveTxt: { fontSize: normalize(13), fontWeight: '700', color: SUCCESS },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: scale(14), alignSelf: 'stretch', width: '100%' },
  sectionTitle: { fontSize: normalize(15), fontWeight: '700', color: TEXT_DARK, marginBottom: scale(10), alignSelf: 'flex-start' },
  desc: { fontSize: normalize(13), color: TEXT_MED, lineHeight: normalize(20), alignSelf: 'flex-start' },
  includesBox: { borderWidth: 1, borderColor: BORDER, borderRadius: scale(10), overflow: 'hidden', marginBottom: scale(14), alignSelf: 'stretch' },
  includeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: scale(12), paddingHorizontal: scale(14),
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  includeName: { fontSize: normalize(13), color: TEXT_DARK, flex: 1 },
  includePrice: { fontSize: normalize(13), fontWeight: '700', color: TEXT_DARK },
  summaryBox: {
    borderWidth: 1, borderColor: BORDER, borderRadius: scale(10), overflow: 'hidden', marginBottom: scale(14), alignSelf: 'stretch',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: scale(12), paddingHorizontal: scale(14),
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  summaryPriceRow: {},
  summaryLabel: { fontSize: normalize(13), fontWeight: '600', color: TEXT_DARK },
  summaryOrig: { fontSize: normalize(13), color: TEXT_LIGHT, textDecorationLine: 'line-through' },
  summaryPrice: { fontSize: normalize(16), fontWeight: '800', color: PRIMARY },
  youSaveBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: scale(12), paddingHorizontal: scale(14),
    backgroundColor: SUCCESS_LIGHT,
  },
  youSaveLabel: { fontSize: normalize(14), fontWeight: '700', color: SUCCESS },
  youSaveSub: { fontSize: normalize(10), color: SUCCESS, marginTop: 2 },
  youSaveAmt: { fontSize: normalize(18), fontWeight: '900', color: SUCCESS },
  footer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(14),
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: CARD_BG,
  },
});

const Footer = React.memo(() => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  return (
    <View style={footerStyles.container}>
      <View style={footerStyles.divider} />
      <Text style={footerStyles.text}>
        Made with{' '}
        <Animated.Text style={[footerStyles.heart, { transform: [{ scale: pulseAnim }] }]}>
          ❤️
        </Animated.Text>
        {' '}in India
      </Text>
      <Text style={footerStyles.subtext}>
        Thank you for ordering!
      </Text>
    </View>
  );
});

const footerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: scale(20),
    marginTop: scale(50),
  },
  
  text: {
    fontSize: normalize(12),
    color: TEXT_LIGHT,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  heart: {
    fontSize: normalize(14),
    color: '#FF4444',
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: normalize(10),
    color: TEXT_LIGHT,
    marginTop: scale(8),
    opacity: 0.7,
    textAlign: 'center',
  },
});

// ─── Cart Bar ─────────────────────────────────────────────────────────────────
const CartBar = React.memo(({ itemCount, total, onPress, bottomInset }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.9}
    style={[cartStyles.bar, { bottom: bottomInset + scale(10) }]}>
    <View style={cartStyles.left}>
      <View style={cartStyles.iconWrap}>
        <Ionicons name="cart-outline" size={normalize(20)} color="#fff" />
        <View style={cartStyles.badge}><Text style={cartStyles.badgeTxt}>{itemCount}</Text></View>
      </View>
      <View>
        <Text style={cartStyles.count}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
        <Text style={cartStyles.label}>View Cart</Text>
      </View>
    </View>
    <View style={cartStyles.right}>
      <Text style={cartStyles.total}>₹{total}</Text>
      <Ionicons name="chevron-forward" size={normalize(16)} color="rgba(255,255,255,0.8)" />
    </View>
  </TouchableOpacity>
));

const cartStyles = StyleSheet.create({
  bar: {
    position: 'absolute', left: scale(16), right: scale(16),
    backgroundColor: PRIMARY, borderRadius: scale(16),
    paddingVertical: scale(12), paddingHorizontal: scale(18),
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute', top: -6, right: -10,
    backgroundColor: '#fff', borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeTxt: { color: PRIMARY, fontSize: normalize(10), fontWeight: '800' },
  count: { color: 'rgba(255,255,255,0.8)', fontSize: normalize(10), fontWeight: '600' },
  label: { color: '#fff', fontSize: normalize(14), fontWeight: '800' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  total: { color: '#fff', fontSize: normalize(17), fontWeight: '900' },
});

// ─── Address Card — exactly like reference image 3 ────────────────────────────
const AddressCard = React.memo(({ restaurant, qrData }) => {
  console.log('Rendering AddressCard with restaurant:', restaurant, 'and qrData:', qrData);
  const initials = (restaurant?.restaurantName || 'MC').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={addrStyles.card}>
      <View style={addrStyles.avatar}>
        {restaurant?.logo
          ? <Image source={{ uri: restaurant.logo }} style={addrStyles.avatarImg} resizeMode="cover" />
          : <Text style={addrStyles.initials}>{initials}</Text>}
      </View>
      <View style={addrStyles.center}>
        <Text style={addrStyles.name} numberOfLines={1}>{restaurant?.restaurantName || 'M Cafe'}</Text>
        <Text style={addrStyles.addr} numberOfLines={1}>Delhi, India</Text>
      </View>
      <View style={addrStyles.audiPill}>
        <Text style={addrStyles.audiTxt}>
          Audi {qrData?.audiNo || '5'} / {qrData?.Line || 'A'} {qrData?.seatNo || '10'}
        </Text>
      </View>
    </View>
  );
});

const addrStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD_BG, marginHorizontal: scale(16), marginTop: scale(10),
    padding: scale(12), borderRadius: scale(50),
    borderWidth: 1.5, borderColor: PRIMARY,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    gap: scale(10),
  },
  avatar: {
    width: scale(38), height: scale(38), borderRadius: scale(19),
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  initials: { color: '#fff', fontSize: normalize(14), fontWeight: '800' },
  center: { flex: 1 },
  name: { fontSize: normalize(13), fontWeight: '700', color: TEXT_DARK },
  addr: { fontSize: normalize(11), color: TEXT_MED },
  audiPill: {
    backgroundColor: PRIMARY_LIGHT, borderRadius: scale(20), borderWidth: 1.5, borderColor: PRIMARY,
    paddingHorizontal: scale(12), paddingVertical: scale(6),
  },
  audiTxt: { fontSize: normalize(11), fontWeight: '700', color: '#fff' },
});

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHdr = ({ title }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(14), gap: scale(10) }}>
    <Text style={{ fontSize: normalize(17), fontWeight: '800', color: TEXT_DARK }}>{title}</Text>
    <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OutletMenuScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { qrId } = route.params ?? {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [apiData, setApiData] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!qrId) { setError('No QR ID provided'); setLoading(false); return; }
    if (!isRefresh) setLoading(true);
    setError(null);
    try { const res = await getOutletData(qrId); setApiData(res); }
    catch (err) { setError(err?.message || 'Failed to load menu'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [qrId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);
  console.log('API Data:', apiData);
  const restaurant = useMemo(() => selectRestaurant(apiData), [apiData]);
  const qrData = useMemo(() => apiData?.data?.qrData, [apiData]);
  const categories = useMemo(() => selectMenuCategories(apiData), [apiData]);
  const liveCombos = useMemo(() => selectLiveCombos(apiData), [apiData]);
  const categoriesAll = useMemo(() => [{ _id: 'all', categoryName: 'All', categoryImage: null }, ...categories], [categories]);
  const allFoodItems = useMemo(() => categories.flatMap(cat => (cat.foodItems || []).map(item => ({ ...item, categoryName: cat.categoryName }))), [categories]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return allFoodItems;
    const cat = categories.find(c => c._id === activeCategory);
    return (cat?.foodItems || []).map(item => ({ ...item, categoryName: cat.categoryName }));
  }, [activeCategory, categories, allFoodItems]);

  const gridItems = useMemo(() => filteredItems.slice(0, 4), [filteredItems]);
  const vertItems = useMemo(() => filteredItems.slice(4), [filteredItems]);

  const cartTotal = useMemo(() => Object.values(cart).reduce((s, it) => {
    const p = it.ComboItems ? (it.comboprice || 0) : (it.isDiscountedByRestraurant && it.discountinPercentageByRestraurant
      ? Math.round((it.price?.full || 0) * (1 - it.discountinPercentageByRestraurant / 100))
      : (it.price?.full || 0));
    return s + p * it.quantity;
  }, 0), [cart]);

  const cartCount = useMemo(() => Object.values(cart).reduce((s, i) => s + i.quantity, 0), [cart]);

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const k = item._id;
      return { ...prev, [k]: { ...item, quantity: (prev[k]?.quantity || 0) + 1 } };
    });
  }, []);

  const removeFromCart = useCallback((item) => {
    setCart(prev => {
      const k = item._id;
      if (!prev[k]) return prev;
      if (prev[k].quantity === 1) { const { [k]: _, ...rest } = prev; return rest; }
      return { ...prev, [k]: { ...prev[k], quantity: prev[k].quantity - 1 } };
    });
  }, []);

  const getQty = useCallback((id) => cart[id]?.quantity || 0, [cart]);
  const openCard = useCallback((item) => { setSelectedItem(item); setModalVisible(true); }, []);
  const closeCard = useCallback(() => { setModalVisible(false); setSelectedItem(null); }, []);

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? scale(12) : 0);
  const CART_BAR_H = scale(60) + bottomInset + scale(10);
  const catLabel = activeCategory === 'all' ? 'Recommended' : (categories.find(c => c._id === activeCategory)?.categoryName || 'Menu');

  if (loading) return (
    <View style={S.centered}><ActivityIndicator size="large" color={PRIMARY} /><Text style={S.loadingTxt}>Loading menu…</Text></View>
  );
  if (error) return (
    <View style={S.centered}>
      <Ionicons name="cloud-offline-outline" size={normalize(52)} color="#ccc" />
      <Text style={S.errorTxt}>{error}</Text>
      <TouchableOpacity style={S.retryBtn} onPress={() => fetchData()}><Text style={S.retryTxt}>Try Again</Text></TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={S.root} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD_BG} />

      {/* Sticky Header */}
      <View style={[S.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.headerBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={normalize(22)} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <Text style={S.headerTitle} numberOfLines={1}>{restaurant?.restaurantName || 'Menu'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MenuSearchScreen', { allItems: allFoodItems })} style={S.headerBtn} hitSlop={10}>
          <Ionicons name="search-outline" size={normalize(22)} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

     <ScrollView
  style={S.scroll}
  showsVerticalScrollIndicator={false}
  scrollEventThrottle={16}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
>
  {/* Address Card */}
  <AddressCard restaurant={restaurant} qrData={qrData} />

  {/* Categories */}
  <View style={S.catSection}>
    <FlatList
      horizontal data={categoriesAll} keyExtractor={it => it._id}
      renderItem={({ item }) => <CategoryCard item={item} active={activeCategory} onPress={setActiveCategory} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={S.catList}
      removeClippedSubviews maxToRenderPerBatch={8} initialNumToRender={6} bounces
    />
  </View>

  {/* Food Items */}
  <View style={S.section}>
    <SectionHdr title={catLabel} />

    {/* 2-column grid for first 4 */}
    {gridItems.length > 0 && (
      <View style={S.gridWrap}>
        {[0, 2].map(start => {
          const row = gridItems.slice(start, start + 2);
          if (!row.length) return null;
          return (
            <View key={start} style={S.gridRow}>
              {row.map(item => (
                <GridCard key={item._id} item={item} onAdd={addToCart} onRemove={removeFromCart} qty={getQty(item._id)} onPress={openCard} />
              ))}
              {row.length === 1 && <View style={{ width: GRID_W }} />}
            </View>
          );
        })}
      </View>
    )}

    {/* Vertical list */}
    {vertItems.map(item => (
      <VertCard key={item._id} item={item} onAdd={addToCart} onRemove={removeFromCart} qty={getQty(item._id)} onPress={openCard} />
    ))}

    {/* Combos */}
    {liveCombos.length > 0 && (
      <View style={S.comboSection}>
        <SectionHdr title="🔥 Combo Deals" />
        <FlashList
          horizontal
          data={liveCombos}
          keyExtractor={it => it._id}
          renderItem={({ item }) => (
            <ComboCard
              item={item}
              onAdd={addToCart}
              onRemove={removeFromCart}
              qty={getQty(item._id)}
              onPress={openCard}
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.comboList}
          ItemSeparatorComponent={() => <View style={{ width: GRID_GAP }} />}
          estimatedItemSize={COMBO_W}
          removeClippedSubviews={true}
          decelerationRate="fast"
          snapToInterval={COMBO_W + GRID_GAP}
          snapToAlignment="start"
          bounces
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
        />
      </View>
    )}
    
    {filteredItems.length === 0 && (
      <View style={S.empty}>
        <Ionicons name="restaurant-outline" size={normalize(48)} color="#ddd" />
        <Text style={S.emptyTxt}>No items in this category</Text>
      </View>
    )}
  </View>

  {/* ✅ ADD FOOTER HERE - Outside the section view */}
  <Footer />
</ScrollView>

      {/* Cart Bar */}
      {cartCount > 0 && (
        <CartBar itemCount={cartCount} total={cartTotal}
          onPress={() => navigation.navigate('CartScreen', { cart, cartTotal })}
          bottomInset={bottomInset} />
      )}

      {/* Modal */}
      <DetailModal
        visible={modalVisible} item={selectedItem} onClose={closeCard}
        onAdd={addToCart} onRemove={removeFromCart}
        qty={selectedItem ? getQty(selectedItem._id) : 0}
      />
    </SafeAreaView>
  );
}

// Update the S StyleSheet object (around line 880-900)

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: CARD_BG, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(8),
    borderBottomWidth: 1, borderBottomColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 3, zIndex: 100,
  },
  headerBtn: { width: scale(40), height: scale(40), alignItems: 'center', justifyContent: 'center', borderRadius: scale(20) },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: normalize(16), fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3 },
  scroll: { flex: 1 },
  catSection: {
    backgroundColor: CARD_BG, marginTop: scale(12),
    paddingVertical: scale(14), borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
  },
  catList: { paddingHorizontal: scale(16), gap: scale(10) },
  section: { marginTop: scale(20), paddingHorizontal: scale(16) },
  // NEW: Combo section with no horizontal padding
  comboSection: { marginTop: scale(20), paddingHorizontal: 0 },
  // NEW: Combo list with left padding only
  comboList: { paddingLeft: scale(16), paddingRight: scale(16), paddingVertical: scale(4) },
  gridWrap: { marginBottom: scale(14), gap: scale(10) },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { paddingVertical: scale(40), alignItems: 'center', gap: scale(12) },
  emptyTxt: { fontSize: normalize(14), color: TEXT_LIGHT },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24), backgroundColor: CARD_BG },
  loadingTxt: { marginTop: scale(12), fontSize: normalize(13), color: TEXT_LIGHT },
  errorTxt: { marginTop: scale(12), fontSize: normalize(13), color: TEXT_MED, textAlign: 'center' },
  retryBtn: { marginTop: scale(20), backgroundColor: PRIMARY, paddingHorizontal: scale(28), paddingVertical: scale(12), borderRadius: scale(24) },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: normalize(14) },
});