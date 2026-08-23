/* Akce hráče: odložit kostky, házet dál, zapsat, farkle, zpět, nová hra.

   Závisí na: stav, pravidla, ui (vykreslení)
   Aplikační vrstva NAD stavem i UI — proto smí volat obojí.

   Zpět NIKDY nesáhne na turns. Ubírá položky, pak celé hody, a v prázdném
   kole je jdeZpet() false. Dřív pokračovalo dál a jedno klepnutí navíc
   umazalo poslední zapsané kolo i s body. Mazání kol má jediné dveře:
   Opravit v Zápisu kol, s potvrzením.

   locked() se v bodech ptá jen na S.banked, který roste jedině v bank() —
   zámek proto naskočí až po zapsání celého kola a body ležící na stole ho
   nespouštějí. Kdyby se hlídal součet se stolem, hra by se zamkla uprostřed
   kola a body by propadly. */
import { t } from "./jazyky/jadro.js";
import { kostek, ulozRezimy } from "./pravidla/rezimy.js";
import { HODY_ODD, HODY_TXT, POLOZKY_ODD, POLOZKY_TXT } from "./stav/kody.js";
import { S, cur, gameEmpty, left, potTotal } from "./stav/stav.js";
import { fmt } from "./text/format.js";
import { stitek } from "./text/stitky.js";
import { zkusAutoUlozit } from "./ui/autoulozeni.js";
import { zrusVolbuKombinace } from "./ui/klavesnice.js";
import { renderRezimy } from "./ui/nastaveni-rezimy.js";
import { otevriModal } from "./ui/okna.js";
import { prekresliPravidla } from "./ui/okno-pravidla.js";
import { $ } from "./ui/prvky.js";
import { goTo } from "./ui/stranky.js";
import { render } from "./ui/vykresleni.js";
import { kdeZaznam, kosPush, zrusOpravy } from "./ui/zapis.js";

/* Jediné dveře ke změně pravidel: uloží a překreslí obojí — nastavení
   i klávesnici (tu přes render()). Cache rizika se nezahazuje, je klíčovaná
   podpisem. */
function zmenaRezimu(){
  ulozRezimy();
  renderRezimy();
  if(prekresliPravidla) prekresliPravidla();
  render();
}
/* Prázdný hod se do popisu nedostane — u farklu je poslední hod prázdný
   z definice a slovo se dopisuje až při zobrazení. */
function turnKody(){
  var out = [], i, j, r, radek;
  for(i = 0; i < S.rolls.length; i++){
    r = S.rolls[i]; radek = [];
    for(j = 0; j < r.items.length; j++){
      /* položka bez kódu se do c zapsat nedá */
      if(typeof r.items[j].k !== "string") return null;
      radek.push(r.items[j].k);
    }
    if(radek.length) out.push(radek.join(POLOZKY_ODD));
  }
  return out.join(HODY_ODD);
}
function turnDesc(){
  return S.rolls.map(function(r){ return r.items.map(stitek).join(POLOZKY_TXT); })
                .filter(Boolean).join(HODY_TXT);
}
/* Kolo se ukládá v kódech. Kdyby některá položka kód neměla — rozehraná hra
   z doby před nimi, jejíž štítek se rozebrat nepodařilo — zapíše se raději
   text; ztratit štítek by bylo horší než zafixovat u jednoho kola jazyk. */
function zapisKolo(bodu, farkle){
  var c = turnKody(), tah = { p: bodu, bust: farkle };
  if(c === null){ tah.d = turnDesc(); } else { tah.c = c; }
  S.turns.push(tah);
}
/* ---------- konec hry ----------
   Hlídání je jen pomůcka: zvýšením limitu či cíle nebo přepnutím na
   „neomezeně“ se hra zase odemkne.

   V bodech stačí ptát se na `banked`, protože ten roste jedině v bank().
   Zámek tak naskočí až po zapsání kola, kterým se cíl dosáhl nebo překročil
   — body ležící na stole se do něj nepočítají. */
function locked(){
  if(S.mode === "points") return S.banked >= S.goal;
  return S.roundGoal > 0 && S.turns.length >= S.roundGoal;
}

/* ---------- akce ---------- */
/* diceUsed < 1 by šlo zapisovat donekonečna, aniž by ubývaly kostky —
   jediná cesta sem je ruční zadání při nule zbývajících kostek */
