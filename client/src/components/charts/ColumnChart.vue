<script setup>
import { computed, ref } from 'vue';
import { niceMax, useChartWidth } from './useChartWidth';

// Colonne (singole o impilate) con un solo asse y, tooltip per colonna ed etichetta del totale.
const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  // [{ key, label, slot }] — ordine fisso dello stack; vuoto = serie singola
  series: {
    type: Array,
    default: () => []
  },
  format: {
    type: Function,
    default: (value) => String(Math.round(value))
  },
  formatTick: {
    type: Function,
    default: null
  },
  height: {
    type: Number,
    default: 220
  },
  ariaLabel: {
    type: String,
    default: ''
  }
});

const { el, width } = useChartWidth();
const hovered = ref(null);
const padding = { top: 22, right: 8, bottom: 28, left: 52 };
const gap = 2;

const totals = computed(() => props.items.map((item) => item.total ?? item.value ?? 0));
const maxValue = computed(() => niceMax(Math.max(...totals.value, 0)));
const plotWidth = computed(() => width.value - padding.left - padding.right);
const plotHeight = computed(() => props.height - padding.top - padding.bottom);
const band = computed(() => plotWidth.value / Math.max(1, props.items.length));
const barWidth = computed(() => Math.min(24, band.value * 0.6));
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * maxValue.value));
const scale = (value) => (value / maxValue.value) * plotHeight.value;

const columns = computed(() => props.items.map((item, index) => {
  const x = padding.left + band.value * index + (band.value - barWidth.value) / 2;
  const baseline = padding.top + plotHeight.value;
  const stack = props.series.length
    ? props.series.map((serie) => ({ ...serie, value: Number(item.segments?.[serie.key] || 0) })).filter((part) => part.value > 0)
    : [{ key: 'value', slot: 1, value: Number(item.value || 0) }];

  let cursor = baseline;
  const parts = stack.map((part, partIndex) => {
    const h = scale(part.value);
    const isTop = partIndex === stack.length - 1;
    // Lo spazio di 2px tra segmenti è il colore della superficie che traspare.
    const drawn = Math.max(0, h - (isTop ? 0 : gap));
    const rect = { ...part, x, y: cursor - h, h: drawn, isTop };
    cursor -= h;
    return rect;
  });

  return { item, index, x, parts, total: totals.value[index], top: cursor };
}));

function columnPath(part) {
  const r = part.isTop ? Math.min(4, part.h, barWidth.value / 2) : 0;
  const { x, y, h } = part;
  const w = barWidth.value;

  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

const tooltipStyle = computed(() => {
  if (hovered.value === null) return {};
  const column = columns.value[hovered.value];
  const left = Math.min(Math.max(column.x + barWidth.value / 2, 80), width.value - 80);

  return { left: `${left}px`, top: `${Math.max(0, column.top - 8)}px` };
});

const tick = (value) => (props.formatTick || props.format)(value);
</script>

<template>
  <div ref="el" class="chart">
    <svg :width="width" :height="height" role="img" :aria-label="ariaLabel">
      <g class="chart-gridlines">
        <g v-for="value in ticks" :key="value">
          <line :x1="padding.left" :x2="width - padding.right" :y1="padding.top + plotHeight - scale(value)" :y2="padding.top + plotHeight - scale(value)" />
          <text class="chart-tick" :x="padding.left - 8" :y="padding.top + plotHeight - scale(value) + 4" text-anchor="end">{{ tick(value) }}</text>
        </g>
      </g>

      <g v-for="column in columns" :key="column.item.label" class="chart-column" :class="{ 'is-dimmed': hovered !== null && hovered !== column.index }">
        <path v-for="part in column.parts" :key="part.key" :d="columnPath(part)" :style="{ fill: `var(--series-${part.slot})` }" />
        <text v-if="column.total && (items.length <= 8 || hovered === column.index)" class="chart-value" :x="column.x + barWidth / 2" :y="column.top - 6" text-anchor="middle">{{ format(column.total) }}</text>
        <text class="chart-tick" :x="column.x + barWidth / 2" :y="height - 8" text-anchor="middle">{{ column.item.label }}</text>
        <!-- area di hover più larga della colonna -->
        <rect
          class="chart-hit"
          :x="padding.left + band * column.index"
          :y="padding.top"
          :width="band"
          :height="plotHeight"
          tabindex="0"
          @mouseenter="hovered = column.index"
          @mouseleave="hovered = null"
          @focus="hovered = column.index"
          @blur="hovered = null"
        />
      </g>
    </svg>

    <div v-if="hovered !== null" class="chart-tooltip" :style="tooltipStyle">
      <strong>{{ columns[hovered].item.label }} · {{ format(columns[hovered].total) }}</strong>
      <template v-if="series.length">
        <span v-for="part in [...columns[hovered].parts].reverse()" :key="part.key">
          <i class="legend-swatch" :style="{ background: `var(--series-${part.slot})` }"></i>
          {{ part.label }} {{ format(part.value) }}
        </span>
      </template>
      <span v-else-if="columns[hovered].item.note">{{ columns[hovered].item.note }}</span>
    </div>

    <ul v-if="series.length > 1" class="chart-legend">
      <li v-for="serie in series" :key="serie.key">
        <i class="legend-swatch" :style="{ background: `var(--series-${serie.slot})` }"></i>
        <span>{{ serie.label }}</span>
      </li>
    </ul>
  </div>
</template>
