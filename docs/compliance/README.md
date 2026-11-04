# Tripsight: conformità GDPR e AI Act

Stato al 23 ottobre 2026 (aggiornato dopo la rimozione dell'inoltro email e l'aggiunta delle tariffe di mercato). Questo documento descrive come Tripsight tratta i dati e come è stato adeguato. È una **base tecnica per il consulente privacy**, non un parere legale: informativa, registro e valutazioni vanno rivisti da un professionista prima del lancio.

## 1. AI Act (Regolamento UE 2024/1689)

### Classificazione attuale: Tripsight non contiene sistemi di IA

L'AI Act si applica ai "sistemi di IA" (art. 3.1): sistemi che, per obiettivi espliciti o impliciti, **deducono** dagli input come generare output. Le linee guida della Commissione sulla definizione (febbraio 2025) escludono i sistemi basati su regole definite unicamente da persone.

| Funzione | Come funziona | Sistema di IA? |
|---|---|---|
| Consigli sulle mete | Punteggio = somma di 5 fattori con pesi fissi scritti a mano (`client/src/services/recommendations.js`) | No: regole definite da persone, nessun apprendimento |
| Statistiche e frasi di sintesi | Medie, somme e confronti con soglie fisse (`client/src/services/analytics.js`) | No |
| Lettura delle email di prenotazione | Dati strutturati schema.org, espressioni regolari e verifica dei codici IATA sul catalogo aeroporti (`server/src/services/emailParser.js`) | No |
| Recupero dati volo | Chiamata all'API AirLabs per numero volo e data; se il numero copre più tratte sceglie l'utente | No |
| Tariffe trovate e prezzo tipico | Minimo e 75° percentile delle tariffe Travelpayouts della tratta nel mese; senza tariffe, formula fissa sulla distanza (`server/src/services/fareProvider.js`) | No: statistica descrittiva |

Anche se i consigli fossero considerati IA, rientrerebbero nel **rischio minimo**: non sono tra le pratiche vietate (art. 5) né tra gli usi ad alto rischio dell'allegato III.

### Cosa è già fatto

- Trasparenza volontaria: ogni consiglio mostra il punteggio per fattore e il motivo. La Guida e l'informativa privacy dichiarano che il calcolo usa regole fisse e nessuna IA.
- Nessuna decisione automatizzata con effetti giuridici o analoghi (art. 22 GDPR): i consigli sono suggerimenti.

### Se in futuro si aggiunge IA (es. un modello linguistico per leggere le email o generare consigli)

Dal 2 agosto 2026 si applicano gli obblighi di trasparenza (art. 50). Prima del rilascio:

1. **Dichiarare l'IA all'utente** quando interagisce con essa (art. 50.1), ad esempio con un'etichetta "Generato con IA" sui consigli o sui campi estratti.
2. **Marcare i contenuti generati** (testo, immagini) in formato leggibile da macchina, se l'app li genera (art. 50.2).
3. **Alfabetizzazione in materia di IA** (art. 4, in vigore dal 2 febbraio 2025): chi sviluppa e gestisce la funzione deve conoscerne capacità e limiti. Basta una breve documentazione interna.
4. **Fornitore del modello**: usando un modello di terzi (es. via API) Tripsight è "deployer" o "fornitore a valle". Verificare che il fornitore rispetti gli obblighi per i modelli per finalità generali (in vigore dal 2 agosto 2025) e firmare con lui un accordo sul trattamento dei dati, perché riceverebbe le email degli utenti.
5. **Aggiornare** informativa privacy (sezione "Consigli, statistiche e intelligenza artificiale"), Guida e questo documento.

Nota: a fine 2025 la Commissione ha proposto un pacchetto di semplificazione ("Digital Omnibus") che potrebbe spostare alcune scadenze dell'AI Act. Verificare lo stato al momento di introdurre funzioni di IA.

## 2. GDPR

### Cosa è stato implementato

| Requisito | Implementazione |
|---|---|
| Informativa (art. 13) | Pagina pubblica `/privacy` in italiano e inglese, testo in `client/src/services/privacyText.js`. Linkata da login, registrazione e Profilo |
| Informazione alla raccolta | In registrazione: "dichiari di avere almeno 14 anni e di aver letto l'informativa privacy" |
| Accesso e portabilità (artt. 15, 20) | Profilo → I tuoi dati → "Scarica i miei dati": JSON completo, senza segreti (`GET /api/account/export`) |
| Cancellazione (art. 17) | Profilo → I tuoi dati → "Elimina account", con conferma della password: elimina account e tutti i dati collegati (`DELETE /api/account`) |
| Rettifica (art. 16) | Tutti i dati di viaggio sono modificabili nell'app; nome ed email per ora su richiesta via email |
| Minimizzazione (art. 5.1.c) | Dalle email si salvano solo i campi estratti, mai il testo. Nessun cookie, nessuno strumento di analisi |
| Limitazione della conservazione (art. 5.1.e) | Pulizia automatica giornaliera (`server/src/services/retention.js`): email gestite dopo 30 giorni, mai confermate dopo 90, token di recupero scaduti |
| Sicurezza (art. 32) | Password bcrypt, JWT con segreto obbligatorio in produzione, limite di 20 tentativi ogni 15 minuti su login/registrazione/recupero, limite di richieste per account su recupero volo, tariffe e import email |
| Nessun dato a terzi non necessario | Font ospitati da Tripsight (prima Google Fonts), foto delle città scaricate dal server (prima dal browser verso Wikipedia) |
| Privacy by default | Nessun tracciamento, nessuna pubblicità, nessuna condivisione |

