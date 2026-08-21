import { JSDOM } from "jsdom";
import fs from "fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };
const pauza = () => new Promise(r => setTimeout(r, 0));

/* jsdom žádný wakeLock nemá a hodiny musí být ruční, jinak by se na tři
   minuty nečinnosti čekalo doopravdy. Stejný trik jako v sadě 08. */
function prohlizec(opt){
  opt = opt || {};
  const stav = { pocet: 0, ziv: 0, odmitni: !!opt.odmitni, posledni: null };
  const casovace = [];

  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/",
    beforeParse(w){
      try{
        w.localStorage.setItem("farkle-navod-v1", "bez-verze");
        w.localStorage.setItem("farkle-jazyk-v1", "cs");
        if(opt.ulozeno !== undefined) w.localStorage.setItem("farkle-svit-v1", opt.ulozeno);
      }catch(e){}

      if(!opt.bezAPI){
        w.navigator.wakeLock = {
          request(typ){
            if(stav.odmitni) return Promise.reject(new Error("odmítnuto"));
            stav.pocet++; stav.ziv++;
            const posluchaci = [];
            const z = {
              type: typ, released: false,
              addEventListener(ev, fn){ if(ev === "release") posluchaci.push(fn); },
              release(){
                if(!z.released){ z.released = true; stav.ziv--; posluchaci.forEach(f => f()); }
                return Promise.resolve();
              }
            };
            stav.posledni = z;
            return Promise.resolve(z);
          }
        };
      }

      w.setTimeout = function(fn, ms){ casovace.push({ fn: fn, ms: ms }); return casovace.length; };
      w.clearTimeout = function(id){ if(casovace[id - 1]) casovace[id - 1].fn = null; };
    } });

  const w = dom.window, d = w.document;
  return {
    w, d, stav,
    $: id => d.getElementById(id),
    klik: el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })),
    dotek: () => d.dispatchEvent(new w.Event("pointerdown", { bubbles: true })),
    klavesa: () => d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "a", bubbles: true })),
    /* spustí všechny čekající časovače s danou dobou */
    tik(ms){
      const spustit = casovace.filter(c => c.fn && c.ms === ms);
      spustit.forEach(c => { const f = c.fn; c.fn = null; f(); });
      return spustit.length;
    },
    ceka(ms){ return casovace.some(c => c.fn && c.ms === ms); },
    schovej(hidden){
      Object.defineProperty(d, "hidden", { value: hidden, configurable: true });
      d.dispatchEvent(new w.Event("visibilitychange", { bubbles: true }));
    }
  };
}

const MIN3 = 180000;

console.log("A) bez podpory prohlížeče řádek zmizí");
{
  const a = prohlizec({ bezAPI: true });
  ok(a.$("svitrow") === null, "řádek nastavení se odstranil");
  ok(a.$("svit") === null, "a s ním i jeho tlačítko");
  a.dotek();
  ok(a.$("score").textContent === "0", "aplikace přesto naběhla a běží dál");
}

console.log("B) výchozí stav je vypnuto");
{
  const a = prohlizec();
  ok(a.$("svitrow") !== null, "řádek nastavení je k dispozici");
  ok(a.$("svit").textContent === "Vypnuto", "tlačítko hlásí vypnuto, je " + a.$("svit").textContent);
  ok(a.stav.pocet === 0, "bez zapnutí se o zámek nikdo nehlásí");
  ok(!a.ceka(MIN3), "ani časovač nečinnosti neběží");
  a.dotek();
  ok(a.stav.pocet === 0, "dotek na vypnutém přepínači zámek nebere");
}

console.log("C) zapnutí vezme zámek a zapamatuje se");
const c = prohlizec();
{
  c.klik(c.$("svit"));
  await pauza();
  ok(c.stav.pocet === 1 && c.stav.ziv === 1, "zámek drží, žádostí " + c.stav.pocet);
  ok(c.$("svit").textContent === "Zapnuto" && c.$("svit").classList.contains("on"), "tlačítko hlásí zapnuto, je " + c.$("svit").textContent);
  ok(c.w.localStorage.getItem("farkle-svit-v1") === "1", "stav v localStorage: " + c.w.localStorage.getItem("farkle-svit-v1"));
  ok(c.ceka(MIN3), "běží tříminutový časovač nečinnosti");
}

console.log("D) po třech minutách bez doteku se zámek pustí");
{
  ok(c.tik(MIN3) === 1, "časovač doběhl");
  ok(c.stav.ziv === 0, "zámek je uvolněný");
  ok(c.stav.pocet === 1, "a o nový se nežádalo");
}

console.log("E) další dotek nezhasínání vrátí");
{
  c.dotek();
  await pauza();
  ok(c.stav.pocet === 2 && c.stav.ziv === 1, "zámek zpátky bez chození do nastavení, žádostí " + c.stav.pocet);
  ok(c.ceka(MIN3), "odpočet se rozjel znovu");
  c.klavesa();
  await pauza();
  ok(c.stav.pocet === 2, "další aktivita nedrží dva zámky najednou");
}

console.log("F) vypnutí zámek uvolní");
{
  c.klik(c.$("svit"));
  ok(c.stav.ziv === 0, "zámek uvolněný");
  ok(c.w.localStorage.getItem("farkle-svit-v1") === "0", "vypnuto i v localStorage");
  ok(!c.ceka(MIN3), "časovač nečinnosti zrušen");
  c.dotek();
  await pauza();
  ok(c.stav.pocet === 2, "po vypnutí už dotek zámek nebere");
}

console.log("G) při dalším spuštění se zapnutý přepínač obnoví sám");
const g = prohlizec({ ulozeno: "1" });
{
  await pauza();
  ok(g.$("svit").textContent === "Zapnuto", "přepínač naskočil zapnutý");
  ok(g.stav.pocet === 1 && g.stav.ziv === 1, "a zámek se vzal bez interakce, žádostí " + g.stav.pocet);
}

console.log("H) skrytá stránka: zámek pustí prohlížeč, návrat ho vezme zpět");
{
  g.stav.posledni.release();          /* tohle dělá prohlížeč sám při schování */
  g.schovej(true);
  ok(g.stav.ziv === 0, "zámek je pryč");
  ok(!g.ceka(MIN3), "časovač nečinnosti na schované stránce stojí");
  g.dotek();
  await pauza();
  ok(g.stav.pocet === 1, "na schované stránce se o zámek nežádá");
  g.schovej(false);
  await pauza();
  ok(g.stav.pocet === 2 && g.stav.ziv === 1, "po návratu zámek zase drží, žádostí " + g.stav.pocet);
  ok(g.ceka(MIN3), "a odpočet běží");
}

console.log("I) odmítnutý požadavek se zkusí po první interakci");
{
  const i = prohlizec({ ulozeno: "1", odmitni: true });
  await pauza();
  ok(i.$("svit").textContent === "Zapnuto", "přepínač je zapnutý");
  ok(i.stav.pocet === 0 && i.stav.ziv === 0, "zámek se vzít nepodařilo");
  i.stav.odmitni = false;
  i.dotek();
  await pauza();
  ok(i.stav.pocet === 1 && i.stav.ziv === 1, "po doteku už zámek drží, žádostí " + i.stav.pocet);
}

console.log("J) hraní se nezhasínáním nic nerozbije");
{
  const j = prohlizec({ ulozeno: "1" });
  await pauza();
  j.d.querySelector('[data-single="1"]').click();
  j.$("bank").click();
  ok(j.$("score").textContent === "100", "kolo se zapsalo, skóre " + j.$("score").textContent);
  ok(j.stav.ziv === 1, "a zámek pořád drží");
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
