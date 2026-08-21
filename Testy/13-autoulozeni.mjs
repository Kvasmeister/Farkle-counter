import { JSDOM } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };
const pauza = () => new Promise(r => setTimeout(r, 0));

/* zap: automatické ukládání zapnuté už při startu (jako po restartu aplikace) */
function app(opt){
  opt = opt || {};
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/",
    beforeParse(w){
      try {
        w.localStorage.setItem("farkle-navod-v1", "bez-verze");
        w.localStorage.setItem("farkle-jazyk-v1", "cs");
        if(opt.zap) w.localStorage.setItem("farkle-autoulozeni-v1", "1");
      } catch(e){}
      if(opt.seed) opt.seed(w);
    } });
  const w = dom.window, d = w.document;
  const $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return { w, d, $, klik,
    kolo(){ klik(d.querySelector('[data-single="1"]')); klik($("bank")); },
    velke(){ klik(d.querySelector('[data-str="16"]')); klik($("bank")); },   /* 1 500 */
    farkle(){ klik($("bust")); },
    cil(n){
      $("goalsel").value = "custom"; $("goalsel").dispatchEvent(new w.Event("change"));
      $("goalnum").value = String(n); $("goalnum").dispatchEvent(new w.Event("input"));
    },
    naKola(n){
      $("modesel").value = "rounds"; $("modesel").dispatchEvent(new w.Event("change"));
      if(n){
        $("roundsel").value = "custom"; $("roundsel").dispatchEvent(new w.Event("change"));
        $("roundnum").value = String(n); $("roundnum").dispatchEvent(new w.Event("input"));
      }
    },
    stav(){ return JSON.parse(w.localStorage.getItem("farkle-solo-v3") || "{}"); },
    hist(){ return JSON.parse(w.localStorage.getItem("farkle-hist-v1") || "[]"); } };
}

console.log("A) výchozí stav je vypnuto a nic se neukládá");
{
  const a = app();
  ok(a.$("auto").textContent === "Vypnuto", "přepínač hlásí vypnuto, je " + a.$("auto").textContent);
  ok(a.w.localStorage.getItem("farkle-autoulozeni-v1") === null, "v localStorage zatím nic");
  a.cil(200);
  a.velke();
  ok(!a.$("lock").hidden, "hra skončila");
  ok(a.hist().length === 0, "a do historie se sama nezapsala");
  ok(a.$("toast").hidden, "žádný pop-up");
  ok(a.$("arch").textContent === "Zapsat do historie", "ruční zápis pořád čeká: " + a.$("arch").textContent);
}

console.log("B) přepínač se pamatuje");
{
  const b = app();
  b.klik(b.$("auto"));
  ok(b.$("auto").textContent === "Zapnuto" && b.$("auto").classList.contains("on"), "přepínač hlásí zapnuto, je " + b.$("auto").textContent);
  ok(b.w.localStorage.getItem("farkle-autoulozeni-v1") === "1", "uloženo: " + b.w.localStorage.getItem("farkle-autoulozeni-v1"));
  b.klik(b.$("auto"));
  ok(b.w.localStorage.getItem("farkle-autoulozeni-v1") === "0", "vypnuto: " + b.w.localStorage.getItem("farkle-autoulozeni-v1"));

  const b2 = app({ zap: true });
  ok(b2.$("auto").textContent === "Zapnuto", "po restartu naskočí zapnutý");
}

console.log("C) hra do bodů: uloží se po zapsání kola, ve kterém cíl padl");
{
  const c = app({ zap: true });
  c.cil(1000);
  c.kolo();
  ok(c.hist().length === 0, "po prvním kole se nic neukládá");

  /* postupka 1–6 je 1 500, tedy víc než zbývá — cíl se překročí */
  c.klik(c.d.querySelector('[data-str="16"]'));
  ok(c.hist().length === 0, "body na stole zápis nespouštějí");
  c.klik(c.$("bank"));
  const h = c.hist();
  ok(h.length === 1, "po zapsání kola je hra v historii, záznamů " + h.length);
  ok(h[0].banked === 1600, "uložilo se celé kolo i nad cíl, body " + h[0].banked);
  ok(h[0].turns.length === 2, "obě kola, je " + h[0].turns.length);
  ok(c.$("arch").textContent === "Uloženo v historii", "tlačítko ví o zápisu: " + c.$("arch").textContent);
  ok(c.stav().autoUlozeno === true, "příznak je v uloženém stavu");
}

