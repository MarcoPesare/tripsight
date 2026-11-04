import { defineStore } from 'pinia';
import { api } from '../services/api';

const legacyStorageKey = 'travelcheck_wishlist';

function readLegacyWishlist() {
  try {
    return JSON.parse(localStorage.getItem(legacyStorageKey) || '[]');
  } catch {
    return [];
  }
}

export const useWishlistStore = defineStore('wishlist', {
  state: () => ({
    items: [],
    loaded: false
  }),
  getters: {
    ids: (state) => state.items.map((item) => item.id)
  },
  actions: {
    async fetch() {
      const remote = await api.getWishlist();
      const legacy = readLegacyWishlist();

      // Migrazione una tantum dalla vecchia wishlist salvata solo nel browser.
      if (legacy.length) {
        const merged = [...remote, ...legacy.filter((item) => !remote.some((saved) => saved.id === item.id))];
        this.items = await api.saveWishlist(merged);
        localStorage.removeItem(legacyStorageKey);
      } else {
        this.items = remote;
      }

      this.loaded = true;
    },
    async toggle(city) {
      const previous = this.items;

      if (this.ids.includes(city.id)) {
        this.items = this.items.filter((item) => item.id !== city.id);
      } else {
        this.items = [...this.items, {
          id: city.id,
          name: city.name,
          country: city.country,
          airport: city.airport,
          savedAt: new Date().toISOString()
        }];
      }

      try {
        await api.saveWishlist(this.items);
      } catch (error) {
        this.items = previous;
        throw error;
      }
    }
  }
});
