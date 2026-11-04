<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight, Link2, PencilLine, RefreshCw, Save, X } from '@lucide/vue';
import AirportSearch from './AirportSearch.vue';
import InfoTip from './InfoTip.vue';
import DatePicker from './DatePicker.vue';
import { emptyTrip } from '../stores/trips';
import { airlineLabel, airportCityLabel } from '../services/geo';
import { duration, money, number } from '../services/format';
import { CURRENCIES } from '../services/vocabulary';
import { personalRouteAverage } from '../services/priceEstimate';
import { api } from '../services/api';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => emptyTrip()
  },
  existingTrips: {
    type: Array,
    default: () => []
  },
  journeys: {
    type: Array,
    default: () => []
  },
  saving: Boolean,
  resolving: Boolean,
  resolveError: {
    type: String,
    default: ''
  },
  saveError: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['resolve', 'submit', 'cancel']);
const form = reactive(emptyTrip());
const currentStep = ref(0);
const manualEntry = ref(false);
const steps = computed(() => [ui.t('form.stepFlight'), ui.t('form.stepTicket'), ui.t('form.stepJourney')]);

const isEditing = computed(() => Boolean(form.id));
const hasRoute = computed(() => Boolean(form.departure.iata && form.arrival.iata));
const canSave = computed(() => Boolean(hasRoute.value && form.flightNumber && form.startDate));
const canGoNext = computed(() => currentStep.value === 0 ? canSave.value : true);
const matchingBookings = computed(() => props.existingTrips.filter((trip) => {
  if (!canSave.value || trip.id === form.id || trip.fareType !== 'round_trip' || !trip.bookingId) {
    return false;
  }

  return trip.departure?.iata === form.arrival.iata && trip.arrival?.iata === form.departure.iata;
}));
const selectedBooking = computed(() => matchingBookings.value.find((trip) => trip.bookingId === form.bookingId));
const isLinkedToBooking = computed(() => Boolean(selectedBooking.value && form.fareType === 'round_trip'));
// Prezzo medio di mercato della tratta (sola andata) dal server; per un A/R il totale vale due tratte.
const fareEstimate = ref(null);
const fareKey = computed(() => (hasRoute.value && currentStep.value === 1
  ? `${form.departure.iata}-${form.arrival.iata}-${String(form.startDate || '').slice(0, 7)}`
  : ''));
const legsInTicket = computed(() => (form.fareType === 'round_trip' ? 2 : 1));
const priceEstimate = computed(() => (fareEstimate.value && !isLinkedToBooking.value
  ? { ...fareEstimate.value, amount: fareEstimate.value.amount * legsInTicket.value }
  : null));
const personalAverage = computed(() => (hasRoute.value
  ? personalRouteAverage({ from: form.departure.iata, to: form.arrival.iata, trips: props.existingTrips.filter((trip) => trip.id !== form.id) })
  : null));

let loadedFareKey = '';
watch(fareKey, async (key) => {
  if (!key || key === loadedFareKey) return;
  // Tratta o mese cambiati: la stima precedente non vale più.
  fareEstimate.value = null;
  loadedFareKey = key;
  try {
    const estimate = await api.fareEstimate(form.departure.iata, form.arrival.iata, form.startDate);
    if (key === fareKey.value) fareEstimate.value = estimate;
  } catch {
    // Senza stima il campo prezzo resta semplicemente da compilare a mano.
    if (key === fareKey.value) fareEstimate.value = null;
  }
});

function estimateDetail(estimate) {
  if (estimate.source !== 'market') return ui.t('form.estimateSource.distance');
  const month = new Date(`${estimate.month}-15T12:00:00`).toLocaleDateString(ui.locale === 'en' ? 'en-GB' : 'it-IT', { month: 'long', year: 'numeric' });
  return ui.t('form.estimateSource.market').replace('{route}', `${form.departure.iata}–${form.arrival.iata}`).replace('{month}', month).replace('{n}', estimate.count);
}

// "da 10 € · tipico 17 €" per le tariffe di mercato, solo il valore per la stima per distanza.
function estimateHeadline(estimate) {
  const amount = money(estimate.amount, 'EUR', ui.locale);
  if (estimate.source !== 'market') return ui.t('form.estimateRough').replace('{amount}', amount);
  return ui.t('form.estimateRange').replace('{low}', money(estimate.low * legsInTicket.value, 'EUR', ui.locale)).replace('{amount}', amount);
}

function useEstimate() {
  form.bookingTotalPrice = priceEstimate.value.amount;
  form.currency = 'EUR';
}

