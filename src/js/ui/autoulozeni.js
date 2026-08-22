/* Automatické uložení dohrané hry a pop-up, který to oznámí.

   Závisí na: stav, ui/prvky
   Sahá na: DOM, localStorage

   Spouští se ze tří míst: bank(), bust() a změna režimu/cíle/limitu — tedy
   odevšad, kde se stav zámku může změnit. NE z render(): ten běží i při
   startu a po obnově z koše, takže by se dohraná hra ukládala sama i tam,
   kde o to nikdo nežádal.

   Okénko sedí na švu mezi hlavičkou a kartami. Šev se posouvá, když je
   rozbalené nastavení hry, takže top dopočítává umistiToast() při každém
   zobrazení; bez layoutu (jsdom) měření tiše propadne.

   toast()/schovejToast() jsou obecné — druhý volající je
   ui/sdileni-rezimu.js, který přes ně hlásí i chyby (druhý parametr
   `spatne` přepne popup na červenou variantu, stejně jako `.msg.bad`
   u řádkových hlášek jinde v appce). */
import { locked } from "../akce.js";
import { t } from "../jazyky/jadro.js";
import { S, gameEmpty, save } from "../stav/stav.js";
import { $ } from "./prvky.js";
import { kdeZaznam, selhalZapis, zapisHru } from "./zapis.js";

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
function toast(text, spatne){
  var el = $("toast");
  if(!el) return;
  $("toasttext").textContent = text;
  el.classList.toggle("bad", !!spatne);
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


/* Přepínač hlásí stav, ne akci — text říká Zapnuto/Vypnuto. Uložení klíče
   patří sem, ne k obsluze tlačítka. */
function prepniAuto(){
  autoZap = !autoZap;
  try{ localStorage.setItem(AUKEY, autoZap ? "1" : "0"); }catch(e){}
  return autoZap;
}
function autoZapnuto(){ return autoZap; }

export { AUKEY, autoBezi, autoZap, autoZapnuto, prepniAuto, schovejToast, toast, toastTimer, umistiToast, zkusAutoUlozit };
