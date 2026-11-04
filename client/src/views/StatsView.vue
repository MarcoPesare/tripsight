<script setup>
import { computed, onMounted } from 'vue';
import InfoTip from '../components/InfoTip.vue';
import { Lightbulb } from '@lucide/vue';
import TripMap from '../components/TripMap.vue';
import BarList from '../components/charts/BarList.vue';
import ColumnChart from '../components/charts/ColumnChart.vue';
import ScatterChart from '../components/charts/ScatterChart.vue';
import { useTripsStore } from '../stores/trips';
import { useJourneysStore } from '../stores/journeys';
import { useUiStore } from '../stores/ui';
import { countryLabel } from '../services/geo';
import { duration, money, number } from '../services/format';
import { categoryLabel } from '../services/vocabulary';
import { SPEND_CATEGORIES, airlineEfficiency, buildInsights, leadTimePoints, monthlyCost, spendByYear } from '../services/analytics';

const trips = useTripsStore();
const journeys = useJourneysStore();
const ui = useUiStore();

const totalSpend = computed(() => trips.totalSpend + journeys.extraSpend);
const totalDays = computed(() => journeys.summaries.reduce((sum, summary) => sum + summary.days, 0));
const pricedSummaries = computed(() => journeys.summaries.filter((summary) => summary.total && summary.days));
const avgPerDay = computed(() => {
  const days = pricedSummaries.value.reduce((sum, summary) => sum + summary.days, 0);
  return days ? pricedSummaries.value.reduce((sum, summary) => sum + summary.total, 0) / days : 0;
});
const costPerKm = computed(() => trips.totalDistance ? trips.totalSpend / trips.totalDistance : 0);

const years = computed(() => spendByYear(trips.trips, journeys.journeys));
const yearSeries = computed(() => SPEND_CATEGORIES
  .map((key, index) => ({ key, slot: index + 1, label: categoryLabel(key, ui.locale) }))
  .filter((serie) => years.value.some((item) => item.segments[serie.key] > 0)));
const airlines = computed(() => airlineEfficiency(trips.trips));
const points = computed(() => leadTimePoints(trips.trips));
const months = computed(() => monthlyCost(trips.trips));
const monthItems = computed(() => months.value.map((item) => ({
  label: monthName(item.month, 'narrow'),
  value: item.value,
  note: item.count ? `${monthName(item.month, 'long')} · ${item.count} ${ui.t(item.count === 1 ? 'stats.flightShort' : 'stats.flightsShort')}` : ''
})));
const ranking = computed(() => [...pricedSummaries.value].sort((a, b) => b.perDay - a.perDay));
const insights = computed(() => buildInsights({ points: points.value, months: months.value, airlines: airlines.value, summaries: pricedSummaries.value }));

const eur = (value) => money(value, 'EUR', ui.locale);
const eurCompact = (value) => value >= 1000 ? `${number(value / 1000, ui.locale, value % 1000 ? 1 : 0)}k €` : `${Math.round(value)} €`;
const perKm = (value) => `${number(value * 100, ui.locale, 1)} c/km`;

function monthName(month, style) {
  return new Date(2024, month - 1, 1).toLocaleDateString(ui.locale === 'en' ? 'en-GB' : 'it-IT', { month: style });
}

function insightText(insight) {
  const v = insight.values;

  if (insight.key === 'leadTime') {
    return v.diff > 0
      ? ui.t('stats.insightLeadMore').replace('{diff}', v.diff)
      : ui.t('stats.insightLeadLess').replace('{diff}', Math.abs(v.diff));
  }

  if (insight.key === 'months') {
    return ui.t('stats.insightMonths').replace('{cheap}', monthName(v.cheapest, 'long')).replace('{pricey}', monthName(v.priciest, 'long'));
  }

  if (insight.key === 'airline') {
    return ui.t('stats.insightAirline').replace('{best}', v.best).replace('{worst}', v.worst).replace('{ratio}', number(v.ratio, ui.locale, 1));
  }

  return ui.t('stats.insightJourneys')
    .replace('{cheap}', v.cheapest.journey.title)
    .replace('{cheapValue}', eur(v.cheapest.perDay))
    .replace('{pricey}', v.priciest.journey.title)
    .replace('{priceyValue}', eur(v.priciest.perDay));
}

