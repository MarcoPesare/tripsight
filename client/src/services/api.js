const API_URL = import.meta.env.VITE_API_URL || '/api';

function authHeaders() {
  const token = localStorage.getItem('travelcheck_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers
    }
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && authHeaders().Authorization) {
    // Sessione scaduta o password cambiata altrove: torna al login.
    localStorage.removeItem('travelcheck_token');
    localStorage.removeItem('travelcheck_user');
    window.location.assign('/login');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Richiesta non riuscita');
  }

  return data;
}

export const api = {
  login(payload) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  },
  register(payload) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  },
  requestPasswordReset(email) {
    return request('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  confirmPasswordReset(payload) {
    return request('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  listTrips() {
    return request('/trips');
  },
  searchAirports(search) {
    const params = new URLSearchParams({ search, limit: '10' });
    return request(`/airports?${params.toString()}`);
  },
  resolveFlight(flightNumber, date, from = '') {
    const params = new URLSearchParams({ flightNumber, date, ...(from ? { from } : {}) });
    return request(`/flights/resolve?${params.toString()}`);
  },
  fareEstimate(from, to, date) {
    const params = new URLSearchParams({ from, to, date: date || '' });
    return request(`/flights/fare-estimate?${params.toString()}`);
  },
  createTrip(payload) {
    return request('/trips', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateTrip(id, payload) {
    return request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteTrip(id) {
    return request(`/trips/${id}`, { method: 'DELETE' });
  },
  listJourneys() {
    return request('/journeys');
  },
  createJourney(payload) {
    return request('/journeys', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateJourney(id, payload) {
    return request(`/journeys/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteJourney(id) {
    return request(`/journeys/${id}`, { method: 'DELETE' });
  },
  getWishlist() {
    return request('/wishlist');
  },
  saveWishlist(items) {
    return request('/wishlist', { method: 'PUT', body: JSON.stringify({ items }) });
  },
  importFlights(csv, dryRun) {
    return request('/import/flights', { method: 'POST', body: JSON.stringify({ csv, dryRun }) });
  },
  // Il file di esportazione è un download: serve la risposta grezza, non il JSON già letto.
  async exportAccount() {
    const response = await fetch(`${API_URL}/account/export`, { headers: authHeaders() });
    if (!response.ok) throw new Error('Esportazione non riuscita');
    return response.blob();
  },
  deleteAccount(password) {
    return request('/account', { method: 'DELETE', body: JSON.stringify({ password }) });
  },
  getInbox() {
    return request('/inbox');
  },
  pasteEmail(content) {
    return request('/inbox/paste', { method: 'POST', body: JSON.stringify({ content }) });
  },
  importInboxItem(id, payload) {
    return request(`/inbox/${id}/import`, { method: 'POST', body: JSON.stringify(payload) });
  },
  dismissInboxItem(id) {
    return request(`/inbox/${id}/dismiss`, { method: 'POST' });
  },
  templateUrl: `${API_URL}/import/flights/template.csv`
};
