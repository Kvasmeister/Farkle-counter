/* Filtry a řazení historie: stav, výběr a tři okna.

   Závisí na: stav, text, ui/okna, ui/stat-filtry (STATFILTR — jen pro
              histView a lištu, viz níž)
   Sahá na: DOM

   Stav (FILTR, RAZENI) drží jen paměť, žádný localStorage: po zavření
   aplikace se resetuje, aby se nikdo nedíval na osekanou historii a
   nevěděl proč. STATFILTR (filtr Statistik podle režimu a typu hry) je
   výjimka — ten se schválně ukládá a přežívá restart, viz stat-filtry.js.

   Nabídka hodnot se skládá z dat, ne z pevného seznamu — a vždycky z celé
   historie, ne z právě odfiltrované. Filtr typu hry platí jen tam, kde je
   vidět jeho tlačítko — STATFILTR je naproti tomu plošný pro celou kartu
   Statistiky, i pro početní statistiky. */
import { kat, t, tn } from "../jazyky/jadro.js";
import { histAll } from "../stav/historie.js";
import { dtDen, esc, fmt } from "../text/format.js";
import { otevriModal, zavriModal } from "./okna.js";
import { $ } from "./prvky.js";
import { STATFILTR, pouzijRezimFiltr, seznamRezimuKFiltru, ulozStatFiltr, zrusStatFiltr } from "./stat-filtry.js";
import { elSeg, renderP2, segIdx, zpetNaSeznam, zrusNav } from "./statistiky-stranka.js";
import { denKlic } from "./statistiky.js";
import { nastavSeg } from "./statistiky-stranka.js";

/* ---------- filtry a řazení ----------
   Stav drží jen paměť, žádný localStorage: po zavření aplikace se resetuje,
   aby se nikdo nedíval na osekanou historii a nevěděl proč. Přepnutí karet
   ani odchod na jinou stránku ho ale neruší.

   histView() jsou jediné dveře k datům pro zobrazení — na ni se ptá seznam
   her, seznam statistik i žebříčky. Neptá se přes ni export, zápis ani
   mazání: záloha veze vždycky všechny hry, i když je filtr zapnutý. */
var FILTR  = { od: null, do: null, typ: null, hodnota: null };
var RAZENI = { podle: "datum", smer: "desc" };

/* Starý nebo cizí záznam nemusí mít mode vůbec; všechno, co není „rounds",
   je hra na body — stejné pravidlo jako všude jinde v aplikaci. */
function rezimHry(g){ return g.mode === "rounds" ? "rounds" : "points"; }
/* Cíl hry jedním číslem: u her na kola je nula „bez limitu". Nula je tu
   platná hodnota, na rozdíl od null, které v FILTR.hodnota znamená
   „všechny". */
function cilHry(g){
  return g.mode === "rounds" ? (g.roundGoal > 0 ? g.roundGoal : 0) : (g.goal || 0);
}
/* Nabídka se skládá z dat, ne z pevného seznamu — a vždycky z celé
   historie, ne z vyfiltrované. Jinak by se po zapnutí filtru data nabídka
   smrskla a nešlo by ji rozšířit zpátky. */
function hodnotyTypu(typ){
  var v = [], bezLimitu = false, videno = {};
  histAll().forEach(function(g){
    if(rezimHry(g) !== typ) return;
    var x = cilHry(g);
    if(typ === "rounds" && x === 0){ bezLimitu = true; return; }
    if(!videno[x]){ videno[x] = true; v.push(x); }
  });
  v.sort(function(a, b){ return a - b; });
  if(bezLimitu) v.push(0);
  return v;
}
function zrusFiltr(){
  FILTR.od = null; FILTR.do = null; FILTR.typ = null; FILTR.hodnota = null;
  RAZENI.podle = "datum"; RAZENI.smer = "desc";
  zrusStatFiltr();
}
/* Poslední milisekunda dne, ve kterém ms leží. Přes konstruktor Date, ne
   přičtením 24 hodin — kolem přechodu na letní čas den 24 hodin nemá. */
