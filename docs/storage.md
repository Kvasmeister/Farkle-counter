# Úložiště — detaily

Přesunuto z CLAUDE.md, ať se nenačítá při každé konverzaci. V hlavním
souboru zůstává jen stručné shrnutí a tabulka klíčů; tady je celý zbytek
(migrace, upgrade databáze, měření kapacity, odolnost načtení) beze změny
obsahu, jen s vypuštěnými úryvky kódu, které duplikují `index.html` (`gFarkle`,
`hodyVKole` — jméno funkce zůstává, tělo ne).

Všechno lokálně, žádný server.

| klíč / police | kde | obsah |
|---|---|---|
| `farkle-solo-v3` | localStorage | rozehraná hra |
| police `souhrny` v databázi `kostky` | IndexedDB | jedna položka na hru bez popisů kol |
| police `detaily` tamtéž | IndexedDB | `turns` s popisy kol, čte se až na vyžádání |
| `farkle-hist-v1` | localStorage | dohrané hry, dokud neproběhne migrace |
| `farkle-hist-v1-zaloha` | localStorage | přejmenovaný původní klíč po migraci |
| `farkle-uloziste-v1` | localStorage | `"idb"`, jakmile migrace proběhla |
| `farkle-kos-v1` | localStorage | koš rozehraných her, max 5 |
| `farkle-koshist-v1` | localStorage | hry smazané z historie, max 10 |
| `farkle-navod-v1` | localStorage | verze, při které se naposledy ukázal návod |
| `farkle-autoulozeni-v1` | localStorage | automatické ukládání, výchozí vypnuto |
| `farkle-theme` | localStorage | světlý / tmavý motiv |

**Do IndexedDB se stěhuje jen historie.** Rozehraná hra se zapisuje po každé
akci a synchronní zápis je tam výhoda. Oba koše jsou shora omezené (5 a 10
záznamů, dohromady pod 30 kB), nerostou a čtou se synchronně z nastavení —
přesun by přidal migraci a transakce bez užitku.

## Dvě police a předpočítané souhrny

Historie leží ve dvou policích, protože seznam a statistiky potřebují jen zlomek
každého záznamu:

| police | obsah |
|---|---|
| `souhrny` | `id, savedAt, mode, goal, roundGoal, banked` a předpočítané `kol, farklu, nejlepsi, nejhorsi, serie, kolKCili, hodu, ztraceno` |
| `detaily` | `id` a `turns` s popisy kol |

Souhrny se natáhnou **celé při startu** (deset tisíc jich je v paměti kolem
2 MB), detail se dotáhne až při rozkliknutí hry. Souhrn staví `souhrnZ(rec)`
a používá se na třech místech: při zápisu hry, při migraci a při importu.

**Funkce nad jednou hrou berou předpočítané číslo, a když ho nemají, spočítají
si ho z `turns`** — to je vzorec, kterým se řídí `gFarkle(g)` i všechny
podobné `g*` funkce: vrátí `g.farklu`, pokud je to číslo, jinak projdou
`g.turns` a spočítají to samy. Díky tomu zůstávají `STATY`, `statHodnota()`,
`zebricek()` i `renderHistList()` beze změny a počítají stejně nad souhrny,
nad plnými záznamy v propadu na `localStorage` i nad importovanými daty.
`gNejlepsiKolo()`, `gNejhorsiKolo()`, `gKolKCili()`, `gNejvicHodu()` a
`gZtraceno()` se **nesmí** ptát na pravdivost — `null` je u nich platná
hodnota (hra bez jediného bodovaného kola, hra bez farklu, hra bez jediného
kola), takže se testuje `!== undefined`.

`popisHry()`, `statsHTML()` i `tallyInto()` proto taky nesahají na `turns`
přímo, ale jdou přes `gKol()` a spol.

