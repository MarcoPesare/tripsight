const localeTags = { it: 'it-IT', en: 'en-GB' };

export function money(value, currency = 'EUR', locale = 'it', digits) {
  const amount = Number(value || 0);
  const fractionDigits = digits ?? (Math.abs(amount) >= 10 ? 0 : 2);

  try {
    return new Intl.NumberFormat(localeTags[locale] || locale, {
      style: 'currency',
      currency,
      // In italiano CLDR non raggruppa le 4 cifre ("8320 €"): nell'uso comune si scrive "8.320 €".
      useGrouping: 'always',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(amount);
  } catch {
    return `${amount.toFixed(fractionDigits)} ${currency}`;
  }
}

export function number(value, locale = 'it', digits = 0) {
  return Number(value || 0).toLocaleString(localeTags[locale] || locale, { maximumFractionDigits: digits, useGrouping: 'always' });
}

// Ore decimali → "50 min", "2 h 18 min", "3 h". Oltre le 100 ore (totali) bastano le ore.
// `step` arrotonda i minuti, utile per le stime ("≈ 2 h 20 min").
export function duration(hours, locale = 'it', step = 1) {
  const minutes = Math.round((Number(hours || 0) * 60) / step) * step;
  if (minutes <= 0) return '—';

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 100) return `${number(Math.round(minutes / 60), locale)} h`;
  if (!h) return `${m} min`;

  return m ? `${h} h ${m} min` : `${h} h`;
}

export function shortDate(value, locale = 'it') {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(localeTags[locale] || locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysBetween(start, end) {
  if (!start || !end) return 0;
  const diff = (Date.parse(`${end}T12:00:00`) - Date.parse(`${start}T12:00:00`)) / 86400000;

  // Un viaggio dal 3 al 5 dura 3 giorni.
  return Number.isFinite(diff) ? Math.max(1, Math.round(diff) + 1) : 0;
}

// Importo del volo in EUR: usa quello convertito dal server, ricade sul prezzo solo se già in EUR.
export function flightCostBase(trip) {
  if (trip.priceBase !== undefined) return Number(trip.priceBase || 0);

  return trip.currency === 'EUR' || !trip.currency ? Number(trip.price || 0) : 0;
}

export function bookingTotalBase(trip) {
  if (trip.bookingTotalBase !== undefined) return Number(trip.bookingTotalBase || 0);

  return trip.currency === 'EUR' || !trip.currency ? Number(trip.bookingTotalPrice || trip.price || 0) : 0;
}
