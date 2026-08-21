/* Start aplikace — jediné místo, kde je vidět pořadí.

   Modul při importu nedělá nic; všechno se spouští odsud, shora dolů.
   Dřív se vedlejší efekty spouštěly tím, že se k nim ve zdroji došlo,
   a pořadí startu bylo emergentní vlastností souboru o 6 550 řádcích.

   POŘADÍ NENÍ LIBOVOLNÉ:
     1. jazyk musí být dřív než cokoli, co volá t() — tedy prakticky
        před vším ostatním, včetně platformních přepínačů
     2. pravidla (nactiRezimy) dřív než klávesnice a vykreslení, protože
        podle režimu se řídí, které čipy vůbec existují
     3. sondy pro testy až po obojím
     4. init* moduly navěsí posluchače na hotový DOM
     5. load() na konci: dotáhne rozehranou hru a překreslí

   INVARIANT: složený skript sedí na KONCI <body>. Prvky se sbírají hned
   při načtení (ui/prvky.js), takže v <head> nebo s defer by tu byly null.
*/
import { t, tn, kat, naJazyk, nastavJazyk, sberCestinu, zjistiJazyk,
         jazyk, JAZYKY, NAZVY, VYCHOZI, I18N } from "./jazyky/jadro.js";
import { RUCNI } from "./jazyky/cs.js";
import { NAZEV_MAX, naCislo, newId } from "./spolecne.js";
import { POST_PORADI, STRAIGHTS } from "./pravidla/postupky.js";
import {
  BODY_MAX,
  PRESETY,
  PRESET_PORADI,
  VLASTNI_MAX,
  VZORU_MAX,
  cistyTvar,
  kombVRezimu,
  kombZap,
  kombinaceZap,
  pocetKombinaci,
  pocetKostekVzoru,
  poctyKostekKombinace,
  rozbalPocty,
  sazba,
  sediKombinace,
  sediVzor,
  zapisKombinace,
  zapisVzoru
} from "./pravidla/kombinace.js";
import { kindPoints } from "./pravidla/skore.js";
import {
  NAD_DRUHY,
  POCTY_STEJ,
  PRAH_ZAKLAD,
  PRESET_REZIMY,
  PRESET_REZ_PORADI,
  REZIMY,
  REZIMY_MAX,
  SAMOSTATNE_V_RADE,
  SAM_ZAKLAD,
  TROJ_ZAKLAD,
  VYCHOZI_REZIM,
  aktRezim,
  cistyRezim,
  jePreset,
  kostek,
  nactiRezimy,
  nejvyssiStej,
  novyIdRezimu,
  odchylkyRezimu,
  pocetSamostatnych,
  poctyStej,
  prahStej,
  rezimPodleId,
  sestiZap,
  stejZap,
  ulozRezimy,
  venRezim,
  zPresetu
} from "./pravidla/rezimy.js";
import {
  RIZIKO,
  RIZIKO_2P,
  RIZIKO_3P,
  naRizikoHotovo,
  poctyZHodu,
  rizikoHotovo,
  tabulkaRizika
} from "./pravidla/riziko.js";
import { nazevRezimu } from "./pravidla/rezimy.js";
import {
  DETAILY,
  HIST,
  histAll,
  histWrite,
  idb,
  klicSelhani,
  naNedostupnouHistorii,
  nactiDetail,
  pripravUloziste,
  proHistorii,
  rezim
} from "./stav/historie.js";
import {
  HODY_ODD,
  HODY_TXT,
  KKOD,
  KODY,
  NKOD,
  POLOZKY_ODD,
  POLOZKY_TXT,
  SAM_KODY,
  kodStejnych,
  kodyZPopisu
} from "./stav/kody.js";
import {
  S,
  cur,
  gameEmpty,
  kopieKola,
  left,
  load,
  makeRecord,
  naSelhaniUlozeni,
  neukladame,
  potTotal,
  rollPoints,
  save,
  snapshot,
  usedInRoll
} from "./stav/stav.js";
import {
  HKEY,
  KEY,
  KHKEY,
  KKEY,
  KOSH_MAX,
  KOS_MAX,
  kosAll,
  kosHistAll,
  kosHistWrite,
  kosWrite
} from "./stav/uloziste.js";
import {
  gBody,
  gFarkle,
  gFarklePrvni,
  gFarklePrvniRekord,
  gKol,
  gKolKCili,
  gNejhorsiKolo,
  gNejlepsiKolo,
  gNejvicHodu,
  gPrumer,
  gRezim,
  gSerie,
  gZtraceno,
  nazevRezimuZaznamu
} from "./stav/zaznam.js";
import {
  cislo,
  desetina,
  dt,
  dtDen,
  esc,
  fmt,
  fmtR,
  popisHry,
  popisTypuHry
} from "./text/format.js";
import { popisKola, stitek, textKodu } from "./text/stitky.js";
import { $, elDataSingle, elRest, elRestLabel, elScore, elTotal } from "./ui/prvky.js";
import {
  elAddKind,
  elArch,
  elBank,
  elBust,
  elBustRiz,
  elCounts,
  elDataKombi,
  elDataStr,
  elEmpty,
  elFix,
  elGoalNum,
  elGoalSel,
  elKosHistList,
  elKosList,
  elLock,
  elMToggle,
  elManual,
  elMkost,
  elMnum,
  elModeSel,
  elPips,
  elPot,
  elRollLine,
  elRollOn,
  elRoundNum,
  elRoundSel,
  elRows,
  elSingleCap,
  elSingleRow,
  elStrCap,
  elStrRow,
  elTally,
  elTallyCap,
  elTurnLabel,
  elUndo,
  elVlastniRow
} from "./ui/prvky.js";
import { bank, bust, keep, novaHra, reset, rollOn, undo } from "./akce.js";
import { AUKEY, autoZap, schovejToast, zkusAutoUlozit } from "./ui/autoulozeni.js";
import { initFiltry } from "./ui/filtry.js";
import {
  initKlavesnice,
  manualDice,
  renderKind,
  selCount,
  selValue
} from "./ui/klavesnice.js";
import { resetMisto, zajistiTrvalost } from "./ui/misto.js";
import { initNastaveni, naKartuNastaveni, syncGoalUI } from "./ui/nastaveni-obecne.js";
import {
  editRezim,
  initKartaRezimy,
  kombEdit,
  ptamSeRezim,
  ptamSeTvar,
  ptamSeVzor,
  renderRezPruh,
  renderRezimy,
  rezEdit
} from "./ui/nastaveni-rezimy.js";
import { zkontrolujNavod } from "./ui/navod.js";
import { initOkna, zavriModal } from "./ui/okna.js";
import { initKartyPravidel, prekresliPravidla } from "./ui/okno-pravidla.js";
import { initPlatforma } from "./ui/platforma.js";
import { renderP2 } from "./ui/statistiky-stranka.js";
import { initStranky } from "./ui/stranky.js";
import { render } from "./ui/vykresleni.js";
import { initZaloha, renderZaloha, renderZaloha2 } from "./ui/zaloha.js";
import {
  archive,
  fixMode,
  hlaskaNaTlacitku,
  pendingDel,
  ptamSeKos,
  ptamSeKosHist,
  renderArch,
  renderKos,
  renderRows,
  zapisHru
} from "./ui/zapis.js";
import { prepniAuto } from "./ui/autoulozeni.js";
import { pridatKostku, ubratKostku, zrusVyber } from "./ui/klavesnice.js";
import { zrusRozdelaneRezimy } from "./ui/nastaveni-rezimy.js";
import { prepniOpravy, zrusPtaniKosu } from "./ui/zapis.js";
import { initServiceWorker } from "./ui/platforma.js";
import { initUdalosti } from "./ui/udalosti.js";

