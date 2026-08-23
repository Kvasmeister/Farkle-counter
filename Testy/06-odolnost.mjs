import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

function app(before){
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true, url:"https://x.test/",
    virtualConsole: vc,
    beforeParse(w){
      /* návod se při prvním spuštění otevře sám a blokuje šipky — odbavíme ho */
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      /* Oddíl A localStorage vypíná, takže uložený kód jazyka se nemá odkud
         přečíst a jsdom by prosadil své en-US. Čeština se proto pojišťuje
         ještě přes navigator — sada zkoumá odolnost, ne jazyk. */
      Object.defineProperty(w.navigator, "languages", { value: ["cs-CZ"], configurable: true });
      Object.defineProperty(w.navigator, "language", { value: "cs-CZ", configurable: true });
      if(before) before(w);
    } });
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  return { w, d, $, klik: el => el.dispatchEvent(new w.MouseEvent("click", {bubbles:true})),
           kolo(){ this.klik(d.querySelector('[data-single="1"]')); this.klik($("bank")); },
           /* Nová hra: dvě klepnutí, a když hra není v historii, ještě potvrzení v okně */
           nova(){ this.klik($("reset")); this.klik($("reset")); if(!$("newmodal").hidden) this.klik($("newdrop")); } };
}
function hra(i, kol){
  const turns = [];
  for(let k = 0; k < kol; k++) turns.push(k % 4 === 3 ? {p:0,bust:true,d:""} : {p:(k%7+1)*100,bust:false,d:"jednička"});
  return { id:"g"+i, savedAt: Date.UTC(2026,0,1) + i*86400000, mode: i%2 ? "rounds" : "points",
           goal:4000, roundGoal: i%2 ? 10 : null,
           banked: turns.reduce((a,t)=>a+(t.bust?0:t.p),0), turns };
}

console.log("A) vypnuté localStorage (soukromé okno)");
let a = app(w => {
  const bum = () => { throw new Error("localStorage zakázán"); };
  Object.defineProperty(w, "localStorage", { value: { getItem:bum, setItem:bum, removeItem:bum, key:bum, clear:bum }, configurable:true });
});
ok(a.$("score") && a.$("score").textContent === "0", "aplikace naběhla");
a.kolo();
ok(a.$("score").textContent === "100", "hra funguje i bez ukládání");
a.klik(a.$("setbtn"));
ok(a.$("koslist").textContent.includes("Zatím není co obnovit"), "obnova se nezhroutila");
ok(a.$("statlist").textContent.includes("Zatím žádná dohraná hra"), "statistiky se nezhroutily");
a.klik(a.$("arch"));
ok(a.$("arch").textContent.includes("Nepodařilo se uložit"), "zápis do historie hlásí problém: " + a.$("arch").textContent);

console.log("B) rozbitá data v úložišti");
let b = app(w => {
  w.localStorage.setItem("farkle-solo-v3", "{tohle není JSON");
  w.localStorage.setItem("farkle-hist-v1", "taky ne");
  w.localStorage.setItem("farkle-kos-v1", '{"není":"pole"}');
});
ok(b.$("score").textContent === "0", "poškozený stav se přeskočil");
ok(b.$("statlist").textContent.includes("Zatím žádná"), "poškozená historie se bere jako prázdná");
b.klik(b.$("setbtn"));
ok(b.$("koslist").textContent.includes("Zatím není co obnovit"), "poškozený koš se bere jako prázdný");
b.kolo(); b.klik(b.$("arch"));
ok(JSON.parse(b.w.localStorage.getItem("farkle-hist-v1")).length === 1, "zápis přepsal rozbitý obsah");

console.log("C) plné úložiště");
let c = app(w => {
  w.localStorage.setItem("farkle-hist-v1", JSON.stringify([hra(1,5)]));
});
c.kolo();
/* Storage je v jsdom proxy: přiřazení na instanci by vytvořilo položku,
   proto se zásah dělá na prototypu */
const proto = c.w.Storage.prototype, puvodni = proto.setItem;
proto.setItem = function(k, v){ if(k === "farkle-hist-v1") throw new Error("QuotaExceeded"); return puvodni.call(this, k, v); };
c.klik(c.$("arch"));
ok(c.$("arch").textContent.includes("došlo místo"), "hláška o plném úložišti: " + c.$("arch").textContent);
ok(JSON.parse(c.w.localStorage.getItem("farkle-hist-v1")).length === 1, "historie zůstala nedotčená");

