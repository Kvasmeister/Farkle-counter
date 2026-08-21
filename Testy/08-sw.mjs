/* Service worker se v jsdom spustit nedá — místo toho se sw.js vykoná
   ve vm s náhradami za caches, fetch a setTimeout. Hodiny jsou ruční,
   takže se strop dá přeskočit bez čekání. */
import vm from "node:vm";
import fs from "node:fs";

const zdroj = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

class Odpoved {
  constructor(telo, init = {}) {
    this.telo = telo;
    this.status = init.status === undefined ? 200 : init.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.type = init.type || "basic";
    this.redirected = !!init.redirected;
  }
  clone() { return new Odpoved(this.telo, this); }
}

function prostredi(fetchStub) {
  const ulozeno = new Map();      /* jméno cache → Map(klíč → odpověď) */
  const hodiny = [];              /* naplánované callbacky */
  const cache = (jm) => {
    if (!ulozeno.has(jm)) ulozeno.set(jm, new Map());
    return ulozeno.get(jm);
  };
  const klic = (co) => (typeof co === "string" ? co : co.url);

  const ctx = {
    console,
    URL,
    Request: class { constructor(u, o) { this.url = String(u); this.opts = o; } },
    setTimeout: (fn, ms) => { const z = { fn, ms, zrusen: false }; hodiny.push(z); return z; },
    clearTimeout: (z) => { if (z) z.zrusen = true; },
    fetch: (...a) => fetchStub(...a),
    caches: {
      /* open() cache zakládá i prázdnou — jinak by ji caches.keys() neviděl
         a úklid v activate by se testoval naprázdno */
      open: async (jm) => {
        cache(jm);
        return {
          put: async (k, v) => { cache(jm).set(klic(k), v); },
          add: async () => {}
        };
      },
      match: async (co, opts = {}) => {
        if (opts.cacheName !== undefined) {
          if (!ulozeno.has(opts.cacheName)) return undefined;
          return ulozeno.get(opts.cacheName).get(klic(co));
        }
        for (const m of ulozeno.values()) { const v = m.get(klic(co)); if (v) return v; }
        return undefined;
      },
      keys: async () => [...ulozeno.keys()],
      delete: async (jm) => ulozeno.delete(jm)
    }
  };
  const posluchaci = {};
  ctx.self = {
    addEventListener: (typ, fn) => { posluchaci[typ] = fn; },
    location: { origin: "https://x.test" },
    skipWaiting: () => {},
    clients: { claim: () => {} }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(zdroj, ctx);

  return {
    ctx, posluchaci, ulozeno, hodiny,
    /* spustí naplánované časovače, jako by uplynul čas */
    tik() { const k = hodiny.splice(0); k.forEach((z) => { if (!z.zrusen) z.fn(); }); },
    navigace() {
      let odpoved = null;
      posluchaci.fetch({
        request: { method: "GET", url: "https://x.test/", mode: "navigate" },
        respondWith: (p) => { odpoved = p; }
      });
      return odpoved;
    },
    soubor(url) {
      let odpoved = null;
      posluchaci.fetch({
        request: { method: "GET", url, mode: "no-cors" },
        respondWith: (p) => { odpoved = p; }
      });
      return odpoved;
    }
  };
}
const pauza = () => new Promise((r) => setImmediate(r));

console.log("A) strop je rozumně nastavený");
{
  const p = prostredi(async () => new Odpoved("nová"));
  const strop = vm.runInContext("SIT_STROP", p.ctx);
  ok(strop >= 2000 && strop <= 3000, "SIT_STROP je " + strop + " ms (čekáno 2000–3000)");
  ok(vm.runInContext("typeof zavodSite", p.ctx) === "function", "závod sítě existuje");
}

console.log("B) svižná síť vyhraje a uloží se do cache");
{
  const p = prostredi(async () => new Odpoved("čerstvé"));
  const odp = await p.navigace();
  ok(odp.telo === "čerstvé", "vrátila se síťová odpověď");
  await pauza();
  const c = p.ulozeno.get(vm.runInContext("VERZE", p.ctx));
  ok(c && c.get("./index.html").telo === "čerstvé", "čerstvý soubor je v cache verze");
}

console.log("C) mrtvá síť: po stropu se sáhne do cache (E-7)");
{
  let dokonci;
  const p = prostredi(() => new Promise((r) => { dokonci = r; }));
  const VERZE = vm.runInContext("VERZE", p.ctx);
  (await p.ctx.caches.open(VERZE)).put("./index.html", new Odpoved("uložené"));

  const slib = p.navigace();
  ok(p.hodiny.length === 1, "závod si naplánoval časovač");
  p.tik();                                   /* uplynulo 2,5 s */
  const odp = await slib;
  ok(odp.telo === "uložené", "aplikace naběhla z cache, nečeká se na síť");

  console.log("D) opožděná odpověď ještě obnoví cache pro příště");
  dokonci(new Odpoved("pozdní, ale čerstvé"));
  await pauza(); await pauza();
  const c = p.ulozeno.get(VERZE);
  ok(c.get("./index.html").telo === "pozdní, ale čerstvé", "pomalé připojení aktualizovalo cache");
}

console.log("E) offline: fetch selže, jede se z cache");
{
  const p = prostredi(async () => { throw new Error("offline"); });
  const VERZE = vm.runInContext("VERZE", p.ctx);
  (await p.ctx.caches.open(VERZE)).put("./index.html", new Odpoved("uložené"));
  const odp = await p.navigace();
  ok(odp.telo === "uložené", "offline start funguje");
}

console.log("F) přihlašovací portál ani 404 se do cache nedostanou");
{
  const p = prostredi(async () => new Odpoved("<html>přihlas se</html>", { redirected: true }));
  const VERZE = vm.runInContext("VERZE", p.ctx);
  (await p.ctx.caches.open(VERZE)).put("./index.html", new Odpoved("uložené"));
  await p.navigace();
  await pauza();
  ok(p.ulozeno.get(VERZE).get("./index.html").telo === "uložené", "přesměrovaná odpověď cache nepřepsala");

  const q = prostredi(async () => new Odpoved("nenalezeno", { status: 404 }));
  await q.navigace();
  await pauza();
  const cq = q.ulozeno.get(vm.runInContext("VERZE", q.ctx));
  ok(!cq || !cq.get("./index.html"), "404 se do cache neuložila");
}

console.log("G) cache-first větev hledá jen ve své verzi (E-8)");
{
  const p = prostredi(async () => new Odpoved("ze sítě"));
  const VERZE = vm.runInContext("VERZE", p.ctx);
  (await p.ctx.caches.open("kostky-stara")).put("https://x.test/icon-192.png", new Odpoved("starý soubor"));
  const odp = await p.soubor("https://x.test/icon-192.png");
  ok(odp.telo === "ze sítě", "soubor ze staré cache se nepoužil, vrátilo se: " + odp.telo);
  await pauza();
  ok(p.ulozeno.get(VERZE).get("https://x.test/icon-192.png").telo === "ze sítě", "a uložil se pod aktuální verzi");

  (await p.ctx.caches.open(VERZE)).put("https://x.test/icon-512.png", new Odpoved("moje"));
  const odp2 = await p.soubor("https://x.test/icon-512.png");
  ok(odp2.telo === "moje", "co je ve své cache, ze sítě se netahá");
}

console.log("H) chybějící cache nesmí shodit odpověď");
{
  const p = prostredi(async () => { throw new Error("offline"); });
  p.ctx.caches.match = async () => { throw new Error("NotFoundError"); };
  let spadlo = false;
  const odp = await p.navigace().catch(() => { spadlo = true; });
  ok(!spadlo, "prázdná cache vrátí undefined místo výjimky");
  ok(odp === undefined, "a odpověď je prostě prázdná");
}

console.log("I) activate uklidí jen po sobě (úloha A)");
{
  const p = prostredi(async () => new Odpoved("ze sítě"));
  const VERZE = vm.runInContext("VERZE", p.ctx);
  await p.ctx.caches.open(VERZE);
  await p.ctx.caches.open("kostky-v1");
  await p.ctx.caches.open("kostky-v2");
  await p.ctx.caches.open("jiná-pwa-v3");
  await p.ctx.caches.open("workbox-precache");

  let cekalo = null;
  p.posluchaci.activate({ waitUntil: (slib) => { cekalo = slib; } });
  ok(cekalo && typeof cekalo.then === "function", "activate si drží úklid přes waitUntil");
  await cekalo;

  const zbylo = [...p.ulozeno.keys()];
  ok(zbylo.includes(VERZE), "vlastní aktuální cache zůstala");
  ok(!zbylo.includes("kostky-v1") && !zbylo.includes("kostky-v2"),
     "staré vlastní cache se smazaly");
  ok(zbylo.includes("jiná-pwa-v3") && zbylo.includes("workbox-precache"),
     "cizí cache na sdíleném originu zůstaly nedotčené (" +
     zbylo.filter((n) => !n.startsWith("kostky-")).length + " ze 2)");
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