**Počet hodů se rekonstruuje z popisu kola.** `turns[i]` nese jen
`{p, bust}` a k tomu kódy v `c` (starý záznam text v `d`), počet hodů v něm
uložený není. Obojí spojuje hody jedním oddělovačem — `"|"` v kódech,
`" · "` v textu — a **prázdné hody vyhazuje**, takže `hodyVKole(tah)` počítá
úseky (rozdělením `c`, nebo `d` u starého záznamu) a u farklu přičítá
jedničku k počtu úseků; bez bustu vrátí aspoň jeden hod i u prázdného popisu.

Ta jednička dopočítává hod, který skončil bez bodů — ten v popisu z definice
není. Sedí na obě cesty, kterými farkle vzniká: na *Házet dál* a pak *Farkle*
(rozehraný prázdný hod), i na *Farkle* rovnou po odloženém hodu (uživatel hodil,
ale na *Házet dál* neklepl, protože je to jen informace o počtu kostek). Sedí
i na farkle prvním hodem, kde je popis prázdný a vyjde jeden hod. Pojistka
`Math.max(u, 1)` je pro cizí zálohu s prázdným popisem u zapsaného kola;
z aplikace takové kolo vzniknout nemůže.

Kódy položek (`j`, `n35`, `s15`, `v`) svislítko neobsahují a položky uvnitř
hodu se spojují čárkou, takže se dělení nerozbije ani na horkých kostkách.
U starých záznamů platí totéž o tečce a `" + "`.

**Farkle se do dat neukládá, jen dokresluje.** Buňku popisu skládá pro obě
tabulky jedna `bunkaPopisu()` jako popis kola + `" · farkle"`, u prázdného
popisu jen `farkle`. Uložená data zůstávají beze změny, takže `hodyVKole()`,
předpočítané `hodu` ani žádná statistika se toho netýkají a slovo se objeví
i u her zapsaných dřív. Kdyby se někdy mělo začít ukládat, musí `hodyVKole()`
poznat, že poslední úsek už ten prohraný hod nese, a jedničku nepřičítat.
Čitelný rozpis v záloze jede stejně: `3. 0  (jednička · pětka · farkle)`, tedy
nula ve sloupci bodů a slovo na konci závorky. Datový řádek `#DATA:` se tím
nemění, formát zálohy zůstává zpětně načítatelný.

**Detail hry.** `otevriHru()` vykreslí hlavičku a přejde na podstránku hned;
tabulka kol se doplní po `nactiDetail()`. Do koše se ukládá **celý** záznam,
jinak by se z něj vrátila hra bez kol — proto je *Smazat z historie* zamčené,
dokud detail nedorazí. Když má záznam `turns` už v ruce (propad na
`localStorage`), proběhne všechno naráz.

**Zápis.** `histWrite(list, hotovo, zaznamy)` dostává v `list` souhrny
a v `zaznamy` celé hry, které do historie přibývají. Co z historie mizí, se
pozná porovnáním `id` a detail se smaže s tím. Police souhrnů se přepisuje
celá — je malá; detailů se sahá jen na ty, které se opravdu mění, protože
přepisovat je všechny by bylo to nejdražší, co aplikace dělá. **Obě police
v jedné transakci**, jinak by při selhání uprostřed vznikla hra bez kol.

`proHistorii(rec)` schová před volajícími, jestli se ukládá souhrn nebo celý
záznam — ti pořád pracují s celými hrami.

**Upgrade** běží uvnitř `versionchange` transakce v `onupgradeneeded`. Když
cokoli selže, transakce se zruší celá a databáze zůstane na předchozí verzi —
nevznikne stav napůl. `onupgradeneeded` je rozcestník podle toho, co v databázi
leží:

- **je tam stará police `hry`** → rozdělí se na `souhrny` a `detaily` a po
  úspěchu se maže. Souhrny při tom vznikají přes `souhrnZ()` nad plnými
  záznamy, takže nesou všechna předpočítaná pole; dopočítávat není co.
- **police `hry` tam není** → `dopoctiHody(tx)` doplní pole, která přibyla
  později. Kurzorem přes `detaily` se postaví **celá** mapa `id → čísla`
  a teprve pak se druhým kurzorem aktualizují souhrny přes `c.update()`. Dva
  otevřené kurzory nad dvěma policemi v téže transakci se nemíchají, proto to
  pořadí. Na čerstvé instalaci jsou obě police prázdné a dopočet nestojí nic.

