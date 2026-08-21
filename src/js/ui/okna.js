/* Modální okna — otevřít, zavřít, jedno naráz.

   Závisí na: ui/prvky
   Sahá na: DOM

   Nové okno stačí přidat do HTML s class="modal" a křížkem data-close;
   obsluha se navěsí sama. Zavírá je křížek, klepnutí na tmavé pozadí
   i Escape. Otevřením dalšího se předchozí zavře.

   modalOpen() používají stránky: šipky na klávesnici mají být hluché,
   dokud je nějaké okno otevřené. */
import { zavriSekce } from "./nastaveni-obecne.js";
import { vratDoNastaveni } from "./okno-pravidla.js";
import { $ } from "./prvky.js";

/* ---------- okna: pravidla a nastavení ---------- */
function modalOpen(){ return !!document.querySelector(".modal:not([hidden])"); }
var zavriModal = null, otevriModal = null;

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initOkna(){
  (function(){
    var otevrene = null, vyvolal = null;
    function zavri(){
      if(!otevrene) return;
      /* Návrat do nastavení místo prostého zavření. Musí se rozhodnout dřív,
         než se okno schová — otevriModal() si zavře, co je otevřené, sám. */
      if(otevrene.id === "rulesmodal" && vratDoNastaveni()) return;
      otevrene.hidden = true;
      var b = vyvolal;
      otevrene = null; vyvolal = null;
      if(b && document.contains(b)) b.focus();
    }
    function otevri(id, btn){
      zavri();
      var m = $(id);
      if(!m) return;
      m.hidden = false;
      otevrene = m; vyvolal = btn || null;
      var x = m.querySelector(".modalx");
      if(x) x.focus();
    }
    zavriModal = zavri; otevriModal = otevri;
    $("infobtn").addEventListener("click", function(){ otevri("rulesmodal", this); });
    $("setbtn").addEventListener("click", function(){ zavriSekce(); otevri("setmodal", this); });
    document.querySelectorAll("[data-close]").forEach(function(b){
      b.addEventListener("click", zavri);
    });
    /* klepnutí na tmavé pozadí mimo panel */
    document.addEventListener("click", function(e){ if(e.target === otevrene) zavri(); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape") zavri(); });
  })();
}

export { modalOpen, otevriModal, zavriModal };
