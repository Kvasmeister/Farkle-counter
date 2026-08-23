import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
/* Rozbor kola na hody je čistá funkce bez DOMu, takže se dá volat přímo ze
   zdroje — a podle CLAUDE.md §1 se na kód ptáme src/, ne sestaveného
   index.html, kde si esbuild přejmenovává, co chce. Zbytek sady jde dál
   přes jsdom, protože se ptá na chování. */
import { rozlozKolo, rozlozPolozku } from "../src/js/stav/hody.js";
import { zPresetu } from "../src/js/pravidla/rezimy.js";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };
const spi = ms => new Promise(r => setTimeout(r, ms));

/* Sada se dívá na tvar uložených dat, ne na jazyk: kolo si ukládá kódy a text
   vzniká až při vykreslení. Čeština proto musí vyjít znak po znaku stejně jako
   dřív, a starý záznam s hotovým českým textem se musí dát rozebrat zpátky. */
const T = " \u00B7 ";        /* oddělovač hodů v textu */
const P = " + ";             /* oddělovač položek v textu */

/* hra do historie: kola se předávají v hotové podobě, ať se testuje čtení */
function hra(id, turns, o){
  o = o || {};
  return { id, savedAt: o.savedAt || Date.UTC(2026, 6, 1, 10, 0),
           mode: o.mode || "points", goal: o.goal || 4000, roundGoal: o.roundGoal || null,
           banked: turns.reduce((a, t) => a + (t.bust ? 0 : (t.p || 0)), 0), turns };
}

function app(opt){
  opt = opt || {};
  const vc = new VirtualConsole();          // jsdom křičí na navigaci u blob odkazu
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true,
    url: "https://x.test/", virtualConsole: vc,
    beforeParse(w){
      try {
        w.localStorage.setItem("farkle-jazyk-v1", "cs");
        w.localStorage.setItem("farkle-navod-v1", "bez-verze");
      } catch(e){}
      if(opt.hry) w.localStorage.setItem("farkle-hist-v1", JSON.stringify(opt.hry));
      if(opt.stav) w.localStorage.setItem("farkle-solo-v3", JSON.stringify(opt.stav));
      w.__blob = null;
      w.URL.createObjectURL = b => { w.__blob = b; return "blob:test"; };
      w.URL.revokeObjectURL = () => {};
    } });
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return { w, d, $, klik, i18n: w.__i18n,
    stav: () => JSON.parse(w.localStorage.getItem("farkle-solo-v3") || "{}"),
    hist: () => JSON.parse(w.localStorage.getItem("farkle-hist-v1") || "[]"),
    /* popisy kol v živé tabulce i v náhledu hry z historie */
    popisy: id => [...$(id).querySelectorAll("td.d")].map(x => x.textContent),
    stitky: () => [...$("fix").querySelectorAll(".ent span")].map(x => x.textContent),
    jednicka(){ klik(d.querySelector('[data-single="1"]')); },
    petka(){ klik(d.querySelector('[data-single="5"]')); },
    postupka(kod){ klik(d.querySelector('[data-str="' + kod + '"]')); },
    stejne(hodnota){
      klik([...$("pips").children].find(b => b.dataset.value === String(hodnota)));
      klik($("addkind"));
    },
    rucne(body){
      klik($("mtoggle"));
      $("mnum").value = String(body);
      klik($("madd"));
    },
    doHistorie(){ klik($("tab2")); klik($("seg").children[1]); klik($("histlist").querySelector(".grow")); },
    prepni(kod){
      const s = $("jazyksel");
      s.value = kod;
      s.dispatchEvent(new w.Event("change", { bubbles: true }));
    },
    async soubor(text){
      const f = new w.File([text], "zaloha.txt", { type: "text/plain" });
      Object.defineProperty($("impfile"), "files", { value: [f], configurable: true });
      $("impfile").dispatchEvent(new w.Event("change"));
      await spi(60);
    } };
}