Když do souhrnu přibude další předpočítané pole, zvýší se `IDB_VERZE` a rozšíří
se `dopoctiHody()`. Cesta `localStorage` se nemění: tam drží `HIST` celé
záznamy a `g*` funkce si čísla spočítají samy. Import dostane nová pole
zadarmo, protože jde taky přes `souhrnZ()`.

## Historie: paměť napřed, úložiště na pozadí

IndexedDB je asynchronní, celý řetěz vykreslování byl synchronní. Místo jeho
přepisu se historie drží v paměti:

- `HIST` je za běhu jediná pravda, naplní se **jednou při startu**,
- `histAll()` vrací `HIST.slice()` a **zůstává synchronní** — kopie proto,
  že `renderP2()` výsledek třídí na místě,
- `histWrite(list, hotovo, zaznamy)` mění paměť **optimisticky** a zapisuje
  na pozadí; když zápis selže, paměť se vrátí sama a volající dostane `false`.

V režimu `idb` je v `HIST` pole souhrnů, v režimu `ls` celé záznamy. Nikomu
kromě úložiště na tom nezáleží, protože všechno ostatní jde přes `g*` funkce.

V režimu `ls` se `hotovo()` volá ještě synchronně, takže se chování proti
původní verzi nemění. To je záměr, ne nedopatření — jsdom IndexedDB nemá,
takže sady 01–09 běží přesně po té staré cestě.

## Detekce, propad a migrace

```
otevři IndexedDB (strop 3 s, kvůli Firefoxu v soukromém okně)
 ├─ ok  → čti z IDB
 └─ ne  → localStorage, přesně jako dřív
```

Migrace proběhne při prvním úspěšném otevření. Pořadí je závazné:

1. přečti `farkle-hist-v1`,
2. zapiš do IndexedDB a **počkej na potvrzení**,
3. nastav `farkle-uloziste-v1 = "idb"`; když se to nepovede, **skonči a zůstaň
   na `localStorage`** — jinak by se příště nepoznalo, kde data jsou,
4. teprve pak přejmenuj klíč na `farkle-hist-v1-zaloha` a původní odstraň.
   Data zůstávají v `localStorage` aspoň jednu verzi jako pojistka.

**Když příznak říká `idb`, ale IndexedDB se otevřít nedá, aplikace
nepředstírá.** Neukáže starou historii z `localStorage` jako by byla úplná —
uživatel by nepoznal, že mu chybí všechno od migrace. Místo toho ukáže pruh
`#nohist` na stránce Statistiky, do historie nezapisuje a hlášky o selhání
mluví o nedostupné historii, ne o došlém místě (`textSelhani()`). Rozehraná
hra jede dál z `localStorage`, počítat se dá normálně.

**Nová hra se ptá až třikrát.** První klepnutí přepne text na *Opravdu nová?*,
druhé pustí `novaHra()` — ale jen tehdy, když je hra v historii a od té doby se
nehrálo. Jinak se otevře `#newmodal` se třemi cestami: *Uložit a začít novou*
(`zapisHru()`, a `wipe()` teprve v `ok` větvi callbacku), *Začít novou bez
uložení* a *Zpět*. Escape i klepnutí na pozadí se chovají jako *Zpět*.
Po každé úspěšné cestě se skáče na Počítadlo.

`zapisHru()` je vyčleněné jádro `archive()` bez ptaní a bez hlášení, aby ho
mohlo volat i okno. Potvrzení „na stole je X a propadne" zůstává jen
v `archive()`; okno na to místo toho upozorní v textu.

**Kde leží záznam, se odvozuje.** `S.archivedId` říká, ke kterému záznamu je
rozehraná hra přivázaná, a `kdeZaznam()` k tomu dopoví, jestli ten záznam leží
`"historie"`, `"kos"` (smazané z historie), nebo `"nikde"`. Vazba se **nikdy
nepřetrhává** — ani při smazání z historie, ani při importu *Nahradit vše*.

