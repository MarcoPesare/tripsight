// Dati legali di Tripsight usati dall'informativa privacy.
// I campi vuoti compaiono nell'informativa come "[da completare]" evidenziato:
// vanno compilati (e il testo fatto rivedere da un consulente privacy) prima del lancio.
export const LEGAL = {
  lastUpdated: '2026-10-23',

  // Titolare del trattamento: persona fisica (nome e cognome) o società (ragione sociale, P. IVA).
  controllerName: '',
  controllerAddress: '',
  contactEmail: '',

  // Fornitore che ospita server e database, e dove si trovano i dati (es. "Hetzner, Germania").
  hostingProvider: '',

  // Periodo dopo cui i backup che contengono un account cancellato vengono sovrascritti.
  backupRetentionDays: 30,

  // Servizi esterni attivi. Disattiva (false) quelli non configurati, così non compaiono.
  processors: {
    resend: true // email di recupero password
  },

  // Periodi di conservazione: devono coincidere con server/src/services/retention.js.
  retention: {
    inboxHandledDays: 30,
    inboxPendingDays: 90
  }
};
