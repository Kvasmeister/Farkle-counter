import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };
const spi = ms => new Promise(r => setTimeout(r, ms));

const T = " · ";        /* oddělovač hodů v textu */
const P = " + ";             /* oddělovač položek v textu */

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
      if(opt.komb) w.localStorage.setItem("farkle-kombinace-v1", JSON.stringify(opt.komb));
      if(opt.hry)  w.localStorage.setItem("farkle-hist-v1", JSON.stringify(opt.hry));
      if(opt.stav) w.localStorage.setItem("farkle-solo-v3", JSON.stringify(opt.stav));
      w.__blob = null;
      w.URL.createObjectURL = b => { w.__blob = b; return "blob:test"; };
      w.URL.revokeObjectURL = () => {};
    } });
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return { w, d, $, klik, i18n: w.__i18n, pravidla: w.__pravidla,
    stav: () => JSON.parse(w.localStorage.getItem("farkle-solo-v3") || "{}"),
    hist: () => JSON.parse(w.localStorage.getItem("farkle-hist-v1") || "[]"),
    /* Kombinace patří od zavedení herních režimů jednomu režimu, ne aplikaci.
       Sada zkouší ten výchozí (KCD2), do kterého se starý klíč
       farkle-kombinace-v1 při startu přestěhuje.

       null znamená „do úložiště se ještě nesáhlo“. Prázdný objekt naopak
       znamená, že se sáhlo a režim je zpátky na výchozích hodnotách —
       u presetu se totiž ukládají jen odchylky, takže vypnutí poslední
       kombinace jeho záznam zase odstraní. */
    ulozeneKomb(){
      const o = JSON.parse(w.localStorage.getItem("farkle-rezimy-v1") || "null");
      if(!o) return null;
      const r = (o.p && o.p.kcd2) || {};
      return { p: r.p || {}, v: r.v || [] };
    },
    ulozeneRezimy: () => JSON.parse(w.localStorage.getItem("farkle-rezimy-v1") || "null"),
    cip: kod => d.querySelector('[data-kombi="' + kod + '"]'),
    cipy: () => [...d.querySelectorAll("[data-kombi]")],
    stitky: () => [...$("fix").querySelectorAll(".ent span")].map(x => x.textContent),
    popisy: id => [...$(id).querySelectorAll("td.d")].map(x => x.textContent),
    jednicka(){ klik(d.querySelector('[data-single="1"]')); },
    /* Nastavení je na dvou kartách, herní režimy na té druhé; kombinace bydlí
       až v detailu jednoho režimu, takže se do něj musí zajít. Bez otevření
       okna se seznam režimů nevykreslí. */
    naRezim(id){
      klik($("setbtn"));
      klik($("setseg").children[1]);
      const radek = d.querySelector('[data-rezim="' + (id || "kcd2") + '"]');
      klik(radek.querySelectorAll(".setbtns button")[1]);
    },
    naKartuKomb(){ this.naRezim("kcd2"); },
    /* podřádek řádku režimu v seznamu — počty postupek a kombinací */
    podradekRezimu(id){
      return d.querySelector('[data-rezim="' + id + '"] .t span').textContent;
    },
    /* řádek presetu: [popis] [sazba] [přepínač]; řádek vlastní kombinace:
       [popis] [přepínač] [upravit] [smazat] — pole se sazbou tam není, body
       se editují až v podstránce */
    radek: kod => $("komblist").querySelector('[data-preset="' + kod + '"]'),
    radekVzoru: id => $("kombvlastni").querySelector('[data-vzor="' + id + '"]'),
    /* Nová kombinace: tlačítko Přidat otevře editor. Kombinace vzniká rovnou
       s jedním vzorem, protože bez vzoru by neměla co bodovat. */
    novaKombinace(){ klik($("kombnovy")); },
    doEditoru(id){ klik(this.radekVzoru(id).querySelectorAll(".setbtns button")[1]); },
    zEditoru(){ klik($("kombback")); },
    bodyPole: () => $("kombbodyrow").querySelector(".kombsazba"),
    vzoryVEditoru: () => [...$("kombvzory").children],
    /* vzory v editoru: [zápis] [smazat] */
    zapisyVzoru: () => [...$("kombvzory").querySelectorAll(".t b")].map(x => x.textContent),
    prepniPreset(kod){ klik(this.radek(kod).querySelector(".setbtns button")); },
    sazbaPole: kod => this.radek(kod).querySelector(".kombsazba"),
    /* přepsání sazby v poli, ať už u presetu nebo u vzoru */
    prepis(pole, v){
      pole.value = String(v);
      pole.dispatchEvent(new w.Event("input", { bubbles: true }));
    },
    /* naťukání nového vlastního vzoru: čísla 1–6 z první řady, písmena
       "A"–"F" z druhé */
    naukej(zetony){
      zetony.forEach(z => {
        const cislo = typeof z === "number";
        const rada = cislo ? "kombpips" : "kombpism";
        const i = cislo ? z - 1 : "ABCDEF".indexOf(z);
        klik([...$(rada).children][i]);
      });
    },
    zadejBody(b){ this.prepis(this.bodyPole(), b); },
    prepni(kod){
      const s = $("jazyksel");
      s.value = kod;
      s.dispatchEvent(new w.Event("change", { bubbles: true }));
    },
    doHistorie(){ klik($("tab2")); klik($("seg").children[1]); klik($("histlist").querySelector(".grow")); },
    async soubor(text){
      const f = new w.File([text], "zaloha.txt", { type: "text/plain" });
      Object.defineProperty($("impfile"), "files", { value: [f], configurable: true });
      $("impfile").dispatchEvent(new w.Event("change"));
      await spi(60);
    } };
}

console.log("A) výchozí stav: klávesnice vypadá jako dřív");
{
  const a = app();
  ok(a.cipy().length === 5, "pět čipů kombinací je v HTML natvrdo: " + a.cipy().length);
  ok(a.cipy().every(b => b.hasAttribute("hidden")), "a všechny jsou ve výchozím stavu skryté");
  ok(a.$("strrow").className === "row", "řada nemá třídu zalomení: " + JSON.stringify(a.$("strrow").className));
  ok(a.ulozeneKomb() === null, "bez zásahu se do úložiště nic nezapisuje");
  ok(a.$("vlastnirow").hidden, "panel vlastních vzorů je prázdný a schovaný");
}

