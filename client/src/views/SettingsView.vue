<script setup>
import { BookOpen, LogOut, Upload } from '@lucide/vue';
import { useRouter } from 'vue-router';
import AccountDataPanel from '../components/AccountDataPanel.vue';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';

const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1>{{ ui.t('settings.title') }}</h1>
        <p v-if="auth.user">{{ auth.user.name }} · {{ auth.user.email }}</p>
      </div>
    </header>

    <div class="settings-list">
      <article class="card settings-row">
        <span>{{ ui.t('common.theme') }}</span>
        <div class="switch-row">
          <button class="toggle-chip" :class="{ 'is-active': ui.theme === 'dark' }" type="button" @click="ui.setTheme('dark')">{{ ui.t('theme.dark') }}</button>
          <button class="toggle-chip" :class="{ 'is-active': ui.theme === 'light' }" type="button" @click="ui.setTheme('light')">{{ ui.t('theme.light') }}</button>
        </div>
      </article>

      <article class="card settings-row">
        <span>{{ ui.t('common.language') }}</span>
        <div class="switch-row">
          <button class="toggle-chip" :class="{ 'is-active': ui.locale === 'it' }" type="button" @click="ui.setLocale('it')">Italiano</button>
          <button class="toggle-chip" :class="{ 'is-active': ui.locale === 'en' }" type="button" @click="ui.setLocale('en')">English</button>
        </div>
      </article>

      <RouterLink class="card settings-row" :to="{ name: 'guide' }">
        <span>{{ ui.t('nav.guide') }}</span>
        <BookOpen :size="18" />
      </RouterLink>

      <RouterLink class="card settings-row" :to="{ name: 'import' }">
        <span>{{ ui.t('import.title') }}</span>
        <Upload :size="18" />
      </RouterLink>

      <AccountDataPanel />

      <button class="card settings-row danger-row" type="button" @click="logout">
        <span>{{ ui.t('nav.logout') }}</span>
        <LogOut :size="18" />
      </button>
    </div>
  </section>
</template>
