import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };
const spi = ms => new Promise(r => setTimeout(r, ms));

function hra(o){
  const turns = o.turns.map(p => p === "F" ? {p:0,bust:true,d:""} : {p, bust:false, d:"jednička"});
  return { id:o.id, savedAt:o.savedAt, mode:o.mode||"points", goal:o.goal||4000, roundGoal:o.roundGoal||null,
           banked:turns.reduce((a,t)=>a+(t.bust?0:t.p),0), turns };
}
const A = hra({id:"g1", savedAt:Date.UTC(2026,6,1,10,0), goal:2000, turns:[800,"F",700,600]});
const B = hra({id:"g2", savedAt:Date.UTC(2026,6,2,11,30), mode:"rounds", roundGoal:5, turns:[300,300,"F","F",1200]});
const C = hra({id:"g3", savedAt:Date.UTC(2026,6,3,12,0), turns:[150,250,400]});

function app(hry){
  const vc = new VirtualConsole();          // jsdom křičí na navigaci u blob odkazu
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true, url:"https://x.test/",
    virtualConsole: vc,
    beforeParse(w){
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      if(hry) w.localStorage.setItem("farkle-hist-v1", JSON.stringify(hry));
      w.__blob = null;
      w.URL.createObjectURL = b => { w.__blob = b; return "blob:test"; };
      w.URL.revokeObjectURL = () => {};
    }});
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  return { w, d, $, klik: el => el.dispatchEvent(new w.MouseEvent("click", {bubbles:true})),
    hist: () => JSON.parse(w.localStorage.getItem("farkle-hist-v1") || "[]"),
    async soubor(text){
      const f = new w.File([text], "zaloha.txt", { type: "text/plain" });
      Object.defineProperty($("impfile"), "files", { value: [f], configurable: true });
      /* FileReader je asynchronní a jak dlouho poběží, se neodhaduje: v jednom
      procesu běží víc jsdomů naráz a líný výčet rizika v tom vedlejším umí
      zablokovat smyčku na desítky ms. Pevných 60 ms tuhle sadu shazovalo
      zhruba v polovině běhů.

      Čeká se proto na výsledek. Obě místa, kam výsledek dorazí, se předtím
      schovají — jinak by druhý import v téže aplikaci našel panel odemčený
      po tom prvním, skončil hned a četl text, který ještě nikdo nepřepsal. */
      $("impbox").hidden = true;
      $("zalmsg").hidden = true;
      $("impfile").dispatchEvent(new w.Event("change"));
      for(let i = 0; i < 300 && $("impbox").hidden && $("zalmsg").hidden; i++){
      await new Promise(r => setTimeout(r, 10));
      }
    }};
}

console.log("A) export");
let a = app([A, B, C]);
a.klik(a.$("setbtn"));
ok(!a.$("expbtn").disabled, "export je povolený, když je co zálohovat");
a.klik(a.$("expbtn"));
ok(a.w.__blob !== null, "vznikl soubor ke stažení");
const text = await a.w.__blob.text();
ok(/^Kostky — záloha historie her/.test(text), "hlavička souboru");
ok(/her: 3/.test(text), "počet her v hlavičce");
ok(/1\) 1\. 7\. 2026/.test(text), "hry jsou očíslované a s datem");
ok(/farkle/.test(text) && /celkem 1 800/.test(text), "čitelný rozpis kol včetně farklů a mezisoučtu");
/* Farkle stojí v závorce jako poslední hod a ve sloupci bodů je nula —
   stejné pořadí jako v tabulce kol v aplikaci. */
ok(/2\. 0 {2}\(farkle\) {3}celkem 800/.test(text),
   "farkle prvním hodem: nula a slovo v závorce");
{
  const D = hra({id:"g4", savedAt:Date.UTC(2026,6,4,9,0), turns:[100]});
  D.turns.push({ p:250, bust:true, d:"jednička \u00B7 pětka" });
  const f = app([D]);
  f.klik(f.$("setbtn"));
  f.klik(f.$("expbtn"));
  const t2 = await f.w.__blob.text();
  ok(/2\. 0 {2}\(jednička · pětka · farkle\) {3}celkem 100/.test(t2),
     "farkle po dvou bodovaných hodech stojí na konci závorky");
  ok(!/2\. farkle/.test(t2), "ve sloupci bodů už slovo nestojí");
}
ok(text.split("\n").filter(l => l.startsWith("#DATA:")).length === 1, "právě jeden datový řádek");
ok(!/\u202F/.test(text), "v textu není úzká mezera, jen obyčejná");
ok(a.$("zalmsg").textContent.includes("ukládá"), "hláška: " + a.$("zalmsg").textContent);

console.log("B) prázdná historie nejde zálohovat");
let z = app(null);
z.klik(z.$("setbtn"));
ok(z.$("expbtn").disabled && z.$("copybtn").disabled, "obě tlačítka zamčená");

console.log("C) import do prázdné aplikace");
let b = app(null);
b.klik(b.$("setbtn"));
await b.soubor(text);
ok(!b.$("impbox").hidden, "nabídka se ukázala");
ok(/V souboru 3 hry, z toho 3 nové/.test(b.$("impinfo").textContent), "info: " + b.$("impinfo").textContent);
b.klik(b.$("impadd"));
ok(b.hist().length === 3, "přidány 3 hry, je " + b.hist().length);
ok(b.hist()[0].turns.length === 4 && b.hist()[1].mode === "rounds" && b.hist()[1].roundGoal === 5, "data sedí včetně režimu a limitu");
ok(b.$("zalmsg").textContent === "Přidány 3 hry.", "hláška: " + b.$("zalmsg").textContent);

