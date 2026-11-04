// Foto delle città da Wikipedia, con autore e licenza del file (richiesti da CC BY / CC BY-SA).
// Le scarica il server: il browser dell'utente non contatta Wikimedia, quindi il suo IP non
// viene trasmesso a terzi. Cache in memoria di immagine e attribuzione, solo host Wikimedia.

const MAX_ENTRIES = 300;
const ALLOWED_HOSTS = new Set(['upload.wikimedia.org', 'thumb.wikimedia.org']);
const USER_AGENT = 'Tripsight/1.0 (portfolio project; https://github.com/MarcoPesare/tripsight)';
const cache = new Map();

export async function lookupCityImage(city) {
  const key = city.toLowerCase();
  if (!cache.has(key)) {
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    // La promessa in cache evita richieste doppie quando immagine e attribuzione arrivano insieme.
    cache.set(key, fetchCityImage(city).catch(() => ({ empty: true })));
  }
  return cache.get(key);
}

async function fetchCityImage(city) {
  const summary = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`);
  const source = summary?.thumbnail?.source || '';
  const url = source ? new URL(source) : null;
  if (!url || !ALLOWED_HOSTS.has(url.hostname)) return { empty: true };

  // Wikimedia accetta solo larghezze standard (es. 500, 960): 500px basta per la card e pesa poco.
  url.pathname = url.pathname.replace(/\/\d+px-/, '/500px-');
  url.search = '';
  let image = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) });
  // Se l'originale è più piccolo di 500px la miniatura non esiste: si usa quella proposta.
  if (!image.ok) image = await fetch(source, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) });
  if (!image.ok) return { empty: true };

  return {
    type: image.headers.get('content-type') || 'image/jpeg',
    body: Buffer.from(await image.arrayBuffer()),
    credit: await fetchCredit(source)
  };
}

// Autore e licenza dalle informazioni del file; se mancano resta almeno il link alla pagina del file.
async function fetchCredit(thumbnailUrl) {
  const file = fileFromThumbnail(thumbnailUrl);
  if (!file) return null;

  const api = `https://${file.site}/w/api.php?action=query&prop=imageinfo&iiprop=extmetadata&format=json&titles=${encodeURIComponent(`File:${file.name}`)}`;
  const payload = await getJson(api);
  const page = Object.values(payload?.query?.pages || {})[0];
  return creditFromMetadata(file, page?.imageinfo?.[0]?.extmetadata);
}

// ".../wikipedia/commons/thumb/a/a6/Nome_file.jpg/330px-Nome_file.jpg" → { name, site }
export function fileFromThumbnail(thumbnailUrl) {
  let pathname;
  try {
    pathname = new URL(thumbnailUrl).pathname;
  } catch {
    return null;
  }

  const match = pathname.match(/^\/wikipedia\/([a-z-]+)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
  if (!match) return null;

  const [, project, encodedName] = match;
  const site = project === 'commons' ? 'commons.wikimedia.org' : `${project}.wikipedia.org`;
  return { name: decodeURIComponent(encodedName), site };
}

export function creditFromMetadata(file, metadata = {}) {
  const value = (field) => plainText(metadata?.[field]?.value);
  const pageUrl = `https://${file.site}/wiki/File:${encodeURIComponent(file.name.replace(/ /g, '_'))}`;

  return {
    author: value('Artist').slice(0, 120),
    license: value('LicenseShortName'),
    licenseUrl: /^https?:\/\//.test(value('LicenseUrl')) ? value('LicenseUrl') : '',
    source: file.site === 'commons.wikimedia.org' ? 'Wikimedia Commons' : 'Wikipedia',
    pageUrl
  };
}

// Il campo Artist è HTML (link al profilo, a volte più righe): serve solo il testo.
function plainText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) }).catch(() => null);
  return response?.ok ? response.json().catch(() => null) : null;
}
