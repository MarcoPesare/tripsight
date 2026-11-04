<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue';

// Modale accessibile e scorrevole, usata da tutti i form a comparsa.
// - scorre lo sfondo (rotella ovunque, popover non tagliati); il pannello ha la sua altezza naturale
// - Esc o clic sullo sfondo chiudono
// - il focus entra nella modale, resta dentro (Tab) e torna al pulsante di origine alla chiusura
// - la pagina sotto non scorre mentre la modale è aperta
const props = defineProps({
  labelledby: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close']);
const panel = ref(null);
let previousFocus = null;
let previousOverflow = '';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables() {
  return [...(panel.value?.querySelectorAll(FOCUSABLE) || [])].filter((el) => el.offsetParent !== null);
}

// Clic sullo sfondo chiude, ma non il clic sulla sua barra di scorrimento.
function onBackdrop(event) {
  if (event.offsetX >= event.currentTarget.clientWidth) return;
  emit('close');
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.stopPropagation();
    emit('close');
    return;
  }

  if (event.key !== 'Tab') return;

  const items = focusables();
  if (!items.length) return;

  const first = items[0];
  const last = items.at(-1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(async () => {
  previousFocus = document.activeElement;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  await nextTick();
  // Primo campo da compilare, altrimenti il primo elemento interattivo.
  const target = panel.value?.querySelector('input:not([type=hidden]), select, textarea') || focusables()[0];
  target?.focus({ preventScroll: true });
});

onUnmounted(() => {
  document.body.style.overflow = previousOverflow;
  if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
});
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @mousedown.self="onBackdrop">
      <div
        ref="panel"
        class="trip-modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="props.labelledby || undefined"
        @keydown="onKeydown"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>
