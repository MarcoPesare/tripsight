<script setup>
import { computed, onMounted, ref } from 'vue';
import InfoTip from '../components/InfoTip.vue';
import { Bookmark, BookmarkCheck, Compass, Plane } from '@lucide/vue';
import { useTripsStore } from '../stores/trips';
import { useJourneysStore } from '../stores/journeys';
import { useWishlistStore } from '../stores/wishlist';
import { useUiStore } from '../stores/ui';
import { WEIGHTS, buildProfile, buildRecommendations } from '../services/recommendations';
import { countryLabel } from '../services/geo';
import { duration, money, number } from '../services/format';
import { TAGS, tagLabel } from '../services/vocabulary';

const trips = useTripsStore();
const journeys = useJourneysStore();
const wishlist = useWishlistStore();
const ui = useUiStore();

const month = ref((new Date().getMonth() + 1) % 12 + 1);
const maxBudget = ref(0);
const selectedTags = ref([]);
const wishlistError = ref('');

const profile = computed(() => buildProfile(trips.trips, journeys.journeys));
const recommendations = computed(() => buildRecommendations(profile.value, {
  month: month.value,
  maxBudget: Number(maxBudget.value || 0),
  tags: selectedTags.value,
  wishlistIds: wishlist.ids
}));
const months = computed(() => Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Date(2024, index, 1).toLocaleDateString(ui.locale === 'en' ? 'en-GB' : 'it-IT', { month: 'long' })
})));
const topTastes = computed(() => Object.entries(profile.value.tagWeights).filter(([, weight]) => weight > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tag]) => tag));
const factors = computed(() => Object.keys(WEIGHTS));
const eur = (value) => money(value, 'EUR', ui.locale);

onMounted(() => {
  if (!trips.trips.length) trips.fetchTrips();
  if (!journeys.loaded) journeys.fetchJourneys();
  if (!wishlist.loaded) wishlist.fetch().catch((error) => { wishlistError.value = error.message; });
});

function toggleTag(tag) {
  selectedTags.value = selectedTags.value.includes(tag) ? selectedTags.value.filter((item) => item !== tag) : [...selectedTags.value, tag];
}

async function toggleWishlist(city) {
  wishlistError.value = '';

  try {
    await wishlist.toggle({ ...city, name: city.name[ui.locale] || city.name.it });
  } catch (error) {
    wishlistError.value = error.message;
  }
}

