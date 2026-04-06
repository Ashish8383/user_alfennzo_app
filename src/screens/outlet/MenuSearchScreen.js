/**
 * MenuSearchScreen.jsx — Revamped
 * - Item name only in suggestions (no full card)
 * - Same vertical layout as OutletMenuScreen for results
 * - Same modal sheet as OutletMenuScreen
 * - Veg filter, recents, trending, highlight match
 */

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, StatusBar, Animated,
  KeyboardAvoidingView, Platform, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme/colors';
import { normalize, scale } from '../../utils/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Design Tokens (match OutletMenuScreen) ──────────────────────────────────
const GREEN        = Colors.primary ?? '#0F7A65';
const GREEN_LIGHT  = '#E8F5F2';
const ORANGE       = '#ff7221';
const ORANGE_LIGHT = '#FFF1E8';
const BG           = '#F5F6F8';
const CARD_BG      = '#FFFFFF';
const TEXT_DARK    = '#1A1A2E';
const TEXT_MED     = '#5A5A72';
const TEXT_LIGHT   = '#9A9AB0';
const BORDER       = '#EFEFEF';
const VEG_GREEN    = '#2E7D32';
const NONVEG_RED   = '#C62828';

const VERT_IMG_SIZE = scale(108);
const RECENT_KEY    = '@menu_search_recent';
const MAX_RECENT    = 8;
const MAX_SUGGEST   = 8;

import { Dimensions } from 'react-native';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (p) => { const n = parseFloat(p); return isNaN(n) ? '0' : (n % 1 === 0 ? String(n) : n.toFixed(2)); };

const getDiscountedPrice = (item) => {
  const orig = item.price?.full ?? 0;
  if (item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0)
    return Math.round(orig * (1 - item.discountinPercentageByRestraurant / 100));
  return orig;
};

// ─── Scoring ─────────────────────────────────────────────────────────────────
function scoreItem(item, query, addCountMap) {
  if (!query) return 0;
  const q = query.toLowerCase().trim();
  const name = (item.itemName ?? '').toLowerCase();
  const desc = (item.description ?? '').toLowerCase();
  let score = 0;
  if (name === q)                             score += 100;
  else if (name.startsWith(q))               score += 60;
  else if (new RegExp(`\\b${q}`).test(name)) score += 40;
  else if (name.includes(q))                 score += 20;
  if (desc.includes(q))  score += 10;
  if (item.recommended)  score += 15;
  if (item.isVeg)        score += 5;
  const popularity = 1 + (addCountMap[item._id] ?? 0) / 10;
  return score * popularity;
}

