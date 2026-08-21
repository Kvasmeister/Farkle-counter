import { JSDOM } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

// hry postavíme rovnou do localStorage, ať se testuje výpočet, ne klikání
function hra(o){
  const turns = o.turns.map(p => p === "F" ? {p:0,bust:true,d:""} : {p, bust:false, d:"jednička"});
  return { id:o.id, savedAt:o.savedAt, mode:o.mode||"points", goal:o.goal||4000,
           roundGoal:o.roundGoal||null,
           banked:turns.reduce((a,t)=>a+(t.bust?0:t.p),0), turns };
}
const HRY = [
  hra({id:"g1", savedAt:Date.UTC(2026,6,1,10,0), mode:"points", goal:2000, turns:[800,"F",700,600]}),      // 2100, 4 kola, 1 farkle, cíl dosažen ve 4 kolech
  hra({id:"g2", savedAt:Date.UTC(2026,6,2,11,30), mode:"rounds", roundGoal:5, turns:[300,300,"F","F",1200]}), // 1800, 5 kol, 2 farkle
  hra({id:"g3", savedAt:Date.UTC(2026,6,3,12,0), mode:"points", goal:4000, turns:[150,250,400]}),           // 800, 3 kola, 0 farklů
];
function app(hry){
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true, url:"https://x.test/",
    beforeParse(w){
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      if(hry) w.localStorage.setItem("farkle-hist-v1", JSON.stringify(hry));
    } });
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  return { w, d, $, klik: el => el.dispatchEvent(new w.MouseEvent("click", {bubbles:true})),
           radky: () => [...$("statlist").querySelectorAll(".strow")].map(b => ({
             n: b.querySelector(".sn").firstChild.textContent.trim(),
             v: b.querySelector(".sv").textContent,
             kdy: b.querySelector(".sd") ? b.querySelector(".sd").textContent : null,
             lze: !b.disabled, el: b })) };
}
const S = "\u202F";

console.log("A) prázdná historie");
let a = app(null);
ok(a.$("statlist").textContent.includes("Zatím žádná dohraná hra"), "statistiky hlásí prázdno");
a.klik(a.$("seg").children[1]);
ok(!a.$("histlist").hidden && a.$("statlist").hidden, "přepnutí na historii");
ok(a.$("histlist").textContent.includes("Historie je prázdná"), "historie hlásí prázdno");

console.log("B) hodnoty statistik");
let b = app(HRY);
const r = b.radky();
ok(r.length === 21, "21 řádků, je " + r.length);
ok(r[0].n === "Odehráno her" && r[1].n === "Nejvíc her za den" &&
   r[2].n === "Celkem nasbíráno bodů" && r[3].n === "Nejvíc bodů za hru",
   "nahoře jsou součty, pod nimi rekordy: " + r.slice(0,4).map(x => x.n).join(" | "));
