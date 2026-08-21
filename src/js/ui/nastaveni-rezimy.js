/* Karta Herní režimy v nastavení: seznam, detail, šest sekcí.

   Závisí na: pravidla, stav, text, ui/prvky
   Sahá na: DOM

   Zůstává jedním velkým modulem schválně: seznam, detail a šest sekcí jsou
   jedna těsně provázaná editační plocha a rozdělením by vznikly soubory,
   které nejdou pochopit odděleně.

   Seznam se kreslí i pod otevřeným detailem a detail i pod otevřeným
   editorem; je to pár řádků a odpadá tím třída chyb, kdy se návratem
   odkryl seznam z minula.

   Přepnout režim jde jen nad prázdnou hrou — kolo podle jedněch pravidel
   a další podle jiných by dalo skóre, které nic neznamená. */
import { zmenaRezimu } from "../akce.js";
import { t, tn } from "../jazyky/jadro.js";
import {
  BODY_MAX,
  PRESETY,
  PRESET_PORADI,
  VLASTNI_MAX,
  VZORU_MAX,
  cistyTvar,
  kombVRezimu,
  kombZap,
  pocetKombinaci,
  pocetKostekVzoru,
  poctyKostekKombinace,
  rozbalPocty,
  sazba,
  zapisKombinace,
  zapisVzoru
} from "../pravidla/kombinace.js";
import { POST_PORADI, STRAIGHTS } from "../pravidla/postupky.js";
import {
  NAD_DRUHY,
  POCTY_STEJ,
  PRAH_ZAKLAD,
  PRESET_REZIMY,
  PRESET_REZ_PORADI,
  REZIMY,
  REZIMY_MAX,
  SAM_ZAKLAD,
  TROJ_ZAKLAD,
  VYCHOZI_REZIM,
  aktRezim,
  cistyRezim,
  nazevRezimu,
  nejvyssiStej,
  novyIdRezimu,
  odchylkyRezimu,
  prahStej,
  rezimPodleId,
  sestiZap,
  stejZap,
  ulozRezimy,
  venRezim,
  zPresetu
} from "../pravidla/rezimy.js";
import { rizikoHotovo, tabulkaRizika } from "../pravidla/riziko.js";
import { NAZEV_MAX, naCislo, newId } from "../spolecne.js";
import { S, gameEmpty } from "../stav/stav.js";
import { desetina, esc, fmt } from "../text/format.js";
import { otevriPravidla, prekresliPravidla } from "./okno-pravidla.js";
import { $ } from "./prvky.js";
import { render } from "./vykresleni.js";

/* ---------- karta Herní režimy v nastavení ----------
   Řádky se staví z uzlů jako kosRadek(), ne z innerHTML — je to zavedený
   vzor v tomhle okně a nepotřebuje esc(). Přepínače hlásí stav, ne akci:
   text říká Zapnuto/Vypnuto a v zapnutém stavu nese třídu `on`; co
   klepnutí udělá, zůstává v title a aria-label. */
var kombNovy = [];
/* Sazba upravená a pak vypnutá se v rámci sezení pamatuje, aby ji zpětné
   zapnutí nepřepsalo výchozí hodnotou. Do úložiště nejde: uložený stav má
   mít jednu pravdu, a tou je přítomnost klíče v `p` režimu. */
var kombSazbyPamet = {};
/* Rozdělaná otázka na smazání kombinace, jednoho jejího vzoru a celého
   režimu — jedna na oddíl, stejně jako ptamSeKos v koších. */
var ptamSeVzor = null, ptamSeRezim = null, ptamSeTvar = null;
/* Který režim se právě upravuje a která jeho vlastní kombinace; null je
   o patro výš, tedy seznam režimů a detail režimu. */
var rezEdit = null, kombEdit = null;
function editRezim(){ return rezEdit ? rezimPodleId(rezEdit) : null; }

/* Název režimu se skládá na jednom místě: preset ho bere z katalogu podle
   id (a přeloží se), vlastní si veze svůj vlastní text. */
/* Podřádek seznamu: čím se ten režim liší, aniž by se musel otevřít. */
function popisRezimuKratky(rez){
  var kusy = [tn("slovo.kostek", rez.kostek)], p = 0, i;
  for(i = 0; i < POST_PORADI.length; i++){
    if(rez.post[POST_PORADI[i]] > 0 && STRAIGHTS[POST_PORADI[i]].d <= rez.kostek) p++;
  }
  kusy.push(tn("rezim.postupek", p));
  var k = pocetKombinaci(rez);
  if(k) kusy.push(tn("rezim.kombinaci", k));
  return kusy.join(" · ");
}

function stavTlacitko(btn, zap, klicAkce){
  btn.textContent = t(zap ? "spol.zapnuto" : "nast.vypnuto");
  btn.classList.toggle("on", zap);
  var label = t(klicAkce);
  btn.title = label;
  btn.setAttribute("aria-label", label);
}
/* Společný tvar popisu: nadpis řádku a pod ním podřádek. `serif` sází nadpis
   patkově — patří tam zápis kombinace (1,1,1+5,5), ne prozaický název. */
function kombPopis(nadpis, serif, podradek){
  var t1 = document.createElement("div");
  t1.className = "t";
  var b = document.createElement("b");
  if(serif) b.className = "zapis";
  b.textContent = nadpis;
  var s = document.createElement("span");
  s.innerHTML = podradek;
  t1.appendChild(b); t1.appendChild(s);
  return t1;
}
/* Pole s body. Po úpravě se uloží a přepíše se klávesnice — celý oddíl se
   překreslovat nesmí, jinak by pole ztratilo kurzor uprostřed psaní.
   `nula` pouští nulu, která u sazby v tabulce znamená „neboduje“; a právě
   ta riziko mění, takže se s ním přepisuje i pás na spodní hraně. */
function kombPoleSazby(hodnota, aktivni, zapis, aria, nula){
  var pole = document.createElement("input");
  pole.type = "number"; pole.className = "kombsazba"; pole.min = nula ? "0" : "1"; pole.step = "50";
  pole.inputMode = "numeric";
  pole.value = hodnota;
  pole.disabled = !aktivni;
  pole.setAttribute("aria-label", aria || t("komb.sazba"));
  pole.addEventListener("input", function(){
    var v = Math.floor(naCislo(parseInt(pole.value, 10), -1));
    if(v < (nula ? 0 : 1) || v > BODY_MAX) return;
    zapis(v);
    ulozRezimy(); render();
    /* Oddíl se překreslovat nesmí (pole by ztratilo kurzor), ale poslední
       řádek o tom, jestli je co obnovovat, se změnou sazby mění — a ten
       jediný se přepsat dá, žádné pole v něm není. */
    var rez = editRezim();
    if(rez){ renderRezKonec(rez); renderRezPruh(rez); }
  });
  return pole;
}
/* Řádek tabulky pravidel: popis vlevo, pole s body vpravo, žádný přepínač.
   Nula znamená, že to v tomhle režimu neboduje. */
