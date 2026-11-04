import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { rateLimit } from '../src/middleware/rateLimit.js';

const DAY = 24 * 60 * 60 * 1000;

test('la pulizia elimina le email scadute e i token di recupero scaduti', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tripsight-'));
  const now = Date.parse('2026-10-23T12:00:00Z');
  const ago = (days) => new Date(now - days * DAY).toISOString();

  await writeFile(path.join(dir, 'travelcheck.json'), JSON.stringify({
    schemaVersion: 2,
    users: [{ id: 'u1', passwordResetTokenHash: 'x', passwordResetExpiresAt: ago(1) }],
    trips: [],
    journeys: [],
    wishlists: [],
    inbox: [
      { id: 'a', status: 'imported', receivedAt: ago(31) }, // gestita da più di 30 giorni → via
      { id: 'b', status: 'imported', receivedAt: ago(5) }, // recente → resta
      { id: 'c', status: 'pending', receivedAt: ago(60) }, // in attesa da 60 giorni → resta
      { id: 'd', status: 'pending', receivedAt: ago(91) } // in attesa da più di 90 → via
    ]
  }));

  process.env.DATA_DIR = dir;
  const { purgeExpired } = await import('../src/services/retention.js');
  const { readDb } = await import('../src/services/database.js');

  assert.equal(await purgeExpired(now), 2);
  const db = await readDb();
  assert.deepEqual(db.inbox.map((item) => item.id), ['b', 'c']);
  assert.equal(db.users[0].passwordResetTokenHash, null);
});

test('il limite tentativi blocca oltre la soglia e riparte dopo la finestra', () => {
  const limiter = rateLimit({ windowMs: 50, max: 2, message: 'troppi' });
  const call = () => new Promise((resolve) => limiter({ ip: '1.2.3.4' }, {}, (error) => resolve(error)));

  return (async () => {
    assert.equal(await call(), undefined);
    assert.equal(await call(), undefined);
    assert.equal((await call())?.status, 429);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(await call(), undefined);
  })();
});