function konecDne(ms){
  var d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1;
}
/* Filtr typu hry (FILTR.typ) platí jen tam, kde je vidět jeho tlačítko,
   tedy na kartě Historie — proto se o něj volající musí říct. Na kartě
   Statistiky by půlka položek („hra na body", „hra na kola") zůstala
   prázdná a nic by nenapovědělo proč. Filtr data se naopak uplatňuje
   všude.

   proStatistiky je opačný případ: STATFILTR.rezim (viz stat-filtry.js) je
   určený PRO Statistiky a plošně jim mění i početní statistiky —
   volající, kteří stavějí data pro tuhle kartu, si o něj řeknou
   samostatným parametrem, ne přes sTypem. STATFILTR.typ/hodnota se sem
   naschvál NEpromítá — na rozdíl od režimu (různé bodovací tabulky, tvrdá
   nesrovnatelnost) je typ hry osa, na které "celkem" varianta statistiky
   musí zůstat srovnatelná i pod filtrem; jeho aplikace proto čeká až na
   vyberHry() v statistiky.js, kde se už ví, jestli jde o `celkem`
   položku, nebo ne. */
function histView(sTypem, proStatistiky){
  var v = histAll();
  if(FILTR.od !== null || FILTR.do !== null){
    v = v.filter(function(g){
      var t = g.savedAt || 0;
      if(FILTR.od !== null && t < FILTR.od) return false;
      if(FILTR.do !== null && t > FILTR.do) return false;
      return true;
    });
  }
  if(sTypem && FILTR.typ !== null){
    v = v.filter(function(g){
      if(rezimHry(g) !== FILTR.typ) return false;
      if(FILTR.hodnota === null) return true;
      return cilHry(g) === FILTR.hodnota;
    });
  }
  if(proStatistiky) v = pouzijRezimFiltr(v);
  var smer = RAZENI.smer === "asc" ? 1 : -1;
  v.sort(function(a, b){
    if(RAZENI.podle === "body"){
      var r = ((a.banked || 0) - (b.banked || 0)) * smer;
      if(r) return r;
      return (b.savedAt || 0) - (a.savedAt || 0);
    }
    return ((a.savedAt || 0) - (b.savedAt || 0)) * smer;
  });
  return v;
}
/* ---------- lišta filtrů ----------
   Popisek nese zvolený filtr, ať je vidět i bez otevření okna. Datum se
   píše co nejúsporněji: shodné části rozsahu se neopakují. */
var elFbar = $("fbar"), elFdatum = $("fdatum"),
    elFtyp = $("ftyp"), elFraz = $("frazeni"),
    elFsRezim = $("fsrezim"), elFsTyp = $("fstyp");
function popisDatumu(){
  if(FILTR.od === null || FILTR.do === null) return t("filtr.datum");
  var a = new Date(FILTR.od), b = new Date(FILTR.do);
  if(denKlic(a) === denKlic(b)) return dtDen(FILTR.od);
  return kat("datumRozsah")(a, b);
}
function popisTypu(){
  if(FILTR.typ === null) return t("filtr.typhry");
  if(FILTR.typ === "points")
    return FILTR.hodnota === null ? t("filtr.nabody") : t("typhry.dobodu", { b: fmt(FILTR.hodnota) });
  if(FILTR.hodnota === null) return t("typhry.nakola");
  return FILTR.hodnota === 0
    ? (t("typhry.nakola") + " \u00B7 " + t("filtr.bezlimitu"))
    : t("filtr.nakolan", { n: FILTR.hodnota });
}
/* Popisky řazení jsou jen tady — z nich se plní nabídka i tlačítko, aby
   se stejný text nepsal dvakrát. Výchozí řazení se na tlačítko nepíše;
   tam zůstává holé „Řazení" bez mosazného rámu. */
var RAZ_POPIS = {
  "datum:desc": "razeni.nejnovejsi",
  "datum:asc":  "razeni.nejstarsi",
  "body:desc":  "razeni.nejvic",
  "body:asc":   "razeni.nejmin"
};
function popisRazeni(){
  var k = RAZENI.podle + ":" + RAZENI.smer;
  return (k === "datum:desc" || !RAZ_POPIS[k]) ? t("filtr.razeni") : t(RAZ_POPIS[k]);
}
/* STATFILTR.rezim, který v datech (mezitím) nemá jedinou hru — smazaná
   poslední hra daného duchovního režimu — se chová jako bez filtru na
   popisku; samotná hodnota se tím nemaže, jen se nemá co ukázat. */
