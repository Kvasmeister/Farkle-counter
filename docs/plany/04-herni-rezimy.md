# Plán 4 — Herní režimy

## Kontext

Počítadlo dnes umí **jedna** pravidla: KCD2. Kombinace navíc (CLAUDE.md část 13)
byly první krok — ukázaly, že bodovací tabulku jde rozšířit za běhu, aniž se
rozsype historie. Tenhle plán z toho udělá celý systém: **sada pravidel je věc,
kterých je víc, dají se přepínat a dají se vyrobit vlastní**.

Podklad: `docs/farkle-pravidla-verze.md` — čtyři doopravdy odlišné verze hry.
Tři z nich se stanou přednastavenými režimy, výchozí je KCD2. Čtvrtá
(Piggyback) se od klasiky neliší bodováním, ale strukturou tahu, kterou sólo
počítadlo nemá — zůstane jako poznámka v pravidlech klasiky.

Cíl: hráč si v nastavení vybere, podle čeho se dnes hraje; počítadlo, pravidla,
riziko i historie se tomu přizpůsobí a statistiky umí říct, co se hraje nejvíc.

### Rozhodnutí majitele projektu (13. 8. 2026)

1. **Režim mění celou bodovací tabulku** — počet kostek, jedničku, pětku, všech
   šest trojic zvlášť, pravidlo pro čtyři a víc stejných, postupky, kombinace
   navíc i vlastní vzory.
2. **Piggyback se nedělá jako režim.** Uvede se jako alternativní forma hraní
   v pravidlech klasické Farkle.
3. **Přepnutí režimu je za rozehrané hry zakázané.** Volba je zašedlá
   s vysvětlením; přepnout jde před první odloženou kostkou nebo po *Nové hře*.

### Tvrdé podmínky, které platí dál

- Aplikace zůstává celá offline, bez backendu.
- **Formát zálohy se nemění** — soubor z kterékoli dřívější verze musí jít
  naimportovat i potom.
- Cokoliv, co může přijít z cizí zálohy nebo z poškozeného úložiště a jde do
  `innerHTML`, prochází `esc()`. Nově se to týká **názvu vlastního režimu**.
- Jeden průchod hráče je **kolo**; slovo „tah“ se nevrací.
- `sw.js` **nesahat** — verzi zvyšuje majitel projektu.

---

## 0. Terminologie: „typ hry“ a „herní režim“ jsou dvě různé věci

Dneska se `S.mode` (*do bodů* / *na kola*) jmenuje v kódu i v CLAUDE.md
**režim hry**. Nový pojem se jmenuje **herní režim** taky — a to je přesně ta
past, kvůli které z aplikace zmizelo slovo „tah“.

Rozhodnutí: **typ hry** = do bodů / na kola, **herní režim** = sada pravidel.
Filtr v Statistikách už dnes říká *typ* (`#typmodal`, `popisTypu()`,
`hodnotyTypu()`), takže se jen dorovná zbytek:

| dnes | nově |
|---|---|
| `popisRezimu(rec)` | `popisTypuHry(rec)` |
| klíče `rezim.dobodu`, `rezim.nakola`, `rezim.nakolalimit` | `typ.dobodu`, `typ.nakola`, `typ.nakolalimit` |
| CLAUDE.md část 3 „Dva režimy hry“ | „Dva typy hry“ |

Jmenný prostor `rezim.*` v katalogu se tím uvolní pro herní režimy.
**Pole `mode` v datech se nepřejmenovává** — leží v historii i v zálohách.
Strážní kontroly sady 16 (volané klíče, osiřelé klíče) přejmenování ohlídají.

---

## 1. Datový model režimu

Nová konstanta vedle `PRESETY` (`index.html` ~2761):

```js
/* Jeden herní režim. `troj` je indexované hodnotou kostky, aby šla každá
   trojice nastavit zvlášť; `post` a `p` jsou řídké mapy, kde přítomnost
   klíče znamená „boduje“ — stejná úvaha jako u dnešního KOMB.p. */
{ id:    "kcd2",
  nazev: null,                              /* jen vlastní režim */
  kostek: 6,
  jed: 100, pet: 50,
  troj: [0, 1000, 200, 300, 400, 500, 600], /* index = hodnota kostky */
  nad: "x2",                                /* "x2" | "nasobek" | "pevne" */
  nadP: [1000, 2000, 3000],                 /* jen pro "pevne": 4, 5, 6 stejných */
  post: { "15":500, "26":750, "16":1500 },  /* chybějící klíč = postupka neboduje */
  p:    {},                                 /* dnešní KOMB.p */
  v:    [] }                                /* dnešní KOMB.v */
```

`PRESET_REZIMY` a `PRESET_REZIMY_PORADI` (`["kcd2","klasika","pet"]`):

