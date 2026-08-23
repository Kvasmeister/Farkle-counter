/* Vrstva úložiště: IndexedDB, migrace ze starých klíčů a propad zpátky
   na localStorage. IndexedDB dodává fake-indexeddb, jsdom žádnou nemá. */
import { JSDOM, VirtualConsole } from "jsdom";
import { IDBFactory } from "fake-indexeddb";
import FDBDatabase from "fake-indexeddb/lib/FDBDatabase";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };
const pauza = (ms = 120) => new Promise(r => setTimeout(r, ms));

const HKEY = "farkle-hist-v1", UKEY = "farkle-uloziste-v1", HZAL = HKEY + "-zaloha";

function hra(i){
  const turns = [{ p:(i % 5 + 1) * 100, bust:false, d:"jednička" },
                 { p:200, bust:false, d:"dvě jedničky" }];
  return { id:"g"+i, savedAt: Date.UTC(2026,0,1) + i*3600000, mode:"points",
           goal:4000, roundGoal:null,
           banked: turns.reduce((a,t)=>a+t.p, 0), turns };
}
const TRI = [hra(1), hra(2), hra(3)];

/* jeden „prohlížeč": localStorage i IndexedDB přežijí restart aplikace */
function prohlizec(pocatecniLS = {}){
  const ls = Object.assign({ "farkle-navod-v1": "bez-verze", "farkle-jazyk-v1": "cs" }, pocatecniLS);
  let idb = new IDBFactory();
  return {
    ls,
    zrusIDB(){ idb = null; },
    nastavIDB(f){ idb = f; },
    rozbijIDB(){ idb = { open(){ throw new Error("IndexedDB zakázána"); } }; },
    async start(){
      const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true,
        url:"https://x.test/", virtualConsole: new VirtualConsole(),
        beforeParse(w){
          w.structuredClone = structuredClone;
          if(idb) w.indexedDB = idb;
          for(const k in ls) w.localStorage.setItem(k, ls[k]);
        }});
      const w = dom.window, d = w.document, $ = id => d.getElementById(id);
      await pauza(250);
      /* uložit zpátky, ať další start vidí, co aplikace zapsala */
      const zpet = () => {
        for(const k in ls) delete ls[k];
        for(let i = 0; i < w.localStorage.length; i++){
          const k = w.localStorage.key(i);
          ls[k] = w.localStorage.getItem(k);
        }
      };
      return { w, d, $, zpet,
        klik: el => el.dispatchEvent(new w.MouseEvent("click", {bubbles:true})),
        naHistorii(){ this.klik($("seg").children[1]); },
        radky: () => $("histlist").querySelectorAll(".grow").length,
        kolo(){ this.klik(d.querySelector('[data-single="1"]')); this.klik($("bank")); } };
    }
  };
}
/* čte přímo z police, bez aplikace */
async function zPolice(idb, police){
  return new Promise((r, rej) => {
    const req = idb.open("kostky");
    req.onsuccess = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(police)){ db.close(); r(null); return; }
      const g = db.transaction(police, "readonly").objectStore(police).getAll();
      g.onsuccess = () => { db.close(); r(g.result); };
      g.onerror = () => { db.close(); rej(g.error); };
    };
    req.onerror = () => rej(req.error);
  });
}
const hryVIDB = (idb) => zPolice(idb, "souhrny");

console.log("A) bez IndexedDB se nic nemění");
{
  const p = prohlizec({ [HKEY]: JSON.stringify(TRI) });
  p.zrusIDB();
  const a = await p.start();
  a.naHistorii();
  ok(a.radky() === 3, "historie se načetla z localStorage: " + a.radky());
  ok(a.$("nohist").hidden, "žádný pruh o nedostupné historii");
  a.kolo();
  a.klik(a.$("arch"));
  await pauza();
  ok(JSON.parse(a.w.localStorage.getItem(HKEY)).length === 4, "nová hra se zapsala do localStorage");
  ok(!a.w.localStorage.getItem(UKEY), "příznak úložiště se nenastavil");
}

