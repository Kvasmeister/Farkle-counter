import { JSDOM } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

function app(seed){
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/",
    beforeParse(w){
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      if(seed) seed(w);
    } });
  const w = dom.window, d = w.document;
  const $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return { w, d, $, klik,
    kolo(){ klik(d.querySelector('[data-single="1"]')); klik($("bank")); },
    /* Nová hra: dvě klepnutí, a když hra není v historii, ještě potvrzení v okně */
    nova(){ klik($("reset")); klik($("reset")); if(!$("newmodal").hidden) klik($("newdrop")); },
    hist(){ return JSON.parse(w.localStorage.getItem("farkle-hist-v1") || "[]"); },
    kos(){ return JSON.parse(w.localStorage.getItem("farkle-kos-v1") || "[]"); } };
}

console.log("A) tlačítko podle stavu hry");
let a = app();
ok(a.$("arch").disabled && a.$("arch").textContent === "Zatím není co uložit do historie", "prázdná hra: " + a.$("arch").textContent);
a.kolo(); a.kolo();
ok(!a.$("arch").disabled && a.$("arch").textContent === "Zapsat do historie", "po dvou kolech: " + a.$("arch").textContent);

console.log("B) zápis do historie");
a.klik(a.$("arch"));
let h = a.hist();
ok(h.length === 1, "v historii je 1 hra, je " + h.length);
ok(h[0].banked === 200 && h[0].turns.length === 2, "sedí body i počet kol");
ok(typeof h[0].savedAt === "number" && h[0].savedAt > 0, "uložilo se datum a čas");
ok(h[0].mode === "points" && h[0].goal === 4000, "uložil se režim a cíl");
ok(a.$("arch").disabled && a.$("arch").textContent === "Uloženo v historii", "tlačítko: " + a.$("arch").textContent);

console.log("C) druhý zápis téže hry aktualizuje, nezdvojí");
a.kolo();
ok(a.$("arch").textContent === "Aktualizovat v historii", "tlačítko: " + a.$("arch").textContent);
a.klik(a.$("arch"));
h = a.hist();
ok(h.length === 1, "pořád jedna hra, je " + h.length);
ok(h[0].turns.length === 3, "záznam se přepsal na 3 kola, má " + h[0].turns.length);

console.log("D) varování na nezapsané body");
a.nova();      // nová hra
a.kolo();
a.klik(a.d.querySelector('[data-single="1"]'));  // 100 zůstává na stole
a.klik(a.$("arch"));
ok(a.$("arch").classList.contains("warn") && /propadne/.test(a.$("arch").textContent), "první klik varuje: " + a.$("arch").textContent);
ok(a.hist().length === 1, "zatím nezapsáno");
a.klik(a.$("arch"));
ok(a.hist().length === 2, "druhý klik zapsal, her: " + a.hist().length);
ok(a.hist()[1].banked === 100, "nezapsaný tah se nezapočítal");

console.log("E) Nová hra odkládá neuloženou hru do koše");
let b = app();
b.kolo(); b.kolo(); b.kolo();
ok(b.kos().length === 0, "koš je zatím prázdný");
b.nova();
ok(b.kos().length === 1 && b.kos()[0].turns.length === 3, "hra spadla do koše");
ok(b.$("score").textContent === "0", "nová hra je čistá");

console.log("F) hra uložená v historii se do koše neodkládá");
b.kolo(); b.klik(b.$("arch"));
b.nova();
ok(b.kos().length === 1, "koš se nerozrostl, má " + b.kos().length);

console.log("G) koš drží nejvýš pět her");
for(let i = 0; i < 7; i++){ b.kolo(); b.nova(); }
ok(b.kos().length === 5, "v koši je 5, je " + b.kos().length);

