import {useCallback } from 'react';

let _showToast = null;

export const showToast = (options) => {
  if (_showToast) _showToast(options);
};

export function useToastController() {
  const registerHandler = useCallback((handler) => {
    _showToast = handler;
  }, []);

  return { registerHandler };
}