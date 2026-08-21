import { JSDOM } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

/* Bez seedu se návod při startu otevře sám — proto ho většina bloků odbaví
   a testuje ho až blok E. */
function app(seed, bezSeedu){
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true, url:"https://x.test/",
    beforeParse(w){
      if(!bezSeedu){ try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){} }
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      if(seed) seed(w);
    } });
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  return { w, d, $, klik: el => el.dispatchEvent(new w.MouseEvent("click", { bubbles:true })),
           radky: () => [...$("rows").querySelectorAll("tr")] };
}
function hra(o){
  const turns = o.turns.map(p => p === "F" ? {p:0,bust:true,d:""} : {p, bust:false, d:"jednička"});
  return { id:o.id, savedAt:o.savedAt, mode:o.mode||"points", goal:o.goal||4000, roundGoal:o.roundGoal||null,
           banked:turns.reduce((a,t)=>a+(t.bust?0:t.p),0), turns };
}

console.log("A) klávesnice: počty nad hodnotami");
{
  const a = app();
  const poradi = [...a.d.querySelector(".kind .col").children].map(e => e.id);
  ok(poradi[0] === "counts" && poradi[1] === "pips", "pořadí řádků: " + poradi.join(","));
  /* Počty začínají jedničkou, ale vidět jsou jen ty, kterými se v režimu dá
     něco odložit — ve výchozím KCD tedy od trojice. */
  const videt = [...a.$("counts").children].filter(b => !b.hidden);
  ok(videt[0].textContent === "3\u00D7", "první viditelný popisek je 3\u00D7, je " + videt[0].textContent);
  a.klik(a.$("pips").children[4]);          // hodnota 5
  a.klik(videt[0]);                          // 3\u00D7
  a.klik(a.$("addkind"));
  a.klik(a.$("bank"));
  ok(a.radky()[0].querySelector("td.d").textContent.includes("3\u00D7 5"), "zápis položky je 3\u00D7 5");
}

console.log("B) terminologie");
{
  const a = app();
  ok(a.$("tab1").textContent === "Zápis kol", "záložka: " + a.$("tab1").textContent);
  ok(a.d.querySelector(".turnbar .l").textContent.trim().startsWith("Kolo"), "panel říká Kolo");
  ok(a.$("empty").textContent.includes("Zatím žádné kolo"), "prázdný stav mluví o kole");
  ok(!/[Tt]ah[uůyáí]?\b/.test(a.$("cardrules").textContent), "text pravidel je bez slova tah");
}

console.log("C) režim oprav v zápise kol");
{
  const a = app();
  const kolo = (body, farkle) => {
    for(let i = 0; i < body / 100; i++) a.klik(a.d.querySelector('[data-single="1"]'));
    a.klik(farkle ? a.$("bust") : a.$("bank"));
  };
  ok(a.$("fixturns").style.display === "none", "bez kol je Opravit schované");
  kolo(500); kolo(100, true); kolo(300);
  ok(a.radky().length === 3, "tři kola");
  ok(a.$("score").textContent === "800", "skóre 800, je " + a.$("score").textContent);
  ok(a.$("fixturns").style.display !== "none", "Opravit se ukázalo");
  ok(a.d.querySelectorAll("#rows .delbtn").length === 0, "křížky zatím ne");

  a.klik(a.$("fixturns"));
  ok(a.$("fixturns").textContent === "Hotovo", "přepnuto na Hotovo");
  ok(a.d.querySelectorAll("#rows .delbtn").length === 3, "křížek u každého kola");
  a.klik(a.$("fixturns"));
  ok(a.d.querySelectorAll("#rows .delbtn").length === 0, "vypnutí křížky schová");
  a.klik(a.$("fixturns"));

  a.klik(a.radky()[1].querySelector(".delbtn"));
  ok(a.d.querySelector("#rows .cf .q").textContent === "Opravdu smazat kolo 2?", "ptá se na kolo 2");
  a.klik(a.d.querySelector("#rows .cf .mini:not(.danger)"));
  ok(a.d.querySelectorAll("#rows .confirm").length === 0 && a.radky().length === 3, "Zrušit nic nesmaže");

  a.klik(a.radky()[1].querySelector(".delbtn"));       // farkle
  a.klik(a.d.querySelector("#rows .cf .mini.danger"));
  ok(a.radky().length === 2 && a.$("score").textContent === "800", "smazaný farkle skóre nemění");

  a.klik(a.radky()[0].querySelector(".delbtn"));       // kolo za 500
  a.klik(a.d.querySelector("#rows .cf .mini.danger"));
  ok(a.$("score").textContent === "300", "skóre po smazání kola: " + a.$("score").textContent);
  ok(a.radky()[0].querySelector("td.n").textContent === "1", "kola přečíslována");
  ok(a.radky()[0].querySelector("td.s").textContent === "300", "průběžný součet přepočítán");

  a.klik(a.radky()[0].querySelector(".delbtn"));
  a.klik(a.d.querySelector("#rows .cf .mini.danger"));
  ok(a.$("fixturns").style.display === "none", "bez kol se Opravit zase schová");
}

