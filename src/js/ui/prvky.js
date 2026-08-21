/* Odkazy na prvky stránky, sebrané jednou při startu.

   Závisí na: ničem
   Sahá na: DOM

   INVARIANT: funguje to jen proto, že složený skript sedí na KONCI <body>.
   Kdyby se přesunul do <head> nebo dostal `defer`, byly by tu samé null.
   Alternativa (P.elScore na čtyřech stovkách míst) by nic nezlepšila.

   selValue, selCount a manualDice tady schválně NEJSOU: přepisuje je
   klávesnice, a importované vazby jsou v ES modulech jen pro čtení. */

/* ---------- prvky ---------- */
var $ = function(id){ return document.getElementById(id); };
var elScore=$("score"), elTotal=$("total"), elRest=$("rest"), elRestLabel=$("restlabel"),
    elPot=$("pot"), elTurnLabel=$("turnlabel"),
    elRollLine=$("rollline"), elFix=$("fix"),
    elRollOn=$("rollon"), elBank=$("bank"), elBust=$("bust"), elBustRiz=$("bustriz"),
    elUndo=$("undo"), elLock=$("lock"),
    elRows=$("rows"), elEmpty=$("empty"), elArch=$("arch"), elKosList=$("koslist"), elKosHistList=$("koshistlist"),
    elTally=$("tally"), elTallyCap=$("tallycap"),
    elModeSel=$("modesel"), elGoalSel=$("goalsel"), elGoalNum=$("goalnum"),
    elRoundSel=$("roundsel"), elRoundNum=$("roundnum"),
    elPips=$("pips"), elCounts=$("counts"), elAddKind=$("addkind"),
    elMnum=$("mnum"), elMkost=$("mkost"), elMToggle=$("mtoggle"), elManual=$("manualwrap"),
    elStrRow=$("strrow"), elStrCap=$("strcap"),
    elSingleRow=$("singlerow"), elSingleCap=$("singlecap");
var elDataSingle = Array.prototype.slice.call(document.querySelectorAll("[data-single]")),
    elDataStr    = Array.prototype.slice.call(document.querySelectorAll("[data-str]")),
    elDataKombi  = Array.prototype.slice.call(document.querySelectorAll("[data-kombi]"));

export { $, elAddKind, elArch, elBank, elBust, elBustRiz, elCounts, elDataKombi, elDataSingle, elDataStr, elEmpty, elFix, elGoalNum, elGoalSel, elKosHistList, elKosList, elLock, elMToggle, elManual, elMkost, elMnum, elModeSel, elPips, elPot, elRest, elRestLabel, elRollLine, elRollOn, elRoundNum, elRoundSel, elRows, elScore, elSingleCap, elSingleRow, elStrCap, elStrRow, elTally, elTallyCap, elTotal, elTurnLabel, elUndo };
