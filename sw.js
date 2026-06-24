/**
 * Service Worker — 楞嚴咒修行 PWA
 * 快取策略：Cache-First for static assets, Network-First for dynamic
 */

const CACHE_NAME = 'shurangama-mobile-v3';
const ASSETS_TO_CACHE = [
    './mobile-app.html',
    './mobile-app.css',
    './mobile-app.js',
    './mantra-data.js',
    './avatars/mobile/1praying_monk.png',
    './avatars/mobile/meditating.png',
    './avatars/mobile/dharma_wheel.png',
    './avatars/mobile/mala_beads.png',
    './avatars/mobile/lotus_flower.png',
    './avatars/mobile/護法v2.png',
    './avatars/mobile/gaya佛陀(有背景).png',
    './icons/zen_home.png',
    './icons/zen_challenge.png'
];

// 安裝：預快取靜態資源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Pre-caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch(err => {
                console.warn('[SW] Cache failed for some assets:', err);
                return self.skipWaiting();
            })
    );
});

// 啟動：清理舊快取
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// 攔截請求：Cache-First 策略
self.addEventListener('fetch', event => {
    // 跳過非 GET 請求
    if (event.request.method !== 'GET') return;

    // 跳過外部請求（如 Google Fonts）
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) {
                    // 有快取就用快取，但背景更新
                    const fetchPromise = fetch(event.request)
                        .then(response => {
                            if (response && response.status === 200) {
                                const clone = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => cache.put(event.request, clone));
                            }
                            return response;
                        })
                        .catch(() => cached);

                    return cached;
                }

                // 沒快取就網路請求
                return fetch(event.request)
                    .then(response => {
                        if (response && response.status === 200) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, clone));
                        }
                        return response;
                    });
            })
    );
});
