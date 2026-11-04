import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Nessuna chiamata reale: modalità mock per il resolver, fetch finto per la cache.
process.env.DATA_DIR = await mkdtemp(path.join(tmpdir(), 'tripsight-flights-'));
const { resolveFlight } = await import('../src/services/flightResolver.js');
const { providerRequest } = await import('../src/services/flightProvider.js');

const withProvider = async (name, run) => {
  const previous = process.env.FLIGHT_PROVIDER;
  process.env.FLIGHT_PROVIDER = name;
  try {
    return await run();
  } finally {
    process.env.FLIGHT_PROVIDER = previous;
  }
};

test('mock: un volo fittizio viene risolto con tratta, orari e compagnia', () => withProvider('mock', async () => {
  const flight = await resolveFlight({ flightNumber: 'zz 100', date: '2027-03-12' });

  assert.equal(`${flight.departure.iata}-${flight.arrival.iata}`, 'TRN-BCN');
  assert.equal(flight.startDate, '2027-03-12');
  assert.equal(flight.departureTime, '2027-03-12 06:00');
  assert.equal(flight.airline, 'Demo Air');
  assert.equal(flight.provider, 'mock');
}));

test('mock: un numero con più tratte le propone e "from" sceglie quella giusta', () => withProvider('mock', async () => {
  const first = await resolveFlight({ flightNumber: 'ZZ206', date: '2027-03-12' });
  assert.deepEqual(first.legs.map((leg) => `${leg.from}-${leg.to}`), ['JFK-MXP', 'MXP-DXB']);

  const chosen = await resolveFlight({ flightNumber: 'ZZ206', date: '2027-03-12', from: 'MXP' });
  assert.equal(`${chosen.departure.iata}-${chosen.arrival.iata}`, 'MXP-DXB');
}));

test('mock: volo inesistente → 404, quota esaurita → 503 con messaggio chiaro', () => withProvider('mock', async () => {
  await assert.rejects(resolveFlight({ flightNumber: 'ZZ9999', date: '2027-03-12' }), { status: 404 });
  await assert.rejects(resolveFlight({ flightNumber: 'ZZ9001', date: '2027-03-12' }), (error) => error.status === 503 && /limite/.test(error.message));
}));

test('cache su disco: la stessa richiesta non chiama due volte, e con quota esaurita usa il dato salvato', () => withProvider('airlabs', async () => {
  const realFetch = globalThis.fetch;
  process.env.AIRLABS_API_KEY ||= 'test';
  let calls = 0;
  let reply = { response: [{ flight_iata: 'XX1' }] };
  globalThis.fetch = async () => { calls += 1; return new Response(JSON.stringify(reply), { status: 200 }); };

  try {
    const params = { flight_iata: `XX${Date.now()}` };
    assert.deepEqual(await providerRequest('schedules', params), reply);
    assert.deepEqual(await providerRequest('schedules', params), reply);
    assert.equal(calls, 1);

    // Dato scaduto + fornitore in errore → si usa comunque il dato in cache.
    const realNow = Date.now;
    Date.now = () => realNow() + 4 * 60 * 60 * 1000;
    const saved = reply;
    reply = { error: { code: 'month_limit_exceeded' } };
    try {
      assert.deepEqual(await providerRequest('schedules', params), saved);
      assert.equal(calls, 2);
    } finally {
      Date.now = realNow;
    }
  } finally {
    globalThis.fetch = realFetch;
  }
}));
