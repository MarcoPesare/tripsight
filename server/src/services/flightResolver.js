import { distanceKm, findAirport, toTripPlace } from './airportCatalog.js';
import { isProviderConfigured, providerName, providerRequest } from './flightProvider.js';

const flightCache = new Map();
const airlineCache = new Map();
const countryNames = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['it'], { type: 'region' }) : null;
const AIRLINE_PREFIX_ALIASES = {
  EJU: ['U2', 'EZY'],
  EZY: ['U2', 'EJU'],
  U2: ['EJU', 'EZY']
};

// `from` (IATA) sceglie la tratta quando lo stesso numero volo ne copre più d'una
// (es. EK206 JFK → MXP → DXB, o un codeshare usato su due voli diversi).
export async function resolveFlight({ flightNumber, date, from = '' }) {
  const normalizedFlightNumber = String(flightNumber || '').trim().toUpperCase().replace(/\s+/g, '');
  const normalizedDate = String(date || '').trim();
  const normalizedFrom = /^[A-Z]{3}$/i.test(String(from).trim()) ? String(from).trim().toUpperCase() : '';

  if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(normalizedFlightNumber)) {
    throw withStatus(400, 'Inserisci un numero volo valido, ad esempio AZ792');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw withStatus(400, 'Inserisci la data del volo');
  }

  if (!isProviderConfigured()) {
    throw withStatus(503, 'Configura AIRLABS_API_KEY (o FLIGHT_PROVIDER=mock) nel backend per recuperare i dati del volo');
  }

  return resolveWithProvider(normalizedFlightNumber, normalizedDate, normalizedFrom);
}

async function resolveWithProvider(flightNumber, date, from) {
  const cacheKey = `${flightNumber}:${date}:${from}`;

  if (flightCache.has(cacheKey)) {
    return structuredClone(flightCache.get(cacheKey));
  }

  const flightCandidates = buildFlightCandidates(flightNumber);
  const { match, legs, source } = await resolveAcrossCandidates(flightCandidates, date, from);

  if (!match) {
    throw withStatus(404, 'Nessun volo trovato per numero e data indicati');
  }

  const departureCode = getAirportCode(match, 'dep');
  const arrivalCode = getAirportCode(match, 'arr');
  const departureAirport = await findAirport(departureCode);
  const arrivalAirport = await findAirport(arrivalCode);

  if (!departureAirport || !arrivalAirport) {
    throw withStatus(404, 'Volo trovato, ma gli aeroporti non sono presenti nel catalogo locale');
  }

  const departure = toTripPlace(departureAirport);
  const arrival = toTripPlace(arrivalAirport);
  const departureTime = getLocalTime(match, 'dep') || date;
  const arrivalTime = getLocalTime(match, 'arr') || '';
  const departureTimeUtc = getUtcTime(match, 'dep') || '';
  const arrivalTimeUtc = getUtcTime(match, 'arr') || '';
  const airlineCode = String(match.airline_iata || match.airline_icao || '').trim().toUpperCase();
  const airlineName = await resolveAirlineName(airlineCode) || match.airline_name || airlineCode;
  const timezoneShiftHours = calculateTimezoneShiftHours(departureTime, departureTimeUtc, arrivalTime, arrivalTimeUtc);
  const calculatedDistanceKm = distanceKm(departure, arrival);
  const resolved = {
    title: `${departure.city} - ${arrival.city}`,
    airline: airlineName,
    airlineCode,
    flightNumber,
    startDate: toDatePart(departureTime) || date,
    endDate: toDatePart(arrivalTime) || '',
    departureTime,
    arrivalTime,
    departureTimeUtc,
    arrivalTimeUtc,
    durationHours: resolveDurationHours({
      departureTime,
      arrivalTime,
      departureTimeUtc,
      arrivalTimeUtc,
      timezoneShiftHours,
      distanceKm: calculatedDistanceKm
    }),
    distanceKm: calculatedDistanceKm,
    timezoneShiftHours,
    timezoneNote: buildTimezoneNote(departure, arrival, timezoneShiftHours),
    departure,
    arrival,
    // Più tratte con lo stesso numero: il client le propone e richiama con `from`.
    legs: legs.length > 1 ? legs : [],
    // 'timetable' = orari dall'orario attuale della compagnia (per i voli passati possono differire).
    timesSource: source,
    provider: providerName()
  };

  flightCache.set(cacheKey, resolved);
  return structuredClone(resolved);
}

async function resolveAcrossCandidates(flightCandidates, date, from) {
  for (const candidate of flightCandidates) {
    const routeMatch = await resolveFromRoutes(candidate, date, from);
    if (routeMatch.match) {
      return { ...routeMatch, source: 'timetable' };
    }
  }

  for (const candidate of flightCandidates) {
    const scheduleMatch = await resolveFromSchedules(candidate, date, from);
    if (scheduleMatch.match) {
      return { ...scheduleMatch, source: 'schedule' };
    }
  }

  return { match: null, legs: [] };
}

