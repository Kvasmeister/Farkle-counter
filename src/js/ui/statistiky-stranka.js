/* Stránka Statistiky: seznam, historie her, detail a stránkování.

   Závisí na: stav, pravidla/rezimy (rezimPodleId — rozbor hodů), text,
              ui/statistiky, ui/filtry, ui/stat-filtry (STATFILTR.typ —
              schování irelevantních rozdělených statistik)
   Sahá na: DOM

   Statistiky i historie mají podstránku detailu (#p2list ↔ #p2detail),
   ne další okno. Nejlepší hod a Průměrný hod mají žebříček na úrovni
   jednoho hodu, ne jedné hry — otevriZebricekHodu() vedle obvyklého
   otevriZebricek().

   Dlouhé seznamy se sázejí po dávkách a značka pod seznamem je zároveň
   tlačítko „Zobrazit dalších…“ i bod, na kterém pozorovatel dosype další
   dávku. */
import { t, tn } from "../jazyky/jadro.js";
import { rezimPodleId } from "../pravidla/rezimy.js";
import { histAll, histWrite, klicSelhani, nactiDetail, nactiVsechnyDetaily } from "../stav/historie.js";
import { rozlozKolo } from "../stav/hody.js";
import { kosHistAll, kosHistWrite } from "../stav/uloziste.js";
import { gFarkle, gKol, gRezim, nazevRezimuZaznamu } from "../stav/zaznam.js";
import { dt, dtDen, esc, fmt, popisTypuHry } from "../text/format.js";
import { FILTR, RAZENI, histView, konecDne, renderFiltry } from "./filtry.js";
import { $ } from "./prvky.js";
import { STATFILTR } from "./stat-filtry.js";
import {
  STATY,
  denKlic,
  jdeRozkliknout,
  statHodnota,
  statsHTML,
  vyberHry,
  zebricek
} from "./statistiky.js";
import { render } from "./vykresleni.js";
import { histIndex, hlaskaNaTlacitku, kosHistPush, rowsHTML, tallyInto } from "./zapis.js";

/* ---------- stránka Statistiky ---------- */
var segIdx = 0, delTimer = null;
var elSeg=$("seg"), elStatList=$("statlist"), elHistList=$("histlist"),
    elP2List=$("p2list"), elP2Detail=$("p2detail"),
    elDetTitle=$("dettitle"), elDetBody=$("detbody");

/* Podstránka detailu je jedna, ale dá se do ní přijít dvěma cestami: ze
   seznamu her, nebo ze žebříčku statistiky. Zásobník je proto jednoúrovňový
   — víc úrovní vzniknout nemůže, protože z detailu hry se dál nikam nejde. */
var navZpet = null;   // null | { statIdx: i }
/* Scroll seznamu a scroll žebříčku, než se z nich vyšlo do detailu —
   #p2list a #p2detail scrolluje společný rodič #page2, takže bez
   uložení by se po *Zpět* vždycky spadlo na 0 (viz doDetailu). */
var scrollList = 0, scrollZebricek = 0;
function zrusNav(){ navZpet = null; }
function zpetNaSeznam(){
  clearTimeout(delTimer); delTimer = null;
  if(navZpet){
    var i = navZpet.statIdx;
    navZpet = null;
    otevriZebricek(i);
    $("page2").scrollTop = scrollZebricek;
    return;
  }
  elP2Detail.hidden = true;
  elP2List.hidden = false;
  renderP2();
  $("page2").scrollTop = scrollList;
}
function doDetailu(titulek){
  odpojPozorovatele();
  elDetTitle.textContent = titulek;
  elP2List.hidden = true;
  elP2Detail.hidden = false;
  elP2Detail.scrollTop = 0;
  $("page2").scrollTop = 0;
}

/* ---------- stránkování dlouhých seznamů ----------
   Historie i žebříček stavěly prvek na každou dohranou hru. Při tisících
   her je jediné, co se tu reálně zadrhne, počet prvků v DOM — ne výpočet.
   Vykresluje se proto po dávkách po KROK položkách.

   Stav se nikde nedrží: každé nové vykreslení seznamu začíná od začátku,
   takže návrat z detailu, přepnutí přepínače i import resetují stránkování
   samy od sebe. Klepnutí na značku naopak jen dolije další dávku a zbytek
   seznamu nechá být — přestavovat celý seznam by při tisících her stálo
   kvadraticky. */