| id | kostek | nad | postupky | kombinace navíc |
|---|---|---|---|---|
| `kcd2` | 6 | `x2` (×2 / ×4 / ×8) | 1–5 500, 2–6 750, 1–6 1 500 | žádná |
| `klasika` | 6 | `nasobek` (×2 / ×3 / ×4) | 1–6 1 000 | tři dvojice 750 |
| `pet` | 5 | `nasobek` | 1–5 500, 2–6 750 | žádná |

Jedničky, pětky a trojice mají všechny tři stejné (100 / 50 / hodnota × 100,
tři jedničky 1 000) — tak to má i zdrojový dokument.

**Dvě čísla dokument neurčuje a plán je dosazuje:** sazbu pětikostkové postupky
v režimu `pet` (bere se 500 / 750 jako u KCD2) a pravidlo pro čtyři a pět
stejných tamtéž (bere se `nasobek` jako u klasiky). Obojí je editovatelné a
zmíněné v poznámce toho režimu.

**Vynechané rysy dokumentovaných verzí a proč:** *okamžitá výhra* při pěti
stejných na první hod (počítadlo nemá co počítat — hráč ví, že vyhrál; zůstane
jako poznámka v pravidlech režimu `pet`), *nastupovací práh 500 bodů* a
*3 farkle v řadě = −1 000* (domácí varianty, ne součást žádné z verzí),
*vážené kostky a odznaky KCD2* (nadstavba nad pravidly, poznámka).

### Přístup k režimům

```js
var REZIMY = { akt: "kcd2", p: {}, v: [] };   /* p: odchylky presetů, v: vlastní */
function aktRezim(){ … }          /* složený režim podle REZIMY.akt */
function rezimPodleId(id){ … }    /* preset + odchylky, nebo vlastní, nebo null */
function seznamRezimu(){ … }      /* tři presety a za nimi vlastní v pořadí vzniku */
function kostek(){ return aktRezim().kostek; }
```

`aktRezim()` staví režim **na každé volání znovu ze zdroje pravdy** (výchozí
preset + odchylky), aby nemohla vzniknout druhá, zastaralá kopie. Je to
mělké skládání šesti polí, volá se z `render()`, takže se nesmí do ničeho
zapisovat — vrací nový objekt.

---

## 2. Úložiště a migrace

Nový klíč `farkle-rezimy-v1` v `localStorage` (stejná úvaha jako u motivu,
koše a kombinací: rozhoduje se při startu, musí to být synchronní, je to shora
omezené):

```js
{ akt: "kcd2",
  p: { kcd2: { p:{"3p":500} } },              /* jen odchylky od výchozího presetu */
  v: [ { id:"r1a2b3", nazev:"Naše pravidla", kostek:6, … } ] }
```

**U presetů se ukládají jen odchylky**, ne celý režim — jinak by pozdější
oprava výchozích hodnot nedorazila k nikomu, kdo se režimu jednou dotkl.
U vlastního režimu není proti čemu diffovat, ukládá se celý.

`REZIMY_MAX = 20` vlastních režimů. Klíč tím zůstane pod deseti kilobajty.
(Zadání říká „neomezeně“ — viz *Odchylky* na konci.)

### Migrace z `farkle-kombinace-v1`

Když `farkle-rezimy-v1` chybí a `farkle-kombinace-v1` existuje, jeho `{p, v}`
se stane odchylkou režimu `kcd2` a zapíše se nový klíč. **Starý klíč se
nemaže** — stejný záchranný idiom jako `farkle-hist-v1-zaloha`. Objeví se tím
v rozpisu zabraného místa mezi „zbylými klíči `farkle-*`“; sada 14 to zná.

`nactiKombinace()` / `ulozKombinace()` zanikají a nahradí je
`nactiRezimy()` / `ulozRezimy()`. `cistyVzor()` zůstává beze změny; přibude
`cistyRezim(x)` se stejnou úlohou — cizí data nesmí projít nezkontrolovaná
(název ořezaný na 40 znaků, `kostek` 2–6, sazby 0…`BODY_MAX`, `nad` z výčtu).

---

## 3. Bodování podle režimu

`kindPoints()` (~2728) dostane režim:

```js
function kindPoints(value, count, rez){
  rez = rez || aktRezim();
  var base = rez.troj[value] || 0;
  if(count <= 3)             return base;
  if(rez.nad === "pevne")    return rez.nadP[count - 4] || 0;
  if(rez.nad === "nasobek")  return base * (count - 2);      /* 4→×2, 5→×3, 6→×4 */
  return base * Math.pow(2, count - 3);                       /* x2: ×2, ×4, ×8 */
}
```

`STRAIGHTS` (~2732) přestane nést body a zůstane jen popisem postupky
(`{ d, k, hodnoty }`); body se berou z `rez.post`. Kód štítku (`s15`, `s26`,
`s16`) se nemění, takže historie čte dál.

