/* Stránka Zápis kol: vrubovka, tabulka kol, režim oprav, koše.

   Závisí na: stav, text, ui/prvky
   Sahá na: DOM

   Kolo je posloupnost hodů, ne plochý seznam. Když se smaže položka ze
   staršího hodu, rechain() přepočítá thrown a hot pro všechny následující
   a vyprázdněné hody vyhodí. To je jádro režimu oprav — nesahat bez testu.

   renderRows() skládá řádky živé hry po prvcích, protože potřebuje křížky
   režimu oprav; rowsHTML() zůstává pro náhled z historie, kde se opravovat
   nesmí. */
import { t } from "../jazyky/jadro.js";
import { REZIMY, kostek, rezimPodleId, ulozRezimy } from "../pravidla/rezimy.js";
import { newId } from "../spolecne.js";
import { HIST, histAll, histWrite, klicSelhani, proHistorii } from "../stav/historie.js";
import {
  S,
  gameEmpty,
  kopieKola,
  makeRecord,
  potTotal,
  rollPoints,
  snapshot,
  usedInRoll
} from "../stav/stav.js";
import {
  KOSH_MAX,
  KOS_MAX,
  kosAll,
  kosHistAll,
  kosHistWrite,
  kosWrite
} from "../stav/uloziste.js";
import { gKol, gRezim } from "../stav/zaznam.js";
import { esc, fmt, popisHry } from "../text/format.js";
import { popisKola, stitek } from "../text/stitky.js";
import { syncGoalUI } from "./nastaveni-obecne.js";
import { zavriModal } from "./okna.js";
import {
  $,
  elArch,
  elEmpty,
  elFix,
  elKosHistList,
  elKosList,
  elRows,
  elTally,
  elTallyCap
} from "./prvky.js";
import { renderP2 } from "./statistiky-stranka.js";
import { render } from "./vykresleni.js";
import { renderZaloha2 } from "./zaloha.js";

/* ---------- zápis do historie ----------
   Hra se do historie zapíše na povel. Když už tam je a od té doby se hrálo,
   nabídne se aktualizace téhož záznamu — jinak by se rekordy počítaly dvakrát. */
var archTimer = null, archMsg = "";
function histIndex(list, id){
  for(var i = 0; i < list.length; i++){ if(list[i].id === id) return i; }
  return -1;
}
/* Kde leží záznam, na který je rozehraná hra navázaná: v historii, v koši
   smazaných z historie, nebo nikde. Stav se odvozuje, neukládá — jinak by
   ho rozešlo trvalé smazání z koše i vypadnutí přes strop deseti her.
   Do koše se sahá jen tehdy, když záznam v historii není, takže běžný
   průběh hry nestojí nic navíc. */
function kdeZaznam(){
  if(!S.archivedId) return "nikde";
  if(histIndex(HIST, S.archivedId) >= 0) return "historie";
  return histIndex(kosHistAll(), S.archivedId) >= 0 ? "kos" : "nikde";
}
function archive(){
  if(gameEmpty()) return;
  /* nezapsané kolo propadne — na to se ptáme, jinde potvrzení není */
  if(potTotal() > 0 && !archTimer){
    archTimer = setTimeout(function(){ archTimer = null; renderArch(); }, 5000);
    renderArch();
    return;
  }
  clearTimeout(archTimer); archTimer = null;
  zapisHru(function(ok){ if(!ok) selhalZapis(); });
}
/* Selhání zápisu do historie hlásí tlačítko v Zápisu kol — ať už klepnutí
   přišlo od uživatele, nebo zápis pustil automat. */
function selhalZapis(){
  archMsg = klicSelhani("chyba.mistoulozit");
  setTimeout(function(){ archMsg = ""; renderArch(); }, 4000);
  renderArch();
}
/* Samotný zápis bez ptaní a bez hlášení — volá ho tlačítko v Zápisu kol
   i „Uložit a začít novou“. Callback dostane true teprve tehdy, když je
   záznam skutečně v úložišti. */