(function(){
  "use strict";

  /* Pruhy o selhání úložiště jsou UI: stav i historie jen ohlásí, co se
     stalo, a překreslit si to musí ten, kdo ví, kde ty pruhy jsou. */
  naSelhaniUlozeni(function(nejde){
    var el = document.getElementById("nosave");
    if(el) el.hidden = !nejde;
  });
  naNedostupnouHistorii(function(nejde){
    var el = document.getElementById("nohist");
    if(el) el.hidden = !nejde;
  });

  /* ---------- 1. jazyk ----------
     Čeština se sbírá z <body>, teprve pak se případně přepíše jiným
     jazykem. Sběr smí proběhnout jen jednou — podruhé by sebral už
     přeložený text. */
  sberCestinu();
  nastavJazyk(zjistiJazyk(), false);

  /* Sonda pro testy: katalog žije uvnitř uzávěru a sady se k němu jinak
     nedostanou. Aplikace ji sama nepoužívá. */
  try{
    window.__i18n = { I18N: I18N, JAZYKY: JAZYKY, VYCHOZI: VYCHOZI, NAZVY: NAZVY,
                      RUCNI: RUCNI, t: t, tn: tn, kat: kat,
                      kod: function(){ return jazyk; } };
  }catch(e){}







  /* ---------- 2. pravidla ---------- */
  nactiRezimy();

  /* Líný výčet rizika doběhne až po setTimeout a pak se musí překreslit.
     Pravidla ale render() znát nesmí, tak jen ohlásí dopočet a poslouchá se
     odsud. Pás v nastavení má vlastní dveře: renderRezimy() by uprostřed
     psaní do pole sazby sebralo kurzor. */
  naRizikoHotovo(function(){
    render();
    var e = editRezim();
    if(e) renderRezPruh(e);
  });

  /* Sonda pro testy, stejně jako window.__i18n: strážní test sady 19 si musí
     obě konstantní tabulky rizika pokaždé odvodit výčtem z týchž pravidel,
     která počítá aplikace. Bez toho by se čísla po jakékoli změně bodování
     tiše rozešla a nic by to nechytlo. Aplikace sondu sama nepoužívá. */
  try{
    window.__pravidla = { kindPoints: kindPoints, STRAIGHTS: STRAIGHTS, PRESETY: PRESETY,
                          RIZIKO: RIZIKO, RIZIKO_3P: RIZIKO_3P, RIZIKO_2P: RIZIKO_2P,
                          PRESET_REZIMY: PRESET_REZIMY, REZIMY: REZIMY,
                          POCTY_STEJ: POCTY_STEJ,
                          aktRezim: function(){ return aktRezim(); },
                          sediVzor: sediVzor, sediKombinace: sediKombinace,
                          poctyZHodu: poctyZHodu, zapisVzoru: zapisVzoru,
                          tabulka: function(rez){ return tabulkaRizika(rez); } };
  }catch(e){}


  /* ---------- 4. moduly rozhraní ----------
     Pořadí mezi nimi nerozhoduje: každý si jen navěsí posluchače a
     přečte svůj kus DOMu. Rozhoduje jen to, že běží AŽ TEĎ — platformní
     přepínače volají t() a katalog je hotový od kroku 1. */
  initKlavesnice();


  initKartyPravidel();
  initKartaRezimy();
  initNastaveni();
  initOkna();
  initPlatforma();
  initStranky();
  initZaloha();
  initFiltry();
  initUdalosti();

  /* ---------- přepínač jazyka ----------
     Volby se skládají z JAZYKY, ne z HTML: přidání jazyka se tak obejde bez
     zásahu do <body>. Do localStorage se zapisuje teprve tady — dokud
     uživatel na přepínač nesáhne, aplikace každý start následuje systém. */
  (function(){
    var sel = $("jazyksel");
    JAZYKY.forEach(function(kod){
      var o = document.createElement("option");
      o.value = kod;
      o.textContent = NAZVY[kod] || kod;
      sel.appendChild(o);
    });
    naJazyk(function(){ sel.value = jazyk; });
    sel.value = jazyk;
    sel.addEventListener("change", function(){ nastavJazyk(sel.value, true); });
  })();

  /* Co se skládá až za běhu, se po přepnutí musí přepsat vlastní funkcí.
     render() si stránku Zápisu kol dotáhne sám, renderP2() obstará statistiky
     i historii včetně filtrů. renderZaloha() se sem záměrně nedostal: zavírá
     rozpracovaný import a mazal by hlášku, což je na přepnutí jazyka příliš.
     Stavové popisky tří přepínačů nahoře se registrují uvnitř svých bloků —
     jejich mark() zvenku vidět není. */
  naJazyk(function(){ syncGoalUI(); render(); });
  naJazyk(function(){ renderP2(); });
  naJazyk(function(){ renderKos(); });
  naJazyk(function(){ renderRezimy(); if(prekresliPravidla) prekresliPravidla(); });
  /* resetMisto() sbalí případně otevřený rozpis a přepočítá „Zabrané místo“ —
     bez toho zůstane text zaseknutý na placeholderu „Zjišťuji…“, protože
     prelozStatiku() ho jen přepíše na (opět nepřeložený) placeholder, ale
     samo se nedopočítá. */
  naJazyk(resetMisto);

  $("toastx").addEventListener("click", schovejToast);
  (function(){
    var btn = $("auto");
    function mark(){
      btn.textContent = t(autoZap ? "spol.zapnuto" : "nast.vypnuto");
      btn.classList.toggle("on", autoZap);
      var label = t(autoZap ? "auto.vypnout" : "auto.zapnout");
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    btn.addEventListener("click", function(){
      prepniAuto();
      mark();
    });
    naJazyk(mark);
    mark();
  })();

  /* ---------- 5. start ---------- */
  /* o trvalost se říká až po prvním doteku, dřív ji prohlížeče odmítají */
  document.addEventListener("pointerdown", function jednou(){
    document.removeEventListener("pointerdown", jednou, true);
    zajistiTrvalost();
  }, true);

  load(function(){
    syncGoalUI(); render(); renderRezimy(); zkontrolujNavod();
    /* renderP2() čte historii, takže musí počkat na úložiště. V režimu ls
       se hotovo() zavolá ještě synchronně, takže se pořadí proti dřívějšku
       nemění. renderArch() se dřív o dokončení nezajímal — tlačítko
       Zápisu kol se tak spočítalo z prázdného HIST a ukazovalo „Zapsat do
       historie“ i u hry, která už uložená byla, dokud ho nepřepočítal
       nějaký jiný render(). */
    pripravUloziste(function(){ renderArch(); renderP2(); renderZaloha2(); });
  });

  initServiceWorker();
})();
