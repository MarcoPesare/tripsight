<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Search } from '@lucide/vue';
import { GLOSSARY, GLOSSARY_SECTIONS } from '../services/glossary';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();
const route = useRoute();
// :target non si aggiorna con la navigazione del router: la voce attiva si ricava dall'hash.
const activeKey = computed(() => route.hash.slice(1));
const query = ref('');
const dictionary = computed(() => GLOSSARY[ui.locale] || GLOSSARY.it);

const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Sezioni con le sole voci che contengono il testo cercato (titolo, sintesi o spiegazione).
const sections = computed(() => {
  const needle = normalize(query.value.trim());

  return GLOSSARY_SECTIONS
    .map((section) => ({
      id: section.id,
      title: dictionary.value.sections[section.id],
      entries: section.keys
        .map((key) => ({ key, ...dictionary.value.entries[key] }))
        .filter((entry) => !needle || normalize(`${entry.title} ${entry.short} ${entry.body}`).includes(needle))
    }))
    .filter((section) => section.entries.length);
});
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1>{{ ui.t('guide.title') }}</h1>
        <p>{{ ui.t('guide.subtitle') }}</p>
      </div>
    </header>

    <div class="guide-layout">
      <aside class="guide-toc" :aria-label="ui.t('guide.contents')">
        <label class="guide-search">
          <Search :size="16" />
          <input id="guide-search" v-model="query" type="search" :placeholder="ui.t('guide.search')" />
        </label>
        <nav>
          <div v-for="section in sections" :key="section.id" class="guide-toc-group">
            <p>{{ section.title }}</p>
            <a v-for="entry in section.entries" :key="entry.key" :href="`#${entry.key}`">{{ entry.title }}</a>
          </div>
        </nav>
      </aside>

      <div class="guide-content">
        <p v-if="!sections.length" class="empty-state">{{ ui.t('guide.noResults') }}</p>

        <section v-for="section in sections" :key="section.id" class="guide-section">
          <h2>{{ section.title }}</h2>
          <article v-for="entry in section.entries" :id="entry.key" :key="entry.key" class="card guide-entry" :class="{ 'is-target': activeKey === entry.key }">
            <h3>{{ entry.title }}</h3>
            <p class="guide-short">{{ entry.short }}</p>
            <p v-if="entry.formula" class="guide-formula">{{ entry.formula }}</p>
            <p class="guide-body">{{ entry.body }}</p>
          </article>
        </section>
      </div>
    </div>
  </section>
</template>
