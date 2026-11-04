import { flightCostBase } from './format';

// Media di quanto hai pagato tu la stessa tratta (in entrambe le direzioni), in EUR per tratta.
// Serve solo come confronto con il prezzo di mercato, che arriva dal server.
export function personalRouteAverage({ from, to, trips }) {
  const legs = trips.filter((trip) => {
    const a = trip.departure?.iata;
    const b = trip.arrival?.iata;
    return flightCostBase(trip) > 0 && ((a === from && b === to) || (a === to && b === from));
  });

  if (!legs.length) return null;
  return { amount: Math.round(legs.reduce((sum, trip) => sum + flightCostBase(trip), 0) / legs.length), count: legs.length };
}
