# Kostky — počítadlo Farkle · předávací dokument

Stav k 21. 8. 2026. Jednohráčské počítadlo skóre pro Farkle, jako PWA na
GitHub Pages. Výchozí pravidla jsou ta z kostek v Kingdom Come: Deliverance II,
dají se přepnout na jiná. Rozhraní je česky a anglicky, výchozí je čeština.

**Repo:** `Kvasmeister/Farkle-counter` → `kvasmeister.github.io/Farkle-counter/`

---

## Čti tohle, když…

Tenhle soubor je **mapa a průřezová pravidla**. Podrobnosti k jedné oblasti
stojí v hlavičce jejího modulu — každý soubor v `src/js/` začíná blokem
„na čem závisí, na čem ne, jaké pasti tam jsou“. Nehledej je tady.

| kam jdeš | co si přečti |
|---|---|
| upravit jednu oblast | hlavičku jejího modulu (mapa níž) |
| sáhnout na úložiště nebo migrace | `docs/storage.md` |
| sáhnout na překlady | `docs/i18n.md` |
| větší zásah do SW, layoutu nebo i18n | `docs/mistakes.md` — sedm tichých chyb |
| zvažovat nový nápad | `docs/ideas.md` — co už padlo a proč |
| měnit bodování | `docs/farkle-pravidla-verze.md` |
| chápat, proč je něco takhle | `docs/plany/` (02, 04, 05 hotové; 01 a 03 zbývají) |
| hledat podivnost nalezenou při refaktoru | `docs/nalezy.md` |
| nasadit na web | část 6 — `npm run deploy` |

---

## 1. Zdroj se skládá, nasazuje se jeden soubor

**`index.html` se needituje ručně.** Je to výstup; zdroj je v `src/`.

```
npm run build     složí index.html ze src/
npm test          ověří, že je aktuální, zkontroluje importy, pustí 20 sad
```

### Proč build vůbec je

Všech 19 jsdom sad staví DOM z řetězce (`new JSDOM(html, …)` bez
`resources: "usable"`). Takový jsdom **nenačte `<script src>`** a
**`<script type="module">` neumí vůbec**. Servírovat aplikaci jako víc
souborů by stálo celou testovací síť — 1 461 kontrol. Zdroj je proto
modulární a výstup zůstává jeden soubor: pro testy, pro `SOUBORY` v `sw.js`
i pro nahrávání přes GitHub web UI se nemění nic.

### Značky v `src/`

```
<!--@vloz cesta-->            řádek se nahradí obsahem souboru
<!--@pozn text-->             poznámka jen pro zdroj, do výstupu nejde
<!--@bundle js/hlavni.js-->   esbuild slepí ES moduly do jednoho IIFE
url("@font fonty/x.woff2")    nahradí se data: URI s base64 fontu
```

`styl/styl.css` a `html/telo.html` jsou rejstříky samých značek. **Pořadí
v rejstříku stylu je závazné** — mění kaskádu.

### Co build dělá s kódem

esbuild **zahazuje komentáře mezi příkazy** (uvnitř výrazů zůstávají)
a **jména si vybírá sám**: při kolizi přejmenuje `t` na `t2`. Z toho plyne
pravidlo pro testy: **co se ptá na kód, ať čte `src/`; co se ptá na chování,
ať čte `index.html`.** Podrobněji `docs/nalezy.md` #3.

esbuild naopak **nehlásí neznámé identifikátory** — bere je jako globály
prohlížeče a chyba spadne až za běhu. Hlídá to `npm test` (viz část 5).

---

## 2. Kde co je

```
src/
  index.html            skořápka se značkami
  fonty/*.woff2         pět řezů, build je vkládá jako base64
  styl/                 rejstřík + devět kusů, POŘADÍ ZÁVAZNÉ
  html/                 rejstřík + osm kusů těla
  js/
    hlavni.js           start — jediné místo, kde je vidět pořadí
    akce.js             keep, bank, bust, undo, nová hra, zmenaRezimu
    spolecne.js         naCislo, newId, NAZEV_MAX
    jazyky/             jadro (t/tn/kat, sběr, přepínání) + cs + en
    pravidla/           skore, postupky, kombinace, rezimy, riziko
    stav/               stav, kody, uloziste, historie, zaznam
    text/               format (fmt, esc, dt), stitky (kód → slova)
    ui/                 18 modulů, viz níž
```

