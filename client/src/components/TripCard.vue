<script setup>
import { computed, ref, watch } from 'vue';
import { ArrowRight, Calendar, Clock, Edit3, Trash2 } from '@lucide/vue';
import { airlineLabel, airportCityLabel, countryLabel } from '../services/geo';
import { cityImageCredit, cityImageUrl, photoCreditText } from '../services/cityImages';
import { duration, flightCostBase, money, number, shortDate } from '../services/format';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();

const emit = defineEmits(['edit', 'delete']);

const props = defineProps({
  trip: {
    type: Object,
    required: true
  }
});

const trip = computed(() => props.trip);
const routeTitle = computed(() => `${airportCityLabel(trip.value.departure)} - ${airportCityLabel(trip.value.arrival)}`);
const destinationTitle = computed(() => airportCityLabel(trip.value.arrival));
const imageLoaded = ref(false);
const destinationImage = computed(() => cityImageUrl(destinationTitle.value));
const displayedPrice = computed(() => {
  const total = Number(trip.value.bookingTotalPrice || trip.value.price || 0);
  const legs = trip.value.fareType === 'round_trip' ? Number(trip.value.bookingLegs || 2) : 1;

  return Math.round((total / legs) * 100) / 100;
});
const imageCredit = ref(null);

// Cambiando destinazione si riparte dal riquadro di riserva finché la nuova foto non arriva.
watch(destinationTitle, async (city) => {
  imageLoaded.value = false;
  imageCredit.value = null;
  const credit = await cityImageCredit(city);
  if (city === destinationTitle.value) imageCredit.value = credit;
}, { immediate: true });

</script>

<template>
  <article class="card trip-card">
    <div class="trip-card-image">
      <img
        v-if="destinationImage"
        :class="{ 'is-loaded': imageLoaded }"
        :src="destinationImage"
        :alt="destinationTitle"
        loading="lazy"
        @load="imageLoaded = true"
        @error="imageLoaded = false"
      />
      <div class="trip-card-image-fallback" aria-hidden="true">
        <span>{{ trip.arrival?.iata || trip.arrival?.airport || destinationTitle }}</span>
      </div>
      <div class="trip-card-overlay">
        <span>{{ trip.arrival?.iata || trip.arrival?.airport }}</span>
        <strong>{{ destinationTitle }}</strong>
      </div>
    </div>
    <p v-if="imageLoaded && imageCredit" class="photo-credit">
      <a :href="imageCredit.pageUrl" target="_blank" rel="noopener noreferrer">{{ photoCreditText(imageCredit, ui.t('common.photo'), ui.t('common.cropped')) }}</a>
    </p>

    <div class="trip-card-body">
      <div class="trip-card-heading">
        <h2>{{ routeTitle }}</h2>
        <p class="muted">{{ airlineLabel(trip.airline, trip.airlineCode) }} {{ trip.flightNumber }}</p>
      </div>

      <div class="trip-route">
        <span>
          <strong>{{ trip.departure.iata || trip.departure.airport }}</strong>
          {{ airportCityLabel(trip.departure) }}
        </span>
        <ArrowRight :size="20" />
        <span>
          <strong>{{ trip.arrival.iata || trip.arrival.airport }}</strong>
          {{ airportCityLabel(trip.arrival) }}
        </span>
      </div>

      <div class="trip-card-meta-row">
        <p class="trip-country">{{ countryLabel(trip.arrival.country, ui.locale) }}</p>
        <div v-if="displayedPrice" class="fare-chip">
          <span>{{ trip.fareType === 'round_trip' ? ui.t('detail.legShare') : ui.t('form.price') }}</span>
          <strong>{{ money(displayedPrice, trip.currency, ui.locale) }}</strong>
          <small v-if="trip.currency !== 'EUR' && flightCostBase(trip)">≈ {{ money(flightCostBase(trip), 'EUR', ui.locale) }}</small>
        </div>
      </div>

      <div class="metric-row">
        <div class="metric">
          <Clock :size="17" />
          <strong>{{ duration(trip.durationHours, ui.locale) }}</strong>
          <span>{{ ui.t('form.duration') }}</span>
        </div>
        <div class="metric">
          <Calendar :size="17" />
          <strong>{{ shortDate(trip.startDate, ui.locale) }}</strong>
        </div>
        <div class="metric">
          <strong>{{ number(trip.distanceKm, ui.locale) }}</strong>
          <span>km</span>
        </div>
      </div>

      <div class="toolbar">
        <RouterLink class="button" :to="{ name: 'trip-detail', params: { id: trip.id } }">{{ ui.t('common.details') }}</RouterLink>
        <button class="ghost-button" type="button" :aria-label="ui.t('detail.edit')" @click="emit('edit', trip)">
          <Edit3 :size="17" />
        </button>
        <button class="danger-button" type="button" :aria-label="ui.t('common.delete')" @click="emit('delete', trip.id)">
          <Trash2 :size="17" />
        </button>
      </div>
    </div>
  </article>
</template>