`kombZap()`, `sazba()` a `vzoryZap()` dostanou režim jako první parametr —
dnešní globální `KOMB` mizí. Volajících je pár (`renderKombi`,
`bodujeSKombinacemi`, `pocetKombinaci`, obsluha čipů).

**Počet kostek** je dnes natvrdo na dvanácti místech (`2190`, `2241`, `2243`,
`3216`, `3226`, `3234`, `3251`, `3390`, `3924`, `3925`, `3930`, `5841`).
Všechny projdou přes `kostek()`. `ozdrav()` navíc ořízne `thrown` na rozsah
1…`kostek()`, aby stav uložený v šestikostkovém režimu nerozbil pětikostkový.

---

## 4. Riziko farklu

`bodujeZaklad(c)` → `bodujeZaklad(c, rez)`. Dnešní zkratka „postupky dopisovat
netřeba, obsahují jedničku nebo pětku“ **přestává platit** — režim může mít
jedničku i pětku na nule. Predikát proto projde jedničku, pětku, šest trojic
i všechny zapnuté postupky.

`spocitejRiziko()` počítá `n = 1…rez.kostek` (na pěti kostkách je to 9 330
hodů, na šesti dnešních 55 986).

`tabulkaRizika()`:

- rychlá cesta s konstantami `RIZIKO` / `RIZIKO_3P` platí **jen když je aktivní
  režim přesně výchozí KCD2** (`jeVychoziKcd2()`), s tříma dvojicema nebo bez;
- jinak líný výčet přes `setTimeout` s cache klíčovanou **podpisem pravidel**
  (`podpisRezimu(rez)` — řetězec ze všech bodovacích polí). Podpis proto, aby
  se přepnutím tam a zpátky nespouštěl výčet znovu.

**Strážní test zůstává povinný** a odvozuje obě konstanty z presetu `kcd2`.

---

## 5. Počítadlo — klávesnice podle režimu

- **Postupky** (`[data-str]` v `#strrow`) se skrývají a plní stejným idiomem
  jako dnes kombinace: `hidden` podle `rez.post`, sazba do `.v`.
- Nadpis nad řadou přestane být natvrdo „Postupky“ — když je vidět aspoň jedna
  kombinace navíc, přepne se na „Postupky a kombinace“, a nemá-li režim
  postupku, na „Kombinace“. Řada sama se **nikdy neskrývá**: sedí v ní čip
  *vlastní*.
- Třídy `k5`–`k8` se počítají z viditelných čipů jako dnes.
- **Kombinace, která se do režimu nevejde** (`d > rez.kostek`, typicky tři
  dvojice v pětikostkovém režimu), se neukazuje vůbec — ani v klávesnici, ani
  v seznamu v nastavení. Totéž pro vlastní vzor s víc kostkami, než režim má.
- **Jednička a pětka** (`[data-single]`) berou sazbu z režimu a při nule se
  skrývají (režim, kde samostatná kostka neboduje, je legitimní).
- `#counts` (`3×`–`6×`): čip nad `rez.kostek` se skryje, ne jen zašedne.
- `#kombpips` v editoru vzorů má strop `kostek()` místo šesti.
- `renderKind()` volá `kindPoints(selValue, selCount)` — beze změny, dostane
  aktivní režim sám.

---

## 6. Nastavení — karta *Herní režimy*

Karta se rozdělí na dvě podstránky, stejným vzorem jako `#p2list` ↔ `#p2detail`
ve Statistikách (`hidden` + tlačítko zpět, ne další okno):

### `#rezlist` — seznam režimů

Řádek na režim (`setrow`): název, podřádek `6 kostek · 3 postupky · 1 kombinace
navíc`, a tři tlačítka — *Pravidla* (otevře okno pravidel toho režimu),
*Upravit* (jde na detail) a stavové *Zvoleno* / *Zvolit* přes `stavTlacitko()`.

Pod seznamem *Nový režim*; při dosažení `REZIMY_MAX` se místo něj ukáže zpráva
stejným způsobem jako `komb.strop`.

**Za rozehrané hry jsou tlačítka *Zvolit* zašedlá** a nad seznamem stojí
`.msg` s vysvětlením. „Rozehraná“ = `!gameEmpty()`, tedy i dohraná hra, dokud
se nezaložila nová — zpráva to říká rovnou („Dohranou hru zapiš do historie a
začni Novou hrou“).

Odznak na přepínači karet (dnes `#kombcnt` s počtem kombinací) se změní na
**název aktivního režimu** a přejmenuje na `#reznazev`. Z první karty tak jde
poznat, podle čeho se hraje — což je užitečnější než počet kombinací.

### `#rezdetail` — jeden režim

Zpět, název režimu v hlavičce, a pak:

1. **Název** — pole, jen u vlastního režimu.
2. **Počet kostek** — `5` / `6`.
3. **Jednička**, **Pětka** — dvě pole.
4. **Trojice** — šest polí (1×3 … 6×3) v mřížce po dvou.
5. **Čtyři a víc stejných** — `<select>` se třemi pravidly; při *pevných
   bodech* se pod ním odkryjí tři pole.
