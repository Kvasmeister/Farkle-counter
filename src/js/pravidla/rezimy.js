/* Herní režimy — celá sada pravidel a její uložení.

   Závisí na: pravidla/kombinace (cistaKombinace), pravidla/postupky
              (POST_PORADI), spolecne (naCislo)
   Nezávisí na: DOM, jazyku

   Persistenci si modul nese sám (jeden synchronní klíč v localStorage):
   volba režimu je součást pravidel, ne stavu rozehrané hry. `S.rezim`
   proto neexistuje — jedinou pravdou je REZIMY.akt.

   U presetu se ukládají JEN odchylky od výchozích hodnot. Kdyby se
   ukládal celý, pozdější oprava výchozí tabulky by nedorazila k nikomu,
   kdo se režimu jednou dotkl. */
import { BODY_MAX, KOMBKEY, PRESET_PORADI, VLASTNI_MAX, cistaKombinace } from "./kombinace.js";
import { POST_PORADI } from "./postupky.js";
import { NAZEV_MAX, naCislo } from "../spolecne.js";

/* ---------- herní režimy ----------
   Režim je celá sada pravidel: počet kostek, tři šestice sazeb (samostatná
   kostka, dvojice, trojice), pravidlo pro čtyři a víc stejných, postupky,
   kombinace navíc a vlastní vzory. Tři přednastavené vychází z
   `docs/farkle-pravidla-verze.md`, vlastních jde přidat dvacet.

   `post` a `p` jsou řídké mapy: přítomnost klíče znamená „boduje“. Stejná
   úvaha jako u kombinací navíc — žádný boolean vedle sazby, tedy ani stav,
   který si může protiřečit.

   V paměti je každý režim úplný, sparse je až zápis (viz ulozRezimy).
   Jeden objekt na režim, ne skládaná kopie při každém volání: editor
   v nastavení do něj zapisuje přímo a druhá, zastaralá kopie by nesměla
   vzniknout. */
var REZKEY = "farkle-rezimy-v1";
var REZIMY_MAX = 20;         /* strop vlastních režimů */
/* Kolik samostatně bodujících hodnot se ještě vejde do vlastní řady čipů,
   aniž by se čipy zmenšily. Nad to se řada schová a zadává se přes 1×
   ve Stejných hodnotách. */
var SAMOSTATNE_V_RADE = 3;
var NAD_DRUHY = ["x2", "nasobek", "pevne"];
var VYCHOZI_REZIM = "kcd2";
var TROJ_ZAKLAD = [0, 1000, 200, 300, 400, 500, 600];
var SAM_ZAKLAD  = [0, 100, 0, 0, 0, 50, 0];   /* jednička a pětka */
/* Pevné body za počty nad prahem. Index je rovnou počet kostek, ne pořadí
   v trojici jako dřív — práh se dnes dá posunout, takže na čtyřce začínat
   nemusí. */
var NADP_ZAKLAD = [0, 0, 0, 1000, 1000, 2000, 3000];
var POCTY_STEJ  = [2, 3, 4, 5, 6];   /* počty, které můžou mít vlastní šestici */
var PRAH_ZAKLAD = 3;                 /* od kolika stejných se boduje ve výchozím stavu */
/* Boduje v té šestici aspoň jedna hodnota? Prázdná šestice je totéž co
   vypnutý počet, takže se nikde nedrží zvlášť. */
function sestiZap(pole){
  for(var v = 1; v <= 6; v++){ if(pole && pole[v] > 0) return true; }
  return false;
}
/* Počty stejných čísel, které v režimu bodují, odspoda. */
function poctyStej(rez){
  var out = [], i, n;
  for(i = 0; i < POCTY_STEJ.length; i++){
    n = POCTY_STEJ[i];
    /* Počet vyšší, než kolika kostkami se hází, nikdy nepadne — v tabulce
       zůstat může (režim se dá přepnout zpátky na šest), ale bodování ani
       extrapolace nad prahem o něm vědět nesmí. */
    if(n <= rez.kostek && rez.stej[n]) out.push(n);
  }
  return out;
}
function stejZap(rez, n){ return !!rez.stej[n]; }
/* Práh je nejnižší zapnutý počet, `nejvyssiStej` ten, nad kterým se
   extrapoluje pravidlem `nad`. Prázdná tabulka vrací null. */
function prahStej(rez){ var p = poctyStej(rez); return p.length ? p[0] : null; }
function nejvyssiStej(rez){ var p = poctyStej(rez); return p.length ? p[p.length - 1] : null; }
/* Šestice sazeb z cizích dat: očištěná kopie, nebo null, když v ní nic
   neboduje. */