Dřív se `S.archivedId` při smazání z historie nulovalo a hra tvrdila, že
v historii nikdy nebyla. *Nová hra* ji pak odložila do koše rozehraných, takže
jedna hra ležela ve dvou koších naráz, obnovila se dvakrát a dala se zapsat
podruhé. Odvozený stav to zavírá: dokud záznam někde je, hra je zálohovaná
a druhá kopie nevzniká.

Z toho plynou čtyři stavy tlačítka v Zápisu kol:

| `kdeZaznam()` | `S.dirty` | Tlačítko |
|---|---|---|
| `historie` | ne | *Uloženo v historii*, neklikatelné |
| `historie` | ano | *Aktualizovat v historii* |
| `kos` | jedno | *Obnovit do historie* |
| `nikde` | — | *Zapsat do historie* |

*Obnovit do historie* zapisuje **pod stejným `id`** a rovnou aktuální stav hry,
takže pokrývá i případ, kdy se mezitím smazalo kolo. Jsou to dva zápisy, proto
dvoufázově: nejdřív se záznam vyndá z koše, pak se zapíše do historie, a když
druhý zápis padne, koš se vrátí ze snímku. Ztratit se nemůže nic — po celou
dobu je hra živá v Zápisu kol. Opačné pořadí by při selhání nechalo tutéž hru
v historii i v koši.

Odvozování stojí jeden průchod `HIST`; do koše se sahá jen tehdy, když záznam
v historii není, takže běžný průběh hry nestojí nic navíc.

**Koš rozehraných si vazbu pamatuje taky.** `kosPush()` přidává do záznamu pole
`puvodni` s hodnotou `S.archivedId` a `nactiZaznam()` ho při obnově vrací zpátky
(s `dirty = true`, protože do koše se ukládá jen hra s neuloženými změnami).
Bez toho by šlo díru otevřít oklikou: uložit, smazat z historie, smazat kolo,
*Nová hra* bez uložení — obnovená hra by o svém záznamu nevěděla a zapsala by se
jako nová. Staré záznamy pole nemají a `nactiZaznam()` to snese.

**Automat záznam z koše nevytahuje.** `zkusAutoUlozit()` při `kdeZaznam() ===
"kos"` jen zvedne `S.autoUlozeno` a mlčí: co bylo smazané ručně, se ručně i
vrací. Jinak by automat rušil rozhodnutí, které uživatel udělal.

**Koš má dvě poloviny s různým chováním.** Hra zahozená tlačítkem *Nová hra*
se obnovuje jako rozehraná (`restore()`), hra smazaná z historie se vrací zpátky
mezi dohrané (`vratDoHistorie()`) — a při návratu dostane nové `id`, kdyby mezitím
stejné `id` přibylo importem. Obě poloviny se vykreslují do nastavení jako dva
rozklikávací oddíly, *Smazané rozehrané hry* a *Smazané hry z historie*.

Řádky obou oddílů skládá společná `kosRadek()`. Navenek se obě poloviny chovají
stejně: tlačítko se v obou jmenuje **Obnovit** (uvnitř to pořád jsou dvě různé
funkce) a vedle něj je **Trvale smazat**, které záznam zahodí nadobro. Ptá se
stejným idiomem jako mazání kola — řádek se překlopí na otázku se dvěma
tlačítky, stav drží `ptamSeKos` / `ptamSeKosHist` (id, u kterého se ptáme).
Rozdělaná otázka se ruší při otevření okna nastavení. Když zápis po potvrzení
selže, hlásí to `hlaskaNaTlacitku()` a řádek se **nepřekresluje** — jinak by
hláška zmizela dřív, než ji někdo přečte.

Dvě tlačítka se na úzký displej vedle popisu hry nevejdou, proto `.kosrow`
zalamuje a `.kosrow .t` má `flex-basis: 150px`. Bez toho by se popis díky
`min-width: 0` smrskl na nic a k zalomení by nikdy nedošlo.

