/* Jádro i18n — katalog, výběr jazyka, t()/tn()/kat(), registr překreslení.

   Závisí na: jazyky/cs (RUCNI), jazyky/en (EN)
   Sahá na: <body> (sberCestinu, prelozStatiku), localStorage (JKEY),
            navigator (zjistiJazyk)

   Past: sberCestinu() smí běžet jen jednou — podruhé by sebrala už přeložený
   text. Hlídá to příznak `sebrano`.
   Past: klíč skládaný za běhu musí končit tečkou (t("rezim.stej." + n)),
   jinak ho strážní kontrola sady 16 vezme jako literál. */
import { RUCNI } from "./cs.js";
import { EN } from "./en.js";

/* ---------- jazyky ----------
   Čeština se do katalogu nepíše ručně. Statické texty zůstávají napsané
   přímo v <body> a při startu se z anotovaných prvků jednou seberou do
   I18N.cs — teprve pak se případně přepíšou. Diff v HTML je tak jen
   přidaný atribut, výchozí vykreslení je hotové bez záblesku prázdné
   stránky a návrat k češtině nepotřebuje reload.

   Texty, které vznikají až za běhu (seznamy her, žebříčky), do sběru
   nepatří — ty jdou přes t() a tn() a v katalogu stojí napsané. */
var JAZYKY = ["cs", "en"];        /* pořadí v přepínači */
var VYCHOZI = "cs";
var JKEY = "farkle-jazyk-v1";
var I18N = { cs: {}, en: {} };

/* Názvy v přepínači jsou endonyma a do katalogu nepatří: vlastní jméno
   jazyka se nepřekládá, aby ho uživatel našel i v rozhraní, kterému
   nerozumí. Každý další jazyk sem přidá jednu dvojici. */
var NAZVY = { cs: "Čeština", en: "English" };

I18N.cs.plural = function(n){ return n === 1 ? 0 : ((n >= 2 && n < 5) ? 1 : 2); };
I18N.en.plural = function(n){ return n === 1 ? 0 : 1; };

/* ---------- čísla a data ----------
   toLocale* zůstává mimo hru: výstup by se lišil podle zařízení a font je
   subsetovaný. Formát proto řídí katalog a fmt(), dt(), dtDen() i
   desetina() si ho odsud tahají. Oddělovač tisíců, desetinná značka
   i tvary data tak leží na jednom místě. */
I18N.cs.sep = "\u202F";        /* úzká nezlomitelná mezera */
I18N.cs.des = ",";
I18N.en.sep = ",";
I18N.en.des = ".";
function hodiny(d){ return d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2); }
I18N.cs.datum    = function(d){ return d.getDate() + ". " + (d.getMonth() + 1) + ". " + d.getFullYear(); };
I18N.cs.datumCas = function(d){ return I18N.cs.datum(d) + " \u00B7 " + hodiny(d); };
/* Rozsah dnů se píše co nejúsporněji: shodné části se neopakují. */
I18N.cs.datumRozsah = function(a, b){
  if(a.getFullYear() !== b.getFullYear()) return I18N.cs.datum(a) + " \u2013 " + I18N.cs.datum(b);
  if(a.getMonth() !== b.getMonth())
    return a.getDate() + ". " + (a.getMonth() + 1) + ". \u2013 " + I18N.cs.datum(b);
  return a.getDate() + ".\u2013" + I18N.cs.datum(b);
};
/* Anglické zkratky měsíců přidávají do textu jen znaky, které font už má.
   Každý další jazyk je nutné proti subsetu prověřit znovu. */
var MESICE_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
I18N.en.datum    = function(d){ return MESICE_EN[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); };
I18N.en.datumCas = function(d){ return I18N.en.datum(d) + " \u00B7 " + hodiny(d); };
I18N.en.datumRozsah = function(a, b){
  if(a.getFullYear() !== b.getFullYear()) return I18N.en.datum(a) + " \u2013 " + I18N.en.datum(b);
  if(a.getMonth() !== b.getMonth())
    return MESICE_EN[a.getMonth()] + " " + a.getDate() + " \u2013 " + I18N.en.datum(b);
  return MESICE_EN[a.getMonth()] + " " + a.getDate() + " \u2013 " + b.getDate() + ", " + b.getFullYear();
};

var jazyk = VYCHOZI;

/* Hodnoty se do textu doplňují pojmenovaně, ne zřetězením: pořadí čísel
   ve větě se jazyk od jazyka liší a slepené kousky by ho zafixovaly
   česky. Neznámý zástupný symbol zůstane, jak je — viditelná chyba je
   lepší než prázdné místo. */
function vloz(text, hodnoty){
  if(!hodnoty) return text;
  return text.replace(/\{(\w+)\}/g, function(cely, jmeno){
    var v = hodnoty[jmeno];
    return (v === undefined || v === null) ? cely : String(v);
  });
}
/* Nenajde-li se klíč v jazyce, zkusí se čeština; nenajde-li se ani tam,
   vrátí se samotný klíč. Klíč v rozhraní je chyba, ale viditelná —
   lepší než prázdné místo. */
function t(klic, hodnoty){
  var v = I18N[jazyk] && I18N[jazyk][klic];
  if(typeof v !== "string"){ v = I18N[VYCHOZI][klic]; }
  return vloz(typeof v === "string" ? v : klic, hodnoty);
}
/* Klíče s více tvary jsou pole. Tvar vybírá plural() toho jazyka, ze
   kterého pole nakonec pochází — jinak by propadlá česká trojice dostala
   anglické pravidlo a vyšlo by „5 kola". Jazyk s méně tvary, než jich
   klíč nabízí, bere poslední dostupný. Počet se do tvaru doplní sám
   jako {n}, aby si každý jazyk mohl číslo umístit po svém. */
