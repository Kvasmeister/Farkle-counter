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

function app(hry){
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true,
    url:"https://x.test/", virtualConsole: new VirtualConsole(),
    beforeParse(w){
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      if(hry) w.localStorage.setItem("farkle-hist-v1", JSON.stringify(hry));
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
    /* body her tak, jak leží v seznamu, a k nim dny — na rozlišení shody */
    body: () => [...$("histlist").querySelectorAll(".grow .gv")].map(x => x.textContent),
    dny: () => [...$("histlist").querySelectorAll(".grow .gn b")]
                 .map(x => x.textContent.split(" \u00B7 ")[0]),
    moznosti: () => [...$("typval").options].map(o => o.textContent),
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

console.log(fails ? "\nCHYB: " + fails : "\nVše v pořádku");
process.exit(fails ? 1 : 0);
