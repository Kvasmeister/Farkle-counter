/* Sdílení jednotlivých herních režimů: výběr a export, import s kontrolou
   duplicit. Samostatný systém od zálohy (ui/zaloha-plna.js) — záloha bere
   všechny režimy najednou, tohle jen ten výběr, který hráč pošle dál.

   Sdílet a Importovat jsou dvě tlačítka v patičce okna (#rezakcpruh,
   viz okno-nastaveni.html a nastaveni.css u .rizpruh pro důvod, proč
   patička, ne sticky prvek uvnitř .modalbody). Výběr, které režimy jít
   sdílet, se neděje v samostatném seznamu — přímo v hlavním #rezrows:
   zapniVyberRezimu() přepne rezRadek() na jedno výběrové tlačítko na
   řádek (viz ui/nastaveni-rezimy.js), lišta dole se zároveň přepne na
   Uložit/Kopírovat/Zrušit. Dokončení i zrušení výběru vrátí obojí zpátky.

   Závisí na: pravidla/rezimy, spolecne, text/format, ui/zaloha (stavební
              bloky), ui/nastaveni-rezimy — renderRezimy (obnova seznamu po
              importu) a čtveřice vyberRezimuZap/vybraneRezimy/
              zapniVyberRezimu/vypniVyberRezimu, která tvoří stav výběru.
              Ten stav bydlí v nastaveni-rezimy.js, ne tady: ten modul kreslí
              řádky seznamu, takže o výběru musí vědět přímo, a obrácený
              import (nastaveni-rezimy.js by importoval odsud) by udělal
              cyklus. Tenhle modul jen řídí, kdy je výběr zapnutý.
   Sahá na: DOM, schránka, soubory

   Vlastní marker #SDILENIREZIMU:, mimo dosah uzamčeného #DATA: i mimo obě
   zálohy — je to jiný účel (výběr, ne všechno) a nesdílí s nimi ani id:
   příjemce vždy přidělí nové (novyIdRezimu()), protože sdílený režim se má
   stát NOVÝM vlastním režimem, ne přepsat existující se stejným id.

   Import kontroluje dvě věci, v tomhle pořadí: nejdřív funkční shodu
   (stejnyRezim porovná celé nastavení bez ohledu na jméno) — sedne-li,
   kandidát se zahodí, protože by šlo o viditelný duplikát. Teprve pak jméno:
   koliduje-li jen jméno, kandidát se přejmenuje, ne zahodí. Obě kontroly
   běží i proti kandidátům už přijatým ve stejné dávce, ne jen proti
   REZIMY.sez — jinak by dvě totožné položky v jednom souboru prošly obě. */
import { t, tn } from "../jazyky/jadro.js";
import {
  PRESET_REZ_PORADI,
  REZIMY,
  REZIMY_MAX,
  VYCHOZI_REZIM,
  cistyRezim,
  nazevRezimu,
  novyIdRezimu,
  stejnyRezim,
  ulozRezimy,
  venRezimSdileny
} from "../pravidla/rezimy.js";
import { NAZEV_MAX, newId } from "../spolecne.js";
import { dt, dtDen } from "../text/format.js";
import {
  renderRezimy,
  vybraneRezimy,
  vyberRezimuZap,
  zapniVyberRezimu,
  vypniVyberRezimu
} from "./nastaveni-rezimy.js";
import { $ } from "./prvky.js";
import { datumProNazev, doSchranky, stahni } from "./zaloha.js";

var ZNACKA_SDIL = "#SDILENIREZIMU:";

var elAkcNormal = $("rezakcnormal"), elAkcVyber = $("rezakcvyber"), elAkcMsg = $("rezakczprava");
var elImpBox = $("rezimpbox"), elImpFile = $("rezimpfile");
var elImpPasteBox = $("rezimppastebox"), elImpPasteArea = $("rezimppastearea");
var elImpPreview = $("rezimppreview"), elImpPreviewRows = $("rezimppreviewrows"), elImpMsg = $("rezimpzprava");

var nacteneKandidati = null;

function zalMsgSdil(text, spatne){
  elAkcMsg.hidden = !text;
  elAkcMsg.textContent = text || "";
  elAkcMsg.classList.toggle("bad", !!spatne);
}
function zalMsgImp(text, spatne){
  elImpMsg.hidden = !text;
  elImpMsg.textContent = text || "";
  elImpMsg.classList.toggle("bad", !!spatne);
}

