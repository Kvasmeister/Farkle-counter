import { JSDOM } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const tik = () => new Promise(r => setTimeout(r, 0));
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

function app(seed){
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/",
    beforeParse(w){
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      if(seed) seed(w);
    } });
  const w = dom.window, d = w.document;
  const $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return { w, d, $, klik,
    kolo(){ klik(d.querySelector('[data-single="1"]')); klik($("bank")); },
    /* jsdom nemá layout, ale <details> umí — klepnutí na hlavičku ho otevře */
    rozbal(id){ klik($(id).querySelector("summary")); },
    sekce(){ return [...d.querySelectorAll("#setmodal .setsec")]; },
    /* Okno má tři karty: přepínače na první, kombinace na druhé, zálohy
       a zabrané místo na třetí. */
    karta(){ return $("setcardobecne"); },
    kartaZaloh(){ return $("setcardzalohy"); },
    karty(){ return [...d.querySelectorAll("#setmodal .setcard")]; },
    naKartu(i){ klik($("setseg").children[i]); },
    nova(){ klik($("reset")); klik($("reset")); if(!$("newmodal").hidden) klik($("newdrop")); } };
}

console.log("A) nahoře přepínače bez podmnožin");
{
  const a = app();
  /* Přepínače a harmonika koše sedí na první kartě; „hlavní úroveň“ je od
     rozdělení okna na tři karty právě ona, ne rovnou .modalbody. Záloha
     historie a zabrané místo se přesunuly na kartu Zálohy. */
  const telo = a.karta();
  const deti = [...telo.children];
  const radky = deti.filter(x => x.classList.contains("setrow"));
  /* fullscreen i nezhasínání se v jsdom odstraní samy — ani jedno API tam
     není. Zbývá jazyk a automatické ukládání; ani jedno na prohlížeči
     nezávisí, takže ta dvojice zbude vždycky. */
  ok(a.$("fsrow") === null && a.$("svitrow") === null, "řádky bez podpory prohlížeče zmizely");
  ok(radky.length === 2 && radky[0] === a.$("jazykrow") && radky[1] === a.$("autorow"),
     "zbylé přepínače jsou na hlavní úrovni a v pořadí jazyk, ukládání; řádků " + radky.length);
  ok(deti.indexOf(a.$("jazykrow")) === 0, "jazyk je úplně první řádek karty");
  ok(a.$("jazykrow").contains(a.$("jazyksel")), "a přepínač sedí uvnitř něj");
  ok(!telo.contains(a.$("mistorow")) && !telo.contains(a.$("seczal")),
     "zabrané místo i záloha historie se přestěhovaly na kartu Zálohy");
  ok(a.$("autorow").parentNode === telo, "a nesedí uvnitř žádného oddílu");
  ok(deti.indexOf(a.$("autorow")) < deti.indexOf(a.$("seckos")),
     "přepínače jsou nad harmonikou");
}