console.log("D) sto her v historii");
const hodne = [];
for(let i = 0; i < 100; i++) hodne.push(hra(i, 12 + (i % 9)));
const t0 = Date.now();
let dd = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify(hodne)));
const tStart = Date.now() - t0;
ok(dd.$("statlist").querySelectorAll(".strow").length === 31, "statistiky spočítány");
const t1 = Date.now();
dd.klik(dd.$("seg").children[1]);
const tHist = Date.now() - t1;
ok(dd.$("histlist").querySelectorAll(".grow").length === 50, "první dávka je padesát řádků");
dd.klik(dd.$("histlist").querySelector(".morerow"));
ok(dd.$("histlist").querySelectorAll(".grow").length === 100, "po doplnění je jich sto");
ok(tStart < 3000 && tHist < 1500, `start ${tStart} ms, historie ${tHist} ms`);
const velikost = JSON.stringify(hodne).length;
ok(velikost < 400000, `sto her zabere ${Math.round(velikost/1024)} kB z ~5 MB`);
dd.klik(dd.$("seg").children[0]);
const strowyD = [...dd.$("statlist").querySelectorAll(".strow")];
dd.klik(strowyD.find(b => b.querySelector(".sn").firstChild.textContent.trim() === "Nejvíc bodů — celkem"));
ok(dd.$("detbody").querySelectorAll("tbody tr").length === 50, "žebříček taky po dávkách");
dd.klik(dd.$("detbody").querySelector(".morerow"));
ok(dd.$("detbody").querySelectorAll("tbody tr").length === 100, "žebříček zvládl sto her");

console.log("E) hra bez jediného kola v historii");
let e = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify([
  { id:"prazdna", savedAt: Date.UTC(2026,0,1), mode:"points", goal:4000, roundGoal:null, banked:0, turns:[] }])));
const hodnoty = [...e.$("statlist").querySelectorAll(".strow")].map(b => b.querySelector(".sv").textContent);
ok(!hodnoty.some(v => v === "NaN" || v === "Infinity" || v === "undefined"), "žádné NaN ani dělení nulou: " + hodnoty.join(" "));
e.klik(e.$("seg").children[1]);
e.klik(e.$("histlist").querySelector(".grow"));
ok(e.$("detbody").textContent.includes("není zapsané žádné kolo"), "detail prázdné hry to řekne");

console.log("F) hra jen z farklů");
let f = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify([
  { id:"jenF", savedAt: Date.UTC(2026,0,2), mode:"points", goal:4000, roundGoal:null, banked:0,
    turns:[{p:0,bust:true,d:""},{p:0,bust:true,d:""}] }])));
const r = [...f.$("statlist").querySelectorAll(".strow")];
const val = n => r.find(x => x.querySelector(".sn").firstChild.textContent.trim() === n).querySelector(".sv").textContent;
ok(val("Nejlepší kolo — celkem") === "\u2014", "nejlepší kolo: pomlčka, je " + val("Nejlepší kolo — celkem"));
ok(val("Nejhorší kolo bez farklu — celkem") === "\u2014", "nejhorší mimo farkle: pomlčka");
ok(val("Nejdelší série bez farklu") === "0", "série 0");
ok(val("Průměr na kolo — celkem") === "0", "průměr 0");

console.log("G) přepínání stránek a záložek");
let g = app();
g.klik(g.$("tab2"));
ok(g.$("tab2").getAttribute("aria-selected") === "true", "záložka Statistiky aktivní");
g.klik(g.$("tab1"));
ok(g.$("tab1").getAttribute("aria-selected") === "true", "zpět na Zápis kol");
g.d.dispatchEvent(new g.w.KeyboardEvent("keydown", { key:"ArrowRight", bubbles:true }));
ok(g.$("tab2").getAttribute("aria-selected") === "true", "šipka přepnula na Statistiky");

console.log("H) celý průchod: hra na kola, zápis, statistika, záloha");
let h = app();
h.$("modesel").value = "rounds"; h.$("modesel").dispatchEvent(new h.w.Event("change"));
h.$("roundsel").value = "custom"; h.$("roundsel").dispatchEvent(new h.w.Event("change"));
h.$("roundnum").value = "3"; h.$("roundnum").dispatchEvent(new h.w.Event("input"));
h.kolo(); h.klik(h.$("bust")); h.kolo();
ok(!h.$("lock").hidden, "po třech kolech konec");
h.klik(h.$("arch"));
ok(h.$("arch").textContent === "Uloženo v historii", "zapsáno");
h.nova();
ok(h.$("score").textContent === "0" && h.$("lock").hidden, "nová hra je odemčená");
ok(JSON.parse(h.w.localStorage.getItem("farkle-kos-v1") || "[]").length === 0, "zapsaná hra nešla zbytečně do koše");
h.klik(h.$("tab2"));
const vv = [...h.$("statlist").querySelectorAll(".strow")];
const soucetVv = vv.find(b => b.querySelector(".sn").firstChild.textContent.trim() === "Celkem nasbíráno bodů");
ok(vv.length === 31 && soucetVv.querySelector(".sv").textContent === "200", "statistiky vidí zapsanou hru");

