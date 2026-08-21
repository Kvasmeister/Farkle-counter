/* Postupky — tvar, ne sazba.

   Závisí na: ničem
   Nezávisí na: DOM, úložišti, jazyku, ostatních pravidlech

   Body za postupku leží v režimu, protože každá verze hry je má jinak
   a v klasické pětikostkové Farkle postupky vůbec nebodují. Tady je jen
   to, které kostky postupku tvoří. Kódy s15/s26/s16 se nesmí měnit,
   leží v historii. */
/* Postupka nese jen tvar a kód štítku; body leží v režimu, protože každá
   verze hry je má jinak a v klasické Farkle pětikostkové postupky vůbec
   nebodují. Kódy s15/s26/s16 se nemění, aby historie četla dál. */
var STRAIGHTS = { "15":{d:5,k:"s15",v:[1,2,3,4,5]},
                  "26":{d:5,k:"s26",v:[2,3,4,5,6]},
                  "16":{d:6,k:"s16",v:[1,2,3,4,5,6]} };
var POST_PORADI = ["15", "26", "16"];
function maPostupku(c, s){
  for(var i = 0; i < s.v.length; i++){ if(!c[s.v[i]]) return false; }
  return true;
}

export { POST_PORADI, STRAIGHTS, maPostupku };
