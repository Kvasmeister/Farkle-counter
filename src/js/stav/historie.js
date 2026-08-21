/* Historie dohraných her: IndexedDB, migrace, čtení a zápis.

   Závisí na: stav/uloziste, stav/zaznam (souhrnZ), spolecne
   Nezávisí na: DOM

   Dvě police: `souhrny` se čtou celé při startu, `detaily` až na vyžádání.
   Do IndexedDB se stěhuje jen historie — rozehraná hra a koše zůstávají
   v localStorage, protože jsou shora omezené a potřebují synchronní zápis.

   Nedostupnost se hlásí přes naNedostupnouHistorii(); modul neví, který
   prvek nese pruh, a vědět nemá. */
import { kopieKola } from "./stav.js";
import { HKEY, readList, writeList } from "./uloziste.js";
import {
  gFarkle,
  gFarklePrvni,
  gKol,
  gKolKCili,
  gNejhorsiKolo,
  gNejlepsiKolo,
  gNejvicHodu,
  gRezim,
  gSerie,
  gZtraceno
} from "./zaznam.js";

/* ---------- úložiště historie ----------
   localStorage má strop kolem 5 MB, tedy zhruba tři tisíce her. Historie
   se proto stěhuje do IndexedDB. Aby se kvůli tomu nemusel přepsat celý
   řetěz vykreslování, drží se za běhu v paměti:

     HIST         jediná pravda za běhu, naplní se jednou při startu
     histAll()    vrací kopii a zůstává synchronní
     histWrite()  mění paměť hned a do úložiště zapisuje na pozadí

   Kopie proto, že renderP2() výsledek třídí na místě — bez ní by přeházel
   zdrojové pole.

   Tvar dat se v této etapě nemění: v IndexedDB leží celé záznamy, přesně
   tak, jak dosud ležely v localStorage. */
var HIST = [];
var UKEY  = "farkle-uloziste-v1";   /* "idb", jakmile migrace proběhla */
var HZAL  = HKEY + "-zaloha";       /* přejmenovaný původní klíč */
var IDB_JMENO = "kostky", IDB_VERZE = 4;
var SOUHRNY = "souhrny", DETAILY = "detaily";
/* Firefox v soukromém okně umí na open() viset donekonečna, proto strop */
var IDB_STROP = 3000;

var rezim = "ls";            /* "ls" | "idb" */
var idb = null;
var historieNedostupna = false;

/* Souhrn nese všechno, co seznam a statistiky potřebují, bez popisů kol.
   Deset tisíc souhrnů je v paměti kolem 2 MB, detaily by byly desítky.
   Staví se na třech místech: při zápisu hry, při migraci a při importu. */
function souhrnZ(rec){
  var kolKCili = gKolKCili(rec);
  return {
    id: rec.id, savedAt: rec.savedAt,
    mode: rec.mode, goal: rec.goal, roundGoal: rec.roundGoal || null,
    /* Chybějící `rezim` se dopočítá až při čtení (gRezim), takže se kvůli
       němu nezvedá IDB_VERZE — všechny dřívější hry se hrály podle KCD2. */
    rezim: gRezim(rec), rezimN: rec.rezimN || null,
    banked: rec.banked || 0,
    kol: gKol(rec), farklu: gFarkle(rec), farkluprvni: gFarklePrvni(rec),
    nejlepsi: gNejlepsiKolo(rec), nejhorsi: gNejhorsiKolo(rec),
    serie: gSerie(rec),
    kolKCili: kolKCili,
    hodu: gNejvicHodu(rec), ztraceno: gZtraceno(rec)
  };
}
function detailZ(rec){
  return { id: rec.id, turns: (rec.turns || []).map(function(tah){
    return kopieKola(tah);
  }) };
}

