const displayNamesCache = new Map();
// Nome commerciale per codice IATA/ICAO. Ha la precedenza sul nome restituito dal provider:
// i vettori regionali e le filiali volano col marchio della compagnia madre
// (es. Air Nostrum opera i voli "Iberia Regional", Malta Air e Ryanair UK sono Ryanair).
const airlineBrands = {
  VY: 'Vueling', VLG: 'Vueling',
  IB: 'Iberia', IBE: 'Iberia', YW: 'Iberia', ANE: 'Iberia', I2: 'Iberia Express', IBS: 'Iberia Express',
  UX: 'Air Europa', AEA: 'Air Europa', V7: 'Volotea', VOE: 'Volotea', V0: 'Volotea',
  FR: 'Ryanair', RYR: 'Ryanair', RK: 'Ryanair', AL: 'Ryanair', MW: 'Ryanair', MAY: 'Ryanair', LW: 'Ryanair', LDM: 'Ryanair', OE: 'Ryanair', RR: 'Ryanair',
  U2: 'easyJet', EZY: 'easyJet', EJU: 'easyJet', EC: 'easyJet', DS: 'easyJet', EZS: 'easyJet',
  W6: 'Wizz Air', WZZ: 'Wizz Air', W4: 'Wizz Air', WMT: 'Wizz Air', W9: 'Wizz Air', WUK: 'Wizz Air', '5W': 'Wizz Air',
  AZ: 'ITA Airways', ITY: 'ITA Airways', XZ: 'Aeroitalia', O8: 'Aeroitalia', KM: 'KM Malta Airlines', JU: 'Air Serbia',
  LH: 'Lufthansa', DLH: 'Lufthansa', CL: 'Lufthansa', VL: 'Lufthansa', EN: 'Air Dolomiti', DLA: 'Air Dolomiti',
  AF: 'Air France', AFR: 'Air France', A5: 'Air France', KL: 'KLM', KLM: 'KLM', HV: 'Transavia', TRA: 'Transavia', TO: 'Transavia',
  BA: 'British Airways', BAW: 'British Airways', A0: 'British Airways', CJ: 'British Airways', EI: 'Aer Lingus', EIN: 'Aer Lingus',
  LX: 'Swiss', SWR: 'Swiss', OS: 'Austrian', AUA: 'Austrian', SN: 'Brussels Airlines', BEL: 'Brussels Airlines',
  TP: 'TAP Air Portugal', TAP: 'TAP Air Portugal', SK: 'SAS', SAS: 'SAS', AY: 'Finnair', FIN: 'Finnair',
  DY: 'Norwegian', NAX: 'Norwegian', D8: 'Norwegian', EW: 'Eurowings', EWG: 'Eurowings',
  TK: 'Turkish Airlines', THY: 'Turkish Airlines', VF: 'AJet', FZ: 'flydubai', G9: 'Air Arabia', PC: 'Pegasus', PGT: 'Pegasus', A3: 'Aegean', AEE: 'Aegean',
  LS: 'Jet2', EXS: 'Jet2', BT: 'airBaltic', BTI: 'airBaltic', LO: 'LOT', LOT: 'LOT',
  EK: 'Emirates', UAE: 'Emirates', QR: 'Qatar Airways', QTR: 'Qatar Airways', EY: 'Etihad', ETD: 'Etihad',
  DL: 'Delta', DAL: 'Delta', UA: 'United', UAL: 'United', AA: 'American Airlines', AAL: 'American Airlines'
};

const preferredCityByIata = {
  BGY: 'Bergamo'
};

const invalidCityTokens = new Set(['il', 'the', 'aeroporto', 'airport']);

export function airportCityLabel(place) {
  const iata = String(place?.iata || place?.airport || '').trim().toUpperCase();
  if (preferredCityByIata[iata]) {
    return preferredCityByIata[iata];
  }

  const city = String(place?.city || '').trim();
  const lowerCity = city.toLowerCase();
  if (city && !/\([^)]+\)/.test(city) && !invalidCityTokens.has(lowerCity) && lowerCity !== 'orio al serio') {
    return city;
  }

  return guessCityFromAirportName(place?.airportName) || city || iata;
}

export function countryLabel(code, locale = 'it') {
  const normalized = String(code || '').trim().toUpperCase();

  if (!normalized) {
    return '';
  }

  if (typeof Intl === 'undefined' || !Intl.DisplayNames) {
    return normalized;
  }

  if (!displayNamesCache.has(locale)) {
    displayNamesCache.set(locale, new Intl.DisplayNames([locale], { type: 'region' }));
  }

  return displayNamesCache.get(locale).of(normalized) || normalized;
}

export function airlineLabel(name, code) {
  const normalizedName = String(name || '').trim();
  const normalizedCode = String(code || '').trim().toUpperCase();

  // Il marchio vince sul nome del provider; un nome che è in realtà un codice ("U2") vale come codice.
  return airlineBrands[normalizedCode] || airlineBrands[normalizedName.toUpperCase()] || normalizedName || normalizedCode;
}

function guessCityFromAirportName(airportName) {
  const cleaned = String(airportName || '')
    .replace(/\b(International|Airport|Aerodrome|Airfield)\b/gi, '')
    .replace(/"[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  const firstToken = cleaned.split(/[,-]/)[0].trim();
  const normalized = firstToken.trim();

  return normalized.split(' ')[0] || normalized || firstToken;
}
