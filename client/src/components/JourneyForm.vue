<script setup>
import { computed, reactive, watch } from 'vue';
import { Plus, Save, Trash2, X } from '@lucide/vue';
import DatePicker from './DatePicker.vue';
import { emptyJourney } from '../stores/journeys';
import { airportCityLabel } from '../services/geo';
import { money, shortDate } from '../services/format';
import { CURRENCIES, EXPENSE_CATEGORIES, TAGS, TRIP_TYPES, categoryLabel, tagLabel, tripTypeLabel } from '../services/vocabulary';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => emptyJourney()
  },
  flights: {
    type: Array,
    default: () => []
  },
  saving: Boolean,
  error: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['submit', 'cancel']);
const form = reactive(emptyJourney());

watch(
  () => props.modelValue,
  (value) => {
    const source = clone({ ...emptyJourney(), ...(value || {}) });
    // Il collegamento vive sul volo: si ricava da lì, così resta coerente anche se cambiato dal form del volo.
    if (source.id) source.flightIds = props.flights.filter((flight) => flight.journeyId === source.id).map((flight) => flight.id);
    Object.assign(form, source);
  },
  { immediate: true, deep: true }
);

// Voli disponibili: liberi o già di questo viaggio, con quelli nelle date del viaggio in cima.
const availableFlights = computed(() => props.flights
  .filter((flight) => !flight.journeyId || flight.journeyId === form.id)
  .map((flight) => ({ flight, inRange: inRange(flight.startDate) }))
  .sort((a, b) => Number(b.inRange) - Number(a.inRange) || a.flight.startDate.localeCompare(b.flight.startDate)));

const canSave = computed(() => Boolean(form.title && form.startDate && form.endDate && form.endDate >= form.startDate));

// structuredClone non accetta i proxy reattivi di Vue.
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function inRange(date) {
  if (!form.startDate || !form.endDate) return false;

  return date >= shiftDate(form.startDate, -1) && date <= shiftDate(form.endDate, 1);
}

function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function toggleFlight(flight) {
  if (form.flightIds.includes(flight.id)) {
    form.flightIds = form.flightIds.filter((id) => id !== flight.id);
    return;
  }

  form.flightIds = [...form.flightIds, flight.id];
  prefillFromFlights();
}

