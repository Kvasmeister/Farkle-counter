# Chyby, které se staly, a proč

Přesunuto z CLAUDE.md, ať se nenačítá při každé konverzaci — obsah je ale
beze změny. Stojí za přečtení před větším zásahem do service workeru,
layoutu nebo i18n; všechny byly tiché.

**Ořezané UI na iPhonu SE 2.** Panel kola měl `overflow:hidden` a směl se
smrskávat, ale klávesnice uvnitř má pevnou výšku. Spodních 58 px se uřízlo bez
scrollbaru a bez náznaku. Test se ptal na `scrollHeight`, který je při
`overflow:hidden` vždy v pořádku — měřil špatnou věc. Teď stránka radši roluje,
než aby cokoliv zmizelo.

**`cache.addAll()` je atomické.** Jediný chybějící soubor odmítne celý příslib,
servisní worker se nenainstaluje a offline nefunguje. Nahrazeno ukládáním po
jednom s `.catch()`.

**Chybějící složky v repu.** Nahrány byly jen 4 soubory z 13; `icons/` a
`fonts/` chyběly. Manifest tak neměl platnou ikonu a Chrome instalaci vůbec
nenabídl. Odtud plochá struktura a fonty v HTML.

**Znak `›` mimo ořez fontu.** Kreslil se systémovým písmem a v seznamu
statistik vyčníval. Nahrazen za `»`, který v sadě je. Odtud kontrola množiny
znaků před nasazením.

**Ztracená úprava.** Do projektu se po velkém updatu nedostal aktualizovaný
`index.html` a celá jedna dřívější dávka změn (prohození řad klávesnice,
terminologie, režim oprav) tiše zmizela — přišlo se na to až při psaní návodu,
který popisoval něco jiného, než aplikace uměla. **Po každé dávce nahrát
`index.html` zpátky do projektu**, jinak další session staví na starém kódu.

**Fullscreen na iOS.** Tvrdil jsem, že od iOS 17.4 funguje, na základě
diskuse o betaverzích. Do ostrého vydání to neprošlo.

**Přebitá funkce hoistingem.** Do horní části skriptu přibyla pomocná
`cislo(x, nahrada)` — jenže o osm set řádků níž už `cislo(v)` existovala jako
formátovač statistik a deklarace funkcí se hoistují, takže vyhrála ta pozdější.
Výsledek: `S.banked` se stalo řetězcem a skóre se sčítalo jako `"0"+"100"+"100"`.
Chytila to jedna existující kontrola v sadě 06. **Nový název ve skriptu, který
má přes dva tisíce řádků a jediný scope, vždycky nejdřív prohledat** —
`grep -n "function jmeno"`. Pomocná se teď jmenuje `naCislo()`.

**Skrytí rodiče místo prvku.** `@media (max-height:539px)` schovávalo celou
`.rollhead`, aby zmizel popis hodu — jenže v ní sedí i záložky *zadat / opravit*
a s nimi zmizel jediný přístup k režimu oprav. Komentář u pravidla přitom
mluvil jen o popisu hodu. Skrývat cíleně, ne přes rodiče.
