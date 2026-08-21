/* render() — dirigent vykreslení.

   Závisí na: skoro všem v ui/, na stavu a na pravidlech
   Sahá na: DOM

   Jediné místo, které ví, co se má po změně stavu překreslit. Volá se
   po každé akci a na konci ukládá.

   V zámku zůstává #rollon živé a odvádí na Zápis kol; zamykají se jen
   Zapsat, Farkle a klávesnice.

   Riziko sedí na tlačítku Farkle, protože to na rozdíl od #rollline
   nemizí ani v nejnižším pásmu hustoty. */
import { jdeZpet, locked } from "../akce.js";
import { t, tn } from "../jazyky/jadro.js";
import { kostek } from "../pravidla/rezimy.js";
import { tabulkaRizika } from "../pravidla/riziko.js";
import { S, cur, left, potTotal, save } from "../stav/stav.js";
import { desetina, esc, fmt } from "../text/format.js";
import { manualDice, renderKind, renderKombi } from "./klavesnice.js";
import {
  $,
  elBank,
  elBust,
  elBustRiz,
  elLock,
  elMToggle,
  elManual,
  elMkost,
  elMnum,
  elPot,
  elRest,
  elRestLabel,
  elRollLine,
  elRollOn,
  elScore,
  elTotal,
  elTurnLabel,
  elUndo
} from "./prvky.js";
import { renderStats } from "./statistiky.js";
import { renderArch, renderFix, renderRows, renderTally } from "./zapis.js";
import { orezKostky } from "./klavesnice.js";

function render(){
  var r = cur(), l = left(), pot = potTotal();

  var lock = locked();
  /* odemčená hra čeká na nové skončení — po smazání kola se automatické
     uložení pustí znovu a záznam v historii se aktualizuje */
  if(!lock && S.autoUlozeno){ S.autoUlozeno = false; }

  elScore.textContent = fmt(S.banked);
  elTotal.classList.toggle("won", lock);
  if(S.mode === "rounds"){
    elRestLabel.textContent = t("pocitadlo.odehranokol");
    elRest.textContent = S.roundGoal > 0
      ? t("pocitadlo.zkol", { n: S.turns.length, z: S.roundGoal })
      : S.turns.length;
  } else {
    var rest = S.goal - S.banked;
    elRestLabel.textContent = t(rest > 0 ? "pocitadlo.zbyva" : "pocitadlo.nadcil");
    elRest.textContent = fmt(Math.abs(rest));
  }
  elPot.textContent = fmt(pot);
  elTurnLabel.textContent = t("pocitadlo.kolonastole", { n: S.turns.length + 1 });

  elRollLine.innerHTML = t("pocitadlo.hodradek", {
      n: S.rolls.length, kostky: esc(tn("slovo.kostkami", r.thrown)) }) +
    (l < r.thrown ? ' <span style="color:var(--dim)">' + esc(t("pocitadlo.hodzbyva", { n: l })) + '</span>' : "");

  /* v zámku tlačítko zůstává živé, protože vede na zápis kol */
  elRollOn.disabled = !lock && r.items.length === 0;
  var popisRollu = lock ? t("pocitadlo.hraskoncila")
    : (r.items.length === 0
        ? t("pocitadlo.nejdriv")
        : (l > 0 ? t("pocitadlo.hazetdalx", { kostky: tn("slovo.kostkami", l) })
                 : t("pocitadlo.horke")));
  elRollOn.textContent = popisRollu;
  /* Riziko sedí na tlačítku Farkle a hází se zbylými kostkami — nebo při
     horkých kostkách znovu všemi šesti. Poškozený stav může dát nesmyslný
     počet, proto ten strop. Platí i pro první hod, kde ještě nic neleží:
     je to údaj o kostkách na stole, ne o rozhodnutí házet dál. */
  var kostekDal = (l > 0 && l <= kostek()) ? l : kostek();
  elBustRiz.textContent = lock ? ""
    : t("pocitadlo.farkleriziko", { p: desetina(tabulkaRizika()[kostekDal - 1]) });

  /* Zapsat nad rozehraným hodem, ze kterého se nic neodložilo, nejde: takové
     kolo by v popisu neslo o jeden hod míň, než kolika se doopravdy házelo,
     a statistika nejvíc hodů v kole by to nepoznala. V Farkle se po hodu
     stejně vždycky buď boduje, nebo farkluje — ven vedou Farkle a Zpět.
     Na prvním hodu kola se nic nemění, tam už tlačítko drží pot <= 0. */
  elBank.disabled = lock || pot <= 0 || r.items.length === 0;
  elBank.textContent = pot > 0 ? t("pocitadlo.zapsatx", { b: fmt(pot) }) : t("pocitadlo.zapsatapredat");
  elBust.disabled = lock;
  elUndo.disabled = !jdeZpet();

  elLock.hidden = !lock;
  if(lock){
    elLock.textContent = S.mode === "points"
      ? t("pocitadlo.konecbody", { b: fmt(S.goal) })
      : t("pocitadlo.koneckola", { n: S.roundGoal });
  }

  /* při nule kostek se čeká na „Házet dál“ (horké kostky) — ruční zadání
     se zamyká stejně jako zbytek klávesnice */
  var manLock = lock || l < 1;
  [elMToggle, $("mless"), $("mkost"), $("mmore"), $("madd")].forEach(function(b){ b.disabled = manLock; });
  elMnum.disabled = manLock;
  if(manLock && !elManual.hidden){ elManual.hidden = true; elMToggle.classList.remove("sel"); }
  orezKostky(l);
  elMkost.textContent = tn("pocitadlo.kostzkr", l > 0 ? manualDice : 0);

  renderKombi(); renderKind(); renderFix(); renderRows(); renderStats(); renderTally(); renderArch();
  save();
}

export { render };
