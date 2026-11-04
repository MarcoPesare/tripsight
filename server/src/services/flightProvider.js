import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Unico punto che parla con il fornitore dei dati volo. Il resolver riceve sempre
// risposte nel formato AirLabs ({ response: [...] } oppure { error: { code } }).
//
// FLIGHT_PROVIDER:
//   airlabs (predefinito) → API reale, con cache su disco
//   mock                  → voli fittizi in data/mock-flights.json, nessuna chiamata esterna
//
// La cache su disco evita di consumare quota quando si riprova lo stesso volo, anche dopo
// un riavvio. Se il fornitore risponde con un errore (es. quota esaurita) e in cache c'è
// una risposta scaduta, si usa quella. Contiene solo numeri volo e orari, nessun dato personale.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AIRLABS_BASE_URL = 'https://airlabs.co/api/v9';
const HOUR = 60 * 60 * 1000;

// Le rotte cambiano con la stagione, gli orari del giorno spesso, i nomi delle compagnie quasi mai.
const CACHE_TTL = {
  routes: 7 * 24 * HOUR,
  schedules: 3 * HOUR,
  airlines: 90 * 24 * HOUR
};

let mockData;
let requestCount = 0;

export function providerName() {
  return process.env.FLIGHT_PROVIDER === 'mock' ? 'mock' : 'airlabs';
}

export function isProviderConfigured() {
  return providerName() === 'mock' || Boolean(process.env.AIRLABS_API_KEY);
}

export async function providerRequest(endpoint, params) {
  if (providerName() === 'mock') return mockRequest(endpoint, params);

  const file = cacheFile(endpoint, params);
  const cached = await readCache(file);
  if (cached && Date.now() - cached.savedAt < (CACHE_TTL[endpoint] || HOUR)) return cached.payload;

  const query = new URLSearchParams({ ...params, api_key: process.env.AIRLABS_API_KEY });
  const response = await fetch(`${AIRLABS_BASE_URL}/${endpoint}?${query.toString()}`, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({ error: { code: `http_${response.status}` } }));
  requestCount += 1;
  console.info(`[voli] AirLabs ${endpoint} ${JSON.stringify(params)} → ${payload.error?.code || 'ok'} (chiamate da avvio: ${requestCount})`);

  if (payload.error || !response.ok) {
    // Meglio un dato di qualche giorno fa che nessun dato.
    return cached ? cached.payload : payload;
  }

  await writeCache(file, payload);
  return payload;
}

// ---------- Mock ----------

async function mockRequest(endpoint, params) {
  mockData ||= JSON.parse(await readFile(path.resolve(__dirname, '../data/mock-flights.json'), 'utf8'));
  const key = params.flight_iata || params.iata_code || '';
  const error = mockData.errors?.[key];
  if (error) return { error };

  return { response: mockData[endpoint]?.[key] || [] };
}

// ---------- Cache su disco ----------

function cacheDir() {
  const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '../data');
  return path.join(dataDir, 'cache', 'flights');
}

function cacheFile(endpoint, params) {
  const hash = createHash('sha1').update(JSON.stringify([endpoint, params])).digest('hex').slice(0, 16);
  return path.join(cacheDir(), endpoint, `${hash}.json`);
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
    // La cache è un'ottimizzazione: se non si riesce a scrivere, la ricerca funziona lo stesso.
    console.warn('[voli] cache non scritta:', error.message);
  }
}
