<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@lucide/vue';
import { LEGAL } from '../config/legal';
import { privacyText } from '../services/privacyText';
import { shortDate } from '../services/format';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();
const auth = useAuthStore();
const router = useRouter();
const text = computed(() => privacyText(ui.locale));

const values = {
  ...LEGAL,
  backupRetentionDays: LEGAL.backupRetentionDays,
  inboxHandledDays: LEGAL.retention.inboxHandledDays,
  inboxPendingDays: LEGAL.retention.inboxPendingDays
};

// Divide il testo in parti normali e segnaposto {{campo}}: i campi vuoti si vedono subito.
function parts(sentence) {
  return String(sentence).split(/(\{\{\w+\}\})/).filter(Boolean).map((chunk) => {
    const match = chunk.match(/^\{\{(\w+)\}\}$/);
    if (!match) return { text: chunk };

    const value = values[match[1]];
    return value === '' || value === undefined ? { missing: match[1] } : { text: String(value) };
  });
}

// Le voci legate a un fornitore compaiono solo se quel servizio è attivo in config/legal.js.
function visible(item) {
  return typeof item === 'string' || LEGAL.processors[item.if];
}

const itemText = (item) => (typeof item === 'string' ? item : item.text);
</script>

<template>
  <section class="legal-page">
    <header class="page-header">
      <div>
        <button class="ghost-button" type="button" @click="auth.isAuthenticated ? router.back() : router.push({ name: 'login' })">
          <ArrowLeft :size="18" />
          {{ ui.t('detail.back') }}
        </button>
        <h1>{{ text.title }}</h1>
        <p>{{ text.intro }}</p>
        <p class="muted">{{ text.updated }}: {{ shortDate(LEGAL.lastUpdated, ui.locale) }}</p>
      </div>
    </header>

    <div class="legal-layout">
      <nav class="legal-toc" :aria-label="ui.t('guide.contents')">
        <a v-for="section in text.sections" :key="section.id" :href="`#${section.id}`">{{ section.title }}</a>
      </nav>

      <div class="legal-content">
        <section v-for="section in text.sections" :id="section.id" :key="section.id" class="legal-section">
          <h2>{{ section.title }}</h2>
          <template v-for="(block, index) in section.blocks" :key="index">
            <p v-if="block.p">
              <template v-for="(part, partIndex) in parts(block.p)" :key="partIndex">
                <mark v-if="part.missing" class="legal-missing">[{{ text.missing }}: {{ part.missing }}]</mark>
                <template v-else>{{ part.text }}</template>
              </template>
            </p>
            <ul v-else-if="block.list">
              <li v-for="(item, itemIndex) in block.list.filter(visible)" :key="itemIndex">
                <template v-for="(part, partIndex) in parts(itemText(item))" :key="partIndex">
                  <mark v-if="part.missing" class="legal-missing">[{{ text.missing }}: {{ part.missing }}]</mark>
                  <template v-else>{{ part.text }}</template>
                </template>
              </li>
            </ul>
          </template>
        </section>
      </div>
    </div>
  </section>
</template>