console.log("A) odložená položka nese kód, ne text");
{
  const a = app();
  a.jednicka();
  a.postupka("15");
  const it = a.stav().rolls[0].items;
  ok(it[0].k === "j" && it[0].l === undefined, "jednička je kód j: " + JSON.stringify(it[0]));
  ok(it[1].k === "s15", "postupka 1–5 je kód s15: " + it[1].k);
  ok(a.stitky().join(" | ") === "jednička | postupka 1\u20135",
     "karta opravit ukazuje česká slova: " + a.stitky().join(" | "));

  const b = app();
  b.stejne(5);                     /* výchozí počet je 3 */
  ok(b.stav().rolls[0].items[0].k === "n35", "tři pětky jsou kód n35: " + b.stav().rolls[0].items[0].k);
  ok(b.stitky()[0] === "3\u00D7 5", "a vykreslí se dnešním textem: " + b.stitky()[0]);

  const c = app();
  c.rucne(123);
  ok(c.stav().rolls[0].items[0].k === "v", "ruční zadání je kód v: " + c.stav().rolls[0].items[0].k);
  ok(c.stitky()[0] === "vlastní", "a vykreslí se jako vlastní: " + c.stitky()[0]);
}

console.log("B) kolo se ukládá v kódech");
{
  const a = app();
  a.jednicka();
  a.klik(a.$("bank"));
  const tah = a.stav().turns[0];
  ok(tah.c === "j", "kolo nese c: " + JSON.stringify(tah));
  ok(tah.d === undefined && tah.l === undefined, "a nezapisuje ani d, ani l");

  const b = app();
  b.jednicka();
  b.klik(b.$("rollon"));
  b.petka();
  b.klik(b.$("bank"));
  ok(b.stav().turns[0].c === "j|p", "dva hody odděluje svislítko: " + b.stav().turns[0].c);

  const c = app();
  c.jednicka(); c.petka();
  c.klik(c.$("bank"));
  ok(c.stav().turns[0].c === "j,p", "dvě položky v jednom hodu odděluje čárka: " + c.stav().turns[0].c);

  /* horké kostky: postupka spotřebuje všech šest, další hod jede znovu všemi */
  const e = app();
  e.postupka("16");
  e.klik(e.$("rollon"));
  e.jednicka();
  e.klik(e.$("bank"));
  ok(e.stav().turns[0].c === "s16|j", "horké kostky jsou další úsek: " + e.stav().turns[0].c);
  ok(e.stav().turns[0].c.length < "postupka 1\u20136 \u00B7 jednička".length,
     "kód je kratší než dřívější český text");
}

console.log("C) farkle se dopisuje až při zobrazení");
{
  const a = app();
  a.jednicka(); a.klik(a.$("bank"));
  a.petka(); a.klik(a.$("bust"));
  ok(a.popisy("rows").join(" | ") === "jednička | pětka" + T + "farkle",
     "farkle je poslední úsek popisu: " + a.popisy("rows").join(" | "));
  ok(a.stav().turns[1].c === "p", "v datech slovo farkle není: " + a.stav().turns[1].c);

  const b = app();
  b.klik(b.$("bust"));
  ok(b.stav().turns[0].c === "", "farkle prvním hodem má prázdné c: " + JSON.stringify(b.stav().turns[0].c));
  ok(b.popisy("rows")[0] === "farkle", "a v tabulce je jen slovo: " + b.popisy("rows")[0]);
}

console.log("D) staré kolo s hotovým textem se rozebere");
{
  const stara = hra("s1", [
    { p: 150, bust: false, d: "jednička" + T + "pětka" },
    { p: 1500, bust: false, d: "3\u00D7 5" + P + "postupka 1\u20136" },
    { p: 0, bust: true, d: "" }
  ]);

  const a = app({ hry: [stara] });
  a.doHistorie();
  ok(a.popisy("detbody").join(" | ") ===
     "jednička" + T + "pětka | 3\u00D7 5" + P + "postupka 1\u20136 | farkle",
     "v češtině vyjde znak po znaku totéž: " + a.popisy("detbody").join(" | "));
  ok(a.hist()[0].turns[0].d === "jednička" + T + "pětka" && a.hist()[0].turns[0].c === undefined,
     "uložená data se rozborem nepřepsala");

  const b = app({ hry: [stara] });
  b.i18n.I18N.en["stitek.j"] = "one";
  b.i18n.I18N.en["stitek.p"] = "five";
  b.i18n.I18N.en["stitek.n"] = "{p} of a kind, {h}";
  b.i18n.I18N.en["stitek.s16"] = "run 1-6";
  b.i18n.I18N.en["slovo.farkle"] = "farkle";
  b.prepni("en");
  b.doHistorie();
  ok(b.popisy("detbody").join(" | ") ===
     "one" + T + "five | 3 of a kind, 5" + P + "run 1-6 | farkle",
     "v jiném jazyce se stará hra přeloží: " + b.popisy("detbody").join(" | "));
  ok(b.hist()[0].turns[0].d === "jednička" + T + "pětka",
     "a v datech pořád leží původní text");
}

