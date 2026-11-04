import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { providerLimits, userRateLimit } from '../middleware/rateLimit.js';
import { readDb, updateDb } from '../services/database.js';
import { airportCodes } from '../services/airportCatalog.js';
import { addEmailToInbox, flightInput, parseEml } from '../services/inbox.js';
import { normalizeJourney, validateJourney } from '../services/journeyModel.js';
import { normalizeTrip, validateTrip } from '../services/tripModel.js';

const router = Router();
router.use(requireAuth);

const pendingOf = (db, userId) => (db.inbox || [])
  .filter((item) => item.ownerId === userId && item.status === 'pending')
  .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

router.get('/', async (req, res, next) => {
  try {
    const db = await readDb();
    res.json({ items: pendingOf(db, req.user.sub) });
  } catch (error) {
    next(error);
  }
});

// "Incolla email": testo copiato, HTML o sorgente .eml della conferma.
router.post('/paste', userRateLimit(providerLimits.inboxPaste), async (req, res, next) => {
  try {
    const content = String(req.body.content || '');

    if (content.trim().length < 20) {
      return next({ status: 400, message: 'Incolla il testo o l’HTML completo dell’email di conferma' });
    }

    // "Mostra originale" di Gmail/Outlook: intestazioni + corpo codificato. Altrimenti testo o HTML.
    const eml = parseEml(content);
    const isHtml = /<\w+[^>]*>/.test(content);
    const email = eml
      ? { ...eml, subject: eml.subject.slice(0, 200), receivedAt: eml.receivedAt || new Date().toISOString() }
      : { html: isHtml ? content : '', text: isHtml ? '' : content, subject: String(req.body.subject || '').slice(0, 200), receivedAt: new Date().toISOString() };
    const airports = await airportCodes();
    const result = await updateDb((db) => addEmailToInbox(db, req.userRecord, { ...email, airports }, 'paste'));

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/dismiss', async (req, res, next) => {
  try {
    const found = await updateDb((db) => {
      const item = (db.inbox || []).find((entry) => entry.id === req.params.id && entry.ownerId === req.user.sub);
      if (item) item.status = 'dismissed';
      return Boolean(item);
    });

    if (!found) return next({ status: 404, message: 'Elemento non trovato' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Conferma: l'utente può correggere i dati estratti prima che diventino un volo o una spesa.
router.post('/:id/import', async (req, res, next) => {
  try {
    const db = await readDb();
    const item = (db.inbox || []).find((entry) => entry.id === req.params.id && entry.ownerId === req.user.sub && entry.status === 'pending');

    if (!item) return next({ status: 404, message: 'Elemento non trovato o già importato' });

    const data = { ...item.data, ...(req.body.data || {}) };

    if (item.kind === 'flight') {
      const trip = await normalizeTrip(flightInput(data), req.user.sub);
      const validationError = validateTrip(trip);
      if (validationError) return next({ status: 400, message: validationError });

      const result = await updateDb((current) => {
        const duplicate = current.trips.some((entry) => entry.ownerId === req.user.sub && entry.flightNumber === trip.flightNumber && entry.startDate === trip.startDate);
        const entry = current.inbox.find((inboxItem) => inboxItem.id === item.id);
        entry.status = duplicate ? 'dismissed' : 'imported';
        if (duplicate) return { duplicate: true };

        current.trips.push(trip);
        return { trip };
      });

      if (result.duplicate) return next({ status: 409, message: `Il volo ${trip.flightNumber} del ${trip.startDate} è già nel registro` });
      return res.status(201).json(result);
    }

    // Alloggio → spesa "Alloggio" di un viaggio esistente, oppure un viaggio nuovo con le sue date.
    const journeyId = String(req.body.journeyId || '');
    const expense = { category: 'stay', label: data.name, amount: Number(data.price || 0), currency: data.currency, date: data.checkIn };
    const existing = journeyId && journeyId !== 'new' ? db.journeys.find((entry) => entry.id === journeyId && entry.ownerId === req.user.sub) : null;

    if (journeyId !== 'new' && !existing) return next({ status: 400, message: 'Scegli il viaggio a cui aggiungere l’alloggio' });

    const journey = existing
      ? await normalizeJourney({ ...existing, expenses: [...existing.expenses, expense] }, req.user.sub, existing)
      : await normalizeJourney({
        title: data.city || data.name || 'Nuovo viaggio',
        destinationCity: data.city,
        destinationCountry: data.country,
        startDate: data.checkIn,
        endDate: data.checkOut || data.checkIn,
        expenses: [expense]
      }, req.user.sub);
    const validationError = validateJourney(journey);
    if (validationError) return next({ status: 400, message: validationError });

    await updateDb((current) => {
      const index = current.journeys.findIndex((entry) => entry.id === journey.id);
      if (index === -1) current.journeys.push(journey); else current.journeys[index] = journey;
      current.inbox.find((inboxItem) => inboxItem.id === item.id).status = 'imported';
    });

    res.status(201).json({ journey: { ...journey, flightIds: db.trips.filter((trip) => trip.journeyId === journey.id).map((trip) => trip.id) } });
  } catch (error) {
    next(error);
  }
});

export default router;
