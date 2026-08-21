/* Kombinace navíc — pět přednastavených a vlastní se vzory.

   Závisí na: spolecne, jazyky/jadro (jen t())
   Nezávisí na: DOM, úložišti, ostatních pravidlech
                (režim dostává parametrem `rez`)

   Odchylka od vrstvení, a vědomá: cistaKombinace() potřebuje t(), protože
   výchozí jméno „Kombinace N“ se MATERIALIZUJE PŘI VZNIKU. Kdyby se
   dopočítávalo z pořadí až při vykreslení, smazání sourozence by ostatní
   přejmenovalo. Jméno tím patří datům, ne zobrazení — a data vznikají tady.

   Vzory jedné kombinace jsou spojené „nebo“: boduje, jakmile sedne
   kterýkoli. Vzor má konkrétní hodnoty (`pocty`) a skupiny „libovolná,
   ale stejná hodnota“ (`tvar`).

   sediVzor() sem patří, i když stál historicky u rizika — je to test
   tvaru, ne výpočet pravděpodobnosti, a sediKombinace() ho volá. */
import { NAZEV_MAX, naCislo, newId } from "../spolecne.js";
import { t } from "../jazyky/jadro.js";

/* ---------- kombinace navíc ----------
   Pevný inventář čtyř položek, který se nikdy nerozroste. Logických
   kombinací kostek totiž není mnoho; krom toho, co aplikace umí dnes, se
   jich reálně hraje právě těchhle pár. Editor vlastních vzorů zůstává
   jako úniková cesta, ne jako hlavní vchod.

   `d` je počet kostek, `def` výchozí sazba, `k` kód štítku a `je()`
   predikát nad polem počtů výskytů. Predikát používá **jen výpočet
   rizika**, klávesnice ne: sazba i počet kostek jsou pevné, takže
   tlačítko hodnoty kostek vůbec znát nemusí. Cena za to je, že čtveřice
   šestek a čtveřice jedniček platí stejně — a že „čtveřice a dvojice“ je
   při čtyřech jedničkách past (1 500 proti 2 000 za samotnou čtveřici).
   Proto je sazba editovatelná a čip svoje body ukazuje. */
function poctuAspon(c, n){
  var k = 0, v;
  for(v = 1; v <= 6; v++){ if(c[v] >= n) k++; }
  return k;
}
/* hodnota s aspoň `a` kostkami a k ní **jiná** hodnota s aspoň `b` */
function dvojiceRuznych(c, a, b){
  var v, w;
  for(v = 1; v <= 6; v++){
    if(c[v] < a) continue;
    for(w = 1; w <= 6; w++){ if(w !== v && c[w] >= b) return true; }
  }
  return false;
}
var PRESETY = {
  "2p": { d:4, def: 250, k:"c2p", zapis:"2+2",   je: function(c){ return poctuAspon(c, 2) >= 2; } },
  "3p": { d:6, def: 500, k:"c3p", zapis:"2+2+2", je: function(c){ return poctuAspon(c, 2) >= 3; } },
  "32": { d:5, def:1200, k:"c32", zapis:"3+2",   je: function(c){ return dvojiceRuznych(c, 3, 2); } },
  "33": { d:6, def:2000, k:"c33", zapis:"3+3",   je: function(c){ return poctuAspon(c, 3) >= 2; } },
  "42": { d:6, def:1500, k:"c42", zapis:"4+2",   je: function(c){ return dvojiceRuznych(c, 4, 2); } }
};
var PRESET_PORADI = ["2p", "3p", "32", "33", "42"];
var KOMBKEY = "farkle-kombinace-v1";   /* starý klíč, čte se jen při migraci */
var VLASTNI_MAX = 8;         /* strop vlastních kombinací v jednom režimu */
var VZORU_MAX = 6;           /* strop vzorů v jedné kombinaci */
var PISMENA = ["A", "B", "C", "D", "E", "F"];
var BODY_MAX = 999999;       /* šest číslic — víc se do kódu k…x… nevejde */

/* Přítomnost klíče v `p` je zapnutí. Žádný zvláštní boolean vedle sazby,
   tedy ani žádný stav, který si může protiřečit. Kombinace i sazby patří
   režimu, ne aplikaci — každý režim si drží svoje. */
function kombZap(rez, k){ return Object.prototype.hasOwnProperty.call(rez.p, k); }
function sazba(rez, k){ return kombZap(rez, k) ? rez.p[k] : PRESETY[k].def; }
/* Kombinace na šest kostek nemá v pětikostkovém režimu co dělat: nikdy by
   nešla odložit a v seznamu by jen mátla. */
