// Service worker mínimo: permite instalar Detallia como app.
// Los datos siempre se consultan en línea (Supabase).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
