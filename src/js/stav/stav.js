/* Rozehraná hra: S, její uložení, ozdravení a otisk pro historii.

   Závisí na: stav/uloziste, pravidla/rezimy, spolecne
   Nezávisí na: DOM

   Herní režim ve stavu NENÍ: jeho jedinou pravdou je REZIMY.akt. Do záznamu
   se dopisuje až ve snapshot().

   Selhání zápisu se hlásí přes naSelhaniUlozeni() — modul neví, který prvek
   má pruh o neukládání, a vědět nemá. Dřív volal ukazNeukladame() přímo. */
import { aktRezim, kostek, nazevRezimu } from "../pravidla/rezimy.js";
import { naCislo, newId } from "../spolecne.js";
import { kodZTextu } from "./kody.js";
import { KEY } from "./uloziste.js";

/* ---------- stav ----------
   rolls = hody v rozehraném kole, poslední je ten, který právě řeším
   roll  = { thrown: kolika kostkami se hází, hot: bool, items: [...] }  */
/* Herní režim ve stavu není: jeho jedinou pravdou je REZIMY.akt. Dvě
   proměnné na tutéž věc by se dřív nebo později rozešly, a rozejít se
   nemají — přepnout režim jde jen nad prázdnou hrou. Do záznamu se režim
   dopisuje až v snapshot(). */
var S = { mode:"points", goal:4000, roundGoal:null, banked:0, turns:[],
          rolls:[{thrown:6, hot:false, items:[]}], archivedId:null, dirty:false,
          autoUlozeno:false };

/* Když ukládání nefunguje (soukromé okno, plné úložiště), uživatel se to dnes
   dozvěděl až tím, že po zavření prohlížeče byla hra pryč. Příznak se proto
   zvedne při prvním selhání a pruh v panelu kola zmizí, až se zápis povede.
   Hlásí se to registrovaným posluchačům, ne přes render(): render() volá
   save(), takže by vznikla smyčka. Kde ten pruh je, ví UI, ne stav. */
var neukladame = false;
/* Kdo chce vědět, že se přestalo dařit ukládat. Registruje se z UI —
   stav neví, který prvek nese pruh o neukládání, a vědět nemá. */
var poUlozeni = [];
function naSelhaniUlozeni(fn){ poUlozeni.push(fn); }
function oznamUlozeni(){
  for(var i = 0; i < poUlozeni.length; i++) poUlozeni[i](neukladame);
}
function neukladameStav(){ return neukladame; }
function save(){
  try{
    localStorage.setItem(KEY, JSON.stringify(S));
    if(neukladame){ neukladame = false; oznamUlozeni(); }
    return true;
  }catch(e){
    if(!neukladame){ neukladame = true; oznamUlozeni(); }
    return false;
  }
}

/* Uložený stav se nekontroluje jen povrchně: chybějící turns nebo items
   dřív shodily render() a aplikace zůstala bez ovládání, ze kterého se
   nedalo dostat ani do nastavení a vyexportovat data. Proto se každé pole
   dorovná na správný typ. Volá se vždy, i pro výchozí stav. */