var KROK = 50;
var pozorovatel = null;

function odpojPozorovatele(){
  if(pozorovatel){ pozorovatel.disconnect(); pozorovatel = null; }
}

/* Roluje #page2, ne okno — kořenem pozorovatele tedy musí být ta stránka.
   Pozorovatel je vždycky nejvýš jeden: značka je na obrazovce taky jen jedna. */
function sledujZnacku(el, spust){
  odpojPozorovatele();
  if(typeof IntersectionObserver !== "function") return;
  try{
    pozorovatel = new IntersectionObserver(function(zaznamy){
      for(var i = 0; i < zaznamy.length; i++){
        if(zaznamy[i].isIntersecting){ spust(); return; }
      }
    }, { root: $("page2"), rootMargin: "150px" });
    pozorovatel.observe(el);
  }catch(e){ pozorovatel = null; }
}

/* Jeden prvek, dvě cesty: rolování ho vystřelí přes pozorovatele, klepnutí
   funguje i tam, kde by pozorovatel selhal nebo vůbec nebyl. */
function pridejZnacku(kam, zbyva, dalsi){
  var b = document.createElement("button");
  b.type = "button";
  b.className = "morerow";
  /* u poslední dávky by „dalších 13 · zbývá 13" jen mátlo */
  b.innerHTML = zbyva > KROK
    ? (esc(t("dalsi.dalsich", { n: KROK })) +
       '<span class="mz">' + esc(t("dalsi.zbyva", { n: zbyva })) + "</span>")
    : esc(t("dalsi.poslednich", { n: zbyva }));
  var spusteno = false;
  function spust(){
    if(spusteno) return;
    spusteno = true;
    odpojPozorovatele();
    b.remove();
    dalsi();
  }
  b.addEventListener("click", spust);
  kam.appendChild(b);
  sledujZnacku(b, spust);
}

/* Řádky se skládají do DocumentFragment a vkládají jedním zápisem,
   ať se nevyvolá padesát přepočtů rozvržení. Značka jde jinam než řádky:
   u žebříčku patří řádky do <tbody>, ale tlačítko pod tabulku. */
function vypisDavku(kamRadky, kamZnacka, polozky, od, stavitel){
  var konec = Math.min(od + KROK, polozky.length);
  var frag = document.createDocumentFragment();
  for(var i = od; i < konec; i++) frag.appendChild(stavitel(polozky[i], i));
  kamRadky.appendChild(frag);
  var zbyva = polozky.length - konec;
  if(zbyva > 0){
    pridejZnacku(kamZnacka, zbyva, function(){
      vypisDavku(kamRadky, kamZnacka, polozky, konec, stavitel);
    });
  }
}

function renderP2(){
  odpojPozorovatele();
  var hry = histView(segIdx === 1, segIdx === 0);
  elStatList.hidden = segIdx !== 0;
  elHistList.hidden = segIdx !== 1;
  Array.prototype.forEach.call(elSeg.children, function(b, i){
    b.classList.toggle("on", i === segIdx);
  });
  renderFiltry();
  if(segIdx === 0) renderStatList(hry); else renderHistList(hry);
}

function renderStatList(hry){
  elStatList.innerHTML = "";
  if(!hry.length){
    elStatList.innerHTML = '<div class="empty">' +
      esc(t(histAll().length ? "stat.filtrprazdno" : "stat.zadnahra")) + '</div>';
    return;
  }
  /* Kategorie jde v STATY po sobě (viz statistiky.js), takže stačí hlídat
     změnu oproti předchozí položce — stejný vzor jako .dsep o pár desítek
     řádků níž v renderHistList(). Kontrola kategorie běží AŽ PO schování
     irelevantní položky, ne před ním — jinak by kategorii s jedinou (teď
     schovanou) položkou zůstal viset osiřelý nadpis bez řádku pod sebou. */
  var posledniKat = null;
  STATY.forEach(function(def, i){
    /* Se zapnutým filtrem typu hry nemá rozdělená statistika pro OPAČNÝ
       typ co ukázat — statHodnota() by stejně vrátila null. Neděleným
       statistikám (bez def.s, „— celkem" varianty i početní) filtr jen
       zúží zobrazenou hodnotu, nezmizí. */
    if(def.s && STATFILTR.typ !== null && def.s !== STATFILTR.typ) return;
    if(def.kat !== posledniKat){
      posledniKat = def.kat;
      var cap = document.createElement("div");
      cap.className = "seccap";
      cap.textContent = t("stat.cap." + def.kat);
      elStatList.appendChild(cap);
    }
    var h = statHodnota(def, hry);
    var lze = jdeRozkliknout(def) && h;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "strow";
    b.disabled = !lze;
    b.innerHTML =
      '<span class="sn">' + esc(t(def.n)) +
        (h && h.pod ? '<span class="sd">' + esc(h.pod) + '</span>' : '') +
        (h && h.kdy ? '<span class="sd">' + (h.den
            ? dtDen(h.kdy)
            : dt(h.kdy) + (h.g ? ' \u00B7 ' + esc(nazevRezimuZaznamu(h.g)) +
                           ' \u00B7 ' + esc(popisTypuHry(h.g)) : '')) + '</span>' : '') +
      '</span>' +
      '<b class="sv">' + (h ? h.txt : "\u2014") + '</b>' +
      (lze ? '<span class="chev">\u00BB</span>' : '');
    if(lze){
      b.addEventListener("click", function(){
        scrollList = $("page2").scrollTop;
        otevriZebricek(i);
      });
    }
    elStatList.appendChild(b);
  });
}