function rezRadekBodu(nadpis, podradek, hodnota, zapis){
  var row = document.createElement("div");
  row.className = "setrow kombrow";
  row.appendChild(kombPopis(nadpis, false, esc(podradek)));
  row.appendChild(kombPoleSazby(hodnota, true, zapis, nadpis, true));
  return row;
}
function kombPresetRadek(rez, k){
  var def = PRESETY[k], zap = kombZap(rez, k);
  var row = document.createElement("div");
  row.className = "setrow kombrow";
  row.dataset.preset = k;
  var popis = kombPopis(t("stitek." + def.k), false,
    '<span class="zapis">' + esc(def.zapis) + "</span> · " + esc(tn("slovo.kostek", def.d)));
  var pole = kombPoleSazby(sazba(rez, k), zap, function(v){
    if(!kombZap(rez, k)) return;
    rez.p[k] = v; kombSazbyPamet[k] = v;
  });
  var btns = document.createElement("div");
  btns.className = "setbtns";
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "ghost";
  stavTlacitko(btn, zap, zap ? "komb.vypnout" : "komb.zapnout");
  btn.addEventListener("click", function(){
    if(kombZap(rez, k)){
      kombSazbyPamet[k] = rez.p[k];
      delete rez.p[k];
    } else {
      rez.p[k] = kombSazbyPamet[k] || PRESETY[k].def;
    }
    zmenaRezimu();
  });
  btns.appendChild(btn);
  row.appendChild(popis); row.appendChild(pole); row.appendChild(btns);
  return row;
}
/* Postupka se ovládá stejně jako kombinace navíc: sazba a přepínač.
   Chybějící klíč v `post` je vypnuto, takže se stav nemá kde rozejít. */
function rezPostRadek(rez, k){
  var s = STRAIGHTS[k], zap = rez.post[k] > 0;
  var row = document.createElement("div");
  row.className = "setrow kombrow";
  row.dataset.post = k;
  var popis = kombPopis(t("stitek." + s.k), false, esc(tn("slovo.kostek", s.d)));
  var pole = kombPoleSazby(zap ? rez.post[k] : (PRESET_REZIMY.kcd2.post[k] || 500), zap, function(v){
    if(rez.post[k] > 0) rez.post[k] = v;
  });
  var btns = document.createElement("div");
  btns.className = "setbtns";
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "ghost";
  stavTlacitko(btn, zap, zap ? "komb.vypnout" : "komb.zapnout");
  btn.addEventListener("click", function(){
    if(rez.post[k] > 0) delete rez.post[k];
    else rez.post[k] = Math.floor(naCislo(parseInt(pole.value, 10), 0)) || PRESET_REZIMY.kcd2.post[k] || 500;
    zmenaRezimu();
  });
  btns.appendChild(btn);
  row.appendChild(popis); row.appendChild(pole); row.appendChild(btns);
  return row;
}
/* Vlastní kombinace v seznamu: jméno, body se zápisem vzorů v podřádku
   a tři tlačítka — stav, Upravit a Smazat. Pole se sazbou tu není: body
   patří celé kombinaci, ne jednomu z jejích vzorů, a upravují se
   v podstránce, kde je vidět, čeho se týkají. Mazání se ptá ve dvou krocích
   jako v koších: kombinace se naťukává po kostkách a znovu se dělá pracně. */
function nazevKombinace(k){ return k.n || t("komb.beznazvu"); }
/* Podřádek: body, zápis vzorů a počty kostek. Kombinace, ze které se do
   režimu nevejde ani jeden vzor, to říká rovnou — ať se nehledá, proč čip
   v klávesnici chybí. */
function podradekKombinace(rez, k){
  var poc = poctyKostekKombinace(k, rez.kostek);
  return fmt(k.b) + " · " + zapisKombinace(k) + " · " +
         (poc.length ? poc.map(function(n){ return tn("slovo.kostek", n); }).join(" / ")
                     : t("komb.nevejde"));
}
function smazKombinaci(rez, id){
  rez.v = rez.v.filter(function(x){ return x.id !== id; });
  ptamSeVzor = null;
  if(kombEdit === id){ kombEdit = null; ptamSeTvar = null; kombNovy = []; }
  zmenaRezimu();
}
function kombVlastniRadek(rez, k){
  var row = document.createElement("div");
  row.className = "setrow kombrow";
  row.dataset.vzor = k.id;
  var btns = document.createElement("div");
  btns.className = "setbtns";

  if(ptamSeVzor === k.id){
    var otazka = document.createElement("div");
    otazka.className = "t";
    otazka.innerHTML = "<b>" + esc(t("komb.opravdusmazat")) + "</b><span>" +
                       esc(nazevKombinace(k)) + "</span>";
    var ano = document.createElement("button");
    ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
    ano.addEventListener("click", function(){ smazKombinaci(rez, k.id); });
    var ne = document.createElement("button");
    ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
    ne.addEventListener("click", function(){ ptamSeVzor = null; renderRezimy(); });
    btns.appendChild(ano); btns.appendChild(ne);
    row.appendChild(otazka); row.appendChild(btns);
    return row;
  }

  var popis = kombPopis(nazevKombinace(k), false, esc(podradekKombinace(rez, k)));
  var prep = document.createElement("button");
  prep.type = "button"; prep.className = "ghost rezbtn";
  stavTlacitko(prep, k.z, k.z ? "komb.vypnout" : "komb.zapnout");
  prep.addEventListener("click", function(){ k.z = !k.z; zmenaRezimu(); });
  var upr = document.createElement("button");
  upr.type = "button"; upr.className = "ghost rezbtn"; upr.textContent = t("rezim.upravit");
  upr.addEventListener("click", function(){ naKombiDetail(k.id); });
  var sm = document.createElement("button");
  sm.type = "button"; sm.className = "ghost rezbtn"; sm.textContent = t("spol.smazat");
  sm.addEventListener("click", function(){ ptamSeVzor = k.id; renderRezimy(); });
  btns.appendChild(prep); btns.appendChild(upr); btns.appendChild(sm);
  row.appendChild(popis); row.appendChild(btns);
  return row;
}

