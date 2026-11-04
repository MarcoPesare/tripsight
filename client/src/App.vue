<script setup>
import { computed, onMounted, watch, watchEffect } from 'vue';
import { BarChart3, BookOpen, Compass, Luggage, LogOut, Plane, Settings, Upload } from '@lucide/vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useUiStore } from './stores/ui';
import { useInboxStore } from './stores/inbox';

const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();
const inbox = useInboxStore();

// Contatore delle prenotazioni da confermare accanto a "Importa".
watch(() => auth.isAuthenticated, (logged) => {
  if (logged) inbox.fetch().catch(() => {});
}, { immediate: true });

const route = useRoute();
const isDark = computed(() => ui.theme === 'dark');
const navItems = [
  { name: 'journeys', label: 'nav.journeys', icon: Luggage, children: ['journey-detail'] },
  { name: 'flights', label: 'nav.flights', icon: Plane, children: ['trip-detail'] },
  { name: 'stats', label: 'nav.stats', icon: BarChart3 },
  { name: 'discover', label: 'nav.discover', icon: Compass }
];

// Le pagine di dettaglio tengono acceso il tab della sezione.
function isActive(item) {
  return route.name === item.name || item.children?.includes(route.name);
}

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}

// Titolo della scheda e descrizione per ogni sezione, aggiornati anche al cambio di lingua.
watchEffect(() => {
  const section = route.meta.title ? ui.t(route.meta.title) : '';
  document.title = section ? `${section} · Tripsight` : `Tripsight · ${ui.t('seo.tagline')}`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = ui.t(route.meta.description || 'seo.defaultDescription');
});

function syncDocumentTheme() {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = ui.theme;
  document.documentElement.lang = ui.locale;
}

onMounted(syncDocumentTheme);

watchEffect(syncDocumentTheme);
</script>

<template>
  <div class="app-shell" :data-theme="ui.theme">
    <aside v-if="auth.isAuthenticated" class="sidebar">
      <RouterLink class="brand" :to="{ name: 'journeys' }">
        <img class="brand-logo" src="/logo.svg?v=3" alt="" width="30" height="30" />
        <span>{{ ui.t('app.title') }}</span>
      </RouterLink>

      <nav class="nav" :aria-label="ui.t('nav.main')">
        <RouterLink v-for="item in navItems" :key="item.name" :to="{ name: item.name }" :class="{ 'router-link-active': isActive(item) }">
          <component :is="item.icon" :size="18" />
          {{ ui.t(item.label) }}
        </RouterLink>
        <RouterLink :to="{ name: 'import' }">
          <Upload :size="18" />
          {{ ui.t('import.title') }}
          <span v-if="inbox.count" class="nav-badge" :aria-label="ui.t('inbox.pending')">{{ inbox.count }}</span>
        </RouterLink>
        <RouterLink :to="{ name: 'guide' }">
          <BookOpen :size="18" />
          {{ ui.t('nav.guide') }}
        </RouterLink>
      </nav>

      <div class="sidebar-panel">
        <p class="sidebar-panel-title">{{ ui.t('common.theme') }}</p>
        <div class="switch-row">
          <button class="toggle-chip" :class="{ 'is-active': isDark }" type="button" @click="ui.setTheme('dark')">{{ ui.t('theme.dark') }}</button>
          <button class="toggle-chip" :class="{ 'is-active': !isDark }" type="button" @click="ui.setTheme('light')">{{ ui.t('theme.light') }}</button>
        </div>
      </div>

      <div class="sidebar-panel">
        <p class="sidebar-panel-title">{{ ui.t('common.language') }}</p>
        <div class="switch-row">
          <button class="toggle-chip" :class="{ 'is-active': ui.locale === 'it' }" type="button" @click="ui.setLocale('it')">{{ ui.t('language.it') }}</button>
          <button class="toggle-chip" :class="{ 'is-active': ui.locale === 'en' }" type="button" @click="ui.setLocale('en')">{{ ui.t('language.en') }}</button>
        </div>
      </div>

      <button class="ghost-button sidebar-logout" type="button" @click="logout">
        <LogOut :size="18" />
        {{ ui.t('nav.logout') }}
      </button>
    </aside>

    <main class="main-panel">
      <RouterView />
    </main>

    <nav v-if="auth.isAuthenticated" class="mobile-tabbar" :aria-label="ui.t('nav.quick')">
      <RouterLink v-for="item in [...navItems, { name: 'settings', label: 'nav.profile', icon: Settings }]" :key="item.name" :to="{ name: item.name }" :class="{ 'router-link-active': isActive(item) }">
        <component :is="item.icon" :size="20" />
        <span>{{ ui.t(item.label) }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
