# Plán 2 — Přednastavené kombinace a počítané riziko farklu

> **NASAZENO 12. 8. 2026.** Popis výsledného stavu drží CLAUDE.md část 13; tenhle
> soubor zůstává jako odůvodnění (proč zrovna tyhle čtyři kombinace, proč dvojice
> a dvě dvojice vypadly, jak vyšla čísla rizika). Odchylky od zadání jsou
> vypsané dole v části 12.

**Stav k 12. 8. 2026:** hotové zadání, odsouhlasené, připravené k prováděcímu plánu.
**Riziko:** střední — sahá na panel kola, tedy na místo první tiché chyby
z `docs/mistakes.md`.
Sourozenecké plány: `01-technika.md`, `03-rezim-u-stolu.md` — nezávislé, dají se
dělat v libovolném pořadí.

**Tvrdá podmínka:** aplikace musí zůstat celá offline, bez backendu, bez volání
na cizí servery. Nic níž to neporušuje — všechny výpočty jsou lokální.

---

## Co se změnilo proti verzi z 10. 8. 2026

Původní zadání stálo na **editoru vlastních vzorů**: prázdný formulář, do kterého
si uživatel naťuká libovolnou kombinaci. Objevitelnost byla přiznaná slabina —
funkce by existovala, ale nikdo by na ni nepřišel.

Nová podoba vychází z pozorování, že **logických kombinací kostek není mnoho**.
Krom toho, co aplikace umí dnes, existují prakticky jen čtyři, které se skutečně
hrají; zbytek je věcí pravidel jedné konkrétní party. Ty čtyři jsou proto
zabudované napevno, ve výchozím stavu vypnuté, a zapínají se v nastavení.
Editor vlastních vzorů zůstává jako úniková cesta, ne jako hlavní vchod.

Důsledky, které se ukázaly až při rozboru, a které plán zjednodušily:

- **Mřížka počet × hodnota se nemění ani o řádek.** Všechny čtyři kombinace mají
  pevnou sazbu i pevný počet kostek, takže nepotřebují vědět, jaké hodnoty padly.
  Tlačítko `2×` ani multivýběr hodnot nejsou potřeba.
- **Obě pasti z původního plánu mizí.** Presetů je pevný počet, takže stojí
  staticky v HTML a jen se skrývají. `elDataStr` snapshot i `sberCestinu()`
  fungují beze změny.
- **Tabulka rizika má bez vlastních vzorů jen dvě podoby**, ne osm.

---

## 1. Čtyři přednastavené kombinace

| kombinace | zápis na čipu | kostek | sazba | nejlepší součet částí | past? |
|---|---|---|---|---|---|
| tři dvojice | `2+2+2` | 6 | 500 | `1,1 + 5,5 + x` = 300 | ne |
| trojice a dvojice | `3+2` | 5 | 1 200 | `1,1,1 + 5,5` = 1 100 | ne |
| dvě trojice | `3+3` | 6 | 2 000 | `1,1,1 + 6,6,6` = 1 600 | ne |
| čtveřice a dvojice | `4+2` | 6 | 1 500 | `1,1,1,1 + 5,5` = 2 100 | **ano** |

**Zásada, ze které sloupec „součet částí" vychází:** kombinace nemá platit míň,
než kolik dají její části podle dnešních pravidel. Jinak je tlačítko past —
vypadá jako bonus, ale kdo ho zmáčkne, přijde o body.

Jediná zbylá past je *čtveřice a dvojice* při čtyřech jedničkách (1 500 proti
2 000 za samotnou čtveřici). Neřeší se v kódu: u pevné sazby aplikace hodnoty
kostek vůbec nezná, takže není podle čeho poznat, že je to zrovna ten případ.
Sazby jsou proto **editovatelné** a rozdíl je vidět přímo na čipu, který svoje
body ukazuje. Patří to do Pravidel, ne do logiky.