console.log("B) první start s IndexedDB historii přestěhuje");
const P = prohlizec({ [HKEY]: JSON.stringify(TRI) });
{
  const a = await P.start();
  a.naHistorii();
  ok(a.radky() === 3, "hry jsou na obrazovce hned po migraci: " + a.radky());
  ok(a.w.localStorage.getItem(UKEY) === "idb", "příznak úložiště je nastavený");
  ok(a.w.localStorage.getItem(HKEY) === null, "původní klíč už tam není");
  ok(JSON.parse(a.w.localStorage.getItem(HZAL)).length === 3, "ale zůstal jako záloha");
  const vIdb = await hryVIDB(a.w.indexedDB);
  ok(vIdb.length === 3, "a tři souhrny leží v IndexedDB: " + vIdb.length);
  ok(vIdb[0].turns === undefined && vIdb[0].kol === 2 && vIdb[0].farklu === 0,
     "souhrn nenese kola, ale předpočítané údaje");
  const det = await zPolice(a.w.indexedDB, "detaily");
  ok(det.length === 3 && det[0].turns.length === 2, "detaily leží ve své polici");
  a.zpet();
}

console.log("C) druhý start čte rovnou z IndexedDB");
{
  const a = await P.start();
  a.naHistorii();
  ok(a.radky() === 3, "historie naběhla bez localStorage: " + a.radky());
  ok(a.$("nohist").hidden, "žádný pruh");
  a.kolo();
  a.klik(a.$("arch"));
  await pauza();
  ok(a.radky() === 4, "zapsaná hra je v seznamu hned: " + a.radky());
  ok(a.w.localStorage.getItem(HKEY) === null, "do starého klíče se nic nepřipsalo");
  const vIdb = await hryVIDB(a.w.indexedDB);
  ok(vIdb.length === 4, "a je i v IndexedDB: " + vIdb.length);
  ok(a.$("arch").textContent === "Uloženo v historii", "tlačítko hlásí uloženo: " + a.$("arch").textContent);
  a.zpet();
}

console.log("D) příznak idb, ale IndexedDB se otevřít nedá");
{
  P.rozbijIDB();
  const a = await P.start();
  ok(!a.$("nohist").hidden, "pruh o nedostupné historii visí");
  a.naHistorii();
  ok(a.radky() === 0, "seznam je prázdný, ne zavádějící: " + a.radky());
  ok(!a.$("histlist").textContent.includes("2\u202F"),
     "a rozhodně se neukazuje stará historie z localStorage");
  a.kolo();
  ok(a.$("score").textContent !== "0", "počítat jde dál, skóre " + a.$("score").textContent);
  a.klik(a.$("arch"));
  await pauza();
  ok(a.$("arch").textContent === "Historie teď není dostupná",
     "zápis se odmítne a hláška nelže o místě: " + a.$("arch").textContent);
  ok(a.radky() === 0, "a nic se nikam nepřidalo");
  ok(a.w.localStorage.getItem(HKEY) === null, "ani zpátky do localStorage");
}

console.log("E) selhání zápisu vrátí paměť zpátky");
{
  const p = prohlizec({ [HKEY]: JSON.stringify(TRI) });
  const a = await p.start();
  a.naHistorii();
  ok(a.radky() === 3, "výchozí stav: " + a.radky());

  const puvodni = FDBDatabase.prototype.transaction;
  FDBDatabase.prototype.transaction = function(store, rezim){
    if(rezim === "readwrite") throw new Error("úložiště selhalo");
    return puvodni.apply(this, arguments);
  };
  a.kolo();
  a.klik(a.$("arch"));
  await pauza();
  FDBDatabase.prototype.transaction = puvodni;

  ok(a.$("arch").textContent.includes("Nepodařilo se uložit"),
     "selhání se ohlásí u tlačítka: " + a.$("arch").textContent);
  a.klik(a.$("tab2"));
  a.naHistorii();
  ok(a.radky() === 3, "seznam se vrátil na tři hry: " + a.radky());
  const vIdb = await hryVIDB(a.w.indexedDB);
  ok(vIdb.length === 3, "a v IndexedDB jsou pořád tři: " + vIdb.length);
}

