/* Tři stránky přepínané swipem a dvě vnitřní stránky panelu kola.

   Závisí na: ui/okna (modalOpen), ui/statistiky-stranka, ui/prvky
   Sahá na: DOM

   Panel kola je pořád vodorovný scroll kontejner, ale s overflow-x:hidden —
   prstem s ním nikdo nepohne, scrollTo() z goSheet() funguje dál. Swipe se
   rušil schválně: v hustotě klávesnice se spouštěl omylem a bral doteky,
   které patřily tlačítkům. Protože tím zmizel scroll-snap, srovnává
   goSheet(sheet, false) posun po resize.

   Šipky na klávesnici jsou hluché, když je otevřené okno. */
import { modalOpen } from "./okna.js";
import { $ } from "./prvky.js";
import { renderP2, zrusNav } from "./statistiky-stranka.js";

/* ---------- vnitřní stránky boxu kola ---------- */
var elSheets = $("sheets"), sheetBtns = Array.prototype.slice.call($("sheettabs").children), sheet = 0;
function goSheet(i, smooth){
  sheet = Math.max(0, Math.min(sheetBtns.length - 1, i));
  var x = sheet * elSheets.clientWidth;
  var behavior = (smooth === false) ? "auto" : "smooth";
  if(typeof elSheets.scrollTo === "function"){ elSheets.scrollTo({left:x, behavior:behavior}); }
  else { elSheets.scrollLeft = x; }
  markSheets();
}
function markSheets(){
  sheetBtns.forEach(function(b, i){ b.classList.toggle("on", i === sheet); });
}



/* ---------- stránky ---------- */
var elPages = $("pages"), tabs = [$("tab0"), $("tab1"), $("tab2")], page = 0;
function goTo(i, smooth){
  var novy = Math.max(0, Math.min(tabs.length - 1, i));
  /* Odchod na jinou stránku ruší návrat do žebříčku. Srovnává se se
     stávající stránkou, protože goTo se volá i po změně velikosti okna
     se stejným číslem — a to návrat rušit nemá. */
  if(novy !== page) zrusNav();
  page = novy;
  if(page === 2) renderP2();
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var behavior = (smooth === false || reduce) ? "auto" : "smooth";
  var x = page * elPages.clientWidth;
  if(typeof elPages.scrollTo === "function"){ elPages.scrollTo({ left:x, behavior:behavior }); }
  else { elPages.scrollLeft = x; }
  markTabs();
}
function markTabs(){
  tabs.forEach(function(t, i){ t.setAttribute("aria-selected", i === page ? "true" : "false"); });
}

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initStranky(){
  sheetBtns.forEach(function(b, i){ b.addEventListener("click", function(){ goSheet(i); }); });

  elSheets.addEventListener("scroll", function(){
    var i = Math.round(elSheets.scrollLeft / Math.max(1, elSheets.clientWidth));
    if(i !== sheet){ sheet = i; markSheets(); }
  }, {passive:true});

  tabs.forEach(function(t, i){ t.addEventListener("click", function(){ goTo(i); }); });

  elPages.addEventListener("scroll", function(){
    var i = Math.round(elPages.scrollLeft / Math.max(1, elPages.clientWidth));
    if(i !== page){ page = i; zrusNav(); markTabs(); }
  }, {passive:true});

  /* bez scroll-snapu si posun po změně šířky okna nikdo nesrovná sám */
  window.addEventListener("resize", function(){ goTo(page, false); goSheet(sheet, false); });

  document.addEventListener("keydown", function(e){
    var t = e.target.tagName;
    if(t === "INPUT" || t === "SELECT" || t === "TEXTAREA") return;
    if(modalOpen()) return;
    if(e.key === "ArrowRight") goTo(page + 1);
    if(e.key === "ArrowLeft") goTo(page - 1);
  });

  /* Kontextové menu je vypnuté všude kromě polí pro vložení ze schránky —
     ta na vkládání pravým tlačítkem/podržením spoléhají, protože čtení
     schránky přes JS je na iOS nespolehlivé. Ptáme se na typ prvku, ne na
     id: vkládacích ploch jsou dnes čtyři (záloha historie, kompletní
     záloha, záloha režimů, sdílení režimů) a seznam id by se rozešel
     s tou pátou. */
  document.addEventListener("contextmenu", function(e){
    if(e.target && e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
  });
}

export { elPages, elSheets, goSheet, goTo, markSheets, markTabs, page, sheet, sheetBtns, tabs };