console.log("A2) čip vlastní je vždycky poslední v řadě");
{
  /* Otevírá panel pod řadou, takže mezi čipy uprostřed nepatří — a to ať je
     zapnutých kombinací kolik chce. */
  const a = app();
  ok([...a.$("strrow").children].pop() === a.$("mtoggle"),
     "bez zapnutých kombinací je poslední");
  const b = app({ komb: { p: { "2p": 250, "3p": 500, "32": 1200, "33": 2000, "42": 1500 }, v: [] } });
  const deti = [...b.$("strrow").children];
  ok(deti.pop() === b.$("mtoggle"), "se všemi pěti zapnutými taky");
  ok(deti.filter(x => !x.hidden).length === 8 && b.$("strrow").className === "row k9",
     "a řada s devíti čipy se zalomí 3 + 3 + 3: " + b.$("strrow").className);
}

console.log("B) uložení a načtení farkle-kombinace-v1");
{
  const a = app({ komb: { p: { "3p": 500, "42": 1500 }, v: [] } });
  ok(!a.cip("3p").hasAttribute("hidden") && !a.cip("42").hasAttribute("hidden"),
     "zapnuté presety jsou vidět");
  ok(a.cip("32").hasAttribute("hidden") && a.cip("33").hasAttribute("hidden"),
     "a vypnuté ne");
  ok(a.cip("3p").querySelector(".v").textContent === "500", "čip ukazuje svoji sazbu");
  ok(a.$("strrow").className === "row k6", "šest viditelných čipů se zalomí 3 + 3: " + a.$("strrow").className);

  /* poškozený a cizí obsah nesmí projít */
  const b = app({ komb: { p: { "3p": 0, "32": -5, "xx": 100 }, v: "nesmysl" } });
  ok(b.cipy().every(x => x.hasAttribute("hidden")), "nulová i záporná sazba se ignoruje");
  const c = app({ komb: "rozbito" });
  ok(c.cipy().every(x => x.hasAttribute("hidden")), "nesmysl místo objektu nic neshodí");
  const dd = app({ komb: { p: {}, v: [{ b: 1500, v: [1,1,1,5,5] }, { b: 0, v: [1,1] }, { b: 100, v: [7,9] }, "x"] } });
  ok(dd.$("vlastnirow").children.length === 1, "z rozbitého pole vzorů projde jen ten platný: " +
     dd.$("vlastnirow").children.length);
}

console.log("C) strop osmi vlastních kombinací");
{
  const devet = [];
  for(let i = 0; i < 9; i++) devet.push({ id: "v" + i, b: 100 + i, v: [1, 1] });
  const a = app({ komb: { p: {}, v: devet } });
  ok(a.$("vlastnirow").children.length === 8, "z devíti se načte osm: " + a.$("vlastnirow").children.length);
  a.naKartuKomb();
  ok(a.$("kombnovy").disabled, "tlačítko Přidat je na stropu zamčené");
  ok(!a.$("kombzprava").hidden && /8/.test(a.$("kombzprava").textContent),
     "a strop se hlásí předem: " + a.$("kombzprava").textContent);
}

console.log("D) kódy štítků v položce i v zapsaném kole");
{
  const a = app({ komb: { p: { "32": 1200 }, v: [] } });
  a.klik(a.cip("32"));
  ok(JSON.stringify(a.stav().rolls[0].items) === '[{"k":"c32","p":1200,"d":5}]',
     "preset se odloží jako kód c32: " + JSON.stringify(a.stav().rolls[0].items));
  ok(a.stitky()[0] === "trojice a dvojice", "a vykreslí se česky: " + a.stitky()[0]);
  a.klik(a.$("bank"));
  ok(a.stav().turns[0].c === "c32" && a.stav().turns[0].p === 1200,
     "zapsané kolo veze kód, ne text: " + JSON.stringify(a.stav().turns[0]));

  const b = app({ komb: { p: {}, v: [{ id: "v1", b: 1500, v: [1,1,1,5,5] }] } });
  b.klik(b.$("mtoggle"));
  b.klik(b.$("vlastnirow").children[0]);
  ok(JSON.stringify(b.stav().rolls[0].items) === '[{"k":"k1500x5","p":1500,"d":5}]',
     "vlastní vzor nese body i kostky přímo v kódu: " + JSON.stringify(b.stav().rolls[0].items));
  ok(b.stitky()[0] === "vlastní 1\u202F500 · 5 kost.", "štítek se skládá z kódu: " + b.stitky()[0]);

  /* kód se čte i tehdy, když vzor v nastavení už neexistuje */
  const c = app();
  c.w.localStorage.setItem("farkle-solo-v3", JSON.stringify({
    mode: "points", goal: 4000, banked: 0, turns: [{ p: 1500, bust: false, c: "k1500x5" }],
    rolls: [{ thrown: 6, hot: false, items: [] }] }));
  const c2 = app();
  c2.w.localStorage.setItem("farkle-hist-v1", JSON.stringify([{ id: "h1", savedAt: 1,
    mode: "points", goal: 4000, banked: 1500, turns: [{ p: 1500, bust: false, c: "k1500x5" }] }]));
  const c3 = app({ hry: [{ id: "h1", savedAt: 1, mode: "points", goal: 4000, banked: 1500,
    turns: [{ p: 1500, bust: false, c: "k1500x5|c3p" }] }] });
  c3.doHistorie();
  ok(c3.popisy("detbody")[0] === "vlastní 1\u202F500 · 5 kost." + T + "tři dvojice",
     "bez zapnutého vzoru se kód přečte pořád: " + c3.popisy("detbody")[0]);
}

