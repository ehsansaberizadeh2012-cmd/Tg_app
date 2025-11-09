// sw.js - فقط این فایل
const CACHE_NAME = 'shelby-v2.0';
const ASSETS = [
  '/',
  '/index.html',
  'https://telegram.org/js/telegram-web-app.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(cached => {
    if (cached) return cached;
    return fetch(e.request).then(response => {
      if (!response || response.status !== 200) return response;
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return response;
    }).catch(() => caches.match('/index.html'));
  }));
});