console.log("D2) zmrazená tabulka rozboru pokrývá celý katalog");
{
  /* Rozbor starého textu stojí na zmrazené tabulce, vykreslení na katalogu.
     Kdyby se obě strany rozešly, starý záznam by zůstal v původním jazyce.
     Kontrola je proto vede proti sobě: každý štítek se v dnešní české podobě
     musí dát rozebrat, což se pozná tím, že se v jiném jazyce přeloží. */
  const KODY = ["j", "p", "v", "s15", "s26", "s16"];
  const rec = hra("v1", [{ p: 100, bust: false, d: "jednička" + P + "pětka" + P + "vlastní" + P +
    "postupka 1\u20135" + P + "postupka 2\u20136" + P + "postupka 1\u20136" + P + "3\u00D7 5" }]);
  const a = app({ hry: [rec] });
  KODY.forEach(k => { a.i18n.I18N.en["stitek." + k] = "<" + k + ">"; });
  a.i18n.I18N.en["stitek.n"] = "<n{p}{h}>";
  a.prepni("en");
  a.doHistorie();
  const popis = a.popisy("detbody")[0];
  ok(popis === ["<j>", "<p>", "<v>", "<s15>", "<s26>", "<s16>", "<n35>"].join(P),
     "všech sedm štítků se rozebralo a přeložilo: " + popis);
  ok(!/[ěščřžýáíéůú]/.test(popis), "v přeloženém popisu nezbylo české slovo: " + popis);
}

console.log("E) co se rozebrat nedá, zůstane syrové");{
  const cizi = hra("c1", [
    { p: 100, bust: false, d: "something else entirely" },
    { p: 200, bust: false, d: "<b>bum</b>" }
  ]);
  const a = app({ hry: [cizi] });
  a.doHistorie();
  ok(a.popisy("detbody")[0] === "something else entirely",
     "nerozebratelný popis se ukáže tak, jak je: " + a.popisy("detbody")[0]);
  ok(a.$("detbody").querySelectorAll("td.d b").length === 0 && a.popisy("detbody")[1] === "<b>bum</b>",
     "a projde escapováním: " + a.popisy("detbody")[1]);

  const b = app({ hry: [cizi] });
  b.i18n.I18N.en["stitek.j"] = "one";
  b.prepni("en");
  b.doHistorie();
  ok(b.popisy("detbody")[0] === "something else entirely",
     "kolo v původním jazyce přepnutí nemění: " + b.popisy("detbody")[0]);
}

console.log("F) záloha veze obojí");
{
  const stara = hra("s1", [{ p: 150, bust: false, d: "jednička" + T + "pětka" }]);
  const a = app({ hry: [stara] });
  a.jednicka(); a.klik(a.$("bank"));
  a.klik(a.$("arch"));                 /* nová hra do historie, ta nese kódy */
  a.klik(a.$("setbtn"));
  a.klik(a.$("expbtn"));
  const text = await a.w.__blob.text();
  ok(/\(jednička · pětka\)/.test(text), "starý záznam se v rozpisu čte česky");
  ok(text.split("\n").filter(l => l.startsWith("#DATA:")).length === 1, "právě jeden datový řádek");
  const data = JSON.parse(text.slice(text.lastIndexOf("#DATA:") + 6));
  const kody = data.map(g => g.turns[0].c !== undefined ? "c" : "d").sort().join("");
  ok(kody === "cd", "datový řádek veze u nové hry c a u staré d: " + kody);
}

