// Limite di tentativi per IP, in memoria: frena il brute force su login e recupero password
// (GDPR art. 32, misure di sicurezza adeguate). Con più istanze del server serve uno store
// condiviso (es. Redis): qui basta un processo solo.
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  return (req, _res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        return next({ status: 429, message });
      }
    }

    // Pulizia periodica, così la mappa non cresce all'infinito.
    if (hits.size > 5000) {
      hits.forEach((value, ip) => { if (value.resetAt <= now) hits.delete(ip); });
    }

    return next();
  };
}
