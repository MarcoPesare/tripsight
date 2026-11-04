import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, parseDate, parseFlightCsv } from '../src/services/csvImport.js';
import { canonicalTags } from '../src/services/tags.js';

test('legge un export in stile Flighty con compagnia e numero separati', () => {
  const { rows } = parseFlightCsv('Date,Airline,Flight,From,To,Canceled\n2024-03-15,AZ,610,FCO,JFK,false\n2024-04-01,FR,1,BGY,OPO,true\n');

  assert.equal(rows[0].input.flightNumber, 'AZ610');
  assert.equal(rows[0].input.departure.iata, 'FCO');
  assert.equal(rows[1].skip, 'Volo cancellato');
});

test('riconosce separatore ; e intestazioni in italiano', () => {
  const { rows } = parseFlightCsv('data;volo;partenza;arrivo;prezzo;valuta\n02/05/2025;FR1234;BGY;OPO;1.234,50;EUR\n');

  assert.equal(rows[0].input.startDate, '2025-05-02');
  assert.equal(rows[0].input.bookingTotalPrice, 1234.5);
});

test('segnala le colonne obbligatorie mancanti', () => {
  assert.throws(() => parseFlightCsv('foo,bar\n1,2\n'), /Colonne obbligatorie/);
});

test('parseDate e parseAmount gestiscono i formati comuni', () => {
  assert.equal(parseDate('2024-03-15T10:00'), '2024-03-15');
  assert.equal(parseDate('5/3/2024'), '2024-03-05');
  assert.equal(parseDate('ieri'), '');
  assert.equal(parseAmount('€ 89,90'), 89.9);
  assert.equal(parseAmount('1,234.50'), 1234.5);
});

test('i tag legacy in italiano vengono mappati sul vocabolario unico', () => {
  assert.deepEqual(canonicalTags(['cibo', 'mare', 'arte', 'notte', 'boh', 'cibo']), ['food', 'sea', 'culture', 'nightlife']);
});

test('intestazioni malformate: vuote, duplicate e "__proto__" non rompono l\'import né l\'oggetto', () => {
  const csv = '__proto__,date,date,,flight,from,to,constructor\nx,2025-05-02,2030-01-01,vuota,FR1234,BGY,OPO,y\n';
  const { columns, rows } = parseFlightCsv(csv);

  // Vale la prima colonna "date"; la seconda diventa "date_2" e quella senza nome "colonna_4".
  assert.equal(columns.date, 'date');
  assert.equal(rows[0].input.startDate, '2025-05-02');
  assert.equal(rows[0].input.flightNumber, 'FR1234');
  assert.equal(Object.getPrototypeOf(rows[0]), Object.prototype);
  assert.equal({}.polluted, undefined);
});

test('CSV con virgolette non chiuse → errore 400 con messaggio chiaro', () => {
  assert.throws(
    () => parseFlightCsv('date,flight,from,to\n2025-05-02,"FR1234,BGY,OPO\n'),
    (error) => error.status === 400 && /CSV non valido/.test(error.message)
  );
});
