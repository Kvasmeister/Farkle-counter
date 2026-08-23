/* Filtr data, lišta pod přepínačem a proklik ze žebříčku dnů.
   Časy her se skládají místním konstruktorem Date, ne přes Date.UTC —
   filtr i seskupení po dnech stojí na místní půlnoci a test by jinak
   v jiném pásmu spadl. */
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };
const S = "\u202F";

function hra(o){
  const turns = o.turns.map(p => p === "F" ? {p:0,bust:true,d:""} : {p, bust:false, d:"jednička"});
  return { id:o.id, savedAt:o.savedAt, mode:o.mode||"points", goal:o.goal||4000,
           roundGoal:o.roundGoal||null,
           banked:turns.reduce((a,t)=>a+(t.bust?0:t.p),0), turns };
}
const den = (d, h, m) => new Date(2026, 6, d, h, m).getTime();
const HRY = [
  hra({id:"g1", savedAt:den(1,10,0),  goal:2000, turns:[800,"F",700,600]}),          // 1. 7., 2100
  hra({id:"g2", savedAt:den(1,23,30), turns:[100,200]}),                             // 1. 7. těsně před půlnocí, 300
  hra({id:"g3", savedAt:den(2,0,15),  mode:"rounds", roundGoal:5, turns:[300,300,"F","F",1200]}), // 2. 7. těsně po ní, 1800
  hra({id:"g4", savedAt:den(3,12,0),  turns:[150,250,400]}),                         // 3. 7., 800
];

function app(hry, opt){
  opt = opt || {};
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true,
    url:"https://x.test/", virtualConsole: new VirtualConsole(),
    beforeParse(w){
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      if(hry) w.localStorage.setItem("farkle-hist-v1", JSON.stringify(hry));
      if(opt.rezimy) w.localStorage.setItem("farkle-rezimy-v1", JSON.stringify(opt.rezimy));
      if(opt.statfiltr) w.localStorage.setItem("farkle-statfiltr-v1", JSON.stringify(opt.statfiltr));
      w.__blob = null;
      w.URL.createObjectURL = b => { w.__blob = b; return "blob:test"; };
      w.URL.revokeObjectURL = () => {};
    } });
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
  const a = { w, d, $, klik,
    naKartu: i => klik($("seg").children[i]),
    hry: () => [...$("histlist").querySelectorAll(".grow")],
    cary: () => [...$("histlist").querySelectorAll(".dsep")].map(x => x.textContent),
    stat: n => {
      const b = [...$("statlist").querySelectorAll(".strow")]
        .find(x => x.querySelector(".sn").firstChild.textContent.trim() === n);
      return b ? b.querySelector(".sv").textContent : null;
    },
    /* Na tlačítku je krátký stálý popisek; plné znění filtru nese aria-label,
       protože se do jednoho řádku čtyř tlačítek nevejde. */
    popisek: () => $("fdatum").getAttribute("aria-label"),
    zvyraznen: () => $("fdatum").classList.contains("on"),
    popisekT: () => $("ftyp").getAttribute("aria-label"),
    popisekR: () => $("frazeni").getAttribute("aria-label"),
    zvyraznenT: () => $("ftyp").classList.contains("on"),
    zvyraznenR: () => $("frazeni").classList.contains("on"),
    popisekSR: () => $("fsrezim").getAttribute("aria-label"),
    popisekST: () => $("fstyp").getAttribute("aria-label"),
    zvyraznenSR: () => $("fsrezim").classList.contains("on"),
    zvyraznenST: () => $("fstyp").classList.contains("on"),
    /* body her tak, jak leží v seznamu, a k nim dny — na rozlišení shody */
    body: () => [...$("histlist").querySelectorAll(".grow .gv")].map(x => x.textContent),
    dny: () => [...$("histlist").querySelectorAll(".grow .gn b")]
                 .map(x => x.textContent.split(" · ")[0]),
    moznosti: () => [...$("typval").options].map(o => o.textContent),
    moznostiRezim: () => [...$("srezimval").options].map(o => o.textContent),
    statFiltrUlozeno: () => JSON.parse(w.localStorage.getItem("farkle-statfiltr-v1") || "null"),
    filtrUlozeno: () => w.localStorage.getItem("farkle-filtr-v1"),
    /* projde oknem stejnou cestou jako člověk: otevřít, přepnout, vyplnit, použít */
    datum(od, doKdy){
      klik($("fdatum"));
      klik($("dateseg").children[doKdy === undefined ? 0 : 1]);
      $("dateod").value = od;
      if(doKdy !== undefined) $("datedo").value = doKdy;
      klik($("dateok"));
    },
    /* 0 = Vše, 1 = na body, 2 = na kola; hodnota je hodnota <option> */
    typ(i, hodnota){
      klik($("ftyp"));
      klik($("typseg").children[i]);
      if(hodnota !== undefined) $("typval").value = hodnota;
      klik($("typok"));
    },
    /* stejný tvar jako typ(), ale pro filtr Statistik */
    typStat(i, hodnota){
      klik($("fstyp"));
      klik($("stypseg").children[i]);
      if(hodnota !== undefined) $("stypval").value = hodnota;
      klik($("stypok"));
    },
    /* rezim === "" znamená Vše */
    rezimStat(rezim){
      klik($("fsrezim"));
      $("srezimval").value = rezim;
      klik($("srezimok"));
    },
    razeni(i){
      klik($("frazeni"));
      klik($("sortbtns").children[i]);
    } };
  return a;
}