Nasazuje se **kořen repa**, žádné podsložky: `index.html`,
`manifest.webmanifest`, `sw.js`, pět obrázků. `src/`, `Testy/` a `docs/`
v nasazeném repu nejsou.

### Vrstvy a jediné pravidlo

```
spolecne ─┐
pravidla/ │  čistá doména — bez DOMu
   ↑      │
stav/     │  data a persistence — bez DOMu
   ↑      │
text/     │  z dat na text — jen jazyk
   ↑      │
ui/       │  všechno, co sahá na DOM
   ↑      │
akce.js   │  aplikační vrstva: mění stav A překresluje
   ↑      │
hlavni.js │  pořadí startu
```

**Importy míří jen dolů.** Jedno pravidlo, ze kterého plyne zbytek.

Tři vědomé odchylky, každá zapsaná v hlavičce svého modulu:

- `pravidla/kombinace.js` a `pravidla/rezimy.js` importují `t()`. Jména
  „Kombinace N“ a název režimu se **materializují do dat** (`snapshot` →
  `rezimN`), aby smazání režimu ani import zálohy na cizí telefon
  nenechaly v historii id bez textu. Jméno tím patří datům, ne zobrazení.
- `pravidla/rezimy.js` si nese vlastní uložení. Volba režimu je součást
  pravidel, ne stavu hry — proto `S.rezim` neexistuje.
- `stav/kody.js` leží **pod** `text/`: kódy jsou formát, ve kterém se kolo
  ukládá, ne jeho zobrazení. `text/stitky.js` je jeho protipól.

### Moduly rozhraní

| modul | co dělá |
|---|---|
| `prvky` | odkazy na prvky stránky, sebrané jednou při startu |
| `vykresleni` | `render()` — dirigent |
| `klavesnice` | čipy hodnot, počtů, postupek a kombinací |
| `zapis` | vrubovka, tabulka kol, režim oprav, oba koše |
| `statistiky` · `statistiky-stranka` | co se počítá · jak se to ukazuje |
| `filtry` | filtry, řazení, tři okna |
| `nastaveni-obecne` · `nastaveni-rezimy` | dvě karty okna nastavení |
| `okno-pravidla` · `navod` | okno „i“, dvě karty |
| `zaloha` · `misto` | export/import · zabrané místo |
| `okna` · `stranky` | modály · tři stránky a dvě vnitřní |
| `platforma` | motiv, orientace, fullscreen, nezhasínání, SW |
| `autoulozeni` · `udalosti` | automatické uložení · navěšení tlačítek |

---

## 3. Průřezová pravidla

### Pořadí startu

**Žádný modul při importu nic nedělá.** Vedlejší efekty spouští `hlavni.js`
shora dolů. Pod moduly je pořadí vyhodnocení dané grafem importů, ne
zdrojem — dřív to byla emergentní vlastnost jednoho souboru.

Kroky **1 (jazyk)** a **2 (pravidla)** musí být první: platformní přepínače
volají `t()` a klávesnice se řídí režimem. Detail v hlavičce `hlavni.js`.

**INVARIANT: složený skript sedí na konci `<body>`.** `ui/prvky.js` sbírá
prvky hned při načtení; v `<head>` nebo s `defer` by tam byly `null`.

### Měnitelný stav přes hranici modulu

Importované vazby jsou v ES modulech **jen pro čtení**. Kdo chce cizí stav
změnit, volá operaci vlastníka: `zrusVyber()`, `prepniOpravy()`,
`zrusRozdelaneRezimy()`, `prepniAuto()`, `nastavSeg()`, `orezKostky()`…
Esbuild přiřazení do importu **odmítne už při buildu**, takže tahle chyba
nemůže projít tiše.

Totéž obráceně: doména nesmí volat UI. `pravidla/riziko.js` po líném
dopočtu jen ohlásí (`naRizikoHotovo`), stejně jako `stav` hlásí selhání
zápisu (`naSelhaniUlozeni`) a nedostupnou historii
(`naNedostupnouHistorii`). Posluchače registruje `hlavni.js`.

