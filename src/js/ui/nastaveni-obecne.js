/* Okno nastavení: panel hry, harmonika oddílů, tři karty.

   Závisí na: ui/prvky
   Sahá na: DOM

   Harmonika staví na nativním <details> kvůli klávesnici a čtečce, ale
   výlučnost si hlídá JS: atribut name na <details> je v prohlížečích
   čerstvý a spoléhat se na něj zatím nejde. Obsluha visí na události
   toggle, která je podle specifikace ASYNCHRONNÍ — v testech se na ni
   musí počkat o jeden tik.

   Panel nastavení hry je plovoucí, ne prvek v toku: v toku odsouval
   tlačítka pod spodní hranu na iPhonu SE 2. */
import { S } from "../stav/stav.js";
import { ukazRezPruh } from "./nastaveni-rezimy.js";
import { $, elGoalNum, elGoalSel, elModeSel, elRoundNum, elRoundSel } from "./prvky.js";



/* ---------- harmonika v nastavení ----------
   Nativní <details> kvůli klávesnici a čtečce; výlučnost (jen jeden oddíl
   otevřený) si hlídáme sami, protože atribut name na <details> je v
   prohlížečích čerstvý a bez něj by zůstaly otevřené všechny.
   Při otevření okna se všechny zavřou, aby karta začínala vždycky stejně. */
var setSekce = Array.prototype.slice.call(document.querySelectorAll("#setmodal .setsec"));

function zavriSekce(){ setSekce.forEach(function(x){ x.open = false; }); }

/* ---------- tři karty v okně nastavení ----------
   Stejný vzor jako dvě karty v okně s informacemi (#infoseg): přepínač
   přehazuje `hidden` a `.on`, obsah zůstává v DOMu, takže se nic
   nepřestavuje. Okno vždycky začíná na první kartě. */
var naKartuNastaveni = null;


/* režim a cíl hry */
var PRESETS = ["2000","4000","6000","8000","10000"];
function syncGoalUI(){
  elModeSel.value = S.mode;
  var rounds = (S.mode === "rounds");
  elGoalSel.hidden = rounds;
  elRoundSel.hidden = !rounds;
  if(rounds){
    elGoalNum.hidden = true;
    var limit = S.roundGoal > 0;
    elRoundSel.value = limit ? "custom" : "none";
    elRoundNum.hidden = !limit;
    elRoundNum.value = limit ? S.roundGoal : "";
    return;
  }
  elRoundNum.hidden = true;
  var preset = PRESETS.indexOf(String(S.goal)) >= 0;
  elGoalSel.value = preset ? String(S.goal) : "custom";
  elGoalNum.hidden = preset;
  elGoalNum.value = S.goal;
}

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initNastaveni(){
  /* ---------- panel nastavení hry ---------- */
  (function(){
    var btn = $("gamebtn"), panel = $("setup");
    function open(show){
      panel.hidden = !show;
      btn.classList.toggle("on", show);
      btn.setAttribute("aria-expanded", show ? "true" : "false");
    }
    btn.addEventListener("click", function(){ open(panel.hidden); });
    /* klepnutí mimo panel ho zavře */
    document.addEventListener("click", function(e){
      if(panel.hidden) return;
      if(panel.contains(e.target) || btn.contains(e.target)) return;
      open(false);
    });
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && !panel.hidden) open(false);
    });
  })();

  setSekce.forEach(function(sec){
    sec.addEventListener("toggle", function(){
      if(!sec.open) return;
      setSekce.forEach(function(x){ if(x !== sec) x.open = false; });
    });
  });

  (function(){
    var tlac = $("setseg").children;
    var karty = [$("setcardobecne"), $("setcardrezimy"), $("setcardzalohy")];
    naKartuNastaveni = function(i){
      karty.forEach(function(k, j){ k.hidden = j !== i; });
      Array.prototype.forEach.call(tlac, function(b, j){ b.classList.toggle("on", j === i); });
      var telo = $("setmodal").querySelector(".modalbody");
      if(telo) telo.scrollTop = 0;
      /* Pás rizika stojí mimo obě karty, takže o přepnutí sám neví. */
      ukazRezPruh();
    };
    Array.prototype.forEach.call(tlac, function(b, i){
      b.addEventListener("click", function(){ naKartuNastaveni(i); });
    });
  })();
}

export { PRESETS, naKartuNastaveni, setSekce, syncGoalUI, zavriSekce };
