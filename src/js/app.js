/* Zbytek aplikace — zatím pořád jeden uzávěr.

   Řezy 4 a 5 z něj vytáhly jazyky a celou doménu pravidel; další
   odkrajují stav, text a UI. Importy stojí nad IIFE, protože v ES modulu
   musí být na nejvyšší úrovni. */
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

  sberCestinu();
  nastavJazyk(zjistiJazyk(), false);

  /* Sonda pro testy: katalog žije uvnitř uzávěru a sady se k němu jinak
     nedostanou. Aplikace ji sama nepoužívá. */
  try{
    window.__i18n = { I18N: I18N, JAZYKY: JAZYKY, VYCHOZI: VYCHOZI, NAZVY: NAZVY,
                      RUCNI: RUCNI, t: t, tn: tn, kat: kat,
                      kod: function(){ return jazyk; } };
  }catch(e){}

  function ukazNeukladame(){
    var el = document.getElementById("nosave");
    if(!el) return;
    el.hidden = !neukladame;
  }



  /* ---------- filtry a řazení ----------
     Stav drží jen paměť, žádný localStorage: po zavření aplikace se resetuje,
     aby se nikdo nedíval na osekanou historii a nevěděl proč. Přepnutí karet
     ani odchod na jinou stránku ho ale neruší.

     histView() jsou jediné dveře k datům pro zobrazení — na ni se ptá seznam
     her, seznam statistik i žebříčky. Neptá se přes ni export, zápis ani
     mazání: záloha veze vždycky všechny hry, i když je filtr zapnutý. */
  var FILTR  = { od: null, do: null, typ: null, hodnota: null };
  var RAZENI = { podle: "datum", smer: "desc" };

  /* Starý nebo cizí záznam nemusí mít mode vůbec; všechno, co není „rounds",
     je hra na body — stejné pravidlo jako všude jinde v aplikaci. */
  function rezimHry(g){ return g.mode === "rounds" ? "rounds" : "points"; }
  /* Cíl hry jedním číslem: u her na kola je nula „bez limitu". Nula je tu
     platná hodnota, na rozdíl od null, které v FILTR.hodnota znamená
     „všechny". */
  function cilHry(g){
    return g.mode === "rounds" ? (g.roundGoal > 0 ? g.roundGoal : 0) : (g.goal || 0);
  }
  /* Nabídka se skládá z dat, ne z pevného seznamu — a vždycky z celé
     historie, ne z vyfiltrované. Jinak by se po zapnutí filtru data nabídka
     smrskla a nešlo by ji rozšířit zpátky. */
  function hodnotyTypu(typ){
    var v = [], bezLimitu = false, videno = {};
    histAll().forEach(function(g){
      if(rezimHry(g) !== typ) return;
      var x = cilHry(g);
      if(typ === "rounds" && x === 0){ bezLimitu = true; return; }
      if(!videno[x]){ videno[x] = true; v.push(x); }
    });
    v.sort(function(a, b){ return a - b; });
    if(bezLimitu) v.push(0);
    return v;
  }
  function zrusFiltr(){
    FILTR.od = null; FILTR.do = null; FILTR.typ = null; FILTR.hodnota = null;
    RAZENI.podle = "datum"; RAZENI.smer = "desc";
  }
  /* Poslední milisekunda dne, ve kterém ms leží. Přes konstruktor Date, ne
     přičtením 24 hodin — kolem přechodu na letní čas den 24 hodin nemá. */
  function konecDne(ms){
    var d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1;
  }
  /* Filtr typu hry platí jen tam, kde je vidět jeho tlačítko, tedy na kartě
     Historie — proto se o něj volající musí říct. Na kartě Statistiky by
     půlka položek („hra na body", „hra na kola") zůstala prázdná a nic by
     nenapovědělo proč; statistiky si režim řeší samy. Filtr data se naopak
     uplatňuje všude. */
  function histView(sTypem){
    var v = histAll();
    if(FILTR.od !== null || FILTR.do !== null){
      v = v.filter(function(g){
        var t = g.savedAt || 0;
        if(FILTR.od !== null && t < FILTR.od) return false;
        if(FILTR.do !== null && t > FILTR.do) return false;
        return true;
      });
    }
    if(sTypem && FILTR.typ !== null){
      v = v.filter(function(g){
        if(rezimHry(g) !== FILTR.typ) return false;
        if(FILTR.hodnota === null) return true;
        return cilHry(g) === FILTR.hodnota;
      });
    }
    var smer = RAZENI.smer === "asc" ? 1 : -1;
    v.sort(function(a, b){
      if(RAZENI.podle === "body"){
        var r = ((a.banked || 0) - (b.banked || 0)) * smer;
        if(r) return r;
        return (b.savedAt || 0) - (a.savedAt || 0);
      }
      return ((a.savedAt || 0) - (b.savedAt || 0)) * smer;
    });
    return v;
  }



  /* Jediné dveře ke změně pravidel: uloží a překreslí obojí — nastavení
     i klávesnici (tu přes render()). Cache rizika se nezahazuje, je klíčovaná
     podpisem. */
  function zmenaRezimu(){
    ulozRezimy();
    renderRezimy();
    if(prekresliPravidla) prekresliPravidla();
    render();
  }
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
  /* Prázdný hod se do popisu nedostane — u farklu je poslední hod prázdný
     z definice a slovo se dopisuje až při zobrazení. */
  function turnKody(){
    var out = [], i, j, r, radek;
    for(i = 0; i < S.rolls.length; i++){
      r = S.rolls[i]; radek = [];
      for(j = 0; j < r.items.length; j++){
        /* položka bez kódu se do c zapsat nedá */
        if(typeof r.items[j].k !== "string") return null;
        radek.push(r.items[j].k);
      }
      if(radek.length) out.push(radek.join(POLOZKY_ODD));
    }
    return out.join(HODY_ODD);
  }
  function turnDesc(){
    return S.rolls.map(function(r){ return r.items.map(stitek).join(POLOZKY_TXT); })
                  .filter(Boolean).join(HODY_TXT);
  }
  /* Kolo se ukládá v kódech. Kdyby některá položka kód neměla — rozehraná hra
     z doby před nimi, jejíž štítek se rozebrat nepodařilo — zapíše se raději
     text; ztratit štítek by bylo horší než zafixovat u jednoho kola jazyk. */
  function zapisKolo(bodu, farkle){
    var c = turnKody(), tah = { p: bodu, bust: farkle };
    if(c === null){ tah.d = turnDesc(); } else { tah.c = c; }
    S.turns.push(tah);
  }


  var selValue = null, selCount = 3, manualDice = 1;

  [1,2,3,4,5,6].forEach(function(v){
    var b = document.createElement("button");
    b.className = "chip"; b.textContent = v; b.dataset.value = v;
    b.addEventListener("click", function(){ selValue = (selValue === v ? null : v); renderKind(); });
    elPips.appendChild(b);
  });
  /* Počty od jedné: 1× nastupuje, když se samostatné hodnoty nevejdou do
     vlastní řady čipů, 2× když v režimu boduje dvojice. Co je z nich vidět,
     rozhoduje renderKind(). */
  [1,2,3,4,5,6].forEach(function(c){
    var b = document.createElement("button");
    b.className = "chip"; b.textContent = c + "×"; b.dataset.count = c;
    b.addEventListener("click", function(){ selCount = c; renderKind(); });
    elCounts.appendChild(b);
  });

  /* ---------- konec hry ----------
     Hlídání je jen pomůcka: zvýšením limitu či cíle nebo přepnutím na
     „neomezeně“ se hra zase odemkne.

     V bodech stačí ptát se na `banked`, protože ten roste jedině v bank().
     Zámek tak naskočí až po zapsání kola, kterým se cíl dosáhl nebo překročil
     — body ležící na stole se do něj nepočítají. */
  function locked(){
    if(S.mode === "points") return S.banked >= S.goal;
    return S.roundGoal > 0 && S.turns.length >= S.roundGoal;
  }

  /* ---------- akce ---------- */
  /* diceUsed < 1 by šlo zapisovat donekonečna, aniž by ubývaly kostky —
     jediná cesta sem je ruční zadání při nule zbývajících kostek */
  function keep(kod, points, diceUsed){
    if(diceUsed < 1 || diceUsed > left()) return;
    cur().items.push({k:kod, p:points, d:diceUsed});
    render();
  }
  function unkeep(i){ cur().items.splice(i, 1); render(); }

  function rollOn(){
    /* v zámku tlačítko nehází, ale odvede na zápis kol — hra je u konce
       a další krok je uložit ji nebo si ji prohlédnout */
    if(locked()){ goTo(1); return; }
    if(cur().items.length === 0) return;
    var rest = left();
    S.rolls.push({ thrown: rest > 0 ? rest : kostek(), hot: rest === 0, items: [] });
    render();
  }

  function bank(){
    var p = potTotal();
    if(p <= 0 || locked()) return;
    S.dirty = true;
    zapisKolo(p, false);
    S.banked += p;
    S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    render();
    zkusAutoUlozit();
  }
  function bust(){
    if(locked()) return;
    S.dirty = true;
    zapisKolo(potTotal(), true);
    S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    render();
    zkusAutoUlozit();
  }
  /* Zpět se drží uvnitř rozehraného kola: ubírá položky, pak celé hody.
     Zapsaná kola nemaže — na ty je Opravit v Zápisu kol. Dřív sahalo i na
     ně a jedno klepnutí navíc tak umazalo kolo, o které uživatel nežádal. */
  function jdeZpet(){ return cur().items.length > 0 || S.rolls.length > 1; }
  function undo(){
    if(!jdeZpet()) return;
    S.dirty = true;
    if(cur().items.length){ unkeep(cur().items.length - 1); return; }
    S.rolls.pop();
    render();
  }
  function wipe(){
    fixMode = false; pendingDel = null;
    S.banked = 0; S.turns = []; S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    S.archivedId = null; S.dirty = false; S.autoUlozeno = false;
    render();
  }
  /* ---------- zápis do historie ----------
     Hra se do historie zapíše na povel. Když už tam je a od té doby se hrálo,
     nabídne se aktualizace téhož záznamu — jinak by se rekordy počítaly dvakrát. */
  var archTimer = null, archMsg = "";
  function histIndex(list, id){
    for(var i = 0; i < list.length; i++){ if(list[i].id === id) return i; }
    return -1;
  }
  /* Kde leží záznam, na který je rozehraná hra navázaná: v historii, v koši
     smazaných z historie, nebo nikde. Stav se odvozuje, neukládá — jinak by
     ho rozešlo trvalé smazání z koše i vypadnutí přes strop deseti her.
     Do koše se sahá jen tehdy, když záznam v historii není, takže běžný
     průběh hry nestojí nic navíc. */
  function kdeZaznam(){
    if(!S.archivedId) return "nikde";
    if(histIndex(HIST, S.archivedId) >= 0) return "historie";
    return histIndex(kosHistAll(), S.archivedId) >= 0 ? "kos" : "nikde";
  }
  function archive(){
    if(gameEmpty()) return;
    /* nezapsané kolo propadne — na to se ptáme, jinde potvrzení není */
    if(potTotal() > 0 && !archTimer){
      archTimer = setTimeout(function(){ archTimer = null; renderArch(); }, 5000);
      renderArch();
      return;
    }
    clearTimeout(archTimer); archTimer = null;
    zapisHru(function(ok){ if(!ok) selhalZapis(); });
  }
  /* Selhání zápisu do historie hlásí tlačítko v Zápisu kol — ať už klepnutí
     přišlo od uživatele, nebo zápis pustil automat. */
  function selhalZapis(){
    archMsg = klicSelhani("chyba.mistoulozit");
    setTimeout(function(){ archMsg = ""; renderArch(); }, 4000);
    renderArch();
  }
  /* Samotný zápis bez ptaní a bez hlášení — volá ho tlačítko v Zápisu kol
     i „Uložit a začít novou“. Callback dostane true teprve tehdy, když je
     záznam skutečně v úložišti. */
  function zapisHru(hotovo){
    var kde = kdeZaznam();
    var list = histAll();
    var i = (kde === "historie") ? histIndex(list, S.archivedId) : -1;
    var rec = makeRecord(kde === "nikde" ? null : S.archivedId);
    if(i >= 0){ list[i] = proHistorii(rec); } else { list.push(proHistorii(rec)); }

    /* Návrat z koše jsou dva zápisy za sebou. Nejdřív se záznam z koše
       odebere, teprve pak se zapisuje do historie — kdyby druhý zápis padl,
       koš se vrátí do stavu před tím. Ztratit se nemůže nic: po celou tu
       dobu je hra živá v Zápisu kol. Opačné pořadí by při selhání nechalo
       tutéž hru v historii i v koši, tedy dvakrát. */
    var kosPredtim = null;
    if(kde === "kos"){
      kosPredtim = kosHistAll();
      if(!kosHistWrite(kosPredtim.filter(function(x){ return x.id !== S.archivedId; }))){
        if(hotovo) hotovo(false);
        return;
      }
    }

    histWrite(list, function(ok){
      if(ok){
        S.archivedId = rec.id; S.dirty = false;
        render(); renderP2();
      }else if(kosPredtim){
        kosHistWrite(kosPredtim);
        renderKos();
      }
      if(hotovo) hotovo(ok);
    }, [rec]);
  }
  function renderArch(){
    elArch.classList.remove("warn");
    if(archMsg){ elArch.disabled = true; elArch.textContent = t(archMsg); return; }
    if(gameEmpty()){ elArch.disabled = true; elArch.textContent = t("zapis.nicknulozeni"); return; }
    if(archTimer){
      elArch.disabled = false;
      elArch.classList.add("warn");
      elArch.textContent = t("arch.propadne", { b: fmt(potTotal()) });
      return;
    }
    var kde = kdeZaznam();
    /* Záznam smazaný z historie se z tlačítka vrací zpátky, a to pod stejným
       id — proto tady nevzniká nová hra ani při rozehrané úpravě. */
    if(kde === "kos"){
      elArch.disabled = false; elArch.textContent = t("arch.obnovit"); return;
    }
    if(kde === "historie" && !S.dirty){
      elArch.disabled = true; elArch.textContent = t("arch.ulozeno"); return;
    }
    elArch.disabled = false;
    elArch.textContent = t((kde === "historie") ? "arch.aktualizovat" : "arch.zapsat");
  }

  /* Selhání zápisu se hlásí tam, kde uživatel klepnul: text tlačítka se na
     čtyři vteřiny změní a pak se vrátí. Stejný idiom jako u Zapsat do historie. */
  function hlaskaNaTlacitku(btn, text, puvodni){
    if(!btn) return;
    btn.disabled = true;
    btn.classList.add("warn");
    btn.textContent = text;
    setTimeout(function(){
      btn.disabled = false;
      btn.classList.remove("warn");
      btn.textContent = puvodni;
    }, 4000);
  }

  /* ---------- koš ----------
     Nová hra nesmaže rozehranou hru nenávratně: pokud není v historii,
     odloží se sem a jde obnovit v nastavení. */
  /* Vrací true, když je rozehraná hra v bezpečí — buď je zálohovaná, nebo
     zálohu nepotřebuje. Volající pak smí teprve mazat. */
  function kosPush(){
    if(gameEmpty()) return true;
    /* záznam někde existuje a od té doby se nehrálo: zálohu netřeba */
    if(kdeZaznam() !== "nikde" && !S.dirty) return true;
    var list = kosAll();
    var rec = makeRecord(null);
    /* Vazba na původní záznam jde do koše s hrou. Bez ní by se obnovená hra
       dala zapsat jako nová a v historii by pak byla dvakrát. */
    if(S.archivedId) rec.puvodni = S.archivedId;
    list.unshift(rec);
    while(list.length > KOS_MAX){ list.pop(); }
    return kosWrite(list);
  }
  function nactiZaznam(rec){
    fixMode = false; pendingDel = null;
    S.mode = rec.mode === "rounds" ? "rounds" : "points";
    S.goal = rec.goal > 0 ? rec.goal : 4000;
    S.roundGoal = rec.roundGoal > 0 ? rec.roundGoal : null;
    S.banked = rec.banked || 0;
    S.turns = (rec.turns || []).map(function(tah){
      return kopieKola(tah);
    });
    /* Hra z koše se vrací i se svými pravidly: jinak by se dohrávala podle
       něčeho jiného, než podle čeho se začala. Neznámý režim (cizí záloha,
       smazaný vlastní) nechává volbu být. */
    if(rezimPodleId(gRezim(rec))){
      REZIMY.akt = gRezim(rec);
      ulozRezimy();
    }
    S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    /* Obnovená hra se hlásí ke svému původnímu záznamu, pokud si ho koš
       zapamatoval — jinak by šla zapsat podruhé. Do koše se ukládá jen hra
       s neuloženými změnami, takže rozdíl proti záznamu je jistý: dirty.
       Záznam o automatickém uložení se s hrou nepřenáší. */
    var puvodni = (rec && typeof rec.puvodni === "string") ? rec.puvodni : null;
    S.archivedId = puvodni; S.dirty = !!puvodni; S.autoUlozeno = false;
  }
  function restore(id, btn){
    var list = kosAll(), i = histIndex(list, id);
    if(i < 0) return;
    var rec = list[i];
    /* co je právě rozehrané, taky neztratíme — když se to nepovede uložit,
       obnovu neděláme, jinak by rozehraná hra zmizela */
    if(!kosPush()){
      hlaskaNaTlacitku(btn, t("chyba.zalohovathru"), t("spol.obnovit"));
      return;
    }
    list = kosAll().filter(function(x){ return x.id !== id; });
    kosWrite(list);
    nactiZaznam(rec);
    zavriModal();
    syncGoalUI(); render(); renderKos();
  }
  /* Počet v hlavičce oddílu: sbalená harmonika by jinak nedala poznat,
     jestli je uvnitř co obnovovat. */
  function pocetVOddilu(id, n){
    var el = document.getElementById(id);
    if(el) el.textContent = n ? String(n) : "";
  }
  /* Trvalé smazání se ptá stejným způsobem jako mazání kola: řádek se
     překlopí na otázku se dvěma tlačítky. Ptáme se vždy jen u jednoho
     řádku, proto jedno id na koš. */
  var ptamSeKos = null, ptamSeKosHist = null;

  function kosRadek(rec, ptaSe, akce){
    var row = document.createElement("div");
    row.className = "setrow kosrow";
    var popis = document.createElement("div");
    popis.className = "t";
    var btns = document.createElement("div");
    btns.className = "setbtns";
    if(ptaSe){
      popis.innerHTML = "<b>" + esc(t("kos.opravdutrvale")) + "</b><span>" +
        esc(fmt(rec.banked || 0) + " — " + popisHry(rec)) + "</span>";
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){ akce.smaz(ano); });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", akce.zrus);
      btns.appendChild(ano); btns.appendChild(ne);
    }else{
      popis.innerHTML = "<b>" + esc(fmt(rec.banked || 0)) + "</b><span>" + esc(popisHry(rec)) + "</span>";
      var ob = document.createElement("button");
      ob.type = "button"; ob.className = "ghost"; ob.textContent = t("spol.obnovit");
      ob.addEventListener("click", function(){ akce.obnov(ob); });
      var tr = document.createElement("button");
      tr.type = "button"; tr.className = "ghost"; tr.textContent = t("kos.trvalesmazat");
      tr.addEventListener("click", akce.ptejSe);
      btns.appendChild(ob); btns.appendChild(tr);
    }
    row.appendChild(popis); row.appendChild(btns);
    return row;
  }

  function renderKos(){
    renderKosHist();
    var list = kosAll();
    pocetVOddilu("koscnt", list.length);
    elKosList.innerHTML = "";
    if(!list.length){
      ptamSeKos = null;
      elKosList.innerHTML = '<div class="empty">' + esc(t("kos.prazdny")) + '</div>';
      return;
    }
    list.forEach(function(rec){
      elKosList.appendChild(kosRadek(rec, ptamSeKos === rec.id, {
        obnov: function(b){ restore(rec.id, b); },
        ptejSe: function(){ ptamSeKos = rec.id; renderKos(); },
        zrus: function(){ ptamSeKos = null; renderKos(); },
        smaz: function(b){
          /* Když zápis selže, záznam v koši zůstane — hlásíme to na tlačítku
             a řádek nepřekreslujeme, jinak by hláška hned zmizela. */
          if(!kosWrite(kosAll().filter(function(x){ return x.id !== rec.id; }))){
            hlaskaNaTlacitku(b, t("chyba.smazat"), t("spol.smazat"));
            return;
          }
          ptamSeKos = null;
          renderKos();
        }
      }));
    });
  }

  /* ---------- koš pro hry smazané z historie ----------
     Smazání z historie není nenávratné: záznam se odloží sem
     a tlačítkem se vrátí zpátky mezi dohrané hry. */
  /* Vrací true, když je kopie skutečně uložená — volající pak teprve smí
     smazat originál z historie. */
  function kosHistPush(rec){
    if(!rec) return false;
    var list = kosHistAll();
    list.unshift(rec);
    while(list.length > KOSH_MAX){ list.pop(); }
    return kosHistWrite(list);
  }
  function vratDoHistorie(id, btn){
    var list = kosHistAll(), i = histIndex(list, id);
    if(i < 0) return;
    var rec = list[i];
    var hry = histAll();
    /* kdyby se mezitím objevil záznam se stejným id (třeba importem) */
    if(histIndex(hry, rec.id) >= 0){ rec.id = newId(); }
    histWrite(hry.concat([proHistorii(rec)]), function(ok){
      if(!ok){
        hlaskaNaTlacitku(btn, t(klicSelhani("chyba.mistoulozit")), t("spol.obnovit"));
        return;
      }
      kosHistWrite(list.filter(function(x, k){ return k !== i; }));
      /* render() kvůli tlačítku v Zápisu kol: mohl se vrátit zrovna ten
         záznam, na který je rozehraná hra navázaná */
      render(); renderKosHist(); renderP2(); renderZaloha2();
    }, [rec]);
  }
  function renderKosHist(){
    var list = kosHistAll();
    pocetVOddilu("koshistcnt", list.length);
    elKosHistList.innerHTML = "";
    if(!list.length){
      ptamSeKosHist = null;
      elKosHistList.innerHTML = '<div class="empty">' + esc(t("kos.prazdnyhist")) + '</div>';
      return;
    }
    list.forEach(function(rec){
      elKosHistList.appendChild(kosRadek(rec, ptamSeKosHist === rec.id, {
        obnov: function(b){ vratDoHistorie(rec.id, b); },
        ptejSe: function(){ ptamSeKosHist = rec.id; renderKosHist(); },
        zrus: function(){ ptamSeKosHist = null; renderKosHist(); },
        smaz: function(b){
          if(!kosHistWrite(kosHistAll().filter(function(x){ return x.id !== rec.id; }))){
            hlaskaNaTlacitku(b, t("chyba.smazat"), t("spol.smazat"));
            return;
          }
          ptamSeKosHist = null;
          /* render() kvůli tlačítku v Zápisu kol: rozehraná hra se mohla
             vázat zrovna na tenhle záznam a teď už nemá kam */
          render(); renderKosHist();
        }
      }));
    });
  }

  /* ---------- karta Herní režimy v nastavení ----------
     Řádky se staví z uzlů jako kosRadek(), ne z innerHTML — je to zavedený
     vzor v tomhle okně a nepotřebuje esc(). Přepínače hlásí stav, ne akci:
     text říká Zapnuto/Vypnuto a v zapnutém stavu nese třídu `on`; co
     klepnutí udělá, zůstává v title a aria-label. */
  var kombNovy = [];
  /* Sazba upravená a pak vypnutá se v rámci sezení pamatuje, aby ji zpětné
     zapnutí nepřepsalo výchozí hodnotou. Do úložiště nejde: uložený stav má
     mít jednu pravdu, a tou je přítomnost klíče v `p` režimu. */
  var kombSazbyPamet = {};
  /* Rozdělaná otázka na smazání kombinace, jednoho jejího vzoru a celého
     režimu — jedna na oddíl, stejně jako ptamSeKos v koších. */
  var ptamSeVzor = null, ptamSeRezim = null, ptamSeTvar = null;
  /* Který režim se právě upravuje a která jeho vlastní kombinace; null je
     o patro výš, tedy seznam režimů a detail režimu. */
  var rezEdit = null, kombEdit = null;
  function editRezim(){ return rezEdit ? rezimPodleId(rezEdit) : null; }

  /* Název režimu se skládá na jednom místě: preset ho bere z katalogu podle
     id (a přeloží se), vlastní si veze svůj vlastní text. */
  /* Podřádek seznamu: čím se ten režim liší, aniž by se musel otevřít. */
  function popisRezimuKratky(rez){
    var kusy = [tn("slovo.kostek", rez.kostek)], p = 0, i;
    for(i = 0; i < POST_PORADI.length; i++){
      if(rez.post[POST_PORADI[i]] > 0 && STRAIGHTS[POST_PORADI[i]].d <= rez.kostek) p++;
    }
    kusy.push(tn("rezim.postupek", p));
    var k = pocetKombinaci(rez);
    if(k) kusy.push(tn("rezim.kombinaci", k));
    return kusy.join(" · ");
  }

  function stavTlacitko(btn, zap, klicAkce){
    btn.textContent = t(zap ? "spol.zapnuto" : "nast.vypnuto");
    btn.classList.toggle("on", zap);
    var label = t(klicAkce);
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }
  /* Společný tvar popisu: nadpis řádku a pod ním podřádek. `serif` sází nadpis
     patkově — patří tam zápis kombinace (1,1,1+5,5), ne prozaický název. */
  function kombPopis(nadpis, serif, podradek){
    var t1 = document.createElement("div");
    t1.className = "t";
    var b = document.createElement("b");
    if(serif) b.className = "zapis";
    b.textContent = nadpis;
    var s = document.createElement("span");
    s.innerHTML = podradek;
    t1.appendChild(b); t1.appendChild(s);
    return t1;
  }
  /* Pole s body. Po úpravě se uloží a přepíše se klávesnice — celý oddíl se
     překreslovat nesmí, jinak by pole ztratilo kurzor uprostřed psaní.
     `nula` pouští nulu, která u sazby v tabulce znamená „neboduje“; a právě
     ta riziko mění, takže se s ním přepisuje i pás na spodní hraně. */
  function kombPoleSazby(hodnota, aktivni, zapis, aria, nula){
    var pole = document.createElement("input");
    pole.type = "number"; pole.className = "kombsazba"; pole.min = nula ? "0" : "1"; pole.step = "50";
    pole.inputMode = "numeric";
    pole.value = hodnota;
    pole.disabled = !aktivni;
    pole.setAttribute("aria-label", aria || t("komb.sazba"));
    pole.addEventListener("input", function(){
      var v = Math.floor(naCislo(parseInt(pole.value, 10), -1));
      if(v < (nula ? 0 : 1) || v > BODY_MAX) return;
      zapis(v);
      ulozRezimy(); render();
      /* Oddíl se překreslovat nesmí (pole by ztratilo kurzor), ale poslední
         řádek o tom, jestli je co obnovovat, se změnou sazby mění — a ten
         jediný se přepsat dá, žádné pole v něm není. */
      var rez = editRezim();
      if(rez){ renderRezKonec(rez); renderRezPruh(rez); }
    });
    return pole;
  }
  /* Řádek tabulky pravidel: popis vlevo, pole s body vpravo, žádný přepínač.
     Nula znamená, že to v tomhle režimu neboduje. */
  function rezRadekBodu(nadpis, podradek, hodnota, zapis){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.appendChild(kombPopis(nadpis, false, esc(podradek)));
    row.appendChild(kombPoleSazby(hodnota, true, zapis, nadpis, true));
    return row;
  }
  function kombPresetRadek(rez, k){
    var def = PRESETY[k], zap = kombZap(rez, k);
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.preset = k;
    var popis = kombPopis(t("stitek." + def.k), false,
      '<span class="zapis">' + esc(def.zapis) + "</span> · " + esc(tn("slovo.kostek", def.d)));
    var pole = kombPoleSazby(sazba(rez, k), zap, function(v){
      if(!kombZap(rez, k)) return;
      rez.p[k] = v; kombSazbyPamet[k] = v;
    });
    var btns = document.createElement("div");
    btns.className = "setbtns";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "ghost";
    stavTlacitko(btn, zap, zap ? "komb.vypnout" : "komb.zapnout");
    btn.addEventListener("click", function(){
      if(kombZap(rez, k)){
        kombSazbyPamet[k] = rez.p[k];
        delete rez.p[k];
      } else {
        rez.p[k] = kombSazbyPamet[k] || PRESETY[k].def;
      }
      zmenaRezimu();
    });
    btns.appendChild(btn);
    row.appendChild(popis); row.appendChild(pole); row.appendChild(btns);
    return row;
  }
  /* Postupka se ovládá stejně jako kombinace navíc: sazba a přepínač.
     Chybějící klíč v `post` je vypnuto, takže se stav nemá kde rozejít. */
  function rezPostRadek(rez, k){
    var s = STRAIGHTS[k], zap = rez.post[k] > 0;
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.post = k;
    var popis = kombPopis(t("stitek." + s.k), false, esc(tn("slovo.kostek", s.d)));
    var pole = kombPoleSazby(zap ? rez.post[k] : (PRESET_REZIMY.kcd2.post[k] || 500), zap, function(v){
      if(rez.post[k] > 0) rez.post[k] = v;
    });
    var btns = document.createElement("div");
    btns.className = "setbtns";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "ghost";
    stavTlacitko(btn, zap, zap ? "komb.vypnout" : "komb.zapnout");
    btn.addEventListener("click", function(){
      if(rez.post[k] > 0) delete rez.post[k];
      else rez.post[k] = Math.floor(naCislo(parseInt(pole.value, 10), 0)) || PRESET_REZIMY.kcd2.post[k] || 500;
      zmenaRezimu();
    });
    btns.appendChild(btn);
    row.appendChild(popis); row.appendChild(pole); row.appendChild(btns);
    return row;
  }
  /* Vlastní kombinace v seznamu: jméno, body se zápisem vzorů v podřádku
     a tři tlačítka — stav, Upravit a Smazat. Pole se sazbou tu není: body
     patří celé kombinaci, ne jednomu z jejích vzorů, a upravují se
     v podstránce, kde je vidět, čeho se týkají. Mazání se ptá ve dvou krocích
     jako v koších: kombinace se naťukává po kostkách a znovu se dělá pracně. */
  function nazevKombinace(k){ return k.n || t("komb.beznazvu"); }
  /* Podřádek: body, zápis vzorů a počty kostek. Kombinace, ze které se do
     režimu nevejde ani jeden vzor, to říká rovnou — ať se nehledá, proč čip
     v klávesnici chybí. */
  function podradekKombinace(rez, k){
    var poc = poctyKostekKombinace(k, rez.kostek);
    return fmt(k.b) + " · " + zapisKombinace(k) + " · " +
           (poc.length ? poc.map(function(n){ return tn("slovo.kostek", n); }).join(" / ")
                       : t("komb.nevejde"));
  }
  function smazKombinaci(rez, id){
    rez.v = rez.v.filter(function(x){ return x.id !== id; });
    ptamSeVzor = null;
    if(kombEdit === id){ kombEdit = null; ptamSeTvar = null; kombNovy = []; }
    zmenaRezimu();
  }
  function kombVlastniRadek(rez, k){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.vzor = k.id;
    var btns = document.createElement("div");
    btns.className = "setbtns";

    if(ptamSeVzor === k.id){
      var otazka = document.createElement("div");
      otazka.className = "t";
      otazka.innerHTML = "<b>" + esc(t("komb.opravdusmazat")) + "</b><span>" +
                         esc(nazevKombinace(k)) + "</span>";
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){ smazKombinaci(rez, k.id); });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", function(){ ptamSeVzor = null; renderRezimy(); });
      btns.appendChild(ano); btns.appendChild(ne);
      row.appendChild(otazka); row.appendChild(btns);
      return row;
    }

    var popis = kombPopis(nazevKombinace(k), false, esc(podradekKombinace(rez, k)));
    var prep = document.createElement("button");
    prep.type = "button"; prep.className = "ghost rezbtn";
    stavTlacitko(prep, k.z, k.z ? "komb.vypnout" : "komb.zapnout");
    prep.addEventListener("click", function(){ k.z = !k.z; zmenaRezimu(); });
    var upr = document.createElement("button");
    upr.type = "button"; upr.className = "ghost rezbtn"; upr.textContent = t("rezim.upravit");
    upr.addEventListener("click", function(){ naKombiDetail(k.id); });
    var sm = document.createElement("button");
    sm.type = "button"; sm.className = "ghost rezbtn"; sm.textContent = t("spol.smazat");
    sm.addEventListener("click", function(){ ptamSeVzor = k.id; renderRezimy(); });
    btns.appendChild(prep); btns.appendChild(upr); btns.appendChild(sm);
    row.appendChild(popis); row.appendChild(btns);
    return row;
  }

  /* ---------- seznam režimů ---------- */
  function rezRadek(rez){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.rezim = rez.id;
    var btns = document.createElement("div");
    btns.className = "setbtns";

    if(ptamSeRezim === rez.id){
      var otazka = document.createElement("div");
      otazka.className = "t";
      otazka.innerHTML = "<b>" + esc(t("rezim.opravdusmazat")) + "</b><span>" +
                         esc(nazevRezimu(rez)) + "</span>";
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){
        REZIMY.sez = REZIMY.sez.filter(function(x){ return x.id !== rez.id; });
        ptamSeRezim = null;
        if(rezEdit === rez.id) rezEdit = null;
        zmenaRezimu();
      });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", function(){ ptamSeRezim = null; renderRezimy(); });
      btns.appendChild(ano); btns.appendChild(ne);
      row.appendChild(otazka); row.appendChild(btns);
      return row;
    }

    var popis = kombPopis(nazevRezimu(rez), false, esc(popisRezimuKratky(rez)));
    var prav = document.createElement("button");
    prav.type = "button"; prav.className = "ghost rezbtn"; prav.textContent = t("rezim.pravidla");
    prav.addEventListener("click", function(){ otevriPravidla(rez.id); });
    var upr = document.createElement("button");
    upr.type = "button"; upr.className = "ghost rezbtn"; upr.textContent = t("rezim.upravit");
    upr.addEventListener("click", function(){ naRezimDetail(rez.id); });
    var zvol = document.createElement("button");
    zvol.type = "button"; zvol.className = "ghost rezbtn";
    var akt = REZIMY.akt === rez.id;
    zvol.textContent = t(akt ? "rezim.zvoleno" : "rezim.zvolitkratce");
    zvol.classList.toggle("on", akt);
    zvol.title = t("rezim.zvolit");
    zvol.setAttribute("aria-label", t("rezim.zvolit"));
    /* Přepnout pravidla uprostřed hry nejde: kolo už zapsané by se počítalo
       podle jiné tabulky než to následující a v historii by režim lhal
       o první půlce hry. */
    zvol.disabled = akt || !gameEmpty();
    zvol.addEventListener("click", function(){
      if(!gameEmpty()) return;
      REZIMY.akt = rez.id;
      S.rolls = [{thrown: rez.kostek, hot:false, items:[]}];
      zmenaRezimu();
    });
    btns.appendChild(prav); btns.appendChild(upr); btns.appendChild(zvol);
    row.appendChild(popis); row.appendChild(btns);
    return row;
  }
  function renderRezSeznam(){
    var kam = $("rezrows");
    kam.innerHTML = "";
    REZIMY.sez.forEach(function(rez){ kam.appendChild(rezRadek(rez)); });
    var zam = $("rezzamek");
    zam.textContent = gameEmpty() ? "" : t("rezim.zamceno");
    zam.hidden = gameEmpty();
    var strop = REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX;
    var zpr = $("rezstrop");
    zpr.textContent = strop ? t("rezim.strop", { n: REZIMY_MAX }) : "";
    zpr.hidden = !strop;
    $("reznovy").disabled = strop;
  }
  /* ---------- detail jednoho režimu ---------- */
  /* Detail režimu má šest sekcí a každá svůj nadpis s linkou: samostatné
     kostky, stejná čísla, postupky, kombinace navíc, vlastní kombinace
     a nastavení. Nadpisy stojí staticky v HTML, obsah sekcí se staví tady. */
  function renderRezDetail(rez){
    $("reztitul").textContent = nazevRezimu(rez);
    $("reznazevrow").hidden = !rez.vlastni;
    if(rez.vlastni && document.activeElement !== $("reznazevpole")){
      $("reznazevpole").value = rez.nazev || "";
    }
    $("rezkostek").value = String(rez.kostek);

    var sam = $("rezsam");
    sam.innerHTML = "";
    sam.appendChild(prepinacRadek(t("rezim.sam.n"), t("rezim.sam.p"), sestiZap(rez.sam),
                                  function(){ prepniSam(rez); }));
    if(sestiZap(rez.sam)) sam.appendChild(mrizkaSazeb(rez.sam, 1));

    renderRezStej(rez);

    var post = $("rezpost");
    post.innerHTML = "";
    POST_PORADI.forEach(function(k){
      if(STRAIGHTS[k].d > rez.kostek) return;
      post.appendChild(rezPostRadek(rez, k));
    });

    var seznam = $("komblist");
    seznam.innerHTML = "";
    PRESET_PORADI.forEach(function(k){
      if(!kombVRezimu(rez, k)) return;
      seznam.appendChild(kombPresetRadek(rez, k));
    });

    var vlastni = $("kombvlastni");
    vlastni.innerHTML = "";
    if(!rez.v.length){
      ptamSeVzor = null;
      vlastni.innerHTML = '<div class="empty">' + esc(t("komb.zadne")) + "</div>";
    } else {
      rez.v.forEach(function(k){ vlastni.appendChild(kombVlastniRadek(rez, k)); });
    }
    /* Strop se hlásí sám a předem, ne až po marném klepnutí na zamčené
       tlačítko. */
    var strop = rez.v.length >= VLASTNI_MAX;
    $("kombnovy").disabled = strop;
    var zpr = $("kombzprava");
    zpr.textContent = strop ? t("komb.strop", { n: VLASTNI_MAX }) : "";
    zpr.hidden = !strop;

    renderRezKonec(rez);
    renderRezPruh(rez);
  }
  /* Řádek s přepínačem stavu: popis vlevo, tlačítko vpravo. Tlačítko hlásí
     stav (Zapnuto / Vypnuto), akci nese v title a aria-label. */
  function prepinacRadek(nadpis, podradek, zap, akce, klicZap, klicVyp){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.appendChild(kombPopis(nadpis, false, esc(podradek)));
    var btns = document.createElement("div");
    btns.className = "setbtns";
    var b = document.createElement("button");
    b.type = "button"; b.className = "ghost";
    stavTlacitko(b, zap, zap ? (klicVyp || "rezim.skupina.vypnout")
                             : (klicZap || "rezim.skupina.zapnout"));
    b.addEventListener("click", akce);
    btns.appendChild(b);
    row.appendChild(btns);
    return row;
  }
  /* Šest polí jedné šestice sazeb. Vypnutá šestice svoje pole schová — šest
     nul na obrazovce je horší než nic, protože vypadají jako nastavení, které
     se dá měnit. */
  function mrizkaSazeb(pole, pocet){
    var grid = document.createElement("div"), v;
    grid.className = "trojgrid";
    grid.dataset.skupina = String(pocet);
    for(v = 1; v <= 6; v++){ grid.appendChild(sazbaPole(pole, pocet, v)); }
    return grid;
  }
  /* Popisek pole je jazykově neutrální (3× 4), takže se nepřekládá; do
     aria-label se skládá věta, protože „3× 4“ přečtené nahlas nic neřekne. */
  function sazbaPole(pole, pocet, v){
    var wrap = document.createElement("label");
    wrap.className = "trojpole";
    var lbl = document.createElement("span");
    lbl.textContent = pocet + "× " + v;
    var vstup = kombPoleSazby(pole[v], true, function(x){ pole[v] = x; },
                              t("rezim.aria." + pocet, { v: v }), true);
    wrap.appendChild(lbl); wrap.appendChild(vstup);
    return wrap;
  }
  /* Vypnutí vynuluje celou šestici, zapnutí vrátí, co v ní bylo. Paměť je
     runtime, do úložiště nejde: uložený stav má mít jednu pravdu, a tou jsou
     ta čísla. */
  var samPamet = {}, stejPamet = {}, rozsPamet = {};
  function prepniSam(rez){
    if(sestiZap(rez.sam)){
      samPamet[rez.id] = rez.sam.slice();
      rez.sam = [0,0,0,0,0,0,0];
    } else {
      rez.sam = (samPamet[rez.id] || SAM_ZAKLAD).slice();
    }
    zmenaRezimu();
  }
  /* Sekce stejných čísel. V základním pohledu jeden práh a jedna mřížka,
     v rozšířeném pět podsekcí s vlastními přepínači — dvojice až šestice.
     Obojí kreslí tatáž mřížka, protože se liší jen tím, kolik jich je. */
  function renderRezStej(rez){
    var kam = $("rezstej"), i, n;
    var m = nejvyssiStej(rez), prah = prahStej(rez);
    /* Pravidlo nad skupinou se stěhuje pod tu skupinu, ke které zrovna patří.
       Než se sekce vyprázdní, musí se odvézt do bezpečí — innerHTML by ho
       jinak smazalo i s posluchači. */
    $("rezdetail").appendChild($("reznadwrap"));
    kam.innerHTML = "";
    stavTlacitko($("rezrozs"), rez.rozs, rez.rozs ? "rezim.rozs.vypnout" : "rezim.rozs.zapnout");
    $("rezprahrow").hidden = rez.rozs;
    if(!rez.rozs){
      naplnPrah(rez);
      stavTlacitko($("rezstejzap"), prah !== null,
                   prah !== null ? "rezim.stej.vypnout" : "rezim.stej.zapnout");
      $("rezprah").disabled = prah === null;
      if(prah !== null) kam.appendChild(mrizkaSazeb(rez.stej[prah], prah));
      umistiNad(rez, m, kam);
      return;
    }
    for(i = 0; i < POCTY_STEJ.length; i++){
      n = POCTY_STEJ[i];
      if(n > rez.kostek) continue;   /* víc stejných, než se hází, nikdy nepadne */
      kam.appendChild(stejOddil(rez, n, m));
    }
  }
  /* Nabídka prahu končí u počtu kostek režimu. Vypnutá sekce v ní drží
     poslední známý práh, aby zapnutí neskočilo jinam, než odkud se vyplo. */
  function naplnPrah(rez){
    var sel = $("rezprah"), n, o, prah = prahStej(rez);
    sel.innerHTML = "";
    for(n = 2; n <= rez.kostek; n++){
      o = document.createElement("option");
      o.value = String(n); o.textContent = n + "×";
      sel.appendChild(o);
    }
    if(prah === null) prah = Math.min(stejPamet[rez.id + ":prah"] || PRAH_ZAKLAD, rez.kostek);
    sel.value = String(prah);
  }
  /* Jedna podsekce rozšířeného pohledu: přepínač, mřížka a u nejvyšší
     zapnuté ještě pravidlo pro počty nad ní. */
  function stejOddil(rez, n, m){
    var wrap = document.createElement("div"), zap = stejZap(rez, n);
    wrap.dataset.stej = String(n);
    wrap.appendChild(prepinacRadek(t("rezim.stej." + n), tn("slovo.kostek", n), zap,
                                   function(){ prepniStej(rez, n); }));
    if(zap) wrap.appendChild(mrizkaSazeb(rez.stej[n], n));
    if(n === m) umistiNad(rez, m, wrap);
    return wrap;
  }
  /* Pravidlo nad nejvyšší zapnutou skupinou. Ukazuje se právě u ní, a jen
     když je nad čím extrapolovat — když je nejvyšší skupina zároveň počtem
     kostek režimu, žádný vyšší počet nepadne a řádek by lhal. */
  function umistiNad(rez, m, kam){
    var wrap = $("reznadwrap"), nadp = $("reznadp"), n;
    var videt = m !== null && m < rez.kostek;
    wrap.hidden = !videt;
    $("reznadnapoveda").hidden = true;
    $("reznadinfo").classList.remove("on");
    nadp.innerHTML = "";
    nadp.hidden = !videt || rez.nad !== "pevne";
    if(!videt) return;
    $("reznadtit").textContent = t("rezim.nadn." + (m + 1));
    $("reznad").value = rez.nad;
    if(rez.nad === "pevne"){
      for(n = m + 1; n <= rez.kostek; n++){ nadp.appendChild(nadPole(rez, n)); }
    }
    kam.appendChild(wrap);
  }
  /* Výchozí šestice pro nově zapnutý počet. Trojice mají zavedenou tabulku
     hodnota × 100, vyšší počty se od ní odvodí zdvojnásobením a dvojice
     hodnotou × 10 — čísla, se kterými jde dál pracovat, jsou lepší start
     než šest nul. */
  function vychoziStej(n){
    var pole = [0,0,0,0,0,0,0], v;
    for(v = 1; v <= 6; v++){
      pole[v] = n === 2 ? (v === 1 ? 10 : v) * 10
                        : TROJ_ZAKLAD[v] * Math.pow(2, n - 3);
    }
    return pole;
  }
  function prepniStej(rez, n){
    var klic = rez.id + ":" + n;
    if(stejZap(rez, n)){
      stejPamet[klic] = rez.stej[n].slice();
      delete rez.stej[n];
    } else {
      rez.stej[n] = (stejPamet[klic] || vychoziStej(n)).slice();
    }
    zmenaRezimu();
  }
  /* Přepínač celé sekce v základním pohledu. Vypnutí si pamatuje práh
     i sazby, aby se zapnutím vrátilo totéž, co zmizelo. */
  function prepniStejZaklad(rez){
    var prah = prahStej(rez), n;
    if(prah !== null){
      stejPamet[rez.id + ":" + prah] = rez.stej[prah].slice();
      stejPamet[rez.id + ":prah"] = prah;
      rez.stej = {};
    } else {
      n = Math.min(stejPamet[rez.id + ":prah"] || PRAH_ZAKLAD, rez.kostek);
      rez.stej = {};
      rez.stej[n] = (stejPamet[rez.id + ":" + n] || vychoziStej(n)).slice();
    }
    zmenaRezimu();
  }
  /* Posun prahu stěhuje šestici sazeb na nový počet — nevzniká druhá tabulka
     vedle první a hodnoty se přepisovat nemusí. V základním pohledu je klíč
     vždycky jediný, takže se mapa smí přepsat celá. */
  function posunPrah(rez, n){
    var prah = prahStej(rez), pole;
    if(!(n >= 2 && n <= rez.kostek) || prah === n) return;
    pole = prah === null ? null : rez.stej[prah];
    rez.stej = {};
    rez.stej[n] = pole ? pole.slice() : vychoziStej(n);
  }
  /* Návrat do základního pohledu nechá nejnižší zapnutý počet a ostatní
     odloží do runtime paměti: základní pohled umí ukázat jediný práh
     a mlčky bodovat podle něčeho, co není vidět, je horší než je vypnout. */
  function prepniRozs(rez){
    var prah, i, n, sebrane;
    if(rez.rozs){
      prah = prahStej(rez);
      sebrane = [];
      for(i = 0; i < POCTY_STEJ.length; i++){
        n = POCTY_STEJ[i];
        if(n === prah || !rez.stej[n]) continue;
        stejPamet[rez.id + ":" + n] = rez.stej[n].slice();
        sebrane.push(n);
        delete rez.stej[n];
      }
      /* Co sebral návrat do základního, to zapnutí rozšířeného vrátí —
         a jen to. Počet vypnutý ručně se sám zpátky neobjeví. */
      rozsPamet[rez.id] = sebrane;
      rez.rozs = false;
    } else {
      sebrane = rozsPamet[rez.id] || [];
      for(i = 0; i < sebrane.length; i++){
        n = sebrane[i];
        if(!rez.stej[n] && stejPamet[rez.id + ":" + n]) rez.stej[n] = stejPamet[rez.id + ":" + n].slice();
      }
      rozsPamet[rez.id] = [];
      rez.rozs = true;
    }
    zmenaRezimu();
  }
  function nadPole(rez, n){
    var wrap = document.createElement("label");
    wrap.className = "trojpole";
    var lbl = document.createElement("span");
    lbl.textContent = n + "×";
    var pole = kombPoleSazby(rez.nadP[n], true, function(x){ rez.nadP[n] = x; },
                             t("rezim.nadaria", { n: n }), true);
    wrap.appendChild(lbl); wrap.appendChild(pole);
    return wrap;
  }
  /* Pás je patička celého okna, ne prvek karty, takže se o svoje skrývání
     musí starat sám — jinak by visel i na kartě Obecné a nad seznamem. */
  function ukazRezPruh(){
    var pruh = $("rezriziko");
    /* Editor kombinace mění pravidla stejně jako detail režimu, takže pás
       patří i tam; nad seznamem a na kartě Obecné ne. */
    if(pruh) pruh.hidden = $("setcardrezimy").hidden ||
                           ($("rezdetail").hidden && $("kombdetail").hidden);
  }
  /* Text pásu. Vlastní dveře k překreslení, ne součást renderRezDetail():
     mění se i při psaní do pole se sazbou a celý oddíl se tam překreslovat
     nesmí. Ukazuje celou křivku — při stavbě pravidel je zajímavé právě to,
     jak riziko klesá s ubývajícími kostkami. */
  function renderRezPruh(rez){
    var pruh = $("rezriziko");
    if(!pruh) return;
    var tab = tabulkaRizika(rez), kusy = [], n;
    if(rizikoHotovo(rez)){
      for(n = 1; n <= rez.kostek; n++){
        kusy.push(t("rezim.riziko.pol", { n: n, p: desetina(tab[n - 1]) }));
      }
    } else {
      kusy.push(t("rezim.riziko.pocita"));
    }
    pruh.innerHTML = "<b>" + esc(t("rezim.riziko.n")) + "</b>" + esc(kusy.join(" · "));
  }
  /* Poslední řádek detailu: preset se vrací k výchozím hodnotám, vlastní se
     maže. Obojí dvoukrokově jako koše. Zvolený režim smazat nejde — jinak by
     rozehraná hra i volba ukazovaly na neexistující id. */
  function renderRezKonec(rez){
    var row = $("rezkonecrow");
    row.innerHTML = "";
    row.className = "setrow kombrow";
    var btns = document.createElement("div");
    btns.className = "setbtns";
    /* Duplikát je vždycky vlastní režim, i když se kopíruje preset — jinak
       by existovaly dva režimy s týmž id. */
    var dupl = document.createElement("button");
    dupl.type = "button"; dupl.className = "ghost"; dupl.textContent = t("rezim.dupl.btn");
    dupl.disabled = REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX;
    dupl.addEventListener("click", function(){ duplikujRezim(rez); });
    var duplRow = $("rezduplrow");
    duplRow.innerHTML = "";
    duplRow.className = "setrow kombrow";
    duplRow.appendChild(kombPopis(t("rezim.dupl.n"), false, esc(t("rezim.dupl.p"))));
    var duplBtns = document.createElement("div");
    duplBtns.className = "setbtns";
    duplBtns.appendChild(dupl);
    duplRow.appendChild(duplBtns);
    if(!rez.vlastni){
      var puvodni = odchylkyRezimu(rez) === null;
      row.appendChild(kombPopis(t("rezim.vychozi.n"), false, esc(t("rezim.vychozi.p"))));
      var ob = document.createElement("button");
      ob.type = "button"; ob.className = "ghost"; ob.textContent = t("rezim.vychozi.btn");
      ob.disabled = puvodni;
      ob.addEventListener("click", function(){
        var cerstvy = zPresetu(rez.id), k;
        for(k in cerstvy){ if(Object.prototype.hasOwnProperty.call(cerstvy, k)) rez[k] = cerstvy[k]; }
        ptamSeVzor = null;
        zmenaRezimu();
      });
      btns.appendChild(ob);
      row.appendChild(btns);
      return;
    }
    if(REZIMY.akt === rez.id){
      row.appendChild(kombPopis(t("rezim.smazat.n"), false, esc(t("rezim.nesmazat"))));
      row.appendChild(btns);
      return;
    }
    row.appendChild(kombPopis(t("rezim.smazat.n"), false, esc(t("rezim.smazat.p"))));
    var sm = document.createElement("button");
    sm.type = "button"; sm.className = "ghost"; sm.textContent = t("spol.smazat");
    sm.addEventListener("click", function(){
      ptamSeRezim = rez.id;
      naRezimSeznam();
    });
    btns.appendChild(sm);
    row.appendChild(btns);
  }
  /* Hluboká kopie: vlastní vzory dostanou nová id, aby si originál a kopie
     nepletly rozdělanou otázku na smazání. */
  function duplikujRezim(rez){
    if(REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX) return;
    var kopie = cistyRezim(venRezim(rez), novyIdRezimu(), VYCHOZI_REZIM);
    kopie.nazev = t("rezim.kopie", { n: nazevRezimu(rez) }).slice(0, NAZEV_MAX);
    kopie.v.forEach(function(vz){ vz.id = newId(); });
    REZIMY.sez.push(kopie);
    ulozRezimy();
    naRezimDetail(kopie.id);
  }
  function naRezimSeznam(){
    rezEdit = null; kombEdit = null;
    ptamSeVzor = null; ptamSeTvar = null;
    renderRezimy();
  }
  function naRezimDetail(id){
    rezEdit = id; kombEdit = null;
    ptamSeVzor = null; ptamSeRezim = null; ptamSeTvar = null;
    kombNovy = [];
    renderRezimy();
  }
  function naKombiDetail(id){
    kombEdit = id; ptamSeVzor = null; ptamSeTvar = null;
    kombNovy = [];
    renderRezimy();
  }
  function naKombiZpet(){
    kombEdit = null; ptamSeVzor = null; ptamSeTvar = null;
    kombNovy = [];
    renderRezimy();
  }
  function editKombi(){
    var rez = editRezim(), i;
    if(!rez || !kombEdit) return null;
    for(i = 0; i < rez.v.length; i++){ if(rez.v[i].id === kombEdit) return rez.v[i]; }
    return null;
  }
  /* Jediné dveře k překreslení celé karty: rozhodne, která ze tří podstránek
     je vidět, a doplní název režimu na přepínači karet. */
  function renderRezimy(){
    if(!$("rezrows")) return;
    var rez = editRezim();
    if(rezEdit && !rez){ rezEdit = null; }
    var k = editKombi();
    if(kombEdit && !k){ kombEdit = null; }
    var vDetailu = !!rez, vKombi = vDetailu && !!k;
    $("rezlist").hidden = vDetailu;
    $("rezdetail").hidden = !vDetailu || vKombi;
    $("kombdetail").hidden = !vKombi;
    var el = $("reznazev");
    if(el) el.textContent = "(" + nazevRezimu(aktRezim()) + ")";
    /* Seznam se kreslí vždycky, i když je zrovna schovaný pod detailem: je
       to pár řádků a odpadá tím celá třída chyb, kdy se návratem odkryl
       seznam z minula. Totéž platí o detailu pod editorem kombinace. */
    renderRezSeznam();
    if(vDetailu) renderRezDetail(rez);
    if(vKombi) renderKombDetail(rez, k);
    ukazRezPruh();
  }
  /* ---------- editor jedné vlastní kombinace ----------
     Jméno, body, stav a jeden až šest vzorů. Vzory jsou spojené „nebo“:
     kombinace boduje, jakmile sedne kterýkoli z nich, a platí pořád stejně. */
  function renderKombDetail(rez, k){
    $("kombtitul").textContent = nazevKombinace(k);
    if(document.activeElement !== $("kombnazevpole")) $("kombnazevpole").value = k.n || "";

    var bodyRow = $("kombbodyrow");
    bodyRow.innerHTML = "";
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.appendChild(kombPopis(t("komb.body.n"), false, esc(t("komb.body.p"))));
    row.appendChild(kombPoleSazby(k.b, true, function(v){ k.b = v; }));
    bodyRow.appendChild(row);

    var stavRow = $("kombstavrow");
    stavRow.innerHTML = "";
    stavRow.appendChild(prepinacRadek(t("komb.stav.n"), t("komb.stav.p"), k.z,
      function(){ k.z = !k.z; zmenaRezimu(); }, "komb.zapnout", "komb.vypnout"));

    var vzory = $("kombvzory");
    vzory.innerHTML = "";
    k.vz.forEach(function(x, i){ vzory.appendChild(kombVzorRadek(rez, k, i)); });

    renderKombiNovy();

    var sm = $("kombsmazrow");
    sm.innerHTML = "";
    sm.appendChild(kombSmazRadek(rez, k));
    renderRezPruh(rez);
  }
  /* Řádek jednoho vzoru: zápis, počet kostek a Smazat ve dvou krocích.
     Poslední vzor smazat nejde — kombinace bez vzoru by neměla co bodovat
     a v seznamu by visela naprázdno; od toho je Smazat celou kombinaci. */
  function kombVzorRadek(rez, k, i){
    var x = k.vz[i], row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.tvar = String(i);
    var btns = document.createElement("div");
    btns.className = "setbtns";

    if(ptamSeTvar === i){
      var otazka = document.createElement("div");
      otazka.className = "t";
      otazka.innerHTML = "<b>" + esc(t("komb.opravdusmazatvzor")) +
                         '</b><span class="zapis">' + esc(zapisVzoru(x)) + "</span>";
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){
        k.vz.splice(i, 1);
        ptamSeTvar = null;
        zmenaRezimu();
      });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", function(){ ptamSeTvar = null; renderRezimy(); });
      btns.appendChild(ano); btns.appendChild(ne);
      row.appendChild(otazka); row.appendChild(btns);
      return row;
    }

    var kostek = pocetKostekVzoru(x), vejde = kostek <= rez.kostek;
    var podradek = esc(tn("slovo.kostek", kostek)) +
                   (vejde ? "" : " · " + esc(t("komb.nevejde")));
    row.appendChild(kombPopis(zapisVzoru(x), true, podradek));
    var smaz = document.createElement("button");
    smaz.type = "button"; smaz.className = "ghost"; smaz.textContent = t("spol.smazat");
    smaz.disabled = k.vz.length < 2;
    smaz.addEventListener("click", function(){ ptamSeTvar = i; renderRezimy(); });
    btns.appendChild(smaz);
    row.appendChild(btns);
    return row;
  }
  /* Poslední řádek editoru: smazání celé kombinace, dvoukrokově jako všude
     jinde. Po smazání se editor zavře sám, protože nemá co ukazovat. */
  function kombSmazRadek(rez, k){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    var btns = document.createElement("div");
    btns.className = "setbtns";
    if(ptamSeVzor === k.id){
      row.appendChild(kombPopis(t("komb.opravdusmazat"), false, esc(nazevKombinace(k))));
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){ smazKombinaci(rez, k.id); });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", function(){ ptamSeVzor = null; renderRezimy(); });
      btns.appendChild(ano); btns.appendChild(ne);
    } else {
      row.appendChild(kombPopis(t("komb.smazat.n"), false, esc(t("komb.smazat.p"))));
      var smaz = document.createElement("button");
      smaz.type = "button"; smaz.className = "ghost"; smaz.textContent = t("spol.smazat");
      smaz.addEventListener("click", function(){ ptamSeVzor = k.id; renderRezimy(); });
      btns.appendChild(smaz);
    }
    row.appendChild(btns);
    return row;
  }
  /* Výchozí jméno je Kombinace 1, 2, … a materializuje se hned při vzniku:
     kdyby se dopočítávalo z pořadí, smazání sourozence by ostatní
     přejmenovalo. Hledá se první volné číslo. */
  function dalsiJmenoKombinace(rez){
    var jmena = {}, n = 1, i;
    for(i = 0; i < rez.v.length; i++) jmena[rez.v[i].n] = true;
    while(n < 99 && jmena[t("komb.vychozin", { n: n })]) n++;
    return t("komb.vychozin", { n: n });
  }
  /* Rozdělaný vzor se drží jako pole žetonů v pořadí naťukání: čísla 1–6 jsou
     konkrétní hodnoty, písmena "A"–"F" skupiny „libovolná, ale stejná“.
     Vzor z nich vyrobí vzorZZetonu() — na písmenech samotných nezáleží,
     A,A+B,B a B,B+C,C je týž vzor. */
  function vzorZZetonu(zetony){
    var pocty = [0,0,0,0,0,0,0], skup = {}, klice = [], t = [], i, z;
    for(i = 0; i < zetony.length; i++){
      z = zetony[i];
      if(typeof z === "number"){ pocty[z]++; continue; }
      if(!skup[z]){ skup[z] = 0; klice.push(z); }
      skup[z]++;
    }
    for(i = 0; i < klice.length; i++) t.push(skup[klice[i]]);
    t.sort(function(a, b){ return b - a; });
    return { v: rozbalPocty(pocty), t: t, pocty: pocty, tvar: t };
  }
  /* Rozdělaný vzor: čipy přidávají kostky, Vymazat je sebere všechny.
     Míň než dvě kostky vzor nedává — jedna kostka je buď samostatná hodnota,
     nebo (jako písmeno) tvar, který sedne na cokoli. */
  function renderKombiNovy(){
    var rez = editRezim(), k = editKombi();
    if(!rez || !k) return;
    var docasny = vzorZZetonu(kombNovy);
    $("kombvzor").textContent = kombNovy.length ? zapisVzoru(docasny) : "";
    $("kombvzorhint").textContent = kombNovy.length
      ? tn("slovo.kostek", kombNovy.length)
      : t("komb.naukej");
    /* Strop je počet kostek režimu: víc kostek, než se v něm hází, by dalo
       vzor, který nikdy nesedne. Zamyká obě řady stejně. */
    ["kombpips", "kombpism"].forEach(function(id){
      Array.prototype.forEach.call($(id).children, function(b){
        b.disabled = kombNovy.length >= rez.kostek;
      });
    });
    $("kombzrus").disabled = kombNovy.length === 0;
    var strop = k.vz.length >= VZORU_MAX;
    $("kombpridat").disabled = strop || kombNovy.length < 2;
    var zpr = $("kombvzorzprava");
    zpr.textContent = strop ? t("komb.stropvzoru", { n: VZORU_MAX }) : "";
    zpr.hidden = !strop;
  }

  var resetTimer = null, resetMsg = false;
  function disarmReset(){
    clearTimeout(resetTimer); resetTimer = null;
    var b = $("reset");
    b.classList.remove("warn");
    b.textContent = t("zapis.novahra");
  }
  /* Společný konec všech cest k nové hře. wipe() až po úspěšné záloze —
     jinak by rozehraná hra zmizela bez možnosti obnovy. Když se nepovede,
     hra prostě zůstane rozehraná. */
  function novaHra(){
    var b = $("reset");
    if(!kosPush()){
      resetMsg = true;
      b.classList.add("warn");
      b.textContent = t("nova.nezalohovano");
      setTimeout(function(){ resetMsg = false; disarmReset(); }, 4000);
      return false;
    }
    wipe();
    goTo(0);
    return true;
  }
  /* Neuložená hra si vyžádá ještě okno se třemi cestami ven. Hra, jejíž
     záznam někde je — v historii nebo v koši smazaných z historie — a od té
     doby se nehrálo, projde rovnou: ztratit se nemá co. */
  function neulozena(){
    return !gameEmpty() && (kdeZaznam() === "nikde" || S.dirty);
  }
  function reset(){
    var b = $("reset");
    if(resetMsg) return;            /* dokud svítí hláška, klik nic neznamená */
    if(gameEmpty()){ wipe(); goTo(0); return; }
    if(!resetTimer){
      b.classList.add("warn");
      b.textContent = t("nova.opravdu");
      resetTimer = setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset();
    if(neulozena()){ otevriNovaModal(b); return; }
    novaHra();
  }
  function otevriNovaModal(btn){
    var pot = potTotal();
    var zprava = t("nova.text");
    if(pot > 0) zprava += " " + t("nova.propadne", { b: fmt(pot) });
    $("newtext").textContent = zprava;
    otevriModal("newmodal", btn);
  }

  /* ---------- vykreslení ---------- */
  /* ---------- automatické ukládání ----------
     Hra se po skončení zapíše do historie sama. Vypnuté ve výchozím stavu.
     Volba žije v localStorage vedle motivu a nezhasínání — je to jediný
     boolean, který se čte při startu a nikdy nepovyroste.

     Pouští se z bank(), bust() a ze změny cíle či limitu, tedy ze tří míst,
     kde se stav zámku může změnit. Ne z render(): ten běží i při startu
     a při obnově z koše, takže by se dohraná hra ukládala sama i tam, kde
     o to nikdo nežádal.

     S.autoUlozeno hlídá, aby se totéž nedělalo znovu po každém překreslení
     a po reloadu. render() ho nuluje, jakmile zámek přestane platit — po
     smazání kola se tak dá hra dohrát znovu a záznam se aktualizuje. */
  var AUKEY = "farkle-autoulozeni-v1";
  var autoZap = false, autoBezi = false;
  try{ autoZap = localStorage.getItem(AUKEY) === "1"; }catch(e){}

  var toastTimer = null;
  /* Šev mezi hlavičkou a kartami. Když měření selže (jsdom nemá layout,
     rects jsou nuly), zůstane top z minula a nic se nerozbije. */
  function umistiToast(el){
    var h = document.querySelector(".top"), k = document.querySelector(".tabs");
    if(!h || !k) return;
    var a = h.getBoundingClientRect().bottom, b = k.getBoundingClientRect().top;
    if(b <= 0) return;
    el.style.top = Math.round((a + b) / 2) + "px";
  }
  function toast(text){
    var el = $("toast");
    if(!el) return;
    $("toasttext").textContent = text;
    el.hidden = false;
    umistiToast(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(schovejToast, 5000);
  }
  function schovejToast(){
    clearTimeout(toastTimer); toastTimer = null;
    var el = $("toast");
    if(el) el.hidden = true;
  }

  function zkusAutoUlozit(){
    if(!autoZap || autoBezi) return;
    if(!locked() || gameEmpty() || S.autoUlozeno) return;
    var kde = kdeZaznam();
    /* Co bylo smazané ručně, se ručně i vrací. Automat záznam z koše
       nevytahuje, jinak by rušil rozhodnutí, které uživatel udělal. */
    if(kde === "kos"){ S.autoUlozeno = true; save(); return; }
    /* hra v historii je a od té doby se nehrálo: není co zapisovat */
    if(kde === "historie" && !S.dirty){ S.autoUlozeno = true; save(); return; }
    var aktualizace = (kde === "historie");
    autoBezi = true;
    zapisHru(function(ok){
      autoBezi = false;
      if(!ok){ selhalZapis(); return; }   /* pop-up jen po potvrzeném zápisu */
      S.autoUlozeno = true;
      save();
      toast(t(aktualizace ? "toast.aktualizovan" : "toast.ulozena"));
    });
  }

  /* Boduje v tom režimu aspoň jedna hodnota při tomhle počtu kostek? Podle
     toho se čip počtu ukazuje. Pokrývá i případ, kdy jsou trojice vypnuté
     a čtyři a víc se platí pevnými body: 3× zmizí, 4× až 6× zůstanou. */
  function pocetBoduje(rez, count){
    for(var v = 1; v <= 6; v++){ if(kindPoints(v, count, rez) > 0) return true; }
    return false;
  }
  function renderKind(){
    var l = left(), lock = locked(), rez = aktRezim(), prvni = null;
    Array.prototype.forEach.call(elPips.children, function(b){
      b.classList.toggle("sel", Number(b.dataset.value) === selValue);
      b.disabled = lock;
    });
    /* Počet, kterým se v režimu nedá nic odložit, se skrývá, ne jen zašedne —
       trvale zamčené tlačítko by jen matlo. 1× nastupuje jen tehdy, když se
       samostatné hodnoty nevešly do vlastní řady čipů. */
    Array.prototype.forEach.call(elCounts.children, function(b){
      var c = Number(b.dataset.count);
      var videt = c <= rez.kostek && pocetBoduje(rez, c) &&
                  (c !== 1 || pocetSamostatnych(rez) > SAMOSTATNE_V_RADE);
      b.hidden = !videt;
      if(videt && prvni === null) prvni = c;
      b.classList.toggle("sel", c === selCount);
      b.disabled = lock || c > l;
    });
    /* Vybraný počet zmizel z nabídky (jiný režim, vypnutá skupina) —
       přesune se na první, který zůstal. */
    if(prvni !== null && elCounts.querySelector('[data-count="' + selCount + '"]').hidden){
      selCount = prvni;
      Array.prototype.forEach.call(elCounts.children, function(b){
        b.classList.toggle("sel", Number(b.dataset.count) === selCount);
      });
    }
    var ok = selValue !== null && selCount <= l && !lock && kindPoints(selValue, selCount, rez) > 0;
    elAddKind.disabled = !ok;
    elAddKind.textContent = t("pocitadlo.plus", { b: ok ? fmt(kindPoints(selValue, selCount, rez)) : "0" });
  }

  /* ---------- čipy postupek a kombinací v klávesnici ----------
     Postupky i přednastavené kombinace stojí v HTML natvrdo a jen se skrývají,
     takže snapshot prvků i sběr češtiny při startu fungují beze změny. Co je
     z nich vidět, rozhoduje herní režim. Vlastní vzory bydlí v panelu za čipem
     „vlastní“: jejich popisek je dlouhý a je jich až osm, takže by řada
     přestala být shora omezená. */
  function renderKombi(){
    var l = left(), lock = locked(), rez = aktRezim(), videt = 0, post = 0, komb = 0;
    elDataStr.forEach(function(b){
      var k = b.dataset.str, zap = rez.post[k] > 0 && STRAIGHTS[k].d <= rez.kostek;
      if(zap){ b.removeAttribute("hidden"); post++; } else b.setAttribute("hidden", "");
      b.disabled = lock || STRAIGHTS[k].d > l;
      b.querySelector(".v").textContent = fmt(rez.post[k] || 0);
    });
    elDataKombi.forEach(function(b){
      var k = b.dataset.kombi, zap = kombZap(rez, k) && kombVRezimu(rez, k);
      if(zap){ b.removeAttribute("hidden"); komb++; } else b.setAttribute("hidden", "");
      b.disabled = lock || PRESETY[k].d > l;
      b.querySelector(".v").textContent = fmt(sazba(rez, k));
    });
    /* Řada samostatných hodnot: do tří čipů se vejde beze změny velikosti,
       při čtyřech a víc mizí celá i s nadpisem a zadává se přes 1× ve
       Stejných hodnotách. Popisek je týž text jako štítek v historii, takže
       se ta dvě místa nemají kde rozejít. */
    var samo = pocetSamostatnych(rez), radaVidet = samo > 0 && samo <= SAMOSTATNE_V_RADE;
    elDataSingle.forEach(function(b){
      var v = Number(b.dataset.single), body = rez.sam[v] || 0;
      if(radaVidet && body > 0) b.removeAttribute("hidden"); else b.setAttribute("hidden", "");
      b.disabled = lock || l < 1;
      b.firstChild.textContent = textKodu(SAM_KODY[v]);
      b.querySelector(".v").textContent = fmt(body);
    });
    elSingleRow.hidden = !radaVidet;
    elSingleCap.hidden = !radaVidet;
    /* Nadpis řady mluví o tom, co v ní právě je: v režimu bez postupek by
       „Postupky“ byla nepravda a řada se schovat nemůže — sedí v ní čip
       „vlastní“, jediná cesta k ručnímu zadání. */
    elStrCap.textContent = t(post ? (komb ? "pocitadlo.postupkykomb" : "pocitadlo.postupky")
                                  : "pocitadlo.kombinace");
    /* Zalomení se srovnává podle počtu viditelných čipů: samo od sebe by
       se pět zalomilo jako 4 + 1 a osamělý čip by zabral celou šířku. */
    Array.prototype.forEach.call(elStrRow.children, function(el){ if(!el.hidden) videt++; });
    ["k5","k6","k7","k8","k9"].forEach(function(c){ elStrRow.classList.remove(c); });
    if(videt >= 5 && videt <= 9) elStrRow.classList.add("k" + videt);

    renderVlastniCipy(rez, l, lock);
  }
  /* Kombinace s víc vzory se odkládá jedním čipem, dokud je jasné, kolik
     kostek to stojí. Když se do zbývajících kostek vejdou vzory o různých
     velikostech, řada se na místě překlopí na volbu — stejný dvoukrokový
     vzor jako mazání v koších, a klik navíc jen tehdy, když je opravdu
     z čeho vybírat. */
  var vybiramKombi = null;
  function renderVlastniCipy(rez, l, lock){
    var komb = kombinaceZap(rez), vybrana = null;
    elVlastniRow.innerHTML = "";
    komb.forEach(function(k){ if(k.id === vybiramKombi) vybrana = k; });
    if(vybrana && !lock){
      elVlastniRow.appendChild(kombiVolbaCip(vybrana, l));
      poctyKostekKombinace(vybrana, Math.min(rez.kostek, l)).forEach(function(n){
        var b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.dataset.kostek = String(n);
        b.textContent = tn("pocitadlo.kostzkr", n);
        b.addEventListener("click", function(){
          vybiramKombi = null;
          keep(kodVzoru(vybrana, n), vybrana.b, n);
        });
        elVlastniRow.appendChild(b);
      });
      elVlastniRow.hidden = false;
      return;
    }
    vybiramKombi = null;
    komb.forEach(function(k){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.vzor = k.id;
      b.innerHTML = esc(nazevKombinace(k)) + '<span class="v">' + esc(fmt(k.b)) + "</span>";
      var moznosti = poctyKostekKombinace(k, Math.min(rez.kostek, l));
      b.disabled = lock || moznosti.length === 0;
      b.addEventListener("click", function(){
        var moc = poctyKostekKombinace(k, Math.min(rez.kostek, left()));
        if(!moc.length) return;
        if(moc.length === 1){ keep(kodVzoru(k, moc[0]), k.b, moc[0]); return; }
        vybiramKombi = k.id;
        render();
      });
      elVlastniRow.appendChild(b);
    });
    elVlastniRow.hidden = komb.length === 0;
  }
  /* První čip volby je sama kombinace: říká, o kterou jde, a klepnutím
     volbu zruší. */
  function kombiVolbaCip(k, l){
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip on"; b.dataset.vzor = k.id;
    b.innerHTML = esc(nazevKombinace(k)) + '<span class="v">' + esc(t("komb.vyberkostek")) + "</span>";
    b.addEventListener("click", function(){ vybiramKombi = null; render(); });
    return b;
  }
  /* Kód nese body a počet kostek použitého vzoru, ne odkaz na kombinaci
     v nastavení — k1500x5 se přečte i po jejím smazání a na cizím telefonu. */
  function kodVzoru(k, kostek){ return "k" + k.b + "x" + kostek; }

  /* Vrubovka i přehledové dlaždice se kreslí z otisku hry, takže stejný kód
     obslouží rozehranou hru i hru vytaženou z historie. */
  function tallyInto(elBars, elCap, rec){
    elBars.innerHTML = "";
    var i, s;

    if(rec.mode === "rounds"){
      var played = gKol(rec);
      var kol = rec.roundGoal > 0 ? Math.min(40, rec.roundGoal) : Math.min(40, played);
      for(i = 0; i < kol; i++){
        s = document.createElement("i");
        if(i < played) s.className = "cut";
        elBars.appendChild(s);
      }
      if(rec.roundGoal > 0){
        elCap.textContent = t("tally.kolzn", { n: played, z: rec.roundGoal });
      } else {
        elCap.textContent = played ? t("tally.koln", { n: played }) : t("tally.zadnekolo");
      }
      return;
    }

    var step = Math.max(100, Math.round(rec.goal / 8 / 100) * 100);
    var n = Math.min(40, Math.max(4, Math.round(rec.goal / step)));
    var done = Math.max(0, Math.min(n, Math.floor(rec.banked / step)));
    for(i = 0; i < n; i++){
      s = document.createElement("i");
      if(i < done) s.className = "cut";
      elBars.appendChild(s);
    }
    var rest = rec.goal - rec.banked;
    elCap.textContent = rest > 0 ? t("tally.docile", { b: fmt(rest) })
                                 : t("tally.prekonano", { b: fmt(-rest) });
  }
  function renderTally(){ tallyInto(elTally, elTallyCap, snapshot()); }

  /* přepočítá, kolika kostkami se v jednotlivých hodech háže,
     když se z kola odebere položka kdekoliv */
  function rechain(){
    S.rolls = S.rolls.filter(function(r, i){ return r.items.length || i === S.rolls.length - 1; });
    if(!S.rolls.length) S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    S.rolls[0].thrown = kostek();
    S.rolls[0].hot = false;
    for(var i = 1; i < S.rolls.length; i++){
      var prev = S.rolls[i-1];
      var rest = prev.thrown - usedInRoll(prev);
      S.rolls[i].thrown = rest > 0 ? rest : kostek();
      S.rolls[i].hot = rest === 0;
    }
  }
  function removeEntry(ri, ii){
    if(!S.rolls[ri]) return;
    S.rolls[ri].items.splice(ii, 1);
    rechain();
    render();
  }

  function renderFix(){
    elFix.innerHTML = "";
    var any = S.rolls.some(function(r){ return r.items.length; });
    if(!any){
      elFix.innerHTML = '<div class="none">' + esc(t("oprava.nic")) + '</div>';
      return;
    }
    S.rolls.forEach(function(r, ri){
      if(!r.items.length) return;
      var lbl = document.createElement("div");
      lbl.className = "lbl";
      lbl.innerHTML = '<span>' + esc(t("oprava.hod", { n: ri + 1, k: r.thrown }) +
                        (r.hot ? " \u00B7 " + t("oprava.horke") : "")) + '</span>' +
                      '<b>' + fmt(rollPoints(r)) + '</b>';
      var grp = document.createElement("div");
      grp.className = "grp";
      r.items.forEach(function(it, ii){
        var b = document.createElement("button");
        b.type = "button";
        b.className = "ent";
        b.innerHTML = '<span>' + esc(stitek(it)) + '</span><b>' + fmt(it.p) + '</b>';
        b.title = t("oprava.smazatpolozku");
        b.addEventListener("click", function(){ removeEntry(ri, ii); });
        grp.appendChild(b);
      });
      elFix.appendChild(lbl);
      elFix.appendChild(grp);
    });
  }

  /* Farkle se do dat nezapisuje, dopisuje se až tady jako poslední úsek —
     stará historie ho tak dostane taky, bez jakékoli migrace. Živá tabulka
     kol i nedotknutelný náhled hry z historie skládají buňku touhle jednou
     funkcí, aby se obě podoby nemohly rozejít. */
  function bunkaPopisu(tah){
    var p = esc(popisKola(tah));
    if(tah.bust) return p ? p + " \u00B7 " + esc(t("slovo.farkle")) : esc(t("slovo.farkle"));
    return p || "&nbsp;";
  }
  function rowsHTML(turns){
    var run = 0, out = "";
    (turns || []).forEach(function(tah, i){
      if(!tah.bust) run += tah.p;
      out += '<tr' + (tah.bust ? ' class="f"' : '') + '>' +
        '<td class="n">' + (i + 1) + '</td>' +
        '<td class="d">' + bunkaPopisu(tah) + '</td>' +
        '<td class="g">' + fmt(tah.p || 0) + '</td>' +
        '<td class="s">' + fmt(run) + '</td></tr>';
    });
    return out;
  }
  /* režim oprav v zápise kol: fixMode zapíná křížky u řádků,
     pendingDel drží index kola, u kterého se právě ptáme na potvrzení.
     řádky se tu skládají po prvcích, ne přes rowsHTML — ten zůstává
     pro nedotknutelný náhled hry z historie. */
  var fixMode = false, pendingDel = null;

  function deleteTurn(i){
    var t = S.turns[i];
    if(!t) return;
    if(!t.bust){ S.banked -= t.p; }
    S.turns.splice(i, 1);
    pendingDel = null;
    if(!S.turns.length){ fixMode = false; }
    S.dirty = true;
    render();
  }

  function renderRows(){
    elRows.innerHTML = "";
    if(pendingDel !== null && !S.turns[pendingDel]) pendingDel = null;

    var fb = $("fixturns");
    fb.style.display = S.turns.length ? "" : "none";
    fb.classList.toggle("on", fixMode);
    fb.setAttribute("aria-pressed", fixMode ? "true" : "false");
    fb.textContent = t(fixMode ? "zapis.hotovo" : "zapis.opravit");

    var run = 0;
    var frag = document.createDocumentFragment();
    S.turns.forEach(function(tah, i){
      if(!tah.bust) run += tah.p;
      var tr = document.createElement("tr");

      if(pendingDel === i){
        tr.className = "confirm";
        var td = document.createElement("td");
        td.colSpan = 5;
        var wrap = document.createElement("div");
        wrap.className = "cf";
        var q = document.createElement("span");
        q.className = "q";
        q.textContent = t("zapis.opravdusmazat", { n: i + 1 });
        var yes = document.createElement("button");
        yes.type = "button"; yes.className = "mini danger"; yes.textContent = t("spol.smazat");
        yes.addEventListener("click", function(){ deleteTurn(i); });
        var no = document.createElement("button");
        no.type = "button"; no.className = "mini"; no.textContent = t("spol.zrusit");
        no.addEventListener("click", function(){ pendingDel = null; renderRows(); });
        wrap.appendChild(q); wrap.appendChild(yes); wrap.appendChild(no);
        td.appendChild(wrap);
        tr.appendChild(td);
        frag.appendChild(tr);
        return;
      }

      if(tah.bust) tr.className = "f";
      tr.innerHTML =
        '<td class="n">' + (i + 1) + '</td>' +
        '<td class="d">' + bunkaPopisu(tah) + '</td>' +
        '<td class="g">' + fmt(tah.p || 0) + '</td>' +
        '<td class="s">' + fmt(run) + '</td>';

      if(fixMode){
        var xtd = document.createElement("td");
        xtd.className = "x";
        var x = document.createElement("button");
        x.type = "button"; x.className = "delbtn"; x.innerHTML = "\u00D7";
        x.title = t("zapis.smazatkolo", { n: i + 1 });
        x.setAttribute("aria-label", x.title);
        x.addEventListener("click", function(){ pendingDel = i; renderRows(); });
        xtd.appendChild(x);
        tr.appendChild(xtd);
      }

      frag.appendChild(tr);
    });
    elRows.appendChild(frag);
    elEmpty.style.display = S.turns.length ? "none" : "block";
  }

  /* Pravidla otevřená z karty Herních režimů se po zavření vracejí do
     nastavení. Příznak drží okno pravidel, spotřebuje ho obsluha zavírání. */
  var zNastaveni = false;
  function vratDoNastaveni(){
    if(!zNastaveni) return false;
    zNastaveni = false;
    naKartuNastaveni(1);
    renderRezimy();
    otevriModal("setmodal", null);
    return true;
  }

  /* ---------- tabulka pravidel podle režimu ----------
     Řádek se do tabulky dostane jen tehdy, když v tom režimu doopravdy
     boduje. Kombinace navíc a vlastní vzory se sázejí týmž textem jako čip
     v klávesnici a štítek v historii — malým písmenem, ať se to na třech
     místech nerozejde. */
  function pravRadek(nazev, hodnota){
    return "<tr><td>" + esc(nazev) + "</td><td>" + esc(hodnota) + "</td></tr>";
  }
  /* Řádky jedné skupiny stejných čísel. Trojice se slijí do jednoho řádku,
     jen když jdou úměrně hodnotě — jinak by se rozsah 200–600 vztahoval na
     tabulku, která takhle nevypadá. Počty od čtyř výš se sázejí týmž zápisem
     jako štítek v historii („4× 5“), aby se ta dvě místa nerozešla. */
  function stejnaRadky(rez, n){
    var pole = rez.stej[n], tab = "", v, nasobek, stejny = true;
    if(n === 3){
      if(pole[1] > 0) tab += pravRadek(t("pravidla.troj.1"), fmt(pole[1]));
      nasobek = pole[2] / 2;
      for(v = 2; v <= 6; v++){ if(!(pole[v] > 0) || pole[v] !== v * nasobek) stejny = false; }
      if(stejny) return tab + pravRadek(t("pravidla.t4n"), fmt(pole[2]) + "–" + fmt(pole[6]));
      for(v = 2; v <= 6; v++){
        if(pole[v] > 0) tab += pravRadek(t("pravidla.troj." + v), fmt(pole[v]));
      }
      return tab;
    }
    for(v = 1; v <= 6; v++){
      if(!(pole[v] > 0)) continue;
      tab += pravRadek(n === 2 ? t("pravidla.dvoj." + v) : t("stitek.n", { p: n, h: v }), fmt(pole[v]));
    }
    return tab;
  }
  function pravidlaHTML(rez){
    var out = "", tab = "", v, i, n, k, komb;
    var m = nejvyssiStej(rez), pocty = poctyStej(rez);
    out += "<p>" + t("pravidla.p1", { kostky: esc(tn("slovo.kostkami", rez.kostek)) }) + "</p>";
    out += "<p>" + t("pravidla.p2") + "</p>";
    out += "<p>" + t("pravidla.p3", { kostky: esc(tn("slovo.kostkami", rez.kostek)) }) + "</p>";

    for(v = 1; v <= 6; v++){
      if(rez.sam[v] > 0) tab += pravRadek(t("pravidla.sam." + v), fmt(rez.sam[v]));
    }
    for(i = 0; i < pocty.length; i++){ tab += stejnaRadky(rez, pocty[i]); }
    /* Počty nad nejvyšší nastavenou skupinou patří do tabulky, ne do poznámky:
       jen tak se vypíše právě tolik počtů, kolik se jich v tom režimu vejde.
       Násobek se sází číslem, ne slovem — práh se dá posunout, takže
       „dvojnásobek trojice“ by u jiné skupiny lhal. */
    if(m !== null){
      for(n = m + 1; n <= rez.kostek; n++){
        tab += pravRadek(t("pravidla.stejnych." + n), rez.nad === "pevne"
          ? fmt(rez.nadP[n] || 0)
          : "×" + (rez.nad === "nasobek" ? (n - m + 1) : Math.pow(2, n - m)));
      }
    }
    for(i = 0; i < POST_PORADI.length; i++){
      k = POST_PORADI[i];
      if(!(rez.post[k] > 0) || STRAIGHTS[k].d > rez.kostek) continue;
      tab += pravRadek(t("pravidla.post." + k), fmt(rez.post[k]));
    }
    for(i = 0; i < PRESET_PORADI.length; i++){
      k = PRESET_PORADI[i];
      if(!kombZap(rez, k) || !kombVRezimu(rez, k)) continue;
      tab += pravRadek(t("stitek." + PRESETY[k].k), fmt(sazba(rez, k)));
    }
    /* Vlastní kombinace se sázejí jménem a za ním zápisem vzorů — týmž
       zápisem jako v nastavení, ať se ta dvě místa nerozejdou. */
    komb = kombinaceZap(rez);
    for(i = 0; i < komb.length; i++){
      tab += pravRadek(nazevKombinace(komb[i]) + " · " + zapisKombinace(komb[i]), fmt(komb[i].b));
    }
    out += "<table>" + (tab || pravRadek(t("pravidla.nicneboduje"), "—")) + "</table>";

    if(!pocetKombinaci(rez)) out += '<p class="note">' + esc(t("pravidla.pozn2")) + "</p>";
    if(!rez.vlastni) out += '<p class="note">' + t("rezim.pozn." + rez.id) + "</p>";
    return out;
  }

  /* ---------- dvě karty v okně s informacemi ---------- */
  var otevriNavod = null, otevriPravidla = null, prekresliPravidla = null;
  (function(){
    var tlac = $("infoseg").children;
    var karty = [$("cardrules"), $("cardguide")];
    /* Které pravidla se právě ukazují: null je aktivní režim (tlačítko „i“),
       jinak ten, u kterého se kleplo v nastavení. */
    var ukazujeme = null;
    function vyber(i){
      karty.forEach(function(k, j){ k.hidden = j !== i; });
      Array.prototype.forEach.call(tlac, function(b, j){ b.classList.toggle("on", j === i); });
      var telo = $("rulesmodal").querySelector(".modalbody");
      if(telo) telo.scrollTop = 0;
    }
    function kresli(){
      var rez = (ukazujeme && rezimPodleId(ukazujeme)) || aktRezim();
      $("pravidlarezim").textContent = nazevRezimu(rez);
      $("pravidlatelo").innerHTML = pravidlaHTML(rez);
    }
    Array.prototype.forEach.call(tlac, function(b, i){
      b.addEventListener("click", function(){ vyber(i); });
    });
    $("infobtn").addEventListener("click", function(){
      ukazujeme = null; zNastaveni = false; kresli(); vyber(0);
    });
    otevriNavod = function(){
      ukazujeme = null; zNastaveni = false; kresli();
      vyber(1);
      otevriModal("rulesmodal", null);
    };
    otevriPravidla = function(id){
      ukazujeme = id; kresli();
      vyber(0);
      /* Pravidla otevřená z nastavení jsou odbočka, ne odchod: zavírací cesta
         okna (křížek, tmavé pozadí i Escape) vrátí nastavení tam, kde bylo. */
      zNastaveni = true;
      otevriModal("rulesmodal", null);
    };
    prekresliPravidla = kresli;
    kresli();
  })();

  /* ---------- ovládání karty Herní režimy ----------
     Přepínače a výběry překreslují oddíl celý, protože mění, co je vidět;
     textová a číselná pole jen ukládají, jinak by uprostřed psaní ztratila
     kurzor. */
  (function(){
    if(!$("rezback")) return;
    $("rezback").addEventListener("click", naRezimSeznam);
    $("reznovy").addEventListener("click", function(){
      if(REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX) return;
      var rez = cistyRezim(null, novyIdRezimu(), VYCHOZI_REZIM);
      rez.nazev = t("rezim.beznazvu");
      REZIMY.sez.push(rez);
      ulozRezimy();
      naRezimDetail(rez.id);
    });
    $("reznazevpole").addEventListener("input", function(){
      var rez = editRezim();
      if(!rez) return;
      rez.nazev = $("reznazevpole").value.slice(0, NAZEV_MAX);
      ulozRezimy();
      $("reztitul").textContent = nazevRezimu(rez);
      var el = $("reznazev");
      if(el) el.textContent = nazevRezimu(aktRezim());
    });
    $("rezkostek").addEventListener("change", function(){
      var rez = editRezim();
      if(!rez) return;
      rez.kostek = parseInt($("rezkostek").value, 10) === 5 ? 5 : 6;
      /* Rozehraná hra tu být nemůže (přepnout režim jde jen nad prázdnou),
         ale prázdný hod se musí srovnat hned — jinak by se dál házelo
         šesti kostkami v pětikostkovém režimu. */
      if(REZIMY.akt === rez.id && gameEmpty()) S.rolls = [{thrown: rez.kostek, hot:false, items:[]}];
      if(kombNovy.length > rez.kostek) kombNovy = kombNovy.slice(0, rez.kostek);
      zmenaRezimu();
    });
    /* Rozšířený rozpad a práh: obojí sahá na tutéž tabulku, takže obojí musí
       jít přes zmenaRezimu(), ne jen překreslit nastavení. */
    $("rezrozs").addEventListener("click", function(){
      var rez = editRezim();
      if(rez) prepniRozs(rez);
    });
    $("rezstejzap").addEventListener("click", function(){
      var rez = editRezim();
      if(rez) prepniStejZaklad(rez);
    });
    $("rezprah").addEventListener("change", function(){
      var rez = editRezim();
      if(!rez) return;
      posunPrah(rez, parseInt($("rezprah").value, 10));
      zmenaRezimu();
    });
    /* Nová kombinace se zakládá rovnou s jedním vzorem: kombinace bez vzoru
       by neměla co bodovat a v seznamu by visela naprázdno. Dvojice
       libovolných stejných je nejmenší smysluplný vzor a v editoru se přepíše
       za pár klepnutí. */
    $("kombnovy").addEventListener("click", function(){
      var rez = editRezim();
      if(!rez || rez.v.length >= VLASTNI_MAX) return;
      var k = { id: newId(), n: dalsiJmenoKombinace(rez), b: 250, z: true,
                vz: [ cistyTvar({ v: [], t: [2] }) ] };
      rez.v.push(k);
      ulozRezimy();
      naKombiDetail(k.id);
    });
    $("kombback").addEventListener("click", naKombiZpet);
    $("kombnazevpole").addEventListener("input", function(){
      var k = editKombi();
      if(!k) return;
      k.n = $("kombnazevpole").value.slice(0, NAZEV_MAX);
      ulozRezimy();
      $("kombtitul").textContent = nazevKombinace(k);
      /* Jméno stojí i na čipu a v tabulce pravidel; celý editor se ale
         překreslovat nesmí, pole by uprostřed psaní ztratilo kurzor. */
      if(prekresliPravidla) prekresliPravidla();
      render();
    });
    /* Nápověda se přepíná na místě, ne dalším oknem: text je krátký a .msg
       pod řádkem je v tomhle okně zavedený vzor. */
    $("reznadinfo").addEventListener("click", function(){
      var el = $("reznadnapoveda");
      if(el.hidden) el.innerHTML = t("rezim.nad.napoveda");
      el.hidden = !el.hidden;
      $("reznadinfo").classList.toggle("on", !el.hidden);
    });
    $("reznad").addEventListener("change", function(){
      var rez = editRezim();
      if(!rez) return;
      var v = $("reznad").value;
      rez.nad = NAD_DRUHY.indexOf(v) >= 0 ? v : "x2";
      zmenaRezimu();
    });
  })();

  /* ---------- návod při prvním spuštění a po aktualizaci ----------
     číslo verze drží service worker, aplikace si o něj řekne zprávou —
     ať je verze jen na jednom místě. Když worker není k dispozici
     (jiný prohlížeč, otevřeno ze souboru), ukáže se návod jen poprvé. */
  var NKEY = "farkle-navod-v1";
  function zjistiVerzi(hotovo){
    if(!("serviceWorker" in navigator)){ hotovo(null); return; }
    var vyrizeno = false;
    function dokonci(v){
      if(vyrizeno) return;
      vyrizeno = true;
      clearTimeout(cas);
      hotovo(v);
    }
    var cas = setTimeout(function(){ dokonci(null); }, 2000);
    navigator.serviceWorker.ready.then(function(reg){
      var sw = reg.active;
      if(!sw){ dokonci(null); return; }
      var kanal = new MessageChannel();
      kanal.port1.onmessage = function(e){
        dokonci(e.data && e.data.verze ? e.data.verze : null);
      };
      sw.postMessage({ dotaz: "verze" }, [kanal.port2]);
    }).catch(function(){ dokonci(null); });
  }
  function zkontrolujNavod(){
    zjistiVerzi(function(verze){
      var znacka = verze || "bez-verze";
      var videno = null;
      try { videno = localStorage.getItem(NKEY); } catch(e){}
      if(videno === znacka) return;
      try { localStorage.setItem(NKEY, znacka); } catch(e){}
      otevriNavod();
    });
  }

  /* ---------- panel nastavení hry ---------- */
  (function(){
    var btn = $("gamebtn"), panel = $("setup");
    function open(show){
      panel.hidden = !show;
      btn.classList.toggle("on", show);
      btn.setAttribute("aria-expanded", show ? "true" : "false");
    }
    btn.addEventListener("click", function(){ open(panel.hidden); });
    /* klepnutí mimo panel ho zavře */
    document.addEventListener("click", function(e){
      if(panel.hidden) return;
      if(panel.contains(e.target) || btn.contains(e.target)) return;
      open(false);
    });
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && !panel.hidden) open(false);
    });
  })();

  /* ---------- harmonika v nastavení ----------
     Nativní <details> kvůli klávesnici a čtečce; výlučnost (jen jeden oddíl
     otevřený) si hlídáme sami, protože atribut name na <details> je v
     prohlížečích čerstvý a bez něj by zůstaly otevřené všechny.
     Při otevření okna se všechny zavřou, aby karta začínala vždycky stejně. */
  var setSekce = Array.prototype.slice.call(document.querySelectorAll("#setmodal .setsec"));
  setSekce.forEach(function(sec){
    sec.addEventListener("toggle", function(){
      if(!sec.open) return;
      setSekce.forEach(function(x){ if(x !== sec) x.open = false; });
    });
  });
  function zavriSekce(){ setSekce.forEach(function(x){ x.open = false; }); }

  /* ---------- dvě karty v okně nastavení ----------
     Stejný vzor jako dvě karty v okně s informacemi (#infoseg): přepínač
     přehazuje `hidden` a `.on`, obsah zůstává v DOMu, takže se nic
     nepřestavuje. Okno vždycky začíná na první kartě. */
  var naKartuNastaveni = null;
  (function(){
    var tlac = $("setseg").children;
    var karty = [$("setcardobecne"), $("setcardrezimy")];
    naKartuNastaveni = function(i){
      karty.forEach(function(k, j){ k.hidden = j !== i; });
      Array.prototype.forEach.call(tlac, function(b, j){ b.classList.toggle("on", j === i); });
      var telo = $("setmodal").querySelector(".modalbody");
      if(telo) telo.scrollTop = 0;
      /* Pás rizika stojí mimo obě karty, takže o přepnutí sám neví. */
      ukazRezPruh();
    };
    Array.prototype.forEach.call(tlac, function(b, i){
      b.addEventListener("click", function(){ naKartuNastaveni(i); });
    });
  })();

  /* ---------- rozdělaný vlastní vzor ----------
     Čipy 1–6 přidávají kostku s konkrétní hodnotou, čipy A–F kostku do skupiny
     „libovolná, ale stejná“. Do stavu vzoru se sahá jen odsud; hotový vzor
     projde stejnou očistou jako vzor z úložiště, takže se dovnitř nedostane
     nic, co by neprošlo i po reloadu. */
  (function(){
    var pips = $("kombpips");
    if(!pips) return;
    function pridej(kam, popis, zeton){
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = popis;
      b.dataset.value = popis;
      b.addEventListener("click", function(){
        var rez = editRezim();
        if(!rez || kombNovy.length >= rez.kostek) return;
        kombNovy.push(zeton);
        renderKombiNovy();
      });
      kam.appendChild(b);
    }
    [1,2,3,4,5,6].forEach(function(v){ pridej(pips, String(v), v); });
    var pism = $("kombpism");
    ["A","B","C","D","E","F"].forEach(function(p){ pridej(pism, p, p); });
    $("kombzrus").addEventListener("click", function(){
      kombNovy = [];
      renderKombiNovy();
    });
    $("kombpridat").addEventListener("click", function(){
      var k = editKombi();
      if(!k || k.vz.length >= VZORU_MAX) return;
      var cast = vzorZZetonu(kombNovy);
      /* Hotový vzor projde stejnou očistou jako vzor z úložiště, takže se
         dovnitř nedostane nic, co by neprošlo i po reloadu. */
      var vz = cistyTvar({ v: cast.v, t: cast.t });
      if(!vz) return;
      k.vz.push(vz);
      kombNovy = [];
      zmenaRezimu();
    });
  })();

  /* ---------- okna: pravidla a nastavení ---------- */
  function modalOpen(){ return !!document.querySelector(".modal:not([hidden])"); }
  var zavriModal = null, otevriModal = null;
  (function(){
    var otevrene = null, vyvolal = null;
    function zavri(){
      if(!otevrene) return;
      /* Návrat do nastavení místo prostého zavření. Musí se rozhodnout dřív,
         než se okno schová — otevriModal() si zavře, co je otevřené, sám. */
      if(otevrene.id === "rulesmodal" && vratDoNastaveni()) return;
      otevrene.hidden = true;
      var b = vyvolal;
      otevrene = null; vyvolal = null;
      if(b && document.contains(b)) b.focus();
    }
    function otevri(id, btn){
      zavri();
      var m = $(id);
      if(!m) return;
      m.hidden = false;
      otevrene = m; vyvolal = btn || null;
      var x = m.querySelector(".modalx");
      if(x) x.focus();
    }
    zavriModal = zavri; otevriModal = otevri;
    $("infobtn").addEventListener("click", function(){ otevri("rulesmodal", this); });
    $("setbtn").addEventListener("click", function(){ zavriSekce(); otevri("setmodal", this); });
    document.querySelectorAll("[data-close]").forEach(function(b){
      b.addEventListener("click", zavri);
    });
    /* klepnutí na tmavé pozadí mimo panel */
    document.addEventListener("click", function(e){ if(e.target === otevrene) zavri(); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape") zavri(); });
  })();

  /* ---------- světlý / tmavý režim ---------- */
  (function(){
    var btn = $("theme"), root = document.documentElement, TKEY = "farkle-theme";
    /* Vlastnost .hidden je jen na HTML prvcích — na potomcích <svg> zápis
       nic neudělá a atribut zůstane, jak byl v kódu. Slunce proto mělo
       hidden napořád a měsíc nikdy, takže tlačítko ukazovalo měsíc ve všech
       stavech. Atribut se tu proto přepíná ručně. */
    function vrstva(id, videt){
      var el = $(id);
      if(videt) el.removeAttribute("hidden"); else el.setAttribute("hidden", "");
    }
    function apply(mode){
      root.setAttribute("data-theme", mode);
      var light = mode === "light";
      vrstva("thsun", !light);
      vrstva("thmoon", light);
      var label = t(light ? "hlav.tmavyrezim" : "hlav.svetlyrezim");
      btn.title = label;
      btn.setAttribute("aria-label", label);
      try{ localStorage.setItem(TKEY, mode); }catch(e){}
    }
    btn.addEventListener("click", function(){
      apply(root.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
    naJazyk(function(){ apply(root.getAttribute("data-theme") === "light" ? "light" : "dark"); });
    var ulozeny = null;
    try{ ulozeny = localStorage.getItem(TKEY); }catch(e){}
    if(ulozeny === "light" || ulozeny === "dark"){
      apply(ulozeny);
    } else {
      var svetlo = false;
      try{ svetlo = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches; }catch(e){}
      apply(svetlo ? "light" : "dark");
    }
  })();

  /* ---------- jen na výšku ----------
     Manifest má orientation: portrait, což stačí nainstalované aplikaci na
     Androidu. Tohle je pokus navíc pro prohlížeč. iOS zamykání orientace
     nepodporuje vůbec — tam zbývá překryv #rot. */
  (function(){
    try{
      if(screen.orientation && typeof screen.orientation.lock === "function"){
        var p = screen.orientation.lock("portrait");
        if(p && typeof p.catch === "function") p.catch(function(){});
      }
    }catch(e){}
  })();

  /* ---------- celá obrazovka ----------
     Pozor: iOS Safari metodu requestFullscreen vystavuje, ale na jiném než
     video elementu nic neudělá. Ptáme se proto na fullscreenEnabled, což na
     iPhonu vrací false — tlačítko se tam skryje místo aby mátlo. */
  (function(){
    var btn = $("fs"), root = document.documentElement;
    var enter = root.requestFullscreen || root.webkitRequestFullscreen;
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    var allowed = (document.fullscreenEnabled !== undefined)
      ? document.fullscreenEnabled
      : (document.webkitFullscreenEnabled !== undefined ? document.webkitFullscreenEnabled : false);

    /* nainstalovaná aplikace už na celé obrazovce běží sama */
    var jakoAplikace = (window.matchMedia &&
        (matchMedia("(display-mode: fullscreen)").matches ||
         matchMedia("(display-mode: standalone)").matches)) ||
        navigator.standalone === true;

    var radek = $("fsrow");
    function pryc(){ radek.remove(); }
    if(!enter || !exit || !allowed || jakoAplikace){ pryc(); return; }

    function active(){ return document.fullscreenElement || document.webkitFullscreenElement || null; }
    /* Tlačítko hlásí stav, ne akci — „Zapnuto“ se čte líp než „Vypnout“.
       Co klik udělá, zůstává v title a aria-label. */
    function mark(){
      var on = !!active();
      btn.textContent = t(on ? "spol.zapnuto" : "nast.vypnuto");
      btn.classList.toggle("on", on);
      var label = t(on ? "fs.zpet" : "fs.zapnout");
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    function fail(){ pryc(); }   /* volání selhalo: řádek je k ničemu */

    btn.addEventListener("click", function(){
      try{
        var p = active() ? exit.call(document) : enter.call(root);
        if(p && typeof p.catch === "function") p.catch(fail);
      }catch(e){ fail(); }
    });
    ["fullscreenchange","webkitfullscreenchange"].forEach(function(ev){
      document.addEventListener(ev, mark);
    });
    naJazyk(mark);
    mark();
  })();

  /* ---------- nezhasínat displej ----------
     Zámek drží displej rozsvícený, ale jas ovlivnit neumí — API na to není.
     Po třech minutách bez doteku se proto zámek pustí a dál se o zhasnutí
     i zamčení stará systémový časovač, na který stránka nedosáhne.

     Prohlížeč zámek pouští sám pokaždé, když se stránka schová (zhasnutí,
     přepnutí do jiné aplikace, zamčení telefonu). Obsluha visibilitychange
     ho po návratu bere znovu, takže po odemčení telefonu nezhasínání naskočí
     samo — přepínač v nastavení se přitom nemění, ten žije v localStorage. */
  (function(){
    var radek = $("svitrow"), btn = $("svit");
    var SKEY = "farkle-svit-v1";
    var NECINNOST = 180000;   /* 3 minuty */

    if(!navigator.wakeLock || typeof navigator.wakeLock.request !== "function"){ radek.remove(); return; }

    /* zadame hlídá rozjetou žádost: request je asynchronní, takže dva doteky
       těsně po sobě by jinak vzaly dva zámky a pustil by se jen jeden */
    var zapnuto = false, zamek = null, casovac = null, cekaNaDotek = false, zadame = false;
    try{ zapnuto = localStorage.getItem(SKEY) === "1"; }catch(e){}

    function mark(){
      btn.textContent = t(zapnuto ? "spol.zapnuto" : "nast.vypnuto");
      btn.classList.toggle("on", zapnuto);
      var label = t(zapnuto ? "svit.nechat" : "svit.nezhasinat");
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    /* Podle specifikace stačí viditelná stránka, gesto se nevyžaduje. Když
       ho prohlížeč přesto chce, request spadne a zkusí se po prvním doteku. */
    function poDoteku(){
      if(cekaNaDotek) return;
      cekaNaDotek = true;
      document.addEventListener("pointerdown", function jednou(){
        document.removeEventListener("pointerdown", jednou, true);
        cekaNaDotek = false;
        vezmi();
      }, true);
    }
    function vezmi(){
      if(!zapnuto || zamek || zadame || document.hidden) return;
      var p;
      try{ p = navigator.wakeLock.request("screen"); }
      catch(e){ poDoteku(); return; }
      if(!p || typeof p.then !== "function"){ poDoteku(); return; }
      zadame = true;
      p.then(function(z){
        zadame = false;
        if(!zapnuto){ try{ z.release(); }catch(e){} return; }
        zamek = z;
        if(z && typeof z.addEventListener === "function"){
          z.addEventListener("release", function(){ if(zamek === z) zamek = null; });
        }
      }, function(){ zadame = false; poDoteku(); });
    }
    function pust(){
      if(!zamek) return;
      var z = zamek;
      zamek = null;
      try{ z.release(); }catch(e){}
    }
    function odpocet(){
      clearTimeout(casovac); casovac = null;
      if(!zapnuto || document.hidden) return;
      casovac = setTimeout(pust, NECINNOST);
    }
    function aktivita(){
      if(!zapnuto) return;
      vezmi();
      odpocet();
    }

    btn.addEventListener("click", function(){
      zapnuto = !zapnuto;
      try{ localStorage.setItem(SKEY, zapnuto ? "1" : "0"); }catch(e){}
      mark();
      if(zapnuto){ vezmi(); odpocet(); }
      else { clearTimeout(casovac); casovac = null; pust(); }
    });
    document.addEventListener("visibilitychange", function(){
      if(document.hidden){ clearTimeout(casovac); casovac = null; }
      else { vezmi(); odpocet(); }
    });
    document.addEventListener("pointerdown", aktivita, true);
    document.addEventListener("keydown", aktivita, true);

    naJazyk(mark);
    mark();
    if(zapnuto){ vezmi(); odpocet(); }
  })();

  /* ---------- vnitřní stránky boxu kola ---------- */
  var elSheets = $("sheets"), sheetBtns = Array.prototype.slice.call($("sheettabs").children), sheet = 0;
  function goSheet(i, smooth){
    sheet = Math.max(0, Math.min(sheetBtns.length - 1, i));
    var x = sheet * elSheets.clientWidth;
    var behavior = (smooth === false) ? "auto" : "smooth";
    if(typeof elSheets.scrollTo === "function"){ elSheets.scrollTo({left:x, behavior:behavior}); }
    else { elSheets.scrollLeft = x; }
    markSheets();
  }
  function markSheets(){
    sheetBtns.forEach(function(b, i){ b.classList.toggle("on", i === sheet); });
  }
  sheetBtns.forEach(function(b, i){ b.addEventListener("click", function(){ goSheet(i); }); });
  elSheets.addEventListener("scroll", function(){
    var i = Math.round(elSheets.scrollLeft / Math.max(1, elSheets.clientWidth));
    if(i !== sheet){ sheet = i; markSheets(); }
  }, {passive:true});

  /* ---------- stránky ---------- */
  var elPages = $("pages"), tabs = [$("tab0"), $("tab1"), $("tab2")], page = 0;
  function goTo(i, smooth){
    var novy = Math.max(0, Math.min(tabs.length - 1, i));
    /* Odchod na jinou stránku ruší návrat do žebříčku. Srovnává se se
       stávající stránkou, protože goTo se volá i po změně velikosti okna
       se stejným číslem — a to návrat rušit nemá. */
    if(novy !== page) zrusNav();
    page = novy;
    if(page === 2) renderP2();
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var behavior = (smooth === false || reduce) ? "auto" : "smooth";
    var x = page * elPages.clientWidth;
    if(typeof elPages.scrollTo === "function"){ elPages.scrollTo({ left:x, behavior:behavior }); }
    else { elPages.scrollLeft = x; }
    markTabs();
  }
  function markTabs(){
    tabs.forEach(function(t, i){ t.setAttribute("aria-selected", i === page ? "true" : "false"); });
  }
  tabs.forEach(function(t, i){ t.addEventListener("click", function(){ goTo(i); }); });
  elPages.addEventListener("scroll", function(){
    var i = Math.round(elPages.scrollLeft / Math.max(1, elPages.clientWidth));
    if(i !== page){ page = i; zrusNav(); markTabs(); }
  }, {passive:true});
  /* bez scroll-snapu si posun po změně šířky okna nikdo nesrovná sám */
  window.addEventListener("resize", function(){ goTo(page, false); goSheet(sheet, false); });
  document.addEventListener("keydown", function(e){
    var t = e.target.tagName;
    if(t === "INPUT" || t === "SELECT" || t === "TEXTAREA") return;
    if(modalOpen()) return;
    if(e.key === "ArrowRight") goTo(page + 1);
    if(e.key === "ArrowLeft") goTo(page - 1);
  });
  /* Kontextové menu je vypnuté všude kromě pole pro vložení zálohy ze
     schránky (#pastearea) — to na vkládání pravým tlačítkem/podržením
     spoléhá, protože čtení schránky přes JS je na iOS nespolehlivé. */
  document.addEventListener("contextmenu", function(e){
    if(e.target && e.target.id === "pastearea") return;
    e.preventDefault();
  });

  function statsHTML(rec){
    var busts = gFarkle(rec);
    var nej = gNejlepsiKolo(rec);
    var best = nej === null ? 0 : nej;
    var avg = gPrumer(rec);
    if(avg === null) avg = 0;
    return '<div><span>' + esc(t("souhrn.celkem")) + '</span><b>' + esc(fmt(rec.banked || 0)) + '</b></div>' +
           '<div><span>' + esc(t("souhrn.nejlepsi")) + '</span><b>' + fmt(best) + '</b></div>' +
           '<div><span>' + esc(t("souhrn.prumer")) + '</span><b>' + fmt(avg) + '</b></div>' +
           '<div><span>' + esc(t("souhrn.farklu")) + '</span><b>' + busts + '</b></div>';
  }
  function renderStats(){ $("stats").innerHTML = statsHTML(snapshot()); }



  /* ---------- sledované statistiky ----------
     s: omezení na režim, m: hodnota jedné hry, a: způsob shrnutí,
     f: formát, dir: směr žebříčku, kol: dopsat do žebříčku počet kol */
  var STATY = [
    { n:"stat.n.pocet",                 a:"pocet",      f:cislo },
    { n:"stat.n.denmax",                a:"denMax",     f:cislo },
    { n:"stat.n.soucet",                a:"soucet",     f:fmt,      num:gBody },
    { n:"stat.n.maxbody",               m:gBody,        a:"max",   f:fmt,      kol:true },
    { n:"stat.n.maxbodybody",           m:gBody,        a:"max",   f:fmt,      s:"points" },
    { n:"stat.n.maxbodykola",           m:gBody,        a:"max",   f:fmt,      s:"rounds", kol:true },
    { n:"stat.n.prumer",                m:gPrumer,      a:"pomer", f:fmtR,     num:gBody, den:gKol },
    { n:"stat.n.prumerbody",            m:gPrumer,      a:"pomer", f:fmtR,     num:gBody, den:gKol, s:"points" },
    { n:"stat.n.prumerkola",            m:gPrumer,      a:"pomer", f:fmtR,     num:gBody, den:gKol, s:"rounds" },
    { n:"stat.n.maxhodu",               m:gNejvicHodu,  a:"max",   f:cislo,    kol:true },
    /* Obě „kola v jedné hře na body“ stojí na gKolKCili(), která u nedokončené
       hry vrací null — tím se počítají jen hry, které cíle doopravdy dosáhly,
       a žádný zvláštní výběr her k tomu není potřeba. */
    { n:"stat.n.minkol",                m:gKolKCili,    a:"min",   f:cislo,    s:"points" },
    { n:"stat.n.maxkol",                m:gKolKCili,    a:"max",   f:cislo,    s:"points" },
    { n:"stat.n.nejlepsikolo",          m:gNejlepsiKolo,a:"max",   f:fmt },
    { n:"stat.n.nejhorsikolo",          m:gNejhorsiKolo,a:"min",   f:fmt },
    { n:"stat.n.maxfarklu",             m:gFarkle,      a:"max",   f:cislo,    kol:true },
    { n:"stat.n.farkleprvni",           m:gFarklePrvniRekord, a:"soucet",f:cislo, num:gFarklePrvni, kol:true },
    { n:"stat.n.maxfarkleprvni",        m:gFarklePrvniRekord, a:"max",   f:cislo, kol:true },
    { n:"stat.n.ztraceno",              m:gZtraceno,    a:"max",   f:fmt,      kol:true },
    { n:"stat.n.serie",                 m:gSerie,       a:"max",   f:cislo,    kol:true },
    { n:"stat.n.farkluhra",             m:gFarkle,      a:"pomer", f:desetina, num:gFarkle, den:function(){ return 1; }, dir:"asc" },
    /* Třetí druh shrnutí vedle her a dnů: seskupuje podle režimu. Hodnota
       není číslo, ale název — formát se proto použije až v žebříčku,
       na počty her. */
    { n:"stat.n.rezim",                 a:"rezimMax",   f:cislo }
  ];

  /* ---------- seskupení podle herního režimu ----------
     Vrací pole režimů seřazené sestupně podle počtu her, při shodě od toho
     s novější hrou. Název se bere ze záznamu, ne z nastavení: smazaný vlastní
     režim musí zůstat čitelný. */
  function rezimyPodleHer(hry){
    var mapa = {}, poradi = [];
    hry.forEach(function(g){
      var k = gRezim(g), kdy = g.savedAt || 0;
      if(!mapa[k]){ mapa[k] = { id:k, nazev:nazevRezimuZaznamu(g), pocet:0, kdy:kdy }; poradi.push(k); }
      mapa[k].pocet++;
      if(kdy > mapa[k].kdy) mapa[k].kdy = kdy;
    });
    var v = poradi.map(function(k){ return mapa[k]; });
    v.sort(function(a, b){ return b.pocet - a.pocet || b.kdy - a.kdy; });
    return v;
  }

  /* ---------- seskupení po dnech ----------
     Den se bere z místního času, ne z UTC: hra dohraná v půl jedné v noci
     patří do dne, kdy ji hráč hrál. Vrací se pole dnů seřazené sestupně podle
     počtu her, při shodě od nejnovějšího dne. */
  function denKlic(d){
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) +
           "-" + ("0" + d.getDate()).slice(-2);
  }
  function dnyPodleHer(hry){
    var mapa = {};
    hry.forEach(function(g){
      var d = new Date(g.savedAt || 0), k = denKlic(d);
      if(!mapa[k]) mapa[k] = { den:k, kdy:new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), pocet:0 };
      mapa[k].pocet++;
    });
    var v = Object.keys(mapa).map(function(k){ return mapa[k]; });
    v.sort(function(a, b){ return b.pocet - a.pocet || b.kdy - a.kdy; });
    return v;
  }

  function vyberHry(def, hry){
    if(!def.s) return hry;
    return hry.filter(function(g){
      return def.s === "rounds" ? g.mode === "rounds" : g.mode !== "rounds";
    });
  }
  function statHodnota(def, hry){
    var v = vyberHry(def, hry);
    if(def.a === "pocet"){ return { txt: def.f(v.length) }; }
    if(def.a === "soucet"){
      var sc = 0;
      v.forEach(function(g){ sc += def.num(g); });
      return v.length ? { txt: def.f(sc) } : null;
    }
    /* jediná statistika, která neshrnuje hry, ale dny — datum se proto ukazuje
       bez času, žádná konkrétní hra za ním nestojí */
    if(def.a === "denMax"){
      var dny = dnyPodleHer(v);
      return dny.length ? { txt: def.f(dny[0].pocet), kdy: dny[0].kdy, den: true } : null;
    }
    /* Hodnotou je název nejhranějšího režimu; počet her se vejde do podřádku,
       aby se nemusel otevírat žebříček kvůli jednomu číslu. */
    if(def.a === "rezimMax"){
      var rezimy = rezimyPodleHer(v);
      return rezimy.length ? { txt: esc(rezimy[0].nazev), pod: tn("slovo.hra", rezimy[0].pocet) } : null;
    }
    if(def.a === "pomer"){
      var a = 0, b = 0;
      v.forEach(function(g){
        var d = def.den(g);
        if(d > 0){ a += def.num(g); b += d; }
      });
      return b ? { txt: def.f(a / b) } : null;
    }
    var nej = null;
    v.forEach(function(g){
      var x = def.m(g);
      if(x === null || x === undefined) return;
      if(!nej || (def.a === "max" ? x > nej.x : x < nej.x)) nej = { x:x, g:g };
    });
    /* vedle času se vrací i celý záznam — podřádek v seznamu statistik z něj
       skládá režim hry, jinak by ho musel dohledávat podruhé */
    return nej ? { txt: def.f(nej.x), kdy: nej.g.savedAt, g: nej.g } : null;
  }
  function zebricek(def, hry){
    if(def.a === "denMax") return dnyPodleHer(vyberHry(def, hry));
    if(def.a === "rezimMax") return rezimyPodleHer(vyberHry(def, hry));
    var dir = def.dir || (def.a === "min" ? "asc" : "desc");
    var v = vyberHry(def, hry).map(function(g){ return { g:g, x:def.m(g) }; })
      .filter(function(r){ return r.x !== null && r.x !== undefined; });
    v.sort(function(a, b){ return dir === "asc" ? a.x - b.x : b.x - a.x; });
    return v;
  }
  function jdeRozkliknout(def){ return def.a !== "pocet" && (def.a !== "soucet" || typeof def.m === "function"); }

  /* ---------- záloha historie ----------
     Soubor je čitelný text; poslední řádek nese data pro import.
     Kdyby ho někdo z přehledu smazal, import to pozná a řekne to. */
  var ZNACKA = "#DATA:";
  function datumProNazev(){
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  /* Plné záznamy pro zálohu. V režimu ls je má paměť rovnou, v režimu idb
     se skládají ze souhrnů a detailů. Detaily se čtou kurzorem, ne jedním
     getAll() přes celou polici — při tisících her by to byl jeden obří
     objekt navíc k textu zálohy, který se stejně musí složit. */
  function slozHry(hotovo){
    var hry = histAll().sort(function(a, b){ return (a.savedAt || 0) - (b.savedAt || 0); });
    if(rezim !== "idb"){ hotovo(hry); return; }
    if(!idb){ hotovo(null); return; }
    var tx;
    try{ tx = idb.transaction(DETAILY, "readonly"); }
    catch(e){ hotovo(null); return; }
    var mapa = {}, kur = tx.objectStore(DETAILY).openCursor();
    kur.onsuccess = function(){
      var c = kur.result;
      if(c){ mapa[c.value.id] = c.value.turns || []; c.continue(); return; }
      hotovo(hry.map(function(g){
        return { id: g.id, savedAt: g.savedAt, mode: g.mode, goal: g.goal,
                 roundGoal: g.roundGoal || null, banked: g.banked || 0,
                 turns: mapa[g.id] || [] };
      }));
    };
    kur.onerror = function(){ hotovo(null); };
  }

  /* Formát zálohy se nemění: nahoře čitelný přehled, dole řádek #DATA:.
     Soubor z dřívější verze musí jít naimportovat i potom. */
  function exportText(hry){
    var r = [];
    r.push(t("exp.nadpis"));
    r.push(t("exp.vytvoreno", { kdy: dt(Date.now()), n: hry.length }));
    r.push("");
    hry.forEach(function(rec, i){
      r.push((i + 1) + ") " + popisHry(rec));
      r.push("   " + t("exp.souhrn", {
        b: fmt(rec.banked || 0),
        nej: gNejlepsiKolo(rec) === null ? "\u2014" : fmt(gNejlepsiKolo(rec)),
        f: gFarkle(rec) }));
      var run = 0;
      (rec.turns || []).forEach(function(tah, k){
        if(!tah.bust) run += tah.p;
        /* Farkle stojí na konci závorky jako poslední hod, stejně jako
           v tabulce kol; ve sloupci bodů je nula, protože kolo nic nedalo. */
        var text = popisKola(tah);
        var popis = tah.bust ? ((text ? text + " \u00B7 " : "") + t("slovo.farkle")) : text;
        r.push("   " + (k + 1) + ". " + fmt(tah.bust ? 0 : (tah.p || 0)) +
               (popis ? "  (" + popis + ")" : "") + "   " + t("exp.mezisoucet", { b: fmt(run) }));
      });
      r.push("");
    });
    /* v čitelné části nechceme úzkou nezlomitelnou mezeru, v textovém
       souboru by se leckde zobrazila jako podivný znak */
    return r.join("\n").replace(/\u202F/g, " ") +
           "\n" + t("exp.oddelovac") + "\n" + ZNACKA + JSON.stringify(hry);
  }

  /* Skládání může chvíli trvat, proto se tlačítko po tu dobu zablokuje. */
  function sTextemZalohy(btn, puvodni, hotovo){
    btn.disabled = true;
    btn.textContent = t("zal.pripravuji");
    slozHry(function(hry){
      btn.disabled = false;
      btn.textContent = puvodni;
      if(hry === null){
        zalMsg(t("zal.neslozit"), true);
        return;
      }
      hotovo(exportText(hry));
    });
  }
  function parseZaloha(text){
    var i = text.lastIndexOf(ZNACKA);
    if(i < 0) return null;
    var radek = text.slice(i + ZNACKA.length).split("\n")[0].trim();
    var d;
    try{ d = JSON.parse(radek); }catch(e){ return null; }
    if(!Array.isArray(d)) return null;
    var out = [];
    d.forEach(function(g){
      if(!g || typeof g !== "object" || !Array.isArray(g.turns)) return;
      out.push({
        id: (typeof g.id === "string" && g.id) ? g.id : newId(),
        savedAt: typeof g.savedAt === "number" ? g.savedAt : Date.now(),
        mode: g.mode === "rounds" ? "rounds" : "points",
        goal: g.goal > 0 ? g.goal : 4000,
        roundGoal: g.roundGoal > 0 ? g.roundGoal : null,
        /* Režim může přijít z cizího telefonu, kde takový vlastní režim
           existuje a tady ne — proto se veze i jeho název. Obojí ořezané,
           obojí jde do stránky přes esc(). */
        rezim: (typeof g.rezim === "string" && g.rezim) ? g.rezim.slice(0, NAZEV_MAX) : VYCHOZI_REZIM,
        rezimN: (typeof g.rezimN === "string" && g.rezimN) ? g.rezimN.slice(0, NAZEV_MAX) : null,
        banked: typeof g.banked === "number" ? g.banked : 0,
        /* legitimní popis kola je do stovky znaků, delší je omyl */
        turns: g.turns.map(function(tah){ return kopieKola(tah, 300); })
      });
    });
    return out;
  }
  function stahni(nazev, text){
    try{
      var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = nazev; a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        if(a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1500);
      return true;
    }catch(e){ return false; }
  }
  /* writeText() vrací příslib; když ho prohlížeč odmítne (chybí oprávnění,
     stránka není zaostřená, iOS mimo gesto), nesmíme hlásit úspěch. Výsledek
     proto chodí callbackem. Propad na execCommand už běží mimo uživatelské
     gesto a v části prohlížečů selže taky — pak aspoň hláška nelže. */
  function doSchranky(text, hotovo){
    function nouzovka(){
      try{
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        hotovo(!!ok);
      }catch(e){ hotovo(false); }
    }
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){ hotovo(true); }, nouzovka);
        return;
      }
    }catch(e){}
    nouzovka();
  }

  var elZalMsg=$("zalmsg"), elImpBox=$("impbox"), elImpInfo=$("impinfo"), elImpFile=$("impfile");
  var elPasteBox=$("pastebox"), elPasteArea=$("pastearea");
  var nactene = null, repTimer = null;
  function zalMsg(text, spatne){
    elZalMsg.hidden = !text;
    elZalMsg.textContent = text || "";
    elZalMsg.classList.toggle("bad", !!spatne);
  }
  function novychZ(list){
    var mame = {};
    histAll().forEach(function(g){ mame[g.id] = true; });
    return list.filter(function(g){ return !mame[g.id]; });
  }
  function zavriImport(){
    nactene = null;
    elImpBox.hidden = true;
    clearTimeout(repTimer); repTimer = null;
    $("imprep").textContent = t("nast.nahraditvse");
  }
  function zavriVlozeni(){
    elPasteBox.hidden = true;
    elPasteArea.value = "";
  }
  function renderZaloha(){
    var prazdno = histAll().length === 0;
    $("expbtn").disabled = prazdno;
    $("copybtn").disabled = prazdno;
    zalMsg("");
    zavriImport();
    zavriVlozeni();
    resetMisto();
  }

  /* ---------- místo v úložišti a trvalost ----------
     persist() kvótu nezvětší, jen vyřadí data z automatického úklidu, kterým
     prohlížeče uvolňují místo. Ptát se smí až po interakci uživatele; v Safari
     to platí jen pro aplikaci přidanou na plochu. */
  var trvale = false;
  function zajistiTrvalost(){
    var st = null;
    try{ st = navigator.storage; }catch(e){}
    if(!st || typeof st.persist !== "function") return;
    try{
      if(typeof st.persisted === "function"){
        st.persisted().then(function(uz){
          if(uz){ trvale = true; return null; }
          return st.persist().then(function(v){ trvale = !!v; });
        }).catch(function(){});
        return;
      }
      st.persist().then(function(v){ trvale = !!v; }).catch(function(){});
    }catch(e){}
  }
  function velikost(b){
    if(b < 1024) return b + " B";
    if(b < 1048576) return Math.round(b / 1024) + " kB";
    if(b < 1073741824) return desetina(b / 1048576) + " MB";
    return desetina(b / 1073741824) + " GB";
  }
  /* ---------- údaj o zabraném místě ----------
     Dvě úrovně. Celek se plní sám při otevření nastavení: estimate() je
     jediné volání a nesahá na historii. Rozpis stojí víc — vzorek detailů
     z IndexedDB a projití cache — a počítá se až po rozbalení tlačítkem.

     estimate() měří celý původ, na github.io tedy i ostatní aplikace ze
     stejné adresy; proto „celkem z této adresy", ne „historie". */
  var VZOREK = 50;

  /* localStorage se měří přesně: klíč i hodnota se počítají a UTF-16 dává
     dva bajty na znak, což je i to, co si prohlížeč započítává do kvóty. */
  function lsBajtu(klice){
    var s = 0, i, v;
    try{
      for(i = 0; i < klice.length; i++){
        v = localStorage.getItem(klice[i]);
        if(v === null) continue;
        s += (klice[i].length + v.length) * 2;
      }
    }catch(e){ return null; }
    return s;
  }

  /* Zbytek localStorage: všechno pod prefixem farkle-, co si nebere žádný
     jiný řádek rozpisu. Průchodem přes klíče, ne pevným seznamem — jinak
     rozpis mlčky přehlédne klíč, který někdo časem přidá. Nejtučnější
     položkou tu bývá farkle-hist-v1-zaloha, přejmenovaná původní historie,
     kterou po migraci do IndexedDB držíme jako pojistku. */
  function lsZbytek(krome){
    var s = 0, i, k, v;
    try{
      for(i = 0; i < localStorage.length; i++){
        k = localStorage.key(i);
        if(!k || k.indexOf("farkle-") !== 0) continue;
        if(krome.indexOf(k) !== -1) continue;
        v = localStorage.getItem(k);
        if(v === null) continue;
        s += (k.length + v.length) * 2;
      }
    }catch(e){ return null; }
    return s;
  }

  /* Velikost historie: v režimu ls přesně z jednoho klíče, v režimu idb
     odhadem. IndexedDB velikost police nehlásí a přečíst všechny detaily
     stojí tolik co export, takže se souhrny sečtou celé (leží v paměti)
     a detaily se vzorkují prvními padesáti záznamy. */
  function velikostHistorie(hotovo){
    var pocet = histAll().length;
    if(rezim !== "idb" || !idb){
      hotovo({ pocet: pocet, bajtu: lsBajtu([HKEY]), presne: true });
      return;
    }
    var souhrnu = 0;
    try{
      HIST.forEach(function(g){ souhrnu += JSON.stringify(g).length; });
    }catch(e){ souhrnu = 0; }
    function vzdat(){ hotovo({ pocet: pocet, bajtu: null, presne: false }); }
    var tx, kur;
    try{ tx = idb.transaction(DETAILY, "readonly"); }catch(e){ vzdat(); return; }
    try{ kur = tx.objectStore(DETAILY).openCursor(); }catch(e){ vzdat(); return; }
    var n = 0, delka = 0;
    kur.onsuccess = function(){
      var c = kur.result;
      if(c && n < VZOREK){
        try{ delka += JSON.stringify(c.value).length; }catch(e){}
        n++;
        c.continue();
        return;
      }
      hotovo({ pocet: pocet, presne: false,
               bajtu: souhrnu + (n ? Math.round(delka / n * pocet) : 0) });
    };
    kur.onerror = vzdat;
  }

  /* Velikost samotné aplikace: součet těl všech odpovědí v cache, které si
     drží servisní pracovník. Filtr na kostky- je tu ze stejného důvodu jako
     při úklidu — na github.io leží v Cache API i cizí aplikace a započítat
     je pod „Aplikace" by byla lež. Chybějící nebo nečitelná odpověď se počítá
     jako nula; celý rozpis je odhad, ne účetnictví. */
  function velikostAppky(hotovo){
    var c = null;
    try{ c = window.caches; }catch(e){}
    if(!c || typeof c.keys !== "function"){ hotovo(null); return; }
    try{
      c.keys().then(function(jmena){
        var moje = jmena.filter(function(n){ return n.indexOf("kostky-") === 0; });
        if(!moje.length){ hotovo(0); return null; }
        return Promise.all(moje.map(function(jmeno){
          return c.open(jmeno).then(function(cache){
            return cache.keys().then(function(reqs){
              return Promise.all(reqs.map(function(r){
                return cache.match(r).then(function(resp){
                  if(!resp || !resp.blob) return 0;
                  return resp.blob().then(function(b){ return b.size || 0; },
                                          function(){ return 0; });
                }, function(){ return 0; });
              }));
            });
          }, function(){ return []; });
        })).then(function(pole){
          var s = 0;
          pole.forEach(function(kus){ kus.forEach(function(x){ s += x; }); });
          hotovo(s);
        });
      }).catch(function(){ hotovo(null); });
    }catch(e){ hotovo(null); }
  }

  function odhadMista(hotovo){
    var st = null;
    try{ st = navigator.storage; }catch(e){}
    if(!st || typeof st.estimate !== "function"){ hotovo(null); return; }
    try{
      st.estimate().then(function(o){
        hotovo(o && typeof o.usage === "number" ? o : null);
      }).catch(function(){ hotovo(null); });
    }catch(e){ hotovo(null); }
  }

  /* Plní všechny prvky s třídou misto, ne jedno id — kdyby se údaj někdy
     objevil i jinde, není co dopisovat. Skládá se z uzlů, ne z innerHTML. */
  function ukazMisto(radky){
    var pole = document.querySelectorAll(".misto");
    Array.prototype.forEach.call(pole, function(el){
      el.textContent = "";
      if(!radky || !radky.length){ el.hidden = true; return; }
      radky.forEach(function(r){
        var d = document.createElement("div"), b = document.createElement("b");
        d.className = "ml";
        b.textContent = r.k;
        d.appendChild(b);
        d.appendChild(document.createTextNode(" " + r.v));
        el.appendChild(d);
      });
      el.hidden = false;
    });
  }
  function celkemText(o){
    if(!o) return t("misto.nezjistit");
    return o.quota > 0
      ? t("misto.zdostupnych", { u: velikost(o.usage), q: velikost(o.quota) })
      : velikost(o.usage);
  }
  /* Celek nad tlačítkem. Volá se při každém otevření nastavení — čísla se
     mezi otevřeními mění a zastaralý údaj by mátl víc než chvilkové „Zjišťuji". */
  function celekMista(){
    var el = document.getElementById("mistocelkem");
    if(!el) return;
    el.textContent = t("nast.misto.zjistuji");
    odhadMista(function(o){ el.textContent = celkemText(o); });
  }
  /* Zavřený stav: rozpis schovaný, tlačítko holé. Volá se i při otevření
     nastavení, aby karta začínala vždycky stejně. */
  function resetMisto(){
    var b = document.getElementById("mistobtn");
    if(b){
      b.disabled = false;
      b.textContent = t("nast.misto.btn");
      b.classList.remove("on");
      b.setAttribute("aria-expanded", "false");
    }
    ukazMisto(null);
    celekMista();
  }
  function spoctiMisto(){
    var b = document.getElementById("mistobtn");
    if(b){ b.disabled = true; b.textContent = t("misto.pocitam"); }
    velikostHistorie(function(h){
      velikostAppky(function(appka){
        odhadMista(function(o){
          var radky = [];
          radky.push({ k: t("misto.historie"), v: h.pocet
            ? (tn("slovo.hra", h.pocet) + ", " + (h.bajtu === null
                ? t("misto.nezmeritmalo")
                : (h.presne ? velikost(h.bajtu) : t("misto.priblizne", { v: velikost(h.bajtu) }))))
            : t("misto.zadnahra") });
          var hra = lsBajtu([KEY]);
          radky.push({ k: t("misto.rozehrana"),
                       v: hra === null ? t("misto.nezmerit") : velikost(hra) });
          /* Prázdný koš v úložišti pořád leží, jen jako dvojznakové "[]" —
             pár desítek bajtů, které vypadají jako by v koši něco bylo.
             Když je prázdný, řekne se to rovnou. */
          var vKosi = kosAll().length + kosHistAll().length;
          var kose = lsBajtu([KKEY, KHKEY]);
          radky.push({ k: t("misto.kose"),
                       v: !vKosi ? t("misto.prazdne")
                          : (tn("slovo.hra", vKosi) +
                             (kose === null ? "" : ", " + velikost(kose))) });
          /* Historie v režimu ls sedí pod svým vlastním řádkem, dvakrát se
             počítat nesmí. V režimu idb pod tímhle klíčem nic není. */
          var zbytek = lsZbytek(rezim === "idb" ? [KEY, KKEY, KHKEY] : [KEY, KKEY, KHKEY, HKEY]);
          radky.push({ k: t("misto.nastaveni"),
                       v: zbytek === null ? t("misto.nezmerit") : velikost(zbytek) });
          radky.push({ k: t("misto.aplikace"),
                       v: appka === null
                          ? t("misto.nezmerit")
                          : t("misto.offline", { v: velikost(appka) }) });
          /* Když estimate() není, řádek se vynechá — selhání hlásí podtitulek
             nad tlačítkem a psát totéž dvakrát pod sebe nemá smysl. */
          if(o){
            radky.push({ k: t("misto.celkem"),
              v: celkemText(o) + (trvale ? ". " + t("misto.trvale") : "") });
          }
          ukazMisto(radky);
          if(b){
            b.disabled = false;
            b.textContent = t("nast.misto.btn");
            b.classList.add("on");
            b.setAttribute("aria-expanded", "true");
          }
        });
      });
    });
  }
  /* Tlačítko rozbaluje a zabaluje. Při rozbalení se rozpis pokaždé počítá
     znovu — jinak by po smazání her ukazoval stará čísla. */
  function prepniMisto(){
    var v = document.querySelector(".misto");
    if(v && !v.hidden){ resetMisto(); return; }
    spoctiMisto();
  }

  /* společné pro import ze souboru i ze schránky */
  /* Zdroj („soubor" nebo „text") je součástí klíče: čeština u obou vět
     skloňuje jinak a skládat je ze zvlášť přeložených kousků by slovosled
     zafixovalo česky. */
  function prijmiZalohu(text, zdroj){
    var list = parseZaloha(String(text || ""));
    if(!list){
      zavriImport();
      zalMsg(t("zal.nerozumim." + zdroj), true);
      return;
    }
    if(!list.length){
      zavriImport();
      zalMsg(t("zal.prazdno." + zdroj), true);
      return;
    }
    nactene = list;
    var nove = novychZ(list).length;
    elImpInfo.textContent = t("zal.info." + zdroj, {
      her: tn("slovo.hra", list.length), nove: tn("slovo.nova", nove) });
    $("impadd").disabled = nove === 0;
    $("impadd").textContent = nove ? t("zal.pridatn", { n: nove }) : t("zal.nenicopridat");
    elImpBox.hidden = false;
    zalMsg("");
  }

  $("expbtn").addEventListener("click", function(){
    sTextemZalohy($("expbtn"), t("nast.exp.btn"), function(text){
      var ok = stahni("farkle-history-" + datumProNazev() + ".txt", text);
      zalMsg(t(ok ? "zal.ukladase" : "zal.stazenineslo"), !ok);
    });
  });
  $("copybtn").addEventListener("click", function(){
    sTextemZalohy($("copybtn"), t("nast.kop.btn"), function(text){
      doSchranky(text, function(ok){
        zalMsg(t(ok ? "zal.veschrance" : "zal.schrankaneslo"), !ok);
      });
    });
  });
  $("impbtn").addEventListener("click", function(){
    zalMsg("");
    elImpFile.value = "";
    elImpFile.click();
  });
  elImpFile.addEventListener("change", function(){
    var f = elImpFile.files && elImpFile.files[0];
    if(!f) return;
    var fr = new FileReader();
    fr.onload = function(){
      zavriVlozeni();
      prijmiZalohu(fr.result, "soubor");
    };
    fr.onerror = function(){
      zavriImport();
      zalMsg(t("zal.souborneslo"), true);
    };
    fr.readAsText(f, "utf-8");
  });
  $("mistobtn").addEventListener("click", prepniMisto);
  $("pastebtn").addEventListener("click", function(){
    zalMsg("");
    zavriImport();
    elPasteBox.hidden = false;
    elPasteArea.focus();
  });
  $("pastecancel").addEventListener("click", function(){
    zavriImport();
    zavriVlozeni();
    zalMsg("");
  });
  $("pasteload").addEventListener("click", function(){
    var text = elPasteArea.value;
    if(!text.trim()){
      zalMsg(t("zal.poleprazdne"), true);
      return;
    }
    prijmiZalohu(text, "text");
  });
  $("impadd").addEventListener("click", function(){
    if(!nactene) return;
    var nove = novychZ(nactene);
    var pocet = nove.length;
    histWrite(histAll().concat(nove.map(proHistorii)), function(ok){
      if(!ok){
        zalMsg(t(klicSelhani("chyba.mistoulozit")) + ".", true);
        return;
      }
      zavriImport();
      zavriVlozeni();
      zalMsg(tn("zal.pridano", pocet));
      renderP2(); renderZaloha2();
    }, nove);
  });
  $("imprep").addEventListener("click", function(){
    if(!nactene) return;
    var b = $("imprep");
    if(!repTimer){
      b.textContent = t("zal.opravdunahradit");
      repTimer = setTimeout(function(){ repTimer = null; b.textContent = t("nast.nahraditvse"); }, 5000);
      return;
    }
    clearTimeout(repTimer); repTimer = null;
    var pocet = nactene.length;
    histWrite(nactene.map(proHistorii), function(ok){
      if(!ok){
        zalMsg(t(klicSelhani("chyba.mistoulozit")) + ".", true);
        return;
      }
      /* rozehraná hra se mohla vázat na záznam, který import smetl —
         kdeZaznam() to pozná sám, stačí překreslit */
      render();
      zavriImport();
      zavriVlozeni();
      zalMsg(t("zal.nahrazeno", { her: tn("slovo.hra", pocet) }));
      renderP2(); renderZaloha2();
    }, nactene);
  });
  /* po zápisu se mění jen zapnutost tlačítek, hlášku necháváme na obrazovce */
  function renderZaloha2(){
    var prazdno = histAll().length === 0;
    $("expbtn").disabled = prazdno;
    $("copybtn").disabled = prazdno;
  }

  /* ---------- stránka Statistiky ---------- */
  var segIdx = 0, delTimer = null;
  var elSeg=$("seg"), elStatList=$("statlist"), elHistList=$("histlist"),
      elP2List=$("p2list"), elP2Detail=$("p2detail"),
      elDetTitle=$("dettitle"), elDetBody=$("detbody");

  /* Podstránka detailu je jedna, ale dá se do ní přijít dvěma cestami: ze
     seznamu her, nebo ze žebříčku statistiky. Zásobník je proto jednoúrovňový
     — víc úrovní vzniknout nemůže, protože z detailu hry se dál nikam nejde. */
  var navZpet = null;   // null | { statIdx: i }
  /* Scroll seznamu a scroll žebříčku, než se z nich vyšlo do detailu —
     #p2list a #p2detail scrolluje společný rodič #page2, takže bez
     uložení by se po *Zpět* vždycky spadlo na 0 (viz doDetailu). */
  var scrollList = 0, scrollZebricek = 0;
  function zrusNav(){ navZpet = null; }
  function zpetNaSeznam(){
    clearTimeout(delTimer); delTimer = null;
    if(navZpet){
      var i = navZpet.statIdx;
      navZpet = null;
      otevriZebricek(i);
      $("page2").scrollTop = scrollZebricek;
      return;
    }
    elP2Detail.hidden = true;
    elP2List.hidden = false;
    renderP2();
    $("page2").scrollTop = scrollList;
  }
  function doDetailu(titulek){
    odpojPozorovatele();
    elDetTitle.textContent = titulek;
    elP2List.hidden = true;
    elP2Detail.hidden = false;
    elP2Detail.scrollTop = 0;
    $("page2").scrollTop = 0;
  }

  /* ---------- stránkování dlouhých seznamů ----------
     Historie i žebříček stavěly prvek na každou dohranou hru. Při tisících
     her je jediné, co se tu reálně zadrhne, počet prvků v DOM — ne výpočet.
     Vykresluje se proto po dávkách po KROK položkách.

     Stav se nikde nedrží: každé nové vykreslení seznamu začíná od začátku,
     takže návrat z detailu, přepnutí přepínače i import resetují stránkování
     samy od sebe. Klepnutí na značku naopak jen dolije další dávku a zbytek
     seznamu nechá být — přestavovat celý seznam by při tisících her stálo
     kvadraticky. */
  var KROK = 50;
  var pozorovatel = null;

  function odpojPozorovatele(){
    if(pozorovatel){ pozorovatel.disconnect(); pozorovatel = null; }
  }

  /* Roluje #page2, ne okno — kořenem pozorovatele tedy musí být ta stránka.
     Pozorovatel je vždycky nejvýš jeden: značka je na obrazovce taky jen jedna. */
  function sledujZnacku(el, spust){
    odpojPozorovatele();
    if(typeof IntersectionObserver !== "function") return;
    try{
      pozorovatel = new IntersectionObserver(function(zaznamy){
        for(var i = 0; i < zaznamy.length; i++){
          if(zaznamy[i].isIntersecting){ spust(); return; }
        }
      }, { root: $("page2"), rootMargin: "150px" });
      pozorovatel.observe(el);
    }catch(e){ pozorovatel = null; }
  }

  /* Jeden prvek, dvě cesty: rolování ho vystřelí přes pozorovatele, klepnutí
     funguje i tam, kde by pozorovatel selhal nebo vůbec nebyl. */
  function pridejZnacku(kam, zbyva, dalsi){
    var b = document.createElement("button");
    b.type = "button";
    b.className = "morerow";
    /* u poslední dávky by „dalších 13 · zbývá 13" jen mátlo */
    b.innerHTML = zbyva > KROK
      ? (esc(t("dalsi.dalsich", { n: KROK })) +
         '<span class="mz">' + esc(t("dalsi.zbyva", { n: zbyva })) + "</span>")
      : esc(t("dalsi.poslednich", { n: zbyva }));
    var spusteno = false;
    function spust(){
      if(spusteno) return;
      spusteno = true;
      odpojPozorovatele();
      b.remove();
      dalsi();
    }
    b.addEventListener("click", spust);
    kam.appendChild(b);
    sledujZnacku(b, spust);
  }

  /* Řádky se skládají do DocumentFragment a vkládají jedním zápisem,
     ať se nevyvolá padesát přepočtů rozvržení. Značka jde jinam než řádky:
     u žebříčku patří řádky do <tbody>, ale tlačítko pod tabulku. */
  function vypisDavku(kamRadky, kamZnacka, polozky, od, stavitel){
    var konec = Math.min(od + KROK, polozky.length);
    var frag = document.createDocumentFragment();
    for(var i = od; i < konec; i++) frag.appendChild(stavitel(polozky[i], i));
    kamRadky.appendChild(frag);
    var zbyva = polozky.length - konec;
    if(zbyva > 0){
      pridejZnacku(kamZnacka, zbyva, function(){
        vypisDavku(kamRadky, kamZnacka, polozky, konec, stavitel);
      });
    }
  }

  function renderP2(){
    odpojPozorovatele();
    var hry = histView(segIdx === 1);
    elStatList.hidden = segIdx !== 0;
    elHistList.hidden = segIdx !== 1;
    Array.prototype.forEach.call(elSeg.children, function(b, i){
      b.classList.toggle("on", i === segIdx);
    });
    renderFiltry();
    if(segIdx === 0) renderStatList(hry); else renderHistList(hry);
  }

  function renderStatList(hry){
    elStatList.innerHTML = "";
    if(!hry.length){
      elStatList.innerHTML = '<div class="empty">' +
        esc(t(histAll().length ? "stat.filtrprazdno" : "stat.zadnahra")) + '</div>';
      return;
    }
    STATY.forEach(function(def, i){
      var h = statHodnota(def, hry);
      var lze = jdeRozkliknout(def) && h;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "strow";
      b.disabled = !lze;
      b.innerHTML =
        '<span class="sn">' + esc(t(def.n)) +
          (h && h.pod ? '<span class="sd">' + esc(h.pod) + '</span>' : '') +
          (h && h.kdy ? '<span class="sd">' + (h.den
              ? dtDen(h.kdy)
              : dt(h.kdy) + (h.g ? ' \u00B7 ' + esc(nazevRezimuZaznamu(h.g)) +
                             ' \u00B7 ' + esc(popisTypuHry(h.g)) : '')) + '</span>' : '') +
        '</span>' +
        '<b class="sv">' + (h ? h.txt : "\u2014") + '</b>' +
        (lze ? '<span class="chev">\u00BB</span>' : '');
      if(lze){
        b.addEventListener("click", function(){
          scrollList = $("page2").scrollTop;
          otevriZebricek(i);
        });
      }
      elStatList.appendChild(b);
    });
  }

  function otevriZebricek(i){
    var def = STATY[i], hry = histView(false), v = zebricek(def, hry);
    navZpet = null;
    doDetailu(t(def.n));
    if(!v.length){
      elDetBody.innerHTML = '<div class="empty">' + esc(t("stat.beznadat")) + '</div>';
      return;
    }
    elDetBody.innerHTML = '<table><tbody></tbody></table>';
    vypisDavku(elDetBody.querySelector("tbody"), elDetBody, v, 0,
               def.a === "denMax" ? radekDne(def)
                                  : (def.a === "rezimMax" ? radekRezimu(def) : radekHry(def, i)));
  }
  /* Stavitel se vybírá napřed, ne uvnitř šablony — žebříček dnů nese jiná
     data než žebříček her a míchat obojí v jednom innerHTML by bylo horší
     ke čtení než dvě krátké funkce. */
  function radekHry(def, statIdx){
    return function(r, k){
      var tr = document.createElement("tr");
      tr.className = "klik";
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.innerHTML =
        '<td class="n">' + (k + 1) + '</td>' +
        '<td class="d">' + dt(r.g.savedAt) + ' \u00B7 ' + esc(nazevRezimuZaznamu(r.g)) +
          ' \u00B7 ' + esc(popisTypuHry(r.g)) +
          (def.kol ? ' \u00B7 ' + esc(tn("slovo.kolo", gKol(r.g))) : '') + '</td>' +
        '<td class="g">' + def.f(r.x) + '</td>' +
        '<td class="c">\u00BB</td>';
      function jdi(){
        scrollZebricek = $("page2").scrollTop;
        navZpet = { statIdx: statIdx };
        otevriHru(r.g.id);
      }
      tr.addEventListener("click", jdi);
      /* <tr> není tlačítko, Enter ani mezerník si sám neobslouží */
      tr.addEventListener("keydown", function(e){
        if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
          e.preventDefault();
          jdi();
        }
      });
      return tr;
    };
  }
  /* Jediné místo, kde se karta přepíná sama. Na rozdíl od prokliku do detailu
     hry je to tady smysl akce: chci vidět ty hry, ne jejich počet. */
  function radekDne(def){
    return function(r, k){
      var tr = document.createElement("tr");
      tr.className = "klik";
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.innerHTML =
        '<td class="n">' + (k + 1) + '</td>' +
        '<td class="d">' + dtDen(r.kdy) + '</td>' +
        '<td class="g">' + def.f(r.pocet) + '</td>' +
        '<td class="c">\u00BB</td>';
      function jdi(){
        FILTR.od = r.kdy;
        FILTR.do = konecDne(r.kdy);
        segIdx = 1;
        zrusNav();
        zpetNaSeznam();
      }
      tr.addEventListener("click", jdi);
      tr.addEventListener("keydown", function(e){
        if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
          e.preventDefault();
          jdi();
        }
      });
      return tr;
    };
  }

  /* Řádek žebříčku režimů se nikam neproklikává: filtr podle režimu není,
     takže by neměl kam vést. Proto ani třída klik, ani šipka. */
  function radekRezimu(def){
    return function(r, k){
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="n">' + (k + 1) + '</td>' +
        '<td class="d">' + esc(r.nazev) + '</td>' +
        '<td class="g">' + def.f(r.pocet) + '</td>' +
        '<td class="c"></td>';
      return tr;
    };
  }

  function renderHistList(hry){
    elHistList.innerHTML = "";
    if(!hry.length){
      elHistList.innerHTML = '<div class="empty">' +
        esc(t(histAll().length ? "stat.filtrprazdno" : "hist.prazdna")) + '</div>';
      return;
    }
    /* Den se porovnává se skutečně předchozí položkou v poli, ne s poslední
       vykreslenou — díky tomu čára správně vyjde i na hranici dávky po
       padesáti položkách, kde se stavitel spouští znovu od nuly. */
    vypisDavku(elHistList, elHistList, hry, 0, function(rec, i){
      var frag = document.createDocumentFragment();
      var pred = i > 0 ? hry[i - 1] : null;
      /* Při řazení podle bodů se čáry nekreslí vůbec — dny už v seznamu
         nejdou po sobě a čára by nad každou hrou hlásila jiné datum. */
      if(RAZENI.podle === "datum" &&
         (!pred || denKlic(new Date(pred.savedAt || 0)) !== denKlic(new Date(rec.savedAt || 0)))){
        var s = document.createElement("div");
        s.className = "dsep";
        s.textContent = dtDen(rec.savedAt);
        frag.appendChild(s);
      }
      var b = document.createElement("button");
      b.type = "button";
      b.className = "grow";
      b.innerHTML = '<span class="gn"><b>' + dt(rec.savedAt) + '</b>' +
        esc(nazevRezimuZaznamu(rec)) + ' \u00B7 ' + esc(popisTypuHry(rec)) +
        ' \u00B7 ' + esc(tn("slovo.kolo", gKol(rec))) +
        ' \u00B7 ' + esc(t("hist.farklex", { n: gFarkle(rec) })) + '</span>' +
        '<b class="gv">' + esc(fmt(rec.banked || 0)) + '</b>';
      b.addEventListener("click", function(){
        scrollList = $("page2").scrollTop;
        otevriHru(rec.id);
      });
      frag.appendChild(b);
      return frag;
    });
  }

  /* Hlavička a přechod na podstránku jsou hned ze souhrnu, tabulka kol až
     po dotažení detailu. Když má záznam `turns` už v ruce (propad na
     localStorage), jde všechno naráz a bez čekání. */
  function otevriHru(id){
    var hry = histAll(), i = histIndex(hry, id);
    if(i < 0) return;
    var sou = hry[i];
    doDetailu(t("hist.hraz", { kdy: dt(sou.savedAt) }));
    elDetBody.innerHTML =
      '<div class="tally" id="dtally"></div><div class="tallycap" id="dtallycap"></div>' +
      '<div class="stats">' + statsHTML(sou) + '</div>' +
      '<div id="detrows"><div class="empty">' + esc(t("hist.nactamkola")) + '</div></div>' +
      '<div class="archwrap"><button class="ghost arch" id="delgame" type="button" disabled>' +
        esc(t("hist.smazat")) + '</button></div>';
    tallyInto($("dtally"), $("dtallycap"), sou);
    var db = $("delgame");

    /* Do koše se ukládá celý záznam, jinak by se z něj vrátila hra bez kol.
       Dokud detail není v ruce, mazat nejde. */
    var plny = null;
    function sKoly(turns){
      if(turns === null){
        $("detrows").innerHTML = '<div class="empty">' + esc(t("hist.kolanejdou")) + '</div>';
        return;
      }
      plny = { id: sou.id, savedAt: sou.savedAt, mode: sou.mode, goal: sou.goal,
               roundGoal: sou.roundGoal || null, rezim: gRezim(sou), rezimN: sou.rezimN || null,
               banked: sou.banked || 0, turns: turns };
      $("detrows").innerHTML = turns.length
        ? ('<table><tbody>' + rowsHTML(turns) + '</tbody></table>')
        : '<div class="empty">' + esc(t("hist.zadnekolo")) + '</div>';
      db.disabled = false;
    }
    if(Array.isArray(sou.turns)) sKoly(sou.turns);
    else nactiDetail(id, sKoly);

    db.addEventListener("click", function(){
      if(!plny) return;
      if(!delTimer){
        db.classList.add("warn");
        db.textContent = t("hist.opravdu");
        delTimer = setTimeout(function(){
          delTimer = null;
          db.classList.remove("warn");
          db.textContent = t("hist.smazat");
        }, 4000);
        return;
      }
      clearTimeout(delTimer); delTimer = null;
      /* Dva zápisy za sebou. Když padne první, nemažeme vůbec — kopie v koši
         je jediná pojistka. Když padne druhý, vracíme i ten první, jinak by
         hra zůstala v historii i v koši, tedy dvakrát. */
      var predtim = kosHistAll();
      if(!kosHistPush(plny)){
        hlaskaNaTlacitku(db, t("chyba.dokose"), t("hist.smazat"));
        return;
      }
      histWrite(histAll().filter(function(g){ return g.id !== id; }), function(ok){
        if(!ok){
          kosHistWrite(predtim);
          hlaskaNaTlacitku(db, t(klicSelhani("chyba.mistosmazat")), t("hist.smazat"));
          return;
        }
        /* Vazba rozehrané hry na záznam se nepřetrhává: hra ví, že její
           záznam leží v koši, a tlačítko v Zápisu kol nabídne návrat. Kdyby
           se vazba zrušila, hra by vypadala jako nikdy neuložená a Nová hra
           by z ní udělala druhou kopii v koši rozehraných. */
        /* žebříček by po smazání ukazoval hru, která už neexistuje */
        zrusNav();
        zpetNaSeznam();
        render();
      });
    });
  }

  /* ---------- lišta filtrů ----------
     Popisek nese zvolený filtr, ať je vidět i bez otevření okna. Datum se
     píše co nejúsporněji: shodné části rozsahu se neopakují. */
  var elFbar = $("fbar"), elFdatum = $("fdatum"),
      elFtyp = $("ftyp"), elFraz = $("frazeni");
  function popisDatumu(){
    if(FILTR.od === null || FILTR.do === null) return t("filtr.datum");
    var a = new Date(FILTR.od), b = new Date(FILTR.do);
    if(denKlic(a) === denKlic(b)) return dtDen(FILTR.od);
    return kat("datumRozsah")(a, b);
  }
  function popisTypu(){
    if(FILTR.typ === null) return t("filtr.typhry");
    if(FILTR.typ === "points")
      return FILTR.hodnota === null ? t("filtr.nabody") : t("typhry.dobodu", { b: fmt(FILTR.hodnota) });
    if(FILTR.hodnota === null) return t("typhry.nakola");
    return FILTR.hodnota === 0
      ? (t("typhry.nakola") + " \u00B7 " + t("filtr.bezlimitu"))
      : t("filtr.nakolan", { n: FILTR.hodnota });
  }
  /* Popisky řazení jsou jen tady — z nich se plní nabídka i tlačítko, aby
     se stejný text nepsal dvakrát. Výchozí řazení se na tlačítko nepíše;
     tam zůstává holé „Řazení" bez mosazného rámu. */
  var RAZ_POPIS = {
    "datum:desc": "razeni.nejnovejsi",
    "datum:asc":  "razeni.nejstarsi",
    "body:desc":  "razeni.nejvic",
    "body:asc":   "razeni.nejmin"
  };
  function popisRazeni(){
    var k = RAZENI.podle + ":" + RAZENI.smer;
    return (k === "datum:desc" || !RAZ_POPIS[k]) ? t("filtr.razeni") : t(RAZ_POPIS[k]);
  }
  /* Na tlačítku zůstává krátký stálý popisek, aby se všechna vešla na jeden
     řádek; zvolený filtr nese mosazný rám. Plné znění jde do aria-label —
     čtečka ho přečte a testy mají co kontrolovat. */
  function popisTlacitka(el, txt, holy){
    el.setAttribute("aria-label", txt);
    el.classList.toggle("on", txt !== holy);
  }
  function renderFiltry(){
    var jsou = histAll().length > 0;
    elFbar.hidden = !jsou;
    if(!jsou) return;
    popisTlacitka(elFdatum, popisDatumu(), t("filtr.datum"));
    /* Typ hry a řazení dávají smysl jen nad seznamem her. Skrytá tlačítka
       z řádku vypadnou úplně a zbylá dvě se o jeho šířku podělí sama. */
    var vSeznamu = segIdx === 1;
    elFtyp.hidden = !vSeznamu;
    elFraz.hidden = !vSeznamu;
    popisTlacitka(elFtyp, popisTypu(), t("filtr.typhry"));
    popisTlacitka(elFraz, popisRazeni(), t("filtr.razeni"));
  }

  $("freset").addEventListener("click", function(){
    zrusFiltr();
    renderP2();
  });

  /* Okno výběru data. Rozsah je včetně obou krajních dnů; obrácené zadání se
     prohodí, místo aby se hlásila chyba. Prázdná pole filtr zruší. */
  (function(){
    var rezimDne = "den",
        elSegD = $("dateseg"), elOd = $("dateod"), elDo = $("datedo"),
        elDoRow = $("datedorow"), elOdL = $("dateodl");

    function isoDne(ms){ return ms === null ? "" : denKlic(new Date(ms)); }
    function zIso(s){
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
      return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null;
    }
    function nastavRezim(r){
      rezimDne = r;
      Array.prototype.forEach.call(elSegD.children, function(b, i){
        b.classList.toggle("on", (i === 0) === (r === "den"));
      });
      elDoRow.hidden = r === "den";
      elOdL.textContent = t(r === "den" ? "datum.den" : "datum.od");
    }
    Array.prototype.forEach.call(elSegD.children, function(b, i){
      b.addEventListener("click", function(){ nastavRezim(i === 0 ? "den" : "rozsah"); });
    });

    elFdatum.addEventListener("click", function(){
      var min = null, max = null;
      histAll().forEach(function(g){
        var t = g.savedAt || 0;
        if(min === null || t < min) min = t;
        if(max === null || t > max) max = t;
      });
      elOd.min = elDo.min = isoDne(min);
      elOd.max = elDo.max = isoDne(max);
      var jedenDen = FILTR.od !== null && FILTR.do !== null &&
                     denKlic(new Date(FILTR.od)) === denKlic(new Date(FILTR.do));
      nastavRezim(FILTR.od !== null && !jedenDen ? "rozsah" : "den");
      elOd.value = isoDne(FILTR.od);
      elDo.value = isoDne(FILTR.do);
      otevriModal("datemodal", this);
    });

    $("datezpet").addEventListener("click", function(){ zavriModal(); });
    $("dateok").addEventListener("click", function(){
      var od = zIso(elOd.value),
          konec = rezimDne === "den" ? od : zIso(elDo.value);
      if(od === null && konec === null){
        FILTR.od = null; FILTR.do = null;
      }else{
        if(od === null) od = konec;
        if(konec === null) konec = od;
        if(konec < od){ var p = od; od = konec; konec = p; }
        FILTR.od = od;
        FILTR.do = konecDne(konec);
      }
      zavriModal();
      renderP2();
    });
  })();

  /* Okno výběru typu hry. Výběr je dvoustupňový: nejdřív typ, teprve pak
     hodnota. První políčko přepínače je „Vše" — bez něj by šel filtr typu
     zapnout, ale ne vypnout jinak než tlačítkem Zrušit filtr, které by
     s ním shodilo i datum. */
  (function(){
    var typVolba = null,
        elSegT = $("typseg"), elVal = $("typval"),
        elValRow = $("typvalrow"), elValL = $("typvall");

    function typZIndexu(i){ return i === 0 ? null : (i === 1 ? "points" : "rounds"); }

    function nastavTyp(typ, hodnota){
      typVolba = typ;
      Array.prototype.forEach.call(elSegT.children, function(b, i){
        b.classList.toggle("on", typZIndexu(i) === typ);
      });
      elValRow.hidden = typ === null;
      if(typ === null){ elVal.innerHTML = ""; return; }
      elValL.textContent = t(typ === "points" ? "typ.cil" : "typ.limit");
      var s = '<option value="">' + esc(t("typ.vsechny")) + '</option>';
      hodnotyTypu(typ).forEach(function(x){
        s += '<option value="' + esc(String(x)) + '">' +
          esc(typ === "rounds"
            ? (x === 0 ? t("filtr.bezlimitu") : tn("slovo.kolo", x))
            : fmt(x)) +
          '</option>';
      });
      elVal.innerHTML = s;
      /* Hodnota z vypnutého filtru v nabídce být nemusí (hra mezitím zmizela
         z historie) — pak se spadne zpátky na „Všechny". */
      elVal.value = (hodnota === null || hodnota === undefined) ? "" : String(hodnota);
      if(elVal.selectedIndex < 0) elVal.value = "";
    }

    Array.prototype.forEach.call(elSegT.children, function(b, i){
      b.addEventListener("click", function(){ nastavTyp(typZIndexu(i), null); });
    });

    elFtyp.addEventListener("click", function(){
      nastavTyp(FILTR.typ, FILTR.hodnota);
      otevriModal("typmodal", this);
    });

    $("typzpet").addEventListener("click", function(){ zavriModal(); });
    $("typok").addEventListener("click", function(){
      FILTR.typ = typVolba;
      FILTR.hodnota = (typVolba === null || elVal.value === "") ? null : +elVal.value;
      zavriModal();
      renderP2();
    });
  })();

  /* Okno řazení. Nemá Použít — klepnutí na možnost je samo o sobě volba,
     další potvrzení by bylo jen krok navíc. */
  (function(){
    var tlac = Array.prototype.slice.call($("sortbtns").children);
    elFraz.addEventListener("click", function(){
      tlac.forEach(function(b){
        b.classList.toggle("on", b.getAttribute("data-podle") === RAZENI.podle &&
                                 b.getAttribute("data-smer") === RAZENI.smer);
      });
      otevriModal("sortmodal", this);
    });
    tlac.forEach(function(b){
      b.textContent = t(RAZ_POPIS[b.getAttribute("data-podle") + ":" + b.getAttribute("data-smer")]);
      b.addEventListener("click", function(){
        RAZENI.podle = b.getAttribute("data-podle");
        RAZENI.smer  = b.getAttribute("data-smer");
        zavriModal();
        renderP2();
      });
    });
  })();

  Array.prototype.forEach.call(elSeg.children, function(b, i){
    b.addEventListener("click", function(){
      segIdx = i;
      zrusNav();
      zpetNaSeznam();
    });
  });
  $("detback").addEventListener("click", zpetNaSeznam);

  function render(){
    var r = cur(), l = left(), pot = potTotal();

    var lock = locked();
    /* odemčená hra čeká na nové skončení — po smazání kola se automatické
       uložení pustí znovu a záznam v historii se aktualizuje */
    if(!lock && S.autoUlozeno){ S.autoUlozeno = false; }

    elScore.textContent = fmt(S.banked);
    elTotal.classList.toggle("won", lock);
    if(S.mode === "rounds"){
      elRestLabel.textContent = t("pocitadlo.odehranokol");
      elRest.textContent = S.roundGoal > 0
        ? t("pocitadlo.zkol", { n: S.turns.length, z: S.roundGoal })
        : S.turns.length;
    } else {
      var rest = S.goal - S.banked;
      elRestLabel.textContent = t(rest > 0 ? "pocitadlo.zbyva" : "pocitadlo.nadcil");
      elRest.textContent = fmt(Math.abs(rest));
    }
    elPot.textContent = fmt(pot);
    elTurnLabel.textContent = t("pocitadlo.kolonastole", { n: S.turns.length + 1 });

    elRollLine.innerHTML = t("pocitadlo.hodradek", {
        n: S.rolls.length, kostky: esc(tn("slovo.kostkami", r.thrown)) }) +
      (l < r.thrown ? ' <span style="color:var(--dim)">' + esc(t("pocitadlo.hodzbyva", { n: l })) + '</span>' : "");

    /* v zámku tlačítko zůstává živé, protože vede na zápis kol */
    elRollOn.disabled = !lock && r.items.length === 0;
    var popisRollu = lock ? t("pocitadlo.hraskoncila")
      : (r.items.length === 0
          ? t("pocitadlo.nejdriv")
          : (l > 0 ? t("pocitadlo.hazetdalx", { kostky: tn("slovo.kostkami", l) })
                   : t("pocitadlo.horke")));
    elRollOn.textContent = popisRollu;
    /* Riziko sedí na tlačítku Farkle a hází se zbylými kostkami — nebo při
       horkých kostkách znovu všemi šesti. Poškozený stav může dát nesmyslný
       počet, proto ten strop. Platí i pro první hod, kde ještě nic neleží:
       je to údaj o kostkách na stole, ne o rozhodnutí házet dál. */
    var kostekDal = (l > 0 && l <= kostek()) ? l : kostek();
    elBustRiz.textContent = lock ? ""
      : t("pocitadlo.farkleriziko", { p: desetina(tabulkaRizika()[kostekDal - 1]) });

    /* Zapsat nad rozehraným hodem, ze kterého se nic neodložilo, nejde: takové
       kolo by v popisu neslo o jeden hod míň, než kolika se doopravdy házelo,
       a statistika nejvíc hodů v kole by to nepoznala. V Farkle se po hodu
       stejně vždycky buď boduje, nebo farkluje — ven vedou Farkle a Zpět.
       Na prvním hodu kola se nic nemění, tam už tlačítko drží pot <= 0. */
    elBank.disabled = lock || pot <= 0 || r.items.length === 0;
    elBank.textContent = pot > 0 ? t("pocitadlo.zapsatx", { b: fmt(pot) }) : t("pocitadlo.zapsatapredat");
    elBust.disabled = lock;
    elUndo.disabled = !jdeZpet();

    elLock.hidden = !lock;
    if(lock){
      elLock.textContent = S.mode === "points"
        ? t("pocitadlo.konecbody", { b: fmt(S.goal) })
        : t("pocitadlo.koneckola", { n: S.roundGoal });
    }

    /* při nule kostek se čeká na „Házet dál“ (horké kostky) — ruční zadání
       se zamyká stejně jako zbytek klávesnice */
    var manLock = lock || l < 1;
    [elMToggle, $("mless"), $("mkost"), $("mmore"), $("madd")].forEach(function(b){ b.disabled = manLock; });
    elMnum.disabled = manLock;
    if(manLock && !elManual.hidden){ elManual.hidden = true; elMToggle.classList.remove("sel"); }
    if(manualDice > Math.max(1, l)) manualDice = Math.max(1, l);
    elMkost.textContent = tn("pocitadlo.kostzkr", l > 0 ? manualDice : 0);

    renderKombi(); renderKind(); renderFix(); renderRows(); renderStats(); renderTally(); renderArch();
    save();
  }

  /* ---------- události ---------- */
  elDataSingle.forEach(function(b){
    b.addEventListener("click", function(){
      var rez = aktRezim(), v = Number(b.dataset.single), body = rez.sam[v] || 0;
      if(!(body > 0)) return;
      keep(kodStejnych(1, v), body, 1);
    });
  });
  elDataStr.forEach(function(b){
    b.addEventListener("click", function(){
      var rez = aktRezim(), k = b.dataset.str, s = STRAIGHTS[k];
      if(!(rez.post[k] > 0)) return;
      keep(s.k, rez.post[k], s.d);
    });
  });
  /* Sazba se čte až při klepnutí, aby změna v nastavení platila hned. */
  elDataKombi.forEach(function(b){
    b.addEventListener("click", function(){
      var k = b.dataset.kombi;
      var rez = aktRezim();
      if(!kombZap(rez, k) || !kombVRezimu(rez, k)) return;
      keep(PRESETY[k].k, sazba(rez, k), PRESETY[k].d);
    });
  });
  elAddKind.addEventListener("click", function(){
    if(selValue === null) return;
    keep(kodStejnych(selCount, selValue), kindPoints(selValue, selCount), selCount);
    selValue = null; renderKind();
  });
  elMToggle.addEventListener("click", function(){
    var open = elManual.hidden;
    elManual.hidden = !open;
    elMToggle.classList.toggle("sel", open);
    if(open) elMnum.focus();
  });
  $("mless").addEventListener("click", function(){ manualDice = Math.max(1, manualDice - 1); render(); });
  $("mmore").addEventListener("click", function(){ manualDice = Math.min(Math.max(1, left()), manualDice + 1); render(); });
  $("madd").addEventListener("click", function(){
    var v = parseInt(elMnum.value, 10);
    if(!v || v <= 0){ elMnum.focus(); return; }
    keep("v", v, Math.min(manualDice, left()));
    elMnum.value = "";
  });
  elMnum.addEventListener("keydown", function(e){ if(e.key === "Enter") $("madd").click(); });

  elRollOn.addEventListener("click", rollOn);
  elBank.addEventListener("click", bank);
  $("bust").addEventListener("click", bust);
  $("undo").addEventListener("click", undo);
  $("fixturns").addEventListener("click", function(){
    fixMode = !fixMode;
    pendingDel = null;
    renderRows();
  });
  $("reset").addEventListener("click", reset);
  elArch.addEventListener("click", archive);
  $("newback").addEventListener("click", function(){ zavriModal(); });
  $("newdrop").addEventListener("click", function(){ zavriModal(); novaHra(); });
  /* Uložit a začít novou: wipe() teprve po potvrzeném zápisu, jinak by se
     hra ztratila v domnění, že je v historii. Po zápisu má S.archivedId
     hodnotu a kosPush() uvnitř novaHra() už zálohu nepotřebuje. */
  $("newsave").addEventListener("click", function(){
    var b = this;
    b.disabled = true;
    zapisHru(function(ok){
      b.disabled = false;
      if(!ok){
        hlaskaNaTlacitku(b, t(klicSelhani("chyba.mistoulozit")), t("nova.ulozit"));
        return;
      }
      zavriModal();
      novaHra();
    });
  });
  $("setbtn").addEventListener("click", function(){
    /* rozdělaná otázka ani vybraná karta se z minula nepřenášejí */
    ptamSeKos = null; ptamSeKosHist = null; ptamSeVzor = null;
    ptamSeRezim = null; ptamSeTvar = null; rezEdit = null; kombEdit = null;
    naKartuNastaveni(0);
    renderKos(); renderZaloha(); renderRezimy();
  });

  /* režim a cíl hry */
  var PRESETS = ["2000","4000","6000","8000","10000"];
  function syncGoalUI(){
    elModeSel.value = S.mode;
    var rounds = (S.mode === "rounds");
    elGoalSel.hidden = rounds;
    elRoundSel.hidden = !rounds;
    if(rounds){
      elGoalNum.hidden = true;
      var limit = S.roundGoal > 0;
      elRoundSel.value = limit ? "custom" : "none";
      elRoundNum.hidden = !limit;
      elRoundNum.value = limit ? S.roundGoal : "";
      return;
    }
    elRoundNum.hidden = true;
    var preset = PRESETS.indexOf(String(S.goal)) >= 0;
    elGoalSel.value = preset ? String(S.goal) : "custom";
    elGoalNum.hidden = preset;
    elGoalNum.value = S.goal;
  }
  /* Změna cíle, režimu i limitu může hru zamknout — a zamknutá hra je
     dohraná, takže se sem spouštěč patří stejně jako za bank() a bust(). */
  elModeSel.addEventListener("change", function(){
    S.mode = elModeSel.value;
    syncGoalUI();
    render();
    zkusAutoUlozit();
  });
  elGoalSel.addEventListener("change", function(){
    if(elGoalSel.value === "custom"){
      elGoalNum.hidden = false;
      elGoalNum.value = S.goal;
      elGoalNum.focus();
      elGoalNum.select();
    } else {
      S.goal = Number(elGoalSel.value);
      elGoalNum.hidden = true;
      render();
      zkusAutoUlozit();
    }
  });
  elGoalNum.addEventListener("input", function(){
    var v = parseInt(elGoalNum.value, 10);
    if(v && v > 0){ S.goal = v; render(); zkusAutoUlozit(); }
  });
  elRoundSel.addEventListener("change", function(){
    if(elRoundSel.value === "custom"){
      S.roundGoal = S.roundGoal > 0 ? S.roundGoal : Math.max(10, S.turns.length + 1);
      elRoundNum.hidden = false;
      elRoundNum.value = S.roundGoal;
      elRoundNum.focus();
      elRoundNum.select();
      render();
      zkusAutoUlozit();
    } else {
      S.roundGoal = null;
      elRoundNum.hidden = true;
      render();
    }
  });
  elRoundNum.addEventListener("input", function(){
    var v = parseInt(elRoundNum.value, 10);
    if(v && v > 0){ S.roundGoal = v; render(); zkusAutoUlozit(); }
  });

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
      autoZap = !autoZap;
      try{ localStorage.setItem(AUKEY, autoZap ? "1" : "0"); }catch(e){}
      mark();
    });
    naJazyk(mark);
    mark();
  })();

  /* ---------- start ---------- */
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

  /* ---------- offline režim ---------- */
  if("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    });
  }
})();
