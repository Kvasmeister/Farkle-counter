/* Okno „i“: tabulka pravidel podle režimu a návod, dvě karty.

   Závisí na: pravidla, text, ui/okna
   Sahá na: DOM

   #cardrules není statická tabulka — skládá ji pravidlaHTML(rez). Řádek se
   do ní dostane jen tehdy, když v tom režimu boduje. Počty nad prahem jsou
   řádky tabulky, ne poznámka pod ní: jen tak se vypíše právě tolik počtů,
   kolik se jich do režimu vejde.

   Okno má pevnou výšku, aby se při přepnutí karty nezvětšovalo; u kratších
   pravidel proto dole zbývá prázdno a je to záměr. */
import { t, tn } from "../jazyky/jadro.js";
import {
  PRESETY,
  PRESET_PORADI,
  kombVRezimu,
  kombZap,
  kombinaceZap,
  pocetKombinaci,
  sazba,
  zapisKombinace
} from "../pravidla/kombinace.js";
import { POST_PORADI, STRAIGHTS } from "../pravidla/postupky.js";
import {
  aktRezim,
  nazevRezimu,
  nejvyssiStej,
  poctyStej,
  rezimPodleId
} from "../pravidla/rezimy.js";
import { esc, fmt } from "../text/format.js";
import { naKartuNastaveni } from "./nastaveni-obecne.js";
import { nazevKombinace, renderRezimy } from "./nastaveni-rezimy.js";
import { otevriModal } from "./okna.js";
import { $ } from "./prvky.js";

/* Pravidla otevřená z karty Herních režimů se po zavření vracejí do
   nastavení. Příznak drží okno pravidel, spotřebuje ho obsluha zavírání. */
var zNastaveni = false;
function vratDoNastaveni(){
  if(!zNastaveni) return false;
  zNastaveni = false;
  naKartuNastaveni(1);
  renderRezimy();
  otevriModal("setmodal", null);
  return true;
}

/* ---------- tabulka pravidel podle režimu ----------
   Řádek se do tabulky dostane jen tehdy, když v tom režimu doopravdy
   boduje. Kombinace navíc a vlastní vzory se sázejí týmž textem jako čip
   v klávesnici a štítek v historii — malým písmenem, ať se to na třech
   místech nerozejde. */
function pravRadek(nazev, hodnota){
  return "<tr><td>" + esc(nazev) + "</td><td>" + esc(hodnota) + "</td></tr>";
}
/* Řádky jedné skupiny stejných čísel. Trojice se slijí do jednoho řádku,
   jen když jdou úměrně hodnotě — jinak by se rozsah 200–600 vztahoval na
   tabulku, která takhle nevypadá. Počty od čtyř výš se sázejí týmž zápisem
   jako štítek v historii („4× 5“), aby se ta dvě místa nerozešla. */
