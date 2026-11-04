<script setup>
import { computed } from 'vue';
import { money } from '../../services/format';
import { SPEND_CATEGORIES } from '../../services/analytics';
import { categoryLabel } from '../../services/vocabulary';
import { useUiStore } from '../../stores/ui';

const props = defineProps({
  segments: {
    type: Object,
    required: true
  }
});

const ui = useUiStore();
const total = computed(() => Object.values(props.segments).reduce((sum, value) => sum + Number(value || 0), 0));
// Ordine fisso delle categorie: il colore segue la categoria, non la sua posizione in classifica.
const items = computed(() => SPEND_CATEGORIES
  .map((category, index) => ({ category, slot: index + 1, value: Number(props.segments[category] || 0) }))
  .filter((item) => item.value > 0));
</script>

<template>
  <div v-if="total" class="category-bar">
    <div class="category-bar-track" role="img" :aria-label="items.map((item) => `${categoryLabel(item.category, ui.locale)} ${money(item.value, 'EUR', ui.locale)}`).join(', ')">
      <span
        v-for="item in items"
        :key="item.category"
        class="category-bar-segment"
        :style="{ flexGrow: item.value, background: `var(--series-${item.slot})` }"
        :title="`${categoryLabel(item.category, ui.locale)}: ${money(item.value, 'EUR', ui.locale)}`"
      ></span>
    </div>
    <ul class="chart-legend">
      <li v-for="item in items" :key="item.category">
        <i class="legend-swatch" :style="{ background: `var(--series-${item.slot})` }"></i>
        <span>{{ categoryLabel(item.category, ui.locale) }}</span>
        <strong>{{ money(item.value, 'EUR', ui.locale) }}</strong>
        <small>{{ Math.round((item.value / total) * 100) }}%</small>
      </li>
    </ul>
  </div>
</template>