function getSuggestions(allItems, query, addCountMap, vegOnly) {
  if (!query.trim()) return [];
  let pool = vegOnly ? allItems.filter(i => i.isVeg) : allItems;
  return pool
    .map(item => ({ item, score: scoreItem(item, query, addCountMap) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGEST)
    .map(({ item }) => item);
}

function getTrending(allItems, addCountMap, vegOnly, limit = 8) {
  let pool = vegOnly ? allItems.filter(i => i.isVeg) : allItems;
  return [...pool]
    .sort((a, b) => {
      const pop = (addCountMap[b._id] ?? 0) - (addCountMap[a._id] ?? 0);
      return pop !== 0 ? pop : (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0);
    })
    .slice(0, limit);
}

// ─── Veg Symbol ──────────────────────────────────────────────────────────────
const VegSymbol = React.memo(({ isVeg, size = 14 }) => {
  const color = isVeg ? VEG_GREEN : NONVEG_RED;
  return (
    <View style={{ width: size, height: size, borderRadius: 2, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <View style={{ width: size * 0.44, height: size * 0.44, borderRadius: size * 0.22, backgroundColor: color }} />
    </View>
  );
});

// ─── Highlight matched text ───────────────────────────────────────────────────
const Highlight = React.memo(({ text, query, style, hlStyle }) => {
  if (!query.trim()) return <Text style={style}>{text}</Text>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {text.slice(0, idx)}
      <Text style={hlStyle}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </Text>
  );
});

const CompactAdd = React.memo(({ qty, onAdd, onRemove }) => {
  if (qty > 0) {
    return (
      <View style={caStyles.qtyRow}>
        <TouchableOpacity onPress={onRemove} style={caStyles.qtyBtn}>
          <Text style={caStyles.qtyBtnTxt}>−</Text>
        </TouchableOpacity>

        <Text style={caStyles.qtyNum}>{qty}</Text>

        <TouchableOpacity onPress={onAdd} style={caStyles.qtyBtn}>
          <Text style={caStyles.qtyBtnTxt}>+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onAdd} style={caStyles.addBtn}>
      <Text style={caStyles.addTxt}>ADD</Text>
    </TouchableOpacity>
  );
});

const caStyles = StyleSheet.create({
  addBtn: {
    backgroundColor: ORANGE,
    borderRadius: scale(10),
    height: scale(36),
    width: '90%', // ✅ full width
    paddingTop: scale(7),
    borderWidth: scale(1.5),
    borderColor: ORANGE_LIGHT,

    alignItems: 'center',
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
    backgroundColor: ORANGE,
    borderRadius: scale(10),
    overflow: 'hidden',

    width: '90%', // ✅ full width
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
// ─── Suggestion Row (name only, small icon) ───────────────────────────────────
const SuggestionRow = React.memo(({ item, query, onPress }) => (
  <TouchableOpacity style={srStyles.row} onPress={() => onPress(item)} activeOpacity={0.7}>
    <Ionicons name="search-outline" size={normalize(15)} color={TEXT_LIGHT} />
    <View style={srStyles.mid}>
      <Highlight text={item.itemName ?? ''} query={query} style={srStyles.name} hlStyle={srStyles.hl} />
      {item.categoryName && <Text style={srStyles.cat}>{item.categoryName}</Text>}
    </View>
    <VegSymbol isVeg={item.isVeg} size={12} />
    <Ionicons name="arrow-up-back-outline" size={normalize(14)} color={TEXT_LIGHT} />
  </TouchableOpacity>
));
const srStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: scale(10),
    paddingHorizontal: scale(16), paddingVertical: scale(12),
    borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: CARD_BG,
  },
  mid: { flex: 1 },
  name: { fontSize: normalize(14), fontWeight: '600', color: TEXT_DARK },
  hl:   { color: ORANGE, fontWeight: '800' },
  cat:  { fontSize: normalize(11), color: TEXT_LIGHT, marginTop: 1 },
});

const ResultCard = React.memo(({ item, query, onAdd, onRemove, qty, onPress }) => {
  const [imgErr, setImgErr] = useState(false);

  const orig  = item.price?.full ?? 0;
  const disc  = getDiscountedPrice(item);
  const hasDsc = orig > disc;
  const saved  = orig - disc;

  return (
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.9} style={rcStyles.card}>
      
      {/* LEFT */}
      <View style={rcStyles.left}>
        
        <View style={{ gap: scale(7) }}>
          
          <View style={rcStyles.topRow}>
            <VegSymbol isVeg={item.isVeg} />

            {hasDsc && (
              <View style={rcStyles.saveTag}>
                <Text style={rcStyles.saveTxt}>Save ₹{fmt(saved)}</Text>
              </View>
            )}
          </View>

          <Highlight
            text={item.itemName ?? ''}
            query={query}
            style={rcStyles.name}
            hlStyle={rcStyles.hl}
          />

          <View style={rcStyles.priceRow}>
            <Text style={rcStyles.price}>₹{fmt(disc)}</Text>
            {hasDsc && <Text style={rcStyles.orig}>₹{fmt(orig)}</Text>}
          </View>

        </View>

      </View>

      {/* RIGHT */}
      <View style={rcStyles.right}>
        
        {/* IMAGE */}
        <View style={rcStyles.imgWrap}>
          <Image
            source={{
              uri: imgErr
                ? 'https://via.placeholder.com/110x110?text=Food'
                : (item.image || '')
            }}
            style={rcStyles.img}
            resizeMode="cover"
            onError={() => setImgErr(true)}
          />

          {hasDsc && (
            <View style={rcStyles.imgBadge}>
              <Text style={rcStyles.imgBadgeTxt}>
                {item.discountinPercentageByRestraurant}%
              </Text>
            </View>
          )}
        </View>

        {/* ✅ BUTTON BELOW IMAGE (NO OVERFLOW) */}
        <View style={rcStyles.addWrapper}>
          <CompactAdd
            qty={qty}
            onAdd={() => onAdd(item)}
            onRemove={() => onRemove(item)}
          />
        </View>

      </View>
    </TouchableOpacity>
  );
});
const rcStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: BORDER,
    paddingBottom:normalize(26),

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  left: {
    flex: 1,
    marginRight: scale(12),
    justifyContent: 'space-between',
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  saveTag: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  saveTxt: {
    fontSize: normalize(9),
    fontWeight: '700',
    color: GREEN,
  },

  name: {
    fontSize: normalize(14),
    fontWeight: '700',
    color: TEXT_DARK,
    lineHeight: normalize(19),
  },

  hl: {
    color: ORANGE,
    fontWeight: '800',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },

  price: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: GREEN,
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
    backgroundColor: GREEN_LIGHT,
  },

  img: {
    width: '100%',
    height: '100%',
  },

  imgBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: ORANGE,
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
},});