console.log("F) mazání z historie: koš se vrátí, když zápis selže");
{
  const p = prohlizec({ [HKEY]: JSON.stringify(TRI) });
  const a = await p.start();
  a.naHistorii();
  a.klik(a.$("histlist").querySelector(".grow"));
  await pauza();                       /* detail se dotahuje z druhé police */
  ok(a.$("detbody").querySelectorAll("tbody tr").length === 2, "kola se dotáhla");
  ok(!a.$("delgame").disabled, "a mazání se odemklo");

  const puvodni = FDBDatabase.prototype.transaction;
  FDBDatabase.prototype.transaction = function(store, rezim){
    if(rezim === "readwrite") throw new Error("úložiště selhalo");
    return puvodni.apply(this, arguments);
  };
  a.klik(a.$("delgame"));
  a.klik(a.$("delgame"));
  await pauza();
  FDBDatabase.prototype.transaction = puvodni;

  ok(a.$("delgame").textContent.includes("Nepodařilo se smazat"),
     "hláška u tlačítka: " + a.$("delgame").textContent);
  ok(JSON.parse(a.w.localStorage.getItem("farkle-koshist-v1") || "[]").length === 0,
     "kopie v koši historie se vrátila zpátky");
  a.klik(a.$("detback"));
  ok(a.radky() === 3, "hra v historii zůstala: " + a.radky());
}

console.log("G) mazání a import v režimu idb");
{
  const p = prohlizec({ [HKEY]: JSON.stringify(TRI) });
  const a = await p.start();
  a.naHistorii();
  a.klik(a.$("histlist").querySelector(".grow"));
  await pauza();
  a.klik(a.$("delgame"));
  a.klik(a.$("delgame"));
  await pauza();
  ok(a.radky() === 2, "po smazání zbyly dvě hry: " + a.radky());
  ok((await hryVIDB(a.w.indexedDB)).length === 2, "IndexedDB to ví taky");
  ok(JSON.parse(a.w.localStorage.getItem("farkle-koshist-v1")).length === 1,
     "smazaná hra leží v koši historie v localStorage");

  a.klik(a.$("setbtn"));
  a.klik(a.$("pastebtn"));
  a.$("pastearea").value = "Kostky\n#DATA:" + JSON.stringify([hra(9)]);
  a.klik(a.$("pasteload"));
  a.klik(a.$("impadd"));
  await pauza();
  ok(a.radky() === 3, "import přidal hru: " + a.radky());
  ok((await hryVIDB(a.w.indexedDB)).length === 3, "a je i v IndexedDB");

  /* vrácení z koše historie */
  const vratit = a.$("koshistlist").querySelector("button");
  a.klik(vratit);
  await pauza();
  ok(a.radky() === 4, "vrácení z koše doplnilo čtvrtou hru: " + a.radky());
  ok(JSON.parse(a.w.localStorage.getItem("farkle-koshist-v1") || "[]").length === 0,
     "a koš historie je prázdný");
}

console.log("H) export a záloha se formátem nemění");
{
  const p = prohlizec({ [HKEY]: JSON.stringify(TRI) });
  const a = await p.start();
  a.klik(a.$("setbtn"));
  let text = null;
  a.w.navigator.clipboard = { writeText: (t) => { text = t; return Promise.resolve(); } };
  a.klik(a.$("copybtn"));
  await pauza();
  ok(typeof text === "string" && text.indexOf("#DATA:") > 0, "záloha má datový řádek");
  const data = JSON.parse(text.slice(text.lastIndexOf("#DATA:") + 6));
  ok(data.length === 3 && data[0].turns.length === 2, "a nese celé záznamy včetně kol");
}