/* ---------- seznam režimů ---------- */
function rezRadek(rez){
  var row = document.createElement("div");
  row.className = "setrow kombrow";
  row.dataset.rezim = rez.id;
  var btns = document.createElement("div");
  btns.className = "setbtns";

  if(ptamSeRezim === rez.id){
    var otazka = document.createElement("div");
    otazka.className = "t";
    otazka.innerHTML = "<b>" + esc(t("rezim.opravdusmazat")) + "</b><span>" +
                       esc(nazevRezimu(rez)) + "</span>";
    var ano = document.createElement("button");
    ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
    ano.addEventListener("click", function(){
      REZIMY.sez = REZIMY.sez.filter(function(x){ return x.id !== rez.id; });
      ptamSeRezim = null;
      if(rezEdit === rez.id) rezEdit = null;
      zmenaRezimu();
    });
    var ne = document.createElement("button");
    ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
    ne.addEventListener("click", function(){ ptamSeRezim = null; renderRezimy(); });
    btns.appendChild(ano); btns.appendChild(ne);
    row.appendChild(otazka); row.appendChild(btns);
    return row;
  }

  var popis = kombPopis(nazevRezimu(rez), false, esc(popisRezimuKratky(rez)));
  var prav = document.createElement("button");
  prav.type = "button"; prav.className = "ghost rezbtn"; prav.textContent = t("rezim.pravidla");
  prav.addEventListener("click", function(){ otevriPravidla(rez.id); });
  var upr = document.createElement("button");
  upr.type = "button"; upr.className = "ghost rezbtn"; upr.textContent = t("rezim.upravit");
  upr.addEventListener("click", function(){ naRezimDetail(rez.id); });
  var zvol = document.createElement("button");
  zvol.type = "button"; zvol.className = "ghost rezbtn";
  var akt = REZIMY.akt === rez.id;
  zvol.textContent = t(akt ? "rezim.zvoleno" : "rezim.zvolitkratce");
  zvol.classList.toggle("on", akt);
  zvol.title = t("rezim.zvolit");
  zvol.setAttribute("aria-label", t("rezim.zvolit"));
  /* Přepnout pravidla uprostřed hry nejde: kolo už zapsané by se počítalo
     podle jiné tabulky než to následující a v historii by režim lhal
     o první půlce hry. */
  zvol.disabled = akt || !gameEmpty();
  zvol.addEventListener("click", function(){
    if(!gameEmpty()) return;
    REZIMY.akt = rez.id;
    S.rolls = [{thrown: rez.kostek, hot:false, items:[]}];
    zmenaRezimu();
  });
  btns.appendChild(prav); btns.appendChild(upr); btns.appendChild(zvol);
  row.appendChild(popis); row.appendChild(btns);
  return row;
}
function renderRezSeznam(){
  var kam = $("rezrows");
  kam.innerHTML = "";
  REZIMY.sez.forEach(function(rez){ kam.appendChild(rezRadek(rez)); });
  var zam = $("rezzamek");
  zam.textContent = gameEmpty() ? "" : t("rezim.zamceno");
  zam.hidden = gameEmpty();
  var strop = REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX;
  var zpr = $("rezstrop");
  zpr.textContent = strop ? t("rezim.strop", { n: REZIMY_MAX }) : "";
  zpr.hidden = !strop;
  $("reznovy").disabled = strop;
}
/* ---------- detail jednoho režimu ---------- */
/* Detail režimu má šest sekcí a každá svůj nadpis s linkou: samostatné
   kostky, stejná čísla, postupky, kombinace navíc, vlastní kombinace
   a nastavení. Nadpisy stojí staticky v HTML, obsah sekcí se staví tady. */
function renderRezDetail(rez){
  $("reztitul").textContent = nazevRezimu(rez);
  $("reznazevrow").hidden = !rez.vlastni;
  if(rez.vlastni && document.activeElement !== $("reznazevpole")){
    $("reznazevpole").value = rez.nazev || "";
  }
  $("rezkostek").value = String(rez.kostek);

  var sam = $("rezsam");
  sam.innerHTML = "";
  sam.appendChild(prepinacRadek(t("rezim.sam.n"), t("rezim.sam.p"), sestiZap(rez.sam),
                                function(){ prepniSam(rez); }));
  if(sestiZap(rez.sam)) sam.appendChild(mrizkaSazeb(rez.sam, 1));

  renderRezStej(rez);

  var post = $("rezpost");
  post.innerHTML = "";
  POST_PORADI.forEach(function(k){
    if(STRAIGHTS[k].d > rez.kostek) return;
    post.appendChild(rezPostRadek(rez, k));
  });

  var seznam = $("komblist");
  seznam.innerHTML = "";
  PRESET_PORADI.forEach(function(k){
    if(!kombVRezimu(rez, k)) return;
    seznam.appendChild(kombPresetRadek(rez, k));
  });

  var vlastni = $("kombvlastni");
  vlastni.innerHTML = "";
  if(!rez.v.length){
    ptamSeVzor = null;
    vlastni.innerHTML = '<div class="empty">' + esc(t("komb.zadne")) + "</div>";
  } else {
    rez.v.forEach(function(k){ vlastni.appendChild(kombVlastniRadek(rez, k)); });
  }
  /* Strop se hlásí sám a předem, ne až po marném klepnutí na zamčené
     tlačítko. */
  var strop = rez.v.length >= VLASTNI_MAX;
  $("kombnovy").disabled = strop;
  var zpr = $("kombzprava");
  zpr.textContent = strop ? t("komb.strop", { n: VLASTNI_MAX }) : "";
  zpr.hidden = !strop;

  renderRezKonec(rez);
  renderRezPruh(rez);
}
/* Řádek s přepínačem stavu: popis vlevo, tlačítko vpravo. Tlačítko hlásí
   stav (Zapnuto / Vypnuto), akci nese v title a aria-label. */