Čísla `1 200` a `2 000` nejsou převzatá z publikovaných variant — ty uvádějí
1 500 a 1 500 nebo 2 500. Jsou zvolená tak, aby ležela nad hranicí pasti, protože
naše pravidla mají trojici jedniček za 1 000 a čtveřici za 2 000, což většina
variant nemá.

### Zápis na čipu

`2+2+2`, `3+2`, `3+3`, `4+2` — tři až pět znaků, **a nepotřebují překlad**.
To není kosmetika: rozpočet šířky v části 4 stojí a padá s délkou popisku.

---

## 2. Vliv na riziko farklu

Změřeno vyčerpávajícím výčtem $6^n$, ne opsáno odjinud.

| sada pravidel | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| dnešní pravidla | 66,7 | 44,4 | 27,8 | 15,7 | 7,7 | **3,1** |
| + trojice a dvojice | 66,7 | 44,4 | 27,8 | 15,7 | 7,7 | **3,1** |
| + dvě trojice | 66,7 | 44,4 | 27,8 | 15,7 | 7,7 | **3,1** |
| + čtveřice a dvojice | 66,7 | 44,4 | 27,8 | 15,7 | 7,7 | **3,1** |
| + tři dvojice | 66,7 | 44,4 | 27,8 | 15,7 | 7,7 | **2,3** |

**Tři ze čtyř kombinací nemění riziko vůbec.** Trojice+dvojice, dvě trojice
i čtveřice+dvojice obsahují trojici, která už dnes boduje — hod, který je
splňuje, nikdy nebyl farkle. Jsou to čistě bodové kombinace.

