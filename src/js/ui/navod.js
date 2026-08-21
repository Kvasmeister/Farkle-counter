/* Návod při prvním spuštění a po každé aktualizaci.

   Závisí na: ui/okna
   Sahá na: DOM, localStorage, service worker

   Číslo verze drží service worker a aplikace si o něj řekne zprávou, ať je
   verze jen na jednom místě. Bez workeru (jiný prohlížeč, otevřeno ze
   souboru) se uloží náhradní značka a návod se ukáže právě jednou.

   Pořadí je podstatné: značka se uloží A TEPRVE PAK se okno otevře, takže
   i zavření křížkem to odbaví natrvalo. */
import { otevriNavod } from "./okno-pravidla.js";

/* ---------- návod při prvním spuštění a po aktualizaci ----------
   číslo verze drží service worker, aplikace si o něj řekne zprávou —
   ať je verze jen na jednom místě. Když worker není k dispozici
   (jiný prohlížeč, otevřeno ze souboru), ukáže se návod jen poprvé. */
var NKEY = "farkle-navod-v1";
function zjistiVerzi(hotovo){
  if(!("serviceWorker" in navigator)){ hotovo(null); return; }
  var vyrizeno = false;
  function dokonci(v){
    if(vyrizeno) return;
    vyrizeno = true;
    clearTimeout(cas);
    hotovo(v);
  }
  var cas = setTimeout(function(){ dokonci(null); }, 2000);
  navigator.serviceWorker.ready.then(function(reg){
    var sw = reg.active;
    if(!sw){ dokonci(null); return; }
    var kanal = new MessageChannel();
    kanal.port1.onmessage = function(e){
      dokonci(e.data && e.data.verze ? e.data.verze : null);
    };
    sw.postMessage({ dotaz: "verze" }, [kanal.port2]);
  }).catch(function(){ dokonci(null); });
}
function zkontrolujNavod(){
  zjistiVerzi(function(verze){
    var znacka = verze || "bez-verze";
    var videno = null;
    try { videno = localStorage.getItem(NKEY); } catch(e){}
    if(videno === znacka) return;
    try { localStorage.setItem(NKEY, znacka); } catch(e){}
    otevriNavod();
  });
}

export { NKEY, zjistiVerzi, zkontrolujNavod };