console.log("A) lišta filtrů");
let a = app(null);
ok(a.$("fbar").hidden, "bez jediné hry se lišta neukazuje");
ok(a.$("statlist").textContent.includes("Zatím žádná dohraná hra"), "a platí původní prázdná hláška");
a = app(HRY);
ok(!a.$("fbar").hidden, "s historií je lišta vidět");
ok(a.popisek() === "Datum" && !a.zvyraznen(), "tlačítko bez filtru říká Datum a není zvýrazněné");
ok(!!a.$("freset"), "Reset je v liště i bez zapnutého filtru");
ok(a.$("freset").textContent === "Reset" &&
   a.$("freset").getAttribute("aria-label") === "Resetovat filtry",
   "na tlačítku je krátký popisek, plné znění v aria-label: " + a.$("freset").getAttribute("aria-label"));
ok([...a.$("fbar").children].every(b => b.textContent.length <= 7),
   "popisky na tlačítkách jsou krátké, aby se vešla na jeden řádek");
a.naKartu(1);
ok(a.hry().length === 4, "nefiltrovaný seznam veze všechny čtyři hry: " + a.hry().length);

console.log("B) filtr jednoho dne");
a.datum("2026-07-01");
ok(a.hry().length === 2, "prvního července jsou dvě hry: " + a.hry().length);
ok(a.popisek() === "1. 7. 2026", "popisek nese den: " + a.popisek());
ok(a.zvyraznen(), "a tlačítko je zvýrazněné");
ok(a.cary().length === 1 && a.cary()[0] === "1. 7. 2026", "jediná dělící čára nad vším: " + a.cary().join("|"));
ok(a.$("datemodal").hidden, "okno se po použití zavřelo");

console.log("C) hranice půlnoci");
a.datum("2026-07-02");
let ids = a.hry().map(b => b.querySelector(".gv").textContent);
ok(ids.length === 1 && ids[0] === "1" + S + "800",
   "hra z 00:15 patří novému dni, ta z 23:30 předchozímu: " + ids.join("|"));

console.log("D) rozsah");
a.datum("2026-07-01", "2026-07-02");
ok(a.hry().length === 3, "rozsah je včetně obou krajních dnů: " + a.hry().length);
ok(a.popisek() === "1.\u20132. 7. 2026", "úsporný popisek rozsahu: " + a.popisek());
a.datum("2026-07-03", "2026-07-01");
ok(a.hry().length === 4, "obrácené zadání se prohodí místo chyby: " + a.hry().length);
ok(a.popisek() === "1.\u20133. 7. 2026", "a popisek je pořád vzestupný: " + a.popisek());

console.log("E) zrušení filtru");
a.datum("2026-07-01");
a.klik(a.$("freset"));
ok(a.hry().length === 4, "po zrušení jsou zpátky všechny hry: " + a.hry().length);
ok(a.popisek() === "Datum" && !a.zvyraznen(), "a tlačítko je zase bez filtru");

