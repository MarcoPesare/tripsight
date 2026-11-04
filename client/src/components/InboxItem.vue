<script setup>
import { computed, reactive, ref } from 'vue';
import { AlertTriangle, BedDouble, Check, Plane, X } from '@lucide/vue';
import { CURRENCIES } from '../services/vocabulary';
import { money } from '../services/format';
import { useJourneysStore } from '../stores/journeys';
import { useUiStore } from '../stores/ui';

// Un elemento "Da confermare": i campi estratti dall'email sono modificabili prima dell'import.
const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['confirm', 'dismiss']);
const ui = useUiStore();
const journeys = useJourneysStore();
const data = reactive({ ...props.item.data });
const busy = ref(false);
const error = ref('');
const isFlight = computed(() => props.item.kind === 'flight');
// Alloggio: proponi per primo il viaggio che contiene la data di check-in.
const journeyId = ref(journeys.journeys.find((journey) => journey.startDate <= data.checkIn && journey.endDate >= data.checkIn)?.id || 'new');
const id = (field) => `inbox-${props.item.id}-${field}`;

async function confirm() {
  busy.value = true;
  error.value = '';

  try {
    await new Promise((resolve, reject) => emit('confirm', { data: { ...data }, journeyId: journeyId.value }, { resolve, reject }));
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <article class="card inbox-item" :class="{ 'is-low': item.confidence === 'low' }">
    <header class="inbox-item-head">
      <span class="inbox-kind">
        <Plane v-if="isFlight" :size="18" />
        <BedDouble v-else :size="18" />
        {{ isFlight ? ui.t('inbox.flight') : ui.t('inbox.stay') }}
      </span>
      <span class="muted inbox-subject">{{ item.subject || ui.t('inbox.pasted') }}</span>
    </header>

    <p v-if="item.confidence === 'low'" class="inbox-warning">
      <AlertTriangle :size="16" />
      {{ ui.t('inbox.lowConfidence') }}
    </p>

    <div v-if="isFlight" class="inbox-fields">
      <label class="field"><span>{{ ui.t('form.flightNumber') }}</span><input :id="id('fn')" v-model="data.flightNumber" /></label>
      <label class="field"><span>{{ ui.t('import.date') }}</span><input :id="id('date')" v-model="data.startDate" type="date" /></label>
      <label class="field"><span>{{ ui.t('form.departure') }}</span><input :id="id('from')" v-model="data.from" maxlength="3" /></label>
      <label class="field"><span>{{ ui.t('form.arrival') }}</span><input :id="id('to')" v-model="data.to" maxlength="3" /></label>
      <label class="field"><span>{{ data.fareType === 'round_trip' ? ui.t('form.ticketTotal') : ui.t('form.price') }}</span><input :id="id('price')" v-model.number="data.price" type="number" min="0" step="0.01" /></label>
      <label class="field"><span>{{ ui.t('form.currency') }}</span><select :id="id('cur')" v-model="data.currency"><option v-for="code in CURRENCIES" :key="code">{{ code }}</option></select></label>
    </div>

    <div v-else class="inbox-fields">
      <label class="field inbox-wide"><span>{{ ui.t('inbox.hotel') }}</span><input :id="id('name')" v-model="data.name" /></label>
      <label class="field"><span>{{ ui.t('inbox.checkIn') }}</span><input :id="id('in')" v-model="data.checkIn" type="date" /></label>
      <label class="field"><span>{{ ui.t('inbox.checkOut') }}</span><input :id="id('out')" v-model="data.checkOut" type="date" /></label>
      <label class="field"><span>{{ ui.t('form.price') }}</span><input :id="id('price')" v-model.number="data.price" type="number" min="0" step="0.01" /></label>
      <label class="field"><span>{{ ui.t('form.currency') }}</span><select :id="id('cur')" v-model="data.currency"><option v-for="code in CURRENCIES" :key="code">{{ code }}</option></select></label>
      <label class="field inbox-wide">
        <span>{{ ui.t('inbox.addTo') }}</span>
        <select :id="id('journey')" v-model="journeyId">
          <option value="new">{{ ui.t('inbox.newJourney') }}{{ data.city ? ` · ${data.city}` : '' }}</option>
          <option v-for="journey in journeys.journeys" :key="journey.id" :value="journey.id">{{ journey.title }} · {{ journey.startDate }}</option>
        </select>
      </label>
    </div>

    <p v-if="isFlight && data.fareType === 'round_trip'" class="muted inbox-note">
      {{ ui.t('inbox.roundTrip').replace('{legs}', data.bookingLegs || 2).replace('{total}', money(data.price, data.currency, ui.locale)) }}
    </p>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="toolbar">
      <button class="button" type="button" :disabled="busy" @click="confirm">
        <Check :size="17" />
        {{ isFlight ? ui.t('inbox.importFlight') : ui.t('inbox.importStay') }}
      </button>
      <button class="ghost-button" type="button" :disabled="busy" @click="emit('dismiss')">
        <X :size="17" />
        {{ ui.t('inbox.dismiss') }}
      </button>
    </div>
  </article>
</template>
