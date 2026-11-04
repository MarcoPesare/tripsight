<script setup>
import BaseModal from '../components/BaseModal.vue';
import { onMounted, ref, toRaw, watch } from 'vue';
import { Plus, Upload } from '@lucide/vue';
import { useRoute, useRouter } from 'vue-router';
import TripCard from '../components/TripCard.vue';
import TripForm from '../components/TripForm.vue';
import { emptyTrip, useTripsStore } from '../stores/trips';
import { useJourneysStore } from '../stores/journeys';
import { useUiStore } from '../stores/ui';

const trips = useTripsStore();
const journeys = useJourneysStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();
const selectedTrip = ref(emptyTrip());
const saving = ref(false);
const resolving = ref(false);
const resolveError = ref('');
const saveError = ref('');
const isTripModalOpen = ref(false);

onMounted(() => {
  trips.fetchTrips();
  if (!journeys.loaded) journeys.fetchJourneys();
});

watch(
  () => [trips.trips, route.query.edit],
  () => syncTripFromQuery(),
  { deep: true, immediate: true }
);

function syncTripFromQuery() {
  const editId = route.query.edit;

  if (!editId) {
    return;
  }

  const trip = trips.trips.find((item) => item.id === editId);

  if (trip) {
    selectedTrip.value = cloneTrip(trip);
    isTripModalOpen.value = true;
  }
}

async function saveTrip(payload) {
  saving.value = true;
  saveError.value = '';

  try {
    await trips.saveTrip(payload);
    closeTripModal();
  } catch (error) {
    saveError.value = error.message;
  } finally {
    saving.value = false;
  }
}

async function resolveFlight(payload) {
  resolving.value = true;
  resolveError.value = '';

  try {
    const resolved = await trips.resolveFlight(payload.flightNumber, payload.startDate, payload.from);
    selectedTrip.value = {
      ...selectedTrip.value,
      ...resolved,
      price: selectedTrip.value.price,
      bookingTotalPrice: selectedTrip.value.bookingTotalPrice,
      currency: selectedTrip.value.currency,
      bookedAt: selectedTrip.value.bookedAt,
      journeyId: selectedTrip.value.journeyId,
      notes: selectedTrip.value.notes,
      rating: selectedTrip.value.rating,
      tripType: selectedTrip.value.tripType,
      tags: selectedTrip.value.tags,
      wouldReturn: selectedTrip.value.wouldReturn
    };
  } catch (error) {
    resolveError.value = error.message;
  } finally {
    resolving.value = false;
  }
}

function editTrip(trip) {
  selectedTrip.value = cloneTrip(trip);
  resolveError.value = '';
  isTripModalOpen.value = true;
  router.replace({ name: 'flights', query: { edit: trip.id } });
}

function cancelEdit() {
  closeTripModal();
}

function startNewTrip() {
  selectedTrip.value = emptyTrip();
  resolveError.value = '';
  isTripModalOpen.value = true;
  router.replace({ name: 'flights' });
}

function closeTripModal() {
  selectedTrip.value = emptyTrip();
  resolveError.value = '';
  saveError.value = '';
  isTripModalOpen.value = false;
  router.replace({ name: 'flights' });
}

function cloneTrip(trip) {
  return JSON.parse(JSON.stringify(toRaw(trip)));
}

async function deleteTrip(id) {
  if (confirm(ui.t('dashboard.confirmDelete'))) {
    await trips.removeTrip(id);
  }
}
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1>{{ ui.t('dashboard.title') }}</h1>
        <p>{{ ui.t('dashboard.subtitle') }}</p>
      </div>
      <div class="toolbar">
        <RouterLink class="ghost-button" :to="{ name: 'import' }">
          <Upload :size="17" />
          {{ ui.t('dashboard.import') }}
        </RouterLink>
        <button class="button" type="button" @click="startNewTrip">
          <Plus :size="18" />
          {{ ui.t('dashboard.new') }}
        </button>
      </div>
    </header>

    <div v-if="trips.error" class="error">{{ trips.error }}</div>

    <div>
      <div v-if="trips.loading" class="empty-state">{{ ui.t('dashboard.loading') }}</div>
      <div v-else-if="!trips.trips.length" class="empty-state">{{ ui.t('dashboard.empty') }}</div>
      <div v-else class="trip-list">
        <TripCard v-for="trip in trips.trips" :key="trip.id" :trip="trip" @edit="editTrip" @delete="deleteTrip" />
      </div>
    </div>

    <BaseModal v-if="isTripModalOpen" labelledby="trip-form-title" @close="closeTripModal">
      <TripForm
        :existing-trips="trips.trips"
        :journeys="journeys.journeys"
        :save-error="saveError"
        :model-value="selectedTrip"
        :resolve-error="resolveError"
        :resolving="resolving"
        :saving="saving"
        @resolve="resolveFlight"
        @submit="saveTrip"
        @cancel="cancelEdit"
      />
    </BaseModal>
  </section>
</template>