Zápis do `localStorage` chodí přes `writeList()`, které chytá výjimku při plném
úložišti a vrací `false`; volající pak nesmí považovat operaci za hotovou.
U historie je výsledek v callbacku (`histWrite(list, hotovo)`), jinak platí totéž.
**Každý zápis má výsledek a volající ho řeší.** Reakce je pokaždé jiná, proto
to nejde schovat do jedné funkce:

| kde | co se stane při selhání |
|---|---|
| `novaHra()` (Nová hra) | `wipe()` se **neprovede**, hra zůstává rozehraná |
| `restore()` (obnova z koše) | obnova se neprovede, rozehraná hra se nepřepíše |
| smazání z historie | dva zápisy: padne první → nemaže se; padne druhý → koš se vrátí do stavu před zápisem, takže nevznikne duplikát |
| `vratDoHistorie()` | hra zůstane v koši |
| *Obnovit do historie* v Zápisu kol | dva zápisy: padne první → nevrací se nic; padne druhý → koš se vrátí ze snímku, hra zůstává živá v Zápisu kol |
| `save()` | pruh `#nosave` v panelu kola |

Hlášky u tlačítek chodí přes `hlaskaNaTlacitku(btn, text, puvodni)` — text se
na čtyři vteřiny změní a pak se vrátí, stejný idiom jako u *Zapsat do historie*.

`save()` vrací `true`/`false` a drží příznak `neukladame`. Pruh nastavuje
`ukazNeukladame()` **přímo na prvku, ne přes `render()`** — `render()` totiž
volá `save()`, takže by vznikla smyčka. Pruh nejde zavřít a zmizí sám, jakmile
se zápis povede; varování o hrozící ztrátě dat se nemá dát odklepnout.

**Kapacita.** Po přesunu do IndexedDB je strop v řádu gigabajtů místo
megabajtů; `navigator.storage.estimate()` ho ukazuje v nastavení pod zálohou.
Počítá se ale **celý původ**, tedy na `github.io` i ostatní aplikace ze stejné
adresy — proto ta hláška mluví o datech aplikací, ne o historii.
`navigator.storage.persist()` se volá po prvním doteku; kvótu nezvětší, jen
vyřadí data z automatického úklidu, kterým prohlížeče uvolňují místo (v Safari
platí jen pro aplikaci přidanou na plochu).

Pro `localStorage`, kam pořád patří rozehraná hra a oba koše, platí dál:
záznam běžné hry zabere ~860 znaků, dlouhé ~1 900, kvóta je ~5 MB na origin
a počítá se v UTF-16, takže reálně jde o 2,5–5 milionu znaků, tedy zhruba
**3 000 až 6 000 her**. Vyčerpat ji hraním
prakticky nejde; zápis selže spíš z jiných důvodů — anonymní okno Safari
(kvóta nula), sdílený origin `kvasmeister.github.io` mezi všemi repozitáři,
nebo mazání dat nenainstalovaných stránek na iOS po sedmi dnech.

## Načtení stavu je odolné proti neúplným datům

`load()` bere uložený objekt jen tehdy, když má `banked` jako číslo a neprázdné
pole `rolls`. Pak **vždy** proběhne `ozdrav()`, které dorovná typy: `turns`
a `items` na pole, `goal` na kladné číslo, `thrown` na celé číslo 1–6, `items[].d`
na nezáporné číslo. Bez toho shodila chybějící `turns` nebo `items` celý
`render()` a aplikace zůstala bez ovládání — uživatel se nedostal ani do
nastavení, aby si data vyexportoval.

Nečitelný obsah se před přepsáním odloží pod `farkle-solo-v3-vadny`, ať se
z prohlížeče dá vytáhnout ručně.

**Pozor na kolizi názvů:** pomocná funkce se jmenuje `naCislo()`, protože
`cislo()` už v souboru existuje jako formátovač statistik a hoisting ji přebíjí.

## Escapování

