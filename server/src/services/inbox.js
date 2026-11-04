import { nanoid } from 'nanoid';
import { parseBookingEmail } from './emailParser.js';

const MAX_PENDING = 300;

// Sorgente .eml ("Mostra originale" incollato): intestazioni, poi il corpo,
// eventualmente multipart e in quoted-printable o base64. Restituisce null se non è un .eml.
export function parseEml(raw) {
  const source = String(raw).replace(/\r\n/g, '\n');
  const split = source.search(/\n\n/);
  if (split === -1 || !/^[\w-]+:/.test(source)) return null;

  const headers = parseHeaders(source.slice(0, split));
  if (!headers['content-type'] && !headers.subject && !headers.from) return null;

  const parts = bodyParts(headers, source.slice(split + 2));

  return {
    subject: decodeWords(headers.subject || ''),
    from: String(headers.from || '').replace(/^.*<([^>]+)>.*$/, '$1').trim().toLowerCase(),
    receivedAt: isoDate(headers.date),
    html: parts.filter((part) => part.type === 'text/html').map((part) => part.body).join('\n'),
    text: parts.filter((part) => part.type === 'text/plain').map((part) => part.body).join('\n')
  };
}

function isoDate(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function parseHeaders(block) {
  const headers = {};
  block.replace(/\n[ \t]+/g, ' ').split('\n').forEach((line) => {
    const match = line.match(/^([\w-]+):\s*(.*)$/);
    if (match) headers[match[1].toLowerCase()] ??= match[2].trim();
  });
  return headers;
}

function bodyParts(headers, body) {
  const type = String(headers['content-type'] || 'text/plain').toLowerCase();
  const boundary = (String(headers['content-type'] || '').match(/boundary="?([^";]+)"?/i) || [])[1];

  if (type.startsWith('multipart/') && boundary) {
    return body.split(`--${boundary}`).slice(1).flatMap((chunk) => {
      const split = chunk.search(/\n\n/);
      if (split === -1) return [];
      return bodyParts(parseHeaders(chunk.slice(0, split).trim()), chunk.slice(split + 2));
    });
  }

  if (!type.startsWith('text/')) return [];
  return [{ type: type.split(';')[0].trim(), body: decodeBody(body, headers['content-transfer-encoding']) }];
}

function decodeBody(body, encoding = '') {
  const kind = String(encoding).toLowerCase();
  if (kind === 'base64') return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
  if (kind !== 'quoted-printable') return body;

  // Prima i byte, poi UTF-8: decodificare carattere per carattere rompe le lettere accentate.
  const bytes = body.replace(/=\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return Buffer.from(bytes, 'latin1').toString('utf8');
}

// Oggetto in formato RFC 2047: =?UTF-8?B?...?= oppure =?UTF-8?Q?...?=
function decodeWords(value) {
  return value.replace(/=\?[^?]+\?([BQ])\?([^?]*)\?=/gi, (_, mode, data) => (mode.toUpperCase() === 'B'
    ? Buffer.from(data, 'base64').toString('utf8')
    : Buffer.from(data.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (__, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8')));
}

// Trasforma un'email in elementi "Da confermare" per l'utente. Restituisce quelli aggiunti.
// `email.airports` (codici IATA noti) abilita la lettura degli itinerari senza dati strutturati.
export function addEmailToInbox(db, user, email, source) {
  const parsed = parseBookingEmail(email);
  const now = new Date().toISOString();

  const items = parsed.items.map((item) => ({
    id: nanoid(),
    ownerId: user.id,
    source,
    method: parsed.method,
    kind: item.kind,
    confidence: item.confidence,
    status: 'pending',
    subject: email.subject,
    data: item.data,
    receivedAt: now
  }));

  db.inbox ||= [];
  const pending = db.inbox.filter((item) => item.ownerId === user.id && item.status === 'pending').length;
  const accepted = items.slice(0, Math.max(0, MAX_PENDING - pending));
  db.inbox.push(...accepted);

  return { method: parsed.method, items: accepted };
}

// Dati del volo nel formato atteso da normalizeTrip.
export function flightInput(data) {
  return {
    flightNumber: data.flightNumber,
    airlineCode: data.airlineCode,
    airline: data.airline,
    startDate: data.startDate,
    bookedAt: data.bookedAt,
    departureTime: data.departureTime,
    arrivalTime: data.arrivalTime,
    departure: { iata: data.from },
    arrival: { iata: data.to },
    fareType: data.fareType === 'round_trip' ? 'round_trip' : 'one_way',
    bookingLegs: data.bookingLegs,
    // Le tratte dello stesso biglietto condividono il bookingId: la spesa conta una volta sola.
    bookingId: data.fareType === 'round_trip' && data.reservationNumber ? `email-${data.reservationNumber}` : undefined,
    bookingTotalPrice: Number(data.price || 0),
    currency: data.currency,
    source: 'email'
  };
}