Riziko mění jedině **tři dvojice**, a to jen na šesti kostkách: 3,1 % → 2,3 %.
(2,3 % je číslo, které se běžně uvádí jako „pravděpodobnost farklu na šesti
kostkách"; platí právě pro varianty se třemi páry.)

### Co bylo zamítnuto a proč

**Samostatná bodující dvojice** a **dvě dvojice** ze seznamu vypadly. Nejde
o estetiku — spočítaný dopad:

| zbývá kostek | 6 | 5 | 4 | 3 | 2 |
|---|---|---|---|---|---|
| dnes | 3,1 % | 7,7 % | 15,7 % | 27,8 % | 44,4 % |
| kdyby bodovala dvojice | **0** | **0** | 1,9 % | 11,1 % | 33,3 % |
| kdyby bodovaly dvě dvojice | **0** | 3,1 % | 13,0 % | 27,8 % | 44,4 % |

Na šesti kostkách by farkle přestal existovat: šest kostek rozdělených mezi
čtyři hodnoty `{2,3,4,6}` vždycky vyrobí aspoň dvě dvojice, a šest různých
hodnot je postupka. Ze hry by zmizelo přesně to rozhodnutí, kvůli kterému se
hraje. Kdo to přesto chce, může si to zadat jako vlastní vzor — ale nemá to
být v inventáři, který se nabízí jedním klepnutím.

---

## 3. Datový model

```js
/* pevný inventář, čtyři položky, nikdy se nerozroste */
var PRESETY = {
  "3p": { d:6, def: 500, k:"c3p", je: function(c){ return poctuAspon(c,2) >= 3; } },
  "32": { d:5, def:1200, k:"c32", je: function(c){ return trojiceAPar(c); } },
  "33": { d:6, def:2000, k:"c33", je: function(c){ return poctuAspon(c,3) >= 2; } },
  "42": { d:6, def:1500, k:"c42", je: function(c){ return ctvericeAPar(c); } }
};
```

`d` je počet kostek, `def` výchozí sazba, `k` kód štítku, `je()` predikát nad
polem počtů výskytů — používá ho **jen výpočet rizika**, ne klávesnice.

Uložení pod klíčem `farkle-kombinace-v1` v `localStorage`. Stejná úvaha jako
u motivu, koše a nezhasínání (CLAUDE.md §7): rozhoduje se při startu, musí to
být synchronní, je to shora omezené a nikdy to nepovyroste.

```js
{ p: { "3p": 500, "32": 1200 },              // zapnuté presety a jejich sazby
  v: [ { id: "…", b: 1500, v: [1,1,1,5,5], any: false } ] }   // vlastní, strop 8
```

**Přítomnost klíče v `p` je zapnutí.** Žádný zvláštní boolean vedle sazby, tedy
ani žádný stav, který si může protiřečit.

### Vlastní vzory

Šest čipů 1–6, na kterých se naťuká konkrétní sada, plus přepínač
**„libovolné hodnoty"**:

- **vypnuto** → kombinace platí jen pro přesně tyhle hodnoty; test podmnožiny
  multimnožiny
- **zapnuto** → platí tvar, ne hodnoty; porovnají se setříděné **počty výskytů**,
  takže `2,2,3,3,4,4` má tvar `[2,2,2]` a sedne na jakékoli tři páry

```js
/* sedí kombinace do hodu? vrací počet spotřebovaných kostek nebo 0 */
function sedi(komb, hod){ … }
```

Predikát slouží výpočtu rizika. Do klávesnice se vlastní kombinace dostávají
jako čip s pevnými body a pevným počtem kostek, stejně jako presety.

---

## 4. Čipy v počítadle

### Rozpočet šířky

Na 320 px v pásmu ≤ 639 px: `body` má 12 px po stranách (`index.html:680`),
`.pad` dalších 12 px (`index.html:692`). Na řádek zbývá **272 px**, mezery mezi
čipy 5 px (`index.html:671`).

| čipů v řádku | šířka na čip | z toho na text |
|---|---|---|
| 4 (dnes) | 64 px | 46 px |
| 5 | 50 px | 32 px |
| 6 | 41 px | 23 px |
| 8 | 30 px | **12 px** |

Osm čipů znamená dva znaky na popisek. **Nezachrání to žádné zmenšování** — ani
nulový padding ušetří jen 16 px na čip, tedy pořád ~3 znaky. Do jednoho řádku
se osm nedostane a není to otázka CSS, ale aritmetiky.

*(Spočítáno z CSS a odhadu 0,5 em na znak, ne naměřeno. Hranice mezi „jeden
řádek" a „dva" u jedné a dvou kombinací je proto orientační a ověří se
Chromiem — řádová úvaha ale platí.)*

### Řešení: jeden řádek, přirozené zalomení

Čipy už dnes pružné jsou:

```css
.row  { display:flex; flex-wrap:wrap; gap:6px }
.chip { flex:1 1 auto; min-width:0; padding:4px 8px; white-space:nowrap }
```

Brzda není CSS — je to text. Presety proto jdou do **téhož `.row`** jako
postupky a zalomí se, teprve až dojde místo. Náklad neroste skokem o 38 px, ale
postupně podle toho, kolik si kdo zapnul:

| zapnuto | 320 px | 375 px |
|---|---|---|
| 0 | jeden řádek | jeden řádek |
| 1 | **jeden řádek** | jeden řádek |
| 2 | dva řádky | **jeden řádek** |
| 3–4 | dva řádky | dva řádky |

Kdo si zapne jednu kombinaci, nezaplatí ani pixel — a to je nejčastější případ.

### Symetrické zalomení

Pět čipů se zalomí jako 4 + 1 a osamělý čip se roztáhne přes celou šířku.
Řeší to třída nasazená z JS na `.row` podle počtu **viditelných** čipů, která
mění `flex-basis`: `k5` → 3 + 2, `k6` → 3 + 3, `k8` → 4 + 4.

### Proč obě pasti z původního plánu mizí

Presetů je pevný počet, takže stojí **staticky v HTML** hned za `ručně`
(`index.html:851`) a jen se skrývají:

```html
<button class="chip" data-kombi="3p" hidden>2+2+2<span class="v">500</span></button>
```

- `elDataSingle` / `elDataStr` se snímají jednou při startu (`index.html:2692`) —
  nový snapshot `elDataKombi` vznikne stejně a prvky v DOMu už budou.
- `data-i18n` může být statické, protože `sberCestinu()` (`index.html:1941`)
  posbírá češtinu z DOMu i ze skrytých prvků.
- `hidden` je na `<button>`, tedy na `HTMLElement` — past se skrýváním uvnitř
  `<svg>` z CLAUDE.md §6 se sem netýká.

Jeden řádek v `render()` vedle `index.html:5108–5109`:

```js
elDataKombi.forEach(function(b){ b.disabled = lock || PRESETY[b.dataset.kombi].d > l; });
```

Klepnutí volá `keep(PRESETY[k].k, sazba(k), PRESETY[k].d)` — dál už všechno
(kódy, štítky, i18n, historie, záloha) funguje beze změny.

### Vlastní kombinace jdou do panelu, ne do řádku

Vlastní vzor s konkrétními hodnotami nemá krátký zápis (`1,1,1+5,5` je devět
znaků) a může jich být až osm, takže by řádek přestal být shora omezený a celý
výpočet zalomení by přestal platit.

Vlastní kombinace proto žijí v panelu za čipem, který se z *ručně* přejmenuje
na **vlastní** (`#manualwrap`, `index.html:854`). Panel je ve výchozím stavu
skrytý, takže náklad v klidovém stavu je nula, a dlouhý popisek tam nevadí.

**Tady dynamické prvky zůstávají**, a s nimi jedna past: dynamický prvek nesmí
nést `data-i18n`. `sberCestinu()` běží jednou na začátku skriptu a atribut
přidaný později by se buď nesebral, nebo — hůř — sebral už přeložený a čeština
by se ztratila. Popisky skládat přes `t()` při vykreslení, překreslení po
přepnutí jazyka registrovat přes `naJazyk()` (`index.html:1959`).

---

## 5. Kódy štítků

`index.html:2567–2631`.

**Presety dostanou konstantní kódy** `c3p`, `c32`, `c33`, `c42` do pole `KODY` —
žádný regex, jen čtyři řetězce a čtyři klíče v katalogu (`stitek.c3p` …).

**Vlastní kombinace nesou `k<body>x<kostek>`**, tedy `KKOD = /^k(\d{1,6})x([1-6])$/`
vedle dnešního `NKOD` (`index.html:2568`), a větev v `textKodu()`
(`index.html:2585`):

```js
"stitek.k": "vlastní {b} · {d}"
```

kde `{d}` projde přes `tn("pocitadlo.kostzkr", d)`, aby anglické „1 die" vs.
„2 dice" fungovalo.

**Vzor se do kola neukládá záměrně.** Vzor je věc *pravidel*, kód je věc
*záznamu*. Kdyby kód odkazoval na kombinaci v nastavení (`k<id>`), pak by
smazání kombinace — nebo import zálohy na cizí telefon — nechalo v historii
viset kód, ke kterému neexistuje text. `k1500x6` se přečte vždycky a všude.

**Body jsou v `it.p`, ne v kódu.** Změna sazby v nastavení tedy nepřepíše
historii; dohraná hra si pamatuje, za kolik se tehdy hrálo.

`STARE` a `STARE_N` **zůstávají zmrazené** — starší záznam vlastní kombinaci
nikdy nenesl, takže tam není co doplňovat. `kodyZPopisu()` se nemění.

**Volné ruční zadání (`v`) zůstává beze změny** jako poslední úniková cesta.

---

## 6. Riziko v tlačítku *Házet dál*

`#rollon` dostane druhý drobný řádek stejným vzorem jako `.chip .v`:

```
Házet dál
farkle 27,8 %
```

Proč tam a ne do `#rollline`, jak navrhovala předchozí verze plánu: `#rollline`
se v pásmu ≤ 539 px skrývá (`index.html:709`), takže by riziko na iPhonu SE 2
na výšku prakticky neexistovalo. Tlačítko nemizí nikdy a riziko je navíc údaj
**o rozhodnutí, které se tím tlačítkem dělá**.

Hodnota se bere podle kostek, kterými se bude házet: `left()`, nebo šest při
horkých kostkách. Procento formátuje `desetina()` (`index.html:3866`), aby
desetinná značka šla z katalogu — `27,8` česky, `27.8` anglicky.

### Výpočet

**Rychlá cesta pro běžný případ.** Bez vlastních vzorů má tabulka jen dvě
podoby, takže se použijí konstanty a při startu se nepočítá nic:

```js
var RIZIKO    = [66.7, 44.4, 27.8, 15.7, 7.7, 3.1];
var RIZIKO_3P = [66.7, 44.4, 27.8, 15.7, 7.7, 2.3];   // tři dvojice zapnuté
```

**Výčet se spustí, teprve když existuje aspoň jedna vlastní kombinace**, a jeho
výsledek se zapamatuje do změny seznamu. Cena je $6^1 + \dots + 6^6 = 55\,986$
hodů, v JS jednotky až nízké desítky ms. Pustit líně po prvním `render()`, ne
synchronně při startu.

---

## 7. Nastavení — nový oddíl harmoniky

`#setmodal` má čtyři přepínače a tři `<details class="setsec">`
(`index.html:1032–1077`). Přibude čtvrtý: **Vlastní kombinace**.

Infrastruktura je hotová a nesahá se na ni:

- výlučnost oddílů si hlídá JS (`index.html:3466`), ne atribut `name`
- počet v hlavičce doplní `pocetVOddilu()` (`index.html:2938`)
- zavření všech oddílů při otevření okna obstará `zavriSekce()` (`index.html:3472`)

Uvnitř:

```
▾ Vlastní kombinace                6

  [●] tři dvojice        [  500] b
      farkle na 6 kostkách: 3,1 % → 2,3 %
  [●] trojice a dvojice  [ 1200] b
  [○] dvě trojice        [ 2000] b
  [○] čtveřice a dvojice [ 1500] b

  Vlastní:
  [●] 1,1,1+5,5   1500 b            [Smazat]

  Nová:   1  2  3  4  5  6
  ☑ libovolné hodnoty   [body]   [Přidat]
```

Řádek o vlivu na riziko je **jen u tří dvojic** — je to jediný preset, který ho
mění. U ostatních by to byl šum.

**Řádky stavět z uzlů jako `kosRadek()`** (`index.html:2947`), ne z `innerHTML` —
je to zavedený vzor v tomhle okně a nepotřebuje `esc()`.

Přepínače hlásí stav, ne akci (CLAUDE.md §3): *Zapnuto* / *Vypnuto*, v zapnutém
stavu třída `on`. Co klepnutí udělá, zůstává v `title` a `aria-label`.

---

## 8. i18n

Nové klíče do `RUCNI` (`index.html:1279`) **i** do `EN` (`index.html:1498`) —
sada 16 kontroluje pokrytí klíč po klíči a osiřelé klíče v obou směrech.

| oblast | klíče |
|---|---|
| štítky presetů | `stitek.c3p`, `stitek.c32`, `stitek.c33`, `stitek.c42` |
| štítek vlastní | `stitek.k` |
| riziko | `pocitadlo.farkleproc` |
| nastavení | název oddílu, čtyři názvy kombinací, *libovolné hodnoty*, *Přidat*, *Smazat*, řádek o vlivu na riziko |

Popisky na čipech (`2+2+2`, `3+2`, `3+3`, `4+2`) jsou jazykově neutrální; přeložit
se musí jen **názvy v nastavení** a **štítky v historii**. Body v `.v` jdou přes
`fmt()`, procenta přes `desetina()`.

---

## 9. Testy

**Nová sada 18 — kombinace:**

- uložení a načtení `farkle-kombinace-v1`, strop osmi vlastních
- kódy `c3p`–`c42` i `k…x…` v položce i v zapsaném kole
- štítky v obou jazycích
- export a import kola s kombinací
- zákaz čipu podle počtu zbývajících kostek (`d > left()`)
- změna sazby v nastavení **nepřepíše** body v historii
- predikát `any: true` vs. `any: false`
- riziko: `RIZIKO` bez tří dvojic, `RIZIKO_3P` s nimi, index při horkých kostkách

**Strážní test je povinný, ne volitelný.** Musí obě konstantní sady při každém
běhu znovu odvodit výčtem přes `kindPoints()` (`index.html:2528`) a `STRAIGHTS`
(`index.html:2532`). Bez něj se čísla po jakékoli změně pravidel tiše rozejdou
a nic to nechytí — přesně ta třída chyby, kvůli které se čísla neopisují odjinud.

Kostra výčtu, ze které vznikly tabulky výš:

```js
function counts(r){ const c=[0,0,0,0,0,0,0]; for(const d of r) c[d]++; return c; }
const zaklad = c => c[1]>0 || c[5]>0 || c.some(x=>x>=3);
/* pro každé n = 1…6 projít 6^n hodů a spočítat podíl těch, kde predikát selže */
```

**Dotčené existující sady:**

| sada | proč |
|---|---|
| 01 | klávesnice a zámky |
| 07 | klávesnice, terminologie |
| 14 | **počet oddílů harmoniky se mění — spadne úmyslně** |
| 16 | katalog, pokrytí klíčů |
| 17 | štítky a kódy |

---

## 10. Ověření

```
node Testy/01-limit-kol.mjs      # … a všech sedmnáct plus nová 18
```

Baseline je zelený (ověřeno 10. 8. 2026), dnes 1 040 kontrol.
Sada 14 spadne úmyslně (nový oddíl) — **opravit, ne obejít**.

**Playwright s Chromiem je tu povinný**, ne doporučený: plán sahá na panel kola,
tedy na místo první tiché chyby z `docs/mistakes.md` (ořezané UI na iPhonu SE 2,
kterou test na `scrollHeight` neodhalil, protože měřil špatnou věc).

Zkontrolovat na **320, 375 a 390 px v obou motivech**:

- žádná kombinace zapnutá — klávesnice musí vypadat přesně jako dnes
- jedna zapnutá — musí zůstat v jednom řádku na 320 px (**to je předpoklad,
  který se tímhle ověřuje**)
- všechny čtyři zapnuté — dva řádky, symetrické 4 + 4, stránka nesmí rolovat
- otevřený panel *vlastní* s osmi vlastními kombinacemi
- pásmo ≤ 539 px, kde `#rollline` mizí — riziko v tlačítku musí zůstat vidět

**Verzi v `sw.js` zvyšuje majitel projektu, ne asistent.**

---

## 11. Vědomě přijaté kompromisy

- **Dvě dvojice a samostatná dvojice vypadly z inventáře.** Smazaly by farkle na
  šesti kostkách úplně. Kdo je chce, zadá si je jako vlastní vzor.
- **Čtveřice a dvojice za 1 500 je past při čtyřech jedničkách** (2 000 za
  samotnou čtveřici). Editovatelná sazba to řeší, zbytek patří do Pravidel.
- **Pevná sazba nezná hodnoty kostek**, takže čtveřice šestek a čtveřice
  jedniček platí stejně. Je to cena za jedno klepnutí místo dvoukrokového
  výběru hodnot.
- **Vlastní kombinace stojí dva doteky**, protože žijí v panelu. Presety, které
  pokrývají drtivou většinu, stojí jeden.

---

## 12. Odchylky při nasazení (12. 8. 2026)

Co se při provádění udělalo jinak, než plán psal, a proč.

- **Třída `k7`.** Plán jmenoval `k5`, `k6` a `k8`. Sedm čipů ale nastane při
  třech zapnutých presetech, takže přibyla i `k7` (4 + 3). Bez ní by se sedmý
  čip zalomil na osamělý řádek.
- **Oddíl v nastavení se jmenuje *Kombinace navíc*, ne *Vlastní kombinace*.**
  Drží totiž obojí — čtyři presety i vlastní vzory — a *Vlastní kombinace* je
  uvnitř podnadpis té druhé skupiny.
- ~~**Vlastní vzor nemá vlastní přepínač zapnuto/vypnuto.**~~ **Dodáno
  12. 8. 2026 (druhá iterace).** Původně se přítomnost v poli `v` brala jako
  zapnutí, jenže tím splynulo vypnutí se smazáním — a vzor se naťukává po
  kostkách, takže se znovu dělá pracně. Model má proto navíc příznak `z`
  a řádek vypadá stejně jako u presetu, jen s mazáním navíc. Viz část 13.
- **`sedi()` vrací boolean, ne počet spotřebovaných kostek.** Predikát slouží
  jedině výpočtu rizika a počet kostek je i tak `vz.v.length`. Ve zdroji se
  jmenuje `sediVzor()`.
- **Vlastní vzor musí mít aspoň dvě kostky.** Jednokostkový vzor je buď dnešní
  jednička a pětka, nebo — s *libovolnými hodnotami* — tvar, který sedne na
  cokoliv, a riziko farklu by spadlo na nulu.
- **Čip *ručně* se přejmenoval na *vlastní* a jeho podřádek na *body***
  (`custom` / `points`). Plán žádal přejmenování hlavního popisku, podřádek
  „vlastní" by se tím zdvojil.
- **Sonda `window.__pravidla`.** Strážní test podle části 9 si musí obě
  konstantní tabulky odvodit přes `kindPoints()` a `STRAIGHTS`, a ty z uzávěru
  ven nevedou. Sonda má stejné odůvodnění i stejný tvar jako `window.__i18n`.
- **Playwright neproběhl.** Část 10 ho označuje za povinný a zůstává
  nesplněný — v prostředí, kde se plán prováděl, nebyl k dispozici. Kontrolní
  seznam z části 10 platí dál: 320, 375 a 390 px v obou motivech, se žádnou,
  jednou a všemi čtyřmi kombinacemi, s otevřeným panelem vlastních vzorů
  a v pásmu ≤ 539 px.
- **Zápis `2+2+2` se u vlastních vzorů neujal.** Plán ho v části 3 předpokládal
  i pro vlastní kombinace s libovolnými hodnotami, ale u jediné skupiny vyjde
  na samotné `2` a vypadá to jako hodnota dvě, ne jako „dvě stejné kostky".
  Vlastní vzor s libovolnými hodnotami proto nese **slovní název generovaný
  z tvaru** („dvojice", „tři dvojice", „trojice a dvojice"). Presety si svůj
  krátký zápis nechávají — jsou v řadě čipů, kde rozpočet šířky z části 4 platí
  dál. Generátor musí vyrobit i názvy presetů, což hlídá strážní test.
- **Čip *vlastní* je poslední, ne první z té skupiny.** Část 4 psala, že
  presety stojí „hned za ručně". Jenže *vlastní* otevírá panel pod řadou,
  takže mezi čipy uprostřed nepatří; presety jdou před něj.
- **Nastavení je na dvou kartách.** Část 7 přidávala čtvrtý oddíl harmoniky,
  jenže okno tím přerostlo. Kombinace mají vlastní kartu (*Herní režimy*)
  a zbytek zůstal na *Obecné*; přepínač je opsaný z okna Pravidla/Návod.
- **Ořez fontu je jinde, než CLAUDE.md tvrdil.** Před nasazením se rozbalila
  `cmap` všech pěti woff2: společných je **290 znaků**, ne 129. `%` v ořezu je
  (proto se riziko píše `farkle 27,8 %`), `→` v něm **není** — proto je věta
  o vlivu tří dvojic na riziko formulovaná slovy, ne šipkou. Opraveno
  v CLAUDE.md části 2.