function tn(klic, n, hodnoty){
  var kod = (I18N[jazyk] && Array.isArray(I18N[jazyk][klic])) ? jazyk : VYCHOZI;
  var tvary = I18N[kod][klic];
  if(!Array.isArray(tvary) || !tvary.length) return klic;
  var i = I18N[kod].plural(n);
  var vse = { n: n }, k;
  if(hodnoty){ for(k in hodnoty){ if(Object.prototype.hasOwnProperty.call(hodnoty, k)) vse[k] = hodnoty[k]; } }
  return vloz(tvary[Math.min(Math.max(i, 0), tvary.length - 1)], vse);
}
/* Položky katalogu, které nejsou text (oddělovače, formátovače data),
   mají stejný propad do češtiny jako texty. */
function kat(jmeno){
  var v = I18N[jazyk] && I18N[jazyk][jmeno];
  return v === undefined ? I18N[VYCHOZI][jmeno] : v;
}

for(var rucniKlic in RUCNI){
  if(Object.prototype.hasOwnProperty.call(RUCNI, rucniKlic)) I18N.cs[rucniKlic] = RUCNI[rucniKlic];
}

for(var enKlic in EN){
  if(Object.prototype.hasOwnProperty.call(EN, enKlic)) I18N.en[enKlic] = EN[enKlic];
}

function primarni(kod){ return String(kod || "").toLowerCase().split("-")[0]; }
function zeSystemu(){
  var seznam = [];
  try{
    if(navigator.languages && navigator.languages.length){ seznam = [].slice.call(navigator.languages); }
    else if(navigator.language){ seznam = [navigator.language]; }
  }catch(e){}
  for(var i = 0; i < seznam.length; i++){
    var p = primarni(seznam[i]);
    if(JAZYKY.indexOf(p) >= 0) return p;
  }
  return VYCHOZI;
}
/* Při startu se do localStorage nic nezapisuje. Dokud uživatel nesáhne na
   přepínač, aplikace každý start následuje systém; uložený nesmysl se
   ignoruje a propadne se na systém. */
function zjistiJazyk(){
  var ulozeny = null;
  try{ ulozeny = localStorage.getItem(JKEY); }catch(e){}
  if(ulozeny && JAZYKY.indexOf(ulozeny) >= 0) return ulozeny;
  return zeSystemu();
}

var ANOTACE = [
  { atr: "data-i18n",       cil: "text" },
  { atr: "data-i18n-html",  cil: "html" },
  { atr: "data-i18n-aria",  cil: "aria-label" },
  { atr: "data-i18n-title", cil: "title" },
  { atr: "data-i18n-ph",    cil: "placeholder" }
];
function projdiAnotace(fn){
  for(var i = 0; i < ANOTACE.length; i++){
    var a = ANOTACE[i];
    var prvky = document.querySelectorAll("[" + a.atr + "]");
    for(var j = 0; j < prvky.length; j++){
      fn(prvky[j], a.cil, prvky[j].getAttribute(a.atr));
    }
  }
}
function ctiText(el, cil){
  if(cil === "text") return el.textContent;
  if(cil === "html") return el.innerHTML;
  return el.getAttribute(cil) || "";
}
function pisText(el, cil, text){
  if(cil === "text"){ el.textContent = text; return; }
  if(cil === "html"){ el.innerHTML = text; return; }
  el.setAttribute(cil, text);
}
/* Sběr běží jen jednou. Kdyby se pustil podruhé, sebral by už přeložený
   text a čeština by se ztratila. */
var sebrano = false;
function sberCestinu(){
  if(sebrano) return;
  sebrano = true;
  projdiAnotace(function(el, cil, klic){
    if(typeof I18N.cs[klic] === "string") return;   /* první výskyt vyhrává */
    I18N.cs[klic] = ctiText(el, cil);
  });
}
function prelozStatiku(){
  projdiAnotace(function(el, cil, klic){ pisText(el, cil, t(klic)); });
}
/* Statické texty přepíše prelozStatiku(), ale to, co se skládá až za běhu
   (počítadlo, statistiky, historie, stavové popisky tlačítek), se musí
   překreslit vlastní funkcí. Registr existuje proto, aby nastavJazyk()
   nemusel znát jméno každé z nich — přibývající místa se jen přiregistrují.
   Při startu je registr prázdný, takže první volání nic nespouští a pořadí
   inicializace zůstává beze změny. */
var PREKRESLI = [];
function naJazyk(fn){ PREKRESLI.push(fn); }
function prekresliVse(){
  for(var i = 0; i < PREKRESLI.length; i++){
    /* jedno rozbité překreslení nesmí shodit zbytek ani nechat aplikaci
       napůl přepnutou */
    try{ PREKRESLI[i](); }catch(e){}
  }
}
function nastavJazyk(kod, ulozit){
  jazyk = (JAZYKY.indexOf(kod) >= 0) ? kod : VYCHOZI;
  if(ulozit){ try{ localStorage.setItem(JKEY, jazyk); }catch(e){} }
  document.documentElement.lang = jazyk;
  prelozStatiku();
  prekresliVse();
}

/* `jazyk` se vyváží jako živá vazba: nastavJazyk() ho přepisuje a
   přepínač v nastavení musí vidět aktuální hodnotu, ne kopii z importu. */

export { ANOTACE, I18N, JAZYKY, JKEY, MESICE_EN, NAZVY, PREKRESLI, VYCHOZI, ctiText, hodiny, jazyk, kat, naJazyk, nastavJazyk, pisText, prekresliVse, prelozStatiku, primarni, projdiAnotace, sberCestinu, sebrano, t, tn, vloz, zeSystemu, zjistiJazyk };