console.log("I) upgrade z jedné police na dvě");
{
  const p = prohlizec({ [UKEY]: "idb" });
  /* databáze verze 1 přesně tak, jak ji zanechala předchozí dávka */
  const stara = new IDBFactory();
  await new Promise((r) => {
    const q = stara.open("kostky", 1);
    q.onupgradeneeded = () => q.result.createObjectStore("hry", { keyPath:"id" });
    q.onsuccess = () => {
      const db = q.result, tx = db.transaction("hry", "readwrite");
      TRI.forEach(g => tx.objectStore("hry").put(g));
      tx.oncomplete = () => { db.close(); r(); };
    };
  });
  p.nastavIDB(stara);

  const a = await p.start();
  a.naHistorii();
  ok(a.radky() === 3, "hry přežily rozdělení polic: " + a.radky());
  ok(a.$("nohist").hidden, "žádný pruh");
  const sou = await zPolice(a.w.indexedDB, "souhrny");
  const det = await zPolice(a.w.indexedDB, "detaily");
  ok(sou.length === 3 && det.length === 3, "obě police mají tři záznamy");
  ok(sou[0].kol === 2 && sou[0].turns === undefined, "souhrn je předpočítaný");
  ok(await zPolice(a.w.indexedDB, "hry") === null, "stará police je pryč");
  a.klik(a.$("histlist").querySelector(".grow"));
  await pauza();
  ok(a.$("detbody").querySelectorAll("tbody tr").length === 2, "a kola se dají dotáhnout");
}

console.log("J) statistiky nad souhrny dají stejná čísla jako nad plnými záznamy");
{
  const hodne = [];
  for(let i = 0; i < 40; i++){
    const turns = [], kol = 2 + (i % 9);
    for(let k = 0; k < kol; k++){
      turns.push(k % 4 === 3 ? {p:0,bust:true,d:""} : {p:(k % 6 + 1) * 100, bust:false, d:"jednička"});
    }
    hodne.push({ id:"h"+i, savedAt: Date.UTC(2026,0,1) + i*7200000,
                 mode: i % 3 ? "points" : "rounds", goal: 2000, roundGoal: i % 3 ? null : 8,
                 banked: turns.reduce((a,t)=>a+(t.bust?0:t.p),0), turns });
  }
  const cti = (a) => [...a.$("statlist").querySelectorAll(".strow")]
    .map(b => b.querySelector(".sn").firstChild.textContent.trim() + "=" + b.querySelector(".sv").textContent);

  const pl = prohlizec({ [HKEY]: JSON.stringify(hodne) });
  pl.zrusIDB();
  const naPlnych = cti(await pl.start());

  const pi = prohlizec({ [HKEY]: JSON.stringify(hodne) });
  const nadSouhrny = cti(await pi.start());

  ok(naPlnych.length === 31 && nadSouhrny.length === 31, "jedenatřicet statistik na obou stranách");
  const rozdil = naPlnych.filter((v, i) => v !== nadSouhrny[i]);
  ok(rozdil.length === 0, rozdil.length ? ("liší se: " + rozdil.join(" | ")) : "všechny hodnoty sedí");

  /* a totéž v žebříčku — pátá položka (Nejvíc bodů — celkem) je první rozklikávací */
  const pl2 = await pl.start(), pi2 = await pi.start();
  pl2.klik(pl2.$("statlist").querySelectorAll(".strow")[4]);
  pi2.klik(pi2.$("statlist").querySelectorAll(".strow")[4]);
  const zl = [...pl2.$("detbody").querySelectorAll("td.g")].map(t => t.textContent).join("|");
  const zi = [...pi2.$("detbody").querySelectorAll("td.g")].map(t => t.textContent).join("|");
  ok(zl === zi && zl.length > 0, "žebříček dává stejné pořadí i hodnoty");
}

