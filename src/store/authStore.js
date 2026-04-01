import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const useAuthStore = create((set) => ({
  token:           null,
  user:            null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    SecureStore.setItemAsync('auth_token', token);
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  // Call this on app start to restore session
  hydrate: async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) set({ token, isAuthenticated: true });
  },
}));