function otevriZebricek(i){
  var def = STATY[i];
  if(def.hod){ otevriZebricekHodu(def, i); return; }
  var hry = histView(false, true), v = zebricek(def, hry);
  navZpet = null;
  doDetailu(t(def.n));
  if(!v.length){
    elDetBody.innerHTML = '<div class="empty">' + esc(t("stat.beznadat")) + '</div>';
    return;
  }
  elDetBody.innerHTML = '<table><tbody></tbody></table>';
  vypisDavku(elDetBody.querySelector("tbody"), elDetBody, v, 0,
             def.a === "denMax" ? radekDne(def)
                                : (def.a === "rezimMax" ? radekRezimu(def) : radekHry(def, i)));
}

/* ---------- žebříček na úrovni hodu (Nejlepší hod, Průměrný hod) ----------
   Na rozdíl od otevriZebricek() výš je tu jeden řádek jeden HOD, ne jedna
   hra — a navíc jde filtrovat podle počtu fyzicky hozených kostek. Potřebuje
   turns z KAŽDÉ kvalifikující se hry najednou (nactiVsechnyDetaily), ne jen
   z jedné rozkliknuté; kolo, které se nedá rozebrat (viz stav/hody.js),
   se jen vynechá. Rozbor proběhne jednou při otevření a mezipaměť
   (hoduRadky) se dál jen filtruje/třídí v paměti — klik na čip kostek proto
   nic znovu nenačítá. */
var hoduRadky = null;   // [{ g, thrown, p }, ...] aktuálně otevřeného žebříčku
/* Počty kostek pro čipy se berou z dat, ne z pevného seznamu 1–6: v
   pětikostkovém režimu by čip „6" byl trvale prázdný a se zapnutým filtrem
   režimu prázdné všechny nad jeho počtem kostek. Stejná úvaha jako
   u hodnotyTypu() ve filtry.js — jen se tu počítá z už rozebraných řádků,
   takže to nic nestojí navíc. */
function poctyKostekVZebricku(radky){
  var videno = {}, out = [], i, n;
  for(i = 0; i < radky.length; i++){
    n = radky[i].thrown;
    if(!videno[n]){ videno[n] = true; out.push(n); }
  }
  out.sort(function(a, b){ return a - b; });
  return out;
}

function otevriZebricekHodu(def, i){
  navZpet = null;
  doDetailu(t(def.n));
  elDetBody.innerHTML = '<div class="empty">' + esc(t("stat.pocitam")) + '</div>';
  nactiVsechnyDetaily(function(mapa){
    var hry = vyberHry(def, histView(false, true)), radky = [];
    hry.forEach(function(g){
      var turns = mapa[g.id];
      if(!turns) return;
      var rez = rezimPodleId(gRezim(g));
      if(!rez) return;
      turns.forEach(function(tah){
        var hody = rozlozKolo(tah, rez);
        if(hody === null) return;
        hody.forEach(function(h){ radky.push({ g: g, thrown: h.thrown, p: h.p }); });
      });
    });
    hoduRadky = radky;
    vykresliZebricekHodu(def, i, null);
  });
}
/* filtr === null znamená „Vše". U Průměrný hod (a:"pomer") se nad tabulkou
   ukazuje souhrnné číslo přepočítané nad právě zobrazenou (vyfiltrovanou)
   sadou — u Nejlepší hod (a:"max") to číslo je prostě první řádek žebříčku,
   žádná zvláštní hlavička tam není potřeba. */