function popisRezimu(){
  if(STATFILTR.rezim === null) return t("filtr.rezim");
  var i, sez = seznamRezimuKFiltru();
  for(i = 0; i < sez.length; i++){ if(sez[i].id === STATFILTR.rezim) return sez[i].nazev; }
  return t("filtr.rezim");
}
/* Stejná logika jako popisTypu(), jen nad STATFILTR místo FILTR — obě
   sdílejí stejné klíče pro znění hodnoty (typhry.*, filtr.nabody…), liší
   se jen v tom, který stav čtou. */
function popisTypuStat(){
  if(STATFILTR.typ === null) return t("filtr.typhry");
  if(STATFILTR.typ === "points")
    return STATFILTR.hodnota === null ? t("filtr.nabody") : t("typhry.dobodu", { b: fmt(STATFILTR.hodnota) });
  if(STATFILTR.hodnota === null) return t("typhry.nakola");
  return STATFILTR.hodnota === 0
    ? (t("typhry.nakola") + " · " + t("filtr.bezlimitu"))
    : t("filtr.nakolan", { n: STATFILTR.hodnota });
}
/* Na tlačítku zůstává krátký stálý popisek, aby se všechna vešla na jeden
   řádek; zvolený filtr nese mosazný rám. Plné znění jde do aria-label —
   čtečka ho přečte a testy mají co kontrolovat. */
