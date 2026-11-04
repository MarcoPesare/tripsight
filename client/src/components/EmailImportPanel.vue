<script setup>
import { onMounted, ref } from 'vue';
import { Mail } from '@lucide/vue';
import InboxItem from './InboxItem.vue';
import InfoTip from './InfoTip.vue';
import { useInboxStore } from '../stores/inbox';
import { useJourneysStore } from '../stores/journeys';
import { useUiStore } from '../stores/ui';

const inbox = useInboxStore();
const journeys = useJourneysStore();
const ui = useUiStore();
const pasted = ref('');
const pasting = ref(false);
const message = ref('');
const error = ref('');

onMounted(() => {
  inbox.fetch().catch((err) => { error.value = err.message; });
  if (!journeys.loaded) journeys.fetchJourneys();
});

async function paste() {
  pasting.value = true;
  message.value = '';
  error.value = '';

  try {
    const result = await inbox.paste(pasted.value);
    const count = result.items.length;
    message.value = count === 1 ? ui.t('inbox.foundOne') : count ? ui.t('inbox.found').replace('{n}', count) : ui.t('inbox.nothingFound');
    if (result.items.length) pasted.value = '';
  } catch (err) {
    error.value = err.message;
  } finally {
    pasting.value = false;
  }
}

// Il figlio passa resolve/reject: così l'errore (es. volo già presente) appare sulla sua scheda.
async function confirmItem(item, payload, { resolve, reject }) {
  try {
    await inbox.confirm(item, payload);
    resolve();
  } catch (err) {
    reject(err);
  }
}
</script>

<template>
  <section class="email-import">
    <article class="card form-card email-import-card">
      <div class="form-section-head">
        <h2><Mail :size="20" /> {{ ui.t('inbox.title') }} <InfoTip term="emailImport" /></h2>
      </div>
      <p class="muted">{{ ui.t('inbox.lead') }}</p>

      <ol class="import-steps">
        <li>{{ ui.t('inbox.step1') }}</li>
        <li>{{ ui.t('inbox.step2') }}</li>
        <li>{{ ui.t('inbox.step3') }}</li>
      </ol>

      <div class="paste-box">
        <label class="field">
          <span>{{ ui.t('inbox.pasteLabel') }}</span>
          <textarea id="inbox-paste" v-model="pasted" rows="6" :placeholder="ui.t('inbox.pastePlaceholder')"></textarea>
        </label>
        <button class="button" type="button" :disabled="pasting || pasted.trim().length < 20" @click="paste">{{ pasting ? ui.t('dashboard.loading') : ui.t('inbox.read') }}</button>
      </div>

      <div v-if="message" class="success">{{ message }}</div>
      <div v-if="error" class="error">{{ error }}</div>
    </article>

    <div v-if="inbox.items.length" class="inbox-list">
      <h2 class="section-title">{{ ui.t('inbox.pending') }} · {{ inbox.count }}</h2>
      <InboxItem
        v-for="item in inbox.items"
        :key="item.id"
        :item="item"
        @confirm="(payload, handlers) => confirmItem(item, payload, handlers)"
        @dismiss="inbox.dismiss(item)"
      />
    </div>
  </section>
</template>
