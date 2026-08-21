# Plán 3 — Režim u stolu (víc hráčů na jednom telefonu)

> **Hrubý návrh k diskuzi, ne zadání k realizaci.** Je to podklad pro rozhodnutí,
> jestli do toho jít a v jakém rozsahu. Konkrétní čísla řádků a jména funkcí by
> tu byly předstíraná jistota.

**Stav:** k diskuzi. **Riziko:** vysoké — sahá na stavový model.
Vychází z auditu z 10. 8. 2026. Sourozenecké plány: `01-technika.md`,
`02-kombinace-a-riziko.md`.

**Tvrdá podmínka:** aplikace musí zůstat celá offline, bez backendu, bez volání
na cizí servery. **Platí i pro přenos skóre mezi telefony** — viz oddíl níž,
všechny navržené cesty jsou lokální.

---

## O co jde

Telefon leží na stole, putuje od hráče k hráči a každý si do něj počítá své
skóre. Po skončení hry se do historie uloží hra **majitele telefonu**; ostatní
tam nemají co dělat, protože historie a statistiky jsou jeho.

## Vymezení proti zamítnutému nápadu

`docs/ideas.md` zamítá *více hráčů*, ale zamítá něco jiného: sdílenou tabuli přes
kód instance, Cloudflare Workers, oddělení zápisu od čtení, CSP a vytažení
inline JS. **Tohle je čistě lokální a nepotřebuje ani jeden bajt po síti.**
To zamítnutí se ho netýká.

Platí ale druhá půlka té poznámky: *„celý stavový model je stavěný na jednoho
hráče, takže je to přepis, ne přídavek."* To je pravda — a celý tenhle plán je
o tom, jak z toho přepisu udělat přídavek.

---

## Klíčová myšlenka: sólo je zvláštní případ hry u stolu

Bez tohohle je to přepis. S tímhle je to přídavek.

```js
S.hraci  = [ { id, jmeno, banked, turns[] }, … ]
S.naRade = 0        // index hráče, který drží telefon
S.ja     = 0        // index majitele telefonu
S.rolls  = […]      // zůstává globální: patří rozehranému kolu toho na řadě
```

**V sólo režimu má `hraci` právě jednu položku a `naRade === ja === 0`.**
Všechny dnešní cesty se na to zredukují a chovají se přesně jako teď.

Dnešní `S.banked` a `S.turns` se nahradí dvěma přístupovými funkcemi:

```js
function ja(){   return S.hraci[S.ja]; }
function hrac(){ return S.hraci[S.naRade]; }
```

Většina volání se pak liší jen tvarem (`S.banked` → `hrac().banked`), ne logikou.
`locked()`, `bank()`, `bust()`, `zapisKolo()`, `deleteTurn()`, `snapshot()`,
`gameEmpty()`, `render()` — všechny se dají přepsat mechanicky.

**Migrace uloženého stavu** patří do `ozdrav()` (`index.html:2027`), který na
tyhle věci už je stavěný: chybí-li `hraci`, postaví se z `S.banked` a `S.turns`.
Klíč `farkle-solo-v3` může zůstat, nebo se povýšit na `-v4`; obojí jde,
`ozdrav()` to unese.

---

## Průběh hry

1. přepínač **sólo / u stolu** v panelu nastavení hry (ikona kostky), vedle
   režimu a cíle
2. při zapnutí: seznam hráčů — jména, pořadí, označení „to jsem já"
3. hraje se jako dnes; nad skóre přibude **proužek hráčů** (jméno + součet,
   ten na řadě zvýrazněný)
4. `bank()` nebo `bust()` posune `naRade` a vyprázdní `rolls`
5. mezi koly **předávací obrazovka** — „Předej telefon: Honza" a velké tlačítko.
   Není to jen ozdoba: brání překlepu do cizího kola a je to přirozený okamžik
   předání

### Rozhodnutí, které je potřeba udělat předem

