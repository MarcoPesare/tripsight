import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromPlainText, parseBookingEmail } from '../src/services/emailParser.js';

// Conferma A/R con dati schema.org, come la inviano molte compagnie (entità HTML incluse).
const roundTripHtml = `<html><head>
<script type="application/ld+json">
[{
  "@context": "http://schema.org", "@type": "FlightReservation", "reservationNumber": "XK7P2Q",
  "totalPrice": "178.50", "priceCurrency": "EUR", "bookingTime": "2025-03-10T18:22:00+01:00",
  "reservationFor": { "@type": "Flight", "flightNumber": "1234", "airline": { "@type": "Airline", "name": "Volare Low Cost", "iataCode": "FR" },
    "departureAirport": { "@type": "Airport", "iataCode": "BGY" }, "departureTime": "2025-05-02T07:15:00+02:00",
    "arrivalAirport": { "@type": "Airport", "iataCode": "OPO" }, "arrivalTime": "2025-05-02T09:05:00+01:00" }
}, {
  "@context": "http://schema.org", "@type": "FlightReservation", "reservationNumber": "XK7P2Q",
  "totalPrice": "178.50", "priceCurrency": "EUR",
  "reservationFor": { "@type": "Flight", "flightNumber": "FR1235", "airline": { "@type": "Airline", "iataCode": "FR" },
    "departureAirport": { "@type": "Airport", "iataCode": "OPO" }, "departureTime": "2025-05-05T20:40:00+01:00",
    "arrivalAirport": { "@type": "Airport", "iataCode": "BGY" } }
}]
</script></head><body>Grazie per aver prenotato &amp; buon viaggio</body></html>`;

test('legge un A/R schema.org e non raddoppia il prezzo', () => {
  const { method, items } = parseBookingEmail({ html: roundTripHtml, receivedAt: '2025-03-10T18:30:00Z' });

  assert.equal(method, 'schema');
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((item) => item.data.flightNumber), ['FR1234', 'FR1235']);
  assert.equal(items[0].data.from, 'BGY');
  assert.equal(items[0].data.startDate, '2025-05-02');
  assert.equal(items[0].data.departureTime, '2025-05-02 07:15');
  assert.ok(items.every((item) => item.data.fareType === 'round_trip' && item.data.price === 178.5 && item.confidence === 'high'));
  assert.equal(items[0].data.bookedAt, '2025-03-10');
  // La seconda tratta non ha bookingTime: usa la data di ricezione dell'email.
  assert.equal(items[1].data.bookedAt, '2025-03-10');
});

test('legge un alloggio dentro @graph', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"LodgingReservation","reservationNumber":"H-99",
    "checkinTime":"2025-05-02T15:00:00","checkoutTime":"2025-05-05T11:00:00","totalPrice":"210","priceCurrency":"EUR",
    "reservationFor":{"@type":"LodgingBusiness","name":"Casa do Rio","address":{"addressLocality":"Porto","addressCountry":"PT"}}}]}</script>`;
  const { items } = parseBookingEmail({ html });

  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'stay');
  assert.deepEqual(
    { name: items[0].data.name, city: items[0].data.city, checkIn: items[0].data.checkIn, checkOut: items[0].data.checkOut, price: items[0].data.price },
    { name: 'Casa do Rio', city: 'Porto', checkIn: '2025-05-02', checkOut: '2025-05-05', price: 210 }
  );
});

test('senza dati strutturati ripiega sul testo con fiducia bassa', () => {
  const text = 'Conferma prenotazione. Volo: U2 4567 del 20 febbraio 2025, Milano Malpensa (MXP) - Barcellona (BCN). Totale pagato: 140,00 €';
  const { method, items } = parseBookingEmail({ text });

  assert.equal(method, 'text');
  assert.equal(items[0].confidence, 'low');
  assert.equal(items[0].data.flightNumber, 'U24567');
  assert.equal(items[0].data.startDate, '2025-02-20');
  assert.equal(items[0].data.from, 'MXP');
  assert.equal(items[0].data.to, 'BCN');
  assert.equal(items[0].data.price, 140);
});

test('il testo senza parola chiave "volo" non produce falsi positivi', () => {
  assert.equal(fromPlainText('Fattura IT 2025 del 01/02/2025, sede (MIL) e (ROM)'), null);
});

test('un JSON-LD malformato non blocca il resto', () => {
  const html = '<script type="application/ld+json">{ rotto </script>';
  assert.deepEqual(parseBookingEmail({ html }).items, []);
});

// Struttura reale di una conferma Vueling (dati personali rimossi): niente JSON-LD,
// codici IATA senza parentesi, numero volo senza la parola "volo", sorgente .eml con intestazioni.
const vuelingEml = `Delivered-To: utente@example.com
From: "Vueling" <no-reply@comms.vueling.com>
Subject: Conferma della prenotazione ABC123 -
  TRN-BCN 12 marzo, BCN-TRN 16 marzo