console.log("A2) okno je rozdělené na tři karty");
{
  const a = app();
  const telo = a.$("setmodal").querySelector(".modalbody");
  const deti = [...telo.children];
  ok(deti[0] === a.$("setseg"), "přepínač karet je úplně nahoře");
  ok(a.$("setseg").children.length === 3, "má tři tlačítka, je " + a.$("setseg").children.length);
  ok(a.karty().length === 3 && a.karty()[0] === a.$("setcardobecne") &&
     a.karty()[1] === a.$("setcardrezimy") && a.karty()[2] === a.$("setcardzalohy"),
     "karty jsou tři, obecná první, zálohy poslední");
  ok(!a.$("setcardobecne").hidden && a.$("setcardrezimy").hidden && a.$("setcardzalohy").hidden,
     "vidět je jen ta první");
  ok(a.$("setseg").children[0].classList.contains("on") && !a.$("setseg").children[1].classList.contains("on") &&
     !a.$("setseg").children[2].classList.contains("on"),
     "a její tlačítko je zvýrazněné");
  /* kombinace patří výhradně na druhou kartu */
  ok(a.$("setcardrezimy").contains(a.$("komblist")) && a.$("setcardrezimy").contains(a.$("kombpridat")),
     "kombinace sedí na druhé kartě");
  /* harmonika se dnes dělí mezi první kartu (koše) a třetí (zálohy) */
  ok(["seckos", "seckoshist"].every(id => a.$("setcardobecne").contains(a.$(id))),
     "koše sedí na první kartě");
  ok(["seczalplna", "seczal", "seczalrez"].every(id => a.$("setcardzalohy").contains(a.$(id))),
     "zálohy sedí na třetí kartě");
  ok(!a.d.querySelector("#komblist").closest("details"), "kombinace už nejsou v žádném oddílu");

  a.naKartu(1);
  ok(a.$("setcardobecne").hidden && !a.$("setcardrezimy").hidden && a.$("setcardzalohy").hidden,
     "klepnutí na Herní režimy přepne kartu");
  ok(!a.$("setseg").children[0].classList.contains("on") && a.$("setseg").children[1].classList.contains("on") &&
     !a.$("setseg").children[2].classList.contains("on"),
     "zvýraznění jde s ní");
  a.naKartu(2);
  ok(a.$("setcardobecne").hidden && a.$("setcardrezimy").hidden && !a.$("setcardzalohy").hidden,
     "klepnutí na Zálohy přepne na třetí kartu");
  ok(!a.$("setseg").children[1].classList.contains("on") && a.$("setseg").children[2].classList.contains("on"),
     "a zvýraznění jde i sem");
  a.naKartu(0);
  ok(!a.$("setcardobecne").hidden && a.$("setcardrezimy").hidden && a.$("setcardzalohy").hidden,
     "a zpátky taky");

  /* okno začíná vždycky na první kartě, stejně jako se sbalenou harmonikou */
  a.naKartu(2);
  a.klik(a.$("setmodal").querySelector(".modalx"));
  a.klik(a.$("setbtn"));
  ok(!a.$("setcardobecne").hidden && a.$("setcardrezimy").hidden && a.$("setcardzalohy").hidden,
     "po dalším otevření je zase na první");
}

console.log("A3) karta Herní režimy má seznam a detail jako podstránky");
{
  const a = app();
  a.klik(a.$("setbtn"));
  a.naKartu(1);
  ok(!a.$("rezlist").hidden && a.$("rezdetail").hidden, "otevírá se seznamem");
  ok(a.$("rezrows").children.length === 3, "tři přednastavené režimy: " + a.$("rezrows").children.length);
  ok(a.$("reznazev").textContent.length > 0, "odznak na přepínači karet nese název zvoleného režimu: " +
     a.$("reznazev").textContent);
  /* kombinace bydlí až v detailu, ne rovnou na kartě; stavba jednoho vzoru
     je o patro níž, v editoru kombinace */
  ok(a.$("rezdetail").contains(a.$("komblist")) && a.$("rezdetail").contains(a.$("kombnovy")),
     "kombinace patří do detailu jednoho režimu");
  ok(a.$("kombdetail").contains(a.$("kombpridat")) && a.$("kombdetail").hidden,
     "stavba vzoru patří do editoru kombinace a ten je zavřený");

  const upravit = a.d.querySelector('[data-rezim="kcd2"]').querySelectorAll(".setbtns button")[1];
  a.klik(upravit);
  ok(a.$("rezlist").hidden && !a.$("rezdetail").hidden, "Upravit otevře detail");
  a.klik(a.$("rezback"));
  ok(!a.$("rezlist").hidden && a.$("rezdetail").hidden, "Zpět vede na seznam");

  /* okno začíná vždycky na seznamu, stejně jako na první kartě */
  a.klik(a.d.querySelector('[data-rezim="kcd2"]').querySelectorAll(".setbtns button")[1]);
  a.klik(a.$("setmodal").querySelector(".modalx"));
  a.klik(a.$("setbtn"));
  a.naKartu(1);
  ok(!a.$("rezlist").hidden && a.$("rezdetail").hidden, "po dalším otevření je zase na seznamu");
}

console.log("B) pět oddílů, sbalené a se správnými názvy");
{
  const b = app();
  const s = b.sekce();
  ok(s.length === 5, "pět oddílů, je " + s.length);
  ok(s.map(x => x.id).join(",") === "seckos,seckoshist,seczalplna,seczal,seczalrez",
     "pořadí: " + s.map(x => x.id).join(","));
  ok(s.every(x => !x.open), "všechny sbalené");
  const nazvy = s.map(x => x.querySelector("summary span").textContent);
  ok(nazvy[0] === "Smazané rozehrané hry" && nazvy[1] === "Smazané hry z historie" &&
     nazvy[2] === "Kompletní záloha" && nazvy[3] === "Záloha historie" && nazvy[4] === "Záloha herních režimů",
     "názvy: " + nazvy.join(" / "));
  ok(b.$("seckos").contains(b.$("koslist")), "koš rozehraných je v prvním oddílu");
  ok(b.$("seckoshist").contains(b.$("koshistlist")), "koš historie je ve druhém");
  ok(b.$("seczalplna").contains(b.$("expbtnplna")) && b.$("seczalplna").contains(b.$("impbtnplna")),
     "kompletní záloha má uvnitř export i import");
  ok(b.$("seczal").contains(b.$("expbtn")) && b.$("seczal").contains(b.$("impbtn")),
     "záloha historie má uvnitř export i import");
  ok(b.$("seczalrez").contains(b.$("expbtnrez")) && b.$("seczalrez").contains(b.$("impbtnrez")),
     "záloha herních režimů má uvnitř export i import");
}

