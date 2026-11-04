<script setup>
import { computed, ref } from 'vue';
import InfoTip from '../components/InfoTip.vue';
import EmailImportPanel from '../components/EmailImportPanel.vue';
import { Download, FileUp, Upload } from '@lucide/vue';
import { api } from '../services/api';
import { money } from '../services/format';
import { useTripsStore } from '../stores/trips';
import { useUiStore } from '../stores/ui';

const trips = useTripsStore();
const ui = useUiStore();
const csv = ref('');
const fileName = ref('');
const preview = ref(null);
const loading = ref(false);
const error = ref('');
const done = ref(null);
const okCount = computed(() => preview.value?.summary?.ok || 0);
const statusLabel = (status) => ui.t(`import.status.${status}`);

async function onFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  fileName.value = file.name;
  csv.value = await file.text();
  await runPreview();
}

async function runPreview() {
  loading.value = true;
  error.value = '';
  done.value = null;

  try {
    preview.value = await api.importFlights(csv.value, true);
  } catch (err) {
    preview.value = null;
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function confirmImport() {
  loading.value = true;
  error.value = '';

  try {
    const result = await api.importFlights(csv.value, false);
    done.value = result.imported;
    preview.value = null;
    await trips.fetchTrips();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1>{{ ui.t('import.title') }} <InfoTip term="import" /></h1>
        <p>{{ ui.t('import.subtitle') }}</p>
      </div>
    </header>

    <EmailImportPanel />

    <h2 class="section-title">{{ ui.t('import.csvTitle') }}</h2>
    <article class="card form-card import-card">
      <ol class="import-steps">
        <li>{{ ui.t('import.step1') }}</li>
        <li>{{ ui.t('import.step2') }}</li>
        <li>{{ ui.t('import.step3') }}</li>
      </ol>

      <div class="toolbar">
        <label class="button file-button">
          <FileUp :size="18" />
          {{ fileName || ui.t('import.choose') }}
          <input type="file" accept=".csv,text/csv" @change="onFile" />
        </label>
        <a class="ghost-button" :href="api.templateUrl" download>
          <Download :size="17" />
          {{ ui.t('import.template') }}
        </a>
      </div>

      <p class="muted">{{ ui.t('import.columns') }}</p>

      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="done !== null" class="success">{{ ui.t('import.done').replace('{n}', done) }} <RouterLink class="text-link" :to="{ name: 'flights' }">{{ ui.t('nav.flights') }}</RouterLink></div>
      <p v-if="loading" class="muted">{{ ui.t('dashboard.loading') }}</p>
    </article>

    <article v-if="preview" class="card form-card">
      <div class="form-section-head">
        <h2>{{ ui.t('import.preview') }}</h2>
        <div class="place-list">
          <span v-for="(count, status) in preview.summary" :key="status" class="pill" :class="`status-${status}`">{{ statusLabel(status) }}: {{ count }}</span>
        </div>
      </div>

      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ ui.t('import.flight') }}</th>
              <th>{{ ui.t('import.date') }}</th>
              <th>{{ ui.t('form.route') }}</th>
              <th>EUR</th>
              <th>{{ ui.t('import.state') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in preview.rows" :key="row.line" :class="`row-${row.status}`">
              <td>{{ row.line }}</td>
              <td>{{ row.flightNumber || '—' }}</td>
              <td>{{ row.startDate || '—' }}</td>
              <td>{{ row.route || '—' }}</td>
              <td>{{ row.priceBase ? money(row.priceBase, 'EUR', ui.locale) : '—' }}</td>
              <td>{{ statusLabel(row.status) }}<span v-if="row.message" class="muted"> · {{ row.message }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="toolbar form-actions">
        <button class="button" type="button" :disabled="loading || !okCount" @click="confirmImport">
          <Upload :size="18" />
          {{ ui.t('import.confirm').replace('{n}', okCount) }}
        </button>
      </div>
    </article>
  </section>
</template>
