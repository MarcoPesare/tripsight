import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { readDb, updateDb } from '../services/database.js';
import { sendPasswordResetEmail } from '../services/mailer.js';
import { publicUser, signToken } from '../utils/auth.js';

const router = Router();
const passwordResetTtlMs = 30 * 60 * 1000;
const genericResetMessage = "Se l'email è registrata, riceverai un link per reimpostare la password.";

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || password.length < 8) {
      return next({ status: 400, message: 'Nome, email e password di almeno 8 caratteri sono obbligatori' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await updateDb((db) => {
      if (db.users.some((item) => item.email === email)) {
        return null;
      }

      const created = {
        id: nanoid(),
        name,
        email,
        passwordHash,
        passwordVersion: 1,
        passwordChangedAt: new Date().toISOString(),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        createdAt: new Date().toISOString()
      };

      db.users.push(created);
      return created;
    });

    if (!user) {
      return next({ status: 409, message: 'Email già registrata' });
    }

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const db = await readDb();
    const user = db.users.find((item) => item.email === email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return next({ status: 401, message: 'Credenziali non valide' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/password-reset/request', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
      return next({ status: 400, message: "Inserisci l'email del tuo account" });
    }

    const recoveryToken = nanoid(32);
    const tokenHash = await bcrypt.hash(recoveryToken, 12);
    const user = await updateDb((db) => {
      const found = db.users.find((item) => item.email === email);
      if (!found) return null;

      found.passwordResetTokenHash = tokenHash;
      found.passwordResetExpiresAt = new Date(Date.now() + passwordResetTtlMs).toISOString();
      return found;
    });

    if (user) {
      const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
      const params = new URLSearchParams({ reset: recoveryToken, email });
      await sendPasswordResetEmail({ to: user.email, name: user.name, link: `${origin}/login?${params.toString()}` });
    }

    // Stessa risposta in ogni caso: non riveliamo se l'email esiste né il token.
    res.json({ message: genericResetMessage });
  } catch (error) {
    next(error);
  }
});

router.post('/password-reset/confirm', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const recoveryToken = String(req.body.token || '').trim();
    const newPassword = String(req.body.newPassword || '');
    const invalidToken = { status: 400, message: 'Link di recupero non valido o scaduto' };

    if (!email || !recoveryToken || newPassword.length < 8) {
      return next({ status: 400, message: 'Email, token e nuova password di almeno 8 caratteri sono obbligatori' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const user = await updateDb(async (db) => {
      const found = db.users.find((item) => item.email === email);

      if (!found?.passwordResetTokenHash || !found.passwordResetExpiresAt) return null;

      if (Date.parse(found.passwordResetExpiresAt) <= Date.now()) {
        found.passwordResetTokenHash = null;
        found.passwordResetExpiresAt = null;
        return null;
      }

      if (!(await bcrypt.compare(recoveryToken, found.passwordResetTokenHash))) return null;

      found.passwordHash = newHash;
      found.passwordVersion = Number(found.passwordVersion || 1) + 1;
      found.passwordChangedAt = new Date().toISOString();
      found.passwordResetTokenHash = null;
      found.passwordResetExpiresAt = null;
      return found;
    });

    if (!user) {
      return next(invalidToken);
    }

    res.json({
      message: 'Password aggiornata con successo',
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
