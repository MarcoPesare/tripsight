// Invio email transazionali via API HTTP di Resend (nessuna dipendenza aggiuntiva).
// Senza RESEND_API_KEY, in sviluppo il link viene stampato solo nel log del server:
// non deve mai tornare nella risposta HTTP.
export async function sendPasswordResetEmail({ to, name, link }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[mailer] RESEND_API_KEY mancante: email di recupero non inviata');
      return false;
    }

    console.info(`[mailer] Link di recupero per ${to}: ${link}`);
    return true;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'Tripsight <onboarding@resend.dev>',
      to,
      subject: 'Reimposta la tua password',
      text: `Ciao ${name || ''},\n\nper impostare una nuova password apri questo link entro 30 minuti:\n${link}\n\nSe non hai richiesto tu il recupero, ignora questa email.`
    })
  });

  if (!response.ok) {
    console.error(`[mailer] Invio fallito: ${response.status}`);
    return false;
  }

  return true;
}
