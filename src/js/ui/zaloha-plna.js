/* Kompletní záloha (historie + herní režimy) a Záloha herních režimů.

   Závisí na: pravidla/rezimy, stav, text, ui/zaloha (stavební bloky), ui/misto
   Sahá na: DOM, schránka, soubory

   Dva vlastní formáty, oba mimo dosah uzamčeného #DATA: (viz hlavička
   ui/zaloha.js) — Kompletní záloha nese hry i režimy pohromadě, Záloha
   herních režimů jen `{akt,p,v}` přesně v tvaru farkle-rezimy-v1. Obě
   používají stejné stavební bloky jako Záloha historie (marker + čitelný
   text + JSON, stahni/doSchranky, dvoufázové „Nahradit vše“), jen s jinou
   náplní — dva takřka duplicitní soubory by nic nepřinesly, proto obě
   zálohy žijí v jednom modulu.

   Nahrazení herních režimů běžící hru nezamyká, ale ROZBILO by ji: `S.rezim`
   neexistuje, aktivní pravidla se čtou přes REZIMY.akt za běhu, takže by se
   uprostřed kola tiše přepočítaly podle jiné tabulky. Proto tlačítko
   „Nahradit vše“ čeká na gameEmpty() — stejně jako nová hra. */
import { t, tn } from "../jazyky/jadro.js";
import {
  PRESET_REZ_PORADI,
  REZIMY,
  REZIMY_MAX,
  nazevRezimu,
  odchylkyRezimu,
  rezimyZObjektu,
  slozRezimy,
  ulozRezimy
} from "../pravidla/rezimy.js";
import { histAll, histWrite, klicSelhani, prepocitejHodove, proHistorii } from "../stav/historie.js";
import { gameEmpty } from "../stav/stav.js";
import { dt } from "../text/format.js";
import { $ } from "./prvky.js";
import { renderRezimy } from "./nastaveni-rezimy.js";
import { renderP2 } from "./statistiky-stranka.js";
import { render } from "./vykresleni.js";
import {
  bezUzkeMezery,
  cistaHra,
  datumProNazev,
  doSchranky,
  hrySeznamRadky,
  novychZ,
  slozHry,
  stahni
} from "./zaloha.js";

var ZNACKA_PLNA = "#PLNAZALOHA:";
var ZNACKA_REZ = "#REZIMYZALOHA:";

/* Jmenný seznam režimů pro čitelnou část exportu. */
function rezimySeznamRadky(sez){
  return sez.map(function(rez, i){ return (i + 1) + ") " + nazevRezimu(rez); });
}
/* Nic k zálohování neznamená doslova nic: ani vlastní režim, ani odchylku
   přednastaveného. Prázdné pole vlastních spolu s nedotčenými presety by
   jinak prošlo jako „záloha“, která ve skutečnosti nic nenese. */
function rezimyPrazdne(sez){
  return !sez.some(function(r){ return r.vlastni || odchylkyRezimu(r) !== null; });
}
function novychRezimu(sez){
  var mame = {};
  REZIMY.sez.forEach(function(r){ mame[r.id] = true; });
  return sez.filter(function(r){ return r.vlastni && !mame[r.id]; });
}
/* Jen přidá — diffy presetů a REZIMY.akt nechává být, stejná úvaha jako
   u „Přidat nové“ v Záloze historie: nedotčené se nemá co rozbít.

   Přírůstek režimů může odemknout hodové statistiky u her, které se
   naimportovaly dřív, než jejich vlastní režim existoval — bez rozboru kol
   podle pravidel té hry nejde spočítat ani nejlepší, ani průměrný hod.
   Proto po každém přidání běží prepocitejHodove(); když není co spravit,
   nestojí to nic (dotčené souhrny se poznají podle nejlepsihod === null). */
function pridatRezimy(sez){
  var nove = novychRezimu(sez);
  var volno = PRESET_REZ_PORADI.length + REZIMY_MAX - REZIMY.sez.length;
  if(volno < 0) volno = 0;
  nove = nove.slice(0, volno);
  nove.forEach(function(r){ REZIMY.sez.push(r); });
  if(nove.length){ ulozRezimy(); prepocitejHodove(function(n){ if(n) renderP2(); }); }
  return nove.length;
}
function nahraditRezimy(vysledek){
  REZIMY.sez = vysledek.sez;
  REZIMY.akt = vysledek.akt;
  ulozRezimy();
  prepocitejHodove(function(n){ if(n) renderP2(); });
}