/* ---------- Sdílet ---------- */
/* Který ze dvou řádků lišty je vidět. Import a výběr ke sdílení se
   vzájemně vylučují (viz posluchače níž), takže tahle dvojice nikdy
   nepotřebuje třetí, „oba schované" stav mimo renderSdileniRezimu(). */
function prekresliBar(){
  elAkcNormal.hidden = vyberRezimuZap;
  elAkcVyber.hidden = !vyberRezimuZap;
}
function sestavVyber(){
  return REZIMY.sez.filter(function(rez){ return vybraneRezimy[rez.id]; });
}
function exportTextSdileni(sez){
  var r = [t("sdil.nadpis"), t("sdil.vytvoreno", { kdy: dt(Date.now()), n: tn("slovo.rezim", sez.length) }), ""];
  sez.forEach(function(rez, i){ r.push((i + 1) + ") " + nazevRezimu(rez)); });
  return r.join("\n") +
         "\n" + t("exp.oddelovac") + "\n" + ZNACKA_SDIL + JSON.stringify(sez.map(venRezimSdileny));
}

/* ---------- Importovat ---------- */
/* Zpracuje syrová data z JSONu na výsledky s rozhodnutím pro každou
   položku — bez vedlejších efektů na REZIMY, aby šel výsledek nejdřív
   ukázat v náhledu a teprve na potvrzení promítnout. */
function zpracujKandidaty(pole){
  var vysledky = [], prijate = [];
  var kapacita = PRESET_REZ_PORADI.length + REZIMY_MAX - REZIMY.sez.length;
  if(kapacita < 0) kapacita = 0;
  pole.forEach(function(x){
    var kandidat = cistyRezim(x, novyIdRezimu(), VYCHOZI_REZIM);
    kandidat.v.forEach(function(k){ k.id = newId(); });
    var srovnaniS = REZIMY.sez.concat(prijate);
    var shodny = null;
    for(var i = 0; i < srovnaniS.length; i++){
      if(stejnyRezim(kandidat, srovnaniS[i])){ shodny = srovnaniS[i]; break; }
    }
    if(shodny){
      vysledky.push({ rez: kandidat, prijme: false, duvod: t("rezim.imp.duplicitni", { n: nazevRezimu(shodny) }) });
      return;
    }
    if(prijate.length >= kapacita){
      vysledky.push({ rez: kandidat, prijme: false, duvod: t("rezim.strop", { n: REZIMY_MAX }) });
      return;
    }
    var puvodniNazev = nazevRezimu(kandidat);
    var koliduje = srovnaniS.some(function(r){ return nazevRezimu(r) === puvodniNazev; });
    var prejmenovano = false;
    if(koliduje){
      /* Ořezat se smí jen původní jméno, nikdy přípona: uřízlé "(IMPORT…"
         bez závorky na konci by vypadalo jako chyba, ne jako rozlišení. */
      var pripona = " (IMPORT - " + dtDen(Date.now()) + ")";
      kandidat.nazev = puvodniNazev.slice(0, Math.max(0, NAZEV_MAX - pripona.length)) + pripona;
      prejmenovano = true;
    }
    prijate.push(kandidat);
    vysledky.push({ rez: kandidat, prijme: true, prejmenovano: prejmenovano });
  });
  return vysledky;
}
function renderNahled(vysledky){
  elImpPreviewRows.textContent = "";
  vysledky.forEach(function(v){
    var row = document.createElement("div");
    row.className = "msg" + (v.prijme ? "" : " bad");
    var text = nazevRezimu(v.rez);
    if(v.prijme && v.prejmenovano) text += " — " + t("rezim.imp.prejmenovano");
    if(!v.prijme) text += " — " + v.duvod;
    row.textContent = text;
    elImpPreviewRows.appendChild(row);
  });
  $("rezimppotvrdit").disabled = !vysledky.some(function(v){ return v.prijme; });
}
function zpracujText(text, zdroj){
  var i = String(text || "").lastIndexOf(ZNACKA_SDIL);
  if(i < 0){ zalMsgImp(t("zal.nerozumim." + zdroj), true); return; }
  var radek = text.slice(i + ZNACKA_SDIL.length).split("\n")[0].trim();
  var d;
  try{ d = JSON.parse(radek); }catch(e){ d = null; }
  if(!Array.isArray(d) || !d.length){ zalMsgImp(t("zal.prazdno." + zdroj), true); return; }
  nacteneKandidati = zpracujKandidaty(d);
  renderNahled(nacteneKandidati);
  zavriImpVlozeni();
  elImpPreview.hidden = false;
  zalMsgImp("");
}
function zavriImpVlozeni(){
  elImpPasteBox.hidden = true;
  elImpPasteArea.value = "";
}
function zavriImpNahled(){
  elImpPreview.hidden = true;
  nacteneKandidati = null;
}
function zavriImp(){
  elImpBox.hidden = true;
  zavriImpVlozeni();
  zavriImpNahled();
  $("rezakcimp").classList.remove("on");
}