Popis kola i štítek položky můžou pocházet z cizí zálohy nebo z poškozeného
úložiště a jdou do `innerHTML`. Kód, kterému se nerozumí, se **záměrně ukáže
tak, jak je** — proto musí i po zavedení kódů všude projít přes `esc()`:
`bunkaPopisu()`, `renderFix()` a oba koše. Import ořezává `c` i `d` na 300
znaků. Bez toho záloha s `"d": "<img src=x onerror=…>"`
spustila skript ve stejném původu, tedy s přístupem k celé historii.

## Zabrané místo — rozpis v nastavení

Údaj o zabraném místě je jen jednou, úplně dole na hlavní úrovni okna
nastavení, a nad ním řádek `#mistorow` s tlačítkem. `ukazMisto()` přesto plní
**všechny** prvky s třídou `misto`, ne jedno `id` — kdyby se údaj někdy objevil
i jinde, není co dopisovat. Skládá se z uzlů, ne z `innerHTML`, takže tam
žádná escapovací past není.

Šest údajů: **Historie** (počet her a velikost), **Rozehraná hra**, **Koše**,
**Nastavení a starší data**, **Aplikace** a **Celkem z této adresy**. Poslední
je `navigator.storage.estimate()`, které počítá celý původ — na `github.io`
tedy i ostatní aplikace ze stejné adresy; proto „z této adresy", ne „historie".
Když `estimate()` chybí (starší Safari), zbylých pět údajů se ukáže stejně.

**Součet řádků se s celkem nikdy nepotká a není to chyba výpočtu.** Nad rámec
cizích aplikací ve stejném původu jde o režii, na kterou se z JavaScriptu
nedosáhne: IndexedDB si k datům přidává indexy a vlastní strukturu, u historie
se navíc měří délka JSONu, ne uložené bajty, a „Aplikace" sčítá jen těla
odpovědí, ne hlavičky. Rozdíl se má vysvětlit, ne dopočítat. Řádek „ostatní
aplikace z této adresy" jako `usage` minus naše položky se **zvažoval a zamítl**
— po přesunu na vlastní doménu by ukazoval skoro nulu.

Řádky *Rozehraná hra* a *Koše* stály dřív pohromadě a vypadalo to, že místo
zabírá koš — přitom číslo bylo skoro celé rozehraná hra, která prázdná nikdy
není. Vyprázdněný koš se z `localStorage` **mazá celý** (`kosZapis()`), ať tam
nezůstává dvouznakové `"[]"`; řádek k tomu hlásí rovnou **prázdné**. Historie
touhle cestou nechodí — na jejím klíči stojí migrace do IndexedDB a zmizet
nesmí. Kdo čte koš přímo z úložiště (testy), musí počítat s `null`.

*Nastavení a starší data* jede přes `lsZbytek(krome)`, které **prochází klíče**
`localStorage` s prefixem `farkle-` místo pevného seznamu — jinak rozpis mlčky
přehlédne klíč, který někdo časem přidá. Nejtučnější položkou tam bývá
`farkle-hist-v1-zaloha`, přejmenovaná původní historie po migraci do IndexedDB;
dřív ji rozpis neviděl vůbec. V režimu `ls` se do výjimek přidává i `HKEY`, aby
se historie nezapočítala dvakrát.

`localStorage` se měří přesně: součet délek klíčů a hodnot krát dva bajty, což
je i to, co si prohlížeč započítává do kvóty. Velikost historie v režimu `idb`
přesně zjistit nejde — IndexedDB velikost police nehlásí a přečíst všechny
detaily stojí tolik co export. Souhrny se proto sečtou celé (leží v paměti)
a detaily se **vzorkují prvními padesáti záznamy**; průměrná délka JSONu se
vynásobí počtem her a text údaj označí jako přibližný. V režimu `ls` se historie
změří přesně a vzorkování se přeskočí.

**Počítá se až po klepnutí**, ne při otevření nastavení: u velké historie by se
vzorek procházel pokaždé zbytečně. Během počítání tlačítko hlásí *Počítám…*
a je zamčené, po dopočtu říká *Přepočítat*. Otevření nastavení volá
`resetMisto()`, které výpis schová a tlačítko vrátí na *Spočítat*.