### Terminologie — dvě pasti, obě se už jednou staly

- Jeden průchod hráče je **kolo**. Slovo „tah“ z aplikace zmizelo a nemá se
  vracet.
- **Herní režim** je sada pravidel; *do bodů* / *na kola* je **typ hry**
  (`S.mode`, `popisTypuHry()`, klíče `typhry.*`). Jmenný prostor `typ.*` je
  obsazený filtrem.

### Data, na která se nesahá

- **Kódy štítků** (`j`, `p`, `d2`–`d6`, `n35`, `s16`, `c3p`, `k1500x5`) leží
  v historii a v zálohách. Jednička a pětka nesou `j` a `p` odjakživa;
  asymetrie proti `d2`–`d6` je záměrná.
- **Formát zálohy** (TXT s řádkem `#DATA:` a JSONem) se nemění. Soubor
  z kterékoli dřívější verze musí jít naimportovat i potom.
- **Id `kcd2` a `klasika`** zůstávají i po přejmenování režimů.

### Escapování

Popis kola i štítek položky můžou pocházet z cizí zálohy nebo z poškozeného
úložiště a jdou do `innerHTML`. Kód, kterému se nerozumí, se **záměrně
ukáže tak, jak je** — ale vždy přes `esc()`. Import ořezává `c` i `d` na
300 znaků. Bez toho by cizí záloha spustila skript ve stejném původu, tedy
s přístupem k celé historii.

### Úložiště — mapa klíčů

| klíč / police | kde | obsah |
|---|---|---|
| `farkle-solo-v3` | localStorage | rozehraná hra |
| police `souhrny` / `detaily` v db `kostky` | IndexedDB | historie: souhrn na hru / popisy kol na vyžádání |
| `farkle-hist-v1` / `-zaloha` | localStorage | historie před migrací / záloha po ní |
| `farkle-uloziste-v1` | localStorage | `"idb"`, jakmile migrace proběhla |
| `farkle-kos-v1` / `farkle-koshist-v1` | localStorage | koš rozehraných (5) / smazaných z historie (10) |
| `farkle-rezimy-v1` | localStorage | herní režimy: zvolený, odchylky presetů, vlastní |
| `farkle-kombinace-v1` | localStorage | **mrtvý klíč** — čte se jen při migraci, schválně se nemaže |
| `farkle-navod-v1`, `-autoulozeni-v1`, `-jazyk-v1`, `-theme`, `-svit-v1` | localStorage | drobná nastavení |

Do IndexedDB se stěhuje **jen historie**. Rozehraná hra a koše zůstávají
v `localStorage`, protože jsou shora omezené a potřebují synchronní zápis.
Migrace, odolnost načtení a měření místa: `docs/storage.md`.

---

## 4. Pravidla hry, která aplikace počítá

Bez odznaků a cinknutých kostek. **Bodovací tabulka není konstanta — drží ji
herní režim.** Níž je výchozí *KCD*; přednastavené jsou k němu ještě
*Klasické kostky* a *Pět kostek*, vlastních jde přidat dvacet.

Hází se všemi kostkami režimu (pět nebo šest), z hodu se odloží aspoň jedna
bodující kostka nebo kombinace. Když hod nedá nic, je to **Farkle** a všechny
nezapsané body v kole propadají. Odloží-li se i poslední kostka, přicházejí
**horké kostky** — hází se znovu všemi a body se v tomtéž kole sčítají.

| Kombinace | Body |
|---|---|
| Každá jednička | 100 |
| Každá pětka | 50 |
| Tři jedničky | 1 000 |
| Tři dvojky / trojky / čtyřky / pětky / šestky | 200 / 300 / 400 / 500 / 600 |
| Postupka 1–5 | 500 |
| Postupka 2–6 | 750 |
| Postupka 1–6 | 1 500 |

Trojice je jen **práh**, na kterém stejná čísla začínají bodovat; dá se
posunout mezi dvě a šest a v rozšířeném nastavení může mít vlastní sazby
každý počet zvlášť. Nad nejvyšším nastaveným počtem extrapoluje pravidlo
režimu: KCD každou kostkou navíc **zdvojnásobuje** (čtyři pětky 1 000, šest
jedniček 8 000), klasika násobí nejvyšší skupinu (×2 / ×3 / ×4), vlastní
režim umí i pevné body. Počítá to `kindPoints()` v `pravidla/skore.js`.