function renderSdileniRezimu(){
  if(vyberRezimuZap) vypniVyberRezimu();
  zalMsgSdil("");
  prekresliBar();
  zalMsgImp("");
  zavriImp();
}

/* Vedlejší efekty. Volá je hlavni.js na místě, kde je vidět celé pořadí startu. */
export function initSdileniRezimu(){
  prekresliBar();

  $("rezakcsdil").addEventListener("click", function(){
    zavriImp();   // vzájemné vyloučení — obě akce sdílejí dvou-/tříslotovou lištu
    zapniVyberRezimu();
    zalMsgSdil("");
    prekresliBar();
  });
  $("rezakczrusit").addEventListener("click", function(){
    vypniVyberRezimu();
    zalMsgSdil("");
    prekresliBar();
  });
  $("rezakcstahni").addEventListener("click", function(){
    var sez = sestavVyber();
    if(!sez.length){ zalMsgSdil(t("rezim.sdil.vyber"), true); return; }
    var text = exportTextSdileni(sez);
    var ok = stahni("farkle-rezimy-sdileni-" + datumProNazev() + ".txt", text);
    zalMsgSdil(t(ok ? "zal.ukladase" : "zal.stazenineslo"), !ok);
    if(ok){ vypniVyberRezimu(); prekresliBar(); }
  });
  $("rezakckopie").addEventListener("click", function(){
    var sez = sestavVyber();
    if(!sez.length){ zalMsgSdil(t("rezim.sdil.vyber"), true); return; }
    var text = exportTextSdileni(sez);
    doSchranky(text, function(ok){
      zalMsgSdil(t(ok ? "zal.veschrance" : "zal.schrankaneslo"), !ok);
      if(ok){ vypniVyberRezimu(); prekresliBar(); }
    });
  });

  /* Přepínač jako #reznadinfo v nastaveni-rezimy.js: druhé kliknutí zavře,
     co první otevřelo. Dřív tenhle knoflík jen otevíral a zavřít šlo jen
     vnitřním tlačítkem Zrušit. */
  $("rezakcimp").addEventListener("click", function(){
    if(elImpBox.hidden){
      if(vyberRezimuZap){ vypniVyberRezimu(); prekresliBar(); }   // vzájemné vyloučení
      zalMsgImp("");
      elImpBox.hidden = false;
      $("rezakcimp").classList.add("on");
    } else {
      zavriImp();
    }
  });
  $("rezimpfilebtn").addEventListener("click", function(){
    zalMsgImp("");
    elImpFile.value = "";
    elImpFile.click();
  });
  elImpFile.addEventListener("change", function(){
    var f = elImpFile.files && elImpFile.files[0];
    if(!f) return;
    var fr = new FileReader();
    fr.onload = function(){ zpracujText(fr.result, "soubor"); };
    fr.onerror = function(){ zalMsgImp(t("zal.souborneslo"), true); };
    fr.readAsText(f, "utf-8");
  });
  $("rezimppastebtn").addEventListener("click", function(){
    zalMsgImp("");
    elImpPasteBox.hidden = false;
    elImpPasteArea.focus();
  });
  $("rezimppastecancel").addEventListener("click", function(){
    zavriImpVlozeni();
    zalMsgImp("");
  });
  $("rezimppasteload").addEventListener("click", function(){
    var text = elImpPasteArea.value;
    if(!text.trim()){ zalMsgImp(t("zal.poleprazdne"), true); return; }
    zpracujText(text, "text");
  });
  $("rezimpzrusit").addEventListener("click", zavriImp);
  $("rezimppotvrdit").addEventListener("click", function(){
    if(!nacteneKandidati) return;
    var pridano = 0;
    nacteneKandidati.forEach(function(v){
      if(v.prijme){ REZIMY.sez.push(v.rez); pridano++; }
    });
    if(pridano) ulozRezimy();
    zavriImp();
    renderRezimy();
    zalMsgImp(pridano ? tn("rezim.pridano", pridano) : t("rezim.imp.nic"), !pridano);
  });
}

export { renderSdileniRezimu };
