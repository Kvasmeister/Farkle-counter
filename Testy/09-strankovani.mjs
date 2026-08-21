/* Stránkování historie a žebříčku. jsdom nemá IntersectionObserver, takže se
   tady testuje ta druhá z obou cest — klepnutí na značku. To je záměr: značka
   musí fungovat i tam, kde pozorovatel není. */
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

const HODINA = 3600000, DEN = 24 * HODINA;
function hra(i, krok = HODINA){
  const turns = [];
  const kol = 3 + (i % 7);
  for(let k = 0; k < kol; k++) turns.push({ p:(k % 6 + 1) * 100, bust:false, d:"jednička" });
  return { id:"g"+i, savedAt: Date.UTC(2026,0,1) + i*krok, mode:"points",
           goal:4000, roundGoal:null,
           banked: turns.reduce((a,t)=>a+t.p, 0), turns };
}
function app(pocet, krok){
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true,
    url:"https://x.test/", virtualConsole: new VirtualConsole(),
    beforeParse(w){
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      const hry = [];
      for(let i = 0; i < pocet; i++) hry.push(hra(i, krok));
      if(pocet) w.localStorage.setItem("farkle-hist-v1", JSON.stringify(hry));
    } });
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
  return { w, d, $, klik,
    naHistorii(){ klik($("seg").children[1]); },
    naStatistiky(){ klik($("seg").children[0]); },
    radky: () => $("histlist").querySelectorAll(".grow").length,
    znacka: () => $("histlist").querySelector(".morerow"),
    zebrRadky: () => $("detbody").querySelectorAll("tbody tr").length,
    zebrZnacka: () => $("detbody").querySelector(".morerow") };
}
const KROK = 50;
/* Odehráno her a Celkem nasbíráno bodů jsou součty a rozkliknout se nedají;
   první žebříček her je čtvrtý v pořadí — Nejvíc bodů za hru. Žebříček dnů
   sedí hned druhý, pod Odehráno her. */
const PRVNI = 3, DNY = 1;

console.log("A) krátká historie žádnou značku nemá");
{
  const a = app(12);
  a.naHistorii();
  ok(a.radky() === 12, "všech dvanáct her je vidět, řádků: " + a.radky());
  ok(!a.znacka(), "pod nimi není nic k doklepnutí");
  a.naStatistiky();
  a.klik(a.$("statlist").querySelectorAll(".strow")[PRVNI]);
  ok(a.zebrRadky() === 12 && !a.zebrZnacka(), "totéž v žebříčku");
}

console.log("B) přesně na hraně dávky");
{
  const a = app(KROK);
  a.naHistorii();
  ok(a.radky() === KROK, "padesát her se vejde do první dávky");
  ok(!a.znacka(), "a značka se neukáže — není co dolévat");
}

console.log("C) dlouhá historie se dolévá po dávkách");
{
  const a = app(127);
  a.naHistorii();
  ok(a.radky() === KROK, "první dávka: " + a.radky());
  const z = a.znacka();
  ok(!!z, "pod seznamem je značka");
  ok(z.textContent.includes("Zobrazit dalších 50"), "nabízí další dávku: " + z.textContent);
  ok(z.textContent.includes("zbývá 77"), "a hlásí, kolik zbývá");
  ok(z === a.$("histlist").lastElementChild, "značka je až pod řádky");

  a.klik(z);
  ok(a.radky() === 100, "po klepnutí sto řádků: " + a.radky());
  ok(!a.d.contains(z), "spotřebovaná značka ze stránky zmizela");
  ok(a.znacka().textContent === "Zobrazit posledních 27", "poslední značka nabídne zbytek: " + a.znacka().textContent);

  a.klik(a.znacka());
  ok(a.radky() === 127, "poslední dávka je neúplná: " + a.radky());
  ok(!a.znacka(), "a značka už tam není");
}

console.log("D) pořadí zůstává od nejnovější");
{
  const a = app(127);
  a.naHistorii();
  const prvni = a.$("histlist").querySelector(".grow b").textContent;
  a.klik(a.znacka());
  const radky = [...a.$("histlist").querySelectorAll(".grow")];
  ok(radky[0].querySelector("b").textContent === prvni, "první řádek se doléváním nezměnil");
  ok(radky[50].querySelector(".gv").textContent === "2\u202F700",
     "padesátý první řádek je hra g76, skóre " + radky[50].querySelector(".gv").textContent);
}

console.log("E) návrat na seznam stránkování resetuje");
{
  const a = app(127);
  a.naHistorii();
  a.klik(a.znacka());
  ok(a.radky() === 100, "rozbaleno na sto");
  a.klik(a.$("histlist").querySelector(".grow"));
  ok(!a.$("p2detail").hidden, "otevřel se detail hry");
  a.klik(a.$("detback"));
  ok(a.radky() === KROK, "po návratu zase první dávka: " + a.radky());
}

