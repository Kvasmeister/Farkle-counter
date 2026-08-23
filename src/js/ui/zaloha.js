/* Záloha historie: export do souboru i schránky, import z obojího.

   Závisí na: stav, text, ui/misto
   Sahá na: DOM, schránka, soubory

   FORMÁT SE NEMĚNÍ A MĚNIT NESMÍ: TXT s řádkem #DATA: a JSONem. Soubor
   z kterékoli dřívější verze musí jít naimportovat i potom. Export skládá
   plné záznamy zpátky ze dvou polic a je asynchronní; import každý záznam
   naopak rozdělí na souhrn a detail.

   Import ořezává c i d na 300 znaků a všechno jde do stránky přes esc():
   cizí záloha by jinak mohla spustit skript ve stejném původu, tedy
   s přístupem k celé historii. */
import { t, tn } from "../jazyky/jadro.js";
import { VYCHOZI_REZIM } from "../pravidla/rezimy.js";
import { NAZEV_MAX, newId } from "../spolecne.js";
import {
  DETAILY,
  histAll,
  histWrite,
  idb,
  klicSelhani,
  proHistorii,
  rezim
} from "../stav/historie.js";
import { kopieKola } from "../stav/stav.js";
import { gFarkle, gNejlepsiKolo, gRezim } from "../stav/zaznam.js";
import { dt, fmt, popisHry } from "../text/format.js";
import { popisKola } from "../text/stitky.js";
import { prepniMisto, resetMisto } from "./misto.js";
import { $ } from "./prvky.js";
import { renderP2 } from "./statistiky-stranka.js";
import { render } from "./vykresleni.js";

/* ---------- záloha historie ----------
   Soubor je čitelný text; poslední řádek nese data pro import.
   Kdyby ho někdo z přehledu smazal, import to pozná a řekne to. */
var ZNACKA = "#DATA:";
function datumProNazev(){
  var d = new Date();
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}
/* S minutami navíc — jen pro sdílení jednotlivých režimů (ui/sdileni-rezimu.js):
   víc sdílení za týž den by se jinak stahovalo pod stejným jménem a na
   některých systémech by si to přepisovalo. Ostatní exporty (historie,
   plná záloha, záloha režimů) zůstávají u datumProNazev() beze změny. */
function datumCasProNazev(){
  var d = new Date();
  return datumProNazev() + "-" + ("0" + d.getHours()).slice(-2) + ("0" + d.getMinutes()).slice(-2);
}
/* Jeden záznam do zálohy. Vypisují se přesně ta pole, která import zpátky
   čte (cistaHra() níž) — nic víc a nic míň, a v obou režimech úložiště
   stejně. Dřív se v režimu ls posílal záznam z paměti tak, jak byl, a
   v režimu idb se skládal ručně BEZ `rezim` a `rezimN`: export z telefonu
   po migraci do IndexedDB tedy ze všech her dělal při importu KCD2. Že se
   ty dvě větve rozcházejí, nešlo poznat ani z testu, který obě zálohy
   porovnává — byly rozdílné shodně.
   gRezim() proto, že hra uložená před zavedením herních režimů `rezim`
   vůbec nemá a dopočítává se až při čtení. */
function proExport(g, turns){
  return { id: g.id, savedAt: g.savedAt, mode: g.mode, goal: g.goal,
           roundGoal: g.roundGoal || null,
           rezim: gRezim(g), rezimN: g.rezimN || null,
           banked: g.banked || 0,
           turns: turns || [] };
}
/* Plné záznamy pro zálohu. V režimu ls má kola paměť rovnou, v režimu idb
   se dotahují z police detailů. Detaily se čtou kurzorem, ne jedním
   getAll() přes celou polici — při tisících her by to byl jeden obří
   objekt navíc k textu zálohy, který se stejně musí složit. */
