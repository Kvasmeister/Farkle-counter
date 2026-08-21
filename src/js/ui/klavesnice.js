/* Klávesnice počítadla: čipy hodnot, počtů, postupek a kombinací.

   Závisí na: pravidla, stav, text, ui/prvky
   Sahá na: DOM

   Řada #strrow se nikdy neskrývá celá — sedí v ní čip „vlastní“, jediná
   cesta k ručnímu zadání. Nadpis nad řadou proto mluví o tom, co v ní
   právě je: Postupky, Postupky a kombinace, nebo Kombinace.

   Vlastní kombinace stojí ve své vlastní řadě #vlastnirow hned pod
   #strrow a jsou vidět pořád, stejně jako přednastavené kombinace v
   #strrow — na čipu „vlastní“ nezávisí, ten otevírá jen panel ručního
   zadání bodů.

   Samostatné hodnoty mají dvě cesty a rozhoduje jejich počet: do tří se
   vejdou do vlastní řady, při čtyřech a víc se řada schová a nastupuje
   čip 1× v mřížce Stejné hodnoty. */
import { keep, locked } from "../akce.js";
import { t, tn } from "../jazyky/jadro.js";
import {
  PRESETY,
  kombVRezimu,
  kombZap,
  kombinaceZap,
  poctyKostekKombinace,
  sazba
} from "../pravidla/kombinace.js";
import { STRAIGHTS } from "../pravidla/postupky.js";
import { SAMOSTATNE_V_RADE, aktRezim, pocetSamostatnych } from "../pravidla/rezimy.js";
import { kindPoints } from "../pravidla/skore.js";
import { SAM_KODY } from "../stav/kody.js";
import { left } from "../stav/stav.js";
import { esc, fmt } from "../text/format.js";
import { textKodu } from "../text/stitky.js";
import { nazevKombinace } from "./nastaveni-rezimy.js";
import {
  elAddKind,
  elCounts,
  elDataKombi,
  elDataSingle,
  elDataStr,
  elPips,
  elSingleCap,
  elSingleRow,
  elStrCap,
  elStrRow,
  elVlastniRow
} from "./prvky.js";
import { render } from "./vykresleni.js";

var selValue = null, selCount = 3, manualDice = 1;



function pocetBoduje(rez, count){
  for(var v = 1; v <= 6; v++){ if(kindPoints(v, count, rez) > 0) return true; }
  return false;
}
function renderKind(){
  var l = left(), lock = locked(), rez = aktRezim(), prvni = null;
  Array.prototype.forEach.call(elPips.children, function(b){
    b.classList.toggle("sel", Number(b.dataset.value) === selValue);
    b.disabled = lock;
  });
  /* Počet, kterým se v režimu nedá nic odložit, se skrývá, ne jen zašedne —
     trvale zamčené tlačítko by jen matlo. 1× nastupuje jen tehdy, když se
     samostatné hodnoty nevešly do vlastní řady čipů. */
  Array.prototype.forEach.call(elCounts.children, function(b){
    var c = Number(b.dataset.count);
    var videt = c <= rez.kostek && pocetBoduje(rez, c) &&
                (c !== 1 || pocetSamostatnych(rez) > SAMOSTATNE_V_RADE);
    b.hidden = !videt;
    if(videt && prvni === null) prvni = c;
    b.classList.toggle("sel", c === selCount);
    b.disabled = lock || c > l;
  });
  /* Vybraný počet zmizel z nabídky (jiný režim, vypnutá skupina) —
     přesune se na první, který zůstal. */
  if(prvni !== null && elCounts.querySelector('[data-count="' + selCount + '"]').hidden){
    selCount = prvni;
    Array.prototype.forEach.call(elCounts.children, function(b){
      b.classList.toggle("sel", Number(b.dataset.count) === selCount);
    });
  }
  var ok = selValue !== null && selCount <= l && !lock && kindPoints(selValue, selCount, rez) > 0;
  elAddKind.disabled = !ok;
  elAddKind.textContent = t("pocitadlo.plus", { b: ok ? fmt(kindPoints(selValue, selCount, rez)) : "0" });
}