console.log("K) selhání zápisu se nesmí spolknout (B-2 až B-4)");
/* zablokuje zápis jednoho klíče, ostatní nechá být */
function zabij(w, klic){
  const proto = w.Storage.prototype, puv = proto.setItem;
  proto.setItem = function(k, v){ if(k === klic) throw new Error("QuotaExceeded"); return puv.call(this, k, v); };
  return () => { proto.setItem = puv; };
}

console.log("K1) Nová hra nesmaže rozehranou hru, když záloha selže (B-2)");
{
  const k = app();
  k.kolo(); k.kolo();
  const zpet = zabij(k.w, "farkle-kos-v1");
  const b = k.$("reset");
  k.klik(b);                       /* první klik se ptá */
  k.klik(b);                       /* druhý otevře okno, hra není v historii */
  k.klik(k.$("newdrop"));          /* a tam se potvrzuje */
  ok(k.$("score").textContent === "200", "hra zůstala rozehraná, skóre " + k.$("score").textContent);
  ok(k.$("rows").children.length === 2, "obě kola jsou na místě");
  ok(/Nepodařilo se zálohovat/.test(b.textContent), "tlačítko to řeklo: " + b.textContent);
  zpet();
}

console.log("K2) když záloha projde, maže se dál normálně");
{
  const k = app();
  k.kolo(); k.kolo();
  k.nova();
  ok(k.$("score").textContent === "0", "hra smazána");
  ok(JSON.parse(k.w.localStorage.getItem("farkle-kos-v1")).length === 1, "a je v koši");
}

console.log("K3) mazání z historie: první zápis selže → nemaže se (B-3)");
{
  const k = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify([hra(1, 8), hra(2, 8)])));
  k.klik(k.$("tab2")); k.klik(k.$("seg").children[1]);
  k.klik(k.$("histlist").querySelector(".grow"));
  const zpet = zabij(k.w, "farkle-koshist-v1");
  const db = k.$("delgame");
  k.klik(db); k.klik(db);
  ok(JSON.parse(k.w.localStorage.getItem("farkle-hist-v1")).length === 2, "hra v historii zůstala");
  ok(/Nepodařilo se uložit do koše/.test(db.textContent), "hláška: " + db.textContent);
  zpet();
}

console.log("K4) mazání z historie: druhý zápis selže → návrat, žádný duplikát");
{
  const k = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify([hra(1, 8), hra(2, 8)])));
  k.klik(k.$("tab2")); k.klik(k.$("seg").children[1]);
  k.klik(k.$("histlist").querySelector(".grow"));
  const zpet = zabij(k.w, "farkle-hist-v1");
  const db = k.$("delgame");
  k.klik(db); k.klik(db);
  zpet();
  ok(JSON.parse(k.w.localStorage.getItem("farkle-hist-v1")).length === 2, "hra v historii zůstala");
  ok(JSON.parse(k.w.localStorage.getItem("farkle-koshist-v1") || "[]").length === 0, "a nezůstala navíc v koši");
  ok(/Nepodařilo se smazat/.test(db.textContent), "hláška: " + db.textContent);
}

console.log("K5) obnova z koše nepřepíše rozehranou hru bez zálohy (B-2)");
{
  const k = app();
  k.kolo(); k.kolo();
  k.nova();      /* první hra do koše */
  k.kolo();                                        /* nová rozehraná hra */
  k.klik(k.$("setbtn"));
  const zpet = zabij(k.w, "farkle-kos-v1");
  const b = k.$("koslist").querySelector("button");
  k.klik(b);
  ok(k.$("score").textContent === "100", "rozehraná hra se nepřepsala, skóre " + k.$("score").textContent);
  ok(/Nepodařilo se zálohovat/.test(b.textContent), "hláška: " + b.textContent);
  zpet();
}