function slozHry(hotovo){
  var hry = histAll().sort(function(a, b){ return (a.savedAt || 0) - (b.savedAt || 0); });
  if(rezim !== "idb"){
    hotovo(hry.map(function(g){ return proExport(g, g.turns); }));
    return;
  }
  if(!idb){ hotovo(null); return; }
  var tx;
  try{ tx = idb.transaction(DETAILY, "readonly"); }
  catch(e){ hotovo(null); return; }
  var mapa = {}, kur = tx.objectStore(DETAILY).openCursor();
  kur.onsuccess = function(){
    var c = kur.result;
    if(c){ mapa[c.value.id] = c.value.turns || []; c.continue(); return; }
    hotovo(hry.map(function(g){ return proExport(g, mapa[g.id]); }));
  };
  kur.onerror = function(){ hotovo(null); };
}

/* Čitelný rozpis her, jedna hra po druhé. Vytažené z exportText(), aby ho
   stejnou podobou použil i export Kompletní zálohy (ui/zaloha-plna.js) —
   ta k němu jen připojí rozpis herních režimů. */
function hrySeznamRadky(hry){
  var r = [];
  hry.forEach(function(rec, i){
    r.push((i + 1) + ") " + popisHry(rec));
    r.push("   " + t("exp.souhrn", {
      b: fmt(rec.banked || 0),
      nej: gNejlepsiKolo(rec) === null ? "\u2014" : fmt(gNejlepsiKolo(rec)),
      f: gFarkle(rec) }));
    var run = 0;
    (rec.turns || []).forEach(function(tah, k){
      if(!tah.bust) run += tah.p;
      /* Farkle stojí na konci závorky jako poslední hod, stejně jako
         v tabulce kol; ve sloupci bodů je nula, protože kolo nic nedalo. */
      var text = popisKola(tah);
      var popis = tah.bust ? ((text ? text + " \u00B7 " : "") + t("slovo.farkle")) : text;
      r.push("   " + (k + 1) + ". " + fmt(tah.bust ? 0 : (tah.p || 0)) +
             (popis ? "  (" + popis + ")" : "") + "   " + t("exp.mezisoucet", { b: fmt(run) }));
    });
    r.push("");
  });
  return r;
}
/* V čitelné části exportu nechceme úzkou nezlomitelnou mezeru, kterou fmt()
   sází mezi tisíce — v textovém souboru by se leckde zobrazila jako podivný
   znak. Jedno místo pro všechny čtyři exporty (historie, kompletní záloha,
   záloha režimů, sdílení režimů). Zapsáno escapem, ne znakem: U+202F je ve
   zdroji neviditelná a nástroj na normalizaci bílých znaků by ji tiše
   vyhodil, aniž by si toho kdokoli všiml. */
function bezUzkeMezery(s){ return s.replace(/\u202F/g, " "); }
/* Formát zálohy se nemění: nahoře čitelný přehled, dole řádek #DATA:.
   Soubor z dřívější verze musí jít naimportovat i potom. */
function exportText(hry){
  var r = [t("exp.nadpis"), t("exp.vytvoreno", { kdy: dt(Date.now()), n: hry.length }), ""];
  r = r.concat(hrySeznamRadky(hry));
  return bezUzkeMezery(r.join("\n")) +
         "\n" + t("exp.oddelovac") + "\n" + ZNACKA + JSON.stringify(hry);
}

/* Skládání může chvíli trvat, proto se tlačítko po tu dobu zablokuje. */
function sTextemZalohy(btn, puvodni, hotovo){
  btn.disabled = true;
  btn.textContent = t("zal.pripravuji");
  slozHry(function(hry){
    btn.disabled = false;
    btn.textContent = puvodni;
    if(hry === null){
      zalMsg(t("zal.neslozit"), true);
      return;
    }
    hotovo(exportText(hry));
  });
}
/* Očištěná kopie jednoho záznamu hry z cizích dat, nebo null. Vytažené
   z parseZaloha(), aby ji stejně použil i import Kompletní zálohy
   (ui/zaloha-plna.js) — je to ta samá cizí data, jen v jiném obalu. */
