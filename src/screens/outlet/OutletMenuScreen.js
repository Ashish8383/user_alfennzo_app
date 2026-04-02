import React, {
  useEffect, useState, useCallback, useMemo, useRef,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
  Animated, StatusBar, TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { normalize, scale } from '../../utils/responsive';
import {
  getOutletData,
  selectQrData,
  selectRestaurant,
  selectMenuCategories,
  selectLiveCombos,
} from '../../api/menu.api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GREEN = Colors.primary ?? '#0F7A65';
const ORANGE = Colors.error ?? '#FF6B4A';
const LIGHT = '#E8F3F1';

// Veg/Non-veg dot indicator
const VegDot = React.memo(({ isVeg }) => (
  <View style={[styles.vdBox, { borderColor: isVeg ? GREEN : ORANGE }]}>
    <View style={[styles.vdDot, { backgroundColor: isVeg ? GREEN : ORANGE }]} />
  </View>
));

// Food Item Card
const FoodItemCard = React.memo(({ item, onAdd }) => {
  const discounted = item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0;
  const originalPrice = item.price?.full ?? 0;
  const discountedPrice = discounted
    ? Math.round(originalPrice * (1 - item.discountinPercentageByRestraurant / 100))
    : originalPrice;

  return (
    <View style={styles.foodCard}>
      <View style={styles.foodImgWrap}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.foodImg} />
        ) : (
          <View style={[styles.foodImg, styles.foodImgPlaceholder]}>
            <Ionicons name="fast-food-outline" size={normalize(28)} color="#ccc" />
          </View>
        )}
        {item.recommended && (
          <View style={styles.foodBadge}>
            <Text style={styles.foodBadgeTxt}>★ Best</Text>
          </View>
        )}
      </View>

      <View style={styles.foodInfo}>
        <View style={styles.foodTopRow}>
          <VegDot isVeg={item.isVeg} />
          {discounted && (
            <View style={styles.foodDiscountPill}>
              <Text style={styles.foodDiscountPillTxt}>{item.discountinPercentageByRestraurant}% off</Text>
            </View>
          )}
        </View>

        <Text style={styles.foodName} numberOfLines={2}>{item.itemName}</Text>
        {item.description && (
          <Text style={styles.foodDesc} numberOfLines={2}>{item.description}</Text>
        )}

        <View style={styles.foodBottomRow}>
          <View>
            <View style={styles.foodPriceRow}>
              <Text style={styles.foodPrice}>₹{discountedPrice}</Text>
              {discounted && (
                <Text style={styles.foodStrikePrice}>₹{originalPrice}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.foodAddBtn} onPress={() => onAdd?.(item)} activeOpacity={0.7}>
            <Text style={styles.foodAddBtnTxt}>ADD</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// Combo Card - Optimized for fast scrolling
const ComboCard = React.memo(({ item, onAdd }) => {
  const discounted = item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0;
  
  return (
    <View style={styles.comboCard}>
      <View style={styles.comboImgContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.comboImg} />
        ) : (
          <View style={[styles.comboImg, styles.comboImgPlaceholder]}>
            <Ionicons name="fast-food-outline" size={normalize(24)} color="#ccc" />
          </View>
        )}
        {discounted && (
          <View style={styles.comboBadge}>
            <Text style={styles.comboBadgeTxt}>{item.discountinPercentageByRestraurant}% off</Text>
          </View>
        )}
      </View>
      <View style={styles.comboInfo}>
        <Text style={styles.comboName} numberOfLines={1}>{item.combofoodName}</Text>
        <Text style={styles.comboItems} numberOfLines={1}>
          {item.ComboItems?.map((i) => i.foodName).join(' + ') || ''}
        </Text>
        <View style={styles.comboBottomRow}>
          <Text style={styles.comboPrice}>₹{item.comboprice}</Text>
          <TouchableOpacity style={styles.comboAddBtn} onPress={() => onAdd?.(item)} activeOpacity={0.7}>
            <Text style={styles.comboAddBtnTxt}>ADD</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// Category Pill
const CategoryPill = React.memo(({ name, active, onPress }) => (
  <TouchableOpacity
    style={[styles.categoryPill, active && styles.categoryPillActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>{name}</Text>
  </TouchableOpacity>
));

// Profile Picture
const ProfilePicture = React.memo(({ imageUrl }) => (
  <View style={styles.profileContainer}>
    {imageUrl ? (
      <Image source={{ uri: imageUrl }} style={styles.profileImage} />
    ) : (
      <View style={styles.profilePlaceholder}>
        <Ionicons name="person-outline" size={normalize(20)} color="#666" />
      </View>
    )}
  </View>
));

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Fetch data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!qrId) {
      setError('No QR ID provided.');
      setLoading(false);
      return;
    }
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await getOutletData(qrId);
      setApiData(res);
    } catch (e) {
      setError(e?.message ?? 'Failed to load menu. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [qrId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Derived data
  const restaurant = useMemo(() => selectRestaurant(apiData), [apiData]);
  const categories = useMemo(() => selectMenuCategories(apiData), [apiData]);
  const liveCombos = useMemo(() => selectLiveCombos(apiData), [apiData]);

  const categoriesWithAll = useMemo(() => {
    return [{ _id: 'all', categoryName: 'All', foodItems: [] }, ...categories];
  }, [categories]);

  const allFoodItems = useMemo(() => {
    return categories.flatMap(cat => cat.foodItems || []);
  }, [categories]);

  const filteredItems = useMemo(() => {
    let items = activeCategory === 'all' 
      ? [...allFoodItems]
      : (categories.find(cat => cat._id === activeCategory)?.foodItems ?? []);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.itemName?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    return items;
  }, [activeCategory, categories, allFoodItems, searchQuery]);

  // Search handlers
  const handleSearchFocus = useCallback(() => setIsSearching(true), []);
  const handleCancelSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
  }, []);
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
  }, []);
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleAddToCart = useCallback((item) => {
    console.log('Add to cart:', item.itemName);
  }, []);

  // Render search results
  const renderSearchResult = useCallback(({ item }) => (
    <FoodItemCard item={item} onAdd={handleAddToCart} />
  ), [handleAddToCart]);

  const keyExtractor = useCallback((item) => item._id, []);
  const renderCategory = useCallback(({ item }) => (
    <CategoryPill
      name={item.categoryName}
      active={activeCategory === item._id}
      onPress={() => setActiveCategory(item._id)}
    />
  ), [activeCategory]);

  const renderCombo = useCallback(({ item }) => (
    <ComboCard item={item} onAdd={handleAddToCart} />
  ), [handleAddToCart]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingTxt}>Loading menu…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="wifi-outline" size={normalize(52)} color="#ccc" />
        <Text style={styles.errorTxt}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
          <Text style={styles.retryTxt}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Search View
  if (isSearching) {
    const searchResults = allFoodItems.filter(item => {
      const query = searchQuery.toLowerCase();
      return item.itemName?.toLowerCase().includes(query) ||
             item.description?.toLowerCase().includes(query);
    });

    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={[styles.searchHeader, { paddingTop: insets.top + scale(8) }]}>
          <View style={styles.searchBarFull}>
            <Ionicons name="search-outline" size={normalize(20)} color="#999" />
            <TextInput
              style={styles.searchInputFull}
              placeholder="Search for dishes..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholderTextColor="#999"
              autoFocus={true}
              returnKeyType="search"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={normalize(20)} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleCancelSearch} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={searchResults}
          keyExtractor={keyExtractor}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.searchResultsContainer}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          ListEmptyComponent={
            <View style={styles.emptySearchState}>
              <Ionicons name="search-outline" size={normalize(60)} color="#ddd" />
              <Text style={styles.emptySearchTitle}>No results found</Text>
              <Text style={styles.emptySearchSubtitle}>Try searching with different keywords</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  // Main View
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity, top: insets.top }]}>
        <TouchableOpacity style={styles.stickySearchContainer} onPress={handleSearchFocus} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={normalize(18)} color="#999" />
          <Text style={styles.stickySearchPlaceholder}>Search menu...</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} colors={[GREEN]} />
        }
      >
        {/* Header */}
        <View style={[styles.headerContainer, { paddingTop: insets.top + scale(12) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={normalize(22)} color="#222" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.restaurantName}>{restaurant?.restaurantName}</Text>
            <Text style={styles.restaurantLocation}>{restaurant?.Location}</Text>
          </View>

          <ProfilePicture imageUrl={restaurant?.profileImage} />
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={styles.searchContainer} onPress={handleSearchFocus} activeOpacity={0.7}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={normalize(20)} color="#999" />
            <Text style={styles.searchPlaceholder}>Search for dishes...</Text>
          </View>
        </TouchableOpacity>

        {/* Categories - Horizontal FlatList optimized */}
        {categoriesWithAll.length > 0 && (
          <View style={styles.categoryWrap}>
            <FlatList
              horizontal
              data={categoriesWithAll}
              keyExtractor={keyExtractor}
              renderItem={renderCategory}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              initialNumToRender={8}
              windowSize={5}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Combos - Optimized FlatList for smooth horizontal scrolling */}
        {liveCombos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Combo Deals</Text>
              <Text style={styles.sectionCount}>{liveCombos.length} combos</Text>
            </View>
            <FlatList
              horizontal
              data={liveCombos}
              keyExtractor={keyExtractor}
              renderItem={renderCombo}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.comboList}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              initialNumToRender={3}
              windowSize={3}
              decelerationRate="fast"
              snapToAlignment="start"
              snapToInterval={SCREEN_WIDTH * 0.45}
              getItemLayout={(data, index) => ({
                length: SCREEN_WIDTH * 0.45,
                offset: (SCREEN_WIDTH * 0.45) * index,
                index,
              })}
            />
          </View>
        )}

        {/* Food Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'all' ? 'All Items' : categories.find(c => c._id === activeCategory)?.categoryName}
            </Text>
            <Text style={styles.sectionCount}>{filteredItems.length} items</Text>
          </View>

          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fast-food-outline" size={normalize(40)} color="#ddd" />
              <Text style={styles.emptyTxt}>No items in this category</Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <FoodItemCard key={item._id} item={item} onAdd={handleAddToCart} />
            ))
          )}
        </View>

        <View style={{ height: scale(40) }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // Common
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: scale(24), backgroundColor: '#fff',
  },
  loadingTxt: { marginTop: scale(12), fontSize: normalize(14), color: '#999' },
  errorTxt: { marginTop: scale(12), fontSize: normalize(14), color: '#666', textAlign: 'center' },
  retryBtn: { marginTop: scale(20), backgroundColor: GREEN, paddingHorizontal: scale(28), paddingVertical: scale(12), borderRadius: scale(24) },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: normalize(14) },

  // Veg Dot
  vdBox: { width: normalize(14), height: normalize(14), borderRadius: 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  vdDot: { width: normalize(6), height: normalize(6), borderRadius: 3 },

  // Sticky Header
  stickyHeader: { position: 'absolute', left: 0, right: 0, zIndex: 99, backgroundColor: '#fff', paddingVertical: scale(8), paddingHorizontal: scale(16), borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  stickySearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: scale(8), gap: scale(8) },
  stickySearchPlaceholder: { fontSize: normalize(14), color: '#999' },

  // Header
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingBottom: scale(12), backgroundColor: '#fff' },
  backBtn: { width: scale(38), height: scale(38), borderRadius: scale(19), backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  restaurantName: { fontSize: normalize(16), fontWeight: '700', color: '#222' },
  restaurantLocation: { fontSize: normalize(11), color: '#888', marginTop: 2 },
  
  // Profile
  profileContainer: { width: scale(38), height: scale(38), borderRadius: scale(19), backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  profilePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  // Search
  searchContainer: { paddingHorizontal: scale(16), paddingBottom: scale(12) },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(12), gap: scale(10) },
  searchPlaceholder: { fontSize: normalize(15), color: '#999' },
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingBottom: scale(12), backgroundColor: '#fff', gap: scale(12) },
  searchBarFull: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(10), gap: scale(10) },
  searchInputFull: { flex: 1, fontSize: normalize(15), color: '#222', padding: 0, margin: 0 },
  cancelBtn: { paddingHorizontal: scale(8) },
  cancelBtnText: { fontSize: normalize(15), color: GREEN, fontWeight: '500' },
  searchResultsContainer: { paddingHorizontal: scale(16), paddingBottom: scale(20) },
  emptySearchState: { alignItems: 'center', justifyContent: 'center', paddingVertical: scale(80), gap: scale(12) },
  emptySearchTitle: { fontSize: normalize(18), fontWeight: '600', color: '#222' },
  emptySearchSubtitle: { fontSize: normalize(14), color: '#999', textAlign: 'center' },

  // Food Item Card
  foodCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: scale(14), padding: scale(12), marginBottom: scale(12), borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  foodImgWrap: { position: 'relative', marginRight: scale(12) },
  foodImg: { width: scale(90), height: scale(90), borderRadius: scale(10), backgroundColor: LIGHT },
  foodImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  foodBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#FFC107', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  foodBadgeTxt: { fontSize: normalize(9), fontWeight: '700', color: '#fff' },
  foodInfo: { flex: 1, justifyContent: 'space-between' },
  foodTopRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: 4 },
  foodDiscountPill: { backgroundColor: '#FFF3E0', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  foodDiscountPillTxt: { fontSize: normalize(9), fontWeight: '700', color: ORANGE },
  foodName: { fontSize: normalize(14), fontWeight: '700', color: '#222', marginBottom: 3 },
  foodDesc: { fontSize: normalize(11), color: '#888', lineHeight: normalize(16), marginBottom: 6 },
  foodBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  foodPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  foodPrice: { fontSize: normalize(15), fontWeight: '800', color: GREEN },
  foodStrikePrice: { fontSize: normalize(11), color: '#aaa', textDecorationLine: 'line-through' },
  foodAddBtn: { backgroundColor: GREEN, borderRadius: scale(8), paddingHorizontal: scale(18), paddingVertical: scale(6) },
  foodAddBtnTxt: { color: '#fff', fontSize: normalize(12), fontWeight: '700' },

  // Combo Card - Optimized
  comboCard: { width: SCREEN_WIDTH * 0.42, backgroundColor: '#fff', borderRadius: scale(14), marginRight: scale(12), borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden' },
  comboImgContainer: { position: 'relative', width: '100%', height: scale(110) },
  comboImg: { width: '100%', height: '100%', backgroundColor: LIGHT },
  comboImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  comboBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: ORANGE, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  comboBadgeTxt: { fontSize: normalize(9), fontWeight: '700', color: '#fff' },
  comboInfo: { padding: scale(10) },
  comboName: { fontSize: normalize(13), fontWeight: '700', color: '#222', marginBottom: 2 },
  comboItems: { fontSize: normalize(10), color: '#888', marginBottom: 8 },
  comboBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comboPrice: { fontSize: normalize(15), fontWeight: '800', color: GREEN },
  comboAddBtn: { backgroundColor: GREEN, borderRadius: scale(6), paddingHorizontal: scale(12), paddingVertical: scale(5) },
  comboAddBtnTxt: { color: '#fff', fontSize: normalize(11), fontWeight: '700' },

  // Category
  categoryWrap: { backgroundColor: '#fff', marginTop: scale(3) },
  categoryList: { paddingHorizontal: scale(16), paddingVertical: scale(8) },
  categoryPill: { paddingHorizontal: scale(14), paddingVertical: scale(7), borderRadius: scale(20), backgroundColor: LIGHT, marginRight: scale(8) },
  categoryPillActive: { backgroundColor: GREEN },
  categoryPillText: { fontSize: normalize(12), fontWeight: '500', color: GREEN },
  categoryPillTextActive: { color: '#fff' },

  // Sections
  section: { paddingHorizontal: scale(16), marginTop: scale(20) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(14) },
  sectionTitle: { fontSize: normalize(17), fontWeight: '800', color: '#222' },
  sectionCount: { fontSize: normalize(12), color: '#aaa', fontWeight: '500' },
  comboList: { paddingRight: scale(16) },
  
  emptyState: { alignItems: 'center', paddingVertical: scale(40), gap: scale(10) },
  emptyTxt: { fontSize: normalize(13), color: '#bbb' },
});