Date: Mon, 4 Jan 2027 14:29:14 -0600
MIME-Version: 1.0
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: 8bit

<html><head><style>p { margin: 1em 0; }</style></head><body>
<div style="display:none">Questa e-mail non è valida come carta d'imbarco.</div>
<td>Il check-in online sarà disponibile 24 ore prima della partenza del volo.</td>
<td>Codice di prenotazione: <span>ABC123</span></td>
<td>Ciao, prenotazione confermata.</td>
<td>Andata</td><td>Venerdì, 12 marzo 2027</td>
<td>Torino (Italia)</td><td>Barcellona (Spagna)</td>
<td>TRN</td><td><img alt="Plane"></td><td>BCN</td>
<td>07:05h</td><td>08:30h</td>
<td>VY1234</td>
<td>Ritorno</td><td>Martedì, 16
 marzo 2027</td>
<td>Barcellona (Spagna)</td><td>Torino (Italia)</td>
<td>BCN</td><td>TRN</td>
<td>21:10h</td><td>22:40h</td>
<td>VY1235</td>
<li>1 bagaglio a mano da riporre sotto il sedile<br>Max 40x30x20 cm</li>
</body></html>`;

test('legge una conferma Vueling incollata come sorgente .eml', async () => {
  const { airportCodes } = await import('../src/services/airportCatalog.js');
  const { parseEml } = await import('../src/services/inbox.js');
  const email = parseEml(vuelingEml);

  assert.equal(email.subject, 'Conferma della prenotazione ABC123 - TRN-BCN 12 marzo, BCN-TRN 16 marzo');
  assert.equal(email.receivedAt, '2027-01-04T20:29:14.000Z');

  const { method, items } = parseBookingEmail({ ...email, airports: await airportCodes() });

  assert.equal(method, 'text');
  assert.deepEqual(items.map(({ data }) => [data.flightNumber, data.from, data.to, data.startDate, data.departureTime, data.arrivalTime]), [
    ['VY1234', 'TRN', 'BCN', '2027-03-12', '2027-03-12 07:05', '2027-03-12 08:30'],
    ['VY1235', 'BCN', 'TRN', '2027-03-16', '2027-03-16 21:10', '2027-03-16 22:40']
  ]);
  assert.ok(items.every(({ data, confidence }) => data.reservationNumber === 'ABC123' && data.fareType === 'round_trip' && data.bookedAt === '2027-01-04' && confidence === 'low'));
});

test('decodifica un .eml multipart in quoted-printable senza rompere gli accenti', async () => {
  const { parseEml } = await import('../src/services/inbox.js');
  const raw = 'From: a@b.it\nSubject: =?UTF-8?B?Q29uZmVybWEgdm9sbw==?=\nContent-Type: multipart/alternative; boundary="X"\n\n--X\nContent-Type: text/plain; charset=utf-8\nContent-Transfer-Encoding: quoted-printable\n\nMercoled=C3=AC =\nprenotato\n--X\nContent-Type: text/html; charset=utf-8\nContent-Transfer-Encoding: base64\n\nPGI+Y2lhbzwvYj4=\n--X--\n';
  const email = parseEml(raw);

  assert.equal(email.subject, 'Conferma volo');
  assert.equal(email.text.trim(), 'Mercoledì prenotato');
  assert.equal(email.html, '<b>ciao</b>');
});

test('un normale HTML incollato non viene scambiato per un .eml', async () => {
  const { parseEml } = await import('../src/services/inbox.js');
  assert.equal(parseEml('<html><body>Volo FR1234</body></html>'), null);
});

// Struttura di una conferma eDreams per voli KLM (dati personali rimossi): quoted-printable,
// date senza anno ("SABATO 8 MARZO"), orari ripetuti per desktop e mobile, numero volo dopo gli aeroporti.
const edreamsEml = `From: eDreams <notifications@mailer.edreams.com>
Date: Fri, 10 Jan 2025 16:57:31 +0000
Subject: La tua prenotazione =?utf-8?b?w6g=?= confermata! (Riferimento: 10000000000)
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

