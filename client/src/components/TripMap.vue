<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import L from 'leaflet';
import { airportCityLabel } from '../services/geo';

const props = defineProps({
  trips: {
    type: Array,
    default: () => []
  }
});

let map;
let layerGroup;
let tileLayer;
let themeObserver;

onMounted(() => {
  map = L.map('travel-map', { scrollWheelZoom: true }).setView([41.9, 12.5], 4);
  applyThemeTiles();
  layerGroup = L.layerGroup().addTo(map);
  renderTrips();

  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => {
      applyThemeTiles();
      renderTrips();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
});

onUnmounted(() => {
  themeObserver?.disconnect();
  // Ferma eventuali animazioni di zoom prima di distruggere la mappa (evita l'errore _leaflet_pos).
  map?.stop();
  map?.off();
  map?.remove();
  map = null;
});

watch(() => props.trips, renderTrips, { deep: true });

function hasCoords(place) {
  return Number.isFinite(Number(place?.lat)) && Number.isFinite(Number(place?.lng)) && (Number(place.lat) !== 0 || Number(place.lng) !== 0);
}

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function applyThemeTiles() {
  if (!map) return;

  if (tileLayer) return;

  // I basemap CARTO ora richiedono una API key: tile OpenStreetMap standard,
  // scuriti con un filtro CSS nel tema scuro (.map-tiles in styles.css).
  tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    className: 'map-tiles',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
}

function renderMarker(point, tripTitle, place) {
  const ink = cssVar('--ink', '#f1f4f9');
  const city = airportCityLabel(place);
  const airportName = place?.airportName || place?.airport || '';
  const code = place?.iata || place?.airport || '';
  const icon = L.divIcon({
    className: 'trip-map-marker',
    html: `<span>${code}</span>`,
    iconSize: [54, 30],
    iconAnchor: [27, 15],
    popupAnchor: [0, -16]
  });

  L.marker(point, { icon })
    .bindPopup(`<strong style="color:${ink}">${city}</strong><br/>${airportName}<br/><small>${tripTitle}</small>`)
    .addTo(layerGroup);
}

function curvedRoute(from, to, bend = 0.18) {
  const lat1 = from[0];
  const lng1 = from[1];
  const lat2 = to[0];
  const lng2 = to[1];
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const control = [midLat + dx * bend, midLng - dy * bend];

  return Array.from({ length: 28 }, (_, index) => {
    const t = index / 27;
    const oneMinusT = 1 - t;

    return [
      oneMinusT ** 2 * lat1 + 2 * oneMinusT * t * control[0] + t ** 2 * lat2,
      oneMinusT ** 2 * lng1 + 2 * oneMinusT * t * control[1] + t ** 2 * lng2
    ];
  });
}

function renderTrips() {
  if (!map || !layerGroup) return;

  layerGroup.clearLayers();
  const bounds = [];
  const routeColor = cssVar('--primary', '#38bdf8');
  const glowColor = cssVar('--warning', '#fbbf24');

  props.trips.forEach((trip, index) => {
    if (!hasCoords(trip.departure) || !hasCoords(trip.arrival)) return;

    const from = [Number(trip.departure.lat), Number(trip.departure.lng)];
    const to = [Number(trip.arrival.lat), Number(trip.arrival.lng)];
    const route = curvedRoute(from, to, index % 2 === 0 ? 0.14 : -0.14);
    bounds.push(from, to);

    L.polyline(route, { color: glowColor, weight: 10, opacity: 0.22, lineCap: 'round', lineJoin: 'round' }).addTo(layerGroup);
    L.polyline(route, { color: routeColor, weight: 4, opacity: 0.96, lineCap: 'round', lineJoin: 'round' }).addTo(layerGroup);
    L.polyline(route, { color: glowColor, weight: 1.5, opacity: 0.82, lineCap: 'round', lineJoin: 'round', dashArray: '2 12' }).addTo(layerGroup);
    renderMarker(from, trip.title, trip.departure);
    renderMarker(to, trip.title, trip.arrival);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [34, 34], animate: false });
  }
}
</script>

<template>
  <div id="travel-map" class="map"></div>
</template>
