// Limite di richieste in memoria, a finestra fissa. Con più istanze del server serve uno store
// condiviso (es. Redis): qui basta un processo solo.
// - Per IP (predefinito): frena il brute force su login e recupero password (GDPR art. 32).
// - Per utente (userRateLimit): protegge le quote dei fornitori esterni da un singolo account.
export function rateLimit({ windowMs, max, message, keyFor = (req) => req.ip }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyFor(req);
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        res.setHeader?.('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
        return next({ status: 429, message });
      }
    }

    // Pulizia periodica, così la mappa non cresce all'infinito.
    if (hits.size > 5000) {
      hits.forEach((value, k) => { if (value.resetAt <= now) hits.delete(k); });
    }

    return next();
  };
}

// Va montato dopo requireAuth: conta le richieste per account, non per IP, così più utenti
// dietro la stessa rete non si bloccano a vicenda e un account non aggira il limite cambiando IP.
export function userRateLimit(options) {
  return rateLimit({ ...options, keyFor: (req) => req.user.sub });
}

const PROVIDER_WINDOW = 15 * 60 * 1000;
const PROVIDER_MESSAGE = 'Troppe richieste: riprova tra qualche minuto';

// Endpoint costosi: /flights/resolve e /flights/fare-estimate chiamano i fornitori esterni (a quota
// limitata); /inbox/paste analizza email fino a 2 MB e scrive sul file dati. Le soglie stanno ben
// sopra l'uso normale e sotto ciò che esaurirebbe la quota di un fornitore.
export const providerLimits = {
  flightResolve: { windowMs: PROVIDER_WINDOW, max: 30, message: PROVIDER_MESSAGE },
  fareEstimate: { windowMs: PROVIDER_WINDOW, max: 60, message: PROVIDER_MESSAGE },
  inboxPaste: { windowMs: PROVIDER_WINDOW, max: 20, message: PROVIDER_MESSAGE }
};