console.log("F) filtr přežije přepnutí karty");
a.datum("2026-07-01");
a.naKartu(0);
ok(a.stat("Odehráno her") === "2", "statistiky počítají jen vyfiltrované hry: " + a.stat("Odehráno her"));
ok(a.stat("Celkem nasbíráno bodů") === "2" + S + "400", "součet bodů taky: " + a.stat("Celkem nasbíráno bodů"));
ok(a.stat("Nejvíc her za den") === "2", "i statistika dnů: " + a.stat("Nejvíc her za den"));
a.naKartu(1);
ok(a.hry().length === 2 && a.popisek() === "1. 7. 2026", "návrat na historii filtr nezrušil");

console.log("G) prázdné stavy");
a.datum("2026-07-05");
ok(a.$("histlist").textContent.includes("Tomuhle filtru neodpovídá žádná hra"),
   "seznam her má vlastní hlášku pro filtr");
a.naKartu(0);
ok(a.$("statlist").textContent.includes("Tomuhle filtru neodpovídá žádná hra"),
   "a statistiky stejnou");
ok(!a.$("fbar").hidden, "lišta zůstává, filtr jde čím zrušit");

console.log("H) záloha filtr ignoruje");
a.datum("2026-07-01");
a.klik(a.$("setbtn"));
a.klik(a.$("expbtn"));
const text = await a.w.__blob.text();
ok(/her: 4/.test(text), "export veze všechny hry i se zapnutým filtrem");
ok(a.hry !== undefined && JSON.parse(text.split("#DATA:")[1]).length === 4, "i v datovém řádku jsou čtyři");

console.log("I) předvyplnění okna");
a = app(HRY);
a.datum("2026-07-01", "2026-07-03");
a.klik(a.$("fdatum"));
ok(!a.$("datedorow").hidden, "okno se otevře v režimu rozsahu, když rozsah platí");
a.klik(a.$("dateseg").children[0]);
ok(a.$("datedorow").hidden, "přepnutí na jeden den řádek Do zase schová");
/* Atribut hidden by nestačil: .daterow má display:flex a autorské pravidlo
   přebíjí výchozí styl prohlížeče bez ohledu na specificitu. jsdom to
   nerozliší, tak se hlídá aspoň to pravidlo samo. */
ok(/\[hidden\]\{display:none!important\}/.test(html),
   "a globální pravidlo pro hidden je v listu, jinak by se řádek stejně ukázal");
ok(a.$("dateod").value === "2026-07-01" && a.$("datedo").value === "2026-07-03",
   "s vyplněnými kraji: " + a.$("dateod").value + " – " + a.$("datedo").value);
ok(a.$("dateod").min === "2026-07-01" && a.$("dateod").max === "2026-07-03",
   "meze podle nejstarší a nejnovější hry: " + a.$("dateod").min + " – " + a.$("dateod").max);
a.klik(a.$("datezpet"));
ok(a.$("datemodal").hidden, "Zpět okno zavře");
ok(a.popisek() === "1.\u20133. 7. 2026", "a filtr nechá být");

console.log("J) proklik ze žebříčku dnů");
a = app(HRY);
const dnu = [...a.$("statlist").querySelectorAll(".strow")]
  .find(x => x.querySelector(".sn").firstChild.textContent.trim() === "Nejvíc her za den");
a.klik(dnu);
const radek = a.$("detbody").querySelector("tbody tr");
ok(!!radek && radek.classList.contains("klik"), "řádek dne je klikatelný");
ok(radek.getAttribute("role") === "button" && radek.tabIndex === 0, "a dosažitelný z klávesnice");
a.klik(radek);
ok(a.$("p2detail").hidden && !a.$("p2list").hidden, "proklik vrátí ze žebříčku na seznam");
ok(!a.$("histlist").hidden && a.$("statlist").hidden, "a přepne na kartu Historie her");
ok(a.hry().length === 2 && a.popisek() === "1. 7. 2026", "se zapnutým filtrem na ten den");

console.log("K) změna filtru staví seznam od nuly");
const MNOHO = [];
for(let i = 0; i < 60; i++) MNOHO.push(hra({id:"m"+i, savedAt:den(i < 40 ? 10 : 11, 8, i), turns:[100]}));
a = app(MNOHO);
a.naKartu(1);
ok(a.hry().length === 50, "první dávka je po padesáti: " + a.hry().length);
a.klik(a.$("histlist").querySelector(".morerow"));
ok(a.hry().length === 60, "značka dolije zbytek: " + a.hry().length);
a.datum("2026-07-11");
ok(a.hry().length === 20, "po zapnutí filtru je seznam nový, ne dopsaný: " + a.hry().length);
ok(!a.$("histlist").querySelector(".morerow"), "a značka zmizela, není co dolévat");

