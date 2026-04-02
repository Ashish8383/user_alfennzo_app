import client from './client';

/**
 * Fetch outlet data by QR ID
 * GET /user/getData?qrId=<id>
 *
 * Response shape:
 * {
 *   statusCode: 200,
 *   status: true,
 *   message: "Data found successfully",
 *   data: {
 *     qrData:     { qrId, restaurantId, seatNo, audiNo, type, Area, Line, ... },
 *     restaurant: { restaurantName, Logo, menu: [...], combo: [...], ... }
 *   }
 * }
 */
export const getOutletData = async (qrId) => {
  const response = await client.get('/user/getData', {
    params: { qrId },
  });
  return response;          // axios interceptor already unwraps .data
};

/**
 * Convenience selectors — call these on the resolved response to pull out
 * the parts your screens actually need, so you don't repeat this logic
 * in every component.
 */

/** Returns the raw qrData object (seat, area, line, type…) */
export const selectQrData = (response) => response?.data?.qrData ?? null;

/** Returns the full restaurant object (name, logo, menu, combo…) */
export const selectRestaurant = (response) => response?.data?.restaurant ?? null;

/**
 * Returns a flat list of ALL food items across every category,
 * each annotated with its parent categoryName and categoryImage.
 *
 * Shape of each item:
 * {
 *   _id, itemName, image, description,
 *   price: { full, half },
 *   isVeg, rating, GST,
 *   isLive, comboOnly, recommended,
 *   isDiscountedByRestraurant, discountinPercentageByRestraurant,
 *   customization, availability,
 *   categoryName, categoryImage      ← injected from parent
 * }
 */
export const selectAllFoodItems = (response) => {
  const menu = response?.data?.restaurant?.menu ?? [];
  return menu.flatMap((category) =>
    (category.foodItems ?? []).map((item) => ({
      ...item,
      categoryName:  category.categoryName,
      categoryImage: category.categoryImage,
    })),
  );
};

/**
 * Returns only the live combos (isLive === true).
 *
 * Shape of each combo:
 * {
 *   _id, combofoodName, comboprice, image,
 *   isVeg, isLive, isCustomizable,
 *   isDiscountedByRestraurant, discountinPercentageByRestraurant,
 *   ComboItems: [{ categoryName, foodName, price, quantity }]
 * }
 */
export const selectLiveCombos = (response) => {
  const combos = response?.data?.restaurant?.combo ?? [];
  return combos.filter((c) => c.isLive);
};

/**
 * Returns menu categories with their food items as-is (for sidebar nav).
 * Each entry: { _id, categoryName, categoryImage, foodItems: [...] }
 */
export const selectMenuCategories = (response) =>
  response?.data?.restaurant?.menu ?? [];