function cistaSestice(x){
  var pole = [0,0,0,0,0,0,0], v;
  if(!Array.isArray(x)) return null;
  for(v = 1; v <= 6; v++){ if(x[v] !== undefined) pole[v] = mezeBodu(x[v]); }
  return sestiZap(pole) ? pole : null;
}
function kopieStej(m){
  var out = {}, i, n;
  for(i = 0; i < POCTY_STEJ.length; i++){
    n = POCTY_STEJ[i];
    if(m[n]) out[n] = m[n].slice();
  }
  return out;
}
function stejnaStej(a, b){
  var i, n;
  for(i = 0; i < POCTY_STEJ.length; i++){
    n = POCTY_STEJ[i];
    if(!a[n] !== !b[n]) return false;
    if(a[n] && !stejnePole(a[n], b[n])) return false;
  }
  return true;
}
/* Kolik samostatných hodnot boduje — podle toho se řídí řada čipů. */
function pocetSamostatnych(rez){
  var n = 0, v;
  for(v = 1; v <= 6; v++){ if(rez.sam[v] > 0) n++; }
  return n;
}

/* Dvě čísla zdrojový dokument u pětikostkové verze neurčuje a dosazují se:
   sazba pětikostkové postupky (500 / 750 jako u KCD2) a pravidlo pro čtyři
   a pět stejných (násobek jako u klasiky). Obojí je editovatelné. */
var PRESET_REZIMY = {
  "kcd2":    { kostek:6, sam:SAM_ZAKLAD, stej:{ 3:TROJ_ZAKLAD }, nad:"x2",
               nadP:NADP_ZAKLAD, post:{ "15":500, "26":750, "16":1500 }, p:{}, v:[] },
  "klasika": { kostek:6, sam:SAM_ZAKLAD, stej:{ 3:TROJ_ZAKLAD }, nad:"nasobek",
               nadP:NADP_ZAKLAD, post:{ "16":1000 }, p:{ "3p":750 }, v:[] },
  "pet":     { kostek:5, sam:SAM_ZAKLAD, stej:{ 3:TROJ_ZAKLAD }, nad:"nasobek",
               nadP:NADP_ZAKLAD, post:{ "15":500, "26":750 }, p:{}, v:[] }
};
var PRESET_REZ_PORADI = ["kcd2", "klasika", "pet"];

var REZIMY = { akt: VYCHOZI_REZIM, sez: [] };

function kopieMapy(m){
  var out = {}, k;
  for(k in m){ if(Object.prototype.hasOwnProperty.call(m, k)) out[k] = m[k]; }
  return out;
}
function stejnaMapa(a, b){
  var k;
  for(k in a){ if(Object.prototype.hasOwnProperty.call(a, k) && a[k] !== b[k]) return false; }
  for(k in b){ if(Object.prototype.hasOwnProperty.call(b, k) && a[k] !== b[k]) return false; }
  return true;
}
function stejnePole(a, b){
  if(a.length !== b.length) return false;
  for(var i = 0; i < a.length; i++){ if(a[i] !== b[i]) return false; }
  return true;
}
/* Čerstvý režim z presetu. Pole a mapy se kopírují, aby úprava jednoho
   režimu nepřepsala výchozí tabulku ani sourozence. */
function zPresetu(id){
  var d = PRESET_REZIMY[id];
  return { id: id, nazev: null, vlastni: false,
           kostek: d.kostek,
           sam: d.sam.slice(), stej: kopieStej(d.stej), rozs: false,
           nad: d.nad, nadP: d.nadP.slice(),
           post: kopieMapy(d.post), p: kopieMapy(d.p), v: [] };
}
function rezimPodleId(id){
  for(var i = 0; i < REZIMY.sez.length; i++){ if(REZIMY.sez[i].id === id) return REZIMY.sez[i]; }
  return null;
}
/* Aktivní režim se nikdy nevrací jako null: neznámé id (smazaný vlastní
   režim, cizí záloha) spadne na výchozí. */
function aktRezim(){ return rezimPodleId(REZIMY.akt) || rezimPodleId(VYCHOZI_REZIM); }
function kostek(){ return aktRezim().kostek; }
function seznamRezimu(){ return REZIMY.sez.slice(); }
function jePreset(id){ return Object.prototype.hasOwnProperty.call(PRESET_REZIMY, id); }

/* Cizí záloha ani poškozené úložiště nesmí projít dál nezkontrolované.
   `zaklad` je preset, ze kterého se vychází u přednastaveného režimu;
   u vlastního je to výchozí KCD2, aby chybějící pole měla čím být. */
