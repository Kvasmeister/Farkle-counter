/* Riziko farklu — jak pravděpodobně hod nic nehodí.

   Závisí na: pravidla/skore, pravidla/postupky, pravidla/kombinace,
              pravidla/rezimy
   Nezávisí na: DOM, úložišti, jazyku

   Past: konstantní tabulky RIZIKO* platí jen pro základ KCD
   (zakladJakoKcd2). Přepsaná tabulka nebo vlastní kombinace pošlou na
   vyčerpávající výčet — líně přes setTimeout, s cache klíčovanou
   podpisem pravidel; než doběhne, platí konstanta jako horní odhad.

   Past: dopočet NESMÍ volat render(). Doména neví, co se má překreslit —
   ohlásí přes naRizikoHotovo() a UI si zaregistruje, co chce. */
import { PRESETY, PRESET_PORADI, kombVRezimu, kombZap, kombinaceZap, sediKombinace } from "./kombinace.js";
import { POST_PORADI, STRAIGHTS, maPostupku } from "./postupky.js";
import { POCTY_STEJ, aktRezim, poctyStej } from "./rezimy.js";
import { kindPoints } from "./skore.js";

/* ---------- riziko farklu ----------
   Změřeno vyčerpávajícím výčtem 6^n, ne opsáno odjinud. Tři z pěti
   přednastavených kombinací riziko nemění vůbec — trojice+dvojice, dvě
   trojice i čtveřice+dvojice obsahují trojici, která už dnes boduje, takže
   hod, který je splňuje, nikdy nebyl farkle. Mění ho tři dvojice (a to jen
   na šesti kostkách) a dvě dvojice, které trojici uvnitř nemají a srazí
   riziko už od čtyř kostek. Bez vlastních kombinací má tabulka proto tři
   podoby a při startu se nepočítá nic.

   Konstanty platí pro **výchozí základ KCD2** — jednička, pětka i všech
   šest trojic bodují a nic jiného z počtů. Ten základ mají všechny tři
   přednastavené režimy, takže se pro ně nic nepočítá; teprve upravený režim
   nebo vlastní kombinace pošle na výčet. Počet kostek režimu na tabulku
   nemá vliv: riziko se ptá, kolika kostkami se hází teď, ne kolik jich má
   hra celkem.

   Že se konstanty po jakékoli změně pravidel tiše nerozejdou se
   skutečností, hlídá strážní test sady 19 — ten si všechny tři sady pokaždé
   odvodí výčtem znovu. */
var RIZIKO    = [66.7, 44.4, 27.8, 15.7, 7.7, 3.1];
var RIZIKO_3P = [66.7, 44.4, 27.8, 15.7, 7.7, 2.3];
/* Dvě dvojice jsou jediná přednastavená kombinace bez trojice uvnitř, takže
   jako jediná mění riziko od čtyř kostek výš — na šesti kostkách ho srazí
   na nulu: hod bez jedničky, bez pětky, bez trojice a bez dvou dvojic
   ze šesti kostek neexistuje. Tři dvojice dvě dvojice obsahují, takže
   zapnuté obojí dá tutéž tabulku. */
var RIZIKO_2P = [66.7, 44.4, 27.8, 13, 3.1, 0];
/* Cache i běžící výpočty klíčované podpisem pravidel: přepnutí režimu tam
   a zpátky tak nespustí výčet podruhé. */
var rizikoCache = {}, rizikoBezi = {};

/* Kdo chce vědět, že líný výčet doběhl. Registruje se z aplikační vrstvy;
   pravidla tím nemusí znát ani render(), ani nastavení. */
var poHotovo = [];
function naRizikoHotovo(fn){ poHotovo.push(fn); }

function poctyZHodu(hod){
  var c = [0,0,0,0,0,0,0], i;
  for(i = 0; i < hod.length; i++) c[hod[i]]++;
  return c;
}
/* Boduje hod podle pravidel režimu? Postupky se sem dopsat musely: dřív je
   pokrývala jednička a pětka, ale režim je může mít obě na nule. */
function bodujeZaklad(c, rez){
  var v, n, i, k;
  for(v = 1; v <= 6; v++){
    if(!c[v]) continue;
    if(rez.sam[v] > 0) return true;
    /* Ptát se rovnou kindPoints() je jediná cesta, jak pokrýt i extrapolaci
       nad prahem — pevné body platí i tam, kde sama skupina neboduje. */
    for(n = 2; n <= c[v]; n++){ if(kindPoints(v, n, rez) > 0) return true; }
  }
  for(i = 0; i < POST_PORADI.length; i++){
    k = POST_PORADI[i];
    if(rez.post[k] > 0 && maPostupku(c, STRAIGHTS[k])) return true;
  }
  return false;
}
function bodujeSKombinacemi(c, rez, komb){
  var i, k;
  if(bodujeZaklad(c, rez)) return true;
  for(i = 0; i < PRESET_PORADI.length; i++){
    k = PRESET_PORADI[i];
    if(kombZap(rez, k) && kombVRezimu(rez, k) && PRESETY[k].je(c)) return true;
  }
  for(i = 0; i < komb.length; i++){ if(sediKombinace(komb[i], c)) return true; }
  return false;
}
/* 6^1 + … + 6^6 = 55 986 hodů, v JS jednotky až nízké desítky ms; na pěti
   kostkách 9 330. Pouští se líně a jen tehdy, když se pravidla liší od
   základu KCD2. Seznam vzorů se předává dovnitř, aby se filtr nedělal
   desetitisíckrát znovu. */
