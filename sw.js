const CACHE_NAME = 'saraswati-library-v3';
const ASSETS = [
    '/',
    '/css/variables.css',
    '/css/main.css',
    '/css/animations.css',
    '/css/components.css',
    '/css/pages.css',
    '/css/responsive.css'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    if (e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com')) {
        e.respondWith(
            caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
                const clone = resp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return resp;
            }))
        );
        return;
    }

    // Network-first: always try the server so updates and new headers propagate,
    // fall back to cache only when offline.
    e.respondWith(
        fetch(e.request).then(resp => {
            if (resp && resp.ok) {
                const clone = resp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            }
            return resp;
        }).catch(() =>
            caches.match(e.request).then(r => r || caches.match('/'))
        )
    );
});
