<script setup>
import { computed } from 'vue';

// Barre orizzontali in HTML: etichette lunghe (compagnie, città) restano leggibili su mobile.
const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  format: {
    type: Function,
    default: (value) => String(value)
  },
  detail: {
    type: Function,
    default: null
  }
});

const max = computed(() => Math.max(...props.items.map((item) => item.value), 0) || 1);
</script>

<template>
  <ul class="bar-list">
    <li v-for="item in items" :key="item.label" :title="detail ? detail(item) : ''">
      <span class="bar-list-label">{{ item.label }}</span>
      <span class="bar-list-track">
        <span class="bar-list-fill" :style="{ width: `${Math.max(2, (item.value / max) * 100)}%` }"></span>
      </span>
      <strong class="bar-list-value">{{ format(item.value) }}</strong>
      <small v-if="detail" class="bar-list-detail">{{ detail(item) }}</small>
    </li>
  </ul>
</template>