function otevriIDB(hotovo){
  var rozhodnuto = false;
  function konec(v){ if(rozhodnuto) return; rozhodnuto = true; hotovo(v); }
  var api = null;
  try{ api = window.indexedDB || null; }catch(e){ api = null; }
  if(!api){ konec(null); return; }
  var req;
  try{ req = api.open(IDB_JMENO, IDB_VERZE); }catch(e){ konec(null); return; }
  setTimeout(function(){ konec(null); }, IDB_STROP);
  /* Rozdělení jedné police na dvě běží uvnitř versionchange transakce.
     Když cokoli selže, transakce se zruší celá a databáze zůstane na
     předchozí verzi i s původní policí — nevznikne stav napůl. */
  req.onupgradeneeded = function(){
    var db = req.result, tx = req.transaction;
    if(!db.objectStoreNames.contains(SOUHRNY)) db.createObjectStore(SOUHRNY, { keyPath: "id" });
    if(!db.objectStoreNames.contains(DETAILY)) db.createObjectStore(DETAILY, { keyPath: "id" });
    if(db.objectStoreNames.contains("hry")){
      var kur = tx.objectStore("hry").openCursor();
      kur.onsuccess = function(){
        var c = kur.result;
        if(c){
          var rec = c.value;
          tx.objectStore(SOUHRNY).put(souhrnZ(rec));
          tx.objectStore(DETAILY).put(detailZ(rec));
          c.continue();
          return;
        }
        db.deleteObjectStore("hry");
      };
      /* souhrny právě vznikly přes souhrnZ() nad plnými záznamy, nová pole
         v nich tedy už jsou — dopočítávat není co */
      return;
    }
    dopoctiHody(tx);
  };
  req.onsuccess = function(){ konec(req.result); };
  req.onerror = function(){ konec(null); };
  req.onblocked = function(){ konec(null); };
}

/* Doplnění polí `hodu`, `ztraceno` a `farkluprvni` do souhrnů uložených
   starší verzí. Běží uvnitř versionchange transakce: když cokoli selže,
   transakce se zruší celá a databáze zůstane na předchozí verzi —
   nevznikne stav, kdy má polovina her nová pole a druhá ne. Mapa se staví
   celá dopředu a teprve pak se sahá na souhrny; dva otevřené kurzory nad
   dvěma policemi v téže transakci se nemíchají. Na čerstvé instalaci jsou
   obě police prázdné, takže dopočet nestojí nic. */
function dopoctiHody(tx){
  var mapa = {}, kd = tx.objectStore(DETAILY).openCursor();
  kd.onsuccess = function(){
    var c = kd.result;
    if(c){
      var d = c.value;
      mapa[d.id] = { hodu: gNejvicHodu(d), ztraceno: gZtraceno(d), farkluprvni: gFarklePrvni(d) };
      c.continue();
      return;
    }
    var ks = tx.objectStore(SOUHRNY).openCursor();
    ks.onsuccess = function(){
      var s = ks.result;
      if(!s) return;
      var v = s.value;
      if(v.hodu === undefined || v.ztraceno === undefined || v.farkluprvni === undefined){
        var m = mapa[v.id];
        v.hodu = m ? m.hodu : null;
        v.ztraceno = m ? m.ztraceno : null;
        v.farkluprvni = m ? m.farkluprvni : null;
        s.update(v);
      }
      s.continue();
    };
  };
}

/* null znamená „nepodařilo se přečíst", ne „nic tam není" — ten rozdíl je
   zásadní, viz historieNedostupna níž. Načítají se jen souhrny; detail se
   dotáhne až při rozkliknutí hry. */
function ctiIDB(db, hotovo){
  var tx;
  try{ tx = db.transaction(SOUHRNY, "readonly"); }
  catch(e){ hotovo(null); return; }
  var st = tx.objectStore(SOUHRNY), req;
  try{
    req = st.getAll ? st.getAll() : null;
  }catch(e){ hotovo(null); return; }
  if(req){
    req.onsuccess = function(){ hotovo(Array.isArray(req.result) ? req.result : []); };
    req.onerror = function(){ hotovo(null); };
    return;
  }
  var out = [], kur = st.openCursor();
  kur.onsuccess = function(){
    var c = kur.result;
    if(c){ out.push(c.value); c.continue(); } else { hotovo(out); }
  };
  kur.onerror = function(){ hotovo(null); };
}

/* Detail jedné hry. hotovo(null) znamená, že se nepovedlo přečíst. */
function nactiDetail(id, hotovo){
  if(rezim !== "idb" || !idb){ hotovo(null); return; }
  var tx;
  try{ tx = idb.transaction(DETAILY, "readonly"); }
  catch(e){ hotovo(null); return; }
  var req = tx.objectStore(DETAILY).get(id);
  req.onsuccess = function(){
    var d = req.result;
    hotovo(d && Array.isArray(d.turns) ? d.turns : []);
  };
  req.onerror = function(){ hotovo(null); };
}