const displayedTripPrice = computed(() => {
  const total = Number(form.bookingTotalPrice || form.price || 0);
  const legs = form.fareType === 'round_trip' ? Number(form.bookingLegs || 2) : 1;

  return Math.round((total / legs) * 100) / 100;
});
// Viaggi che contengono la data del volo, proposti per primi.
const sortedJourneys = computed(() => [...props.journeys].sort((a, b) => Number(containsDate(b)) - Number(containsDate(a))));

watch(
  () => props.modelValue,
  (value) => {
    Object.assign(form, normalizeTripForm(value));
    currentStep.value = 0;
    manualEntry.value = Boolean(value?.id && !value?.departureTimeUtc);
  },
  { immediate: true, deep: true }
);

watch(() => props.resolveError, (error) => {
  // Se il provider non trova il volo (tipico per voli passati) si passa all'inserimento manuale.
  if (error) manualEntry.value = true;
});

function containsDate(journey) {
  return Boolean(form.startDate && journey.startDate <= form.startDate && journey.endDate >= form.startDate);
}

function submit() {
  const payload = normalizeTripForm(form);
  payload.price = displayedTripPrice.value;
  payload.bookingTotalPrice = Number(form.bookingTotalPrice || 0);
  payload.bookingLegs = form.fareType === 'round_trip' ? Number(form.bookingLegs || 2) : 1;

  emit('submit', payload);
}

function resolveFlight(from = '') {
  emit('resolve', {
    flightNumber: form.flightNumber,
    startDate: form.startDate,
    from
  });
}

// Tratte alternative con lo stesso numero volo, restituite dalla ricerca.
const legOptions = computed(() => props.modelValue?.legs || []);
// Orari presi dall'orario attuale della compagnia per un volo già passato: possono differire.
const timesApproximate = computed(() => props.modelValue?.timesSource === 'timetable'
  && form.startDate && form.startDate < new Date().toISOString().slice(0, 10));

function nextStep() {
  if (currentStep.value < steps.value.length - 1 && canGoNext.value) {
    currentStep.value += 1;
  }
}

function previousStep() {
  if (currentStep.value > 0) {
    currentStep.value -= 1;
  }
}

function goToStep(index) {
  if (index === 0 || canSave.value) {
    currentStep.value = index;
  }
}

function setFareType(type) {
  form.fareType = type === 'round_trip' ? 'round_trip' : 'one_way';
  form.bookingLegs = form.fareType === 'round_trip' ? 2 : 1;

  if (form.fareType === 'one_way') {
    form.bookingId = '';
    form.bookingTotalPrice = Number(form.price || 0);
  } else {
    form.bookingTotalPrice = Number(form.bookingTotalPrice || form.price || 0);
  }
}

function linkBooking(bookingId) {
  const booking = matchingBookings.value.find((trip) => trip.bookingId === bookingId);

  if (!booking) {
    form.bookingId = '';
    return;
  }

  form.fareType = 'round_trip';
  form.bookingId = booking.bookingId;
  form.bookingTotalPrice = Number(booking.bookingTotalPrice || booking.price || 0);
  form.bookingLegs = Number(booking.bookingLegs || 2);
  form.currency = booking.currency || form.currency;
  form.bookedAt = booking.bookedAt || form.bookedAt;
  form.price = 0;
}

function normalizePlace(place, fallback) {
  const source = place && typeof place === 'object' ? place : {};

  return {
    ...fallback,
    airport: source.airport || '',
    airportName: source.airportName || '',
    iata: source.iata || '',
    icao: source.icao || '',
    city: source.city || '',
    country: source.country || '',
    lat: Number(source.lat || 0),
    lng: Number(source.lng || 0)
  };
}

function normalizeTripForm(value = {}) {
  const fallback = emptyTrip();
  const source = value && typeof value === 'object' ? value : {};

  return {
    ...fallback,
    ...source,
    id: source.id,
    title: source.title || '',
    airline: source.airline || '',
    flightNumber: source.flightNumber || '',
    startDate: source.startDate || '',
    endDate: source.endDate || '',
    bookedAt: source.bookedAt || '',
    journeyId: source.journeyId || '',
    departureTime: source.departureTime || '',
    arrivalTime: source.arrivalTime || '',
    durationHours: Number(source.durationHours || 0),
    distanceKm: Number(source.distanceKm || 0),
    price: Number(source.price || 0),
    fareType: source.fareType === 'round_trip' ? 'round_trip' : 'one_way',
    bookingId: source.bookingId || '',
    bookingTotalPrice: Number(source.bookingTotalPrice ?? source.price ?? 0),
    bookingLegs: Number(source.bookingLegs || (source.fareType === 'round_trip' ? 2 : 1)),
    currency: source.currency || 'EUR',
    notes: source.notes || '',
    tags: Array.isArray(source.tags) ? [...source.tags] : [],
    airlineCode: source.airlineCode || '',
    departure: normalizePlace(source.departure, fallback.departure),
    arrival: normalizePlace(source.arrival, fallback.arrival)
  };
}
</script>

