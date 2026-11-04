import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { CSV_TEMPLATE, parseFlightCsv } from '../services/csvImport.js';
import { readDb, updateDb } from '../services/database.js';
import { normalizeTrip, validateTrip } from '../services/tripModel.js';

const router = Router();
const maxRows = 1000;

router.get('/flights/template.csv', (_req, res) => {
  res.type('text/csv').attachment('tripsight-voli.csv').send(CSV_TEMPLATE);
});

router.use(requireAuth);

// dryRun=true restituisce l'anteprima riga per riga senza salvare nulla.
router.post('/flights', async (req, res, next) => {
  try {
    const { rows } = parseFlightCsv(req.body.csv);

    if (rows.length > maxRows) {
      return next({ status: 400, message: `Massimo ${maxRows} righe per import` });
    }

    const db = await readDb();
    const seen = new Set(db.trips.filter((trip) => trip.ownerId === req.user.sub).map((trip) => `${trip.flightNumber}:${trip.startDate}`));
    const results = [];

    for (const row of rows) {
      if (row.skip || row.error) {
        results.push({ line: row.line, status: row.skip ? 'skipped' : 'error', message: row.skip || row.error });
        continue;
      }

      const trip = await normalizeTrip(row.input, req.user.sub);
      const validationError = validateTrip(trip);
      const key = `${trip.flightNumber}:${trip.startDate}`;

      if (validationError) {
        results.push({ line: row.line, status: 'error', message: validationError, flightNumber: trip.flightNumber, startDate: trip.startDate });
      } else if (seen.has(key)) {
        results.push({ line: row.line, status: 'duplicate', message: 'Già presente', flightNumber: trip.flightNumber, startDate: trip.startDate });
      } else {
        seen.add(key);
        results.push({ line: row.line, status: 'ok', trip });
      }
    }

    const toImport = results.filter((result) => result.status === 'ok').map((result) => result.trip);

    if (!req.body.dryRun && toImport.length) {
      await updateDb((current) => {
        current.trips.push(...toImport);
      });
    }

    res.json({
      imported: req.body.dryRun ? 0 : toImport.length,
      summary: countBy(results),
      rows: results.map(({ trip, ...rest }) => ({
        ...rest,
        ...(trip && {
          flightNumber: trip.flightNumber,
          startDate: trip.startDate,
          route: `${trip.departure.iata} → ${trip.arrival.iata}`,
          priceBase: trip.bookingTotalBase
        })
      }))
    });
  } catch (error) {
    next(error.status ? error : { status: 400, message: `CSV non leggibile: ${error.message}` });
  }
});

function countBy(results) {
  return results.reduce((acc, result) => ({ ...acc, [result.status]: (acc[result.status] || 0) + 1 }), {});
}

export default router;
