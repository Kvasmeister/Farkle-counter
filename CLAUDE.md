# Kostky — počítadlo Farkle · předávací dokument

Stav k 21. 8. 2026. Jednohráčské počítadlo skóre pro Farkle, jako PWA na
GitHub Pages. Výchozí pravidla jsou ta z kostek v Kingdom Come: Deliverance II;
od 13. 8. 2026 se dají přepnout na jiná (viz část 14). Rozhraní je vícejazyčné
(viz část 12), výchozí jazyk je čeština, angličtina je úplná.

**Repo:** `Kvasmeister/Farkle-counter` → `kvasmeister.github.io/Farkle-counter/`

Tento soubor drží jen to, co je potřeba pro běžnou úpravu. Hlubší detaily
tří rozsáhlých témat, dva archivy a rozpracované plány žijí v `docs/` vedle
tohoto souboru — čti je, až se práce skutečně dotkne dané oblasti:

| soubor | kdy číst |
|---|---|
| `docs/storage.md` | úpravy úložiště, migrace, IndexedDB, měření zabraného místa |
| `docs/i18n.md` | úpravy překladů, přidání jazyka, pluralizace, katalog |
| `docs/mistakes.md` | před větším zásahem do service workeru, layoutu nebo i18n — sedm tichých chyb a poučení z nich |
| `docs/ideas.md` | nápady zvažované a odložené (editace zapsaného kola, víc hráčů, fullscreen v PWA, krajina) |
| `docs/farkle-pravidla-verze.md` | čtyři doopravdy odlišné verze Farkle; podklad přednastavených herních režimů (část 14) |
| `docs/plany/` | **`02-kombinace-a-riziko.md`** (12. 8. 2026), **`04-herni-rezimy.md`** (13.–20. 8. 2026, tři iterace) a **`05-refactor-rezimu.md`** (21. 8. 2026) jsou hotové a nasazené; zbývají `01-technika.md` a `03-rezim-u-stolu.md` — samostatné, spustitelné ve vlastní session, číst až dojde na tu oblast |

---

## 1. Pravidla hry, která aplikace počítá

Bez odznaků a cinknutých kostek.

**Bodovací tabulka není konstanta — drží ji herní režim (část 14).** Níž je
výchozí režim *KCD*; přednastavené jsou k němu ještě *Klasické kostky*
a *Pět kostek* a vlastních jde přidat dvacet. Bodovat může **kterákoli
hodnota samostatně i ve dvojici**, ne jen jednička a pětka. Co se z toho v kódu bere odkud,
je v části 14; tady stojí to, co platí ve všech režimech.

Hází se všemi kostkami režimu (pět nebo šest), z hodu se odloží aspoň jedna bodující kostka nebo
kombinace. Když hod nedá nic, je to **Farkle** a všechny nezapsané body v kole
propadají. Po každém hodu se hráč rozhoduje: zapsat a předat kolo, nebo házet
dál jen neodloženými kostkami. Když se odloží i poslední kostka, přicházejí
**horké kostky** — hází se znovu všemi šesti a body se v tomtéž kole sčítají.

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
posunout kamkoli mezi dvě a šest a v rozšířeném nastavení může mít vlastní
sazby každý počet zvlášť (část 14). Nad nejvyšším nastaveným počtem
extrapoluje pravidlo režimu: v KCD každá kostka navíc hodnotu
**zdvojnásobí** (čtyři pětky 1 000, pět pětek 2 000, šest pětek 4 000, šest
jedniček 8 000), klasika místo toho násobí nejvyšší skupinu (×2 / ×3 / ×4)
a vlastní režim umí i pevné body. Počítá to `kindPoints(value, count, rez)`
v `index.html`.

Dvojice ani „skoro trojice" v přednastavených režimech neboduje — ale
kterákoli dvojice se dá zapnout, viz část 14.

**Kombinace navíc** (část 13) patří vždycky jednomu režimu. V KCD jsou
ve výchozím stavu vypnuté, klasické kostky mají zapnuté tři dvojice za 750.

**Terminologie:** jeden průchod hráče se všude jmenuje **kolo**. Slovo „tah"
z aplikace zmizelo a nemá se vracet — na kolech by znamenalo dvě věci
najednou. Stejně tak **„herní režim" je sada pravidel** (část 14), kdežto
*do bodů* / *na kola* je **typ hry** — v kódu `S.mode`, `popisTypuHry()`
a klíče `typhry.*`. Dokud se obojí jmenovalo režim, byla to táž past.

---

## 2. Soubory v repu

Nasazený GitHub repo je v **kořeni**, žádné podsložky — to byla vědomá volba
po chybě popsané v `docs/mistakes.md`.

```
index.html               ~450 kB, celá aplikace včetně vložených fontů
manifest.webmanifest
sw.js
icon-192.png
icon-512.png
icon-maskable-512.png
apple-touch-icon.png
favicon-64.png
```

**Testy, `TESTS_README.md` a `docs/` v repu nejsou** — všechno tři žijí jen
v tomto projektovém adresáři (podsložka `Testy/`, sady `01-limit-kol.mjs` …
`19-rezimy.mjs`). `README.md` taky ne. Buď je do repa doplnit, nebo tenhle
odstavec nechat, ať je příští session nehledá.

Fonty (IM Fell English, IM Fell English SC, Alegreya Sans ve třech řezech) jsou
vložené jako `data:font/woff2;base64` přímo v CSS. Původně ležely v `fonts/`;
přesun do HTML odstranil celou třídu chyb s nenahranými soubory.

**Co v ořezu doopravdy je** (změřeno 12. 8. 2026 rozbalením cmap všech pěti
woff2, ne odhadem): **290 znaků společných všem pěti** — celé ASCII, Latin-1
Supplement a podstatná část Latin Extended-A, k tomu `–` `—` `‘` `’` `“` `”`
`„` `•` `…` a úzká nezlomitelná mezera U+202F, kterou `fmt()` používá na
oddělení tisíců. Dřívější údaj „129 znaků" v tomhle souboru byl mylný.

**Pozor:** pokrytí ale není bez děr.

- `→` (U+2192) **v ořezu není** — v komentáři ve zdroji je, ve fontu ne.
  Text, který ji potřebuje, se musí přeformulovat.
- `−` (U+2212, tlačítko `#mless`) mají jen tři řezy Alegreya Sans, oba
  IM Fell ne. Sedí to, protože tlačítko je sázené bezpatkově.
- `%`, `×`, `·`, `+`, `,` a celá česká diakritika pokryté jsou.

Znak mimo ořez se vykreslí systémovým písmem. Ověřit se dá rozbalením cmap
(brotli přes `zlib.brotliDecompressSync`, tabulka `cmap` z woff2 direktoria),
případně orientačně porovnáním množiny znaků proti předchozí verzi:

```js
new Set(html.replace(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/g, ""))
```

---

## 3. Struktura aplikace

### Tři stránky, přepínané swipem

Vodorovný `scroll-snap` kontejner `#pages`, k tomu záložky nahoře a šipky
doleva/doprava na klávesnici (šipky jsou hluché, když je otevřené okno).

1. **Počítadlo** — skóre, panel kola, akce
2. **Zápis kol** — vrubovka, čtyři dlaždice, tabulka kol, *Opravit* v hlavičce,
   dole přilepená dvojice *Zapsat do historie* / *Nová hra*
3. **Statistiky** — přepínač *Statistiky / Historie her*, obojí s podstránkou
   detailu (`#p2list` ↔ `#p2detail`, ne další okno)

Pravidla mají od velkého updatu vlastní okno pod tlačítkem „i", ne záložku.

### Modální okna

`#rulesmodal` (pravidla + návod), `#setmodal` (nastavení aplikace), `#newmodal`
(nezapsaná hra při *Nová hra*) a tři okna filtrů — `#datemodal`, `#typmodal`,
`#sortmodal` (viz *Filtry a řazení*). Obsluhuje je jedna IIFE, která drží
`otevriModal` a `zavriModal`; otevřením dalšího se předchozí zavře. Zavírá je
křížek, klepnutí na tmavé pozadí i Escape. Nové okno stačí přidat do HTML
s `class="modal"` a křížkem `data-close` — obsluha se navěsí sama při startu.