function kombVRezimu(rez, k){ return PRESETY[k].d <= rez.kostek; }

/* Setříděné počty výskytů: vzor 1,1,1+5,5 má tvar [3,2]. U „libovolných
   hodnot“ se porovnává právě tenhle tvar, ne konkrétní hodnoty. */
function tvarZPoctu(pocty){
  var out = [], v;
  for(v = 1; v <= 6; v++){ if(pocty[v]) out.push(pocty[v]); }
  out.sort(function(a, b){ return b - a; });
  return out;
}
/* Vzor z cizí zálohy ani z poškozeného úložiště nesmí projít dál nezkontrolovaný.
   Vrací očištěnou kopii, nebo null.

   Vzor má dvě části: `v` jsou kostky s konkrétní hodnotou, `t` velikosti
   skupin „libovolná, ale stejná hodnota“ (písmena A–F v editoru). Dřív
   platil na celý vzor jeden příznak `any`; vzor uložený s ním se přečte
   tak, že se z jeho hodnot stanou samá písmena — tvar i počet kostek
   vyjdou stejně, takže se nemění ani kód štítku. */
function cistyTvar(x){
  if(!x || typeof x !== "object") return null;
  var hodnoty = Array.isArray(x.v) ? x.v : [], pocty = [0,0,0,0,0,0,0], i, h, n = 0;
  var skupiny = Array.isArray(x.t) ? x.t : [], tvar = [], s;
  for(i = 0; i < hodnoty.length && n < 6; i++){
    h = Math.floor(naCislo(hodnoty[i], 0));
    if(h < 1 || h > 6) continue;
    pocty[h]++; n++;
  }
  if(x.any){
    /* starý zápis: rozhodoval jen tvar, tedy samá písmena */
    tvar = tvarZPoctu(pocty);
    pocty = [0,0,0,0,0,0,0];
  } else {
    for(i = 0; i < skupiny.length && n < 6; i++){
      s = Math.floor(naCislo(skupiny[i], 0));
      if(s < 1 || s > 6 - n) continue;
      tvar.push(s); n += s;
    }
    tvar.sort(function(a, b){ return b - a; });
  }
  if(n < 2) return null;
  return { v: rozbalPocty(pocty), t: tvar, pocty: pocty, tvar: tvar };
}
/* Vlastní kombinace: jméno, body a jeden až šest vzorů, ze kterých stačí
   sednout kterýkoli — „dvojice a dvě dvojky **nebo** dvojice a tři trojky“
   je jedna kombinace za jedny body.

   Starší zápis nesl vzor rovnou v kombinaci a jméno neměl vůbec; přečte se
   jako kombinace o jednom vzoru s výchozím jménem, protože generátor
   slovních názvů zmizel. */
function cistaKombinace(x, poradi){
  if(!x || typeof x !== "object") return null;
  var body = Math.floor(naCislo(x.b, 0)), vzory = [], i, vz;
  if(!(body > 0) || body > BODY_MAX) return null;
  if(Array.isArray(x.vz)){
    for(i = 0; i < x.vz.length && vzory.length < VZORU_MAX; i++){
      vz = cistyTvar(x.vz[i]);
      if(vz) vzory.push(vz);
    }
  } else {
    vz = cistyTvar(x);
    if(vz) vzory.push(vz);
  }
  if(!vzory.length) return null;
  /* Chybějící `z` znamená zapnuto: kombinace uložené dřív, než přepínač
     existoval, se po aktualizaci nesmějí samy vypnout. */
  return { id: (typeof x.id === "string" && x.id) ? x.id.slice(0, 40) : newId(),
           n: (typeof x.n === "string" && x.n) ? x.n.slice(0, NAZEV_MAX)
                                               : t("komb.vychozin", { n: poradi || 1 }),
           b: body, z: (x.z === undefined) ? true : !!x.z, vz: vzory };
}
/* Kostky vzoru dohromady: konkrétní i ty ve skupinách. */
function pocetKostekVzoru(vz){
  var n = vz.v.length, i;
  for(i = 0; i < vz.tvar.length; i++) n += vz.tvar[i];
  return n;
}
function rozbalPocty(pocty){
  var out = [], v, i;
  for(v = 1; v <= 6; v++){ for(i = 0; i < pocty[v]; i++) out.push(v); }
  return out;
}
/* Zápis vzoru: skupiny jako písmena, konkrétní hodnoty jako čísla —
   A,A+2,2 je „dvě libovolné stejné a dvě dvojky“. Skupiny stojí první
   a jdou od největší, hodnoty za nimi vzestupně; uvnitř skupiny odděluje
   kostky čárka, skupiny mezi sebou "+".

   Je to jazykově neutrální, takže se nepřekládá a v nastavení, v pravidlech
   i v editoru vypadá stejně. Slovní generátor jmen („dvě dvojice a 6“)
   zmizel s tím, že kombinace mají vlastní jméno. */