function vykresliZebricekHodu(def, statIdx, filtr){
  var zdroj = filtr === null ? hoduRadky : hoduRadky.filter(function(r){ return r.thrown === filtr; });
  var v = zdroj.slice().sort(function(a, b){ return b.p - a.p; });
  elDetBody.innerHTML = kostkyChipyHTML(filtr) + prumerHlavickaHTML(def, zdroj) +
    (v.length ? '<table><tbody></tbody></table>' : '<div class="empty">' + esc(t("stat.beznadat")) + '</div>');
  zapojKostkyChipy(elDetBody, function(novy){ vykresliZebricekHodu(def, statIdx, novy); });
  if(v.length) vypisDavku(elDetBody.querySelector("tbody"), elDetBody, v, 0, radekHodu(def, statIdx));
}
function prumerHlavickaHTML(def, zdroj){
  if(def.a !== "pomer") return "";
  var soucet = 0;
  zdroj.forEach(function(r){ soucet += r.p; });
  var hodnota = zdroj.length ? def.f(soucet / zdroj.length) : "—";
  return '<div class="detsum"><span>' + esc(t(def.n)) + '</span><b>' + hodnota + '</b></div>';
}
function kostkyChipyHTML(filtr){
  var pocty = poctyKostekVZebricku(hoduRadky || []);
  /* Jediný počet kostek znamená, že není z čeho vybírat — řada čipů by byla
     jen ozdoba nad tabulkou. */
  if(pocty.length < 2) return "";
  /* kN řídí jen zalomení řady, stejně jako v klávesnici; hledá se podle
     stabilní třídy kostkyrow, aby na počtu čipů nezáleželo. */
  var out = '<div class="row kostkyrow k' + Math.min(9, pocty.length + 1) + '">' +
    '<button type="button" class="chip' + (filtr === null ? ' sel' : '') + '" data-k="">' +
      esc(t("stat.kostek.vse")) + '</button>';
  pocty.forEach(function(n){
    out += '<button type="button" class="chip' + (filtr === n ? ' sel' : '') + '" data-k="' + n + '">' + n + '</button>';
  });
  return out + '</div>';
}
function zapojKostkyChipy(kam, zmena){
  Array.prototype.forEach.call(kam.querySelectorAll(".kostkyrow .chip"), function(b){
    b.addEventListener("click", function(){
      var k = b.dataset.k;
      zmena(k === "" ? null : Number(k));
    });
  });
}
/* Řádek žebříčku hodů: stejná role jako radekHry výš, jen místo počtu kol
   ukazuje počet fyzicky hozených kostek. Klik naviguje do detailu hry, ne
   kola — na úroveň jednotlivého hodu se v historii proklikávat nedá. */
function radekHodu(def, statIdx){
  return function(r, k){
    var tr = document.createElement("tr");
    tr.className = "klik";
    tr.tabIndex = 0;
    tr.setAttribute("role", "button");
    tr.innerHTML =
      '<td class="n">' + (k + 1) + '</td>' +
      '<td class="d">' + dt(r.g.savedAt) + ' · ' + esc(nazevRezimuZaznamu(r.g)) +
        ' · ' + esc(popisTypuHry(r.g)) +
        ' · ' + esc(tn("slovo.kostek", r.thrown)) + '</td>' +
      '<td class="g">' + def.f(r.p) + '</td>' +
      '<td class="c">»</td>';
    function jdi(){
      scrollZebricek = $("page2").scrollTop;
      navZpet = { statIdx: statIdx };
      otevriHru(r.g.id);
    }
    tr.addEventListener("click", jdi);
    tr.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
        e.preventDefault();
        jdi();
      }
    });
    return tr;
  };
}
/* Stavitel se vybírá napřed, ne uvnitř šablony — žebříček dnů nese jiná
   data než žebříček her a míchat obojí v jednom innerHTML by bylo horší
   ke čtení než dvě krátké funkce. */
