import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'leaflet/dist/leaflet.css';
import './assets/styles.css';
import App from './App.vue';
import router from './router';

createApp(App).use(createPinia()).use(router).mount('#app');

// Solo in produzione: in sviluppo il service worker interferirebbe con l'hot reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