console.log("E) štítky v obou jazycích");
{
  const a = app({ komb: { p: { "3p": 500, "32": 1200, "33": 2000, "42": 1500 }, v: [] } });
  a.klik(a.cip("3p"));
  a.klik(a.$("rollon"));          /* horké kostky */
  a.klik(a.cip("33"));
  ok(a.stitky().join(" | ") === "tři dvojice | dvě trojice", "česky: " + a.stitky().join(" | "));
  a.prepni("en");
  ok(a.stitky().join(" | ") === "three pairs | two triples", "anglicky: " + a.stitky().join(" | "));
  a.prepni("cs");
  ok(a.stitky().join(" | ") === "tři dvojice | dvě trojice", "a zpátky česky");

  const b = app({ komb: { p: {}, v: [{ id: "v1", b: 1500, v: [1,1,1,5,5] }] } });
  b.klik(b.$("mtoggle"));
  b.klik(b.$("vlastnirow").children[0]);
  b.prepni("en");
  ok(b.stitky()[0] === "custom 1,500 · 5 dice", "vlastní vzor anglicky: " + b.stitky()[0]);
}

console.log("F) zákaz čipu podle počtu zbývajících kostek");
{
  const a = app({ komb: { p: { "3p": 500, "32": 1200 }, v: [{ id: "v1", b: 900, v: [1,1,1] }] } });
  ok(!a.cip("3p").disabled && !a.cip("32").disabled, "na šesti kostkách jde obojí");
  a.jednicka();                    /* zbývá pět */
  ok(a.cip("3p").disabled, "šestikostková kombinace se na pěti zamkne");
  ok(!a.cip("32").disabled, "pětikostková ještě jde");
  a.jednicka(); a.jednicka();      /* zbývají tři */
  ok(a.cip("32").disabled, "a na třech se zamkne taky");
  a.klik(a.$("mtoggle"));
  ok(!a.$("vlastnirow").children[0].disabled, "tříkostkový vlastní vzor je pořád živý");
  a.jednicka();                    /* zbývají dvě */
  ok(a.$("vlastnirow").children[0].disabled, "na dvou se zamkne i on");
}

console.log("G) změna sazby nepřepíše historii");
{
  const a = app({ komb: { p: { "3p": 500 }, v: [] } });
  a.klik(a.cip("3p"));
  a.klik(a.$("bank"));
  a.klik(a.$("arch"));
  ok(a.hist().length === 1 && a.hist()[0].turns[0].p === 500,
     "hra je v historii za 500: " + JSON.stringify(a.hist()[0] && a.hist()[0].turns));

  a.naKartuKomb();
  const pole = a.radek("3p").querySelector(".kombsazba");
  pole.value = "900";
  pole.dispatchEvent(new a.w.Event("input", { bubbles: true }));
  ok(a.ulozeneKomb().p["3p"] === 900, "nová sazba se uložila: " + JSON.stringify(a.ulozeneKomb().p));
  ok(a.cip("3p").querySelector(".v").textContent === "900", "a čip ji ukazuje hned");
  ok(a.hist()[0].turns[0].p === 500, "dohraná hra si pamatuje, za kolik se tehdy hrálo: " +
     a.hist()[0].turns[0].p);
  ok(a.stav().turns[0].p === 500, "a totéž platí pro zapsané kolo rozehrané hry");
}

console.log("H) přepínač v nastavení hlásí stav, ne akci");
{
  const a = app();
  a.naKartuKomb();
  const btn = a.radek("3p").querySelector(".setbtns button");
  ok(btn.textContent === "Vypnuto" && !btn.classList.contains("on"), "vypnuto: " + btn.textContent);
  ok(btn.getAttribute("aria-label") === "Zapnout kombinaci", "akce zůstává v aria-label: " + btn.getAttribute("aria-label"));
  ok(a.radek("3p").querySelector(".kombsazba").disabled, "pole se sazbou je u vypnuté kombinace mrtvé");
  ok(!/kombinace/.test(a.podradekRezimu("kcd2")), "bez zapnuté kombinace se v seznamu režimů nic nehlásí: " + a.podradekRezimu("kcd2"));

  a.prepniPreset("3p");
  const btn2 = a.radek("3p").querySelector(".setbtns button");
  ok(btn2.textContent === "Zapnuto" && btn2.classList.contains("on"), "po klepnutí: " + btn2.textContent);
  ok(/1 kombinace navíc/.test(a.podradekRezimu("kcd2")), "a se zapnutou ano: " + a.podradekRezimu("kcd2"));
  ok(a.ulozeneKomb().p["3p"] === 500, "výchozí sazba se uložila");
  ok(!a.cip("3p").hasAttribute("hidden"), "a čip se objevil v klávesnici");

  /* upravená sazba přežije vypnutí a zapnutí v témže sezení */
  const pole = a.radek("3p").querySelector(".kombsazba");
  pole.value = "750";
  pole.dispatchEvent(new a.w.Event("input", { bubbles: true }));
  a.prepniPreset("3p");
  ok(a.ulozeneKomb().p["3p"] === undefined, "vypnutí klíč z uložení odstraní");
  a.prepniPreset("3p");
  ok(a.ulozeneKomb().p["3p"] === 750, "zapnutí vrátí upravenou sazbu, ne výchozí: " +
     a.ulozeneKomb().p["3p"]);

  /* Riziko se z řádku tří dvojic přestěhovalo do pásu na spodní hraně, kde
     platí pro celý režim a je vidět pořád. */
  ok(["3p","32","33","42"].every(k => !a.radek(k).querySelector(".riziko")),
     "u kombinací už riziko nestojí");
  ok(/6: 2,3 %/.test(a.$("rezriziko").textContent),
     "pás ho nese za celý režim, i se zapnutými třemi dvojicemi: " +
     a.$("rezriziko").textContent);
}

