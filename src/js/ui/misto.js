/* Kolik místa aplikace zabírá a jestli je úložiště trvalé.

   Závisí na: stav, text
   Sahá na: DOM, localStorage, IndexedDB, StorageManager

   Historie se neměří po jednom záznamu, ale vzorkem — u tisíců her by
   procházení všeho trvalo déle, než kolik ten údaj stojí za to. */
import { t, tn } from "../jazyky/jadro.js";
import { DETAILY, HIST, histAll, idb, rezim } from "../stav/historie.js";
import { HKEY, KEY, KHKEY, KKEY, kosAll, kosHistAll } from "../stav/uloziste.js";
import { desetina } from "../text/format.js";

/* ---------- místo v úložišti a trvalost ----------
   persist() kvótu nezvětší, jen vyřadí data z automatického úklidu, kterým
   prohlížeče uvolňují místo. Ptát se smí až po interakci uživatele; v Safari
   to platí jen pro aplikaci přidanou na plochu. */
var trvale = false;
function zajistiTrvalost(){
  var st = null;
  try{ st = navigator.storage; }catch(e){}
  if(!st || typeof st.persist !== "function") return;
  try{
    if(typeof st.persisted === "function"){
      st.persisted().then(function(uz){
        if(uz){ trvale = true; return null; }
        return st.persist().then(function(v){ trvale = !!v; });
      }).catch(function(){});
      return;
    }
    st.persist().then(function(v){ trvale = !!v; }).catch(function(){});
  }catch(e){}
}
function velikost(b){
  if(b < 1024) return b + " B";
  if(b < 1048576) return Math.round(b / 1024) + " kB";
  if(b < 1073741824) return desetina(b / 1048576) + " MB";
  return desetina(b / 1073741824) + " GB";
}
/* ---------- údaj o zabraném místě ----------
   Dvě úrovně. Celek se plní sám při otevření nastavení: estimate() je
   jediné volání a nesahá na historii. Rozpis stojí víc — vzorek detailů
   z IndexedDB a projití cache — a počítá se až po rozbalení tlačítkem.

   estimate() měří celý původ, na github.io tedy i ostatní aplikace ze
   stejné adresy; proto „celkem z této adresy", ne „historie". */
var VZOREK = 50;

/* localStorage se měří přesně: klíč i hodnota se počítají a UTF-16 dává
   dva bajty na znak, což je i to, co si prohlížeč započítává do kvóty. */
function lsBajtu(klice){
  var s = 0, i, v;
  try{
    for(i = 0; i < klice.length; i++){
      v = localStorage.getItem(klice[i]);
      if(v === null) continue;
      s += (klice[i].length + v.length) * 2;
    }
  }catch(e){ return null; }
  return s;
}

/* Zbytek localStorage: všechno pod prefixem farkle-, co si nebere žádný
   jiný řádek rozpisu. Průchodem přes klíče, ne pevným seznamem — jinak
   rozpis mlčky přehlédne klíč, který někdo časem přidá. Nejtučnější
   položkou tu bývá farkle-hist-v1-zaloha, přejmenovaná původní historie,
   kterou po migraci do IndexedDB držíme jako pojistku. */
function lsZbytek(krome){
  var s = 0, i, k, v;
  try{
    for(i = 0; i < localStorage.length; i++){
      k = localStorage.key(i);
      if(!k || k.indexOf("farkle-") !== 0) continue;
      if(krome.indexOf(k) !== -1) continue;
      v = localStorage.getItem(k);
      if(v === null) continue;
      s += (k.length + v.length) * 2;
    }
  }catch(e){ return null; }
  return s;
}

/* Velikost historie: v režimu ls přesně z jednoho klíče, v režimu idb
   odhadem. IndexedDB velikost police nehlásí a přečíst všechny detaily
   stojí tolik co export, takže se souhrny sečtou celé (leží v paměti)
   a detaily se vzorkují prvními padesáti záznamy. */
