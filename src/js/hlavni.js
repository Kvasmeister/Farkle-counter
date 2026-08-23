/* Start aplikace — jediné místo, kde je vidět pořadí.

   Modul při importu nedělá nic; všechno se spouští odsud, shora dolů.
   Dřív se vedlejší efekty spouštěly tím, že se k nim ve zdroji došlo,
   a pořadí startu bylo emergentní vlastností souboru o 6 550 řádcích.

   POŘADÍ NENÍ LIBOVOLNÉ:
     1. jazyk musí být dřív než cokoli, co volá t() — tedy prakticky
        před vším ostatním, včetně platformních přepínačů
     2. pravidla (nactiRezimy) dřív než klávesnice a vykreslení, protože
        podle režimu se řídí, které čipy vůbec existují
     3. sondy pro testy stojí vždy hned za krokem, který vystavují —
        window.__i18n za jazykem, window.__pravidla za pravidly
     4. init* moduly navěsí posluchače na hotový DOM
     5. load() na konci: dotáhne rozehranou hru a překreslí

   INVARIANT: složený skript sedí na KONCI <body>. Prvky se sbírají hned
   při načtení (ui/prvky.js), takže v <head> nebo s defer by tu byly null.
*/
/* Importuje se JEN to, co tenhle soubor opravdu volá. Je to jediné místo,
   kde je vidět pořadí startu, takže seznam závislostí v hlavičce musí být
   ten skutečný — dlouhý výčet jmen, která se dole nikde nevyskytují, ho
   dělá nečitelným. Hlídá to Testy/kontrola-modulu.mjs. */
import { t, tn, kat, naJazyk, nastavJazyk, sberCestinu, zjistiJazyk,
         jazyk, JAZYKY, NAZVY, VYCHOZI, I18N } from "./jazyky/jadro.js";
import { RUCNI } from "./jazyky/cs.js";
import { PRESETY, sediKombinace, sediVzor, zapisVzoru } from "./pravidla/kombinace.js";
import { STRAIGHTS } from "./pravidla/postupky.js";
import { POCTY_STEJ, PRESET_REZIMY, REZIMY, aktRezim, nactiRezimy } from "./pravidla/rezimy.js";
import { RIZIKO, RIZIKO_2P, RIZIKO_3P, naRizikoHotovo, poctyZHodu, tabulkaRizika } from "./pravidla/riziko.js";
import { kindPoints } from "./pravidla/skore.js";
import { naNedostupnouHistorii, pripravUloziste } from "./stav/historie.js";
import { load, naSelhaniUlozeni } from "./stav/stav.js";
import { $ } from "./ui/prvky.js";
import { autoZap, prepniAuto, schovejToast } from "./ui/autoulozeni.js";
import { initFiltry } from "./ui/filtry.js";
import { initKlavesnice } from "./ui/klavesnice.js";
import { resetMisto, zajistiTrvalost } from "./ui/misto.js";
import { initNastaveni, syncGoalUI } from "./ui/nastaveni-obecne.js";
import { editRezim, initKartaRezimy, renderRezPruh, renderRezimy } from "./ui/nastaveni-rezimy.js";
import { zkontrolujNavod } from "./ui/navod.js";
import { initOkna } from "./ui/okna.js";
import { initKartyPravidel, prekresliPravidla } from "./ui/okno-pravidla.js";
import { initPlatforma, initServiceWorker } from "./ui/platforma.js";
import { initSdileniRezimu } from "./ui/sdileni-rezimu.js";
import { nactiStatFiltr } from "./ui/stat-filtry.js";
import { renderP2 } from "./ui/statistiky-stranka.js";
import { initStranky } from "./ui/stranky.js";
import { initUdalosti } from "./ui/udalosti.js";
import { render } from "./ui/vykresleni.js";
import { initZaloha, renderZaloha2 } from "./ui/zaloha.js";
import { initZalohaPlna } from "./ui/zaloha-plna.js";
import { renderArch, renderKos } from "./ui/zapis.js";


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

  /* ---------- 2. pravidla ----------
     Trvalý filtr stránky Statistiky se čte tady vedle režimů: je to táž
     kategorie (volba uložená v localStorage, ne stav hry) a renderP2() na
     konci startu už ho musí mít v ruce. */
  nactiRezimy();
  nactiStatFiltr();

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
  initZalohaPlna();
  initSdileniRezimu();
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