function prepinacRadek(nadpis, podradek, zap, akce, klicZap, klicVyp){
  var row = document.createElement("div");
  row.className = "setrow kombrow";
  row.appendChild(kombPopis(nadpis, false, esc(podradek)));
  var btns = document.createElement("div");
  btns.className = "setbtns";
  var b = document.createElement("button");
  b.type = "button"; b.className = "ghost";
  stavTlacitko(b, zap, zap ? (klicVyp || "rezim.skupina.vypnout")
                           : (klicZap || "rezim.skupina.zapnout"));
  b.addEventListener("click", akce);
  btns.appendChild(b);
  row.appendChild(btns);
  return row;
}
/* Šest polí jedné šestice sazeb. Vypnutá šestice svoje pole schová — šest
   nul na obrazovce je horší než nic, protože vypadají jako nastavení, které
   se dá měnit. */
function mrizkaSazeb(pole, pocet){
  var grid = document.createElement("div"), v;
  grid.className = "trojgrid";
  grid.dataset.skupina = String(pocet);
  for(v = 1; v <= 6; v++){ grid.appendChild(sazbaPole(pole, pocet, v)); }
  return grid;
}
/* Popisek pole je jazykově neutrální (3× 4), takže se nepřekládá; do
   aria-label se skládá věta, protože „3× 4“ přečtené nahlas nic neřekne. */
function sazbaPole(pole, pocet, v){
  var wrap = document.createElement("label");
  wrap.className = "trojpole";
  var lbl = document.createElement("span");
  lbl.textContent = pocet + "× " + v;
  var vstup = kombPoleSazby(pole[v], true, function(x){ pole[v] = x; },
                            t("rezim.aria." + pocet, { v: v }), true);
  wrap.appendChild(lbl); wrap.appendChild(vstup);
  return wrap;
}
/* Vypnutí vynuluje celou šestici, zapnutí vrátí, co v ní bylo. Paměť je
   runtime, do úložiště nejde: uložený stav má mít jednu pravdu, a tou jsou
   ta čísla. */
var samPamet = {}, stejPamet = {}, rozsPamet = {};
function prepniSam(rez){
  if(sestiZap(rez.sam)){
    samPamet[rez.id] = rez.sam.slice();
    rez.sam = [0,0,0,0,0,0,0];
  } else {
    rez.sam = (samPamet[rez.id] || SAM_ZAKLAD).slice();
  }
  zmenaRezimu();
}
/* Sekce stejných čísel. V základním pohledu jeden práh a jedna mřížka,
   v rozšířeném pět podsekcí s vlastními přepínači — dvojice až šestice.
   Obojí kreslí tatáž mřížka, protože se liší jen tím, kolik jich je. */
function renderRezStej(rez){
  var kam = $("rezstej"), i, n;
  var m = nejvyssiStej(rez), prah = prahStej(rez);
  /* Pravidlo nad skupinou se stěhuje pod tu skupinu, ke které zrovna patří.
     Než se sekce vyprázdní, musí se odvézt do bezpečí — innerHTML by ho
     jinak smazalo i s posluchači. */
  $("rezdetail").appendChild($("reznadwrap"));
  kam.innerHTML = "";
  stavTlacitko($("rezrozs"), rez.rozs, rez.rozs ? "rezim.rozs.vypnout" : "rezim.rozs.zapnout");
  $("rezprahrow").hidden = rez.rozs;
  if(!rez.rozs){
    naplnPrah(rez);
    stavTlacitko($("rezstejzap"), prah !== null,
                 prah !== null ? "rezim.stej.vypnout" : "rezim.stej.zapnout");
    $("rezprah").disabled = prah === null;
    if(prah !== null) kam.appendChild(mrizkaSazeb(rez.stej[prah], prah));
    umistiNad(rez, m, kam);
    return;
  }
  for(i = 0; i < POCTY_STEJ.length; i++){
    n = POCTY_STEJ[i];
    if(n > rez.kostek) continue;   /* víc stejných, než se hází, nikdy nepadne */
    kam.appendChild(stejOddil(rez, n, m));
  }
}
/* Nabídka prahu končí u počtu kostek režimu. Vypnutá sekce v ní drží
   poslední známý práh, aby zapnutí neskočilo jinam, než odkud se vyplo. */
function naplnPrah(rez){
  var sel = $("rezprah"), n, o, prah = prahStej(rez);
  sel.innerHTML = "";
  for(n = 2; n <= rez.kostek; n++){
    o = document.createElement("option");
    o.value = String(n); o.textContent = n + "×";
    sel.appendChild(o);
  }
  if(prah === null) prah = Math.min(stejPamet[rez.id + ":prah"] || PRAH_ZAKLAD, rez.kostek);
  sel.value = String(prah);
}
/* Jedna podsekce rozšířeného pohledu: přepínač, mřížka a u nejvyšší
   zapnuté ještě pravidlo pro počty nad ní. */
function stejOddil(rez, n, m){
  var wrap = document.createElement("div"), zap = stejZap(rez, n);
  wrap.dataset.stej = String(n);
  wrap.appendChild(prepinacRadek(t("rezim.stej." + n), tn("slovo.kostek", n), zap,
                                 function(){ prepniStej(rez, n); }));
  if(zap) wrap.appendChild(mrizkaSazeb(rez.stej[n], n));
  if(n === m) umistiNad(rez, m, wrap);
  return wrap;
}
/* Pravidlo nad nejvyšší zapnutou skupinou. Ukazuje se právě u ní, a jen
   když je nad čím extrapolovat — když je nejvyšší skupina zároveň počtem
   kostek režimu, žádný vyšší počet nepadne a řádek by lhal. */
function umistiNad(rez, m, kam){
  var wrap = $("reznadwrap"), nadp = $("reznadp"), n;
  var videt = m !== null && m < rez.kostek;
  wrap.hidden = !videt;
  $("reznadnapoveda").hidden = true;
  $("reznadinfo").classList.remove("on");
  nadp.innerHTML = "";
  nadp.hidden = !videt || rez.nad !== "pevne";
  if(!videt) return;
  $("reznadtit").textContent = t("rezim.nadn." + (m + 1));
  $("reznad").value = rez.nad;
  if(rez.nad === "pevne"){
    for(n = m + 1; n <= rez.kostek; n++){ nadp.appendChild(nadPole(rez, n)); }
  }
  kam.appendChild(wrap);
}
/* Výchozí šestice pro nově zapnutý počet. Trojice mají zavedenou tabulku
   hodnota × 100, vyšší počty se od ní odvodí zdvojnásobením a dvojice
   hodnotou × 10 — čísla, se kterými jde dál pracovat, jsou lepší start
   než šest nul. */