console.log("L) lišta se podle karty mění");
const TYPY = [
  hra({id:"t1", savedAt:den(1,9,0),  goal:2000, turns:[100]}),
  hra({id:"t2", savedAt:den(1,10,0), goal:4000, turns:[200]}),
  hra({id:"t3", savedAt:den(2,9,0),  mode:"rounds", roundGoal:5,  turns:[300]}),
  hra({id:"t4", savedAt:den(2,10,0), mode:"rounds", roundGoal:10, turns:[400]}),
  hra({id:"t5", savedAt:den(2,11,0), mode:"rounds", turns:[500]}),   // bez limitu
  hra({id:"t6", savedAt:den(3,9,0),  goal:4000, turns:[600]}),
];
a = app(TYPY);
ok(a.$("ftyp").hidden && a.$("frazeni").hidden, "na kartě Statistiky jsou v liště jen datum a reset");
a.naKartu(1);
ok(!a.$("ftyp").hidden && !a.$("frazeni").hidden, "na kartě Historie přibudou typ hry a řazení");
ok(a.popisekT() === "Typ hry" && !a.zvyraznenT(), "tlačítko bez filtru říká Typ hry");

console.log("M) nabídka hodnot se skládá z dat");
a.klik(a.$("ftyp"));
ok(a.$("typvalrow").hidden, "dokud typ nezvolíš, druhý stupeň není vidět");
a.klik(a.$("typseg").children[1]);
ok(a.moznosti().join("|") === "Všechny|2" + S + "000|4" + S + "000",
   "cíle vzestupně a bez opakování: " + a.moznosti().join("|"));
a.klik(a.$("typseg").children[2]);
ok(a.moznosti().join("|") === "Všechny|5 kol|10 kol|bez limitu",
   "limity a za nimi hry bez limitu: " + a.moznosti().join("|"));
a.klik(a.$("typzpet"));
ok(a.hry().length === 6, "Zpět filtr nezapne: " + a.hry().length);

console.log("N) filtr typu hry");
a.typ(1);
ok(a.hry().length === 3, "všechny hry na body: " + a.hry().length);
ok(a.popisekT() === "na body" && a.zvyraznenT(), "popisek bez hodnoty: " + a.popisekT());
a.typ(1, "4000");
ok(a.hry().length === 2, "jen cíl 4 000: " + a.hry().length);
ok(a.popisekT() === "do 4" + S + "000", "popisek s cílem: " + a.popisekT());
a.typ(2);
ok(a.hry().length === 3, "všechny hry na kola: " + a.hry().length);
a.typ(2, "10");
ok(a.hry().length === 1 && a.popisekT() === "na kola \u00B7 10",
   "limit deseti kol: " + a.hry().length + ", " + a.popisekT());
a.typ(2, "0");
ok(a.hry().length === 1 && a.popisekT() === "na kola \u00B7 bez limitu",
   "hry bez limitu mají vlastní položku: " + a.hry().length + ", " + a.popisekT());
a.typ(0);
ok(a.hry().length === 6 && a.popisekT() === "Typ hry" && !a.zvyraznenT(), "políčko Vše filtr vypne");

console.log("O) kombinace s datem a chování statistik");
a.typ(2);
a.datum("2026-07-02");
ok(a.hry().length === 3, "druhého července jsou tři hry na kola: " + a.hry().length);
a.typ(2, "5");
ok(a.hry().length === 1, "a s limitem pěti kol jediná: " + a.hry().length);
a.klik(a.$("ftyp"));
a.klik(a.$("typseg").children[1]);
ok(a.moznosti().length === 3, "nabídka se pod filtrem data nesmrskla: " + a.moznosti().join("|"));
a.klik(a.$("typzpet"));
a.datum("");
a.naKartu(0);
ok(a.stat("Odehráno her") === "6", "statistiky filtr typu ignorují: " + a.stat("Odehráno her"));
a.naKartu(1);
ok(a.hry().length === 1 && a.popisekT() === "na kola \u00B7 5", "seznam si ho ale drží dál");
a.klik(a.$("freset"));
ok(a.hry().length === 6 && a.popisekT() === "Typ hry", "Reset shodí i typ hry");