console.log("C) harmonika: otevřený je vždycky jen jeden, i napříč kartami");
{
  const c = app();
  c.rozbal("seckos");
  await tik();
  ok(c.$("seckos").open, "první oddíl se otevřel");
  /* seczal sedí dnes na jiné kartě (Zálohy) než seckos (Obecné) — exkluzivita
     harmoniky je ale globální přes celé #setmodal, takže musí zabrat i tak */
  c.naKartu(2);
  c.rozbal("seczal");
  await tik();                       /* toggle je podle specifikace asynchronní */
  ok(c.$("seczal").open, "oddíl na jiné kartě se otevřel");
  ok(!c.$("seckos").open, "a ten na první kartě se sám zavřel");
  c.naKartu(0);
  c.rozbal("seckoshist");
  await tik();
  ok(c.$("seckoshist").open && !c.$("seczal").open, "a totéž při přechodu zpátky");
}

console.log("D) otevření okna začíná vždycky se sbalenou kartou");
{
  const dd = app();
  dd.klik(dd.$("setbtn"));
  dd.naKartu(2);
  dd.rozbal("seczal");
  ok(dd.$("seczal").open, "oddíl otevřený");
  dd.klik(dd.$("setmodal").querySelector(".modalx"));
  dd.klik(dd.$("setbtn"));
  ok(dd.sekce().every(x => !x.open), "po dalším otevření je karta zase sbalená");
}

console.log("E) počty v hlavičkách oddílů");
{
  const e = app();
  e.klik(e.$("setbtn"));
  ok(e.$("koscnt").textContent === "", "prázdný koš číslo neukazuje, je " + JSON.stringify(e.$("koscnt").textContent));
  e.klik(e.$("setmodal").querySelector(".modalx"));
  e.kolo(); e.kolo();
  e.nova();
  e.klik(e.$("setbtn"));
  ok(e.$("koscnt").textContent === "1", "po první hře jednička, je " + e.$("koscnt").textContent);
  e.klik(e.$("setmodal").querySelector(".modalx"));
  e.kolo();
  e.nova();
  e.klik(e.$("setbtn"));
  ok(e.$("koscnt").textContent === "2", "po druhé dvojka, je " + e.$("koscnt").textContent);
  ok(e.$("koshistcnt").textContent === "", "druhý koš zůstal prázdný");
}

console.log("F) údaj o zabraném místě je jen jednou, na kartě Zálohy");
{
  const f = app();
  const vsechny = [...f.d.querySelectorAll(".misto")];
  ok(vsechny.length === 1, "jeden prvek, je " + vsechny.length);
  ok(!f.$("seczal").contains(vsechny[0]), "v žádném oddílu zálohy není");
  const telo = f.kartaZaloh();
  ok(vsechny[0].parentNode === telo, "je na hlavní úrovni karty Zálohy");
  ok(vsechny[0] === telo.lastElementChild || vsechny[0].nextElementSibling.id === "impfile",
     "a je úplně dole");
  ok(vsechny.every(x => x.hidden), "dokud se nerozbalilo, neukazují se");
  ok(f.$("mistorow").parentNode === telo && f.$("mistorow").contains(f.$("mistobtn")),
     "řádek s tlačítkem je taky na hlavní úrovni karty Zálohy");
}

