/* Kódy položek a kol — formát, ve kterém se kolo UKLÁDÁ.

   Závisí na: ničem
   Nezávisí na: DOM, jazyku, úložišti

   Leží pod stavem, ne v text/: `stav` i `zaznam` rozebírají uložený popis
   kola (kodZTextu, HODY_ODD), takže jde o datový formát, ne o zobrazení.
   Převod kódu na slova je věc vykreslení a bydlí v text/stitky.js.

   Kódy se NESMÍ měnit — leží v historii a v zálohách. Jednička a pětka
   nesou `j` a `p` odjakživa, zbylé čtyři hodnoty dostaly `d2`–`d6`; ta
   asymetrie je záměrná, přepsat je by znamenalo sáhnout na uložená data. */

/* ---------- štítky odložených položek ----------
   Položka nese kód, ne text. Kolo se ukládá do historie i do zálohy a text
   zapsaný při jeho vzniku by v něm zafixoval jazyk natrvalo — po přepnutí
   by se přeložilo rozhraní, ale dohrané hry ne. Na slova se kód převádí až
   při vykreslení.

   Kolo drží kódy v poli c: hody odděluje "|", položky ",". Je to kratší než
   dřívější český popis a triviálně rozebratelné. */
/* Samostatná jednička a pětka nesou j a p odjakživa a leží tak v historii;
   zbylé čtyři hodnoty, které umí bodovat samostatně od zavedení volné
   bodovací tabulky, dostaly kódy d2–d6. Ta asymetrie je záměrná: přepsat
   j a p na d1 a d5 by znamenalo sáhnout na uložená data. */
var KODY = ["j", "p", "v", "d2", "d3", "d4", "d6",
            "s15", "s26", "s16", "c3p", "c32", "c33", "c42"];
var SAM_KODY = ["", "j", "d2", "d3", "d4", "p", "d6"];
/* Dvojice se vejde do dnešní gramatiky „počet × hodnota“ — proto [2-6],
   ne [3-6] jako dřív. */
var NKOD = /^n([2-6])([1-6])$/;
/* Jediné místo, kde vzniká kód pro „N kostek téže hodnoty“. Používá ho řada
   čipů i tlačítko +, takže odložení trojky dá týž kód oběma cestami. */
function kodStejnych(count, value){
  return count === 1 ? SAM_KODY[value] : ("n" + count + value);
}
/* Vlastní kombinace nese body a počet kostek přímo v kódu, ne odkaz na vzor
   v nastavení. Kdyby odkazoval, smazání vzoru — nebo import zálohy na cizí
   telefon — by nechalo v historii viset kód, ke kterému neexistuje text.
   k1500x5 se přečte vždycky a všude. */
var KKOD = /^k(\d{1,6})x([1-6])$/;
var HODY_ODD = "|", POLOZKY_ODD = ",";
var HODY_TXT = " \u00B7 ", POLOZKY_TXT = " + ";

/* Záznamy zapsané před zavedením kódů nesou text v poli d. Ten je vždycky
   český — jiný jazyk aplikace tehdy neuměla — a tabulka je proto zmrazená.
   Svázat ji s katalogem by znamenalo, že přeformulování českého štítku
   udělá ze starých dat nečitelná. Že se obě strany nerozešly, hlídá
   sada 17. */
var STARE = { "jednička": "j", "pětka": "p", "vlastní": "v",
              "postupka 1\u20135": "s15", "postupka 2\u20136": "s26",
              "postupka 1\u20136": "s16" };
var STARE_N = /^([3-6])\u00D7 ([1-6])$/;
function kodZTextu(s){
  if(Object.prototype.hasOwnProperty.call(STARE, s)) return STARE[s];
  var m = STARE_N.exec(s);
  return m ? ("n" + m[1] + m[2]) : null;
}
/* Rozbor běží líně při čtení a nic nepřepisuje — stejný vzorec jako dopočet
   chybějících polí souhrnu, a stejně jako on nepotřebuje bump verze IndexedDB.
   Gramatika je uzavřená, takže selhání znamená cizí nebo poškozená data;
   pak se vrací null a volající text ukáže syrový. */
function kodyZPopisu(d){
  if(!d) return "";
  var hody = String(d).split(HODY_TXT), out = [], i, j, kusy, radek, k;
  for(i = 0; i < hody.length; i++){
    kusy = hody[i].split(POLOZKY_TXT); radek = [];
    for(j = 0; j < kusy.length; j++){
      k = kodZTextu(kusy[j]);
      if(k === null) return null;
      radek.push(k);
    }
    out.push(radek.join(POLOZKY_ODD));
  }
  return out.join(HODY_ODD);
}

export { HODY_ODD, HODY_TXT, KKOD, KODY, NKOD, POLOZKY_ODD, POLOZKY_TXT, SAM_KODY, STARE, STARE_N, kodStejnych, kodZTextu, kodyZPopisu };