**Kdy hra končí.** V klasickém Farkle po dosažení cíle dostanou ostatní ještě
jedno poslední kolo. Dnešní `locked()` (`index.html:2717`) zamyká okamžitě a
CLAUDE.md §3 vysvětluje, proč je to tak zvolené (zámek naskočí až po zapsání
celého kola, aby body na stole nepropadly). U stolu to takhle nechat nejde,
nebo aspoň ne bez rozmyslu.

**Tohle je první věc k dohodnutí, ještě před etapou 0.**

---

## Layout

Proužek hráčů stojí ~30 px. Rozpočet výšky `#page0` v pásmu ≤ 639 px (kam
iPhone SE 2 v Safari spadá) je zhruba **541 px z ~553 dostupných**, tedy rezerva
~12 px. Nový trvalý prvek se tam nevejde.

**Řešení:** v režimu u stolu **schovat řádek „zbývá"** (`.score .sub`,
`index.html:811`). Dnes mizí až v pásmu ≤ 639 px; tady by mizel vždycky. Součet
i cíl se dají přečíst z proužku hráčů, takže se neztrácí informace, jen se
přeskupuje.

**Předávací obrazovka je překryv přes celou plochu, takže stojí nula.**

---

## Historie a statistiky

Do historie jde záznam majitele telefonu — tvar zůstává dnešní, jen přibude
kontext:

```js
{ id, savedAt, mode, goal, roundGoal, banked, turns[],
  stul: [ { jmeno, banked }, … ] }   // ostatní hráči, nepovinné
}
```

`turns` je pořád jen jeho, takže **všech dvacet statistik funguje beze změny**.

### Kde to začne bolet

