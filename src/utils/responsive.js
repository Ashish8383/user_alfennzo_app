import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Design baseline: iPhone 14 Pro (390 x 844)
const BASE_W = 390;
const BASE_H = 844;

/** Width percentage */
export const wp = (pct) => (SCREEN_W * pct) / 100;

/** Height percentage */
export const hp = (pct) => (SCREEN_H * pct) / 100;

/** Scale a size relative to the design baseline width */
export const scale = (size) => (SCREEN_W / BASE_W) * size;

/** Scale relative to baseline height */
export const verticalScale = (size) => (SCREEN_H / BASE_H) * size;

/**
 * Moderate scale — scales less aggressively on large screens.
 * factor: 0 = no scale, 1 = full scale, 0.5 = recommended
 */
export const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

/** Normalize font sizes across pixel densities */
export const normalize = (size) => {
  const newSize = moderateScale(size);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/** Breakpoints */
export const isTablet  = () => SCREEN_W >= 481;
export const isIPad    = () => SCREEN_W >= 769;

export const getBreakpoint = () => {
  if (SCREEN_W >= 1025) return 'ipadPro';
  if (SCREEN_W >= 769)  return 'ipad';
  if (SCREEN_W >= 481)  return 'tablet';
  return 'phone';
};

/** Grid columns at current screen width */
export const getColumns = () => {
  const bp = getBreakpoint();
  return { phone: 1, tablet: 2, ipad: 3, ipadPro: 4 }[bp];
};