function exportTextPlna(hry, sez, rezimyObj){
  var r = [t("expplna.nadpis"), t("expplna.vytvoreno", {
    kdy: dt(Date.now()), her: tn("slovo.hra", hry.length), rez: tn("slovo.rezim", sez.length)
  }), ""];
  r = r.concat(hrySeznamRadky(hry));
  r = r.concat(rezimySeznamRadky(sez));
  return bezUzkeMezery(r.join("\n")) +
         "\n" + t("exp.oddelovac") + "\n" + ZNACKA_PLNA + JSON.stringify({ hry: hry, rezimy: rezimyObj });
}
function exportTextRez(sez, rezimyObj){
  var r = [t("exprez.nadpis"), t("exprez.vytvoreno", { kdy: dt(Date.now()), n: tn("slovo.rezim", sez.length) }), ""];
  r = r.concat(rezimySeznamRadky(sez));
  return bezUzkeMezery(r.join("\n")) +
         "\n" + t("exp.oddelovac") + "\n" + ZNACKA_REZ + JSON.stringify(rezimyObj);
}
function parsePlnaZaloha(text){
  var i = text.lastIndexOf(ZNACKA_PLNA);
  if(i < 0) return null;
  var radek = text.slice(i + ZNACKA_PLNA.length).split("\n")[0].trim();
  var d;
  try{ d = JSON.parse(radek); }catch(e){ return null; }
  if(!d || typeof d !== "object" || !Array.isArray(d.hry)) return null;
  var hry = [];
  d.hry.forEach(function(g){ var h = cistaHra(g); if(h) hry.push(h); });
  return { hry: hry, rezimy: rezimyZObjektu(d.rezimy && typeof d.rezimy === "object" ? d.rezimy : null) };
}
function parseRezZaloha(text){
  var i = text.lastIndexOf(ZNACKA_REZ);
  if(i < 0) return null;
  var radek = text.slice(i + ZNACKA_REZ.length).split("\n")[0].trim();
  var d;
  try{ d = JSON.parse(radek); }catch(e){ return null; }
  if(!d || typeof d !== "object") return null;
  return rezimyZObjektu(d);
}

/* ---------- Kompletní záloha ---------- */
var elZalMsgPlna = $("zalmsgplna"), elImpBoxPlna = $("impboxplna"), elImpInfoPlna = $("impinfoplna"), elImpFilePlna = $("impfileplna");
var elPasteBoxPlna = $("pasteboxplna"), elPasteAreaPlna = $("pasteareaplna");
var nactenoPlna = null, repTimerPlna = null;

function zalMsgPlna(text, spatne){
  elZalMsgPlna.hidden = !text;
  elZalMsgPlna.textContent = text || "";
  elZalMsgPlna.classList.toggle("bad", !!spatne);
}
function zavriImportPlna(){
  nactenoPlna = null;
  elImpBoxPlna.hidden = true;
  clearTimeout(repTimerPlna); repTimerPlna = null;
  $("imprepplna").textContent = t("nast.nahraditvse");
}
function zavriVlozeniPlna(){
  elPasteBoxPlna.hidden = true;
  elPasteAreaPlna.value = "";
}
function renderZalohaPlna(){
  zalMsgPlna("");
  zavriImportPlna();
  zavriVlozeniPlna();
}
function prijmiPlnaZaloha(text, zdroj){
  var vysledek = parsePlnaZaloha(String(text || ""));
  if(!vysledek){
    zavriImportPlna();
    zalMsgPlna(t("zal.nerozumim." + zdroj), true);
    return;
  }
  if(!vysledek.hry.length && rezimyPrazdne(vysledek.rezimy.sez)){
    zavriImportPlna();
    zalMsgPlna(t("zal.prazdno." + zdroj), true);
    return;
  }
  nactenoPlna = vysledek;
  var noveHer = novychZ(vysledek.hry).length;
  var noveRez = novychRezimu(vysledek.rezimy.sez).length;
  var zamek = !gameEmpty();
  elImpInfoPlna.textContent = t("zalplna.info." + zdroj, {
    her: tn("slovo.hra", vysledek.hry.length), rez: tn("slovo.rezim", vysledek.rezimy.sez.length)
  }) + (zamek ? " " + t("zal.rezimyzamceno") : "");
  var celkemNovych = noveHer + noveRez;
  $("impaddplna").disabled = celkemNovych === 0;
  $("impaddplna").textContent = celkemNovych ? t("zal.pridatn", { n: celkemNovych }) : t("zal.nenicopridat");
  $("imprepplna").disabled = zamek;
  elImpBoxPlna.hidden = false;
  zalMsgPlna("");
}

/* ---------- Záloha herních režimů ---------- */
var elZalMsgRez = $("zalmsgrez"), elImpBoxRez = $("impboxrez"), elImpInfoRez = $("impinforez"), elImpFileRez = $("impfilerez");
var elPasteBoxRez = $("pasteboxrez"), elPasteAreaRez = $("pasteareazrez");
var nactenoRez = null, repTimerRez = null;