ok(r[19].n === "Farklů na hru", "poslední je poměr farklů: " + r[19].n);
const val = n => (r.find(x => x.n === n) || {}).v;
ok(val("Nejvíc bodů za hru") === "2" + S + "100", "nejvíc bodů za hru: " + val("Nejvíc bodů za hru"));
ok(val("Nejvíc bodů — hra na body") === "2" + S + "100", "nejvíc na body: " + val("Nejvíc bodů — hra na body"));
ok(val("Nejvíc bodů — hra na kola") === "1" + S + "800", "nejvíc na kola: " + val("Nejvíc bodů — hra na kola"));
ok(val("Nejlepší kolo") === "1" + S + "200", "nejlepší kolo: " + val("Nejlepší kolo"));
ok(val("Nejhorší kolo bez farklu") === "150", "nejhorší mimo farkle: " + val("Nejhorší kolo bez farklu"));
ok(val("Nejvíc farklů za hru") === "2", "nejvíc farklů: " + val("Nejvíc farklů za hru"));
ok(val("Nejdelší série bez farklu") === "3", "nejdelší série: " + val("Nejdelší série bez farklu"));
ok(val("Nejméně kol v jedné hře na body") === "4", "nejméně kol: " + val("Nejméně kol v jedné hře na body"));
ok(val("Nejvíc kol v jedné hře na body") === "4", "nejvíc kol: " + val("Nejvíc kol v jedné hře na body"));
// každé kolo má jednodílný popis, tedy jeden hod; farkle s prázdným popisem taky
ok(val("Nejvíc hodů v jednom kole") === "1", "nejvíc hodů v kole: " + val("Nejvíc hodů v jednom kole"));
// všechny farkle jsou nulové, do statistiky nepatří ani jeden
ok(val("Nejvíc bodů ztraceno farklem") === "\u2014", "nulové farkle se nepočítají: " + val("Nejvíc bodů ztraceno farklem"));
ok(val("Nejvíc her za den") === "1", "nejvíc her za den: " + val("Nejvíc her za den"));
// 4700 bodů / 12 kol = 391,7 -> 392
ok(val("Celkový průměr na kolo") === "392", "celkový průměr: " + val("Celkový průměr na kolo"));
// body: (2100+800)/7 = 414,3 -> 414
ok(val("Průměr na kolo — hra na body") === "414", "průměr na body: " + val("Průměr na kolo — hra na body"));
ok(val("Průměr na kolo — hra na kola") === "360", "průměr na kola: " + val("Průměr na kolo — hra na kola"));
ok(val("Farklů na hru") === "1", "farklů na hru: " + val("Farklů na hru"));
ok(val("Odehráno her") === "3", "odehráno her: " + val("Odehráno her"));
ok(val("Celkem nasbíráno bodů") === "4" + S + "700", "celkem bodů: " + val("Celkem nasbíráno bodů"));

console.log("C) datum u rekordů, ne u součtů");
ok(r.find(x => x.n === "Nejlepší kolo").kdy !== null, "rekord má datum");
ok(r.find(x => x.n === "Odehráno her").kdy === null, "součet nemá datum");
ok(!r.find(x => x.n === "Odehráno her").lze && !r.find(x => x.n === "Celkem nasbíráno bodů").lze, "součty nejdou rozkliknout");
ok(r.find(x => x.n === "Nejlepší kolo").lze, "rekord jde rozkliknout");

console.log("D) žebříček");
b.klik(r.find(x => x.n === "Nejvíc bodů za hru").el);
ok(!b.$("p2detail").hidden && b.$("p2list").hidden, "otevřela se podstránka");
ok(b.$("dettitle").textContent === "Nejvíc bodů za hru", "titulek: " + b.$("dettitle").textContent);
let bunky = [...b.$("detbody").querySelectorAll("tr")].map(tr => tr.querySelector("td.g").textContent);
ok(bunky.join("|") === ["2"+S+"100","1"+S+"800","800"].join("|"), "seřazeno od nejlepší: " + bunky.join(" "));
ok(/4 kol/.test(b.$("detbody").querySelector("td.d").textContent), "u her na kola je počet kol: " + b.$("detbody").querySelector("td.d").textContent);
b.klik(b.$("detback"));
ok(b.$("p2detail").hidden && !b.$("p2list").hidden, "Zpět vrátilo seznam");

console.log("E) žebříček, kde nejlepší je nejmenší");
b.klik(b.radky().find(x => x.n === "Nejhorší kolo bez farklu").el);
bunky = [...b.$("detbody").querySelectorAll("td.g")].map(td => td.textContent);
ok(bunky[0] === "150", "první je nejnižší kolo: " + bunky.join(" "));
b.klik(b.$("detback"));
b.klik(b.radky().find(x => x.n === "Farklů na hru").el);
bunky = [...b.$("detbody").querySelectorAll("td.g")].map(td => td.textContent);
ok(bunky.join("|") === "0|1|2", "farklů vzestupně: " + bunky.join(" "));
b.klik(b.$("detback"));