function spocitejRiziko(rez){
  var out = [], komb = kombinaceZap(rez), n, celkem, farkle, i, j, x, hod;
  for(n = 1; n <= rez.kostek; n++){
    celkem = Math.pow(6, n); farkle = 0; hod = new Array(n);
    for(i = 0; i < celkem; i++){
      x = i;
      for(j = 0; j < n; j++){ hod[j] = (x % 6) + 1; x = Math.floor(x / 6); }
      if(!bodujeSKombinacemi(poctyZHodu(hod), rez, komb)) farkle++;
    }
    out.push(Math.round(farkle / celkem * 1000) / 10);
  }
  return out;
}
/* Riziko nezajímají sazby, jen co vůbec boduje — podpis proto nese
   přítomnost, ne čísla. Bez toho by přepsání jedné sazby zahodilo cache. */
function podpisRezimu(rez){
  var v, i, n, s = rez.kostek + "|";
  for(v = 1; v <= 6; v++) s += rez.sam[v] > 0 ? "1" : "0";
  s += "-";
  for(i = 0; i < POCTY_STEJ.length; i++){
    n = POCTY_STEJ[i];
    if(!rez.stej[n]){ s += "-"; continue; }
    for(v = 1; v <= 6; v++) s += rez.stej[n][v] > 0 ? "1" : "0";
    s += ".";
  }
  /* Pravidlo nad prahem patří do podpisu: u pevných bodů rozhoduje o tom,
     jestli vyšší počty vůbec bodují. */
  s += "|" + rez.nad + (rez.nad === "pevne"
    ? rez.nadP.map(function(x){ return x > 0 ? "1" : "0"; }).join("") : "");
  s += "|" + POST_PORADI.map(function(k){ return rez.post[k] > 0 ? "1" : "0"; }).join("");
  s += "|" + PRESET_PORADI.map(function(k){
    return (kombZap(rez, k) && kombVRezimu(rez, k)) ? "1" : "0"; }).join("");
  s += "|" + kombinaceZap(rez).map(function(k){
    return k.vz.map(function(vz){
      return "h" + vz.v.join("") + "t" + vz.tvar.join(""); }).join(","); }).join(";");
  return s;
}
/* Základ KCD: samostatně boduje **právě** jednička a pětka, bodují právě
   trojice (a nic jiného z počtů) a není zapnutá žádná vlastní kombinace.
   Pak platí konstanty — postupky ani tři z pěti přednastavených kombinací
   riziko nemění, protože každá z nich nese jedničku, pětku nebo trojici. */
function zakladJakoKcd2(rez){
  var v, p = poctyStej(rez);
  if(p.length !== 1 || p[0] !== 3) return false;
  for(v = 1; v <= 6; v++){
    if((rez.sam[v] > 0) !== (v === 1 || v === 5)) return false;
    if(!(rez.stej[3][v] > 0)) return false;
  }
  return kombinaceZap(rez).length === 0;
}
function tabulkaRizika(rez){
  rez = rez || aktRezim();
  var dve = kombZap(rez, "2p") && kombVRezimu(rez, "2p");
  var tri = kombZap(rez, "3p") && kombVRezimu(rez, "3p");
  var hotova = dve ? RIZIKO_2P : (tri ? RIZIKO_3P : RIZIKO);
  if(zakladJakoKcd2(rez)) return hotova;
  var podpis = podpisRezimu(rez);
  if(rizikoCache[podpis]) return rizikoCache[podpis];
  /* Než výčet doběhne, platí konstanty jako horní odhad — kombinace navíc
     riziko jen snižují. */
  if(!rizikoBezi[podpis]){
    rizikoBezi[podpis] = true;
    setTimeout(function(){
      rizikoBezi[podpis] = false;
      rizikoCache[podpis] = spocitejRiziko(rez);
      /* Doména neví, co se má překreslit, a vědět nemá — ohlásí jen, že je
         dopočítáno. Kdo poslouchá, ať si poradí. Dřív se tady volalo přímo
         render() a renderRezPruh(), čímž pravidla sahala nahoru do UI. */
      for(var q = 0; q < poHotovo.length; q++) poHotovo[q](rez);
    }, 0);
  }
  return hotova;
}
/* Platí to, co tabulkaRizika() vrací, nebo je to zatím jen horní odhad?
   Pás v nastavení to musí umět rozeznat — u přepsané tabulky je konstanta
   lež, ne odhad blízko pravdy. */
function rizikoHotovo(rez){
  return zakladJakoKcd2(rez) || !!rizikoCache[podpisRezimu(rez)];
}

export { RIZIKO, RIZIKO_2P, RIZIKO_3P, bodujeSKombinacemi, bodujeZaklad, naRizikoHotovo, poHotovo, poctyZHodu, podpisRezimu, rizikoBezi, rizikoCache, rizikoHotovo, spocitejRiziko, tabulkaRizika, zakladJakoKcd2 };