Jakmile se z toho má stát statistika („kolikrát jsem vyhrál"), musí přibýt pole
v `souhrnZ()` (`index.html:2133`) → **bump `IDB_VERZE`** (`index.html:2121`)
a zpětný dopočet po vzoru `dopoctiHody()` (`index.html:2199`).

**A `IDB_VERZE` i délka `STATY` jsou natvrdo zapsané ve víc sadách testů, než by
člověk čekal** — nejen v 04 a 10.

**Doporučení: první etapa bez nové statistiky.** Hráči u stolu se vezou
v záznamu a zobrazí se v detailu hry. Statistika „bilance" až v druhé etapě,
s vědomím ceny.

---

## Přenos skóre do telefonů ostatních hráčů

Zadání zní: bez serveru. Prošel jsem čtyři cesty.

### 1. Textový kód přes schránku nebo systémové sdílení *(doporučeno)*

**Je to prakticky hotové.** Formát zálohy `#DATA:` je zmrazený a `parseZaloha()`
(`index.html:4042`) přijme pole záznamů libovolné délky — **jedna hra je platná
záloha o jedné položce**. Import už dnes nabízí *Přidat nové* a `novychZ()`
(`index.html:4115`) hlídá duplicity podle `id`.

Chybí jediné: postavit záznam pro **jiného** hráče než majitele, což model
`hraci[]` dává zadarmo.

Odesílá se přes `doSchranky()` (`index.html:4084`, existuje) nebo
`navigator.share({ text })` — sdílecí list je věc operačního systému, aplikace
přitom **neotevře žádné spojení**.

Nulový nový formát, nulová nová cesta dovnitř, funguje na každém zařízení.
Jak se text dostane k druhému (SMS, messenger, AirDrop) je věcí uživatele a
aplikace do toho nemluví.

### 2. Soubor

`stahni()` (`index.html:4065`) existuje, *Import ze souboru* taky. Přidat by šlo
`navigator.share({ files })`. Jako záložní cesta pro delší hry, kde by kód byl
nepohodlný.

### 3. QR kód

**Asymetrické a to je ten problém.**

*Zobrazit* QR je snadné — enkodér se dá vložit do stránky do ~3 kB a nepotřebuje
síť.

*Přečíst* QR je drahé. `BarcodeDetector` je v Chrome na Androidu, ale
**v Safari není** — a iPhone je v tomhle projektu první občan. Alternativa je
dekodér v JS (řádově 15 kB a víc) plus přístup ke kameře, tedy oprávnění
a `getUserMedia`.

**Návrh:** QR jen jako **zobrazení** kódu z bodu 1. Kdo má systémovou čtečku
(fotoaparát na iPhonu ji má), načte ho bez psaní; kdo ne, přečte si text.
**Skener do aplikace nedávat.**

### 4. BroadcastChannel, WebRTC, Bluetooth

Mimo hru. Buď potřebují stejný origin na stejném zařízení, nebo signalizační
server, nebo párování, které Web API neumí.

### Doporučení

**Bod 1 v první etapě** (je to z 90 % hotové), **bod 3 jako pozdější pohodlí**
nad stejným kódem. Bod 2 jen když se ukáže, že kódy jsou moc dlouhé.

---

## Co to rozbije

- **`snapshot()` je dnes jediný zdroj vykreslení** (CLAUDE.md §3) a předpokládá
  jednoho hráče. Buď zůstane pro majitele a přibude `snapshotHrace(i)`, nebo se
  zparametrizuje. **Tohle je nejcitlivější místo celého plánu** — vrubovka
  (`tallyInto`), dlaždice (`statsHTML`) i tabulka kol (`rowsHTML`) z něj berou
  vstup a kreslí jím živou hru i hru z historie.
- **`zkusAutoUlozit()`** (`index.html:3159`) se spouští ze tří míst a ptá se
  `locked()`. U stolu musí zapisovat hru majitele a jen tehdy, když skončila
  celá hra, ne jen jeho kolo.
- **Testy.** Sady 01, 03, 04, 12, 13 stojí na jednohráčském `S`. I když se sólo
  chová beze změny, přepis přes přístupové funkce se dotkne skoro každé.
- **Návod.** Nová kapitola v `#cardguide` (`index.html:961`), tedy nové klíče
  v obou jazycích. Sada 16 kontroluje pokrytí klíč po klíči.

---

## Doporučené etapy

| etapa | co | proč zvlášť |
|---|---|---|
| **0** | `hraci[]` se sólem jako zvláštním případem, **žádná změna v UI** | všech sedmnáct sad musí projít beze změny chování — to je důkaz, že model sedí |
| 1 | přepínač, seznam hráčů, proužek, předávací obrazovka | hratelné u stolu |
| 2 | zápis majitele do historie + `stul[]` v záznamu | bez bumpu `IDB_VERZE` |
| 3 | přenos kódem (schránka / sdílení) | znovupoužití `#DATA:` |
| 4 | QR jako zobrazení téhož kódu | pohodlí |
| 5 | statistika bilance | tady teprve `IDB_VERZE` a bolest s testy |

**Etapa 0 je podmínka všeho ostatního.** Když projde beze změny testů, je jisté,
že zbytek je přídavek, ne přepis — a přesně tohle bylo důvodem, proč
`docs/ideas.md` víc hráčů zamítl. Když neprojde, je to signál se zastavit
a rozmyslet znovu, ne to protlačit.

---

## Otevřené otázky do diskuze

1. **Konec hry** — dostanou ostatní po dosažení cíle poslední kolo? (viz výš)
2. **Kolik hráčů** — strop? Proužek hráčů se na 320 px vejde asi ve čtyřech.
3. **Jména hráčů** — volný text jde do záznamu a do zálohy, tedy do
   `innerHTML` přes `esc()`, a `parseZaloha()` ho musí ořezat na rozumnou délku,
   stejně jako dnes ořezává `c` a `d` na 300 znaků (CLAUDE.md §4).
4. **Ukládá se hra u stolu do koše rozehraných?** Dnes tam jde `makeRecord()`,
   tedy jeden hráč. S `hraci[]` to je víc dat, ale koš má strop pěti her.
5. **Co když majitel telefonu nehraje** (jen počítá ostatním)? Pak `S.ja` nemá
   koho ukazovat a do historie se nemá co zapsat. Povolit, nebo vyžadovat, aby
   byl majitel vždycky jedním z hráčů?
