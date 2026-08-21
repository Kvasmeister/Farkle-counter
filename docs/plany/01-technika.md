# Plán 1 — Technická vylepšení

**Stav:** hotové zadání, dá se rovnou dělat. **Riziko:** nízké.
Vychází z auditu z 10. 8. 2026. Sourozenecké plány: `02-kombinace-a-riziko.md`,
`03-rezim-u-stolu.md` — na tomhle plánu nezávisí a tenhle nezávisí na nich.

**Tvrdá podmínka:** aplikace musí zůstat celá offline, bez backendu, bez volání
na cizí servery. Nic níž to neporušuje.

---

## Co a proč

Devět nezávislých zásahů. Jedna skutečná chyba, jedna mrtvá animace, jedno mrtvé
místo v úložišti, zbytek úklid a jedna oprava dokumentace. Žádný z nich nemění
chování, které by uživatel uměl popsat — kromě kroku 1, který opravuje ztrátu
pozice v seznamu, a kroku 2, kde se rozběhne animace, co dneska nejede.

Kroky jsou nezávislé a dají se dělat po jednom. Pořadí 1–3 dává smysl dodržet
(kroky 2 a 3 se dotýkají stejných funkcí), zbytek je libovolný.

**Mazat mrtvý kód není co.** Ze 230 deklarovaných funkcí není nepoužitá ani
jedna, z tříd a `#id` použitých v CSS taky ne. Ověřeno strojově.

**Fonty se nechávají být.** Rozhodnutí majitele projektu z 11. 8. 2026:
291/290/330 znaků není zbytečná zátěž, ale rezerva pro další překlady a popisky
s novými znaky. Jediné, co se u nich mění, je nepravdivá věta v CLAUDE.md
(krok 9).

---

## Krok 1 — `resize` nesmí překreslovat Statistiky *(chyba)*

**Soubor:** `index.html:3722` a `index.html:3739`

`window.addEventListener("resize", …)` volá `goTo(page, false)`, a `goTo()` má
uvnitř `if(page === 2) renderP2();`. `renderP2()` → `renderHistList()` →
`elHistList.innerHTML = ""` → `vypisDavku(…, 0, …)`, tedy **seznam se postaví
znovu od první padesátky**.

Na Androidu se při rolování skryje adresní řádek, změní se výška layout
viewportu a `resize` se vypálí. Kdo si v dlouhé historii doklikal 500 her,
spadne na 50 a ztratí pozici. Totéž při otevření softwarové klávesnice.

Stránkování se nikde nedrží schválně (`index.html:4557`, zdokumentovaný záměr),
takže tohle je nezamýšlený vedlejší účinek, ne chyba té úvahy.

**Zásah:** `renderP2()` volat jen při skutečné změně stránky.

```js
function goTo(i, smooth){
  var novy = Math.max(0, Math.min(tabs.length - 1, i));
  var zmena = (novy !== page);
  if(zmena) zrusNav();
  page = novy;
  if(zmena && page === 2) renderP2();
  /* … zbytek beze změny … */
}
```