**Přepnout režim jde jen nad prázdnou hrou.** Kolo podle jedněch pravidel
a další podle jiných by dalo skóre, které nic neznamená.

Odůvodnění jednotlivých voleb drží `docs/plany/02`, `04` a `05`; verze hry
`docs/farkle-pravidla-verze.md`.

---

## 5. Testy

```
node Testy/vse.mjs          všech 20 sad se souhrnem
node Testy/vse.mjs 18 19    jen vyjmenované
npm test                    build --kontrola + kontrola importů + sady
```

Dnes **1 461 kontrol**, poslední stav: vše prošlo. Rozpis sad drží
`Testy/TESTS_README.md`.

### Nástroje vedle sad

| co | proč |
|---|---|
| `00-start.mjs` | kouřová zkouška, 2 s, pouští se první. Chybějící import se jinak projeví rozsypáním osmnácti sad naráz. |
| `kontrola-modulu.mjs` | jména bez původu = zapomenutý import. Esbuild je nehlásí. |
| `doplnit-importy.mjs` · `doplnit-exporty.mjs` · `do-initu.mjs` | pomůcky z refaktoru; staví na acornu, ne na odhadu |
| `volna-jmena.mjs` | analýza rozsahů, sdílená mezi nimi |

### Pasti, na které se opakovaně naráží

- **jsdom hlásí `navigator.language` jako `en-US`.** Každá sada si
  v `beforeParse` přišpendluje `farkle-jazyk-v1`. Výjimka je sada 16, která
  testuje právě to. Sada 06 pojišťuje češtinu ještě přes `navigator.languages`,
  protože tam se `localStorage` schválně vypíná.
- **Návod se v jsdom otevře sám** (není service worker) a otevřené okno
  blokuje šipky. Kdo to neřeší, ať si nasadí `farkle-navod-v1` na `bez-verze`.
- **Nečekat pevný počet milisekund na asynchronní věc.** Sady 05, 16 a 18
  čekaly na `FileReader` 60 ms a padaly zhruba v polovině běhů — v jednom
  procesu běží víc jsdomů a líný výčet rizika ve vedlejší instanci umí
  zablokovat smyčku na desítky ms. Čeká se na výsledek. `docs/nalezy.md` #6.
- **Sada 08 nepoužívá jsdom** — `sw.js` běží v `node:vm` s náhradami za
  `caches`, `fetch` a `setTimeout`. Nová globální závislost v `sw.js` musí
  přibýt i do náhrad.
- **Sada 10 je jediná s IndexedDB.** Hodnoty předpočítaných polí ze souhrnu
  se testují jen tam; v sadě 04 by se `souhrnZ()` vůbec nespustil.
- **Sondy `window.__i18n` a `window.__pravidla`** existují jen pro sady 16–19.
  Nastavuje je `hlavni.js`; aplikace je sama nepoužívá. Strážní test rizika
  je povinný — bez něj by se konstantní tabulky po změně bodování tiše
  rozešly.

Vedle toho se hodí Playwright na vizuální kontrolu: 320, 375 a 390 px
v obou motivech. jsdom nic nevykresluje.

---

## 6. Nasazení

Repo je napojené přes git, nenahrává se ručně. GitHub Pages servírují větev
`main` z kořene, takže **co je na `main`, to je na webu**.

```
1. zvyš VERZE v sw.js                     ← dělá majitel projektu
2. npm run deploy -- -m "co se změnilo"
```

`npm run deploy` složí `index.html`, ověří importy, pustí všech 20 sad,
porovná VERZE s nasazeným stavem a teprve pak commitne a pushne. Když
kterýkoli krok selže, nic se neodešle.

### Verze

```js
const VERZE = "kostky-v39";
```

**Verzi zvyšuje výhradně majitel projektu, ne asistent.** Asistent na ni
upozorní a nechá ji být.

