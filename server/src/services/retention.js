import { updateDb } from './database.js';

// Limitazione della conservazione (GDPR art. 5.1.e): i periodi sono gli stessi
// dichiarati nell'informativa privacy, se cambiano qui vanno cambiati anche lì.
export const RETENTION_DAYS = {
  inboxHandled: 30, // email già importate o ignorate
  inboxPending: 90 // email mai confermate
};

const DAY = 24 * 60 * 60 * 1000;

export async function purgeExpired(now = Date.now()) {
  return updateDb((db) => {
    const before = (db.inbox || []).length;

    db.inbox = (db.inbox || []).filter((item) => {
      const age = now - Date.parse(item.receivedAt);
      const limit = item.status === 'pending' ? RETENTION_DAYS.inboxPending : RETENTION_DAYS.inboxHandled;
      return age < limit * DAY;
    });

    // Token di recupero password scaduti: inutili e non vanno conservati.
    db.users.forEach((user) => {
      if (user.passwordResetExpiresAt && Date.parse(user.passwordResetExpiresAt) <= now) {
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
      }
    });

    return before - db.inbox.length;
  });
}

export function scheduleRetention() {
  const run = () => purgeExpired()
    .then((removed) => { if (removed) console.log(`[retention] Rimossi ${removed} elementi email scaduti`); })
    .catch((error) => console.error('[retention] pulizia non riuscita', error));

  run();
  return setInterval(run, DAY).unref();
}