// Quota esaurita o chiave non valida: non è "volo non trovato", va detto chiaramente.
function assertProviderAvailable(payload) {
  const code = String(payload?.error?.code || '');
  if (/limit|key|unknown_api_key|expired/i.test(code)) {
    throw withStatus(503, 'Il servizio dati voli non è disponibile in questo momento (limite di richieste raggiunto)');
  }
}

// Tratte distinte (partenza-arrivo) tra i risultati con lo stesso numero volo.
function distinctLegs(items) {
  const legs = new Map();
  items.forEach((item) => {
    const key = `${getAirportCode(item, 'dep')}-${getAirportCode(item, 'arr')}`;
    if (!legs.has(key)) {
      legs.set(key, { from: getAirportCode(item, 'dep'), to: getAirportCode(item, 'arr'), departureTime: String(item.dep_time || '').slice(-5) });
    }
  });
  return [...legs.values()];
}

function buildFlightCandidates(flightNumber) {
  const normalized = String(flightNumber || '').trim().toUpperCase().replace(/\s+/g, '');
  const candidates = new Set([normalized]);
  const match = normalized.match(/^([A-Z0-9]{2,3})(\d{1,4}[A-Z]?)$/);

  if (match) {
    const [, prefix, suffix] = match;
    for (const alias of AIRLINE_PREFIX_ALIASES[prefix] || []) {
      candidates.add(`${alias}${suffix}`);
    }
  }

  return [...candidates];
}

async function resolveFromSchedules(flightNumber, date, from) {
  const payload = await providerRequest('schedules', { flight_iata: flightNumber });

  assertProviderAvailable(payload);
  if (payload.error) {
    return { match: null, legs: [] };
  }

  // Solo voli di quel giorno con quel numero: niente ripieghi su altre date o altri voli.
  const flights = extractAirLabsItems(payload).filter((item) => matchesDate(item, date) && sameFlight(item, flightNumber));
  const legs = distinctLegs(flights);
  const match = from ? flights.find((item) => getAirportCode(item, 'dep') === from) : flights[0];

  return { match: match || null, legs };
}

async function resolveFromRoutes(flightNumber, date, from) {
  const payload = await providerRequest('routes', { flight_iata: flightNumber });

  assertProviderAvailable(payload);
  if (payload.error) {
    return { match: null, legs: [] };
  }

  // Solo rotte con quel numero volo: prima quelle che operano in quel giorno della settimana.
  const routes = extractAirLabsItems(payload).filter((item) => sameFlight(item, flightNumber));
  const weekday = getWeekdayCode(date);
  const onWeekday = routes.filter((item) => routeRunsOnWeekday(item, weekday));
  const pool = onWeekday.length ? onWeekday : routes;
  const legs = distinctLegs(pool);
  const route = from ? pool.find((item) => getAirportCode(item, 'dep') === from) : pool[0];

  return { match: route ? normalizeRouteMatch(route, date, flightNumber) : null, legs };
}

function normalizeRouteMatch(route, date, flightNumber) {
  const departureTime = combineDateAndTime(date, route.dep_time || route.dep_time_utc);
  const departureTimeUtc = combineDateAndTime(date, route.dep_time_utc || route.dep_time);
  const arrivalTime = combineDateAndTime(date, route.arr_time || route.arr_time_utc);
  const arrivalTimeUtc = combineDateAndTime(date, route.arr_time_utc || route.arr_time);

  return {
    ...route,
    flight_iata: route.flight_iata || flightNumber,
    flight_icao: route.flight_icao || '',
    dep_time: departureTime,
    dep_time_utc: departureTimeUtc,
    arr_time: arrivalTime,
    arr_time_utc: arrivalTimeUtc,
    dep_time_local: departureTime,
    arr_time_local: arrivalTime,
    dep_time_source: route.dep_time || route.dep_time_utc || '',
    arr_time_source: route.arr_time || route.arr_time_utc || ''
  };
}

function sameFlight(item, flightNumber) {
  return String(item.flight_iata || item.flight_icao || item.number || '').toUpperCase().replace(/\s+/g, '') === flightNumber;
}

function matchesDate(item, date) {
  return toDatePart(item.dep_time_utc || item.dep_time || item.arr_time_utc || item.arr_time || '') === date;
}

function getAirportCode(item, prefix) {
  return String(item?.[`${prefix}_iata`] || item?.[`${prefix}_icao`] || '').trim().toUpperCase();
}

