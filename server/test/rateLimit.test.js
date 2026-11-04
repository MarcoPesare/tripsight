import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { providerLimits, rateLimit, userRateLimit } from '../src/middleware/rateLimit.js';

const fakeRes = () => {
  const headers = {};
  return { headers, setHeader: (name, value) => { headers[name] = value; } };
};

test('il limite per utente conta ogni account separatamente', async () => {
  const limiter = userRateLimit({ windowMs: 60_000, max: 2, message: 'troppe' });
  const call = (sub, res = fakeRes()) => new Promise((resolve) => limiter({ ip: '1.2.3.4', user: { sub } }, res, resolve));

  assert.equal(await call('anna'), undefined);
  assert.equal(await call('anna'), undefined);
  assert.equal((await call('anna'))?.status, 429);
  // Stesso IP, altro account: non è bloccato.
  assert.equal(await call('bruno'), undefined);
});

test('la risposta 429 indica dopo quanti secondi riprovare', async () => {
  const limiter = rateLimit({ windowMs: 90_000, max: 1, message: 'troppe' });
  const res = fakeRes();
  const call = () => new Promise((resolve) => limiter({ ip: '5.6.7.8' }, res, resolve));

  await call();
  const error = await call();
  assert.equal(error.status, 429);
  assert.equal(error.message, 'troppe');
  const retryAfter = Number(res.headers['Retry-After']);
  assert.ok(retryAfter > 0 && retryAfter <= 90, `Retry-After inatteso: ${res.headers['Retry-After']}`);
});

test('gli endpoint dei fornitori rispondono 429 con Retry-After oltre la soglia', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tripsight-'));
  const user = { id: 'demo-user', email: 'demo@example.test', name: 'Demo', passwordVersion: 1 };
  await writeFile(path.join(dir, 'travelcheck.json'), JSON.stringify({
    schemaVersion: 2, users: [user], trips: [], journeys: [], wishlists: [], inbox: []
  }));
  process.env.DATA_DIR = dir;
  process.env.FLIGHT_PROVIDER = 'mock';
  process.env.FARE_PROVIDER = 'mock';

  const { default: express } = await import('express');
  const { default: flightRoutes } = await import('../src/routes/flights.js');
  const { default: inboxRoutes } = await import('../src/routes/inbox.js');
  const { signToken } = await import('../src/utils/auth.js');

  const app = express();
  app.use(express.json());
  app.use('/api/flights', flightRoutes);
  app.use('/api/inbox', inboxRoutes);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ message: err.message }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${signToken(user)}`, 'Content-Type': 'application/json' };

  const cases = [
    { name: 'resolve', max: providerLimits.flightResolve.max, request: () => fetch(`${base}/api/flights/resolve?flightNumber=ZZ9999&date=2026-01-15`, { headers }) },
    { name: 'fare-estimate', max: providerLimits.fareEstimate.max, request: () => fetch(`${base}/api/flights/fare-estimate?from=AAA&to=BBB&date=x`, { headers }) },
    { name: 'paste', max: providerLimits.inboxPaste.max, request: () => fetch(`${base}/api/inbox/paste`, { method: 'POST', headers, body: JSON.stringify({ content: 'corto' }) }) }
  ];

  try {
    for (const { name, max, request } of cases) {
      for (let i = 0; i < max; i += 1) {
        const response = await request();
        assert.notEqual(response.status, 429, `${name}: bloccato alla richiesta ${i + 1} di ${max}`);
        await response.arrayBuffer();
      }
      const blocked = await request();
      assert.equal(blocked.status, 429, `${name}: la richiesta oltre la soglia non è stata bloccata`);
      assert.ok(Number(blocked.headers.get('retry-after')) > 0, `${name}: manca Retry-After`);
      assert.match((await blocked.json()).message, /Troppe richieste/);
    }

    // Senza accesso risponde 401 prima del limite: un client anonimo non consuma la quota altrui.
    const anonymous = await fetch(`${base}/api/flights/resolve?flightNumber=ZZ100`);
    assert.equal(anonymous.status, 401);
  } finally {
    server.close();
  }
});