// ─── Detail Modal (same as OutletMenuScreen) ──────────────────────────────────
const ModalAddBtn = ({ onAdd, onClose }) => {
  const [ticked, setTicked] = useState(false);
  const scale_ = useRef(new Animated.Value(1)).current;
  const handleAdd = () => {
    setTicked(true);
    Animated.sequence([
      Animated.spring(scale_, { toValue: 1.06, useNativeDriver: true, speed: 30 }),
      Animated.spring(scale_, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    onAdd();
    setTimeout(() => { setTicked(false); onClose(); }, 900);
  };
  return (
    <Animated.View style={{ transform: [{ scale: scale_ }] }}>
      <TouchableOpacity onPress={handleAdd} activeOpacity={0.85}
        style={[mabStyles.btn, ticked && mabStyles.btnTicked]}>
        {ticked
          ? <><Ionicons name="checkmark-circle" size={normalize(20)} color="#fff" /><Text style={mabStyles.txt}>  Added!</Text></>
          : <Text style={mabStyles.txt}>+ Add to Cart</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
};
const mabStyles = StyleSheet.create({
  btn: { backgroundColor: ORANGE, borderRadius: scale(14), paddingVertical: scale(16), alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnTicked: { backgroundColor: GREEN },
  txt: { color: '#fff', fontSize: normalize(16), fontWeight: '800' },
});

// Updated DetailModal component with better gesture navigation handling
const DetailModal = ({ visible, item, onClose, onAdd }) => {
  const [imgErr, setImgErr] = useState(false);
  const insets = useSafeAreaInsets(); // Add this to get safe area insets
  
  if (!item) return null;
  const isCombo = !!item.ComboItems;
  const orig    = isCombo
    ? (item.discountinPercentageByRestraurant > 0
        ? Math.round(item.comboprice / (1 - item.discountinPercentageByRestraurant / 100))
        : item.comboprice)
    : (item.price?.full ?? 0);
  const display = isCombo ? item.comboprice : getDiscountedPrice(item);
  const saved   = orig - display;
  const hasDsc  = saved > 0;
  const discPct = item.discountinPercentageByRestraurant;
  const MOD_IMG = scale(140);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={dmStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={dmStyles.sheet}>
          <View style={dmStyles.handle} />
          <TouchableOpacity style={dmStyles.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={normalize(18)} color={TEXT_MED} />
          </TouchableOpacity>
          
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            bounces={false} 
            contentContainerStyle={dmStyles.scroll}
          >
            <View style={[dmStyles.imgBox, { width: MOD_IMG, height: MOD_IMG, borderRadius: scale(16) }]}>
              <Image 
                source={{ uri: imgErr ? 'https://via.placeholder.com/200x200?text=Food' : (item.image || '') }}
                style={dmStyles.img} 
                resizeMode="cover" 
                onError={() => setImgErr(true)} 
              />
              <View style={dmStyles.vegOnImg}>
                <VegSymbol isVeg={item.isVeg !== false} size={16} />
              </View>
            </View>
            
            <Text style={dmStyles.name}>{item.itemName || item.combofoodName}</Text>
            
            <View style={dmStyles.priceRow}>
              <Text style={dmStyles.price}>₹{fmt(display)}</Text>
              {hasDsc && <Text style={dmStyles.orig}>₹{fmt(orig)}</Text>}
            </View>
            
            {hasDsc && (
              <View style={dmStyles.saveBanner}>
                <Text style={dmStyles.saveTxt}>Save ₹{fmt(saved)} ({discPct}% OFF)</Text>
              </View>
            )}
            
            <View style={dmStyles.divider} />
            
            {!!item.description && !isCombo && (
              <>
                <Text style={dmStyles.sectionTitle}>About</Text>
                <Text style={dmStyles.desc}>{item.description}</Text>
                <View style={dmStyles.divider} />
              </>
            )}
            
            {isCombo && item.ComboItems?.length > 0 && (
              <>
                <Text style={dmStyles.sectionTitle}>Includes:</Text>
                <View style={dmStyles.includesBox}>
                  {item.ComboItems.map((ci, i) => (
                    <View key={i} style={dmStyles.includeRow}>
                      <Text style={dmStyles.includeName}>
                        {ci.foodName}{ci.quantity > 1 ? ` ×${ci.quantity}` : ''}
                      </Text>
                      <Text style={dmStyles.includePrice}>₹{fmt(ci.price)}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={dmStyles.summaryBox}>
                  <View style={dmStyles.summaryRow}>
                    <Text style={dmStyles.summaryLabel}>Total Value</Text>
                    <Text style={dmStyles.summaryOrig}>₹{fmt(orig)}</Text>
                  </View>
                  <View style={dmStyles.summaryRow}>
                    <Text style={dmStyles.summaryLabel}>Combo Price</Text>
                    <Text style={dmStyles.summaryPrice}>₹{fmt(display)}</Text>
                  </View>
                  {hasDsc && (
                    <View style={dmStyles.youSaveBox}>
                      <View>
                        <Text style={dmStyles.youSaveLabel}>You Save</Text>
                        {discPct > 0 && <Text style={dmStyles.youSaveSub}>{discPct}% discount on this combo</Text>}
                      </View>
                      <Text style={dmStyles.youSaveAmt}>₹{fmt(saved)}</Text>
                    </View>
                  )}
                </View>
              </>
            )}
            
            {/* Add extra bottom padding to ensure content doesn't get hidden behind button */}
            <View style={{ height: scale(20) }} />
          </ScrollView>
          
          {/* Updated Footer with safe area handling */}
          <View style={[dmStyles.footer, { paddingBottom: Math.max(insets.bottom, scale(14)) }]}>
            <ModalAddBtn onAdd={() => onAdd(item)} onClose={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Updated styles for the modal
const dmStyles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.45)', 
    justifyContent: 'flex-end' 
  },
  
  sheet: { 
    backgroundColor: CARD_BG, 
    borderTopLeftRadius: scale(24), 
    borderTopRightRadius: scale(24), 
    maxHeight: SCREEN_HEIGHT * 0.92, // Increased from 0.88 to show more content
    overflow: 'hidden',
    // Add shadow for better elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  
  handle: { 
    width: scale(38), 
    height: 4, 
    borderRadius: 2, 
    backgroundColor: '#D5D5D5', 
    alignSelf: 'center', 
    marginTop: scale(12) 
  },
  
  closeBtn: { 
    position: 'absolute', 
    top: scale(14), 
    right: scale(16), 
    zIndex: 10, 
    width: scale(32), 
    height: scale(32), 
    borderRadius: scale(16), 
    backgroundColor: '#F0F0F0', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  scroll: { 
    paddingHorizontal: scale(20), 
    paddingTop: scale(10), 
    paddingBottom: scale(8), 
    alignItems: 'center' 
  },
  
  imgBox: { 
    alignSelf: 'center', 
    marginBottom: scale(14), 
    marginTop: scale(6), 
    backgroundColor: GREEN_LIGHT, 
    position: 'relative', 
    overflow: 'hidden' 
  },
  
  img: { 
    width: '100%', 
    height: '100%' 
  },
  
  vegOnImg: { 
    position: 'absolute', 
    top: 8, 
    left: 8 
  },
  
  name: { 
    fontSize: normalize(20), 
    fontWeight: '800', 
    color: TEXT_DARK, 
    textAlign: 'center', 
    marginBottom: scale(6) 
  },
  
  priceRow: { 
    flexDirection: 'row', 
    alignItems: 'baseline', 
    gap: scale(8), 
    justifyContent: 'center', 
    marginBottom: scale(10) 
  },
  
  price: { 
    fontSize: normalize(24), 
    fontWeight: '900', 
    color: TEXT_DARK 
  },
  
  orig: { 
    fontSize: normalize(14), 
    color: TEXT_LIGHT, 
    textDecorationLine: 'line-through' 
  },
  
  saveBanner: { 
    alignSelf: 'stretch', 
    backgroundColor: GREEN_LIGHT, 
    borderRadius: scale(8), 
    paddingVertical: scale(10), 
    paddingHorizontal: scale(16), 
    alignItems: 'center', 
    marginBottom: scale(14) 
  },
  
  saveTxt: { 
    fontSize: normalize(13), 
    fontWeight: '700', 
    color: GREEN 
  },
  
  divider: { 
    height: 1, 
    backgroundColor: BORDER, 
    marginVertical: scale(14), 
    alignSelf: 'stretch', 
    width: '100%' 
  },
  
  sectionTitle: { 
    fontSize: normalize(15), 
    fontWeight: '700', 
    color: TEXT_DARK, 
    marginBottom: scale(10), 
    alignSelf: 'flex-start' 
  },
  
  desc: { 
    fontSize: normalize(13), 
    color: TEXT_MED, 
    lineHeight: normalize(20), 
    alignSelf: 'flex-start' 
  },
  
  includesBox: { 
    borderWidth: 1, 
    borderColor: BORDER, 
    borderRadius: scale(10), 
    overflow: 'hidden', 
    marginBottom: scale(14), 
    alignSelf: 'stretch' 
  },
  
  includeRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: scale(12), 
    paddingHorizontal: scale(14), 
    borderBottomWidth: 1, 
    borderBottomColor: BORDER 
  },
  
  includeName: { 
    fontSize: normalize(13), 
    color: TEXT_DARK, 
    flex: 1 
  },
  
  includePrice: { 
    fontSize: normalize(13), 
    fontWeight: '700', 
    color: TEXT_DARK 
  },
  
  summaryBox: { 
    borderWidth: 1, 
    borderColor: BORDER, 
    borderRadius: scale(10), 
    overflow: 'hidden', 
    marginBottom: scale(14), 
    alignSelf: 'stretch' 
  },
  
  summaryRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: scale(12), 
    paddingHorizontal: scale(14), 
    borderBottomWidth: 1, 
    borderBottomColor: BORDER 
  },
  
  summaryLabel: { 
    fontSize: normalize(13), 
    fontWeight: '600', 
    color: TEXT_DARK 
  },
  
  summaryOrig: { 
    fontSize: normalize(13), 
    color: TEXT_LIGHT, 
    textDecorationLine: 'line-through' 
  },
  
  summaryPrice: { 
    fontSize: normalize(16), 
    fontWeight: '800', 
    color: ORANGE 
  },
  
  youSaveBox: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: scale(12), 
    paddingHorizontal: scale(14), 
    backgroundColor: GREEN_LIGHT 
  },
  
  youSaveLabel: { 
    fontSize: normalize(14), 
    fontWeight: '700', 
    color: GREEN 
  },
  
  youSaveSub: { 
    fontSize: normalize(10), 
    color: GREEN, 
    marginTop: 2 
  },
  
  youSaveAmt: { 
    fontSize: normalize(18), 
    fontWeight: '900', 
    color: GREEN 
  },
  
  footer: { 
    paddingHorizontal: scale(20), 
    paddingTop: scale(14),
    // Remove fixed paddingBottom, will be set dynamically with insets
    borderTopWidth: 1, 
    borderTopColor: BORDER,
    backgroundColor: CARD_BG, // Ensure background color
  },
});
// ─── Recent Chip ─────────────────────────────────────────────────────────────
const RecentChip = React.memo(({ label, onPress, onRemove }) => (
  <TouchableOpacity style={chipStyles.chip} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name="time-outline" size={normalize(12)} color={TEXT_LIGHT} />
    <Text style={chipStyles.txt} numberOfLines={1}>{label}</Text>
    <TouchableOpacity onPress={onRemove} hitSlop={8}><Ionicons name="close" size={normalize(12)} color="#bbb" /></TouchableOpacity>
  </TouchableOpacity>
));

// ─── Trending Chip ────────────────────────────────────────────────────────────
const TrendChip = React.memo(({ item, onPress }) => (
  <TouchableOpacity style={[chipStyles.chip, chipStyles.trend]} onPress={() => onPress(item)} activeOpacity={0.7}>
    <Ionicons name="flame-outline" size={normalize(12)} color={ORANGE} />
    <Text style={[chipStyles.txt, { color: TEXT_DARK }]} numberOfLines={1}>{item.itemName}</Text>
  </TouchableOpacity>
));

const chipStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F5F5', borderRadius: scale(20), paddingHorizontal: scale(12), paddingVertical: scale(7), maxWidth: '80%' },
  trend: { backgroundColor: ORANGE_LIGHT, borderWidth: 1, borderColor: '#FFD5B5' },
  txt: { fontSize: normalize(12), color: TEXT_MED, fontWeight: '500' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MenuSearchScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { allItems = [], addCountMap: initMap = {} } = route.params ?? {};

  const [query,       setQuery]       = useState('');
  const [vegOnly,     setVegOnly]     = useState(false);
  const [recents,     setRecents]     = useState([]);
  const [addCountMap, setAddCountMap] = useState(initMap);
  const [cart,        setCart]        = useState({});
  const [phase,       setPhase]       = useState('idle');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then(val => { if (val) setRecents(JSON.parse(val)); }).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const saveRecent = useCallback(async (text) => {
    const t = text.trim(); if (!t) return;
    const next = [t, ...recents.filter(r => r !== t)].slice(0, MAX_RECENT);
    setRecents(next);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  }, [recents]);

  const removeRecent = useCallback(async (label) => {
    const next = recents.filter(r => r !== label);
    setRecents(next);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  }, [recents]);

  const clearRecents = useCallback(async () => {
    setRecents([]);
    await AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
  }, []);

  const animIn = useCallback(() => {
    fadeAnim.setValue(0.7);
    Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleQueryChange = useCallback((text) => {
    setQuery(text);
    const next = text.trim().length > 0 ? 'suggesting' : 'idle';
    if (next !== phase) { setPhase(next); animIn(); }
  }, [phase, animIn]);

  const commitSearch = useCallback((text) => {
    const q = (text ?? query).trim(); if (!q) return;
    saveRecent(q); setQuery(q); setPhase('results'); animIn();
  }, [query, saveRecent, animIn]);

  const handleChipPress = useCallback((text) => { setQuery(text); commitSearch(text); }, [commitSearch]);
  const handleTrendPress = useCallback((item) => handleChipPress(item.itemName), [handleChipPress]);

  const addToCart = useCallback((item) => {
    setCart(prev => { const k = item._id; return { ...prev, [k]: { ...item, quantity: (prev[k]?.quantity || 0) + 1 } }; });
    setAddCountMap(prev => ({ ...prev, [item._id]: (prev[item._id] ?? 0) + 1 }));
    route.params?.onAdd?.(item);
  }, [route.params]);

  const removeFromCart = useCallback((item) => {
    setCart(prev => {
      const k = item._id;
      if (!prev[k]) return prev;
      if (prev[k].quantity === 1) { const { [k]: _, ...rest } = prev; return rest; }
      return { ...prev, [k]: { ...prev[k], quantity: prev[k].quantity - 1 } };
    });
  }, []);

  const getQty = useCallback((id) => cart[id]?.quantity || 0, [cart]);

  const openCard  = useCallback((item) => { setSelectedItem(item); setModalVisible(true); }, []);
  const closeCard = useCallback(() => { setModalVisible(false); setSelectedItem(null); }, []);

  const suggestions = useMemo(() => getSuggestions(allItems, query, addCountMap, vegOnly), [allItems, query, addCountMap, vegOnly]);
  const trending    = useMemo(() => getTrending(allItems, addCountMap, vegOnly), [allItems, addCountMap, vegOnly]);

  const fullResults = useMemo(() => {
  if (phase !== 'results') return [];
  let pool = vegOnly ? allItems.filter(i => i.isVeg) : allItems;

  return pool
    .map(item => ({
      item,
      score: scoreItem(item, query, {}) // ✅ no addCountMap here
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}, [phase, allItems, query, vegOnly]);

  return (
    <SafeAreaView style={SS.root} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD_BG} />

      {/* Search Bar */}
      <View style={[SS.topBar, { paddingTop: insets.top + scale(8) }]}>
        <TouchableOpacity style={SS.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={normalize(22)} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={SS.inputWrap}>
          <Ionicons name="search-outline" size={normalize(17)} color={TEXT_LIGHT} />
          <TextInput
            ref={inputRef} style={SS.input}
            placeholder="Search dishes, combos…" placeholderTextColor="#bbb"
            value={query} onChangeText={handleQueryChange}
            onSubmitEditing={() => commitSearch()}
            returnKeyType="search" autoCorrect={false} autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setPhase('idle'); inputRef.current?.focus(); }} hitSlop={8}>
              <Ionicons name="close-circle" size={normalize(17)} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[SS.vegToggle, vegOnly && SS.vegToggleOn]}
          onPress={() => setVegOnly(v => !v)} activeOpacity={0.8}>
          <View style={[SS.vegDot, { backgroundColor: vegOnly ? VEG_GREEN : '#ccc' }]} />
          <Text style={[SS.vegTxt, vegOnly && { color: VEG_GREEN }]}>Veg</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

          {/* ── IDLE ─── */}
          {phase === 'idle' && (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ padding: scale(16) }}>
                {recents.length > 0 && (
                  <View style={SS.block}>
                    <View style={SS.blockHdr}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="time-outline" size={normalize(14)} color={TEXT_LIGHT} />
                        <Text style={SS.blockTitle}>Recent Searches</Text>
                      </View>
                      <TouchableOpacity onPress={clearRecents}><Text style={SS.clearTxt}>Clear all</Text></TouchableOpacity>
                    </View>
                    <View style={SS.chipWrap}>
                      {recents.map(r => <RecentChip key={r} label={r} onPress={() => handleChipPress(r)} onRemove={() => removeRecent(r)} />)}
                    </View>
                  </View>
                )}
                {trending.length > 0 && (
                  <View style={SS.block}>
                    <View style={SS.blockHdr}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="flame-outline" size={normalize(14)} color={ORANGE} />
                        <Text style={SS.blockTitle}>Trending Now</Text>
                      </View>
                    </View>
                    <View style={SS.chipWrap}>
                      {trending.map(item => <TrendChip key={item._id} item={item} onPress={handleTrendPress} />)}
                    </View>
                  </View>
                )}
                {recents.length === 0 && trending.length === 0 && (
                  <View style={SS.emptyIdle}>
                    <Ionicons name="search-outline" size={normalize(56)} color="#e0e0e0" />
                    <Text style={SS.emptyTitle}>Find your next meal</Text>
                    <Text style={SS.emptySub}>Search by dish name or ingredient</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {/* ── SUGGESTING — names only ── */}
          {phase === 'suggesting' && (
            <View style={{ flex: 1, backgroundColor: CARD_BG }}>
              {suggestions.length > 0
                ? suggestions.map(item => (
                    <SuggestionRow
                      key={item._id} item={item} query={query}
                      onPress={(i) => { setQuery(i.itemName); commitSearch(i.itemName); }}
                    />
                  ))
                : (
                  <View style={SS.noMatch}>
                    <Text style={SS.noMatchTxt}>No matches for "{query}"</Text>
                    <TouchableOpacity onPress={() => commitSearch()} style={SS.searchAnywayBtn}>
                      <Text style={SS.searchAnywayTxt}>Search anyway</Text>
                    </TouchableOpacity>
                  </View>
                )}
              {suggestions.length > 0 && (
                <TouchableOpacity style={SS.searchAllRow} onPress={() => commitSearch()}>
                  <Ionicons name="search-outline" size={normalize(15)} color={ORANGE} />
                  <Text style={SS.searchAllTxt}>Show all results for <Text style={{ fontWeight: '800', color: ORANGE }}>"{query}"</Text></Text>
                  <Ionicons name="chevron-forward" size={normalize(15)} color={ORANGE} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── RESULTS — vertical cards ── */}
          {phase === 'results' && (
            <FlatList
              data={fullResults}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <ResultCard
                  item={item} query={query}
                  onAdd={addToCart} onRemove={removeFromCart}
                  qty={getQty(item._id)} onPress={openCard}
                />
              )}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={SS.resultsList}
              removeClippedSubviews maxToRenderPerBatch={10} windowSize={5} initialNumToRender={8}
              ListHeaderComponent={
                <View style={SS.resultsHdr}>
                  <Text style={SS.resultsHdrTxt}>
                    {fullResults.length} result{fullResults.length !== 1 ? 's' : ''} for{' '}
                    <Text style={{ color: ORANGE, fontWeight: '700' }}>"{query}"</Text>
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={SS.emptyIdle}>
                  <Ionicons name="fast-food-outline" size={normalize(56)} color="#e0e0e0" />
                  <Text style={SS.emptyTitle}>Nothing found</Text>
                  <Text style={SS.emptySub}>Try a different keyword</Text>
                </View>
              }
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Detail Modal */}
      <DetailModal
        visible={modalVisible} item={selectedItem}
        onClose={closeCard} onAdd={addToCart}
      />
    </SafeAreaView>
  );
}

const SS = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    paddingHorizontal: scale(12), paddingBottom: scale(12),
    backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: scale(38), height: scale(38), borderRadius: scale(19), backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: scale(12), paddingHorizontal: scale(12), paddingVertical: scale(10), gap: scale(8) },
  input: { flex: 1, fontSize: normalize(15), color: TEXT_DARK, padding: 0, margin: 0 },
  vegToggle: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: scale(20), paddingHorizontal: scale(10), paddingVertical: scale(6), gap: 5, backgroundColor: CARD_BG },
  vegToggleOn: { borderColor: VEG_GREEN, backgroundColor: '#E8F5E9' },
  vegDot: { width: 8, height: 8, borderRadius: 4 },
  vegTxt: { fontSize: normalize(12), fontWeight: '600', color: TEXT_LIGHT },
  block: { marginBottom: scale(24) },
  blockHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(12) },
  blockTitle: { fontSize: normalize(13), fontWeight: '700', color: TEXT_MED, letterSpacing: 0.3 },
  clearTxt: { fontSize: normalize(12), color: ORANGE, fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  emptyIdle: { alignItems: 'center', paddingTop: scale(60), gap: scale(12) },
  emptyTitle: { fontSize: normalize(17), fontWeight: '700', color: TEXT_DARK },
  emptySub: { fontSize: normalize(13), color: TEXT_LIGHT, textAlign: 'center', paddingHorizontal: scale(24) },
  noMatch: { alignItems: 'center', paddingVertical: scale(32), gap: scale(12) },
  noMatchTxt: { fontSize: normalize(14), color: TEXT_LIGHT, textAlign: 'center', paddingHorizontal: scale(24) },
  searchAnywayBtn: { borderWidth: 1.5, borderColor: ORANGE, borderRadius: scale(20), paddingHorizontal: scale(20), paddingVertical: scale(8) },
  searchAnywayTxt: { fontSize: normalize(13), color: ORANGE, fontWeight: '600' },
  searchAllRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16), paddingVertical: scale(14), borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: ORANGE_LIGHT },
  searchAllTxt: { flex: 1, fontSize: normalize(13), color: TEXT_DARK },
  resultsList: { paddingHorizontal: scale(16), paddingBottom: scale(40), paddingTop: scale(4) },
  resultsHdr: { paddingVertical: scale(12) },
  resultsHdrTxt: { fontSize: normalize(13), color: TEXT_MED },
});