/* Service worker: guarda la aplicación para usarla sin conexión tras la primera carga. */
const CACHE = 'jornada-anual-v3';
const ARCHIVOS = [
  './',
  './index.html',
  './css/estilos.css',
  './js/festivos-datos.js',
  './js/regiones.js',
  './js/motor.js',
  './js/equipo.js',
  './js/app.js',
  './js/equipo-ui.js',
  './manifest.webmanifest',
  './iconos/icono.svg',
  './iconos/icono-180.png',
  './iconos/icono-192.png',
  './iconos/icono-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Archivos propios: red primero (para recibir actualizaciones) y caché si no hay conexión.
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // Tipografías: caché primero; si no hay conexión se usan las del sistema.
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
        return res;
      }))
    );
  }
});