// Compila date e destinazione dai voli scelti, senza sovrascrivere quanto già inserito.
function prefillFromFlights() {
  const selected = props.flights.filter((flight) => form.flightIds.includes(flight.id)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (!selected.length) return;

  const first = selected[0];
  form.startDate ||= first.startDate;
  form.endDate ||= selected.at(-1).endDate || selected.at(-1).startDate;
  form.destinationCity ||= airportCityLabel(first.arrival);
  form.destinationCountry ||= first.arrival?.country || '';
  form.title ||= airportCityLabel(first.arrival);
}

function addExpense() {
  form.expenses = [...form.expenses, {
    category: 'stay',
    label: '',
    amount: 0,
    currency: form.expenses.at(-1)?.currency || 'EUR',
    date: form.startDate
  }];
}

function removeExpense(index) {
  form.expenses = form.expenses.filter((_, itemIndex) => itemIndex !== index);
}

function toggleTag(tag) {
  form.tags = form.tags.includes(tag) ? form.tags.filter((item) => item !== tag) : [...form.tags, tag];
}

function submit() {
  emit('submit', clone({ ...form, expenses: form.expenses.filter((expense) => Number(expense.amount) > 0) }));
}
</script>

<template>
  <form class="card form-card journey-form" @submit.prevent="submit">
    <div class="form-head">
      <div>
        <h2 id="journey-form-title">{{ form.id ? ui.t('journeys.editTitle') : ui.t('journeys.newTitle') }}</h2>
        <p class="muted">{{ ui.t('journeys.formLead') }}</p>
      </div>
      <button class="ghost-button icon-only" type="button" :aria-label="ui.t('common.close')" @click="emit('cancel')">
        <X :size="18" />
      </button>
    </div>

    <div class="form-grid">
      <section class="form-step">
        <h3 class="form-section-title">{{ ui.t('journeys.flights') }}</h3>
        <p v-if="!availableFlights.length" class="muted">{{ ui.t('journeys.noFreeFlights') }}</p>
        <div v-else class="flight-picker">
          <label v-for="{ flight, inRange: suggested } in availableFlights" :key="flight.id" class="flight-option" :class="{ 'is-suggested': suggested }">
            <input type="checkbox" :checked="form.flightIds.includes(flight.id)" @change="toggleFlight(flight)" />
            <span>
              <strong>{{ flight.departure.iata }} → {{ flight.arrival.iata }}</strong>
              {{ airportCityLabel(flight.arrival) }} · {{ shortDate(flight.startDate, ui.locale) }}
            </span>
            <small v-if="suggested" class="pill">{{ ui.t('journeys.inDates') }}</small>
          </label>
        </div>
      </section>

      <section class="form-step">
        <label class="field">
          <span>{{ ui.t('journeys.name') }}</span>
          <input v-model="form.title" required maxlength="120" :placeholder="ui.t('journeys.namePlaceholder')" />
        </label>
        <div class="two-cols">
          <label class="field">
            <span>{{ ui.t('journeys.start') }}</span>
            <DatePicker v-model="form.startDate" required />
          </label>
          <label class="field">
            <span>{{ ui.t('journeys.end') }}</span>
            <DatePicker v-model="form.endDate" required />
          </label>
        </div>
        <div class="two-cols">
          <label class="field">
            <span>{{ ui.t('journeys.city') }}</span>
            <input v-model="form.destinationCity" maxlength="80" />
          </label>
          <label class="field">
            <span>{{ ui.t('journeys.country') }}</span>
            <input v-model="form.destinationCountry" maxlength="2" placeholder="PT" autocapitalize="characters" />
          </label>
        </div>
      </section>

      <section class="form-step">
        <div class="form-section-head">
          <h3 class="form-section-title">{{ ui.t('journeys.expenses') }}</h3>
          <button class="ghost-button" type="button" @click="addExpense">
            <Plus :size="16" />
            {{ ui.t('journeys.addExpense') }}
          </button>
        </div>
        <p class="muted">{{ ui.t('journeys.expensesHint') }}</p>
        <div v-for="(expense, index) in form.expenses" :key="expense.id || index" class="expense-row">
          <select v-model="expense.category" :aria-label="ui.t('journeys.category')">
            <option v-for="category in EXPENSE_CATEGORIES" :key="category" :value="category">{{ categoryLabel(category, ui.locale) }}</option>
          </select>
          <input v-model="expense.label" :placeholder="ui.t('journeys.expenseLabel')" maxlength="120" />
          <input v-model.number="expense.amount" type="number" min="0" step="0.01" inputmode="decimal" :aria-label="ui.t('journeys.amount')" />
          <select v-model="expense.currency" :aria-label="ui.t('form.currency')">
            <option v-for="code in CURRENCIES" :key="code">{{ code }}</option>
          </select>
          <button class="danger-button icon-only" type="button" :aria-label="ui.t('common.delete')" @click="removeExpense(index)">
            <Trash2 :size="16" />
          </button>
          <small v-if="expense.amountBase && expense.currency !== 'EUR'" class="muted expense-fx">≈ {{ money(expense.amountBase, 'EUR', ui.locale) }}</small>
        </div>
      </section>

      <section class="form-step memory-form">
        <h3 class="form-section-title">{{ ui.t('journeys.memory') }}</h3>
        <div class="two-cols">
          <label class="field">
            <span>{{ ui.t('journeys.type') }}</span>
            <select v-model="form.tripType">
              <option v-for="type in TRIP_TYPES" :key="type" :value="type">{{ tripTypeLabel(type, ui.locale) }}</option>
            </select>
          </label>
          <label class="field">
            <span>{{ ui.t('journeys.rating') }}</span>
            <select v-model.number="form.rating">
              <option :value="0">{{ ui.t('journeys.notRated') }}</option>
              <option v-for="score in 5" :key="score" :value="score">{{ score }}/5</option>
            </select>
          </label>
        </div>

        <div class="field">
          <span>{{ ui.t('journeys.tags') }}</span>
          <div class="tag-picker">
            <button v-for="tag in TAGS" :key="tag" :class="{ 'is-active': form.tags.includes(tag) }" type="button" @click="toggleTag(tag)">
              {{ tagLabel(tag, ui.locale) }}
            </button>
          </div>
        </div>

        <div class="field">
          <span>{{ ui.t('journeys.wouldReturn') }}</span>
          <div class="fare-selector compact-selector" role="group">
            <button type="button" :class="{ 'is-active': form.wouldReturn === true }" @click="form.wouldReturn = form.wouldReturn === true ? null : true">{{ ui.t('common.yes') }}</button>
            <button type="button" :class="{ 'is-active': form.wouldReturn === false }" @click="form.wouldReturn = form.wouldReturn === false ? null : false">{{ ui.t('common.no') }}</button>
          </div>
        </div>

        <label class="field">
          <span>{{ ui.t('form.notes') }}</span>
          <textarea v-model="form.notes" maxlength="4000"></textarea>
        </label>
      </section>

      <div v-if="error" class="error">{{ error }}</div>

      <div class="toolbar form-actions">
        <button class="ghost-button" type="button" @click="emit('cancel')">{{ ui.t('form.cancel') }}</button>
        <button class="button" type="submit" :disabled="saving || !canSave" :aria-describedby="canSave ? undefined : 'journey-save-hint'">
          <Save :size="18" />
          {{ saving ? ui.t('form.saving') : ui.t('form.save') }}
        </button>
        <p v-if="!canSave" id="journey-save-hint" class="form-hint">{{ ui.t('journeys.saveHint') }}</p>
      </div>
    </div>
  </form>
</template>
