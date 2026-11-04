// Unica fonte dei testi di aiuto: la pagina Guida mostra short + body,
// il tooltip ⓘ accanto a metriche e grafici mostra solo short.
// formula è facoltativa e viene mostrata in evidenza nella Guida.
export const GLOSSARY_SECTIONS = [
  { id: 'basics', keys: ['journey', 'flight', 'legShare'] },
  { id: 'money', keys: ['totalSpend', 'perDay', 'costPerKm', 'fx'] },
  { id: 'charts', keys: ['byYear', 'byAirline', 'leadTime', 'byMonth', 'ranking', 'insights'] },
  { id: 'discover', keys: ['score', 'groundBudget'] },
  { id: 'data', keys: ['emailImport', 'import', 'privacy'] }
];

export const GLOSSARY = {
  it: {
    sections: {
      basics: 'Come è organizzato',
      money: 'Soldi e valute',
      charts: 'Grafici delle statistiche',
      discover: 'Consigli',
      data: 'I tuoi dati'
    },
    entries: {
      journey: {
        title: 'Viaggio',
        short: 'Un viaggio raggruppa i voli e le altre spese (alloggio, cibo, trasporti…) di una stessa vacanza o trasferta.',
        body: 'È l’unità di base di Tripsight. Un viaggio ha date, destinazione, voli collegati, spese per categoria e il tuo giudizio (voto, tag, “ci torneresti?”). Il giudizio è quello che alimenta i Consigli. Un volo può appartenere a un solo viaggio; eliminando un viaggio i suoi voli restano nel registro.'
      },
      flight: {
        title: 'Volo',
        short: 'Una singola tratta, da un aeroporto a un altro, con il prezzo pagato.',
        body: 'I voli sono il registro di base: numero volo, data, rotta, compagnia, prezzo e data di prenotazione. Puoi recuperare i dati dal numero volo oppure inserire gli aeroporti a mano (utile per i voli passati, che i provider gratuiti spesso non coprono).'
      },
      legShare: {
        title: 'Quota tratta (biglietto A/R)',
        short: 'Per un biglietto andata e ritorno, il prezzo totale diviso per il numero di tratte.',
        body: 'Il totale del biglietto viene salvato una volta sola, così nelle statistiche non viene contato due volte. Ogni tratta mostra la sua quota, usata per il costo al km e per il costo del viaggio a cui è collegata.',
        formula: 'quota tratta = totale biglietto ÷ numero di tratte'
      },
      totalSpend: {
        title: 'Spesa totale',
        short: 'Tutti i voli più tutte le spese dei viaggi, convertiti in euro.',
        body: 'I biglietti A/R contano una volta sola. Le spese inserite in altre valute sono convertite in EUR al cambio del giorno della spesa (vedi “Cambio valuta”).',
        formula: 'spesa totale = Σ biglietti + Σ spese dei viaggi'
      },
      perDay: {
        title: 'Costo al giorno',
        short: 'Quanto è costato in media ogni giorno di viaggio, voli compresi.',
        body: 'È la metrica più utile per confrontare viaggi di durata diversa: un weekend da 500 € e una settimana da 1.200 € si capiscono meglio come 125 € e 171 € al giorno. I giorni si contano inclusi: dal 3 al 5 sono 3 giorni. La media generale considera solo i viaggi che hanno almeno un costo.',
        formula: 'costo al giorno = costo totale del viaggio ÷ giorni'
      },
      costPerKm: {
        title: 'Costo al km (c/km)',
        short: 'Prezzo del volo diviso per i km volati, in centesimi: confronta tratte di lunghezza diversa.',
        body: 'Un volo da 80 € per 1.500 km (5,3 c/km) è un affare migliore di uno da 60 € per 700 km (8,6 c/km), anche se costa di più. La distanza è quella in linea d’aria tra i due aeroporti. Per le compagnie e i mesi si sommano prezzi e km di tutti i voli, così una tratta lunga pesa per quanto è lunga.',
        formula: 'c/km = prezzo in EUR ÷ km × 100'
      },
      fx: {
        title: 'Cambio valuta',
        short: 'Ogni importo in valuta estera è convertito in EUR al cambio ufficiale BCE della sua data.',
        body: 'Per i voli si usa la data di prenotazione (o quella del volo se manca), per le spese la loro data. Il tasso viene salvato insieme all’importo, quindi le statistiche non cambiano se il cambio si muove dopo. Per date future si usa l’ultimo tasso disponibile. Se il servizio BCE non risponde si usa un tasso di riserva approssimato.'
      },
      byYear: {
        title: 'Spesa per anno',
        short: 'Quanto hai speso ogni anno, diviso per categoria.',
        body: 'I voli contano nell’anno in cui hai volato, le spese nell’anno in cui le hai fatte. Passa il mouse su una colonna per vedere il dettaglio delle categorie.'
      },
      byAirline: {
        title: 'Costo al km per compagnia',
        short: 'Quale compagnia ti costa meno a parità di distanza.',
        body: 'Somma dei prezzi pagati diviso somma dei km volati con quella compagnia. Con pochi voli il dato è indicativo: sotto ogni barra vedi su quanti voli è calcolato.'
      },
      leadTime: {
        title: 'Anticipo e prezzo',
        short: 'Ogni punto è un volo: quanti giorni prima hai prenotato e quanto hai pagato al km.',
        body: 'Serve a capire se prenotare prima ti fa risparmiare davvero. Compaiono solo i voli con la data di prenotazione: aggiungila nel form del volo, nel passo “Biglietto”.'
      },
      byMonth: {
        title: 'Costo al km per mese',
        short: 'Il costo medio al km dei voli, per mese di partenza.',
        body: 'Mostra la stagionalità dei tuoi prezzi: i mesi senza barre sono quelli in cui non hai volato.'
      },
      ranking: {
        title: 'Viaggi per costo al giorno',
        short: 'I tuoi viaggi ordinati dal più caro al più economico, a parità di giorni.',
        body: 'Il costo comprende voli collegati e tutte le spese. Un viaggio senza voli né spese non compare.'
      },
      insights: {
        title: 'Cosa dicono i tuoi dati',
        short: 'Frasi di sintesi che compaiono solo quando i dati bastano per dire qualcosa di affidabile.',
        body: 'Ad esempio il confronto tra prenotazioni anticipate e last minute appare solo con almeno due voli in ciascun gruppo (più o meno di 30 giorni prima). Più dati inserisci, più frasi compaiono.'
      },
      score: {
        title: 'Punteggio dei consigli',
        short: 'Un punteggio su 100 diviso in 5 fattori: gusti, stagione, budget, distanza, novità.',
        body: 'Gusti (35): tag dei viaggi che hai votato bene; quelli dei viaggi deludenti tolgono punti. Stagione (20): pieno se il mese scelto è tra i migliori per la meta, metà se è adiacente. Budget (20): confronto tra il costo giornaliero stimato della meta e quanto spendi tu a terra. Distanza (15): pieno se la meta è vicina alle tratte che fai di solito. Novità (10): un paese mai visitato vale di più. Le mete entro 60 km da un aeroporto dove sei già stato vengono escluse. Il calcolo usa solo queste regole fisse: nessuna intelligenza artificiale.',
        formula: 'punteggio = gusti (35) + stagione (20) + budget (20) + distanza (15) + novità (10)'
      },
      groundBudget: {
        title: 'Budget a terra',
        short: 'Quanto spendi al giorno escludendo i voli: alloggio, cibo, trasporti, attività.',
        body: 'Si calcola dalle spese dei tuoi viaggi ed è confrontato con il budget stimato di ogni meta del catalogo. Le stime delle mete sono indicative (alloggio medio, pasti, trasporti locali per persona) e servono a confrontarle tra loro, non come preventivo.',
        formula: 'budget a terra = Σ spese dei viaggi ÷ Σ giorni dei viaggi con spese'
      },
      emailImport: {
        title: 'Import dalle email',
        short: 'Incolla l’email di conferma di voli e hotel: voli e alloggi vengono letti in automatico e restano da confermare.',
        body: 'Apri la conferma, seleziona tutto il testo e incollalo in Importa. Leggiamo numero volo, aeroporti, date, orari e codice di prenotazione; le tratte con lo stesso codice diventano un biglietto A/R, con la spesa contata una volta sola. Alcune compagnie e siti includono anche dati strutturati (lo standard schema.org): si trovano nel sorgente completo dell’email (in Gmail: ⋮ → Mostra originale) e rendono la lettura ancora più precisa. Quando i dati sono letti dal testo li segnaliamo come “da verificare”. In ogni caso niente entra nei tuoi viaggi senza la tua conferma, e puoi correggere i campi prima di importare.'
      },
      import: {
        title: 'Import CSV',
        short: 'Carica il tuo storico da Flighty o da un foglio di calcolo.',
        body: 'Colonne obbligatorie: data, volo, partenza, arrivo (codici IATA come BGY o OPO). Facoltative: compagnia, prezzo, valuta, data di prenotazione, note. Il separatore può essere virgola o punto e virgola, le date AAAA-MM-GG o GG/MM/AAAA, i prezzi anche nel formato 1.234,50. Prima di salvare vedi un’anteprima; i voli già presenti (stesso numero e data) e quelli cancellati vengono saltati.'
      },
      privacy: {
        title: 'Dove stanno i dati',
        short: 'Voli, viaggi e wishlist sono salvati sul server di Tripsight, legati al tuo account.',
        body: 'Delle email incollate salviamo solo i dati estratti (volo, date, prezzo e oggetto), mai il testo completo. Il browser conserva solo la sessione, il tema e la lingua, senza cookie. Le foto delle città le scarica il nostro server da Wikipedia e i font sono ospitati da noi: il tuo browser contatta solo OpenStreetMap per le mappe. Puoi scaricare tutti i tuoi dati o eliminare l’account da Profilo → I tuoi dati. I dettagli completi sono nell’informativa privacy.'
      }
    }
  },
  en: {
    sections: {
      basics: 'How it is organised',
      money: 'Money and currencies',
      charts: 'Statistics charts',
      discover: 'Recommendations',
      data: 'Your data'
    },
    entries: {
      journey: {
        title: 'Trip',
        short: 'A trip groups the flights and other expenses (stay, food, transport…) of one holiday or business trip.',
        body: 'It is the core unit of Tripsight. A trip has dates, a destination, linked flights, expenses by category and your verdict (rating, tags, “would you go back?”). That verdict is what feeds the recommendations. A flight belongs to at most one trip; deleting a trip keeps its flights in your log.'
      },
      flight: {
        title: 'Flight',
        short: 'A single leg, from one airport to another, with the fare you paid.',
        body: 'Flights are the base log: flight number, date, route, airline, fare and booking date. You can fetch the data from the flight number or enter the airports manually (useful for past flights, which free providers often do not cover).'
      },
      legShare: {
        title: 'Leg share (return ticket)',
        short: 'For a return ticket, the total fare divided by the number of legs.',
        body: 'The ticket total is stored once, so statistics never count it twice. Each leg shows its share, which is used for cost per km and for the cost of the trip it belongs to.',
        formula: 'leg share = ticket total ÷ number of legs'
      },
      totalSpend: {
        title: 'Total spend',
        short: 'All flights plus all trip expenses, converted to euros.',
        body: 'Return tickets count once. Expenses in other currencies are converted to EUR at the rate of the day they happened (see “Currency conversion”).',
        formula: 'total spend = Σ tickets + Σ trip expenses'
      },
      perDay: {
        title: 'Cost per day',
        short: 'The average cost of each day of travel, flights included.',
        body: 'It is the most useful metric to compare trips of different length: a €500 weekend and a €1,200 week read better as €125 and €171 per day. Days are counted inclusively: the 3rd to the 5th is 3 days. The overall average only includes trips with at least one cost.',
        formula: 'cost per day = trip total ÷ days'
      },
      costPerKm: {
        title: 'Cost per km (c/km)',
        short: 'Flight fare divided by km flown, in cents: compares routes of different length.',
        body: 'An €80 flight over 1,500 km (5.3 c/km) is a better deal than a €60 flight over 700 km (8.6 c/km), even though it costs more. Distance is the great-circle distance between the airports. For airlines and months, fares and km of all flights are summed, so a long route weighs as much as it is long.',
        formula: 'c/km = fare in EUR ÷ km × 100'
      },
      fx: {
        title: 'Currency conversion',
        short: 'Every foreign-currency amount is converted to EUR at the official ECB rate of its date.',
        body: 'Flights use the booking date (or the flight date if missing), expenses use their own date. The rate is stored with the amount, so your statistics do not change if the rate moves later. Future dates use the latest available rate. If the ECB service does not answer, an approximate fallback rate is used.'
      },
      byYear: {
        title: 'Spend per year',
        short: 'How much you spent each year, split by category.',
        body: 'Flights count in the year you flew, expenses in the year you made them. Hover a column to see the category breakdown.'
      },
      byAirline: {
        title: 'Cost per km by airline',
        short: 'Which airline costs you less for the same distance.',
        body: 'Sum of fares paid divided by sum of km flown with that airline. With few flights the figure is indicative: under each bar you see how many flights it is based on.'
      },
      leadTime: {
        title: 'Lead time vs price',
        short: 'Each dot is a flight: how many days ahead you booked and what you paid per km.',
        body: 'It tells you whether booking early really saves you money. Only flights with a booking date appear: add it in the flight form, “Ticket” step.'
      },
      byMonth: {
        title: 'Cost per km by month',
        short: 'Average flight cost per km, by departure month.',
        body: 'It shows the seasonality of your fares: months without bars are months you did not fly.'
      },
      ranking: {
        title: 'Trips by cost per day',
        short: 'Your trips from the priciest to the cheapest, for the same number of days.',
        body: 'The cost includes linked flights and every expense. A trip with no flights or expenses does not appear.'
      },
      insights: {
        title: 'What your data says',
        short: 'Summary sentences that appear only when there is enough data to say something reliable.',
        body: 'For example, early vs last-minute booking appears only with at least two flights in each group (more or less than 30 days ahead). The more you log, the more sentences appear.'
      },
      score: {
        title: 'Recommendation score',
        short: 'A score out of 100 split into 5 factors: taste, season, budget, distance, novelty.',
        body: 'Taste (35): tags of trips you rated well; tags of disappointing trips subtract. Season (20): full if the chosen month is among the destination’s best, half if adjacent. Budget (20): the destination’s estimated daily cost vs what you spend on the ground. Distance (15): full if the destination is close to your usual routes. Novelty (10): a country you have never visited is worth more. Destinations within 60 km of an airport you already visited are excluded. The calculation uses only these fixed rules: no artificial intelligence.',
        formula: 'score = taste (35) + season (20) + budget (20) + distance (15) + novelty (10)'
      },
      groundBudget: {
        title: 'Ground budget',
        short: 'What you spend per day excluding flights: stay, food, transport, activities.',
        body: 'It comes from your trip expenses and is compared with the estimated budget of each catalogue destination. Destination estimates are indicative (average stay, meals, local transport per person) and are meant to compare destinations, not as quotes.',
        formula: 'ground budget = Σ trip expenses ÷ Σ days of trips with expenses'
      },
      emailImport: {
        title: 'Email import',
        short: 'Paste a flight or hotel confirmation email: flights and stays are read automatically and wait for your confirmation.',
        body: 'Open the confirmation, select all the text and paste it in Import. We read flight number, airports, dates, times and booking code; legs sharing a booking code become a return ticket, with the spend counted once. Some airlines and sites also embed structured data (the schema.org standard): it lives in the email’s full source (in Gmail: ⋮ → Show original) and makes reading even more accurate. When data is read from the text we flag it as “to check”. Either way nothing enters your trips without your confirmation, and you can fix the fields before importing.'
      },
      import: {
        title: 'CSV import',
        short: 'Upload your history from Flighty or a spreadsheet.',
        body: 'Required columns: date, flight, from, to (IATA codes such as BGY or OPO). Optional: airline, price, currency, booking date, notes. Separator can be comma or semicolon, dates YYYY-MM-DD or DD/MM/YYYY, prices also as 1.234,50. You get a preview before saving; flights already logged (same number and date) and cancelled ones are skipped.'
      },
      privacy: {
        title: 'Where your data lives',
        short: 'Flights, trips and wishlist are stored on the Tripsight server, tied to your account.',
        body: 'From pasted emails we only store the extracted data (flight, dates, price and subject), never the full text. The browser only keeps your session, theme and language, with no cookies. City pictures are downloaded from Wikipedia by our server and fonts are hosted by us: your browser only contacts OpenStreetMap for maps. You can download all your data or delete your account in Profile → Your data. Full details are in the privacy notice.'
      }
    }
  }
};

export function glossaryEntry(key, locale = 'it') {
  return GLOSSARY[locale]?.entries[key] || GLOSSARY.it.entries[key];
}