function cistyRezim(x, id, zaklad){
  var rez = zPresetu(zaklad || VYCHOZI_REZIM), v, b, k, i, pole;
  rez.id = id;
  rez.vlastni = !jePreset(id);
  if(!x || typeof x !== "object") return rez;
  if(typeof x.nazev === "string") rez.nazev = x.nazev.slice(0, NAZEV_MAX);
  b = Math.floor(naCislo(x.kostek, 0));
  if(b >= 2 && b <= 6) rez.kostek = b;
  /* Dokud tabulka měla jen jedničku a pětku, ukládaly se pod jed/pet.
     Čte se to dál, aby se režim uložený tehdejší verzí nerozbil. */
  if(x.sam === undefined && (x.jed !== undefined || x.pet !== undefined)){
    pole = rez.sam.slice();
    if(x.jed !== undefined) pole[1] = mezeBodu(x.jed);
    if(x.pet !== undefined) pole[5] = mezeBodu(x.pet);
    rez.sam = pole;
  }
  if(Array.isArray(x.sam)){
    pole = rez.sam.slice();
    for(v = 1; v <= 6; v++){ if(x.sam[v] !== undefined) pole[v] = mezeBodu(x.sam[v]); }
    rez.sam = pole;
  }
  /* Počty stejných čísel drží dnes řídká mapa `stej`; dřív to byla dvě pevná
     pole `dvoj` a `troj`. Čte se obojí, aby režim uložený starší verzí platil
     dál — prázdná šestice znamenala vypnuto tehdy i teď. */
  if(x.stej && typeof x.stej === "object"){
    rez.stej = {};
    for(i = 0; i < POCTY_STEJ.length; i++){
      pole = cistaSestice(x.stej[POCTY_STEJ[i]]);
      if(pole) rez.stej[POCTY_STEJ[i]] = pole;
    }
  } else if(x.dvoj !== undefined || x.troj !== undefined){
    /* Starý zápis nesl dvě pevná pole a v odchylkách presetu stálo jen to,
       co se lišilo — nedotčené pole se proto nesmí vzít jako vypnuté.
       Výslovná šestice samých nul vypnutí znamená. */
    if(x.dvoj !== undefined){
      pole = cistaSestice(x.dvoj);
      if(pole) rez.stej[2] = pole; else delete rez.stej[2];
    }
    if(x.troj !== undefined){
      pole = cistaSestice(x.troj);
      if(pole) rez.stej[3] = pole; else delete rez.stej[3];
    }
  }
  if(NAD_DRUHY.indexOf(x.nad) >= 0) rez.nad = x.nad;
  if(Array.isArray(x.nadP)){
    pole = rez.nadP.slice();
    if(x.nadP.length === 3){
      /* starý zápis: tři čísla pro počty 4–6, práh byl vždycky trojka */
      for(i = 0; i < 3; i++){ if(x.nadP[i] !== undefined) pole[i + 4] = mezeBodu(x.nadP[i]); }
      pole[3] = pole[4];
    } else {
      for(i = 3; i <= 6; i++){ if(x.nadP[i] !== undefined) pole[i] = mezeBodu(x.nadP[i]); }
    }
    rez.nadP = pole;
  }
  if(x.post && typeof x.post === "object"){
    rez.post = {};
    for(i = 0; i < POST_PORADI.length; i++){
      k = POST_PORADI[i];
      if(x.post[k] === undefined) continue;
      b = mezeBodu(x.post[k]);
      if(b > 0) rez.post[k] = b;
    }
  }
  if(x.p && typeof x.p === "object"){
    rez.p = {};
    for(i = 0; i < PRESET_PORADI.length; i++){
      k = PRESET_PORADI[i];
      if(x.p[k] === undefined) continue;
      b = mezeBodu(x.p[k]);
      if(b > 0) rez.p[k] = b;
    }
  }
  if(Array.isArray(x.v)){
    for(i = 0; i < x.v.length && rez.v.length < VLASTNI_MAX; i++){
      var vz = cistaKombinace(x.v[i], rez.v.length + 1);
      if(vz) rez.v.push(vz);
    }
  }
  /* Rozšířený rozpad je jen pohled, ale víc než jeden zapnutý počet ho
     vynutí, ať je uloženo cokoli: základní pohled umí ukázat jediný. */
  rez.rozs = !!x.rozs || poctyStej(rez).length > 1;
  return rez;
}
function mezeBodu(x){
  var b = Math.floor(naCislo(typeof x === "string" ? parseInt(x, 10) : x, 0));
  if(!(b > 0)) return 0;
  return Math.min(b, BODY_MAX);
}

