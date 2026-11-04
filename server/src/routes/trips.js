import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { readDb, updateDb } from '../services/database.js';
import { normalizeTrip, validateTrip } from '../services/tripModel.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const db = await readDb();
    const trips = db.trips
      .filter((trip) => trip.ownerId === req.user.sub)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));

    res.json(trips);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const trip = await normalizeTrip(req.body, req.user.sub);
    const validationError = validateTrip(trip);

    if (validationError) {
      return next({ status: 400, message: validationError });
    }

    await updateDb((db) => {
      db.trips.push(trip);
    });

    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = await readDb();
    const trip = db.trips.find((item) => item.id === req.params.id && item.ownerId === req.user.sub);

    if (!trip) {
      return next({ status: 404, message: 'Volo non trovato' });
    }

    res.json(trip);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const db = await readDb();
    const existing = db.trips.find((item) => item.id === req.params.id && item.ownerId === req.user.sub);

    if (!existing) {
      return next({ status: 404, message: 'Volo non trovato' });
    }

    const trip = await normalizeTrip(req.body, req.user.sub, existing);
    const validationError = validateTrip(trip);

    if (validationError) {
      return next({ status: 400, message: validationError });
    }

    const saved = await updateDb((current) => {
      const index = current.trips.findIndex((item) => item.id === trip.id && item.ownerId === req.user.sub);
      if (index === -1) return null;

      current.trips[index] = trip;
      return trip;
    });

    if (!saved) {
      return next({ status: 404, message: 'Volo non trovato' });
    }

    res.json(saved);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const removed = await updateDb((db) => {
      const before = db.trips.length;
      db.trips = db.trips.filter((trip) => !(trip.id === req.params.id && trip.ownerId === req.user.sub));
      return db.trips.length !== before;
    });

    if (!removed) {
      return next({ status: 404, message: 'Volo non trovato' });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