<html><body><div style=3D"display:none">=C3=88 tutto pronto. Preparati a viaggiare il sa=
bato 8 marzo.</div>
<span>Numero di prenotazione eDreams:</span><span>10000000000</span>
<span>sabato 8 marzo</span><span>Turin - Amsterdam</span>
<span>marted=C3=AC 11 marzo</span><span>Amsterdam - Turin</span>
<td>Il tuo programma di viaggio</td>
<td><span>SABATO 8 MARZO</span></td><td>Andata</td><td>1h 55m</td>
<tr class=3D"desktop_invisible"><td> 07:10 </td></tr><tr><td> 07:10 </td><td> Turin </td><td> (Italy) </td>
<td><span>TRN</span> =C2=B7 <span>Aeroporto Caselle</span></td></tr>
<tr><td> 09:05 </td><td> 09:05 </td><td> Amsterdam </td><td> (Netherlands) </td><td><span>AMS</span> =C2=B7 Schiphol</td></tr>
<td>KLM Royal Dutch Airlines</td><td>KL1234</td>
<td><span>MARTED=C3=8C 11 MARZO</span></td><td>Ritorno</td><td>1h 40m</td>
<tr><td> 19:50 </td><td> 19:50 </td><td> Amsterdam </td><td><span>AMS</span> =C2=B7 Schiphol</td></tr>
<tr><td> 21:30 </td><td> 21:30 </td><td> Turin </td><td><span>TRN</span> =C2=B7 Aeroporto Caselle</td></tr>
<td>KLM Royal Dutch Airlines</td><td>KL1235</td>
<td>Codice di prenotazione della compagnia aerea: <b>QX7Z9K</b></td>
</body></html>`;

test('legge una conferma eDreams/KLM con date senza anno', async () => {
  const { airportCodes } = await import('../src/services/airportCatalog.js');
  const { parseEml } = await import('../src/services/inbox.js');
  const email = parseEml(edreamsEml);
  const { items } = parseBookingEmail({ ...email, airports: await airportCodes() });

  assert.equal(email.subject, 'La tua prenotazione è confermata! (Riferimento: 10000000000)');
  assert.deepEqual(items.map(({ data }) => [data.flightNumber, data.from, data.to, data.startDate, data.departureTime, data.arrivalTime]), [
    ['KL1234', 'TRN', 'AMS', '2025-03-08', '2025-03-08 07:10', '2025-03-08 09:05'],
    ['KL1235', 'AMS', 'TRN', '2025-03-11', '2025-03-11 19:50', '2025-03-11 21:30']
  ]);
  assert.ok(items.every(({ data }) => data.reservationNumber === 'QX7Z9K' && data.fareType === 'round_trip'));
});