**Proč je to bezpečné:** každá změna historie volá `renderP2()` sama —
`zapisHru()`, `vratDoHistorie()`, obě větve importu, okna filtrů, `naJazyk()`.
Zastaralý seznam tím vzniknout nemůže. Ověřuje to už dnešní sada 15
(*„přestavění seznamu při změně filtru"*).

**Pozor:** posluchač `scroll` na `#pages` (`index.html:3734`) mění `page` přímo,
mimo `goTo()`. Swipnutí tedy `renderP2()` nevolá ani dnes a po téhle změně to
tak zůstane — je to v pořádku ze stejného důvodu.

**Sady k ověření:** 09, 15.

---

## Krok 2 — vrubovka bez přestavby *(zároveň spraví mrtvou animaci)*

**Soubor:** `index.html:255` (CSS), `index.html:3197–3228` (`tallyInto`)

CSS má `.tally i{ … transition:height .18s,background .18s}`, ale `tallyInto()`
začíná `elBars.innerHTML = ""` a hned vytváří nové `<i>` už s třídou `cut`.
Čerstvě vložený prvek s cílovým stylem netranzicuje — **deklarovaný přechod se
nikdy nepřehraje.** Vrubovka jen skokem překlikne.

**Zásah:** počet uzlů jen dorovnat a třídu přepínat.

```js
function tallyInto(elBars, elCap, rec){
  /* … výpočet n / done / kol beze změny … */
  while(elBars.children.length > n) elBars.removeChild(elBars.lastChild);
  while(elBars.children.length < n) elBars.appendChild(document.createElement("i"));
  for(var i = 0; i < n; i++) elBars.children[i].classList.toggle("cut", i < done);
  /* … elCap.textContent beze změny … */
}
```

Dvojí zisk: přechod se rozběhne a zmizí až 40 uzlů přestavěných na každý dotek
klávesnice. Výsledné DOM je znak po znaku stejné, takže testy nic nepoznají.

**Pozor:** `tallyInto()` obsluhuje i `#dtally` v detailu hry z historie
(`index.html:4795`) — tam se volá nad prázdným kontejnerem, takže obě smyčky
sedí i pro první průchod. Nezapomenout, že `rec.mode === "rounds"` má vlastní
větev s jiným `n` — dorovnání musí být v obou.

**Sady k ověření:** 01, 03, 04.

---

## Krok 3 — `render()` má přeskočit, co se nezměnilo

**Soubor:** `index.html:5119`

```js
renderKind(); renderFix(); renderRows(); renderStats(); renderTally(); renderArch();
```

Každé klepnutí na klávesnici (`keep()` → `render()`) staví znovu `#rows`
(jeden `<tr>` na každé zapsané kolo), `#stats` a `#tally` — všechno na
**neviditelné stránce 1**. Ve hře na 40 kol je to ~90 zbytečných uzlů na dotek.

**Odkládat kreslení stránky 1 až na `goTo(1)` nedělat.** Sedmnáct sad se dívá do
`#rows` a `#stats` přímo, bez přepínání stránek, a rozbilo by to spoustu assercí.

**Zásah:** podpis vstupu a při shodě návrat. Během klepání na klávesnici se
`S.turns` ani `S.banked` nemění, takže všechny tři skončí hned.

```js
var podpisy = {};
function zapomenPodpisy(){ podpisy = {}; }
function jinyNez(klic, p){
  if(podpisy[klic] === p) return false;
  podpisy[klic] = p; return true;
}

function renderRows(){
  if(!jinyNez("rows", fixMode + "|" + pendingDel + "|" + JSON.stringify(S.turns))) return;
  /* … stávající tělo beze změny … */
}
```

Stejně pro `renderStats()` (podpis = `banked` + `JSON.stringify(S.turns)`)
a `renderTally()` (podpis = `mode` + `goal` + `roundGoal` + `banked` + počet kol).

`renderFix()`, `renderKind()` a `renderArch()` **nechat být** — ty se při každém
odkladu opravdu mění.

**`zapomenPodpisy()` musí zaznít na čtyřech místech**, jinak zůstane na
obrazovce starý obsah:

- na začátku `prekresliVse()` (`index.html:3960`) — jinak přepnutí jazyka
  nepřekreslí popisky
- ve `wipe()` (`index.html:2771`)
- v `nactiZaznam()` (`index.html:2903`)
- v `load()` po `ozdrav()` (`index.html:2072`)

**Sady k ověření:** 01, 03, 04, 13, 16 — zvlášť 16 (přepnutí jazyka za běhu).

---

## Krok 4 — `save()` nemá psát, když se stav nezměnil

**Soubor:** `index.html:2005`

`render()` končí `save()` bezpodmínečně. Cesty, kde se `S` nemění: `#mless`
a `#mmore` (mění `manualDice`, které v `S` není, `index.html:5144–5145`)
a přepnutí jazyka (`index.html:5277`). Pokaždé `JSON.stringify(S)` + synchronní
zápis do `localStorage`.

```js
var poslednizapis = null;
function save(){
  try{
    var s = JSON.stringify(S);
    if(s === poslednizapis) return true;
    localStorage.setItem(KEY, s);
    poslednizapis = s;
    if(neukladame){ neukladame = false; ukazNeukladame(); }
    return true;
  }catch(e){
    if(!neukladame){ neukladame = true; ukazNeukladame(); }
    return false;
  }
}
```

`poslednizapis = null` shodit ve `wipe()` a `nactiZaznam()` — pro jistotu, i když
se tam `S` vždycky mění.

**Pozor:** sada 06 testuje chování při plném úložišti. Návrat `true` bez zápisu
je při shodě správně (data v úložišti odpovídají stavu), ale zkontrolovat, že
žádná kontrola nespoléhá na počet volání `setItem`.

Zisk je malý. Je zadarmo.

**Sady k ověření:** 06, 03, 13.

---

## Krok 5 — koš historie držet v paměti

**Soubor:** `index.html:2790` (`kdeZaznam`), `2101–2102`

```js
function kdeZaznam(){
  if(!S.archivedId) return "nikde";
  if(histIndex(HIST, S.archivedId) >= 0) return "historie";
  return histIndex(kosHistAll(), S.archivedId) >= 0 ? "kos" : "nikde";
}
```

`kosHistAll()` je `JSON.parse(localStorage.getItem(…))`. Spustí se to jen tehdy,
když je hra navázaná na záznam, který v historii není — tedy přesně po
*Smazat z historie*, kdy pak **každé** klepnutí na klávesnici parsuje koš znovu.

**Zásah:** koš prochází jedinou dvojicí funkcí, takže cache je triviální.

```js
var kosHistCache = null;
function kosHistAll(){
  if(kosHistCache === null) kosHistCache = readList(KHKEY);
  return kosHistCache.slice();
}
function kosHistWrite(list){
  var ok = kosZapis(KHKEY, list);
  if(ok) kosHistCache = list.slice();
  return ok;
}
```

**Kopie je povinná, ne opatrnost navíc:** `kosHistPush()` dělá `list.unshift(rec)`
nad tím, co dostal (`index.html:3014`). Bez `.slice()` by si sáhl přímo do cache
a rozešel ji s úložištěm, když by zápis selhal.

`kosAll()` má stejný tvar, ale z `render()` se do něj nechodí — nechat být,
nebo udělat stejně pro symetrii. Není to nutné.

**Sady k ověření:** 03, 12, 13, 14.

---

## Krok 6 — `prefers-reduced-motion` a posun stránek

**Soubor:** `index.html:731` (CSS), `index.html:3696` (`goSheet`)

`@media(prefers-reduced-motion:reduce){*{transition:none!important}}` **nesahá
na `scroll-behavior`**. `.pages` i `.sheets` mají `scroll-behavior:smooth`
natvrdo. `goTo()` se na reduced-motion ptá (`index.html:3723`), `goSheet()` ne —
přepínání *zadat / opravit* tedy animuje vždycky, i když si uživatel animace
vypnul.

```css
@media(prefers-reduced-motion:reduce){ .pages,.sheets{scroll-behavior:auto} }
```

a v `goSheet()` stejná podmínka jako v `goTo()`. Nabízí se ji vytáhnout do jedné
pomocné funkce, protože ji pak chtějí obě.

**Sady k ověření:** 02, 09.

---

## Krok 7 — drobnosti

- **`esc()` v `statsHTML()`** (`index.html:3761–3764`): první hodnota jde přes
  `esc(fmt(…))`, další tři ne. Všechny jsou číselné, riziko nula — ale sjednotit,
  ať nad tím příští čtenář nezaváhá.
- **`aria-live` na skóre**: `#toast` ho má, `#score` a `#pot` ne. Čtečka po
  klepnutí na klávesnici mlčí. Přidat `aria-live="polite"` na `.score`
  (`index.html:809`). **Pozor na ukecanost** — `#pot` se mění při každém odkladu;
  zvážit, jestli nestačí jen `.score`.
- **`contextmenu` je vypnutý globálně** (`index.html:3750`) a `user-select:none`
  je na `*` (`index.html:71`). Hlášky v Záloze historie a texty chyb tedy nejdou
  označit ani zkopírovat podržením. U aplikace, jejíž záchranná cesta je
  „zkopíruj zálohu do schránky", stojí za to udělat výjimku aspoň pro `.msg` —
  stejným způsobem, jakým je dnes udělaná pro `#pastearea` (`index.html:78`).

**Sady k ověření:** 02, 05.

---

## Krok 8 — cesta ven pro `farkle-hist-v1-zaloha`

**Soubor:** `index.html:2120`, `index.html:2316`

```js
var HZAL = HKEY + "-zaloha";
…
localStorage.setItem(HZAL, raw);
localStorage.removeItem(HKEY);
```

Zápis existuje. **Čtení ani mazání ne — nikde v aplikaci.** Komentář slibuje
„aspoň jednu verzi", ale žádný kód tu lhůtu nevyhodnocuje. Při migraci se do
`localStorage` uložila kompletní předchozí historie a leží tam navždy. Komentář
u `lsZbytek()` (`index.html:4192`) to sám přiznává: *„Nejtučnější položkou tu
bývá `farkle-hist-v1-zaloha`."* Aplikace je na `kostky-v14`, migrace je dávno pryč.

**Zásah — ručně, ne automaticky.** Smazat uživateli poslední kopii dat bez
zeptání není hezké, i když je nadbytečná:

1. v rozpisu zabraného místa (`spoctiMisto()`, `index.html:4332`) u řádku
   *„Nastavení a starší data"* ukázat, kolik z toho je právě `HZAL` — a jen když
   ten klíč vůbec existuje
2. vedle toho tlačítko *Smazat starší data* s druhým klepnutím na potvrzení —
   stejný idiom jako *Nahradit vše* v importu (`index.html:4483`)
3. tlačítko nabídnout **jen** když `rezim === "idb"` a `HIST.length` je aspoň tak
   velké jako počet her v záloze; jinak by šlo smazat data, která se ještě
   nepřenesla

**Sady k ověření:** 10, 14. **Sada 14 spadne úmyslně** — kontroluje *šest hodnot*
rozpisu zabraného místa, a nový řádek nebo tlačítko jí to rozbije. Opravit,
neobcházet.

---

## Krok 9 — CLAUDE.md

Věta v §2 *„Ořezané jsou na 129 znaků, které aplikace používá"* **není pravdivá**.
Naměřeno dekódováním vložených `woff2` (brotli → table directory → `cmap`, `maxp`):

| font | glyfů | znaků v `cmap` | z toho appka nepoužívá |
|---|---|---|---|
| IM Fell English 400 | 331 | 291 | 169 |
| IM Fell English SC 400 | 321 | 290 | 168 |
| Alegreya Sans 400/500/700 | 402 | 330 | 207 |

Aplikace používá **125 různých kódových bodů**. Nepoužité znaky jsou celý
Latin Extended-A (`ĀāĂăĄą…ŴŵŶŷŸŹźŻż`) plus `¡¢£¤¥¦©ª°±²³¼½¾`.

Nahradit tu větu tím, co platí a co je zároveň záměr: fonty nesou plnou latinku
včetně Latin Extended-A jako **vědomou rezervu pro další jazyky a nové popisky**.

Odstavec o riziku „nový znak mimo těch 129" tím přestává platit v dosavadní
podobě. Reálné riziko dnes hrozí jen u znaků **mimo latinku** — šipky, emoji,
jiné abecedy. Příklad, který v repu je: `−` U+2212 (tlačítko `#mless`,
`index.html:856`) v žádném z obou řezů IM Fell **není**; projde to jen proto, že
`.chip` dědí Alegreyu, kde U+2212 je. Náhoda, ne pravidlo.

### Volitelně: strážní test (sada 18)

~30 řádků: pro každý vložený font ověřit, že jeho `cmap` pokrývá každý znak
z `index.html`. Nepotřebuje žádný nový nástroj — Node umí brotli přes `zlib`
a `cmap` formát 4 se přečte přímo. Uzavře to třídu chyb, kterou
`docs/mistakes.md` popisuje u znaku `›`.

Rozhodnutí nechat fonty v plné šíři tenhle test **neruší**, naopak — čím širší
pokrytí, tím snazší je test držet zelený.

---

## Otevřená otázka: vrátit smazané kolo

Z auditu (bod B2), vybráno majitelem, ale nespadlo do žádného ze tří plánů.
**Sedne to sem, na konec.** Rozhodnout, jestli přidat.

`deleteTurn()` (`index.html:3309`) kolo splice-ne a nikde si ho nenechá. Je to
**jediná nevratná destruktivní akce v celé aplikaci** — celé hry mají dva koše,
jednotlivé kolo nemá nic, jen potvrzení. Překlep v potvrzení je nevratný.

**Rozsah:** `deleteTurn()` si odloží `{ index, tah }`, `#toast` dostane vedle
křížku tlačítko *Vrátit* na pět vteřin (stejná doba i stejná bublina jako
u automatického ukládání), vrácení udělá `S.turns.splice(index, 0, tah)`
a dorovná `banked` o `tah.p`, pokud není `bust`. Žádný nový prvek v layoutu.

**Dvě pasti:**
- `#toast` dnes umí jen text — přidání akčního tlačítka mění jeho tvar
  a **sada 13 se na bublinu dívá**
- po vrácení kola se může znovu sepnout zámek, takže `zkusAutoUlozit()` se
  z téhle cesty **volat nesmí**, jinak by se hra uložila podruhé

**Sady k ověření:** 07, 13.

---

## Ověření

```
node Testy/01-limit-kol.mjs      # … a všech sedmnáct
```

Baseline je zelený (ověřeno 10. 8. 2026 na sadách 01 a 09), dnes 1 040 kontrol.
Po každém kroku spustit **všech sedmnáct** — sloupec „sady k ověření" u kroků
říká, kde čekat pád, ne kde stačí testovat.

Navíc Playwright s Chromiem pro kroky 2 a 6 na **320, 375 a 390 px v obou
motivech**: jsdom nevykresluje ani neanimuje, takže mrtvý přechod z kroku 2 by
prošel testy i kdyby zůstal mrtvý.

**Verzi v `sw.js` zvyšuje majitel projektu, ne asistent.**
