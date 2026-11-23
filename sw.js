const CACHE_NAME = 'idea-lab-mobile-v3';
const APP_SHELL = [
  "./app.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./about.html",
  "./access.html",
  "./account.html",
  "./activity.html",
  "./analytics.html",
  "./applications.html",
  "./auth.html",
  "./backup.html",
  "./collection.html",
  "./dashboard.html",
  "./events.html",
  "./exchange.html",
  "./finance.html",
  "./index.html",
  "./investor-portfolio.html",
  "./investors.html",
  "./management.html",
  "./marketplace.html",
  "./notifications.html",
  "./offers.html",
  "./organizations.html",
  "./portfolio.html",
  "./profile.html",
  "./project-detail.html",
  "./project-expenses.html",
  "./project-workspace.html",
  "./project.html",
  "./projects.html",
  "./resource-orders.html",
  "./resources.html",
  "./roadmap.html",
  "./search.html",
  "./specialists.html",
  "./supplier-reviewer.html",
  "./supplier-verification-admin.html",
  "./supplier-verification.html",
  "./suppliers.html",
  "./teams.html",
  "./workspace.html",
  "./assets/idea-auth.js",
  "./assets/idea-config.js",
  "./assets/idea-core.js",
  "./assets/idea-data.js",
  "./assets/idea-shell.js",
  "./assets/idea-shell.css",
  "./assets/workspace.css"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return caches.match('./app.html');
      return Response.error();
    })
  );
});