console.log("K) export dá stejný soubor z obou úložišť, mazání smaže i detail");
{
  const hry = [hra(1), hra(2), hra(3)];
  const zaloha = async (p) => {
    const a = await p.start();
    a.klik(a.$("setbtn"));
    let text = null;
    a.w.navigator.clipboard = { writeText: (t) => { text = t; return Promise.resolve(); } };
    a.klik(a.$("copybtn"));
    await pauza();
    return { a, text };
  };
  const pl = prohlizec({ [HKEY]: JSON.stringify(hry) }); pl.zrusIDB();
  const pi = prohlizec({ [HKEY]: JSON.stringify(hry) });
  const zl = (await zaloha(pl)).text;
  const zi = await zaloha(pi);
  const bezData = (t) => t.slice(0, t.lastIndexOf("#DATA:"));
  ok(bezData(zl) === bezData(zi.text), "čitelná část je znak po znaku stejná");
  const dl = JSON.parse(zl.slice(zl.lastIndexOf("#DATA:") + 6));
  const di = JSON.parse(zi.text.slice(zi.text.lastIndexOf("#DATA:") + 6));
  ok(JSON.stringify(dl) === JSON.stringify(di), "datový řádek je stejný");
  ok(di.length === 3 && di[0].turns.length === 2, "a nese celé záznamy");

  /* tlačítko se během skládání zablokuje a pak vrátí */
  ok(zi.a.$("copybtn").textContent === "Kopírovat" && !zi.a.$("copybtn").disabled,
     "tlačítko se po složení vrátilo: " + zi.a.$("copybtn").textContent);

  const b = zi.a;
  b.klik(b.$("tab2"));
  b.naHistorii();
  b.klik(b.$("histlist").querySelector(".grow"));
  await pauza();
  b.klik(b.$("delgame")); b.klik(b.$("delgame"));
  await pauza();
  const det = await zPolice(b.w.indexedDB, "detaily");
  ok(det.length === 2, "se hrou zmizel i její detail: " + det.length);
}

console.log("L) nová pole v souhrnu: nejvíc hodů v kole, největší farkle a farkle prvním hodem");
{
  const T = " \u00B7 ";
  const h = (id, turns) => ({ id, savedAt: Date.UTC(2026,2,1) + id.length*3600000,
    mode:"points", goal:4000, roundGoal:null,
    banked: turns.reduce((a,t)=>a+(t.bust?0:t.p),0), turns });
  const HRY = [
    /* dva zapsané hody, pak farkle po dvou bodovaných hodech, pak farkle hned */
    h("a", [{p:350,bust:false,d:"jednička"+T+"3\u00D7 5"},
            {p:250,bust:true, d:"jednička"+T+"pětka"},
            {p:0,  bust:true, d:""}]),
    /* bez jediného farklu */
    h("b", [{p:100,bust:false,d:"jednička"},
            {p:800,bust:false,d:"jednička"+T+"pětka"+T+"postupka 1\u20135"}]),
    /* hra bez jediného kola */
    h("c", []),
    /* jediné kolo a hned farkle prvním hodem */
    h("d", [{p:0,bust:true,d:""}]),
    /* horké kostky: " + " uvnitř hodu se počítat nesmí */
    h("e", [{p:100, bust:false,d:"jednička"},
            {p:1450,bust:false,d:"3\u00D7 1 + 3\u00D7 5"+T+"jednička"+T+"pětka"}])
  ];
  const p = prohlizec({ [HKEY]: JSON.stringify(HRY) });
  const a = await p.start();
  const sou = {};
  (await zPolice(a.w.indexedDB, "souhrny")).forEach(s => { sou[s.id] = s; });
  ok(Object.keys(sou).length === 5, "pět souhrnů v polici: " + Object.keys(sou).length);
  ok(sou.a.hodu === 3, "farkle po dvou hodech je hod třetí: " + sou.a.hodu);
  ok(sou.a.ztraceno === 250, "největší farkle hry a: " + sou.a.ztraceno);
  ok(sou.b.hodu === 3, "tři hody v jednom kole: " + sou.b.hodu);
  ok(sou.b.ztraceno === null, "hra bez farklu má ztraceno null, má " + sou.b.ztraceno);
  ok(sou.c.hodu === null, "hra bez kol má hodu null, má " + sou.c.hodu);
  ok(sou.c.ztraceno === null, "hra bez kol má ztraceno null, má " + sou.c.ztraceno);
  ok(sou.d.hodu === 1, "farkle prvním hodem je jeden hod: " + sou.d.hodu);
  ok(sou.d.ztraceno === null, "farkle bez bodů se ukládá jako null: " + JSON.stringify(sou.d.ztraceno));
  ok(sou.e.hodu === 3, "horké kostky nepřidávají hod navíc: " + sou.e.hodu);
  ok(sou.e.ztraceno === null, "hra e bez farklu: " + sou.e.ztraceno);
  ok("hodu" in sou.c && "ztraceno" in sou.c, "null se ukládá, pole nechybí");
  /* farkluprvni počítá kola s farklem a nulou bodů — u hry a je to až třetí
     kolo (první dva hody skórovaly), u hry d rovnou jediné kolo hry */
  ok(sou.a.farkluprvni === 1, "hra a: farkle prvním hodem jen ve třetím kole: " + sou.a.farkluprvni);
  ok(sou.b.farkluprvni === 0, "hra b bez farklu: " + sou.b.farkluprvni);
  ok(sou.c.farkluprvni === 0, "hra bez kol: " + sou.c.farkluprvni);
  ok(sou.d.farkluprvni === 1, "hra d: jediné kolo je farkle prvním hodem: " + sou.d.farkluprvni);
  ok(sou.e.farkluprvni === 0, "hra e bez farklu: " + sou.e.farkluprvni);
  ok("farkluprvni" in sou.c, "nula se ukládá, pole nechybí");
  a.naHistorii();
  ok(a.radky() === 5, "aplikace vypadá stejně jako předtím: " + a.radky());
}