function zapisHru(hotovo){
  var kde = kdeZaznam();
  var list = histAll();
  var i = (kde === "historie") ? histIndex(list, S.archivedId) : -1;
  var rec = makeRecord(kde === "nikde" ? null : S.archivedId);
  if(i >= 0){ list[i] = proHistorii(rec); } else { list.push(proHistorii(rec)); }

  /* Návrat z koše jsou dva zápisy za sebou. Nejdřív se záznam z koše
     odebere, teprve pak se zapisuje do historie — kdyby druhý zápis padl,
     koš se vrátí do stavu před tím. Ztratit se nemůže nic: po celou tu
     dobu je hra živá v Zápisu kol. Opačné pořadí by při selhání nechalo
     tutéž hru v historii i v koši, tedy dvakrát. */
  var kosPredtim = null;
  if(kde === "kos"){
    kosPredtim = kosHistAll();
    if(!kosHistWrite(kosPredtim.filter(function(x){ return x.id !== S.archivedId; }))){
      if(hotovo) hotovo(false);
      return;
    }
  }

  histWrite(list, function(ok){
    if(ok){
      S.archivedId = rec.id; S.dirty = false;
      render(); renderP2();
    }else if(kosPredtim){
      kosHistWrite(kosPredtim);
      renderKos();
    }
    if(hotovo) hotovo(ok);
  }, [rec]);
}
function renderArch(){
  elArch.classList.remove("warn");
  if(archMsg){ elArch.disabled = true; elArch.textContent = t(archMsg); return; }
  if(gameEmpty()){ elArch.disabled = true; elArch.textContent = t("zapis.nicknulozeni"); return; }
  if(archTimer){
    elArch.disabled = false;
    elArch.classList.add("warn");
    elArch.textContent = t("arch.propadne", { b: fmt(potTotal()) });
    return;
  }
  var kde = kdeZaznam();
  /* Záznam smazaný z historie se z tlačítka vrací zpátky, a to pod stejným
     id — proto tady nevzniká nová hra ani při rozehrané úpravě. */
  if(kde === "kos"){
    elArch.disabled = false; elArch.textContent = t("arch.obnovit"); return;
  }
  if(kde === "historie" && !S.dirty){
    elArch.disabled = true; elArch.textContent = t("arch.ulozeno"); return;
  }
  elArch.disabled = false;
  elArch.textContent = t((kde === "historie") ? "arch.aktualizovat" : "arch.zapsat");
}

/* Selhání zápisu se hlásí tam, kde uživatel klepnul: text tlačítka se na
   čtyři vteřiny změní a pak se vrátí. Stejný idiom jako u Zapsat do historie. */
function hlaskaNaTlacitku(btn, text, puvodni){
  if(!btn) return;
  btn.disabled = true;
  btn.classList.add("warn");
  btn.textContent = text;
  setTimeout(function(){
    btn.disabled = false;
    btn.classList.remove("warn");
    btn.textContent = puvodni;
  }, 4000);
}

/* ---------- koš ----------
   Nová hra nesmaže rozehranou hru nenávratně: pokud není v historii,
   odloží se sem a jde obnovit v nastavení. */
/* Vrací true, když je rozehraná hra v bezpečí — buď je zálohovaná, nebo
   zálohu nepotřebuje. Volající pak smí teprve mazat. */
