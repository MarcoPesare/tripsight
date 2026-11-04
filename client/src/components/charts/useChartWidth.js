import { onMounted, onUnmounted, ref } from 'vue';

// Larghezza reale del contenitore: gli SVG vengono disegnati in pixel veri,
// così il testo non si deforma come con un viewBox stirato.
export function useChartWidth(fallback = 600) {
  const el = ref(null);
  const width = ref(fallback);
  let observer;

  onMounted(() => {
    if (!el.value) return;
    width.value = el.value.clientWidth || fallback;

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(([entry]) => {
        width.value = Math.max(240, Math.round(entry.contentRect.width));
      });
      observer.observe(el.value);
    }
  });

  onUnmounted(() => observer?.disconnect());

  return { el, width };
}

// Massimo dell'asse = 4 passi "tondi" (1, 2, 2.5, 5 × 10^n), così ogni tacca è un numero pulito.
export function niceMax(value, steps = 4) {
  if (!value) return 1;
  const raw = value / steps;
  const exponent = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;

  return nice * exponent * steps;
}
