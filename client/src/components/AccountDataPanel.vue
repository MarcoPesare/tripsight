<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Download, ShieldCheck, Trash2 } from '@lucide/vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';

// "I tuoi dati": portabilità (art. 20) e cancellazione (art. 17) esercitabili in autonomia.
const ui = useUiStore();
const auth = useAuthStore();
const router = useRouter();
const exporting = ref(false);
const confirmingDelete = ref(false);
const password = ref('');
const deleting = ref(false);
const error = ref('');

async function exportData() {
  exporting.value = true;
  error.value = '';

  try {
    const blob = await api.exportAccount();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tripsight-dati-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    error.value = err.message;
  } finally {
    exporting.value = false;
  }
}

async function deleteAccount() {
  deleting.value = true;
  error.value = '';

  try {
    await api.deleteAccount(password.value);
    auth.logout();
    router.push({ name: 'login', query: { deleted: '1' } });
  } catch (err) {
    error.value = err.message;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <article class="card settings-card">
    <h2><ShieldCheck :size="20" /> {{ ui.t('account.title') }}</h2>
    <p class="muted">{{ ui.t('account.lead') }}</p>

    <div class="settings-actions">
      <button class="ghost-button" type="button" :disabled="exporting" @click="exportData">
        <Download :size="17" />
        {{ exporting ? ui.t('dashboard.loading') : ui.t('account.export') }}
      </button>
      <RouterLink class="ghost-button" :to="{ name: 'privacy' }">{{ ui.t('account.privacy') }}</RouterLink>
      <button v-if="!confirmingDelete" class="danger-button" type="button" @click="confirmingDelete = true">
        <Trash2 :size="17" />
        {{ ui.t('account.delete') }}
      </button>
    </div>

    <form v-if="confirmingDelete" class="danger-zone" @submit.prevent="deleteAccount">
      <p><strong>{{ ui.t('account.deleteTitle') }}</strong> {{ ui.t('account.deleteText') }}</p>
      <label class="field">
        <span>{{ ui.t('account.password') }}</span>
        <input id="delete-password" v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <div class="toolbar">
        <button class="danger-button" type="submit" :disabled="deleting || !password">{{ deleting ? ui.t('dashboard.loading') : ui.t('account.deleteConfirm') }}</button>
        <button class="ghost-button" type="button" @click="confirmingDelete = false; password = ''">{{ ui.t('form.cancel') }}</button>
      </div>
    </form>

    <div v-if="error" class="error">{{ error }}</div>
  </article>
</template>
