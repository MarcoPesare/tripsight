// Vocabolario unico dei tag: il form, il catalogo dei consigli e lo scoring
// devono parlare la stessa lingua, altrimenti il match non scatta mai.
export const TAGS = ['low-cost', 'weekend', 'food', 'culture', 'sea', 'nightlife', 'relax', 'nature', 'design', 'warm', 'adventure', 'business'];

const aliases = {
  cibo: 'food',
  arte: 'culture',
  cultura: 'culture',
  mare: 'sea',
  notte: 'nightlife',
  night: 'nightlife',
  natura: 'nature',
  mediterranean: 'sea',
  lowcost: 'low-cost',
  'low cost': 'low-cost',
  caldo: 'warm',
  avventura: 'adventure'
};

export function canonicalTag(tag) {
  const normalized = String(tag || '').trim().toLowerCase();
  const mapped = aliases[normalized] || normalized;

  return TAGS.includes(mapped) ? mapped : '';
}

export function canonicalTags(tags) {
  if (!Array.isArray(tags)) return [];

  return [...new Set(tags.map(canonicalTag).filter(Boolean))].slice(0, 8);
}