console.log("G) import obou tvarů");
{
  const stary = '#DATA:[{"id":"i1","savedAt":1,"mode":"points","goal":4000,"banked":150,' +
                '"turns":[{"p":150,"bust":false,"d":"jednička \\u00B7 pětka"}]}]';
  const a = app();
  await a.soubor(stary);
  a.klik(a.$("impadd"));
  ok(a.hist().length === 1 && a.hist()[0].turns[0].d === "jednička" + T + "pětka",
     "starý soubor se naimportoval beze změny tvaru");
  a.doHistorie();
  ok(a.popisy("detbody")[0] === "jednička" + T + "pětka",
     "a čte se česky: " + a.popisy("detbody")[0]);

  const novy = '#DATA:[{"id":"i2","savedAt":1,"mode":"points","goal":4000,"banked":150,' +
               '"turns":[{"p":150,"bust":false,"c":"j|p"}]}]';
  const b = app();
  await b.soubor(novy);
  b.klik(b.$("impadd"));
  ok(b.hist()[0].turns[0].c === "j|p", "nový soubor si nese kódy: " + b.hist()[0].turns[0].c);
  b.doHistorie();
  ok(b.popisy("detbody")[0] === "jednička" + T + "pětka",
     "a vykreslí se stejně: " + b.popisy("detbody")[0]);
}

console.log("H) rozehraná hra uložená starší verzí");
{
  const zaklad = { mode: "points", goal: 4000, roundGoal: null, banked: 0, turns: [] };
  const sPolozkou = it => Object.assign({}, zaklad, { rolls: [{ thrown: 6, hot: false, items: [it] }] });

  const a = app({ stav: sPolozkou({ l: "postupka 1\u20136", p: 1500, d: 6 }) });
  ok(a.stav().rolls[0].items[0].k === "s16", "text položky se rozebral na kód: " +
     JSON.stringify(a.stav().rolls[0].items[0]));
  ok(a.stitky()[0] === "postupka 1\u20136", "a vykreslí se beze změny: " + a.stitky()[0]);
  a.klik(a.$("bank"));
  ok(a.stav().turns[0].c === "s16", "zapsané kolo je v kódech: " + a.stav().turns[0].c);

  const b = app({ stav: sPolozkou({ l: "dvě", p: 100, d: 1 }) });
  ok(b.stitky()[0] === "dvě", "nerozebratelná položka si veze text: " + b.stitky()[0]);
  b.klik(b.$("bank"));
  ok(b.stav().turns[0].c === undefined && b.stav().turns[0].d === "dvě",
     "a kolo se raději zapíše textem: " + JSON.stringify(b.stav().turns[0]));

  const c = app({ stav: sPolozkou({ p: 100, d: 1 }) });
  ok(c.stav().rolls[0].items[0].k === "v" && c.stitky()[0] === "vlastní",
     "položka bez štítku propadne na vlastní: " + c.stitky()[0]);
}

console.log("I) počet hodů se rekonstruuje z obou tvarů");
{
  const kolo = c => ({ p: 300, bust: false, c });
  const stare = d => ({ p: 300, bust: false, d });
  const a = app({ hry: [
    hra("h1", [kolo("j|p|j")]),
    hra("h2", [stare("jednička" + T + "pětka")], { savedAt: Date.UTC(2026, 6, 2, 10, 0) })
  ] });
  const hodnota = jmeno => {
    const r = [...a.$("statlist").querySelectorAll(".strow")]
      .find(b => b.querySelector(".sn").firstChild.textContent.trim() === jmeno);
    return r ? r.querySelector(".sv").textContent : null;
  };
  ok(hodnota("Nejvíc hodů v jednom kole") === "3", "tři úseky v c jsou tři hody: " +
     hodnota("Nejvíc hodů v jednom kole"));

  const b = app({ hry: [hra("h3", [{ p: 0, bust: true, c: "j" }])] });
  const r = [...b.$("statlist").querySelectorAll(".strow")]
    .find(x => x.querySelector(".sn").firstChild.textContent.trim() === "Nejvíc hodů v jednom kole");
  ok(r.querySelector(".sv").textContent === "2",
     "u farklu se přičítá prohraný hod: " + r.querySelector(".sv").textContent);
}

