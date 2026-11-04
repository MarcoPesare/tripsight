<script setup>
import { computed, ref } from 'vue';
import { niceMax, useChartWidth } from './useChartWidth';

const props = defineProps({
  points: {
    type: Array,
    required: true
  },
  xLabel: {
    type: String,
    default: ''
  },
  yLabel: {
    type: String,
    default: ''
  },
  formatX: {
    type: Function,
    default: (value) => String(Math.round(value))
  },
  formatY: {
    type: Function,
    default: (value) => String(value)
  },
  height: {
    type: Number,
    default: 240
  }
});

const { el, width } = useChartWidth();
const hovered = ref(null);
const padding = { top: 16, right: 12, bottom: 40, left: 56 };

const maxX = computed(() => niceMax(Math.max(...props.points.map((point) => point.x), 1)));
const maxY = computed(() => niceMax(Math.max(...props.points.map((point) => point.y), 0)));
const plotWidth = computed(() => width.value - padding.left - padding.right);
const plotHeight = computed(() => props.height - padding.top - padding.bottom);
const sx = (value) => padding.left + (value / maxX.value) * plotWidth.value;
const sy = (value) => padding.top + plotHeight.value - (value / maxY.value) * plotHeight.value;
const ticks = [0, 0.25, 0.5, 0.75, 1];
const active = computed(() => props.points.find((point) => point.id === hovered.value));
</script>

<template>
  <div ref="el" class="chart">
    <svg :width="width" :height="height" role="img" :aria-label="`${yLabel} / ${xLabel}`">
      <g class="chart-gridlines">
        <g v-for="ratio in ticks" :key="`y${ratio}`">
          <line :x1="padding.left" :x2="width - padding.right" :y1="sy(maxY * ratio)" :y2="sy(maxY * ratio)" />
          <text class="chart-tick" :x="padding.left - 8" :y="sy(maxY * ratio) + 4" text-anchor="end">{{ formatY(maxY * ratio) }}</text>
        </g>
        <text v-for="ratio in ticks" :key="`x${ratio}`" class="chart-tick" :x="sx(maxX * ratio)" :y="padding.top + plotHeight + 16" text-anchor="middle">{{ formatX(maxX * ratio) }}</text>
        <text class="chart-tick" :x="padding.left + plotWidth / 2" :y="height - 4" text-anchor="middle">{{ xLabel }}</text>
      </g>

      <circle
        v-for="point in points"
        :key="point.id"
        class="chart-dot"
        :class="{ 'is-active': hovered === point.id }"
        :cx="sx(point.x)"
        :cy="sy(point.y)"
        r="5"
        tabindex="0"
        @mouseenter="hovered = point.id"
        @mouseleave="hovered = null"
        @focus="hovered = point.id"
        @blur="hovered = null"
      />
    </svg>

    <div v-if="active" class="chart-tooltip" :style="{ left: `${Math.min(Math.max(sx(active.x), 80), width - 80)}px`, top: `${sy(active.y) - 12}px` }">
      <strong>{{ active.label }}</strong>
      <span>{{ formatX(active.x) }} · {{ formatY(active.y) }}</span>
      <span v-if="active.note">{{ active.note }}</span>
    </div>
  </div>
</template>
