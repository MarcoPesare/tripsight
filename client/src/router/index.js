import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AuthView from '../views/AuthView.vue';
import JourneysView from '../views/JourneysView.vue';
import DashboardView from '../views/DashboardView.vue';

const router = createRouter({
  history: createWebHistory(),
  // Dai tooltip ⓘ si arriva a /guide#voce: scorre fino alla voce, sotto l'eventuale header.
  scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 24, behavior: 'smooth' } : { top: 0 }),
  routes: [
    { path: '/login', name: 'login', component: AuthView, meta: { title: 'seo.login', description: 'seo.loginDescription' } },
    { path: '/', name: 'journeys', component: JourneysView, meta: { requiresAuth: true, title: 'nav.journeys' } },
    { path: '/journeys/:id', name: 'journey-detail', component: () => import('../views/JourneyDetailView.vue'), meta: { requiresAuth: true, title: 'seo.journey' } },
    { path: '/flights', name: 'flights', component: DashboardView, meta: { requiresAuth: true, title: 'nav.flights' } },
    { path: '/flights/:id', name: 'trip-detail', component: () => import('../views/TripDetailView.vue'), meta: { requiresAuth: true, title: 'seo.flight' } },
    { path: '/trips/:id', redirect: (to) => ({ name: 'trip-detail', params: to.params }) },
    { path: '/stats', name: 'stats', component: () => import('../views/StatsView.vue'), meta: { requiresAuth: true, title: 'nav.stats' } },
    { path: '/discover', name: 'discover', component: () => import('../views/DiscoverView.vue'), meta: { requiresAuth: true, title: 'nav.discover' } },
    { path: '/import', name: 'import', component: () => import('../views/ImportView.vue'), meta: { requiresAuth: true, title: 'import.title' } },
    { path: '/guide', name: 'guide', component: () => import('../views/GuideView.vue'), meta: { requiresAuth: true, title: 'nav.guide' } },
    { path: '/privacy', name: 'privacy', component: () => import('../views/PrivacyView.vue'), meta: { title: 'auth.privacyLink', description: 'seo.privacyDescription' } },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { requiresAuth: true, title: 'settings.title' } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.name === 'login' && auth.isAuthenticated && !to.query.reset) {
    return { name: 'journeys' };
  }

  return true;
});

export default router;
