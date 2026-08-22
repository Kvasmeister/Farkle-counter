/* Navěšení ovládacích prvků: klávesnice, akce, panel hry.

   Závisí na: akce, stav, pravidla, ui/*
   Sahá na: DOM

   Jedno místo, kde je vidět, co které tlačítko dělá. Dřív to byla poslední
   třetina jednoho uzávěru a hledalo se to podle id.

   Změna cíle, režimu i limitu může hru zamknout — a zamknutá hra je
   dohraná, takže se sem spouštěč automatického uložení patří stejně jako
   za bank() a bust(). */
import { bank, bust, keep, novaHra, reset, rollOn, undo } from "../akce.js";
import { t } from "../jazyky/jadro.js";
import { PRESETY, kombVRezimu, kombZap, sazba } from "../pravidla/kombinace.js";
import { STRAIGHTS } from "../pravidla/postupky.js";
import { aktRezim } from "../pravidla/rezimy.js";
import { kindPoints } from "../pravidla/skore.js";
import { klicSelhani } from "../stav/historie.js";
import { kodStejnych } from "../stav/kody.js";
import { S, left } from "../stav/stav.js";
import { zkusAutoUlozit } from "./autoulozeni.js";
import {
  manualDice,
  pridatKostku,
  selCount,
  selValue,
  ubratKostku,
  zrusVyber
} from "./klavesnice.js";
import { naKartuNastaveni, syncGoalUI } from "./nastaveni-obecne.js";
import { renderRezimy, zrusRozdelaneRezimy } from "./nastaveni-rezimy.js";
import { zavriModal } from "./okna.js";
import {
  $,
  elAddKind,
  elArch,
  elBank,
  elDataKombi,
  elDataSingle,
  elDataStr,
  elGoalNum,
  elGoalSel,
  elMToggle,
  elManual,
  elMnum,
  elModeSel,
  elRollOn,
  elRoundNum,
  elRoundSel
} from "./prvky.js";
import { render } from "./vykresleni.js";
import { renderZaloha } from "./zaloha.js";
import { renderZalohaPlna, renderZalohaRez } from "./zaloha-plna.js";
import { renderSdileniRezimu } from "./sdileni-rezimu.js";
import {
  archive,
  hlaskaNaTlacitku,
  prepniOpravy,
  renderKos,
  zapisHru,
  zrusPtaniKosu
} from "./zapis.js";

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initUdalosti(){
  /* ---------- události ---------- */
  elDataSingle.forEach(function(b){
    b.addEventListener("click", function(){
      var rez = aktRezim(), v = Number(b.dataset.single), body = rez.sam[v] || 0;
      if(!(body > 0)) return;
      keep(kodStejnych(1, v), body, 1);
    });
  });

  elDataStr.forEach(function(b){
    b.addEventListener("click", function(){
      var rez = aktRezim(), k = b.dataset.str, s = STRAIGHTS[k];
      if(!(rez.post[k] > 0)) return;
      keep(s.k, rez.post[k], s.d);
    });
  });

  /* Sazba se čte až při klepnutí, aby změna v nastavení platila hned. */
  elDataKombi.forEach(function(b){
    b.addEventListener("click", function(){
      var k = b.dataset.kombi;
      var rez = aktRezim();
      if(!kombZap(rez, k) || !kombVRezimu(rez, k)) return;
      keep(PRESETY[k].k, sazba(rez, k), PRESETY[k].d);
    });
  });

  elAddKind.addEventListener("click", function(){
    if(selValue === null) return;
    keep(kodStejnych(selCount, selValue), kindPoints(selValue, selCount), selCount);
    zrusVyber();
  });

  elMToggle.addEventListener("click", function(){
    var open = elManual.hidden;
    elManual.hidden = !open;
    elMToggle.classList.toggle("sel", open);
    if(open) elMnum.focus();
  });

  $("mless").addEventListener("click", function(){ ubratKostku(); render(); });

  $("mmore").addEventListener("click", function(){ pridatKostku(); render(); });

  $("madd").addEventListener("click", function(){
    var v = parseInt(elMnum.value, 10);
    if(!v || v <= 0){ elMnum.focus(); return; }
    keep("v", v, Math.min(manualDice, left()));
    elMnum.value = "";
  });

  elMnum.addEventListener("keydown", function(e){ if(e.key === "Enter") $("madd").click(); });

  elRollOn.addEventListener("click", rollOn);

  elBank.addEventListener("click", bank);

  $("bust").addEventListener("click", bust);

  $("undo").addEventListener("click", undo);

  $("fixturns").addEventListener("click", function(){
    prepniOpravy();
  });

  $("reset").addEventListener("click", reset);

  elArch.addEventListener("click", archive);

  $("newback").addEventListener("click", function(){ zavriModal(); });

  $("newdrop").addEventListener("click", function(){ zavriModal(); novaHra(); });

  /* Uložit a začít novou: wipe() teprve po potvrzeném zápisu, jinak by se
     hra ztratila v domnění, že je v historii. Po zápisu má S.archivedId
     hodnotu a kosPush() uvnitř novaHra() už zálohu nepotřebuje. */
  $("newsave").addEventListener("click", function(){
    var b = this;
    b.disabled = true;
    zapisHru(function(ok){
      b.disabled = false;
      if(!ok){
        hlaskaNaTlacitku(b, t(klicSelhani("chyba.mistoulozit")), t("nova.ulozit"));
        return;
      }
      zavriModal();
      novaHra();
    });
  });

  $("setbtn").addEventListener("click", function(){
    /* rozdělaná otázka ani vybraná karta se z minula nepřenášejí */
    zrusPtaniKosu();
    zrusRozdelaneRezimy();
    naKartuNastaveni(0);
    renderKos(); renderZaloha(); renderZalohaPlna(); renderZalohaRez(); renderRezimy(); renderSdileniRezimu();
  });

  /* Změna cíle, režimu i limitu může hru zamknout — a zamknutá hra je
     dohraná, takže se sem spouštěč patří stejně jako za bank() a bust(). */
  elModeSel.addEventListener("change", function(){
    S.mode = elModeSel.value;
    syncGoalUI();
    render();
    zkusAutoUlozit();
  });

  elGoalSel.addEventListener("change", function(){
    if(elGoalSel.value === "custom"){
      elGoalNum.hidden = false;
      elGoalNum.value = S.goal;
      elGoalNum.focus();
      elGoalNum.select();
    } else {
      S.goal = Number(elGoalSel.value);
      elGoalNum.hidden = true;
      render();
      zkusAutoUlozit();
    }
  });

  elGoalNum.addEventListener("input", function(){
    var v = parseInt(elGoalNum.value, 10);
    if(v && v > 0){ S.goal = v; render(); zkusAutoUlozit(); }
  });

  elRoundSel.addEventListener("change", function(){
    if(elRoundSel.value === "custom"){
      S.roundGoal = S.roundGoal > 0 ? S.roundGoal : Math.max(10, S.turns.length + 1);
      elRoundNum.hidden = false;
      elRoundNum.value = S.roundGoal;
      elRoundNum.focus();
      elRoundNum.select();
      render();
      zkusAutoUlozit();
    } else {
      S.roundGoal = null;
      elRoundNum.hidden = true;
      render();
    }
  });

  elRoundNum.addEventListener("input", function(){
    var v = parseInt(elRoundNum.value, 10);
    if(v && v > 0){ S.roundGoal = v; render(); zkusAutoUlozit(); }
  });
}