/* ---------- čipy postupek a kombinací v klávesnici ----------
   Postupky i přednastavené kombinace stojí v HTML natvrdo a jen se skrývají,
   takže snapshot prvků i sběr češtiny při startu fungují beze změny. Co je
   z nich vidět, rozhoduje herní režim. Vlastní kombinace se kreslí dynamicky
   do vlastní řady #vlastnirow (renderVlastniCipy() níž) — jejich popisek je
   dlouhý a je jich až osm, takže do rozpočtu šířky #strrow nepatří, ale
   vidět jsou stejně rovnou, bez čipu „vlastní“. */
function renderKombi(){
  var l = left(), lock = locked(), rez = aktRezim(), videt = 0, post = 0, komb = 0;
  elDataStr.forEach(function(b){
    var k = b.dataset.str, zap = rez.post[k] > 0 && STRAIGHTS[k].d <= rez.kostek;
    if(zap){ b.removeAttribute("hidden"); post++; } else b.setAttribute("hidden", "");
    b.disabled = lock || STRAIGHTS[k].d > l;
    b.querySelector(".v").textContent = fmt(rez.post[k] || 0);
  });
  elDataKombi.forEach(function(b){
    var k = b.dataset.kombi, zap = kombZap(rez, k) && kombVRezimu(rez, k);
    if(zap){ b.removeAttribute("hidden"); komb++; } else b.setAttribute("hidden", "");
    b.disabled = lock || PRESETY[k].d > l;
    b.querySelector(".v").textContent = fmt(sazba(rez, k));
  });
  /* Řada samostatných hodnot: do tří čipů se vejde beze změny velikosti,
     při čtyřech a víc mizí celá i s nadpisem a zadává se přes 1× ve
     Stejných hodnotách. Popisek je týž text jako štítek v historii, takže
     se ta dvě místa nemají kde rozejít. */
  var samo = pocetSamostatnych(rez), radaVidet = samo > 0 && samo <= SAMOSTATNE_V_RADE;
  elDataSingle.forEach(function(b){
    var v = Number(b.dataset.single), body = rez.sam[v] || 0;
    if(radaVidet && body > 0) b.removeAttribute("hidden"); else b.setAttribute("hidden", "");
    b.disabled = lock || l < 1;
    b.firstChild.textContent = textKodu(SAM_KODY[v]);
    b.querySelector(".v").textContent = fmt(body);
  });
  elSingleRow.hidden = !radaVidet;
  elSingleCap.hidden = !radaVidet;
  /* Nadpis řady mluví o tom, co v ní právě je: v režimu bez postupek by
     „Postupky“ byla nepravda a řada se schovat nemůže — sedí v ní čip
     „vlastní“, jediná cesta k ručnímu zadání. */
  elStrCap.textContent = t(post ? (komb ? "pocitadlo.postupkykomb" : "pocitadlo.postupky")
                                : "pocitadlo.kombinace");
  /* Zalomení se srovnává podle počtu viditelných čipů: samo od sebe by
     se pět zalomilo jako 4 + 1 a osamělý čip by zabral celou šířku. */
  Array.prototype.forEach.call(elStrRow.children, function(el){ if(!el.hidden) videt++; });
  ["k5","k6","k7","k8","k9"].forEach(function(c){ elStrRow.classList.remove(c); });
  if(videt >= 5 && videt <= 9) elStrRow.classList.add("k" + videt);

  renderVlastniCipy(rez, l, lock);
}
/* Kombinace s víc vzory se odkládá jedním čipem, dokud je jasné, kolik
   kostek to stojí. Když se do zbývajících kostek vejdou vzory o různých
   velikostech, řada se na místě překlopí na volbu — stejný dvoukrokový
   vzor jako mazání v koších, a klik navíc jen tehdy, když je opravdu
   z čeho vybírat. */
