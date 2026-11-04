import { nanoid } from 'nanoid';
import { distanceKm, findAirport, toTripPlace } from './airportCatalog.js';
import { BASE_CURRENCY, SUPPORTED_CURRENCIES, toBase } from './fx.js';
import { canonicalTags } from './tags.js';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function normalizeTrip(input, ownerId, existing = {}) {
  const now = new Date().toISOString();
  const id = existing.id || nanoid();
  const departure = input.departure || {};
  const arrival = input.arrival || {};
  const departureAirport = await findAirport(departure.iata || departure.airport || departure.icao);
  const arrivalAirport = await findAirport(arrival.iata || arrival.airport || arrival.icao);
  const normalizedDeparture = departureAirport ? toTripPlace(departureAirport) : normalizePlace(departure);
  const normalizedArrival = arrivalAirport ? toTripPlace(arrivalAirport) : normalizePlace(arrival);
  const calculatedDistance = departureAirport && arrivalAirport ? distanceKm(normalizedDeparture, normalizedArrival) : Number(input.distanceKm || 0);
  const durationHours = Number(input.durationHours || 0) || estimateDurationFromDistance(calculatedDistance);
  const title = String(input.title || '').trim() || `${normalizedDeparture.city} - ${normalizedArrival.city}`;
  const fareType = input.fareType === 'round_trip' ? 'round_trip' : 'one_way';
  const bookingId = String(input.bookingId || existing.bookingId || (fareType === 'round_trip' ? nanoid() : id)).trim();
  const bookingLegs = fareType === 'round_trip' ? Math.max(2, Number(input.bookingLegs || existing.bookingLegs || 2)) : 1;
  const bookingTotalPrice = Number(input.bookingTotalPrice ?? input.price ?? existing.bookingTotalPrice ?? existing.price ?? 0);
  const price = fareType === 'round_trip' ? Math.round((bookingTotalPrice / bookingLegs) * 100) / 100 : bookingTotalPrice;
  const currency = normalizeCurrency(input.currency);
  const startDate = String(input.startDate || '').trim();
  const bookedAt = datePattern.test(String(input.bookedAt || '')) ? input.bookedAt : '';
  const fx = await toBase(bookingTotalPrice, currency, bookedAt || startDate);

  return {
    id,
    ownerId,
    title,
    airline: String(input.airline || '').trim(),
    airlineCode: String(input.airlineCode || '').trim().toUpperCase(),
    flightNumber: String(input.flightNumber || '').trim().toUpperCase().replace(/\s+/g, ''),
    startDate,
    endDate: String(input.endDate || '').trim(),
    bookedAt,
    departureTime: String(input.departureTime || '').trim(),
    arrivalTime: String(input.arrivalTime || '').trim(),
    departureTimeUtc: String(input.departureTimeUtc || '').trim(),
    arrivalTimeUtc: String(input.arrivalTimeUtc || '').trim(),
    durationHours,
    distanceKm: calculatedDistance,
    price,
    fareType,
    bookingId,
    bookingTotalPrice,
    bookingLegs,
    currency,
    // Importi in valuta base (EUR) fissati alla data di prenotazione/volo.
    bookingTotalBase: fx.amountBase,
    priceBase: Math.round((fx.amountBase / bookingLegs) * 100) / 100,
    fxRate: fx.fxRate,
    fxSource: fx.fxSource,
    journeyId: String(input.journeyId ?? existing.journeyId ?? '').trim(),
    notes: String(input.notes || '').trim(),
    rating: Math.max(0, Math.min(5, Number(input.rating || 0))),
    tripType: String(input.tripType || 'city_break').trim(),
    tags: canonicalTags(input.tags),
    wouldReturn: typeof input.wouldReturn === 'boolean' ? input.wouldReturn : null,
    timezoneShiftHours: input.timezoneShiftHours === null || input.timezoneShiftHours === undefined ? null : Number(input.timezoneShiftHours),
    timezoneNote: String(input.timezoneNote || '').trim(),
    source: String(input.source || existing.source || 'manual').trim(),
    departure: normalizedDeparture,
    arrival: normalizedArrival,
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

export function validateTrip(trip) {
  if (!trip.flightNumber || !trip.startDate) {
    return 'Numero volo e data sono obbligatori';
  }

  if (!datePattern.test(trip.startDate)) {
    return 'La data del volo deve essere nel formato AAAA-MM-GG';
  }

  if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(trip.flightNumber)) {
    return 'Inserisci un numero volo valido, ad esempio AZ792 o U24567';
  }

  if (!trip.departure.iata || !trip.arrival.iata) {
    return 'Seleziona aeroporti reali dal catalogo per partenza e arrivo';
  }

  // Senza coordinate l'aeroporto non è nel catalogo: niente distanza, mappa o statistiche.
  if (!hasCoords(trip.departure) || !hasCoords(trip.arrival)) {
    return `Aeroporto non riconosciuto: ${!hasCoords(trip.departure) ? trip.departure.iata : trip.arrival.iata}`;
  }

  if (trip.departure.iata === trip.arrival.iata) {
    return 'Partenza e arrivo devono essere aeroporti diversi';
  }

  if (trip.durationHours < 0 || trip.distanceKm < 0 || trip.price < 0 || trip.bookingTotalPrice < 0) {
    return 'Durata, distanza e prezzo non possono essere negativi';
  }

  if (trip.bookedAt && trip.bookedAt > trip.startDate) {
    return 'La data di prenotazione non può essere successiva al volo';
  }

  return null;
}

export function normalizeCurrency(value) {
  const code = String(value || BASE_CURRENCY).trim().toUpperCase();
  return SUPPORTED_CURRENCIES.includes(code) ? code : BASE_CURRENCY;
}

function normalizePlace(place) {
  return {
    airport: String(place.airport || '').trim().toUpperCase(),
    airportName: String(place.airportName || '').trim(),
    iata: String(place.iata || place.airport || '').trim().toUpperCase(),
    icao: String(place.icao || '').trim().toUpperCase(),
    city: String(place.city || '').trim(),
    country: String(place.country || '').trim(),
    // Le coordinate arrivano solo dal catalogo, mai dal client.
    lat: 0,
    lng: 0
  };
}

function hasCoords(place) {
  return Boolean(Number(place.lat) || Number(place.lng));
}

function estimateDurationFromDistance(distanceKmValue) {
  const distance = Number(distanceKmValue || 0);

  if (!distance) return 0;

  const averageCruiseSpeedKmh = distance > 4500 ? 860 : 760;
  return Math.round((distance / averageCruiseSpeedKmh) * 10) / 10;
}