function zalMsgRez(text, spatne){
  elZalMsgRez.hidden = !text;
  elZalMsgRez.textContent = text || "";
  elZalMsgRez.classList.toggle("bad", !!spatne);
}
function zavriImportRez(){
  nactenoRez = null;
  elImpBoxRez.hidden = true;
  clearTimeout(repTimerRez); repTimerRez = null;
  $("imprepzrez").textContent = t("nast.nahraditvse");
}
function zavriVlozeniRez(){
  elPasteBoxRez.hidden = true;
  elPasteAreaRez.value = "";
}
function renderZalohaRez(){
  zalMsgRez("");
  zavriImportRez();
  zavriVlozeniRez();
}
function prijmiRezZaloha(text, zdroj){
  var vysledek = parseRezZaloha(String(text || ""));
  if(!vysledek){
    zavriImportRez();
    zalMsgRez(t("zal.nerozumim." + zdroj), true);
    return;
  }
  if(rezimyPrazdne(vysledek.sez)){
    zavriImportRez();
    zalMsgRez(t("zal.prazdno." + zdroj), true);
    return;
  }
  nactenoRez = vysledek;
  var nove = novychRezimu(vysledek.sez).length;
  var zamek = !gameEmpty();
  elImpInfoRez.textContent = t("zalrez.info." + zdroj, {
    rez: tn("slovo.rezim", vysledek.sez.length)
  }) + (zamek ? " " + t("zal.rezimyzamceno") : "");
  $("impaddrez").disabled = nove === 0;
  $("impaddrez").textContent = nove ? t("zal.pridatn", { n: nove }) : t("zal.nenicopridat");
  $("imprepzrez").disabled = zamek;
  elImpBoxRez.hidden = false;
  zalMsgRez("");
}

