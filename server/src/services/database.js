import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalTags } from './tags.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '../data');
const dbPath = path.join(dataDir, 'travelcheck.json');
const schemaVersion = 3;

const initialData = {
  schemaVersion,
  users: [],
  trips: [],
  journeys: [],
  wishlists: [],
  inbox: []
};

// Tutte le scritture passano da questa coda: due richieste concorrenti non possono
// più leggere lo stesso snapshot e sovrascriversi a vicenda.
let writeQueue = Promise.resolve();

export async function readDb() {
  await mkdir(dataDir, { recursive: true });

  try {
    const raw = await readFile(dbPath, 'utf8');
    return migrate(JSON.parse(raw));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    return structuredClone(initialData);
  }
}

export function updateDb(mutator) {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await persist(db);
    return result;
  });

  writeQueue = run.catch(() => {});
  return run;
}

async function persist(data) {
  await mkdir(dataDir, { recursive: true });
  const tempPath = `${dbPath}.${process.pid}.tmp`;
  await writeFile(tempPath, JSON.stringify(data, null, 2));
  await rename(tempPath, dbPath);
}

function migrate(db) {
  db.users ||= [];
  db.trips ||= [];
  db.journeys ||= [];
  db.wishlists ||= [];
  db.inbox ||= [];

  if ((db.schemaVersion || 1) < 2) {
    db.trips.forEach((trip) => {
      trip.tags = canonicalTags(trip.tags);
    });
  }

  // v3: l'import via inoltro email è stato rimosso, con il suo indirizzo personale.
  if ((db.schemaVersion || 1) < 3) {
    db.users.forEach((user) => { delete user.inboxToken; });
  }

  db.schemaVersion = schemaVersion;
  return db;
}