function reasonText(reason, city) {
  const t = (key) => ui.t(`discover.reasons.${key}`);

  switch (reason.key) {
    case 'affinity':
      return t('affinity').replace('{tags}', reason.tags.map((tag) => tagLabel(tag, ui.locale)).join(', '));
    case 'dislike':
      return t('dislike').replace('{tag}', tagLabel(reason.tags[0], ui.locale));
    case 'budgetUnder':
    case 'budgetOver':
      return t(reason.key).replace('{value}', eur(reason.value)).replace('{user}', eur(reason.user));
    case 'distance':
      return t('distance').replace('{hours}', duration(city.flightHours, ui.locale, 5));
    case 'farther':
      return t('farther').replace('{hours}', duration(city.flightHours, ui.locale, 5));
    case 'newCountry':
      return t('newCountry').replace('{country}', countryLabel(reason.country, ui.locale));
    default:
      return t(reason.key).replace('{month}', months.value[month.value - 1].label);
  }
}
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1>{{ ui.t('discover.title') }}</h1>
        <p>{{ ui.t('discover.subtitle') }}</p>
      </div>
      <Compass :size="40" class="stats-icon" />
    </header>

    <section class="card discover-profile">
      <div>
        <p class="eyebrow">{{ ui.t('discover.profile') }} <InfoTip term="score" /></p>
        <p v-if="profile.hasTaste" class="profile-tastes">
          {{ ui.t('discover.youLike') }}
          <span v-for="tag in topTastes" :key="tag" class="pill">{{ tagLabel(tag, ui.locale) }}</span>
        </p>
        <p v-else class="muted">{{ ui.t('discover.noTaste') }}</p>
        <p class="muted">
          <template v-if="profile.dailyBudget">{{ ui.t('discover.yourBudget') }} <strong>{{ eur(profile.dailyBudget) }}</strong>. </template>
          <template v-else>{{ ui.t('discover.noBudget') }} </template>
          <template v-if="profile.home">{{ ui.t('discover.home') }} <strong>{{ profile.home.iata }}</strong>.</template>
        </p>
      </div>
    </section>

    <section class="filter-bar" :aria-label="ui.t('discover.filters')">
      <label class="field compact-field">
        <span>{{ ui.t('discover.month') }}</span>
        <select v-model.number="month">
          <option v-for="item in months" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label class="field compact-field">
        <span>{{ ui.t('discover.maxBudget') }} <InfoTip term="groundBudget" /></span>
        <select v-model.number="maxBudget">
          <option :value="0">{{ ui.t('discover.anyBudget') }}</option>
          <option v-for="value in [60, 90, 120, 160]" :key="value" :value="value">≤ {{ eur(value) }} / {{ ui.t('journeys.day') }}</option>
        </select>
      </label>
      <div class="tag-picker">
        <button v-for="tag in TAGS.filter((item) => item !== 'business')" :key="tag" type="button" :class="{ 'is-active': selectedTags.includes(tag) }" @click="toggleTag(tag)">
          {{ tagLabel(tag, ui.locale) }}
        </button>
      </div>
    </section>

    <div v-if="wishlistError" class="error">{{ wishlistError }}</div>
    <p v-if="!recommendations.length" class="empty-state">{{ ui.t('discover.noResults') }}</p>

    <div class="recommendation-grid">
      <article v-for="city in recommendations" :key="city.id" class="card recommendation-card">
        <div class="recommendation-head">
          <div>
            <h2>{{ city.name[ui.locale] || city.name.it }}</h2>
            <p class="muted">{{ countryLabel(city.country, ui.locale) }} · {{ city.airport }}</p>
          </div>
          <div class="recommendation-score" :title="ui.t('discover.scoreHint')">
            <strong>{{ city.score }}</strong>
            <span>/100</span>
          </div>
        </div>

        <ul class="score-breakdown" :aria-label="ui.t('discover.scoreHint')">
          <li v-for="factor in factors" :key="factor">
            <span>{{ ui.t(`discover.factors.${factor}`) }}</span>
            <span class="score-track"><span class="score-fill" :style="{ width: `${(city.parts[factor] / WEIGHTS[factor]) * 100}%` }"></span></span>
          </li>
        </ul>

        <ul class="reason-list">
          <li v-for="reason in city.reasons.slice(0, 4)" :key="reason.key" :class="{ 'is-negative': ['dislike', 'seasonBad', 'budgetOver', 'farther'].includes(reason.key) }">
            {{ reasonText(reason, city) }}
          </li>
        </ul>

        <div class="place-list">
          <span v-for="tag in city.tags" :key="tag" class="pill">{{ tagLabel(tag, ui.locale) }}</span>
        </div>

        <div class="recommendation-meta">
          <span v-if="city.flightHours"><Plane :size="16" /> ≈ {{ duration(city.flightHours, ui.locale, 5) }}</span>
          <span>≈ {{ eur(city.budget) }} / {{ ui.t('journeys.day') }}</span>
        </div>

        <button class="button" :class="{ 'is-saved': city.saved }" type="button" @click="toggleWishlist(city)">
          <BookmarkCheck v-if="city.saved" :size="17" />
          <Bookmark v-else :size="17" />
          {{ city.saved ? ui.t('discover.saved') : ui.t('discover.save') }}
        </button>
      </article>
    </div>

    <p class="muted disclaimer">{{ ui.t('discover.disclaimer') }}</p>

    <section class="card wishlist-panel">
      <h2>{{ ui.t('discover.wishlist') }}</h2>
      <div v-if="wishlist.items.length" class="place-list">
        <span v-for="city in wishlist.items" :key="city.id" class="pill pill-country">{{ city.name }} · {{ city.airport }}</span>
      </div>
      <p v-else class="muted">{{ ui.t('discover.wishlistEmpty') }}</p>
    </section>
  </section>
</template>
