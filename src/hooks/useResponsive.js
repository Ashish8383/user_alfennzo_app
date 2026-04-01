import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { getBreakpoint, getColumns, isTablet, isIPad, wp, hp } from '../utils/responsive';

export const useResponsive = () => {
  const [dims, setDims] = useState(Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    return () => sub.remove();
  }, []);

  const landscape = dims.width > dims.height;

  return {
    width:      dims.width,
    height:     dims.height,
    landscape,
    portrait:   !landscape,
    breakpoint: getBreakpoint(),
    columns:    getColumns(),
    isTablet:   isTablet(),
    isIPad:     isIPad(),
    wp,
    hp,
  };
};