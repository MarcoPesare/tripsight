import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = await mkdtemp(path.join(tmpdir(), 'tripsight-fares-'));
const { estimateFare } = await import('../src/services/fareProvider.js');

const withEnv = async (vars, run) => {
  const previous = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  Object.entries(vars).forEach(([key, value]) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; });
  try {
    return await run();
  } finally {
    Object.entries(previous).forEach(([key, value]) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; });
  }
};

test('prezzo di mercato: minimo e valore tipico (75° percentile) delle tariffe dirette del mese', () => withEnv({ FARE_PROVIDER: undefined, TRAVELPAYOUTS_TOKEN: 'test' }, async () => {
  const realFetch = globalThis.fetch;
  let asked = '';
  globalThis.fetch = async (url) => {
    asked = String(url);
    const data = [40, 52, 61, 75, 300].map((price) => ({ price, transfers: 0 })).concat({ price: 20, transfers: 1 });
    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  };
  try {
    const estimate = await estimateFare({ from: 'trn', to: 'bcn', date: '2099-11-11' });
    assert.deepEqual(estimate, { amount: 75, low: 40, count: 5, month: '2099-11', currency: 'EUR', source: 'market' });
    assert.match(asked, /origin=TRN&destination=BCN&departure_at=2099-11/);
  } finally {
    globalThis.fetch = realFetch;
  }
}));

test('volo passato: usa le tariffe del mese corrente', () => withEnv({ FARE_PROVIDER: 'mock' }, async () => {
  const estimate = await estimateFare({ from: 'TRN', to: 'BCN', date: '2025-03-08' });
  assert.equal(estimate.source, 'market');
  assert.equal(estimate.month, new Date().toISOString().slice(0, 7));
}));

test('senza tariffe né token: stima per distanza; aeroporto sconosciuto: nessuna stima', () => withEnv({ FARE_PROVIDER: undefined, TRAVELPAYOUTS_TOKEN: undefined }, async () => {
  const estimate = await estimateFare({ from: 'TRN', to: 'BCN', date: '2027-03-12' });
  assert.equal(estimate.source, 'distance');
  assert.ok(estimate.amount > 50 && estimate.amount < 120);
  assert.equal(await estimateFare({ from: 'TRN', to: 'QQQ', date: '2027-03-12' }), null);
}));