console.log("J) rozbor kola na jednotlivé hody — Nejlepší hod a Průměrný hod");
{
  const S = " ";
  /* g1, kolo1: dva cykly horkých kostek za sebou — 6×1 (8000), pak zase
     šest kostek 6×2 (1600, horké znovu), pak jedna zbylá jednička (100).
     Naivní součet „kept od začátku kola" by u třetího hodu spočítal
     zbytek jako záporné číslo; správně se po druhém horkém resetu vrací
     na plný počet podruhé. */
  const g1 = hra("g1", [
    { p: 9700, bust: false, c: "n61|n62|j" },
    { p: 600,  bust: false, c: "n35|j" },      // 500 (3 kostky), pak 100 ze zbylých tří
    { p: 50,   bust: true,  c: "p" }           // pětka na stole, pak farkle na zbylých pěti
  ]);
  /* g2: jedno kolo s ruční položkou "v" (nedá se rozebrat — celé kolo se
     z Nejlepší hod/Průměrný hod jen vynechá), druhé kolo normální. */
  const g2 = hra("g2", [
    { p: 100, bust: false, c: "v" },
    { p: 100, bust: false, c: "j" }
  ], { savedAt: Date.UTC(2026, 6, 2, 10, 0) });

  const a = app({ hry: [g1, g2] });
  const radek = jmeno => [...a.$("statlist").querySelectorAll(".strow")]
    .find(b => b.querySelector(".sn").firstChild.textContent.trim() === jmeno);
  const hodnota = jmeno => { const r = radek(jmeno); return r ? r.querySelector(".sv").textContent : null; };

  ok(hodnota("Nejlepší hod") === "8" + S + "000", "šest jedniček je 8000: " + hodnota("Nejlepší hod"));
  /* Čitatel i jmenovatel pocházejí z TÉHOŽ výčtu hodů, jinak by se dlaždice
     a hlavička jejího žebříčku nemohly shodnout. Kolo, které se rozebrat
     nedá, se proto vynechá celé — z bodů i z počtu hodů.
     g1: 8000+1600+100 | 500+100 | 50+0 = 10350 bodů v 3+2+2 = 7 hodech
         (prohraný hod farklu se počítá, přinese nula bodů; jeho 50 se
         nebankuje, ale hod je odložil, takže do součtu patří).
     g2: kolo s "v" vypadává celé, zbývá 100 bodů v 1 hodu.
     pool: (10350+100) / (7+1) = 10450 / 8 = 1306,25 -> 1306 */
  ok(hodnota("Průměrný hod — celkem") === "1" + S + "306",
     "pooled průměr přes rozebratelné hody obou her: " + hodnota("Průměrný hod — celkem"));

  a.klik(radek("Nejlepší hod"));
  const bunky = () => [...a.$("detbody").querySelectorAll("tbody td.g")].map(td => td.textContent);
  ok(bunky()[0] === "8" + S + "000", "žebříček seřazený od nejlepšího hodu: " + bunky().join(" "));
  ok(bunky().length === 8,
     "osm rozebratelných hodů (kolo s \"v\" v g2 do žebříčku nepřispělo): " + bunky().length);

  a.klik(a.$("detbody").querySelector('.chip[data-k="3"]'));
  ok(bunky().join("|") === "100", "filtr na 3 kostky nechá jen zbylou jedničku po trojici pětek: " + bunky().join(" "));

  a.klik(a.$("detbody").querySelector('.chip[data-k=""]'));
  ok(bunky().length === 8, "chip \"Vše\" vrátí celý žebříček zpátky: " + bunky().length);

  /* Jádro věci: dlaždice a hlavička jejího žebříčku musí říkat totéž číslo.
     Dokud dlaždice počítala banked/hodů a hlavička součet rozebraných hodů,
     lišily se pokaždé, když v některém kole propadly body farklem. */
  const b = app({ hry: [g1, g2] });
  const dlazdice = [...b.$("statlist").querySelectorAll(".strow")]
    .find(x => x.querySelector(".sn").firstChild.textContent.trim() === "Průměrný hod — celkem");
  const zDlazdice = dlazdice.querySelector(".sv").textContent;
  b.klik(dlazdice);
  const zHlavicky = b.$("detbody").querySelector(".detsum b").textContent;
  ok(zDlazdice === zHlavicky && zDlazdice === "1" + S + "306",
     "dlaždice a hlavička žebříčku dávají stejné číslo: " + zDlazdice + " vs " + zHlavicky);

  /* a s filtrem počtu kostek se hlavička přepočítá jen nad zobrazenými hody */
  b.klik(b.$("detbody").querySelector('.chip[data-k="3"]'));
  ok(b.$("detbody").querySelector(".detsum b").textContent === "100",
     "pod filtrem počítá hlavička jen ze zobrazených hodů: " +
     b.$("detbody").querySelector(".detsum b").textContent);
}