console.log("I) nová vlastní kombinace");
{
  const a = app();
  a.naKartuKomb();
  ok(/Zatím žádná vlastní kombinace/.test(a.$("kombvlastni").textContent),
     "seznam začíná prázdný: " + a.$("kombvlastni").textContent);
  a.novaKombinace();
  ok(!a.$("kombdetail").hidden && a.$("rezdetail").hidden,
     "Přidat otevře editor jako podstránku, ne další okno");
  ok(a.$("kombtitul").textContent === "Kombinace 1",
     "výchozí jméno je Kombinace 1: " + a.$("kombtitul").textContent);
  ok(a.$("kombnazevpole").value === "Kombinace 1", "a stojí i v poli");
  ok(a.vzoryVEditoru().length === 1 && a.zapisyVzoru()[0] === "A,A",
     "kombinace vzniká rovnou s jedním vzorem: " + a.zapisyVzoru().join(" / "));
  ok(a.vzoryVEditoru()[0].querySelector(".setbtns button").disabled,
     "poslední vzor smazat nejde — kombinace bez vzoru by neměla co bodovat");
  ok(a.bodyPole().value === "250", "a s výchozími body: " + a.bodyPole().value);

  /* stavba dalšího vzoru */
  ok(a.$("kombpridat").disabled, "bez kostek se přidat nedá");
  ok(a.$("kombzrus").disabled, "a mazat není co");
  ok(a.$("kombvzorhint").textContent === "Naťukej kostky, ze kterých se vzor skládá.",
     "místo vzoru stojí návod: " + a.$("kombvzorhint").textContent);
  a.naukej([1, 1, 1, 5, 5]);
  ok(a.$("kombvzor").textContent === "1,1,1+5,5", "zápis vzoru: " + a.$("kombvzor").textContent);
  ok(a.$("kombvzorhint").textContent === "5 kostek", "a počet kostek: " + a.$("kombvzorhint").textContent);
  ok(!a.$("kombpridat").disabled, "vzor o dvou a víc kostkách jde přidat");
  a.klik(a.$("kombpridat"));
  ok(a.zapisyVzoru().join(" / ") === "A,A / 1,1,1+5,5",
     "vzory se řadí v pořadí vzniku: " + a.zapisyVzoru().join(" / "));
  ok(a.$("kombvzor").textContent === "", "formulář se vyprázdnil");
  const ulozena = a.ulozeneKomb().v[0];
  ok(ulozena.vz.length === 2 && ulozena.vz[1].v.join("") === "11155" &&
     JSON.stringify(ulozena.vz[0].t) === "[2]",
     "a uložily se obě: " + JSON.stringify(ulozena.vz));

  /* body a jméno */
  a.zadejBody(1500);
  ok(a.ulozeneKomb().v[0].b === 1500, "body se uložily: " + a.ulozeneKomb().v[0].b);
  a.$("kombnazevpole").value = "Naše pravidlo";
  a.$("kombnazevpole").dispatchEvent(new a.w.Event("input", { bubbles: true }));
  ok(a.ulozeneKomb().v[0].n === "Naše pravidlo", "jméno taky: " + a.ulozeneKomb().v[0].n);
  ok(a.$("kombtitul").textContent === "Naše pravidlo", "a nadpis editoru jde s ním");

  /* víc než šest kostek nejde a Vymazat je sebere */
  a.naukej([2, 2, 2, 2, 2, 2, 2]);
  ok(a.$("kombvzor").textContent === "2,2,2,2,2,2", "sedmá kostka se nevejde: " + a.$("kombvzor").textContent);
  a.klik(a.$("kombzrus"));
  ok(a.$("kombvzor").textContent === "", "Vymazat sebere všechny");

  /* mazání vzoru se ptá, protože se naťukává po kostkách */
  a.klik(a.vzoryVEditoru()[0].querySelector(".setbtns button"));
  ok(a.ulozeneKomb().v[0].vz.length === 2, "první klepnutí na Smazat ještě nemaže");
  ok(/Opravdu smazat vzor/.test(a.vzoryVEditoru()[0].textContent),
     "řádek se překlopí na otázku: " + a.vzoryVEditoru()[0].textContent);
  a.klik(a.vzoryVEditoru()[0].querySelectorAll(".setbtns button")[1]);   /* Zrušit */
  ok(a.ulozeneKomb().v[0].vz.length === 2, "Zrušit otázku odvolá");
  a.klik(a.vzoryVEditoru()[0].querySelector(".setbtns button"));
  a.klik(a.vzoryVEditoru()[0].querySelectorAll(".setbtns button")[0]);   /* potvrdit */
  ok(a.zapisyVzoru().join(" / ") === "1,1,1+5,5", "druhé klepnutí vzor odstraní: " +
     a.zapisyVzoru().join(" / "));

  /* zpátky do detailu režimu */
  a.zEditoru();
  ok(!a.$("rezdetail").hidden && a.$("kombdetail").hidden, "Zpět vede do detailu režimu");
  const radek = a.radekVzoru(a.ulozeneKomb().v[0].id);
  ok(/Naše pravidlo/.test(radek.querySelector(".t b").textContent),
     "řádek nese jméno: " + radek.querySelector(".t b").textContent);
  ok(/1,1,1\+5,5/.test(radek.textContent) && /5 kostek/.test(radek.textContent),
     "a v podřádku zápis vzorů i počet kostek: " + radek.querySelector(".t span").textContent);
  ok(!radek.querySelector(".kombsazba"), "pole se sazbou v seznamu není");
  ok(/1 kombinace navíc/.test(a.podradekRezimu("kcd2")),
     "seznam režimů kombinaci počítá: " + a.podradekRezimu("kcd2"));
  ok(!a.$("vlastnirow").hidden && a.$("vlastnirow").children.length === 1,
     "a v panelu klávesnice je čip");
  ok(a.$("vlastnirow").children[0].textContent.indexOf("Naše pravidlo") === 0,
     "čip nese jméno kombinace: " + a.$("vlastnirow").children[0].textContent);
}

