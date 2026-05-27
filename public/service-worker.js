const CACHE_NAME = "famicontrol-cache-v1";

const urlsToCache = [
    "/",
    "/index.html",
    "/styles.css",
    "/script.js",
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

// Instalar SW
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

// Interceptar requests
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
