// Estrae prenotazioni (voli e alloggi) da un'email di conferma.
// 1) Dati strutturati schema.org in JSON-LD: li usano molte compagnie e OTA perché
//    sono gli stessi che Gmail legge per mostrare i voli. Affidabili → confidence 'high'.
// 2) Itinerario nel testo (es. Vueling): per ogni numero volo cerca vicino data, orari e due
//    codici IATA verificati sul catalogo aeroporti. Confidence 'low': l'utente verifica.
// 3) Ripiego sul testo: numero volo vicino a parole chiave, codici IATA tra parentesi,
//    prima data. Fragile → confidence 'low', l'utente deve sempre verificare.
// Non salva né restituisce il corpo dell'email: solo i campi estratti.

const MONTHS = {
  gen: 1, gennaio: 1, jan: 1, january: 1,
  feb: 2, febbraio: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  apr: 4, aprile: 4, april: 4,
  mag: 5, maggio: 5, may: 5,
  giu: 6, giugno: 6, jun: 6, june: 6,
  lug: 7, luglio: 7, jul: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  set: 9, settembre: 9, sep: 9, sept: 9, september: 9,
  ott: 10, ottobre: 10, oct: 10, october: 10,
  nov: 11, novembre: 11, november: 11,
  dic: 12, dicembre: 12, dec: 12, december: 12
};

export function parseBookingEmail({ html = '', text = '', receivedAt = '', airports = null } = {}) {
  const structured = extractJsonLd(html).flatMap(flattenGraph).filter(Boolean);
  const flights = structured.filter((item) => hasType(item, 'FlightReservation')).map(toFlight).filter(Boolean);
  const stays = structured.filter((item) => hasType(item, 'LodgingReservation')).map(toStay).filter(Boolean);
  const bookedAt = toDate(receivedAt);

  if (flights.length || stays.length) {
    return {
      method: 'schema',
      items: [
        ...groupRoundTrips(flights).map((data) => ({ kind: 'flight', confidence: 'high', data: { ...data, bookedAt: data.bookedAt || bookedAt } })),
        ...stays.map((data) => ({ kind: 'stay', confidence: 'high', data }))
      ]
    };
  }

  const plain = text || htmlToText(html);
  const legs = fromItinerary(plain, airports, bookedAt);

  if (legs.length) {
    return {
      method: 'text',
      items: groupRoundTrips(legs).map((data) => ({ kind: 'flight', confidence: 'low', data: { ...data, bookedAt } }))
    };
  }

  const fallback = fromPlainText(plain);
  return {
    method: fallback ? 'text' : 'none',
    items: fallback ? [{ kind: 'flight', confidence: 'low', data: { ...fallback, bookedAt } }] : []
  };
}

// ---------- JSON-LD ----------

function extractJsonLd(html) {
  const blocks = [];
  const pattern = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = pattern.exec(String(html)))) {
    try {
      blocks.push(JSON.parse(decodeEntities(match[1].trim())));
    } catch {
      // blocco malformato: lo saltiamo, gli altri possono essere validi
    }
  }

  return blocks;
}

function flattenGraph(node) {
  if (Array.isArray(node)) return node.flatMap(flattenGraph);
  if (node && Array.isArray(node['@graph'])) return node['@graph'].flatMap(flattenGraph);
  return [node];
}

