/* Sdílení jednotlivých herních režimů: výběr a export, import s kontrolou
   duplicit. Samostatný systém od zálohy (ui/zaloha-plna.js) — záloha bere
   všechny režimy najednou, tohle jen ten výběr, který hráč pošle dál.

   Závisí na: pravidla/rezimy, spolecne, text/format, ui/zaloha (stavební
              bloky), ui/nastaveni-rezimy (jen renderRezimy, kvůli obnově
              seznamu po importu)
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
import { renderRezimy } from "./nastaveni-rezimy.js";
import { $ } from "./prvky.js";
import { datumProNazev, doSchranky, stahni } from "./zaloha.js";

var ZNACKA_SDIL = "#SDILENIREZIMU:";

var elSdilBox = $("rezsdilbox"), elSdilRows = $("rezsdilrows"), elSdilMsg = $("rezsdilzprava");
var elImpBox = $("rezimpbox"), elImpFile = $("rezimpfile");
var elImpPasteBox = $("rezimppastebox"), elImpPasteArea = $("rezimppastearea");
var elImpPreview = $("rezimppreview"), elImpPreviewRows = $("rezimppreviewrows"), elImpMsg = $("rezimpzprava");

var vybraneRezimy = {};
var nacteneKandidati = null;

function zalMsgSdil(text, spatne){
  elSdilMsg.hidden = !text;
  elSdilMsg.textContent = text || "";
  elSdilMsg.classList.toggle("bad", !!spatne);
}
function zalMsgImp(text, spatne){
  elImpMsg.hidden = !text;
  elImpMsg.textContent = text || "";
  elImpMsg.classList.toggle("bad", !!spatne);
}

/* ---------- Sdílet ---------- */
function renderSdilRows(){
  elSdilRows.textContent = "";
  REZIMY.sez.forEach(function(rez){
    var row = document.createElement("div");
    row.className = "setrow";
    var tCol = document.createElement("div");
    tCol.className = "t";
    var b = document.createElement("b");
    b.textContent = nazevRezimu(rez);
    tCol.appendChild(b);
    row.appendChild(tCol);
    var btns = document.createElement("div");
    btns.className = "setbtns";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ghost";
    function mark(){
      var on = !!vybraneRezimy[rez.id];
      btn.classList.toggle("on", on);
      btn.textContent = t(on ? "rezim.sdil.vybrano" : "rezim.sdil.nevybrano");
    }
    btn.addEventListener("click", function(){
      vybraneRezimy[rez.id] = !vybraneRezimy[rez.id];
      mark();
    });
    mark();
    btns.appendChild(btn);
    row.appendChild(btns);
    elSdilRows.appendChild(row);
  });
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
function otevriSdil(){
  zalMsgSdil("");
  renderSdilRows();
  elSdilBox.hidden = false;
}
function zavriSdil(){
  elSdilBox.hidden = true;
  vybraneRezimy = {};
  zalMsgSdil("");
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
}

function renderSdileniRezimu(){
  zavriSdil();
  zalMsgImp("");
  zavriImp();
}

/* Vedlejší efekty. Volá je hlavni.js na místě, kde je vidět celé pořadí startu. */
export function initSdileniRezimu(){
  $("rezsdilbtn").addEventListener("click", otevriSdil);
  $("rezsdilzrusit").addEventListener("click", zavriSdil);
  $("rezsdilstahni").addEventListener("click", function(){
    var sez = sestavVyber();
    if(!sez.length){ zalMsgSdil(t("rezim.sdil.vyber"), true); return; }
    var text = exportTextSdileni(sez);
    var ok = stahni("farkle-rezimy-sdileni-" + datumProNazev() + ".txt", text);
    zalMsgSdil(t(ok ? "zal.ukladase" : "zal.stazenineslo"), !ok);
  });
  $("rezsdilkopie").addEventListener("click", function(){
    var sez = sestavVyber();
    if(!sez.length){ zalMsgSdil(t("rezim.sdil.vyber"), true); return; }
    var text = exportTextSdileni(sez);
    doSchranky(text, function(ok){ zalMsgSdil(t(ok ? "zal.veschrance" : "zal.schrankaneslo"), !ok); });
  });

  $("rezimpbtn").addEventListener("click", function(){
    zalMsgImp("");
    elImpBox.hidden = false;
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