function radekHry(def, statIdx){
  return function(r, k){
    var tr = document.createElement("tr");
    tr.className = "klik";
    tr.tabIndex = 0;
    tr.setAttribute("role", "button");
    tr.innerHTML =
      '<td class="n">' + (k + 1) + '</td>' +
      '<td class="d">' + dt(r.g.savedAt) + ' \u00B7 ' + esc(nazevRezimuZaznamu(r.g)) +
        ' \u00B7 ' + esc(popisTypuHry(r.g)) +
        (def.kol ? ' \u00B7 ' + esc(tn("slovo.kolo", gKol(r.g))) : '') + '</td>' +
      '<td class="g">' + def.f(r.x) + '</td>' +
      '<td class="c">\u00BB</td>';
    function jdi(){
      scrollZebricek = $("page2").scrollTop;
      navZpet = { statIdx: statIdx };
      otevriHru(r.g.id);
    }
    tr.addEventListener("click", jdi);
    /* <tr> není tlačítko, Enter ani mezerník si sám neobslouží */
    tr.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
        e.preventDefault();
        jdi();
      }
    });
    return tr;
  };
}
/* Jediné místo, kde se karta přepíná sama. Na rozdíl od prokliku do detailu
   hry je to tady smysl akce: chci vidět ty hry, ne jejich počet. */
function radekDne(def){
  return function(r, k){
    var tr = document.createElement("tr");
    tr.className = "klik";
    tr.tabIndex = 0;
    tr.setAttribute("role", "button");
    tr.innerHTML =
      '<td class="n">' + (k + 1) + '</td>' +
      '<td class="d">' + dtDen(r.kdy) + '</td>' +
      '<td class="g">' + def.f(r.pocet) + '</td>' +
      '<td class="c">\u00BB</td>';
    function jdi(){
      FILTR.od = r.kdy;
      FILTR.do = konecDne(r.kdy);
      segIdx = 1;
      zrusNav();
      zpetNaSeznam();
    }
    tr.addEventListener("click", jdi);
    tr.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
        e.preventDefault();
        jdi();
      }
    });
    return tr;
  };
}

/* Řádek žebříčku režimů se nikam neproklikává: filtr podle režimu není,
   takže by neměl kam vést. Proto ani třída klik, ani šipka. */
function radekRezimu(def){
  return function(r, k){
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td class="n">' + (k + 1) + '</td>' +
      '<td class="d">' + esc(r.nazev) + '</td>' +
      '<td class="g">' + def.f(r.pocet) + '</td>' +
      '<td class="c"></td>';
    return tr;
  };
}

function renderHistList(hry){
  elHistList.innerHTML = "";
  if(!hry.length){
    elHistList.innerHTML = '<div class="empty">' +
      esc(t(histAll().length ? "stat.filtrprazdno" : "hist.prazdna")) + '</div>';
    return;
  }
  /* Den se porovnává se skutečně předchozí položkou v poli, ne s poslední
     vykreslenou — díky tomu čára správně vyjde i na hranici dávky po
     padesáti položkách, kde se stavitel spouští znovu od nuly. */
  vypisDavku(elHistList, elHistList, hry, 0, function(rec, i){
    var frag = document.createDocumentFragment();
    var pred = i > 0 ? hry[i - 1] : null;
    /* Při řazení podle bodů se čáry nekreslí vůbec — dny už v seznamu
       nejdou po sobě a čára by nad každou hrou hlásila jiné datum. */
    if(RAZENI.podle === "datum" &&
       (!pred || denKlic(new Date(pred.savedAt || 0)) !== denKlic(new Date(rec.savedAt || 0)))){
      var s = document.createElement("div");
      s.className = "dsep";
      s.textContent = dtDen(rec.savedAt);
      frag.appendChild(s);
    }
    var b = document.createElement("button");
    b.type = "button";
    b.className = "grow";
    b.innerHTML = '<span class="gn"><b>' + dt(rec.savedAt) + '</b>' +
      esc(nazevRezimuZaznamu(rec)) + ' \u00B7 ' + esc(popisTypuHry(rec)) +
      ' \u00B7 ' + esc(tn("slovo.kolo", gKol(rec))) +
      ' \u00B7 ' + esc(t("hist.farklex", { n: gFarkle(rec) })) + '</span>' +
      '<b class="gv">' + esc(fmt(rec.banked || 0)) + '</b>';
    b.addEventListener("click", function(){
      scrollList = $("page2").scrollTop;
      otevriHru(rec.id);
    });
    frag.appendChild(b);
    return frag;
  });
}

