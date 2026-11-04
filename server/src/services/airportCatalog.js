import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Catalogo completo OurAirports (npm run sync:airports, ignorato da git) oppure, se manca,
// il catalogo di base incluso nel repository: aeroporti con codice IATA e voli di linea.
// Dati OurAirports, pubblico dominio (https://ourairports.com/data/).
const csvPaths = [
  path.resolve(__dirname, '../data/airports.csv'),
  path.resolve(__dirname, '../data/airports-base.csv')
];

const fallbackAirports = [
  airport('FCO', 'LIRF', 'Rome Fiumicino Airport', 'Rome', 'IT', 41.8045, 12.2508),
  airport('CIA', 'LIRA', 'Rome Ciampino Airport', 'Rome', 'IT', 41.7994, 12.5949),
  airport('MXP', 'LIMC', 'Milan Malpensa Airport', 'Milan', 'IT', 45.63, 8.7231),
  airport('LIN', 'LIML', 'Milan Linate Airport', 'Milan', 'IT', 45.4451, 9.2767),
  airport('VCE', 'LIPZ', 'Venice Marco Polo Airport', 'Venice', 'IT', 45.5053, 12.3519),
  airport('NAP', 'LIRN', 'Naples International Airport', 'Naples', 'IT', 40.886, 14.2908),
  airport('CTA', 'LICC', 'Catania Fontanarossa Airport', 'Catania', 'IT', 37.4668, 15.0664),
  airport('PMO', 'LICJ', 'Falcone Borsellino Airport', 'Palermo', 'IT', 38.1759, 13.091),
  airport('LHR', 'EGLL', 'Heathrow Airport', 'London', 'GB', 51.4706, -0.4619),
  airport('CDG', 'LFPG', 'Charles de Gaulle Airport', 'Paris', 'FR', 49.0128, 2.55),
  airport('AMS', 'EHAM', 'Amsterdam Airport Schiphol', 'Amsterdam', 'NL', 52.3086, 4.7639),
  airport('FRA', 'EDDF', 'Frankfurt Airport', 'Frankfurt', 'DE', 50.0379, 8.5622),
  airport('MAD', 'LEMD', 'Adolfo Suarez Madrid-Barajas Airport', 'Madrid', 'ES', 40.4719, -3.5626),
  airport('BCN', 'LEBL', 'Barcelona-El Prat Airport', 'Barcelona', 'ES', 41.2971, 2.0785),
  airport('JFK', 'KJFK', 'John F Kennedy International Airport', 'New York', 'US', 40.6413, -73.7781),
  airport('EWR', 'KEWR', 'Newark Liberty International Airport', 'Newark', 'US', 40.6895, -74.1745),
  airport('LAX', 'KLAX', 'Los Angeles International Airport', 'Los Angeles', 'US', 33.9416, -118.4085),
  airport('DXB', 'OMDB', 'Dubai International Airport', 'Dubai', 'AE', 25.2532, 55.3657),
  airport('HND', 'RJTT', 'Tokyo Haneda Airport', 'Tokyo', 'JP', 35.5494, 139.7798),
  airport('NRT', 'RJAA', 'Narita International Airport', 'Tokyo', 'JP', 35.772, 140.3929)
];

const preferredCityByIata = {
  BGY: 'Bergamo'
};

let cache;

export async function searchAirports(query = '', limit = 12) {
  const airports = await loadAirports();
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return airports.slice(0, limit);

  return airports
    .map((item) => ({ item, score: scoreAirport(item, normalizedQuery) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((result) => result.item);
}

// Codici IATA noti: servono al parser delle email per distinguere "BCN" da una sigla qualsiasi.
let codesCache;
export async function airportCodes() {
  codesCache ||= new Set((await loadAirports()).map((item) => item.iata).filter(Boolean));
  return codesCache;
}

export async function findAirport(code) {
  if (!code) return null;

  const normalizedCode = String(code).trim().toUpperCase();
  const airports = await loadAirports();

  return airports.find((item) => item.iata === normalizedCode || item.icao === normalizedCode) || null;
}

export function toTripPlace(airportItem) {
  return {
    airport: airportItem.iata || airportItem.icao,
    airportName: airportItem.name,
    iata: airportItem.iata,
    icao: airportItem.icao,
    city: inferCityLabel(airportItem),
    country: airportItem.country,
    lat: airportItem.lat,
    lng: airportItem.lng
  };
}

export function distanceKm(from, to) {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(to.lat - from.lat);
  const dLng = degreesToRadians(to.lng - from.lng);
  const lat1 = degreesToRadians(from.lat);
  const lat2 = degreesToRadians(to.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusKm * c);
}

async function loadAirports() {
  if (cache) return cache;

  for (const csvPath of csvPaths) {
    const raw = await readFile(csvPath, 'utf8').catch(() => null);
    if (!raw) continue;

    const records = parse(raw, { columns: true, skip_empty_lines: true });
    cache = records
      .filter((row) => row.type && row.type !== 'closed' && row.iata_code && row.latitude_deg && row.longitude_deg)
      .map((row) => airport(
        row.iata_code,
        row.ident,
        row.name,
        row.municipality || row.name,
        row.iso_country,
        Number(row.latitude_deg),
        Number(row.longitude_deg),
        row.keywords
      ))
      .filter((item) => item.iata && Number.isFinite(item.lat) && Number.isFinite(item.lng));
    return cache;
  }

  cache = fallbackAirports;
  return cache;
}

function airport(iata, icao, name, city, country, lat, lng, keywords = '') {
  return {
    iata,
    icao,
    name,
    city,
    country,
    lat,
    lng,
    label: `${iata || icao} - ${name}, ${city}`,
    // Nomi alternativi di OurAirports (es. "Torino-Caselle"): servono solo alla ricerca.
    keywords
  };
}

function scoreAirport(item, query) {
  const exactCodes = [item.iata, item.icao].filter(Boolean).map(normalize);
  if (exactCodes.includes(query)) return 100;

  const haystack = normalize(`${item.iata} ${item.icao} ${item.name} ${item.city} ${item.country} ${item.keywords || ''}`);
  if (haystack.startsWith(query)) return 80;
  if (haystack.includes(query)) return 40;

  return 0;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function degreesToRadians(value) {
  return value * Math.PI / 180;
}

function inferCityLabel(airportItem) {
  const iata = String(airportItem.iata || '').trim().toUpperCase();
  if (preferredCityByIata[iata]) {
    return preferredCityByIata[iata];
  }

  const municipality = String(airportItem.city || '').trim();

  if (municipality && !/\([^)]+\)/.test(municipality) && !/^orio al serio$/i.test(municipality)) {
    return municipality;
  }

  const airportName = String(airportItem.name || '').trim();
  if (!airportName) {
    return municipality;
  }

  const cleaned = airportName
    .replace(/\b(International|Airport|Aerodrome|Airfield)\b/gi, '')
    .replace(/"[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const firstChunk = cleaned.split(/[,-]/)[0].trim();
  const preferredChunk = firstChunk.trim();

  if (preferredChunk) {
    const firstWord = preferredChunk.split(' ')[0];
    return firstWord || municipality || airportItem.iata;
  }

  return municipality || airportItem.iata;
}
