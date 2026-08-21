/* Kódy na slova — jediné místo, kde se z uloženého kola stává text.

   Závisí na: jazyky/jadro, stav/kody
   Nezávisí na: DOM, úložišti

   Opak stav/kody.js: tam je formát, ve kterém se kolo ukládá, tady jeho
   překlad do řeči. Díky tomu přepnutí jazyka přeloží i dohrané hry ležící
   v historii — text vzniká až při vykreslení, ne při zápisu.

   Neznámý kód se ukáže tak, jak je: cizí záloha ani poškozená data se
   nemají tvářit jako prázdné místo. */
import { t, tn } from "../jazyky/jadro.js";
import {
  HODY_ODD,
  HODY_TXT,
  KKOD,
  KODY,
  NKOD,
  POLOZKY_ODD,
  POLOZKY_TXT,
  kodyZPopisu
} from "../stav/kody.js";
import { fmt } from "./format.js";



/* Neznámý kód se ukáže tak, jak je: cizí záloha ani poškozená data se
   nemají tvářit jako prázdné místo. Do stránky jde přes esc() jako
   všechno ostatní. */
function textKodu(k){
  var m = NKOD.exec(k);
  if(m) return t("stitek.n", { p: m[1], h: m[2] });
  m = KKOD.exec(k);
  /* Body jsou v it.p, ne v kódu — pozdější změna sazby v nastavení tedy
     historii nepřepíše. V kódu jsou proto, aby se štítek přečetl i tam,
     kde se položka rozpadla na samotný popis. */
  if(m) return t("stitek.k", { b: fmt(Number(m[1])), d: tn("pocitadlo.kostzkr", Number(m[2])) });
  return KODY.indexOf(k) >= 0 ? t("stitek." + k) : String(k);
}
function stitek(it){
  if(it && typeof it.k === "string") return textKodu(it.k);
  /* rozehraná hra uložená starší verzí, jejíž text se rozebrat nepodařilo */
  return (it && typeof it.l === "string") ? it.l : t("stitek.v");
}
function kodyNaText(c){
  if(!c) return "";
  return String(c).split(HODY_ODD).map(function(hod){
    return hod.split(POLOZKY_ODD).map(textKodu).join(POLOZKY_TXT);
  }).join(HODY_TXT);
}
/* Jediné místo, kde se popis kola skládá pro zobrazení. Kód vyhrává; není-li,
   zkusí se rozebrat starý text a teprve pak se ukáže tak, jak je. */
function popisKola(tah){
  if(tah && typeof tah.c === "string") return kodyNaText(tah.c);
  var d = (tah && typeof tah.d === "string") ? tah.d : "";
  var c = kodyZPopisu(d);
  return c === null ? d : kodyNaText(c);
}


export { kodyNaText, popisKola, stitek, textKodu };