console.log("H) obnova");
let c = app();
c.$("modesel").value = "rounds"; c.$("modesel").dispatchEvent(new c.w.Event("change"));
c.$("roundsel").value = "custom"; c.$("roundsel").dispatchEvent(new c.w.Event("change"));
c.$("roundnum").value = "8"; c.$("roundnum").dispatchEvent(new c.w.Event("input"));
c.kolo(); c.kolo();
c.nova();
c.klik(c.$("setbtn"));
const radky = c.$("koslist").querySelectorAll(".setrow");
ok(radky.length === 1, "v obnově je jeden řádek, je " + radky.length);
ok(/na kola/.test(radky[0].textContent) && /8/.test(radky[0].textContent), "popis: " + radky[0].querySelector("span").textContent);
c.klik(radky[0].querySelector("button"));
ok(c.$("score").textContent === "200", "obnovené skóre: " + c.$("score").textContent);
ok(c.$("rows").children.length === 2, "obnovená kola: " + c.$("rows").children.length);
ok(c.$("rest").textContent === "2 z 8", "obnovil se i limit kol: " + c.$("rest").textContent);
ok(c.kos().length === 0, "obnovená hra z koše zmizela");
ok(c.$("setmodal").hidden, "okno nastavení se zavřelo");

console.log("I) obnova neztratí rozehranou hru");
c.kolo(); c.kolo();                       // teď 4 kola rozehraná
c.nova();
c.klik(c.$("setbtn"));
c.klik(c.$("koslist").querySelector("button"));   // obnovím ji
c.kolo();                                  // a rozehraju dál
c.klik(c.$("setbtn"));
ok(c.$("koslist").querySelectorAll(".setrow").length === 0, "koš je prázdný");
c.klik(c.$("koslist").querySelector("button") || c.$("setbtn"));
ok(c.$("rows").children.length === 5, "hra pokračuje, kol: " + c.$("rows").children.length);

console.log("J) přežije reload");
const ulozeno = c.w.localStorage;
let e = app(w => {
  w.localStorage.setItem("farkle-solo-v3", ulozeno.getItem("farkle-solo-v3"));
  w.localStorage.setItem("farkle-hist-v1", ulozeno.getItem("farkle-hist-v1") || "[]");
});
ok(e.$("rows").children.length === 5, "po reloadu 5 kol, je " + e.$("rows").children.length);
ok(e.$("arch").textContent === "Zapsat do historie", "tlačítko po reloadu: " + e.$("arch").textContent);

console.log("K) trvalé smazání z koše rozehraných se ptá");
{
  const k = app();
  k.kolo(); k.kolo();
  k.nova();
  k.klik(k.$("setbtn"));
  let radek = k.$("koslist").querySelector(".setrow");
  let tl = radek.querySelectorAll("button");
  ok(tl.length === 2, "dvě tlačítka v řádku, je " + tl.length);
  ok(tl[0].textContent === "Obnovit" && tl[1].textContent === "Trvale smazat",
     "popisky: " + tl[0].textContent + " / " + tl[1].textContent);

  k.klik(tl[1]);
  radek = k.$("koslist").querySelector(".setrow");
  ok(/Opravdu trvale smazat/.test(radek.textContent), "řádek se ptá: " + radek.querySelector("b").textContent);
  ok(k.kos().length === 1, "zatím se nic nesmazalo");

  k.klik(radek.querySelectorAll("button")[1]);          // Zrušit
  radek = k.$("koslist").querySelector(".setrow");
  ok(radek.querySelectorAll("button")[1].textContent === "Trvale smazat", "Zrušit vrátil původní řádek");
  ok(k.kos().length === 1, "a hra je pořád v koši");

  k.klik(radek.querySelectorAll("button")[1]);          // znovu Trvale smazat
  k.klik(k.$("koslist").querySelector(".setrow").querySelector("button"));   // Smazat
  ok(k.kos().length === 0, "po potvrzení je koš prázdný, zbylo " + k.kos().length);
  ok(/Zatím není co obnovit/.test(k.$("koslist").textContent), "hlásí prázdný stav");

  /* rozdělaná otázka nepřežije zavření okna */
  k.kolo(); k.nova();
  k.klik(k.$("setbtn"));
  k.klik(k.$("koslist").querySelector(".setrow").querySelectorAll("button")[1]);
  k.klik(k.$("setmodal").querySelector(".modalx"));
  k.klik(k.$("setbtn"));
  ok(!/Opravdu trvale smazat/.test(k.$("koslist").textContent), "po znovuotevření je řádek zase normální");
}