console.log("M) upgrade starší databáze dopočítá všechna nová pole");
{
  /* databáze verze 2 přesně tak, jak ji zanechala předchozí dávka:
     souhrny bez hodu/ztraceno a k nim plné detaily */
  const T = " \u00B7 ";
  const detaily = [
    { id:"s1", turns:[{p:400,bust:false,d:"jednička"+T+"pětka"},
                      {p:900,bust:true, d:"3\u00D7 5"+T+"jednička"}] },
    { id:"s2", turns:[{p:200,bust:false,d:"jednička"}] },
    { id:"s3", turns:[] }
  ];
  const souhrny = detaily.map(d => ({
    id:d.id, savedAt: Date.UTC(2026,3,1), mode:"points", goal:4000, roundGoal:null,
    banked: d.turns.reduce((a,t)=>a+(t.bust?0:t.p),0),
    kol: d.turns.length, farklu: d.turns.filter(t=>t.bust).length,
    nejlepsi:null, nejhorsi:null, serie:0, kolKCili:null
  }));
  const stara = new IDBFactory();
  await new Promise((r) => {
    const q = stara.open("kostky", 2);
    q.onupgradeneeded = () => {
      q.result.createObjectStore("souhrny", { keyPath:"id" });
      q.result.createObjectStore("detaily", { keyPath:"id" });
    };
    q.onsuccess = () => {
      const db = q.result, tx = db.transaction(["souhrny","detaily"], "readwrite");
      souhrny.forEach(s => tx.objectStore("souhrny").put(s));
      detaily.forEach(d => tx.objectStore("detaily").put(d));
      tx.oncomplete = () => { db.close(); r(); };
    };
  });
  const p = prohlizec({ [UKEY]: "idb" });
  p.nastavIDB(stara);
  const a = await p.start();
  a.naHistorii();
  ok(a.radky() === 3, "hry přežily upgrade: " + a.radky());
  ok(a.$("nohist").hidden, "žádný pruh o nedostupné historii");
  const sou = {};
  (await zPolice(a.w.indexedDB, "souhrny")).forEach(s => { sou[s.id] = s; });
  ok(sou.s1.hodu === 3, "dopočteno: farkle po dvou hodech je tři, je " + sou.s1.hodu);
  ok(sou.s1.ztraceno === 900, "dopočteno: největší farkle 900, je " + sou.s1.ztraceno);
  ok(sou.s2.hodu === 1, "dopočteno: jeden hod, je " + sou.s2.hodu);
  ok(sou.s2.ztraceno === null, "dopočteno: hra bez farklu, je " + sou.s2.ztraceno);
  ok(sou.s3.hodu === null && sou.s3.ztraceno === null, "dopočteno: hra bez kol nese dvakrát null");
  /* žádná z fixtur nemá kolo s farklem a nulou bodů, ale pole musí přesto
     být doplněné číslem, ne zůstat undefined */
  ok(sou.s1.farkluprvni === 0 && sou.s2.farkluprvni === 0 && sou.s3.farkluprvni === 0,
     "dopočteno: farkluprvni doplněno na 0: " + [sou.s1.farkluprvni, sou.s2.farkluprvni, sou.s3.farkluprvni].join(","));
  ok(sou.s1.kol === 2 && sou.s1.banked === 400, "ostatní pole souhrnu zůstala nedotčená");
  /* nejlepsihod/hoduCelkem jsou nová pole ze stejného dopočtu — s1 má
     dva hody v prvním kole (jednička, pětka: 100 a 50) a tři ve druhém
     (3×5, jednička, farkle: 500, 100, 0), nejlepší je 500 z trojice pětek */
  ok(sou.s1.nejlepsihod === 500, "dopočteno: nejlepší hod 500, je " + sou.s1.nejlepsihod);
  ok(sou.s1.hoduCelkem === 5, "dopočteno: pět hodů celkem, je " + sou.s1.hoduCelkem);
  ok(sou.s2.nejlepsihod === 100, "dopočteno: jediný hod je nejlepší, je " + sou.s2.nejlepsihod);
  ok(sou.s2.hoduCelkem === 1, "dopočteno: jeden hod celkem, je " + sou.s2.hoduCelkem);
  ok(sou.s3.nejlepsihod === null && sou.s3.hoduCelkem === 0, "dopočteno: hra bez kol nemá žádný hod");
  const det = await zPolice(a.w.indexedDB, "detaily");
  ok(det.length === 3, "police detailů se dopočtem nezměnila: " + det.length);
  a.klik(a.$("histlist").querySelector(".grow"));
  await pauza();
  ok(a.$("detbody").querySelectorAll("tbody tr").length > 0, "detail hry se pořád dotáhne");
}

