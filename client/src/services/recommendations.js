import { DESTINATIONS } from './destinations';
import { daysBetween, flightCostBase } from './format';
import { average } from './analytics';

// Pesi massimi dei fattori: la somma fa 100, così il punteggio è leggibile come percentuale.
export const WEIGHTS = { affinity: 35, season: 20, budget: 20, distance: 15, novelty: 10 };

const typeToTag = { sea: 'sea', culture: 'culture', nature: 'nature', city_break: 'weekend', friends: 'nightlife', work: 'business' };
const visitedRadiusKm = 60;

export function distanceKm(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Profilo dell'utente ricavato da voli e viaggi: è tutto ciò che lo scoring usa.
export function buildProfile(trips, journeys) {
  const tagWeights = {};
  const addTags = (tags, type, rating, wouldReturn) => {
    // Viaggio amato = +2, nella media = +1, deludente = -1.
    const weight = wouldReturn === false || (rating && rating <= 2) ? -1 : rating >= 4 || wouldReturn === true ? 2 : 1;
    const all = new Set([...(tags || []), typeToTag[type]].filter(Boolean));
    all.forEach((tag) => { tagWeights[tag] = (tagWeights[tag] || 0) + weight; });
  };

  journeys.forEach((journey) => addTags(journey.tags, journey.tripType, journey.rating, journey.wouldReturn));
  // Voli non assegnati a un viaggio ma con valutazione (dati precedenti al modello Viaggio).
  trips.filter((trip) => !trip.journeyId && (trip.tags?.length || trip.rating)).forEach((trip) => addTags(trip.tags, trip.tripType, trip.rating, trip.wouldReturn));

  const departures = new Map();
  trips.forEach((trip) => {
    if (!trip.departure?.lat) return;
    const entry = departures.get(trip.departure.iata) || { place: trip.departure, count: 0 };
    entry.count += 1;
    departures.set(trip.departure.iata, entry);
  });
  const home = [...departures.values()].sort((a, b) => b.count - a.count)[0]?.place || null;

  const distances = trips.map((trip) => Number(trip.distanceKm || 0)).filter(Boolean).sort((a, b) => a - b);
  const typicalKm = distances.length ? distances[Math.floor(distances.length / 2)] : 0;

  // Spesa a terra al giorno (senza voli), confrontabile con il budget del catalogo.
  const groundDays = journeys
    .map((journey) => ({ journey, ground: (journey.expenses || []).reduce((sum, expense) => sum + Number(expense.amountBase || 0), 0) }))
    .filter((item) => item.ground > 0);
  const dailyBudget = groundDays.length
    ? groundDays.reduce((sum, item) => sum + item.ground, 0) / groundDays.reduce((sum, item) => sum + daysBetween(item.journey.startDate, item.journey.endDate), 0)
    : 0;

  const visited = [...trips.flatMap((trip) => [trip.departure, trip.arrival])].filter((place) => place?.lat);
  const visitedCountries = new Set([
    ...visited.map((place) => place.country),
    ...journeys.map((journey) => journey.destinationCountry)
  ].filter(Boolean));

  return {
    tagWeights,
    home,
    typicalKm,
    dailyBudget,
    visited,
    visitedCountries,
    avgFlightCost: average(trips.map(flightCostBase).filter(Boolean)),
    hasTaste: Object.keys(tagWeights).length > 0
  };
}

export function buildRecommendations(profile, { month, maxBudget = 0, tags = [], wishlistIds = [], limit = 9 } = {}) {
  return DESTINATIONS
    .filter((candidate) => !profile.visited.some((place) => distanceKm(place, candidate) < visitedRadiusKm))
    .filter((candidate) => !maxBudget || candidate.budget <= maxBudget)
    .filter((candidate) => tags.every((tag) => candidate.tags.includes(tag)))
    .map((candidate) => scoreCandidate(candidate, profile, month, wishlistIds))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function scoreCandidate(candidate, profile, month, wishlistIds = []) {
  const parts = {};
  const reasons = [];

  // 1. Affinità: tag che hai amato pesano, quelli dei viaggi deludenti tolgono.
  if (profile.hasTaste) {
    const positive = Object.values(profile.tagWeights).filter((value) => value > 0).sort((a, b) => b - a);
    const ceiling = positive.slice(0, candidate.tags.length).reduce((sum, value) => sum + value, 0) || 1;
    const raw = candidate.tags.reduce((sum, tag) => sum + (profile.tagWeights[tag] || 0), 0);
    parts.affinity = clamp(raw / ceiling) * WEIGHTS.affinity;
    const liked = candidate.tags.filter((tag) => profile.tagWeights[tag] > 0).sort((a, b) => profile.tagWeights[b] - profile.tagWeights[a]);
    const disliked = candidate.tags.filter((tag) => profile.tagWeights[tag] < 0);
    if (liked.length) reasons.push({ key: 'affinity', tags: liked.slice(0, 2) });
    if (disliked.length) reasons.push({ key: 'dislike', tags: disliked.slice(0, 1) });
  } else {
    parts.affinity = WEIGHTS.affinity / 2;
  }

  // 2. Stagione: mese ideale pieno, mese adiacente metà.
  if (month) {
    const adjacent = [((month + 10) % 12) + 1, (month % 12) + 1];
    parts.season = candidate.months.includes(month) ? WEIGHTS.season : candidate.months.some((item) => adjacent.includes(item)) ? WEIGHTS.season / 2 : 0;
    reasons.push({ key: parts.season === WEIGHTS.season ? 'seasonGood' : parts.season ? 'seasonOk' : 'seasonBad' });
  } else {
    parts.season = WEIGHTS.season / 2;
  }

  // 3. Budget: confronto con quanto spendi davvero a terra al giorno.
  if (profile.dailyBudget) {
    const ratio = candidate.budget / profile.dailyBudget;
    parts.budget = ratio <= 1 ? WEIGHTS.budget : ratio <= 1.25 ? WEIGHTS.budget * 0.6 : ratio <= 1.6 ? WEIGHTS.budget * 0.25 : 0;
    reasons.push({ key: ratio <= 1 ? 'budgetUnder' : 'budgetOver', value: candidate.budget, user: profile.dailyBudget });
  } else {
    parts.budget = candidate.tags.includes('low-cost') ? WEIGHTS.budget * 0.75 : WEIGHTS.budget / 2;
  }

  // 4. Distanza: vicino alle tratte che fai di solito.
  const fromHomeKm = profile.home ? distanceKm(profile.home, candidate) : 0;
  if (fromHomeKm && profile.typicalKm) {
    const ratio = fromHomeKm / profile.typicalKm;
    parts.distance = ratio >= 0.5 && ratio <= 1.5 ? WEIGHTS.distance : ratio >= 0.3 && ratio <= 2.5 ? WEIGHTS.distance / 2 : WEIGHTS.distance * 0.15;
    if (parts.distance === WEIGHTS.distance) reasons.push({ key: 'distance' });
    if (ratio > 2.5) reasons.push({ key: 'farther' });
  } else {
    parts.distance = WEIGHTS.distance / 2;
  }

  // 5. Novità: un paese mai visto vale di più.
  const newCountry = !profile.visitedCountries.has(candidate.country);
  parts.novelty = newCountry ? WEIGHTS.novelty : WEIGHTS.novelty * 0.3;
  if (newCountry) reasons.push({ key: 'newCountry', country: candidate.country });

  const score = Math.round(Object.values(parts).reduce((sum, value) => sum + value, 0));

  return {
    ...candidate,
    score,
    parts,
    reasons,
    flightHours: fromHomeKm ? Math.round((fromHomeKm / (fromHomeKm > 4500 ? 860 : 760) + 0.5) * 10) / 10 : null,
    fromHomeKm: Math.round(fromHomeKm),
    saved: wishlistIds.includes(candidate.id)
  };
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}