function kosPush(){
  if(gameEmpty()) return true;
  /* záznam někde existuje a od té doby se nehrálo: zálohu netřeba */
  if(kdeZaznam() !== "nikde" && !S.dirty) return true;
  var list = kosAll();
  var rec = makeRecord(null);
  /* Vazba na původní záznam jde do koše s hrou. Bez ní by se obnovená hra
     dala zapsat jako nová a v historii by pak byla dvakrát. */
  if(S.archivedId) rec.puvodni = S.archivedId;
  list.unshift(rec);
  while(list.length > KOS_MAX){ list.pop(); }
  return kosWrite(list);
}
function nactiZaznam(rec){
  fixMode = false; pendingDel = null;
  S.mode = rec.mode === "rounds" ? "rounds" : "points";
  S.goal = rec.goal > 0 ? rec.goal : 4000;
  S.roundGoal = rec.roundGoal > 0 ? rec.roundGoal : null;
  S.banked = rec.banked || 0;
  S.turns = (rec.turns || []).map(function(tah){
    return kopieKola(tah);
  });
  /* Hra z koše se vrací i se svými pravidly: jinak by se dohrávala podle
     něčeho jiného, než podle čeho se začala. Neznámý režim (cizí záloha,
     smazaný vlastní) nechává volbu být. */
  if(rezimPodleId(gRezim(rec))){
    REZIMY.akt = gRezim(rec);
    ulozRezimy();
  }
  S.rolls = [{thrown:kostek(), hot:false, items:[]}];
  /* Obnovená hra se hlásí ke svému původnímu záznamu, pokud si ho koš
     zapamatoval — jinak by šla zapsat podruhé. Do koše se ukládá jen hra
     s neuloženými změnami, takže rozdíl proti záznamu je jistý: dirty.
     Záznam o automatickém uložení se s hrou nepřenáší. */
  var puvodni = (rec && typeof rec.puvodni === "string") ? rec.puvodni : null;
  S.archivedId = puvodni; S.dirty = !!puvodni; S.autoUlozeno = false;
}
function restore(id, btn){
  var list = kosAll(), i = histIndex(list, id);
  if(i < 0) return;
  var rec = list[i];
  /* co je právě rozehrané, taky neztratíme — když se to nepovede uložit,
     obnovu neděláme, jinak by rozehraná hra zmizela */
  if(!kosPush()){
    hlaskaNaTlacitku(btn, t("chyba.zalohovathru"), t("spol.obnovit"));
    return;
  }
  list = kosAll().filter(function(x){ return x.id !== id; });
  kosWrite(list);
  nactiZaznam(rec);
  zavriModal();
  syncGoalUI(); render(); renderKos();
}
/* Počet v hlavičce oddílu: sbalená harmonika by jinak nedala poznat,
   jestli je uvnitř co obnovovat. */
function pocetVOddilu(id, n){
  var el = document.getElementById(id);
  if(el) el.textContent = n ? String(n) : "";
}
/* Trvalé smazání se ptá stejným způsobem jako mazání kola: řádek se
   překlopí na otázku se dvěma tlačítky. Ptáme se vždy jen u jednoho
   řádku, proto jedno id na koš. */
var ptamSeKos = null, ptamSeKosHist = null;

function kosRadek(rec, ptaSe, akce){
  var row = document.createElement("div");
  row.className = "setrow kosrow";
  var popis = document.createElement("div");
  popis.className = "t";
  var btns = document.createElement("div");
  btns.className = "setbtns";
  if(ptaSe){
    popis.innerHTML = "<b>" + esc(t("kos.opravdutrvale")) + "</b><span>" +
      esc(fmt(rec.banked || 0) + " — " + popisHry(rec)) + "</span>";
    var ano = document.createElement("button");
    ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
    ano.addEventListener("click", function(){ akce.smaz(ano); });
    var ne = document.createElement("button");
    ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
    ne.addEventListener("click", akce.zrus);
    btns.appendChild(ano); btns.appendChild(ne);
  }else{
    popis.innerHTML = "<b>" + esc(fmt(rec.banked || 0)) + "</b><span>" + esc(popisHry(rec)) + "</span>";
    var ob = document.createElement("button");
    ob.type = "button"; ob.className = "ghost"; ob.textContent = t("spol.obnovit");
    ob.addEventListener("click", function(){ akce.obnov(ob); });
    var tr = document.createElement("button");
    tr.type = "button"; tr.className = "ghost"; tr.textContent = t("kos.trvalesmazat");
    tr.addEventListener("click", akce.ptejSe);
    btns.appendChild(ob); btns.appendChild(tr);
  }
  row.appendChild(popis); row.appendChild(btns);
  return row;
}

