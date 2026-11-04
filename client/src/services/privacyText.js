// Informativa privacy (GDPR art. 13) in italiano e inglese.
// {{campo}} viene sostituito con i valori di config/legal.js; se un valore manca,
// la pagina lo mostra evidenziato come da completare.
// BOZZA TECNICA: descrive fedelmente come funziona l'app, ma va rivista da un consulente privacy.

const IT = {
  title: 'Informativa privacy',
  intro: 'Questa informativa spiega quali dati tratta Tripsight, perché, per quanto tempo e quali diritti hai. È scritta per essere letta: se qualcosa non è chiaro, scrivici.',
  updated: 'Ultimo aggiornamento',
  missing: 'da completare',
  sections: [
    { id: 'titolare', title: 'Chi è il titolare', blocks: [
      { p: 'Il titolare del trattamento è {{controllerName}}, {{controllerAddress}}. Per qualsiasi domanda sui tuoi dati scrivi a {{contactEmail}}.' }
    ] },
    { id: 'dati', title: 'Quali dati trattiamo', blocks: [
      { list: [
        'Dati dell’account: nome, email e password. La password è salvata solo in forma cifrata (hash bcrypt): nessuno, nemmeno noi, può leggerla.',
        'Dati di viaggio che inserisci: voli (numero, date, aeroporti, compagnia, prezzo, data di prenotazione), viaggi, spese, note, voti, tag e wishlist.',
        'Dati dalle email di prenotazione che incolli: salviamo solo i dati estratti (volo o alloggio, date, prezzo) e l’oggetto dell’email. Il testo completo dell’email non viene salvato.',
        'Dati tecnici: l’indirizzo IP, tenuto solo in memoria per al massimo 15 minuti per limitare i tentativi di accesso. Nel browser salviamo la sessione, il tema e la lingua.'
      ] },
      { p: 'Non chiediamo dati particolari (salute, religione, opinioni politiche…). Nei campi liberi, come le note, ti chiediamo di non inserirne.' }
    ] },
    { id: 'finalita', title: 'Perché li trattiamo e su quale base giuridica', blocks: [
      { list: [
        'Fornirti il servizio (account, diario di viaggio, statistiche, consigli, import): esecuzione del contratto, art. 6.1.b GDPR.',
        'Proteggere l’account (limite ai tentativi, recupero password, misure di sicurezza): legittimo interesse e obbligo di sicurezza, artt. 6.1.f e 32 GDPR.',
        'Inviarti le email di servizio indispensabili, come il link per reimpostare la password: esecuzione del contratto.'
      ] },
      { p: 'Non usiamo i tuoi dati per pubblicità, non li vendiamo e non facciamo profilazione per terzi. Non ci sono strumenti di analisi o tracciamento.' }
    ] },
    { id: 'consigli', title: 'Consigli, statistiche e intelligenza artificiale', blocks: [
      { p: 'Statistiche e consigli sulle prossime mete sono calcolati automaticamente a partire dai tuoi viaggi, con regole fisse e trasparenti: il punteggio di ogni meta somma cinque fattori (gusti, stagione, budget, distanza, novità) con pesi dichiarati nella Guida, e ogni consiglio mostra il perché.' },
      { p: 'Tripsight oggi non usa sistemi di intelligenza artificiale né modelli di apprendimento automatico, e non prende decisioni che producono effetti giuridici o che ti riguardano in modo significativo (art. 22 GDPR): i consigli sono suggerimenti che puoi ignorare. Se in futuro introdurremo funzioni basate su IA, lo segnaleremo chiaramente nell’app e in questa informativa.' }
    ] },
    { id: 'destinatari', title: 'A chi arrivano i dati', blocks: [
      { p: 'I dati restano sui nostri sistemi. Alcuni fornitori li trattano per nostro conto, come responsabili del trattamento (art. 28 GDPR), solo per quanto serve:' },
      { list: [
        'Hosting di server e database: {{hostingProvider}}.',
        { if: 'resend', text: 'Resend (Resend Inc., Stati Uniti): invio delle email di recupero password. Riceve il tuo indirizzo email e il testo del messaggio.' },
        'OpenStreetMap Foundation (Regno Unito): le mappe vengono caricate dal tuo browser, che riceve dai loro server le immagini della zona visualizzata. OpenStreetMap vede il tuo indirizzo IP e la zona della mappa, non i tuoi viaggi.'
      ] },
      { p: 'Questi servizi invece non ricevono dati personali: AirLabs (riceve solo numero volo e data per recuperare gli orari), Travelpayouts (riceve solo la tratta e il mese, per mostrarti le tariffe trovate), il servizio dei cambi BCE (riceve solo valuta e data), Wikipedia (le foto delle città le scarica il nostro server, non il tuo browser). I font sono ospitati da noi.' }
    ] },
    { id: 'trasferimenti', title: 'Trasferimenti fuori dall’Unione europea', blocks: [
      { p: 'Alcuni fornitori hanno sede negli Stati Uniti o nel Regno Unito. Per il Regno Unito vale la decisione di adeguatezza della Commissione europea. Per gli Stati Uniti il trasferimento avviene verso fornitori aderenti all’EU-U.S. Data Privacy Framework oppure sulla base delle clausole contrattuali standard approvate dalla Commissione.' }
    ] },
    { id: 'conservazione', title: 'Per quanto tempo', blocks: [
      { list: [
        'Account e dati di viaggio: finché l’account è attivo. Se lo cancelli vengono eliminati subito; le copie di backup vengono sovrascritte entro {{backupRetentionDays}} giorni.',
        'Email importate: gli elementi già confermati o ignorati sono eliminati dopo {{inboxHandledDays}} giorni, quelli mai confermati dopo {{inboxPendingDays}} giorni.',
        'Link di recupero password: validi 30 minuti, poi eliminati.',
        'Indirizzo IP per il limite ai tentativi: al massimo 15 minuti, solo in memoria.'
      ] }
    ] },
    { id: 'diritti', title: 'I tuoi diritti', blocks: [
      { p: 'Puoi chiedere in ogni momento accesso, rettifica, cancellazione, limitazione e portabilità dei tuoi dati, e opporti ai trattamenti basati sul legittimo interesse (artt. 15-22 GDPR). Due diritti li eserciti da solo, subito, in Profilo → I tuoi dati:' },
      { list: [
        'Scarica i tuoi dati: un file JSON con account, voli, viaggi, wishlist ed email importate, leggibile e riutilizzabile in altri servizi.',
        'Elimina l’account: cancella definitivamente l’account e tutti i dati collegati.'
      ] },
      { p: 'Per gli altri diritti scrivi a {{contactEmail}}: rispondiamo entro un mese. Se ritieni che il trattamento violi il GDPR puoi presentare reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).' }
    ] },
    { id: 'browser', title: 'Cookie e memoria del browser', blocks: [
      { p: 'Tripsight non usa cookie, né propri né di terzi. Nella memoria locale del browser salva solo ciò che serve a farlo funzionare: la sessione di accesso, il tema e la lingua che hai scelto. Sono strumenti tecnici, per cui non serve il consenso. Uscendo dall’account la sessione viene rimossa.' }
    ] },
    { id: 'sicurezza', title: 'Sicurezza e minori', blocks: [
      { p: 'Proteggiamo i dati con password cifrate, connessioni HTTPS e limite ai tentativi di accesso. Il servizio è riservato a chi ha almeno 14 anni.' }
    ] },
    { id: 'modifiche', title: 'Modifiche', blocks: [
      { p: 'Se questa informativa cambia in modo rilevante te lo segnaleremo nell’app. La data dell’ultimo aggiornamento è indicata in alto.' }
    ] }
  ]
};

