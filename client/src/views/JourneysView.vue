<script setup>
import BaseModal from '../components/BaseModal.vue';
import { computed, onMounted, ref } from 'vue';
import InfoTip from '../components/InfoTip.vue';
import { CalendarDays, Plus, Wallet } from '@lucide/vue';
import JourneyForm from '../components/JourneyForm.vue';
import CategoryBar from '../components/charts/CategoryBar.vue';
import { emptyJourney, useJourneysStore } from '../stores/journeys';
import { useTripsStore } from '../stores/trips';
import { useUiStore } from '../stores/ui';
import { countryLabel } from '../services/geo';
import { money, shortDate } from '../services/format';

const journeys = useJourneysStore();
const trips = useTripsStore();
const ui = useUiStore();
const editing = ref(null);
const saving = ref(false);
const error = ref('');
const freeFlights = computed(() => trips.trips.filter((trip) => !trip.journeyId));

onMounted(() => {
  trips.fetchTrips();
  journeys.fetchJourneys();
});

function startNew() {
  error.value = '';
  editing.value = emptyJourney();
}

async function save(payload) {
  saving.value = true;
  error.value = '';

  try {
    await journeys.saveJourney(payload);
    editing.value = null;
  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1>{{ ui.t('journeys.title') }} <InfoTip term="journey" /></h1>
        <p>{{ ui.t('journeys.subtitle') }}</p>
      </div>
      <button class="button" type="button" @click="startNew">
        <Plus :size="18" />
        {{ ui.t('journeys.new') }}
      </button>
    </header>

    <div v-if="journeys.error" class="error">{{ journeys.error }}</div>

    <div v-if="freeFlights.length && journeys.loaded" class="card nudge-card">
      <p>{{ ui.t('journeys.freeFlights').replace('{n}', freeFlights.length) }}</p>
      <button class="ghost-button" type="button" @click="startNew">{{ ui.t('journeys.groupThem') }}</button>
    </div>

    <div v-if="journeys.loading && !journeys.loaded" class="empty-state">{{ ui.t('dashboard.loading') }}</div>
    <div v-else-if="!journeys.journeys.length" class="empty-state">{{ ui.t('journeys.empty') }}</div>

    <div v-else class="journey-list">
      <RouterLink v-for="summary in journeys.summaries" :key="summary.journey.id" class="card journey-card" :to="{ name: 'journey-detail', params: { id: summary.journey.id } }">
        <div class="journey-card-head">
          <div>
            <h2>{{ summary.journey.title }}</h2>
            <p class="muted">
              {{ summary.journey.destinationCity }}<span v-if="summary.journey.destinationCountry">, {{ countryLabel(summary.journey.destinationCountry, ui.locale) }}</span>
            </p>
          </div>
          <span v-if="summary.journey.rating" class="pill">{{ summary.journey.rating }}/5</span>
        </div>

        <div class="journey-card-meta">
          <span><CalendarDays :size="16" /> {{ shortDate(summary.journey.startDate, ui.locale) }} · {{ summary.days }} {{ ui.t('journeys.days') }}</span>
          <span><Wallet :size="16" /> {{ money(summary.total, 'EUR', ui.locale) }}</span>
          <span v-if="summary.perDay"><strong>{{ money(summary.perDay, 'EUR', ui.locale) }}</strong> / {{ ui.t('journeys.day') }}</span>
        </div>

        <CategoryBar :segments="summary.byCategory" />
      </RouterLink>
    </div>

    <BaseModal v-if="editing" labelledby="journey-form-title" @close="editing = null">
      <JourneyForm :model-value="editing" :flights="trips.trips" :saving="saving" :error="error" @submit="save" @cancel="editing = null" />
    </BaseModal>
  </section>
</template>
