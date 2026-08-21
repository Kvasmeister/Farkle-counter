# Nálezy z refaktoru

Podivnosti nalezené při stěhování kódu do modulů. **Nic se tady neopravuje
během refaktoru** — aby „testy zelené“ znamenalo „přesunul jsem správně“, ne
„přesunul jsem a taky změnil tři věci“. Po dokončení se projde a rozhodne se,
co za opravu stojí.

---

## #1 · řez 4 · Testy/16-jazyky.mjs, oddíl N2 · kontrola osiřelých klíčů je skoro slepá

`mimoKatalog` vyřízne jen ručně psaný katalog `RUCNI`, ale **anglický katalog
`EN` v něm zůstává**. Protože je angličtina úplná, každý klíč z `RUCNI` se
v `EN` najde jako řetězec — a `pouzity()` ho tím prohlásí za použitý. Kontrola
proto nemůže padnout skoro nikdy.

Změřeno: z 280 klíčů v `RUCNI` hlásí dnešní podoba **0 osiřelých**. Když se
z korpusu vyřízne i `EN`, vyjde **1**: `rezim.nulaneboduje`.

Ten klíč je opravdu mrtvý — v `src/js/` se vyskytuje jen jako definice
v obou katalozích, nikdo ho nevolá:

```
src/js/jazyky/cs.js:  "rezim.nulaneboduje": "0 = neboduje",
src/js/jazyky/en.js:  "rezim.nulaneboduje": "0 = doesn't score",
```

Nejspíš pozůstatek po přejmenování — přesně to, co měla kontrola chytat.
Díru zakrylo dokončení angličtiny; dokud byl `EN` prázdný, fungovala.
Podobný vzorec jako past popsaná v `docs/i18n.md` u sady 06.

**Proč se to teď neopravilo:** vyříznout `EN` z korpusu je změna chování
testu, ne přesun kódu. Do řezu nepatří.

**Až na to dojde:** vyříznout z `mimoKatalog` i anglický katalog a smazat
`rezim.nulaneboduje` z obou katalogů. Kontrola tím začne dělat, co slibuje.

---

## #2 · řez 4 · esbuild zahazuje komentáře na úrovni příkazů

Komentáře uvnitř výrazů (třeba `/* společné */` mezi klíči katalogu) ve
výstupu zůstávají, komentáře mezi příkazy ne. Nasazený `index.html` tím
přišel o většinu české dokumentace, kterou dřív vezl s sebou.

**Nevadí to**, a je to spíš zisk: výstup je artefakt, zdroj je místo, kde se
čte, a soubor se zmenšil z 601 kB na 539 kB. Stojí ale za zapsání, kdyby
někdo příště hledal komentář v nasazeném souboru a nenašel ho.

---

## #3 · řez 5 · esbuild si jména vybírá sám — test nesmí hledat v sestaveném souboru

Po vytažení pravidel přejmenoval esbuild import `t` na `t2`, protože se
jméno střetlo s lokální proměnnou v `app.js`. Strážní kontrola v sadě 16
hledala v `index.html` vzor `t("…")` a našla **10 klíčů místo 181** —
zbytek byl `t2("…")`. `tn` přejmenované nebylo, takže to nevypadalo jako
systémová chyba, ale jako by se katalog scvrknul.

Zajímavé je pokračování: jakmile `t` naimportoval i modul `kombinace.js`,
esbuild se rozhodl jinak a jméno zůstalo `t`. **Volba jména závisí na tom,
kdo všechno modul importuje** — tedy na věci, která se každým řezem mění.

Sada 16 proto čte `src/js/**/*.js`, ne `index.html`. Ve zdroji se jména
nemění. Řezání katalogu podle popisků modulů (`// src/js/jazyky/cs.js`)
zůstalo, ty esbuild sází vždycky.

**Poučení pro zbytek refaktoru:** co se ptá na *kód*, ať čte zdroj; co se
ptá na *chování*, ať čte sestavený soubor. Sada 15 se ptá na CSS pravidlo
`[hidden]{display:none!important}` — to se vkládá doslova, takže je v pořádku.

---

## #4 · řez 5 · esbuild nehlásí neznámé identifikátory

`cistaKombinace()` volá `t()` kvůli výchozímu jménu „Kombinace N“. Při
přesunu do `pravidla/kombinace.js` se import nedoplnil — a esbuild to
**nepovažoval za chybu**: co nezná, bere jako globál prohlížeče. Aplikace
se přeložila, naběhla a spadla teprve při načítání vlastních kombinací.

Osmnáct sad se rozsypalo naráz a v hromadě výpisů nebylo poznat, co se
vlastně stalo. Proto přibyla sada `00-start.mjs`: naběhne aplikace vůbec,
stojí sondy, vykreslilo se skóre. Doběhne za dvě vteřiny a pouští se první.

Zkoušel jsem k tomu i statickou kontrolu volných proměnných nad zdrojem,
ale bez skutečného parseru to nejde: uvozovka uvnitř regulárního výrazu
(`/[&<>"]/g` v `esc()`) rozhodí každé naivní vyprazdňování řetězců
a kontrola pak hlásí stovky nesmyslů. Buď parser (acorn), nebo nic —
zatím to hlídá kouřová zkouška.

---

## #5 · řez 5 · jméno vlastní kombinace potřebuje jazyk uvnitř domény

`cistaKombinace()` je jinak čistá, ale výchozí jméno „Kombinace N“ se
podle CLAUDE.md **materializuje při vzniku** — kdyby se dopočítávalo
z pořadí až při vykreslení, smazání sourozence by ostatní přejmenovalo.
Jméno tím patří datům, ne zobrazení, a data vznikají v doméně.

`pravidla/kombinace.js` proto importuje `t()` z `jazyky/jadro.js`. Je to
jediná odchylka od pravidla „doména nezná jazyk“ a je zapsaná v hlavičce
modulu. **Nechat tak** — alternativa (nechat jméno prázdné a doplnit ho
v UI) je změna chování, ne přesun.

---

## #6 · řez 6 · tři sady čekaly na import pevných 60 ms a jedna z nich to shazovalo

Sada 18 začala padat zhruba v polovině běhů: `import tvar nemění: undefined`.
Bisekce přes uložené verze `index.html` ukázala, že původní soubor prošel
osmkrát z osmi, kdežto od **řezu 4** je to loterie.

Nebyla to chyba aplikace. Pomocník `soubor()` posílal soubor do `#impfile`
a čekal `spi(60)`; `FileReader` je asynchronní a v jednom procesu běží víc
jsdomů naráz. Když ve vedlejší instanci zrovna dobíhal líný výčet rizika
(55 986 hodů, desítky ms blokované smyčky), šedesát milisekund nestačilo
a klik na *Přidat* dopadl do prázdna. Řez 4 jen posunul poměr sil natolik,
že se latentní závod začal prohrávat.

Ověřeno: se `spi(400)` prošlo šestkrát ze šesti. Magické číslo ale není
oprava — sady teď čekají na výsledek (`#impbox` nebo `#zalmsg` přestane být
skrytý), ne na čas.

**Past, na kterou se přitom narazilo:** čekat na „panel je vidět“ nestačí.
Druhý import v téže aplikaci ho našel odemčený po tom prvním, skončil
okamžitě a četl text, který ještě nikdo nepřepsal — sada 05 pak hlásila
pět chyb úplně jinde. Obě místa se proto před odesláním schovají, takže se
čeká na **změnu**, ne na stav.

Týká se sad 05, 16 a 18. Aplikace se nezměnila.
