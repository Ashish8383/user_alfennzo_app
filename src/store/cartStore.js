import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items:    [],
  outletId: null,
  tableNo:  null,

  addItem: (item) =>
    set((s) => {
      const exists = s.items.find((i) => i.id === item.id);
      if (exists) {
        return {
          items: s.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...s.items, { ...item, quantity: 1 }] };
    }),

  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  updateQty: (id, qty) =>
    set((s) => ({
      items: qty <= 0
        ? s.items.filter((i) => i.id !== id)
        : s.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
    })),

  clearCart: () => set({ items: [], outletId: null, tableNo: null }),

  // Computed (call as function: useCartStore(s => s.total()))
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));