<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { Calendar, ChevronLeft, ChevronRight, X } from '@lucide/vue';
import { useUiStore } from '../stores/ui';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  required: Boolean,
  placeholder: {
    type: String,
    default: 'gg/mm/aaaa'
  }
});

const emit = defineEmits(['update:modelValue']);
const ui = useUiStore();
const isOpen = ref(false);
const opensUp = ref(false);
const root = ref(null);
const visibleDate = ref(parseIsoDate(props.modelValue) || new Date());

const weekdays = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const monthLabel = computed(() => new Intl.DateTimeFormat(ui.locale === 'en' ? 'en-GB' : 'it-IT', { month: 'long', year: 'numeric' }).format(visibleDate.value));
const displayValue = computed(() => formatDisplayDate(props.modelValue));
const calendarDays = computed(() => buildCalendarDays(visibleDate.value, props.modelValue));

watch(
  () => props.modelValue,
  (value) => {
    const parsed = parseIsoDate(value);
    if (parsed) visibleDate.value = parsed;
  }
);

// Il calendario è alto ~410px: se sotto non c'è spazio (fondo della modale o della pagina) si apre verso l'alto.
async function toggleCalendar() {
  if (isOpen.value) return closeCalendar();

  const rect = root.value.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom;
  opensUp.value = below < 420 && rect.top > below;
  isOpen.value = true;
  document.addEventListener('mousedown', onOutside);
  await nextTick();
  root.value.querySelector('.date-popover')?.scrollIntoView({ block: 'nearest' });
}

function closeCalendar() {
  isOpen.value = false;
  document.removeEventListener('mousedown', onOutside);
}

function onOutside(event) {
  if (!root.value?.contains(event.target)) closeCalendar();
}

// Esc chiude solo il calendario, non la modale che lo contiene.
function onEscape(event) {
  if (!isOpen.value) return;
  event.stopPropagation();
  closeCalendar();
}

onUnmounted(() => document.removeEventListener('mousedown', onOutside));

function moveMonth(offset) {
  visibleDate.value = new Date(visibleDate.value.getFullYear(), visibleDate.value.getMonth() + offset, 1);
}

function selectDate(date) {
  emit('update:modelValue', formatIsoDate(date));
  visibleDate.value = date;
  closeCalendar();
}

function selectToday() {
  selectDate(new Date());
}

function clearDate() {
  emit('update:modelValue', '');
  closeCalendar();
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  const date = parseIsoDate(value);
  if (!date) return '';

  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function isSameDay(first, second) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function buildCalendarDays(monthDate, selectedValue) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const selectedDate = parseIsoDate(selectedValue);
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      key: formatIsoDate(date),
      date,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      isToday: isSameDay(date, today)
    };
  });
}
</script>

<template>
  <div ref="root" class="date-picker" @keydown.esc="onEscape">
    <div class="date-picker-control">
      <input
        :placeholder="placeholder"
        :required="required"
        :value="displayValue"
        readonly
        @click="toggleCalendar"
      />
      <button v-if="modelValue" class="icon-button" type="button" :aria-label="ui.t('form.clearField')" @click="clearDate">
        <X :size="15" />
      </button>
      <button class="icon-button" type="button" :aria-label="ui.t('form.openCalendar')" :aria-expanded="isOpen" @click="toggleCalendar">
        <Calendar :size="17" />
      </button>
    </div>

    <div v-if="isOpen" class="date-popover" :class="{ 'is-up': opensUp }">
      <div class="date-popover-header">
        <button class="icon-button" type="button" :aria-label="ui.t('form.prevMonth')" @click="moveMonth(-1)">
          <ChevronLeft :size="18" />
        </button>
        <strong>{{ monthLabel }}</strong>
        <button class="icon-button" type="button" :aria-label="ui.t('form.nextMonth')" @click="moveMonth(1)">
          <ChevronRight :size="18" />
        </button>
      </div>

      <div class="date-weekdays">
        <span v-for="(weekday, index) in weekdays" :key="`${weekday}-${index}`">{{ weekday }}</span>
      </div>

      <div class="date-grid">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          :class="{ 'is-muted': !day.isCurrentMonth, 'is-selected': day.isSelected, 'is-today': day.isToday }"
          type="button"
          @click="selectDate(day.date)"
        >
          {{ day.day }}
        </button>
      </div>

      <div class="date-actions">
        <button type="button" @click="clearDate">{{ ui.t('form.clearField') }}</button>
        <button type="button" @click="selectToday">{{ ui.t('form.today') }}</button>
      </div>
    </div>
  </div>
</template>