var vybiramKombi = null;
function renderVlastniCipy(rez, l, lock){
  var komb = kombinaceZap(rez), vybrana = null;
  elVlastniRow.innerHTML = "";
  komb.forEach(function(k){ if(k.id === vybiramKombi) vybrana = k; });
  if(vybrana && !lock){
    elVlastniRow.appendChild(kombiVolbaCip(vybrana, l));
    poctyKostekKombinace(vybrana, Math.min(rez.kostek, l)).forEach(function(n){
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.kostek = String(n);
      b.textContent = tn("pocitadlo.kostzkr", n);
      b.addEventListener("click", function(){
        vybiramKombi = null;
        keep(kodVzoru(vybrana, n), vybrana.b, n);
      });
      elVlastniRow.appendChild(b);
    });
    elVlastniRow.hidden = false;
    return;
  }
  vybiramKombi = null;
  komb.forEach(function(k){
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.vzor = k.id;
    b.innerHTML = esc(nazevKombinace(k)) + '<span class="v">' + esc(fmt(k.b)) + "</span>";
    var moznosti = poctyKostekKombinace(k, Math.min(rez.kostek, l));
    b.disabled = lock || moznosti.length === 0;
    b.addEventListener("click", function(){
      var moc = poctyKostekKombinace(k, Math.min(rez.kostek, left()));
      if(!moc.length) return;
      if(moc.length === 1){ keep(kodVzoru(k, moc[0]), k.b, moc[0]); return; }
      vybiramKombi = k.id;
      render();
    });
    elVlastniRow.appendChild(b);
  });
  elVlastniRow.hidden = komb.length === 0;
}
/* První čip volby je sama kombinace: říká, o kterou jde, a klepnutím
   volbu zruší. */
function kombiVolbaCip(k, l){
  var b = document.createElement("button");
  b.type = "button"; b.className = "chip on"; b.dataset.vzor = k.id;
  b.innerHTML = esc(nazevKombinace(k)) + '<span class="v">' + esc(t("komb.vyberkostek")) + "</span>";
  b.addEventListener("click", function(){ vybiramKombi = null; render(); });
  return b;
}
/* Kód nese body a počet kostek použitého vzoru, ne odkaz na kombinaci
   v nastavení — k1500x5 se přečte i po jejím smazání a na cizím telefonu. */
function kodVzoru(k, kostek){ return "k" + k.b + "x" + kostek; }

/* Vrubovka i přehledové dlaždice se kreslí z otisku hry, takže stejný kód
   obslouží rozehranou hru i hru vytaženou z historie. */

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initKlavesnice(){
  [1,2,3,4,5,6].forEach(function(v){
    var b = document.createElement("button");
    b.className = "chip"; b.textContent = v; b.dataset.value = v;
    b.addEventListener("click", function(){ selValue = (selValue === v ? null : v); renderKind(); });
    elPips.appendChild(b);
  });

  /* Počty od jedné: 1× nastupuje, když se samostatné hodnoty nevejdou do
     vlastní řady čipů, 2× když v režimu boduje dvojice. Co je z nich vidět,
     rozhoduje renderKind(). */
  [1,2,3,4,5,6].forEach(function(c){
    var b = document.createElement("button");
    b.className = "chip"; b.textContent = c + "×"; b.dataset.count = c;
    b.addEventListener("click", function(){ selCount = c; renderKind(); });
    elCounts.appendChild(b);
  });
}


/* Výběr se ruší po zapsání položky. Dřív do selValue psala obsluha
   tlačítka; teď o svůj výběr žádá klávesnici, protože jí patří. */
function zrusVyber(){
  selValue = null;
  renderKind();
}
function ubratKostku(){ manualDice = Math.max(1, manualDice - 1); }
function pridatKostku(){ manualDice = Math.min(Math.max(1, left()), manualDice + 1); }

/* Ubylo kostek pod rozdělaný počet? Srovná to vykreslení, ale hodnota patří
   klávesnici — zvenčí se do ní psát nedá. */
function orezKostky(zbyva){
  if(manualDice > Math.max(1, zbyva)) manualDice = Math.max(1, zbyva);
}

export { kodVzoru, kombiVolbaCip, manualDice, orezKostky, pocetBoduje, pridatKostku, renderKind, renderKombi, renderVlastniCipy, selCount, selValue, ubratKostku, vybiramKombi, zrusVyber };