console.log("F) historie her a detail hry");
b.klik(b.$("seg").children[1]);
const hRadky = [...b.$("histlist").querySelectorAll(".grow")];
ok(hRadky.length === 3, "tři hry, je " + hRadky.length);
ok(/3\. 7\. 2026/.test(hRadky[0].textContent), "nejnovější nahoře: " + hRadky[0].querySelector("b").textContent);
ok(/na kola/.test(hRadky[1].textContent) && /limit 5/.test(hRadky[1].textContent), "režim a limit v řádku");
b.klik(hRadky[1]);
ok(/Hra z /.test(b.$("dettitle").textContent), "titulek detailu: " + b.$("dettitle").textContent);
ok(b.$("detbody").querySelectorAll("tbody tr").length === 5, "pět kol v tabulce");
ok(b.$("detbody").querySelectorAll(".stats div").length === 4, "čtyři přehledové dlaždice");
ok(b.$("dtally").children.length === 5, "vrubovka podle limitu kol");
ok(b.$("detbody").textContent.includes("1" + S + "800"), "celkové skóre hry sedí");
ok(!b.$("detbody").querySelector(".fix") && !b.$("detbody").querySelector("#reset"), "žádné opravy ani Nová hra");

console.log("G) mazání z historie");
const del = b.$("delgame");
b.klik(del);
ok(/Opravdu/.test(del.textContent), "první klik se ptá: " + del.textContent);
ok(JSON.parse(b.w.localStorage.getItem("farkle-hist-v1")).length === 3, "zatím nesmazáno");
b.klik(del);
ok(JSON.parse(b.w.localStorage.getItem("farkle-hist-v1")).length === 2, "druhý klik smazal");
ok(!b.$("p2detail").hidden === false, "vrátilo se na seznam");
ok(b.$("histlist").querySelectorAll(".grow").length === 2, "v seznamu zbyly dvě hry");

console.log("H) zapsání hry statistiky rovnou přepočítá");
let c = app(null);
c.klik(c.d.querySelector('[data-single="1"]')); c.klik(c.$("bank"));
c.klik(c.$("arch"));
ok(c.$("statlist").querySelectorAll(".strow").length === 21, "statistiky se naplnily hned po zápisu");
ok(c.radky().find(x => x.n === "Odehráno her").v === "1", "odehráno her: 1");

console.log("I) smazaná zapsaná hra se z tlačítka vrací, nezapisuje znovu");
ok(c.$("arch").textContent === "Uloženo v historii", "před smazáním: " + c.$("arch").textContent);
const puvodniId = JSON.parse(c.w.localStorage.getItem("farkle-hist-v1"))[0].id;
c.klik(c.$("seg").children[1]);
c.klik(c.$("histlist").querySelector(".grow"));
c.klik(c.$("delgame")); c.klik(c.$("delgame"));
ok(c.$("arch").textContent === "Obnovit do historie", "po smazání: " + c.$("arch").textContent);
ok(!c.$("arch").disabled, "a je klikatelné");
ok(JSON.parse(c.w.localStorage.getItem("farkle-koshist-v1")).length === 1, "záznam leží v koši");

c.klik(c.$("arch"));
const zpet = JSON.parse(c.w.localStorage.getItem("farkle-hist-v1"));
ok(zpet.length === 1, "v historii je zase jedna hra, je " + zpet.length);
ok(zpet[0].id === puvodniId, "a je to tentýž záznam, ne nový");
ok(JSON.parse(c.w.localStorage.getItem("farkle-koshist-v1") || "[]").length === 0, "koš se vyprázdnil");
ok(c.$("arch").textContent === "Uloženo v historii" && c.$("arch").disabled,
   "tlačítko je zpátky v klidu: " + c.$("arch").textContent);