function ozdrav(){
  S.mode = (S.mode === "rounds") ? "rounds" : "points";
  S.banked = naCislo(S.banked, 0);
  S.goal = (typeof S.goal === "number" && S.goal > 0) ? S.goal : 4000;
  if(typeof S.roundGoal !== "number" || S.roundGoal < 1){ S.roundGoal = null; }
  if(typeof S.archivedId !== "string"){ S.archivedId = null; }
  S.dirty = !!S.dirty;
  S.autoUlozeno = !!S.autoUlozeno;

  S.turns = (Array.isArray(S.turns) ? S.turns : []).map(function(tah){
    return kopieKola(tah);
  });

  S.rolls = (Array.isArray(S.rolls) && S.rolls.length ? S.rolls : [{}]).map(function(r){
    /* Strop je počet kostek režimu, ne šestka: hra uložená v šestikostkovém
       režimu se nesmí přenést do pětikostkového s hodem na šest kostek. */
    var max = kostek(), thrown = naCislo(r && r.thrown, max);
    return {
      thrown: (thrown >= 1 && thrown <= max) ? Math.floor(thrown) : max,
      hot: !!(r && r.hot),
      items: (Array.isArray(r && r.items) ? r.items : []).map(function(i){
        var o = { p: naCislo(i && i.p, 0),
                  d: Math.max(0, Math.floor(naCislo(i && i.d, 0))) };
        if(i && typeof i.k === "string"){ o.k = i.k; return o; }
        /* rozehraná hra uložená starší verzí nese v položce text: kód se
           z něj vytáhne, a nejde-li to, text se veze dál nedotčený */
        var kod = (i && typeof i.l === "string") ? kodZTextu(i.l) : "v";
        if(kod === null){ o.l = i.l; } else { o.k = kod; }
        return o;
      })
    };
  });
}
function load(cb){
  try{
    var raw = localStorage.getItem(KEY);
    if(raw){
      var d = null, cele = false;
      try{ d = JSON.parse(raw); cele = true; }catch(e){}
      if(cele && d && typeof d.banked === "number" && Array.isArray(d.rolls) && d.rolls.length){
        S = d;
      } else {
        /* nečitelná data nemažeme potichu — ať se z prohlížeče dají vytáhnout */
        try{ localStorage.setItem(KEY + "-vadny", raw); }catch(e){}
      }
    }
  }catch(e){}
  ozdrav();
  cb();
}
/* Kolo se všude kopíruje stejně: veze si kódy, a nemá-li je, původní text.
   Nic se nepřepisuje, takže starý záznam přežije i opakovaný zápis do
   historie, export i import beze změny. */
function kopieKola(tah, strop){
  var o = { p: naCislo(tah && tah.p, 0), bust: !!(tah && tah.bust) };
  if(tah && typeof tah.c === "string"){
    o.c = strop ? tah.c.slice(0, strop) : tah.c;
  } else {
    var d = (tah && typeof tah.d === "string") ? tah.d : "";
    o.d = strop ? d.slice(0, strop) : d;
  }
  return o;
}
/* ---------- odvozené ---------- */
function cur(){ return S.rolls[S.rolls.length - 1]; }
function usedInRoll(r){ return r.items.reduce(function(a,i){ return a + i.d; }, 0); }
function left(){ return cur().thrown - usedInRoll(cur()); }
function rollPoints(r){ return r.items.reduce(function(a,i){ return a + i.p; }, 0); }
function potTotal(){ return S.rolls.reduce(function(a,r){ return a + rollPoints(r); }, 0); }
/* otisk rozehrané hry pro historii nebo koš; rozehrané kolo se nezapočítává */
function snapshot(){
  var rez = aktRezim();
  var r = {
    mode: S.mode, goal: S.goal, roundGoal: S.roundGoal || null,
    rezim: rez.id,
    banked: S.banked,
    turns: S.turns.map(function(tah){ return kopieKola(tah); })
  };
  /* Název vlastního režimu se veze se záznamem, ne odkazem do nastavení —
     stejná úvaha jako u kódu k1500x5. Smazání režimu ani import zálohy na
     cizí telefon nesmí nechat v historii id, ke kterému neexistuje text. */
  if(rez.vlastni) r.rezimN = nazevRezimu(rez);
  return r;
}
function makeRecord(id){
  var r = snapshot();
  r.id = id || newId();
  r.savedAt = Date.now();
  return r;
}
function gameEmpty(){
  return S.turns.length === 0 && S.rolls.length === 1 && cur().items.length === 0;
}

export { S, cur, gameEmpty, kopieKola, left, load, makeRecord, naSelhaniUlozeni, neukladame, neukladameStav, ozdrav, oznamUlozeni, poUlozeni, potTotal, rollPoints, save, snapshot, usedInRoll };