function zapisVzoru(vz){
  var out = [], v, i, j, kus;
  for(i = 0; i < vz.tvar.length; i++){
    kus = [];
    for(j = 0; j < vz.tvar[i]; j++) kus.push(PISMENA[i] || "?");
    out.push(kus.join(","));
  }
  for(v = 1; v <= 6; v++){
    if(!vz.pocty[v]) continue;
    kus = [];
    for(i = 0; i < vz.pocty[v]; i++) kus.push(v);
    out.push(kus.join(","));
  }
  return out.join("+");
}
/* Zápis celé kombinace: vzory oddělené lomítkem, tedy „nebo“. */
function zapisKombinace(k){
  return k.vz.map(zapisVzoru).join(" / ");
}
/* Odlišné počty kostek zapnutých vzorů, vzestupně a jen ty, které se do
   režimu vejdou. Podle nich se řídí čip v klávesnici i podřádek v nastavení:
   kombinace o vzorech na čtyři a na pět kostek se dá odložit dvěma způsoby
   a klávesnice se musí zeptat, kterým. */
function poctyKostekKombinace(k, max){
  var out = [], i, n;
  for(i = 0; i < k.vz.length; i++){
    n = pocetKostekVzoru(k.vz[i]);
    if(n <= max && out.indexOf(n) < 0) out.push(n);
  }
  out.sort(function(a, b){ return a - b; });
  return out;
}
/* Sedne kombinace do hodu? Stačí kterýkoli z jejích vzorů. */
function sediKombinace(k, c){
  for(var i = 0; i < k.vz.length; i++){ if(sediVzor(k.vz[i], c)) return true; }
  return false;
}
/* Vlastní kombinace má vlastní příznak `z`, kdežto preset se zapíná
   přítomností klíče v `p`. Je to jediné místo, kde se oba modely liší,
   a nejde to jinak: u kombinace musí být vypnutí a smazání dvě různé věci. */
function kombinaceZap(rez){
  return rez.v.filter(function(k){
    return k.z && poctyKostekKombinace(k, rez.kostek).length > 0;
  });
}
function pocetKombinaci(rez){
  var n = kombinaceZap(rez).length, i;
  for(i = 0; i < PRESET_PORADI.length; i++){
    if(kombZap(rez, PRESET_PORADI[i]) && kombVRezimu(rez, PRESET_PORADI[i])) n++;
  }
  return n;
}

/* Sedí vzor do hodu? Nejdřív konkrétní hodnoty — test podmnožiny
   multimnožiny. Pak skupiny: každá bere jinou hodnotu, a jinou i než ty,
   které vzor žádá číslem, takže se jedna kostka nezapočítá dvakrát.
   Zbylé počty se porovnají hladově po největších, což je pro tenhle tvar
   úlohy správně. Obojí zvlášť jsou krajní případy téhož výpočtu. */
function sediVzor(vz, c){
  var v, i, zbytek = [];
  for(v = 1; v <= 6; v++){ if(vz.pocty[v] && c[v] < vz.pocty[v]) return false; }
  if(!vz.tvar.length) return true;
  for(v = 1; v <= 6; v++){ if(!vz.pocty[v] && c[v]) zbytek.push(c[v]); }
  if(zbytek.length < vz.tvar.length) return false;
  zbytek.sort(function(a, b){ return b - a; });
  for(i = 0; i < vz.tvar.length; i++){ if(zbytek[i] < vz.tvar[i]) return false; }
  return true;
}

export { BODY_MAX, KOMBKEY, PISMENA, PRESETY, PRESET_PORADI, VLASTNI_MAX, VZORU_MAX, cistaKombinace, cistyTvar, dvojiceRuznych, kombVRezimu, kombZap, kombinaceZap, pocetKombinaci, pocetKostekVzoru, poctuAspon, poctyKostekKombinace, rozbalPocty, sazba, sediKombinace, sediVzor, tvarZPoctu, zapisKombinace, zapisVzoru };
