const API_URL = import.meta.env.VITE_API_URL || '/api';
const credits = new Map();

// Le foto passano dal server Tripsight (/api/city-images), non da Wikipedia direttamente:
// così il browser dell'utente non invia il proprio IP a terzi (GDPR).
export function cityImageUrl(city) {
  const name = String(city || '').trim();
  return name ? `${API_URL}/city-images?city=${encodeURIComponent(name)}` : '';
}

// Autore, licenza e pagina del file della foto (null se non disponibili). Una richiesta per città.
export function cityImageCredit(city) {
  const name = String(city || '').trim();
  if (!name) return Promise.resolve(null);

  if (!credits.has(name)) {
    credits.set(name, fetch(`${API_URL}/city-images/credit?city=${encodeURIComponent(name)}`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null));
  }
  return credits.get(name);
}

// "Foto: M McBey, CC BY 2.0, via Wikimedia Commons (ritagliata)": solo le parti disponibili.
// `cropped` va indicato quando l'app taglia l'immagine e ne cambia l'inquadratura (CC BY e BY-SA
// chiedono di segnalare le modifiche).
export function photoCreditText(credit, label, cropped = '') {
  const parts = [credit.author, credit.license].filter(Boolean);
  const text = parts.length ? `${label}: ${parts.join(', ')}, via ${credit.source}` : `${label}: ${credit.source}`;
  return cropped ? `${text} (${cropped})` : text;
}