console.log("P) řazení");
const RAD = [
  hra({id:"r1", savedAt:den(1,9,0), turns:[300]}),
  hra({id:"r2", savedAt:den(2,9,0), turns:[100]}),
  hra({id:"r3", savedAt:den(3,9,0), turns:[200]}),
  hra({id:"r4", savedAt:den(4,9,0), turns:[100]}),   // shoda bodů s r2
];
a = app(RAD);
a.naKartu(1);
ok(a.popisekR() === "Řazení" && !a.zvyraznenR(), "výchozí řazení se na tlačítko nepíše");
ok(a.body().join("|") === "100|200|100|300",
   "výchozí je od nejnovějších: " + a.body().join("|"));
a.razeni(1);
ok(a.body().join("|") === "300|100|200|100", "od nejstarších: " + a.body().join("|"));
ok(a.popisekR() === "Od nejstarších" && a.zvyraznenR(), "a tlačítko to nese: " + a.popisekR());
a.razeni(2);
ok(a.body().join("|") === "300|200|100|100", "od nejvíc bodů: " + a.body().join("|"));
ok(a.dny().slice(2).join("|") === "4. 7. 2026|2. 7. 2026",
   "při shodě bodů je nahoře novější: " + a.dny().slice(2).join("|"));
a.razeni(3);
ok(a.body().join("|") === "100|100|200|300", "od nejmíň bodů: " + a.body().join("|"));
ok(a.dny().slice(0, 2).join("|") === "4. 7. 2026|2. 7. 2026",
   "druhotné řazení se s obráceným směrem neotáčí: " + a.dny().slice(0, 2).join("|"));

console.log("R) čáry a reset řazení");
ok(a.cary().length === 0, "při řazení podle bodů dělící čáry mizí: " + a.cary().length);
a.razeni(0);
ok(a.cary().length === 4, "po návratu k datu jsou zpátky: " + a.cary().length);
ok(a.popisekR() === "Řazení" && !a.zvyraznenR(), "a tlačítko je zase holé");
a.razeni(2);
a.datum("2026-07-01", "2026-07-03");
ok(a.body().join("|") === "300|200|100", "řazení podle bodů platí i pod filtrem data: " + a.body().join("|"));
a.klik(a.$("freset"));
ok(a.popisekR() === "Řazení" && a.popisek() === "Datum", "Reset vrátí i řazení");
ok(a.body().length === 4 && a.cary().length === 4, "a s ním čáry i všechny hry");

/* ---------- filtr Statistik podle herního režimu a typu hry ----------
   Na rozdíl od FILTR výš je STATFILTR trvalý (localStorage) a plošný pro
   celou kartu Statistiky, i pro početní statistiky. z3 běží pod živým
   vlastním režimem, který od zápisu hry přejmenoval — nabídka má ukázat
   dnešní jméno, ne to uložené u hry. z4 běží pod režimem, který v
   REZIMY_SEED vůbec není (smazaný/nikdy neexistoval) — nabídka ho i tak
   musí nabídnout, pod jménem uloženým u hry. */
const REZIMY_SEED = { akt: "kcd2", p: {}, v: [{ id: "rlive1", nazev: "Dnešní jméno" }] };
const REZIMY_HRY = [
  hra({id:"z1", savedAt:den(10,9,0),  turns:[100,200]}),                               // kcd2, na body, cíl 4000
  hra({id:"z2", savedAt:den(10,10,0), goal:2000, turns:[300]}),                        // kcd2, na body, cíl 2000
  Object.assign(hra({id:"z3", savedAt:den(11,9,0), mode:"rounds", roundGoal:5, turns:[400]}),
                {rezim:"rlive1", rezimN:"Staré jméno"}),
  Object.assign(hra({id:"z4", savedAt:den(12,9,0), turns:[500]}),
                {rezim:"rghost1", rezimN:"Smazaný duch"})
];

console.log("S) nová lišta na kartě Statistiky");
{
  const s = app(REZIMY_HRY, { rezimy: REZIMY_SEED });
  ok(!s.$("fsrezim").hidden && !s.$("fstyp").hidden, "na kartě Statistiky jsou vidět Režim a Typ hry");
  ok(s.$("ftyp").hidden && s.$("frazeni").hidden, "a pořád ne stará Typ hry/Řazení z Historie");
  ok(s.popisekSR() === "Režim" && !s.zvyraznenSR(), "tlačítko bez filtru říká Režim: " + s.popisekSR());
  ok(s.popisekST() === "Typ hry" && !s.zvyraznenST(), "a druhé Typ hry: " + s.popisekST());
  s.naKartu(1);
  ok(!s.$("ftyp").hidden && !s.$("frazeni").hidden, "na Historii naopak přibudou Typ hry a Řazení");
  ok(s.$("fsrezim").hidden && s.$("fstyp").hidden, "a Režim/Typ hry Statistik zmizí");
}

