import { parse } from 'csv-parse/sync';

// Riconosce le colonne dell'export Flighty (Date, Airline, Flight, From, To, Canceled…)
// e di un CSV generico in italiano o inglese.
const columnAliases = {
  date: ['date', 'data', 'flightdate', 'datavolo', 'departuredate', 'giorno'],
  flight: ['flight', 'flightnumber', 'flightno', 'numerovolo', 'volo'],
  airline: ['airline', 'compagnia', 'carrier', 'airlinecode'],
  from: ['from', 'origin', 'departure', 'departureairport', 'partenza', 'da', 'dep'],
  to: ['to', 'destination', 'arrival', 'arrivalairport', 'arrivo', 'a', 'arr'],
  price: ['price', 'prezzo', 'cost', 'costo', 'amount', 'importo'],
  currency: ['currency', 'valuta'],
  bookedAt: ['bookedat', 'bookingdate', 'dataprenotazione', 'booked', 'prenotato'],
  notes: ['notes', 'note'],
  canceled: ['canceled', 'cancelled', 'cancellato']
};

export const CSV_TEMPLATE = 'date,flight,from,to,price,currency,bookedAt,notes\n2025-05-02,FR1234,BGY,OPO,89.90,EUR,2025-03-10,weekend con amici\n';

export function parseFlightCsv(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  let records;

  try {
    records = parse(source, { delimiter, columns: uniqueHeaders, skip_empty_lines: true, trim: true, relax_column_count: true });
  } catch (cause) {
    const error = new Error(`CSV non valido${cause.lines ? ` alla riga ${cause.lines}` : ''}: controlla virgolette e separatori`);
    error.status = 400;
    throw error;
  }

  if (!records.length) {
    return { columns: {}, rows: [] };
  }

  const columns = detectColumns(Object.keys(records[0]));
  const missing = ['date', 'flight', 'from', 'to'].filter((key) => !columns[key]);

  if (missing.length) {
    const error = new Error(`Colonne obbligatorie non trovate: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const rows = records.map((record, index) => mapRecord(record, columns, index + 2));
  return { columns, rows };
}

// Intestazioni scritte dall'utente: vuote → "colonna_N", duplicate → "date_2" (vale la prima).
function uniqueHeaders(header) {
  const seen = new Map();

  return header.map((name, index) => {
    const base = String(name || '').trim() || `colonna_${index + 1}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count > 1 ? `${base}_${count}` : base;
  });
}

function detectColumns(headers) {
  const columns = {};

  headers.forEach((header) => {
    const key = header.toLowerCase().replace(/[^a-z]/g, '');
    const match = Object.entries(columnAliases).find(([, aliases]) => aliases.includes(key));

    if (match && !columns[match[0]]) {
      columns[match[0]] = header;
    }
  });

  return columns;
}

function mapRecord(record, columns, line) {
  const read = (key) => (columns[key] ? String(record[columns[key]] ?? '').trim() : '');

  if (/^(true|yes|si|sì|1)$/i.test(read('canceled'))) {
    return { line, skip: 'Volo cancellato' };
  }

  const date = parseDate(read('date'));
  const bookedAt = parseDate(read('bookedAt'));
  const airline = read('airline').toUpperCase();
  let flightNumber = read('flight').toUpperCase().replace(/\s+/g, '');

  // Flighty separa compagnia e numero: "AZ" + "792".
  if (/^\d{1,4}[A-Z]?$/.test(flightNumber) && /^[A-Z0-9]{2,3}$/.test(airline)) {
    flightNumber = `${airline}${flightNumber}`;
  }

  if (!date) {
    return { line, error: `Data non valida: "${read('date')}"` };
  }

  const price = parseAmount(read('price'));

  return {
    line,
    input: {
      flightNumber,
      airlineCode: /^[A-Z0-9]{2,3}$/.test(airline) ? airline : '',
      airline: /^[A-Z0-9]{2,3}$/.test(airline) ? '' : read('airline'),
      startDate: date,
      bookedAt: bookedAt || '',
      departure: { iata: read('from').toUpperCase() },
      arrival: { iata: read('to').toUpperCase() },
      bookingTotalPrice: price,
      currency: read('currency') || 'EUR',
      notes: read('notes'),
      source: 'csv'
    }
  };
}

export function parseDate(value) {
  const text = String(value || '').trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;

  return '';
}

export function parseAmount(value) {
  let text = String(value || '').replace(/[^\d.,-]/g, '');
  if (!text) return 0;

  // "1.234,50" (formato italiano) → "1234.50"
  if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else {
    text = text.replace(/,/g, '');
  }

  const amount = Number(text);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0;
}
