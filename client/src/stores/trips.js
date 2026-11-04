import { defineStore } from 'pinia';
import { api } from '../services/api';
import { airportCityLabel } from '../services/geo';
import { bookingTotalBase } from '../services/format';

const sampleTrip = {
  title: '',
  airline: '',
  airlineCode: '',
  flightNumber: '',
  startDate: '',
  endDate: '',
  departureTime: '',
  arrivalTime: '',
  departureTimeUtc: '',
  arrivalTimeUtc: '',
  durationHours: 0,
  distanceKm: 0,
  price: 0,
  fareType: 'one_way',
  bookingId: '',
  bookingTotalPrice: 0,
  bookingLegs: 1,
  bookedAt: '',
  journeyId: '',
  currency: 'EUR',
  notes: '',
  rating: 0,
  tripType: 'city_break',
  tags: [],
  wouldReturn: null,
  timezoneShiftHours: null,
  timezoneNote: '',
  departure: { airport: '', airportName: '', iata: '', icao: '', city: '', country: '', lat: 0, lng: 0 },
  arrival: { airport: '', airportName: '', iata: '', icao: '', city: '', country: '', lat: 0, lng: 0 }
};

export function emptyTrip() {
  return structuredClone(sampleTrip);
}

export const useTripsStore = defineStore('trips', {
  state: () => ({
    trips: [],
    loading: false,
    error: ''
  }),
  getters: {
    totalHours: (state) => state.trips.reduce((sum, trip) => sum + Number(trip.durationHours || 0), 0),
    totalDistance: (state) => state.trips.reduce((sum, trip) => sum + Number(trip.distanceKm || 0), 0),
    // Spesa voli in EUR: un biglietto A/R conta una volta sola anche se ha due tratte.
    totalSpend: (state) => {
      const bookings = new Set();

      return state.trips.reduce((sum, trip) => {
        const bookingId = trip.bookingId || trip.id;
        if (bookings.has(bookingId)) {
          return sum;
        }

        bookings.add(bookingId);
        return sum + bookingTotalBase(trip);
      }, 0);
    },
    countries: (state) => uniquePlaces(state.trips, 'country'),
    cities: (state) => uniquePlaces(state.trips, 'city', (trip) => [airportCityLabel(trip.departure), airportCityLabel(trip.arrival)]),
    airports: (state) => uniquePlaces(state.trips, 'airport')
  },
  actions: {
    async fetchTrips() {
      this.loading = true;
      this.error = '';

      try {
        this.trips = await api.listTrips();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    async saveTrip(trip) {
      const saved = trip.id ? await api.updateTrip(trip.id, trip) : await api.createTrip(trip);
      const index = this.trips.findIndex((item) => item.id === saved.id);

      if (index === -1) {
        this.trips.unshift(saved);
      } else {
        this.trips[index] = saved;
      }

      return saved;
    },
    async resolveFlight(flightNumber, date, from) {
      return api.resolveFlight(flightNumber, date, from);
    },
    async removeTrip(id) {
      await api.deleteTrip(id);
      this.trips = this.trips.filter((trip) => trip.id !== id);
    },
    setJourneyLinks(journeyId, flightIds) {
      const wanted = new Set(flightIds);
      this.trips.forEach((trip) => {
        if (wanted.has(trip.id)) {
          trip.journeyId = journeyId;
        } else if (trip.journeyId === journeyId) {
          trip.journeyId = '';
        }
      });
    }
  }
});

function uniquePlaces(trips, key, mapper) {
  const values = new Set();

  trips.forEach((trip) => {
    const items = typeof mapper === 'function' ? mapper(trip) : [trip.departure?.[key], trip.arrival?.[key]];
    items.filter(Boolean).forEach((value) => values.add(value));
  });

  return [...values].sort((a, b) => a.localeCompare(b));
}