console.log("I2) kombinace v seznamu: stav, úprava, mazání");
{
  const a = app({ komb: { p: {}, v: [{ id: "v1", b: 1500, v: [1,1,1,5,5], z: true }] } });
  a.naKartuKomb();
  const tlac = [...a.radekVzoru("v1").querySelectorAll(".setbtns button")];
  ok(tlac.length === 3 && tlac[0].textContent === "Zapnuto" &&
     tlac[1].textContent === "Upravit" && tlac[2].textContent === "Smazat",
     "tři tlačítka: stav, Upravit, Smazat — " + tlac.map(x => x.textContent).join(", "));
  ok(tlac[0].classList.contains("on"), "přepínač hlásí zapnuto třídou on");
  ok(a.radekVzoru("v1").querySelector(".t b").textContent === "Kombinace 1",
     "starý vzor bez jména dostal výchozí: " + a.radekVzoru("v1").querySelector(".t b").textContent);

  /* vypnutí: kombinace zůstává v seznamu, ale mizí z klávesnice */
  a.klik(tlac[0]);
  ok(a.ulozeneKomb().v[0].z === false, "vypnutí se uložilo");
  ok(a.$("vlastnirow").hidden, "čip zmizel z panelu");
  ok(!/kombinace/.test(a.podradekRezimu("kcd2")), "a do počtu se nezapočítává: " + a.podradekRezimu("kcd2"));
  ok(a.radekVzoru("v1"), "v seznamu ale zůstala");
  a.klik(a.radekVzoru("v1").querySelector(".setbtns button"));
  ok(a.ulozeneKomb().v[0].z === true && !a.$("vlastnirow").hidden, "zapnutí ji vrátí");

  /* body se mění jen v editoru a historii nepřepíšou */
  a.klik(a.$("mtoggle"));
  a.klik(a.$("vlastnirow").children[0]);
  a.klik(a.$("bank"));
  a.klik(a.$("arch"));
  ok(a.hist()[0].turns[0].p === 1500, "hra je v historii za 1 500");
  a.naKartuKomb();
  a.doEditoru("v1");
  a.zadejBody(900);
  ok(a.ulozeneKomb().v[0].b === 900, "nová sazba se uložila: " + a.ulozeneKomb().v[0].b);
  ok(a.$("vlastnirow").children[0].querySelector(".v").textContent === "900",
     "čip ji ukazuje hned");
  ok(a.hist()[0].turns[0].p === 1500, "ale dohraná hra si pamatuje původní body: " +
     a.hist()[0].turns[0].p);

  /* smazání celé kombinace z editoru, dvoukrokově */
  a.klik(a.$("kombsmazrow").querySelector(".setbtns button"));
  ok(/Opravdu smazat kombinaci/.test(a.$("kombsmazrow").textContent),
     "řádek se překlopí na otázku: " + a.$("kombsmazrow").textContent);
  a.klik(a.$("kombsmazrow").querySelectorAll(".setbtns button")[0]);
  ok(a.ulozeneKomb().v.length === 0, "potvrzení kombinaci smaže");
  ok(a.$("kombdetail").hidden && !a.$("rezdetail").hidden,
     "a editor se zavře, protože nemá co ukazovat");
  ok(a.$("vlastnirow").hidden, "panel v klávesnici se schoval");
}

console.log("I3) kombinace uložená bez příznaku z se čte jako zapnutá");
{
  /* vzory uložené dřív, než přepínač existoval, se nesmějí samy vypnout */
  const a = app({ komb: { p: {}, v: [{ id: "v1", b: 1500, v: [1,1,1,5,5] }] } });
  ok(!a.$("vlastnirow").hidden && a.$("vlastnirow").children.length === 1,
     "čip je v panelu");
  a.naKartuKomb();
  ok(a.radekVzoru("v1").querySelector(".setbtns button").textContent === "Zapnuto",
     "a přepínač hlásí zapnuto");
  /* jakmile se na oddíl sáhne, dopíše se příznak i do úložiště */
  a.klik(a.radekVzoru("v1").querySelector(".setbtns button"));
  a.klik(a.radekVzoru("v1").querySelector(".setbtns button"));
  ok(a.ulozeneKomb().v[0].z === true, "po prvním zásahu se z zapíše: " +
     JSON.stringify(a.ulozeneKomb().v[0]));
}

console.log("I4) jedna kombinace, víc vzorů");
{
  /* Kombinace boduje, jakmile sedne kterýkoli z jejích vzorů, a platí pořád
     stejně. Dvojice a dvě dvojky nebo dvojice a tři trojky — jedna věc. */
  const a = app({ komb: { p: {}, v: [{ id: "v1", n: "Naše", b: 800, z: true,
    vz: [{ v: [2,2], t: [2] }, { v: [3,3,3], t: [2] }] }] } });
  const P = a.pravidla, k = P.aktRezim().v[0];
  ok(k.vz.length === 2, "obě části se načetly");
  ok(P.sediKombinace(k, P.poctyZHodu([5,5,2,2])), "sedne první vzor");
  ok(P.sediKombinace(k, P.poctyZHodu([5,5,3,3,3])), "sedne i druhý");
  ok(!P.sediKombinace(k, P.poctyZHodu([5,5,4,4,4])), "co nesedne ani jednomu, neboduje");

  a.naKartuKomb();
  ok(/A,A\+2,2 \/ A,A\+3,3,3/.test(a.radekVzoru("v1").textContent),
     "podřádek nese oba zápisy: " + a.radekVzoru("v1").querySelector(".t span").textContent);
  a.doEditoru("v1");
  ok(a.zapisyVzoru().join(" | ") === "A,A+2,2 | A,A+3,3,3",
     "editor je vypisuje pod sebe: " + a.zapisyVzoru().join(" | "));

  /* strop šesti vzorů na kombinaci */
  const sest = [];
  for(let i = 0; i < 7; i++) sest.push({ v: [1, 1], t: [i % 3 + 1] });
  const b = app({ komb: { p: {}, v: [{ id: "v1", b: 500, z: true, vz: sest }] } });
  b.naKartuKomb();
  b.doEditoru("v1");
  ok(b.vzoryVEditoru().length === 6, "ze sedmi se načte šest: " + b.vzoryVEditoru().length);
  b.naukej([4, 4]);
  ok(b.$("kombpridat").disabled, "na stropu je Přidat vzor zamčené");
  ok(!b.$("kombvzorzprava").hidden && /6/.test(b.$("kombvzorzprava").textContent),
     "a strop se hlásí předem: " + b.$("kombvzorzprava").textContent);
}

