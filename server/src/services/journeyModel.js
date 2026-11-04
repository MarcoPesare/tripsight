import { nanoid } from 'nanoid';
import { toBase } from './fx.js';
import { canonicalTags } from './tags.js';
import { normalizeCurrency } from './tripModel.js';

// I voli hanno la loro entità: qui ci sono tutte le altre voci di costo del viaggio.
export const EXPENSE_CATEGORIES = ['stay', 'transport', 'food', 'activities', 'shopping', 'other'];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function normalizeJourney(input, ownerId, existing = {}) {
  const now = new Date().toISOString();
  const startDate = String(input.startDate || '').trim();
  const endDate = String(input.endDate || '').trim();
  const expenses = Array.isArray(input.expenses) ? input.expenses.slice(0, 200) : [];

  return {
    id: existing.id || nanoid(),
    ownerId,
    title: String(input.title || '').trim().slice(0, 120),
    destinationCity: String(input.destinationCity || '').trim().slice(0, 80),
    destinationCountry: String(input.destinationCountry || '').trim().toUpperCase().slice(0, 2),
    startDate,
    endDate,
    expenses: await Promise.all(expenses.map((expense) => normalizeExpense(expense, startDate))),
    rating: Math.max(0, Math.min(5, Number(input.rating || 0))),
    tripType: String(input.tripType || 'city_break').trim(),
    tags: canonicalTags(input.tags),
    wouldReturn: typeof input.wouldReturn === 'boolean' ? input.wouldReturn : null,
    notes: String(input.notes || '').trim().slice(0, 4000),
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

export function validateJourney(journey) {
  if (!journey.title) return 'Dai un nome al viaggio';
  if (!datePattern.test(journey.startDate) || !datePattern.test(journey.endDate)) return 'Date di inizio e fine obbligatorie (AAAA-MM-GG)';
  if (journey.endDate < journey.startDate) return 'La data di fine non può precedere quella di inizio';
  if (journey.expenses.some((expense) => expense.amount < 0)) return 'Gli importi non possono essere negativi';

  return null;
}

async function normalizeExpense(expense, fallbackDate) {
  const amount = Number(expense?.amount || 0);
  const currency = normalizeCurrency(expense?.currency);
  const date = datePattern.test(String(expense?.date || '')) ? expense.date : fallbackDate;
  const category = EXPENSE_CATEGORIES.includes(expense?.category) ? expense.category : 'other';
  const sameAsBefore = expense?.amountBase !== undefined && expense?.fxCurrency === currency && expense?.fxDate === date && expense?.fxAmount === amount;
  const fx = sameAsBefore ? { amountBase: expense.amountBase, fxRate: expense.fxRate, fxSource: expense.fxSource } : await toBase(amount, currency, date);

  return {
    id: String(expense?.id || nanoid()),
    category,
    label: String(expense?.label || '').trim().slice(0, 120),
    amount,
    currency,
    date,
    amountBase: fx.amountBase,
    fxRate: fx.fxRate,
    fxSource: fx.fxSource,
    fxAmount: amount,
    fxCurrency: currency,
    fxDate: date
  };
}