console.log("D) smazání z historie jde do koše");
{
  const a = app(w => {
    w.localStorage.setItem("farkle-hist-v1", JSON.stringify([
      hra({ id:"h1", savedAt:1000, turns:[500, "F", 300] }),
      hra({ id:"h2", savedAt:2000, turns:[100] })
    ]));
  });
  a.klik(a.$("seg").children[1]);
  ok(a.d.querySelectorAll("#histlist .grow").length === 2, "dvě hry v historii");
  a.klik(a.d.querySelector("#histlist .grow"));
  a.klik(a.$("delgame")); a.klik(a.$("delgame"));
  const kos = JSON.parse(a.w.localStorage.getItem("farkle-koshist-v1") || "[]");
  ok(kos.length === 1, "smazaná hra je v koši");
  ok(JSON.parse(a.w.localStorage.getItem("farkle-hist-v1")).length === 1, "v historii zbyla jedna");

  a.klik(a.$("setbtn"));
  const tl = a.$("koshistlist").querySelector("button");
  ok(tl && tl.textContent === "Obnovit", "v nastavení je tlačítko Obnovit");
  a.klik(tl);
  ok(JSON.parse(a.w.localStorage.getItem("farkle-hist-v1")).length === 2, "hra je zpátky v historii");
  ok(JSON.parse(a.w.localStorage.getItem("farkle-koshist-v1") || "[]").length === 0, "koš je prázdný");
  ok(a.$("koshistlist").textContent.includes("Zatím není co obnovit"), "prázdný stav koše");
}

console.log("E) strop koše na deset");
{
  const hry = [];
  for(let i = 0; i < 13; i++) hry.push(hra({ id:"x"+i, savedAt:1000+i, turns:[100*(i+1)] }));
  const a = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify(hry)));
  a.klik(a.$("seg").children[1]);
  for(let i = 0; i < 12; i++){
    a.klik(a.d.querySelector("#histlist .grow"));
    a.klik(a.$("delgame")); a.klik(a.$("delgame"));
  }
  const n = JSON.parse(a.w.localStorage.getItem("farkle-koshist-v1") || "[]").length;
  ok(n === 10, "koš drží deset, je " + n);
}

console.log("F) import ze schránky");
{
  const a = app(w => w.localStorage.setItem("farkle-hist-v1", JSON.stringify([hra({ id:"a1", savedAt:1000, turns:[100] })])));
  a.klik(a.$("setbtn"));
  a.klik(a.$("pastebtn"));
  ok(!a.$("pastebox").hidden, "pole se otevřelo");

  a.$("pastearea").value = "";
  a.klik(a.$("pasteload"));
  ok(a.$("zalmsg").textContent.includes("prázdné"), "prázdné pole hlásí chybu");

  a.$("pastearea").value = "nesmysl bez dat";
  a.klik(a.$("pasteload"));
  ok(a.$("zalmsg").textContent.includes("datový řádek"), "poškozený text hlásí chybu");
  ok(a.$("impbox").hidden, "nabídka importu se neukázala");

  const zaloha = [hra({ id:"a1", savedAt:1000, turns:[100] }), hra({ id:"b2", savedAt:3000, turns:[700, "F"] })];
  a.$("pastearea").value = "Kostky\n#DATA:" + JSON.stringify(zaloha);
  a.klik(a.$("pasteload"));
  ok(!a.$("impbox").hidden, "nabídka importu se ukázala");
  ok(a.$("impinfo").textContent.includes("V textu 2 hry, z toho 1 nová"), "info: " + a.$("impinfo").textContent);
  a.klik(a.$("impadd"));
  ok(JSON.parse(a.w.localStorage.getItem("farkle-hist-v1")).length === 2, "přibyla jedna hra");
  ok(a.$("pastebox").hidden && a.$("impbox").hidden, "po importu se pole zavřelo");
}

console.log("G) okno s pravidly a návodem");
{
  const a = app();                       /* se seedem: okno se samo neotevře */
  ok(a.$("rulesmodal").hidden, "okno je při startu zavřené");
  a.klik(a.$("infobtn"));
  ok(!a.$("rulesmodal").hidden && !a.$("cardrules").hidden, "„i“ otevře pravidla");
  ok(a.$("cardguide").hidden, "návod je schovaný");
  a.klik(a.$("infoseg").children[1]);
  ok(!a.$("cardguide").hidden && a.$("cardrules").hidden, "přepínač ukáže návod");
  ok(a.$("infoseg").children[1].classList.contains("on"), "přepínač je zvýrazněný");
  a.klik(a.$("infoseg").children[0]);
  ok(!a.$("cardrules").hidden, "a zase pravidla");

  const g = a.$("cardguide").textContent;
  ok(g.includes("Zápis kol") && !g.includes("Zápis tahů"), "návod mluví o Zápisu kol");
  ok(g.includes("Import ze schránky") && g.includes("Smazané hry z historie"), "návod zná nové funkce");
  ok(g.includes("Automatické ukládání") && g.includes("Smazané rozehrané hry"), "návod zná automatické ukládání i nové názvy oddílů");
}

console.log("H) návod při prvním spuštění a po změně verze");
{
  /* bez service workeru (jsdom) se ukládá náhradní značka */
  const a = app(null, true);
  ok(!a.$("rulesmodal").hidden, "poprvé se okno otevřelo samo");
  ok(!a.$("cardguide").hidden, "rovnou na návodu");
  ok(a.w.localStorage.getItem("farkle-navod-v1") === "bez-verze", "značka uložená");

  const b = app(w => w.localStorage.setItem("farkle-navod-v1", "bez-verze"), true);
  ok(b.$("rulesmodal").hidden, "podruhé už ne");

  const c = app(w => w.localStorage.setItem("farkle-navod-v1", "kostky-v9"), true);
  ok(!c.$("rulesmodal").hidden, "jiná uložená verze návod zase ukáže");
}

console.log(fails ? "\n" + fails + " CHYB" : "\nvše prošlo");
process.exit(fails ? 1 : 0);
