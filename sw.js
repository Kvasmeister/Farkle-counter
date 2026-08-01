const VERZE = "kostky-v3";

const SOUBORY = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-64.png"
];

/* Zamerne NEpouzivame cache.addAll(): je atomicka a jediny chybejici
   soubor by shodil celou instalaci. Takhle se ulozi, co je k dispozici. */
async function naplnCache() {
  const cache = await caches.open(VERZE);
  await Promise.all(
    SOUBORY.map((cesta) =>
      cache.add(new Request(cesta, { cache: "reload" })).catch((e) => {
        console.warn("[sw] nepodarilo se ulozit:", cesta, e);
      })
    )
  );
}

self.addEventListener("install", (e) => {
  e.waitUntil(naplnCache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((jmena) => Promise.all(
        jmena.filter((n) => n !== VERZE).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((odp) => {
          const kopie = odp.clone();
          caches.open(VERZE).then((c) => c.put("./index.html", kopie));
          return odp;
        })
        .catch(() =>
          caches.match("./index.html", { ignoreSearch: true })
            .then((ulozene) => ulozene || caches.match("./"))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((ulozene) => {
      if (ulozene) return ulozene;
      return fetch(req).then((odp) => {
        if (odp && odp.status === 200 && odp.type === "basic") {
          const kopie = odp.clone();
          caches.open(VERZE).then((c) => c.put(req, kopie));
        }
        return odp;
      });
    })
  );
});
