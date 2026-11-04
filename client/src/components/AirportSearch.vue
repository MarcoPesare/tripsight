<script setup>
import { ref, watch } from 'vue';
import { MapPin, X } from '@lucide/vue';
import { api } from '../services/api';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  modelValue: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);
const query = ref('');
const results = ref([]);
const loading = ref(false);
const touched = ref(false);
let debounceTimer;

watch(
  () => props.modelValue,
  (value) => {
    const code = value?.iata || value?.airport || '';
    query.value = code ? `${code} - ${value.airportName || value.city || ''}` : '';
  },
  { immediate: true, deep: true }
);

watch(query, (value) => {
  clearTimeout(debounceTimer);

  if (!touched.value || value.trim().length < 2) {
    results.value = [];
    return;
  }

  debounceTimer = setTimeout(async () => {
    loading.value = true;
    try {
      results.value = await api.searchAirports(value);
    } finally {
      loading.value = false;
    }
  }, 220);
});

function selectAirport(airport) {
  touched.value = false;
  results.value = [];
  query.value = `${airport.iata} - ${airport.name}`;
  emit('update:modelValue', {
    airport: airport.iata,
    airportName: airport.name,
    iata: airport.iata,
    icao: airport.icao,
    city: airport.city,
    country: airport.country,
    lat: airport.lat,
    lng: airport.lng
  });
}

function clearAirport() {
  touched.value = true;
  query.value = '';
  results.value = [];
  emit('update:modelValue', {
    airport: '',
    airportName: '',
    iata: '',
    icao: '',
    city: '',
    country: '',
    lat: 0,
    lng: 0
  });
}
</script>

<template>
  <div class="field airport-search">
    <span>{{ label }}</span>
    <div class="airport-input">
      <MapPin :size="17" />
      <input
        v-model="query"
        required
        :placeholder="ui.t('form.airportPlaceholder')"
        :aria-label="label"
        @focus="touched = true"
        @input="touched = true"
      />
      <button v-if="query" class="icon-button" type="button" :aria-label="ui.t('form.clearField')" @click="clearAirport">
        <X :size="16" />
      </button>
    </div>

    <div v-if="loading" class="airport-results muted">{{ ui.t('form.searching') }}</div>
    <div v-else-if="results.length" class="airport-results">
      <button v-for="airport in results" :key="airport.iata" type="button" @click="selectAirport(airport)">
        <strong>{{ airport.iata }}</strong>
        <span>{{ airport.name }}</span>
        <small>{{ airport.city }}, {{ airport.country }}</small>
      </button>
    </div>
  </div>
</template>