function cistaHra(g){
  if(!g || typeof g !== "object" || !Array.isArray(g.turns)) return null;
  return {
    id: (typeof g.id === "string" && g.id) ? g.id : newId(),
    savedAt: typeof g.savedAt === "number" ? g.savedAt : Date.now(),
    mode: g.mode === "rounds" ? "rounds" : "points",
    goal: g.goal > 0 ? g.goal : 4000,
    roundGoal: g.roundGoal > 0 ? g.roundGoal : null,
    /* Režim může přijít z cizího telefonu, kde takový vlastní režim
       existuje a tady ne — proto se veze i jeho název. Obojí ořezané,
       obojí jde do stránky přes esc(). */
    rezim: (typeof g.rezim === "string" && g.rezim) ? g.rezim.slice(0, NAZEV_MAX) : VYCHOZI_REZIM,
    rezimN: (typeof g.rezimN === "string" && g.rezimN) ? g.rezimN.slice(0, NAZEV_MAX) : null,
    banked: typeof g.banked === "number" ? g.banked : 0,
    /* legitimní popis kola je do stovky znaků, delší je omyl */
    turns: g.turns.map(function(tah){ return kopieKola(tah, 300); })
  };
}
function parseZaloha(text){
  var i = text.lastIndexOf(ZNACKA);
  if(i < 0) return null;
  var radek = text.slice(i + ZNACKA.length).split("\n")[0].trim();
  var d;
  try{ d = JSON.parse(radek); }catch(e){ return null; }
  if(!Array.isArray(d)) return null;
  var out = [];
  d.forEach(function(g){
    var h = cistaHra(g);
    if(h) out.push(h);
  });
  return out;
}
function stahni(nazev, text){
  try{
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = nazev; a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      if(a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
    return true;
  }catch(e){ return false; }
}
/* writeText() vrací příslib; když ho prohlížeč odmítne (chybí oprávnění,
   stránka není zaostřená, iOS mimo gesto), nesmíme hlásit úspěch. Výsledek
   proto chodí callbackem. Propad na execCommand už běží mimo uživatelské
   gesto a v části prohlížečů selže taky — pak aspoň hláška nelže. */
function doSchranky(text, hotovo){
  function nouzovka(){
    try{
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      hotovo(!!ok);
    }catch(e){ hotovo(false); }
  }
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ hotovo(true); }, nouzovka);
      return;
    }
  }catch(e){}
  nouzovka();
}

var elZalMsg=$("zalmsg"), elImpBox=$("impbox"), elImpInfo=$("impinfo"), elImpFile=$("impfile");
var elPasteBox=$("pastebox"), elPasteArea=$("pastearea");
var nactene = null, repTimer = null;
function zalMsg(text, spatne){
  elZalMsg.hidden = !text;
  elZalMsg.textContent = text || "";
  elZalMsg.classList.toggle("bad", !!spatne);
}
function novychZ(list){
  var mame = {};
  histAll().forEach(function(g){ mame[g.id] = true; });
  return list.filter(function(g){ return !mame[g.id]; });
}
function zavriImport(){
  nactene = null;
  elImpBox.hidden = true;
  clearTimeout(repTimer); repTimer = null;
  $("imprep").textContent = t("nast.nahraditvse");
}
function zavriVlozeni(){
  elPasteBox.hidden = true;
  elPasteArea.value = "";
}
function renderZaloha(){
  var prazdno = histAll().length === 0;
  $("expbtn").disabled = prazdno;
  $("copybtn").disabled = prazdno;
  zalMsg("");
  zavriImport();
  zavriVlozeni();
  resetMisto();
}

function prijmiZalohu(text, zdroj){
  var list = parseZaloha(String(text || ""));
  if(!list){
    zavriImport();
    zalMsg(t("zal.nerozumim." + zdroj), true);
    return;
  }
  if(!list.length){
    zavriImport();
    zalMsg(t("zal.prazdno." + zdroj), true);
    return;
  }
  nactene = list;
  var nove = novychZ(list).length;
  elImpInfo.textContent = t("zal.info." + zdroj, {
    her: tn("slovo.hra", list.length), nove: tn("slovo.nova", nove) });
  $("impadd").disabled = nove === 0;
  $("impadd").textContent = nove ? t("zal.pridatn", { n: nove }) : t("zal.nenicopridat");
  elImpBox.hidden = false;
  zalMsg("");
}