/* Rozbor kola napřímo, bez jsdom. Přes aplikaci se dá ověřit jen výsledek
   žebříčku; tady jde vidět i `thrown` u každého hodu, což je ta část, kterou
   se nejsnáz rozbije — dopočítává se heuristikou z popisu kola, ne z dat. */
console.log("K) rozlozKolo/rozlozPolozku napřímo ze zdroje");
{
  const kcd = zPresetu("kcd2");     // šest kostek, x2 nad trojicí
  const pet = zPresetu("pet");      // pět kostek, násobek
  const kolo = (t, rez) => rozlozKolo(t, rez || kcd);
  const zapis = h => h === null ? "null" : h.map(x => x.thrown + ":" + x.p).join(" ");

  ok(zapis(kolo({ p:100, bust:false, c:"j" })) === "6:100",
     "první hod jde vždycky všemi kostkami režimu: " + zapis(kolo({ p:100, bust:false, c:"j" })));

  /* dva hody po sobě, ubývá po jedné kostce */
  ok(zapis(kolo({ p:200, bust:false, c:"j|j" })) === "6:100 5:100",
     "druhý hod jde zbytkem: " + zapis(kolo({ p:200, bust:false, c:"j|j" })));

  /* horké kostky: hod, který spotřeboval všechny, vrací na plný počet —
     a platí to i podruhé za sebou v témž kole */
  const horke = kolo({ p:9700, bust:false, c:"n61|n62|j" });
  ok(zapis(horke) === "6:8000 6:1600 6:100",
     "dvakrát po sobě horké kostky vrací na šest: " + zapis(horke));

  /* farkle nenese v popisu položku — hod navíc se dopočítá ze zbytku */
  const farkle = kolo({ p:50, bust:true, c:"p" });
  ok(zapis(farkle) === "6:50 5:0",
     "prohraný hod farklu se dopočítá ze zbytku: " + zapis(farkle));
  ok(zapis(kolo({ p:0, bust:true, c:"" })) === "6:0",
     "farkle prvním hodem je jediný prázdný hod: " + zapis(kolo({ p:0, bust:true, c:"" })));
  ok(zapis(kolo({ p:8000, bust:true, c:"n61" })) === "6:8000 6:0",
     "farkle po horkých kostkách hází zase všemi: " + zapis(kolo({ p:8000, bust:true, c:"n61" })));

  /* pětikostkový režim počítá od pěti a jinak extrapoluje (násobek, ne x2) */
  ok(zapis(kolo({ p:1000, bust:false, c:"n51" }, pet)) === "5:3000",
     "pět jedniček v pětikostkovém režimu: " + zapis(kolo({ p:1000, bust:false, c:"n51" }, pet)));

  /* co se rozebrat nedá */
  ok(kolo({ p:100, bust:false, c:"v" }) === null, "ruční položka \"v\" shodí celé kolo na null");
  ok(kolo({ p:100, bust:false, c:"j,zzz" }) === null, "neznámý kód taky");
  ok(rozlozKolo({ p:100, bust:false, c:"j" }, null) === null, "chybějící režim taky");
  ok(zapis(kolo({ p:100, bust:false, d:"jednička" })) === "6:100",
     "starý textový popis se přeloží na kódy: " + zapis(kolo({ p:100, bust:false, d:"jednička" })));
  ok(kolo({ p:100, bust:false, d:"něco, čemu nerozumím" }) === null,
     "nepřeložitelný textový popis je null");

  /* jednotlivé položky: čtyři tvary kódu, které se v historii vyskytují */
  const pol = k => { const r = rozlozPolozku(k, kcd); return r ? r.p + "/" + r.d : "null"; };
  ok(pol("j") === "100/1" && pol("p") === "50/1", "samostatná jednička a pětka: " + pol("j") + " " + pol("p"));
  ok(pol("d3") === "0/1", "trojka samostatně v KCD neboduje, ale kostku bere: " + pol("d3"));
  ok(pol("n35") === "500/3", "tři pětky: " + pol("n35"));
  ok(pol("s16") === "1500/6", "postupka 1–6: " + pol("s16"));
  ok(pol("c3p") === "500/6", "tři dvojice berou sazbu presetu: " + pol("c3p"));
  ok(pol("k1500x5") === "1500/5", "vlastní kombinace veze body i kostky v kódu: " + pol("k1500x5"));
  ok(pol("v") === "null" && pol("nic") === "null", "\"v\" ani neznámý kód nejdou rozebrat");
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
