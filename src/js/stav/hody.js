/* Rozbor kola na jednotlivé hody: body a počet fyzicky hozených kostek
   za každým hodem.

   Závisí na: stav/kody, pravidla/kombinace, pravidla/postupky, pravidla/skore
   Nezávisí na: DOM, úložišti, jazyku

   Protipól ke stav/kody.js: tam je formát uložení, tady jeho číselný rozbor
   pro statistiky na úrovni hodu (Nejlepší hod, Průměrný hod). `rez` se
   předává parametrem, ne aktRezim() — kolo se rozebírá podle pravidel
   PLATNÝCH PRO TU HRU (rec.rezim), ne podle právě aktivního režimu.

   Body u kódů, které bodovací tabulku nenesou přímo (SAM_KODY, `n`-skupiny,
   postupky, kombinace navíc), se dopočítávají podle DNEŠNÍ tabulky daného
   režimu — žádná historická sazba se neukládá. Pozdější úprava sazeb tedy
   zpětně mírně posune číslo u starších her; celkové skóre hry ani kola tím
   dotčeno není (to zůstává prostým uloženým číslem), jde jen o rozpis podle
   jednotlivých hodů. Vědomý kompromis, ne přehlédnutí.

   Vrací null, když se kolo rozebrat nedá: položka "v" (ručně zadaná vlastní
   hodnota) nenese ani body, ani počet kostek, a starší textový popis, který
   kodyZPopisu() nepřeloží celý, taky ne. Volající pak takové kolo z hodových
   statistik vynechá, ostatní statistiky se ho netýkají. */
import { HODY_ODD, KKOD, NKOD, POLOZKY_ODD, SAM_KODY, kodyZPopisu } from "./kody.js";
import { PRESETY, PRESET_PORADI, sazba } from "../pravidla/kombinace.js";
import { POST_PORADI, STRAIGHTS } from "../pravidla/postupky.js";
import { kindPoints } from "../pravidla/skore.js";

var KOD_NA_POSTUPKU = {};
POST_PORADI.forEach(function(k){ KOD_NA_POSTUPKU[STRAIGHTS[k].k] = k; });
var KOD_NA_PRESET = {};
PRESET_PORADI.forEach(function(k){ KOD_NA_PRESET[PRESETY[k].k] = k; });

/* Jedna položka hodu → { p, d } (body, počet kostek), nebo null, když se
   nedá rozebrat ("v", nebo cizí/neznámý kód). */
function rozlozPolozku(kod, rez){
  var m = NKOD.exec(kod);
  if(m) return { p: kindPoints(Number(m[2]), Number(m[1]), rez), d: Number(m[1]) };
  m = KKOD.exec(kod);
  if(m) return { p: Number(m[1]), d: Number(m[2]) };
  var v = SAM_KODY.indexOf(kod);
  if(v > 0) return { p: kindPoints(v, 1, rez), d: 1 };
  var pk = KOD_NA_POSTUPKU[kod];
  if(pk) return { p: rez.post[pk] || 0, d: STRAIGHTS[pk].d };
  var kk = KOD_NA_PRESET[kod];
  if(kk) return { p: sazba(rez, kk), d: PRESETY[kk].d };
  return null;
}

/* Celé kolo → [{ thrown, p }, ...] (jeden prvek na hod), nebo null, když
   `rez` chybí (smazaný vlastní režim) nebo se nepodaří rozebrat kterákoli
   položka.

   thrown se dopočítává přesně podle živé logiky v akce.js (rollOn()/left()):
   první hod hází celým počtem kostek režimu; každý další buď zbytkem po
   předchozím hodu, nebo (při horkých kostkách — hod použil úplně všechny
   zbývající kostky) zase celým počtem, a to i při druhém a dalším výskytu
   horkých kostek v témže kole.

   Farkle hod na konci kola v uloženém popisu nenese žádnou položku — prázdný
   hod se do c/d z definice nedostane (stejně jako u hodyVKole() v zaznam.js).
   Jeho existence a počet kostek se proto dopočítají stejnou heuristikou:
   k počtu úseků z popisu se u farklu přičte jeden hod navíc, s thrown podle
   zbytku (nebo celým počtem při horkých kostkách). */
function rozlozKolo(tah, rez){
  if(!rez) return null;
  var c;
  if(typeof tah.c === "string"){ c = tah.c; }
  else {
    c = kodyZPopisu(typeof tah.d === "string" ? tah.d : "");
    if(c === null) return null;
  }
  var out = [], thrown = rez.kostek;
  if(c){
    var hody = c.split(HODY_ODD), i, j, polozky, kept, body, sel;
    for(i = 0; i < hody.length; i++){
      polozky = hody[i].split(POLOZKY_ODD);
      kept = 0; body = 0;
      for(j = 0; j < polozky.length; j++){
        sel = rozlozPolozku(polozky[j], rez);
        if(sel === null) return null;
        kept += sel.d; body += sel.p;
      }
      out.push({ thrown: thrown, p: body });
      thrown = (kept === thrown) ? rez.kostek : thrown - kept;
    }
  }
  if(tah.bust) out.push({ thrown: thrown, p: 0 });
  return out;
}

export { rozlozKolo, rozlozPolozku };