console.log("T) filtr podle režimu — nabídka z dat");
{
  const t1 = app(REZIMY_HRY, { rezimy: REZIMY_SEED });
  t1.klik(t1.$("fsrezim"));
  ok(t1.moznostiRezim().join("|") === "Všechny|KCD|Smazaný duch|Dnešní jméno",
     "nejhranější první, smazaný pod uloženým jménem, živý pod dnešním: " + t1.moznostiRezim().join("|"));
  t1.klik(t1.$("srezimzpet"));
  ok(t1.stat("Odehráno her") === "4", "Zpět filtr nezapne: " + t1.stat("Odehráno her"));
}

console.log("U) filtr podle režimu mění statistiky plošně");
{
  const u = app(REZIMY_HRY, { rezimy: REZIMY_SEED });
  u.rezimStat("rghost1");
  ok(u.popisekSR() === "Smazaný duch" && u.zvyraznenSR(), "popisek nese jméno vybraného režimu: " + u.popisekSR());
  ok(u.stat("Odehráno her") === "1", "početní statistika se zúžila na jednu hru: " + u.stat("Odehráno her"));
  ok(u.stat("Nejhranější režim") === "Smazaný duch", "i Nejhranější režim triviálně ukazuje jen vybraný: " + u.stat("Nejhranější režim"));
  u.naKartu(1);
  ok(u.hry().length === 4, "seznam historie STATFILTR ignoruje, ukazuje všechny čtyři: " + u.hry().length);
}

console.log("V) filtr typu hry pro Statistiky je nezávislý na filtru Historie");
{
  const v = app(REZIMY_HRY, { rezimy: REZIMY_SEED });
  v.typStat(1);
  ok(v.stat("Odehráno her") === "3", "tři hry na body (z1, z2, z4): " + v.stat("Odehráno her"));
  ok(v.popisekT() === "Typ hry" && !v.zvyraznenT(), "filtr Typu na Historii zůstal netknutý: " + v.popisekT());
  v.naKartu(1);
  ok(v.hry().length === 4, "a seznam historie ukazuje pořád všechny hry: " + v.hry().length);
  v.naKartu(0);
  v.typStat(1, "4000");
  ok(v.stat("Odehráno her") === "2", "zúžení i na konkrétní cíl (z1, z4): " + v.stat("Odehráno her"));
  ok(v.popisekST() === "do 4" + S + "000", "popisek nese cíl: " + v.popisekST());
  v.typ(2);
  ok(v.popisekST() === "do 4" + S + "000" && v.zvyraznenST(),
     "opačný směr: filtr Statistik zůstal netknutý po zásahu do filtru Historie: " + v.popisekST());
  ok(v.stat("Odehráno her") === "2", "statistiky pořád ukazují dvě hry: " + v.stat("Odehráno her"));
}

console.log("W) trvalost: STATFILTR přežije restart, FILTR ne");
{
  const w1 = app(REZIMY_HRY, { rezimy: REZIMY_SEED });
  w1.datum("2026-07-10");
  w1.rezimStat("rghost1");
  ok(w1.statFiltrUlozeno().rezim === "rghost1", "uložilo se do localStorage: " + JSON.stringify(w1.statFiltrUlozeno()));
  ok(w1.filtrUlozeno() === null, "filtr Historie žádný localStorage klíč nepoužívá");

  const w2 = app(REZIMY_HRY, { rezimy: REZIMY_SEED, statfiltr: w1.statFiltrUlozeno() });
  ok(w2.popisekSR() === "Smazaný duch" && w2.zvyraznenSR(),
     "po „restartu“ appky je filtr Statistik pořád nastavený: " + w2.popisekSR());
  w2.naKartu(1);
  ok(w2.hry().length === 4 && w2.popisek() === "Datum" && !w2.zvyraznen(),
     "ale filtr Historie po restartu zase začíná od nuly");
}

