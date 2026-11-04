import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import accountRoutes from './routes/account.js';
import authRoutes from './routes/auth.js';
import cityImageRoutes from './routes/cityImages.js';
import airportRoutes from './routes/airports.js';
import flightRoutes from './routes/flights.js';
import importRoutes from './routes/import.js';
import inboxRoutes from './routes/inbox.js';
import journeyRoutes from './routes/journeys.js';
import tripRoutes from './routes/trips.js';
import wishlistRoutes from './routes/wishlist.js';
import { rateLimit } from './middleware/rateLimit.js';
import { updateDb } from './services/database.js';
import { scheduleRetention } from './services/retention.js';
import { toBase } from './services/fx.js';
import { assertAuthConfig } from './utils/auth.js';

assertAuthConfig();

const app = express();
// Dietro un proxy (es. hosting con HTTPS terminato a monte) l'IP reale arriva in X-Forwarded-For.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tripsight-api' });
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Troppi tentativi: riprova tra qualche minuto' });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/password-reset', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/city-images', rateLimit({ windowMs: 60 * 1000, max: 120, message: 'Troppe richieste' }), cityImageRoutes);
app.use('/api/airports', airportRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/import', importRoutes);
app.use('/api/inbox', inboxRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    message: status === 500 ? 'Errore interno del server' : err.message
  });
});

app.listen(port, () => {
  console.log(`Tripsight API pronta su http://localhost:${port}`);
  backfillBaseAmounts().catch((error) => console.error('[fx] backfill non riuscito', error));
  scheduleRetention();
});

// I voli salvati prima della conversione valuta non hanno l'importo in EUR.
async function backfillBaseAmounts() {
  const count = await updateDb(async (db) => {
    const pending = db.trips.filter((trip) => trip.bookingTotalBase === undefined);

    for (const trip of pending) {
      const total = Number(trip.bookingTotalPrice || trip.price || 0);
      const legs = trip.fareType === 'round_trip' ? Number(trip.bookingLegs || 2) : 1;
      const fx = await toBase(total, trip.currency, trip.bookedAt || trip.startDate);
      Object.assign(trip, {
        bookingTotalBase: fx.amountBase,
        priceBase: Math.round((fx.amountBase / legs) * 100) / 100,
        fxRate: fx.fxRate,
        fxSource: fx.fxSource,
        journeyId: trip.journeyId || '',
        bookedAt: trip.bookedAt || ''
      });
    }

    return pending.length;
  });

  if (count) {
    console.log(`[fx] Convertiti in EUR ${count} voli esistenti`);
  }
}
