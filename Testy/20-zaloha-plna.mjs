import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

function hra(o){
  const turns = o.turns.map(p => p === "F" ? {p:0,bust:true,d:""} : {p, bust:false, d:"jednička"});
  return { id:o.id, savedAt:o.savedAt, mode:o.mode||"points", goal:o.goal||4000, roundGoal:o.roundGoal||null,
           banked:turns.reduce((a,t)=>a+(t.bust?0:t.p),0), turns };
}
const A = hra({id:"g1", savedAt:Date.UTC(2026,6,1,10,0), goal:2000, turns:[800,"F",700,600]});
const B = hra({id:"g2", savedAt:Date.UTC(2026,6,2,11,30), mode:"rounds", roundGoal:5, turns:[300,300]});

/* Vlastní režim shodný s KCD2 co do pravidel — pro tuhle sadu stačí, že jde
   o platný "vlastní" záznam s vlastním jménem; funkční (ne)shoda s presety
   testuje sada pro sdílení, ne zálohu. */
const REZ_VLASTNI = { id:"rtest", nazev:"Moje pravidla", kostek:6,
  sam:[0,100,0,0,0,50,0], stej:{3:[0,1000,200,300,400,500,600]}, rozs:false,
  nad:"x2", nadP:[0,0,0,1000,1000,2000,3000],
  post:{"15":500,"26":750,"16":1500}, p:{}, v:[] };

function app(opt){
  opt = opt || {};
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true, url:"https://x.test/",
    virtualConsole: vc,
    beforeParse(w){
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      if(opt.hry)    w.localStorage.setItem("farkle-hist-v1", JSON.stringify(opt.hry));
      if(opt.rezimy) w.localStorage.setItem("farkle-rezimy-v1", JSON.stringify(opt.rezimy));
      w.__blob = null;
      w.URL.createObjectURL = b => { w.__blob = b; return "blob:test"; };
      w.URL.revokeObjectURL = () => {};
    }});
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles:true }));
  return { w, d, $, klik,
    hist: () => JSON.parse(w.localStorage.getItem("farkle-hist-v1") || "[]"),
    rezimy: () => JSON.parse(w.localStorage.getItem("farkle-rezimy-v1") || "null"),
    kolo(){ klik(d.querySelector('[data-single="1"]')); klik($("bank")); },
    async souborPlna(text){
      $("impboxplna").hidden = true;
      $("zalmsgplna").hidden = true;
      const f = new w.File([text], "zaloha.txt", { type:"text/plain" });
      Object.defineProperty($("impfileplna"), "files", { value:[f], configurable:true });
      $("impfileplna").dispatchEvent(new w.Event("change"));
      for(let i = 0; i < 300 && $("impboxplna").hidden && $("zalmsgplna").hidden; i++){
        await new Promise(r => setTimeout(r, 10));
      }
    },
    async souborRez(text){
      $("impboxrez").hidden = true;
      $("zalmsgrez").hidden = true;
      const f = new w.File([text], "rezimy.txt", { type:"text/plain" });
      Object.defineProperty($("impfilerez"), "files", { value:[f], configurable:true });
      $("impfilerez").dispatchEvent(new w.Event("change"));
      for(let i = 0; i < 300 && $("impboxrez").hidden && $("zalmsgrez").hidden; i++){
        await new Promise(r => setTimeout(r, 10));
      }
    }};
}

console.log("A) export kompletní zálohy nese hry i herní režimy");
let a = app({ hry:[A, B], rezimy:{ akt:"kcd2", p:{}, v:[REZ_VLASTNI] } });
a.klik(a.$("setbtn"));
a.klik(a.$("expbtnplna"));
ok(a.w.__blob !== null, "vznikl soubor ke stažení");
const textPlna = await a.w.__blob.text();
ok(/^Kostky — kompletní záloha/.test(textPlna), "hlavička souboru");
ok(/2 hry, 4 režimy/.test(textPlna), "počty v hlavičce: hry i všechny režimy (3 přednastavené + 1 vlastní)");
ok(/4\) Moje pravidla/.test(textPlna), "vlastní režim je čitelně vyjmenovaný");
ok(textPlna.split("\n").filter(l => l.startsWith("#PLNAZALOHA:")).length === 1, "právě jeden datový řádek");
const dataPlna = JSON.parse(textPlna.slice(textPlna.indexOf("#PLNAZALOHA:") + "#PLNAZALOHA:".length));
ok(Array.isArray(dataPlna.hry) && dataPlna.hry.length === 2, "v datech jsou obě hry");
ok(dataPlna.rezimy && Array.isArray(dataPlna.rezimy.v) && dataPlna.rezimy.v.length === 1 &&
   dataPlna.rezimy.v[0].nazev === "Moje pravidla", "v datech je vlastní režim");

