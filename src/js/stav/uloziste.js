/* localStorage: klíče, čtení a zápis seznamů, oba koše.

   Závisí na: ničem
   Nezávisí na: DOM, historii, stavu hry

   Koše zůstávají v localStorage schválně. Na rozdíl od historie jsou shora
   omezené (5 a 10 záznamů, dohromady pod 30 kB), nerostou a čtou se
   synchronně z nastavení — přesun do IndexedDB by přidal migraci
   a transakce bez užitku. */

var KEY  = "farkle-solo-v3";   /* rozehraná hra */
var HKEY = "farkle-hist-v1";   /* dohrané hry */
var KKEY = "farkle-kos-v1";    /* neviditelná záloha přepsaných her */
var KHKEY = "farkle-koshist-v1"; /* hry smazané z historie */
var KOS_MAX = 5;
var KOSH_MAX = 10;
/* ---------- koš a koš historie ----------
   Obojí zůstává v localStorage. Na rozdíl od historie je shora omezené
   (5 a 10 záznamů, dohromady pod 30 kB), neroste a čte se synchronně
   z nastavení — přesun do IndexedDB by přidal migraci a transakce
   bez užitku. */
function readList(key){
  try{
    var d = JSON.parse(localStorage.getItem(key));
    return Array.isArray(d) ? d : [];
  }catch(e){ return []; }
}
function writeList(key, list){
  try{ localStorage.setItem(key, JSON.stringify(list)); return true; }
  catch(e){ return false; }
}
/* Prázdný koš se z úložiště rovnou maže. Jinak by tam zůstalo dvouznakové
   "[]" a v rozpisu zabraného místa by to vypadalo, že v koši něco leží.
   Historie touhle cestou nechodí — na jejím klíči stojí migrace do
   IndexedDB a zmizet nesmí. */
function kosZapis(key, list){
  if(list && list.length) return writeList(key, list);
  try{ localStorage.removeItem(key); return true; }catch(e){ return false; }
}
function kosAll(){ return readList(KKEY); }
function kosWrite(list){ return kosZapis(KKEY, list); }
function kosHistAll(){ return readList(KHKEY); }
function kosHistWrite(list){ return kosZapis(KHKEY, list); }

export { HKEY, KEY, KHKEY, KKEY, KOSH_MAX, KOS_MAX, kosAll, kosHistAll, kosHistWrite, kosWrite, kosZapis, readList, writeList };
