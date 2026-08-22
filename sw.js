const VERZE = "kostky-v47";

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

/* Na github.io sdilime origin se vsemi ostatnimi repozitari stejneho uctu,
   takze caches.keys() vraci i cache cizich aplikaci. Bez filtru na vlastni
   predponu by kazda aktualizace teto aplikace shodila offline rezim vsem
   ostatnim PWA na stejne adrese. Na vlastni domene uz to nehrozi, spravne
   je to ale tak jako tak. */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((jmena) => Promise.all(
        jmena
          .filter((n) => n.startsWith("kostky-") && n !== VERZE)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

/* Aplikace si rekne o cislo verze, aby ho nemusela drzet podruhe
   ve svem kodu — podle nej pozna, ze se ma ukazat navod. */
self.addEventListener("message", (e) => {
  if (!e.data || e.data.dotaz !== "verze") return;
  const odpoved = { verze: VERZE };
  if (e.ports && e.ports[0]) {
    e.ports[0].postMessage(odpoved);
  } else if (e.source) {
    e.source.postMessage(odpoved);
  }
});

/* Navigace je network-first, ale bez stropu by aplikace na mrtve nebo
   prihlasovaci Wi-Fi cekala desitky sekund, misto aby sahla do cache.
   fetch() se vyresi uz pri hlavickach odpovedi, ne po stazeni celeho tela —
   strop tedy hlida navazani spojeni a reakci serveru, ne pomalou linku.
   2,5 s pokryva i velmi spatne, ale funkcni pripojeni.

   Pri vyprseni se fetch NERUSI: dobehne na pozadi a ulozi cerstvy soubor
   do cache, takze i pomale pripojeni vede k aktualni verzi pri pristim
   spusteni (aplikace si toho vsimne pres dotaz na verzi). */
const SIT_STROP = 2500;

/* Jmenovana cache jeste nemusi existovat (prvni spusteni, neuspesna
   instalace). Starsi implementace v takovem pripade odmitaji, proto catch. */
function zCache(co) {
  return caches.match(co, { cacheName: VERZE, ignoreSearch: true })
    .catch(() => undefined);
}

function zavodSite(req) {
  return new Promise((splnit, odmitnout) => {
    let rozhodnuto = false;
    const casovac = setTimeout(() => {
      if (!rozhodnuto) { rozhodnuto = true; odmitnout(new Error("strop")); }
    }, SIT_STROP);

    fetch(req).then((odp) => {
      /* Bez teto kontroly by se do cache ulozila i 404 nebo prihlasovaci
         stranka hotelove Wi-Fi — aplikace by pak byla rozbita i offline. */
      if (odp && odp.ok && !odp.redirected && odp.type === "basic") {
        const kopie = odp.clone();
        caches.open(VERZE).then((c) => c.put("./index.html", kopie));
      }
      if (!rozhodnuto) { rozhodnuto = true; clearTimeout(casovac); splnit(odp); }
    }).catch((chyba) => {
      if (!rozhodnuto) { rozhodnuto = true; clearTimeout(casovac); odmitnout(chyba); }
    });
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      zavodSite(req).catch(() =>
        zCache("./index.html").then((ulozene) => ulozene || zCache("./"))
      )
    );
    return;
  }

  e.respondWith(
    /* jmenovana cache: mezi install (se skipWaiting) a activate, kde se stare
       mazou, by caches.match bez ni mohl vratit soubor z predchozi verze */
    zCache(req).then((ulozene) => {
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