function renderKos(){
  renderKosHist();
  var list = kosAll();
  pocetVOddilu("koscnt", list.length);
  elKosList.innerHTML = "";
  if(!list.length){
    ptamSeKos = null;
    elKosList.innerHTML = '<div class="empty">' + esc(t("kos.prazdny")) + '</div>';
    return;
  }
  list.forEach(function(rec){
    elKosList.appendChild(kosRadek(rec, ptamSeKos === rec.id, {
      obnov: function(b){ restore(rec.id, b); },
      ptejSe: function(){ ptamSeKos = rec.id; renderKos(); },
      zrus: function(){ ptamSeKos = null; renderKos(); },
      smaz: function(b){
        /* Když zápis selže, záznam v koši zůstane — hlásíme to na tlačítku
           a řádek nepřekreslujeme, jinak by hláška hned zmizela. */
        if(!kosWrite(kosAll().filter(function(x){ return x.id !== rec.id; }))){
          hlaskaNaTlacitku(b, t("chyba.smazat"), t("spol.smazat"));
          return;
        }
        ptamSeKos = null;
        renderKos();
      }
    }));
  });
}

/* ---------- koš pro hry smazané z historie ----------
   Smazání z historie není nenávratné: záznam se odloží sem
   a tlačítkem se vrátí zpátky mezi dohrané hry. */
/* Vrací true, když je kopie skutečně uložená — volající pak teprve smí
   smazat originál z historie. */
function kosHistPush(rec){
  if(!rec) return false;
  var list = kosHistAll();
  list.unshift(rec);
  while(list.length > KOSH_MAX){ list.pop(); }
  return kosHistWrite(list);
}
function vratDoHistorie(id, btn){
  var list = kosHistAll(), i = histIndex(list, id);
  if(i < 0) return;
  var rec = list[i];
  var hry = histAll();
  /* kdyby se mezitím objevil záznam se stejným id (třeba importem) */
  if(histIndex(hry, rec.id) >= 0){ rec.id = newId(); }
  histWrite(hry.concat([proHistorii(rec)]), function(ok){
    if(!ok){
      hlaskaNaTlacitku(btn, t(klicSelhani("chyba.mistoulozit")), t("spol.obnovit"));
      return;
    }
    kosHistWrite(list.filter(function(x, k){ return k !== i; }));
    /* render() kvůli tlačítku v Zápisu kol: mohl se vrátit zrovna ten
       záznam, na který je rozehraná hra navázaná */
    render(); renderKosHist(); renderP2(); renderZaloha2();
  }, [rec]);
}
function renderKosHist(){
  var list = kosHistAll();
  pocetVOddilu("koshistcnt", list.length);
  elKosHistList.innerHTML = "";
  if(!list.length){
    ptamSeKosHist = null;
    elKosHistList.innerHTML = '<div class="empty">' + esc(t("kos.prazdnyhist")) + '</div>';
    return;
  }
  list.forEach(function(rec){
    elKosHistList.appendChild(kosRadek(rec, ptamSeKosHist === rec.id, {
      obnov: function(b){ vratDoHistorie(rec.id, b); },
      ptejSe: function(){ ptamSeKosHist = rec.id; renderKosHist(); },
      zrus: function(){ ptamSeKosHist = null; renderKosHist(); },
      smaz: function(b){
        if(!kosHistWrite(kosHistAll().filter(function(x){ return x.id !== rec.id; }))){
          hlaskaNaTlacitku(b, t("chyba.smazat"), t("spol.smazat"));
          return;
        }
        ptamSeKosHist = null;
        /* render() kvůli tlačítku v Zápisu kol: rozehraná hra se mohla
           vázat zrovna na tenhle záznam a teď už nemá kam */
        render(); renderKosHist();
      }
    }));
  });
}

