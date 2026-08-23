/* Ručně psaná čeština — klíče, které se nemají z čeho sebrat.

   Závisí na: ničem
   Nezávisí na: DOM, úložišti, zbytku aplikace
   Je to DATA, ne kód: 280 klíčů, jejichž text vzniká až za běhu v JS.
   Statické texty tady nestojí — ty se sbírají z <body>, viz jadro.js. */
/* ---------- ručně psaná čeština ----------
   Klíče, které se nemají z čeho sebrat: jejich text vzniká až za běhu
   v JS. Píšou se proto česky rovnou sem. Sběr z DOMu je nepřepíše — bere
   jen klíče, které ještě nemá — a proto tu nesmí stát klíč, který je
   zároveň anotovaný v <body>. Hlídá to strážní test, stejně jako to,
   že tu neleží klíč, který už nikdo nevolá. */
export var RUCNI = {
  /* společné */
  "spol.smazat":            "Smazat",
  "spol.obnovit":           "Obnovit",
  "spol.zapnuto":           "Zapnuto",

  /* slova s více tvary — {n} se doplní samo */
  "slovo.kolo":     ["{n} kolo", "{n} kola", "{n} kol"],
  "slovo.hra":      ["{n} hra", "{n} hry", "{n} her"],
  "slovo.nova":     ["{n} nová", "{n} nové", "{n} nových"],
  "slovo.rezim":    ["{n} režim", "{n} režimy", "{n} režimů"],
  "slovo.kostkami": ["{n} kostkou", "{n} kostkami"],
  /* první pád — pro výčty v nastavení; „kostkami“ je sedmý a jinam nesedne */
  "slovo.kostek":   ["{n} kostka", "{n} kostky", "{n} kostek"],
  "slovo.farkle":   "farkle",

  /* štítky odložených položek — kolo si ukládá kód, slova vznikají až tady */
  "stitek.j":   "jednička",
  "stitek.p":   "pětka",
  /* Jednička a pětka mají kódy j a p odjakživa; zbylé čtyři hodnoty umí
     bodovat samostatně teprve od volné bodovací tabulky, proto d2–d6. */
  "stitek.d2":  "dvojka",
  "stitek.d3":  "trojka",
  "stitek.d4":  "čtyřka",
  "stitek.d6":  "šestka",
  "stitek.v":   "vlastní",
  "stitek.s15": "postupka 1\u20135",
  "stitek.s26": "postupka 2\u20136",
  "stitek.s16": "postupka 1\u20136",
  "stitek.n":   "{p}\u00D7 {h}",

  /* kombinace navíc: preset má pevný kód, vlastní vzor veze body a počet
     kostek přímo v kódu (k1500x5), aby se přečetl i bez svého vzoru */
  "stitek.c2p": "dvě dvojice",
  "stitek.c3p": "tři dvojice",
  "stitek.c32": "trojice a dvojice",
  "stitek.c33": "dvě trojice",
  "stitek.c42": "čtveřice a dvojice",
  "stitek.k":   "vlastní {b} · {d}",

  /* typ hry (do bodů / na kola) — jediné místo, kde se skládá. Herní režim
     je něco jiného, viz rezim.* níž. */
  "typhry.dobodu":      "do {b}",
  "typhry.nakola":      "na kola",
  "typhry.nakolalimit": "na kola \u00B7 limit {n}",

  /* počítadlo */
  /* herní režimy — názvy přednastavených, jejich poznámky a celá karta
     v nastavení. Název vlastního režimu si píše uživatel a katalogem
     neprochází. */
  "rezim.n.kcd2":    "KCD",
  "rezim.n.klasika": "Klasické kostky",
  "rezim.n.pet":     "Pět kostek",
  "rezim.pozn.kcd2":    "Vážené kostky a odznaky z Kingdom Come: Deliverance II jsou nadstavba nad pravidly a počítadlo je neřeší.",
  "rezim.pozn.klasika": "Piggyback je tatáž hra s jinou stavbou kola: místo šesti čerstvých kostek můžeš navázat na kostky a body předchozího hráče. Přebrané body si zadej ručním zadáním, čipem <b>vlastní</b>.",
  "rezim.pozn.pet":     "Hraje se obvykle do 5 000. Pět stejných kostek na první hod v kole bývá okamžitá výhra \u2014 to si pohlídej sám, počítadlo ji nezná.",
  "rezim.neznamy":   "neznámý režim",
  "rezim.beznazvu":  "Vlastní režim",
  "rezim.postupek":  ["{n} postupka", "{n} postupky", "{n} postupek"],
  "rezim.kombinaci": ["{n} kombinace navíc", "{n} kombinace navíc", "{n} kombinací navíc"],
  "rezim.pravidla":  "Pravidla",
  "rezim.upravit":   "Upravit",
  "rezim.zvolit":    "Zvolit režim",
  "rezim.zvoleno":   "Zvoleno",
  "rezim.zamceno":   "Režim jde přepnout jen před začátkem hry. Rozehranou hru dohraj, zapiš do historie a začni Novou hrou.",
  "rezim.strop":     "Víc než {n} vlastních režimů nejde.",
  "rezim.opravdusmazat": "Opravdu smazat režim?",
  "rezim.nesmazat":  "Zvolený režim smazat nejde. Zvol nejdřív jiný.",
  "rezim.nulaneboduje": "0 = neboduje",
  "rezim.skupina.zapnout":  "Zapnout celou skupinu",
  "rezim.skupina.vypnout":  "Vypnout celou skupinu",
  /* Sekce samostatných kostek a stejných čísel. Nadpisy sekcí stojí
     v <body>, tyhle texty patří řádkům, které staví vykreslení. */
  "rezim.sam.n":     "Samostatná kostka",
  "rezim.sam.p":     "Kolik platí jedna kostka té hodnoty sama o sobě.",
  "rezim.stej.2":    "Dvojice",
  "rezim.stej.3":    "Trojice",
  "rezim.stej.4":    "Čtveřice",
  "rezim.stej.5":    "Pětice",
  "rezim.stej.6":    "Šestice",
  "rezim.stej.zapnout": "Zapnout stejná čísla",
  "rezim.stej.vypnout": "Vypnout stejná čísla",
  "rezim.rozs.zapnout": "Zapnout rozšířený režim",
  "rezim.rozs.vypnout": "Vypnout rozšířený režim",
  /* Aria popisky polí v mřížce: „3× 4“ přečtené nahlas nic neřekne.
     Klíč se skládá za běhu z počtu, proto ta tečka na konci předpony. */
  "rezim.aria.1":    "Body za samostatnou {v}",
  "rezim.aria.2":    "Body za dvě {v}",
  "rezim.aria.3":    "Body za tři {v}",
  "rezim.aria.4":    "Body za čtyři {v}",
  "rezim.aria.5":    "Body za pět {v}",
  "rezim.aria.6":    "Body za šest {v}",
  /* Nadpis řádku o počtech nad nejvyšší nastavenou skupinou. Řídí se tím,
     kde ta skupina zrovna je, takže do <body> staticky nepatří. */
  "rezim.nadn.3":    "Tři a víc stejných",
  "rezim.nadn.4":    "Čtyři a víc stejných",
  "rezim.nadn.5":    "Pět a víc stejných",
  "rezim.nadn.6":    "Šest stejných",
  "rezim.zvolitkratce": "Zvolit",
  "rezim.kopie":     "{n} (kopie)",
  "rezim.dupl.n":    "Duplikovat režim",
  "rezim.dupl.p":    "Vyrobí vlastní kopii, kterou jde předělat. Původní zůstane, jak je.",
  "rezim.dupl.btn":  "Duplikovat",
  /* pás na spodní hraně detailu režimu: riziko farklu pro každý počet kostek */
  "rezim.riziko.n":  "Riziko farklu",
  "rezim.riziko.pol": "{n}: {p} %",
  "rezim.riziko.pocita": "počítá se…",
  "rezim.nad.napoveda": "Nejvyšší nastavená skupina jsou třeba trojice a trojice pětek platí 500. <b>Zdvojnásobí</b>: čtyři pětky 1 000, pět 2 000, šest 4 000. <b>Násobí skupinu</b>: čtyři pětky 1 000, pět 1 500, šest 2 000. <b>Pevné body</b>: platí čísla níž bez ohledu na to, které hodnoty padly.",
  "rezim.nadaria":   "Body za {n} stejných",

  "rezim.vychozi.n":  "Obnovit výchozí",
  "rezim.vychozi.p":  "Zahodí všechny úpravy tohohle režimu.",
  "rezim.vychozi.btn": "Obnovit",
  "rezim.smazat.n":   "Smazat režim",
  "rezim.smazat.p":   "Hry, které už jsou v historii, si svůj název ponechají.",

  /* sdílení jednotlivých režimů */
  "rezim.pridano":          ["Přidán {n} režim.", "Přidány {n} režimy.", "Přidáno {n} režimů."],
  "rezim.sdil.vyber":       "Vyber aspoň jeden herní režim.",
  "rezim.sdil.vybrano":     "Vybráno",
  "rezim.sdil.nevybrano":   "Nevybráno",
  "rezim.imp.duplicitni":   "Stejná pravidla má už „{n}“ — nenačte se.",
  "rezim.imp.prejmenovano": "Přejmenováno kvůli shodě jména.",
  "rezim.imp.nic":          "Nic k importu — všechny režimy se vynechaly.",
  "komb.nevejde":     "víc kostek, než režim má",
  "komb.bezvzoru":    "zatím bez vzoru — na počítadle se neukáže",
  "pocitadlo.postupkykomb": "Postupky a kombinace",
  "pocitadlo.kombinace":    "Kombinace",

  /* tabulka pravidel — skládá se z režimu, takže texty nemůžou stát
     staticky v <body> jako dřív */
  "pravidla.p1":    "Hodíš {kostky} a odložíš si z hodu aspoň jednu bodující kostku nebo kombinaci. Když hod nedá vůbec nic, je to <b>Farkle</b> \u2014 všechno, co máš v kole na stole, propadá a hraje soupeř.",
  "pravidla.p2":    "Po každém hodu se rozhoduješ: <b>zapsat</b> body a předat kolo, nebo <b>házet dál</b> jen těmi kostkami, které jsi neodložil.",
  "pravidla.p3":    "Když odložíš i poslední kostku, přicházejí <b>horké kostky</b> \u2014 házíš znovu {kostky} a body se sčítají dál v tomtéž kole.",
  "pravidla.sam.1": "Každá jednička",
  "pravidla.sam.2": "Každá dvojka",
  "pravidla.sam.3": "Každá trojka",
  "pravidla.sam.4": "Každá čtyřka",
  "pravidla.sam.5": "Každá pětka",
  "pravidla.sam.6": "Každá šestka",
  "pravidla.dvoj.1": "Dvě jedničky",
  "pravidla.dvoj.2": "Dvě dvojky",
  "pravidla.dvoj.3": "Dvě trojky",
  "pravidla.dvoj.4": "Dvě čtyřky",
  "pravidla.dvoj.5": "Dvě pětky",
  "pravidla.dvoj.6": "Dvě šestky",
  "pravidla.t4n":   "Tři dvojky / trojky / čtyřky / pětky / šestky",
  "pravidla.troj.1": "Tři jedničky",
  "pravidla.troj.2": "Tři dvojky",
  "pravidla.troj.3": "Tři trojky",
  "pravidla.troj.4": "Tři čtyřky",
  "pravidla.troj.5": "Tři pětky",
  "pravidla.troj.6": "Tři šestky",
  "pravidla.stejnych.3": "Tři stejné",
  "pravidla.stejnych.4": "Čtyři stejné",
  "pravidla.stejnych.5": "Pět stejných",
  "pravidla.stejnych.6": "Šest stejných",
  "pravidla.post.15": "Postupka 1\u20135",
  "pravidla.post.26": "Postupka 2\u20136",
  "pravidla.post.16": "Postupka 1\u20136",
  "pravidla.nicneboduje": "V tomhle režimu neboduje nic",
  "pravidla.pozn2": "\u201ESkoro\u201C nic neznamená \u2014 odložit jde jen to, co v tabulce stojí celé.",

  /* statistika nejhranějšího režimu */
  "stat.n.rezim":   "Nejhranější režim",

  "pocitadlo.kolonastole": "Kolo {n} \u2014 na stole",
  "pocitadlo.odehranokol": "odehráno kol",
  "pocitadlo.nadcil":      "nad cíl",
  "pocitadlo.zkol":        "{n} z {z}",
  "pocitadlo.hodradek":    "Hod {n} — házíš <b>{kostky}</b>",
  "pocitadlo.hodzbyva":    "\u00B7 zbývá {n}",
  "pocitadlo.hraskoncila": "Hra skončila — zobrazit zápis kol",
  "pocitadlo.nejdriv":     "Nejdřív si z hodu něco odlož",
  "pocitadlo.hazetdalx":   "Házet dál — {kostky}",
  "pocitadlo.horke":       "Horké kostky — házet znovu všemi šesti",
  "pocitadlo.zapsatx":     "Zapsat {b}",
  "pocitadlo.plus":        "+ {b}",
  /* Čeština má zkratku ve všech tvarech stejnou, angličtina ne („1 die“
     vs. „2 dice“). Klíč proto stojí jako pole, i když se české tvary
     neliší — jinak by se u jedničky psalo „1 dice“. */
  "pocitadlo.kostzkr":     ["{n} kost.", "{n} kost.", "{n} kost."],
  "pocitadlo.konecbody":   "Cíl {b} je dosažený — hra je u konce. Cíl se dá změnit v nastavení hry.",
  "pocitadlo.koneckola":   "Odehráno všech {n} kol — hra je u konce. Počet kol se dá změnit v nastavení hry.",

  /* riziko farklu na tlačítku Farkle — slovo farkle stojí nad ním, tak se
     neopakuje */
  "pocitadlo.farkleriziko": "riziko {p} %",

  /* kombinace navíc v nastavení */
  "komb.zapnout":       "Zapnout kombinaci",
  "komb.vypnout":       "Vypnout kombinaci",
  "komb.sazba":         "Body za kombinaci",
  "komb.zadne":         "Zatím žádná vlastní kombinace.",
  "komb.naukej":        "Naťukej kostky, ze kterých se vzor skládá.",
  "komb.strop":         "Víc než {n} vlastních kombinací nejde.",
  "komb.opravdusmazat": "Opravdu smazat kombinaci?",

  /* vlastní kombinace: výchozí jméno, editor a volba počtu kostek */
  "komb.vychozin":      "Kombinace {n}",
  "komb.beznazvu":      "Vlastní kombinace",
  "komb.body.n":        "Body",
  "komb.body.p":        "Platí se stejně, ať sedne kterýkoli vzor.",
  "komb.stav.n":        "Stav",
  "komb.stav.p":        "Vypnutá kombinace v klávesnici není a riziko farklu nemění.",
  "komb.smazat.n":      "Smazat kombinaci",
  "komb.smazat.p":      "Hry, které už jsou v historii, si svůj štítek ponechají.",
  "komb.opravdusmazatvzor": "Opravdu smazat vzor?",
  "komb.stropvzoru":    "Víc než {n} vzorů v jedné kombinaci nejde.",
  "komb.vyberkostek":   "kolik kostek?",

  /* vrubovka */
  "tally.kolzn":     "odehráno kol: {n} z {z}",
  "tally.koln":      "odehráno kol: {n}",
  "tally.zadnekolo": "zatím žádné kolo",
  "tally.docile":    "do cíle zbývá {b}",
  "tally.prekonano": "cíl překonán o {b}",

  /* karta opravit a tabulka kol */
  "oprava.nic":            "V tomto kole zatím nic zapsaného.",
  "oprava.hod":            "hod {n} \u00B7 {k}k",
  "oprava.horke":          "horké",
  "oprava.smazatpolozku":  "Smazat položku",
  "zapis.hotovo":          "Hotovo",
  "zapis.opravdusmazat":   "Opravdu smazat kolo {n}?",
  "zapis.smazatkolo":      "Smazat kolo {n}",

  /* přehledové dlaždice */
  "souhrn.celkem":   "celkem",
  "souhrn.nejlepsi": "nejlepší",
  "souhrn.prumer":   "průměr",
  "souhrn.farklu":   "farklů",

  /* tlačítko zápisu do historie */
  "arch.propadne":     "Na stole je {b} a propadne — zapsat?",
  "arch.obnovit":      "Obnovit do historie",
  "arch.ulozeno":      "Uloženo v historii",
  "arch.aktualizovat": "Aktualizovat v historii",
  "arch.zapsat":       "Zapsat do historie",

  /* hlášky o selhání zápisu */
  "chyba.mistoulozit":  "Nepodařilo se uložit — došlo místo",
  "chyba.mistosmazat":  "Nepodařilo se smazat — došlo místo",
  "chyba.nedostupna":   "Historie teď není dostupná",
  "chyba.zalohovathru": "Nepodařilo se zálohovat rozehranou hru",
  "chyba.smazat":       "Nepodařilo se smazat",
  "chyba.dokose":       "Nepodařilo se uložit do koše",

  /* koš */
  "kos.opravdutrvale": "Opravdu trvale smazat?",
  "kos.trvalesmazat":  "Trvale smazat",
  "kos.prazdny":       "Zatím není co obnovit. Hra smazaná tlačítkem Nová hra se sem odloží sama.",
  "kos.prazdnyhist":   "Zatím není co obnovit. Hra smazaná z historie se sem odloží sama.",

  /* nová hra */
  "nova.nezalohovano": "Nepodařilo se zálohovat — hra zůstává",
  "nova.opravdu":      "Opravdu nová?",
  "nova.text":         "Tahle hra zatím není v historii, takže se nezapočítá do statistik. " +
                       "Nová hra ji odloží do nastavení, mezi smazané rozehrané hry — drží se jich posledních pět.",
  "nova.propadne":     "Na stole je {b} a propadne.",

  /* bublina */
  "toast.aktualizovan": "Záznam v historii aktualizován",
  "toast.ulozena":      "Hra uložena do historie",

  /* stavové popisky přepínačů nahoře i v nastavení */
  "hlav.tmavyrezim":  "Tmavý režim",
  "fs.zpet":          "Zpět z celé obrazovky",
  "fs.zapnout":       "Celá obrazovka",
  "svit.nechat":      "Nechat displej zhasínat",
  "svit.nezhasinat":  "Nezhasínat displej",
  "auto.vypnout":     "Vypnout automatické ukládání",
  "auto.zapnout":     "Zapnout automatické ukládání",

  /* názvy sledovaných statistik */
  "stat.cap.obecne": "Obecné",
  "stat.cap.hry":    "Hry",
  "stat.cap.kola":   "Kola",
  "stat.cap.hody":   "Hody",
  "stat.cap.farkly": "Farkly",

  "stat.n.pocet":         "Odehráno her",
  "stat.n.denmax":        "Nejvíc her za den",
  "stat.n.soucet":        "Celkem nasbíráno bodů",
  "stat.n.maxbody":       "Nejvíc bodů — celkem",
  "stat.n.maxbodybody":   "Nejvíc bodů — hra na body",
  "stat.n.maxbodykola":   "Nejvíc bodů — hra na kola",
  "stat.n.prumer":        "Průměr na kolo — celkem",
  "stat.n.prumerbody":    "Průměr na kolo — hra na body",
  "stat.n.prumerkola":    "Průměr na kolo — hra na kola",
  "stat.n.maxhodu":       "Nejvíc hodů v jednom kole",
  "stat.n.nejlepsihod":     "Nejlepší hod",
  "stat.n.prumerhod":       "Průměrný hod — celkem",
  "stat.n.prumerhodbody":   "Průměrný hod — hra na body",
  "stat.n.prumerhodkola":   "Průměrný hod — hra na kola",
  "stat.n.minkol":        "Nejméně kol v jedné hře na body",
  "stat.n.maxkol":        "Nejvíc kol v jedné hře na body",
  "stat.n.nejlepsikolo":  "Nejlepší kolo",
  "stat.n.nejhorsikolo":  "Nejhorší kolo bez farklu",
  "stat.n.maxfarklu":     "Nejvíc farklů za hru",
  "stat.n.farkleprvni":    "Farklů prvním hodem",
  "stat.n.maxfarkleprvni": "Nejvíc farklů prvním hodem za hru",
  "stat.n.ztraceno":      "Nejvíc bodů ztraceno farklem",
  "stat.n.serie":         "Nejdelší série bez farklu",
  "stat.n.farkluhra":     "Farklů na hru",

  /* seznamy statistik a historie */
  "stat.filtrprazdno": "Tomuhle filtru neodpovídá žádná hra.",
  "stat.zadnahra":     "Zatím žádná dohraná hra. Hru zapíšeš do historie tlačítkem dole v Zápisu kol.",
  "stat.beznadat":     "Pro tuhle statistiku zatím nejsou data.",
  "stat.pocitam":      "Počítám…",
  "stat.kostek.vse":   "Vše",
  "hist.prazdna":      "Historie je prázdná. Dohranou hru do ní zapíšeš tlačítkem dole v Zápisu kol.",
  "hist.farklex":      "{n}\u00D7 farkle",
  "hist.hraz":         "Hra z {kdy}",
  "hist.nactamkola":   "Načítám kola\u2026",
  "hist.kolanejdou":   "Kola téhle hry se teď nedaří načíst.",
  "hist.zadnekolo":    "V téhle hře není zapsané žádné kolo.",
  "hist.smazat":       "Smazat z historie",
  "hist.opravdu":      "Opravdu smazat?",

  /* dolití dlouhého seznamu */
  "dalsi.dalsich":    "Zobrazit dalších {n}",
  "dalsi.zbyva":      "zbývá {n}",
  "dalsi.poslednich": "Zobrazit posledních {n}",

  /* lišta filtrů a okna filtrů */
  "filtr.typhry":     "Typ hry",
  "filtr.nabody":     "na body",
  "filtr.nakolan":    "na kola \u00B7 {n}",
  "filtr.bezlimitu":  "bez limitu",
  "datum.od":         "Od",
  "typ.limit":        "Limit",
  "typ.vsechny":      "Všechny",

  /* záloha a import */
  "zal.pripravuji":       "Připravuji zálohu\u2026",
  "zal.neslozit":         "Zálohu se nepodařilo složit — historie teď není dostupná.",
  "zal.opravdunahradit":  "Opravdu nahradit?",
  "zal.ukladase":         "Soubor se ukládá.",
  "zal.stazenineslo":     "Stažení se nepodařilo — zkus kopii do schránky.",
  "zal.veschrance":       "Záloha je ve schránce.",
  "zal.schrankaneslo":    "Do schránky se to nepodařilo zkopírovat — zkus Stáhnout soubor.",
  "zal.souborneslo":      "Soubor se nepodařilo přečíst.",
  "zal.poleprazdne":      "Pole je prázdné — vlož do něj text zálohy.",
  "zal.nerozumim.soubor": "Souboru nerozumím — chybí v něm datový řádek.",
  "zal.nerozumim.text":   "Textu nerozumím — chybí v něm datový řádek.",
  "zal.prazdno.soubor":   "V souboru není žádná hra.",
  "zal.prazdno.text":     "V textu není žádná hra.",
  "zal.info.soubor":      "V souboru {her}, z toho {nove}.",
  "zal.info.text":        "V textu {her}, z toho {nove}.",
  "zal.pridatn":          "Přidat {n}",
  "zal.nenicopridat":     "Není co přidat",
  "zal.pridano":          ["Přidána {n} hra.", "Přidány {n} hry.", "Přidáno {n} her."],
  "zal.nahrazeno":        "Historie nahrazena, {her}.",

  /* čitelná část souboru zálohy */
  "exp.nadpis":     "Kostky — záloha historie her",
  "exp.vytvoreno":  "vytvořeno {kdy}, her: {n}",
  "exp.souhrn":     "celkem {b}, nejlepší kolo {nej}, farklů {f}",
  "exp.mezisoucet": "celkem {b}",
  "exp.oddelovac":  "--- data pro import, nešahat ---",

  /* kompletní záloha a záloha herních režimů — vlastní marker, ne #DATA:,
     ale stejná kostra (čitelný text + JSON) jako záloha historie */
  "expplna.nadpis":     "Kostky — kompletní záloha",
  "expplna.vytvoreno":  "vytvořeno {kdy}, {her}, {rez}",
  "exprez.nadpis":      "Kostky — záloha herních režimů",
  "exprez.vytvoreno":   "vytvořeno {kdy}, {n}",
  "sdil.nadpis":        "Kostky — sdílené herní režimy",
  "sdil.vytvoreno":     "vytvořeno {kdy}, {n}",
  "zalplna.info.soubor":    "Soubor obsahuje {her} a {rez}.",
  "zalplna.info.text":      "Text obsahuje {her} a {rez}.",
  "zalplna.pridano":        "Přidáno: {her}, {rez}.",
  "zalplna.nahrazeno":      "Kompletní záloha nahrazena, {her}, {rez}.",
  "zalrez.info.soubor":     "Soubor obsahuje {rez}.",
  "zalrez.info.text":       "Text obsahuje {rez}.",
  "zalrez.nahrazeno":       "Herní režimy nahrazeny, {rez}.",
  "zal.rezimyzamceno":      "Nahradit herní režimy nejde uprostřed rozehrané hry. Dohraj nebo zruš hru a zkus to znovu.",

  /* zabrané místo */
  "misto.nezjistit":     "Velikost se nedaří zjistit.",
  "misto.zdostupnych":   "{u} z {q} dostupných",
  "misto.pocitam":       "Počítám\u2026",
  "misto.historie":      "Historie:",
  "misto.nezmeritmalo":  "velikost se nedaří zjistit",
  "misto.priblizne":     "přibližně {v}",
  "misto.zadnahra":      "zatím žádná hra",
  "misto.rozehrana":     "Rozehraná hra:",
  "misto.nezmerit":      "nedá se změřit",
  "misto.kose":          "Koše:",
  "misto.prazdne":       "prázdné",
  "misto.nastaveni":     "Nastavení a starší data:",
  "misto.aplikace":      "Aplikace:",
  "misto.offline":       "{v}, uložená pro běh offline",
  "misto.celkem":        "Celkem z této adresy:",
  "misto.trvale":        "Prohlížeč je označil za trvalá."
};