onMounted(() => {
  trips.fetchTrips();
  journeys.fetchJourneys();
});
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1>{{ ui.t('stats.title') }}</h1>
        <p>{{ ui.t('stats.subtitle') }}</p>
      </div>
    </header>

    <div class="grid stats-grid">
      <article class="card stat-card stat-hero">
        <span>{{ ui.t('stats.spend') }} <InfoTip term="totalSpend" /></span>
        <strong>{{ eur(totalSpend) }}</strong>
        <small class="muted">{{ ui.t('stats.spendNote') }}</small>
      </article>
      <article class="card stat-card">
        <span>{{ ui.t('stats.perDay') }} <InfoTip term="perDay" /></span>
        <strong>{{ avgPerDay ? eur(avgPerDay) : '—' }}</strong>
        <small class="muted">{{ totalDays }} {{ ui.t('journeys.days') }}</small>
      </article>
      <article class="card stat-card">
        <span>{{ ui.t('stats.costPerKm') }} <InfoTip term="costPerKm" /></span>
        <strong><template v-if="costPerKm">{{ number(costPerKm * 100, ui.locale, 1) }}<small class="unit"> c/km</small></template><template v-else>—</template></strong>
        <small class="muted">{{ number(trips.totalDistance, ui.locale) }} km</small>
      </article>
      <article class="card stat-card">
        <span>{{ ui.t('stats.flights') }}</span>
        <strong>{{ trips.trips.length }}</strong>
        <small class="muted">{{ duration(trips.totalHours, ui.locale) }}</small>
      </article>
      <article class="card stat-card">
        <span>{{ ui.t('stats.states') }}</span>
        <strong>{{ trips.countries.length }}</strong>
        <small class="muted">{{ trips.cities.length }} {{ ui.t('stats.cities').toLowerCase() }}</small>
      </article>
    </div>

    <section v-if="insights.length" class="card insights-card">
      <h2><Lightbulb :size="20" /> {{ ui.t('stats.insights') }} <InfoTip term="insights" /></h2>
      <ul>
        <li v-for="insight in insights" :key="insight.key">{{ insightText(insight) }}</li>
      </ul>
    </section>

    <div class="chart-grid">
      <article class="card chart-card chart-wide">
        <h2>{{ ui.t('stats.byYear') }} <InfoTip term="byYear" /></h2>
        <p class="muted">{{ ui.t('stats.byYearLead') }}</p>
        <ColumnChart v-if="years.length" :items="years" :series="yearSeries" :format="eur" :format-tick="eurCompact" :aria-label="ui.t('stats.byYear')" />
        <p v-else class="empty-chart">{{ ui.t('stats.noData') }}</p>
      </article>

      <article class="card chart-card">
        <h2>{{ ui.t('stats.byAirline') }} <InfoTip term="byAirline" /></h2>
        <p class="muted">{{ ui.t('stats.byAirlineLead') }}</p>
        <BarList v-if="airlines.length" :items="airlines" :format="perKm" :detail="(item) => `${item.count} ${ui.t(item.count === 1 ? 'stats.flightShort' : 'stats.flightsShort')} · ${eur(item.cost)}`" />
        <p v-else class="empty-chart">{{ ui.t('stats.noData') }}</p>
      </article>

      <article class="card chart-card">
        <h2>{{ ui.t('stats.leadTime') }} <InfoTip term="leadTime" /></h2>
        <p class="muted">{{ ui.t('stats.leadTimeLead') }}</p>
        <ScatterChart
          v-if="points.length >= 2"
          :points="points"
          :x-label="ui.t('stats.daysBefore')"
          :format-x="(value) => `${Math.round(value)} ${ui.locale === 'en' ? 'd' : 'g'}`"
          :format-y="perKm"
        />
        <p v-else class="empty-chart">{{ ui.t('stats.leadTimeEmpty') }}</p>
      </article>

      <article class="card chart-card">
        <h2>{{ ui.t('stats.byMonth') }} <InfoTip term="byMonth" /></h2>
        <p class="muted">{{ ui.t('stats.byMonthLead') }}</p>
        <ColumnChart v-if="months.some((month) => month.count)" :items="monthItems" :format="perKm" :aria-label="ui.t('stats.byMonth')" />
        <p v-else class="empty-chart">{{ ui.t('stats.noData') }}</p>
      </article>

      <article class="card chart-card">
        <h2>{{ ui.t('stats.ranking') }} <InfoTip term="ranking" /></h2>
        <p class="muted">{{ ui.t('stats.rankingLead') }}</p>
        <BarList
          v-if="ranking.length"
          :items="ranking.map((summary) => ({ label: summary.journey.title, value: summary.perDay, total: summary.total, days: summary.days }))"
          :format="eur"
          :detail="(item) => `${item.days} ${ui.t('journeys.days')} · ${eur(item.total)}`"
        />
        <p v-else class="empty-chart">
          {{ ui.t('stats.rankingEmpty') }}
          <RouterLink class="text-link" :to="{ name: 'journeys' }">{{ ui.t('journeys.new') }}</RouterLink>
        </p>
      </article>
    </div>

    <div class="grid split-grid" style="margin-top: 16px">
      <TripMap :trips="trips.trips" />

      <article class="card atlas-card">
        <h2>{{ ui.t('stats.atlasTitle') }}</h2>
        <h3>{{ ui.t('stats.visitedStates') }}</h3>
        <div class="place-list">
          <span v-for="country in trips.countries" :key="country" class="pill pill-country">{{ countryLabel(country, ui.locale) }}</span>
        </div>

        <h3>{{ ui.t('stats.visitedCities') }}</h3>
        <div class="place-list">
          <span v-for="city in trips.cities" :key="city" class="pill">{{ city }}</span>
        </div>

        <h3>{{ ui.t('stats.airports') }}</h3>
        <div class="place-list">
          <span v-for="airport in trips.airports" :key="airport" class="pill">{{ airport }}</span>
        </div>
      </article>
    </div>
  </section>
</template>
