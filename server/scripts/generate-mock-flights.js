// Genera src/data/mock-flights.json, i dati di FLIGHT_PROVIDER=mock.
// Tutti i voli sono FITTIZI: compagnie con codici finti (ZZ, XX), aeroporti reali dal catalogo
// OurAirports, orari plausibili calcolati dalla distanza. Il risultato è deterministico.
//
//   node scripts/generate-mock-flights.js

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { distanceKm, findAirport } from '../src/services/airportCatalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/data/mock-flights.json');
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Fuso orario semplificato (ora solare) per calcolare gli orari UTC.
const UTC_OFFSET = { GB: 0, IE: 0, PT: 0, GR: 2, RO: 2, FI: 2, TR: 3, AE: 4, US: -5 };

const ORIGINS = ['TRN', 'MXP', 'LIN', 'BGY', 'FCO'];
const DESTINATIONS = ['BCN', 'MAD', 'CDG', 'AMS', 'FRA', 'LGW', 'LIS', 'ATH', 'BUD', 'VIE', 'PRG', 'DUB', 'CPH', 'OTP', 'TIA', 'CTA', 'PMO', 'NAP', 'BRI', 'CAG', 'IST', 'MUC', 'BRU', 'ZRH'];

const routes = {};
let number = 100;

for (const [originIndex, origin] of ORIGINS.entries()) {
  // Otto destinazioni per aeroporto, scelte a rotazione: varietà stabile tra un'esecuzione e l'altra.
  for (let step = 0; step < 8; step += 1) {
    const destination = DESTINATIONS[(originIndex * 5 + step * 3) % DESTINATIONS.length];
    if (destination === origin) continue;

    const hour = 6 + ((originIndex * 7 + step * 5) % 15);
    const minute = ((step * 25) % 60);
    await addRoute(`ZZ${number}`, origin, destination, hour, minute);
    await addRoute(`ZZ${number + 1}`, destination, origin, (hour + 3) % 24, (minute + 20) % 60);
    number += 2;
  }
}

// Casi costruiti a mano.
await addRoute('ZZ206', 'JFK', 'MXP', 22, 20); // stesso numero, due tratte (JFK → MXP → DXB)
await addRoute('ZZ206', 'MXP', 'DXB', 14, 15);
await addRoute('XX3642', 'IBZ', 'BCN', 18, 45); // codeshare venduto su due voli diversi
await addRoute('XX3642', 'MXP', 'BCN', 13, 25);

const data = {
  _info: 'Dati FITTIZI per FLIGHT_PROVIDER=mock, generati da scripts/generate-mock-flights.js. Compagnie con codici finti (ZZ Demo Air, XX Demo Partner); aeroporti reali (OurAirports); orari plausibili. ZZ206 ha due tratte, XX3642 è un codeshare su due voli, ZZ9999 non esiste, ZZ9001 simula la quota esaurita, ZZ9002 una chiave non valida.',
  routes,
  schedules: {},
  airlines: {
    ZZ: [{ name: 'Demo Air', iata_code: 'ZZ' }],
    XX: [{ name: 'Demo Partner', iata_code: 'XX' }]
  },
  errors: {
    ZZ9001: { code: 'month_limit_exceeded', message: 'The monthly request limit has been exceeded.' },
    ZZ9002: { code: 'unknown_api_key', message: 'Unknown API key' }
  }
};

await writeFile(target, `${JSON.stringify(data, null, 1)}\n`);
console.log(`Voli fittizi: ${Object.keys(routes).length} numeri volo → ${target}`);

async function addRoute(flightIata, from, to, hour, minute) {
  const [a, b] = await Promise.all([findAirport(from), findAirport(to)]);
  if (!a || !b) throw new Error(`Aeroporto mancante nel catalogo: ${from} o ${to}`);

  // Velocità media di crociera più taxi e salita: abbastanza realistico per un mock.
  const duration = Math.round((distanceKm(a, b) / 780) * 60 + 30);
  const depMinutes = hour * 60 + minute;
  const arrMinutes = depMinutes + duration + (offset(b) - offset(a)) * 60;

  (routes[flightIata] ||= []).push({
    airline_iata: flightIata.slice(0, 2),
    flight_iata: flightIata,
    flight_number: flightIata.slice(2),
    dep_iata: from,
    arr_iata: to,
    dep_time: clock(depMinutes),
    dep_time_utc: clock(depMinutes - offset(a) * 60),
    arr_time: clock(arrMinutes),
    arr_time_utc: clock(depMinutes - offset(a) * 60 + duration),
    duration,
    days: DAYS
  });
}

function offset(airport) {
  return UTC_OFFSET[airport.country] ?? 1;
}

function clock(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