console.log("I5) volba počtu kostek u kombinace o vzorech různé velikosti");
{
  const a = app({ komb: { p: {}, v: [{ id: "v1", n: "Naše", b: 800, z: true,
    vz: [{ v: [2,2], t: [2] }, { v: [3,3,3], t: [2] }] }] } });
  a.klik(a.$("mtoggle"));
  ok(a.$("vlastnirow").children.length === 1, "kombinace je jeden čip, ne dva");
  a.klik(a.$("vlastnirow").children[0]);
  ok(a.stav().rolls[0].items.length === 0, "první klepnutí ještě neodkládá");
  const volby = [...a.$("vlastnirow").children];
  ok(volby.length === 3 && volby[1].textContent === "4 kost." && volby[2].textContent === "5 kost.",
     "řada se překlopí na volbu: " + volby.map(x => x.textContent).join(" | "));
  a.klik(volby[0]);
  ok(a.$("vlastnirow").children.length === 1 && a.stav().rolls[0].items.length === 0,
     "klepnutí na kombinaci volbu odvolá");
  a.klik(a.$("vlastnirow").children[0]);
  a.klik([...a.$("vlastnirow").children][2]);
  ok(JSON.stringify(a.stav().rolls[0].items) === '[{"k":"k800x5","p":800,"d":5}]',
     "volba odloží zvolený počet kostek: " + JSON.stringify(a.stav().rolls[0].items));

  /* Když se do zbývajících kostek vejde jen jedna velikost, neptá se. */
  const b = app({ komb: { p: {}, v: [{ id: "v1", n: "Naše", b: 800, z: true,
    vz: [{ v: [2,2], t: [2] }, { v: [3,3,3], t: [2] }] }] } });
  b.jednicka(); b.jednicka();          /* zbývají čtyři */
  b.klik(b.$("mtoggle"));
  b.klik(b.$("vlastnirow").children[0]);
  ok(b.stav().rolls[0].items.length === 3 &&
     b.stav().rolls[0].items[2].k === "k800x4",
     "jediná možnost se odloží rovnou: " + JSON.stringify(b.stav().rolls[0].items[2]));
}

console.log("J) písmena proti číslům");
{
  const a = app();
  a.naKartuKomb();
  a.novaKombinace();
  a.naukej(["A", "A", "B", "B", "C", "C"]);
  ok(a.$("kombvzor").textContent === "A,A+B,B+C,C",
     "samá písmena dají zápis se skupinami: " + a.$("kombvzor").textContent);
  ok(a.$("kombvzorhint").textContent === "6 kostek",
     "podřádek nese počet kostek: " + a.$("kombvzorhint").textContent);
  a.klik(a.$("kombpridat"));
  const vz = a.ulozeneKomb().v[0].vz[1];
  ok(JSON.stringify(vz.v) === "[]" && JSON.stringify(vz.t) === "[2,2,2]",
     "uložily se skupiny, ne hodnoty: " + JSON.stringify(vz));

  const P = a.pravidla;
  const tri = P.aktRezim().v[0].vz[1];
  const pocty = h => P.poctyZHodu(h);
  ok(P.sediVzor(tri, pocty([1,1,6,6,4,4])), "tvar sedne na jiné tři páry");
  ok(!P.sediVzor(tri, pocty([1,1,6,6,4,3])), "na dva páry ne");

  /* Na písmenech samotných nezáleží, rozhoduje jen velikost skupin. */
  const b = app();
  b.naKartuKomb();
  b.novaKombinace();
  b.naukej(["D", "D", "F", "F", "E", "E"]);
  ok(b.$("kombvzor").textContent === "A,A+B,B+C,C",
     "jiná písmena dají týž vzor: " + b.$("kombvzor").textContent);

  const c = app({ komb: { p: {}, v: [{ id: "v1", b: 500, v: [2,2,3,3,4,4] }] } });
  const Q = c.pravidla, pevny = Q.aktRezim().v[0].vz[0];
  ok(Q.sediVzor(pevny, Q.poctyZHodu([2,2,3,3,4,4])), "vzor z čísel sedne na svoje hodnoty");
  ok(!Q.sediVzor(pevny, Q.poctyZHodu([1,1,6,6,4,4])), "na jiné tři páry ne");
  ok(Q.zapisVzoru(pevny) === "2,2+3,3+4,4", "a zapisuje se hodnotami: " + Q.zapisVzoru(pevny));
}

console.log("J1) čísla a písmena v jednom vzoru");
{
  const a = app();
  a.naKartuKomb();
  a.novaKombinace();
  a.naukej(["A", "A", "B", "B", 6]);
  ok(a.$("kombvzor").textContent === "A,A+B,B+6",
     "zápis míchá skupiny a hodnoty: " + a.$("kombvzor").textContent);
  ok(a.$("kombvzorhint").textContent === "5 kostek",
     "kostky se počítají dohromady: " + a.$("kombvzorhint").textContent);
  a.klik(a.$("kombpridat"));
  const ulozeny = a.ulozeneKomb().v[0].vz[1];
  ok(JSON.stringify(ulozeny.v) === "[6]" && JSON.stringify(ulozeny.t) === "[2,2]",
     "obě části se uložily zvlášť: " + JSON.stringify(ulozeny));

  const P = a.pravidla, vz = P.aktRezim().v[0].vz[1];
  const sedne = h => P.sediVzor(vz, P.poctyZHodu(h));
  ok(sedne([2,2,4,4,6]), "dvě dvojice a šestka sednou");
  ok(sedne([2,2,4,4,6,6]), "a šestá kostka navíc nevadí");
  /* Každé písmeno bere jinou hodnotu, a jinou než čísla ve vzoru — jinak by se
     jedna šestka započítala dvakrát. */
  ok(!sedne([6,6,6,3,3]), "trojice šestek a pár trojek ne: písmena nesmějí sáhnout na šestku");
  ok(!sedne([1,1,1,5,6]), "tři jedničky jsou jen jedna skupina");
  ok(!sedne([2,2,4,4,5]), "bez šestky vzor nesedne");

  /* Čip v klávesnici, řádek v nastavení i tabulka pravidel mluví jménem
     kombinace, ne tvarem — jméno si volí hráč. */
  a.$("kombnazevpole").value = "Dvě dvojice a šestka";
  a.$("kombnazevpole").dispatchEvent(new a.w.Event("input", { bubbles: true }));
  ok(a.$("vlastnirow").children[0].textContent.indexOf("Dvě dvojice a šestka") === 0,
     "čip: " + a.$("vlastnirow").children[0].textContent);
  ok(/Dvě dvojice a šestka/.test(a.$("cardrules").textContent), "a okno pravidel taky");
  ok(/A,A\+B,B\+6/.test(a.$("cardrules").textContent),
     "pravidla za jménem sázejí i zápis vzorů");
  a.prepni("en");
  ok(a.$("vlastnirow").children[0].textContent.indexOf("Dvě dvojice a šestka") === 0,
     "jméno se nepřekládá, je to text hráče: " + a.$("vlastnirow").children[0].textContent);
}