function tallyInto(elBars, elCap, rec){
  elBars.innerHTML = "";
  var i, s;

  if(rec.mode === "rounds"){
    var played = gKol(rec);
    var kol = rec.roundGoal > 0 ? Math.min(40, rec.roundGoal) : Math.min(40, played);
    for(i = 0; i < kol; i++){
      s = document.createElement("i");
      if(i < played) s.className = "cut";
      elBars.appendChild(s);
    }
    if(rec.roundGoal > 0){
      elCap.textContent = t("tally.kolzn", { n: played, z: rec.roundGoal });
    } else {
      elCap.textContent = played ? t("tally.koln", { n: played }) : t("tally.zadnekolo");
    }
    return;
  }

  var step = Math.max(100, Math.round(rec.goal / 8 / 100) * 100);
  var n = Math.min(40, Math.max(4, Math.round(rec.goal / step)));
  var done = Math.max(0, Math.min(n, Math.floor(rec.banked / step)));
  for(i = 0; i < n; i++){
    s = document.createElement("i");
    if(i < done) s.className = "cut";
    elBars.appendChild(s);
  }
  var rest = rec.goal - rec.banked;
  elCap.textContent = rest > 0 ? t("tally.docile", { b: fmt(rest) })
                               : t("tally.prekonano", { b: fmt(-rest) });
}
function renderTally(){ tallyInto(elTally, elTallyCap, snapshot()); }

/* přepočítá, kolika kostkami se v jednotlivých hodech háže,
   když se z kola odebere položka kdekoliv */
function rechain(){
  S.rolls = S.rolls.filter(function(r, i){ return r.items.length || i === S.rolls.length - 1; });
  if(!S.rolls.length) S.rolls = [{thrown:kostek(), hot:false, items:[]}];
  S.rolls[0].thrown = kostek();
  S.rolls[0].hot = false;
  for(var i = 1; i < S.rolls.length; i++){
    var prev = S.rolls[i-1];
    var rest = prev.thrown - usedInRoll(prev);
    S.rolls[i].thrown = rest > 0 ? rest : kostek();
    S.rolls[i].hot = rest === 0;
  }
}
function removeEntry(ri, ii){
  if(!S.rolls[ri]) return;
  S.rolls[ri].items.splice(ii, 1);
  rechain();
  render();
}

function renderFix(){
  elFix.innerHTML = "";
  var any = S.rolls.some(function(r){ return r.items.length; });
  if(!any){
    elFix.innerHTML = '<div class="none">' + esc(t("oprava.nic")) + '</div>';
    return;
  }
  S.rolls.forEach(function(r, ri){
    if(!r.items.length) return;
    var lbl = document.createElement("div");
    lbl.className = "lbl";
    lbl.innerHTML = '<span>' + esc(t("oprava.hod", { n: ri + 1, k: r.thrown }) +
                      (r.hot ? " \u00B7 " + t("oprava.horke") : "")) + '</span>' +
                    '<b>' + fmt(rollPoints(r)) + '</b>';
    var grp = document.createElement("div");
    grp.className = "grp";
    r.items.forEach(function(it, ii){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ent";
      b.innerHTML = '<span>' + esc(stitek(it)) + '</span><b>' + fmt(it.p) + '</b>';
      b.title = t("oprava.smazatpolozku");
      b.addEventListener("click", function(){ removeEntry(ri, ii); });
      grp.appendChild(b);
    });
    elFix.appendChild(lbl);
    elFix.appendChild(grp);
  });
}

/* Farkle se do dat nezapisuje, dopisuje se až tady jako poslední úsek —
   stará historie ho tak dostane taky, bez jakékoli migrace. Živá tabulka
   kol i nedotknutelný náhled hry z historie skládají buňku touhle jednou
   funkcí, aby se obě podoby nemohly rozejít. */
function bunkaPopisu(tah){
  var p = esc(popisKola(tah));
  if(tah.bust) return p ? p + " \u00B7 " + esc(t("slovo.farkle")) : esc(t("slovo.farkle"));
  return p || "&nbsp;";
}
function rowsHTML(turns){
  var run = 0, out = "";
  (turns || []).forEach(function(tah, i){
    if(!tah.bust) run += tah.p;
    out += '<tr' + (tah.bust ? ' class="f"' : '') + '>' +
      '<td class="n">' + (i + 1) + '</td>' +
      '<td class="d">' + bunkaPopisu(tah) + '</td>' +
      '<td class="g">' + fmt(tah.p || 0) + '</td>' +
      '<td class="s">' + fmt(run) + '</td></tr>';
  });
  return out;
}
/* režim oprav v zápise kol: fixMode zapíná křížky u řádků,
   pendingDel drží index kola, u kterého se právě ptáme na potvrzení.
   řádky se tu skládají po prvcích, ne přes rowsHTML — ten zůstává
   pro nedotknutelný náhled hry z historie. */
