# 05 — Refactor nastavení herních režimů

Nasazeno 21. 8. 2026. Drží odůvodnění a odchylky z realizace; co z toho platí
pro běžnou úpravu, je v `CLAUDE.md` částech 13 a 14 a nemá se sem opisovat.

## Proč

Detail herního režimu vznikl třemi navrstvenými updaty — kombinace navíc
(12. 8.), herní režimy (13. 8.), skupiny bodovací tabulky (16. 8.). Bylo to na
něm vidět:

- **dvojice a trojice byly dvě samostatné skupiny**, i když se ptají na totéž
  a liší se jen počtem kostek; čtveřice a výš se nedaly nastavit vůbec,
  jen odvodit pravidlem
- **„čtyři a víc stejných“ viselo bokem** a mluvilo o trojici, i když trojice
  nemusela bodovat
- **vlastní kombinace měla právě jeden vzor**, pole se sazbou přímo v seznamu
  a jméno vyrobené generátorem slov

## Co se rozhodlo a proč

**Jedna tabulka místo dvou polí.** `sam` zůstalo (samostatná kostka je jiná
věc — nemá „počet“), počty 2–6 se slily do řídké mapy `stej`. Přítomnost klíče
je zapnutí, stejně jako u postupek a kombinací navíc; tři stejné idiomy místo
dvou různých.

**Práh místo pevné trojky.** V základním pohledu má `stej` právě jeden klíč
a nabídka *Od kolika kostek* ho stěhuje i se sazbami. Rozšířený pohled rozpadá
sekci na pět podsekcí. **`rozs` je jen pohled, do bodování nemluví** — invariant
„v základním pohledu právě jeden klíč“ drží přechod mezi pohledy, ne funkce
`kindPoints()`. Kdyby se na příznak ptalo bodování, byly by pravdy dvě.

**Návrat do základního nechá nejnižší počet a zbytek odloží** do runtime paměti
(`stejPamet` + `rozsPamet`), zapnutí rozšířeného vrátí právě to, co sebral —
ne to, co uživatel vypnul ručně. Zvažovalo se blokovat návrat, dokud je zapnutý
víc než jeden počet; zamítnuto, protože trestá překlep v pohledu, který je
z principu jednodušší.

**Extrapolace se počítá od nejvyšší zapnuté skupiny**, ne od trojice:
`nasobek` je `× (count − m + 1)`, `x2` je `× 2^(count − m)`. Při `m = 3` z toho
vyjde znak po znaku dnešní chování, takže tři přednastavené režimy počítají
dál stejně — hlídá to strážní odvození v sadě 19. **Bez jediné zapnuté skupiny
se neextrapoluje vůbec**, ani u pevných bodů: nemá to od čeho počítat a řádek
„čtyři a víc“ se v takovém režimu ani neukazuje. (Dřív pevné body platily
i nad prázdnou tabulkou. Byl to vedlejší produkt pevné trojky, ne záměr.)

**Pravidlo nad skupinou se stěhuje**, ne kopíruje: `#reznadwrap` stojí staticky
v HTML kvůli `data-i18n` a `renderRezStej()` ho přesouvá pod tu podsekci, ke
které patří. Před vyprázdněním `#rezstej` se musí odvézt do bezpečí — jinak by
ho `innerHTML` smazalo i s posluchači.

**Kombinace je pojmenovaná věc s víc vzory.** Vzory jsou spojené „nebo“:
kombinace boduje, jakmile sedne kterýkoli, a platí pořád stejně. Tím padl
generátor slovních jmen — jméno si volí hráč a výchozí je *Kombinace N*,
materializovaná při vzniku (dopočet z pořadí by po smazání sourozence
přejmenoval ostatní). Zbyl jazykově neutrální **zápis** `A,A+2,2`, který se
sází v seznamu, v editoru i v pravidlech.

**Čip se ptá na počet kostek, jen když je z čeho vybírat.** Vzory jedné
kombinace můžou mít různý počet kostek a `keep()` musí vědět, kolik jich
odložit. Jedna možnost se odloží rovnou; víc možností překlopí řadu na volbu,
stejným dvoukrokovým vzorem jako mazání v koších. Kód štítku zůstal
`k<body>x<kostek>`, takže se historie nemusela sáhnout vůbec.

**Dvě dvojice (4 kostky, 250) jsou pátá přednastavená kombinace** — a jediná
bez trojice uvnitř, takže jako jediná mění riziko farklu od čtyř kostek výš;
na šesti ho srazí na nulu. Proto třetí konstantní sada `RIZIKO_2P`. Výchozí
sazba 250 je pod nejlepším součtem částí (1,1,5,5 = 300), tedy vědomě přijatá
past jako u *čtveřice a dvojice*; řeší ji editovatelná sazba.

## Odchylky od zadání

- **Stropy**: 8 kombinací na režim (jako dřív vzorů) a 6 vzorů v jedné.
  Zadání znělo „neomezeně“; `localStorage` má ale zůstat shora omezené.
- **Práh se nastavuje rozbalovací nabídkou**, ne tlačítkem, které hodnotu
  cykluje — stejný prvek jako *Počet kostek* vedle něj, jedno klepnutí
  a celý rozsah vidět.
- **Přepínač Zapnuto/Vypnuto zůstal i v hlavním seznamu** vedle *Upravit*
  a *Smazat*, ne jen v editoru: vypnout kombinaci na jedno klepnutí je
  častější než ji předělávat.
- **Nová kombinace vzniká rovnou s jedním vzorem** (dvojice libovolných
  stejných). Kombinace bez vzoru by neměla co bodovat a v seznamu by visela
  naprázdno; poslední vzor proto smazat nejde.
- **Násobek v tabulce pravidel se sází číslem** (`×2`, `×4`, `×8`) místo
  dřívějšího „dvojnásobek trojice“. S posunutelným prahem by slovo lhalo.

## Co zůstalo nedotčené

Kódy štítků v historii (`c3p`–`c42`, `k…x…`, `n…`, `d…`), formát zálohy,
`IDB_VERZE`, čtení starých polí `dvoj`/`troj` i vzorů s příznakem `any`
a bez jména. Migrace se dělá při čtení, nic se nepřepisuje a starý klíč
`farkle-kombinace-v1` se dál nemaže.