console.log("F) přepnutí přepínače stránkování resetuje");
{
  const a = app(127);
  a.naHistorii();
  a.klik(a.znacka());
  a.naStatistiky();
  a.naHistorii();
  ok(a.radky() === KROK, "zpátky na první dávce: " + a.radky());
}

console.log("G) žebříček se dolévá stejně");
{
  const a = app(127);
  a.klik(a.$("statlist").querySelectorAll(".strow")[PRVNI]);
  ok(a.zebrRadky() === KROK, "první dávka žebříčku: " + a.zebrRadky());
  const z = a.zebrZnacka();
  ok(!!z, "značka je i tady");
  ok(z.parentNode === a.$("detbody"), "a leží pod tabulkou, ne v ní");
  ok(a.$("detbody").querySelector("tbody .morerow") === null, "do <tbody> se tlačítko nedostalo");
  a.klik(z);
  ok(a.zebrRadky() === 100, "po klepnutí sto řádků: " + a.zebrRadky());
  const cisla = [...a.$("detbody").querySelectorAll("td.n")].map(td => td.textContent);
  ok(cisla[0] === "1" && cisla[50] === "51" && cisla[99] === "100",
     "pořadová čísla navazují: " + cisla[49] + " " + cisla[50]);
  a.klik(a.$("detback"));
  a.klik(a.$("statlist").querySelectorAll(".strow")[PRVNI]);
  ok(a.zebrRadky() === KROK, "nové otevření žebříčku začíná od začátku");
}

console.log("G2) žebříček dnů se dávkuje stejně jako žebříček her");
{
  /* jedna hra na den, tedy sto dvacet sedm dnů — pro stránkování se položka
     dne chová jako kterákoli jiná */
  const a = app(127, DEN);
  a.klik(a.$("statlist").querySelectorAll(".strow")[DNY]);
  ok(a.$("dettitle").textContent === "Nejvíc her za den", "otevřel se žebříček dnů: " + a.$("dettitle").textContent);
  ok(a.zebrRadky() === KROK, "první dávka dnů: " + a.zebrRadky());
  const z = a.zebrZnacka();
  ok(!!z && z.textContent.includes("zbývá 77"), "značka hlásí zbytek: " + (z ? z.textContent : "žádná"));
  a.klik(z);
  ok(a.zebrRadky() === 100, "po klepnutí sto dnů: " + a.zebrRadky());
  const cisla = [...a.$("detbody").querySelectorAll("td.n")].map(td => td.textContent);
  ok(cisla[0] === "1" && cisla[99] === "100", "pořadová čísla navazují i tady: " + cisla[50]);
  const prvni = a.$("detbody").querySelector("tbody tr");
  ok(prvni.querySelectorAll("td").length === 4, "řádek dne má čtyři buňky včetně šipky");
  ok(!/:/.test(prvni.querySelector("td.d").textContent), "datum je bez času: " + prvni.querySelector("td.d").textContent);
  ok(prvni.querySelector("td.g").textContent === "1", "a nese počet her: " + prvni.querySelector("td.g").textContent);
}

console.log("H) import stránkování resetuje");
{
  const a = app(127);
  a.naHistorii();
  a.klik(a.znacka());
  ok(a.radky() === 100, "rozbaleno na sto");

  /* přidání jedné hry přes vložení textu */
  a.klik(a.$("setbtn"));
  a.klik(a.$("pastebtn"));
  const nova = { id:"import1", savedAt: Date.UTC(2027,0,1), mode:"points", goal:4000,
                 roundGoal:null, banked:900, turns:[{p:900,bust:false,d:"jednička"}] };
  a.$("pastearea").value = "Kostky\n#DATA:" + JSON.stringify([nova]);
  a.klik(a.$("pasteload"));
  a.klik(a.$("impadd"));
  ok(a.radky() === KROK, "po importu zase první dávka: " + a.radky());
  ok(a.$("histlist").querySelector(".gv").textContent === "900", "a nahoře je nová hra");
}

console.log("I) prázdná historie se nerozbije");
{
  const a = app(0);
  a.naHistorii();
  ok(a.$("histlist").textContent.includes("Historie je prázdná"), "hlásí prázdno");
  ok(!a.znacka(), "a žádnou značku nestaví");
}

