// Conversione in EUR con i tassi di riferimento BCE (Frankfurter, gratuito e senza chiave).
// Il tasso viene fissato alla data della spesa e salvato sul record, così le statistiche
// restano stabili nel tempo e non dipendono da chiamate esterne in lettura.
export const BASE_CURRENCY = 'EUR';
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'AED', 'THB'];

const API_URL = 'https://api.frankfurter.dev/v1';
const cache = new Map();

// Usati solo se l'API non risponde: meglio una stima che sommare yen ed euro.
const fallbackRates = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CHF: 1.04,
  JPY: 0.0062,
  CAD: 0.67,
  AUD: 0.6,
  SEK: 0.087,
  NOK: 0.086,
  DKK: 0.134,
  PLN: 0.23,
  CZK: 0.04,
  HUF: 0.0025,
  TRY: 0.027,
  AED: 0.25,
  THB: 0.026
};

export async function rateToBase(currency, date) {
  const code = String(currency || BASE_CURRENCY).trim().toUpperCase();
  if (code === BASE_CURRENCY) return { rate: 1, source: 'identity' };

  const day = normalizeDate(date);
  const cacheKey = `${code}:${day}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const response = await fetch(`${API_URL}/${day}?base=${code}&symbols=${BASE_CURRENCY}`, {
      signal: AbortSignal.timeout(4000)
    });
    const data = await response.json();
    const rate = Number(data?.rates?.[BASE_CURRENCY]);

    if (response.ok && rate > 0) {
      const result = { rate, source: 'ecb' };
      cache.set(cacheKey, result);
      return result;
    }
  } catch {
    // ricade sul tasso statico
  }

  return { rate: fallbackRates[code] ?? 1, source: 'fallback' };
}

export async function toBase(amount, currency, date) {
  const value = Number(amount || 0);
  if (!value) return { amountBase: 0, fxRate: 1, fxSource: 'identity' };

  const { rate, source } = await rateToBase(currency, date);

  return {
    amountBase: Math.round(value * rate * 100) / 100,
    fxRate: rate,
    fxSource: source
  };
}

function normalizeDate(date) {
  const today = new Date().toISOString().slice(0, 10);
  const value = /^\d{4}-\d{2}-\d{2}/.test(String(date || '')) ? String(date).slice(0, 10) : today;

  // I voli futuri usano l'ultimo tasso disponibile.
  return value > today ? 'latest' : value;
}