### Registro dei trattamenti (art. 30)

Anche sotto i 250 dipendenti il registro è dovuto quando il trattamento non è occasionale, come qui.

| Trattamento | Finalità | Base giuridica | Categorie di dati | Interessati | Destinatari | Conservazione |
|---|---|---|---|---|---|---|
| Gestione account | Accesso al servizio | Contratto (6.1.b) | Nome, email, hash password | Utenti | Hosting | Fino alla cancellazione dell'account |
| Diario di viaggio | Erogazione del servizio | Contratto (6.1.b) | Voli, viaggi, spese, note, voti, wishlist | Utenti | Hosting | Fino alla cancellazione dell'account |
| Import email (incolla) | Inserimento automatico delle prenotazioni | Contratto (6.1.b) | Dati estratti, oggetto | Utenti | Hosting | 30 / 90 giorni |
| Recupero password | Sicurezza dell'account | Contratto (6.1.b) | Email, token cifrato | Utenti | Resend | 30 minuti |
| Limite tentativi | Sicurezza | Legittimo interesse (6.1.f), art. 32 | Indirizzo IP | Chiunque usi login/recupero | Nessuno | 15 minuti, solo in memoria |
| Limite richieste per account | Sicurezza e continuità del servizio | Legittimo interesse (6.1.f), art. 32 | Identificativo dell'account, numero di richieste | Utenti | Nessuno | 15 minuti, solo in memoria |

### Fornitori (responsabili del trattamento, art. 28)

Con ciascuno serve un accordo sul trattamento dei dati (DPA). Di solito si accetta online nel pannello del fornitore.

| Fornitore | Ruolo | Dati | Sede | Base per il trasferimento | Da fare |
|---|---|---|---|---|---|
| Hosting (da scegliere) | Server e database | Tutti | Preferibilmente UE | Non serve se in UE | Scegliere un hosting UE e accettare il DPA |
| Resend | Email di recupero password | Email, testo del messaggio | USA | Data Privacy Framework o clausole standard | Accettare il DPA e verificare la certificazione DPF |
| OpenStreetMap Foundation | Mappe (richieste dal browser) | IP, zona della mappa | Regno Unito | Decisione di adeguatezza | Nessuno: dichiarato nell'informativa |

Non ricevono dati personali: AirLabs (numero volo e data), Travelpayouts (tratta e mese, per il prezzo medio di mercato), Frankfurter/BCE (valuta e data), Wikipedia (le richieste partono dal server).

### Valutazione d'impatto (DPIA, art. 35)

Non sembra obbligatoria: nessun trattamento su larga scala di dati particolari, nessun monitoraggio sistematico, nessuna decisione automatizzata con effetti significativi, nessuna nuova tecnologia ad alto rischio. Da rivalutare se si aggiunge IA sulle email o se gli utenti crescono molto.

### Violazione dei dati (artt. 33-34)

In caso di violazione: notificare il Garante entro 72 ore da quando se ne viene a conoscenza, e gli utenti se il rischio è elevato. Conviene tenere un registro interno delle violazioni (anche di quelle non notificate) con data, natura, dati coinvolti e misure prese.

## 3. Checklist prima del lancio

- [ ] Compilare `client/src/config/legal.js`: titolare, indirizzo, email di contatto, hosting. Finché sono vuoti, l'informativa li mostra evidenziati
- [ ] Far rivedere informativa privacy e questo documento da un consulente
- [ ] Scrivere i Termini di servizio (non ancora presenti) e linkarli in registrazione
- [ ] Scegliere un hosting nell'UE e accettare i DPA dei fornitori
- [ ] Servire l'app solo in HTTPS (l'informativa lo dichiara) e impostare `TRUST_PROXY` se c'è un proxy davanti al server
- [ ] Configurare i backup e fare in modo che si sovrascrivano entro i giorni indicati in `backupRetentionDays`
- [ ] Verificare che i log dell'hosting non conservino gli IP più a lungo del necessario, e indicarlo nell'informativa
- [ ] Aggiungere la modifica di nome ed email nel profilo (oggi la rettifica di questi due campi è solo su richiesta)