console.log("J) po návratu ze hry do žebříčku zůstává jediný pozorovatel");
{
  /* jsdom IntersectionObserver nemá, tady si ho podstrčíme — jde jen o to,
     kolik jich najednou visí na značce. Proklik do detailu hry pozorovatele
     odpojí a návrat do žebříčku ho zakládá znovu; kdyby se staré neodpojovaly,
     přibývaly by s každým prokliknutím. */
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true,
    url:"https://x.test/", virtualConsole: new VirtualConsole(),
    beforeParse(w){
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      const hry = [];
      for(let i = 0; i < 127; i++) hry.push(hra(i));
      w.localStorage.setItem("farkle-hist-v1", JSON.stringify(hry));
      w.__io = { ziva: 0 };
      w.IntersectionObserver = class {
        constructor(){ this.zive = false; }
        observe(){ if(!this.zive){ this.zive = true; w.__io.ziva++; } }
        unobserve(){ if(this.zive){ this.zive = false; w.__io.ziva--; } }
        disconnect(){ this.unobserve(); }
        takeRecords(){ return []; }
      };
    } });
  const w = dom.window, $ = id => w.document.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", {bubbles:true}));

  klik($("statlist").querySelectorAll(".strow")[PRVNI]);
  ok(w.__io.ziva === 1, "žebříček má jednoho pozorovatele, má " + w.__io.ziva);
  klik($("detbody").querySelector("tbody tr"));
  ok(w.__io.ziva === 0, "detail hry ho odpojil, zbylo " + w.__io.ziva);
  klik($("detback"));
  ok($("dettitle").textContent === "Nejvíc bodů za hru", "Zpět vrátilo do žebříčku");
  ok(w.__io.ziva === 1, "a pozorovatel je zase právě jeden, je " + w.__io.ziva);
  klik($("detbody").querySelector("tbody tr"));
  klik($("detback"));
  klik($("detbody").querySelector("tbody tr"));
  klik($("detback"));
  ok(w.__io.ziva === 1, "ani po třech prokliknutích jich není víc, je " + w.__io.ziva);
  klik($("detback"));
  ok(w.__io.ziva === 0, "po návratu na seznam statistik nevisí žádný, je " + w.__io.ziva);
}

console.log("I) dělící čáry po dnech");
{
  /* Čára se porovnává s předchozí položkou v poli, ne s poslední vykreslenou.
     Očekávaný tvar se proto počítá ze stejných dat a stejným místním časem,
     na kterém běží aplikace — v jiné časové zóně vyjdou hranice dnů jinde,
     ale vztah mezi nimi a čarami zůstává stejný. */
  const den = ms => { const d = new Date(ms); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };
  function ocekavane(pocet, krok){
    const h = [];
    for(let i = 0; i < pocet; i++) h.push(hra(i, krok));
    h.sort((x, y) => y.savedAt - x.savedAt);
    return h.map(g => den(g.savedAt));
  }
  /* jen čáry a hry, značka „Zobrazit dalších" se vynechává */
  function tvar(a){
    return [...a.$("histlist").children]
      .filter(x => x.classList.contains("dsep") || x.classList.contains("grow"))
      .map(x => x.classList.contains("dsep") ? "|" : "h");
  }
  function sedi(a, dny){
    const t = tvar(a), cekam = [];
    dny.forEach((d, i) => { if(i === 0 || d !== dny[i - 1]) cekam.push("|"); cekam.push("h"); });
    return t.join("") === cekam.join("");
  }

  const a = app(6, DEN);
  a.naHistorii();
  const dnyA = ocekavane(6, DEN);
  ok(a.radky() === 6, "šest her v seznamu, řádků " + a.radky());
  ok(sedi(a, dnyA), "každá hra z jiného dne má vlastní čáru: " + tvar(a).join(""));
  ok(tvar(a)[0] === "|", "seznam začíná čárou nad první hrou");

  const b = app(6, HODINA);
  b.naHistorii();
  const dnyB = ocekavane(6, HODINA);
  const carB = tvar(b).filter(x => x === "|").length;
  const dnuB = new Set(dnyB).size;
  ok(carB === dnuB, "hry z jednoho dne sdílí čáru, čar " + carB + " na " + dnuB + " dnů");
  ok(sedi(b, dnyB), "a nikde mezi nimi žádná navíc: " + tvar(b).join(""));

  /* 121 her po dvanácti hodinách: nejnovější den nese jednu hru, ostatní po
     dvou. Padesátá a jedenapadesátá hra tak spadají do téhož dne, a hranice
     dávky mezi nimi nesmí čáru vyrobit. */
  const c = app(121, 12 * HODINA);
  c.naHistorii();
  const dnyC = ocekavane(121, 12 * HODINA);
  ok(tvar(c).filter(x => x === "|").length === new Set(dnyC.slice(0, KROK)).size,
     "první dávka nese jen čáry svých dnů");
  c.klik(c.znacka());
  ok(c.radky() === 2 * KROK, "po prvním doklepnutí je vidět sto her, je " + c.radky());
  while(c.znacka()) c.klik(c.znacka());
  ok(sedi(c, dnyC), "po doplnění všech dávek sedí celý tvar seznamu");
  if(dnyC[KROK] === dnyC[KROK - 1]){
    const uzly = [...c.$("histlist").children]
      .filter(x => x.classList.contains("dsep") || x.classList.contains("grow"));
    const hry = uzly.filter(x => x.classList.contains("grow"));
    const kde = uzly.indexOf(hry[KROK]);
    ok(!uzly[kde - 1].classList.contains("dsep"),
       "hra hned za hranicí dávky čáru nedostala, protože je ze stejného dne");
  } else {
    ok(true, "hranice dávky padla na předěl dnů, čára tam patří");
  }
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
