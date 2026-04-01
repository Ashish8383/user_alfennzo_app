import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors }  from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { Radius }  from '../../theme/radius';
import { Shadows } from '../../theme/shadows';
import { normalize, isTablet } from '../../utils/responsive';

const CATEGORIES = ['Chat', 'All', 'Beverages', 'Snacks', 'South In...'];

const MOCK_ITEMS = [
  { id: '1', name: 'Veg Keema Roll',  price: 300, rating: 4.5, desc: 'Spiced veggie filling wrapped in...', isBestSeller: true  },
  { id: '2', name: 'Veg Pizza',       price: 400, rating: 4.5, desc: 'Spiced veggie filling wrapped in soft roti for flavorful roll', isBestSeller: false },
  { id: '3', name: 'Kulhad Pizza',    price: 200, rating: 4.5, desc: 'Spiced veggie filling wrapped in...', isBestSeller: true  },
];

export default function OutletMenuScreen() {
   const route = useRoute();
  const navigation = useNavigation();
  const { qrId } = route.params ?? {};
  console.log(qrId,"qrId is here")
  const { outletName } = route.params ?? {};
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const { width } = useWindowDimensions();
  const numCols   = isTablet() ? 2 : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Orange header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{outletName ?? "Haldiram's"}</Text>
          <Text style={styles.headerSub}>Audi 3 / E-4 ▾</Text>
        </View>
        <TouchableOpacity style={styles.headerAvatar}>
          <Text style={{ color: Colors.white }}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={{ fontSize: normalize(16) }}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, item === activeCategory && styles.chipActive]}
            onPress={() => setActiveCategory(item)}
          >
            <Text style={[styles.chipText, item === activeCategory && styles.chipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Section label */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>All Categories</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All ›</Text>
        </TouchableOpacity>
      </View>

      {/* Menu list */}
      <FlatList
        key={numCols}
        numColumns={numCols}
        data={MOCK_ITEMS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.menuList}
        columnWrapperStyle={numCols > 1 ? { gap: Spacing[3] } : undefined}
        renderItem={({ item }) => <MenuItemCard item={item} numCols={numCols} />}
      />
    </SafeAreaView>
  );
}

function MenuItemCard({ item, numCols }) {
  const [qty, setQty] = useState(0);

  return (
    <View style={[styles.card, numCols > 1 && { flex: 1 }, Shadows.sm]}>
      <View style={styles.cardInfo}>
        <View style={styles.vegBadge} />
        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
        <Text style={styles.itemDesc} numberOfLines={2}>{item.desc}</Text>
      </View>

      <View style={styles.cardAction}>
        {/* Replace with real Image */}
        <View style={styles.itemImage} />
        {item.isBestSeller && (
          <View style={styles.bestSeller}>
            <Text style={styles.bestSellerText}>Best Seller</Text>
          </View>
        )}
        {qty === 0 ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => setQty(1)}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.qtyControl}>
            <TouchableOpacity onPress={() => setQty((q) => Math.max(0, q - 1))}>
              <Text style={styles.qtyBtn}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyNum}>{qty}</Text>
            <TouchableOpacity onPress={() => setQty((q) => q + 1)}>
              <Text style={styles.qtyBtn}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: Spacing[4], paddingVertical: Spacing[3] },
  headerBack:      { fontSize: normalize(28), color: Colors.white, fontWeight: '600' },
  headerTitle:     { fontSize: normalize(18), fontWeight: '700', color: Colors.white },
  headerSub:       { fontSize: normalize(12), color: 'rgba(255,255,255,0.8)' },
  headerAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  searchRow:       { flexDirection: 'row', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], gap: Spacing[2] },
  searchBar:       { flex: 1, flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.full, alignItems: 'center', paddingHorizontal: Spacing[3], height: 42 },
  searchIcon:      { fontSize: normalize(14), marginRight: 6 },
  searchInput:     { flex: 1, fontSize: normalize(14), color: Colors.textPrimary },
  filterBtn:       { width: 42, height: 42, backgroundColor: Colors.white, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  categoryList:    { paddingHorizontal: Spacing[4], gap: Spacing[2], paddingBottom: Spacing[2] },
  chip:            { paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full, backgroundColor: Colors.white },
  chipActive:      { backgroundColor: Colors.primary },
  chipText:        { fontSize: normalize(13), color: Colors.textSecondary },
  chipTextActive:  { color: Colors.white, fontWeight: '600' },
  sectionRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing[4], marginBottom: Spacing[2] },
  sectionLabel:    { fontSize: normalize(15), fontWeight: '700', color: Colors.textPrimary },
  seeAll:          { fontSize: normalize(13), color: Colors.primary, fontWeight: '500' },
  menuList:        { paddingHorizontal: Spacing[4], paddingBottom: 100 },
  card:            { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing[3], marginBottom: Spacing[3] },
  cardInfo:        { flex: 1, paddingRight: Spacing[3] },
  cardAction:      { width: 100, alignItems: 'center' },
  vegBadge:        { width: 16, height: 16, borderRadius: 2, borderWidth: 1.5, borderColor: Colors.success, marginBottom: 4 },
  ratingRow:       { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  star:            { color: Colors.success, fontSize: normalize(13) },
  ratingText:      { fontSize: normalize(12), color: Colors.success, fontWeight: '600' },
  itemName:        { fontSize: normalize(15), fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  itemPrice:       { fontSize: normalize(14), fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  itemDesc:        { fontSize: normalize(12), color: Colors.textSecondary, lineHeight: 17 },
  itemImage:       { width: 90, height: 90, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, marginBottom: 8 },
  bestSeller:      { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  bestSellerText:  { fontSize: normalize(9), color: Colors.white, fontWeight: '700' },
  addBtn:          { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing[4], paddingVertical: Spacing[1] },
  addBtnText:      { fontSize: normalize(14), color: Colors.primary, fontWeight: '700' },
  qtyControl:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing[2], gap: Spacing[3] },
  qtyBtn:          { fontSize: normalize(18), color: Colors.white, fontWeight: '700', paddingVertical: 2 },
  qtyNum:          { fontSize: normalize(14), color: Colors.white, fontWeight: '700', minWidth: 16, textAlign: 'center' },
});