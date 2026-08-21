/* Čísla, data a jednořádkové popisy hry — z dat na text.

   Závisí na: jazyky/jadro, stav/zaznam
   Nezávisí na: DOM

   Vlastní formát místo toLocale*: na různých zařízeních by se lišil a font
   má omezenou sadu znaků. Oddělovač tisíců i formát data drží katalog.

   esc() je povinná cesta pro všechno, co jde do innerHTML: popis kola
   i štítek položky můžou pocházet z cizí zálohy nebo z poškozeného
   úložiště. Kód, kterému se nerozumí, se ZÁMĚRNĚ ukáže tak, jak je. */
import { kat, t, tn } from "../jazyky/jadro.js";
import { gKol, nazevRezimuZaznamu } from "../stav/zaznam.js";

/* Vlastní formát místo toLocale*: na různých zařízeních by se lišil
   a font má omezenou sadu znaků. */
function dt(ms){ return kat("datumCas")(new Date(ms)); }
/* pro údaje, které nepatří jedné hře, ale celému dni */
function dtDen(ms){ return kat("datum")(new Date(ms)); }
/* Jediné místo, kde se skládá text typu hry (do bodů / na kola). Používá ho
   popis hry v Zápisu kol, řádek historie, podřádek statistiky i řádek
   žebříčku — dřív se stejný výraz psal dvakrát zvlášť.

   Pozor na slovo: **typ hry** je do bodů / na kola, **herní režim** je sada
   pravidel (část 14 CLAUDE.md). Dokud se to jmenovalo obojí „režim“, byla
   to stejná past jako kdysi „tah“. Pole v datech se dál jmenuje `mode`,
   protože leží v historii i v zálohách. */
function popisTypuHry(rec){
  return rec.mode === "rounds"
    ? (rec.roundGoal ? t("typhry.nakolalimit", { n: rec.roundGoal }) : t("typhry.nakola"))
    : t("typhry.dobodu", { b: fmt(rec.goal || 0) });
}
function popisHry(rec){
  var kol = gKol(rec);
  return dt(rec.savedAt) + " \u00B7 " + nazevRezimuZaznamu(rec) +
         " \u00B7 " + popisTypuHry(rec) + " \u00B7 " + tn("slovo.kolo", kol);
}
function fmt(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, kat("sep")); }
/* Popisy kol a názvy položek můžou pocházet z cizí zálohy nebo z poškozeného
   uložení; všude, kde jdou do innerHTML, musí projít tudy. */
function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){
    return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;";
  });
}
function cislo(v){ return String(v); }
function fmtR(v){ return fmt(Math.round(v)); }
function desetina(v){ return (Math.round(v * 10) / 10).toString().replace(".", kat("des")); }

export { cislo, desetina, dt, dtDen, esc, fmt, fmtR, popisHry, popisTypuHry };
