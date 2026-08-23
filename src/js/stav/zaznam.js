/* Odvozené údaje o jedné dohrané hře.

   Závisí na: pravidla/rezimy, stav/hody (rozbor hodů), jazyky/jadro
              (jména režimů), spolecne
   Nezávisí na: DOM, úložišti

   Každá funkce sáhne nejdřív po předpočítaném čísle ze souhrnu a teprve
   když ho nemá, projde `turns`. Díky tomu počítají stejně nad souhrny
   z IndexedDB, nad plnými záznamy v propadu na localStorage i nad
   importovanými daty.

   Leží pod UI, ne v něm: souhrnZ() v stav/historie.js je potřebuje při
   zápisu hry, takže by jinak historie závisela na statistikách. */
import { t } from "../jazyky/jadro.js";
import { VYCHOZI_REZIM, jePreset, rezimPodleId } from "../pravidla/rezimy.js";
import { NAZEV_MAX } from "../spolecne.js";
import { HODY_ODD, HODY_TXT } from "./kody.js";
import { rozlozKolo } from "./hody.js";

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
/* ---------- statistiky na úrovni jednoho hodu ----------
   Jediný průchod koly, ze kterého vypadnou všechny tři údaje najednou:
   nejlepší hod, součet bodů za hody a jejich počet. Že se počítají spolu, je
   podstatné — dlaždice „Průměrný hod" i hlavička jeho žebříčku musí dát
   totéž číslo, a to jde jen tehdy, když čitatel a jmenovatel pocházejí z téhož
   výčtu hodů.

   Kolo, které rozebrat nejde (ručně zadaná hodnota "v", cizí kód), se vynechá
   celé — přesně jako ho vynechá žebříček hodů. Proto se nedá vzít hodyVKole()
   jako jmenovatel: ta počítá úseky ve VŠECH kolech a u hry s jedním ručním
   zápisem by čitatel a jmenovatel mluvily o jiných kolech.

   Pravidla se dohledávají podle gRezim(g), ne aktRezim() — kolo se rozebírá
   podle pravidel PLATNÝCH PRO TU HRU. null znamená „režim hry tady není"
   (smazaný vlastní režim, hra z cizí zálohy před importem režimů); je to
   stav, který jde spravit doimportováním režimu, takže se dopočet dá
   zopakovat, viz prepocitejHodove() v stav/historie.js. */
function rozborHodu(g){
  var rez = rezimPodleId(gRezim(g));
  if(!rez) return null;
  var nej = null, body = 0, hodu = 0;
  (g.turns || []).forEach(function(t){
    var hody = rozlozKolo(t, rez);
    if(hody === null) return;
    hody.forEach(function(h){
      if(nej === null || h.p > nej) nej = h.p;
      body += h.p;
      hodu++;
    });
  });
  return { nej: nej, body: body, hodu: hodu };
}
/* Nejlepší jednotlivý hod (ne kolo) napříč hrou — null, když hra nemá ani
   jeden rozebratelný hod. */
function gNejlepsiHod(g){
  if(g.nejlepsihod !== undefined) return g.nejlepsihod;
  var r = rozborHodu(g);
  return r ? r.nej : null;
}
/* Čitatel poměru pro Průměrný hod. Není to totéž co gBody: `banked` nezná
   body, které propadly farklem, kdežto hod je odložil a v žebříčku hodů se
   ukazují. Dokud dlaždice počítala gBody/gHoduCelkem a hlavička žebříčku
   součet hodů, ukazovala ta dvě místa u téže statistiky jiné číslo. */
function gBodyHodu(g){
  if(typeof g.bodyHodu === "number") return g.bodyHodu;
  var r = rozborHodu(g);
  return r ? r.body : 0;
}
/* Jmenovatel téhož poměru — počet rozebratelných hodů. Nula znamená
   „do poměru se tahle hra nezapočítá"; statHodnota() na to má test d > 0. */
function gHoduCelkem(g){
  if(typeof g.hoduCelkem === "number") return g.hoduCelkem;
  var r = rozborHodu(g);
  return r ? r.hodu : 0;
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

export { gBody, gBodyHodu, gFarkle, gFarklePrvni, gFarklePrvniRekord, gHoduCelkem, gKol, gKolKCili, gNejhorsiKolo, gNejlepsiHod, gNejlepsiKolo, gNejvicHodu, gPrumer, gRezim, gSerie, gZtraceno, hodyVKole, nazevRezimuZaznamu, rozborHodu };
