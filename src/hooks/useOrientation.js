import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

export const useOrientation = () => {
  const get = () => {
    const { width, height } = Dimensions.get('window');
    return width > height ? 'landscape' : 'portrait';
  };

  const [orientation, setOrientation] = useState(get);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => setOrientation(get()));
    return () => sub.remove();
  }, []);

  return orientation; // 'portrait' | 'landscape'
};