<template>
  <form class="card form-card" @submit.prevent="submit">
    <div class="form-head">
      <div>
        <h2 id="trip-form-title">{{ isEditing ? ui.t('form.editTitle') : ui.t('form.newTitle') }}</h2>
        <p class="muted">{{ steps[currentStep] }}</p>
      </div>
      <button class="ghost-button icon-only" type="button" :aria-label="ui.t('common.close')" @click="emit('cancel')">
        <X :size="18" />
      </button>
    </div>

    <div class="stepper">
      <button
        v-for="(step, index) in steps"
        :key="step"
        :class="{ 'is-active': currentStep === index, 'is-complete': currentStep > index }"
        :disabled="index > 0 && !canSave"
        type="button"
        @click="goToStep(index)"
      >
        <span>{{ index + 1 }}</span>
        {{ step }}
      </button>
    </div>

    <div class="form-grid">
      <section v-if="currentStep === 0" class="form-step">
        <div class="two-cols">
          <label class="field">
            <span>{{ ui.t('form.flightNumber') }}</span>
            <input v-model="form.flightNumber" required placeholder="AZ792" autocapitalize="characters" />
          </label>
          <label class="field">
            <span>{{ ui.t('form.flightDate') }}</span>
            <DatePicker v-model="form.startDate" required />
          </label>
        </div>

        <div class="toolbar">
          <button class="button" type="button" :disabled="resolving || !form.flightNumber || !form.startDate" @click="resolveFlight()">
            <RefreshCw :size="18" />
            {{ resolving ? ui.t('form.retrieving') : ui.t('form.retrieve') }}
          </button>
          <button v-if="!manualEntry" class="ghost-button" type="button" @click="manualEntry = true">
            <PencilLine :size="17" />
            {{ ui.t('form.manual') }}
          </button>
        </div>

        <div v-if="resolveError" class="error">{{ resolveError }} — {{ ui.t('form.manualHint') }}</div>

        <div v-if="manualEntry" class="two-cols">
          <AirportSearch v-model="form.departure" :label="ui.t('form.departure')" />
          <AirportSearch v-model="form.arrival" :label="ui.t('form.arrival')" />
        </div>

        <div v-if="legOptions.length > 1" class="leg-picker" role="group" :aria-label="ui.t('form.legsTitle')">
          <p>{{ ui.t('form.legsTitle') }}</p>
          <button
            v-for="leg in legOptions"
            :key="`${leg.from}-${leg.to}`"
            type="button"
            :class="{ 'is-active': form.departure.iata === leg.from && form.arrival.iata === leg.to }"
            :aria-pressed="form.departure.iata === leg.from && form.arrival.iata === leg.to"
            :disabled="resolving"
            @click="resolveFlight(leg.from)"
          >
            {{ leg.from }} → {{ leg.to }} <small v-if="leg.departureTime">{{ leg.departureTime }}</small>
          </button>
        </div>

        <section v-if="hasRoute" class="flight-summary compact-summary">
          <div>
            <span>{{ ui.t('form.route') }}</span>
            <strong>{{ form.departure.iata }} · {{ airportCityLabel(form.departure) }} → {{ form.arrival.iata }} · {{ airportCityLabel(form.arrival) }}</strong>
          </div>
          <div v-if="form.airline || form.airlineCode">
            <span>{{ ui.t('form.airline') }}</span>
            <strong>{{ airlineLabel(form.airline, form.airlineCode) }} <span v-if="form.airlineCode">({{ form.airlineCode }})</span></strong>
          </div>
          <div v-if="form.departureTime">
            <span>{{ ui.t('form.departure') }}</span>
            <strong>{{ form.departureTime }}</strong>
          </div>
          <div v-if="form.arrivalTime">
            <span>{{ ui.t('form.arrival') }}</span>
            <strong>{{ form.arrivalTime }}</strong>
          </div>
          <div v-if="form.durationHours">
            <span>{{ ui.t('form.duration') }}</span>
            <strong>{{ duration(form.durationHours, ui.locale) }}</strong>
          </div>
          <div v-if="form.distanceKm">
            <span>{{ ui.t('form.distance') }}</span>
            <strong>{{ number(form.distanceKm, ui.locale) }} km</strong>
          </div>
          <p v-if="timesApproximate" class="muted times-note">{{ ui.t('form.timesApproximate') }}</p>
        </section>
      </section>

      <section v-if="currentStep === 1" class="form-step">
        <div class="fare-selector" role="group" :aria-label="ui.t('form.fareType')">
          <button type="button" :class="{ 'is-active': form.fareType === 'one_way' }" @click="setFareType('one_way')">{{ ui.t('form.oneWay') }}</button>
          <button type="button" :class="{ 'is-active': form.fareType === 'round_trip' }" @click="setFareType('round_trip')">{{ ui.t('form.roundTrip') }}</button>
          <InfoTip term="legShare" />
        </div>

        <label v-if="matchingBookings.length" class="field">
          <span>{{ ui.t('form.linkBooking') }}</span>
          <select :value="form.bookingId" @change="linkBooking($event.target.value)">
            <option value="">{{ ui.t('form.noLink') }}</option>
            <option v-for="booking in matchingBookings" :key="booking.id" :value="booking.bookingId">
              {{ airportCityLabel(booking.departure) }} → {{ airportCityLabel(booking.arrival) }} · {{ money(booking.bookingTotalPrice || booking.price, booking.currency, ui.locale) }}
            </option>
          </select>
        </label>

        <div v-if="isLinkedToBooking" class="success booking-hint">
          <Link2 :size="17" />
          {{ ui.t('form.linkedHint') }} {{ money(form.bookingTotalPrice, form.currency, ui.locale) }} · {{ ui.t('form.legShare') }} {{ money(displayedTripPrice, form.currency, ui.locale) }}
        </div>

        <div class="two-cols">
          <label class="field">
            <span>{{ form.fareType === 'round_trip' ? ui.t('form.ticketTotal') : ui.t('form.price') }}</span>
            <input v-model.number="form.bookingTotalPrice" :disabled="isLinkedToBooking" min="0" step="0.01" type="number" inputmode="decimal" aria-describedby="price-estimate" />
          </label>
          <label class="field">
            <span>{{ ui.t('form.currency') }}</span>
            <select v-model="form.currency" :disabled="isLinkedToBooking">
              <option v-for="code in CURRENCIES" :key="code">{{ code }}</option>
            </select>
          </label>
        </div>

        <p v-if="priceEstimate" id="price-estimate" class="price-estimate">
          <span>
            <strong>{{ estimateHeadline(priceEstimate) }}</strong>{{ ' ' }}
            <small class="muted">· {{ estimateDetail(priceEstimate) }}</small>
            <small v-if="personalAverage" class="muted price-estimate-own">
              {{ ui.t('form.yourAverage').replace('{n}', personalAverage.count).replace('{amount}', money(personalAverage.amount * legsInTicket, 'EUR', ui.locale)) }}
            </small>
          </span>
          <button v-if="Number(form.bookingTotalPrice) !== priceEstimate.amount" class="ghost-button" type="button" @click="useEstimate">{{ ui.t('form.useEstimate') }}</button>
        </p>

        <label class="field">
          <span>{{ ui.t('form.bookedAt') }}</span>
          <DatePicker v-model="form.bookedAt" />
          <small class="muted">{{ ui.t('form.bookedAtHint') }}</small>
        </label>

        <p v-if="form.currency !== 'EUR'" class="muted fare-note">{{ ui.t('form.fxNote') }} <InfoTip term="fx" /></p>
        <p v-if="form.fareType === 'round_trip' && !isLinkedToBooking" class="muted fare-note">
          {{ ui.t('form.roundTripNote') }} {{ money(displayedTripPrice, form.currency, ui.locale) }}.
        </p>
      </section>

      <section v-if="currentStep === 2" class="form-step memory-form">
        <label class="field">
          <span>{{ ui.t('form.journey') }}</span>
          <select v-model="form.journeyId">
            <option value="">{{ ui.t('form.noJourney') }}</option>
            <option v-for="journey in sortedJourneys" :key="journey.id" :value="journey.id">
              {{ journey.title }} · {{ journey.startDate }} → {{ journey.endDate }}
            </option>
          </select>
          <small class="muted">{{ ui.t('form.journeyHint') }}</small>
        </label>

        <label class="field">
          <span>{{ ui.t('form.notes') }}</span>
          <textarea v-model="form.notes" :placeholder="ui.t('form.notesPlaceholder')"></textarea>
        </label>
      </section>

      <div v-if="saveError" class="error">{{ saveError }}</div>

      <div class="toolbar form-actions">
        <button class="ghost-button" type="button" :disabled="currentStep === 0" @click="previousStep">
          <ChevronLeft :size="18" />
          {{ ui.t('common.back') }}
        </button>
        <button v-if="currentStep < steps.length - 1" class="button" type="button" :disabled="!canGoNext" @click="nextStep">
          {{ ui.t('common.next') }}
          <ChevronRight :size="18" />
        </button>
        <button v-else class="button" type="submit" :disabled="saving || !canSave">
          <Save :size="18" />
          {{ saving ? ui.t('form.saving') : ui.t('form.save') }}
        </button>
      </div>
    </div>
  </form>
</template>
