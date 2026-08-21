/* Drobné čisté pomůcky bez jediné závislosti.

   Závisí na: ničem. Spodek vrstvení — importovat smí kdokoli.
   Nezávisí na: DOM, úložišti, jazyku, pravidlech */
/* pozor: níže v souboru je jiná cislo() pro formátování statistik */
function naCislo(x, nahrada){ return (typeof x === "number" && isFinite(x)) ? x : nahrada; }
function newId(){
  return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
var NAZEV_MAX = 40;          /* strop délky názvu vlastního režimu */

export { NAZEV_MAX, naCislo, newId };