console.log("D) pop-up se ukáže a sám zmizí");
{
  const dd = app({ zap: true });
  dd.cil(200);
  dd.velke();
  ok(!dd.$("toast").hidden, "pop-up svítí");
  ok(dd.$("toasttext").textContent === "Hra uložena do historie", "text: " + dd.$("toasttext").textContent);
  dd.w.document.getElementById("toastx").dispatchEvent(new dd.w.MouseEvent("click", { bubbles: true }));
  ok(dd.$("toast").hidden, "křížek ho zavřel");
}

console.log("E) hra na kola s limitem: uloží se i když poslední kolo je farkle");
{
  const e = app({ zap: true });
  e.naKola(2);
  e.kolo();
  ok(e.hist().length === 0, "po prvním kole nic");
  e.farkle();
  const h = e.hist();
  ok(h.length === 1, "po posledním kole je hra v historii, záznamů " + h.length);
  ok(h[0].turns.length === 2 && h[0].turns[1].bust === true, "poslední kolo je farkle");
  ok(!e.$("toast").hidden && e.$("toasttext").textContent === "Hra uložena do historie", "pop-up: " + e.$("toasttext").textContent);
}

console.log("F) neomezeně kol se neukládá nikdy");
{
  const f = app({ zap: true });
  f.naKola(null);
  for(let i = 0; i < 6; i++) f.kolo();
  ok(f.$("lock").hidden, "hra se nezamyká");
  ok(f.hist().length === 0, "a nic se nezapsalo");
  ok(f.$("toast").hidden, "žádný pop-up");
}

console.log("G) odemčení a zamčení beze změny nezakládá druhý záznam");
{
  const g = app({ zap: true });
  g.cil(200);
  g.velke();
  ok(g.hist().length === 1, "první zápis");
  const puvodni = g.$("toasttext").textContent;

  /* zvýšení cíle hru odemkne, snížení zase zamkne — ale mezitím se nehrálo,
     takže není co zapisovat */
  g.$("goalnum").value = "5000"; g.$("goalnum").dispatchEvent(new g.w.Event("input"));
  ok(g.$("lock").hidden && g.stav().autoUlozeno === false, "odemčením se příznak pustil");
  g.$("goalnum").value = "200"; g.$("goalnum").dispatchEvent(new g.w.Event("input"));
  ok(g.hist().length === 1, "pořád jeden záznam, je " + g.hist().length);
  ok(g.$("toasttext").textContent === puvodni, "žádný nový pop-up");
  ok(g.stav().autoUlozeno === true, "příznak je zase nahoře");
  ok(g.$("arch").textContent === "Uloženo v historii", "tlačítko: " + g.$("arch").textContent);
}

console.log("H) smazané kolo hru odemkne a po dohrání se záznam přepíše");
{
  const h = app({ zap: true });
  h.cil(200);
  h.kolo(); h.kolo();          /* 200 = cíl, hra skončila */
  ok(h.hist().length === 1 && h.hist()[0].banked === 200, "uloženo se dvěma koly");

  h.klik(h.$("tab1"));
  h.klik(h.$("fixturns"));
  h.klik(h.$("rows").querySelector(".delbtn"));               /* křížek u prvního kola */
  h.klik(h.$("rows").querySelector(".confirm .danger"));     /* potvrzení */
  ok(h.$("score").textContent === "100", "kolo je pryč, skóre " + h.$("score").textContent);
  ok(h.$("lock").hidden, "hra se odemkla");
  ok(h.stav().autoUlozeno === false, "příznak se pustil");

  h.klik(h.$("tab0"));
  h.kolo();
  const hh = h.hist();
  ok(hh.length === 1, "žádný druhý záznam, je " + hh.length);
  ok(hh[0].banked === 200 && hh[0].turns.length === 2, "záznam se přepsal, kol " + hh[0].turns.length);
  ok(h.$("toasttext").textContent === "Záznam v historii aktualizován", "pop-up hlásí aktualizaci: " + h.$("toasttext").textContent);
}

console.log("I) po reloadu se dohraná hra neukládá znovu");
{
  const i = app({ zap: true });
  i.cil(200);
  i.velke();
  ok(i.hist().length === 1, "uloženo");
  const stav = i.w.localStorage.getItem("farkle-solo-v3");
  const hist = i.w.localStorage.getItem("farkle-hist-v1");

  const j = app({ zap: true, seed(w){
    w.localStorage.setItem("farkle-solo-v3", stav);
    w.localStorage.setItem("farkle-hist-v1", hist);
  } });
  ok(j.hist().length === 1, "po reloadu pořád jeden záznam, je " + j.hist().length);
  ok(j.$("toast").hidden, "a žádný pop-up");
  ok(!j.$("lock").hidden, "hra je pořád zamčená");
}

