import { defineStore } from 'pinia';
import { api } from '../services/api';
import { useJourneysStore } from './journeys';
import { useTripsStore } from './trips';

// Prenotazioni lette dalle email, in attesa di conferma dell'utente.
export const useInboxStore = defineStore('inbox', {
  state: () => ({
    items: [],
    loaded: false
  }),
  getters: {
    count: (state) => state.items.length
  },
  actions: {
    async fetch() {
      const result = await api.getInbox();
      this.items = result.items;
      this.loaded = true;
    },
    async paste(content) {
      const result = await api.pasteEmail(content);
      this.items = [...result.items, ...this.items];
      return result;
    },
    async confirm(item, payload) {
      const result = await api.importInboxItem(item.id, payload);
      this.items = this.items.filter((entry) => entry.id !== item.id);

      // Aggiorna subito voli e viaggi, senza ricaricare la pagina.
      if (result.trip) useTripsStore().trips.unshift(result.trip);
      if (result.journey) {
        const journeys = useJourneysStore();
        const index = journeys.journeys.findIndex((entry) => entry.id === result.journey.id);
        if (index === -1) journeys.journeys.unshift(result.journey); else journeys.journeys[index] = result.journey;
      }

      return result;
    },
    async dismiss(item) {
      await api.dismissInboxItem(item.id);
      this.items = this.items.filter((entry) => entry.id !== item.id);
    },
  }
});