function getLocalTime(item, prefix) {
  return item?.[`${prefix}_time_local`] || item?.[`${prefix}_time`] || item?.[`${prefix}_estimated`] || item?.[`${prefix}_actual`] || item?.[`${prefix}_time_utc`] || '';
}

function getUtcTime(item, prefix) {
  return item?.[`${prefix}_time_utc`] || item?.[`${prefix}_estimated_utc`] || item?.[`${prefix}_actual_utc`] || '';
}

async function resolveAirlineName(airlineCode) {
  if (!airlineCode) {
    return '';
  }

  if (airlineCache.has(airlineCode)) {
    return airlineCache.get(airlineCode);
  }

  const payload = await providerRequest('airlines', { iata_code: airlineCode });
  // Errore del fornitore: niente nome, ma non lo memorizziamo così si riprova la volta dopo.
  if (payload.error) return '';
  const airlines = extractAirLabsItems(payload);
  const airline = airlines[0];
  const airlineName = airline?.name || '';

  airlineCache.set(airlineCode, airlineName);
  return airlineName;
}

function calculateTimezoneShiftHours(departureLocal, departureUtc, arrivalLocal, arrivalUtc) {
  const departureOffset = calculateOffsetHours(departureLocal, departureUtc);
  const arrivalOffset = calculateOffsetHours(arrivalLocal, arrivalUtc);

  if (departureOffset === null || arrivalOffset === null) {
    return null;
  }

  return arrivalOffset - departureOffset;
}

function calculateOffsetHours(localTime, utcTime) {
  if (!localTime || !utcTime) {
    return null;
  }

  const localMs = Date.parse(String(localTime).replace(' ', 'T'));
  const utcMs = Date.parse(`${String(utcTime).replace(' ', 'T')}Z`);

  if (!Number.isFinite(localMs) || !Number.isFinite(utcMs)) {
    return null;
  }

  return Math.round(((localMs - utcMs) / 36e5) * 10) / 10;
}

function buildTimezoneNote(departure, arrival, shiftHours) {
  if (!Number.isFinite(shiftHours) || shiftHours === 0) {
    return '';
  }

  const absoluteShift = Math.abs(shiftHours);
  const direction = shiftHours > 0 ? 'avanti' : 'indietro';
  const departureLabel = countryLabel(departure.country) || departure.city;
  return `${arrival.city} è ${absoluteShift} ora${absoluteShift === 1 ? '' : 'e'} ${direction} rispetto a ${departureLabel}`;
}

function countryLabel(code) {
  const normalized = String(code || '').trim().toUpperCase();

  if (!normalized) {
    return '';
  }

  return countryNames?.of(normalized) || normalized;
}

function routeRunsOnWeekday(route, weekday) {
  const days = Array.isArray(route?.days) ? route.days.map((day) => String(day || '').toLowerCase()) : [];

  if (!weekday) {
    return days.length > 0;
  }

  return days.includes(weekday);
}

function getWeekdayCode(date) {
  const value = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][value.getUTCDay()];
}

function extractAirLabsItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.response)) {
    return payload.response;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (payload && typeof payload === 'object' && payload.response) {
    return [payload.response];
  }

  return [];
}

function combineDateAndTime(date, value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(raw)) {
    return raw.replace('T', ' ').slice(0, 16);
  }

  const timeMatch = raw.match(/(\d{2}:\d{2})/);
  if (!timeMatch) {
    return raw;
  }

  return `${date} ${timeMatch[1]}`;
}

function toDatePart(value) {
  return String(value || '').slice(0, 10);
}

function resolveDurationHours({ departureTime, arrivalTime, departureTimeUtc, arrivalTimeUtc, timezoneShiftHours, distanceKm }) {
  const utcDuration = calculateDurationHours(departureTimeUtc, arrivalTimeUtc);
  if (utcDuration > 0) return utcDuration;

  const localDuration = calculateDurationHours(departureTime, arrivalTime);
  if (localDuration > 0 && timezoneShiftHours !== null && timezoneShiftHours !== undefined) {
    const adjusted = Math.round((localDuration - timezoneShiftHours) * 10) / 10;
    if (adjusted > 0) return adjusted;
  }

  if (localDuration > 0) return localDuration;

  return estimateDurationFromDistance(distanceKm);
}

function calculateDurationHours(start, end) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  return Math.round(((endMs - startMs) / 36e5) * 10) / 10;
}

function estimateDurationFromDistance(distanceKmValue) {
  const distance = Number(distanceKmValue || 0);

  if (!distance) return 0;

  const averageCruiseSpeedKmh = distance > 4500 ? 860 : 760;
  return Math.round((distance / averageCruiseSpeedKmh) * 10) / 10;
}

function withStatus(status, message) {
  return Object.assign(new Error(message), { status });
}