function vychoziStej(n){
  var pole = [0,0,0,0,0,0,0], v;
  for(v = 1; v <= 6; v++){
    pole[v] = n === 2 ? (v === 1 ? 10 : v) * 10
                      : TROJ_ZAKLAD[v] * Math.pow(2, n - 3);
  }
  return pole;
}
function prepniStej(rez, n){
  var klic = rez.id + ":" + n;
  if(stejZap(rez, n)){
    stejPamet[klic] = rez.stej[n].slice();
    delete rez.stej[n];
  } else {
    rez.stej[n] = (stejPamet[klic] || vychoziStej(n)).slice();
  }
  zmenaRezimu();
}
/* Přepínač celé sekce v základním pohledu. Vypnutí si pamatuje práh
   i sazby, aby se zapnutím vrátilo totéž, co zmizelo. */
function prepniStejZaklad(rez){
  var prah = prahStej(rez), n;
  if(prah !== null){
    stejPamet[rez.id + ":" + prah] = rez.stej[prah].slice();
    stejPamet[rez.id + ":prah"] = prah;
    rez.stej = {};
  } else {
    n = Math.min(stejPamet[rez.id + ":prah"] || PRAH_ZAKLAD, rez.kostek);
    rez.stej = {};
    rez.stej[n] = (stejPamet[rez.id + ":" + n] || vychoziStej(n)).slice();
  }
  zmenaRezimu();
}
/* Posun prahu stěhuje šestici sazeb na nový počet — nevzniká druhá tabulka
   vedle první a hodnoty se přepisovat nemusí. V základním pohledu je klíč
   vždycky jediný, takže se mapa smí přepsat celá. */
function posunPrah(rez, n){
  var prah = prahStej(rez), pole;
  if(!(n >= 2 && n <= rez.kostek) || prah === n) return;
  pole = prah === null ? null : rez.stej[prah];
  rez.stej = {};
  rez.stej[n] = pole ? pole.slice() : vychoziStej(n);
}
/* Návrat do základního pohledu nechá nejnižší zapnutý počet a ostatní
   odloží do runtime paměti: základní pohled umí ukázat jediný práh
   a mlčky bodovat podle něčeho, co není vidět, je horší než je vypnout. */
function prepniRozs(rez){
  var prah, i, n, sebrane;
  if(rez.rozs){
    prah = prahStej(rez);
    sebrane = [];
    for(i = 0; i < POCTY_STEJ.length; i++){
      n = POCTY_STEJ[i];
      if(n === prah || !rez.stej[n]) continue;
      stejPamet[rez.id + ":" + n] = rez.stej[n].slice();
      sebrane.push(n);
      delete rez.stej[n];
    }
    /* Co sebral návrat do základního, to zapnutí rozšířeného vrátí —
       a jen to. Počet vypnutý ručně se sám zpátky neobjeví. */
    rozsPamet[rez.id] = sebrane;
    rez.rozs = false;
  } else {
    sebrane = rozsPamet[rez.id] || [];
    for(i = 0; i < sebrane.length; i++){
      n = sebrane[i];
      if(!rez.stej[n] && stejPamet[rez.id + ":" + n]) rez.stej[n] = stejPamet[rez.id + ":" + n].slice();
    }
    rozsPamet[rez.id] = [];
    rez.rozs = true;
  }
  zmenaRezimu();
}
function nadPole(rez, n){
  var wrap = document.createElement("label");
  wrap.className = "trojpole";
  var lbl = document.createElement("span");
  lbl.textContent = n + "×";
  var pole = kombPoleSazby(rez.nadP[n], true, function(x){ rez.nadP[n] = x; },
                           t("rezim.nadaria", { n: n }), true);
  wrap.appendChild(lbl); wrap.appendChild(pole);
  return wrap;
}
/* Pás je patička celého okna, ne prvek karty, takže se o svoje skrývání
   musí starat sám — jinak by visel i na kartě Obecné a nad seznamem. */
function ukazRezPruh(){
  var pruh = $("rezriziko");
  /* Editor kombinace mění pravidla stejně jako detail režimu, takže pás
     patří i tam; nad seznamem a na kartě Obecné ne. */
  if(pruh) pruh.hidden = $("setcardrezimy").hidden ||
                         ($("rezdetail").hidden && $("kombdetail").hidden);
}
/* Text pásu. Vlastní dveře k překreslení, ne součást renderRezDetail():
   mění se i při psaní do pole se sazbou a celý oddíl se tam překreslovat
   nesmí. Ukazuje celou křivku — při stavbě pravidel je zajímavé právě to,
   jak riziko klesá s ubývajícími kostkami. */
function renderRezPruh(rez){
  var pruh = $("rezriziko");
  if(!pruh) return;
  var tab = tabulkaRizika(rez), kusy = [], n;
  if(rizikoHotovo(rez)){
    for(n = 1; n <= rez.kostek; n++){
      kusy.push(t("rezim.riziko.pol", { n: n, p: desetina(tab[n - 1]) }));
    }
  } else {
    kusy.push(t("rezim.riziko.pocita"));
  }
  pruh.innerHTML = "<b>" + esc(t("rezim.riziko.n")) + "</b>" + esc(kusy.join(" · "));
}
/* Poslední řádek detailu: preset se vrací k výchozím hodnotám, vlastní se
   maže. Obojí dvoukrokově jako koše. Zvolený režim smazat nejde — jinak by
   rozehraná hra i volba ukazovaly na neexistující id. */
