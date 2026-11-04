import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { readDb, updateDb } from '../services/database.js';

const router = Router();
router.use(requireAuth);

function normalizeItem(item) {
  return {
    id: String(item?.id || '').slice(0, 40),
    name: String(item?.name || '').slice(0, 80),
    country: String(item?.country || '').toUpperCase().slice(0, 2),
    airport: String(item?.airport || '').toUpperCase().slice(0, 4),
    savedAt: String(item?.savedAt || new Date().toISOString())
  };
}

router.get('/', async (req, res, next) => {
  try {
    const db = await readDb();
    res.json(db.wishlists.find((entry) => entry.ownerId === req.user.sub)?.items || []);
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const items = (Array.isArray(req.body.items) ? req.body.items : [])
      .map(normalizeItem)
      .filter((item) => item.id)
      .slice(0, 100);

    await updateDb((db) => {
      const entry = db.wishlists.find((item) => item.ownerId === req.user.sub);

      if (entry) {
        entry.items = items;
      } else {
        db.wishlists.push({ ownerId: req.user.sub, items });
      }
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

export default router;
