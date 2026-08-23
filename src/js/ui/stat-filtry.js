/* Trvalý filtr pro stránku Statistiky: podle herního režimu a podle typu hry.

   Závisí na: stav/historie, stav/zaznam, pravidla/rezimy, ui/statistiky
              (rezimyPodleHer), ui/filtry (rezimHry, cilHry — čisté funkce,
              ne stav)
   Sahá na: DOM (jen localStorage)

   Na rozdíl od FILTR ve filtry.js se STATFILTR ukládá do localStorage a po
   restartu appky zůstává — proto vlastní soubor, ne rozšíření toho
   stávajícího, jehož hlavička výslovně říká, že se po zavření resetuje.
   Statistiky si tenhle filtr aplikují plošně na celou kartu (na rozdíl od
   FILTR.typ, který statistiky schválně ignorují — ten je jen pro seznam
   historie). Výjimka: filtr typu hry (ne režimu) se nepromítá do
   "celkem" varianty statistik rozdělených na celkem/body/kola — viz
   pouzijTypFiltr() a jeho volání ve statistiky.js.

   Nabídka režimů se staví z DAT (rezimyPodleHer nad celou historií), ne ze
   živého REZIMY.sez — smazaný vlastní režim tak zůstává ve filtru
   dostupný pod svým uloženým jménem, přesně jako u žebříčku "Nejhranější
   režim". Živý režim navíc dostane dnešní jméno (ne to, které náhodou nese
   první nalezená hra), což je drobné vylepšení nad tím, jak jméno bere
   samotný žebříček. */
import { rezimPodleId, nazevRezimu } from "../pravidla/rezimy.js";
import { histAll } from "../stav/historie.js";
import { gRezim } from "../stav/zaznam.js";
import { cilHry, rezimHry } from "./filtry.js";
import { rezimyPodleHer } from "./statistiky.js";

var SFKEY = "farkle-statfiltr-v1";
var STATFILTR = { rezim: null, typ: null, hodnota: null };

function nactiStatFiltr(){
  var raw = null;
  try{ raw = localStorage.getItem(SFKEY); }catch(e){}
  if(!raw) return;
  var o = null;
  try{ o = JSON.parse(raw); }catch(e){ o = null; }
  if(!o || typeof o !== "object") return;
  STATFILTR.rezim = (typeof o.rezim === "string" && o.rezim) ? o.rezim : null;
  STATFILTR.typ = (o.typ === "points" || o.typ === "rounds") ? o.typ : null;
  STATFILTR.hodnota = (typeof o.hodnota === "number") ? o.hodnota : null;
}
nactiStatFiltr();

function ulozStatFiltr(){
  try{ localStorage.setItem(SFKEY, JSON.stringify(STATFILTR)); }catch(e){}
}
function zrusStatFiltr(){
  STATFILTR.rezim = null; STATFILTR.typ = null; STATFILTR.hodnota = null;
  ulozStatFiltr();
}

/* Nabídka pro <select> ve filtru: [{id, nazev, pocet}], seřazená stejně
   jako žebříček "Nejhranější režim" (podle počtu her, pak podle novosti). */
function seznamRezimuKFiltru(){
  return rezimyPodleHer(histAll()).map(function(r){
    var rez = rezimPodleId(r.id);
    return { id: r.id, nazev: rez ? nazevRezimu(rez) : r.nazev, pocet: r.pocet };
  });
}

/* Filtr podle STATFILTR se dělí na dvě nezávislé funkce, ne jednu
   pouzijStatFiltr() — režimy mají různé bodovací tabulky, takže napříč
   nimi nejde srovnávat vůbec (tvrdá nesrovnatelnost, filtruje se plošně
   v histView()). Typ hry je jiná osa: kolo/hod/žádaná statistika je
   uvnitř JEDNOHO režimu mezi typy srovnatelná, jen "celkem" a "typ"
   varianta téže statistiky by se filtrem promítnutým plošně smrskly na
   stejné číslo. Filtr typu proto aplikuje až vyberHry() v statistiky.js,
   podle toho, jestli statistika `def.celkem` je, nebo ne — histView() ho
   sem už neprotlačuje. */
function pouzijRezimFiltr(hry){
  if(STATFILTR.rezim === null) return hry;
  return hry.filter(function(g){ return gRezim(g) === STATFILTR.rezim; });
}
function pouzijTypFiltr(hry){
  if(STATFILTR.typ === null) return hry;
  return hry.filter(function(g){
    if(rezimHry(g) !== STATFILTR.typ) return false;
    if(STATFILTR.hodnota === null) return true;
    return cilHry(g) === STATFILTR.hodnota;
  });
}

export { STATFILTR, pouzijRezimFiltr, pouzijTypFiltr, seznamRezimuKFiltru, ulozStatFiltr, zrusStatFiltr };
