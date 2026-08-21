# Nápady, které padly a neudělaly se

Přesunuto z CLAUDE.md, ať se nenačítá při každé konverzaci — obsah je ale
beze změny.

- **Přesun zapsaného kola zpátky do rozehraného** („nastavit jako aktivní"
  v režimu *Opravit*): kolo by se překlopilo do počítadla, opravilo a zapsalo
  zpátky na svůj index, pak by se pokračovalo dalším kolem v řadě. Odloženo,
  ne zamítnuto — v praxi stačí kolo smazat a naklikat znovu, na jeho pořadí
  obvykle nezáleží, takže by to byl kód navíc za skoro nulové využití.
  Kdyby po tom byla poptávka, plán je hotový:
  - `turns[i]` nese jen `{p, bust, d}`, detail hodů se při zápisu zahazuje —
    kolo tedy **není z čeho poskládat**. Muselo by přibýt `turns[i].r`
    s otiskem `rolls`. Do historie ani do koše to neprosákne, `snapshot()`
    už dnes kola mapuje na tři pole; roste jen klíč rozehrané hry.
  - Stav by dostal `S.editIdx`. Kolo zůstává v tabulce (číslování
    i mezisoučty se nehýbou) a jen se označí; `bank()` a `bust()` při
    `editIdx !== null` nepřipisují, ale přepisují na indexu a `banked`
    opraví o rozdíl.
  - Nutná úniková cesta „zrušit opravu" — kdo si položky umaže Zpětem, měl by
    pot na nule a zapsat by nešlo.
  - Podmínka spuštění: rozehrané kolo musí být úplně prázdné.
  - Kola zapsaná před zavedením `r` (a hry obnovené z koše) detail nemají,
    takže by u nich akce zůstala nedostupná.
- **Více hráčů.** Padl podrobný bezpečnostní plán (sdílená tabule přes kód
  instance, Cloudflare Workers, oddělení zápisu od čtení, CSP a vytažení
  inline JS). Celý stavový model je ale stavěný na jednoho hráče, takže je to
  přepis, ne přídavek.
- **Přepínač fullscreenu v nainstalované PWA.** Šel by udělat jen tak, že by
  manifest přešel na `"standalone"` a fullscreen by se zapínal Fullscreen
  API — aplikace by pak startovala s lištami a volbu by nešlo obnovit
  automaticky (`requestFullscreen()` vyžaduje dotek). Na iOS by nefungoval
  vůbec. Rozhodnutí: nechat `fullscreen` a přepínač nedělat.
- **Podpora krajiny.** Zamítnuto — aplikace je natvrdo na výšku ve třech
  vrstvách (manifest, `screen.orientation.lock()`, CSS překryv) a rozšiřovat
  se to nemá.
- ~~**Vlastní kombinace v pravidlech.**~~ **Hotovo 12. 8. 2026** — čtyři
  přednastavené kombinace plus editor vlastních vzorů, viz CLAUDE.md část 13
  a `plany/02-kombinace-a-riziko.md`. Ruční zadání bodů zůstalo jako poslední
  úniková cesta.
- ~~**Víc verzí pravidel.**~~ **Hotovo 13. 8. 2026** — tři přednastavené herní
  režimy (KCD, klasické kostky, pět kostek) a konfigurátor vlastních, viz
  CLAUDE.md část 14 a `plany/04-herni-rezimy.md`. Piggyback zůstal jen jako
  poznámka v pravidlech klasiky: bodováním se od ní neliší a jeho stavba kola
  potřebuje druhého hráče, kterého sólo počítadlo nemá.