console.log("F2) celek se počítá sám, rozpis až tlačítkem Detail");
{
  const f = app(w => {
    w.localStorage.setItem("farkle-hist-v1", JSON.stringify([
      { id:"g1", savedAt: Date.UTC(2026,0,1), mode:"points", goal:4000, roundGoal:null,
        banked:900, turns:[{p:300,bust:false,d:"jednička"},{p:600,bust:false,d:"pětka"}] },
      { id:"g2", savedAt: Date.UTC(2026,0,2), mode:"rounds", goal:4000, roundGoal:5,
        banked:400, turns:[{p:400,bust:false,d:"jednička"}] }
    ]));
    Object.defineProperty(w.navigator, "storage", { configurable:true,
      value: { estimate: () => Promise.resolve({ usage:123456, quota:5000000 }) } });
  });
  const misto = f.d.querySelector(".misto");
  f.klik(f.$("setbtn"));
  ok(f.$("mistocelkem").textContent === "Zjišťuji\u2026", "celek se hned hlásí do práce");
  await tik();
  ok(misto.hidden, "otevření nastavení rozpis nepočítá");
  ok(f.$("mistocelkem").textContent.includes("121 kB") &&
     f.$("mistocelkem").textContent.includes("4,8 MB"),
     "ale celek je tam sám od sebe: " + f.$("mistocelkem").textContent);
  ok(f.$("mistobtn").textContent === "Detail" &&
     f.$("mistobtn").getAttribute("aria-expanded") === "false",
     "tlačítko čeká zabalené");
  f.klik(f.$("mistobtn"));
  ok(f.$("mistobtn").textContent === "Počítám\u2026", "během počítání to hlásí");
  ok(f.$("mistobtn").disabled, "a podruhé klepnout nejde");
  await tik(); await tik();
  ok(!misto.hidden, "po spočítání se rozpis ukáže");
  const radky = [...misto.querySelectorAll(".ml")].map(x => x.textContent);
  ok(radky.length === 6, "šest údajů, je " + radky.length);
  ok(/^Historie: 2 hry, /.test(radky[0]), "první je historie: " + radky[0]);
  ok(/^Rozehraná hra: /.test(radky[1]), "druhá rozehraná hra sama: " + radky[1]);
  ok(/^Koše: /.test(radky[2]), "třetí jsou koše: " + radky[2]);
  ok(/^Nastavení a starší data: /.test(radky[3]), "čtvrtý zbytek klíčů: " + radky[3]);
  ok(/^Aplikace: /.test(radky[4]), "pátý je appka sama: " + radky[4]);
  ok(/^Celkem z této adresy: /.test(radky[5]), "šestý součet za adresu: " + radky[5]);
  ok(radky[5].includes("121 kB") && radky[5].includes("4,8 MB"),
     "a nese čísla z estimate(): " + radky[5]);
  ok(f.$("mistobtn").textContent === "Detail" && !f.$("mistobtn").disabled &&
     f.$("mistobtn").classList.contains("on"),
     "tlačítko se vrátí do klidu a zůstane zvýrazněné: " + f.$("mistobtn").textContent);
  f.klik(f.$("mistobtn"));
  ok(misto.hidden && !f.$("mistobtn").classList.contains("on") &&
     f.$("mistobtn").getAttribute("aria-expanded") === "false",
     "druhé klepnutí rozpis zase schová");
}

console.log("F3) bez estimate() zbyde pět údajů a další otevření začne znovu");
{
  const g = app();
  const misto = g.d.querySelector(".misto");
  g.klik(g.$("setbtn"));
  await tik();
  ok(g.$("mistocelkem").textContent === "Velikost se nedaří zjistit.",
     "celek přizná, že to nejde: " + g.$("mistocelkem").textContent);
  g.klik(g.$("mistobtn"));
  await tik(); await tik();
  const radky = [...misto.querySelectorAll(".ml")].map(x => x.textContent);
  ok(!misto.hidden && radky.length === 5, "pět údajů bez součtu za adresu, je " + radky.length);
  ok(/^Historie: zatím žádná hra/.test(radky[0]), "prázdná historie: " + radky[0]);
  ok(/^Rozehraná hra: /.test(radky[1]), "a rozehraná hra pořád změřená: " + radky[1]);
  ok(radky[2] === "Koše: prázdné", "prázdný koš to řekne rovnou, ne pár bajtů: " + radky[2]);
  ok(/^Aplikace: nedá se změřit/.test(radky[4]),
     "bez Cache API se appka nezměří, ale řádek nezmizí: " + radky[4]);
  g.klik(g.$("setmodal").querySelector(".modalx"));
  g.klik(g.$("setbtn"));
  ok(misto.hidden && g.$("mistobtn").textContent === "Detail" &&
     !g.$("mistobtn").classList.contains("on"),
     "další otevření nastavení začíná zase zabalené");
}