console.log("J) kola v jedné hře na body počítají jen dokončené hry");
{
  const DOK = [
    hra({id:"f1", savedAt:Date.UTC(2026,7,1,10,0), goal:2000, turns:[800,700,600,100]}),   // 2200, 4 kola, cíl dosažen
    hra({id:"f2", savedAt:Date.UTC(2026,7,2,10,0), goal:4000, turns:[100,100,100,100,100,100,100,100,100]}), // 900 z 4000, 9 kol, nedohráno
    hra({id:"f3", savedAt:Date.UTC(2026,7,3,10,0), goal:1000, turns:[200,200,200,200,200,200,200]})          // 1400, 7 kol, cíl dosažen
  ];
  const j = app(DOK);
  const v = n => (j.radky().find(x => x.n === n) || {}).v;
  ok(v("Nejvíc kol v jedné hře na body") === "7",
     "devítikolová nedohraná hra se nepočítá: " + v("Nejvíc kol v jedné hře na body"));
  ok(v("Nejméně kol v jedné hře na body") === "4", "nejméně kol: " + v("Nejméně kol v jedné hře na body"));
  j.klik(j.radky().find(x => x.n === "Nejvíc kol v jedné hře na body").el);
  const zeb = [...j.$("detbody").querySelectorAll("td.g")].map(td => td.textContent);
  ok(zeb.join("|") === "7|4", "v žebříčku jsou jen dvě dokončené hry: " + zeb.join(" "));
}

console.log("K) nejvíc her za den");
{
  /* dny se počítají z místního času: hra dohraná o půl jedné v noci patří
     do dne, kdy se hrála, ne do toho předchozího */
  const d = (r, m, den, h, mi) => new Date(r, m, den, h, mi).getTime();
  const DNY = [
    hra({id:"d1", savedAt:d(2026,6,1,10,0),  turns:[300]}),
    hra({id:"d2", savedAt:d(2026,6,1,23,30), turns:[300]}),
    hra({id:"d3", savedAt:d(2026,6,2,0,30),  turns:[300]}),
    hra({id:"d4", savedAt:d(2026,6,2,12,0),  turns:[300]}),
    hra({id:"d5", savedAt:d(2026,6,2,20,0),  turns:[300]}),
    hra({id:"d6", savedAt:d(2026,6,3,9,0),   turns:[300]}),
    hra({id:"d7", savedAt:d(2026,6,3,10,0),  turns:[300]}),
    hra({id:"d8", savedAt:d(2026,6,3,11,0),  turns:[300]})
  ];
  const k = app(DNY);
  const radek = k.radky().find(x => x.n === "Nejvíc her za den");
  ok(radek.v === "3", "nejvíc her za den: " + radek.v);
  ok(radek.kdy === "3. 7. 2026", "při shodě počtů vyhrává novější den: " + radek.kdy);
  ok(radek.lze, "a jde rozkliknout");

  k.klik(radek.el);
  ok(k.$("dettitle").textContent === "Nejvíc her za den", "titulek: " + k.$("dettitle").textContent);
  const rady = [...k.$("detbody").querySelectorAll("tbody tr")].map(tr => ({
    d: tr.querySelector("td.d").textContent, g: tr.querySelector("td.g").textContent }));
  ok(rady.length === 3, "tři dny v žebříčku, je " + rady.length);
  ok(rady.map(x => x.g).join("|") === "3|3|2", "sestupně podle počtu: " + rady.map(x => x.g).join(" "));
  ok(rady[0].d === "3. 7. 2026" && rady[1].d === "2. 7. 2026" && rady[2].d === "1. 7. 2026",
     "při shodě od nejnovějšího dne: " + rady.map(x => x.d).join(" | "));
  ok(rady[1].g === "3", "půlnoc rozděluje dny správně, druhý den má tři hry");
}

