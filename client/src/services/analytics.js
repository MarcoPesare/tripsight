import { airlineLabel } from './geo';
import { daysBetween, flightCostBase } from './format';

export const SPEND_CATEGORIES = ['flight', 'stay', 'transport', 'food', 'activities', 'shopping', 'other'];

const year = (date) => String(date || '').slice(0, 4);

// Spesa per anno e categoria. I voli contano nell'anno del volo, le spese nell'anno della spesa.
export function spendByYear(trips, journeys) {
  const years = new Map();
  const bucket = (key) => {
    if (!years.has(key)) years.set(key, Object.fromEntries(SPEND_CATEGORIES.map((category) => [category, 0])));
    return years.get(key);
  };

  trips.forEach((trip) => {
    const cost = flightCostBase(trip);
    if (cost && year(trip.startDate)) bucket(year(trip.startDate)).flight += cost;
  });

  journeys.forEach((journey) => {
    (journey.expenses || []).forEach((expense) => {
      const key = year(expense.date || journey.startDate);
      if (key && expense.amountBase) bucket(key)[expense.category in bucket(key) ? expense.category : 'other'] += Number(expense.amountBase);
    });
  });

  return [...years.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, segments]) => ({ label, segments, total: Object.values(segments).reduce((sum, value) => sum + value, 0) }));
}

// Costo al km per compagnia: somma prezzi / somma km, così un volo lungo pesa per quello che è.
export function airlineEfficiency(trips) {
  const groups = new Map();

  trips.forEach((trip) => {
    const cost = flightCostBase(trip);
    const km = Number(trip.distanceKm || 0);
    if (!cost || !km) return;

    const name = airlineLabel(trip.airline, trip.airlineCode) || trip.flightNumber.slice(0, 2);
    const group = groups.get(name) || { label: name, cost: 0, km: 0, count: 0 };
    group.cost += cost;
    group.km += km;
    group.count += 1;
    groups.set(name, group);
  });

  return [...groups.values()]
    .map((group) => ({ ...group, value: group.cost / group.km }))
    .sort((a, b) => a.value - b.value);
}

// Anticipo di prenotazione (giorni) contro costo al km.
export function leadTimePoints(trips) {
  return trips
    .filter((trip) => trip.bookedAt && trip.startDate && flightCostBase(trip) && trip.distanceKm)
    .map((trip) => ({
      id: trip.id,
      x: Math.max(0, daysBetween(trip.bookedAt, trip.startDate) - 1),
      y: flightCostBase(trip) / Number(trip.distanceKm),
      label: `${trip.departure?.iata} → ${trip.arrival?.iata}`,
      cost: flightCostBase(trip)
    }));
}

// Costo medio al km per mese di partenza (1-12).
export function monthlyCost(trips) {
  const months = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, cost: 0, km: 0, count: 0 }));

  trips.forEach((trip) => {
    const cost = flightCostBase(trip);
    const km = Number(trip.distanceKm || 0);
    const month = Number(String(trip.startDate || '').slice(5, 7));
    if (!cost || !km || !month) return;

    months[month - 1].cost += cost;
    months[month - 1].km += km;
    months[month - 1].count += 1;
  });

  return months.map((item) => ({ ...item, value: item.km ? item.cost / item.km : 0 }));
}

// Frasi di sintesi: escono solo quando i dati bastano per dire qualcosa di onesto.
export function buildInsights({ points, months, airlines, summaries }) {
  const insights = [];
  const early = points.filter((point) => point.x >= 30);
  const late = points.filter((point) => point.x < 30);

  if (early.length >= 2 && late.length >= 2) {
    const avgEarly = average(early.map((point) => point.y));
    const avgLate = average(late.map((point) => point.y));
    const diff = Math.round(((avgLate - avgEarly) / avgEarly) * 100);

    insights.push({ key: 'leadTime', values: { diff, early: avgEarly, late: avgLate } });
  }

  const monthsWithData = months.filter((month) => month.count);
  if (monthsWithData.length >= 3) {
    const sorted = [...monthsWithData].sort((a, b) => a.value - b.value);
    insights.push({ key: 'months', values: { cheapest: sorted[0].month, priciest: sorted.at(-1).month } });
  }

  if (airlines.length >= 2) {
    insights.push({ key: 'airline', values: { best: airlines[0].label, worst: airlines.at(-1).label, ratio: airlines.at(-1).value / airlines[0].value } });
  }

  const priced = summaries.filter((summary) => summary.total && summary.days);
  if (priced.length >= 2) {
    const sorted = [...priced].sort((a, b) => a.perDay - b.perDay);
    insights.push({ key: 'journeys', values: { cheapest: sorted[0], priciest: sorted.at(-1) } });
  }

  return insights;
}

export function average(values) {
  if (!values.length) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