console.log("K6) pruh, když nefunguje ukládání rozehrané hry (B-4)");
{
  const k = app();
  ok(k.$("nosave").hidden, "při běžném chodu je pruh schovaný");
  const zpet = zabij(k.w, "farkle-solo-v3");
  k.kolo();
  ok(!k.$("nosave").hidden, "po selhání zápisu se pruh ukázal");
  ok(/zmizí/.test(k.$("nosave").textContent), "text varuje před ztrátou: " + k.$("nosave").textContent);
  ok(k.$("score").textContent === "100", "hrát jde dál");
  zpet();
  k.kolo();
  ok(k.$("nosave").hidden, "když ukládání zase jede, pruh zmizel sám");
}

console.log("K7) vrácení z koše historie hlásí selhání (B-3)");
{
  const k = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify([hra(1, 8)])));
  k.klik(k.$("tab2")); k.klik(k.$("seg").children[1]);
  k.klik(k.$("histlist").querySelector(".grow"));
  k.klik(k.$("delgame")); k.klik(k.$("delgame"));
  k.klik(k.$("setbtn"));
  const zpet = zabij(k.w, "farkle-hist-v1");
  const b = k.$("koshistlist").querySelector("button");
  k.klik(b);
  ok(/Nepodařilo se uložit/.test(b.textContent), "hláška: " + b.textContent);
  ok(JSON.parse(k.w.localStorage.getItem("farkle-koshist-v1")).length === 1, "hra zůstala v koši");
  zpet();
}

console.log("I) strukturálně platný, ale neúplný stav (B-1)");
function sStavem(obj){
  return app(w => w.localStorage.setItem("farkle-solo-v3", JSON.stringify(obj)));
}
const zaklad = { mode:"points", goal:4000, banked:300,
                 turns:[{p:300,bust:false,d:"jednička"}],
                 rolls:[{thrown:6,hot:false,items:[]}] };
function bez(pole){ const o = JSON.parse(JSON.stringify(zaklad)); delete o[pole]; return o; }

let i1 = sStavem(bez("turns"));
ok(i1.$("score").textContent === "300", "chybí turns: aplikace se vykreslila");
ok(i1.$("rows").children.length === 0 && !i1.$("bust").disabled, "chybí turns: ovládání funguje");
i1.kolo();
ok(i1.$("rows").children.length === 1, "chybí turns: jde dál hrát");

const bezItems = JSON.parse(JSON.stringify(zaklad));
delete bezItems.rolls[0].items;
let i2 = sStavem(bezItems);
ok(i2.$("pot").textContent === "0" && !i2.$("bust").disabled, "chybí items v hodu: aplikace žije");
i2.klik(i2.d.querySelector('[data-single="1"]'));
ok(i2.$("pot").textContent === "100", "chybí items v hodu: odkládání funguje");

let i3 = sStavem(bez("goal"));
ok(i3.$("rest").textContent === "3\u202F700", "chybí goal: zbývá se spočítalo z náhradních 4000, je " + i3.$("rest").textContent);

let i4 = sStavem(Object.assign({}, zaklad, { goal: "4000" }));
ok(i4.$("rest").textContent === "3\u202F700", "goal jako řetězec: nahrazen číslem, zbývá " + i4.$("rest").textContent);

let i5 = sStavem(Object.assign({}, zaklad, { rolls:[{thrown:null,hot:false,items:[]}] }));
ok(!/NaN/.test(i5.$("rollon").textContent + i5.$("rollline").textContent), "thrown jako null: nikde NaN, popis hodu: " + i5.$("rollline").textContent);

let i6 = sStavem(Object.assign({}, zaklad, { rolls:[{thrown:6,hot:false,items:[{l:"vlastní",p:100,d:"dvě"}]}] }));
ok(!/NaN/.test(i6.$("rollon").textContent), "položka s nečíselnými kostkami: bez NaN");

let i7 = app(w => w.localStorage.setItem("farkle-solo-v3", "{tohle není JSON"));
ok(i7.w.localStorage.getItem("farkle-solo-v3-vadny") === "{tohle není JSON", "nečitelný stav se odložil stranou, nezmizel");

console.log("J) popis kola z cizí zálohy se nevkládá jako HTML (B-6)");
const utok = "<img src=x onerror=\"window.__utok=1\">";
let j = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify([
  { id:"utok1", savedAt: Date.UTC(2026,0,2), mode:"points", goal:4000, roundGoal:null,
    banked:100, turns:[{p:100,bust:false,d:utok}] } ])));
j.klik(j.$("tab2"));
j.klik(j.$("seg").children[1]);
j.klik(j.$("histlist").querySelector(".grow"));
ok(j.$("detbody").querySelectorAll("img").length === 0, "v detailu hry nevznikl žádný <img>");
ok(j.$("detbody").textContent.includes("<img"), "popis se ukázal jako text");
ok(j.w.__utok === undefined, "onerror se nespustil");

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