function renderRezKonec(rez){
  var row = $("rezkonecrow");
  row.innerHTML = "";
  row.className = "setrow kombrow";
  var btns = document.createElement("div");
  btns.className = "setbtns";
  /* Duplikát je vždycky vlastní režim, i když se kopíruje preset — jinak
     by existovaly dva režimy s týmž id. */
  var dupl = document.createElement("button");
  dupl.type = "button"; dupl.className = "ghost"; dupl.textContent = t("rezim.dupl.btn");
  dupl.disabled = REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX;
  dupl.addEventListener("click", function(){ duplikujRezim(rez); });
  var duplRow = $("rezduplrow");
  duplRow.innerHTML = "";
  duplRow.className = "setrow kombrow";
  duplRow.appendChild(kombPopis(t("rezim.dupl.n"), false, esc(t("rezim.dupl.p"))));
  var duplBtns = document.createElement("div");
  duplBtns.className = "setbtns";
  duplBtns.appendChild(dupl);
  duplRow.appendChild(duplBtns);
  if(!rez.vlastni){
    var puvodni = odchylkyRezimu(rez) === null;
    row.appendChild(kombPopis(t("rezim.vychozi.n"), false, esc(t("rezim.vychozi.p"))));
    var ob = document.createElement("button");
    ob.type = "button"; ob.className = "ghost"; ob.textContent = t("rezim.vychozi.btn");
    ob.disabled = puvodni;
    ob.addEventListener("click", function(){
      var cerstvy = zPresetu(rez.id), k;
      for(k in cerstvy){ if(Object.prototype.hasOwnProperty.call(cerstvy, k)) rez[k] = cerstvy[k]; }
      ptamSeVzor = null;
      zmenaRezimu();
    });
    btns.appendChild(ob);
    row.appendChild(btns);
    return;
  }
  if(REZIMY.akt === rez.id){
    row.appendChild(kombPopis(t("rezim.smazat.n"), false, esc(t("rezim.nesmazat"))));
    row.appendChild(btns);
    return;
  }
  row.appendChild(kombPopis(t("rezim.smazat.n"), false, esc(t("rezim.smazat.p"))));
  var sm = document.createElement("button");
  sm.type = "button"; sm.className = "ghost"; sm.textContent = t("spol.smazat");
  sm.addEventListener("click", function(){
    ptamSeRezim = rez.id;
    naRezimSeznam();
  });
  btns.appendChild(sm);
  row.appendChild(btns);
}
/* Hluboká kopie: vlastní vzory dostanou nová id, aby si originál a kopie
   nepletly rozdělanou otázku na smazání. */
function duplikujRezim(rez){
  if(REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX) return;
  var kopie = cistyRezim(venRezim(rez), novyIdRezimu(), VYCHOZI_REZIM);
  kopie.nazev = t("rezim.kopie", { n: nazevRezimu(rez) }).slice(0, NAZEV_MAX);
  kopie.v.forEach(function(vz){ vz.id = newId(); });
  REZIMY.sez.push(kopie);
  ulozRezimy();
  naRezimDetail(kopie.id);
}
function naRezimSeznam(){
  rezEdit = null; kombEdit = null;
  ptamSeVzor = null; ptamSeTvar = null;
  renderRezimy();
}
function naRezimDetail(id){
  rezEdit = id; kombEdit = null;
  ptamSeVzor = null; ptamSeRezim = null; ptamSeTvar = null;
  kombNovy = [];
  renderRezimy();
}
function naKombiDetail(id){
  kombEdit = id; ptamSeVzor = null; ptamSeTvar = null;
  kombNovy = [];
  renderRezimy();
}
function naKombiZpet(){
  kombEdit = null; ptamSeVzor = null; ptamSeTvar = null;
  kombNovy = [];
  renderRezimy();
}
function editKombi(){
  var rez = editRezim(), i;
  if(!rez || !kombEdit) return null;
  for(i = 0; i < rez.v.length; i++){ if(rez.v[i].id === kombEdit) return rez.v[i]; }
  return null;
}
/* Jediné dveře k překreslení celé karty: rozhodne, která ze tří podstránek
   je vidět, a doplní název režimu na přepínači karet. */
function renderRezimy(){
  if(!$("rezrows")) return;
  var rez = editRezim();
  if(rezEdit && !rez){ rezEdit = null; }
  var k = editKombi();
  if(kombEdit && !k){ kombEdit = null; }
  var vDetailu = !!rez, vKombi = vDetailu && !!k;
  $("rezlist").hidden = vDetailu;
  $("rezdetail").hidden = !vDetailu || vKombi;
  $("kombdetail").hidden = !vKombi;
  var el = $("reznazev");
  if(el) el.textContent = "(" + nazevRezimu(aktRezim()) + ")";
  /* Seznam se kreslí vždycky, i když je zrovna schovaný pod detailem: je
     to pár řádků a odpadá tím celá třída chyb, kdy se návratem odkryl
     seznam z minula. Totéž platí o detailu pod editorem kombinace. */
  renderRezSeznam();
  if(vDetailu) renderRezDetail(rez);
  if(vKombi) renderKombDetail(rez, k);
  ukazRezPruh();
}
/* ---------- editor jedné vlastní kombinace ----------
   Jméno, body, stav a jeden až šest vzorů. Vzory jsou spojené „nebo“:
   kombinace boduje, jakmile sedne kterýkoli z nich, a platí pořád stejně. */
function renderKombDetail(rez, k){
  $("kombtitul").textContent = nazevKombinace(k);
  if(document.activeElement !== $("kombnazevpole")) $("kombnazevpole").value = k.n || "";

  var bodyRow = $("kombbodyrow");
  bodyRow.innerHTML = "";
  var row = document.createElement("div");
  row.className = "setrow kombrow";
  row.appendChild(kombPopis(t("komb.body.n"), false, esc(t("komb.body.p"))));
  row.appendChild(kombPoleSazby(k.b, true, function(v){ k.b = v; }));
  bodyRow.appendChild(row);

  var stavRow = $("kombstavrow");
  stavRow.innerHTML = "";
  stavRow.appendChild(prepinacRadek(t("komb.stav.n"), t("komb.stav.p"), k.z,
    function(){ k.z = !k.z; zmenaRezimu(); }, "komb.zapnout", "komb.vypnout"));

  var vzory = $("kombvzory");
  vzory.innerHTML = "";
  k.vz.forEach(function(x, i){ vzory.appendChild(kombVzorRadek(rez, k, i)); });

  renderKombiNovy();

  var sm = $("kombsmazrow");
  sm.innerHTML = "";
  sm.appendChild(kombSmazRadek(rez, k));
  renderRezPruh(rez);
}
/* Řádek jednoho vzoru: zápis, počet kostek a Smazat ve dvou krocích.
   Poslední vzor smazat nejde — kombinace bez vzoru by neměla co bodovat
   a v seznamu by visela naprázdno; od toho je Smazat celou kombinaci. */