function nactiRezimy(){
  var raw = null, o = null, i, id;
  try{ raw = localStorage.getItem(REZKEY); }catch(e){}
  if(raw){ try{ o = JSON.parse(raw); }catch(e){ o = null; } }
  if(!o || typeof o !== "object") o = null;
  /* Migrace: kombinace navíc byly dosud jedny pro celou aplikaci a hrálo se
     s nimi podle KCD2 — stanou se tedy odchylkou toho režimu. Starý klíč se
     nemaže, stejný záchranný idiom jako u farkle-hist-v1-zaloha. */
  if(!o){
    var stare = null;
    try{ stare = localStorage.getItem(KOMBKEY); }catch(e){}
    if(stare){
      try{ var so = JSON.parse(stare); }catch(e){ so = null; }
      if(so && typeof so === "object") o = { akt: VYCHOZI_REZIM, p: { kcd2: { p: so.p, v: so.v } }, v: [] };
    }
  }
  REZIMY.sez = [];
  for(i = 0; i < PRESET_REZ_PORADI.length; i++){
    id = PRESET_REZ_PORADI[i];
    REZIMY.sez.push(cistyRezim(o && o.p ? o.p[id] : null, id, id));
  }
  if(o && Array.isArray(o.v)){
    for(i = 0; i < o.v.length && REZIMY.sez.length < PRESET_REZ_PORADI.length + REZIMY_MAX; i++){
      var x = o.v[i];
      if(!x || typeof x !== "object") continue;
      id = (typeof x.id === "string" && x.id && !jePreset(x.id)) ? x.id.slice(0, 40) : novyIdRezimu();
      if(rezimPodleId(id)) continue;
      REZIMY.sez.push(cistyRezim(x, id, VYCHOZI_REZIM));
    }
  }
  REZIMY.akt = (o && typeof o.akt === "string" && rezimPodleId(o.akt)) ? o.akt : VYCHOZI_REZIM;
}
function novyIdRezimu(){
  return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
/* U presetu se ukládají jen odchylky od výchozích hodnot. Kdyby se ukládal
   celý, pozdější oprava výchozí tabulky by nedorazila k nikomu, kdo se
   režimu jednou dotkl. Vlastní režim není proti čemu diffovat. */
function venKombinaci(k){
  return { id: k.id, n: k.n, b: k.b, z: k.z,
           vz: k.vz.map(function(vz){ return { v: vz.v, t: vz.tvar }; }) };
}
function odchylkyRezimu(rez){
  var d = PRESET_REZIMY[rez.id], out = {}, prazdno = true;
  function dej(klic, hodnota){ out[klic] = hodnota; prazdno = false; }
  if(rez.kostek !== d.kostek) dej("kostek", rez.kostek);
  if(!stejnePole(rez.sam, d.sam)) dej("sam", rez.sam.slice());
  if(!stejnaStej(rez.stej, d.stej)) dej("stej", kopieStej(rez.stej));
  if(rez.rozs) dej("rozs", true);
  if(rez.nad !== d.nad) dej("nad", rez.nad);
  if(!stejnePole(rez.nadP, d.nadP)) dej("nadP", rez.nadP.slice());
  if(!stejnaMapa(rez.post, d.post)) dej("post", kopieMapy(rez.post));
  if(!stejnaMapa(rez.p, d.p)) dej("p", kopieMapy(rez.p));
  if(rez.v.length) dej("v", rez.v.map(venKombinaci));
  return prazdno ? null : out;
}
function venRezim(rez){
  return { id: rez.id, nazev: rez.nazev, kostek: rez.kostek,
           sam: rez.sam.slice(), stej: kopieStej(rez.stej), rozs: rez.rozs,
           nad: rez.nad, nadP: rez.nadP.slice(),
           post: kopieMapy(rez.post), p: kopieMapy(rez.p), v: rez.v.map(venKombinaci) };
}
function ulozRezimy(){
  var ven = { akt: REZIMY.akt, p: {}, v: [] }, o;
  REZIMY.sez.forEach(function(rez){
    if(rez.vlastni){ ven.v.push(venRezim(rez)); return; }
    o = odchylkyRezimu(rez);
    if(o) ven.p[rez.id] = o;
  });
  try{ localStorage.setItem(REZKEY, JSON.stringify(ven)); }catch(e){}
}


export { NADP_ZAKLAD, NAD_DRUHY, POCTY_STEJ, PRAH_ZAKLAD, PRESET_REZIMY, PRESET_REZ_PORADI, REZIMY, REZIMY_MAX, REZKEY, SAMOSTATNE_V_RADE, SAM_ZAKLAD, TROJ_ZAKLAD, VYCHOZI_REZIM, aktRezim, cistaSestice, cistyRezim, jePreset, kopieMapy, kopieStej, kostek, mezeBodu, nactiRezimy, nejvyssiStej, novyIdRezimu, odchylkyRezimu, pocetSamostatnych, poctyStej, prahStej, rezimPodleId, sestiZap, seznamRezimu, stejZap, stejnaMapa, stejnaStej, stejnePole, ulozRezimy, venKombinaci, venRezim, zPresetu };