console.log("D) druhý import nezdvojí");
await b.soubor(text);
ok(/V souboru 3 hry, z toho 0 nových/.test(b.$("impinfo").textContent), "žádná nová: " + b.$("impinfo").textContent);
ok(b.$("impadd").disabled, "Přidat je zamčené");
b.klik(b.$("impadd"));
ok(b.hist().length === 3, "pořád 3 hry, je " + b.hist().length);

console.log("E) částečný překryv");
let c = app([A]);
c.klik(c.$("setbtn"));
await c.soubor(text);
ok(/V souboru 3 hry, z toho 2 nové/.test(c.$("impinfo").textContent), "info: " + c.$("impinfo").textContent);
c.klik(c.$("impadd"));
ok(c.hist().length === 3, "z jedné hry jsou tři");
ok(c.hist().filter(g => g.id === "g1").length === 1, "původní hra se nezdvojila");

console.log("F) nahrazení na dvojí klepnutí");
let e = app([hra({id:"jina", savedAt:1, turns:[100]})]);
e.klik(e.$("setbtn"));
await e.soubor(text);
e.klik(e.$("imprep"));
ok(/Opravdu/.test(e.$("imprep").textContent), "první klik se ptá: " + e.$("imprep").textContent);
ok(e.hist().length === 1, "zatím nenahrazeno");
e.klik(e.$("imprep"));
ok(e.hist().length === 3 && !e.hist().some(g => g.id === "jina"), "nahrazeno celé, her: " + e.hist().length);

console.log("G) poškozený a cizí soubor");
let f = app(null);
f.klik(f.$("setbtn"));
await f.soubor("Kostky — záloha historie her\nnějaký text bez dat\n");
ok(f.$("impbox").hidden && /chybí v něm datový řádek/.test(f.$("zalmsg").textContent), "hláška: " + f.$("zalmsg").textContent);
await f.soubor("#DATA:{tohle není pole}");
ok(/nerozumím/.test(f.$("zalmsg").textContent), "rozbitý JSON: " + f.$("zalmsg").textContent);
await f.soubor("#DATA:[]");
ok(/není žádná hra/.test(f.$("zalmsg").textContent), "prázdné pole: " + f.$("zalmsg").textContent);
await f.soubor('#DATA:[{"id":"x","turns":"nesmysl"},{"id":"y","savedAt":123,"turns":[{"p":"blbost"},{"bust":true}]}]');
ok(!f.$("impbox").hidden && /V souboru 1 hra, z toho 1 nová/.test(f.$("impinfo").textContent), "vadný záznam vyhozen, zbyl jeden: " + f.$("impinfo").textContent);
f.klik(f.$("impadd"));
ok(f.hist().length === 1 && f.hist()[0].turns[0].p === 0, "nečíselné body se zahodily na nulu");
ok(f.hist()[0].goal === 4000 && f.hist()[0].mode === "points", "chybějící pole se doplnila");

console.log("H) import se propíše do statistik");
let g = app(null);
g.klik(g.$("setbtn"));
await g.soubor(text);
g.klik(g.$("impadd"));
const radky = [...g.$("statlist").querySelectorAll(".strow")];
ok(radky.length === 31, "statistiky se přepočítaly");
const nejvicBodu = radky.find(b => b.querySelector(".sn").firstChild.textContent.trim() === "Nejvíc bodů — celkem");
ok(nejvicBodu.querySelector(".sv").textContent === "2 100", "nejvíc bodů — celkem: " + nejvicBodu.querySelector(".sv").textContent);

console.log("I) kopie do schránky");
let h = app([A]);
let zkopirovano = null;
h.w.navigator.clipboard = { writeText: t => { zkopirovano = t; return Promise.resolve(); } };
h.klik(h.$("setbtn"));
h.klik(h.$("copybtn"));
ok(zkopirovano && zkopirovano.includes("#DATA:"), "do schránky šel celý soubor");
ok(h.$("zalmsg").textContent === "", "hláška se neukáže dřív, než prohlížeč odpoví");
await new Promise(r => setTimeout(r, 0));
ok(/schránce/.test(h.$("zalmsg").textContent), "hláška: " + h.$("zalmsg").textContent);

console.log("I2) odmítnutá schránka nesmí hlásit úspěch (B-5)");
let h2 = app([A]);
h2.w.navigator.clipboard = { writeText: () => Promise.reject(new Error("NotAllowedError")) };
h2.w.document.execCommand = () => false;   /* i propad selže */
h2.klik(h2.$("setbtn"));
h2.klik(h2.$("copybtn"));
await new Promise(r => setTimeout(r, 0));
ok(!/je ve schránce/.test(h2.$("zalmsg").textContent), "netvrdí, že je záloha ve schránce");
ok(/nepodařilo/.test(h2.$("zalmsg").textContent), "hlásí neúspěch: " + h2.$("zalmsg").textContent);
ok(h2.$("zalmsg").classList.contains("bad"), "hláška je označená jako chybová");

console.log("I3) propad na execCommand, když clipboard chybí (B-5)");
let h3 = app([A]);
let propad = false;
delete h3.w.navigator.clipboard;
h3.w.document.execCommand = () => { propad = true; return true; };
h3.klik(h3.$("setbtn"));
h3.klik(h3.$("copybtn"));
await new Promise(r => setTimeout(r, 0));
ok(propad, "starý prohlížeč použije execCommand");
ok(/schránce/.test(h3.$("zalmsg").textContent), "a hlásí úspěch: " + h3.$("zalmsg").textContent);

console.log("J) otevření nastavení nabídku importu zavře");
h.klik(h.$("setbtn"));
ok(h.$("impbox").hidden && h.$("zalmsg").hidden, "čistý start");

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