function kombVzorRadek(rez, k, i){
  var x = k.vz[i], row = document.createElement("div");
  row.className = "setrow kombrow";
  row.dataset.tvar = String(i);
  var btns = document.createElement("div");
  btns.className = "setbtns";

  if(ptamSeTvar === i){
    var otazka = document.createElement("div");
    otazka.className = "t";
    otazka.innerHTML = "<b>" + esc(t("komb.opravdusmazatvzor")) +
                       '</b><span class="zapis">' + esc(zapisVzoru(x)) + "</span>";
    var ano = document.createElement("button");
    ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
    ano.addEventListener("click", function(){
      k.vz.splice(i, 1);
      ptamSeTvar = null;
      zmenaRezimu();
    });
    var ne = document.createElement("button");
    ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
    ne.addEventListener("click", function(){ ptamSeTvar = null; renderRezimy(); });
    btns.appendChild(ano); btns.appendChild(ne);
    row.appendChild(otazka); row.appendChild(btns);
    return row;
  }

  var kostek = pocetKostekVzoru(x), vejde = kostek <= rez.kostek;
  var podradek = esc(tn("slovo.kostek", kostek)) +
                 (vejde ? "" : " · " + esc(t("komb.nevejde")));
  row.appendChild(kombPopis(zapisVzoru(x), true, podradek));
  var smaz = document.createElement("button");
  smaz.type = "button"; smaz.className = "ghost"; smaz.textContent = t("spol.smazat");
  smaz.disabled = k.vz.length < 2;
  smaz.addEventListener("click", function(){ ptamSeTvar = i; renderRezimy(); });
  btns.appendChild(smaz);
  row.appendChild(btns);
  return row;
}
/* Poslední řádek editoru: smazání celé kombinace, dvoukrokově jako všude
   jinde. Po smazání se editor zavře sám, protože nemá co ukazovat. */
function kombSmazRadek(rez, k){
  var row = document.createElement("div");
  row.className = "setrow kombrow";
  var btns = document.createElement("div");
  btns.className = "setbtns";
  if(ptamSeVzor === k.id){
    row.appendChild(kombPopis(t("komb.opravdusmazat"), false, esc(nazevKombinace(k))));
    var ano = document.createElement("button");
    ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
    ano.addEventListener("click", function(){ smazKombinaci(rez, k.id); });
    var ne = document.createElement("button");
    ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
    ne.addEventListener("click", function(){ ptamSeVzor = null; renderRezimy(); });
    btns.appendChild(ano); btns.appendChild(ne);
  } else {
    row.appendChild(kombPopis(t("komb.smazat.n"), false, esc(t("komb.smazat.p"))));
    var smaz = document.createElement("button");
    smaz.type = "button"; smaz.className = "ghost"; smaz.textContent = t("spol.smazat");
    smaz.addEventListener("click", function(){ ptamSeVzor = k.id; renderRezimy(); });
    btns.appendChild(smaz);
  }
  row.appendChild(btns);
  return row;
}
/* Výchozí jméno je Kombinace 1, 2, … a materializuje se hned při vzniku:
   kdyby se dopočítávalo z pořadí, smazání sourozence by ostatní
   přejmenovalo. Hledá se první volné číslo. */
function dalsiJmenoKombinace(rez){
  var jmena = {}, n = 1, i;
  for(i = 0; i < rez.v.length; i++) jmena[rez.v[i].n] = true;
  while(n < 99 && jmena[t("komb.vychozin", { n: n })]) n++;
  return t("komb.vychozin", { n: n });
}
/* Rozdělaný vzor se drží jako pole žetonů v pořadí naťukání: čísla 1–6 jsou
   konkrétní hodnoty, písmena "A"–"F" skupiny „libovolná, ale stejná“.
   Vzor z nich vyrobí vzorZZetonu() — na písmenech samotných nezáleží,
   A,A+B,B a B,B+C,C je týž vzor. */
function vzorZZetonu(zetony){
  var pocty = [0,0,0,0,0,0,0], skup = {}, klice = [], t = [], i, z;
  for(i = 0; i < zetony.length; i++){
    z = zetony[i];
    if(typeof z === "number"){ pocty[z]++; continue; }
    if(!skup[z]){ skup[z] = 0; klice.push(z); }
    skup[z]++;
  }
  for(i = 0; i < klice.length; i++) t.push(skup[klice[i]]);
  t.sort(function(a, b){ return b - a; });
  return { v: rozbalPocty(pocty), t: t, pocty: pocty, tvar: t };
}
/* Rozdělaný vzor: čipy přidávají kostky, Vymazat je sebere všechny.
   Míň než dvě kostky vzor nedává — jedna kostka je buď samostatná hodnota,
   nebo (jako písmeno) tvar, který sedne na cokoli. */
function renderKombiNovy(){
  var rez = editRezim(), k = editKombi();
  if(!rez || !k) return;
  var docasny = vzorZZetonu(kombNovy);
  $("kombvzor").textContent = kombNovy.length ? zapisVzoru(docasny) : "";
  $("kombvzorhint").textContent = kombNovy.length
    ? tn("slovo.kostek", kombNovy.length)
    : t("komb.naukej");
  /* Strop je počet kostek režimu: víc kostek, než se v něm hází, by dalo
     vzor, který nikdy nesedne. Zamyká obě řady stejně. */
  ["kombpips", "kombpism"].forEach(function(id){
    Array.prototype.forEach.call($(id).children, function(b){
      b.disabled = kombNovy.length >= rez.kostek;
    });
  });
  $("kombzrus").disabled = kombNovy.length === 0;
  var strop = k.vz.length >= VZORU_MAX;
  $("kombpridat").disabled = strop || kombNovy.length < 2;
  var zpr = $("kombvzorzprava");
  zpr.textContent = strop ? t("komb.stropvzoru", { n: VZORU_MAX }) : "";
  zpr.hidden = !strop;
}

/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —
   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */
