import { Router } from 'express';
import { lookupCityImage } from '../services/cityImages.js';

// Foto delle città e relativa attribuzione, servite dal nostro server (vedi services/cityImages.js).
const router = Router();

function cityFrom(req) {
  const city = String(req.query.city || '').trim().slice(0, 80);
  return city && /^[\p{L}\p{M} .'-]+$/u.test(city) ? city : '';
}

router.get('/', async (req, res, next) => {
  try {
    const city = cityFrom(req);
    if (!city) return res.status(400).end();

    const entry = await lookupCityImage(city);
    if (entry.empty) return res.status(404).end();

    // Immagine usata da <img> sul client, che può stare su un'altra origine (es. sviluppo 5173 → 4000).
    res.set({ 'Cache-Control': 'public, max-age=604800', 'Cross-Origin-Resource-Policy': 'cross-origin' }).type(entry.type).send(entry.body);
  } catch (error) {
    next(error);
  }
});

// Autore, licenza e pagina del file: null se la foto non c'è o i dati del file non sono disponibili.
router.get('/credit', async (req, res, next) => {
  try {
    const city = cityFrom(req);
    if (!city) return res.status(400).end();

    const entry = await lookupCityImage(city);
    res.set('Cache-Control', 'public, max-age=604800').json(entry.empty ? null : entry.credit || null);
  } catch (error) {
    next(error);
  }
});

export default router;
