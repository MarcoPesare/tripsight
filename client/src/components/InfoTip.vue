<script setup>
import { computed, nextTick, ref } from 'vue';
import { Info } from '@lucide/vue';
import { glossaryEntry } from '../services/glossary';
import { useUiStore } from '../stores/ui';

// Aiuto contestuale: spiegazione breve al passaggio o al focus, con link alla voce completa della Guida.
const props = defineProps({
  term: {
    type: String,
    required: true
  }
});

const ui = useUiStore();
const open = ref(false);
const bubble = ref(null);
const alignRight = ref(false);
const entry = computed(() => glossaryEntry(props.term, ui.locale));
const tipId = computed(() => `tip-${props.term}`);
let closeTimer;

function show() {
  clearTimeout(closeTimer);
  if (open.value) return;
  open.value = true;
  placeBubble();
}

// Se a destra non c'è spazio (es. ultima scheda della riga), il tooltip si apre verso sinistra.
async function placeBubble() {
  alignRight.value = false;
  await nextTick();
  const rect = bubble.value?.getBoundingClientRect();
  if (rect && rect.right > window.innerWidth - 8) alignRight.value = true;
}

// Piccolo ritardo: lascia il tempo di spostare il mouse dentro il tooltip per cliccare il link.
function hide() {
  closeTimer = setTimeout(() => { open.value = false; }, 120);
}
</script>

<template>
  <span v-if="entry" class="info-tip" @mouseenter="show" @mouseleave="hide">
    <button
      type="button"
      class="info-tip-button"
      :aria-label="`${ui.t('guide.whatIs')} ${entry.title}`"
      :aria-describedby="open ? tipId : undefined"
      :aria-expanded="open"
      @focus="show"
      @blur="hide"
      @click="show"
      @keydown.esc="open = false"
    >
      <Info :size="15" />
    </button>
    <span v-if="open" :id="tipId" ref="bubble" role="tooltip" class="info-tip-bubble" :class="{ 'is-right': alignRight }" @mouseenter="show" @mouseleave="hide">
      <strong>{{ entry.title }}</strong>
      <span>{{ entry.short }}</span>
      <RouterLink class="text-link" :to="{ name: 'guide', hash: `#${term}` }" @focus="show" @blur="hide">{{ ui.t('guide.readMore') }}</RouterLink>
    </span>
  </span>
</template>