/* Hlavička a přechod na podstránku jsou hned ze souhrnu, tabulka kol až
   po dotažení detailu. Když má záznam `turns` už v ruce (propad na
   localStorage), jde všechno naráz a bez čekání. */
function otevriHru(id){
  var hry = histAll(), i = histIndex(hry, id);
  if(i < 0) return;
  var sou = hry[i];
  doDetailu(t("hist.hraz", { kdy: dt(sou.savedAt) }));
  elDetBody.innerHTML =
    '<div class="tally" id="dtally"></div><div class="tallycap" id="dtallycap"></div>' +
    '<div class="stats">' + statsHTML(sou) + '</div>' +
    '<div id="detrows"><div class="empty">' + esc(t("hist.nactamkola")) + '</div></div>' +
    '<div class="archwrap"><button class="ghost arch" id="delgame" type="button" disabled>' +
      esc(t("hist.smazat")) + '</button></div>';
  tallyInto($("dtally"), $("dtallycap"), sou);
  var db = $("delgame");

  /* Do koše se ukládá celý záznam, jinak by se z něj vrátila hra bez kol.
     Dokud detail není v ruce, mazat nejde. */
  var plny = null;
  function sKoly(turns){
    if(turns === null){
      $("detrows").innerHTML = '<div class="empty">' + esc(t("hist.kolanejdou")) + '</div>';
      return;
    }
    plny = { id: sou.id, savedAt: sou.savedAt, mode: sou.mode, goal: sou.goal,
             roundGoal: sou.roundGoal || null, rezim: gRezim(sou), rezimN: sou.rezimN || null,
             banked: sou.banked || 0, turns: turns };
    $("detrows").innerHTML = turns.length
      ? ('<table><tbody>' + rowsHTML(turns) + '</tbody></table>')
      : '<div class="empty">' + esc(t("hist.zadnekolo")) + '</div>';
    db.disabled = false;
  }
  if(Array.isArray(sou.turns)) sKoly(sou.turns);
  else nactiDetail(id, sKoly);

  db.addEventListener("click", function(){
    if(!plny) return;
    if(!delTimer){
      db.classList.add("warn");
      db.textContent = t("hist.opravdu");
      delTimer = setTimeout(function(){
        delTimer = null;
        db.classList.remove("warn");
        db.textContent = t("hist.smazat");
      }, 4000);
      return;
    }
    clearTimeout(delTimer); delTimer = null;
    /* Dva zápisy za sebou. Když padne první, nemažeme vůbec — kopie v koši
       je jediná pojistka. Když padne druhý, vracíme i ten první, jinak by
       hra zůstala v historii i v koši, tedy dvakrát. */
    var predtim = kosHistAll();
    if(!kosHistPush(plny)){
      hlaskaNaTlacitku(db, t("chyba.dokose"), t("hist.smazat"));
      return;
    }
    histWrite(histAll().filter(function(g){ return g.id !== id; }), function(ok){
      if(!ok){
        kosHistWrite(predtim);
        hlaskaNaTlacitku(db, t(klicSelhani("chyba.mistosmazat")), t("hist.smazat"));
        return;
      }
      /* Vazba rozehrané hry na záznam se nepřetrhává: hra ví, že její
         záznam leží v koši, a tlačítko v Zápisu kol nabídne návrat. Kdyby
         se vazba zrušila, hra by vypadala jako nikdy neuložená a Nová hra
         by z ní udělala druhou kopii v koši rozehraných. */
      /* žebříček by po smazání ukazoval hru, která už neexistuje */
      zrusNav();
      zpetNaSeznam();
      render();
    });
  });
}


/* Přepínač Statistiky/Historie sedí v liště filtrů, ale která polovina je
   vidět, ví tahle stránka. */
function nastavSeg(i){ segIdx = i; }

export { KROK, delTimer, doDetailu, elDetBody, elDetTitle, elHistList, elP2Detail, elP2List, elSeg, elStatList, nastavSeg, navZpet, odpojPozorovatele, otevriHru, otevriZebricek, otevriZebricekHodu, poctyKostekVZebricku, pozorovatel, pridejZnacku, radekDne, radekHodu, radekHry, radekRezimu, renderHistList, renderP2, renderStatList, scrollList, scrollZebricek, segIdx, sledujZnacku, vykresliZebricekHodu, vypisDavku, zpetNaSeznam, zrusNav };