function stejnaRadky(rez, n){
  var pole = rez.stej[n], tab = "", v, nasobek, stejny = true;
  if(n === 3){
    if(pole[1] > 0) tab += pravRadek(t("pravidla.troj.1"), fmt(pole[1]));
    nasobek = pole[2] / 2;
    for(v = 2; v <= 6; v++){ if(!(pole[v] > 0) || pole[v] !== v * nasobek) stejny = false; }
    if(stejny) return tab + pravRadek(t("pravidla.t4n"), fmt(pole[2]) + "–" + fmt(pole[6]));
    for(v = 2; v <= 6; v++){
      if(pole[v] > 0) tab += pravRadek(t("pravidla.troj." + v), fmt(pole[v]));
    }
    return tab;
  }
  for(v = 1; v <= 6; v++){
    if(!(pole[v] > 0)) continue;
    tab += pravRadek(n === 2 ? t("pravidla.dvoj." + v) : t("stitek.n", { p: n, h: v }), fmt(pole[v]));
  }
  return tab;
}
function pravidlaHTML(rez){
  var out = "", tab = "", v, i, n, k, komb;
  var m = nejvyssiStej(rez), pocty = poctyStej(rez);
  out += "<p>" + t("pravidla.p1", { kostky: esc(tn("slovo.kostkami", rez.kostek)) }) + "</p>";
  out += "<p>" + t("pravidla.p2") + "</p>";
  out += "<p>" + t("pravidla.p3", { kostky: esc(tn("slovo.kostkami", rez.kostek)) }) + "</p>";

  for(v = 1; v <= 6; v++){
    if(rez.sam[v] > 0) tab += pravRadek(t("pravidla.sam." + v), fmt(rez.sam[v]));
  }
  for(i = 0; i < pocty.length; i++){ tab += stejnaRadky(rez, pocty[i]); }
  /* Počty nad nejvyšší nastavenou skupinou patří do tabulky, ne do poznámky:
     jen tak se vypíše právě tolik počtů, kolik se jich v tom režimu vejde.
     Násobek se sází číslem, ne slovem — práh se dá posunout, takže
     „dvojnásobek trojice“ by u jiné skupiny lhal. */
  if(m !== null){
    for(n = m + 1; n <= rez.kostek; n++){
      tab += pravRadek(t("pravidla.stejnych." + n), rez.nad === "pevne"
        ? fmt(rez.nadP[n] || 0)
        : "×" + (rez.nad === "nasobek" ? (n - m + 1) : Math.pow(2, n - m)));
    }
  }
  for(i = 0; i < POST_PORADI.length; i++){
    k = POST_PORADI[i];
    if(!(rez.post[k] > 0) || STRAIGHTS[k].d > rez.kostek) continue;
    tab += pravRadek(t("pravidla.post." + k), fmt(rez.post[k]));
  }
  for(i = 0; i < PRESET_PORADI.length; i++){
    k = PRESET_PORADI[i];
    if(!kombZap(rez, k) || !kombVRezimu(rez, k)) continue;
    tab += pravRadek(t("stitek." + PRESETY[k].k), fmt(sazba(rez, k)));
  }
  /* Vlastní kombinace se sázejí jménem a za ním zápisem vzorů — týmž
     zápisem jako v nastavení, ať se ta dvě místa nerozejdou. */
  komb = kombinaceZap(rez);
  for(i = 0; i < komb.length; i++){
    tab += pravRadek(nazevKombinace(komb[i]) + " · " + zapisKombinace(komb[i]), fmt(komb[i].b));
  }
  out += "<table>" + (tab || pravRadek(t("pravidla.nicneboduje"), "—")) + "</table>";

  if(!pocetKombinaci(rez)) out += '<p class="note">' + esc(t("pravidla.pozn2")) + "</p>";
  if(!rez.vlastni) out += '<p class="note">' + t("rezim.pozn." + rez.id) + "</p>";
  return out;
}

/* ---------- dvě karty v okně s informacemi ---------- */
var otevriNavod = null, otevriPravidla = null, prekresliPravidla = null;

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initKartyPravidel(){
  (function(){
    var tlac = $("infoseg").children;
    var karty = [$("cardrules"), $("cardguide")];
    /* Které pravidla se právě ukazují: null je aktivní režim (tlačítko „i“),
       jinak ten, u kterého se kleplo v nastavení. */
    var ukazujeme = null;
    function vyber(i){
      karty.forEach(function(k, j){ k.hidden = j !== i; });
      Array.prototype.forEach.call(tlac, function(b, j){ b.classList.toggle("on", j === i); });
      var telo = $("rulesmodal").querySelector(".modalbody");
      if(telo) telo.scrollTop = 0;
    }
    function kresli(){
      var rez = (ukazujeme && rezimPodleId(ukazujeme)) || aktRezim();
      $("pravidlarezim").textContent = nazevRezimu(rez);
      $("pravidlatelo").innerHTML = pravidlaHTML(rez);
    }
    Array.prototype.forEach.call(tlac, function(b, i){
      b.addEventListener("click", function(){ vyber(i); });
    });
    $("infobtn").addEventListener("click", function(){
      ukazujeme = null; zNastaveni = false; kresli(); vyber(0);
    });
    otevriNavod = function(){
      ukazujeme = null; zNastaveni = false; kresli();
      vyber(1);
      otevriModal("rulesmodal", null);
    };
    otevriPravidla = function(id){
      ukazujeme = id; kresli();
      vyber(0);
      /* Pravidla otevřená z nastavení jsou odbočka, ne odchod: zavírací cesta
         okna (křížek, tmavé pozadí i Escape) vrátí nastavení tam, kde bylo. */
      zNastaveni = true;
      otevriModal("rulesmodal", null);
    };
    prekresliPravidla = kresli;
    kresli();
  })();
}

export { otevriNavod, otevriPravidla, pravRadek, pravidlaHTML, prekresliPravidla, stejnaRadky, vratDoNastaveni, zNastaveni };