console.log("L) trvalé smazání z koše historie");
{
  const l = app();
  l.kolo(); l.kolo();
  l.klik(l.$("arch"));
  l.klik(l.$("seg").children[1]);
  l.klik(l.d.querySelector("#histlist .grow"));
  l.klik(l.$("delgame")); l.klik(l.$("delgame"));
  const kosh = () => JSON.parse(l.w.localStorage.getItem("farkle-koshist-v1") || "[]");
  ok(kosh().length === 1, "hra je v koši historie");

  l.klik(l.$("setbtn"));
  let radek = l.$("koshistlist").querySelector(".setrow");
  const tl = radek.querySelectorAll("button");
  ok(tl[0].textContent === "Obnovit" && tl[1].textContent === "Trvale smazat",
     "popisky: " + tl[0].textContent + " / " + tl[1].textContent);
  l.klik(tl[1]);
  radek = l.$("koshistlist").querySelector(".setrow");
  ok(/Opravdu trvale smazat/.test(radek.textContent), "ptá se");
  l.klik(radek.querySelector("button"));                // Smazat
  ok(kosh().length === 0, "koš historie je prázdný, zbylo " + kosh().length);
  ok(l.hist().length === 0, "a v historii hra taky není");
}

console.log("M) hra smazaná z historie se nezdvojí přes koš rozehraných");
{
  const m = app();
  m.kolo(); m.kolo();
  m.klik(m.$("arch"));
  const puvodniId = m.hist()[0].id;
  ok(m.$("arch").textContent === "Uloženo v historii", "zapsáno: " + m.$("arch").textContent);

  /* smazání z historie vazbu nepřetrhne */
  m.klik(m.$("seg").children[1]);
  m.klik(m.d.querySelector("#histlist .grow"));
  m.klik(m.$("delgame")); m.klik(m.$("delgame"));
  ok(m.$("arch").textContent === "Obnovit do historie", "tlačítko nabízí návrat: " + m.$("arch").textContent);

  /* Nová hra: záznam je v koši, není co ztratit → žádné okno, žádná druhá kopie */
  m.klik(m.$("reset")); m.klik(m.$("reset"));
  ok(m.$("newmodal").hidden, "okno o neuložené hře se neotevřelo");
  ok(m.kos().length === 0, "koš rozehraných zůstal prázdný");
  const kosh = JSON.parse(m.w.localStorage.getItem("farkle-koshist-v1") || "[]");
  ok(kosh.length === 1 && kosh[0].id === puvodniId, "jediná kopie leží v koši historie");

  /* obnova z nastavení vrátí tentýž záznam, ne druhý */
  m.klik(m.$("setbtn"));
  m.klik(m.$("koshistlist").querySelector(".setrow").querySelector("button"));
  ok(m.hist().length === 1 && m.hist()[0].id === puvodniId, "v historii je zase jedna, tatáž");
}

console.log("N) upravená hra si po obnově z koše pamatuje, kam patří");
{
  const n = app();
  n.kolo(); n.kolo(); n.kolo();
  n.klik(n.$("arch"));
  const puvodniId = n.hist()[0].id;

  n.klik(n.$("seg").children[1]);
  n.klik(n.d.querySelector("#histlist .grow"));
  n.klik(n.$("delgame")); n.klik(n.$("delgame"));
  n.klik(n.$("seg").children[0]);

  /* smazání kola udělá z hry rozdělanou → Nová hra se zeptá a odloží ji */
  n.klik(n.$("fixturns"));
  n.klik(n.d.querySelectorAll("#rows .delbtn")[1]);
  n.klik(n.d.querySelector("#rows .cf .mini.danger"));
  ok(n.$("rows").children.length === 2, "zbyla dvě kola, je " + n.$("rows").children.length);

  n.klik(n.$("reset")); n.klik(n.$("reset"));
  ok(!n.$("newmodal").hidden, "rozdělaná hra okno vyvolá");
  n.klik(n.$("newdrop"));
  ok(n.kos().length === 1, "hra spadla do koše rozehraných");
  ok(n.kos()[0].puvodni === puvodniId, "a nese vazbu na původní záznam");

  n.klik(n.$("setbtn"));
  n.klik(n.$("koslist").querySelector(".setrow").querySelector("button"));
  ok(n.$("arch").textContent === "Obnovit do historie", "obnovená hra ví, kam patří: " + n.$("arch").textContent);
  n.klik(n.$("arch"));
  ok(n.hist().length === 1, "v historii je jedna hra, je " + n.hist().length);
  ok(n.hist()[0].id === puvodniId, "pod původním id, ne jako nová");
  ok(n.hist()[0].turns.length === 2, "a v upravené podobě, kol: " + n.hist()[0].turns.length);
  ok(JSON.parse(n.w.localStorage.getItem("farkle-koshist-v1") || "[]").length === 0, "koš historie je prázdný");
  /* Prázdný koš se z úložiště maže celý, ať v rozpisu zabraného místa
     nevypadá jako by v něm něco leželo. */
  ok(n.w.localStorage.getItem("farkle-koshist-v1") === null,
     "a jeho klíč v úložišti nezůstal ani jako []");
}