function hasType(item, type) {
  const types = [].concat(item?.['@type'] || []);
  return types.some((value) => String(value).replace(/^.*[/#]/, '') === type);
}

function toFlight(reservation) {
  const flight = reservation.reservationFor || {};
  const airlineCode = upper(flight.airline?.iataCode || flight.provider?.iataCode);
  const rawNumber = upper(flight.flightNumber).replace(/\s+/g, '');
  const flightNumber = /^\d+[A-Z]?$/.test(rawNumber) && airlineCode ? `${airlineCode}${rawNumber}` : rawNumber;
  const from = upper(flight.departureAirport?.iataCode);
  const to = upper(flight.arrivalAirport?.iataCode);
  const startDate = toDate(flight.departureTime);

  if (!flightNumber || !from || !to || !startDate) return null;

  const price = priceOf(reservation);

  return {
    flightNumber,
    airlineCode,
    airline: String(flight.airline?.name || '').trim(),
    startDate,
    departureTime: toLocalDateTime(flight.departureTime),
    arrivalTime: toLocalDateTime(flight.arrivalTime),
    from,
    to,
    reservationNumber: String(reservation.reservationNumber || '').trim(),
    price: price.amount,
    currency: price.currency,
    bookedAt: toDate(reservation.bookingTime)
  };
}

function toStay(reservation) {
  const hotel = reservation.reservationFor || {};
  const checkIn = toDate(reservation.checkinTime || reservation.checkinDate);
  const checkOut = toDate(reservation.checkoutTime || reservation.checkoutDate);
  const price = priceOf(reservation);

  if (!checkIn) return null;

  return {
    name: String(hotel.name || '').trim(),
    city: String(hotel.address?.addressLocality || '').trim(),
    country: upper(hotel.address?.addressCountry?.name || hotel.address?.addressCountry).slice(0, 2),
    checkIn,
    checkOut,
    reservationNumber: String(reservation.reservationNumber || '').trim(),
    price: price.amount,
    currency: price.currency
  };
}

function priceOf(reservation) {
  const raw = reservation.totalPrice ?? reservation.price ?? reservation.priceSpecification?.price ?? 0;
  const currency = upper(reservation.priceCurrency || reservation.priceSpecification?.priceCurrency || 'EUR');
  const amount = typeof raw === 'object' ? Number(raw.value ?? raw.price ?? 0) : Number(String(raw).replace(',', '.'));

  return { amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0, currency: currency || 'EUR' };
}

// Tratte con lo stesso codice prenotazione = un biglietto A/R: il prezzo è il totale,
// non va ripetuto per ogni tratta (altrimenti la spesa raddoppia).
function groupRoundTrips(flights) {
  const byReservation = new Map();
  flights.forEach((flight) => {
    const key = flight.reservationNumber || `single-${flight.flightNumber}-${flight.startDate}`;
    byReservation.set(key, [...(byReservation.get(key) || []), flight]);
  });

  return [...byReservation.values()].flatMap((legs) => {
    if (legs.length < 2) return legs.map((leg) => ({ ...leg, fareType: 'one_way' }));

    const prices = legs.map((leg) => leg.price).filter(Boolean);
    const samePrice = prices.length && prices.every((value) => value === prices[0]);
    const total = samePrice ? prices[0] : prices.reduce((sum, value) => sum + value, 0);

    return legs.map((leg) => ({ ...leg, fareType: 'round_trip', bookingLegs: legs.length, price: total }));
  });
}

// ---------- Itinerario nel testo ----------

// Sigle di 3 lettere frequenti nelle email che sono anche codici IATA validi
// (valute, parole, sigle di compagnie: "KLM" è anche un aeroporto iraniano).
const NOT_AIRPORTS = new Set([
  'EUR', 'USD', 'GBP', 'CHF', 'PNR', 'THE', 'AND', 'FOR', 'VAT', 'IVA', 'TAX', 'FEE', 'ORE', 'DEL', 'NON', 'PER', 'CON', 'UNA', 'GMT', 'UTC', 'CET', 'APP', 'WEB', 'PDF',
  'KLM', 'SAS', 'TAP', 'LOT', 'ITA', 'BAW', 'RYR', 'EZY', 'DLH', 'AFR', 'IBE', 'VLG', 'WZZ', 'THY', 'SWR', 'AUA', 'UAE', 'QTR'
]);

// Lavora sulle posizioni nel testo intero, così regge sia "data → aeroporti → orari → numero volo"
// (Vueling) sia "data → orari → aeroporti → … → numero volo" (eDreams, KLM) sia il numero volo in testa.
export function fromItinerary(text, airports, referenceDate = '') {
  if (!airports?.size) return [];

  const clean = String(text).replace(/\s+/g, ' ');
  // Maiuscolo esatto: "VY1234", "VY 1234", "U2 4567". Il contesto (data + aeroporti) filtra i falsi positivi.
  const numbers = [...clean.matchAll(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{1,4})\b/g)];
  const dates = allDates(clean, referenceDate);
  const codes = [...clean.matchAll(/\b([A-Z]{3})\b/g)]
    .filter((match) => airports.has(match[1]) && !NOT_AIRPORTS.has(match[1]))
    .map((match) => ({ code: match[1], index: match.index }));
  const pairs = codes.slice(1).map((code, index) => [codes[index], code]).filter(([a, b]) => a.code !== b.code && b.index - a.index < 400);
  const reservationNumber = (clean.match(/(?:codice (?:di )?prenotazione(?: della compagnia aerea)?|booking (?:reference|code|number)|reservation (?:code|number)|localizzatore|PNR)\W{0,12}([A-Z0-9]{5,8})\b/i) || [])[1] || '';
  const price = findPrice(clean);
  const seen = new Set();
  const legs = [];

  numbers.forEach((match, index) => {
    const flightNumber = `${match[1]}${match[2]}`;
    if (seen.has(flightNumber)) return;

    // Tratto di competenza di questo numero volo: fino al numero precedente e al successivo (max 1200 caratteri).
    const min = Math.max(index ? numbers[index - 1].index + numbers[index - 1][0].length : 0, match.index - 1200);
    const max = Math.min(numbers[index + 1]?.index ?? clean.length, match.index + 1200);
    const pair = pairs
      .filter(([a, b]) => a.index >= min && b.index <= max)
      .sort((x, y) => distance(x, match.index) - distance(y, match.index))[0];
    if (!pair) return;

    // La data che apre la tratta: l'ultima prima del primo aeroporto, altrimenti la prima dopo il numero volo.
    const date = dates.filter((item) => item.index >= min && item.index < pair[0].index).at(-1)
      || dates.find((item) => item.index > match.index && item.index <= max);
    if (!date) return;

    // Orari tra la data e la fine della tratta; le versioni desktop/mobile ripetono lo stesso orario.
    const times = [...clean.slice(date.index, Math.max(pair[1].index + 80, match.index)).matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\s?h?\b/g)]
      .map((item) => `${item[1].padStart(2, '0')}:${item[2]}`)
      .filter((time, position, list) => time !== list[position - 1]);
    const [departure, arrival] = times;

    seen.add(flightNumber);
    legs.push({
      flightNumber,
      airlineCode: match[1],
      airline: '',
      startDate: date.value,
      departureTime: departure ? `${date.value} ${departure}` : '',
      arrivalTime: arrival ? `${arrival < departure ? shiftDay(date.value) : date.value} ${arrival}` : '',
      from: pair[0].code,
      to: pair[1].code,
      reservationNumber,
      price: price.amount,
      currency: price.currency
    });
  });

  return legs;
}

function distance([a, b], index) {
  if (index < a.index) return a.index - index;
  if (index > b.index) return index - b.index;
  return 0;
}

function shiftDay(date) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function findPrice(text) {
  const match = text.match(/(?:totale|total|prezzo|price|importo)[^0-9€$£]{0,20}(€|EUR|\$|USD|£|GBP)?\s?(\d{1,5}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s?(€|EUR|USD|GBP)?/i);
  return { amount: match ? parseAmount(match[2]) : 0, currency: currencyOf(match?.[1] || match?.[3]) };
}

// ---------- Ripiego sul testo ----------

export function fromPlainText(text) {
  const clean = String(text).replace(/\s+/g, ' ');
  // Numero volo solo vicino a una parola chiave: "IT 2025" o "CAP 20121" non devono passare.
  const flightMatch = clean.match(/\b(?:volo|flight|vol|flug|n\.?\s*volo)\b[^A-Z0-9]{0,12}([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{1,4}[A-Z]?)\b/i);
  const airports = [...clean.matchAll(/\(([A-Z]{3})\)/g)].map((match) => match[1]);
  const date = findDate(clean);

  if (!flightMatch || airports.length < 2 || !date) return null;

  const price = findPrice(clean);

  return {
    flightNumber: `${flightMatch[1]}${flightMatch[2]}`.toUpperCase(),
    airlineCode: flightMatch[1].toUpperCase(),
    airline: '',
    startDate: date,
    from: airports[0],
    to: airports[1],
    reservationNumber: '',
    fareType: 'one_way',
    price: price.amount,
    currency: price.currency
  };
}

function findDate(text) {
  return allDates(text)[0]?.value || '';
}

// Tutte le date nel testo, in ordine di posizione: 2025-02-20, 20/02/2025, 20 febbraio 2025.
// "8 marzo" senza anno (eDreams) prende l'anno dalla data dell'email: la prima occorrenza
// che non cade più di qualche giorno prima della prenotazione.
function allDates(text, referenceDate = '') {
  const found = [];
  for (const match of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    found.push({ index: match.index, value: `${match[1]}-${match[2]}-${match[3]}` });
  }
  for (const match of text.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g)) {
    found.push({ index: match.index, value: `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` });
  }
  for (const match of text.matchAll(/\b(\d{1,2})\s+([a-zà-ú]{3,9})\b\.?(?:\s+(\d{4})\b)?/gi)) {
    const month = MONTHS[match[2].toLowerCase()];
    const year = match[3] || inferYear(month, Number(match[1]), referenceDate);
    if (month && year && Number(match[1]) <= 31) {
      found.push({ index: match.index, value: `${year}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}` });
    }
  }

  return found.sort((a, b) => a.index - b.index);
}

function inferYear(month, day, referenceDate) {
  if (!month || !/^\d{4}-\d{2}-\d{2}/.test(referenceDate)) return '';

  const reference = Date.parse(`${referenceDate.slice(0, 10)}T12:00:00Z`);
  const year = Number(referenceDate.slice(0, 4));
  const candidate = Date.UTC(year, month - 1, day, 12);

  return String(candidate < reference - 7 * 86400000 ? year + 1 : year);
}

function parseAmount(value) {
  let text = String(value);
  text = text.lastIndexOf(',') > text.lastIndexOf('.') ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  const amount = Number(text);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function currencyOf(symbol) {
  return { '€': 'EUR', $: 'USD', '£': 'GBP', USD: 'USD', GBP: 'GBP', EUR: 'EUR' }[String(symbol || '').toUpperCase()] || 'EUR';
}

// ---------- Utilità ----------

export function htmlToText(html) {
  return decodeEntities(String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '));
}

function decodeEntities(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function upper(value) {
  return String(value || '').trim().toUpperCase();
}

function toDate(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const parsed = new Date(String(value || ''));
  return Number.isNaN(parsed.getTime()) || !value ? '' : parsed.toISOString().slice(0, 10);
}

// "2025-05-02T07:15:00+02:00" → "2025-05-02 07:15" (ora locale dell'aeroporto, come nel resolver)
function toLocalDateTime(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : '';
}
