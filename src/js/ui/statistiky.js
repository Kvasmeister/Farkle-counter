/* Sledované statistiky: co se počítá a jak se to shrnuje.

   Závisí na: stav/zaznam, text, pravidla
   Nezávisí na: DOM (kromě statsHTML, které vrací řetězec)

   STATY je jediný seznam, ze kterého se berou dlaždice, seznam statistik
   i žebříčky. Nejhranější režim je třetí druh shrnutí vedle her a dnů
   a jeho žebříček se neproklikává — filtr podle režimu není, takže by
   proklik neměl kam vést.

   POZOR: délka STATY je zadrátovaná v několika testovacích sadách. */
import { t, tn } from "../jazyky/jadro.js";
import { snapshot } from "../stav/stav.js";
import {
  gBody,
  gFarkle,
  gFarklePrvni,
  gFarklePrvniRekord,
  gHoduCelkem,
  gKol,
  gKolKCili,
  gNejhorsiKolo,
  gNejlepsiHod,
  gNejlepsiKolo,
  gNejvicHodu,
  gPrumer,
  gRezim,
  gSerie,
  gZtraceno,
  nazevRezimuZaznamu
} from "../stav/zaznam.js";
import { cislo, desetina, esc, fmt, fmtR } from "../text/format.js";
import { $ } from "./prvky.js";

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
   f: formát, dir: směr žebříčku, kol: dopsat do žebříčku počet kol,
   kat: kategorie (nadpis v seznamu, viz renderStatList),
   hod: žebříček na úrovni jednoho hodu, ne jedné hry (viz
   otevriZebricekHodu ve statistiky-stranka.js) místo obvyklého zebricek().

   Pořadí uvnitř kategorie je závazné — je to pořadí, ve kterém se
   statistiky zobrazují. */
var STATY = [
  { n:"stat.n.pocet",                 a:"pocet",      f:cislo,    kat:"obecne" },
  { n:"stat.n.denmax",                a:"denMax",     f:cislo,    kat:"obecne" },
  { n:"stat.n.rezim",                 a:"rezimMax",   f:cislo,    kat:"obecne" },
  { n:"stat.n.soucet",                a:"soucet",     f:fmt,      num:gBody,  kat:"obecne" },

  { n:"stat.n.maxbody",               m:gBody,        a:"max",   f:fmt,      kol:true,   kat:"hry" },
  { n:"stat.n.maxbodybody",           m:gBody,        a:"max",   f:fmt,      s:"points", kat:"hry" },
  { n:"stat.n.maxbodykola",           m:gBody,        a:"max",   f:fmt,      s:"rounds", kol:true, kat:"hry" },

  { n:"stat.n.prumer",                m:gPrumer,      a:"pomer", f:fmtR,     num:gBody, den:gKol, kat:"kola" },
  { n:"stat.n.prumerbody",            m:gPrumer,      a:"pomer", f:fmtR,     num:gBody, den:gKol, s:"points", kat:"kola" },
  { n:"stat.n.prumerkola",            m:gPrumer,      a:"pomer", f:fmtR,     num:gBody, den:gKol, s:"rounds", kat:"kola" },
  /* Obě „kola v jedné hře na body“ stojí na gKolKCili(), která u nedokončené
     hry vrací null — tím se počítají jen hry, které cíle doopravdy dosáhly,
     a žádný zvláštní výběr her k tomu není potřeba. */
  { n:"stat.n.minkol",                m:gKolKCili,    a:"min",   f:cislo,    s:"points", kat:"kola" },
  { n:"stat.n.maxkol",                m:gKolKCili,    a:"max",   f:cislo,    s:"points", kat:"kola" },
  { n:"stat.n.nejlepsikolo",          m:gNejlepsiKolo,a:"max",   f:fmt,      kat:"kola" },
  { n:"stat.n.nejlepsikolobody",      m:gNejlepsiKolo,a:"max",   f:fmt,      s:"points", kat:"kola" },
  { n:"stat.n.nejlepsikolokola",      m:gNejlepsiKolo,a:"max",   f:fmt,      s:"rounds", kat:"kola" },
  { n:"stat.n.nejhorsikolo",          m:gNejhorsiKolo,a:"min",   f:fmt,      kat:"kola" },
  { n:"stat.n.nejhorsikolobody",      m:gNejhorsiKolo,a:"min",   f:fmt,      s:"points", kat:"kola" },
  { n:"stat.n.nejhorsikolokola",      m:gNejhorsiKolo,a:"min",   f:fmt,      s:"rounds", kat:"kola" },

  { n:"stat.n.maxhodu",               m:gNejvicHodu,  a:"max",   f:cislo,    kol:true, kat:"hody" },
  { n:"stat.n.nejlepsihod",           m:gNejlepsiHod, a:"max",   f:fmt,      hod:true, kat:"hody" },
  { n:"stat.n.prumerhod",                             a:"pomer", f:fmtR,     num:gBody, den:gHoduCelkem, hod:true, kat:"hody" },
  { n:"stat.n.prumerhodbody",                         a:"pomer", f:fmtR,     num:gBody, den:gHoduCelkem, s:"points", hod:true, kat:"hody" },
  { n:"stat.n.prumerhodkola",                         a:"pomer", f:fmtR,     num:gBody, den:gHoduCelkem, s:"rounds", hod:true, kat:"hody" },

  { n:"stat.n.maxfarklu",             m:gFarkle,      a:"max",   f:cislo,    kol:true, kat:"farkly" },
  { n:"stat.n.farkleprvni",           m:gFarklePrvniRekord, a:"soucet",f:cislo, num:gFarklePrvni, kol:true, kat:"farkly" },
  { n:"stat.n.maxfarkleprvni",        m:gFarklePrvniRekord, a:"max",   f:cislo, kol:true, kat:"farkly" },
  { n:"stat.n.ztraceno",              m:gZtraceno,    a:"max",   f:fmt,      kol:true, kat:"farkly" },
  { n:"stat.n.ztracenobody",          m:gZtraceno,    a:"max",   f:fmt,      kol:true, s:"points", kat:"farkly" },
  { n:"stat.n.ztracenokola",          m:gZtraceno,    a:"max",   f:fmt,      kol:true, s:"rounds", kat:"farkly" },
  { n:"stat.n.serie",                 m:gSerie,       a:"max",   f:cislo,    kol:true, kat:"farkly" },
  { n:"stat.n.farkluhra",             m:gFarkle,      a:"pomer", f:desetina, num:gFarkle, den:function(){ return 1; }, dir:"asc", kat:"farkly" }
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

export { STATY, denKlic, dnyPodleHer, jdeRozkliknout, renderStats, rezimyPodleHer, statHodnota, statsHTML, vyberHry, zebricek };
