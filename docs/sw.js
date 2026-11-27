// Service worker: guarda la app en el teléfono para que abra y funcione sin internet.
// Al cambiar cualquier archivo de la app, sube el número de VERSION.
const VERSION = 'asistencia-v12';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/vistas.js', 'js/acciones.js', 'js/servicios.js', 'js/horas.js', 'js/fechas.js', 'js/store.js', 'js/ui.js', 'js/pdf.js', 'js/ejemplo.js', 'js/atomos.js', 'js/excel.js', 'js/visitas.js', 'js/visitas-vistas.js', 'js/visitas-informes.js',
  'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js', 'vendor/xlsx.min.js',
  'icons/icono-180.png', 'icons/icono-192.png', 'icons/icono-512.png', 'icons/icono-maskable-512.png',
];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero lo guardado; si no está, internet (y se guarda para la próxima).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).searchParams.has('red')) return;   // '?red': ir directo a internet (lo usa el botón "Actualizar la aplicación")
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match('index.html'))));
});
