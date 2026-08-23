# Testy

Nejsou součástí aplikace, na GitHub Pages nevadí. Sady 00–07 a 09–19 se spouštějí
v Node přes jsdom, který skutečně vykoná skript ze stránky — testuje se
chování, ne text. Sada 08 běží v `node:vm` s náhradami za `caches` a `fetch`,
protože service worker v jsdom spustit nejde. Sada 11 si podstrkuje vlastní
`navigator.wakeLock` a ruční hodiny — jinak by se na tři minuty nečinnosti
čekalo doopravdy.

Sada 10 potřebuje navíc `fake-indexeddb` — jsdom žádnou IndexedDB nemá,
takže ostatní sady běží po cestě `localStorage`. To je záměr: ta cesta zůstává
živá jako propad, když IndexedDB není k dispozici.

```
npm install
npm test                    build --kontrola + kontrola importů + všech 22 sad
node Testy/vse.mjs          jen sady, se souhrnem
node Testy/vse.mjs 18 19    jen vyjmenované
node Testy/01-limit-kol.mjs jedna sada, plný výpis
```

`index.html` i `sw.js` se hledají o složku výš než testy, na pracovním
adresáři nezáleží.

**`index.html` se needituje ručně** — je to výstup buildu ze `src/`.
`npm test` proto nejdřív ověří, že odpovídá zdrojům; jinak by se testovala
včerejší verze. Sady čtou složený `index.html`, protože testují chování.
Kontroly, které se ptají na *kód*, čtou `src/` — esbuild si totiž jména
vybírá sám a při kolizi přejmenuje `t` na `t2` (viz `docs/nalezy.md` #3).

### Nástroje vedle sad

| soubor | co dělá |
|---|---|
| `vse.mjs` | pustí všechny sady, vypíše souhrn a padlé nakonec |
| `kontrola-modulu.mjs` | jména bez původu v `src/js` = zapomenutý import |
| `volna-jmena.mjs` | analýza rozsahů nad modulem (acorn), sdílená |
| `doplnit-importy.mjs` | dopíše chybějící importy podle skutečné analýzy |
| `doplnit-exporty.mjs` | dopíše `export { … }` podle deklarací |
| `do-initu.mjs` | přesune příkazy nejvyšší úrovně do `init()` funkce |

Poslední tři vznikly při refaktoru a hodí se, kdykoli se bude kód stěhovat
mezi moduly. Ruční odhad, co který kus potřebuje, selhal hned napoprvé.

| soubor | co hlídá | kontrol |
|---|---|---|
| 00-start | kouřová zkouška: skript proběhl bez výjimky, sondy `__i18n` a `__pravidla` stojí, skóre je vykreslené, klávesnice má čipy. Dvě vteřiny, pouští se první — esbuild neznámé identifikátory nehlásí a chybějící import se jinak projeví rozsypáním osmnácti sad naráz | 8 |
| 01-limit-kol | režimy hry, limit kol, zámek po posledním kole i po dosažení cíle v bodech, hranice tlačítka Zpět, migrace starého uložení, ruční zadání při nule kostek, zámek Zapsat nad rozehraným hodem bez odložené položky | 64 |
| 02-hlavicka-okna | čtyři tlačítka v liště, okna pravidel a nastavení, zaostření, klávesnice, přepínání ikony motivu přes atribut `hidden` a jeho paměť | 28 |
| 03-historie-kos | zápis a aktualizace v historii, varování na nezapsané body, koš, obnova, trvalé smazání z obou košů včetně potvrzení, vazba na záznam po smazání z historie a po obnově z koše, zmizení klíče vyprázdněného koše, farkle jako poslední úsek popisu kola v detailu hry i v živé tabulce a jeho nepřítomnost v uložených datech | 68 |
| 04-statistiky | všech 25 statistik proti ručně spočítaným číslům, jejich pořadí a rozdělení do pěti nadepsaných kategorií (Obecné/Hry/Kola/Hody/Farkly), kola v jedné hře na body jen z dokončených her, seskupení po dnech přes půlnoc, žebříčky včetně žebříčku dnů, typ hry v podřádku i v řádku žebříčku, proklik ze žebříčku do detailu hry a návrat zpátky do něj, detail hry, mazání a návrat z koše pod stejným id | 92 |
| 05-zaloha | export včetně tvaru farklu v čitelném rozpisu, import, slučování, nahrazení, poškozené soubory, odmítnutá schránka | 44 |
| 06-odolnost | vypnuté localStorage včetně češtiny pojištěné přes `navigator`, rozbitá i neúplná data, plné úložiště, sto her, escapování popisu, tichá selhání zápisu | 64 |
| 07-navod-opravy | klávesnice, terminologie, režim oprav, koš historie, import ze schránky, karty a detekce verze | 52 |
| 08-sw | strop sítě, návrat z cache, obnova cache po pomalé odpovědi, portál a 404, jmenovaná cache, úklid jen vlastních cache | 19 |
| 09-strankovani | dávky po 50 v historii i v žebříčku her i v žebříčku dnů, popisky značky, reset při návratu, přepnutí a importu, jediný pozorovatel po návratu ze hry do žebříčku, dělící čáry po dnech včetně hranice dávky uprostřed dne | 56 |
| 10-uloziste | migrace do IndexedDB, propad bez ní, příznak `idb` bez dostupné IDB, návrat paměti při selhání zápisu, upgrade na dvě police, shoda všech pětadvaceti statistik nad souhrny a nad plnými záznamy včetně nejhranějšího režimu, shodný export z obou úložišť, pole `hodu`/`ztraceno`/`nejlepsihod`/`hoduCelkem` v souhrnu a jejich zpětný dopočet při upgradu (`IDB_VERZE` 5), nula uložená dřív, která se čte jako `null` | 95 |
| 11-displej | přepínač nezhasínání, wakeLock při startu i po odmítnutí, uvolnění po třech minutách nečinnosti, návrat po doteku a po odkrytí stránky, chybějící API | 34 |
| 12-nova-hra | umístění tlačítka, dva stupně potvrzení, okno se třemi cestami u neuložené hry, přesun na počítadlo, obě selhání zápisu, Escape a pozadí | 42 |
| 13-autoulozeni | přepínač a jeho paměť, zápis po posledním kole v obou režimech, překročený cíl, farkle jako poslední kolo, neomezená hra, pop-up a jeho křížek, aktualizace po smazaném kole, reload, obnova z koše, selhání zápisu, mlčení nad ručně smazaným záznamem | 68 |
| 14-nastaveni | rozdělení okna na tři karty Obecné, Herní režimy a Zálohy včetně návratu na první po zavření, seznam, detail režimu a editor vlastní kombinace jako tři podstránky druhé karty, přepínače nad harmonikou v pořadí jazyk a ukládání, pět oddílů rozdělených mezi první a třetí kartu a jejich názvy, výlučnost rozklikávání napříč kartami, sbalení při otevření okna, počty v hlavičkách, údaj o místě jen na hlavní úrovni karty Zálohy, celek počítaný sám při otevření okna a rozpis až po rozbalení tlačítkem Detail, jeho šest hodnot včetně oddělených košů a zbylých klíčů `farkle-*`, zabalení druhým klepnutím, chování bez `estimate()`, velikost aplikace sečtená jen z vlastních cache, stavové popisky, obnova z rozbaleného oddílu | 93 |
| 15-filtry | filtr jednoho dne i rozsahu, hranice půlnoci, prohození obrácených krajů, přepočet statistik pod filtrem, přežití přepnutí karty, prázdné stavy, záloha filtrem nedotčená, předvyplnění okna, proklik ze žebříčku dnů, přestavění seznamu při změně filtru, lišta podle karty i krátkost jejích popisků, plné znění filtru v `aria-label`, skrytí pole Do mimo režim rozsahu, nabídka typů skládaná z dat i pod filtrem data, filtr typu včetně her bez limitu a jeho vypnutí, statistiky filtr typu ignorují, čtyři směry řazení, druhotné řazení při shodě bodů, zmizení dělících čar, reset filtrů i řazení včetně popisku tlačítka | 80 |
| 16-jazyky | detekce jazyka ze systému i z uloženého kódu, propad neznámého jazyka i uloženého nesmyslu, chybějící a prázdný seznam jazyků, vypnuté localStorage, mlčení úložiště při startu, atribut `lang`, sběr češtiny z DOMu před překladem, překlad anotovaného prvku i jeho `aria-label`, rozdělení „Zpět“ na Undo v kole a Back v okně, propad klíče, který jazyk nemá, pluralizace v obou jazycích včetně pravidla propadlého jazyka, přepínač v nastavení a jeho volby skládané z `JAZYKY`, přepnutí za běhu i návrat k češtině bez reloadu, zápis volby a její přežití reloadu, registr překreslení včetně anglického stavového popisku a návratu do češtiny, nedotčená rozehraná hra, strážní kontrola struktury katalogu včetně kolizí klíčů a prázdných hodnot, pokrytí celé češtiny každým dalším jazykem se shodným druhem klíče a počtem tvarů podle jeho `plural()`, shoda každého anotovaného prvku s katalogem jeho jazyka, přežití značek uvnitř `data-i18n-html`, cesta do angličtiny a zpátky, funkční čipy po přepnutí, doplňování hodnot do textu včetně obráceného pořadí v jiném jazyce a nedodané hodnoty, čtyři plurály nahrazující původní pomocné funkce, oddělovač tisíců, desetinná značka a tři tvary data v obou jazycích včetně rozsahu dnů, strážní kontrola klíčů volaných z JS, osiřelých klíčů ručního katalogu a jeho překryvu s anotacemi, popisek kola skládaný bez anotace, záloha vyvezená v jednom jazyce a načtená v druhém oběma směry | 140 |
| 17-stitky | kódy štítků v odložených položkách i v zapsaném kole, jejich české znění znak po znaku, oddělovače hodů a položek včetně horkých kostek, farkle dopisovaný až při zobrazení a jeho nepřítomnost v datech, rozbor starého českého popisu a jeho překlad v jiném jazyce, strážní kontrola, že zmrazená tabulka rozboru pokrývá celý katalog štítků, nerozebratelný popis ponechaný syrový a escapovaný, export i import obou tvarů, rozehraná hra uložená starší verzí včetně položky bez štítku, počet hodů rekonstruovaný z obou tvarů, rozbor kola na jednotlivé hody (body i počet kostek) pro Nejlepší hod a Průměrný hod včetně dvou cyklů horkých kostek za sebou, farkle jako prohraný hod bez odkladu, kolo s ruční položkou vynechané jen z rozpisu bodů (ne z počtu hodů) a filtr žebříčku podle počtu kostek | 47 |
| 18-kombinace | kombinace navíc uvnitř výchozího režimu KCD: pět přednastavených skrytých ve výchozím stavu včetně dvou dvojic, čip *vlastní* poslední v řadě za všech okolností a zalomení devíti čipů, uložení a načtení `farkle-kombinace-v1` včetně poškozených dat, strop osmi vlastních kombinací a šesti vzorů v jedné, kódy `c2p`–`c42` i `k…x…` v položce i v zapsaném kole, jejich čtení bez zapnuté kombinace, štítky v obou jazycích, zákaz čipu podle zbývajících kostek, změna sazby nepřepisující historii, sazba pamatovaná přes vypnutí a zapnutí, editor kombinace jako podstránka — jméno, body, stav, víc vzorů a jejich dvoukrokové mazání, volba počtu kostek u vzorů různé velikosti a přímé odložení, když je z čeho vybírat jediné, zápis vzoru písmeny a čísly včetně zákazu, aby písmeno sáhlo na hodnotu psanou číslem, migrace vzoru uloženého se starým příznakem `any` i bez jména, riziko na tlačítku Farkle včetně horkých kostek a zámku, líný přepočet výčtem, export i import kola s kombinací, strážní odvození všech tří konstantních tabulek rizika výčtem přes `kindPoints()` a `STRAIGHTS` | 177 |
| 19-rezimy | tři přednastavené herní režimy a výchozí KCD, přepnutí a jeho přežití reloadu, neznámé id spadlé na výchozí, migrace `farkle-kombinace-v1` do odchylky `kcd2` se zachovaným starým klíčem, ukládání jen odchylek presetu a jejich zmizení po obnovení výchozích, strážní odvození celé tabulky pro všechna tři pravidla nad prahem, pětikostkový režim včetně horkých kostek, skrytého čipu 6× a oříznutí hodu uloženého na šest, klávesnice řízená režimem včetně tří znění nadpisu řady a sazby postupky, okno pravidel podle režimu i pro jiný než zvolený, zámek přepnutí nad rozehranou hrou, vlastní režim od přidání po smazání včetně zákazu smazat zvolený a stropu dvaceti, režim v záznamu, souhrnu i záloze oběma směry, čitelnost hry po smazání jejího režimu, statistika nejhranějšího režimu a její žebříček, strážní odvození tabulek rizika výčtem a líný přepočet u přepsaných pravidel, samostatné kostky a stejná čísla s prahem, rozšířený rozpad na dvojice až šestice a sbalení zpátky, pravidlo nad nejvyšší zapnutou skupinou, čtení starých polí `dvoj` a `troj`, pravidlo tří čipů samostatných hodnot proti mřížce 1×, čip 2× podle dvojic, kódy `d2`–`d6` a `n2…` shodné oběma cestami zadání, duplikace režimu včetně nových id vlastních kombinací, návrat z pravidel do nastavení křížkem, riziko na tlačítku Farkle, pás rizika v patičce okna včetně pětikostkového režimu, stavu „počítá se” a skrytí nad seznamem i na druhé kartě, jedna šířka tlačítek v seznamu měřená přes `getComputedStyle`, nápověda u pravidla nad skupinou | 209 |
| 20-zaloha-plna | export kompletní zálohy nese čitelně i strojově hry i všechny herní režimy pod vlastním markerem `#PLNAZALOHA:`, import přidá obojí a nezdvojí při opakování, nahrazení přepíše historii i seznam vlastních režimů na dvojí klepnutí, zamčení nahrazení uprostřed rozehrané hry, samostatná záloha herních režimů pod markerem `#REZIMYZALOHA:` beze změny tvaru `farkle-rezimy-v1`, její přidání nezasáhne historii, její nahrazení přepíše celý seznam | 27 |
| 21-sdileni-rezimu | výběr ke sdílení přímo v hlavním seznamu režimů — řádek se v tomhle stavu zúží na jedno tlačítko místo Pravidla/Upravit/Zvolit a po dokončení nebo zrušení se vrátí zpátky (a řádek Přidat vlastní režim v tu chvíli zmizí celý, ne jen zamčené tlačítko), sdílení jednoho i víc vybraných režimů (i přednastaveného, s materializovaným jménem) pod vlastním markerem `#SDILENIREZIMU:`, jméno staženého souboru nese datum i čas na minuty, prázdný výběr nic nevygeneruje, import odlišného režimu beze změny jména, shoda jména u jinak odlišných pravidel vede k přejmenování s příponou „(IMPORT - datum)” bez uříznuté závorky, funkční shoda s vlastním i s přednastaveným režimem dávku odmítne bez ohledu na jméno, dávka se smíšenými výsledky přijme jen to, co má, samé duplicity nepřidají nic, otevření nastavení vynuluje výběr, volbu importu i dokované vkládací pole, karta Herní režimy ukáže patičku Sdílet/Importovat hned po přepnutí (ne až po návštěvě detailu), volba importu (Vybrat soubor/Vložit text) sedí v patičce jako Uložit/Kopírovat u sdílení a vkládací pole se dokuje nad ní přes celou šířku okna, výběr ke sdílení a volba importu se navzájem vylučují, úspěšné akce (stažení, kopírování, import) už negenerují žádnou hlášku, chybové a neutrální hlášky (prázdný výběr, selhání, nic k importu) jdou přes zavíratelný popup `#toast`, ne přes řádek vedle tlačítka | 47 |

Po zásahu do `src/` nebo `sw.js` spusť `npm test` — všech dvaadvacet sad.
Dohromady je to 1 563 kontrol.

**Past:** jsdom nerozlišuje původ pravidel v kaskádě — atribut `hidden` u něj
vypne i prvek, kterému autorský list nastavuje `display:flex`, zatímco skutečný
prohlížeč ho nechá vidět. Testovat se dá jen přítomnost pravidla
`[hidden]{display:none!important}` v listu, ne výsledný styl.

**Past:** návod se v jsdom otevře sám (není tam service worker, použije se
značka `bez-verze`) a otevřené okno blokuje šipky pro přepínání stránek.
Testy, které se tím nezabývají, si musí v `beforeParse` nasadit
`localStorage.setItem("farkle-navod-v1", "bez-verze")`.

**Past:** jsdom hlásí `navigator.language` jako `en-US`, takže by se aplikace
sama přepnula do angličtiny. Každá sada, která načítá `index.html`, si proto
v `beforeParse` nasazuje `localStorage.setItem("farkle-jazyk-v1", "cs")`.
Výjimkou je sada 16 — ta jazyk podstrkuje přes `navigator` a testuje právě to,
co ostatní vypínají.

**Past:** uložený kód jazyka je k ničemu tam, kde se localStorage schválně
vypíná — hlášky by pak vyšly anglicky a české porovnání by spadlo. Sada 06
proto češtinu pojišťuje ještě přes `navigator.languages`. Každá nová sada,
která sahá na dostupnost úložiště, musí udělat totéž.

**Past:** sběr češtiny běží na začátku skriptu, tedy dřív, než se z DOMu
odstraní řádky nastavení, které prohlížeč neumí. V jsdomu chybí
`requestFullscreen` i `wakeLock`, takže klíče `nast.fs.*` a `nast.svit.*`
v `I18N.cs` jsou, ale jejich prvky ve stránce už ne. Strážní test proto
kontroluje směr HTML → katalog, ne obráceně.

**Past:** kontrola klíčů volaných z JS čte `index.html` jako text a hledá
`t("…")` a `tn("…")`. Ručně psaný katalog `RUCNI` si předtím ze zdroje
vyřízne — jinak by definice klíče platila jako jeho použití a kontrola na
osiřelé klíče by neodhalila nic. Klíč skládaný za běhu (`"zal.info." + zdroj`)
se pozná podle tečky na konci zachyceného řetězce.

**Past:** `I18N.cs.sep` je úzká nezlomitelná mezera, kterou `trim()` vymaže.
Kontrola „žádný sebraný text není prázdný" proto prochází klíče anotované
v HTML, ne celý katalog — ten drží i položky, které textem nejsou.

**Past:** rozbor starého popisu kola stojí na zmrazené tabulce `STARE`,
vykreslení na katalogu `stitek.*`. Kdyby se obě strany rozešly, starý záznam by
zůstal v původním jazyce a nic by nespadlo. Hlídá to oddíl D2 sady 17, a to
oklikou: štítkům se v `I18N.en` podstrčí značky a kontroluje se, že v přeloženém
popisu nezbylo české slovo.

**Past:** čitelná část zálohy nahrazuje úzkou nezlomitelnou mezeru obyčejnou —
v textovém souboru by se leckde ukázala jako podivný znak. Kontrola nad
exportovaným textem proto porovnává obyčejnou mezeru, kdežto kontrola nad
obrazovkou a nad datovým řádkem znak U+202F.

**Past:** statický přepínač s `data-i18n` dostane při přepnutí jazyka výchozí
text z katalogu, tedy „Vypnuto“ i tehdy, když je zapnutý. Vrátit ho do
skutečného stavu musí funkce registrovaná přes `naJazyk()`. Platí pro každý
takový přepínač; hlídá to kontrola stavu po přepnutí jazyka v sadě 18.

**Past:** kontrola volaných klíčů v sadě 16 čte `index.html` jako text, takže
klíč skládaný za běhu musí končit tečkou — `t("komb.pocet." + m)`, ne
`t("komb.pocet" + m)`. Jinak zachytí `komb.pocet` jako literál a ohlásí, že ho
katalog nemá.

**Past:** kombinace navíc patří od zavedení herních režimů jednomu režimu, ne
aplikaci. `#komblist` a `#kombvlastni` se proto plní až v detailu jednoho
režimu — sada 18 se tam dostane přes `naRezim("kcd2")`, ne pouhým otevřením
nastavení. U presetu se navíc ukládají jen odchylky, takže vypnutí poslední
kombinace jeho záznam z úložiště zase odstraní: `null` znamená „do úložiště se
ještě nesáhlo“, prázdný objekt „režim je na výchozích hodnotách“.

**Past:** `fmt()` odděluje tisíce úzkou nezlomitelnou mezerou (U+202F). Kontrola
nad sazbou čipu i nad tabulkou pravidel proto porovnává `1\u202F500`, ne
`1 500` s obyčejnou mezerou.

**Past:** prvek, do kterého zapisuje i vykreslení, nesmí patřit katalogu celý.
Čipy klávesnice měly `data-i18n-html` na celém tlačítku včetně `<span class="v">`
se sazbou; jakmile tu sazbu začal dopisovat `renderKombi()`, kontrola shody
anotovaných prvků s katalogem v sadě 16 to ohlásila. Popisek proto sedí ve
vlastním `<span data-i18n>` a hodnota vedle něj.

**Past:** mřížka počtů začíná jedničkou, ale vidět jsou jen počty, kterými se
v režimu dá něco odložit. Kontrola „první popisek je 3×“ proto musí filtrovat
viditelné čipy, ne sáhnout na `firstChild`.

**Past:** vlastní vzor kombinace má dvě části — `v` jsou konkrétní hodnoty,
`t` velikosti skupin „libovolná, ale stejná“ (čipy A–F). Seedovaný vzor
z dřívější verze veze místo toho příznak `any` na celý vzor; čte se dál a
sady 18 i 19 na něm hlídají, že vyjde týž počet kostek, týž název i týž kód
štítku.

**Past:** pás rizika se u přepsané tabulky dopočítává líně (`setTimeout`),
takže hned po zásahu ukazuje „počítá se…“. Kontrola musí o tik počkat, stejně
jako u líného přepočtu rizika v sadě 18.

**Past:** kontrola na přítomnost třídy neříká nic o tom, jestli se pravidlo
uplatnilo. `.rezbtn{flex:0 0 86px}` prohrávalo v kaskádě s `.setrow .ghost`
a test to nepoznal, protože se ptal jen na `classList`. jsdom kaskádu pro
takhle jednoduché selektory zvládá, takže se dá měřit výsledek:
`getComputedStyle(btn).flexBasis` proti dnešní šířce.

**Past:** sada 17 čte tvar uložených dat, ne jen text na obrazovce. Kolo
odehrané v aplikaci nese `c`, seedovaný starý záznam `d` — kontroly proto
sahají do `localStorage` přímo. Stejné místo drží i sada 01 (poslední kolo
po farklu uprostřed hodu).

**Past:** nečekat pevný počet milisekund na asynchronní věc. Sady 05, 16 a 18
čekaly na `FileReader` 60 ms a padaly zhruba v polovině běhů — v jednom
procesu běží víc jsdomů naráz a líný výčet rizika ve vedlejší instanci umí
zablokovat smyčku na desítky ms. Čeká se proto na výsledek: obě místa, kam
dorazí (`#impbox`, `#zalmsg`), se před odesláním schovají a pak se čeká na
jejich odkrytí. Bez toho schování by druhý import v téže aplikaci našel panel
odemčený po tom prvním, skončil hned a četl text, který ještě nikdo nepřepsal.
Viz `docs/nalezy.md` #6.