function velikostHistorie(hotovo){
  var pocet = histAll().length;
  if(rezim !== "idb" || !idb){
    hotovo({ pocet: pocet, bajtu: lsBajtu([HKEY]), presne: true });
    return;
  }
  var souhrnu = 0;
  try{
    HIST.forEach(function(g){ souhrnu += JSON.stringify(g).length; });
  }catch(e){ souhrnu = 0; }
  function vzdat(){ hotovo({ pocet: pocet, bajtu: null, presne: false }); }
  var tx, kur;
  try{ tx = idb.transaction(DETAILY, "readonly"); }catch(e){ vzdat(); return; }
  try{ kur = tx.objectStore(DETAILY).openCursor(); }catch(e){ vzdat(); return; }
  var n = 0, delka = 0;
  kur.onsuccess = function(){
    var c = kur.result;
    if(c && n < VZOREK){
      try{ delka += JSON.stringify(c.value).length; }catch(e){}
      n++;
      c.continue();
      return;
    }
    hotovo({ pocet: pocet, presne: false,
             bajtu: souhrnu + (n ? Math.round(delka / n * pocet) : 0) });
  };
  kur.onerror = vzdat;
}

/* Velikost samotné aplikace: součet těl všech odpovědí v cache, které si
   drží servisní pracovník. Filtr na kostky- je tu ze stejného důvodu jako
   při úklidu — na github.io leží v Cache API i cizí aplikace a započítat
   je pod „Aplikace" by byla lež. Chybějící nebo nečitelná odpověď se počítá
   jako nula; celý rozpis je odhad, ne účetnictví. */
function velikostAppky(hotovo){
  var c = null;
  try{ c = window.caches; }catch(e){}
  if(!c || typeof c.keys !== "function"){ hotovo(null); return; }
  try{
    c.keys().then(function(jmena){
      var moje = jmena.filter(function(n){ return n.indexOf("kostky-") === 0; });
      if(!moje.length){ hotovo(0); return null; }
      return Promise.all(moje.map(function(jmeno){
        return c.open(jmeno).then(function(cache){
          return cache.keys().then(function(reqs){
            return Promise.all(reqs.map(function(r){
              return cache.match(r).then(function(resp){
                if(!resp || !resp.blob) return 0;
                return resp.blob().then(function(b){ return b.size || 0; },
                                        function(){ return 0; });
              }, function(){ return 0; });
            }));
          });
        }, function(){ return []; });
      })).then(function(pole){
        var s = 0;
        pole.forEach(function(kus){ kus.forEach(function(x){ s += x; }); });
        hotovo(s);
      });
    }).catch(function(){ hotovo(null); });
  }catch(e){ hotovo(null); }
}

function odhadMista(hotovo){
  var st = null;
  try{ st = navigator.storage; }catch(e){}
  if(!st || typeof st.estimate !== "function"){ hotovo(null); return; }
  try{
    st.estimate().then(function(o){
      hotovo(o && typeof o.usage === "number" ? o : null);
    }).catch(function(){ hotovo(null); });
  }catch(e){ hotovo(null); }
}

/* Plní všechny prvky s třídou misto, ne jedno id — kdyby se údaj někdy
   objevil i jinde, není co dopisovat. Skládá se z uzlů, ne z innerHTML. */
function ukazMisto(radky){
  var pole = document.querySelectorAll(".misto");
  Array.prototype.forEach.call(pole, function(el){
    el.textContent = "";
    if(!radky || !radky.length){ el.hidden = true; return; }
    radky.forEach(function(r){
      var d = document.createElement("div"), b = document.createElement("b");
      d.className = "ml";
      b.textContent = r.k;
      d.appendChild(b);
      d.appendChild(document.createTextNode(" " + r.v));
      el.appendChild(d);
    });
    el.hidden = false;
  });
}
function celkemText(o){
  if(!o) return t("misto.nezjistit");
  return o.quota > 0
    ? t("misto.zdostupnych", { u: velikost(o.usage), q: velikost(o.quota) })
    : velikost(o.usage);
}
/* Celek nad tlačítkem. Volá se při každém otevření nastavení — čísla se
   mezi otevřeními mění a zastaralý údaj by mátl víc než chvilkové „Zjišťuji". */