console.log("N) souhrn s nulou uloženou dřív se čte jako null");
{
  /* databáze je rovnou na aktuální verzi, takže žádný dopočet neběží
     a nula v poli ztraceno zůstane v polici ležet — musí ji překlopit
     čtecí strana, jinak by žebříček nesl řadu nul */
  const zapsana = new IDBFactory();
  await new Promise((r) => {
    const q = zapsana.open("kostky", 5);
    q.onupgradeneeded = () => {
      q.result.createObjectStore("souhrny", { keyPath:"id" });
      q.result.createObjectStore("detaily", { keyPath:"id" });
    };
    q.onsuccess = () => {
      const db = q.result, tx = db.transaction(["souhrny","detaily"], "readwrite");
      tx.objectStore("souhrny").put({
        id:"n1", savedAt: Date.UTC(2026,4,1), mode:"points", goal:4000, roundGoal:null,
        banked:300, kol:2, farklu:1, nejlepsi:300, nejhorsi:300, serie:1, kolKCili:null,
        hodu:1, ztraceno:0, farkluprvni:1 });
      tx.objectStore("detaily").put({ id:"n1", turns:[
        {p:300,bust:false,d:"3× 1"}, {p:0,bust:true,d:""}] });
      tx.oncomplete = () => { db.close(); r(); };
    };
  });
  const p = prohlizec({ [UKEY]: "idb" });
  p.nastavIDB(zapsana);
  const a = await p.start();
  const radek = [...a.$("statlist").querySelectorAll(".strow")]
    .find(b => b.querySelector(".sn").firstChild.textContent.trim() === "Nejvíc bodů ztraceno farklem — celkem");
  ok(!!radek, "položka je v seznamu");
  ok(radek.querySelector(".sv").textContent === "\u2014",
     "uložená nula se chová jako null: " + radek.querySelector(".sv").textContent);
  ok(radek.disabled, "a nejde rozkliknout, není co ukázat");
  const sou = await zPolice(a.w.indexedDB, "souhrny");
  ok(sou[0].ztraceno === 0, "v polici nula zůstala, dopočet kvůli tomu neběžel");
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
