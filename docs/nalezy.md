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