function keep(kod, points, diceUsed){
  if(diceUsed < 1 || diceUsed > left()) return;
  cur().items.push({k:kod, p:points, d:diceUsed});
  render();
}
function unkeep(i){ cur().items.splice(i, 1); render(); }

function rollOn(){
  /* v zámku tlačítko nehází, ale odvede na zápis kol — hra je u konce
     a další krok je uložit ji nebo si ji prohlédnout */
  if(locked()){ goTo(1); return; }
  if(cur().items.length === 0) return;
  var rest = left();
  S.rolls.push({ thrown: rest > 0 ? rest : kostek(), hot: rest === 0, items: [] });
  render();
}

function bank(){
  var p = potTotal();
  if(p <= 0 || locked()) return;
  S.dirty = true;
  zrusVolbuKombinace();
  zapisKolo(p, false);
  S.banked += p;
  S.rolls = [{thrown:kostek(), hot:false, items:[]}];
  render();
  zkusAutoUlozit();
}
function bust(){
  if(locked()) return;
  S.dirty = true;
  zrusVolbuKombinace();
  zapisKolo(potTotal(), true);
  S.rolls = [{thrown:kostek(), hot:false, items:[]}];
  render();
  zkusAutoUlozit();
}
/* Zpět se drží uvnitř rozehraného kola: ubírá položky, pak celé hody.
   Zapsaná kola nemaže — na ty je Opravit v Zápisu kol. Dřív sahalo i na
   ně a jedno klepnutí navíc tak umazalo kolo, o které uživatel nežádal. */
function jdeZpet(){ return cur().items.length > 0 || S.rolls.length > 1; }
function undo(){
  if(!jdeZpet()) return;
  S.dirty = true;
  if(cur().items.length){ unkeep(cur().items.length - 1); return; }
  S.rolls.pop();
  render();
}
function wipe(){
  zrusOpravy();
  zrusVolbuKombinace();
  S.banked = 0; S.turns = []; S.rolls = [{thrown:kostek(), hot:false, items:[]}];
  S.archivedId = null; S.dirty = false; S.autoUlozeno = false;
  render();
}
var resetTimer = null, resetMsg = false;
function disarmReset(){
  clearTimeout(resetTimer); resetTimer = null;
  var b = $("reset");
  b.classList.remove("warn");
  b.textContent = t("zapis.novahra");
}
/* Společný konec všech cest k nové hře. wipe() až po úspěšné záloze —
   jinak by rozehraná hra zmizela bez možnosti obnovy. Když se nepovede,
   hra prostě zůstane rozehraná. */
function novaHra(){
  var b = $("reset");
  if(!kosPush()){
    resetMsg = true;
    b.classList.add("warn");
    b.textContent = t("nova.nezalohovano");
    setTimeout(function(){ resetMsg = false; disarmReset(); }, 4000);
    return false;
  }
  wipe();
  goTo(0);
  return true;
}
/* Neuložená hra si vyžádá ještě okno se třemi cestami ven. Hra, jejíž
   záznam někde je — v historii nebo v koši smazaných z historie — a od té
   doby se nehrálo, projde rovnou: ztratit se nemá co. */
function neulozena(){
  return !gameEmpty() && (kdeZaznam() === "nikde" || S.dirty);
}
function reset(){
  var b = $("reset");
  if(resetMsg) return;            /* dokud svítí hláška, klik nic neznamená */
  if(gameEmpty()){ wipe(); goTo(0); return; }
  if(!resetTimer){
    b.classList.add("warn");
    b.textContent = t("nova.opravdu");
    resetTimer = setTimeout(disarmReset, 4000);
    return;
  }
  disarmReset();
  if(neulozena()){ otevriNovaModal(b); return; }
  novaHra();
}
function otevriNovaModal(btn){
  var pot = potTotal();
  var zprava = t("nova.text");
  if(pot > 0) zprava += " " + t("nova.propadne", { b: fmt(pot) });
  $("newtext").textContent = zprava;
  otevriModal("newmodal", btn);
}

export { bank, bust, disarmReset, jdeZpet, keep, locked, neulozena, novaHra, otevriNovaModal, reset, resetMsg, resetTimer, rollOn, turnDesc, turnKody, undo, unkeep, wipe, zapisKolo, zmenaRezimu };
