import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/requireAuth.js';
import { readDb, updateDb } from '../services/database.js';

// Diritti dell'interessato (GDPR): accesso e portabilità (art. 15 e 20), cancellazione (art. 17).
const router = Router();
router.use(requireAuth);

const owned = (list, userId) => (list || []).filter((item) => item.ownerId === userId);

// Tutti i dati dell'utente in JSON leggibile e riutilizzabile, senza segreti (hash password, token).
router.get('/export', async (req, res, next) => {
  try {
    const db = await readDb();
    const user = db.users.find((item) => item.id === req.user.sub);
    const strip = ({ ownerId, ...rest }) => rest;

    const payload = {
      exportedAt: new Date().toISOString(),
      format: 'tripsight-export-v1',
      account: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      flights: owned(db.trips, user.id).map(strip),
      trips: owned(db.journeys, user.id).map(strip),
      wishlist: db.wishlists.find((entry) => entry.ownerId === user.id)?.items || [],
      emailImports: owned(db.inbox, user.id).map(strip)
    };

    res
      .type('application/json')
      .attachment(`tripsight-dati-${new Date().toISOString().slice(0, 10)}.json`)
      .send(JSON.stringify(payload, null, 2));
  } catch (error) {
    next(error);
  }
});

// Cancellazione definitiva: account e ogni dato collegato. Richiede la password per evitare
// che una sessione lasciata aperta basti a cancellare tutto.
router.delete('/', async (req, res, next) => {
  try {
    const password = String(req.body?.password || '');

    if (!(await bcrypt.compare(password, req.userRecord.passwordHash))) {
      return next({ status: 403, message: 'Password non corretta' });
    }

    await updateDb((db) => {
      const id = req.user.sub;
      db.users = db.users.filter((item) => item.id !== id);
      db.trips = db.trips.filter((item) => item.ownerId !== id);
      db.journeys = db.journeys.filter((item) => item.ownerId !== id);
      db.wishlists = db.wishlists.filter((item) => item.ownerId !== id);
      db.inbox = (db.inbox || []).filter((item) => item.ownerId !== id);
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
