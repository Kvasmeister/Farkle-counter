/* Odvozené údaje o jedné dohrané hře.

   Závisí na: pravidla/rezimy, jazyky/jadro (jména režimů), spolecne
   Nezávisí na: DOM, úložišti

   Každá funkce sáhne nejdřív po předpočítaném čísle ze souhrnu a teprve
   když ho nemá, projde `turns`. Díky tomu počítají stejně nad souhrny
   z IndexedDB, nad plnými záznamy v propadu na localStorage i nad
   importovanými daty.

   Leží pod UI, ne v něm: souhrnZ() v stav/historie.js je potřebuje při
   zápisu hry, takže by jinak historie závisela na statistikách. */
import { t } from "../jazyky/jadro.js";
import { VYCHOZI_REZIM, jePreset } from "../pravidla/rezimy.js";
import { NAZEV_MAX } from "../spolecne.js";
import { HODY_ODD, HODY_TXT } from "./kody.js";

/* ---------- odvozené údaje o jedné hře ----------
   Každá z nich sáhne nejdřív po předpočítaném čísle ze souhrnu a teprve
   když ho nemá, projde `turns`. Díky tomu zůstávají STATY, statHodnota(),
   zebricek() i renderHistList() beze změny a počítají stejně nad souhrny,
   nad plnými záznamy v propadu na localStorage i nad importovanými daty. */
function gKol(g){
  if(typeof g.kol === "number") return g.kol;
  return (g.turns || []).length;
}
function gFarkle(g){
  if(typeof g.farklu === "number") return g.farklu;
  var n = 0;
  (g.turns || []).forEach(function(t){ if(t.bust) n++; });
  return n;
}
/* Farkle prvním hodem: kolo skončí farklem a nemá jediný bod (t.p === 0).
   Jiná kombinace nastat nemůže — kdyby v kole padl druhý hod (hot dice
   nebo pokračování), musel by před ním ležet aspoň jeden bodující odklad,
   takže by t.p bylo kladné. Netřeba sahat do rolls[]. Nula je tu platná
   a ukládá se jako nula (na rozdíl od gZtraceno níž) — je to prostá
   četnost jako farklu/kol/hodu, ne rekord, kde by nula matla. */
function gFarklePrvni(g){
  if(typeof g.farkluprvni === "number") return g.farkluprvni;
  var n = 0;
  (g.turns || []).forEach(function(t){ if(t.bust && t.p === 0) n++; });
  return n;
}
/* Do žebříčku smí jen hry, kde k tomu opravdu došlo — nula by se jinak
   řadila na konec jako řada nul. Samostatná obálka, ne úprava
   gFarklePrvni: uložený souhrn i celkový součet mají nulu držet dál. */
function gFarklePrvniRekord(g){ return gFarklePrvni(g) || null; }
/* null je platná hodnota (hra bez jediného bodovaného kola), takže se
   nedá ptát na pravdivost — jen na to, jestli údaj vůbec je */
function gNejlepsiKolo(g){
  if(g.nejlepsi !== undefined) return g.nejlepsi;
  var m = null;
  (g.turns || []).forEach(function(t){ if(!t.bust && (m === null || t.p > m)) m = t.p; });
  return m;
}
function gNejhorsiKolo(g){
  if(g.nejhorsi !== undefined) return g.nejhorsi;
  var m = null;
  (g.turns || []).forEach(function(t){ if(!t.bust && t.p > 0 && (m === null || t.p < m)) m = t.p; });
  return m;
}
function gSerie(g){
  if(typeof g.serie === "number") return g.serie;
  var nej = 0, b = 0;
  (g.turns || []).forEach(function(t){
    if(t.bust){ b = 0; } else { b++; if(b > nej) nej = b; }
  });
  return nej;
}
/* Počet hodů se rekonstruuje z popisu kola, protože turns[i] nese jen
   {p, bust} a k tomu kódy v c (starý záznam text v d). Obojí spojuje hody
   jedním oddělovačem a prázdné hody vyhazuje —
   u farklu je poslední hod prázdný z definice, proto se u něj přičítá
   jednička. Sedí to i na farkle prvním hodem: prázdný popis → jeden hod.
   Math.max(u, 1) je pojistka pro cizí zálohu s prázdným popisem u zapsaného
   kola; z aplikace takové kolo vzniknout nemůže. */
function hodyVKole(tah){
  var u;
  if(typeof tah.c === "string"){ u = tah.c ? tah.c.split(HODY_ODD).length : 0; }
  else { u = tah.d ? String(tah.d).split(HODY_TXT).length : 0; }
  return tah.bust ? u + 1 : Math.max(u, 1);
}
function gNejvicHodu(g){
  if(g.hodu !== undefined) return g.hodu;
  var m = null;
  (g.turns || []).forEach(function(t){
    var h = hodyVKole(t);
    if(m === null || h > m) m = h;
  });
  return m;
}
/* Farkle, při kterém na stole nic neleželo, je nula — platná hodnota
   odlišná od null, která by v žebříčku ležela dole jako řada nul. Do téhle
   statistiky nepatří, takže nula a null splývají. Test na pravdivost je tu
   proto záměrný, na rozdíl od ostatních g*: souhrny uložené dřív nesou nulu
   a i ty se musí překlopit při čtení. */
function gZtraceno(g){
  if(g.ztraceno !== undefined) return g.ztraceno || null;
  var m = null;
  (g.turns || []).forEach(function(t){ if(t.bust && t.p > 0 && (m === null || t.p > m)) m = t.p; });
  return m;
}
function gPrumer(g){
  var k = gKol(g);
  return k ? Math.round((g.banked || 0) / k) : null;
}
function gKolKCili(g){
  if(g.kolKCili !== undefined) return g.kolKCili;
  return (g.mode !== "rounds" && g.goal > 0 && (g.banked || 0) >= g.goal) ? gKol(g) : null;
}
function gBody(g){ return g.banked || 0; }
/* Záznam bez `rezim` je hra z doby, kdy aplikace uměla jedna pravidla —
   a ta byla KCD2. Dopočítává se při čtení, stejně jako gKol(). */
function gRezim(g){ return (typeof g.rezim === "string" && g.rezim) ? g.rezim : VYCHOZI_REZIM; }
/* Název režimu pro hru z historie. Preset se přeloží podle id, vlastní veze
   svůj text s sebou — a když ho nemá (cizí záloha), řekne se to rovnou. */
function nazevRezimuZaznamu(g){
  var id = gRezim(g);
  if(jePreset(id)) return t("rezim.n." + id);
  return (typeof g.rezimN === "string" && g.rezimN) ? g.rezimN.slice(0, NAZEV_MAX) : t("rezim.neznamy");
}

export { gBody, gFarkle, gFarklePrvni, gFarklePrvniRekord, gKol, gKolKCili, gNejhorsiKolo, gNejlepsiKolo, gNejvicHodu, gPrumer, gRezim, gSerie, gZtraceno, hodyVKole, nazevRezimuZaznamu };
