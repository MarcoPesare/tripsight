import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { readDb, updateDb } from '../services/database.js';
import { normalizeJourney, validateJourney } from '../services/journeyModel.js';

const router = Router();
router.use(requireAuth);

function withFlights(journey, trips) {
  return {
    ...journey,
    flightIds: trips.filter((trip) => trip.journeyId === journey.id).map((trip) => trip.id)
  };
}

// Il collegamento vive sul volo (trip.journeyId): un volo appartiene al massimo a un viaggio.
function linkFlights(db, ownerId, journeyId, flightIds) {
  if (!Array.isArray(flightIds)) return;

  const wanted = new Set(flightIds.map(String));
  db.trips.forEach((trip) => {
    if (trip.ownerId !== ownerId) return;

    if (wanted.has(trip.id)) {
      trip.journeyId = journeyId;
    } else if (trip.journeyId === journeyId) {
      trip.journeyId = '';
    }
  });
}

router.get('/', async (req, res, next) => {
  try {
    const db = await readDb();
    const trips = db.trips.filter((trip) => trip.ownerId === req.user.sub);
    const journeys = db.journeys
      .filter((journey) => journey.ownerId === req.user.sub)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map((journey) => withFlights(journey, trips));

    res.json(journeys);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const journey = await normalizeJourney(req.body, req.user.sub);
    const validationError = validateJourney(journey);

    if (validationError) {
      return next({ status: 400, message: validationError });
    }

    const saved = await updateDb((db) => {
      db.journeys.push(journey);
      linkFlights(db, req.user.sub, journey.id, req.body.flightIds);
      return withFlights(journey, db.trips);
    });

    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const db = await readDb();
    const existing = db.journeys.find((item) => item.id === req.params.id && item.ownerId === req.user.sub);

    if (!existing) {
      return next({ status: 404, message: 'Viaggio non trovato' });
    }

    const journey = await normalizeJourney(req.body, req.user.sub, existing);
    const validationError = validateJourney(journey);

    if (validationError) {
      return next({ status: 400, message: validationError });
    }

    const saved = await updateDb((current) => {
      const index = current.journeys.findIndex((item) => item.id === journey.id && item.ownerId === req.user.sub);
      if (index === -1) return null;

      current.journeys[index] = journey;
      linkFlights(current, req.user.sub, journey.id, req.body.flightIds);
      return withFlights(journey, current.trips);
    });

    if (!saved) {
      return next({ status: 404, message: 'Viaggio non trovato' });
    }

    res.json(saved);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const removed = await updateDb((db) => {
      const before = db.journeys.length;
      db.journeys = db.journeys.filter((journey) => !(journey.id === req.params.id && journey.ownerId === req.user.sub));

      if (db.journeys.length === before) return false;

      linkFlights(db, req.user.sub, req.params.id, []);
      return true;
    });

    if (!removed) {
      return next({ status: 404, message: 'Viaggio non trovato' });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