console.log("J) obnovená dohraná hra se sama nezapíše");
{
  /* automat zatím vypnutý: hra doskončí neuložená a spadne do koše */
  const k = app();
  k.cil(200);
  k.velke();
  ok(k.hist().length === 0, "neuložená dohraná hra");
  k.klik(k.$("reset")); k.klik(k.$("reset"));
  k.klik(k.$("newdrop"));
  ok(k.$("score").textContent === "0", "nová hra");

  k.klik(k.$("auto"));                       /* teď se automat zapne */
  k.klik(k.$("setbtn"));
  const radky = k.$("koslist").querySelectorAll(".setrow");
  ok(radky.length === 1, "v koši je jeden řádek, je " + radky.length);
  k.klik(radky[0].querySelector("button"));
  ok(k.$("score").textContent === "1 500".replace(" ", "\u202F"), "hra se obnovila, skóre " + k.$("score").textContent);
  ok(!k.$("lock").hidden, "a je zase dohraná");
  ok(k.hist().length === 0, "obnova sama nezapisuje");
  ok(k.$("toast").hidden, "žádný pop-up");
  ok(k.$("arch").textContent === "Zapsat do historie", "zapsat se dá ručně: " + k.$("arch").textContent);
}

console.log("J2) uložená hra nejde zbytečně do koše");
{
  const l = app({ zap: true });
  l.cil(200);
  l.velke();
  ok(l.hist().length === 1, "uloženo");
  l.klik(l.$("reset")); l.klik(l.$("reset"));   /* uložená hra jde bez okna */
  ok(l.$("score").textContent === "0", "nová hra");
  l.klik(l.$("setbtn"));
  ok(l.$("koslist").querySelectorAll(".setrow").length === 0, "koš je prázdný");
}

console.log("K) selhání zápisu: žádný pop-up, ale hláška na tlačítku");
{
  const l = app({ zap: true });
  l.cil(200);
  const proto = l.w.Storage.prototype, puv = proto.setItem;
  proto.setItem = function(kl, v){ if(kl === "farkle-hist-v1") throw new Error("QuotaExceeded"); return puv.call(this, kl, v); };
  l.velke();
  proto.setItem = puv;
  ok(l.hist().length === 0, "v historii nic");
  ok(l.$("toast").hidden, "pop-up o uložení nesvítí");
  ok(/Nepodařilo se uložit/.test(l.$("arch").textContent), "tlačítko to řeklo: " + l.$("arch").textContent);
  ok(l.stav().autoUlozeno === false, "příznak zůstal dole, aby se zápis mohl zopakovat");
}

console.log("L) ruční zápis zůstává beze změny, i když automat běží");
{
  const m = app({ zap: true });
  m.kolo(); m.kolo();
  ok(m.$("arch").textContent === "Zapsat do historie", "rozehraná hra: " + m.$("arch").textContent);
  m.klik(m.$("arch"));
  ok(m.hist().length === 1, "ruční zápis prošel");
  ok(m.$("toast").hidden, "ruční zápis pop-up neukazuje");
}

console.log("M) automat nevrací záznam, který byl smazaný ručně");
{
  const n = app({ zap: true });
  n.cil(200);
  n.kolo(); n.kolo();                 /* 200 = cíl, automat uložil */
  ok(n.hist().length === 1, "uloženo automatem");

  /* smazání z historie: záznam jde do koše a hra o něm dál ví */
  n.klik(n.$("tab2"));
  n.klik(n.$("seg").children[1]);
  n.klik(n.d.querySelector("#histlist .grow"));
  n.klik(n.$("delgame")); n.klik(n.$("delgame"));
  ok(n.hist().length === 0, "v historii nic");
  ok(n.$("arch").textContent === "Obnovit do historie", "tlačítko nabízí návrat: " + n.$("arch").textContent);

  /* smazané kolo hru odemkne, dohrání ji zase zamkne — automat musí mlčet */
  n.klik(n.$("tab1"));
  n.klik(n.$("fixturns"));
  n.klik(n.$("rows").querySelector(".delbtn"));
  n.klik(n.$("rows").querySelector(".confirm .danger"));
  n.klik(n.$("tab0"));
  n.kolo();
  ok(n.hist().length === 0, "automat záznam nevrátil, her: " + n.hist().length);
  ok(n.$("arch").textContent === "Obnovit do historie", "vrátit se dá pořád ručně: " + n.$("arch").textContent);
  n.klik(n.$("arch"));
  ok(n.hist().length === 1, "ruční návrat prošel");
}

await pauza();
console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
