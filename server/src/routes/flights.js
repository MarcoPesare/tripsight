import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { estimateFare } from '../services/fareProvider.js';
import { resolveFlight } from '../services/flightResolver.js';

const router = Router();
router.use(requireAuth);

router.get('/resolve', async (req, res, next) => {
  try {
    res.json(await resolveFlight({
      flightNumber: req.query.flightNumber,
      date: req.query.date,
      from: req.query.from
    }));
  } catch (error) {
    next(error);
  }
});

// Prezzo medio di mercato della tratta (sola andata, EUR) per il mese del volo.
router.get('/fare-estimate', async (req, res, next) => {
  try {
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    if (!/^[A-Z]{3}$/i.test(from) || !/^[A-Z]{3}$/i.test(to)) {
      return next({ status: 400, message: 'Indica partenza e arrivo con il codice IATA' });
    }

    res.json(await estimateFare({ from, to, date: String(req.query.date || '') }));
  } catch (error) {
    next(error);
  }
});

export default router;