/* Vedlejší efekty. Volá je hlavni.js na místě, kde je vidět celé pořadí startu. */
export function initZalohaPlna(){
  /* ---------- Kompletní záloha ---------- */
  $("expbtnplna").addEventListener("click", function(){
    var btn = $("expbtnplna"), puvodni = t("nast.expplna.btn");
    btn.disabled = true; btn.textContent = t("zal.pripravuji");
    slozHry(function(hry){
      btn.disabled = false; btn.textContent = puvodni;
      if(hry === null){ zalMsgPlna(t("zal.neslozit"), true); return; }
      var text = exportTextPlna(hry, REZIMY.sez, slozRezimy());
      var ok = stahni("farkle-zaloha-" + datumProNazev() + ".txt", text);
      zalMsgPlna(t(ok ? "zal.ukladase" : "zal.stazenineslo"), !ok);
    });
  });
  $("copybtnplna").addEventListener("click", function(){
    var btn = $("copybtnplna"), puvodni = t("nast.kopplna.btn");
    btn.disabled = true; btn.textContent = t("zal.pripravuji");
    slozHry(function(hry){
      btn.disabled = false; btn.textContent = puvodni;
      if(hry === null){ zalMsgPlna(t("zal.neslozit"), true); return; }
      var text = exportTextPlna(hry, REZIMY.sez, slozRezimy());
      doSchranky(text, function(ok){ zalMsgPlna(t(ok ? "zal.veschrance" : "zal.schrankaneslo"), !ok); });
    });
  });
  $("impbtnplna").addEventListener("click", function(){
    zalMsgPlna("");
    elImpFilePlna.value = "";
    elImpFilePlna.click();
  });
  elImpFilePlna.addEventListener("change", function(){
    var f = elImpFilePlna.files && elImpFilePlna.files[0];
    if(!f) return;
    var fr = new FileReader();
    fr.onload = function(){ zavriVlozeniPlna(); prijmiPlnaZaloha(fr.result, "soubor"); };
    fr.onerror = function(){ zavriImportPlna(); zalMsgPlna(t("zal.souborneslo"), true); };
    fr.readAsText(f, "utf-8");
  });
  $("pastebtnplna").addEventListener("click", function(){
    zalMsgPlna("");
    zavriImportPlna();
    elPasteBoxPlna.hidden = false;
    elPasteAreaPlna.focus();
  });
  $("pastecancelplna").addEventListener("click", function(){
    zavriImportPlna();
    zavriVlozeniPlna();
    zalMsgPlna("");
  });
  $("pasteloadplna").addEventListener("click", function(){
    var text = elPasteAreaPlna.value;
    if(!text.trim()){ zalMsgPlna(t("zal.poleprazdne"), true); return; }
    prijmiPlnaZaloha(text, "text");
  });
  $("impaddplna").addEventListener("click", function(){
    if(!nactenoPlna) return;
    var noveHry = novychZ(nactenoPlna.hry);
    histWrite(histAll().concat(noveHry.map(proHistorii)), function(ok){
      if(!ok){ zalMsgPlna(t(klicSelhani("chyba.mistoulozit")) + ".", true); return; }
      var noveRez = pridatRezimy(nactenoPlna.rezimy.sez);
      zavriImportPlna();
      zavriVlozeniPlna();
      zalMsgPlna(t("zalplna.pridano", { her: tn("slovo.hra", noveHry.length), rez: tn("slovo.rezim", noveRez) }));
      render(); renderP2(); renderRezimy();
    }, noveHry);
  });
  $("imprepplna").addEventListener("click", function(){
    if(!nactenoPlna || !gameEmpty()) return;
    var b = $("imprepplna");
    if(!repTimerPlna){
      b.textContent = t("zal.opravdunahradit");
      repTimerPlna = setTimeout(function(){ repTimerPlna = null; b.textContent = t("nast.nahraditvse"); }, 5000);
      return;
    }
    clearTimeout(repTimerPlna); repTimerPlna = null;
    if(!gameEmpty()) return;
    var pocetHer = nactenoPlna.hry.length, pocetRez = nactenoPlna.rezimy.sez.length;
    histWrite(nactenoPlna.hry.map(proHistorii), function(ok){
      if(!ok){ zalMsgPlna(t(klicSelhani("chyba.mistoulozit")) + ".", true); return; }
      nahraditRezimy(nactenoPlna.rezimy);
      render();
      zavriImportPlna();
      zavriVlozeniPlna();
      zalMsgPlna(t("zalplna.nahrazeno", { her: tn("slovo.hra", pocetHer), rez: tn("slovo.rezim", pocetRez) }));
      renderP2(); renderRezimy();
    }, nactenoPlna.hry);
  });

  /* ---------- Záloha herních režimů ---------- */
  $("expbtnrez").addEventListener("click", function(){
    var text = exportTextRez(REZIMY.sez, slozRezimy());
    var ok = stahni("farkle-rezimy-" + datumProNazev() + ".txt", text);
    zalMsgRez(t(ok ? "zal.ukladase" : "zal.stazenineslo"), !ok);
  });
  $("copybtnrez").addEventListener("click", function(){
    var text = exportTextRez(REZIMY.sez, slozRezimy());
    doSchranky(text, function(ok){ zalMsgRez(t(ok ? "zal.veschrance" : "zal.schrankaneslo"), !ok); });
  });
  $("impbtnrez").addEventListener("click", function(){
    zalMsgRez("");
    elImpFileRez.value = "";
    elImpFileRez.click();
  });
  elImpFileRez.addEventListener("change", function(){
    var f = elImpFileRez.files && elImpFileRez.files[0];
    if(!f) return;
    var fr = new FileReader();
    fr.onload = function(){ zavriVlozeniRez(); prijmiRezZaloha(fr.result, "soubor"); };
    fr.onerror = function(){ zavriImportRez(); zalMsgRez(t("zal.souborneslo"), true); };
    fr.readAsText(f, "utf-8");
  });
  $("pastebtnrez").addEventListener("click", function(){
    zalMsgRez("");
    zavriImportRez();
    elPasteBoxRez.hidden = false;
    elPasteAreaRez.focus();
  });
  $("pastecancelrez").addEventListener("click", function(){
    zavriImportRez();
    zavriVlozeniRez();
    zalMsgRez("");
  });
  $("pasteloadrez").addEventListener("click", function(){
    var text = elPasteAreaRez.value;
    if(!text.trim()){ zalMsgRez(t("zal.poleprazdne"), true); return; }
    prijmiRezZaloha(text, "text");
  });
  $("impaddrez").addEventListener("click", function(){
    if(!nactenoRez) return;
    var pocet = pridatRezimy(nactenoRez.sez);
    zavriImportRez();
    zavriVlozeniRez();
    zalMsgRez(pocet ? tn("rezim.pridano", pocet) : t("zal.nenicopridat"));
    renderRezimy();
  });
  $("imprepzrez").addEventListener("click", function(){
    if(!nactenoRez || !gameEmpty()) return;
    var b = $("imprepzrez");
    if(!repTimerRez){
      b.textContent = t("zal.opravdunahradit");
      repTimerRez = setTimeout(function(){ repTimerRez = null; b.textContent = t("nast.nahraditvse"); }, 5000);
      return;
    }
    clearTimeout(repTimerRez); repTimerRez = null;
    if(!gameEmpty()) return;
    var pocet = nactenoRez.sez.length;
    nahraditRezimy(nactenoRez);
    render();
    zavriImportRez();
    zavriVlozeniRez();
    zalMsgRez(t("zalrez.nahrazeno", { rez: tn("slovo.rezim", pocet) }));
    renderRezimy();
  });
}

export { renderZalohaPlna, renderZalohaRez };