console.log("J1b) vzor uložený se starým příznakem any");
{
  /* Vzor z dřívější verze nesl jeden příznak na celý vzor. Přečíst se musí
     tak, aby měl týž počet kostek a týž kód štítku — jinak by se rozešel se
     záznamem v historii. */
  const a = app({ komb: { p: {}, v: [{ id: "v1", b: 500, v: [2,2,3,3,4,4], any: true }] } });
  const P = a.pravidla, vz = P.aktRezim().v[0].vz[0];
  ok(JSON.stringify(vz.v) === "[]" && JSON.stringify(vz.tvar) === "[2,2,2]",
     "z hodnot se staly skupiny: " + JSON.stringify(vz.tvar));
  ok(P.zapisVzoru(vz) === "A,A+B,B+C,C", "zápis: " + P.zapisVzoru(vz));
  ok(P.sediVzor(vz, P.poctyZHodu([1,1,6,6,4,4])), "a pořád sedne na jiné tři páry");
  ok(a.$("vlastnirow").children[0].textContent.indexOf("Kombinace 1") === 0,
     "čip nese výchozí jméno: " + a.$("vlastnirow").children[0].textContent);
}

console.log("K) riziko na tlačítku Farkle");
{
  const a = app();
  ok(a.$("bustriz").textContent === "riziko 3,1 %",
     "riziko je vidět i nad prázdným hodem: " + a.$("bustriz").textContent);
  ok(!/riziko/.test(a.$("rollon").textContent), "na tlačítku hodu už není: " + a.$("rollon").textContent);
  a.jednicka();
  ok(a.$("bustriz").textContent === "riziko 7,7 %",
     "pět kostek: " + a.$("bustriz").textContent);
  a.jednicka(); a.jednicka(); a.jednicka(); a.jednicka(); a.jednicka();
  ok(a.$("bustriz").textContent === "riziko 3,1 %",
     "při horkých kostkách se počítá se šesti: " + a.$("bustriz").textContent);

  /* tři dvojice riziko na šesti kostkách mění, ostatní ne */
  const b = app({ komb: { p: { "3p": 500 }, v: [] } });
  for(let i = 0; i < 6; i++) b.jednicka();
  ok(b.$("bustriz").textContent === "riziko 2,3 %",
     "se třemi dvojicemi: " + b.$("bustriz").textContent);
  const c = app({ komb: { p: { "32": 1200, "33": 2000, "42": 1500 }, v: [] } });
  for(let i = 0; i < 6; i++) c.jednicka();
  ok(c.$("bustriz").textContent === "riziko 3,1 %",
     "zbylé tři kombinace riziko nemění: " + c.$("bustriz").textContent);
  /* Dvě dvojice trojici uvnitř nemají, takže riziko srazí už od čtyř kostek. */
  const f = app({ komb: { p: { "2p": 250 }, v: [] } });
  ok(f.$("bustriz").textContent === "riziko 0 %",
     "se dvěma dvojicemi na šesti kostkách: " + f.$("bustriz").textContent);
  f.jednicka(); f.jednicka();
  ok(f.$("bustriz").textContent === "riziko 13 %",
     "a na čtyřech: " + f.$("bustriz").textContent);

  /* V zámku je tlačítko Farkle mrtvé a riziko na něm nemá co dělat.
     Zamknout se dá i s body na stole — snížením cíle pod zapsané skóre. */
  const dd = app({ stav: { mode: "points", goal: 4000, banked: 2000,
    turns: [{ p: 2000, bust: false, c: "j" }],
    rolls: [{ thrown: 6, hot: false, items: [{ k: "j", p: 100, d: 1 }] }] } });
  ok(/riziko/.test(dd.$("bustriz").textContent), "dokud hra běží, riziko je vidět");
  dd.$("goalsel").value = "2000";
  dd.$("goalsel").dispatchEvent(new dd.w.Event("change", { bubbles: true }));
  ok(dd.$("bustriz").textContent === "", "v zámku riziko mizí: " + dd.$("bustriz").textContent);

  /* desetinná značka jde z katalogu */
  const e = app();
  e.jednicka();
  e.prepni("en");
  ok(e.$("bustriz").textContent === "risk 7.7%",
     "anglicky s tečkou a bez mezery: " + e.$("bustriz").textContent);
}

console.log("L) vlastní vzor riziko přepočítá líně");
{
  /* tři páry jako vlastní vzor: totéž, co dělá preset 3p */
  const a = app({ komb: { p: {}, v: [{ id: "v1", b: 500, v: [], t: [2,2,2] }] } });
  for(let i = 0; i < 6; i++) a.jednicka();
  ok(a.$("bustriz").textContent === "riziko 3,1 %",
     "než výčet doběhne, platí konstanta: " + a.$("bustriz").textContent);
  await spi(300);
  ok(a.$("bustriz").textContent === "riziko 2,3 %",
     "po dopočtu sedí na vlastním vzoru: " + a.$("bustriz").textContent);
  ok(a.pravidla.tabulka().join(",") === "66.7,44.4,27.8,15.7,7.7,2.3",
     "a celá tabulka: " + a.pravidla.tabulka().join(","));
}