function popisTlacitka(el, txt, holy){
  el.setAttribute("aria-label", txt);
  el.classList.toggle("on", txt !== holy);
}
function renderFiltry(){
  var jsou = histAll().length > 0;
  elFbar.hidden = !jsou;
  if(!jsou) return;
  popisTlacitka(elFdatum, popisDatumu(), t("filtr.datum"));
  /* Typ hry a řazení dávají smysl jen nad seznamem her — skrytá tlačítka
     z řádku vypadnou úplně a zbylá dvě se o jeho šířku podělí sama. Režim
     a typ hry PRO STATISTIKY (STATFILTR) dávají smysl jen nad statistikami,
     tedy přesně opačná podmínka. */
  var vSeznamu = segIdx === 1;
  elFtyp.hidden = !vSeznamu;
  elFraz.hidden = !vSeznamu;
  elFsRezim.hidden = vSeznamu;
  elFsTyp.hidden = vSeznamu;
  popisTlacitka(elFtyp, popisTypu(), t("filtr.typhry"));
  popisTlacitka(elFraz, popisRazeni(), t("filtr.razeni"));
  popisTlacitka(elFsRezim, popisRezimu(), t("filtr.rezim"));
  popisTlacitka(elFsTyp, popisTypuStat(), t("filtr.typhry"));
}

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initFiltry(){
  $("freset").addEventListener("click", function(){
    zrusFiltr();
    renderP2();
  });

  /* Okno výběru data. Rozsah je včetně obou krajních dnů; obrácené zadání se
     prohodí, místo aby se hlásila chyba. Prázdná pole filtr zruší. */
  (function(){
    var rezimDne = "den",
        elSegD = $("dateseg"), elOd = $("dateod"), elDo = $("datedo"),
        elDoRow = $("datedorow"), elOdL = $("dateodl");

    function isoDne(ms){ return ms === null ? "" : denKlic(new Date(ms)); }
    function zIso(s){
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
      return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null;
    }
    function nastavRezim(r){
      rezimDne = r;
      Array.prototype.forEach.call(elSegD.children, function(b, i){
        b.classList.toggle("on", (i === 0) === (r === "den"));
      });
      elDoRow.hidden = r === "den";
      elOdL.textContent = t(r === "den" ? "datum.den" : "datum.od");
    }
    Array.prototype.forEach.call(elSegD.children, function(b, i){
      b.addEventListener("click", function(){ nastavRezim(i === 0 ? "den" : "rozsah"); });
    });

    elFdatum.addEventListener("click", function(){
      var min = null, max = null;
      histAll().forEach(function(g){
        var t = g.savedAt || 0;
        if(min === null || t < min) min = t;
        if(max === null || t > max) max = t;
      });
      elOd.min = elDo.min = isoDne(min);
      elOd.max = elDo.max = isoDne(max);
      var jedenDen = FILTR.od !== null && FILTR.do !== null &&
                     denKlic(new Date(FILTR.od)) === denKlic(new Date(FILTR.do));
      nastavRezim(FILTR.od !== null && !jedenDen ? "rozsah" : "den");
      elOd.value = isoDne(FILTR.od);
      elDo.value = isoDne(FILTR.do);
      otevriModal("datemodal", this);
    });

    $("datezpet").addEventListener("click", function(){ zavriModal(); });
    $("dateok").addEventListener("click", function(){
      var od = zIso(elOd.value),
          konec = rezimDne === "den" ? od : zIso(elDo.value);
      if(od === null && konec === null){
        FILTR.od = null; FILTR.do = null;
      }else{
        if(od === null) od = konec;
        if(konec === null) konec = od;
        if(konec < od){ var p = od; od = konec; konec = p; }
        FILTR.od = od;
        FILTR.do = konecDne(konec);
      }
      zavriModal();
      renderP2();
    });
  })();

  /* Okno výběru typu hry. Výběr je dvoustupňový: nejdřív typ, teprve pak
     hodnota. První políčko přepínače je „Vše" — bez něj by šel filtr typu
     zapnout, ale ne vypnout jinak než tlačítkem Zrušit filtr, které by
     s ním shodilo i datum. */
  (function(){
    var typVolba = null,
        elSegT = $("typseg"), elVal = $("typval"),
        elValRow = $("typvalrow"), elValL = $("typvall");

    function typZIndexu(i){ return i === 0 ? null : (i === 1 ? "points" : "rounds"); }

    function nastavTyp(typ, hodnota){
      typVolba = typ;
      Array.prototype.forEach.call(elSegT.children, function(b, i){
        b.classList.toggle("on", typZIndexu(i) === typ);
      });
      elValRow.hidden = typ === null;
      if(typ === null){ elVal.innerHTML = ""; return; }
      elValL.textContent = t(typ === "points" ? "typ.cil" : "typ.limit");
      var s = '<option value="">' + esc(t("typ.vsechny")) + '</option>';
      hodnotyTypu(typ).forEach(function(x){
        s += '<option value="' + esc(String(x)) + '">' +
          esc(typ === "rounds"
            ? (x === 0 ? t("filtr.bezlimitu") : tn("slovo.kolo", x))
            : fmt(x)) +
          '</option>';
      });
      elVal.innerHTML = s;
      /* Hodnota z vypnutého filtru v nabídce být nemusí (hra mezitím zmizela
         z historie) — pak se spadne zpátky na „Všechny". */
      elVal.value = (hodnota === null || hodnota === undefined) ? "" : String(hodnota);
      if(elVal.selectedIndex < 0) elVal.value = "";
    }

    Array.prototype.forEach.call(elSegT.children, function(b, i){
      b.addEventListener("click", function(){ nastavTyp(typZIndexu(i), null); });
    });

    elFtyp.addEventListener("click", function(){
      nastavTyp(FILTR.typ, FILTR.hodnota);
      otevriModal("typmodal", this);
    });

    $("typzpet").addEventListener("click", function(){ zavriModal(); });
    $("typok").addEventListener("click", function(){
      FILTR.typ = typVolba;
      FILTR.hodnota = (typVolba === null || elVal.value === "") ? null : +elVal.value;
      zavriModal();
      renderP2();
    });
  })();

  /* Okno výběru herního režimu pro Statistiky. Na rozdíl od typu hry nemá
     vnořenou hodnotu — jeden plochý <select>, naplněný z dat (i smazané
     vlastní režimy, viz stat-filtry.js). Volba se rovnou ukládá, na rozdíl
     od FILTR. */
  (function(){
    var elVal = $("srezimval");
    elFsRezim.addEventListener("click", function(){
      var s = '<option value="">' + esc(t("typ.vsechny")) + '</option>';
      seznamRezimuKFiltru().forEach(function(r){
        s += '<option value="' + esc(r.id) + '">' + esc(r.nazev) + '</option>';
      });
      elVal.innerHTML = s;
      elVal.value = STATFILTR.rezim === null ? "" : STATFILTR.rezim;
      if(elVal.selectedIndex < 0) elVal.value = "";
      otevriModal("srezimmodal", this);
    });
    $("srezimzpet").addEventListener("click", function(){ zavriModal(); });
    $("srezimok").addEventListener("click", function(){
      STATFILTR.rezim = elVal.value === "" ? null : elVal.value;
      ulozStatFiltr();
      zavriModal();
      renderP2();
    });
  })();

  /* Okno výběru typu hry pro Statistiky — stejný dvoustupňový tvar jako
     u FILTR.typ výš (sdílené čisté funkce hodnotyTypu/cilHry/rezimHry),
     ale vlastní stav a vlastní zápis do úložiště po Použít. Samostatné
     zapojení, ne sdílené s oknem výš — to zůstává beze změny. */
  (function(){
    var typVolba = null,
        elSegT = $("stypseg"), elVal = $("stypval"),
        elValRow = $("stypvalrow"), elValL = $("stypvall");

    function typZIndexu(i){ return i === 0 ? null : (i === 1 ? "points" : "rounds"); }

    function nastavTyp(typ, hodnota){
      typVolba = typ;
      Array.prototype.forEach.call(elSegT.children, function(b, i){
        b.classList.toggle("on", typZIndexu(i) === typ);
      });
      elValRow.hidden = typ === null;
      if(typ === null){ elVal.innerHTML = ""; return; }
      elValL.textContent = t(typ === "points" ? "typ.cil" : "typ.limit");
      var s = '<option value="">' + esc(t("typ.vsechny")) + '</option>';
      hodnotyTypu(typ).forEach(function(x){
        s += '<option value="' + esc(String(x)) + '">' +
          esc(typ === "rounds"
            ? (x === 0 ? t("filtr.bezlimitu") : tn("slovo.kolo", x))
            : fmt(x)) +
          '</option>';
      });
      elVal.innerHTML = s;
      elVal.value = (hodnota === null || hodnota === undefined) ? "" : String(hodnota);
      if(elVal.selectedIndex < 0) elVal.value = "";
    }

    Array.prototype.forEach.call(elSegT.children, function(b, i){
      b.addEventListener("click", function(){ nastavTyp(typZIndexu(i), null); });
    });

    elFsTyp.addEventListener("click", function(){
      nastavTyp(STATFILTR.typ, STATFILTR.hodnota);
      otevriModal("stypmodal", this);
    });

    $("stypzpet").addEventListener("click", function(){ zavriModal(); });
    $("stypok").addEventListener("click", function(){
      STATFILTR.typ = typVolba;
      STATFILTR.hodnota = (typVolba === null || elVal.value === "") ? null : +elVal.value;
      ulozStatFiltr();
      zavriModal();
      renderP2();
    });
  })();

  /* Okno řazení. Nemá Použít — klepnutí na možnost je samo o sobě volba,
     další potvrzení by bylo jen krok navíc. */
  (function(){
    var tlac = Array.prototype.slice.call($("sortbtns").children);
    elFraz.addEventListener("click", function(){
      tlac.forEach(function(b){
        b.classList.toggle("on", b.getAttribute("data-podle") === RAZENI.podle &&
                                 b.getAttribute("data-smer") === RAZENI.smer);
      });
      otevriModal("sortmodal", this);
    });
    tlac.forEach(function(b){
      b.textContent = t(RAZ_POPIS[b.getAttribute("data-podle") + ":" + b.getAttribute("data-smer")]);
      b.addEventListener("click", function(){
        RAZENI.podle = b.getAttribute("data-podle");
        RAZENI.smer  = b.getAttribute("data-smer");
        zavriModal();
        renderP2();
      });
    });
  })();

  Array.prototype.forEach.call(elSeg.children, function(b, i){
    b.addEventListener("click", function(){
      nastavSeg(i);
      zrusNav();
      zpetNaSeznam();
    });
  });

  $("detback").addEventListener("click", zpetNaSeznam);
}

export { FILTR, RAZENI, RAZ_POPIS, cilHry, elFbar, elFdatum, elFraz, elFsRezim, elFsTyp, elFtyp, histView, hodnotyTypu, konecDne, popisDatumu, popisRazeni, popisRezimu, popisTlacitka, popisTypu, popisTypuStat, renderFiltry, rezimHry, zrusFiltr };