console.log("L) typ hry v řádcích a proklik ze žebříčku do detailu");
{
  const l = app(HRY);
  const sd = l.radky().find(x => x.n === "Nejvíc bodů za hru").kdy;
  ok(/1\. 7\. 2026/.test(sd) && /:/.test(sd), "podřádek nese datum i čas: " + sd);
  ok(sd.includes("do 2" + S + "000"), "a taky typ hry: " + sd);
  const sdKola = l.radky().find(x => x.n === "Nejvíc bodů — hra na kola").kdy;
  ok(sdKola.includes("na kola \u00B7 limit 5"), "u hry na kola i limit: " + sdKola);
  ok(l.radky().find(x => x.n === "Nejvíc her za den").kdy === "3. 7. 2026",
     "u statistiky dnů zůstává samotné datum: " + l.radky().find(x => x.n === "Nejvíc her za den").kdy);

  l.klik(l.radky().find(x => x.n === "Nejvíc bodů za hru").el);
  const tr = [...l.$("detbody").querySelectorAll("tbody tr")];
  ok(tr[0].querySelector("td.d").textContent.includes("do 2" + S + "000"), "typ hry i v žebříčku: " + tr[0].querySelector("td.d").textContent);
  ok(tr[1].querySelector("td.d").textContent.includes("na kola \u00B7 limit 5"), "a u hry na kola vedle počtu kol: " + tr[1].querySelector("td.d").textContent);
  ok(tr[0].getAttribute("role") === "button" && tr[0].tabIndex === 0, "řádek se chová jako tlačítko");
  ok(!!tr[0].querySelector("td.c"), "a nese šipku");

  l.klik(tr[0]);
  ok(/Hra z 1\. 7\. 2026/.test(l.$("dettitle").textContent), "otevřel se detail té hry: " + l.$("dettitle").textContent);
  ok(l.$("detbody").querySelectorAll("tbody tr").length === 4, "čtyři kola v tabulce");
  l.klik(l.$("detback"));
  ok(!l.$("p2detail").hidden && l.$("dettitle").textContent === "Nejvíc bodů za hru",
     "Zpět vrátilo do žebříčku: " + l.$("dettitle").textContent);
  l.klik(l.$("detback"));
  ok(l.$("p2detail").hidden && !l.$("p2list").hidden, "druhé Zpět už vrátilo seznam");

  // klávesnice
  l.klik(l.radky().find(x => x.n === "Nejvíc bodů za hru").el);
  const prvni = l.$("detbody").querySelector("tbody tr");
  prvni.dispatchEvent(new l.w.KeyboardEvent("keydown", { key:"Enter", bubbles:true }));
  ok(/Hra z /.test(l.$("dettitle").textContent), "Enter na řádku otevře detail: " + l.$("dettitle").textContent);
  l.klik(l.$("detback"));
  const druhy = l.$("detbody").querySelectorAll("tbody tr")[1];
  druhy.dispatchEvent(new l.w.KeyboardEvent("keydown", { key:" ", bubbles:true }));
  ok(/Hra z 2\. 7\. 2026/.test(l.$("dettitle").textContent), "mezerník taky: " + l.$("dettitle").textContent);

  // smazání hry otevřené ze žebříčku vrací na seznam, ne do žebříčku
  l.klik(l.$("delgame")); l.klik(l.$("delgame"));
  ok(l.$("p2detail").hidden && !l.$("p2list").hidden, "po smazání jsme na seznamu, ne v žebříčku");
  ok(l.$("statlist").querySelectorAll(".strow").length === 21, "a je to seznam statistik");
}

console.log("M) zásobník návratu ruší přepnutí karty i přepínače");
{
  const m = app(HRY);
  m.klik(m.radky().find(x => x.n === "Nejvíc bodů za hru").el);
  m.klik(m.$("detbody").querySelector("tbody tr"));
  m.klik(m.$("tab0")); m.klik(m.$("tab2"));
  m.klik(m.$("detback"));
  ok(m.$("p2detail").hidden && !m.$("p2list").hidden, "po přepnutí karty vede Zpět rovnou na seznam");

  const n = app(HRY);
  n.klik(n.radky().find(x => x.n === "Nejvíc bodů za hru").el);
  n.klik(n.$("detbody").querySelector("tbody tr"));
  n.klik(n.$("seg").children[1]);
  ok(n.$("p2detail").hidden && !n.$("histlist").hidden, "přepínač zavře detail a ukáže historii");
  n.klik(n.$("histlist").querySelector(".grow"));
  n.klik(n.$("detback"));
  ok(n.$("p2detail").hidden && !n.$("p2list").hidden, "a návrat z detailu otevřeného ze seznamu vede na seznam");
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
