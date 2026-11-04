import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { distanceKm, findAirport } from './airportCatalog.js';

// Prezzo medio di mercato di una tratta, per suggerirlo quando si inserisce un volo.
//
// Fonte: Travelpayouts Data API (Aviasales), tariffe reali trovate dagli utenti del motore
// di ricerca negli ultimi giorni. Dà la tariffa più bassa di ogni giorno (spesso promozioni,
// senza bagaglio), quindi non è un prezzo medio: mostriamo il minimo e un valore "tipico",
// il 75° percentile delle tariffe del mese, che regge meglio contro le offerte anomale.
// Confronto con voli reali pagati: chi prenota paga in genere di più (bagaglio, stagione).
// Riceve solo tratta e mese, nessun dato personale.
//
// FARE_PROVIDER: travelpayouts (predefinito se c'è TRAVELPAYOUTS_TOKEN) | mock
// Senza dati di mercato si ripiega su una stima per distanza, segnalata come indicativa.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000; // l'API tiene le tariffe 2-7 giorni
const MIN_SAMPLES = 3;

export async function estimateFare({ from, to, date }) {
  const origin = String(from || '').toUpperCase();
  const destination = String(to || '').toUpperCase();
  const months = monthsToQuery(String(date || ''));

  for (const month of months) {
    const prices = await marketPrices(origin, destination, month);
    if (prices.length >= MIN_SAMPLES) {
      return {
        amount: roundTo5(percentile(prices, 0.75)),
        low: Math.round(Math.min(...prices)),
        count: prices.length,
        month,
        currency: 'EUR',
        source: 'market'
      };
    }
  }

  return distanceEstimate(origin, destination);
}

// Il mese del volo; per un volo passato (le tariffe sono solo future) il mese corrente e il successivo.
function monthsToQuery(date) {
  const current = new Date().toISOString().slice(0, 7);
  const month = /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : current;
  return month >= current ? [month, shiftMonth(month, 1)] : [current, shiftMonth(current, 1)];
}

async function marketPrices(origin, destination, month) {
  const payload = await request({ origin, destination, departure_at: month });
  const fares = Array.isArray(payload?.data) ? payload.data : [];
  const direct = fares.filter((fare) => Number(fare.transfers) === 0);
  const pool = direct.length >= MIN_SAMPLES ? direct : fares;

  return pool.map((fare) => Number(fare.price)).filter((price) => Number.isFinite(price) && price > 0);
}

async function distanceEstimate(origin, destination) {
  const [a, b] = await Promise.all([findAirport(origin), findAirport(destination)]);
  if (!a || !b) return null;

  // Ordine di grandezza di una tariffa economy di sola andata: solo quando il mercato non ha dati.
  return { amount: roundTo5(30 + 0.07 * distanceKm(a, b)), currency: 'EUR', source: 'distance' };
}

// ---------- Richiesta, mock e cache ----------

function providerName() {
  if (process.env.FARE_PROVIDER === 'mock') return 'mock';
  return process.env.TRAVELPAYOUTS_TOKEN ? 'travelpayouts' : 'none';
}

async function request(params) {
  const provider = providerName();
  if (provider === 'none') return null;
  if (provider === 'mock') return mockRequest(params);

  const file = cacheFile(params);
  const cached = await readCache(file);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached.payload;

  try {
    const query = new URLSearchParams({ ...params, one_way: 'true', direct: 'false', currency: 'eur', sorting: 'price', limit: '1000', unique: 'false' });
    const response = await fetch(`${API_URL}?${query}`, {
      headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'X-Access-Token': process.env.TRAVELPAYOUTS_TOKEN }
    });
    const payload = await response.json().catch(() => null);
    console.info(`[prezzi] Travelpayouts ${params.origin}-${params.destination} ${params.departure_at} → ${response.status} ${payload?.data?.length ?? 0} tariffe`);

    if (!response.ok || !payload?.success) return cached?.payload || null;

    await writeCache(file, payload);
    return payload;
  } catch (error) {
    console.warn('[prezzi] Travelpayouts non raggiungibile:', error.message);
    return cached?.payload || null;
  }
}

// Mock: tariffe sintetiche ma plausibili, stabili per tratta e mese (nessuna chiamata esterna).
async function mockRequest({ origin, destination, departure_at: month }) {
  const [a, b] = await Promise.all([findAirport(origin), findAirport(destination)]);
  if (!a || !b || `${origin}${destination}`.includes('ZZZ')) return { success: true, data: [] };

  const base = 25 + 0.06 * distanceKm(a, b);
  const random = (index) => parseInt(createHash('sha1').update(`${origin}${destination}${month}${index}`).digest('hex').slice(0, 4), 16) / 0xffff;
  const data = Array.from({ length: 20 }, (_, index) => ({
    origin,
    destination,
    price: Math.round(base * (0.7 + 0.8 * random(index))),
    transfers: index % 5 === 0 ? 1 : 0,
    departure_at: `${month}-${String((index % 28) + 1).padStart(2, '0')}T08:00:00+01:00`
  }));
  return { success: true, data, currency: 'eur' };
}

function cacheFile(params) {
  const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '../data');
  const hash = createHash('sha1').update(JSON.stringify(params)).digest('hex').slice(0, 16);
  return path.join(dataDir, 'cache', 'fares', `${hash}.json`);
}

async function readCache(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function writeCache(file, payload) {
  try {
    await mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify({ savedAt: Date.now(), payload }));
    await rename(temp, file);
  } catch (error) {
    console.warn('[prezzi] cache non scritta:', error.message);
  }
}

// ---------- Utilità ----------

function percentile(values, share) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
}

function roundTo5(value) {
  return Math.max(5, Math.round(value / 5) * 5);
}

function shiftMonth(month, offset) {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}
