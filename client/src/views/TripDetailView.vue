<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Edit3, Plane } from '@lucide/vue';
import TripMap from '../components/TripMap.vue';
import { useTripsStore } from '../stores/trips';
import { airlineLabel, airportCityLabel, countryLabel } from '../services/geo';
import { bookingTotalBase, duration, flightCostBase, money, number, shortDate } from '../services/format';
import { tagLabel, tripTypeLabel } from '../services/vocabulary';
import { useJourneysStore } from '../stores/journeys';
import { useUiStore } from '../stores/ui';

const route = useRoute();
const router = useRouter();
const trips = useTripsStore();
const ui = useUiStore();
const journeys = useJourneysStore();
const journey = computed(() => trip.value?.journeyId ? journeys.journeys.find((item) => item.id === trip.value.journeyId) : null);
const trip = computed(() => trips.trips.find((item) => item.id === route.params.id));
const routeTitle = computed(() => trip.value ? `${airportCityLabel(trip.value.departure)} - ${airportCityLabel(trip.value.arrival)}` : '');
const displayedPrice = computed(() => {
  if (!trip.value) return 0;

  const total = Number(trip.value.bookingTotalPrice || trip.value.price || 0);
  const legs = trip.value.fareType === 'round_trip' ? Number(trip.value.bookingLegs || 2) : 1;

  return Math.round((total / legs) * 100) / 100;
});

function editTrip() {
  if (!trip.value) return;

  router.push({ name: 'flights', query: { edit: trip.value.id } });
}

onMounted(async () => {
  if (!trips.trips.length) {
    await trips.fetchTrips();
  }

  if (!journeys.loaded) {
    journeys.fetchJourneys();
  }
});
</script>

<template>
  <section v-if="trip">
    <header class="page-header">
      <div>
        <button class="ghost-button" type="button" @click="router.back()">
          <ArrowLeft :size="18" />
          {{ ui.t('detail.back') }}
        </button>
        <h1>{{ routeTitle }}</h1>
        <p>{{ airlineLabel(trip.airline, trip.airlineCode) }} {{ trip.flightNumber }}</p>
      </div>
      <div class="toolbar">
        <button class="button" type="button" @click="editTrip">
          <Edit3 :size="18" />
          {{ ui.t('detail.edit') }}
        </button>
        <Plane :size="42" class="stats-icon" />
      </div>
    </header>

    <div class="grid split-grid">
      <article class="card form-card">
        <h2>{{ ui.t('detail.details') }}</h2>
        <div class="metric-row">
          <div class="metric"><strong>{{ duration(trip.durationHours, ui.locale) }}</strong><span>{{ ui.t('form.duration') }}</span></div>
          <div class="metric"><strong>{{ number(trip.distanceKm, ui.locale) }}</strong><span>km</span></div>
          <div class="metric"><strong>{{ money(displayedPrice, trip.currency, ui.locale) }}</strong><span>{{ trip.fareType === 'round_trip' ? ui.t('detail.legShare') : ui.t('detail.spend') }}</span></div>
          <div v-if="trip.distanceKm && flightCostBase(trip)" class="metric"><strong>{{ money(flightCostBase(trip) / trip.distanceKm, 'EUR', ui.locale, 3) }}</strong><span>/ km</span></div>
        </div>

        <p v-if="trip.fareType === 'round_trip'" class="timezone-note">
          {{ ui.t('detail.roundTrip') }} {{ money(trip.bookingTotalPrice, trip.currency, ui.locale) }} · {{ trip.bookingLegs || 2 }} {{ ui.t('detail.legs') }}
        </p>
        <p v-if="trip.currency !== 'EUR'" class="muted">≈ {{ money(bookingTotalBase(trip), 'EUR', ui.locale) }} ({{ ui.t('detail.fxAt') }} {{ trip.bookedAt || trip.startDate }})</p>
        <p v-if="trip.bookedAt" class="muted">{{ ui.t('form.bookedAt') }}: {{ shortDate(trip.bookedAt, ui.locale) }}</p>
        <p v-if="journey" class="muted">
          {{ ui.t('form.journey') }}: <RouterLink class="text-link" :to="{ name: 'journey-detail', params: { id: journey.id } }">{{ journey.title }}</RouterLink>
        </p>

        <h2 class="section-title">{{ ui.t('detail.route') }}</h2>
        <p><strong>{{ trip.departure.airportName || trip.departure.airport }}</strong> · {{ airportCityLabel(trip.departure) }}, {{ countryLabel(trip.departure.country, ui.locale) }}</p>
        <p><strong>{{ trip.arrival.airportName || trip.arrival.airport }}</strong> · {{ airportCityLabel(trip.arrival) }}, {{ countryLabel(trip.arrival.country, ui.locale) }}</p>
        <p class="muted">{{ shortDate(trip.startDate, ui.locale) }} <span v-if="trip.endDate && trip.endDate !== trip.startDate">→ {{ shortDate(trip.endDate, ui.locale) }}</span></p>

        <h2 class="section-title">{{ ui.t('detail.notes') }}</h2>
        <p class="muted">{{ trip.notes || ui.t('detail.noNotes') }}</p>

        <template v-if="trip.rating || trip.tags?.length">
          <h2 class="section-title">{{ ui.t('journeys.memory') }}</h2>
          <div class="memory-panel">
            <div>
              <span>{{ ui.t('journeys.rating') }}</span>
              <strong>{{ trip.rating ? `${trip.rating}/5` : '—' }}</strong>
            </div>
            <div>
              <span>{{ ui.t('journeys.type') }}</span>
              <strong>{{ tripTypeLabel(trip.tripType, ui.locale) }}</strong>
            </div>
          </div>
          <div v-if="trip.tags?.length" class="place-list">
            <span v-for="tag in trip.tags" :key="tag" class="pill">{{ tagLabel(tag, ui.locale) }}</span>
          </div>
        </template>
      </article>

      <TripMap :trips="[trip]" />
    </div>
  </section>

  <section v-else class="empty-state">{{ ui.t('detail.notFound') }}</section>
</template>
