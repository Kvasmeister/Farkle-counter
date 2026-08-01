/* Kostky — service worker
   Zvyš číslo verze při každé změně souborů; stará cache se pak sama smaže. */
const VERZE = "kostky-v1";

/* Cesty jsou relativní k umístění sw.js, takže to funguje i v podadresáři
   (GitHub Pages projektový web běží na uzivatel.github.io/repo/). */
const SOUBORY = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./fonts/imfell.woff2",
  "./fonts/imfellsc.woff2",
  "./fonts/alegreya-400.woff2",
  "./fonts/alegreya-500.woff2",
  "./fonts/alegreya-700.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-64.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERZE)
      .then((c) => c.addAll(SOUBORY))
      .then(() => self.skipWaiting())
  );
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

  /* Navigace: zkus síť (kvůli aktualizaci), při výpadku vrať uloženou stránku. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((odp) => {
          const kopie = odp.clone();
          caches.open(VERZE).then((c) => c.put("./index.html", kopie));
          return odp;
        })
        .catch(() => caches.match("./index.html", { ignoreSearch: true }))
    );
    return;
  }

  /* Ostatní: nejdřív cache, pak síť; stažené se uloží pro příště. */
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