export function initKartaRezimy(){
  /* ---------- ovládání karty Herní režimy ----------
     Přepínače a výběry překreslují oddíl celý, protože mění, co je vidět;
     textová a číselná pole jen ukládají, jinak by uprostřed psaní ztratila
     kurzor. */
  (function(){
    if(!$("rezback")) return;
    $("rezback").addEventListener("click", naRezimSeznam);
    $("reznovy").addEventListener("click", function(){
      if(REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX) return;
      var rez = cistyRezim(null, novyIdRezimu(), VYCHOZI_REZIM);
      rez.nazev = t("rezim.beznazvu");
      REZIMY.sez.push(rez);
      ulozRezimy();
      naRezimDetail(rez.id);
    });
    $("reznazevpole").addEventListener("input", function(){
      var rez = editRezim();
      if(!rez) return;
      rez.nazev = $("reznazevpole").value.slice(0, NAZEV_MAX);
      ulozRezimy();
      $("reztitul").textContent = nazevRezimu(rez);
      var el = $("reznazev");
      if(el) el.textContent = nazevRezimu(aktRezim());
    });
    $("rezkostek").addEventListener("change", function(){
      var rez = editRezim();
      if(!rez) return;
      rez.kostek = parseInt($("rezkostek").value, 10) === 5 ? 5 : 6;
      /* Rozehraná hra tu být nemůže (přepnout režim jde jen nad prázdnou),
         ale prázdný hod se musí srovnat hned — jinak by se dál házelo
         šesti kostkami v pětikostkovém režimu. */
      if(REZIMY.akt === rez.id && gameEmpty()) S.rolls = [{thrown: rez.kostek, hot:false, items:[]}];
      if(kombNovy.length > rez.kostek) kombNovy = kombNovy.slice(0, rez.kostek);
      zmenaRezimu();
    });
    /* Rozšířený rozpad a práh: obojí sahá na tutéž tabulku, takže obojí musí
       jít přes zmenaRezimu(), ne jen překreslit nastavení. */
    $("rezrozs").addEventListener("click", function(){
      var rez = editRezim();
      if(rez) prepniRozs(rez);
    });
    $("rezstejzap").addEventListener("click", function(){
      var rez = editRezim();
      if(rez) prepniStejZaklad(rez);
    });
    $("rezprah").addEventListener("change", function(){
      var rez = editRezim();
      if(!rez) return;
      posunPrah(rez, parseInt($("rezprah").value, 10));
      zmenaRezimu();
    });
    /* Nová kombinace se zakládá rovnou s jedním vzorem: kombinace bez vzoru
       by neměla co bodovat a v seznamu by visela naprázdno. Dvojice
       libovolných stejných je nejmenší smysluplný vzor a v editoru se přepíše
       za pár klepnutí. */
    $("kombnovy").addEventListener("click", function(){
      var rez = editRezim();
      if(!rez || rez.v.length >= VLASTNI_MAX) return;
      var k = { id: newId(), n: dalsiJmenoKombinace(rez), b: 250, z: true,
                vz: [ cistyTvar({ v: [], t: [2] }) ] };
      rez.v.push(k);
      ulozRezimy();
      naKombiDetail(k.id);
    });
    $("kombback").addEventListener("click", naKombiZpet);
    $("kombnazevpole").addEventListener("input", function(){
      var k = editKombi();
      if(!k) return;
      k.n = $("kombnazevpole").value.slice(0, NAZEV_MAX);
      ulozRezimy();
      $("kombtitul").textContent = nazevKombinace(k);
      /* Jméno stojí i na čipu a v tabulce pravidel; celý editor se ale
         překreslovat nesmí, pole by uprostřed psaní ztratilo kurzor. */
      if(prekresliPravidla) prekresliPravidla();
      render();
    });
    /* Nápověda se přepíná na místě, ne dalším oknem: text je krátký a .msg
       pod řádkem je v tomhle okně zavedený vzor. */
    $("reznadinfo").addEventListener("click", function(){
      var el = $("reznadnapoveda");
      if(el.hidden) el.innerHTML = t("rezim.nad.napoveda");
      el.hidden = !el.hidden;
      $("reznadinfo").classList.toggle("on", !el.hidden);
    });
    $("reznad").addEventListener("change", function(){
      var rez = editRezim();
      if(!rez) return;
      var v = $("reznad").value;
      rez.nad = NAD_DRUHY.indexOf(v) >= 0 ? v : "x2";
      zmenaRezimu();
    });
  })();

  /* ---------- rozdělaný vlastní vzor ----------
     Čipy 1–6 přidávají kostku s konkrétní hodnotou, čipy A–F kostku do skupiny
     „libovolná, ale stejná“. Do stavu vzoru se sahá jen odsud; hotový vzor
     projde stejnou očistou jako vzor z úložiště, takže se dovnitř nedostane
     nic, co by neprošlo i po reloadu. */
  (function(){
    var pips = $("kombpips");
    if(!pips) return;
    function pridej(kam, popis, zeton){
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = popis;
      b.dataset.value = popis;
      b.addEventListener("click", function(){
        var rez = editRezim();
        if(!rez || kombNovy.length >= rez.kostek) return;
        kombNovy.push(zeton);
        renderKombiNovy();
      });
      kam.appendChild(b);
    }
    [1,2,3,4,5,6].forEach(function(v){ pridej(pips, String(v), v); });
    var pism = $("kombpism");
    ["A","B","C","D","E","F"].forEach(function(p){ pridej(pism, p, p); });
    $("kombzrus").addEventListener("click", function(){
      kombNovy = [];
      renderKombiNovy();
    });
    $("kombpridat").addEventListener("click", function(){
      var k = editKombi();
      if(!k || k.vz.length >= VZORU_MAX) return;
      var cast = vzorZZetonu(kombNovy);
      /* Hotový vzor projde stejnou očistou jako vzor z úložiště, takže se
         dovnitř nedostane nic, co by neprošlo i po reloadu. */
      var vz = cistyTvar({ v: cast.v, t: cast.t });
      if(!vz) return;
      k.vz.push(vz);
      kombNovy = [];
      zmenaRezimu();
    });
  })();
}


/* Rozdělaná otázka na smazání ani otevřený detail se z minula nepřenášejí.
   Vlastníkem je tahle karta, takže to ruší ona. */
function zrusRozdelaneRezimy(){
  ptamSeVzor = null;
  ptamSeRezim = null;
  ptamSeTvar = null;
  rezEdit = null;
  kombEdit = null;
}

export { dalsiJmenoKombinace, duplikujRezim, editKombi, editRezim, kombEdit, kombNovy, kombPoleSazby, kombPopis, kombPresetRadek, kombSazbyPamet, kombSmazRadek, kombVlastniRadek, kombVzorRadek, mrizkaSazeb, naKombiDetail, naKombiZpet, naRezimDetail, naRezimSeznam, nadPole, naplnPrah, nazevKombinace, podradekKombinace, popisRezimuKratky, posunPrah, prepinacRadek, prepniRozs, prepniSam, prepniStej, prepniStejZaklad, ptamSeRezim, ptamSeTvar, ptamSeVzor, renderKombDetail, renderKombiNovy, renderRezDetail, renderRezKonec, renderRezPruh, renderRezSeznam, renderRezStej, renderRezimy, rezEdit, rezPostRadek, rezRadek, rezRadekBodu, rozsPamet, samPamet, sazbaPole, smazKombinaci, stavTlacitko, stejOddil, stejPamet, ukazRezPruh, umistiNad, vychoziStej, vzorZZetonu, zrusRozdelaneRezimy };