`SOUBORY` se cachují pod jménem VERZE a service worker se aktivuje podle ní.
Nasadit nový `index.html` se starým číslem znamená, že zařízení, která
aplikaci už mají, si nechají tu svou — a nikdo nepozná proč. Skript proto
deploy **odmítne**, když se `index.html` změnil a číslo zůstalo. Je-li to
opravdu záměr: `npm run deploy -- --stejna-verze -m "…"`.

Nová verze naskočí až při **druhém** spuštění: navigace je network-first,
takže nové HTML dorazí hned, ale nový worker se aktivuje až po něm. Totéž
platí pro návod — a je to tak lepší, ukáže se rovnou nová verze návodu.

### Pojistka proti zapomenutému buildu

`nastroje/hooks/pre-commit` odmítne commit, ve kterém `index.html`
neodpovídá `src/`. Hook je verzovaný v repu, ne v `.git/hooks`, aby přežil
překlonování; po čerstvém klonu se jednou zapne:

```
git config core.hooksPath nastroje/hooks
```

Rozdělaná práce, která se zrovna nedá složit, projde přes
`git commit --no-verify`.

### Ruční editace navíc

Potřeba, jen když přibude nový soubor (dopsat do `SOUBORY` v `sw.js`),
použije se nový znak mimo ořez fontu (část 7), nebo se změní barvy motivu
(`theme-color` v HTML i `background_color`/`theme_color` v manifestu).

### Kde leží git

Pracovní soubory jsou v OneDrivu, ale `.git` **není** — je to jednořádkový
soubor ukazující na `C:\Users\Jachy\git\Kostky.git`. Důvod: `.git` je hodně
drobných souborů, které git rychle vytváří a maže (`index.lock`), a hlídač
synchronizace umí jeden chytit uprostřed zápisu. Zdrojové soubory OneDrive
synchronizuje dál a historie je od začátku i na GitHubu.

### Verze a návod

`sw.js` odpoví na `{ dotaz: "verze" }` přes `MessageChannel`; aplikace se
zeptá po startu (strop 2 s) a porovná s `farkle-navod-v1`. Číslo verze je
díky tomu jen na jednom místě. Navigace má strop 2,5 s (`SIT_STROP`);
po vypršení se fetch **neruší** a doběhne do cache. Do cache jde jen
odpověď, která je `ok`, není `redirected` a má `type === "basic"` — bez toho
si aplikace uměla přepsat `index.html` přihlašovací stránkou hotelové Wi-Fi
a byla rozbitá i offline.

## 7. Fonty a znaky

Pět řezů (IM Fell English, IM Fell English SC, Alegreya Sans 400/500/700)
leží v `src/fonty/` jako `.woff2`; build je vkládá do CSS jako base64.
Aplikace je tím offline soběstačná a zdroj čitelný.

**Co v ořezu je** (změřeno rozbalením cmap, ne odhadem): **290 znaků
společných všem pěti** — ASCII, Latin-1 Supplement, podstatná část Latin
Extended-A, k tomu `–` `—` `‘` `’` `“` `”` `„` `•` `…` a úzká nezlomitelná
mezera U+202F, kterou `fmt()` používá na oddělení tisíců.

**Díry, na které se naráží:**

- `→` (U+2192) **v ořezu není.** Text, který ji potřebuje, se přeformuluje.
- `−` (U+2212, tlačítko `#mless`) mají jen tři řezy Alegreya Sans. Sedí to,
  tlačítko je sázené bezpatkově.
- Šipka u oddílu nastavení je `»` otočená přes `transform`, ne `›` — ten
  v podmnožině není.

Znak mimo ořez se vykreslí systémovým písmem.

---

## 8. Layout: nescrollující stránka

`body` je `height: 100dvh` s `display:flex`. Počítadlo je pevný rám; posouvají
se jen zbylé dvě stránky uvnitř sebe.

**Zásada, která platí:** klávesnice a obě skóre (celkové + na stole) musí být
vidět vždy, bez rolování. Ostatní smí ustoupit.

| Výška okna | Co se děje |
|---|---|
| ≥ 800 px | pohodlné rozestupy |
| ≤ 799 px | stažené mezery, tlačítka 48 px |
| ≤ 719 px | menší písma, tlačítka 46 px |
| ≤ 639 px | mizí řádek „zbývá“ |
| ≤ 539 px | mizí popis hodu; záložky *zadat / opravit* zůstávají |

