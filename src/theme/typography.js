import { Platform } from 'react-native';

export const FontFamily = {
  regular: Platform.select({ ios: 'System', android: 'Roboto',        default: 'System' }),
  medium:  Platform.select({ ios: 'System', android: 'Roboto-Medium', default: 'System' }),
  bold:    Platform.select({ ios: 'System', android: 'Roboto-Bold',   default: 'System' }),
};

export const FontSize = {
  xs:    11,
  sm:    12,
  base:  14,
  md:    16,
  lg:    18,
  xl:    20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

export const LineHeight = {
  tight:  1.2,
  normal: 1.5,
  loose:  1.8,
};

export const FontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
};