// Stesso vocabolario del server (server/src/services/tags.js): i valori salvati sono
// sempre le chiavi inglesi, le etichette dipendono dalla lingua.
export const TAGS = ['low-cost', 'weekend', 'food', 'culture', 'sea', 'nightlife', 'relax', 'nature', 'design', 'warm', 'adventure', 'business'];

const tagLabels = {
  it: { 'low-cost': 'low-cost', weekend: 'weekend', food: 'cibo', culture: 'cultura', sea: 'mare', nightlife: 'vita notturna', relax: 'relax', nature: 'natura', design: 'design', warm: 'caldo', adventure: 'avventura', business: 'business' },
  en: { 'low-cost': 'budget', weekend: 'weekend', food: 'food', culture: 'culture', sea: 'sea', nightlife: 'nightlife', relax: 'relax', nature: 'nature', design: 'design', warm: 'warm', adventure: 'adventure', business: 'business' }
};

export const TRIP_TYPES = ['city_break', 'sea', 'culture', 'nature', 'friends', 'family', 'work'];

const tripTypeLabels = {
  it: { city_break: 'City break', sea: 'Mare', culture: 'Cultura', nature: 'Natura', friends: 'Amici', family: 'Famiglia', work: 'Lavoro' },
  en: { city_break: 'City break', sea: 'Seaside', culture: 'Culture', nature: 'Nature', friends: 'Friends', family: 'Family', work: 'Work' }
};

export const EXPENSE_CATEGORIES = ['stay', 'transport', 'food', 'activities', 'shopping', 'other'];

const categoryLabels = {
  it: { flight: 'Voli', stay: 'Alloggio', transport: 'Trasporti', food: 'Cibo', activities: 'Attività', shopping: 'Shopping', other: 'Altro' },
  en: { flight: 'Flights', stay: 'Stay', transport: 'Transport', food: 'Food', activities: 'Activities', shopping: 'Shopping', other: 'Other' }
};

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'AED', 'THB'];

export function tagLabel(tag, locale = 'it') {
  return tagLabels[locale]?.[tag] || tagLabels.it[tag] || tag;
}

export function tripTypeLabel(type, locale = 'it') {
  return tripTypeLabels[locale]?.[type] || tripTypeLabels.it[type] || type;
}

export function categoryLabel(category, locale = 'it') {
  return categoryLabels[locale]?.[category] || categoryLabels.it[category] || category;
}