V pásmu ≤ 539 px se schovává **jen `#rollline`, ne celá `.rollhead`** — v ní
sedí i `#sheettabs` a s ní by zmizela jediná cesta na kartu *opravit*.
Horní lišta **nikdy nemizí celá**: jsou v ní čtyři tlačítka, bez kterých by
se nedalo nic otevřít.

**Posuvníky jsou schované všude.** Kreslí se na hraně scrollujícího prvku,
ne okna; aby seděly na hraně displeje, musel by vodorovný padding zmizet
z `body` a rozdat se do `.top`, `.tabs` a každé `.page` — a u modálních oken
by ani to nepomohlo.

**Past: `.hidden` na potomcích `<svg>` nefunguje.** Vlastnost `hidden` je jen
na `HTMLElement`; na `<g>` nebo `<path>` zápis `el.hidden = x` založí obyčejnou
vlastnost objektu. Přepíná se `setAttribute` / `removeAttribute` a testy se
ptají na `hasAttribute("hidden")`. Platí i v jsdom.

`env(safe-area-inset-*)` ve všech pásmech — bez toho by spodní tlačítka na
iPhonech s výřezem skončila pod domovskou lištou.

---

## 9. Platformní omezení

### Fullscreen

- **Android/Chrome v prohlížeči** — funguje, tlačítko v nastavení.
- **iOS Safari** — Fullscreen API na jiném než video elementu **neexistuje**.
  `webkitRequestFullscreen` iOS vystavuje, ale nic nedělá; detekce se proto
  ptá na `document.fullscreenEnabled`, což na iPhonu vrátí `false` a řádek
  se z nastavení odstraní.
- **Po instalaci jako PWA** se řádek odstraní vždy — manifest má
  `"display": "fullscreen"`.

### iOS a PWA

`display: "fullscreen"` iOS **ignoruje** a spustí aplikaci ve standalone.
Lišty prohlížeče zmizí, stavová lišta zůstane a schovat ji nejde.
`black-translucent` + `viewport-fit=cover` protáhnou obsah pod ni, takže
splyne s pozadím. Home indicator schovat nejde vůbec.

### Orientace

Na výšku, natvrdo ve třech vrstvách: `"orientation": "portrait"` v manifestu,
`screen.orientation.lock()` a CSS překryv `#rot`. **Krajina se nepodporuje
a nemá se dodělávat.**

### Dvojklik zvětšuje

`user-scalable=no` iOS od verze 10 ignoruje. Řeší to `touch-action:
manipulation`, ale ta vlastnost **se nedědí** — musí být na `*`, ne jen na
`html`. Vstupní pole mají 16 px, protože pod tím Safari při zaostření přiblíží.

### Nezhasínání displeje

API **neumí sáhnout na jas**; `wakeLock` je binární. Ztlumit displej po
nečinnosti nejde jinak než překryvem, což je černá barva přes stejně svítící
podsvícení — zamítnuto. Po třech minutách bez doteku se zámek pustí a dál se
stará systémový časovač.

Tři vlastnosti, které se snadno přehlédnou, drží hlavička
`ui/platforma.js`: gesto se nevyžaduje, prohlížeč zámek pouští sám při
schování stránky, a `request()` je asynchronní.

---

## 10. Chyby a nálezy

- `docs/mistakes.md` — sedm tichých chyb z doby před refaktorem: ořezané UI
  na iPhonu SE 2, neatomická instalace SW, chybějící složky v prvním nahrání,
  znak mimo ořez fontu, ztracená úprava mezi sezeními, mylné tvrzení
  o fullscreenu na iOS, přebitá funkce hoistingem, skrytí rodiče místo cíle.
  **Přečíst před větším zásahem do service workeru, layoutu nebo i18n.**
- `docs/nalezy.md` — co se našlo při refaktoru a schválně se neopravilo, aby
  „testy zelené“ znamenalo „přesunul jsem správně“. Mimo jiné mrtvý klíč
  `rezim.nulaneboduje` a skoro slepá kontrola osiřelých klíčů.

Hoisting, který stojí za jednou z těch chyb, už nastat nemůže: v modulech
se dvě funkce téhož jména nemají jak tiše přebít.