/* `souhrny` nese jen záznamy, které se opravdu mění (nové i upravené) —
   volající (histWrite()) je vybírá porovnáním reference proti předchozímu
   HIST. Nezměněné záznamy se tak vůbec nezapisují. `smazatSouhrny` je
   nepovinné: `migruj()` ho neposílá a police se pak smaže celá (`s.clear()`),
   protože tam jde vždycky o kompletní jednorázový přesun; `histWrite()` ho
   posílá vždycky (i jako prázdné pole) a mazání jde adresně přes `s.delete()`,
   ať se nepřepisují záznamy, které se vůbec nezměnily.
   Obě police v jedné transakci, jinak by při selhání uprostřed vznikla
   hra bez kol nebo kola bez hry. */
function zapisIDB(db, souhrny, noveDetaily, smazatDetaily, hotovo, smazatSouhrny){
  var tx;
  try{ tx = db.transaction([SOUHRNY, DETAILY], "readwrite"); }
  catch(e){ hotovo(false); return; }
  var hotovoUz = false;
  function konec(v){ if(hotovoUz) return; hotovoUz = true; hotovo(v); }
  tx.oncomplete = function(){ konec(true); };
  tx.onerror = function(){ konec(false); };
  tx.onabort = function(){ konec(false); };
  try{
    var s = tx.objectStore(SOUHRNY), d = tx.objectStore(DETAILY), i;
    if(smazatSouhrny){
      for(i = 0; i < smazatSouhrny.length; i++){ s.delete(smazatSouhrny[i]); }
    }else{
      s.clear();
    }
    for(i = 0; i < souhrny.length; i++){ s.put(souhrny[i]); }
    for(i = 0; i < smazatDetaily.length; i++){ d.delete(smazatDetaily[i]); }
    for(i = 0; i < noveDetaily.length; i++){ d.put(noveDetaily[i]); }
  }catch(e){
    try{ tx.abort(); }catch(e2){}
    konec(false);
  }
}

/* Migrace. Pořadí je důležité: starý klíč se přejmenuje až po potvrzeném
   zápisu do IndexedDB, a příznak se nastaví jen tehdy, když se ho podaří
   uložit. Kdyby se příznak nezapsal a klíč se přesto přejmenoval, aplikace
   by při příštím startu propadla na localStorage a ukázala prázdnou
   historii jako by byla úplná. */
function migruj(db, hotovo){
  var stare = readList(HKEY);
  var souhrny = stare.map(souhrnZ), detaily = stare.map(detailZ);
  zapisIDB(db, souhrny, detaily, [], function(ok){
    if(!ok){ hotovo(false); return; }
    var priznak = false;
    try{ localStorage.setItem(UKEY, "idb"); priznak = true; }catch(e){}
    if(!priznak){ hotovo(false); return; }
    /* pojistka mimo IndexedDB: data zůstanou v localStorage pod jiným
       jménem aspoň jednu verzi, jen se z nich už nečte */
    try{
      var raw = localStorage.getItem(HKEY);
      if(raw !== null){
        localStorage.setItem(HZAL, raw);
        localStorage.removeItem(HKEY);
      }
    }catch(e){}
    HIST = souhrny;
    hotovo(true);
  });
}

/* Kdo chce vědět, že historii nejde přečíst. Registruje se z UI —
   historie neví, který prvek nese pruh, a vědět nemá. */
var poNedostupnosti = [];
function naNedostupnouHistorii(fn){ poNedostupnosti.push(fn); }
function ukazNecteme(){
  for(var i = 0; i < poNedostupnosti.length; i++) poNedostupnosti[i](historieNedostupna);
}
function historieJeNedostupna(){ return historieNedostupna; }

