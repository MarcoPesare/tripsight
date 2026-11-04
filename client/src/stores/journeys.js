import { defineStore } from 'pinia';
import { api } from '../services/api';
import { daysBetween, flightCostBase } from '../services/format';
import { useTripsStore } from './trips';

export function emptyJourney() {
  return {
    title: '',
    destinationCity: '',
    destinationCountry: '',
    startDate: '',
    endDate: '',
    flightIds: [],
    expenses: [],
    rating: 0,
    tripType: 'city_break',
    tags: [],
    wouldReturn: null,
    notes: ''
  };
}

// Riepilogo economico di un viaggio: voli collegati + spese, tutto in EUR.
export function journeySummary(journey, trips) {
  const flights = trips.filter((trip) => trip.journeyId === journey.id);
  const byCategory = { flight: flights.reduce((sum, trip) => sum + flightCostBase(trip), 0) };

  (journey.expenses || []).forEach((expense) => {
    byCategory[expense.category] = (byCategory[expense.category] || 0) + Number(expense.amountBase || 0);
  });

  const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
  const days = daysBetween(journey.startDate, journey.endDate);

  return {
    flights,
    byCategory,
    total,
    days,
    perDay: days ? total / days : 0,
    distanceKm: flights.reduce((sum, trip) => sum + Number(trip.distanceKm || 0), 0)
  };
}

export const useJourneysStore = defineStore('journeys', {
  state: () => ({
    journeys: [],
    loading: false,
    loaded: false,
    error: ''
  }),
  getters: {
    summaries() {
      const trips = useTripsStore().trips;
      return this.journeys.map((journey) => ({ journey, ...journeySummary(journey, trips) }));
    },
    // Spese extra-volo totali: i voli sono già contati nello store dei voli.
    extraSpend: (state) => state.journeys.reduce(
      (sum, journey) => sum + (journey.expenses || []).reduce((acc, expense) => acc + Number(expense.amountBase || 0), 0),
      0
    )
  },
  actions: {
    async fetchJourneys() {
      this.loading = true;
      this.error = '';

      try {
        this.journeys = await api.listJourneys();
        this.loaded = true;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    async saveJourney(journey) {
      const saved = journey.id ? await api.updateJourney(journey.id, journey) : await api.createJourney(journey);
      const index = this.journeys.findIndex((item) => item.id === saved.id);

      if (index === -1) {
        this.journeys.unshift(saved);
      } else {
        this.journeys[index] = saved;
      }

      this.journeys.sort((a, b) => b.startDate.localeCompare(a.startDate));
      useTripsStore().setJourneyLinks(saved.id, saved.flightIds);
      return saved;
    },
    async removeJourney(id) {
      await api.deleteJourney(id);
      this.journeys = this.journeys.filter((journey) => journey.id !== id);
      useTripsStore().setJourneyLinks(id, []);
    }
  }
});