`#rulesmodal` má **pevnou výšku** (`height:100%` na `.modalbox`), aby se okno
při přepnutí karty nezvětšovalo. U kratších pravidel proto zbývá dole prázdno —
to je záměr, ne chyba layoutu.

### Panel kola má dvě vnitřní stránky

Přepínač „zadat / opravit" je v řádku s popisem hodu a je **jediná** cesta mezi
kartami. `#sheets` je pořád vodorovný scroll kontejner, ale s `overflow-x:hidden`
— prstem ani kolečkem s ním nikdo nepohne, `scrollTo()` z `goSheet()` funguje
dál. Swipe se rušil schválně: v hustotě klávesnice se spouštěl omylem a bral
doteky, které patřily tlačítkům. Protože tím zmizel i `scroll-snap`, srovnává
`goSheet(sheet, false)` posun po `resize`.

- **zadat** — klávesnice: jednička/pětka, počet × hodnota, postupky, ruční
  zadání. Pořadí řádků u stejných hodnot je **počty nahoře** (`3×` `4×` `5×`
  `6×`), hodnoty pod nimi — aby popisek tlačítka i výsledný zápis („3× 5")
  mluvily stejně.
- **opravit** — každá zapsaná položka jako tlačítko s křížkem, seskupené po
  hodech. Smazat jde cokoliv, ne jen poslední zápis.

### Stavový model

```js
S = { mode, goal, roundGoal, banked, turns[], rolls[], archivedId, dirty }
rolls[i] = { thrown, hot, items[] }
items[i] = { k: kód štítku, p: body, d: počet kostek }
turns[i] = { p: body, bust: farkle?, c: kódy hodů }
```

Položka i kolo nesou **kód, ne text** — viz kapitola 12, oddíl *Štítky jsou
kódy*. Starý záznam veze místo `c` původní český text v `d` a položka
z rozehrané hry uložené starší verzí může vézt text v `l`; obojí se čte dál.

Kolo je posloupnost hodů, ne plochý seznam. Když se smaže položka ze staršího
hodu, `rechain()` přepočítá `thrown` a `hot` pro všechny následující hody
a vyprázdněné hody vyhodí. To je jádro režimu oprav — nesahat na to bez testu.

**Zpět nikdy nesáhne na `turns`.** Ubírá položky, pak celé hody, a v prázdném
kole je `jdeZpet()` false a tlačítko zašedlé. Dřív pokračovalo dál a jedno
klepnutí navíc umazalo poslední zapsané kolo i s body — přesně to, o co nikdo
nežádal. Mazání kol má jediné dveře: *Opravit* v Zápisu kol, s potvrzením.

`archivedId` + `dirty` řídí tlačítko zápisu do historie: nezapsaná hra →
*Zapsat do historie*, zapsaná a nezměněná → *Uloženo v historii*, zapsaná
a od té doby hraná → *Aktualizovat v historii* (přepíše tentýž záznam, aby se
jedna hra nepočítala do rekordů dvakrát).

### snapshot() jako jediný zdroj vykreslení

`snapshot()` udělá z rozehrané hry stejný záznam, jaký leží v historii.
Vrubovka (`tallyInto`), dlaždice (`statsHTML`) i tabulka kol (`rowsHTML`) berou
takový záznam na vstupu, takže **stejný kód kreslí živou hru i hru z historie**.
Při přidávání čehokoliv do přehledu hry to platí dodržet.

Výjimka: `renderRows()` skládá řádky živé hry po prvcích, protože potřebuje
křížky režimu oprav. `rowsHTML()` zůstává pro náhled z historie, kde se opravovat
nesmí.

### Dva typy hry

Nezaměňovat s **herním režimem** (část 14) — to je sada pravidel. Tohle je
*do bodů* / *na kola*, v datech pole `mode`, v textu `popisTypuHry()`
a klíče `typhry.*`.

Pod ikonou kostky v hlavičce (plovoucí panel, nikoli prvek v toku — v toku
odsouval tlačítka pod spodní hranu na SE 2).

- **do bodů** — cíl 2 000–10 000 nebo vlastní; druhý řádek skóre ukazuje „zbývá“
  a po překročení „nad cíl“. Dosažení cíle hru **zamkne**.
- **na kola** — ukazuje „odehráno kol“; volitelný limit hru po posledním kole
  **zamkne**. Bez limitu se nezamyká nikdy.

Zámek jde u obou typů obejít zvýšením cíle nebo limitu, což je záměr.

`locked()` se v bodech ptá jen na `S.banked`, který roste jedině v `bank()`.
Zámek proto naskočí až po zapsání celého kola — kolo, kterým se cíl překročí,
se započítá celé a body ležící na stole zámek nespouštějí. Kdyby se místo toho
hlídal součet se stolem, hra by se zamkla uprostřed kola a body by propadly.

V zámku zůstává `#rollon` **živé** a odvádí na Zápis kol; zamykají se jen
*Zapsat*, *Farkle* a klávesnice.

### Automatické ukládání

Přepínač v nastavení, výchozí **vypnuto**, klíč `farkle-autoulozeni-v1`. Po
skončení hry ji `zkusAutoUlozit()` zapíše do historie a pop-up `#toast` to na
pět vteřin oznámí — **až v `ok` větvi callbacku**, takže se nikdy neobjeví
u zápisu, který neproběhl. Okénko sedí na švu mezi hlavičkou a kartami,
půlkou přes obojí. Šev se posouvá, když je rozbalené nastavení hry, takže
`top` dopočítává `umistiToast()` z `getBoundingClientRect()` při každém
zobrazení; bez layoutu (jsdom) měření tiše propadne a `top` zůstane z minula.
Selhání hlásí `selhalZapis()` stejnou cestou jako ruční zápis, tedy textem na
tlačítku v Zápisu kol.

Spouští se ze tří míst: `bank()`, `bust()` a změna režimu, cíle či limitu —
tedy odevšad, kde se stav zámku může změnit. **Ne z `render()`:** ten běží
i při startu a po obnově z koše, takže by se dohraná hra ukládala sama i tam,
kde o to nikdo nežádal.

`S.autoUlozeno` v ukládaném stavu hlídá, aby se totéž nedělalo dvakrát ani po
reloadu. `render()` ho nuluje, jakmile zámek přestane platit, takže po smazání
kola se dá hra dohrát znovu a **týž záznam se aktualizuje** místo zakládání
druhého. `wipe()` i `nactiZaznam()` ho shazují.

Hra na neomezený počet kol se neukládá nikdy — `locked()` je tam vždycky false
a není podle čeho poznat, že skončila.

### Okno nastavení

Pevná karta na celou výšku (`#setmodal .modalbox{height:100%}`), stejně jako
pravidla — bez toho okno skákalo podle toho, kolik je v koších záznamů.

Okno je rozdělené na **dvě karty** přepínačem `#setseg`, stejným vzorem jako
Pravidla/Návod (`vyber(i)` přehazuje `hidden` a `.on`, obsah zůstává v DOMu).
*Obecné* drží všechno dosavadní, *Herní režimy* celou správu pravidel
(část 14). Okno začíná vždycky na první kartě a na seznamu režimů —
`$("setbtn")` volá `naKartuNastaveni(0)` a nuluje `rezEdit`, stejně jako sbalí
harmoniku. **Název zvoleného režimu** sedí na druhém tlačítku přepínače
(`#reznazev`), aby šlo z první karty poznat, podle čeho se hraje.

Karta *Herní režimy* má sama tři podstránky — `#rezlist`, `#rezdetail`
a `#kombdetail` (editor jedné vlastní kombinace) — přepínané `hidden` jako
`#p2list` a `#p2detail` ve Statistikách, ne dalším oknem. **Seznam se kreslí
i pod otevřeným detailem a detail i pod otevřeným editorem**; je to pár řádků
a odpadá tím třída chyb, kdy se návratem odkryl seznam z minula.

Na kartě *Obecné* jsou nahoře čtyři přepínače bez podmnožin (jazyk, celá
obrazovka, nezhasínání, automatické ukládání), pod nimi harmonika ze tří
`<details>` — koš rozehraných, koš historie, záloha. Nativní prvek
kvůli klávesnici a čtečce; **výlučnost si hlídá JS**, protože atribut `name`
na `<details>` je v prohlížečích čerstvý a spoléhat se na něj zatím nejde.
Obsluha visí na události `toggle`, která je podle specifikace **asynchronní**
— v testech se na ni musí počkat o jeden tik. Při každém otevření okna se
všechny oddíly zavřou, aby karta začínala vždycky stejně.

Počty v hlavičkách obou košů (`#koscnt`, `#koshistcnt`) doplňuje
`pocetVOddilu()` z `renderKos()` a `renderKosHist()`, tedy při otevření
nastavení — sbalený oddíl by jinak nedal poznat, jestli je uvnitř co obnovovat.
Druhé tlačítko přepínače karet nenese počet, ale **název zvoleného režimu**
(`#reznazev`, viz část 14).

**Přepínače hlásí stav, ne akci.** Tlačítko říká *Zapnuto* / *Vypnuto* a v
zapnutém stavu nese třídu `on` (mosazný rám). Co klepnutí udělá, zůstává
v `title` a `aria-label` — čtečka tak dál oznamuje akci, ne stav.

Šipka u hlavičky oddílu je `»` otočená přes `transform`, ne `›` — ten
v podmnožině fontu není. Pokrytí se dá ověřit fontTools nad base64 blokem
v `index.html`.

Rozpis zabraného místa (šest údajů, měření `localStorage` vs. IndexedDB,
vzorkování historie, tlačítko *Spočítat*): viz `docs/storage.md`, oddíl
*Zabrané místo — rozpis v nastavení*.

Koše rozehraných her a smazaných z historie, jejich vazba na `archivedId`
a chování při selhání zápisu: viz `docs/storage.md`, oddíly *Detekce, propad
a migrace* a tabulka na konci.

---

## 4. Úložiště

Všechno lokálně, žádný server. Plný popis migrace, upgrade databáze,
předpočítaných souhrnů a odolnosti načtení je v `docs/storage.md` — tady jen
mapa, co kde leží.

| klíč / police | kde | obsah |
|---|---|---|
| `farkle-solo-v3` | localStorage | rozehraná hra |
| police `souhrny` v databázi `kostky` | IndexedDB | jedna položka na hru bez popisů kol |
| police `detaily` tamtéž | IndexedDB | `turns` s popisy kol, čte se až na vyžádání |
| `farkle-hist-v1` / `-zaloha` | localStorage | dohrané hry před migrací / záloha po ní |
| `farkle-uloziste-v1` | localStorage | `"idb"`, jakmile migrace proběhla |
| `farkle-kos-v1` / `farkle-koshist-v1` | localStorage | koš rozehraných her (max 5) / smazaných z historie (max 10) |
| `farkle-rezimy-v1` | localStorage | herní režimy: zvolený, odchylky presetů a vlastní režimy (část 14) |
| `farkle-kombinace-v1` | localStorage | **mrtvý klíč** — kombinace navíc před zavedením režimů; čte se jen při migraci a schválně se nemaže |
| `farkle-navod-v1`, `farkle-autoulozeni-v1`, `farkle-jazyk-v1`, `farkle-theme`, `farkle-svit-v1` | localStorage | drobná nastavení, viz příslušné části |

**Do IndexedDB se stěhuje jen historie** (dvě police — `souhrny` se čtou
celé při startu, `detaily` až na vyžádání). Rozehraná hra a oba koše zůstávají
v `localStorage`, protože jsou shora omezené a potřebují synchronní zápis.

**Formát zálohy (TXT s řádkem `#DATA:` a JSONem) se nemění a měnit nesmí** —
soubor z kterékoli dřívější verze musí jít naimportovat i potom. Export
skládá plné záznamy zpátky ze dvou polic a je **asynchronní**; import
každý záznam naopak rozdělí na souhrn a detail. Dvě cesty dovnitř (soubor,
schránka) a dvě ven, obě končí nabídkou *Přidat nové* / *Nahradit vše*.

**Escapování.** Popis kola i štítek položky můžou pocházet z cizí zálohy nebo
z poškozeného úložiště a jdou do `innerHTML` — kód, kterému se nerozumí, se
**záměrně ukáže tak, jak je**, ale vždy přes `esc()`. Import ořezává `c` i `d`
na 300 znaků. Bez toho by cizí záloha mohla spustit skript ve stejném
původu, tedy s přístupem k celé historii.

**Kde leží záznam rozehrané hry, se odvozuje** (`kdeZaznam()`: historie / koš
/ nikde), nikdy se neukládá jako nezávislý příznak — jinak vzniká riziko
duplicitního zápisu popsané v `docs/storage.md`.

Kapacita: IndexedDB je v řádu gigabajtů (celý origin, ne jen historii);
`localStorage` pro rozehranou hru a koše má reálně prostor na tisíce her a
prakticky nejde hraním vyčerpat.

---

## 5. Návod a detekce verze

Okno „i" má dvě karty: **Pravidla** a **Návod**. Tlačítko „i" otevírá vždy
pravidla.

Při prvním spuštění a po každé změně verze se okno otevře samo, rovnou na
návodu. Funguje to takhle:

1. `sw.js` má posluchač `message`; na `{ dotaz: "verze" }` odpoví `{ verze: VERZE }`
   přes `MessageChannel`.
2. Aplikace se zeptá hned po startu (`zjistiVerzi`, strop 2 s) a porovná
   odpověď s `farkle-navod-v1`.
3. Při rozdílu značku uloží **a teprve pak** otevře okno — takže i zavření
   křížkem to odbaví natrvalo.

Číslo verze je díky tomu jen na jednom místě, v `sw.js`.

**Co je potřeba vědět:** navigace je v service workeru network-first, takže
nové HTML dorazí hned, ale nový worker se aktivuje až po něm. Návod se proto
ukáže **až při druhém spuštění** po aktualizaci. Je to tak lepší — ukáže se už
nová verze návodu, ne stará.

Network-first má strop **2,5 s** (`SIT_STROP`, `zavodSite()`). Podstatné je,
že `fetch()` se vyřeší už při hlavičkách odpovědi, ne po stažení těla — strop
tedy hlídá navázání spojení a reakci serveru, ne pomalou linku, a tělo se pak
streamuje jakkoli dlouho. Po vypršení se fetch **neruší**: doběhne na pozadí
a uloží čerstvý soubor do cache, takže pomalé připojení vede k aktuální verzi
při příštím spuštění. Na mrtvé nebo přihlašovací Wi-Fi aplikace naběhne
z cache do 2,5 s místo desítek sekund.

Do cache se ukládá jen odpověď, která je `ok`, není `redirected` a má
`type === "basic"` — bez toho si aplikace uměla přepsat `index.html`
přihlašovací stránkou hotelové Wi-Fi a byla rozbitá i offline.

Oba dotazy do cache jdou přes `zCache()` s `{ cacheName: VERZE }`, aby se mezi
`install` (se `skipWaiting`) a `activate` nevracely soubory z předchozí verze.

Bez service workeru (jiný prohlížeč, otevřeno ze souboru) se uloží náhradní
značka `bez-verze` a návod se ukáže právě jednou.

---

## 6. Layout: nescrollující stránka

`body` je `height: 100dvh` s `display:flex`. Počítadlo je pevný rám; jediné,
co se posouvá, jsou zbylé dvě stránky uvnitř sebe.

**Zásada, kterou nechat platit:** klávesnice a obě skóre (celkové + na stole)
musí být vidět vždy, bez rolování. Ostatní smí ustoupit.

**Posuvníky jsou schované všude.** `scrollbar-width: none` plus
`::-webkit-scrollbar { display: none }` na `.page`, `#page0`, `.modalbody`
a `.fix`; vodorovné kontejnery `.pages` a `.sheets` to měly odjakživa.
Důvod, proč skrýt a ne posunout: posuvník se kreslí na hraně **scrollujícího
prvku**, ne okna. Aby seděl na hraně displeje, musel by vodorovný padding
zmizet z `body` a rozdat se do `.top`, `.tabs` a každé `.page` — a u modálních
oken, která jsou vycentrovaný sloupec, by ani to nepomohlo. Schovat je jediné
řešení, které platí všude stejně.

### Pásma hustoty podle výšky okna

| Výška | Co se děje |
|---|---|
| ≥ 800 px | pohodlné rozestupy |
| ≤ 799 px | stažené mezery, tlačítka 48 px |
| ≤ 719 px | menší písma, tlačítka 46 px |
| ≤ 639 px | mizí řádek „zbývá" |
| ≤ 539 px | mizí popis hodu; záložky *zadat / opravit* zůstávají |

Pásmo ≤ 459 px v CSS není a nikdy nebylo; z tabulky bylo vyškrtnuté.

V pásmu ≤ 539 px se schovává **jen `#rollline`, ne celá `.rollhead`** —
v `.rollhead` sedí i `#sheettabs` a s ní by zmizela jediná cesta na kartu
*opravit*. Protože ve `space-between` zůstane jediný potomek vlevo, má
`.rollhead` v tomhle pásmu `justify-content:flex-end`. (Dřívější chybu, kdy se
skrývala celá `.rollhead`, viz `docs/mistakes.md`.)

Horní lišta **nikdy nemizí celá** — jsou v ní čtyři tlačítka (kostka, „i",
nastavení, motiv), bez kterých by se nedalo nic otevřít.

**Past: `.hidden` na potomcích `<svg>` nefunguje.** Vlastnost `hidden` je jen
na `HTMLElement`; na `<g>` nebo `<path>` uvnitř inline SVG zápis `el.hidden = x`
založí obyčejnou vlastnost objektu a atributu se ani nedotkne. Přepíná se
proto `setAttribute` / `removeAttribute` a testy se ptají na
`hasAttribute("hidden")`, ne na `el.hidden`. Platí to i pro jsdom, chová se
stejně jako prohlížeč.

Křížky v režimu oprav a tlačítka potvrzení mají 34 px, tedy pod obvyklými 44.
V hustotě tabulky by větší cíl rozhodil řádkování; na 320 px se potvrzení zalomí
do dvou řádků a všechno zůstane v okně.

### Bezpečné zóny

`env(safe-area-inset-*)` ve všech pásmech. Bez toho by spodní tlačítka na
iPhonech s výřezem skončila pod domovskou lištou.

---

## 7. Platformní omezení

### Fullscreen

- **Android/Chrome v prohlížeči** — funguje, tlačítko v nastavení.
- **iOS Safari** — Fullscreen API na jiném než video elementu **neexistuje**.
  Metodu `webkitRequestFullscreen` iOS vystavuje, ale nic nedělá — proto se
  detekce ptá na `document.fullscreenEnabled`, ne na existenci metody. Na
  iPhonu vrátí `false` a celý řádek se z nastavení odstraní.
- **Po instalaci jako PWA** se řádek odstraní vždy, protože manifest má
  `"display": "fullscreen"` a aplikace už na celé obrazovce běží.

Přepínač fullscreenu uvnitř nainstalované PWA byl zvažován a zamítnutý — viz
`docs/ideas.md`.

### iOS a PWA

`display: "fullscreen"` z manifestu iOS **ignoruje** a spustí aplikaci ve
standalone. Lišty prohlížeče zmizí, stavová lišta s hodinami zůstane a schovat
ji nejde. `black-translucent` + `viewport-fit=cover` protáhnou obsah pod ni,
takže splyne s pozadím. Home indicator schovat nejde vůbec.

### Orientace

Na výšku, natvrdo ve třech vrstvách: `"orientation": "portrait"` v manifestu,
zámek přes `screen.orientation.lock()` a CSS překryv při poměru na šířku.
Krajina se nepodporuje a nemá se dodělávat.

### Dvojklik zvětšuje

`user-scalable=no` iOS od verze 10 ignoruje. Řeší to `touch-action:
manipulation`, ale ta vlastnost **se nedědí** — musí být na `*`, ne jen na
`html`. Vstupní pole mají 16 px, protože pod tím Safari při zaostření přiblíží.

### Nezhasínání displeje

Přepínač *Nezhasínat displej* v nastavení, výchozí stav vypnuto, klíč
`farkle-svit-v1`. Proč `localStorage` a ne IndexedDB: rozhodnutí padá při startu
a musí být synchronní, jde o jediný boolean, který nikdy nepovyroste, a drobné
nastavení nemá sedět na křehčím ze dvou úložišť. Stejná úvaha jako u koše
a motivu.

Co API **neumí**: sáhnout na jas. Ztlumit displej po minutě nečinnosti nejde
jinak než překryvem přes obsah, což je jen černá barva přes stejně svítící
podsvícení — zamítnuto jako otravnost bez užitku. `wakeLock` je binární:
buď displej svítí, nebo platí systémový časovač.

Tři vlastnosti, které se snadno přehlédnou:

- **Gesto se nevyžaduje.** Specifikace chce jen viditelný a aktivní dokument,
  takže se zámek při startu bere rovnou. `poDoteku()` je záchranná síť pro
  prohlížeč, který request přesto odmítne.
- **Prohlížeč zámek pouští sám**, kdykoliv se stránka schová. Obsluha
  `visibilitychange` ho po návratu bere znovu — a právě ta zařídí, že po
  odemčení telefonu nezhasínání naskočí bez chození do nastavení.
- **`request()` je asynchronní.** Bez příznaku `zadame` vezmou dva doteky těsně
  po sobě dva zámky a pustí se jen jeden.

Po třech minutách bez `pointerdown` a `keydown` se zámek pustí a dál se stará
systémový časovač. Kdy přesně telefon zhasne, stránka neovlivní — podle systému
buď hned, nebo až po jeho vlastním limitu.

---

## 8. Chyby, které se staly, a proč

Přesunuto do `docs/mistakes.md`. Sedm tichých chyb — ořezané UI na iPhonu SE 2,
neatomická instalace service workeru, chybějící složky v prvním nahrání,
znak mimo ořez fontu, ztracená úprava mezi sezeními, mylné tvrzení o
fullscreenu na iOS, přebitá funkce hoistingem, skrytí rodiče místo cíleného
prvku. Přečíst před větším zásahem do service workeru, layoutu nebo i18n.

---

## 9. Testování

Testy leží v `Testy/`, nejsou součástí aplikace a na GitHub Pages nevadí.
Běží v Node přes jsdom, který skutečně vykoná skript ze stránky — testuje se
chování, ne text.

```
npm init -y
npm i jsdom fake-indexeddb
node Testy/01-limit-kol.mjs
```

`index.html` se hledá o složku výš než testy, na pracovním adresáři nezáleží.

Po zásahu do `index.html` nebo `sw.js` spustit všech devatenáct. Aktuální
rozpis sad a počtů drží `Testy/TESTS_README.md` — dnes 1453 kontrol, poslední
stav (21. 8. 2026): vše prošlo.

**Sondu `window.__pravidla` používají sady 18 a 19** — strážní testy si musí
konstantní tabulky rizika i celou bodovací tabulku odvodit z týchž pravidel,
která počítá aplikace, a `kindPoints()`, `STRAIGHTS` ani `PRESET_REZIMY`
jinak z uzávěru ven nevedou.

**Sada 10 je jediná s IndexedDB** (`fake-indexeddb`), ostatní běží po cestě
`localStorage`. Proto se hodnoty předpočítaných polí ze souhrnu testují tam
a nikde jinde: v sadě 04 by se `souhrnZ()` vůbec nespustil. Sada 04 hlídá
seznam statistik, sada 10 to, co v souhrnech leží.

**Sada 08 nepoužívá jsdom** — service worker v něm spustit nejde. Místo toho
`sw.js` běží v `node:vm` s náhradami za `caches`, `fetch` a `setTimeout`.
Hodiny jsou ruční (`tik()`), takže se dvouapůlsekundový strop ověří okamžitě.
Když se do `sw.js` přidá další globální závislost, musí přibýt i do náhrad.

**Past:** jsdom hlásí `navigator.language` jako `en-US`, takže by aplikace
naběhla anglicky. Každá sada, která načítá `index.html`, si v `beforeParse`
nasazuje `localStorage.setItem("farkle-jazyk-v1", "cs")`. Výjimkou je sada 16,
která jazyk podstrkuje přes `navigator` a testuje právě to, co ostatní vypínají.

**Past, která se ukázala až s hotovým anglickým katalogem:** uložený kód
jazyka je k ničemu tam, kde se `localStorage` schválně vypíná — aplikace pak
následuje jsdomí `en-US` a české porovnání spadne. Sada 06 proto češtinu
pojišťuje ještě přes `navigator.languages`. Dokud byla angličtina prázdná,
propad do češtiny tuhle díru zakrýval.

**Past, na kterou se dvakrát narazilo:** návod se v jsdom otevře sám (není tam
service worker, takže se použije značka `bez-verze`) a otevřené okno blokuje
šipky pro přepínání stránek. Testy, které se tím nezabývají, si musí v
`beforeParse` nasadit `localStorage.setItem("farkle-navod-v1", "bez-verze")`.

Vedle toho se hodí Playwright s Chromiem na vizuální kontrolu — hlavně 320,
375 a 390 px v obou motivech, protože jsdom nic nevykresluje.

---

## 10. Nasazení a aktualizace

Po **každé** změně souborů zvýšit verzi v `sw.js`:

```js
const VERZE = "kostky-v14";
```

**Verzi zvyšuje výhradně majitel projektu, ne asistent.** Asistent na ni
upozorní a nechá ji být.

Bez zvýšení si zařízení nechají starou verzi z cache. Nová naskočí až při druhém
spuštění — první ji stáhne na pozadí. Totéž platí pro návod (část 5).

Ruční editace navíc je potřeba jen když: přibude nový soubor (dopsat do
`SOUBORY`), použije se nový znak mimo ořez fontu, změní se barvy motivu
(`theme-color` v HTML a `background_color`/`theme_color` v manifestu), nebo se
přejmenuje `index.html`.

**Nahrávání na GitHub:** `sw.js` a `manifest.webmanifest` přes web UI
neprocházely — prohlížeč jim při stahování mění příponu. Řešení: **Add file →
Create new file**, název napsat ručně a obsah vložit. Obrázky nahrát normálně.

---

## 11. Nápady, které padly a neudělaly se

Přesunuto do `docs/ideas.md`:

- **Přesun zapsaného kola zpátky do rozehraného** (editace v režimu *Opravit*)
  — odloženo, ne zamítnuto; detailní mini-návrh je hotový v `docs/ideas.md`
- **Více hráčů** — zamítnuto, celý stavový model je na jednoho hráče
- **Přepínač fullscreenu v nainstalované PWA** — zamítnuto
- **Podpora krajiny** — zamítnuto
- **Vlastní kombinace v pravidlech** — **hotovo 12. 8. 2026**, viz část 13
- **Víc verzí pravidel** — **hotovo 13. 8. 2026**, viz část 14

---

## 12. Jazyky

Rozhraní umí víc jazyků. Dnes jsou v `JAZYKY` dva kódy, `cs` a `en`, a oba
katalogy jsou úplné (467 textových klíčů, z toho 280 ručně psaných v `RUCNI`
a 187 sebraných z `<body>`; k tomu šest položek, které textem nejsou —
`sep`, `des`, `plural`, `datum`, `datumCas`, `datumRozsah`). Plný systém — katalog, pluralizace, formát
čísel a dat, registr překreslení, strážní testy, co stojí přidání dalšího
jazyka — je v `docs/i18n.md`. Tady jen tři fakta, která se dotýkají i
zbytku aplikace:

**Čeština se nepíše ručně do katalogu.** Statické texty zůstávají přímo
v `<body>` s atributem `data-i18n*`; při startu je `sberCestinu()` sebere do
`I18N.cs`, teprve pak se případně přepíšou jiným jazykem. Runtime texty (bez
místa v HTML) stojí ručně v objektu `RUCNI`.

**`t(klic, hodnoty)` a `tn(klic, n, hodnoty)`** skládají věty se zástupnými
symboly (`{n}`, …), aby jiný jazyk mohl přeskládat slovosled. Nedodaný symbol
zůstává v textu vidět — tichá díra by se hledala hůř.

**Štítky odložených položek a kol jsou kódy, ne text** (`j`, `p`, `n35`,
`s16`, `c3p`, `k1500x5`, …), viz stavový model v části 3. Text vzniká až při
vykreslení, takže přepnutí jazyka přeloží i dohrané hry uložené v historii.
Rozbor starších záznamů s hotovým českým textem (`d`, `l`) je popsaný
v `docs/i18n.md`.

**Past, na kterou se narazilo u kombinací:** statický přepínač s `data-i18n`
(`#auto` a spol.) dostane při přepnutí jazyka výchozí text z katalogu,
tedy „Vypnuto“ i tehdy, když je zapnutý. Skutečný stav mu musí vrátit funkce
registrovaná přes `naJazyk()`, která běží až po `prelozStatiku()`. Hlídá to
sada 18.

**Druhá past odtamtud:** klíč skládaný za běhu musí končit tečkou
(`t("rezim.stej." + n)`, `t("rezim.aria." + n)`, `t("rezim.n." + id)`), jinak
ho strážní kontrola v sadě 16 vezme jako literál a ohlásí, že katalog nemá
klíč `rezim.stej`. Proto ne `rezim.stej2`, ale `rezim.stej.2`.

**Třetí past, z herních režimů:** prvek, do kterého zapisuje i vykreslení,
nesmí patřit katalogu celý. Čipy klávesnice měly `data-i18n-html` na celém
tlačítku včetně `<span class="v">` se sazbou — jakmile tu sazbu začal
dopisovat `renderKombi()` z režimu, přetahovaly se překlad a vykreslení
o tentýž prvek a strážní kontrola sady 16 to ohlásila. Popisek proto sedí ve
vlastním `<span data-i18n>` a hodnota vedle něj. Z angličtiny tím zmizely
značky, což chtěl i `docs/i18n.md`.

**Čtvrtá past:** jmenný prostor `typ.*` byl obsazený filtrem podle typu hry,
takže runtime texty *do bodů* / *na kola* se jmenují `typhry.*`. Kontrola
překryvu ručního katalogu s anotacemi v HTML to chytla hned.

---

## 13. Kombinace navíc a vlastní kombinace

Nasazeno 12. 8. 2026 podle `docs/plany/02-kombinace-a-riziko.md`, přestavěno
21. 8. 2026 podle `docs/plany/05-refactor-rezimu.md`. Oba plány drží odůvodnění
(proč zrovna tyhle kombinace, jak vyšla čísla rizika, proč zmizel generátor
jmen) a nemá se opisovat sem.

**Kombinace patří vždycky jednomu režimu, ne aplikaci** (část 14). Všechno níž
proto platí *v rámci jednoho režimu*: `kombZap(rez, k)`, `sazba(rez, k)`,
`kombinaceZap(rez)`. Kombinace na víc kostek, než režim má (tři dvojice
v pětikostkovém), se neukazuje vůbec — `kombVRezimu()`.

### Pět přednastavených kombinací

Pevný inventář v `PRESETY`, ve výchozím stavu **všechny vypnuté**. Zapínají se
v nastavení, v sekci *Kombinace navíc*.

| kód | čip | kostek | výchozí sazba | kód štítku |
|---|---|---|---|---|
| `2p` | `2+2` | 4 | 250 | `c2p` |
| `3p` | `2+2+2` | 6 | 500 | `c3p` |
| `32` | `3+2` | 5 | 1 200 | `c32` |
| `33` | `3+3` | 6 | 2 000 | `c33` |
| `42` | `4+2` | 6 | 1 500 | `c42` |

**Sazba i počet kostek jsou pevné, takže tlačítko hodnoty kostek vůbec nezná.**
Cena za jedno klepnutí místo dvoukrokového výběru: čtveřice šestek a čtveřice
jedniček platí stejně, *čtveřice a dvojice* je při čtyřech jedničkách past
(1 500 proti 2 000 za samotnou čtveřici) a *dvě dvojice* při jedničkách
a pětkách (250 proti 300). Řeší to **editovatelná sazba** a to, že čip svoje
body ukazuje. Do logiky to nepatří — aplikace nemá podle čeho ten případ
poznat.

Predikát `je()` u každého presetu slouží **jen výpočtu rizika**, ne klávesnici.

### Vlastní kombinace: jméno, body a jeden až šest vzorů

```js
{ id, n: "Kombinace 1", b: 1500, z: true,
  vz: [ { v:[2,2], t:[2], pocty:[…], tvar:[…] }, … ] }
```

**Vzory jsou spojené „nebo“:** kombinace boduje, jakmile sedne kterýkoli
(`sediKombinace()`), a platí pořád stejně. *Dvojice a dvě dvojky* nebo
*dvojice a tři trojky* je tím jedna věc za jedny body, ne dvě kombinace.

**Vzor má dvě části.** `v` jsou kostky s konkrétní hodnotou, `t` velikosti
skupin „libovolná, ale stejná hodnota“ (v editoru písmena A–F). Dřív platil na
celý vzor jeden příznak `any`; vzor uložený s ním se čte tak, že se z jeho
hodnot stanou samá písmena — tvar, počet kostek i kód štítku vyjdou stejně.
Kostky se počítají `pocetKostekVzoru()`, nikdy `vz.v.length`.

**Jméno si volí hráč**, výchozí je *Kombinace N* a **materializuje se při
vzniku** — kdyby se dopočítávalo z pořadí, smazání sourozence by ostatní
přejmenovalo. Generátor slovních jmen („dvě dvojice a 6“) je zrušený; zbyl
jazykově neutrální **zápis** `zapisVzoru()` (`A,A+2,2`: skupiny písmeny od
největší, konkrétní hodnoty za nimi vzestupně) a `zapisKombinace()`, který
vzory spojuje lomítkem. Sází se v seznamu, v editoru i v pravidlech, takže se
tři místa nemají kde rozejít.

**Vypnutí a smazání jsou dvě různé věci**, proto příznak `z` — kombinace se
naťukává po kostkách a znovu se dělá pracně. **Chybějící `z` se čte jako
zapnuto**, aby se kombinace uložené dřív, než přepínač existoval, samy
nevypnuly. Zapnuté vrací `kombinaceZap()`; přes ni jdou čipy, riziko i počet
v hlavičce. **Poslední vzor smazat nejde** — kombinace bez vzoru by neměla co
bodovat.

Stropy: **8 kombinací na režim** (`VLASTNI_MAX`) a **6 vzorů v jedné**
(`VZORU_MAX`). Obojí se hlásí předem, ne až po marném klepnutí.

### Čipy v klávesnici

Presety stojí **staticky v HTML** v `#strrow` a jen se skrývají — snapshot
`elDataKombi` i `sberCestinu()` tak fungují beze změny. Popisky (`2+2+2`, …)
jsou jazykově neutrální a nepřekládají se; sazbu v `.v` dopisuje `renderKombi()`.

**Čip *vlastní* stojí v řadě až za nimi a je vždycky poslední.** Otevírá panel
pod řadou, takže uprostřed čipů nedává smysl.

Zalomení řady srovnává třída podle počtu **viditelných** čipů: `k5`/`k6` → tři
do řádku, `k7`/`k8` → čtyři, `k9` → zase tři (3 + 3 + 3). Devět nastane při
všech třech postupkách, všech pěti kombinacích a čipu *vlastní*.

**Vlastní kombinace nejdou do řady, ale do panelu** za čipem *vlastní*
(`#vlastnirow` uvnitř `#manualwrap`). **Jedna kombinace je jeden čip**, ať má
vzorů kolik chce, a nese svoje jméno a body.

**Klepnutí se ptá na počet kostek, jen když je z čeho vybírat.** Vzory jedné
kombinace můžou mít různý počet kostek a `keep()` musí vědět, kolik jich
odložit. `poctyKostekKombinace(k, max)` vrátí odlišné velikosti, které se
vejdou do zbývajících kostek; jedna se odloží rovnou, víc jich překlopí řadu
na volbu (`vybiramKombi`) — dvoukrokový vzor jako mazání v koších. Klepnutí
na první čip volbu odvolá.

**Dynamický prvek v panelu nesmí nést `data-i18n`** — `sberCestinu()` běží
jednou na začátku skriptu. Popisky se skládají přes `t()` při vykreslení.

### Kdy vzor sedne

`sediVzor()` nejdřív ověří konkrétní hodnoty (podmnožina multimnožiny), pak
skupiny. **Každá skupina bere jinou hodnotu, a jinou i než ty, které vzor žádá
číslem** — jinak by se jedna kostka započítala dvakrát a *dvě dvojice a šestka*
by sedly na tři šestky s párem trojek. Zbylé počty se porovnávají hladově po
největších, což je pro tenhle tvar úlohy správně.

### Nastavení: seznam a editor

Sekce *Vlastní kombinace* v detailu režimu má nahoře **Přidat** a pod ním
řádky: jméno, v podřádku body, zápis vzorů a počty kostek, a tři tlačítka —
**stav, Upravit, Smazat**. Pole se sazbou v seznamu není: body patří celé
kombinaci, ne jednomu vzoru. Mazání je dvoukrokové (`ptamSeVzor`).

*Přidat* i *Upravit* vedou do **editoru `#kombdetail`** — třetí podstránky
karty (část 3). Drží jméno, body, stav, seznam vzorů s dvoukrokovým mazáním
(`ptamSeTvar`), stavbu nového vzoru a smazání celé kombinace. **Nová kombinace
vzniká rovnou s jedním vzorem** (dvojice libovolných stejných), protože bez
vzoru by neměla co bodovat.

Rozdělaný vzor se ťuká ze **dvou řad čipů**: čísla 1–6 jsou konkrétní hodnoty,
písmena A–F skupiny. Stav drží `kombNovy` jako pole žetonů v pořadí naťukání,
vzor z nich vyrobí `vzorZZetonu()`. **Na písmenech samotných nezáleží** —
ukládají se jen velikosti skupin, takže `A,A+B,B` a `B,B+C,C` je týž vzor.

Úprava sazby **nepřekresluje celý oddíl**, jen uloží a přepíše čipy: jinak by
pole ztratilo kurzor uprostřed psaní. Totéž platí o poli se jménem — to navíc
překresluje okno pravidel, protože jméno stojí i tam.

### Kódy štítků

`c2p`, `c3p`, `c32`, `c33`, `c42` v poli `KODY`; vlastní kombinace nese
`k<body>x<kostek>` (`KKOD`), kde kostky jsou z **použitého vzoru**.
**Vzor se do kola neukládá záměrně:** kdyby kód odkazoval na kombinaci
v nastavení, smazání kombinace — nebo import zálohy na cizí telefon — by
nechalo v historii viset kód bez textu. `k1500x5` se přečte vždycky a všude.

**Body jsou v `it.p`, ne v kódu**, takže změna sazby historii nepřepíše.
`STARE` a `STARE_N` zůstávají zmrazené — starší záznam kombinaci nikdy nenesl.

### Riziko farklu

Druhý drobný řádek na tlačítku **Farkle** (`#bustriz`) — mluví o farklu a
tlačítko nemizí nikdy, kdežto `#rollline` se pod 540 px skrývá. Bere se počet
kostek, kterými se bude házet — `left()`, nebo šest při horkých kostkách.
Ukazuje se i nad prázdným hodem, v zámku ne. Popisek tlačítka sedí ve vlastním
`<span data-i18n>`, protože do prvku zapisuje vykreslení i katalog.

Druhé místo je **pás v patičce okna nastavení** (`#rezriziko`,
`renderRezPruh()`): při stavbě pravidel je riziko ten údaj, podle kterého se
pozná, jestli režim dává smysl, takže je vidět pořád a nese celou křivku od
jedné kostky po tolik, kolik jich režim má. Vidět je v detailu režimu
i v editoru kombinace, nad seznamem a na kartě *Obecné* ne — hlídá to
`ukazRezPruh()`.

**Je to třetí prvek pružného sloupce `.modalbox`, za `.modalhead`
a `.modalbody`, ne `sticky` uvnitř těla** — sticky se nedostane pod spodní
padding scrollujícího prvku a pod pásem prosvítal obsah.

Vlastní dveře k překreslení má proto, že se text mění i při psaní do pole se
sazbou. Dokud líný výčet nedoběhne, říká pás „počítá se…“ (`rizikoHotovo()`) —
u přepsané tabulky je konstanta lež, ne odhad blízko pravdy.

```js
var RIZIKO    = [66.7, 44.4, 27.8, 15.7, 7.7, 3.1];
var RIZIKO_3P = [66.7, 44.4, 27.8, 15.7, 7.7, 2.3];   // tři dvojice zapnuté
var RIZIKO_2P = [66.7, 44.4, 27.8, 13,   3.1, 0];     // dvě dvojice zapnuté
```

**Tři z pěti kombinací riziko nemění vůbec** — obsahují trojici, která už
boduje. Mění ho *tři dvojice* (jen na šesti kostkách) a *dvě dvojice*, které
trojici uvnitř nemají a srazí riziko už od čtyř kostek; na šesti na nulu, což
je správně: hod bez jedničky, bez pětky, bez trojice a bez dvou dvojic ze šesti
kostek neexistuje. Tři dvojice dvě dvojice obsahují, takže zapnuté obojí dá
`RIZIKO_2P`.

Konstanty platí, dokud má režim **základ KCD**: samostatně boduje právě
jednička a pětka, bodují právě trojice (a nic jiného z počtů) a není zapnutá
žádná vlastní kombinace (`zakladJakoKcd2()`). Ten základ mají všechny tři
přednastavené režimy, takže se pro ně nepočítá nic. Teprve přepsaná tabulka
nebo vlastní kombinace pošlou na vyčerpávající výčet (6¹ + … + 6⁶ = 55 986
hodů, na pěti kostkách 9 330) — **líně přes `setTimeout`**, s cache
klíčovanou `podpisRezimu()`; než doběhne, platí konstanta jako horní odhad.

**Počet kostek režimu tabulku nemění.** Riziko se ptá, kolika kostkami se hází
teď, ne kolik jich má hra celkem — pětikostkový režim tedy bere prvních pět
hodnot téže tabulky. Hlídá to oddíl N sady 19.

**Strážní test je povinný, ne volitelný** (sada 19, oddíly N a N2, a oddíl N
sady 18): odvozuje všechny tři konstantní sady výčtem přes `kindPoints()`
a `STRAIGHTS` při každém běhu. Bez něj by se čísla po jakékoli změně bodování
tiše rozešla. Sonda `window.__pravidla` existuje jen kvůli němu, stejně jako
`window.__i18n` kvůli sadě 16.

---

## 14. Herní režimy


Nasazeno 13. 8. 2026 podle `docs/plany/04-herni-rezimy.md`, nastavení
přestavěno 21. 8. 2026 podle `docs/plany/05-refactor-rezimu.md`. Oba plány drží
odůvodnění a odchylky z realizace a nemá se opisovat sem. Pravidla jednotlivých
verzí hry jsou v `docs/farkle-pravidla-verze.md`.

**Herní režim je celá sada pravidel.** Nezaměňovat s *typem hry* (do bodů /
na kola, část 3) — dokud se obojí jmenovalo režim, byla to táž past jako kdysi
slovo „tah“.

### Co režim drží

```js
{ id, nazev, vlastni,                    // nazev jen u vlastního
  kostek: 6,                             // 5 nebo 6
  sam:  [0,100,0,0,0,50,0],              // samostatná kostka, index = hodnota
  stej: { 3: [0,1000,200,300,400,500,600] },  // počet kostek → šestice sazeb
  rozs: false,                           // rozšířený rozpad — POUZE pohled
  nad: "x2" | "nasobek" | "pevne",       // co dělá kostka nad nejvyšší skupinou
  nadP: [0,0,0,1000,1000,2000,3000],     // jen pro "pevne", index = počet kostek
  post: { "15":500, "26":750, "16":1500 },  // chybějící klíč = neboduje
  p: { "3p":500 },                       // kombinace navíc, část 13
  v: [ …vlastní kombinace… ] }
```

**Samostatná kostka má vlastní šestici, počty 2–6 leží v řídké mapě `stej`.**
Přítomnost klíče znamená „ten počet boduje“, nula uvnitř šestice mluví jen
o jedné hodnotě — žádný příznak vedle sazby, tedy ani stav, který si může
protiřečit. `post`, `p` i `stej` jsou tím tři stejné idiomy, ne tři různé.

`kindPoints(v, n, rez)` čte `sam` pro jednu kostku, `stej[n]` pro počet, který
je v tabulce, a **nad nejvyšším zapnutým počtem `m` extrapoluje**: `nasobek`
je `× (n − m + 1)`, `x2` je `× 2^(n − m)`, `pevne` bere `nadP[n]`. Při `m = 3`
z toho vyjde znak po znaku dřívější chování. **Pod prahem a v mezerách tabulky
se neboduje** a **bez jediné zapnuté skupiny se neextrapoluje vůbec**, ani
u pevných bodů — nemá to od čeho počítat.

**`rozs` do bodování nikdy nemluví.** Invariant „v základním pohledu má `stej`
právě jeden klíč“ drží přechod mezi pohledy (`prepniRozs()`), ne bodování;
kdyby se na příznak ptal `kindPoints()`, byly by pravdy dvě. Čtení z úložiště
invariant narovná: víc než jeden zapnutý počet znamená rozšířený pohled, ať je
uloženo cokoli.

`poctyStej(rez)` **filtruje počty vyšší, než kolik má režim kostek** — v tabulce
zůstat můžou (režim se dá přepnout zpátky na šest), ale bodování ani
extrapolace o nich vědět nesmí.

### Tři přednastavené režimy

| id | název | kostek | nad prahem | postupky | kombinace navíc |
|---|---|---|---|---|---|
| `kcd2` | KCD | 6 | `x2` (×2 / ×4 / ×8) | 1–5 500, 2–6 750, 1–6 1 500 | žádná |
| `klasika` | Klasické kostky | 6 | `nasobek` (×2 / ×3 / ×4) | 1–6 1 000 | tři dvojice 750 |
| `pet` | Pět kostek | 5 | `nasobek` | 1–5 500, 2–6 750 | žádná |

Samostatné hodnoty a trojice mají všechny tři stejné (jednička 100, pětka 50,
trojice hodnota × 100, tři jedničky 1 000) a práh na trojici; nic jiného
z počtů nebodují. **Id zůstávají `kcd2` a `klasika`** i po přejmenování — leží
v historii a v zálohách.

**Dvě čísla zdrojový dokument u pětikostkové verze neurčuje a jsou dosazená:**
sazba pětikostkové postupky (500 / 750 jako u KCD) a pravidlo pro čtyři a pět
stejných (`nasobek` jako u klasiky). Obojí je editovatelné.

**Piggyback není režim** — od klasiky se neliší bodováním, ale stavbou kola,
kterou sólo počítadlo nemá. Je popsaný v poznámce pravidel klasiky
(`rezim.pozn.klasika`) jako alternativní forma hraní. **Okamžitá výhra** při
pěti stejných v režimu `pet` se taky nepočítá, jen popisuje: počítadlo nemá co
počítat, hráč to ví sám.

### Jedna pravda, ne dvě

`REZIMY = { akt, sez }`, kde `sez` drží **úplné** režimy — tři presety
v pevném pořadí a za nimi vlastní v pořadí vzniku. `aktRezim()` vrací objekt
z toho pole, ne skládanou kopii: editor v nastavení do něj zapisuje přímo
a druhý, zastaralý objekt vedle něj nemá vzniknout.

**`S.rezim` ve stavu rozehrané hry není.** Jedinou pravdou je `REZIMY.akt`; do
záznamu se režim dopisuje až v `snapshot()`. Hra vrácená z koše volbu
přenastaví (`nactiZaznam`).

### Uložení a migrace

`farkle-rezimy-v1` v `localStorage` (stejná úvaha jako u motivu, koše
a nezhasínání: synchronní rozhodnutí při startu, shora omezené).

```js
{ akt: "kcd2",
  p: { kcd2: { p:{"3p":500} } },   // u presetu JEN odchylky od výchozích hodnot
  v: [ { id:"r1a2b3", nazev:"Naše pravidla", kostek:6, … } ] }   // vlastní celé
```

**Stará pole `dvoj` a `troj` se čtou dál** a stanou se z nich `stej[2]`
a `stej[3]`. Pole, které v odchylkách presetu nestálo, se nesmí vzít jako
vypnuté — přepíše se jen to, co v uložení opravdu je; výslovná šestice nul
vypnutí znamená. Stejně tak staré `nadP` o třech číslech: přemapuje se na
indexy 4–6.

**U presetu se ukládají jen odchylky.** Kdyby se ukládal celý, pozdější oprava
výchozí tabulky by nedorazila k nikomu, kdo se režimu jednou dotkl. Vlastní
režim není proti čemu diffovat. Když režim odchylky nemá, z úložiště zmizí —
`ulozeneKomb()` v sadě 18 to zná.

Migrace: chybí-li `farkle-rezimy-v1` a existuje-li `farkle-kombinace-v1`, jeho
`{p, v}` se stane odchylkou režimu `kcd2`. **Starý klíč se nemaže**, stejný
záchranný idiom jako u `farkle-hist-v1-zaloha`.

Strop vlastních režimů je **20** (`REZIMY_MAX`) a hlásí se předem, stejně jako
strop vlastních kombinací. Zadání znělo „neomezeně“; `localStorage` má ale
zůstat shora omezené (část 4) a číslo je v kódu na jednom místě.

### Šest sekcí v detailu režimu

Nad nimi bez nadpisu **Název** a **Počet kostek**, pak šest sekcí s nadpisem
`.seccap` (linka nad sebou, výraznější písmo než `.cap`): *Samostatné kostky*,
*Stejná čísla*, *Postupky*, *Kombinace navíc*, *Vlastní kombinace*
a *Nastavení* (duplikovat, obnovit výchozí / smazat).

Sekce **Stejná čísla** má dva pohledy. Základní: přepínač celé sekce a nabídka
*Od kolika kostek* (2 až počet kostek režimu), pod tím jedna mřížka šesti polí.
Posun prahu **stěhuje šestici sazeb** na nový počet — nevzniká druhá tabulka
vedle první. Rozšířený (`#rezrozs`): pět podsekcí *Dvojice* až *Šestice*,
každá s vlastním přepínačem a mřížkou; podsekce nad počet kostek režimu se
neukazuje vůbec.

**Návrat do základního nechá nejnižší zapnutý počet a zbytek odloží** do
runtime paměti (`stejPamet`), zapnutí rozšířeného vrátí právě to, co sebral
(`rozsPamet`) — ne to, co uživatel vypnul ručně. Do úložiště paměť nejde:
uložený stav má mít jednu pravdu, a tou je ta tabulka.

**Řádek o počtech nad prahem sedí u nejvyšší zapnuté skupiny** a mizí, když je
tou skupinou rovnou počet kostek režimu — nad čím by extrapoloval. Prvky stojí
staticky v `#reznadwrap` kvůli `data-i18n` a `renderRezStej()` je **stěhuje**;
než se `#rezstej` vyprázdní, musí se wrapper odvézt do bezpečí, jinak by ho
`innerHTML` smazal i s posluchači. Nadpis se řídí počtem (`rezim.nadn.<n>`),
takže ho dopisuje vykreslení a katalogu nepatří.

### Počet kostek

`kostek()` je jediná cesta k počtu kostek; natvrdo psaná šestka se do
`index.html` nemá vracet. `ozdrav()` ořezává `thrown` na rozsah 1…`kostek()`,
takže hra uložená v šestikostkovém režimu nerozbije pětikostkový. V klávesnici
se čip `6×` **skrývá**, ne jen zašedne — trvale zamčené tlačítko by jen matlo.

### Klávesnice se řídí režimem

Postupky (`[data-str]`) se skrývají a plní stejným idiomem jako kombinace
navíc. **Řada `#strrow` se nikdy neskrývá celá** — sedí v ní čip *vlastní*,
jediná cesta k ručnímu zadání. Nadpis nad řadou proto mluví o tom, co v ní
právě je: *Postupky*, *Postupky a kombinace*, nebo *Kombinace*.

**Samostatné hodnoty mají dvě cesty a rozhoduje mezi nimi jejich počet.**
Řada `#singlerow` drží šest čipů; do tří se vejdou, aniž by se zmenšily.
Při čtyřech a víc se řada schová i s nadpisem (`SAMOSTATNE_V_RADE`) a nastupuje
čip `1×` v mřížce *Stejné hodnoty*. Čipy nesou popisek z `stitek.*`, tedy týž
text jako štítek v historii.

Mřížka `#counts` staví počty **1–6**. Čip je vidět, když při tom počtu něco
boduje (`pocetBoduje()`) a počet se vejde do kostek režimu; `1×` navíc jen
tehdy, když je řada čipů schovaná. Vybraný počet se sám přesune na první
zbývající, jakmile ten dosavadní zmizí.

### Okno pravidel

`#cardrules` už není statická tabulka — skládá ji `pravidlaHTML(rez)`. Řádek se
do ní dostane jen tehdy, když v tom režimu boduje. **Počty nad prahem jsou
řádky tabulky, ne poznámka pod ní:** jen tak se vypíše právě tolik počtů, kolik
se jich do režimu vejde. Násobek se u nich sází **číslem** (`×2`, `×4`, `×8`) —
s posunutelným prahem by „dvojnásobek trojice“ lhalo. Počty 1–3 mají prozaické
popisky z katalogu, čtyři a víc týž zápis jako štítek v historii (`4× 5`).
Kombinace navíc nesou týž text jako čip v klávesnici, vlastní kombinace jméno
a za ním zápis vzorů — místa, která se nemají rozejít.

Texty pravidel se tím přestěhovaly z `<body>` do `RUCNI`. Tlačítko „i“ ukazuje
aktivní režim, *Pravidla* u řádku v nastavení ten vybraný; hra se tím nepřepne.

### Historie a statistiky

Záznam veze `rezim` (id) a u vlastního režimu i `rezimN` (název). **Název se
veze se záznamem, ne odkazem do nastavení** — stejná úvaha jako u kódu
`k1500x5`: smazání režimu ani import zálohy na cizí telefon nesmí nechat
v historii id, ke kterému neexistuje text. Jde do `innerHTML`, takže přes
`esc()`.

**`IDB_VERZE` se kvůli tomu nezvedá.** Chybějící pole dopočítá `gRezim()` při
čtení, stejně jako `gKol()` — všechny dřívější hry se opravdu hrály podle KCD.

**Kódy štítků.** Samostatná jednička a pětka nesou `j` a `p` odjakživa
a leží tak v historii; zbylé čtyři hodnoty dostaly `d2`–`d6`. Ta asymetrie je
záměrná — přepsat `j` a `p` na `d1` a `d5` by znamenalo sáhnout na uložená
data. Dvojice se vejde do gramatiky „počet × hodnota“, takže `NKOD` je nově
`[2-6]` a dvojice šestek je `n26`; zmrazená `STARE_N` zůstává na `[3-6]`,
protože starý český popis dvojice nikdy neobsahoval. Kód vyrábí na jednom
místě `kodStejnych(count, value)` — čip i tlačítko `+` tak dají za trojku
totéž.

Statistika **Nejhranější režim** je poslední v `STATY` a je to třetí druh
shrnutí vedle her a dnů (`a:"rezimMax"`, `rezimyPodleHer()`). Hodnotou je
název, ne číslo; podřádek nese počet her. **Žebříček se neproklikává** — filtr
podle režimu není, takže by proklik neměl kam vést.

### Přepnout jde jen nad prázdnou hrou

`!gameEmpty()` zašedí tlačítka *Zvolit* a nad seznamem se ukáže vysvětlení.
Kolo zapsané podle jedněch pravidel a další podle jiných by dalo skóre, které
nic neznamená, a v historii by režim lhal o první půlce hry. **Zvolený režim
taky nejde smazat** — jinak by rozehraná hra i volba ukazovaly na neexistující
id.

### Seznam a jeho tlačítka

*Pravidla*, *Upravit* a *Zvolit* / *Zvoleno* i *Přidat* v řádku *Vlastní režim*
nesou třídu `.rezbtn` s pevnou šířkou 56 px. Bez ní se sloupec hýbal podle
délky slova — a *Zvolit* se navíc na *Zvoleno* mění za běhu. Delší znění
zůstává v `title` a `aria-label` (`rezim.zvolit`).

Šířka je **těsně nad nejdelším popiskem** (české *Pravidla*), proto padding
jen 2 px a `white-space:nowrap`: kdyby se popisek nevešel, má přetéct, ne
zalomit se a zvýšit celý řádek.

**Selektor musí nést id** (`#setcardrezimy .rezbtn`): samotné `.rezbtn`
prohrává s `.setrow .ghost{flex:0 0 auto}` a pravidlo se tiše neuplatní.

Detail režimu končí **pásem s rizikem farklu** přilepeným na spodní hraně;
je popsaný v části 13, oddíl *Riziko farklu*.