function pripravUloziste(hotovo){
  var chtene = "ls";
  try{ if(localStorage.getItem(UKEY) === "idb") chtene = "idb"; }catch(e){}

  /* Aplikace nepředstírá: když příznak říká idb a IndexedDB se otevřít
     nedá, neukáže starou historii z localStorage jako by byla úplná.
     Ukáže pruh, do historie nezapisuje a počítat se dá dál. */
  function vzdejTo(){
    if(chtene === "idb"){
      rezim = "idb"; idb = null; HIST = [];
      historieNedostupna = true; ukazNecteme();
    }else{
      rezim = "ls"; idb = null; HIST = readList(HKEY);
    }
    hotovo();
  }

  otevriIDB(function(db){
    if(!db){ vzdejTo(); return; }
    ctiIDB(db, function(zaznamy){
      if(zaznamy === null){ vzdejTo(); return; }
      if(chtene === "idb"){
        rezim = "idb"; idb = db; HIST = zaznamy;
        hotovo();
        return;
      }
      migruj(db, function(ok){
        if(ok){ rezim = "idb"; idb = db; }
        else { rezim = "ls"; idb = null; HIST = readList(HKEY); }
        hotovo();
      });
    });
  });
}

function histAll(){ return HIST.slice(); }
/* Když se historie nedá načíst, není chyba v místě — hlášky by lhaly. */
/* Vrací klíč, ne hotový text: hláška může na tlačítku přežít přepnutí
   jazyka a přeloží se až tam, kde se vypisuje. */
function klicSelhani(zaklad){
  return historieNedostupna ? "chyba.nedostupna" : zaklad;
}

/* Pravidlo z HANDOVER §4 platí dál: každý zápis má výsledek a volající ho
   řeší. Asynchronní zápis to mění jen v tom, že výsledek přijde později.
   V režimu ls se hotovo() volá ještě synchronně — chování zůstává přesně
   jako dřív. Paměť se mění optimisticky, ať UI reaguje hned; při selhání
   se vrátí sama a volající dostane false.

   V režimu ls jsou v `list` celé záznamy, v režimu idb souhrny. Volající
   posílá `zaznamy` — celé hry, které do historie přibývají. Co z historie
   mizí, se pozná porovnáním id a detail se smaže s nimi. */
function histWrite(list, hotovo, zaznamy){
  hotovo = hotovo || function(){};
  var novy = list.slice();
  if(rezim === "ls"){
    var ok = writeList(HKEY, novy);
    if(ok) HIST = novy;
    hotovo(ok);
    return;
  }
  if(!idb){ hotovo(false); return; }   /* pruh o nedostupné historii už visí */

  var je = {}, i;
  for(i = 0; i < novy.length; i++){ je[novy[i].id] = true; }
  var smazat = [];
  for(i = 0; i < HIST.length; i++){
    if(!je[HIST[i].id]) smazat.push(HIST[i].id);
  }
  var detaily = (zaznamy || []).map(detailZ);

  /* Do IndexedDB jde jen to, co se opravdu změnilo — porovnáním reference
     proti předchozímu HIST. histAll() vrací HIST.slice(), takže nezměněný
     záznam má v `novy` pořád stejnou referenci a zapisIDB() ho nemusí
     znovu ukládat; „Nahradit vše" při importu staví pole přes map(), takže
     tam referenci nesdílí nic a správně se zapíše celé znovu. */
  var stareById = {};
  for(i = 0; i < HIST.length; i++){ stareById[HIST[i].id] = HIST[i]; }
  var zmenene = [];
  for(i = 0; i < novy.length; i++){
    if(stareById[novy[i].id] !== novy[i]) zmenene.push(novy[i]);
  }

  var predtim = HIST;
  HIST = novy;
  zapisIDB(idb, zmenene, detaily, smazat, function(ok){
    if(!ok) HIST = predtim;
    hotovo(ok);
  }, smazat);
}

/* Do historie se ukládají celé záznamy; co se z nich stane, řeší úložiště.
   Volající tak nemusí vědět, jestli jede na localStorage nebo na dvou
   policích. */
function proHistorii(rec){ return rezim === "idb" ? souhrnZ(rec) : rec; }

export { DETAILY, HIST, HZAL, IDB_JMENO, IDB_STROP, IDB_VERZE, SOUHRNY, UKEY, ctiIDB, detailZ, dopoctiHody, histAll, histWrite, historieJeNedostupna, historieNedostupna, idb, klicSelhani, migruj, naNedostupnouHistorii, nactiDetail, otevriIDB, poNedostupnosti, pripravUloziste, proHistorii, rezim, souhrnZ, ukazNecteme, zapisIDB };