6. **Postupky** — tři řádky (sazba + *Zapnuto*/*Vypnuto*), stejný tvar jako
   dnešní řádek kombinace.
7. **Kombinace navíc** a **Vlastní kombinace** — dnešní `#komblist`,
   `#kombvlastni` a editor beze změny chování, jen napojené na editovaný režim
   místo globálního `KOMB`.
8. **Obnovit výchozí** (preset) nebo **Smazat režim** (vlastní), obojí
   dvoukrokově jako koše.

**Aktivní režim nejde smazat** — jinak by rozehraná hra i `REZIMY.akt`
ukazovaly na neexistující id.

Každé pole ukládá stejně jako dnešní sazba kombinace: **zapíše a překreslí jen
klávesnici, ne celý oddíl**, jinak by pole ztratilo kurzor uprostřed psaní.
Výjimka jsou přepínače a počet kostek — ty mění, co je vidět, takže překreslují
oddíl celý.

---

## 7. Okno pravidel

`#cardrules` přestane být statickou tabulkou a bude se skládat funkcí
`pravidlaHTML(rez)`:

- odstavce o hodu, rozhodování a horkých kostkách (počet kostek se doplňuje
  přes `tn("slovo.kostkami", rez.kostek)`);
- tabulka: jednička, pětka, tři jedničky, trojice 2–6 (rozsah), každá zapnutá
  postupka, každá zapnutá kombinace navíc, každý zapnutý vlastní vzor —
  všechno jen tehdy, když v režimu boduje;
- poznámka o čtyřech a víc stejných ve **třech zněních** podle `rez.nad`;
- poznámka „dvojice ani skoro trojice neboduje“ jen tam, kde ji režim nemá
  vyvrácenou;
- **poznámka režimu** — volný text z katalogu: u klasiky *Piggyback* jako
  alternativní forma hraní, u `pet` okamžitá výhra a nižší obvyklý cíl,
  u KCD2 vážené kostky a odznaky.

Tím se z `<body>` ztratí klíče `pravidla.p1`–`p3`, `pravidla.t*` a
`pravidla.pozn*`. **Přesouvají se do `RUCNI`** — klíč nesmí být zároveň
anotovaný v HTML a v ručním katalogu, hlídá to sada 16.

Okno dostane pod přepínačem řádek s názvem režimu, jehož pravidla ukazuje.
Otevření tlačítkem „i“ ukazuje aktivní režim, otevření z nastavení ten, u
kterého se kleplo. Karta *Návod* se tím nemění.

---

## 8. Historie a záloha

`S.rezim` přibývá do stavu; `ozdrav()` dosazuje `"kcd2"`, když chybí nebo
neodpovídá žádnému známému režimu.

`snapshot()` (~2710) přidá `rezim: S.rezim` a u vlastního režimu i
`rezimN: <název>`. Název se veze **s záznamem**, ne odkazem do nastavení —
stejná úvaha jako u kódu `k1500x5`: smazání režimu nebo import zálohy na cizí
telefon nesmí nechat v historii viset id bez textu.

| místo | co přibude |
|---|---|
| `souhrnZ()` (~2333) | `rezim`, `rezimN` |
| `parseZaloha()` (~4798) | `rezim` (≤ 40 znaků), `rezimN` (≤ 40 znaků) |
| `otevriHru()` → `plny` (~5554) | obě pole, ať je koš vrátí celé |
| `popisHry()`, řádek historie, detail hry | název režimu za typem hry |

**`IDB_VERZE` se nezvyšuje.** Chybějící pole se dopočítá při čtení
(`gRezim(g)` vrací `g.rezim || "kcd2"`) — stejný vzorec jako `gKol()`
a bez migrace. Všechny dosavadní hry se opravdu hrály podle KCD2.

Název režimu jde do `innerHTML`, takže **přes `esc()`**; u presetu se bere
z katalogu podle id, u vlastního z `rezimN`, a když chybí, z klíče
`rezim.neznamy`.

---

## 9. Statistiky — nejhranější režim

Nová, **poslední** položka `STATY`:

```js
{ n:"stat.n.rezim", a:"rezimMax", f:cislo }
```

- `statHodnota()` pro `a === "rezimMax"` seskupí hry přes `gRezim()`, seřadí
  sestupně podle počtu a vrátí **název** nejhranějšího režimu jako `txt`
  (u shody rozhodne novější hra).
- `zebricek()` pro `rezimMax` vrátí `[{ id, nazev, pocet }]`.
- `otevriZebricek()` vybere třetího stavitele řádku, `radekRezimu(def)` —
  vedle dnešních `radekHry()` a `radekDne()`. **Řádky nejsou proklikávací**:
  filtr podle režimu neexistuje a zadání ho nežádá, takže by proklik neměl kam
  vést. `radekDne()` zůstává jediné místo, kde se karta přepíná sama.
- `jdeRozkliknout()` novou položku pustí sám (není `pocet` ani `soucet`).

**Počet statistik roste z 20 na 21** a to je v testech napevno —
`04-statistiky` (dvakrát), `05-zaloha`, `06-odolnost` (dvakrát),
`10-uloziste`. Bez opravy spadnou.

---

## 10. Návod

- Nový oddíl **Herní režimy** v `#cardguide`: co režim mění, kde se přepíná,
  že za rozehrané hry přepnout nejde, že si každý režim drží vlastní kombinace
  a že hra si v historii nese režim, ve kterém se hrála.
- Odstavec *Klávesnice*: postupky a kombinace nejsou pevné, řídí je režim.
- Odstavec *Nastavení hry*: přejmenovat na **typ hry**, ať se to neplete
  s režimem.
- `docs/farkle-pravidla-verze.md` zůstává jako podklad, do repa nejde.

---

## 11. Jazyky

Nové klíče v `RUCNI` **i v `EN`** (angličtina musí zůstat úplná, hlídá sada 16):

| skupina | příklad |
|---|---|
| názvy a popisy presetů | `rezim.n.kcd2`, `rezim.p.kcd2`, … |
| poznámky v pravidlech | `rezim.pozn.kcd2`, `rezim.pozn.klasika` (Piggyback), `rezim.pozn.pet` |
| přesunutá pravidla | `pravidla.p1`–`p3`, `pravidla.t*`, tři znění `pravidla.nad.*` |
| seznam a detail režimu | `rezim.zvolit`, `rezim.zvoleno`, `rezim.zamceno`, `rezim.novy`, `rezim.strop`, `rezim.smazat`, `rezim.vychozi`, `rezim.neznamy` |
| konfigurátor | `rezim.kostek`, `rezim.jed`, `rezim.pet`, `rezim.troj`, `rezim.nad`, `rezim.nad.x2/nasobek/pevne`, `rezim.post` |
| statistika | `stat.n.rezim` |
| přejmenované | `typ.dobodu`, `typ.nakola`, `typ.nakolalimit` |

Dvě pasti, které už jednou stály čas a platí i tady:

- **Klíč skládaný za běhu musí končit tečkou** (`t("rezim.n." + id)`,
  `t("rezim.nad." + rez.nad)`) — jinak ho kontrola v sadě 16 vezme jako
  literál.
- **Statický přepínač s `data-i18n` po přepnutí jazyka ztratí stav.** Každý
  nový přepínač v detailu režimu musí obnovit funkce registrovaná přes
  `naJazyk()`.
- Do `EN` **nesmí jít žádná značka** — název režimu v odznaku je sourozenecký
  `<span>`, ne součást překladu.

Znaky mimo ořez fontu: nové texty nesmí přinést nic nového. `×` a `·` v ořezu
jsou, `→` ne. Po dopsání ověřit množinou znaků souboru.

---

## 12. Postup po fázích

Každá fáze nechává aplikaci funkční a spustitelnou.

| fáze | co | vidět navenek |
|---|---|---|
| **A** | terminologie (oddíl 0), datový model, úložiště, migrace | nic |
| **B** | bodování a klávesnice přes `aktRezim()`, riziko | nic (jediný režim je KCD2) |
| **C** | karta *Herní režimy*: seznam, přepínání, detail, konfigurátor | ano |
| **D** | okno pravidel podle režimu, návod | ano |
| **E** | `S.rezim` do historie, zálohy a statistiky | ano |
| **F** | testy a dokumentace | — |

---

## 13. Testy

Nová sada **`Testy/19-rezimy.mjs`**:

- tři přednastavené režimy, výchozí `kcd2`, přepnutí a jeho přežití reloadu;
- migrace `farkle-kombinace-v1` → `farkle-rezimy-v1` včetně zachování starého
  klíče; poškozený a cizí obsah nového klíče;
- ukládají se jen odchylky presetu, ne celý režim;
- **strážní test:** `kindPoints()` dá pro každý preset ručně spočítanou
  tabulku pro počty 3–6 a hodnoty 1–6 ve všech třech pravidlech `nad`;
- pětikostkový režim: `thrown` je 5, horké kostky jsou na pěti, čip `6×`
  i kombinace na šest kostek nejsou vidět, stav uložený na šesti se ořízne;
- klávesnice: postupky se skrývají a plní podle režimu, nadpis řady ve třech
  zněních, čip *vlastní* zůstává poslední a vždy přítomný;
- pravidla: tabulka odpovídá režimu, tři znění poznámky o čtyřech a víc,
  poznámka režimu, otevření z nastavení pro jiný než aktivní režim;
- přepnutí je za rozehrané hry zamčené a po *Nové hře* zase volné;
- aktivní režim nejde smazat, vlastní se maže dvoukrokově, `REZIMY_MAX`;
- historie: `rezim` a `rezimN` v záznamu, souhrnu i záloze, záznam bez `rezim`
  se čte jako KCD2, smazaný vlastní režim nechává v historii čitelný název;
- statistika *Nejhranější režim* je poslední, žebříček je seřazený sestupně a
  řádky nejsou proklikávací;
- **strážní test rizika** (přesun z 18): obě konstanty odvozené výčtem
  z presetu `kcd2`, a shoda spočítané tabulky s výčtem pro klasiku i `pet`.

Úpravy stávajících sad:

| sada | proč |
|---|---|
| 04, 05, 06, 10 | 20 → 21 statistik (napevno v kódu testu) |
| 14 | karta *Herní režimy* má nově seznam a detail; odznak nese název režimu; rozpis místa zná nový klíč |
| 18 | kombinace jsou nově per režim — přestavět přípravu, zbytek kontrol beze změny |
| 16 | katalog se dorovná sám; přejmenované klíče `typ.*` |
| 01 | zámek a limit kol se nemění, ale běží v novém výchozím režimu — ověřit, že sada projde beze změny |

**Playwright** zůstane nesplněný (v tomhle prostředí není). Ruční kontrola po
nasazení je tentokrát podstatnější než minule, protože se sahá na klávesnici
i na okno pravidel: 320, 375 a 390 px v obou motivech — klávesnice
v pětikostkovém režimu, řada čipů s klasikou (tři dvojice zapnuté), detail
režimu se šesti poli trojic, okno pravidel u všech tří presetů.

---

## 14. Odchylky od zadání

1. **„Neomezeně vlastních režimů“ dostane strop 20.** `localStorage` musí
   zůstat shora omezené (CLAUDE.md část 4) a strop se hlásí předem, stejně
   jako u vlastních kombinací. Číslo je jediné místo v kódu a dá se zvednout.
2. **Piggyback není režim**, jen poznámka v pravidlech klasiky — podle
   rozhodnutí z 13. 8. 2026.
3. **Žebříček režimů není proklikávací.** Filtr podle režimu by byl čtvrté
   okno filtrů a zadání ho nežádá.
4. **Okamžitá výhra při pěti stejných** (režim `pet`) se nepočítá, jen popisuje
   — počítadlo nemá co počítat.

---

## Soubory

| soubor | co |
|---|---|
| `index.html` | vše |
| `Testy/19-rezimy.mjs` | nová sada |
| `Testy/04, 05, 06, 10, 14, 18` | úpravy podle tabulky výš |
| `Testy/TESTS_README.md` | popis sady 19, počty, nové pasti |
| `CLAUDE.md` | část 1 (pravidla podle režimu), 3 (nastavení, typ hry), 4 (nový klíč), 9 (devatenáct sad), 12 (nové klíče), nová část 14 |
| `docs/plany/04-herni-rezimy.md` | tento plán ke zbytku plánů |
| `docs/ideas.md` | odkaz na hotovo |

`sw.js` **nesahat.**

---

## Ověření

```
node Testy/01-limit-kol.mjs      # … a všech devatenáct
```

Výchozí stav: 1206 kontrol, vše prošlo. Sady 04, 05, 06, 10, 14 a 18 spadnou
úmyslně (počet statistik, struktura nastavení, kombinace per režim) —
**opravit, ne obejít**.

Po dokončení ručně projít: nová hra v každém ze tří presetů, hra v pětikostkovém
režimu od začátku do zámku, vlastní režim postavený od nuly, export a import
zálohy mezi dvěma režimy, a stará záloha z dnešní verze naimportovaná do nové
(musí se načíst jako KCD2).

---

## 15. Odchylky při realizaci (13. 8. 2026)

Plán se dodržel, kromě šesti míst, kde se ukázalo něco lepšího nebo nutného.

1. **`S.rezim` ve stavu není.** Plán počítal s polem ve stavu rozehrané hry
   vedle `REZIMY.akt`. Jsou to dvě proměnné na tutéž věc a rozejít se nemají —
   přepnout režim jde jen nad prázdnou hrou. Jedinou pravdou je proto
   `REZIMY.akt`; do záznamu se režim dopisuje až v `snapshot()`. Hra vrácená
   z koše volbu přenastaví (`nactiZaznam`).
2. **Režim se neskládá při každém volání.** `aktRezim()` vrací objekt ze
   `REZIMY.sez`, kde je každý režim úplný. Skládaná kopie by znamenala druhý,
   zastaralý objekt vedle toho, do kterého zapisuje editor v nastavení.
   Sparse je až zápis (`odchylkyRezimu`).
3. **Terminologické klíče se jmenují `typhry.*`, ne `typ.*`.** `typ.nakola`
   už bylo obsazené tlačítkem ve filtru podle typu hry a strážní kontrola
   sady 16 na překryv ručního katalogu s anotacemi to chytla hned.
4. **Čipy klávesnice mají popisek ve vlastním `<span>`.** Sazbu do `.v`
   dopisuje `renderKombi()` z režimu, takže ji katalog nesmí vlastnit —
   `data-i18n-html` na celém tlačítku by se s vykreslením přetahoval o tentýž
   prvek. Z angličtiny tím zmizely značky, což chtěl i `docs/i18n.md`.
5. **Čtyři a víc stejných jsou řádky tabulky, ne poznámka pod ní.** Jen tak
   se vypíše právě tolik počtů, kolik se jich do režimu vejde; prozaická věta
   by v pětikostkovém režimu mluvila o šesti stejných.
6. **Seznam režimů se kreslí i pod otevřeným detailem.** Je to pár řádků
   a odpadá tím celá třída chyb, kdy se návratem odkryl seznam z minula.

**Nesplněno:** Playwright (v prostředí není). Ruční kontrola po nasazení
podle oddílu 13.

---

## 16. Druhá iterace (13. 8. 2026) — deset úprav po zkoušení

Deset věcí, které se ukázaly při používání. Sedm z nich je drobnost, tři
sahají na model.

| # | co | kde |
|---|---|---|
| 1 | název zvoleného režimu v závorce na vlastním řádku přepínače karet | `#setseg`, CSS |
| 2 | křížek v pravidlech otevřených z nastavení vrací do nastavení | `vratDoNastaveni()` |
| 3 | *KCD2* → **KCD**, *Klasická Farkle* → **Klasické kostky** / *Classic farkle* | katalog, `id` beze změny |
| 4 | samostatně boduje kterákoli hodnota, ne jen jednička a pětka | `sam[1..6]` |
| 5 | dvojice jako plnohodnotná skupina + vypínání celých skupin | `dvoj[1..6]`, `SKUPINY` |
| 6 | nápověda „i“ u pravidla pro čtyři a víc stejných | `#reznadinfo` |
| 7 | *Zvolit* místo *Zvolit režim* na tlačítku | `rezim.zvolitkratce` |
| 8 | duplikace režimu | `duplikujRezim()` |
| 9 | riziko farklu i na prvním hodu | `render()` |
| 10 | klávesnice se přizpůsobí počtu bodujících hodnot | `SAMOSTATNE_V_RADE` |

### Co se rozhodlo jinak, než plán zněl

1. **Vypínat jde obojí.** Nula v poli vypne jednu hodnotu, přepínač u nadpisu
   celou šestici. Vypnutá skupina svoje pole **schová** — šest nul na
   obrazovce vypadá jako nastavení, které se dá měnit, a přitom neznamená nic.
2. **Zapnutí prázdné skupiny dosadí čísla.** Výchozí šestice dvojic je samá
   nula, takže zapnutí by jinak neudělalo nic viditelného. Dosadí se hodnota
   kostky krát deset — obvyklá domácí sazba a hlavně čísla, se kterými jde dál
   pracovat.
3. **Čtyři a víc stejných jsou v tabulce pravidel řádky, ne poznámka** (platí
   z první iterace) a nápověda k pravidlu se přepíná **na místě**, ne dalším
   oknem: text je krátký a `.msg` pod řádkem je v tom okně zavedený vzor.
4. **Duplikát je vždycky vlastní režim**, i když se kopíruje preset — dva
   režimy s týmž `id` existovat nesmí. Vlastní vzory v kopii dostanou nová
   `id`, aby si originál a kopie nepletly rozdělanou otázku na smazání.
5. **Kódy štítků zůstaly asymetrické.** Jednička a pětka nesou `j` a `p`,
   ostatní `d2`–`d6`. Sjednotit je na `d1`–`d6` by znamenalo sáhnout na
   uložená data, a to za pěknější tabulku nestojí.

### Past, na kterou se narazilo

`rezim.nad.info` skončil zároveň v ručním katalogu a jako `data-i18n-aria`
v HTML. Strážní kontrola sady 16 na překryv to chytla hned — klíč patří na
jedno místo, a když je prvek v HTML, patří tam.

**Stav po iteraci:** 1 381 kontrol v devatenácti sadách, vše prošlo.

---

## 17. Třetí iterace (14. 8. 2026)

Čtyři věci, které se ukázaly při používání. Zadání i rozhodnutí majitele
projektu drží plán `merry-percolating-balloon`; tady jen to, co z nich zůstalo
v kódu.

1. **Riziko farklu se přestěhovalo na tlačítko *Farkle*.** Sedělo na *Házet
   dál*, ale mluví o farklu. Podřádek proto neopakuje slovo nad sebou a čte se
   „riziko 3,1 %“ (`pocitadlo.farkleriziko` nahradilo `pocitadlo.farkleproc`).
   Popisek tlačítka je ve vlastním `<span data-i18n>`, aby se o prvek
   nepřetahovaly katalog a vykreslení.
2. **Tlačítka v seznamu režimů mají jednu šířku** (`.rezbtn`, dnes 56 px). *Zvolit*
   se za běhu mění na *Zvoleno*, takže bez pevné šířky poskakoval celý sloupec.
3. **Riziko u tří dvojic zmizelo a nastoupil pás na spodní hraně detailu.**
   Ta jedna věta platila jen pro jednu kombinaci a jen nad nedotčeným základem
   KCD; při stavbě vlastních pravidel je přitom riziko ten údaj, podle kterého
   se pozná, jestli režim dává smysl.
4. **Vlastní vzor umí míchat konkrétní hodnoty s libovolnými.** Přepínač
   *Libovolné hodnoty* platil na celý vzor, takže „dvě dvojice a šestka“ se
   zadat nedalo. Nahradila ho druhá řada čipů A–F.

### Rozhodnuto jinak, než by se čekalo

1. **Pás ukazuje celou křivku**, ne jen plný hod. Při stavbě pravidel je
   zajímavé právě to, jak riziko klesá s ubývajícími kostkami.
2. **Každé písmeno bere jinou hodnotu — a jinou i než čísla napsaná ve vzoru.**
   Vzor `A,A+B,B+6` proto na hod 6,6,6,3,3 nesedne: dvojice šestek by se
   započítala zároveň jako ta šestka. Je to táž úvaha, na které stály
   „libovolné hodnoty“ dřív, jen dotažená na smíšený vzor — a jde spočítat
   hladově, bez zkoušení zpětně.
3. **Smíšený vzor se jmenuje slovy a čísly** („dvě dvojice a 6“). Čistě
   písmenný a čistě číselný vzor tím vyjdou slovo od slova jako dřív, takže
   strážní rovnost s názvy presetů platí dál a v historii se nic nepřejmenovalo.
4. **Písmena se neukládají, jen velikosti skupin.** `A,A+B,B` a `B,B+C,C` je
   týž vzor; kdyby se ukládala písmena, existovaly by dva zápisy jedné věci.
5. **Vzor uložený se starým příznakem `any` se čte dál** — jeho hodnoty se
   stanou skupinami. Počet kostek, název i kód štítku `k<body>x<kostek>` z toho
   vyjdou stejné, takže záznam v historii zůstává čitelný.

### Past, na kterou se narazilo

Řádek o riziku u tří dvojic měl v sadě 18 tři kontroly, z toho jednu sahající
rovnou na `.riziko`. Zrušení jednoho prvku uvnitř řádku tak shodilo celou sadu
výjimkou, ne hláškou — proto se testy na zaniklý prvek ptají přes existenci,
ne přes `.textContent`.

### Dvě chyby, které přišly zpátky od uživatele

Obě z třetí iterace, obě opravené tamtéž:

1. **Pás rizika nesahal na spodní hranu okna.** Byl `sticky` uvnitř
   `.modalbody`, jenže sticky se nedostane pod spodní padding scrollujícího
   prvku ani pod okraj svého rodiče — a v té mezeře prosvítal obsah. Teď je to
   **patička `.modalbox`** za `.modalbody`, tedy třetí prvek pružného sloupce.
   Cena za to je, že stojí mimo obě karty nastavení a o skrývání se musí starat
   sám (`ukazRezPruh()` z `renderRezimy()` i z `naKartuNastaveni()`).
2. **Pevná šířka tlačítek se vůbec neuplatnila.** `.rezbtn{flex:0 0 86px}`
   (0-1-0) prohrálo v kaskádě s `.setrow .ghost{flex:0 0 auto}` (0-2-0), které
   stojí o pět set řádků výš. Selektor teď nese id.

**Proč to testy nechytly:** kontrola se ptala na `classList.contains("rezbtn")`,
tedy na to, co udělal kód, ne na to, co z toho vyšlo. jsdom přitom kaskádu pro
takhle jednoduché selektory zvládá, takže se dá měřit rovnou
`getComputedStyle(btn).flexBasis` — a s původním selektorem vrátí `auto`.
Poučení je obecné: u CSS, které něco vynucuje, se testuje účinek, ne třída.

Do pásu ještě přibyla dvojtečka za počtem kostek (`1: 66,7 %`); bez ní se
první dvě čísla četla jako jedno.

A jakmile ta tlačítka konečně držela jednu šířku, ukázalo se, že je moc velká:
**86 px kleslo na 56 px**, padding na 2 px a přibyl `white-space:nowrap`.
Šířka je teď těsně nad nejdelším popiskem (české *Pravidla*), takže se text
při dalším zúžení nemá kam vejít — kdyby přesto přetekl, nesmí zalomit řádek.

**Stav po iteraci:** 1 406 kontrol v devatenácti sadách, vše prošlo.