console.log("O) když původní záznam nadobro zmizí, zapíše se hra jako nová");
{
  const o = app();
  o.kolo(); o.kolo();
  o.klik(o.$("arch"));
  o.klik(o.$("seg").children[1]);
  o.klik(o.d.querySelector("#histlist .grow"));
  o.klik(o.$("delgame")); o.klik(o.$("delgame"));
  o.klik(o.$("seg").children[0]);

  /* trvalé smazání z koše: vazba už nemá na co ukazovat */
  o.klik(o.$("setbtn"));
  o.klik(o.$("koshistlist").querySelector(".setrow").querySelectorAll("button")[1]);
  o.klik(o.$("koshistlist").querySelector(".setrow").querySelector("button"));
  o.klik(o.$("setmodal").querySelector(".modalx"));
  ok(o.$("arch").textContent === "Zapsat do historie", "tlačítko: " + o.$("arch").textContent);
  o.klik(o.$("arch"));
  ok(o.hist().length === 1, "zapsala se jako nová, her: " + o.hist().length);
}

console.log("P) farkle stojí v popisu kola na konci, jako poslední hod");
{
  const T = " \u00B7 ";
  /* Slovo se jen vypisuje, do dat se neukládá — stará historie ho proto
     dostane taky, bez jakékoli migrace. */
  const p = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify([
    { id:"f1", savedAt: Date.UTC(2026,0,2), mode:"points", goal:4000, roundGoal:null,
      banked:100, turns:[
        { p:100, bust:false, d:"jednička" },
        { p:250, bust:true,  d:"jednička"+T+"pětka"+T+"jednička" },
        { p:0,   bust:true,  d:"" }
      ] } ])));
  p.klik(p.$("tab2"));
  p.klik(p.$("seg").children[1]);
  p.klik(p.$("histlist").querySelector(".grow"));
  const popisy = [...p.$("detbody").querySelectorAll("td.d")].map(x => x.textContent);
  ok(popisy[0] === "jednička", "bodované kolo zůstává beze změny: " + popisy[0]);
  ok(popisy[1] === "jednička"+T+"pětka"+T+"jednička"+T+"farkle",
     "farkle je poslední úsek popisu: " + popisy[1]);
  ok(popisy[2] === "farkle", "farkle prvním hodem je jen slovo: " + popisy[2]);
  ok(!popisy.some(x => x.includes("\u2014")), "pomlčka z původního zápisu zmizela");
  /* uložený popis se nezměnil, statistika hodů proto počítá dál stejně */
  const ulozene = p.hist()[0].turns.map(t => t.d);
  ok(ulozene[1] === "jednička"+T+"pětka"+T+"jednička" && ulozene[2] === "",
     "v datech slovo farkle není: " + JSON.stringify(ulozene));
}

console.log("Q) totéž v živé tabulce kol");
{
  const q = app();
  q.kolo();
  q.klik(q.d.querySelector('[data-single="5"]'));
  q.klik(q.$("bust"));
  const popisy = [...q.$("rows").querySelectorAll("td.d")].map(x => x.textContent);
  ok(popisy[1] === "pětka \u00B7 farkle", "kolo ukončené farklem: " + popisy[1]);
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