console.log("X) Reset maže i filtr Statistik a ukládá vynulovaný stav");
{
  const x = app(REZIMY_HRY, { rezimy: REZIMY_SEED });
  x.rezimStat("rghost1");
  x.typStat(1);
  x.klik(x.$("freset"));
  ok(x.popisekSR() === "Režim" && !x.zvyraznenSR(), "režim je zase bez filtru: " + x.popisekSR());
  ok(x.popisekST() === "Typ hry" && !x.zvyraznenST(), "typ hry taky: " + x.popisekST());
  ok(x.stat("Odehráno her") === "4", "statistiky vidí zase všechny čtyři hry: " + x.stat("Odehráno her"));
  ok(JSON.stringify(x.statFiltrUlozeno()) === JSON.stringify({ rezim:null, typ:null, hodnota:null }),
     "vynulovaný stav se i uložil: " + JSON.stringify(x.statFiltrUlozeno()));
}

console.log("Y) filtr typu hry schová irelevantní rozdělené statistiky");
{
  const y = app(REZIMY_HRY, { rezimy: REZIMY_SEED });
  const radky = () => [...y.$("statlist").querySelectorAll(".strow")]
    .map(b => b.querySelector(".sn").firstChild.textContent.trim());
  ok(radky().length === 31, "bez filtru je vidět všech 31: " + radky().length);

  y.typStat(2);   // na kola
  const r2 = radky();
  ok(r2.length === 23, "s filtrem na kola zbyde 23 řádků: " + r2.length);
  ["Nejvíc bodů — hra na body", "Průměr na kolo — hra na body",
   "Nejméně kol v jedné hře na body", "Nejvíc kol v jedné hře na body",
   "Nejlepší kolo — hra na body", "Nejhorší kolo bez farklu — hra na body",
   "Průměrný hod — hra na body", "Nejvíc bodů ztraceno farklem — hra na body"
  ].forEach(n => ok(!r2.includes(n), "„" + n + "“ zmizelo ze seznamu"));
  ["Nejvíc bodů — celkem", "Nejvíc bodů — hra na kola", "Odehráno her",
   "Nejlepší kolo — celkem", "Nejlepší kolo — hra na kola"
  ].forEach(n => ok(r2.includes(n), "„" + n + "“ zůstalo v seznamu"));

  const capy = [...y.$("statlist").children].filter(el => el.className === "seccap");
  ok(capy.length === 5, "žádná kategorie nezůstala úplně bez řádků, pořád pět nadpisů: " + capy.length);

  y.typStat(0);
  ok(radky().length === 31, "vrácení na Vše ukáže zase všech 31: " + radky().length);
}

console.log("Z) „celkem“ zůstává napříč typy hry i pod filtrem typu");
{
  const z = app(REZIMY_HRY, { rezimy: REZIMY_SEED });
  z.typStat(2);   // na kola — v REZIMY_HRY je to jediná hra z3 (400 bodů, 1 kolo)
  ok(z.stat("Odehráno her") === "1",
     "regrese rozsahu: nedělená statistika se filtrem typu pořád zužuje: " + z.stat("Odehráno her"));

  /* Nejlepší kolo: celkem počítá přes všechny čtyři hry (max je 500 ze
     hry na body z4), „hra na kola“ jen přes z3 (400) — musí se lišit. */
  ok(z.stat("Nejlepší kolo — celkem") === "500",
     "celkem vidí i hry na body i pod filtrem: " + z.stat("Nejlepší kolo — celkem"));
  ok(z.stat("Nejlepší kolo — hra na kola") === "400",
     "hra na kola vidí jen z3: " + z.stat("Nejlepší kolo — hra na kola"));

  /* Průměrný hod: pool přes všechny čtyři hry je (300+300+400+500)/(2+1+1+1) = 300,
     pool jen přes z3 je 400/1 = 400. */
  ok(z.stat("Průměrný hod — celkem") === "300",
     "celkem je pool přes obě typy: " + z.stat("Průměrný hod — celkem"));
  ok(z.stat("Průměrný hod — hra na kola") === "400",
     "hra na kola je pool jen přes z3: " + z.stat("Průměrný hod — hra na kola"));

  z.typStat(0);
  ok(z.stat("Nejlepší kolo — celkem") === "500" && z.stat("Průměrný hod — celkem") === "300",
     "bez filtru vychází celkem stejně jako pod ním — je na typu hry nezávislé napořád");
}

console.log(fails ? "\nCHYB: " + fails : "\nVše v pořádku");
process.exit(fails ? 1 : 0);
