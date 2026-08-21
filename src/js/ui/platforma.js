/* Platforma: motiv, orientace, celá obrazovka, nezhasínání displeje.

   Závisí na: jazyky/jadro, ui/prvky
   Sahá na: DOM, localStorage, Fullscreen API, Wake Lock API

   Čtyři nezávislé kusy, které nemají co dělat v logice hry.

   Past (docs/mistakes.md): .hidden nefunguje na potomcích <svg> — je to
   vlastnost HTMLElement. Přepíná se setAttribute/removeAttribute.
   Past: iOS Safari requestFullscreen vystavuje, ale mimo <video> nic
   neudělá; ptát se musí na document.fullscreenEnabled.
   Past: request() zámku je asynchronní — bez příznaku `zadame` vezmou dva
   doteky těsně po sobě dva zámky a pustí se jen jeden. */
import { naJazyk, t } from "../jazyky/jadro.js";
import { $ } from "./prvky.js";

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initPlatforma(){
  /* ---------- světlý / tmavý režim ---------- */
  (function(){
    var btn = $("theme"), root = document.documentElement, TKEY = "farkle-theme";
    /* Vlastnost .hidden je jen na HTML prvcích — na potomcích <svg> zápis
       nic neudělá a atribut zůstane, jak byl v kódu. Slunce proto mělo
       hidden napořád a měsíc nikdy, takže tlačítko ukazovalo měsíc ve všech
       stavech. Atribut se tu proto přepíná ručně. */
    function vrstva(id, videt){
      var el = $(id);
      if(videt) el.removeAttribute("hidden"); else el.setAttribute("hidden", "");
    }
    function apply(mode){
      root.setAttribute("data-theme", mode);
      var light = mode === "light";
      vrstva("thsun", !light);
      vrstva("thmoon", light);
      var label = t(light ? "hlav.tmavyrezim" : "hlav.svetlyrezim");
      btn.title = label;
      btn.setAttribute("aria-label", label);
      try{ localStorage.setItem(TKEY, mode); }catch(e){}
    }
    btn.addEventListener("click", function(){
      apply(root.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
    naJazyk(function(){ apply(root.getAttribute("data-theme") === "light" ? "light" : "dark"); });
    var ulozeny = null;
    try{ ulozeny = localStorage.getItem(TKEY); }catch(e){}
    if(ulozeny === "light" || ulozeny === "dark"){
      apply(ulozeny);
    } else {
      var svetlo = false;
      try{ svetlo = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches; }catch(e){}
      apply(svetlo ? "light" : "dark");
    }
  })();

  /* ---------- jen na výšku ----------
     Manifest má orientation: portrait, což stačí nainstalované aplikaci na
     Androidu. Tohle je pokus navíc pro prohlížeč. iOS zamykání orientace
     nepodporuje vůbec — tam zbývá překryv #rot. */
  (function(){
    try{
      if(screen.orientation && typeof screen.orientation.lock === "function"){
        var p = screen.orientation.lock("portrait");
        if(p && typeof p.catch === "function") p.catch(function(){});
      }
    }catch(e){}
  })();

  /* ---------- celá obrazovka ----------
     Pozor: iOS Safari metodu requestFullscreen vystavuje, ale na jiném než
     video elementu nic neudělá. Ptáme se proto na fullscreenEnabled, což na
     iPhonu vrací false — tlačítko se tam skryje místo aby mátlo. */
  (function(){
    var btn = $("fs"), root = document.documentElement;
    var enter = root.requestFullscreen || root.webkitRequestFullscreen;
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    var allowed = (document.fullscreenEnabled !== undefined)
      ? document.fullscreenEnabled
      : (document.webkitFullscreenEnabled !== undefined ? document.webkitFullscreenEnabled : false);

    /* nainstalovaná aplikace už na celé obrazovce běží sama */
    var jakoAplikace = (window.matchMedia &&
        (matchMedia("(display-mode: fullscreen)").matches ||
         matchMedia("(display-mode: standalone)").matches)) ||
        navigator.standalone === true;

    var radek = $("fsrow");
    function pryc(){ radek.remove(); }
    if(!enter || !exit || !allowed || jakoAplikace){ pryc(); return; }

    function active(){ return document.fullscreenElement || document.webkitFullscreenElement || null; }
    /* Tlačítko hlásí stav, ne akci — „Zapnuto“ se čte líp než „Vypnout“.
       Co klik udělá, zůstává v title a aria-label. */
    function mark(){
      var on = !!active();
      btn.textContent = t(on ? "spol.zapnuto" : "nast.vypnuto");
      btn.classList.toggle("on", on);
      var label = t(on ? "fs.zpet" : "fs.zapnout");
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    function fail(){ pryc(); }   /* volání selhalo: řádek je k ničemu */

    btn.addEventListener("click", function(){
      try{
        var p = active() ? exit.call(document) : enter.call(root);
        if(p && typeof p.catch === "function") p.catch(fail);
      }catch(e){ fail(); }
    });
    ["fullscreenchange","webkitfullscreenchange"].forEach(function(ev){
      document.addEventListener(ev, mark);
    });
    naJazyk(mark);
    mark();
  })();

  /* ---------- nezhasínat displej ----------
     Zámek drží displej rozsvícený, ale jas ovlivnit neumí — API na to není.
     Po třech minutách bez doteku se proto zámek pustí a dál se o zhasnutí
     i zamčení stará systémový časovač, na který stránka nedosáhne.

     Prohlížeč zámek pouští sám pokaždé, když se stránka schová (zhasnutí,
     přepnutí do jiné aplikace, zamčení telefonu). Obsluha visibilitychange
     ho po návratu bere znovu, takže po odemčení telefonu nezhasínání naskočí
     samo — přepínač v nastavení se přitom nemění, ten žije v localStorage. */
  (function(){
    var radek = $("svitrow"), btn = $("svit");
    var SKEY = "farkle-svit-v1";
    var NECINNOST = 180000;   /* 3 minuty */

    if(!navigator.wakeLock || typeof navigator.wakeLock.request !== "function"){ radek.remove(); return; }

    /* zadame hlídá rozjetou žádost: request je asynchronní, takže dva doteky
       těsně po sobě by jinak vzaly dva zámky a pustil by se jen jeden */
    var zapnuto = false, zamek = null, casovac = null, cekaNaDotek = false, zadame = false;
    try{ zapnuto = localStorage.getItem(SKEY) === "1"; }catch(e){}

    function mark(){
      btn.textContent = t(zapnuto ? "spol.zapnuto" : "nast.vypnuto");
      btn.classList.toggle("on", zapnuto);
      var label = t(zapnuto ? "svit.nechat" : "svit.nezhasinat");
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    /* Podle specifikace stačí viditelná stránka, gesto se nevyžaduje. Když
       ho prohlížeč přesto chce, request spadne a zkusí se po prvním doteku. */
    function poDoteku(){
      if(cekaNaDotek) return;
      cekaNaDotek = true;
      document.addEventListener("pointerdown", function jednou(){
        document.removeEventListener("pointerdown", jednou, true);
        cekaNaDotek = false;
        vezmi();
      }, true);
    }
    function vezmi(){
      if(!zapnuto || zamek || zadame || document.hidden) return;
      var p;
      try{ p = navigator.wakeLock.request("screen"); }
      catch(e){ poDoteku(); return; }
      if(!p || typeof p.then !== "function"){ poDoteku(); return; }
      zadame = true;
      p.then(function(z){
        zadame = false;
        if(!zapnuto){ try{ z.release(); }catch(e){} return; }
        zamek = z;
        if(z && typeof z.addEventListener === "function"){
          z.addEventListener("release", function(){ if(zamek === z) zamek = null; });
        }
      }, function(){ zadame = false; poDoteku(); });
    }
    function pust(){
      if(!zamek) return;
      var z = zamek;
      zamek = null;
      try{ z.release(); }catch(e){}
    }
    function odpocet(){
      clearTimeout(casovac); casovac = null;
      if(!zapnuto || document.hidden) return;
      casovac = setTimeout(pust, NECINNOST);
    }
    function aktivita(){
      if(!zapnuto) return;
      vezmi();
      odpocet();
    }

    btn.addEventListener("click", function(){
      zapnuto = !zapnuto;
      try{ localStorage.setItem(SKEY, zapnuto ? "1" : "0"); }catch(e){}
      mark();
      if(zapnuto){ vezmi(); odpocet(); }
      else { clearTimeout(casovac); casovac = null; pust(); }
    });
    document.addEventListener("visibilitychange", function(){
      if(document.hidden){ clearTimeout(casovac); casovac = null; }
      else { vezmi(); odpocet(); }
    });
    document.addEventListener("pointerdown", aktivita, true);
    document.addEventListener("keydown", aktivita, true);

    naJazyk(mark);
    mark();
    if(zapnuto){ vezmi(); odpocet(); }
  })();
}