const EN = {
  title: 'Privacy notice',
  intro: 'This notice explains which data Tripsight processes, why, for how long and what your rights are. It is written to be read: if anything is unclear, write to us.',
  updated: 'Last updated',
  missing: 'to be completed',
  sections: [
    { id: 'titolare', title: 'Who the controller is', blocks: [
      { p: 'The data controller is {{controllerName}}, {{controllerAddress}}. For any question about your data write to {{contactEmail}}.' }
    ] },
    { id: 'dati', title: 'Which data we process', blocks: [
      { list: [
        'Account data: name, email and password. The password is stored only as a hash (bcrypt): nobody, us included, can read it.',
        'Travel data you enter: flights (number, dates, airports, airline, fare, booking date), trips, expenses, notes, ratings, tags and wishlist.',
        'Data from booking emails you paste: we only store the extracted data (flight or stay, dates, price) and the email subject. The full email text is not stored.',
        'Technical data: your IP address, kept in memory only, for at most 15 minutes, to limit login attempts. Your browser stores the session, theme and language.'
      ] },
      { p: 'We do not ask for special categories of data (health, religion, political opinions…). Please do not enter them in free fields such as notes.' }
    ] },
    { id: 'finalita', title: 'Why we process them and on which legal basis', blocks: [
      { list: [
        'Providing the service (account, travel diary, statistics, recommendations, import): performance of a contract, Art. 6(1)(b) GDPR.',
        'Protecting your account (attempt limits, password recovery, security measures): legitimate interest and security obligation, Art. 6(1)(f) and 32 GDPR.',
        'Sending essential service emails, such as the password reset link: performance of a contract.'
      ] },
      { p: 'We do not use your data for advertising, we do not sell it and we do not profile you for third parties. There are no analytics or tracking tools.' }
    ] },
    { id: 'consigli', title: 'Recommendations, statistics and artificial intelligence', blocks: [
      { p: 'Statistics and destination recommendations are computed automatically from your trips with fixed, transparent rules: each destination’s score adds up five factors (taste, season, budget, distance, novelty) with weights stated in the Guide, and every recommendation shows why.' },
      { p: 'Tripsight does not currently use artificial intelligence systems or machine-learning models, and it takes no decisions that produce legal effects or similarly significantly affect you (Art. 22 GDPR): recommendations are suggestions you can ignore. If we introduce AI-based features in the future, we will say so clearly in the app and in this notice.' }
    ] },
    { id: 'destinatari', title: 'Who receives the data', blocks: [
      { p: 'Data stays on our systems. Some providers process it on our behalf, as processors (Art. 28 GDPR), only as needed:' },
      { list: [
        'Server and database hosting: {{hostingProvider}}.',
        { if: 'resend', text: 'Resend (Resend Inc., United States): sending password recovery emails. It receives your email address and the message text.' },
        'OpenStreetMap Foundation (United Kingdom): maps are loaded by your browser, which receives the images of the area shown from their servers. OpenStreetMap sees your IP address and the map area, not your trips.'
      ] },
      { p: 'These services receive no personal data: AirLabs (only flight number and date, to fetch schedules), Travelpayouts (only route and month, to show fares found), the ECB exchange-rate service (only currency and date), Wikipedia (city pictures are downloaded by our server, not your browser). Fonts are hosted by us.' }
    ] },
    { id: 'trasferimenti', title: 'Transfers outside the European Union', blocks: [
      { p: 'Some providers are based in the United States or the United Kingdom. For the United Kingdom the European Commission’s adequacy decision applies. For the United States, transfers go to providers certified under the EU-U.S. Data Privacy Framework or rely on the Commission’s standard contractual clauses.' }
    ] },
    { id: 'conservazione', title: 'How long we keep data', blocks: [
      { list: [
        'Account and travel data: as long as the account is active. If you delete it, data is removed immediately; backups are overwritten within {{backupRetentionDays}} days.',
        'Imported emails: items already confirmed or dismissed are deleted after {{inboxHandledDays}} days, items never confirmed after {{inboxPendingDays}} days.',
        'Password reset links: valid for 30 minutes, then deleted.',
        'IP address for attempt limits: at most 15 minutes, in memory only.'
      ] }
    ] },
    { id: 'diritti', title: 'Your rights', blocks: [
      { p: 'You can request access, rectification, erasure, restriction and portability of your data at any time, and object to processing based on legitimate interest (Art. 15-22 GDPR). Two rights you exercise yourself, instantly, in Profile → Your data:' },
      { list: [
        'Download your data: a JSON file with account, flights, trips, wishlist and imported emails, readable and reusable in other services.',
        'Delete account: permanently deletes the account and all linked data.'
      ] },
      { p: 'For the other rights write to {{contactEmail}}: we reply within one month. If you believe the processing infringes the GDPR you can lodge a complaint with your data protection authority (in Italy: Garante per la protezione dei dati personali, www.garanteprivacy.it).' }
    ] },
    { id: 'browser', title: 'Cookies and browser storage', blocks: [
      { p: 'Tripsight uses no cookies, neither its own nor third-party. Your browser’s local storage only keeps what the app needs to work: your login session, theme and language. These are technical tools, so no consent is required. Logging out removes the session.' }
    ] },
    { id: 'sicurezza', title: 'Security and minors', blocks: [
      { p: 'We protect data with hashed passwords, HTTPS connections and login attempt limits. The service is for people aged 14 and over.' }
    ] },
    { id: 'modifiche', title: 'Changes', blocks: [
      { p: 'If this notice changes significantly we will let you know in the app. The last update date is shown at the top.' }
    ] }
  ]
};

export function privacyText(locale) {
  return locale === 'en' ? EN : IT;
}