var fixMode = false, pendingDel = null;

function deleteTurn(i){
  var t = S.turns[i];
  if(!t) return;
  if(!t.bust){ S.banked -= t.p; }
  S.turns.splice(i, 1);
  pendingDel = null;
  if(!S.turns.length){ fixMode = false; }
  S.dirty = true;
  render();
}

function renderRows(){
  elRows.innerHTML = "";
  if(pendingDel !== null && !S.turns[pendingDel]) pendingDel = null;

  var fb = $("fixturns");
  fb.style.display = S.turns.length ? "" : "none";
  fb.classList.toggle("on", fixMode);
  fb.setAttribute("aria-pressed", fixMode ? "true" : "false");
  fb.textContent = t(fixMode ? "zapis.hotovo" : "zapis.opravit");

  var run = 0;
  var frag = document.createDocumentFragment();
  S.turns.forEach(function(tah, i){
    if(!tah.bust) run += tah.p;
    var tr = document.createElement("tr");

    if(pendingDel === i){
      tr.className = "confirm";
      var td = document.createElement("td");
      td.colSpan = 5;
      var wrap = document.createElement("div");
      wrap.className = "cf";
      var q = document.createElement("span");
      q.className = "q";
      q.textContent = t("zapis.opravdusmazat", { n: i + 1 });
      var yes = document.createElement("button");
      yes.type = "button"; yes.className = "mini danger"; yes.textContent = t("spol.smazat");
      yes.addEventListener("click", function(){ deleteTurn(i); });
      var no = document.createElement("button");
      no.type = "button"; no.className = "mini"; no.textContent = t("spol.zrusit");
      no.addEventListener("click", function(){ pendingDel = null; renderRows(); });
      wrap.appendChild(q); wrap.appendChild(yes); wrap.appendChild(no);
      td.appendChild(wrap);
      tr.appendChild(td);
      frag.appendChild(tr);
      return;
    }

    if(tah.bust) tr.className = "f";
    tr.innerHTML =
      '<td class="n">' + (i + 1) + '</td>' +
      '<td class="d">' + bunkaPopisu(tah) + '</td>' +
      '<td class="g">' + fmt(tah.p || 0) + '</td>' +
      '<td class="s">' + fmt(run) + '</td>';

    if(fixMode){
      var xtd = document.createElement("td");
      xtd.className = "x";
      var x = document.createElement("button");
      x.type = "button"; x.className = "delbtn"; x.innerHTML = "\u00D7";
      x.title = t("zapis.smazatkolo", { n: i + 1 });
      x.setAttribute("aria-label", x.title);
      x.addEventListener("click", function(){ pendingDel = i; renderRows(); });
      xtd.appendChild(x);
      tr.appendChild(xtd);
    }

    frag.appendChild(tr);
  });
  elRows.appendChild(frag);
  elEmpty.style.display = S.turns.length ? "none" : "block";
}


/* Režim oprav a rozdělané otázky patří téhle stránce. Kdo je chce zrušit,
   ať si řekne — zvenčí se do nich psát nedá. */
function prepniOpravy(){
  fixMode = !fixMode;
  pendingDel = null;
  renderRows();
}
function zrusOpravy(){
  fixMode = false;
  pendingDel = null;
}
function zrusPtaniKosu(){
  ptamSeKos = null;
  ptamSeKosHist = null;
}

export { archMsg, archTimer, archive, bunkaPopisu, deleteTurn, fixMode, histIndex, hlaskaNaTlacitku, kdeZaznam, kosHistPush, kosPush, kosRadek, nactiZaznam, pendingDel, pocetVOddilu, prepniOpravy, ptamSeKos, ptamSeKosHist, rechain, removeEntry, renderArch, renderFix, renderKos, renderKosHist, renderRows, renderTally, restore, rowsHTML, selhalZapis, tallyInto, vratDoHistorie, zapisHru, zrusOpravy, zrusPtaniKosu };
