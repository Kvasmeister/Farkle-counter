import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
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

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