function celekMista(){
  var el = document.getElementById("mistocelkem");
  if(!el) return;
  el.textContent = t("nast.misto.zjistuji");
  odhadMista(function(o){ el.textContent = celkemText(o); });
}
/* Zavřený stav: rozpis schovaný, tlačítko holé. Volá se i při otevření
   nastavení, aby karta začínala vždycky stejně. */
function resetMisto(){
  var b = document.getElementById("mistobtn");
  if(b){
    b.disabled = false;
    b.textContent = t("nast.misto.btn");
    b.classList.remove("on");
    b.setAttribute("aria-expanded", "false");
  }
  ukazMisto(null);
  celekMista();
}
function spoctiMisto(){
  var b = document.getElementById("mistobtn");
  if(b){ b.disabled = true; b.textContent = t("misto.pocitam"); }
  velikostHistorie(function(h){
    velikostAppky(function(appka){
      odhadMista(function(o){
        var radky = [];
        radky.push({ k: t("misto.historie"), v: h.pocet
          ? (tn("slovo.hra", h.pocet) + ", " + (h.bajtu === null
              ? t("misto.nezmeritmalo")
              : (h.presne ? velikost(h.bajtu) : t("misto.priblizne", { v: velikost(h.bajtu) }))))
          : t("misto.zadnahra") });
        var hra = lsBajtu([KEY]);
        radky.push({ k: t("misto.rozehrana"),
                     v: hra === null ? t("misto.nezmerit") : velikost(hra) });
        /* Prázdný koš v úložišti pořád leží, jen jako dvojznakové "[]" —
           pár desítek bajtů, které vypadají jako by v koši něco bylo.
           Když je prázdný, řekne se to rovnou. */
        var vKosi = kosAll().length + kosHistAll().length;
        var kose = lsBajtu([KKEY, KHKEY]);
        radky.push({ k: t("misto.kose"),
                     v: !vKosi ? t("misto.prazdne")
                        : (tn("slovo.hra", vKosi) +
                           (kose === null ? "" : ", " + velikost(kose))) });
        /* Historie v režimu ls sedí pod svým vlastním řádkem, dvakrát se
           počítat nesmí. V režimu idb pod tímhle klíčem nic není. */
        var zbytek = lsZbytek(rezim === "idb" ? [KEY, KKEY, KHKEY] : [KEY, KKEY, KHKEY, HKEY]);
        radky.push({ k: t("misto.nastaveni"),
                     v: zbytek === null ? t("misto.nezmerit") : velikost(zbytek) });
        radky.push({ k: t("misto.aplikace"),
                     v: appka === null
                        ? t("misto.nezmerit")
                        : t("misto.offline", { v: velikost(appka) }) });
        /* Když estimate() není, řádek se vynechá — selhání hlásí podtitulek
           nad tlačítkem a psát totéž dvakrát pod sebe nemá smysl. */
        if(o){
          radky.push({ k: t("misto.celkem"),
            v: celkemText(o) + (trvale ? ". " + t("misto.trvale") : "") });
        }
        ukazMisto(radky);
        if(b){
          b.disabled = false;
          b.textContent = t("nast.misto.btn");
          b.classList.add("on");
          b.setAttribute("aria-expanded", "true");
        }
      });
    });
  });
}
/* Tlačítko rozbaluje a zabaluje. Při rozbalení se rozpis pokaždé počítá
   znovu — jinak by po smazání her ukazoval stará čísla. */
function prepniMisto(){
  var v = document.querySelector(".misto");
  if(v && !v.hidden){ resetMisto(); return; }
  spoctiMisto();
}

/* společné pro import ze souboru i ze schránky */
/* Zdroj („soubor" nebo „text") je součástí klíče: čeština u obou vět
   skloňuje jinak a skládat je ze zvlášť přeložených kousků by slovosled
   zafixovalo česky. */

export { VZOREK, celekMista, celkemText, lsBajtu, lsZbytek, odhadMista, prepniMisto, resetMisto, spoctiMisto, trvale, ukazMisto, velikost, velikostAppky, velikostHistorie, zajistiTrvalost };