console.log("B) import kompletní zálohy do prázdné aplikace přidá obojí");
let b = app();
b.klik(b.$("setbtn"));
await b.souborPlna(textPlna);
ok(!b.$("impboxplna").hidden, "nabídka se ukázala");
b.klik(b.$("impaddplna"));
ok(b.hist().length === 2, "přidány obě hry, je " + b.hist().length);
ok(b.rezimy() && b.rezimy().v.length === 1 && b.rezimy().v[0].nazev === "Moje pravidla",
   "přidán i vlastní režim");
ok(/Přidáno: 2 hry, 1 režim\./.test(b.$("zalmsgplna").textContent), "hláška: " + b.$("zalmsgplna").textContent);

console.log("C) druhý import nezdvojí ani hry, ani režimy");
await b.souborPlna(textPlna);
b.klik(b.$("impaddplna"));
ok(b.hist().length === 2 && b.rezimy().v.length === 1, "pořád jen jedna kopie od každého");

console.log("D) nahrazení přepíše obojí, na dvojí klepnutí");
let c = app({ hry:[hra({id:"jina", savedAt:1, turns:[100]})],
              rezimy:{ akt:"kcd2", p:{}, v:[{ ...REZ_VLASTNI, id:"jiny", nazev:"Cizí" }] } });
c.klik(c.$("setbtn"));
await c.souborPlna(textPlna);
c.klik(c.$("imprepplna"));
ok(/Opravdu/.test(c.$("imprepplna").textContent), "první klik se jen ptá");
ok(c.hist().length === 1, "zatím nenahrazeno");
c.klik(c.$("imprepplna"));
ok(c.hist().length === 2 && !c.hist().some(g => g.id === "jina"), "historie nahrazena celá");
ok(c.rezimy().v.length === 1 && c.rezimy().v[0].nazev === "Moje pravidla" &&
   !c.rezimy().v.some(r => r.nazev === "Cizí"), "režimy nahrazeny celé");

console.log("E) rozehranou hru nahrazení herních režimů zamyká");
let d = app({ rezimy:{ akt:"kcd2", p:{}, v:[REZ_VLASTNI] } });
d.klik(d.$("setbtn"));
d.klik(d.$("setmodal").querySelector(".modalx"));
d.kolo();
d.klik(d.$("setbtn"));
await d.souborPlna(textPlna);
ok(d.$("imprepplna").disabled, "Nahradit vše je zamčené uprostřed hry");
ok(/uprostřed rozehrané hry/.test(d.$("impinfoplna").textContent), "hláška vysvětluje proč: " + d.$("impinfoplna").textContent);

console.log("F) export Zálohy herních režimů nese jen režimy");
let e = app({ rezimy:{ akt:"kcd2", p:{}, v:[REZ_VLASTNI] } });
e.klik(e.$("setbtn"));
e.klik(e.$("expbtnrez"));
const textRez = await e.w.__blob.text();
ok(/^Kostky — záloha herních režimů/.test(textRez), "hlavička souboru");
ok(/4 režimy/.test(textRez), "počet všech režimů v hlavičce");
ok(textRez.split("\n").filter(l => l.startsWith("#REZIMYZALOHA:")).length === 1, "právě jeden datový řádek");
const dataRez = JSON.parse(textRez.slice(textRez.indexOf("#REZIMYZALOHA:") + "#REZIMYZALOHA:".length));
ok(dataRez.hry === undefined, "žádné pole her v datech — je to jen záloha režimů");
ok(Array.isArray(dataRez.v) && dataRez.v.length === 1 && dataRez.v[0].nazev === "Moje pravidla",
   "v datech je vlastní režim");

console.log("G) import Zálohy herních režimů: přidat nezasáhne historii");
let f = app({ hry:[A] });
f.klik(f.$("setbtn"));
await f.souborRez(textRez);
ok(!f.$("impboxrez").hidden, "nabídka se ukázala");
f.klik(f.$("impaddrez"));
ok(f.hist().length === 1, "historie beze změny");
ok(f.rezimy().v.length === 1 && f.rezimy().v[0].nazev === "Moje pravidla", "režim přidán");

console.log("H) import Zálohy herních režimů: nahradit vše přepíše seznam");
let g = app({ rezimy:{ akt:"kcd2", p:{}, v:[{ ...REZ_VLASTNI, id:"jiny", nazev:"Cizí" }] } });
g.klik(g.$("setbtn"));
await g.souborRez(textRez);
g.klik(g.$("imprepzrez"));
g.klik(g.$("imprepzrez"));
ok(g.rezimy().v.length === 1 && g.rezimy().v[0].nazev === "Moje pravidla" &&
   !g.rezimy().v.some(r => r.nazev === "Cizí"), "seznam vlastních režimů nahrazen celý");

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