console.log("F4) Aplikace se počítá z vlastních cache, cizí do ní nespadnou");
{
  /* Cache API v jsdom není, tak si ho postavíme: dvě police naše, jedna cizí
     ze stejné adresy. Do součtu smí jen kostky-*. */
  const police = {
    "kostky-v9":   [400000, 20000],
    "kostky-fonty":[ 80000],
    "jinaappka-v1":[999999]
  };
  const f = app(w => {
    const cache = jmeno => ({
      keys: () => Promise.resolve(police[jmeno].map((v, i) => ({ url: jmeno + "/" + i }))),
      match: r => Promise.resolve({
        blob: () => Promise.resolve({ size: police[jmeno][+r.url.split("/")[1]] })
      })
    });
    Object.defineProperty(w, "caches", { configurable:true, value: {
      keys: () => Promise.resolve(Object.keys(police)),
      open: jmeno => Promise.resolve(cache(jmeno))
    } });
  });
  const misto = f.d.querySelector(".misto");
  f.klik(f.$("setbtn"));
  f.klik(f.$("mistobtn"));
  await tik(); await tik(); await tik(); await tik();
  const radek = [...misto.querySelectorAll(".ml")].map(x => x.textContent)
    .find(x => /^Aplikace: /.test(x));
  ok(!!radek && radek.includes("488 kB"),
     "sečetly se jen naše police, 400+20+80 kB: " + radek);
  ok(!!radek && !radek.includes("1,4 MB") && radek.includes("offline"),
     "cizí police se nepřičetla a řádek říká proč tam appka je: " + radek);
}

console.log("F5) koše hlásí počet a zbylé klíče se počítají průchodem, ne ze seznamu");
{
  const hra = { id:"k1", savedAt: Date.UTC(2026,0,1), mode:"points", goal:4000,
                roundGoal:null, banked:300, turns:[{p:300,bust:false,d:"jednička"}] };
  const f = app(w => {
    w.localStorage.setItem("farkle-kos-v1", JSON.stringify([hra]));
    w.localStorage.setItem("farkle-koshist-v1", JSON.stringify([hra, hra]));
    /* přejmenovaná historie po migraci: největší položka, kterou dřív
       rozpis vůbec neviděl */
    w.localStorage.setItem("farkle-hist-v1-zaloha", "x".repeat(20000));
    w.localStorage.setItem("cizi-appka-v1", "y".repeat(50000));
  });
  const misto = f.d.querySelector(".misto");
  f.klik(f.$("setbtn"));
  f.klik(f.$("mistobtn"));
  await tik(); await tik();
  const radky = [...misto.querySelectorAll(".ml")].map(x => x.textContent);
  const kose = radky.find(x => /^Koše: /.test(x));
  ok(/^Koše: 3 hry, /.test(kose), "tři hry v obou koších dohromady: " + kose);
  const zbytek = radky.find(x => /^Nastavení a starší data: /.test(x));
  ok(/39 kB/.test(zbytek), "záloha po migraci se do rozpisu dostala: " + zbytek);
  ok(!/1[0-9][0-9] kB/.test(zbytek), "cizí klíč bez prefixu se nepřičetl: " + zbytek);
}

console.log("G) přepínače hlásí stav, ne akci");
{
  const g = app();
  ok(g.$("auto").textContent === "Vypnuto", "výchozí stav: " + g.$("auto").textContent);
  ok(!g.$("auto").classList.contains("on"), "a není zvýrazněný");

  g.klik(g.$("auto"));
  ok(g.$("auto").textContent === "Zapnuto" && g.$("auto").classList.contains("on"),
     "po zapnutí: " + g.$("auto").textContent);
  ok(/Vypnout automatické ukládání/.test(g.$("auto").getAttribute("aria-label")),
     "aria-label pořád popisuje akci: " + g.$("auto").getAttribute("aria-label"));
  g.klik(g.$("auto"));
  ok(g.$("auto").textContent === "Vypnuto" && !g.$("auto").classList.contains("on"), "a zpátky");
}

console.log("H) obnova z koše přes rozbalený oddíl pořád funguje");
{
  const h = app();
  h.kolo(); h.kolo();
  h.nova();
  h.klik(h.$("setbtn"));
  h.rozbal("seckos");
  const radky = h.$("koslist").querySelectorAll(".setrow");
  ok(radky.length === 1, "jeden řádek k obnově, je " + radky.length);
  h.klik(radky[0].querySelector("button"));
  ok(h.$("score").textContent === "200", "hra se obnovila, skóre " + h.$("score").textContent);
  ok(h.$("setmodal").hidden, "okno se zavřelo");
  ok(h.$("koscnt").textContent === "", "a počet v hlavičce klesl na nulu");
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
