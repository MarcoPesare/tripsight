<script setup>
import BaseModal from '../components/BaseModal.vue';
import { computed, onMounted, ref } from 'vue';
import InfoTip from '../components/InfoTip.vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Edit3, Trash2 } from '@lucide/vue';
import JourneyForm from '../components/JourneyForm.vue';
import TripMap from '../components/TripMap.vue';
import CategoryBar from '../components/charts/CategoryBar.vue';
import { journeySummary, useJourneysStore } from '../stores/journeys';
import { useTripsStore } from '../stores/trips';
import { useUiStore } from '../stores/ui';
import { airportCityLabel, countryLabel } from '../services/geo';
import { flightCostBase, money, number, shortDate } from '../services/format';
import { categoryLabel, tagLabel, tripTypeLabel } from '../services/vocabulary';

const route = useRoute();
const router = useRouter();
const journeys = useJourneysStore();
const trips = useTripsStore();
const ui = useUiStore();
const editing = ref(false);
const saving = ref(false);
const error = ref('');

const journey = computed(() => journeys.journeys.find((item) => item.id === route.params.id));
const summary = computed(() => journey.value ? journeySummary(journey.value, trips.trips) : null);

onMounted(async () => {
  if (!trips.trips.length) trips.fetchTrips();
  if (!journeys.loaded) await journeys.fetchJourneys();
});

async function save(payload) {
  saving.value = true;
  error.value = '';

  try {
    await journeys.saveJourney(payload);
    editing.value = false;
  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!confirm(ui.t('journeys.confirmDelete'))) return;

  await journeys.removeJourney(journey.value.id);
  router.push({ name: 'journeys' });
}
</script>

<template>
  <section v-if="journey && summary">
    <header class="page-header">
      <div>
        <button class="ghost-button" type="button" @click="router.push({ name: 'journeys' })">
          <ArrowLeft :size="18" />
          {{ ui.t('journeys.title') }}
        </button>
        <h1>{{ journey.title }}</h1>
        <p>
          {{ shortDate(journey.startDate, ui.locale) }} → {{ shortDate(journey.endDate, ui.locale) }} · {{ summary.days }} {{ ui.t('journeys.days') }}
          <span v-if="journey.destinationCountry"> · {{ countryLabel(journey.destinationCountry, ui.locale) }}</span>
        </p>
      </div>
      <div class="toolbar">
        <button class="button" type="button" @click="editing = true">
          <Edit3 :size="18" />
          {{ ui.t('detail.edit') }}
        </button>
        <button class="danger-button" type="button" :aria-label="ui.t('common.delete')" @click="remove">
          <Trash2 :size="18" />
        </button>
      </div>
    </header>

    <div class="grid stats-grid">
      <article class="card stat-card">
        <span>{{ ui.t('journeys.total') }} <InfoTip term="totalSpend" /></span>
        <strong>{{ money(summary.total, 'EUR', ui.locale) }}</strong>
      </article>
      <article class="card stat-card">
        <span>{{ ui.t('journeys.perDay') }} <InfoTip term="perDay" /></span>
        <strong>{{ money(summary.perDay, 'EUR', ui.locale) }}</strong>
      </article>
      <article class="card stat-card">
        <span>{{ ui.t('journeys.flights') }}</span>
        <strong>{{ summary.flights.length }}</strong>
      </article>
      <article class="card stat-card">
        <span>km</span>
        <strong>{{ number(summary.distanceKm, ui.locale) }}</strong>
      </article>
    </div>

    <div class="grid split-grid" style="margin-top: 16px">
      <article class="card form-card">
        <h2>{{ ui.t('journeys.breakdown') }}</h2>
        <CategoryBar v-if="summary.total" :segments="summary.byCategory" />
        <p v-else class="muted">{{ ui.t('journeys.noCosts') }}</p>

        <h2 class="section-title">{{ ui.t('journeys.flights') }}</h2>
        <p v-if="!summary.flights.length" class="muted">{{ ui.t('journeys.noFlights') }}</p>
        <ul class="line-list">
          <li v-for="flight in summary.flights" :key="flight.id">
            <RouterLink class="text-link" :to="{ name: 'trip-detail', params: { id: flight.id } }">
              {{ flight.departure.iata }} → {{ flight.arrival.iata }} · {{ airportCityLabel(flight.arrival) }}
            </RouterLink>
            <span class="muted">{{ shortDate(flight.startDate, ui.locale) }}</span>
            <strong>{{ money(flightCostBase(flight), 'EUR', ui.locale) }}</strong>
          </li>
        </ul>

        <h2 class="section-title">{{ ui.t('journeys.expenses') }}</h2>
        <p v-if="!journey.expenses.length" class="muted">{{ ui.t('journeys.noExpenses') }}</p>
        <ul class="line-list">
          <li v-for="expense in journey.expenses" :key="expense.id">
            <span>{{ categoryLabel(expense.category, ui.locale) }}<span v-if="expense.label" class="muted"> · {{ expense.label }}</span></span>
            <span class="muted">{{ expense.currency !== 'EUR' ? money(expense.amount, expense.currency, ui.locale) : '' }}</span>
            <strong>{{ money(expense.amountBase, 'EUR', ui.locale) }}</strong>
          </li>
        </ul>

        <h2 class="section-title">{{ ui.t('journeys.memory') }}</h2>
        <div class="memory-panel">
          <div>
            <span>{{ ui.t('journeys.rating') }}</span>
            <strong>{{ journey.rating ? `${journey.rating}/5` : '—' }}</strong>
          </div>
          <div>
            <span>{{ ui.t('journeys.type') }}</span>
            <strong>{{ tripTypeLabel(journey.tripType, ui.locale) }}</strong>
          </div>
          <div>
            <span>{{ ui.t('journeys.wouldReturn') }}</span>
            <strong>{{ journey.wouldReturn === null ? '—' : journey.wouldReturn ? ui.t('common.yes') : ui.t('common.no') }}</strong>
          </div>
        </div>
        <div v-if="journey.tags.length" class="place-list">
          <span v-for="tag in journey.tags" :key="tag" class="pill">{{ tagLabel(tag, ui.locale) }}</span>
        </div>
        <p v-if="journey.notes" class="journey-notes">{{ journey.notes }}</p>
      </article>

      <TripMap :trips="summary.flights" />
    </div>

    <BaseModal v-if="editing" labelledby="journey-form-title" @close="editing = false">
      <JourneyForm :model-value="journey" :flights="trips.trips" :saving="saving" :error="error" @submit="save" @cancel="editing = false" />
    </BaseModal>
  </section>

  <section v-else-if="journeys.loaded" class="empty-state">{{ ui.t('journeys.notFound') }}</section>
</template>