console.log("M) záloha unese kolo s kombinací");
{
  const a = app({ komb: { p: { "3p": 500 }, v: [{ id: "v1", b: 1500, v: [1,1,1,5,5] }] } });
  a.klik(a.cip("3p"));
  a.klik(a.$("rollon"));                 /* horké kostky */
  a.klik(a.$("mtoggle"));
  a.klik(a.$("vlastnirow").children[0]);
  a.klik(a.$("bank"));
  a.klik(a.$("arch"));
  a.naKartuKomb();
  a.klik(a.$("expbtn"));
  const text = await a.w.__blob.text();
  /* v čitelné části exportu je úzká mezera nahrazená obyčejnou, v datovém
     řádku i na obrazovce zůstává */
  ok(/tři dvojice · vlastní 1 500 · 5 kost\./.test(text),
     "čitelný rozpis nese obojí: " + (text.match(/\(.*\)/) || ["—"])[0]);
  const data = JSON.parse(text.slice(text.lastIndexOf("#DATA:") + 6));
  ok(data[0].turns[0].c === "c3p|k1500x5", "datový řádek veze kódy: " + data[0].turns[0].c);

  /* import na telefon, kde žádná kombinace zapnutá není */
  const b = app();
  await b.soubor(text);
  b.klik(b.$("impadd"));
  ok(b.hist().length === 1 && b.hist()[0].turns[0].c === "c3p|k1500x5",
     "import tvar nemění: " + JSON.stringify(b.hist()[0] && b.hist()[0].turns[0]));
  b.doHistorie();
  ok(b.popisy("detbody")[0] === "tři dvojice" + T + "vlastní 1\u202F500 · 5 kost.",
     "a čte se i bez zapnutých kombinací: " + b.popisy("detbody")[0]);
}

console.log("N) strážní test: konstantní tabulky odvozené výčtem");
{
  const a = app();
  const P = a.pravidla;
  ok(P && typeof P.kindPoints === "function" && P.STRAIGHTS, "sonda s pravidly existuje");

  const pocty = hod => { const c = [0,0,0,0,0,0,0]; for(const d of hod) c[d]++; return c; };
  /* Postupka se pozná z klíče: "15" je 1–5, "26" je 2–6, "16" je 1–6. */
  const postupka = (c, klic) => {
    const od = Number(klic[0]), do_ = Number(klic[1]);
    for(let v = od; v <= do_; v++) if(!c[v]) return false;
    return true;
  };
  /* Boduje hod podle dnešních pravidel? Odvozeno z kindPoints() a STRAIGHTS,
     ne opsáno — o to tomuhle testu jde. */
  const zaklad = c => {
    if(c[1] > 0 || c[5] > 0) return true;
    for(let v = 2; v <= 6; v++) if(c[v] >= 3 && P.kindPoints(v, c[v]) > 0) return true;
    return Object.keys(P.STRAIGHTS).some(k => postupka(c, k));
  };
  function odvod(zapnute){
    const out = [];
    for(let n = 1; n <= 6; n++){
      const celkem = Math.pow(6, n), hod = new Array(n);
      let farkle = 0;
      for(let i = 0; i < celkem; i++){
        let x = i;
        for(let j = 0; j < n; j++){ hod[j] = (x % 6) + 1; x = Math.floor(x / 6); }
        const c = pocty(hod);
        if(!zaklad(c) && !zapnute.some(k => P.PRESETY[k].je(c))) farkle++;
      }
      out.push(Math.round(farkle / celkem * 1000) / 10);
    }
    return out;
  }
  ok(odvod([]).join(",") === P.RIZIKO.join(","),
     "RIZIKO sedí na dnešní pravidla: " + odvod([]).join(",") + " vs. " + P.RIZIKO.join(","));
  ok(odvod(["3p"]).join(",") === P.RIZIKO_3P.join(","),
     "RIZIKO_3P sedí na tři dvojice: " + odvod(["3p"]).join(",") + " vs. " + P.RIZIKO_3P.join(","));
  ok(odvod(["2p"]).join(",") === P.RIZIKO_2P.join(","),
     "RIZIKO_2P sedí na dvě dvojice: " + odvod(["2p"]).join(",") + " vs. " + P.RIZIKO_2P.join(","));
  ["32", "33", "42"].forEach(k => {
    ok(odvod([k]).join(",") === P.RIZIKO.join(","),
       "kombinace " + k + " riziko nemění — obsahuje trojici, která už dnes boduje");
  });
  ok(odvod(["3p", "32", "33", "42"]).join(",") === P.RIZIKO_3P.join(","),
     "čtyři bez dvou dvojic dají totéž co samotné tři dvojice");
  ok(odvod(["2p", "3p"]).join(",") === P.RIZIKO_2P.join(","),
     "tři dvojice dvě dvojice obsahují, takže zapnuté obojí nic nezmění");
  ok(odvod(["2p", "3p", "32", "33", "42"]).join(",") === P.RIZIKO_2P.join(","),
     "a všech pět dohromady taky ne");
  ok(P.RIZIKO_2P[5] === 0,
     "na šesti kostkách se s dvěma dvojicemi farkle nedá hodit: " + P.RIZIKO_2P[5]);

  /* Sazba nesmí být míň než nejlepší součet částí, jinak je tlačítko past. */
  const nejlepsiCasti = { "2p": 300, "3p": 300, "32": 1100, "33": 1600, "42": 2100 };
  ["3p", "32", "33"].forEach(k => {
    ok(P.PRESETY[k].def > nejlepsiCasti[k],
       "výchozí sazba " + k + " (" + P.PRESETY[k].def + ") je nad součtem částí " + nejlepsiCasti[k]);
  });
  ["42", "2p"].forEach(k => {
    ok(P.PRESETY[k].def < nejlepsiCasti[k],
       "kombinace " + k + " je vědomě přijatá past (" + P.PRESETY[k].def +
       " proti " + nejlepsiCasti[k] + ") — řeší ji editovatelná sazba");
  });
  ok(P.PRESETY["2p"].d === 4 && P.PRESETY["3p"].d === 6 && P.PRESETY["32"].d === 5 &&
     P.PRESETY["33"].d === 6 && P.PRESETY["42"].d === 6, "počty kostek sedí na tabulku v plánu");
}

console.log(fails ? "\nCHYB: " + fails : "\nvše prošlo");
process.exit(fails ? 1 : 0);