/* po zápisu se mění jen zapnutost tlačítek, hlášku necháváme na obrazovce */
function renderZaloha2(){
  var prazdno = histAll().length === 0;
  $("expbtn").disabled = prazdno;
  $("copybtn").disabled = prazdno;
}

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initZaloha(){
  $("expbtn").addEventListener("click", function(){
    sTextemZalohy($("expbtn"), t("nast.exp.btn"), function(text){
      var ok = stahni("farkle-history-" + datumProNazev() + ".txt", text);
      zalMsg(t(ok ? "zal.ukladase" : "zal.stazenineslo"), !ok);
    });
  });

  $("copybtn").addEventListener("click", function(){
    sTextemZalohy($("copybtn"), t("nast.kop.btn"), function(text){
      doSchranky(text, function(ok){
        zalMsg(t(ok ? "zal.veschrance" : "zal.schrankaneslo"), !ok);
      });
    });
  });

  $("impbtn").addEventListener("click", function(){
    zalMsg("");
    elImpFile.value = "";
    elImpFile.click();
  });

  elImpFile.addEventListener("change", function(){
    var f = elImpFile.files && elImpFile.files[0];
    if(!f) return;
    var fr = new FileReader();
    fr.onload = function(){
      zavriVlozeni();
      prijmiZalohu(fr.result, "soubor");
    };
    fr.onerror = function(){
      zavriImport();
      zalMsg(t("zal.souborneslo"), true);
    };
    fr.readAsText(f, "utf-8");
  });

  $("mistobtn").addEventListener("click", prepniMisto);

  $("pastebtn").addEventListener("click", function(){
    zalMsg("");
    zavriImport();
    elPasteBox.hidden = false;
    elPasteArea.focus();
  });

  $("pastecancel").addEventListener("click", function(){
    zavriImport();
    zavriVlozeni();
    zalMsg("");
  });

  $("pasteload").addEventListener("click", function(){
    var text = elPasteArea.value;
    if(!text.trim()){
      zalMsg(t("zal.poleprazdne"), true);
      return;
    }
    prijmiZalohu(text, "text");
  });

  $("impadd").addEventListener("click", function(){
    if(!nactene) return;
    var nove = novychZ(nactene);
    var pocet = nove.length;
    histWrite(histAll().concat(nove.map(proHistorii)), function(ok){
      if(!ok){
        zalMsg(t(klicSelhani("chyba.mistoulozit")) + ".", true);
        return;
      }
      zavriImport();
      zavriVlozeni();
      zalMsg(tn("zal.pridano", pocet));
      renderP2(); renderZaloha2();
    }, nove);
  });

  $("imprep").addEventListener("click", function(){
    if(!nactene) return;
    var b = $("imprep");
    if(!repTimer){
      b.textContent = t("zal.opravdunahradit");
      repTimer = setTimeout(function(){ repTimer = null; b.textContent = t("nast.nahraditvse"); }, 5000);
      return;
    }
    clearTimeout(repTimer); repTimer = null;
    var pocet = nactene.length;
    histWrite(nactene.map(proHistorii), function(ok){
      if(!ok){
        zalMsg(t(klicSelhani("chyba.mistoulozit")) + ".", true);
        return;
      }
      /* rozehraná hra se mohla vázat na záznam, který import smetl —
         kdeZaznam() to pozná sám, stačí překreslit */
      render();
      zavriImport();
      zavriVlozeni();
      zalMsg(t("zal.nahrazeno", { her: tn("slovo.hra", pocet) }));
      renderP2(); renderZaloha2();
    }, nactene);
  });
}

export { ZNACKA, bezUzkeMezery, cistaHra, datumCasProNazev, datumProNazev, doSchranky, elImpBox, elImpFile, elImpInfo, elPasteArea, elPasteBox, elZalMsg, exportText, hrySeznamRadky, nactene, novychZ, parseZaloha, prijmiZalohu, proExport, renderZaloha, renderZaloha2, repTimer, sTextemZalohy, slozHry, stahni, zalMsg, zavriImport, zavriVlozeni };
