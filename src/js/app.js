(function(){
  "use strict";

  /* ---------- jazyky ----------
     Čeština se do katalogu nepíše ručně. Statické texty zůstávají napsané
     přímo v <body> a při startu se z anotovaných prvků jednou seberou do
     I18N.cs — teprve pak se případně přepíšou. Diff v HTML je tak jen
     přidaný atribut, výchozí vykreslení je hotové bez záblesku prázdné
     stránky a návrat k češtině nepotřebuje reload.

     Texty, které vznikají až za běhu (seznamy her, žebříčky), do sběru
     nepatří — ty jdou přes t() a tn() a v katalogu stojí napsané. */
  var JAZYKY = ["cs", "en"];        /* pořadí v přepínači */
  var VYCHOZI = "cs";
  var JKEY = "farkle-jazyk-v1";
  var I18N = { cs: {}, en: {} };

  /* Názvy v přepínači jsou endonyma a do katalogu nepatří: vlastní jméno
     jazyka se nepřekládá, aby ho uživatel našel i v rozhraní, kterému
     nerozumí. Každý další jazyk sem přidá jednu dvojici. */
  var NAZVY = { cs: "Čeština", en: "English" };

  I18N.cs.plural = function(n){ return n === 1 ? 0 : ((n >= 2 && n < 5) ? 1 : 2); };
  I18N.en.plural = function(n){ return n === 1 ? 0 : 1; };

  /* ---------- čísla a data ----------
     toLocale* zůstává mimo hru: výstup by se lišil podle zařízení a font je
     subsetovaný. Formát proto řídí katalog a fmt(), dt(), dtDen() i
     desetina() si ho odsud tahají. Oddělovač tisíců, desetinná značka
     i tvary data tak leží na jednom místě. */
  I18N.cs.sep = "\u202F";        /* úzká nezlomitelná mezera */
  I18N.cs.des = ",";
  I18N.en.sep = ",";
  I18N.en.des = ".";
  function hodiny(d){ return d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2); }
  I18N.cs.datum    = function(d){ return d.getDate() + ". " + (d.getMonth() + 1) + ". " + d.getFullYear(); };
  I18N.cs.datumCas = function(d){ return I18N.cs.datum(d) + " \u00B7 " + hodiny(d); };
  /* Rozsah dnů se píše co nejúsporněji: shodné části se neopakují. */
  I18N.cs.datumRozsah = function(a, b){
    if(a.getFullYear() !== b.getFullYear()) return I18N.cs.datum(a) + " \u2013 " + I18N.cs.datum(b);
    if(a.getMonth() !== b.getMonth())
      return a.getDate() + ". " + (a.getMonth() + 1) + ". \u2013 " + I18N.cs.datum(b);
    return a.getDate() + ".\u2013" + I18N.cs.datum(b);
  };
  /* Anglické zkratky měsíců přidávají do textu jen znaky, které font už má.
     Každý další jazyk je nutné proti subsetu prověřit znovu. */
  var MESICE_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  I18N.en.datum    = function(d){ return MESICE_EN[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); };
  I18N.en.datumCas = function(d){ return I18N.en.datum(d) + " \u00B7 " + hodiny(d); };
  I18N.en.datumRozsah = function(a, b){
    if(a.getFullYear() !== b.getFullYear()) return I18N.en.datum(a) + " \u2013 " + I18N.en.datum(b);
    if(a.getMonth() !== b.getMonth())
      return MESICE_EN[a.getMonth()] + " " + a.getDate() + " \u2013 " + I18N.en.datum(b);
    return MESICE_EN[a.getMonth()] + " " + a.getDate() + " \u2013 " + b.getDate() + ", " + b.getFullYear();
  };

  var jazyk = VYCHOZI;

  /* Hodnoty se do textu doplňují pojmenovaně, ne zřetězením: pořadí čísel
     ve větě se jazyk od jazyka liší a slepené kousky by ho zafixovaly
     česky. Neznámý zástupný symbol zůstane, jak je — viditelná chyba je
     lepší než prázdné místo. */
  function vloz(text, hodnoty){
    if(!hodnoty) return text;
    return text.replace(/\{(\w+)\}/g, function(cely, jmeno){
      var v = hodnoty[jmeno];
      return (v === undefined || v === null) ? cely : String(v);
    });
  }
  /* Nenajde-li se klíč v jazyce, zkusí se čeština; nenajde-li se ani tam,
     vrátí se samotný klíč. Klíč v rozhraní je chyba, ale viditelná —
     lepší než prázdné místo. */
  function t(klic, hodnoty){
    var v = I18N[jazyk] && I18N[jazyk][klic];
    if(typeof v !== "string"){ v = I18N[VYCHOZI][klic]; }
    return vloz(typeof v === "string" ? v : klic, hodnoty);
  }
  /* Klíče s více tvary jsou pole. Tvar vybírá plural() toho jazyka, ze
     kterého pole nakonec pochází — jinak by propadlá česká trojice dostala
     anglické pravidlo a vyšlo by „5 kola". Jazyk s méně tvary, než jich
     klíč nabízí, bere poslední dostupný. Počet se do tvaru doplní sám
     jako {n}, aby si každý jazyk mohl číslo umístit po svém. */
  function tn(klic, n, hodnoty){
    var kod = (I18N[jazyk] && Array.isArray(I18N[jazyk][klic])) ? jazyk : VYCHOZI;
    var tvary = I18N[kod][klic];
    if(!Array.isArray(tvary) || !tvary.length) return klic;
    var i = I18N[kod].plural(n);
    var vse = { n: n }, k;
    if(hodnoty){ for(k in hodnoty){ if(Object.prototype.hasOwnProperty.call(hodnoty, k)) vse[k] = hodnoty[k]; } }
    return vloz(tvary[Math.min(Math.max(i, 0), tvary.length - 1)], vse);
  }
  /* Položky katalogu, které nejsou text (oddělovače, formátovače data),
     mají stejný propad do češtiny jako texty. */
  function kat(jmeno){
    var v = I18N[jazyk] && I18N[jazyk][jmeno];
    return v === undefined ? I18N[VYCHOZI][jmeno] : v;
  }

  /* ---------- ručně psaná čeština ----------
     Klíče, které se nemají z čeho sebrat: jejich text vzniká až za běhu
     v JS. Píšou se proto česky rovnou sem. Sběr z DOMu je nepřepíše — bere
     jen klíče, které ještě nemá — a proto tu nesmí stát klíč, který je
     zároveň anotovaný v <body>. Hlídá to strážní test, stejně jako to,
     že tu neleží klíč, který už nikdo nevolá. */
  var RUCNI = {
    /* společné */
    "spol.smazat":            "Smazat",
    "spol.obnovit":           "Obnovit",
    "spol.zapnuto":           "Zapnuto",

    /* slova s více tvary — {n} se doplní samo */
    "slovo.kolo":     ["{n} kolo", "{n} kola", "{n} kol"],
    "slovo.hra":      ["{n} hra", "{n} hry", "{n} her"],
    "slovo.nova":     ["{n} nová", "{n} nové", "{n} nových"],
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
    "komb.nevejde":     "víc kostek, než režim má",
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
    "stat.n.pocet":         "Odehráno her",
    "stat.n.denmax":        "Nejvíc her za den",
    "stat.n.soucet":        "Celkem nasbíráno bodů",
    "stat.n.maxbody":       "Nejvíc bodů za hru",
    "stat.n.maxbodybody":   "Nejvíc bodů — hra na body",
    "stat.n.maxbodykola":   "Nejvíc bodů — hra na kola",
    "stat.n.prumer":        "Celkový průměr na kolo",
    "stat.n.prumerbody":    "Průměr na kolo — hra na body",
    "stat.n.prumerkola":    "Průměr na kolo — hra na kola",
    "stat.n.maxhodu":       "Nejvíc hodů v jednom kole",
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
  for(var rucniKlic in RUCNI){
    if(Object.prototype.hasOwnProperty.call(RUCNI, rucniKlic)) I18N.cs[rucniKlic] = RUCNI[rucniKlic];
  }

  /* ---------- angličtina ----------
     Čeština se sbírá z <body> a doplňuje z RUCNI; každý další jazyk se píše
     celý sem. Klíče drží pořadí protějšku: nejdřív to, co stojí ve <body>,
     pak to, co vzniká za běhu. Strážní test hlídá, že katalog pokrývá
     češtinu klíč po klíči a že pole mají tvarů podle plural() daného jazyka.

     Čísla v pevných textech (tabulka pravidel, nabídka cílů) se nesázejí
     přes fmt() — jsou napsaná rovnou, a proto je tu oddělovač tisíců
     anglický. Formátovače dat a oddělovače pro fmt() leží výš u ostatních
     věcí, které textem nejsou. */
  var EN = {
    /* základní / rotace obrazovky */
    "titulek":  "Dice \u2014 counter",
    "wordmark": "Dice",
    "rot.nadpis": "Rotate your phone to portrait",
    "rot.text":   "The counter only works in portrait orientation.",

    /* nastavení hry */
    "hra.hrajese":   "playing",
    "hra.dobodu":    "to points",
    "hra.nakola":    "by turns",
    "hra.cil2000":   "2,000",
    "hra.cil4000":   "4,000",
    "hra.cil6000":   "6,000",
    "hra.cil8000":   "8,000",
    "hra.cil10000":  "10,000",
    "hra.vlastni":   "custom\u2026",
    "hra.neomezene": "unlimited",
    "hra.cil.aria":            "game goal",
    "hra.cilvlastni.aria":     "custom goal",
    "hra.limit.aria":          "round limit",
    "hra.limitvlastni.aria":   "custom round limit",

    /* záložky */
    "zalozka.pocitadlo":  "Counter",
    "zalozka.zapis":      "Turn log",
    "zalozka.statistiky": "Statistics",

    /* počítadlo */
    "pocitadlo.zapsano":       "banked",
    "pocitadlo.zbyva":         "remaining",
    "pocitadlo.zadat":         "enter",
    "pocitadlo.opravit":       "edit",
    "pocitadlo.zhodu":         "What you\u2019re keeping from the roll",
    "pocitadlo.stejne":        "Matching values",
    "pocitadlo.postupky":      "Straights",
    "pocitadlo.pridat":        "Add",
    "pocitadlo.hazetdal":      "Keep rolling",
    "pocitadlo.neuklada":      "Saving isn\u2019t working \u2014 the game in progress will be lost when you close the browser. Back up your history in Settings.",
    "pocitadlo.zpet":          "Undo",
    "pocitadlo.zapsatapredat": "Bank and pass",
    "pocitadlo.farkle":        "Farkle",
    "pocitadlo.body.ph":       "points",

    /* čipy klávesnice — malé písmeno stejně jako v češtině */
    /* Popisky čipů kombinací (2+2+2, 3+2, …) jsou jazykově neutrální a stojí
       v HTML bez anotace — překládají se jen názvy v nastavení a štítky
       v historii. */
    "pocitadlo.chip.rucne":    "custom",
    "pocitadlo.chip.rucnev":   "points",

    /* zápis kol */
    "zapis.nadpis":      "Turn log",
    "zapis.opravit":     "Edit",
    "zapis.prazdno":     "No turns yet. Roll all six dice.",
    "zapis.nicknulozeni": "Nothing to save to history yet",
    "zapis.novahra":     "New game",

    /* statistiky */
    "stat.nedostupna":     "History can\u2019t be loaded right now. Nothing has been lost \u2014 the app just can\u2019t reach it at the moment, so finished games aren\u2019t being saved yet. Try closing the app and opening it again.",
    "stat.seg.statistiky": "Statistics",
    "stat.seg.historie":   "Game history",
    "stat.zpetseznam":     "\u00AB Back",

    /* lišta filtrů */
    "filtr.datum":      "Date",
    "filtr.typ":        "Type",
    "filtr.razeni":     "Sort",
    "filtr.reset":      "Reset",
    "filtr.reset.aria": "Reset filters",

    /* pravidla */
    "pravidla.nadpis":        "Rules & how to play",
    "pravidla.seg.pravidla":  "Rules",
    "pravidla.seg.navod":     "How to play",

    /* návod */
    "rezim.n.kcd2":    "KCD",
    "rezim.n.klasika": "Classic farkle",
    "rezim.n.pet":     "Five dice",
    "rezim.pozn.kcd2":    "The weighted dice and badges from Kingdom Come: Deliverance II sit on top of the rules; the counter leaves them alone.",
    "rezim.pozn.klasika": "Piggyback is the same game with a different turn structure: instead of six fresh dice you may carry on from the dice and points the previous player left. Enter the points you take over by hand, with the <b>custom</b> chip.",
    "rezim.pozn.pet":     "Usually played to 5,000. Five of a kind on the first roll of a turn is often an instant win \u2014 keep an eye on that yourself, the counter doesn\u2019t know it.",
    "rezim.neznamy":   "unknown mode",
    "rezim.beznazvu":  "Custom mode",
    "rezim.postupek":  ["{n} straight", "{n} straights"],
    "rezim.kombinaci": ["{n} extra combination", "{n} extra combinations"],
    "rezim.pravidla":  "Rules",
    "rezim.upravit":   "Edit",
    "rezim.zvolit":    "Use this mode",
    "rezim.zvoleno":   "In use",
    "rezim.zamceno":   "The mode can only be switched before a game starts. Finish the game in progress, save it to the history and start a New game.",
    "rezim.strop":     "No more than {n} custom modes.",
    "rezim.opravdusmazat": "Really delete this mode?",
    "rezim.nesmazat":  "The mode in use can\u2019t be deleted. Pick another one first.",
    "rezim.nulaneboduje": "0 = doesn\u2019t score",
    "rezim.skupina.zapnout":  "Turn the whole group on",
    "rezim.skupina.vypnout":  "Turn the whole group off",
    "rezim.sam.n":     "A single die",
    "rezim.sam.p":     "What one die of that value is worth on its own.",
    "rezim.stej.2":    "Pairs",
    "rezim.stej.3":    "Three of a kind",
    "rezim.stej.4":    "Four of a kind",
    "rezim.stej.5":    "Five of a kind",
    "rezim.stej.6":    "Six of a kind",
    "rezim.stej.zapnout": "Turn matching numbers on",
    "rezim.stej.vypnout": "Turn matching numbers off",
    "rezim.rozs.zapnout": "Turn advanced mode on",
    "rezim.rozs.vypnout": "Turn advanced mode off",
    "rezim.aria.1":    "Points for a single {v}",
    "rezim.aria.2":    "Points for two {v}s",
    "rezim.aria.3":    "Points for three {v}s",
    "rezim.aria.4":    "Points for four {v}s",
    "rezim.aria.5":    "Points for five {v}s",
    "rezim.aria.6":    "Points for six {v}s",
    "rezim.nadn.3":    "Three or more of a kind",
    "rezim.nadn.4":    "Four or more of a kind",
    "rezim.nadn.5":    "Five or more of a kind",
    "rezim.nadn.6":    "Six of a kind",
    "rezim.zvolitkratce": "Use",
    "rezim.kopie":     "{n} (copy)",
    "rezim.dupl.n":    "Duplicate mode",
    "rezim.dupl.p":    "Makes a custom copy you can rebuild. The original stays as it is.",
    "rezim.dupl.btn":  "Duplicate",
    /* pás na spodní hraně detailu režimu — angličtina píše procento bez mezery */
    "rezim.riziko.n":  "Farkle risk",
    "rezim.riziko.pol": "{n}: {p}%",
    "rezim.riziko.pocita": "calculating…",
    "rezim.nad.info":  "What those rules mean",
    "rezim.nad.napoveda": "Say the highest group set is three of a kind and three 5s are worth 500. <b>Doubles</b>: four 5s 1,000, five 2,000, six 4,000. <b>Multiplies the group</b>: four 5s 1,000, five 1,500, six 2,000. <b>Fixed points</b>: the numbers below apply whatever the value.",
    "rezim.nadaria":   "Points for {n} of a kind",
    "rezim.nadpis":    "Game mode",
    "rezim.novy.n":    "Custom mode",
    "rezim.novy.p":    "Starts from the KCD rules and can be rebuilt completely.",
    "rezim.novy.btn":  "Add",
    "rezim.zpetseznam": "\u00AB Back",
    "rezim.nazev.n":   "Name",
    "rezim.nazev.p":   "The history shows the mode under this name.",
    "rezim.kostek.n":  "Number of dice",
    "rezim.kostek.p":  "How many dice you roll at the start of a turn and after hot dice.",
    "rezim.cap.post":  "Straights",
    "rezim.cap.sam":   "Single dice",
    "rezim.cap.stejna": "Matching numbers",
    "rezim.cap.vlastni": "Custom combinations",
    "rezim.cap.nastaveni": "Settings",
    "rezim.rozs.n":    "Advanced mode",
    "rezim.rozs.p":    "Splits matching numbers into pairs, triples, quads, quints and sextets separately.",
    "rezim.prah.n":    "From how many dice",
    "rezim.prah.p":    "How many matching numbers have to come up before they can be set aside.",
    "rezim.nad.n":     "Rule above the highest group",
    "rezim.nad.p":     "What each further die above the highest group set does.",
    "rezim.nad.x2":    "doubles",
    "rezim.nad.nasobek": "multiplies the group",
    "rezim.nad.pevne": "fixed points",
    "rezim.vychozi.n": "Restore defaults",
    "rezim.vychozi.p": "Throws away every change made to this mode.",
    "rezim.vychozi.btn": "Restore",
    "rezim.smazat.n":  "Delete mode",
    "rezim.smazat.p":  "Games already in the history keep their name.",

    "pravidla.p1":    "You roll {kostky} and set aside at least one scoring die or combination. If the roll scores nothing at all, it\u2019s a <b>Farkle</b> \u2014 everything you have on the table this turn is lost and the turn passes on.",
    "pravidla.p2":    "After every roll you decide: <b>bank</b> the points and pass the turn, or <b>keep rolling</b> with just the dice you haven\u2019t set aside.",
    "pravidla.p3":    "Set aside even the last die and you get <b>hot dice</b> \u2014 you roll {kostky} again and the points keep adding up in the same turn.",
    "pravidla.sam.1": "Every 1",
    "pravidla.sam.2": "Every 2",
    "pravidla.sam.3": "Every 3",
    "pravidla.sam.4": "Every 4",
    "pravidla.sam.5": "Every 5",
    "pravidla.sam.6": "Every 6",
    "pravidla.dvoj.1": "Two 1s",
    "pravidla.dvoj.2": "Two 2s",
    "pravidla.dvoj.3": "Two 3s",
    "pravidla.dvoj.4": "Two 4s",
    "pravidla.dvoj.5": "Two 5s",
    "pravidla.dvoj.6": "Two 6s",
    "pravidla.t4n":   "Three 2s / 3s / 4s / 5s / 6s",
    "pravidla.troj.1": "Three 1s",
    "pravidla.troj.2": "Three 2s",
    "pravidla.troj.3": "Three 3s",
    "pravidla.troj.4": "Three 4s",
    "pravidla.troj.5": "Three 5s",
    "pravidla.troj.6": "Three 6s",
    "pravidla.stejnych.3": "Three of a kind",
    "pravidla.stejnych.4": "Four of a kind",
    "pravidla.stejnych.5": "Five of a kind",
    "pravidla.stejnych.6": "Six of a kind",
    "pravidla.post.15": "1\u20135 straight",
    "pravidla.post.26": "2\u20136 straight",
    "pravidla.post.16": "1\u20136 straight",
    "pravidla.nicneboduje": "Nothing scores in this mode",
    "pravidla.pozn2": "\u201CAlmost\u201D counts for nothing \u2014 you can only set aside what the table lists whole.",

    "komb.nevejde":   "more dice than the mode has",
    "pocitadlo.postupkykomb": "Straights and combinations",
    "pocitadlo.kombinace":    "Combinations",
    "stat.n.rezim":   "Most played mode",

    "navod.kolo.h":   "Turn",
    "navod.kolo.p":   "The keypad records what you set aside from the roll. Points add up in the <b>table</b> row and the dice you used drop out of the remaining ones.",
    "navod.kolo.li1": "<b>Keep rolling</b> \u2014 opens a new roll and its label says how many dice with. Once all six are set aside, it offers hot dice and you roll all six again.",
    "navod.kolo.li2": "<b>Bank</b> \u2014 moves the points from the table into the score and opens a new turn.",
    "navod.kolo.li3": "<b>Farkle</b> \u2014 the points on the table are lost and the log keeps a turn worth zero.",
    "navod.klavesnice.h":    "Keypad",
    "navod.klavesnice.p":    "<b>single 1</b> and <b>single 5</b> add one die at a time. <b>Matching values</b> take the count in the first row and the value in the second; the button on the right shows the result and adds it. <b>Straights</b> are three fixed combinations. <b>manual</b> opens a field for points and arrows for the number of dice.",
    "navod.klavesnice.pozn": "Combinations that don\u2019t fit into the remaining dice are greyed out.",
    "navod.opravy.h":  "Corrections",
    "navod.opravy.p1": "The <b>enter / edit</b> switch beside the roll description flips the inner card of the panel. The <i>edit</i> card shows every set-aside item as a button with a cross, grouped by rolls; deleting an item also recounts the dice in the rolls that follow.",
    "navod.opravy.p2": "<b>Undo</b> takes back one step at a time from the end of the current turn \u2014 items first, then whole rolls. It doesn\u2019t touch banked turns; once nothing is left in the turn, the button greys out.",
    "navod.opravy.p3": "<b>Edit</b> in the Turn log switches on the crosses beside individual turns. A cross asks for confirmation; a deleted turn is subtracted from the score and the remaining turns are renumbered. With no turns played the button is hidden.",
    "navod.hra.h": "Game settings",
    "navod.hra.p": "The dice icon opens the panel with the mode and the target, even in the middle of a game. <b>To points</b> plays to 2,000 up to 10,000 or to a number of your own, and the second row of the score shows how much is left. The turn that crosses the target counts in full; once it is banked, the game is over. <b>By turns</b> only counts turns; an optional limit locks the game after the last one, without a limit the game never ends by itself.",
    "navod.rezimy.h":  "Game modes",
    "navod.rezimy.p1": "Farkle is played in several versions and each one scores differently. The <b>game mode</b> in the settings holds the whole table: how many dice you roll, what a single 1, a single 5 and each three of a kind are worth, what the fourth and further matching dice do, which straights score and which extra combinations are on. Three come ready-made \u2014 <i>KCD</i>, <i>Classic farkle</i> and <i>Five dice</i>; you can add twenty of your own and rebuild any of them completely.",
    "navod.rezimy.p2": "<b>Rules</b> next to a mode shows its table, <b>Edit</b> opens its settings and <b>Use this mode</b> puts it into play. Extra combinations and custom patterns always belong to one mode, not to the app \u2014 switching modes swaps them too.",
    "navod.rezimy.p3": "The mode can only be switched with nothing in progress: one turn scored under one set of rules and the next under another would add up to nothing meaningful. So finish the game in progress and start a <b>New game</b>. Every game carries its mode into the history, and the <i>Most played mode</i> statistic counts which one wins.",
    "navod.stranky.h":   "Three pages",
    "navod.stranky.p":   "The tabs at the top and a swipe sideways switch between:",
    "navod.stranky.li1": "<b>Counter</b> \u2014 the score and the playing.",
    "navod.stranky.li2": "<b>Turn log</b> \u2014 four figures and the table of turns, New game and Save to history.",
    "navod.stranky.li3": "<b>Statistics</b> \u2014 a switch between the records and the list of finished games. A record opens into a leaderboard, a game into its detail.",
    "navod.historie.h":  "History",
    "navod.historie.p1": "The statistics come only from games in history; a game you don\u2019t save leaves no mark on the records.",
    "navod.historie.p2": "<b>Save to history</b> asks for a second tap only when there are unbanked points on the table. Once saved it turns into <b>Saved to history</b>, and after more play into <b>Update in history</b>, which overwrites the same record instead of starting a new one. If that game gets deleted from history in the meantime, the button offers <b>Restore to history</b> \u2014 it brings the same record back from the trash, so a game is never written down twice.",
    "navod.historie.p3": "<b>Autosave</b> in the settings writes the game into history by itself as soon as it ends \u2014 after the last turn, or after the turn that crosses the target. A little window that disappears on its own announces it. A game on an unlimited number of turns can\u2019t be saved this way, because it has no end. What was deleted from history by hand, autosave never brings back.",
    "navod.kos.h":  "Trash",
    "navod.kos.p1": "<b>New game</b> puts the deleted game into the settings, into <i>Deleted games in progress</i> \u2014 the last five are kept. <b>Delete from history</b> puts the game into <i>Games deleted from history</i>, where ten of them stay. In both sections the <i>Restore</i> button brings a game back; <i>Delete permanently</i> throws it away for good once confirmed.",
    "navod.kos.p2": "When a game isn\u2019t in history yet, <b>New game</b> asks once more after the confirmation and offers to save it right away.",
    "navod.zaloha.h": "Backup",
    "navod.zaloha.p": "The data lives only in this browser. <b>Export to file</b> makes a text file with an overview of the games whose last line carries the data for the import \u2014 without it the file can\u2019t be read back. <b>Copy to clipboard</b> gives the same content without downloading. Both <b>Import from file</b> and <b>Import from clipboard</b> offer a choice between adding the new games and replacing the whole history.",
    "navod.drobnosti.h": "Odds and ends",
    "navod.drobnosti.p": "The icon in the top right switches the light and dark look. <b>Full screen</b> in the settings hides the browser bars; on an iPhone it isn\u2019t there, Safari can\u2019t do it. <b>Keep screen on</b> in the same place holds the screen lit while the game runs; after three minutes without a touch it lets go and the phone goes dark as usual. The app works offline and can be added to the home screen.",

    /* nastavení */
    "nast.nadpis":        "Settings",
    "nast.jazyk.n":       "Language",
    "nast.jazyk.p":       "Changes at once, without restarting the app.",
    "nast.jazyk.aria":    "Interface language",
    "nast.fs.n":          "Full screen",
    "nast.fs.p":          "Hides the browser bars.",
    "nast.vypnuto":       "Off",
    "nast.svit.n":        "Keep screen on",
    "nast.svit.p":        "The screen stays lit while the app is in use. After three minutes without a touch it lets go and the phone goes dark as usual.",
    "nast.auto.n":        "Autosave",
    "nast.auto.p":        "Writes the game into history as soon as it ends. A game on an unlimited number of turns isn\u2019t saved automatically.",
    "nast.koshry":        "Deleted games in progress",
    "nast.koshist":       "Games deleted from history",
    "nast.zaloha":        "History backup",
    "nast.exp.n":         "Export to file",
    "nast.exp.p":         "A text file with an overview of the games and the data for a later import.",
    "nast.exp.btn":       "Save",
    "nast.kop.n":         "Copy to clipboard",
    "nast.kop.p":         "In case downloading doesn\u2019t work.",
    "nast.kop.btn":       "Copy",
    "nast.impf.n":        "Import from file",
    "nast.impf.p":        "Reads a backup and offers to add or to replace.",
    "nast.impf.btn":      "Choose file",
    "nast.imps.n":        "Import from clipboard",
    "nast.imps.p":        "Paste the backup text into the field and read it in.",
    "nast.imps.btn":      "Paste text",
    "nast.vlozit.ph":     "Paste the copied backup here",
    "nast.nacist":        "Load",
    "nast.pridatnove":    "Add new",
    "nast.nahraditvse":   "Replace all",
    "nast.seg.obecne":    "General",
    "nast.seg.rezimy":    "Game modes",
    "nast.komb":          "Extra combinations",
    "komb.novy.n":        "Custom combination",
    "komb.novy.p":        "Tapped in die by die; it can score through several patterns at once.",
    "komb.novy.btn":      "Add",
    "komb.nazev.n":       "Name",
    "komb.nazev.p":       "The chip and the rules show the combination under this name.",
    "komb.cap.vzory":     "Patterns",
    "komb.cap.novyvzor":  "New pattern",
    "komb.zpetrezim":     "« Back",
    "komb.pridatvzor":    "Add pattern",
    "komb.cap.cisla":     "Exact values",
    "komb.cap.pismena":   "Any, but matching",
    "komb.pismena.p":     "The same letter means the same value. Each letter lands on a different value, and on a different one than the numbers in the pattern.",
    "komb.vymazat":       "Clear",
    "nast.misto.n":       "Storage used",
    "nast.misto.zjistuji": "Checking\u2026",
    "nast.misto.btn":     "Detail",

    /* okna filtrů a nové hry */
    "datum.nadpis":     "Filter by date",
    "datum.jedenden":   "One day",
    "datum.rozsah":     "Range",
    "datum.den":        "Day",
    "datum.do":         "To",
    "typ.nadpis":       "Filter by game type",
    "typ.vse":          "All",
    "typ.nabody":       "To points",
    "typ.nakola":          "By turns",
    "typ.cil":          "Target",
    "razeni.nadpis":    "Sort history",
    "razeni.nejnovejsi": "Newest first",
    "razeni.nejstarsi": "Oldest first",
    "razeni.nejvic":    "Most points first",
    "razeni.nejmin":    "Fewest points first",
    "nova.nadpis":      "The game isn\u2019t saved",
    "nova.ulozit":      "Save and start a new one",
    "nova.bezulozeni":  "Start a new one without saving",

    /* společné */
    "spol.zpet":    "Back",
    "spol.zrusit":  "Cancel",
    "spol.pouzit":  "Apply",
    "spol.zavrit":  "Close",
    "spol.smazat":  "Delete",
    "spol.obnovit": "Restore",
    "spol.zapnuto": "On",

    /* hlavička okna */
    "hlav.nastavenihry": "Game settings",
    "hlav.pravidla":     "Rules",
    "hlav.nastaveni":    "Settings",
    "hlav.svetlyrezim":  "Light mode",
    "hlav.tmavyrezim":   "Dark mode",

    /* slova s více tvary — angličtina má dva */
    "slovo.kolo":     ["{n} turn", "{n} turns"],
    "slovo.hra":      ["{n} game", "{n} games"],
    "slovo.nova":     ["{n} new", "{n} new"],
    "slovo.kostkami": ["{n} die", "{n} dice"],
    "slovo.kostek":   ["{n} die", "{n} dice"],
    "slovo.farkle":   "farkle",

    /* štítky odložených položek */
    "stitek.j":   "single 1",
    "stitek.p":   "single 5",
    "stitek.d2":  "single 2",
    "stitek.d3":  "single 3",
    "stitek.d4":  "single 4",
    "stitek.d6":  "single 6",
    "stitek.v":   "custom",
    "stitek.s15": "1\u20135 straight",
    "stitek.s26": "2\u20136 straight",
    "stitek.s16": "1\u20136 straight",
    "stitek.n":   "{p}\u00D7 {h}",

    "stitek.c2p": "two pairs",
    "stitek.c3p": "three pairs",
    "stitek.c32": "triple and pair",
    "stitek.c33": "two triples",
    "stitek.c42": "quad and pair",
    "stitek.k":   "custom {b} · {d}",

    /* režim hry */
    "typhry.dobodu":      "to {b}",
    "typhry.nakola":      "by turns",
    "typhry.nakolalimit": "by turns \u00B7 limit {n}",

    /* počítadlo za běhu */
    "pocitadlo.kolonastole": "Turn {n} \u2014 on the table",
    "pocitadlo.odehranokol": "turns played",
    "pocitadlo.nadcil":      "over target",
    "pocitadlo.zkol":        "{n} of {z}",
    "pocitadlo.hodradek":    "Roll {n} \u2014 rolling <b>{kostky}</b>",
    "pocitadlo.hodzbyva":    "\u00B7 {n} left",
    "pocitadlo.hraskoncila": "Game over \u2014 show the turn log",
    "pocitadlo.nejdriv":     "Set something aside from the roll first",
    "pocitadlo.hazetdalx":   "Keep rolling \u2014 {kostky}",
    "pocitadlo.horke":       "Hot dice \u2014 roll all six again",
    "pocitadlo.zapsatx":     "Bank {b}",
    "pocitadlo.plus":        "+ {b}",
    "pocitadlo.kostzkr":     ["{n} die", "{n} dice"],
    "pocitadlo.konecbody":   "The target of {b} is reached \u2014 the game is over. The target can be changed in the game settings.",
    "pocitadlo.koneckola":   "All {n} turns are played \u2014 the game is over. The number of turns can be changed in the game settings.",

    /* riziko farklu na tlačítku Farkle — angličtina píše procento bez mezery */
    "pocitadlo.farkleriziko": "risk {p}%",

    /* kombinace navíc v nastavení */
    "komb.zapnout":       "Turn the combination on",
    "komb.vypnout":       "Turn the combination off",
    "komb.sazba":         "Points for the combination",
    "komb.zadne":         "No custom combination yet.",
    "komb.naukej":        "Tap in the dice the combination is made of.",
    "komb.strop":         "No more than {n} custom combinations.",
    "komb.opravdusmazat": "Really delete the combination?",
    "komb.vychozin":      "Combination {n}",
    "komb.beznazvu":      "Custom combination",
    "komb.body.n":        "Points",
    "komb.body.p":        "Worth the same whichever pattern lands.",
    "komb.stav.n":        "State",
    "komb.stav.p":        "A combination that is off leaves the keypad and doesn\u2019t change the farkle risk.",
    "komb.smazat.n":      "Delete combination",
    "komb.smazat.p":      "Games already in the history keep their label.",
    "komb.opravdusmazatvzor": "Really delete this pattern?",
    "komb.stropvzoru":    "No more than {n} patterns in one combination.",
    "komb.vyberkostek":   "how many dice?",

    /* slovník pro nazevTvaru() — musí vyrobit i názvy presetů:
       three pairs, triple and pair, two triples, quad and pair */


    /* vrubovka */
    "tally.kolzn":     "turns played: {n} of {z}",
    "tally.koln":      "turns played: {n}",
    "tally.zadnekolo": "no turns yet",
    "tally.docile":    "{b} left to the target",
    "tally.prekonano": "target beaten by {b}",

    /* karta opravit a tabulka kol */
    "oprava.nic":           "Nothing recorded in this turn yet.",
    "oprava.hod":           "roll {n} \u00B7 {k}d",
    "oprava.horke":         "hot",
    "oprava.smazatpolozku": "Delete item",
    "zapis.hotovo":         "Done",
    "zapis.opravdusmazat":  "Really delete turn {n}?",
    "zapis.smazatkolo":     "Delete turn {n}",

    /* přehledové dlaždice */
    "souhrn.celkem":   "total",
    "souhrn.nejlepsi": "best",
    "souhrn.prumer":   "average",
    "souhrn.farklu":   "farkles",

    /* tlačítko zápisu do historie */
    "arch.propadne":     "There is {b} on the table and it will be lost \u2014 bank it?",
    "arch.obnovit":      "Restore to history",
    "arch.ulozeno":      "Saved to history",
    "arch.aktualizovat": "Update in history",
    "arch.zapsat":       "Save to history",

    /* hlášky o selhání zápisu */
    "chyba.mistoulozit":  "Couldn\u2019t save \u2014 out of storage",
    "chyba.mistosmazat":  "Couldn\u2019t delete \u2014 out of storage",
    "chyba.nedostupna":   "History isn\u2019t available right now",
    "chyba.zalohovathru": "Couldn\u2019t back up the game in progress",
    "chyba.smazat":       "Couldn\u2019t delete",
    "chyba.dokose":       "Couldn\u2019t move to the trash",

    /* koš */
    "kos.opravdutrvale": "Delete permanently?",
    "kos.trvalesmazat":  "Delete permanently",
    "kos.prazdny":       "Nothing to restore yet. A game deleted with the New game button lands here by itself.",
    "kos.prazdnyhist":   "Nothing to restore yet. A game deleted from history lands here by itself.",

    /* nová hra */
    "nova.nezalohovano": "Couldn\u2019t back it up \u2014 the game stays",
    "nova.opravdu":      "Really a new one?",
    "nova.text":         "This game isn\u2019t in history yet, so it won\u2019t count towards the statistics. " +
                         "A new game puts it into the settings, among the deleted games in progress \u2014 the last five are kept.",
    "nova.propadne":     "There is {b} on the table and it will be lost.",

    /* bublina */
    "toast.aktualizovan": "Record in history updated",
    "toast.ulozena":      "Game saved to history",

    /* stavové popisky přepínačů */
    "fs.zpet":         "Leave full screen",
    "fs.zapnout":      "Full screen",
    "svit.nechat":     "Let the screen go dark",
    "svit.nezhasinat": "Keep screen on",
    "auto.vypnout":    "Turn autosave off",
    "auto.zapnout":    "Turn autosave on",

    /* názvy sledovaných statistik */
    "stat.n.pocet":        "Games played",
    "stat.n.denmax":       "Most games in a day",
    "stat.n.soucet":       "Points collected in total",
    "stat.n.maxbody":      "Most points in a game",
    "stat.n.maxbodybody":  "Most points \u2014 game to points",
    "stat.n.maxbodykola":  "Most points \u2014 game by turns",
    "stat.n.prumer":       "Overall average per turn",
    "stat.n.prumerbody":   "Average per turn \u2014 game to points",
    "stat.n.prumerkola":   "Average per turn \u2014 game by turns",
    "stat.n.maxhodu":      "Most rolls in one turn",
    "stat.n.minkol":       "Fewest turns in one game to points",
    "stat.n.maxkol":       "Most turns in one game to points",
    "stat.n.nejlepsikolo": "Best turn",
    "stat.n.nejhorsikolo": "Worst turn without a farkle",
    "stat.n.maxfarklu":    "Most farkles in a game",
    "stat.n.farkleprvni":    "First-roll farkles in total",
    "stat.n.maxfarkleprvni": "Most first-roll farkles in a game",
    "stat.n.ztraceno":     "Most points lost to a farkle",
    "stat.n.serie":        "Longest run without a farkle",
    "stat.n.farkluhra":    "Farkles per game",

    /* seznamy statistik a historie */
    "stat.filtrprazdno": "No game matches this filter.",
    "stat.zadnahra":     "No finished game yet. A game goes into history with the button at the bottom of the Turn log.",
    "stat.beznadat":     "There is no data for this statistic yet.",
    "hist.prazdna":      "History is empty. A finished game goes into it with the button at the bottom of the Turn log.",
    "hist.farklex":      "{n}\u00D7 farkle",
    "hist.hraz":         "Game from {kdy}",
    "hist.nactamkola":   "Loading turns\u2026",
    "hist.kolanejdou":   "The turns of this game can\u2019t be loaded right now.",
    "hist.zadnekolo":    "No turn is recorded in this game.",
    "hist.smazat":       "Delete from history",
    "hist.opravdu":      "Really delete?",

    /* dolití dlouhého seznamu */
    "dalsi.dalsich":    "Show {n} more",
    "dalsi.zbyva":      "{n} left",
    "dalsi.poslednich": "Show the last {n}",

    /* lišta filtrů za běhu */
    "filtr.typhry":    "Game type",
    "filtr.nabody":    "to points",
    "filtr.nakolan":   "by turns \u00B7 {n}",
    "filtr.bezlimitu": "no limit",
    "datum.od":        "From",
    "typ.limit":       "Limit",
    "typ.vsechny":     "All",

    /* záloha a import */
    "zal.pripravuji":       "Preparing the backup\u2026",
    "zal.neslozit":         "The backup couldn\u2019t be put together \u2014 history isn\u2019t available right now.",
    "zal.opravdunahradit":  "Really replace?",
    "zal.ukladase":         "The file is being saved.",
    "zal.stazenineslo":     "The download failed \u2014 try the copy to the clipboard.",
    "zal.veschrance":       "The backup is on the clipboard.",
    "zal.schrankaneslo":    "Copying to the clipboard failed \u2014 try Export to file.",
    "zal.souborneslo":      "The file couldn\u2019t be read.",
    "zal.poleprazdne":      "The field is empty \u2014 paste the backup text into it.",
    "zal.nerozumim.soubor": "The file makes no sense \u2014 the data line is missing.",
    "zal.nerozumim.text":   "The text makes no sense \u2014 the data line is missing.",
    "zal.prazdno.soubor":   "There is no game in the file.",
    "zal.prazdno.text":     "There is no game in the text.",
    "zal.info.soubor":      "The file holds {her}, {nove} of them.",
    "zal.info.text":        "The text holds {her}, {nove} of them.",
    "zal.pridatn":          "Add {n}",
    "zal.nenicopridat":     "Nothing to add",
    "zal.pridano":          ["{n} game added.", "{n} games added."],
    "zal.nahrazeno":        "History replaced, {her}.",

    /* čitelná část souboru zálohy */
    "exp.nadpis":     "Dice \u2014 backup of the game history",
    "exp.vytvoreno":  "created {kdy}, games: {n}",
    "exp.souhrn":     "total {b}, best turn {nej}, farkles {f}",
    "exp.mezisoucet": "total {b}",
    "exp.oddelovac":  "--- data for the import, do not touch ---",

    /* zabrané místo */
    "misto.nezjistit":    "The size can\u2019t be found out.",
    "misto.zdostupnych":  "{u} of {q} available",
    "misto.pocitam":      "Counting\u2026",
    "misto.historie":     "History:",
    "misto.nezmeritmalo": "the size can\u2019t be found out",
    "misto.priblizne":    "about {v}",
    "misto.zadnahra":     "no game yet",
    "misto.rozehrana":    "Game in progress:",
    "misto.nezmerit":     "can\u2019t be measured",
    "misto.kose":         "Trash:",
    "misto.prazdne":      "empty",
    "misto.nastaveni":    "Settings and older data:",
    "misto.aplikace":     "App:",
    "misto.offline":      "{v}, kept for running offline",
    "misto.celkem":       "Total from this address:",
    "misto.trvale":       "The browser has marked it as permanent."
  };
  for(var enKlic in EN){
    if(Object.prototype.hasOwnProperty.call(EN, enKlic)) I18N.en[enKlic] = EN[enKlic];
  }

  function primarni(kod){ return String(kod || "").toLowerCase().split("-")[0]; }
  function zeSystemu(){
    var seznam = [];
    try{
      if(navigator.languages && navigator.languages.length){ seznam = [].slice.call(navigator.languages); }
      else if(navigator.language){ seznam = [navigator.language]; }
    }catch(e){}
    for(var i = 0; i < seznam.length; i++){
      var p = primarni(seznam[i]);
      if(JAZYKY.indexOf(p) >= 0) return p;
    }
    return VYCHOZI;
  }
  /* Při startu se do localStorage nic nezapisuje. Dokud uživatel nesáhne na
     přepínač, aplikace každý start následuje systém; uložený nesmysl se
     ignoruje a propadne se na systém. */
  function zjistiJazyk(){
    var ulozeny = null;
    try{ ulozeny = localStorage.getItem(JKEY); }catch(e){}
    if(ulozeny && JAZYKY.indexOf(ulozeny) >= 0) return ulozeny;
    return zeSystemu();
  }

  var ANOTACE = [
    { atr: "data-i18n",       cil: "text" },
    { atr: "data-i18n-html",  cil: "html" },
    { atr: "data-i18n-aria",  cil: "aria-label" },
    { atr: "data-i18n-title", cil: "title" },
    { atr: "data-i18n-ph",    cil: "placeholder" }
  ];
  function projdiAnotace(fn){
    for(var i = 0; i < ANOTACE.length; i++){
      var a = ANOTACE[i];
      var prvky = document.querySelectorAll("[" + a.atr + "]");
      for(var j = 0; j < prvky.length; j++){
        fn(prvky[j], a.cil, prvky[j].getAttribute(a.atr));
      }
    }
  }
  function ctiText(el, cil){
    if(cil === "text") return el.textContent;
    if(cil === "html") return el.innerHTML;
    return el.getAttribute(cil) || "";
  }
  function pisText(el, cil, text){
    if(cil === "text"){ el.textContent = text; return; }
    if(cil === "html"){ el.innerHTML = text; return; }
    el.setAttribute(cil, text);
  }
  /* Sběr běží jen jednou. Kdyby se pustil podruhé, sebral by už přeložený
     text a čeština by se ztratila. */
  var sebrano = false;
  function sberCestinu(){
    if(sebrano) return;
    sebrano = true;
    projdiAnotace(function(el, cil, klic){
      if(typeof I18N.cs[klic] === "string") return;   /* první výskyt vyhrává */
      I18N.cs[klic] = ctiText(el, cil);
    });
  }
  function prelozStatiku(){
    projdiAnotace(function(el, cil, klic){ pisText(el, cil, t(klic)); });
  }
  /* Statické texty přepíše prelozStatiku(), ale to, co se skládá až za běhu
     (počítadlo, statistiky, historie, stavové popisky tlačítek), se musí
     překreslit vlastní funkcí. Registr existuje proto, aby nastavJazyk()
     nemusel znát jméno každé z nich — přibývající místa se jen přiregistrují.
     Při startu je registr prázdný, takže první volání nic nespouští a pořadí
     inicializace zůstává beze změny. */
  var PREKRESLI = [];
  function naJazyk(fn){ PREKRESLI.push(fn); }
  function prekresliVse(){
    for(var i = 0; i < PREKRESLI.length; i++){
      /* jedno rozbité překreslení nesmí shodit zbytek ani nechat aplikaci
         napůl přepnutou */
      try{ PREKRESLI[i](); }catch(e){}
    }
  }
  function nastavJazyk(kod, ulozit){
    jazyk = (JAZYKY.indexOf(kod) >= 0) ? kod : VYCHOZI;
    if(ulozit){ try{ localStorage.setItem(JKEY, jazyk); }catch(e){} }
    document.documentElement.lang = jazyk;
    prelozStatiku();
    prekresliVse();
  }

  sberCestinu();
  nastavJazyk(zjistiJazyk(), false);

  /* Sonda pro testy: katalog žije uvnitř uzávěru a sady se k němu jinak
     nedostanou. Aplikace ji sama nepoužívá. */
  try{
    window.__i18n = { I18N: I18N, JAZYKY: JAZYKY, VYCHOZI: VYCHOZI, NAZVY: NAZVY,
                      RUCNI: RUCNI, t: t, tn: tn, kat: kat,
                      kod: function(){ return jazyk; } };
  }catch(e){}

  /* ---------- stav ----------
     rolls = hody v rozehraném kole, poslední je ten, který právě řeším
     roll  = { thrown: kolika kostkami se hází, hot: bool, items: [...] }  */
  /* Herní režim ve stavu není: jeho jedinou pravdou je REZIMY.akt. Dvě
     proměnné na tutéž věc by se dřív nebo později rozešly, a rozejít se
     nemají — přepnout režim jde jen nad prázdnou hrou. Do záznamu se režim
     dopisuje až v snapshot(). */
  var S = { mode:"points", goal:4000, roundGoal:null, banked:0, turns:[],
            rolls:[{thrown:6, hot:false, items:[]}], archivedId:null, dirty:false,
            autoUlozeno:false };

  var KEY  = "farkle-solo-v3";   /* rozehraná hra */
  var HKEY = "farkle-hist-v1";   /* dohrané hry */
  var KKEY = "farkle-kos-v1";    /* neviditelná záloha přepsaných her */
  var KHKEY = "farkle-koshist-v1"; /* hry smazané z historie */
  var KOS_MAX = 5;
  var KOSH_MAX = 10;
  /* Když ukládání nefunguje (soukromé okno, plné úložiště), uživatel se to dnes
     dozvěděl až tím, že po zavření prohlížeče byla hra pryč. Příznak se proto
     zvedne při prvním selhání a pruh v panelu kola zmizí, až se zápis povede.
     Pruh nastavuje ukazNeukladame() přímo, ne přes render() — render() volá
     save(), takže by vznikla smyčka. */
  var neukladame = false;
  function save(){
    try{
      localStorage.setItem(KEY, JSON.stringify(S));
      if(neukladame){ neukladame = false; ukazNeukladame(); }
      return true;
    }catch(e){
      if(!neukladame){ neukladame = true; ukazNeukladame(); }
      return false;
    }
  }
  function ukazNeukladame(){
    var el = document.getElementById("nosave");
    if(!el) return;
    el.hidden = !neukladame;
  }
  /* pozor: níže v souboru je jiná cislo() pro formátování statistik */
  function naCislo(x, nahrada){ return (typeof x === "number" && isFinite(x)) ? x : nahrada; }

  /* Uložený stav se nekontroluje jen povrchně: chybějící turns nebo items
     dřív shodily render() a aplikace zůstala bez ovládání, ze kterého se
     nedalo dostat ani do nastavení a vyexportovat data. Proto se každé pole
     dorovná na správný typ. Volá se vždy, i pro výchozí stav. */
  function ozdrav(){
    S.mode = (S.mode === "rounds") ? "rounds" : "points";
    S.banked = naCislo(S.banked, 0);
    S.goal = (typeof S.goal === "number" && S.goal > 0) ? S.goal : 4000;
    if(typeof S.roundGoal !== "number" || S.roundGoal < 1){ S.roundGoal = null; }
    if(typeof S.archivedId !== "string"){ S.archivedId = null; }
    S.dirty = !!S.dirty;
    S.autoUlozeno = !!S.autoUlozeno;

    S.turns = (Array.isArray(S.turns) ? S.turns : []).map(function(tah){
      return kopieKola(tah);
    });

    S.rolls = (Array.isArray(S.rolls) && S.rolls.length ? S.rolls : [{}]).map(function(r){
      /* Strop je počet kostek režimu, ne šestka: hra uložená v šestikostkovém
         režimu se nesmí přenést do pětikostkového s hodem na šest kostek. */
      var max = kostek(), thrown = naCislo(r && r.thrown, max);
      return {
        thrown: (thrown >= 1 && thrown <= max) ? Math.floor(thrown) : max,
        hot: !!(r && r.hot),
        items: (Array.isArray(r && r.items) ? r.items : []).map(function(i){
          var o = { p: naCislo(i && i.p, 0),
                    d: Math.max(0, Math.floor(naCislo(i && i.d, 0))) };
          if(i && typeof i.k === "string"){ o.k = i.k; return o; }
          /* rozehraná hra uložená starší verzí nese v položce text: kód se
             z něj vytáhne, a nejde-li to, text se veze dál nedotčený */
          var kod = (i && typeof i.l === "string") ? kodZTextu(i.l) : "v";
          if(kod === null){ o.l = i.l; } else { o.k = kod; }
          return o;
        })
      };
    });
  }
  function load(cb){
    try{
      var raw = localStorage.getItem(KEY);
      if(raw){
        var d = null, cele = false;
        try{ d = JSON.parse(raw); cele = true; }catch(e){}
        if(cele && d && typeof d.banked === "number" && Array.isArray(d.rolls) && d.rolls.length){
          S = d;
        } else {
          /* nečitelná data nemažeme potichu — ať se z prohlížeče dají vytáhnout */
          try{ localStorage.setItem(KEY + "-vadny", raw); }catch(e){}
        }
      }
    }catch(e){}
    ozdrav();
    cb();
  }

  /* ---------- koš a koš historie ----------
     Obojí zůstává v localStorage. Na rozdíl od historie je shora omezené
     (5 a 10 záznamů, dohromady pod 30 kB), neroste a čte se synchronně
     z nastavení — přesun do IndexedDB by přidal migraci a transakce
     bez užitku. */
  function readList(key){
    try{
      var d = JSON.parse(localStorage.getItem(key));
      return Array.isArray(d) ? d : [];
    }catch(e){ return []; }
  }
  function writeList(key, list){
    try{ localStorage.setItem(key, JSON.stringify(list)); return true; }
    catch(e){ return false; }
  }
  /* Prázdný koš se z úložiště rovnou maže. Jinak by tam zůstalo dvouznakové
     "[]" a v rozpisu zabraného místa by to vypadalo, že v koši něco leží.
     Historie touhle cestou nechodí — na jejím klíči stojí migrace do
     IndexedDB a zmizet nesmí. */
  function kosZapis(key, list){
    if(list && list.length) return writeList(key, list);
    try{ localStorage.removeItem(key); return true; }catch(e){ return false; }
  }
  function kosAll(){ return readList(KKEY); }
  function kosWrite(list){ return kosZapis(KKEY, list); }
  function kosHistAll(){ return readList(KHKEY); }
  function kosHistWrite(list){ return kosZapis(KHKEY, list); }

  /* ---------- úložiště historie ----------
     localStorage má strop kolem 5 MB, tedy zhruba tři tisíce her. Historie
     se proto stěhuje do IndexedDB. Aby se kvůli tomu nemusel přepsat celý
     řetěz vykreslování, drží se za běhu v paměti:

       HIST         jediná pravda za běhu, naplní se jednou při startu
       histAll()    vrací kopii a zůstává synchronní
       histWrite()  mění paměť hned a do úložiště zapisuje na pozadí

     Kopie proto, že renderP2() výsledek třídí na místě — bez ní by přeházel
     zdrojové pole.

     Tvar dat se v této etapě nemění: v IndexedDB leží celé záznamy, přesně
     tak, jak dosud ležely v localStorage. */
  var HIST = [];
  var UKEY  = "farkle-uloziste-v1";   /* "idb", jakmile migrace proběhla */
  var HZAL  = HKEY + "-zaloha";       /* přejmenovaný původní klíč */
  var IDB_JMENO = "kostky", IDB_VERZE = 4;
  var SOUHRNY = "souhrny", DETAILY = "detaily";
  /* Firefox v soukromém okně umí na open() viset donekonečna, proto strop */
  var IDB_STROP = 3000;

  var rezim = "ls";            /* "ls" | "idb" */
  var idb = null;
  var historieNedostupna = false;

  /* Souhrn nese všechno, co seznam a statistiky potřebují, bez popisů kol.
     Deset tisíc souhrnů je v paměti kolem 2 MB, detaily by byly desítky.
     Staví se na třech místech: při zápisu hry, při migraci a při importu. */
  function souhrnZ(rec){
    var kolKCili = gKolKCili(rec);
    return {
      id: rec.id, savedAt: rec.savedAt,
      mode: rec.mode, goal: rec.goal, roundGoal: rec.roundGoal || null,
      /* Chybějící `rezim` se dopočítá až při čtení (gRezim), takže se kvůli
         němu nezvedá IDB_VERZE — všechny dřívější hry se hrály podle KCD2. */
      rezim: gRezim(rec), rezimN: rec.rezimN || null,
      banked: rec.banked || 0,
      kol: gKol(rec), farklu: gFarkle(rec), farkluprvni: gFarklePrvni(rec),
      nejlepsi: gNejlepsiKolo(rec), nejhorsi: gNejhorsiKolo(rec),
      serie: gSerie(rec),
      kolKCili: kolKCili,
      hodu: gNejvicHodu(rec), ztraceno: gZtraceno(rec)
    };
  }
  function detailZ(rec){
    return { id: rec.id, turns: (rec.turns || []).map(function(tah){
      return kopieKola(tah);
    }) };
  }

  function otevriIDB(hotovo){
    var rozhodnuto = false;
    function konec(v){ if(rozhodnuto) return; rozhodnuto = true; hotovo(v); }
    var api = null;
    try{ api = window.indexedDB || null; }catch(e){ api = null; }
    if(!api){ konec(null); return; }
    var req;
    try{ req = api.open(IDB_JMENO, IDB_VERZE); }catch(e){ konec(null); return; }
    setTimeout(function(){ konec(null); }, IDB_STROP);
    /* Rozdělení jedné police na dvě běží uvnitř versionchange transakce.
       Když cokoli selže, transakce se zruší celá a databáze zůstane na
       předchozí verzi i s původní policí — nevznikne stav napůl. */
    req.onupgradeneeded = function(){
      var db = req.result, tx = req.transaction;
      if(!db.objectStoreNames.contains(SOUHRNY)) db.createObjectStore(SOUHRNY, { keyPath: "id" });
      if(!db.objectStoreNames.contains(DETAILY)) db.createObjectStore(DETAILY, { keyPath: "id" });
      if(db.objectStoreNames.contains("hry")){
        var kur = tx.objectStore("hry").openCursor();
        kur.onsuccess = function(){
          var c = kur.result;
          if(c){
            var rec = c.value;
            tx.objectStore(SOUHRNY).put(souhrnZ(rec));
            tx.objectStore(DETAILY).put(detailZ(rec));
            c.continue();
            return;
          }
          db.deleteObjectStore("hry");
        };
        /* souhrny právě vznikly přes souhrnZ() nad plnými záznamy, nová pole
           v nich tedy už jsou — dopočítávat není co */
        return;
      }
      dopoctiHody(tx);
    };
    req.onsuccess = function(){ konec(req.result); };
    req.onerror = function(){ konec(null); };
    req.onblocked = function(){ konec(null); };
  }

  /* Doplnění polí `hodu`, `ztraceno` a `farkluprvni` do souhrnů uložených
     starší verzí. Běží uvnitř versionchange transakce: když cokoli selže,
     transakce se zruší celá a databáze zůstane na předchozí verzi —
     nevznikne stav, kdy má polovina her nová pole a druhá ne. Mapa se staví
     celá dopředu a teprve pak se sahá na souhrny; dva otevřené kurzory nad
     dvěma policemi v téže transakci se nemíchají. Na čerstvé instalaci jsou
     obě police prázdné, takže dopočet nestojí nic. */
  function dopoctiHody(tx){
    var mapa = {}, kd = tx.objectStore(DETAILY).openCursor();
    kd.onsuccess = function(){
      var c = kd.result;
      if(c){
        var d = c.value;
        mapa[d.id] = { hodu: gNejvicHodu(d), ztraceno: gZtraceno(d), farkluprvni: gFarklePrvni(d) };
        c.continue();
        return;
      }
      var ks = tx.objectStore(SOUHRNY).openCursor();
      ks.onsuccess = function(){
        var s = ks.result;
        if(!s) return;
        var v = s.value;
        if(v.hodu === undefined || v.ztraceno === undefined || v.farkluprvni === undefined){
          var m = mapa[v.id];
          v.hodu = m ? m.hodu : null;
          v.ztraceno = m ? m.ztraceno : null;
          v.farkluprvni = m ? m.farkluprvni : null;
          s.update(v);
        }
        s.continue();
      };
    };
  }

  /* null znamená „nepodařilo se přečíst", ne „nic tam není" — ten rozdíl je
     zásadní, viz historieNedostupna níž. Načítají se jen souhrny; detail se
     dotáhne až při rozkliknutí hry. */
  function ctiIDB(db, hotovo){
    var tx;
    try{ tx = db.transaction(SOUHRNY, "readonly"); }
    catch(e){ hotovo(null); return; }
    var st = tx.objectStore(SOUHRNY), req;
    try{
      req = st.getAll ? st.getAll() : null;
    }catch(e){ hotovo(null); return; }
    if(req){
      req.onsuccess = function(){ hotovo(Array.isArray(req.result) ? req.result : []); };
      req.onerror = function(){ hotovo(null); };
      return;
    }
    var out = [], kur = st.openCursor();
    kur.onsuccess = function(){
      var c = kur.result;
      if(c){ out.push(c.value); c.continue(); } else { hotovo(out); }
    };
    kur.onerror = function(){ hotovo(null); };
  }

  /* Detail jedné hry. hotovo(null) znamená, že se nepovedlo přečíst. */
  function nactiDetail(id, hotovo){
    if(rezim !== "idb" || !idb){ hotovo(null); return; }
    var tx;
    try{ tx = idb.transaction(DETAILY, "readonly"); }
    catch(e){ hotovo(null); return; }
    var req = tx.objectStore(DETAILY).get(id);
    req.onsuccess = function(){
      var d = req.result;
      hotovo(d && Array.isArray(d.turns) ? d.turns : []);
    };
    req.onerror = function(){ hotovo(null); };
  }

  /* `souhrny` nese jen záznamy, které se opravdu mění (nové i upravené) —
     volající (histWrite()) je vybírá porovnáním reference proti předchozímu
     HIST. Nezměněné záznamy se tak vůbec nezapisují. `smazatSouhrny` je
     nepovinné: `migruj()` ho neposílá a police se pak smaže celá (`s.clear()`),
     protože tam jde vždycky o kompletní jednorázový přesun; `histWrite()` ho
     posílá vždycky (i jako prázdné pole) a mazání jde adresně přes `s.delete()`,
     ať se nepřepisují záznamy, které se vůbec nezměnily.
     Obě police v jedné transakci, jinak by při selhání uprostřed vznikla
     hra bez kol nebo kola bez hry. */
  function zapisIDB(db, souhrny, noveDetaily, smazatDetaily, hotovo, smazatSouhrny){
    var tx;
    try{ tx = db.transaction([SOUHRNY, DETAILY], "readwrite"); }
    catch(e){ hotovo(false); return; }
    var hotovoUz = false;
    function konec(v){ if(hotovoUz) return; hotovoUz = true; hotovo(v); }
    tx.oncomplete = function(){ konec(true); };
    tx.onerror = function(){ konec(false); };
    tx.onabort = function(){ konec(false); };
    try{
      var s = tx.objectStore(SOUHRNY), d = tx.objectStore(DETAILY), i;
      if(smazatSouhrny){
        for(i = 0; i < smazatSouhrny.length; i++){ s.delete(smazatSouhrny[i]); }
      }else{
        s.clear();
      }
      for(i = 0; i < souhrny.length; i++){ s.put(souhrny[i]); }
      for(i = 0; i < smazatDetaily.length; i++){ d.delete(smazatDetaily[i]); }
      for(i = 0; i < noveDetaily.length; i++){ d.put(noveDetaily[i]); }
    }catch(e){
      try{ tx.abort(); }catch(e2){}
      konec(false);
    }
  }

  /* Migrace. Pořadí je důležité: starý klíč se přejmenuje až po potvrzeném
     zápisu do IndexedDB, a příznak se nastaví jen tehdy, když se ho podaří
     uložit. Kdyby se příznak nezapsal a klíč se přesto přejmenoval, aplikace
     by při příštím startu propadla na localStorage a ukázala prázdnou
     historii jako by byla úplná. */
  function migruj(db, hotovo){
    var stare = readList(HKEY);
    var souhrny = stare.map(souhrnZ), detaily = stare.map(detailZ);
    zapisIDB(db, souhrny, detaily, [], function(ok){
      if(!ok){ hotovo(false); return; }
      var priznak = false;
      try{ localStorage.setItem(UKEY, "idb"); priznak = true; }catch(e){}
      if(!priznak){ hotovo(false); return; }
      /* pojistka mimo IndexedDB: data zůstanou v localStorage pod jiným
         jménem aspoň jednu verzi, jen se z nich už nečte */
      try{
        var raw = localStorage.getItem(HKEY);
        if(raw !== null){
          localStorage.setItem(HZAL, raw);
          localStorage.removeItem(HKEY);
        }
      }catch(e){}
      HIST = souhrny;
      hotovo(true);
    });
  }

  function ukazNecteme(){
    var el = document.getElementById("nohist");
    if(el) el.hidden = !historieNedostupna;
  }

  function pripravUloziste(hotovo){
    var chtene = "ls";
    try{ if(localStorage.getItem(UKEY) === "idb") chtene = "idb"; }catch(e){}

    /* Aplikace nepředstírá: když příznak říká idb a IndexedDB se otevřít
       nedá, neukáže starou historii z localStorage jako by byla úplná.
       Ukáže pruh, do historie nezapisuje a počítat se dá dál. */
    function vzdejTo(){
      if(chtene === "idb"){
        rezim = "idb"; idb = null; HIST = [];
        historieNedostupna = true; ukazNecteme();
      }else{
        rezim = "ls"; idb = null; HIST = readList(HKEY);
      }
      hotovo();
    }

    otevriIDB(function(db){
      if(!db){ vzdejTo(); return; }
      ctiIDB(db, function(zaznamy){
        if(zaznamy === null){ vzdejTo(); return; }
        if(chtene === "idb"){
          rezim = "idb"; idb = db; HIST = zaznamy;
          hotovo();
          return;
        }
        migruj(db, function(ok){
          if(ok){ rezim = "idb"; idb = db; }
          else { rezim = "ls"; idb = null; HIST = readList(HKEY); }
          hotovo();
        });
      });
    });
  }

  function histAll(){ return HIST.slice(); }

  /* ---------- filtry a řazení ----------
     Stav drží jen paměť, žádný localStorage: po zavření aplikace se resetuje,
     aby se nikdo nedíval na osekanou historii a nevěděl proč. Přepnutí karet
     ani odchod na jinou stránku ho ale neruší.

     histView() jsou jediné dveře k datům pro zobrazení — na ni se ptá seznam
     her, seznam statistik i žebříčky. Neptá se přes ni export, zápis ani
     mazání: záloha veze vždycky všechny hry, i když je filtr zapnutý. */
  var FILTR  = { od: null, do: null, typ: null, hodnota: null };
  var RAZENI = { podle: "datum", smer: "desc" };

  /* Starý nebo cizí záznam nemusí mít mode vůbec; všechno, co není „rounds",
     je hra na body — stejné pravidlo jako všude jinde v aplikaci. */
  function rezimHry(g){ return g.mode === "rounds" ? "rounds" : "points"; }
  /* Cíl hry jedním číslem: u her na kola je nula „bez limitu". Nula je tu
     platná hodnota, na rozdíl od null, které v FILTR.hodnota znamená
     „všechny". */
  function cilHry(g){
    return g.mode === "rounds" ? (g.roundGoal > 0 ? g.roundGoal : 0) : (g.goal || 0);
  }
  /* Nabídka se skládá z dat, ne z pevného seznamu — a vždycky z celé
     historie, ne z vyfiltrované. Jinak by se po zapnutí filtru data nabídka
     smrskla a nešlo by ji rozšířit zpátky. */
  function hodnotyTypu(typ){
    var v = [], bezLimitu = false, videno = {};
    histAll().forEach(function(g){
      if(rezimHry(g) !== typ) return;
      var x = cilHry(g);
      if(typ === "rounds" && x === 0){ bezLimitu = true; return; }
      if(!videno[x]){ videno[x] = true; v.push(x); }
    });
    v.sort(function(a, b){ return a - b; });
    if(bezLimitu) v.push(0);
    return v;
  }
  function zrusFiltr(){
    FILTR.od = null; FILTR.do = null; FILTR.typ = null; FILTR.hodnota = null;
    RAZENI.podle = "datum"; RAZENI.smer = "desc";
  }
  /* Poslední milisekunda dne, ve kterém ms leží. Přes konstruktor Date, ne
     přičtením 24 hodin — kolem přechodu na letní čas den 24 hodin nemá. */
  function konecDne(ms){
    var d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1;
  }
  /* Filtr typu hry platí jen tam, kde je vidět jeho tlačítko, tedy na kartě
     Historie — proto se o něj volající musí říct. Na kartě Statistiky by
     půlka položek („hra na body", „hra na kola") zůstala prázdná a nic by
     nenapovědělo proč; statistiky si režim řeší samy. Filtr data se naopak
     uplatňuje všude. */
  function histView(sTypem){
    var v = histAll();
    if(FILTR.od !== null || FILTR.do !== null){
      v = v.filter(function(g){
        var t = g.savedAt || 0;
        if(FILTR.od !== null && t < FILTR.od) return false;
        if(FILTR.do !== null && t > FILTR.do) return false;
        return true;
      });
    }
    if(sTypem && FILTR.typ !== null){
      v = v.filter(function(g){
        if(rezimHry(g) !== FILTR.typ) return false;
        if(FILTR.hodnota === null) return true;
        return cilHry(g) === FILTR.hodnota;
      });
    }
    var smer = RAZENI.smer === "asc" ? 1 : -1;
    v.sort(function(a, b){
      if(RAZENI.podle === "body"){
        var r = ((a.banked || 0) - (b.banked || 0)) * smer;
        if(r) return r;
        return (b.savedAt || 0) - (a.savedAt || 0);
      }
      return ((a.savedAt || 0) - (b.savedAt || 0)) * smer;
    });
    return v;
  }

  /* Když se historie nedá načíst, není chyba v místě — hlášky by lhaly. */
  /* Vrací klíč, ne hotový text: hláška může na tlačítku přežít přepnutí
     jazyka a přeloží se až tam, kde se vypisuje. */
  function klicSelhani(zaklad){
    return historieNedostupna ? "chyba.nedostupna" : zaklad;
  }

  /* Pravidlo z HANDOVER §4 platí dál: každý zápis má výsledek a volající ho
     řeší. Asynchronní zápis to mění jen v tom, že výsledek přijde později.
     V režimu ls se hotovo() volá ještě synchronně — chování zůstává přesně
     jako dřív. Paměť se mění optimisticky, ať UI reaguje hned; při selhání
     se vrátí sama a volající dostane false.

     V režimu ls jsou v `list` celé záznamy, v režimu idb souhrny. Volající
     posílá `zaznamy` — celé hry, které do historie přibývají. Co z historie
     mizí, se pozná porovnáním id a detail se smaže s nimi. */
  function histWrite(list, hotovo, zaznamy){
    hotovo = hotovo || function(){};
    var novy = list.slice();
    if(rezim === "ls"){
      var ok = writeList(HKEY, novy);
      if(ok) HIST = novy;
      hotovo(ok);
      return;
    }
    if(!idb){ hotovo(false); return; }   /* pruh o nedostupné historii už visí */

    var je = {}, i;
    for(i = 0; i < novy.length; i++){ je[novy[i].id] = true; }
    var smazat = [];
    for(i = 0; i < HIST.length; i++){
      if(!je[HIST[i].id]) smazat.push(HIST[i].id);
    }
    var detaily = (zaznamy || []).map(detailZ);

    /* Do IndexedDB jde jen to, co se opravdu změnilo — porovnáním reference
       proti předchozímu HIST. histAll() vrací HIST.slice(), takže nezměněný
       záznam má v `novy` pořád stejnou referenci a zapisIDB() ho nemusí
       znovu ukládat; „Nahradit vše" při importu staví pole přes map(), takže
       tam referenci nesdílí nic a správně se zapíše celé znovu. */
    var stareById = {};
    for(i = 0; i < HIST.length; i++){ stareById[HIST[i].id] = HIST[i]; }
    var zmenene = [];
    for(i = 0; i < novy.length; i++){
      if(stareById[novy[i].id] !== novy[i]) zmenene.push(novy[i]);
    }

    var predtim = HIST;
    HIST = novy;
    zapisIDB(idb, zmenene, detaily, smazat, function(ok){
      if(!ok) HIST = predtim;
      hotovo(ok);
    }, smazat);
  }

  /* Do historie se ukládají celé záznamy; co se z nich stane, řeší úložiště.
     Volající tak nemusí vědět, jestli jede na localStorage nebo na dvou
     policích. */
  function proHistorii(rec){ return rezim === "idb" ? souhrnZ(rec) : rec; }

  function newId(){
    return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  /* otisk rozehrané hry pro historii nebo koš; rozehrané kolo se nezapočítává */
  function snapshot(){
    var rez = aktRezim();
    var r = {
      mode: S.mode, goal: S.goal, roundGoal: S.roundGoal || null,
      rezim: rez.id,
      banked: S.banked,
      turns: S.turns.map(function(tah){ return kopieKola(tah); })
    };
    /* Název vlastního režimu se veze se záznamem, ne odkazem do nastavení —
       stejná úvaha jako u kódu k1500x5. Smazání režimu ani import zálohy na
       cizí telefon nesmí nechat v historii id, ke kterému neexistuje text. */
    if(rez.vlastni) r.rezimN = nazevRezimu(rez);
    return r;
  }
  function makeRecord(id){
    var r = snapshot();
    r.id = id || newId();
    r.savedAt = Date.now();
    return r;
  }
  function gameEmpty(){
    return S.turns.length === 0 && S.rolls.length === 1 && cur().items.length === 0;
  }

  /* ---------- bodování ----------
     Bodovací tabulka není konstanta — řídí ji herní režim (CLAUDE.md část 14).
     Každá funkce tady proto bere pravidla; když je nedostane, vezme si
     aktivní režim sama, aby volající, kterých se to netýká, zůstali beze změny. */
  function kindPoints(value, count, rez){
    rez = rez || aktRezim();
    /* Samostatná kostka má vlastní šestici, počty 2–6 leží v řídké mapě `stej`.
       Přítomnost klíče znamená „ten počet boduje“, nula uvnitř šestice mluví
       jen o jedné hodnotě — žádný zvláštní příznak vedle sazby, tedy ani stav,
       který si může protiřečit. */
    if(count === 1) return rez.sam[value] || 0;
    if(rez.stej[count]) return rez.stej[count][value] || 0;
    /* Nad nejvyšším nastaveným počtem se extrapoluje pravidlem `nad`; pod
       prahem a v mezerách tabulky se neboduje. */
    var m = nejvyssiStej(rez);
    if(m === null || count < m) return 0;
    /* tři pravidla, která se v praxi hrají: KCD2 zdvojnásobuje každou kostkou
       navíc, klasika násobí nejvyšší nastavenou skupinu, domácí varianta dává
       pevné body bez ohledu na hodnotu. Pevné body platí i tam, kde sama
       skupina neboduje, a to je správně. */
    if(rez.nad === "pevne") return rez.nadP[count] || 0;
    var base = rez.stej[m][value] || 0;
    if(rez.nad === "nasobek") return base * (count - m + 1);  /* o jednu víc: ×2, ×3, ×4 */
    return base * Math.pow(2, count - m);                     /* x2: ×2, ×4, ×8 */
  }
  /* Postupka nese jen tvar a kód štítku; body leží v režimu, protože každá
     verze hry je má jinak a v klasické Farkle pětikostkové postupky vůbec
     nebodují. Kódy s15/s26/s16 se nemění, aby historie četla dál. */
  var STRAIGHTS = { "15":{d:5,k:"s15",v:[1,2,3,4,5]},
                    "26":{d:5,k:"s26",v:[2,3,4,5,6]},
                    "16":{d:6,k:"s16",v:[1,2,3,4,5,6]} };
  var POST_PORADI = ["15", "26", "16"];
  function maPostupku(c, s){
    for(var i = 0; i < s.v.length; i++){ if(!c[s.v[i]]) return false; }
    return true;
  }

  /* ---------- kombinace navíc ----------
     Pevný inventář čtyř položek, který se nikdy nerozroste. Logických
     kombinací kostek totiž není mnoho; krom toho, co aplikace umí dnes, se
     jich reálně hraje právě těchhle pár. Editor vlastních vzorů zůstává
     jako úniková cesta, ne jako hlavní vchod.

     `d` je počet kostek, `def` výchozí sazba, `k` kód štítku a `je()`
     predikát nad polem počtů výskytů. Predikát používá **jen výpočet
     rizika**, klávesnice ne: sazba i počet kostek jsou pevné, takže
     tlačítko hodnoty kostek vůbec znát nemusí. Cena za to je, že čtveřice
     šestek a čtveřice jedniček platí stejně — a že „čtveřice a dvojice“ je
     při čtyřech jedničkách past (1 500 proti 2 000 za samotnou čtveřici).
     Proto je sazba editovatelná a čip svoje body ukazuje. */
  function poctuAspon(c, n){
    var k = 0, v;
    for(v = 1; v <= 6; v++){ if(c[v] >= n) k++; }
    return k;
  }
  /* hodnota s aspoň `a` kostkami a k ní **jiná** hodnota s aspoň `b` */
  function dvojiceRuznych(c, a, b){
    var v, w;
    for(v = 1; v <= 6; v++){
      if(c[v] < a) continue;
      for(w = 1; w <= 6; w++){ if(w !== v && c[w] >= b) return true; }
    }
    return false;
  }
  var PRESETY = {
    "2p": { d:4, def: 250, k:"c2p", zapis:"2+2",   je: function(c){ return poctuAspon(c, 2) >= 2; } },
    "3p": { d:6, def: 500, k:"c3p", zapis:"2+2+2", je: function(c){ return poctuAspon(c, 2) >= 3; } },
    "32": { d:5, def:1200, k:"c32", zapis:"3+2",   je: function(c){ return dvojiceRuznych(c, 3, 2); } },
    "33": { d:6, def:2000, k:"c33", zapis:"3+3",   je: function(c){ return poctuAspon(c, 3) >= 2; } },
    "42": { d:6, def:1500, k:"c42", zapis:"4+2",   je: function(c){ return dvojiceRuznych(c, 4, 2); } }
  };
  var PRESET_PORADI = ["2p", "3p", "32", "33", "42"];
  var KOMBKEY = "farkle-kombinace-v1";   /* starý klíč, čte se jen při migraci */
  var VLASTNI_MAX = 8;         /* strop vlastních kombinací v jednom režimu */
  var VZORU_MAX = 6;           /* strop vzorů v jedné kombinaci */
  var PISMENA = ["A", "B", "C", "D", "E", "F"];
  var BODY_MAX = 999999;       /* šest číslic — víc se do kódu k…x… nevejde */

  /* Přítomnost klíče v `p` je zapnutí. Žádný zvláštní boolean vedle sazby,
     tedy ani žádný stav, který si může protiřečit. Kombinace i sazby patří
     režimu, ne aplikaci — každý režim si drží svoje. */
  function kombZap(rez, k){ return Object.prototype.hasOwnProperty.call(rez.p, k); }
  function sazba(rez, k){ return kombZap(rez, k) ? rez.p[k] : PRESETY[k].def; }
  /* Kombinace na šest kostek nemá v pětikostkovém režimu co dělat: nikdy by
     nešla odložit a v seznamu by jen mátla. */
  function kombVRezimu(rez, k){ return PRESETY[k].d <= rez.kostek; }

  /* Setříděné počty výskytů: vzor 1,1,1+5,5 má tvar [3,2]. U „libovolných
     hodnot“ se porovnává právě tenhle tvar, ne konkrétní hodnoty. */
  function tvarZPoctu(pocty){
    var out = [], v;
    for(v = 1; v <= 6; v++){ if(pocty[v]) out.push(pocty[v]); }
    out.sort(function(a, b){ return b - a; });
    return out;
  }
  /* Vzor z cizí zálohy ani z poškozeného úložiště nesmí projít dál nezkontrolovaný.
     Vrací očištěnou kopii, nebo null.

     Vzor má dvě části: `v` jsou kostky s konkrétní hodnotou, `t` velikosti
     skupin „libovolná, ale stejná hodnota“ (písmena A–F v editoru). Dřív
     platil na celý vzor jeden příznak `any`; vzor uložený s ním se přečte
     tak, že se z jeho hodnot stanou samá písmena — tvar i počet kostek
     vyjdou stejně, takže se nemění ani kód štítku. */
  function cistyTvar(x){
    if(!x || typeof x !== "object") return null;
    var hodnoty = Array.isArray(x.v) ? x.v : [], pocty = [0,0,0,0,0,0,0], i, h, n = 0;
    var skupiny = Array.isArray(x.t) ? x.t : [], tvar = [], s;
    for(i = 0; i < hodnoty.length && n < 6; i++){
      h = Math.floor(naCislo(hodnoty[i], 0));
      if(h < 1 || h > 6) continue;
      pocty[h]++; n++;
    }
    if(x.any){
      /* starý zápis: rozhodoval jen tvar, tedy samá písmena */
      tvar = tvarZPoctu(pocty);
      pocty = [0,0,0,0,0,0,0];
    } else {
      for(i = 0; i < skupiny.length && n < 6; i++){
        s = Math.floor(naCislo(skupiny[i], 0));
        if(s < 1 || s > 6 - n) continue;
        tvar.push(s); n += s;
      }
      tvar.sort(function(a, b){ return b - a; });
    }
    if(n < 2) return null;
    return { v: rozbalPocty(pocty), t: tvar, pocty: pocty, tvar: tvar };
  }
  /* Vlastní kombinace: jméno, body a jeden až šest vzorů, ze kterých stačí
     sednout kterýkoli — „dvojice a dvě dvojky **nebo** dvojice a tři trojky“
     je jedna kombinace za jedny body.

     Starší zápis nesl vzor rovnou v kombinaci a jméno neměl vůbec; přečte se
     jako kombinace o jednom vzoru s výchozím jménem, protože generátor
     slovních názvů zmizel. */
  function cistaKombinace(x, poradi){
    if(!x || typeof x !== "object") return null;
    var body = Math.floor(naCislo(x.b, 0)), vzory = [], i, vz;
    if(!(body > 0) || body > BODY_MAX) return null;
    if(Array.isArray(x.vz)){
      for(i = 0; i < x.vz.length && vzory.length < VZORU_MAX; i++){
        vz = cistyTvar(x.vz[i]);
        if(vz) vzory.push(vz);
      }
    } else {
      vz = cistyTvar(x);
      if(vz) vzory.push(vz);
    }
    if(!vzory.length) return null;
    /* Chybějící `z` znamená zapnuto: kombinace uložené dřív, než přepínač
       existoval, se po aktualizaci nesmějí samy vypnout. */
    return { id: (typeof x.id === "string" && x.id) ? x.id.slice(0, 40) : newId(),
             n: (typeof x.n === "string" && x.n) ? x.n.slice(0, NAZEV_MAX)
                                                 : t("komb.vychozin", { n: poradi || 1 }),
             b: body, z: (x.z === undefined) ? true : !!x.z, vz: vzory };
  }
  /* Kostky vzoru dohromady: konkrétní i ty ve skupinách. */
  function pocetKostekVzoru(vz){
    var n = vz.v.length, i;
    for(i = 0; i < vz.tvar.length; i++) n += vz.tvar[i];
    return n;
  }
  function rozbalPocty(pocty){
    var out = [], v, i;
    for(v = 1; v <= 6; v++){ for(i = 0; i < pocty[v]; i++) out.push(v); }
    return out;
  }
  /* Zápis vzoru: skupiny jako písmena, konkrétní hodnoty jako čísla —
     A,A+2,2 je „dvě libovolné stejné a dvě dvojky“. Skupiny stojí první
     a jdou od největší, hodnoty za nimi vzestupně; uvnitř skupiny odděluje
     kostky čárka, skupiny mezi sebou "+".

     Je to jazykově neutrální, takže se nepřekládá a v nastavení, v pravidlech
     i v editoru vypadá stejně. Slovní generátor jmen („dvě dvojice a 6“)
     zmizel s tím, že kombinace mají vlastní jméno. */
  function zapisVzoru(vz){
    var out = [], v, i, j, kus;
    for(i = 0; i < vz.tvar.length; i++){
      kus = [];
      for(j = 0; j < vz.tvar[i]; j++) kus.push(PISMENA[i] || "?");
      out.push(kus.join(","));
    }
    for(v = 1; v <= 6; v++){
      if(!vz.pocty[v]) continue;
      kus = [];
      for(i = 0; i < vz.pocty[v]; i++) kus.push(v);
      out.push(kus.join(","));
    }
    return out.join("+");
  }
  /* Zápis celé kombinace: vzory oddělené lomítkem, tedy „nebo“. */
  function zapisKombinace(k){
    return k.vz.map(zapisVzoru).join(" / ");
  }
  /* Odlišné počty kostek zapnutých vzorů, vzestupně a jen ty, které se do
     režimu vejdou. Podle nich se řídí čip v klávesnici i podřádek v nastavení:
     kombinace o vzorech na čtyři a na pět kostek se dá odložit dvěma způsoby
     a klávesnice se musí zeptat, kterým. */
  function poctyKostekKombinace(k, max){
    var out = [], i, n;
    for(i = 0; i < k.vz.length; i++){
      n = pocetKostekVzoru(k.vz[i]);
      if(n <= max && out.indexOf(n) < 0) out.push(n);
    }
    out.sort(function(a, b){ return a - b; });
    return out;
  }
  /* Sedne kombinace do hodu? Stačí kterýkoli z jejích vzorů. */
  function sediKombinace(k, c){
    for(var i = 0; i < k.vz.length; i++){ if(sediVzor(k.vz[i], c)) return true; }
    return false;
  }
  /* Vlastní kombinace má vlastní příznak `z`, kdežto preset se zapíná
     přítomností klíče v `p`. Je to jediné místo, kde se oba modely liší,
     a nejde to jinak: u kombinace musí být vypnutí a smazání dvě různé věci. */
  function kombinaceZap(rez){
    return rez.v.filter(function(k){
      return k.z && poctyKostekKombinace(k, rez.kostek).length > 0;
    });
  }
  function pocetKombinaci(rez){
    var n = kombinaceZap(rez).length, i;
    for(i = 0; i < PRESET_PORADI.length; i++){
      if(kombZap(rez, PRESET_PORADI[i]) && kombVRezimu(rez, PRESET_PORADI[i])) n++;
    }
    return n;
  }

  /* ---------- herní režimy ----------
     Režim je celá sada pravidel: počet kostek, tři šestice sazeb (samostatná
     kostka, dvojice, trojice), pravidlo pro čtyři a víc stejných, postupky,
     kombinace navíc a vlastní vzory. Tři přednastavené vychází z
     `docs/farkle-pravidla-verze.md`, vlastních jde přidat dvacet.

     `post` a `p` jsou řídké mapy: přítomnost klíče znamená „boduje“. Stejná
     úvaha jako u kombinací navíc — žádný boolean vedle sazby, tedy ani stav,
     který si může protiřečit.

     V paměti je každý režim úplný, sparse je až zápis (viz ulozRezimy).
     Jeden objekt na režim, ne skládaná kopie při každém volání: editor
     v nastavení do něj zapisuje přímo a druhá, zastaralá kopie by nesměla
     vzniknout. */
  var REZKEY = "farkle-rezimy-v1";
  var REZIMY_MAX = 20;         /* strop vlastních režimů */
  /* Kolik samostatně bodujících hodnot se ještě vejde do vlastní řady čipů,
     aniž by se čipy zmenšily. Nad to se řada schová a zadává se přes 1×
     ve Stejných hodnotách. */
  var SAMOSTATNE_V_RADE = 3;
  var NAZEV_MAX = 40;          /* strop délky názvu vlastního režimu */
  var NAD_DRUHY = ["x2", "nasobek", "pevne"];
  var VYCHOZI_REZIM = "kcd2";
  var TROJ_ZAKLAD = [0, 1000, 200, 300, 400, 500, 600];
  var SAM_ZAKLAD  = [0, 100, 0, 0, 0, 50, 0];   /* jednička a pětka */
  /* Pevné body za počty nad prahem. Index je rovnou počet kostek, ne pořadí
     v trojici jako dřív — práh se dnes dá posunout, takže na čtyřce začínat
     nemusí. */
  var NADP_ZAKLAD = [0, 0, 0, 1000, 1000, 2000, 3000];
  var POCTY_STEJ  = [2, 3, 4, 5, 6];   /* počty, které můžou mít vlastní šestici */
  var PRAH_ZAKLAD = 3;                 /* od kolika stejných se boduje ve výchozím stavu */
  /* Boduje v té šestici aspoň jedna hodnota? Prázdná šestice je totéž co
     vypnutý počet, takže se nikde nedrží zvlášť. */
  function sestiZap(pole){
    for(var v = 1; v <= 6; v++){ if(pole && pole[v] > 0) return true; }
    return false;
  }
  /* Počty stejných čísel, které v režimu bodují, odspoda. */
  function poctyStej(rez){
    var out = [], i, n;
    for(i = 0; i < POCTY_STEJ.length; i++){
      n = POCTY_STEJ[i];
      /* Počet vyšší, než kolika kostkami se hází, nikdy nepadne — v tabulce
         zůstat může (režim se dá přepnout zpátky na šest), ale bodování ani
         extrapolace nad prahem o něm vědět nesmí. */
      if(n <= rez.kostek && rez.stej[n]) out.push(n);
    }
    return out;
  }
  function stejZap(rez, n){ return !!rez.stej[n]; }
  /* Práh je nejnižší zapnutý počet, `nejvyssiStej` ten, nad kterým se
     extrapoluje pravidlem `nad`. Prázdná tabulka vrací null. */
  function prahStej(rez){ var p = poctyStej(rez); return p.length ? p[0] : null; }
  function nejvyssiStej(rez){ var p = poctyStej(rez); return p.length ? p[p.length - 1] : null; }
  /* Šestice sazeb z cizích dat: očištěná kopie, nebo null, když v ní nic
     neboduje. */
  function cistaSestice(x){
    var pole = [0,0,0,0,0,0,0], v;
    if(!Array.isArray(x)) return null;
    for(v = 1; v <= 6; v++){ if(x[v] !== undefined) pole[v] = mezeBodu(x[v]); }
    return sestiZap(pole) ? pole : null;
  }
  function kopieStej(m){
    var out = {}, i, n;
    for(i = 0; i < POCTY_STEJ.length; i++){
      n = POCTY_STEJ[i];
      if(m[n]) out[n] = m[n].slice();
    }
    return out;
  }
  function stejnaStej(a, b){
    var i, n;
    for(i = 0; i < POCTY_STEJ.length; i++){
      n = POCTY_STEJ[i];
      if(!a[n] !== !b[n]) return false;
      if(a[n] && !stejnePole(a[n], b[n])) return false;
    }
    return true;
  }
  /* Kolik samostatných hodnot boduje — podle toho se řídí řada čipů. */
  function pocetSamostatnych(rez){
    var n = 0, v;
    for(v = 1; v <= 6; v++){ if(rez.sam[v] > 0) n++; }
    return n;
  }

  /* Dvě čísla zdrojový dokument u pětikostkové verze neurčuje a dosazují se:
     sazba pětikostkové postupky (500 / 750 jako u KCD2) a pravidlo pro čtyři
     a pět stejných (násobek jako u klasiky). Obojí je editovatelné. */
  var PRESET_REZIMY = {
    "kcd2":    { kostek:6, sam:SAM_ZAKLAD, stej:{ 3:TROJ_ZAKLAD }, nad:"x2",
                 nadP:NADP_ZAKLAD, post:{ "15":500, "26":750, "16":1500 }, p:{}, v:[] },
    "klasika": { kostek:6, sam:SAM_ZAKLAD, stej:{ 3:TROJ_ZAKLAD }, nad:"nasobek",
                 nadP:NADP_ZAKLAD, post:{ "16":1000 }, p:{ "3p":750 }, v:[] },
    "pet":     { kostek:5, sam:SAM_ZAKLAD, stej:{ 3:TROJ_ZAKLAD }, nad:"nasobek",
                 nadP:NADP_ZAKLAD, post:{ "15":500, "26":750 }, p:{}, v:[] }
  };
  var PRESET_REZ_PORADI = ["kcd2", "klasika", "pet"];

  var REZIMY = { akt: VYCHOZI_REZIM, sez: [] };

  function kopieMapy(m){
    var out = {}, k;
    for(k in m){ if(Object.prototype.hasOwnProperty.call(m, k)) out[k] = m[k]; }
    return out;
  }
  function stejnaMapa(a, b){
    var k;
    for(k in a){ if(Object.prototype.hasOwnProperty.call(a, k) && a[k] !== b[k]) return false; }
    for(k in b){ if(Object.prototype.hasOwnProperty.call(b, k) && a[k] !== b[k]) return false; }
    return true;
  }
  function stejnePole(a, b){
    if(a.length !== b.length) return false;
    for(var i = 0; i < a.length; i++){ if(a[i] !== b[i]) return false; }
    return true;
  }
  /* Čerstvý režim z presetu. Pole a mapy se kopírují, aby úprava jednoho
     režimu nepřepsala výchozí tabulku ani sourozence. */
  function zPresetu(id){
    var d = PRESET_REZIMY[id];
    return { id: id, nazev: null, vlastni: false,
             kostek: d.kostek,
             sam: d.sam.slice(), stej: kopieStej(d.stej), rozs: false,
             nad: d.nad, nadP: d.nadP.slice(),
             post: kopieMapy(d.post), p: kopieMapy(d.p), v: [] };
  }
  function rezimPodleId(id){
    for(var i = 0; i < REZIMY.sez.length; i++){ if(REZIMY.sez[i].id === id) return REZIMY.sez[i]; }
    return null;
  }
  /* Aktivní režim se nikdy nevrací jako null: neznámé id (smazaný vlastní
     režim, cizí záloha) spadne na výchozí. */
  function aktRezim(){ return rezimPodleId(REZIMY.akt) || rezimPodleId(VYCHOZI_REZIM); }
  function kostek(){ return aktRezim().kostek; }
  function seznamRezimu(){ return REZIMY.sez.slice(); }
  function jePreset(id){ return Object.prototype.hasOwnProperty.call(PRESET_REZIMY, id); }

  /* Cizí záloha ani poškozené úložiště nesmí projít dál nezkontrolované.
     `zaklad` je preset, ze kterého se vychází u přednastaveného režimu;
     u vlastního je to výchozí KCD2, aby chybějící pole měla čím být. */
  function cistyRezim(x, id, zaklad){
    var rez = zPresetu(zaklad || VYCHOZI_REZIM), v, b, k, i, pole;
    rez.id = id;
    rez.vlastni = !jePreset(id);
    if(!x || typeof x !== "object") return rez;
    if(typeof x.nazev === "string") rez.nazev = x.nazev.slice(0, NAZEV_MAX);
    b = Math.floor(naCislo(x.kostek, 0));
    if(b >= 2 && b <= 6) rez.kostek = b;
    /* Dokud tabulka měla jen jedničku a pětku, ukládaly se pod jed/pet.
       Čte se to dál, aby se režim uložený tehdejší verzí nerozbil. */
    if(x.sam === undefined && (x.jed !== undefined || x.pet !== undefined)){
      pole = rez.sam.slice();
      if(x.jed !== undefined) pole[1] = mezeBodu(x.jed);
      if(x.pet !== undefined) pole[5] = mezeBodu(x.pet);
      rez.sam = pole;
    }
    if(Array.isArray(x.sam)){
      pole = rez.sam.slice();
      for(v = 1; v <= 6; v++){ if(x.sam[v] !== undefined) pole[v] = mezeBodu(x.sam[v]); }
      rez.sam = pole;
    }
    /* Počty stejných čísel drží dnes řídká mapa `stej`; dřív to byla dvě pevná
       pole `dvoj` a `troj`. Čte se obojí, aby režim uložený starší verzí platil
       dál — prázdná šestice znamenala vypnuto tehdy i teď. */
    if(x.stej && typeof x.stej === "object"){
      rez.stej = {};
      for(i = 0; i < POCTY_STEJ.length; i++){
        pole = cistaSestice(x.stej[POCTY_STEJ[i]]);
        if(pole) rez.stej[POCTY_STEJ[i]] = pole;
      }
    } else if(x.dvoj !== undefined || x.troj !== undefined){
      /* Starý zápis nesl dvě pevná pole a v odchylkách presetu stálo jen to,
         co se lišilo — nedotčené pole se proto nesmí vzít jako vypnuté.
         Výslovná šestice samých nul vypnutí znamená. */
      if(x.dvoj !== undefined){
        pole = cistaSestice(x.dvoj);
        if(pole) rez.stej[2] = pole; else delete rez.stej[2];
      }
      if(x.troj !== undefined){
        pole = cistaSestice(x.troj);
        if(pole) rez.stej[3] = pole; else delete rez.stej[3];
      }
    }
    if(NAD_DRUHY.indexOf(x.nad) >= 0) rez.nad = x.nad;
    if(Array.isArray(x.nadP)){
      pole = rez.nadP.slice();
      if(x.nadP.length === 3){
        /* starý zápis: tři čísla pro počty 4–6, práh byl vždycky trojka */
        for(i = 0; i < 3; i++){ if(x.nadP[i] !== undefined) pole[i + 4] = mezeBodu(x.nadP[i]); }
        pole[3] = pole[4];
      } else {
        for(i = 3; i <= 6; i++){ if(x.nadP[i] !== undefined) pole[i] = mezeBodu(x.nadP[i]); }
      }
      rez.nadP = pole;
    }
    if(x.post && typeof x.post === "object"){
      rez.post = {};
      for(i = 0; i < POST_PORADI.length; i++){
        k = POST_PORADI[i];
        if(x.post[k] === undefined) continue;
        b = mezeBodu(x.post[k]);
        if(b > 0) rez.post[k] = b;
      }
    }
    if(x.p && typeof x.p === "object"){
      rez.p = {};
      for(i = 0; i < PRESET_PORADI.length; i++){
        k = PRESET_PORADI[i];
        if(x.p[k] === undefined) continue;
        b = mezeBodu(x.p[k]);
        if(b > 0) rez.p[k] = b;
      }
    }
    if(Array.isArray(x.v)){
      for(i = 0; i < x.v.length && rez.v.length < VLASTNI_MAX; i++){
        var vz = cistaKombinace(x.v[i], rez.v.length + 1);
        if(vz) rez.v.push(vz);
      }
    }
    /* Rozšířený rozpad je jen pohled, ale víc než jeden zapnutý počet ho
       vynutí, ať je uloženo cokoli: základní pohled umí ukázat jediný. */
    rez.rozs = !!x.rozs || poctyStej(rez).length > 1;
    return rez;
  }
  function mezeBodu(x){
    var b = Math.floor(naCislo(typeof x === "string" ? parseInt(x, 10) : x, 0));
    if(!(b > 0)) return 0;
    return Math.min(b, BODY_MAX);
  }

  function nactiRezimy(){
    var raw = null, o = null, i, id;
    try{ raw = localStorage.getItem(REZKEY); }catch(e){}
    if(raw){ try{ o = JSON.parse(raw); }catch(e){ o = null; } }
    if(!o || typeof o !== "object") o = null;
    /* Migrace: kombinace navíc byly dosud jedny pro celou aplikaci a hrálo se
       s nimi podle KCD2 — stanou se tedy odchylkou toho režimu. Starý klíč se
       nemaže, stejný záchranný idiom jako u farkle-hist-v1-zaloha. */
    if(!o){
      var stare = null;
      try{ stare = localStorage.getItem(KOMBKEY); }catch(e){}
      if(stare){
        try{ var so = JSON.parse(stare); }catch(e){ so = null; }
        if(so && typeof so === "object") o = { akt: VYCHOZI_REZIM, p: { kcd2: { p: so.p, v: so.v } }, v: [] };
      }
    }
    REZIMY.sez = [];
    for(i = 0; i < PRESET_REZ_PORADI.length; i++){
      id = PRESET_REZ_PORADI[i];
      REZIMY.sez.push(cistyRezim(o && o.p ? o.p[id] : null, id, id));
    }
    if(o && Array.isArray(o.v)){
      for(i = 0; i < o.v.length && REZIMY.sez.length < PRESET_REZ_PORADI.length + REZIMY_MAX; i++){
        var x = o.v[i];
        if(!x || typeof x !== "object") continue;
        id = (typeof x.id === "string" && x.id && !jePreset(x.id)) ? x.id.slice(0, 40) : novyIdRezimu();
        if(rezimPodleId(id)) continue;
        REZIMY.sez.push(cistyRezim(x, id, VYCHOZI_REZIM));
      }
    }
    REZIMY.akt = (o && typeof o.akt === "string" && rezimPodleId(o.akt)) ? o.akt : VYCHOZI_REZIM;
  }
  function novyIdRezimu(){
    return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  /* U presetu se ukládají jen odchylky od výchozích hodnot. Kdyby se ukládal
     celý, pozdější oprava výchozí tabulky by nedorazila k nikomu, kdo se
     režimu jednou dotkl. Vlastní režim není proti čemu diffovat. */
  function venKombinaci(k){
    return { id: k.id, n: k.n, b: k.b, z: k.z,
             vz: k.vz.map(function(vz){ return { v: vz.v, t: vz.tvar }; }) };
  }
  function odchylkyRezimu(rez){
    var d = PRESET_REZIMY[rez.id], out = {}, prazdno = true;
    function dej(klic, hodnota){ out[klic] = hodnota; prazdno = false; }
    if(rez.kostek !== d.kostek) dej("kostek", rez.kostek);
    if(!stejnePole(rez.sam, d.sam)) dej("sam", rez.sam.slice());
    if(!stejnaStej(rez.stej, d.stej)) dej("stej", kopieStej(rez.stej));
    if(rez.rozs) dej("rozs", true);
    if(rez.nad !== d.nad) dej("nad", rez.nad);
    if(!stejnePole(rez.nadP, d.nadP)) dej("nadP", rez.nadP.slice());
    if(!stejnaMapa(rez.post, d.post)) dej("post", kopieMapy(rez.post));
    if(!stejnaMapa(rez.p, d.p)) dej("p", kopieMapy(rez.p));
    if(rez.v.length) dej("v", rez.v.map(venKombinaci));
    return prazdno ? null : out;
  }
  function venRezim(rez){
    return { id: rez.id, nazev: rez.nazev, kostek: rez.kostek,
             sam: rez.sam.slice(), stej: kopieStej(rez.stej), rozs: rez.rozs,
             nad: rez.nad, nadP: rez.nadP.slice(),
             post: kopieMapy(rez.post), p: kopieMapy(rez.p), v: rez.v.map(venKombinaci) };
  }
  function ulozRezimy(){
    var ven = { akt: REZIMY.akt, p: {}, v: [] }, o;
    REZIMY.sez.forEach(function(rez){
      if(rez.vlastni){ ven.v.push(venRezim(rez)); return; }
      o = odchylkyRezimu(rez);
      if(o) ven.p[rez.id] = o;
    });
    try{ localStorage.setItem(REZKEY, JSON.stringify(ven)); }catch(e){}
  }

  /* ---------- riziko farklu ----------
     Změřeno vyčerpávajícím výčtem 6^n, ne opsáno odjinud. Tři z pěti
     přednastavených kombinací riziko nemění vůbec — trojice+dvojice, dvě
     trojice i čtveřice+dvojice obsahují trojici, která už dnes boduje, takže
     hod, který je splňuje, nikdy nebyl farkle. Mění ho tři dvojice (a to jen
     na šesti kostkách) a dvě dvojice, které trojici uvnitř nemají a srazí
     riziko už od čtyř kostek. Bez vlastních kombinací má tabulka proto tři
     podoby a při startu se nepočítá nic.

     Konstanty platí pro **výchozí základ KCD2** — jednička, pětka i všech
     šest trojic bodují a nic jiného z počtů. Ten základ mají všechny tři
     přednastavené režimy, takže se pro ně nic nepočítá; teprve upravený režim
     nebo vlastní kombinace pošle na výčet. Počet kostek režimu na tabulku
     nemá vliv: riziko se ptá, kolika kostkami se hází teď, ne kolik jich má
     hra celkem.

     Že se konstanty po jakékoli změně pravidel tiše nerozejdou se
     skutečností, hlídá strážní test sady 19 — ten si všechny tři sady pokaždé
     odvodí výčtem znovu. */
  var RIZIKO    = [66.7, 44.4, 27.8, 15.7, 7.7, 3.1];
  var RIZIKO_3P = [66.7, 44.4, 27.8, 15.7, 7.7, 2.3];
  /* Dvě dvojice jsou jediná přednastavená kombinace bez trojice uvnitř, takže
     jako jediná mění riziko od čtyř kostek výš — na šesti kostkách ho srazí
     na nulu: hod bez jedničky, bez pětky, bez trojice a bez dvou dvojic
     ze šesti kostek neexistuje. Tři dvojice dvě dvojice obsahují, takže
     zapnuté obojí dá tutéž tabulku. */
  var RIZIKO_2P = [66.7, 44.4, 27.8, 13, 3.1, 0];
  /* Cache i běžící výpočty klíčované podpisem pravidel: přepnutí režimu tam
     a zpátky tak nespustí výčet podruhé. */
  var rizikoCache = {}, rizikoBezi = {};

  function poctyZHodu(hod){
    var c = [0,0,0,0,0,0,0], i;
    for(i = 0; i < hod.length; i++) c[hod[i]]++;
    return c;
  }
  /* Boduje hod podle pravidel režimu? Postupky se sem dopsat musely: dřív je
     pokrývala jednička a pětka, ale režim je může mít obě na nule. */
  function bodujeZaklad(c, rez){
    var v, n, i, k;
    for(v = 1; v <= 6; v++){
      if(!c[v]) continue;
      if(rez.sam[v] > 0) return true;
      /* Ptát se rovnou kindPoints() je jediná cesta, jak pokrýt i extrapolaci
         nad prahem — pevné body platí i tam, kde sama skupina neboduje. */
      for(n = 2; n <= c[v]; n++){ if(kindPoints(v, n, rez) > 0) return true; }
    }
    for(i = 0; i < POST_PORADI.length; i++){
      k = POST_PORADI[i];
      if(rez.post[k] > 0 && maPostupku(c, STRAIGHTS[k])) return true;
    }
    return false;
  }
  /* Sedí vzor do hodu? Nejdřív konkrétní hodnoty — test podmnožiny
     multimnožiny. Pak skupiny: každá bere jinou hodnotu, a jinou i než ty,
     které vzor žádá číslem, takže se jedna kostka nezapočítá dvakrát.
     Zbylé počty se porovnají hladově po největších, což je pro tenhle tvar
     úlohy správně. Obojí zvlášť jsou krajní případy téhož výpočtu. */
  function sediVzor(vz, c){
    var v, i, zbytek = [];
    for(v = 1; v <= 6; v++){ if(vz.pocty[v] && c[v] < vz.pocty[v]) return false; }
    if(!vz.tvar.length) return true;
    for(v = 1; v <= 6; v++){ if(!vz.pocty[v] && c[v]) zbytek.push(c[v]); }
    if(zbytek.length < vz.tvar.length) return false;
    zbytek.sort(function(a, b){ return b - a; });
    for(i = 0; i < vz.tvar.length; i++){ if(zbytek[i] < vz.tvar[i]) return false; }
    return true;
  }
  function bodujeSKombinacemi(c, rez, komb){
    var i, k;
    if(bodujeZaklad(c, rez)) return true;
    for(i = 0; i < PRESET_PORADI.length; i++){
      k = PRESET_PORADI[i];
      if(kombZap(rez, k) && kombVRezimu(rez, k) && PRESETY[k].je(c)) return true;
    }
    for(i = 0; i < komb.length; i++){ if(sediKombinace(komb[i], c)) return true; }
    return false;
  }
  /* 6^1 + … + 6^6 = 55 986 hodů, v JS jednotky až nízké desítky ms; na pěti
     kostkách 9 330. Pouští se líně a jen tehdy, když se pravidla liší od
     základu KCD2. Seznam vzorů se předává dovnitř, aby se filtr nedělal
     desetitisíckrát znovu. */
  function spocitejRiziko(rez){
    var out = [], komb = kombinaceZap(rez), n, celkem, farkle, i, j, x, hod;
    for(n = 1; n <= rez.kostek; n++){
      celkem = Math.pow(6, n); farkle = 0; hod = new Array(n);
      for(i = 0; i < celkem; i++){
        x = i;
        for(j = 0; j < n; j++){ hod[j] = (x % 6) + 1; x = Math.floor(x / 6); }
        if(!bodujeSKombinacemi(poctyZHodu(hod), rez, komb)) farkle++;
      }
      out.push(Math.round(farkle / celkem * 1000) / 10);
    }
    return out;
  }
  /* Riziko nezajímají sazby, jen co vůbec boduje — podpis proto nese
     přítomnost, ne čísla. Bez toho by přepsání jedné sazby zahodilo cache. */
  function podpisRezimu(rez){
    var v, i, n, s = rez.kostek + "|";
    for(v = 1; v <= 6; v++) s += rez.sam[v] > 0 ? "1" : "0";
    s += "-";
    for(i = 0; i < POCTY_STEJ.length; i++){
      n = POCTY_STEJ[i];
      if(!rez.stej[n]){ s += "-"; continue; }
      for(v = 1; v <= 6; v++) s += rez.stej[n][v] > 0 ? "1" : "0";
      s += ".";
    }
    /* Pravidlo nad prahem patří do podpisu: u pevných bodů rozhoduje o tom,
       jestli vyšší počty vůbec bodují. */
    s += "|" + rez.nad + (rez.nad === "pevne"
      ? rez.nadP.map(function(x){ return x > 0 ? "1" : "0"; }).join("") : "");
    s += "|" + POST_PORADI.map(function(k){ return rez.post[k] > 0 ? "1" : "0"; }).join("");
    s += "|" + PRESET_PORADI.map(function(k){
      return (kombZap(rez, k) && kombVRezimu(rez, k)) ? "1" : "0"; }).join("");
    s += "|" + kombinaceZap(rez).map(function(k){
      return k.vz.map(function(vz){
        return "h" + vz.v.join("") + "t" + vz.tvar.join(""); }).join(","); }).join(";");
    return s;
  }
  /* Základ KCD: samostatně boduje **právě** jednička a pětka, bodují právě
     trojice (a nic jiného z počtů) a není zapnutá žádná vlastní kombinace.
     Pak platí konstanty — postupky ani tři z pěti přednastavených kombinací
     riziko nemění, protože každá z nich nese jedničku, pětku nebo trojici. */
  function zakladJakoKcd2(rez){
    var v, p = poctyStej(rez);
    if(p.length !== 1 || p[0] !== 3) return false;
    for(v = 1; v <= 6; v++){
      if((rez.sam[v] > 0) !== (v === 1 || v === 5)) return false;
      if(!(rez.stej[3][v] > 0)) return false;
    }
    return kombinaceZap(rez).length === 0;
  }
  function tabulkaRizika(rez){
    rez = rez || aktRezim();
    var dve = kombZap(rez, "2p") && kombVRezimu(rez, "2p");
    var tri = kombZap(rez, "3p") && kombVRezimu(rez, "3p");
    var hotova = dve ? RIZIKO_2P : (tri ? RIZIKO_3P : RIZIKO);
    if(zakladJakoKcd2(rez)) return hotova;
    var podpis = podpisRezimu(rez);
    if(rizikoCache[podpis]) return rizikoCache[podpis];
    /* Než výčet doběhne, platí konstanty jako horní odhad — kombinace navíc
       riziko jen snižují. */
    if(!rizikoBezi[podpis]){
      rizikoBezi[podpis] = true;
      setTimeout(function(){
        rizikoBezi[podpis] = false;
        rizikoCache[podpis] = spocitejRiziko(rez);
        render();
        /* Pás v nastavení má vlastní dveře k překreslení: renderRezimy() by
           uprostřed psaní do pole sebralo kurzor. */
        var e = editRezim();
        if(e) renderRezPruh(e);
      }, 0);
    }
    return hotova;
  }
  /* Platí to, co tabulkaRizika() vrací, nebo je to zatím jen horní odhad?
     Pás v nastavení to musí umět rozeznat — u přepsané tabulky je konstanta
     lež, ne odhad blízko pravdy. */
  function rizikoHotovo(rez){
    return zakladJakoKcd2(rez) || !!rizikoCache[podpisRezimu(rez)];
  }
  /* Jediné dveře ke změně pravidel: uloží a překreslí obojí — nastavení
     i klávesnici (tu přes render()). Cache rizika se nezahazuje, je klíčovaná
     podpisem. */
  function zmenaRezimu(){
    ulozRezimy();
    renderRezimy();
    if(prekresliPravidla) prekresliPravidla();
    render();
  }
  nactiRezimy();

  /* Sonda pro testy, stejně jako window.__i18n: strážní test sady 19 si musí
     obě konstantní tabulky rizika pokaždé odvodit výčtem z týchž pravidel,
     která počítá aplikace. Bez toho by se čísla po jakékoli změně bodování
     tiše rozešla a nic by to nechytlo. Aplikace sondu sama nepoužívá. */
  try{
    window.__pravidla = { kindPoints: kindPoints, STRAIGHTS: STRAIGHTS, PRESETY: PRESETY,
                          RIZIKO: RIZIKO, RIZIKO_3P: RIZIKO_3P, RIZIKO_2P: RIZIKO_2P,
                          PRESET_REZIMY: PRESET_REZIMY, REZIMY: REZIMY,
                          POCTY_STEJ: POCTY_STEJ,
                          aktRezim: function(){ return aktRezim(); },
                          sediVzor: sediVzor, sediKombinace: sediKombinace,
                          poctyZHodu: poctyZHodu, zapisVzoru: zapisVzoru,
                          tabulka: function(rez){ return tabulkaRizika(rez); } };
  }catch(e){}
  /* Vlastní formát místo toLocale*: na různých zařízeních by se lišil
     a font má omezenou sadu znaků. */
  function dt(ms){ return kat("datumCas")(new Date(ms)); }
  /* pro údaje, které nepatří jedné hře, ale celému dni */
  function dtDen(ms){ return kat("datum")(new Date(ms)); }
  /* Jediné místo, kde se skládá text typu hry (do bodů / na kola). Používá ho
     popis hry v Zápisu kol, řádek historie, podřádek statistiky i řádek
     žebříčku — dřív se stejný výraz psal dvakrát zvlášť.

     Pozor na slovo: **typ hry** je do bodů / na kola, **herní režim** je sada
     pravidel (část 14 CLAUDE.md). Dokud se to jmenovalo obojí „režim“, byla
     to stejná past jako kdysi „tah“. Pole v datech se dál jmenuje `mode`,
     protože leží v historii i v zálohách. */
  function popisTypuHry(rec){
    return rec.mode === "rounds"
      ? (rec.roundGoal ? t("typhry.nakolalimit", { n: rec.roundGoal }) : t("typhry.nakola"))
      : t("typhry.dobodu", { b: fmt(rec.goal || 0) });
  }
  function popisHry(rec){
    var kol = gKol(rec);
    return dt(rec.savedAt) + " \u00B7 " + nazevRezimuZaznamu(rec) +
           " \u00B7 " + popisTypuHry(rec) + " \u00B7 " + tn("slovo.kolo", kol);
  }
  function fmt(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, kat("sep")); }
  /* Popisy kol a názvy položek můžou pocházet z cizí zálohy nebo z poškozeného
     uložení; všude, kde jdou do innerHTML, musí projít tudy. */
  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;";
    });
  }

  /* ---------- štítky odložených položek ----------
     Položka nese kód, ne text. Kolo se ukládá do historie i do zálohy a text
     zapsaný při jeho vzniku by v něm zafixoval jazyk natrvalo — po přepnutí
     by se přeložilo rozhraní, ale dohrané hry ne. Na slova se kód převádí až
     při vykreslení.

     Kolo drží kódy v poli c: hody odděluje "|", položky ",". Je to kratší než
     dřívější český popis a triviálně rozebratelné. */
  /* Samostatná jednička a pětka nesou j a p odjakživa a leží tak v historii;
     zbylé čtyři hodnoty, které umí bodovat samostatně od zavedení volné
     bodovací tabulky, dostaly kódy d2–d6. Ta asymetrie je záměrná: přepsat
     j a p na d1 a d5 by znamenalo sáhnout na uložená data. */
  var KODY = ["j", "p", "v", "d2", "d3", "d4", "d6",
              "s15", "s26", "s16", "c3p", "c32", "c33", "c42"];
  var SAM_KODY = ["", "j", "d2", "d3", "d4", "p", "d6"];
  /* Dvojice se vejde do dnešní gramatiky „počet × hodnota“ — proto [2-6],
     ne [3-6] jako dřív. */
  var NKOD = /^n([2-6])([1-6])$/;
  /* Jediné místo, kde vzniká kód pro „N kostek téže hodnoty“. Používá ho řada
     čipů i tlačítko +, takže odložení trojky dá týž kód oběma cestami. */
  function kodStejnych(count, value){
    return count === 1 ? SAM_KODY[value] : ("n" + count + value);
  }
  /* Vlastní kombinace nese body a počet kostek přímo v kódu, ne odkaz na vzor
     v nastavení. Kdyby odkazoval, smazání vzoru — nebo import zálohy na cizí
     telefon — by nechalo v historii viset kód, ke kterému neexistuje text.
     k1500x5 se přečte vždycky a všude. */
  var KKOD = /^k(\d{1,6})x([1-6])$/;
  var HODY_ODD = "|", POLOZKY_ODD = ",";
  var HODY_TXT = " \u00B7 ", POLOZKY_TXT = " + ";

  /* Záznamy zapsané před zavedením kódů nesou text v poli d. Ten je vždycky
     český — jiný jazyk aplikace tehdy neuměla — a tabulka je proto zmrazená.
     Svázat ji s katalogem by znamenalo, že přeformulování českého štítku
     udělá ze starých dat nečitelná. Že se obě strany nerozešly, hlídá
     sada 17. */
  var STARE = { "jednička": "j", "pětka": "p", "vlastní": "v",
                "postupka 1\u20135": "s15", "postupka 2\u20136": "s26",
                "postupka 1\u20136": "s16" };
  var STARE_N = /^([3-6])\u00D7 ([1-6])$/;

  /* Neznámý kód se ukáže tak, jak je: cizí záloha ani poškozená data se
     nemají tvářit jako prázdné místo. Do stránky jde přes esc() jako
     všechno ostatní. */
  function textKodu(k){
    var m = NKOD.exec(k);
    if(m) return t("stitek.n", { p: m[1], h: m[2] });
    m = KKOD.exec(k);
    /* Body jsou v it.p, ne v kódu — pozdější změna sazby v nastavení tedy
       historii nepřepíše. V kódu jsou proto, aby se štítek přečetl i tam,
       kde se položka rozpadla na samotný popis. */
    if(m) return t("stitek.k", { b: fmt(Number(m[1])), d: tn("pocitadlo.kostzkr", Number(m[2])) });
    return KODY.indexOf(k) >= 0 ? t("stitek." + k) : String(k);
  }
  function stitek(it){
    if(it && typeof it.k === "string") return textKodu(it.k);
    /* rozehraná hra uložená starší verzí, jejíž text se rozebrat nepodařilo */
    return (it && typeof it.l === "string") ? it.l : t("stitek.v");
  }
  function kodyNaText(c){
    if(!c) return "";
    return String(c).split(HODY_ODD).map(function(hod){
      return hod.split(POLOZKY_ODD).map(textKodu).join(POLOZKY_TXT);
    }).join(HODY_TXT);
  }
  function kodZTextu(s){
    if(Object.prototype.hasOwnProperty.call(STARE, s)) return STARE[s];
    var m = STARE_N.exec(s);
    return m ? ("n" + m[1] + m[2]) : null;
  }
  /* Rozbor běží líně při čtení a nic nepřepisuje — stejný vzorec jako dopočet
     chybějících polí souhrnu, a stejně jako on nepotřebuje bump verze IndexedDB.
     Gramatika je uzavřená, takže selhání znamená cizí nebo poškozená data;
     pak se vrací null a volající text ukáže syrový. */
  function kodyZPopisu(d){
    if(!d) return "";
    var hody = String(d).split(HODY_TXT), out = [], i, j, kusy, radek, k;
    for(i = 0; i < hody.length; i++){
      kusy = hody[i].split(POLOZKY_TXT); radek = [];
      for(j = 0; j < kusy.length; j++){
        k = kodZTextu(kusy[j]);
        if(k === null) return null;
        radek.push(k);
      }
      out.push(radek.join(POLOZKY_ODD));
    }
    return out.join(HODY_ODD);
  }
  /* Jediné místo, kde se popis kola skládá pro zobrazení. Kód vyhrává; není-li,
     zkusí se rozebrat starý text a teprve pak se ukáže tak, jak je. */
  function popisKola(tah){
    if(tah && typeof tah.c === "string") return kodyNaText(tah.c);
    var d = (tah && typeof tah.d === "string") ? tah.d : "";
    var c = kodyZPopisu(d);
    return c === null ? d : kodyNaText(c);
  }
  /* Kolo se všude kopíruje stejně: veze si kódy, a nemá-li je, původní text.
     Nic se nepřepisuje, takže starý záznam přežije i opakovaný zápis do
     historie, export i import beze změny. */
  function kopieKola(tah, strop){
    var o = { p: naCislo(tah && tah.p, 0), bust: !!(tah && tah.bust) };
    if(tah && typeof tah.c === "string"){
      o.c = strop ? tah.c.slice(0, strop) : tah.c;
    } else {
      var d = (tah && typeof tah.d === "string") ? tah.d : "";
      o.d = strop ? d.slice(0, strop) : d;
    }
    return o;
  }

  /* ---------- odvozené ---------- */
  function cur(){ return S.rolls[S.rolls.length - 1]; }
  function usedInRoll(r){ return r.items.reduce(function(a,i){ return a + i.d; }, 0); }
  function left(){ return cur().thrown - usedInRoll(cur()); }
  function rollPoints(r){ return r.items.reduce(function(a,i){ return a + i.p; }, 0); }
  function potTotal(){ return S.rolls.reduce(function(a,r){ return a + rollPoints(r); }, 0); }
  /* Prázdný hod se do popisu nedostane — u farklu je poslední hod prázdný
     z definice a slovo se dopisuje až při zobrazení. */
  function turnKody(){
    var out = [], i, j, r, radek;
    for(i = 0; i < S.rolls.length; i++){
      r = S.rolls[i]; radek = [];
      for(j = 0; j < r.items.length; j++){
        /* položka bez kódu se do c zapsat nedá */
        if(typeof r.items[j].k !== "string") return null;
        radek.push(r.items[j].k);
      }
      if(radek.length) out.push(radek.join(POLOZKY_ODD));
    }
    return out.join(HODY_ODD);
  }
  function turnDesc(){
    return S.rolls.map(function(r){ return r.items.map(stitek).join(POLOZKY_TXT); })
                  .filter(Boolean).join(HODY_TXT);
  }
  /* Kolo se ukládá v kódech. Kdyby některá položka kód neměla — rozehraná hra
     z doby před nimi, jejíž štítek se rozebrat nepodařilo — zapíše se raději
     text; ztratit štítek by bylo horší než zafixovat u jednoho kola jazyk. */
  function zapisKolo(bodu, farkle){
    var c = turnKody(), tah = { p: bodu, bust: farkle };
    if(c === null){ tah.d = turnDesc(); } else { tah.c = c; }
    S.turns.push(tah);
  }

  /* ---------- prvky ---------- */
  var $ = function(id){ return document.getElementById(id); };
  var elScore=$("score"), elTotal=$("total"), elRest=$("rest"), elRestLabel=$("restlabel"),
      elPot=$("pot"), elTurnLabel=$("turnlabel"),
      elRollLine=$("rollline"), elFix=$("fix"),
      elRollOn=$("rollon"), elBank=$("bank"), elBust=$("bust"), elBustRiz=$("bustriz"),
      elUndo=$("undo"), elLock=$("lock"),
      elRows=$("rows"), elEmpty=$("empty"), elArch=$("arch"), elKosList=$("koslist"), elKosHistList=$("koshistlist"),
      elTally=$("tally"), elTallyCap=$("tallycap"),
      elModeSel=$("modesel"), elGoalSel=$("goalsel"), elGoalNum=$("goalnum"),
      elRoundSel=$("roundsel"), elRoundNum=$("roundnum"),
      elPips=$("pips"), elCounts=$("counts"), elAddKind=$("addkind"),
      elMnum=$("mnum"), elMkost=$("mkost"), elMToggle=$("mtoggle"), elManual=$("manualwrap"),
      elStrRow=$("strrow"), elStrCap=$("strcap"), elVlastniRow=$("vlastnirow"),
      elSingleRow=$("singlerow"), elSingleCap=$("singlecap");
  var elDataSingle = Array.prototype.slice.call(document.querySelectorAll("[data-single]")),
      elDataStr    = Array.prototype.slice.call(document.querySelectorAll("[data-str]")),
      elDataKombi  = Array.prototype.slice.call(document.querySelectorAll("[data-kombi]"));

  var selValue = null, selCount = 3, manualDice = 1;

  [1,2,3,4,5,6].forEach(function(v){
    var b = document.createElement("button");
    b.className = "chip"; b.textContent = v; b.dataset.value = v;
    b.addEventListener("click", function(){ selValue = (selValue === v ? null : v); renderKind(); });
    elPips.appendChild(b);
  });
  /* Počty od jedné: 1× nastupuje, když se samostatné hodnoty nevejdou do
     vlastní řady čipů, 2× když v režimu boduje dvojice. Co je z nich vidět,
     rozhoduje renderKind(). */
  [1,2,3,4,5,6].forEach(function(c){
    var b = document.createElement("button");
    b.className = "chip"; b.textContent = c + "×"; b.dataset.count = c;
    b.addEventListener("click", function(){ selCount = c; renderKind(); });
    elCounts.appendChild(b);
  });

  /* ---------- konec hry ----------
     Hlídání je jen pomůcka: zvýšením limitu či cíle nebo přepnutím na
     „neomezeně“ se hra zase odemkne.

     V bodech stačí ptát se na `banked`, protože ten roste jedině v bank().
     Zámek tak naskočí až po zapsání kola, kterým se cíl dosáhl nebo překročil
     — body ležící na stole se do něj nepočítají. */
  function locked(){
    if(S.mode === "points") return S.banked >= S.goal;
    return S.roundGoal > 0 && S.turns.length >= S.roundGoal;
  }

  /* ---------- akce ---------- */
  /* diceUsed < 1 by šlo zapisovat donekonečna, aniž by ubývaly kostky —
     jediná cesta sem je ruční zadání při nule zbývajících kostek */
  function keep(kod, points, diceUsed){
    if(diceUsed < 1 || diceUsed > left()) return;
    cur().items.push({k:kod, p:points, d:diceUsed});
    render();
  }
  function unkeep(i){ cur().items.splice(i, 1); render(); }

  function rollOn(){
    /* v zámku tlačítko nehází, ale odvede na zápis kol — hra je u konce
       a další krok je uložit ji nebo si ji prohlédnout */
    if(locked()){ goTo(1); return; }
    if(cur().items.length === 0) return;
    var rest = left();
    S.rolls.push({ thrown: rest > 0 ? rest : kostek(), hot: rest === 0, items: [] });
    render();
  }

  function bank(){
    var p = potTotal();
    if(p <= 0 || locked()) return;
    S.dirty = true;
    zapisKolo(p, false);
    S.banked += p;
    S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    render();
    zkusAutoUlozit();
  }
  function bust(){
    if(locked()) return;
    S.dirty = true;
    zapisKolo(potTotal(), true);
    S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    render();
    zkusAutoUlozit();
  }
  /* Zpět se drží uvnitř rozehraného kola: ubírá položky, pak celé hody.
     Zapsaná kola nemaže — na ty je Opravit v Zápisu kol. Dřív sahalo i na
     ně a jedno klepnutí navíc tak umazalo kolo, o které uživatel nežádal. */
  function jdeZpet(){ return cur().items.length > 0 || S.rolls.length > 1; }
  function undo(){
    if(!jdeZpet()) return;
    S.dirty = true;
    if(cur().items.length){ unkeep(cur().items.length - 1); return; }
    S.rolls.pop();
    render();
  }
  function wipe(){
    fixMode = false; pendingDel = null;
    S.banked = 0; S.turns = []; S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    S.archivedId = null; S.dirty = false; S.autoUlozeno = false;
    render();
  }
  /* ---------- zápis do historie ----------
     Hra se do historie zapíše na povel. Když už tam je a od té doby se hrálo,
     nabídne se aktualizace téhož záznamu — jinak by se rekordy počítaly dvakrát. */
  var archTimer = null, archMsg = "";
  function histIndex(list, id){
    for(var i = 0; i < list.length; i++){ if(list[i].id === id) return i; }
    return -1;
  }
  /* Kde leží záznam, na který je rozehraná hra navázaná: v historii, v koši
     smazaných z historie, nebo nikde. Stav se odvozuje, neukládá — jinak by
     ho rozešlo trvalé smazání z koše i vypadnutí přes strop deseti her.
     Do koše se sahá jen tehdy, když záznam v historii není, takže běžný
     průběh hry nestojí nic navíc. */
  function kdeZaznam(){
    if(!S.archivedId) return "nikde";
    if(histIndex(HIST, S.archivedId) >= 0) return "historie";
    return histIndex(kosHistAll(), S.archivedId) >= 0 ? "kos" : "nikde";
  }
  function archive(){
    if(gameEmpty()) return;
    /* nezapsané kolo propadne — na to se ptáme, jinde potvrzení není */
    if(potTotal() > 0 && !archTimer){
      archTimer = setTimeout(function(){ archTimer = null; renderArch(); }, 5000);
      renderArch();
      return;
    }
    clearTimeout(archTimer); archTimer = null;
    zapisHru(function(ok){ if(!ok) selhalZapis(); });
  }
  /* Selhání zápisu do historie hlásí tlačítko v Zápisu kol — ať už klepnutí
     přišlo od uživatele, nebo zápis pustil automat. */
  function selhalZapis(){
    archMsg = klicSelhani("chyba.mistoulozit");
    setTimeout(function(){ archMsg = ""; renderArch(); }, 4000);
    renderArch();
  }
  /* Samotný zápis bez ptaní a bez hlášení — volá ho tlačítko v Zápisu kol
     i „Uložit a začít novou“. Callback dostane true teprve tehdy, když je
     záznam skutečně v úložišti. */
  function zapisHru(hotovo){
    var kde = kdeZaznam();
    var list = histAll();
    var i = (kde === "historie") ? histIndex(list, S.archivedId) : -1;
    var rec = makeRecord(kde === "nikde" ? null : S.archivedId);
    if(i >= 0){ list[i] = proHistorii(rec); } else { list.push(proHistorii(rec)); }

    /* Návrat z koše jsou dva zápisy za sebou. Nejdřív se záznam z koše
       odebere, teprve pak se zapisuje do historie — kdyby druhý zápis padl,
       koš se vrátí do stavu před tím. Ztratit se nemůže nic: po celou tu
       dobu je hra živá v Zápisu kol. Opačné pořadí by při selhání nechalo
       tutéž hru v historii i v koši, tedy dvakrát. */
    var kosPredtim = null;
    if(kde === "kos"){
      kosPredtim = kosHistAll();
      if(!kosHistWrite(kosPredtim.filter(function(x){ return x.id !== S.archivedId; }))){
        if(hotovo) hotovo(false);
        return;
      }
    }

    histWrite(list, function(ok){
      if(ok){
        S.archivedId = rec.id; S.dirty = false;
        render(); renderP2();
      }else if(kosPredtim){
        kosHistWrite(kosPredtim);
        renderKos();
      }
      if(hotovo) hotovo(ok);
    }, [rec]);
  }
  function renderArch(){
    elArch.classList.remove("warn");
    if(archMsg){ elArch.disabled = true; elArch.textContent = t(archMsg); return; }
    if(gameEmpty()){ elArch.disabled = true; elArch.textContent = t("zapis.nicknulozeni"); return; }
    if(archTimer){
      elArch.disabled = false;
      elArch.classList.add("warn");
      elArch.textContent = t("arch.propadne", { b: fmt(potTotal()) });
      return;
    }
    var kde = kdeZaznam();
    /* Záznam smazaný z historie se z tlačítka vrací zpátky, a to pod stejným
       id — proto tady nevzniká nová hra ani při rozehrané úpravě. */
    if(kde === "kos"){
      elArch.disabled = false; elArch.textContent = t("arch.obnovit"); return;
    }
    if(kde === "historie" && !S.dirty){
      elArch.disabled = true; elArch.textContent = t("arch.ulozeno"); return;
    }
    elArch.disabled = false;
    elArch.textContent = t((kde === "historie") ? "arch.aktualizovat" : "arch.zapsat");
  }

  /* Selhání zápisu se hlásí tam, kde uživatel klepnul: text tlačítka se na
     čtyři vteřiny změní a pak se vrátí. Stejný idiom jako u Zapsat do historie. */
  function hlaskaNaTlacitku(btn, text, puvodni){
    if(!btn) return;
    btn.disabled = true;
    btn.classList.add("warn");
    btn.textContent = text;
    setTimeout(function(){
      btn.disabled = false;
      btn.classList.remove("warn");
      btn.textContent = puvodni;
    }, 4000);
  }

  /* ---------- koš ----------
     Nová hra nesmaže rozehranou hru nenávratně: pokud není v historii,
     odloží se sem a jde obnovit v nastavení. */
  /* Vrací true, když je rozehraná hra v bezpečí — buď je zálohovaná, nebo
     zálohu nepotřebuje. Volající pak smí teprve mazat. */
  function kosPush(){
    if(gameEmpty()) return true;
    /* záznam někde existuje a od té doby se nehrálo: zálohu netřeba */
    if(kdeZaznam() !== "nikde" && !S.dirty) return true;
    var list = kosAll();
    var rec = makeRecord(null);
    /* Vazba na původní záznam jde do koše s hrou. Bez ní by se obnovená hra
       dala zapsat jako nová a v historii by pak byla dvakrát. */
    if(S.archivedId) rec.puvodni = S.archivedId;
    list.unshift(rec);
    while(list.length > KOS_MAX){ list.pop(); }
    return kosWrite(list);
  }
  function nactiZaznam(rec){
    fixMode = false; pendingDel = null;
    S.mode = rec.mode === "rounds" ? "rounds" : "points";
    S.goal = rec.goal > 0 ? rec.goal : 4000;
    S.roundGoal = rec.roundGoal > 0 ? rec.roundGoal : null;
    S.banked = rec.banked || 0;
    S.turns = (rec.turns || []).map(function(tah){
      return kopieKola(tah);
    });
    /* Hra z koše se vrací i se svými pravidly: jinak by se dohrávala podle
       něčeho jiného, než podle čeho se začala. Neznámý režim (cizí záloha,
       smazaný vlastní) nechává volbu být. */
    if(rezimPodleId(gRezim(rec))){
      REZIMY.akt = gRezim(rec);
      ulozRezimy();
    }
    S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    /* Obnovená hra se hlásí ke svému původnímu záznamu, pokud si ho koš
       zapamatoval — jinak by šla zapsat podruhé. Do koše se ukládá jen hra
       s neuloženými změnami, takže rozdíl proti záznamu je jistý: dirty.
       Záznam o automatickém uložení se s hrou nepřenáší. */
    var puvodni = (rec && typeof rec.puvodni === "string") ? rec.puvodni : null;
    S.archivedId = puvodni; S.dirty = !!puvodni; S.autoUlozeno = false;
  }
  function restore(id, btn){
    var list = kosAll(), i = histIndex(list, id);
    if(i < 0) return;
    var rec = list[i];
    /* co je právě rozehrané, taky neztratíme — když se to nepovede uložit,
       obnovu neděláme, jinak by rozehraná hra zmizela */
    if(!kosPush()){
      hlaskaNaTlacitku(btn, t("chyba.zalohovathru"), t("spol.obnovit"));
      return;
    }
    list = kosAll().filter(function(x){ return x.id !== id; });
    kosWrite(list);
    nactiZaznam(rec);
    zavriModal();
    syncGoalUI(); render(); renderKos();
  }
  /* Počet v hlavičce oddílu: sbalená harmonika by jinak nedala poznat,
     jestli je uvnitř co obnovovat. */
  function pocetVOddilu(id, n){
    var el = document.getElementById(id);
    if(el) el.textContent = n ? String(n) : "";
  }
  /* Trvalé smazání se ptá stejným způsobem jako mazání kola: řádek se
     překlopí na otázku se dvěma tlačítky. Ptáme se vždy jen u jednoho
     řádku, proto jedno id na koš. */
  var ptamSeKos = null, ptamSeKosHist = null;

  function kosRadek(rec, ptaSe, akce){
    var row = document.createElement("div");
    row.className = "setrow kosrow";
    var popis = document.createElement("div");
    popis.className = "t";
    var btns = document.createElement("div");
    btns.className = "setbtns";
    if(ptaSe){
      popis.innerHTML = "<b>" + esc(t("kos.opravdutrvale")) + "</b><span>" +
        esc(fmt(rec.banked || 0) + " — " + popisHry(rec)) + "</span>";
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){ akce.smaz(ano); });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", akce.zrus);
      btns.appendChild(ano); btns.appendChild(ne);
    }else{
      popis.innerHTML = "<b>" + esc(fmt(rec.banked || 0)) + "</b><span>" + esc(popisHry(rec)) + "</span>";
      var ob = document.createElement("button");
      ob.type = "button"; ob.className = "ghost"; ob.textContent = t("spol.obnovit");
      ob.addEventListener("click", function(){ akce.obnov(ob); });
      var tr = document.createElement("button");
      tr.type = "button"; tr.className = "ghost"; tr.textContent = t("kos.trvalesmazat");
      tr.addEventListener("click", akce.ptejSe);
      btns.appendChild(ob); btns.appendChild(tr);
    }
    row.appendChild(popis); row.appendChild(btns);
    return row;
  }

  function renderKos(){
    renderKosHist();
    var list = kosAll();
    pocetVOddilu("koscnt", list.length);
    elKosList.innerHTML = "";
    if(!list.length){
      ptamSeKos = null;
      elKosList.innerHTML = '<div class="empty">' + esc(t("kos.prazdny")) + '</div>';
      return;
    }
    list.forEach(function(rec){
      elKosList.appendChild(kosRadek(rec, ptamSeKos === rec.id, {
        obnov: function(b){ restore(rec.id, b); },
        ptejSe: function(){ ptamSeKos = rec.id; renderKos(); },
        zrus: function(){ ptamSeKos = null; renderKos(); },
        smaz: function(b){
          /* Když zápis selže, záznam v koši zůstane — hlásíme to na tlačítku
             a řádek nepřekreslujeme, jinak by hláška hned zmizela. */
          if(!kosWrite(kosAll().filter(function(x){ return x.id !== rec.id; }))){
            hlaskaNaTlacitku(b, t("chyba.smazat"), t("spol.smazat"));
            return;
          }
          ptamSeKos = null;
          renderKos();
        }
      }));
    });
  }

  /* ---------- koš pro hry smazané z historie ----------
     Smazání z historie není nenávratné: záznam se odloží sem
     a tlačítkem se vrátí zpátky mezi dohrané hry. */
  /* Vrací true, když je kopie skutečně uložená — volající pak teprve smí
     smazat originál z historie. */
  function kosHistPush(rec){
    if(!rec) return false;
    var list = kosHistAll();
    list.unshift(rec);
    while(list.length > KOSH_MAX){ list.pop(); }
    return kosHistWrite(list);
  }
  function vratDoHistorie(id, btn){
    var list = kosHistAll(), i = histIndex(list, id);
    if(i < 0) return;
    var rec = list[i];
    var hry = histAll();
    /* kdyby se mezitím objevil záznam se stejným id (třeba importem) */
    if(histIndex(hry, rec.id) >= 0){ rec.id = newId(); }
    histWrite(hry.concat([proHistorii(rec)]), function(ok){
      if(!ok){
        hlaskaNaTlacitku(btn, t(klicSelhani("chyba.mistoulozit")), t("spol.obnovit"));
        return;
      }
      kosHistWrite(list.filter(function(x, k){ return k !== i; }));
      /* render() kvůli tlačítku v Zápisu kol: mohl se vrátit zrovna ten
         záznam, na který je rozehraná hra navázaná */
      render(); renderKosHist(); renderP2(); renderZaloha2();
    }, [rec]);
  }
  function renderKosHist(){
    var list = kosHistAll();
    pocetVOddilu("koshistcnt", list.length);
    elKosHistList.innerHTML = "";
    if(!list.length){
      ptamSeKosHist = null;
      elKosHistList.innerHTML = '<div class="empty">' + esc(t("kos.prazdnyhist")) + '</div>';
      return;
    }
    list.forEach(function(rec){
      elKosHistList.appendChild(kosRadek(rec, ptamSeKosHist === rec.id, {
        obnov: function(b){ vratDoHistorie(rec.id, b); },
        ptejSe: function(){ ptamSeKosHist = rec.id; renderKosHist(); },
        zrus: function(){ ptamSeKosHist = null; renderKosHist(); },
        smaz: function(b){
          if(!kosHistWrite(kosHistAll().filter(function(x){ return x.id !== rec.id; }))){
            hlaskaNaTlacitku(b, t("chyba.smazat"), t("spol.smazat"));
            return;
          }
          ptamSeKosHist = null;
          /* render() kvůli tlačítku v Zápisu kol: rozehraná hra se mohla
             vázat zrovna na tenhle záznam a teď už nemá kam */
          render(); renderKosHist();
        }
      }));
    });
  }

  /* ---------- karta Herní režimy v nastavení ----------
     Řádky se staví z uzlů jako kosRadek(), ne z innerHTML — je to zavedený
     vzor v tomhle okně a nepotřebuje esc(). Přepínače hlásí stav, ne akci:
     text říká Zapnuto/Vypnuto a v zapnutém stavu nese třídu `on`; co
     klepnutí udělá, zůstává v title a aria-label. */
  var kombNovy = [];
  /* Sazba upravená a pak vypnutá se v rámci sezení pamatuje, aby ji zpětné
     zapnutí nepřepsalo výchozí hodnotou. Do úložiště nejde: uložený stav má
     mít jednu pravdu, a tou je přítomnost klíče v `p` režimu. */
  var kombSazbyPamet = {};
  /* Rozdělaná otázka na smazání kombinace, jednoho jejího vzoru a celého
     režimu — jedna na oddíl, stejně jako ptamSeKos v koších. */
  var ptamSeVzor = null, ptamSeRezim = null, ptamSeTvar = null;
  /* Který režim se právě upravuje a která jeho vlastní kombinace; null je
     o patro výš, tedy seznam režimů a detail režimu. */
  var rezEdit = null, kombEdit = null;
  function editRezim(){ return rezEdit ? rezimPodleId(rezEdit) : null; }

  /* Název režimu se skládá na jednom místě: preset ho bere z katalogu podle
     id (a přeloží se), vlastní si veze svůj vlastní text. */
  function nazevRezimu(rez){
    if(!rez) return t("rezim.neznamy");
    if(!rez.vlastni) return t("rezim.n." + rez.id);
    return rez.nazev || t("rezim.beznazvu");
  }
  /* Podřádek seznamu: čím se ten režim liší, aniž by se musel otevřít. */
  function popisRezimuKratky(rez){
    var kusy = [tn("slovo.kostek", rez.kostek)], p = 0, i;
    for(i = 0; i < POST_PORADI.length; i++){
      if(rez.post[POST_PORADI[i]] > 0 && STRAIGHTS[POST_PORADI[i]].d <= rez.kostek) p++;
    }
    kusy.push(tn("rezim.postupek", p));
    var k = pocetKombinaci(rez);
    if(k) kusy.push(tn("rezim.kombinaci", k));
    return kusy.join(" · ");
  }

  function stavTlacitko(btn, zap, klicAkce){
    btn.textContent = t(zap ? "spol.zapnuto" : "nast.vypnuto");
    btn.classList.toggle("on", zap);
    var label = t(klicAkce);
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }
  /* Společný tvar popisu: nadpis řádku a pod ním podřádek. `serif` sází nadpis
     patkově — patří tam zápis kombinace (1,1,1+5,5), ne prozaický název. */
  function kombPopis(nadpis, serif, podradek){
    var t1 = document.createElement("div");
    t1.className = "t";
    var b = document.createElement("b");
    if(serif) b.className = "zapis";
    b.textContent = nadpis;
    var s = document.createElement("span");
    s.innerHTML = podradek;
    t1.appendChild(b); t1.appendChild(s);
    return t1;
  }
  /* Pole s body. Po úpravě se uloží a přepíše se klávesnice — celý oddíl se
     překreslovat nesmí, jinak by pole ztratilo kurzor uprostřed psaní.
     `nula` pouští nulu, která u sazby v tabulce znamená „neboduje“; a právě
     ta riziko mění, takže se s ním přepisuje i pás na spodní hraně. */
  function kombPoleSazby(hodnota, aktivni, zapis, aria, nula){
    var pole = document.createElement("input");
    pole.type = "number"; pole.className = "kombsazba"; pole.min = nula ? "0" : "1"; pole.step = "50";
    pole.inputMode = "numeric";
    pole.value = hodnota;
    pole.disabled = !aktivni;
    pole.setAttribute("aria-label", aria || t("komb.sazba"));
    pole.addEventListener("input", function(){
      var v = Math.floor(naCislo(parseInt(pole.value, 10), -1));
      if(v < (nula ? 0 : 1) || v > BODY_MAX) return;
      zapis(v);
      ulozRezimy(); render();
      /* Oddíl se překreslovat nesmí (pole by ztratilo kurzor), ale poslední
         řádek o tom, jestli je co obnovovat, se změnou sazby mění — a ten
         jediný se přepsat dá, žádné pole v něm není. */
      var rez = editRezim();
      if(rez){ renderRezKonec(rez); renderRezPruh(rez); }
    });
    return pole;
  }
  /* Řádek tabulky pravidel: popis vlevo, pole s body vpravo, žádný přepínač.
     Nula znamená, že to v tomhle režimu neboduje. */
  function rezRadekBodu(nadpis, podradek, hodnota, zapis){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.appendChild(kombPopis(nadpis, false, esc(podradek)));
    row.appendChild(kombPoleSazby(hodnota, true, zapis, nadpis, true));
    return row;
  }
  function kombPresetRadek(rez, k){
    var def = PRESETY[k], zap = kombZap(rez, k);
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.preset = k;
    var popis = kombPopis(t("stitek." + def.k), false,
      '<span class="zapis">' + esc(def.zapis) + "</span> · " + esc(tn("slovo.kostek", def.d)));
    var pole = kombPoleSazby(sazba(rez, k), zap, function(v){
      if(!kombZap(rez, k)) return;
      rez.p[k] = v; kombSazbyPamet[k] = v;
    });
    var btns = document.createElement("div");
    btns.className = "setbtns";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "ghost";
    stavTlacitko(btn, zap, zap ? "komb.vypnout" : "komb.zapnout");
    btn.addEventListener("click", function(){
      if(kombZap(rez, k)){
        kombSazbyPamet[k] = rez.p[k];
        delete rez.p[k];
      } else {
        rez.p[k] = kombSazbyPamet[k] || PRESETY[k].def;
      }
      zmenaRezimu();
    });
    btns.appendChild(btn);
    row.appendChild(popis); row.appendChild(pole); row.appendChild(btns);
    return row;
  }
  /* Postupka se ovládá stejně jako kombinace navíc: sazba a přepínač.
     Chybějící klíč v `post` je vypnuto, takže se stav nemá kde rozejít. */
  function rezPostRadek(rez, k){
    var s = STRAIGHTS[k], zap = rez.post[k] > 0;
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.post = k;
    var popis = kombPopis(t("stitek." + s.k), false, esc(tn("slovo.kostek", s.d)));
    var pole = kombPoleSazby(zap ? rez.post[k] : (PRESET_REZIMY.kcd2.post[k] || 500), zap, function(v){
      if(rez.post[k] > 0) rez.post[k] = v;
    });
    var btns = document.createElement("div");
    btns.className = "setbtns";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "ghost";
    stavTlacitko(btn, zap, zap ? "komb.vypnout" : "komb.zapnout");
    btn.addEventListener("click", function(){
      if(rez.post[k] > 0) delete rez.post[k];
      else rez.post[k] = Math.floor(naCislo(parseInt(pole.value, 10), 0)) || PRESET_REZIMY.kcd2.post[k] || 500;
      zmenaRezimu();
    });
    btns.appendChild(btn);
    row.appendChild(popis); row.appendChild(pole); row.appendChild(btns);
    return row;
  }
  /* Vlastní kombinace v seznamu: jméno, body se zápisem vzorů v podřádku
     a tři tlačítka — stav, Upravit a Smazat. Pole se sazbou tu není: body
     patří celé kombinaci, ne jednomu z jejích vzorů, a upravují se
     v podstránce, kde je vidět, čeho se týkají. Mazání se ptá ve dvou krocích
     jako v koších: kombinace se naťukává po kostkách a znovu se dělá pracně. */
  function nazevKombinace(k){ return k.n || t("komb.beznazvu"); }
  /* Podřádek: body, zápis vzorů a počty kostek. Kombinace, ze které se do
     režimu nevejde ani jeden vzor, to říká rovnou — ať se nehledá, proč čip
     v klávesnici chybí. */
  function podradekKombinace(rez, k){
    var poc = poctyKostekKombinace(k, rez.kostek);
    return fmt(k.b) + " · " + zapisKombinace(k) + " · " +
           (poc.length ? poc.map(function(n){ return tn("slovo.kostek", n); }).join(" / ")
                       : t("komb.nevejde"));
  }
  function smazKombinaci(rez, id){
    rez.v = rez.v.filter(function(x){ return x.id !== id; });
    ptamSeVzor = null;
    if(kombEdit === id){ kombEdit = null; ptamSeTvar = null; kombNovy = []; }
    zmenaRezimu();
  }
  function kombVlastniRadek(rez, k){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.vzor = k.id;
    var btns = document.createElement("div");
    btns.className = "setbtns";

    if(ptamSeVzor === k.id){
      var otazka = document.createElement("div");
      otazka.className = "t";
      otazka.innerHTML = "<b>" + esc(t("komb.opravdusmazat")) + "</b><span>" +
                         esc(nazevKombinace(k)) + "</span>";
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){ smazKombinaci(rez, k.id); });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", function(){ ptamSeVzor = null; renderRezimy(); });
      btns.appendChild(ano); btns.appendChild(ne);
      row.appendChild(otazka); row.appendChild(btns);
      return row;
    }

    var popis = kombPopis(nazevKombinace(k), false, esc(podradekKombinace(rez, k)));
    var prep = document.createElement("button");
    prep.type = "button"; prep.className = "ghost rezbtn";
    stavTlacitko(prep, k.z, k.z ? "komb.vypnout" : "komb.zapnout");
    prep.addEventListener("click", function(){ k.z = !k.z; zmenaRezimu(); });
    var upr = document.createElement("button");
    upr.type = "button"; upr.className = "ghost rezbtn"; upr.textContent = t("rezim.upravit");
    upr.addEventListener("click", function(){ naKombiDetail(k.id); });
    var sm = document.createElement("button");
    sm.type = "button"; sm.className = "ghost rezbtn"; sm.textContent = t("spol.smazat");
    sm.addEventListener("click", function(){ ptamSeVzor = k.id; renderRezimy(); });
    btns.appendChild(prep); btns.appendChild(upr); btns.appendChild(sm);
    row.appendChild(popis); row.appendChild(btns);
    return row;
  }

  /* ---------- seznam režimů ---------- */
  function rezRadek(rez){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.rezim = rez.id;
    var btns = document.createElement("div");
    btns.className = "setbtns";

    if(ptamSeRezim === rez.id){
      var otazka = document.createElement("div");
      otazka.className = "t";
      otazka.innerHTML = "<b>" + esc(t("rezim.opravdusmazat")) + "</b><span>" +
                         esc(nazevRezimu(rez)) + "</span>";
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){
        REZIMY.sez = REZIMY.sez.filter(function(x){ return x.id !== rez.id; });
        ptamSeRezim = null;
        if(rezEdit === rez.id) rezEdit = null;
        zmenaRezimu();
      });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", function(){ ptamSeRezim = null; renderRezimy(); });
      btns.appendChild(ano); btns.appendChild(ne);
      row.appendChild(otazka); row.appendChild(btns);
      return row;
    }

    var popis = kombPopis(nazevRezimu(rez), false, esc(popisRezimuKratky(rez)));
    var prav = document.createElement("button");
    prav.type = "button"; prav.className = "ghost rezbtn"; prav.textContent = t("rezim.pravidla");
    prav.addEventListener("click", function(){ otevriPravidla(rez.id); });
    var upr = document.createElement("button");
    upr.type = "button"; upr.className = "ghost rezbtn"; upr.textContent = t("rezim.upravit");
    upr.addEventListener("click", function(){ naRezimDetail(rez.id); });
    var zvol = document.createElement("button");
    zvol.type = "button"; zvol.className = "ghost rezbtn";
    var akt = REZIMY.akt === rez.id;
    zvol.textContent = t(akt ? "rezim.zvoleno" : "rezim.zvolitkratce");
    zvol.classList.toggle("on", akt);
    zvol.title = t("rezim.zvolit");
    zvol.setAttribute("aria-label", t("rezim.zvolit"));
    /* Přepnout pravidla uprostřed hry nejde: kolo už zapsané by se počítalo
       podle jiné tabulky než to následující a v historii by režim lhal
       o první půlce hry. */
    zvol.disabled = akt || !gameEmpty();
    zvol.addEventListener("click", function(){
      if(!gameEmpty()) return;
      REZIMY.akt = rez.id;
      S.rolls = [{thrown: rez.kostek, hot:false, items:[]}];
      zmenaRezimu();
    });
    btns.appendChild(prav); btns.appendChild(upr); btns.appendChild(zvol);
    row.appendChild(popis); row.appendChild(btns);
    return row;
  }
  function renderRezSeznam(){
    var kam = $("rezrows");
    kam.innerHTML = "";
    REZIMY.sez.forEach(function(rez){ kam.appendChild(rezRadek(rez)); });
    var zam = $("rezzamek");
    zam.textContent = gameEmpty() ? "" : t("rezim.zamceno");
    zam.hidden = gameEmpty();
    var strop = REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX;
    var zpr = $("rezstrop");
    zpr.textContent = strop ? t("rezim.strop", { n: REZIMY_MAX }) : "";
    zpr.hidden = !strop;
    $("reznovy").disabled = strop;
  }
  /* ---------- detail jednoho režimu ---------- */
  /* Detail režimu má šest sekcí a každá svůj nadpis s linkou: samostatné
     kostky, stejná čísla, postupky, kombinace navíc, vlastní kombinace
     a nastavení. Nadpisy stojí staticky v HTML, obsah sekcí se staví tady. */
  function renderRezDetail(rez){
    $("reztitul").textContent = nazevRezimu(rez);
    $("reznazevrow").hidden = !rez.vlastni;
    if(rez.vlastni && document.activeElement !== $("reznazevpole")){
      $("reznazevpole").value = rez.nazev || "";
    }
    $("rezkostek").value = String(rez.kostek);

    var sam = $("rezsam");
    sam.innerHTML = "";
    sam.appendChild(prepinacRadek(t("rezim.sam.n"), t("rezim.sam.p"), sestiZap(rez.sam),
                                  function(){ prepniSam(rez); }));
    if(sestiZap(rez.sam)) sam.appendChild(mrizkaSazeb(rez.sam, 1));

    renderRezStej(rez);

    var post = $("rezpost");
    post.innerHTML = "";
    POST_PORADI.forEach(function(k){
      if(STRAIGHTS[k].d > rez.kostek) return;
      post.appendChild(rezPostRadek(rez, k));
    });

    var seznam = $("komblist");
    seznam.innerHTML = "";
    PRESET_PORADI.forEach(function(k){
      if(!kombVRezimu(rez, k)) return;
      seznam.appendChild(kombPresetRadek(rez, k));
    });

    var vlastni = $("kombvlastni");
    vlastni.innerHTML = "";
    if(!rez.v.length){
      ptamSeVzor = null;
      vlastni.innerHTML = '<div class="empty">' + esc(t("komb.zadne")) + "</div>";
    } else {
      rez.v.forEach(function(k){ vlastni.appendChild(kombVlastniRadek(rez, k)); });
    }
    /* Strop se hlásí sám a předem, ne až po marném klepnutí na zamčené
       tlačítko. */
    var strop = rez.v.length >= VLASTNI_MAX;
    $("kombnovy").disabled = strop;
    var zpr = $("kombzprava");
    zpr.textContent = strop ? t("komb.strop", { n: VLASTNI_MAX }) : "";
    zpr.hidden = !strop;

    renderRezKonec(rez);
    renderRezPruh(rez);
  }
  /* Řádek s přepínačem stavu: popis vlevo, tlačítko vpravo. Tlačítko hlásí
     stav (Zapnuto / Vypnuto), akci nese v title a aria-label. */
  function prepinacRadek(nadpis, podradek, zap, akce, klicZap, klicVyp){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.appendChild(kombPopis(nadpis, false, esc(podradek)));
    var btns = document.createElement("div");
    btns.className = "setbtns";
    var b = document.createElement("button");
    b.type = "button"; b.className = "ghost";
    stavTlacitko(b, zap, zap ? (klicVyp || "rezim.skupina.vypnout")
                             : (klicZap || "rezim.skupina.zapnout"));
    b.addEventListener("click", akce);
    btns.appendChild(b);
    row.appendChild(btns);
    return row;
  }
  /* Šest polí jedné šestice sazeb. Vypnutá šestice svoje pole schová — šest
     nul na obrazovce je horší než nic, protože vypadají jako nastavení, které
     se dá měnit. */
  function mrizkaSazeb(pole, pocet){
    var grid = document.createElement("div"), v;
    grid.className = "trojgrid";
    grid.dataset.skupina = String(pocet);
    for(v = 1; v <= 6; v++){ grid.appendChild(sazbaPole(pole, pocet, v)); }
    return grid;
  }
  /* Popisek pole je jazykově neutrální (3× 4), takže se nepřekládá; do
     aria-label se skládá věta, protože „3× 4“ přečtené nahlas nic neřekne. */
  function sazbaPole(pole, pocet, v){
    var wrap = document.createElement("label");
    wrap.className = "trojpole";
    var lbl = document.createElement("span");
    lbl.textContent = pocet + "× " + v;
    var vstup = kombPoleSazby(pole[v], true, function(x){ pole[v] = x; },
                              t("rezim.aria." + pocet, { v: v }), true);
    wrap.appendChild(lbl); wrap.appendChild(vstup);
    return wrap;
  }
  /* Vypnutí vynuluje celou šestici, zapnutí vrátí, co v ní bylo. Paměť je
     runtime, do úložiště nejde: uložený stav má mít jednu pravdu, a tou jsou
     ta čísla. */
  var samPamet = {}, stejPamet = {}, rozsPamet = {};
  function prepniSam(rez){
    if(sestiZap(rez.sam)){
      samPamet[rez.id] = rez.sam.slice();
      rez.sam = [0,0,0,0,0,0,0];
    } else {
      rez.sam = (samPamet[rez.id] || SAM_ZAKLAD).slice();
    }
    zmenaRezimu();
  }
  /* Sekce stejných čísel. V základním pohledu jeden práh a jedna mřížka,
     v rozšířeném pět podsekcí s vlastními přepínači — dvojice až šestice.
     Obojí kreslí tatáž mřížka, protože se liší jen tím, kolik jich je. */
  function renderRezStej(rez){
    var kam = $("rezstej"), i, n;
    var m = nejvyssiStej(rez), prah = prahStej(rez);
    /* Pravidlo nad skupinou se stěhuje pod tu skupinu, ke které zrovna patří.
       Než se sekce vyprázdní, musí se odvézt do bezpečí — innerHTML by ho
       jinak smazalo i s posluchači. */
    $("rezdetail").appendChild($("reznadwrap"));
    kam.innerHTML = "";
    stavTlacitko($("rezrozs"), rez.rozs, rez.rozs ? "rezim.rozs.vypnout" : "rezim.rozs.zapnout");
    $("rezprahrow").hidden = rez.rozs;
    if(!rez.rozs){
      naplnPrah(rez);
      stavTlacitko($("rezstejzap"), prah !== null,
                   prah !== null ? "rezim.stej.vypnout" : "rezim.stej.zapnout");
      $("rezprah").disabled = prah === null;
      if(prah !== null) kam.appendChild(mrizkaSazeb(rez.stej[prah], prah));
      umistiNad(rez, m, kam);
      return;
    }
    for(i = 0; i < POCTY_STEJ.length; i++){
      n = POCTY_STEJ[i];
      if(n > rez.kostek) continue;   /* víc stejných, než se hází, nikdy nepadne */
      kam.appendChild(stejOddil(rez, n, m));
    }
  }
  /* Nabídka prahu končí u počtu kostek režimu. Vypnutá sekce v ní drží
     poslední známý práh, aby zapnutí neskočilo jinam, než odkud se vyplo. */
  function naplnPrah(rez){
    var sel = $("rezprah"), n, o, prah = prahStej(rez);
    sel.innerHTML = "";
    for(n = 2; n <= rez.kostek; n++){
      o = document.createElement("option");
      o.value = String(n); o.textContent = n + "×";
      sel.appendChild(o);
    }
    if(prah === null) prah = Math.min(stejPamet[rez.id + ":prah"] || PRAH_ZAKLAD, rez.kostek);
    sel.value = String(prah);
  }
  /* Jedna podsekce rozšířeného pohledu: přepínač, mřížka a u nejvyšší
     zapnuté ještě pravidlo pro počty nad ní. */
  function stejOddil(rez, n, m){
    var wrap = document.createElement("div"), zap = stejZap(rez, n);
    wrap.dataset.stej = String(n);
    wrap.appendChild(prepinacRadek(t("rezim.stej." + n), tn("slovo.kostek", n), zap,
                                   function(){ prepniStej(rez, n); }));
    if(zap) wrap.appendChild(mrizkaSazeb(rez.stej[n], n));
    if(n === m) umistiNad(rez, m, wrap);
    return wrap;
  }
  /* Pravidlo nad nejvyšší zapnutou skupinou. Ukazuje se právě u ní, a jen
     když je nad čím extrapolovat — když je nejvyšší skupina zároveň počtem
     kostek režimu, žádný vyšší počet nepadne a řádek by lhal. */
  function umistiNad(rez, m, kam){
    var wrap = $("reznadwrap"), nadp = $("reznadp"), n;
    var videt = m !== null && m < rez.kostek;
    wrap.hidden = !videt;
    $("reznadnapoveda").hidden = true;
    $("reznadinfo").classList.remove("on");
    nadp.innerHTML = "";
    nadp.hidden = !videt || rez.nad !== "pevne";
    if(!videt) return;
    $("reznadtit").textContent = t("rezim.nadn." + (m + 1));
    $("reznad").value = rez.nad;
    if(rez.nad === "pevne"){
      for(n = m + 1; n <= rez.kostek; n++){ nadp.appendChild(nadPole(rez, n)); }
    }
    kam.appendChild(wrap);
  }
  /* Výchozí šestice pro nově zapnutý počet. Trojice mají zavedenou tabulku
     hodnota × 100, vyšší počty se od ní odvodí zdvojnásobením a dvojice
     hodnotou × 10 — čísla, se kterými jde dál pracovat, jsou lepší start
     než šest nul. */
  function vychoziStej(n){
    var pole = [0,0,0,0,0,0,0], v;
    for(v = 1; v <= 6; v++){
      pole[v] = n === 2 ? (v === 1 ? 10 : v) * 10
                        : TROJ_ZAKLAD[v] * Math.pow(2, n - 3);
    }
    return pole;
  }
  function prepniStej(rez, n){
    var klic = rez.id + ":" + n;
    if(stejZap(rez, n)){
      stejPamet[klic] = rez.stej[n].slice();
      delete rez.stej[n];
    } else {
      rez.stej[n] = (stejPamet[klic] || vychoziStej(n)).slice();
    }
    zmenaRezimu();
  }
  /* Přepínač celé sekce v základním pohledu. Vypnutí si pamatuje práh
     i sazby, aby se zapnutím vrátilo totéž, co zmizelo. */
  function prepniStejZaklad(rez){
    var prah = prahStej(rez), n;
    if(prah !== null){
      stejPamet[rez.id + ":" + prah] = rez.stej[prah].slice();
      stejPamet[rez.id + ":prah"] = prah;
      rez.stej = {};
    } else {
      n = Math.min(stejPamet[rez.id + ":prah"] || PRAH_ZAKLAD, rez.kostek);
      rez.stej = {};
      rez.stej[n] = (stejPamet[rez.id + ":" + n] || vychoziStej(n)).slice();
    }
    zmenaRezimu();
  }
  /* Posun prahu stěhuje šestici sazeb na nový počet — nevzniká druhá tabulka
     vedle první a hodnoty se přepisovat nemusí. V základním pohledu je klíč
     vždycky jediný, takže se mapa smí přepsat celá. */
  function posunPrah(rez, n){
    var prah = prahStej(rez), pole;
    if(!(n >= 2 && n <= rez.kostek) || prah === n) return;
    pole = prah === null ? null : rez.stej[prah];
    rez.stej = {};
    rez.stej[n] = pole ? pole.slice() : vychoziStej(n);
  }
  /* Návrat do základního pohledu nechá nejnižší zapnutý počet a ostatní
     odloží do runtime paměti: základní pohled umí ukázat jediný práh
     a mlčky bodovat podle něčeho, co není vidět, je horší než je vypnout. */
  function prepniRozs(rez){
    var prah, i, n, sebrane;
    if(rez.rozs){
      prah = prahStej(rez);
      sebrane = [];
      for(i = 0; i < POCTY_STEJ.length; i++){
        n = POCTY_STEJ[i];
        if(n === prah || !rez.stej[n]) continue;
        stejPamet[rez.id + ":" + n] = rez.stej[n].slice();
        sebrane.push(n);
        delete rez.stej[n];
      }
      /* Co sebral návrat do základního, to zapnutí rozšířeného vrátí —
         a jen to. Počet vypnutý ručně se sám zpátky neobjeví. */
      rozsPamet[rez.id] = sebrane;
      rez.rozs = false;
    } else {
      sebrane = rozsPamet[rez.id] || [];
      for(i = 0; i < sebrane.length; i++){
        n = sebrane[i];
        if(!rez.stej[n] && stejPamet[rez.id + ":" + n]) rez.stej[n] = stejPamet[rez.id + ":" + n].slice();
      }
      rozsPamet[rez.id] = [];
      rez.rozs = true;
    }
    zmenaRezimu();
  }
  function nadPole(rez, n){
    var wrap = document.createElement("label");
    wrap.className = "trojpole";
    var lbl = document.createElement("span");
    lbl.textContent = n + "×";
    var pole = kombPoleSazby(rez.nadP[n], true, function(x){ rez.nadP[n] = x; },
                             t("rezim.nadaria", { n: n }), true);
    wrap.appendChild(lbl); wrap.appendChild(pole);
    return wrap;
  }
  /* Pás je patička celého okna, ne prvek karty, takže se o svoje skrývání
     musí starat sám — jinak by visel i na kartě Obecné a nad seznamem. */
  function ukazRezPruh(){
    var pruh = $("rezriziko");
    /* Editor kombinace mění pravidla stejně jako detail režimu, takže pás
       patří i tam; nad seznamem a na kartě Obecné ne. */
    if(pruh) pruh.hidden = $("setcardrezimy").hidden ||
                           ($("rezdetail").hidden && $("kombdetail").hidden);
  }
  /* Text pásu. Vlastní dveře k překreslení, ne součást renderRezDetail():
     mění se i při psaní do pole se sazbou a celý oddíl se tam překreslovat
     nesmí. Ukazuje celou křivku — při stavbě pravidel je zajímavé právě to,
     jak riziko klesá s ubývajícími kostkami. */
  function renderRezPruh(rez){
    var pruh = $("rezriziko");
    if(!pruh) return;
    var tab = tabulkaRizika(rez), kusy = [], n;
    if(rizikoHotovo(rez)){
      for(n = 1; n <= rez.kostek; n++){
        kusy.push(t("rezim.riziko.pol", { n: n, p: desetina(tab[n - 1]) }));
      }
    } else {
      kusy.push(t("rezim.riziko.pocita"));
    }
    pruh.innerHTML = "<b>" + esc(t("rezim.riziko.n")) + "</b>" + esc(kusy.join(" · "));
  }
  /* Poslední řádek detailu: preset se vrací k výchozím hodnotám, vlastní se
     maže. Obojí dvoukrokově jako koše. Zvolený režim smazat nejde — jinak by
     rozehraná hra i volba ukazovaly na neexistující id. */
  function renderRezKonec(rez){
    var row = $("rezkonecrow");
    row.innerHTML = "";
    row.className = "setrow kombrow";
    var btns = document.createElement("div");
    btns.className = "setbtns";
    /* Duplikát je vždycky vlastní režim, i když se kopíruje preset — jinak
       by existovaly dva režimy s týmž id. */
    var dupl = document.createElement("button");
    dupl.type = "button"; dupl.className = "ghost"; dupl.textContent = t("rezim.dupl.btn");
    dupl.disabled = REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX;
    dupl.addEventListener("click", function(){ duplikujRezim(rez); });
    var duplRow = $("rezduplrow");
    duplRow.innerHTML = "";
    duplRow.className = "setrow kombrow";
    duplRow.appendChild(kombPopis(t("rezim.dupl.n"), false, esc(t("rezim.dupl.p"))));
    var duplBtns = document.createElement("div");
    duplBtns.className = "setbtns";
    duplBtns.appendChild(dupl);
    duplRow.appendChild(duplBtns);
    if(!rez.vlastni){
      var puvodni = odchylkyRezimu(rez) === null;
      row.appendChild(kombPopis(t("rezim.vychozi.n"), false, esc(t("rezim.vychozi.p"))));
      var ob = document.createElement("button");
      ob.type = "button"; ob.className = "ghost"; ob.textContent = t("rezim.vychozi.btn");
      ob.disabled = puvodni;
      ob.addEventListener("click", function(){
        var cerstvy = zPresetu(rez.id), k;
        for(k in cerstvy){ if(Object.prototype.hasOwnProperty.call(cerstvy, k)) rez[k] = cerstvy[k]; }
        ptamSeVzor = null;
        zmenaRezimu();
      });
      btns.appendChild(ob);
      row.appendChild(btns);
      return;
    }
    if(REZIMY.akt === rez.id){
      row.appendChild(kombPopis(t("rezim.smazat.n"), false, esc(t("rezim.nesmazat"))));
      row.appendChild(btns);
      return;
    }
    row.appendChild(kombPopis(t("rezim.smazat.n"), false, esc(t("rezim.smazat.p"))));
    var sm = document.createElement("button");
    sm.type = "button"; sm.className = "ghost"; sm.textContent = t("spol.smazat");
    sm.addEventListener("click", function(){
      ptamSeRezim = rez.id;
      naRezimSeznam();
    });
    btns.appendChild(sm);
    row.appendChild(btns);
  }
  /* Hluboká kopie: vlastní vzory dostanou nová id, aby si originál a kopie
     nepletly rozdělanou otázku na smazání. */
  function duplikujRezim(rez){
    if(REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX) return;
    var kopie = cistyRezim(venRezim(rez), novyIdRezimu(), VYCHOZI_REZIM);
    kopie.nazev = t("rezim.kopie", { n: nazevRezimu(rez) }).slice(0, NAZEV_MAX);
    kopie.v.forEach(function(vz){ vz.id = newId(); });
    REZIMY.sez.push(kopie);
    ulozRezimy();
    naRezimDetail(kopie.id);
  }
  function naRezimSeznam(){
    rezEdit = null; kombEdit = null;
    ptamSeVzor = null; ptamSeTvar = null;
    renderRezimy();
  }
  function naRezimDetail(id){
    rezEdit = id; kombEdit = null;
    ptamSeVzor = null; ptamSeRezim = null; ptamSeTvar = null;
    kombNovy = [];
    renderRezimy();
  }
  function naKombiDetail(id){
    kombEdit = id; ptamSeVzor = null; ptamSeTvar = null;
    kombNovy = [];
    renderRezimy();
  }
  function naKombiZpet(){
    kombEdit = null; ptamSeVzor = null; ptamSeTvar = null;
    kombNovy = [];
    renderRezimy();
  }
  function editKombi(){
    var rez = editRezim(), i;
    if(!rez || !kombEdit) return null;
    for(i = 0; i < rez.v.length; i++){ if(rez.v[i].id === kombEdit) return rez.v[i]; }
    return null;
  }
  /* Jediné dveře k překreslení celé karty: rozhodne, která ze tří podstránek
     je vidět, a doplní název režimu na přepínači karet. */
  function renderRezimy(){
    if(!$("rezrows")) return;
    var rez = editRezim();
    if(rezEdit && !rez){ rezEdit = null; }
    var k = editKombi();
    if(kombEdit && !k){ kombEdit = null; }
    var vDetailu = !!rez, vKombi = vDetailu && !!k;
    $("rezlist").hidden = vDetailu;
    $("rezdetail").hidden = !vDetailu || vKombi;
    $("kombdetail").hidden = !vKombi;
    var el = $("reznazev");
    if(el) el.textContent = "(" + nazevRezimu(aktRezim()) + ")";
    /* Seznam se kreslí vždycky, i když je zrovna schovaný pod detailem: je
       to pár řádků a odpadá tím celá třída chyb, kdy se návratem odkryl
       seznam z minula. Totéž platí o detailu pod editorem kombinace. */
    renderRezSeznam();
    if(vDetailu) renderRezDetail(rez);
    if(vKombi) renderKombDetail(rez, k);
    ukazRezPruh();
  }
  /* ---------- editor jedné vlastní kombinace ----------
     Jméno, body, stav a jeden až šest vzorů. Vzory jsou spojené „nebo“:
     kombinace boduje, jakmile sedne kterýkoli z nich, a platí pořád stejně. */
  function renderKombDetail(rez, k){
    $("kombtitul").textContent = nazevKombinace(k);
    if(document.activeElement !== $("kombnazevpole")) $("kombnazevpole").value = k.n || "";

    var bodyRow = $("kombbodyrow");
    bodyRow.innerHTML = "";
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    row.appendChild(kombPopis(t("komb.body.n"), false, esc(t("komb.body.p"))));
    row.appendChild(kombPoleSazby(k.b, true, function(v){ k.b = v; }));
    bodyRow.appendChild(row);

    var stavRow = $("kombstavrow");
    stavRow.innerHTML = "";
    stavRow.appendChild(prepinacRadek(t("komb.stav.n"), t("komb.stav.p"), k.z,
      function(){ k.z = !k.z; zmenaRezimu(); }, "komb.zapnout", "komb.vypnout"));

    var vzory = $("kombvzory");
    vzory.innerHTML = "";
    k.vz.forEach(function(x, i){ vzory.appendChild(kombVzorRadek(rez, k, i)); });

    renderKombiNovy();

    var sm = $("kombsmazrow");
    sm.innerHTML = "";
    sm.appendChild(kombSmazRadek(rez, k));
    renderRezPruh(rez);
  }
  /* Řádek jednoho vzoru: zápis, počet kostek a Smazat ve dvou krocích.
     Poslední vzor smazat nejde — kombinace bez vzoru by neměla co bodovat
     a v seznamu by visela naprázdno; od toho je Smazat celou kombinaci. */
  function kombVzorRadek(rez, k, i){
    var x = k.vz[i], row = document.createElement("div");
    row.className = "setrow kombrow";
    row.dataset.tvar = String(i);
    var btns = document.createElement("div");
    btns.className = "setbtns";

    if(ptamSeTvar === i){
      var otazka = document.createElement("div");
      otazka.className = "t";
      otazka.innerHTML = "<b>" + esc(t("komb.opravdusmazatvzor")) +
                         '</b><span class="zapis">' + esc(zapisVzoru(x)) + "</span>";
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){
        k.vz.splice(i, 1);
        ptamSeTvar = null;
        zmenaRezimu();
      });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", function(){ ptamSeTvar = null; renderRezimy(); });
      btns.appendChild(ano); btns.appendChild(ne);
      row.appendChild(otazka); row.appendChild(btns);
      return row;
    }

    var kostek = pocetKostekVzoru(x), vejde = kostek <= rez.kostek;
    var podradek = esc(tn("slovo.kostek", kostek)) +
                   (vejde ? "" : " · " + esc(t("komb.nevejde")));
    row.appendChild(kombPopis(zapisVzoru(x), true, podradek));
    var smaz = document.createElement("button");
    smaz.type = "button"; smaz.className = "ghost"; smaz.textContent = t("spol.smazat");
    smaz.disabled = k.vz.length < 2;
    smaz.addEventListener("click", function(){ ptamSeTvar = i; renderRezimy(); });
    btns.appendChild(smaz);
    row.appendChild(btns);
    return row;
  }
  /* Poslední řádek editoru: smazání celé kombinace, dvoukrokově jako všude
     jinde. Po smazání se editor zavře sám, protože nemá co ukazovat. */
  function kombSmazRadek(rez, k){
    var row = document.createElement("div");
    row.className = "setrow kombrow";
    var btns = document.createElement("div");
    btns.className = "setbtns";
    if(ptamSeVzor === k.id){
      row.appendChild(kombPopis(t("komb.opravdusmazat"), false, esc(nazevKombinace(k))));
      var ano = document.createElement("button");
      ano.type = "button"; ano.className = "ghost warn"; ano.textContent = t("spol.smazat");
      ano.addEventListener("click", function(){ smazKombinaci(rez, k.id); });
      var ne = document.createElement("button");
      ne.type = "button"; ne.className = "ghost"; ne.textContent = t("spol.zrusit");
      ne.addEventListener("click", function(){ ptamSeVzor = null; renderRezimy(); });
      btns.appendChild(ano); btns.appendChild(ne);
    } else {
      row.appendChild(kombPopis(t("komb.smazat.n"), false, esc(t("komb.smazat.p"))));
      var smaz = document.createElement("button");
      smaz.type = "button"; smaz.className = "ghost"; smaz.textContent = t("spol.smazat");
      smaz.addEventListener("click", function(){ ptamSeVzor = k.id; renderRezimy(); });
      btns.appendChild(smaz);
    }
    row.appendChild(btns);
    return row;
  }
  /* Výchozí jméno je Kombinace 1, 2, … a materializuje se hned při vzniku:
     kdyby se dopočítávalo z pořadí, smazání sourozence by ostatní
     přejmenovalo. Hledá se první volné číslo. */
  function dalsiJmenoKombinace(rez){
    var jmena = {}, n = 1, i;
    for(i = 0; i < rez.v.length; i++) jmena[rez.v[i].n] = true;
    while(n < 99 && jmena[t("komb.vychozin", { n: n })]) n++;
    return t("komb.vychozin", { n: n });
  }
  /* Rozdělaný vzor se drží jako pole žetonů v pořadí naťukání: čísla 1–6 jsou
     konkrétní hodnoty, písmena "A"–"F" skupiny „libovolná, ale stejná“.
     Vzor z nich vyrobí vzorZZetonu() — na písmenech samotných nezáleží,
     A,A+B,B a B,B+C,C je týž vzor. */
  function vzorZZetonu(zetony){
    var pocty = [0,0,0,0,0,0,0], skup = {}, klice = [], t = [], i, z;
    for(i = 0; i < zetony.length; i++){
      z = zetony[i];
      if(typeof z === "number"){ pocty[z]++; continue; }
      if(!skup[z]){ skup[z] = 0; klice.push(z); }
      skup[z]++;
    }
    for(i = 0; i < klice.length; i++) t.push(skup[klice[i]]);
    t.sort(function(a, b){ return b - a; });
    return { v: rozbalPocty(pocty), t: t, pocty: pocty, tvar: t };
  }
  /* Rozdělaný vzor: čipy přidávají kostky, Vymazat je sebere všechny.
     Míň než dvě kostky vzor nedává — jedna kostka je buď samostatná hodnota,
     nebo (jako písmeno) tvar, který sedne na cokoli. */
  function renderKombiNovy(){
    var rez = editRezim(), k = editKombi();
    if(!rez || !k) return;
    var docasny = vzorZZetonu(kombNovy);
    $("kombvzor").textContent = kombNovy.length ? zapisVzoru(docasny) : "";
    $("kombvzorhint").textContent = kombNovy.length
      ? tn("slovo.kostek", kombNovy.length)
      : t("komb.naukej");
    /* Strop je počet kostek režimu: víc kostek, než se v něm hází, by dalo
       vzor, který nikdy nesedne. Zamyká obě řady stejně. */
    ["kombpips", "kombpism"].forEach(function(id){
      Array.prototype.forEach.call($(id).children, function(b){
        b.disabled = kombNovy.length >= rez.kostek;
      });
    });
    $("kombzrus").disabled = kombNovy.length === 0;
    var strop = k.vz.length >= VZORU_MAX;
    $("kombpridat").disabled = strop || kombNovy.length < 2;
    var zpr = $("kombvzorzprava");
    zpr.textContent = strop ? t("komb.stropvzoru", { n: VZORU_MAX }) : "";
    zpr.hidden = !strop;
  }

  var resetTimer = null, resetMsg = false;
  function disarmReset(){
    clearTimeout(resetTimer); resetTimer = null;
    var b = $("reset");
    b.classList.remove("warn");
    b.textContent = t("zapis.novahra");
  }
  /* Společný konec všech cest k nové hře. wipe() až po úspěšné záloze —
     jinak by rozehraná hra zmizela bez možnosti obnovy. Když se nepovede,
     hra prostě zůstane rozehraná. */
  function novaHra(){
    var b = $("reset");
    if(!kosPush()){
      resetMsg = true;
      b.classList.add("warn");
      b.textContent = t("nova.nezalohovano");
      setTimeout(function(){ resetMsg = false; disarmReset(); }, 4000);
      return false;
    }
    wipe();
    goTo(0);
    return true;
  }
  /* Neuložená hra si vyžádá ještě okno se třemi cestami ven. Hra, jejíž
     záznam někde je — v historii nebo v koši smazaných z historie — a od té
     doby se nehrálo, projde rovnou: ztratit se nemá co. */
  function neulozena(){
    return !gameEmpty() && (kdeZaznam() === "nikde" || S.dirty);
  }
  function reset(){
    var b = $("reset");
    if(resetMsg) return;            /* dokud svítí hláška, klik nic neznamená */
    if(gameEmpty()){ wipe(); goTo(0); return; }
    if(!resetTimer){
      b.classList.add("warn");
      b.textContent = t("nova.opravdu");
      resetTimer = setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset();
    if(neulozena()){ otevriNovaModal(b); return; }
    novaHra();
  }
  function otevriNovaModal(btn){
    var pot = potTotal();
    var zprava = t("nova.text");
    if(pot > 0) zprava += " " + t("nova.propadne", { b: fmt(pot) });
    $("newtext").textContent = zprava;
    otevriModal("newmodal", btn);
  }

  /* ---------- vykreslení ---------- */
  /* ---------- automatické ukládání ----------
     Hra se po skončení zapíše do historie sama. Vypnuté ve výchozím stavu.
     Volba žije v localStorage vedle motivu a nezhasínání — je to jediný
     boolean, který se čte při startu a nikdy nepovyroste.

     Pouští se z bank(), bust() a ze změny cíle či limitu, tedy ze tří míst,
     kde se stav zámku může změnit. Ne z render(): ten běží i při startu
     a při obnově z koše, takže by se dohraná hra ukládala sama i tam, kde
     o to nikdo nežádal.

     S.autoUlozeno hlídá, aby se totéž nedělalo znovu po každém překreslení
     a po reloadu. render() ho nuluje, jakmile zámek přestane platit — po
     smazání kola se tak dá hra dohrát znovu a záznam se aktualizuje. */
  var AUKEY = "farkle-autoulozeni-v1";
  var autoZap = false, autoBezi = false;
  try{ autoZap = localStorage.getItem(AUKEY) === "1"; }catch(e){}

  var toastTimer = null;
  /* Šev mezi hlavičkou a kartami. Když měření selže (jsdom nemá layout,
     rects jsou nuly), zůstane top z minula a nic se nerozbije. */
  function umistiToast(el){
    var h = document.querySelector(".top"), k = document.querySelector(".tabs");
    if(!h || !k) return;
    var a = h.getBoundingClientRect().bottom, b = k.getBoundingClientRect().top;
    if(b <= 0) return;
    el.style.top = Math.round((a + b) / 2) + "px";
  }
  function toast(text){
    var el = $("toast");
    if(!el) return;
    $("toasttext").textContent = text;
    el.hidden = false;
    umistiToast(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(schovejToast, 5000);
  }
  function schovejToast(){
    clearTimeout(toastTimer); toastTimer = null;
    var el = $("toast");
    if(el) el.hidden = true;
  }

  function zkusAutoUlozit(){
    if(!autoZap || autoBezi) return;
    if(!locked() || gameEmpty() || S.autoUlozeno) return;
    var kde = kdeZaznam();
    /* Co bylo smazané ručně, se ručně i vrací. Automat záznam z koše
       nevytahuje, jinak by rušil rozhodnutí, které uživatel udělal. */
    if(kde === "kos"){ S.autoUlozeno = true; save(); return; }
    /* hra v historii je a od té doby se nehrálo: není co zapisovat */
    if(kde === "historie" && !S.dirty){ S.autoUlozeno = true; save(); return; }
    var aktualizace = (kde === "historie");
    autoBezi = true;
    zapisHru(function(ok){
      autoBezi = false;
      if(!ok){ selhalZapis(); return; }   /* pop-up jen po potvrzeném zápisu */
      S.autoUlozeno = true;
      save();
      toast(t(aktualizace ? "toast.aktualizovan" : "toast.ulozena"));
    });
  }

  /* Boduje v tom režimu aspoň jedna hodnota při tomhle počtu kostek? Podle
     toho se čip počtu ukazuje. Pokrývá i případ, kdy jsou trojice vypnuté
     a čtyři a víc se platí pevnými body: 3× zmizí, 4× až 6× zůstanou. */
  function pocetBoduje(rez, count){
    for(var v = 1; v <= 6; v++){ if(kindPoints(v, count, rez) > 0) return true; }
    return false;
  }
  function renderKind(){
    var l = left(), lock = locked(), rez = aktRezim(), prvni = null;
    Array.prototype.forEach.call(elPips.children, function(b){
      b.classList.toggle("sel", Number(b.dataset.value) === selValue);
      b.disabled = lock;
    });
    /* Počet, kterým se v režimu nedá nic odložit, se skrývá, ne jen zašedne —
       trvale zamčené tlačítko by jen matlo. 1× nastupuje jen tehdy, když se
       samostatné hodnoty nevešly do vlastní řady čipů. */
    Array.prototype.forEach.call(elCounts.children, function(b){
      var c = Number(b.dataset.count);
      var videt = c <= rez.kostek && pocetBoduje(rez, c) &&
                  (c !== 1 || pocetSamostatnych(rez) > SAMOSTATNE_V_RADE);
      b.hidden = !videt;
      if(videt && prvni === null) prvni = c;
      b.classList.toggle("sel", c === selCount);
      b.disabled = lock || c > l;
    });
    /* Vybraný počet zmizel z nabídky (jiný režim, vypnutá skupina) —
       přesune se na první, který zůstal. */
    if(prvni !== null && elCounts.querySelector('[data-count="' + selCount + '"]').hidden){
      selCount = prvni;
      Array.prototype.forEach.call(elCounts.children, function(b){
        b.classList.toggle("sel", Number(b.dataset.count) === selCount);
      });
    }
    var ok = selValue !== null && selCount <= l && !lock && kindPoints(selValue, selCount, rez) > 0;
    elAddKind.disabled = !ok;
    elAddKind.textContent = t("pocitadlo.plus", { b: ok ? fmt(kindPoints(selValue, selCount, rez)) : "0" });
  }

  /* ---------- čipy postupek a kombinací v klávesnici ----------
     Postupky i přednastavené kombinace stojí v HTML natvrdo a jen se skrývají,
     takže snapshot prvků i sběr češtiny při startu fungují beze změny. Co je
     z nich vidět, rozhoduje herní režim. Vlastní vzory bydlí v panelu za čipem
     „vlastní“: jejich popisek je dlouhý a je jich až osm, takže by řada
     přestala být shora omezená. */
  function renderKombi(){
    var l = left(), lock = locked(), rez = aktRezim(), videt = 0, post = 0, komb = 0;
    elDataStr.forEach(function(b){
      var k = b.dataset.str, zap = rez.post[k] > 0 && STRAIGHTS[k].d <= rez.kostek;
      if(zap){ b.removeAttribute("hidden"); post++; } else b.setAttribute("hidden", "");
      b.disabled = lock || STRAIGHTS[k].d > l;
      b.querySelector(".v").textContent = fmt(rez.post[k] || 0);
    });
    elDataKombi.forEach(function(b){
      var k = b.dataset.kombi, zap = kombZap(rez, k) && kombVRezimu(rez, k);
      if(zap){ b.removeAttribute("hidden"); komb++; } else b.setAttribute("hidden", "");
      b.disabled = lock || PRESETY[k].d > l;
      b.querySelector(".v").textContent = fmt(sazba(rez, k));
    });
    /* Řada samostatných hodnot: do tří čipů se vejde beze změny velikosti,
       při čtyřech a víc mizí celá i s nadpisem a zadává se přes 1× ve
       Stejných hodnotách. Popisek je týž text jako štítek v historii, takže
       se ta dvě místa nemají kde rozejít. */
    var samo = pocetSamostatnych(rez), radaVidet = samo > 0 && samo <= SAMOSTATNE_V_RADE;
    elDataSingle.forEach(function(b){
      var v = Number(b.dataset.single), body = rez.sam[v] || 0;
      if(radaVidet && body > 0) b.removeAttribute("hidden"); else b.setAttribute("hidden", "");
      b.disabled = lock || l < 1;
      b.firstChild.textContent = textKodu(SAM_KODY[v]);
      b.querySelector(".v").textContent = fmt(body);
    });
    elSingleRow.hidden = !radaVidet;
    elSingleCap.hidden = !radaVidet;
    /* Nadpis řady mluví o tom, co v ní právě je: v režimu bez postupek by
       „Postupky“ byla nepravda a řada se schovat nemůže — sedí v ní čip
       „vlastní“, jediná cesta k ručnímu zadání. */
    elStrCap.textContent = t(post ? (komb ? "pocitadlo.postupkykomb" : "pocitadlo.postupky")
                                  : "pocitadlo.kombinace");
    /* Zalomení se srovnává podle počtu viditelných čipů: samo od sebe by
       se pět zalomilo jako 4 + 1 a osamělý čip by zabral celou šířku. */
    Array.prototype.forEach.call(elStrRow.children, function(el){ if(!el.hidden) videt++; });
    ["k5","k6","k7","k8","k9"].forEach(function(c){ elStrRow.classList.remove(c); });
    if(videt >= 5 && videt <= 9) elStrRow.classList.add("k" + videt);

    renderVlastniCipy(rez, l, lock);
  }
  /* Kombinace s víc vzory se odkládá jedním čipem, dokud je jasné, kolik
     kostek to stojí. Když se do zbývajících kostek vejdou vzory o různých
     velikostech, řada se na místě překlopí na volbu — stejný dvoukrokový
     vzor jako mazání v koších, a klik navíc jen tehdy, když je opravdu
     z čeho vybírat. */
  var vybiramKombi = null;
  function renderVlastniCipy(rez, l, lock){
    var komb = kombinaceZap(rez), vybrana = null;
    elVlastniRow.innerHTML = "";
    komb.forEach(function(k){ if(k.id === vybiramKombi) vybrana = k; });
    if(vybrana && !lock){
      elVlastniRow.appendChild(kombiVolbaCip(vybrana, l));
      poctyKostekKombinace(vybrana, Math.min(rez.kostek, l)).forEach(function(n){
        var b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.dataset.kostek = String(n);
        b.textContent = tn("pocitadlo.kostzkr", n);
        b.addEventListener("click", function(){
          vybiramKombi = null;
          keep(kodVzoru(vybrana, n), vybrana.b, n);
        });
        elVlastniRow.appendChild(b);
      });
      elVlastniRow.hidden = false;
      return;
    }
    vybiramKombi = null;
    komb.forEach(function(k){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.vzor = k.id;
      b.innerHTML = esc(nazevKombinace(k)) + '<span class="v">' + esc(fmt(k.b)) + "</span>";
      var moznosti = poctyKostekKombinace(k, Math.min(rez.kostek, l));
      b.disabled = lock || moznosti.length === 0;
      b.addEventListener("click", function(){
        var moc = poctyKostekKombinace(k, Math.min(rez.kostek, left()));
        if(!moc.length) return;
        if(moc.length === 1){ keep(kodVzoru(k, moc[0]), k.b, moc[0]); return; }
        vybiramKombi = k.id;
        render();
      });
      elVlastniRow.appendChild(b);
    });
    elVlastniRow.hidden = komb.length === 0;
  }
  /* První čip volby je sama kombinace: říká, o kterou jde, a klepnutím
     volbu zruší. */
  function kombiVolbaCip(k, l){
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip on"; b.dataset.vzor = k.id;
    b.innerHTML = esc(nazevKombinace(k)) + '<span class="v">' + esc(t("komb.vyberkostek")) + "</span>";
    b.addEventListener("click", function(){ vybiramKombi = null; render(); });
    return b;
  }
  /* Kód nese body a počet kostek použitého vzoru, ne odkaz na kombinaci
     v nastavení — k1500x5 se přečte i po jejím smazání a na cizím telefonu. */
  function kodVzoru(k, kostek){ return "k" + k.b + "x" + kostek; }

  /* Vrubovka i přehledové dlaždice se kreslí z otisku hry, takže stejný kód
     obslouží rozehranou hru i hru vytaženou z historie. */
  function tallyInto(elBars, elCap, rec){
    elBars.innerHTML = "";
    var i, s;

    if(rec.mode === "rounds"){
      var played = gKol(rec);
      var kol = rec.roundGoal > 0 ? Math.min(40, rec.roundGoal) : Math.min(40, played);
      for(i = 0; i < kol; i++){
        s = document.createElement("i");
        if(i < played) s.className = "cut";
        elBars.appendChild(s);
      }
      if(rec.roundGoal > 0){
        elCap.textContent = t("tally.kolzn", { n: played, z: rec.roundGoal });
      } else {
        elCap.textContent = played ? t("tally.koln", { n: played }) : t("tally.zadnekolo");
      }
      return;
    }

    var step = Math.max(100, Math.round(rec.goal / 8 / 100) * 100);
    var n = Math.min(40, Math.max(4, Math.round(rec.goal / step)));
    var done = Math.max(0, Math.min(n, Math.floor(rec.banked / step)));
    for(i = 0; i < n; i++){
      s = document.createElement("i");
      if(i < done) s.className = "cut";
      elBars.appendChild(s);
    }
    var rest = rec.goal - rec.banked;
    elCap.textContent = rest > 0 ? t("tally.docile", { b: fmt(rest) })
                                 : t("tally.prekonano", { b: fmt(-rest) });
  }
  function renderTally(){ tallyInto(elTally, elTallyCap, snapshot()); }

  /* přepočítá, kolika kostkami se v jednotlivých hodech háže,
     když se z kola odebere položka kdekoliv */
  function rechain(){
    S.rolls = S.rolls.filter(function(r, i){ return r.items.length || i === S.rolls.length - 1; });
    if(!S.rolls.length) S.rolls = [{thrown:kostek(), hot:false, items:[]}];
    S.rolls[0].thrown = kostek();
    S.rolls[0].hot = false;
    for(var i = 1; i < S.rolls.length; i++){
      var prev = S.rolls[i-1];
      var rest = prev.thrown - usedInRoll(prev);
      S.rolls[i].thrown = rest > 0 ? rest : kostek();
      S.rolls[i].hot = rest === 0;
    }
  }
  function removeEntry(ri, ii){
    if(!S.rolls[ri]) return;
    S.rolls[ri].items.splice(ii, 1);
    rechain();
    render();
  }

  function renderFix(){
    elFix.innerHTML = "";
    var any = S.rolls.some(function(r){ return r.items.length; });
    if(!any){
      elFix.innerHTML = '<div class="none">' + esc(t("oprava.nic")) + '</div>';
      return;
    }
    S.rolls.forEach(function(r, ri){
      if(!r.items.length) return;
      var lbl = document.createElement("div");
      lbl.className = "lbl";
      lbl.innerHTML = '<span>' + esc(t("oprava.hod", { n: ri + 1, k: r.thrown }) +
                        (r.hot ? " \u00B7 " + t("oprava.horke") : "")) + '</span>' +
                      '<b>' + fmt(rollPoints(r)) + '</b>';
      var grp = document.createElement("div");
      grp.className = "grp";
      r.items.forEach(function(it, ii){
        var b = document.createElement("button");
        b.type = "button";
        b.className = "ent";
        b.innerHTML = '<span>' + esc(stitek(it)) + '</span><b>' + fmt(it.p) + '</b>';
        b.title = t("oprava.smazatpolozku");
        b.addEventListener("click", function(){ removeEntry(ri, ii); });
        grp.appendChild(b);
      });
      elFix.appendChild(lbl);
      elFix.appendChild(grp);
    });
  }

  /* Farkle se do dat nezapisuje, dopisuje se až tady jako poslední úsek —
     stará historie ho tak dostane taky, bez jakékoli migrace. Živá tabulka
     kol i nedotknutelný náhled hry z historie skládají buňku touhle jednou
     funkcí, aby se obě podoby nemohly rozejít. */
  function bunkaPopisu(tah){
    var p = esc(popisKola(tah));
    if(tah.bust) return p ? p + " \u00B7 " + esc(t("slovo.farkle")) : esc(t("slovo.farkle"));
    return p || "&nbsp;";
  }
  function rowsHTML(turns){
    var run = 0, out = "";
    (turns || []).forEach(function(tah, i){
      if(!tah.bust) run += tah.p;
      out += '<tr' + (tah.bust ? ' class="f"' : '') + '>' +
        '<td class="n">' + (i + 1) + '</td>' +
        '<td class="d">' + bunkaPopisu(tah) + '</td>' +
        '<td class="g">' + fmt(tah.p || 0) + '</td>' +
        '<td class="s">' + fmt(run) + '</td></tr>';
    });
    return out;
  }
  /* režim oprav v zápise kol: fixMode zapíná křížky u řádků,
     pendingDel drží index kola, u kterého se právě ptáme na potvrzení.
     řádky se tu skládají po prvcích, ne přes rowsHTML — ten zůstává
     pro nedotknutelný náhled hry z historie. */
  var fixMode = false, pendingDel = null;

  function deleteTurn(i){
    var t = S.turns[i];
    if(!t) return;
    if(!t.bust){ S.banked -= t.p; }
    S.turns.splice(i, 1);
    pendingDel = null;
    if(!S.turns.length){ fixMode = false; }
    S.dirty = true;
    render();
  }

  function renderRows(){
    elRows.innerHTML = "";
    if(pendingDel !== null && !S.turns[pendingDel]) pendingDel = null;

    var fb = $("fixturns");
    fb.style.display = S.turns.length ? "" : "none";
    fb.classList.toggle("on", fixMode);
    fb.setAttribute("aria-pressed", fixMode ? "true" : "false");
    fb.textContent = t(fixMode ? "zapis.hotovo" : "zapis.opravit");

    var run = 0;
    var frag = document.createDocumentFragment();
    S.turns.forEach(function(tah, i){
      if(!tah.bust) run += tah.p;
      var tr = document.createElement("tr");

      if(pendingDel === i){
        tr.className = "confirm";
        var td = document.createElement("td");
        td.colSpan = 5;
        var wrap = document.createElement("div");
        wrap.className = "cf";
        var q = document.createElement("span");
        q.className = "q";
        q.textContent = t("zapis.opravdusmazat", { n: i + 1 });
        var yes = document.createElement("button");
        yes.type = "button"; yes.className = "mini danger"; yes.textContent = t("spol.smazat");
        yes.addEventListener("click", function(){ deleteTurn(i); });
        var no = document.createElement("button");
        no.type = "button"; no.className = "mini"; no.textContent = t("spol.zrusit");
        no.addEventListener("click", function(){ pendingDel = null; renderRows(); });
        wrap.appendChild(q); wrap.appendChild(yes); wrap.appendChild(no);
        td.appendChild(wrap);
        tr.appendChild(td);
        frag.appendChild(tr);
        return;
      }

      if(tah.bust) tr.className = "f";
      tr.innerHTML =
        '<td class="n">' + (i + 1) + '</td>' +
        '<td class="d">' + bunkaPopisu(tah) + '</td>' +
        '<td class="g">' + fmt(tah.p || 0) + '</td>' +
        '<td class="s">' + fmt(run) + '</td>';

      if(fixMode){
        var xtd = document.createElement("td");
        xtd.className = "x";
        var x = document.createElement("button");
        x.type = "button"; x.className = "delbtn"; x.innerHTML = "\u00D7";
        x.title = t("zapis.smazatkolo", { n: i + 1 });
        x.setAttribute("aria-label", x.title);
        x.addEventListener("click", function(){ pendingDel = i; renderRows(); });
        xtd.appendChild(x);
        tr.appendChild(xtd);
      }

      frag.appendChild(tr);
    });
    elRows.appendChild(frag);
    elEmpty.style.display = S.turns.length ? "none" : "block";
  }

  /* Pravidla otevřená z karty Herních režimů se po zavření vracejí do
     nastavení. Příznak drží okno pravidel, spotřebuje ho obsluha zavírání. */
  var zNastaveni = false;
  function vratDoNastaveni(){
    if(!zNastaveni) return false;
    zNastaveni = false;
    naKartuNastaveni(1);
    renderRezimy();
    otevriModal("setmodal", null);
    return true;
  }

  /* ---------- tabulka pravidel podle režimu ----------
     Řádek se do tabulky dostane jen tehdy, když v tom režimu doopravdy
     boduje. Kombinace navíc a vlastní vzory se sázejí týmž textem jako čip
     v klávesnici a štítek v historii — malým písmenem, ať se to na třech
     místech nerozejde. */
  function pravRadek(nazev, hodnota){
    return "<tr><td>" + esc(nazev) + "</td><td>" + esc(hodnota) + "</td></tr>";
  }
  /* Řádky jedné skupiny stejných čísel. Trojice se slijí do jednoho řádku,
     jen když jdou úměrně hodnotě — jinak by se rozsah 200–600 vztahoval na
     tabulku, která takhle nevypadá. Počty od čtyř výš se sázejí týmž zápisem
     jako štítek v historii („4× 5“), aby se ta dvě místa nerozešla. */
  function stejnaRadky(rez, n){
    var pole = rez.stej[n], tab = "", v, nasobek, stejny = true;
    if(n === 3){
      if(pole[1] > 0) tab += pravRadek(t("pravidla.troj.1"), fmt(pole[1]));
      nasobek = pole[2] / 2;
      for(v = 2; v <= 6; v++){ if(!(pole[v] > 0) || pole[v] !== v * nasobek) stejny = false; }
      if(stejny) return tab + pravRadek(t("pravidla.t4n"), fmt(pole[2]) + "–" + fmt(pole[6]));
      for(v = 2; v <= 6; v++){
        if(pole[v] > 0) tab += pravRadek(t("pravidla.troj." + v), fmt(pole[v]));
      }
      return tab;
    }
    for(v = 1; v <= 6; v++){
      if(!(pole[v] > 0)) continue;
      tab += pravRadek(n === 2 ? t("pravidla.dvoj." + v) : t("stitek.n", { p: n, h: v }), fmt(pole[v]));
    }
    return tab;
  }
  function pravidlaHTML(rez){
    var out = "", tab = "", v, i, n, k, komb;
    var m = nejvyssiStej(rez), pocty = poctyStej(rez);
    out += "<p>" + t("pravidla.p1", { kostky: esc(tn("slovo.kostkami", rez.kostek)) }) + "</p>";
    out += "<p>" + t("pravidla.p2") + "</p>";
    out += "<p>" + t("pravidla.p3", { kostky: esc(tn("slovo.kostkami", rez.kostek)) }) + "</p>";

    for(v = 1; v <= 6; v++){
      if(rez.sam[v] > 0) tab += pravRadek(t("pravidla.sam." + v), fmt(rez.sam[v]));
    }
    for(i = 0; i < pocty.length; i++){ tab += stejnaRadky(rez, pocty[i]); }
    /* Počty nad nejvyšší nastavenou skupinou patří do tabulky, ne do poznámky:
       jen tak se vypíše právě tolik počtů, kolik se jich v tom režimu vejde.
       Násobek se sází číslem, ne slovem — práh se dá posunout, takže
       „dvojnásobek trojice“ by u jiné skupiny lhal. */
    if(m !== null){
      for(n = m + 1; n <= rez.kostek; n++){
        tab += pravRadek(t("pravidla.stejnych." + n), rez.nad === "pevne"
          ? fmt(rez.nadP[n] || 0)
          : "×" + (rez.nad === "nasobek" ? (n - m + 1) : Math.pow(2, n - m)));
      }
    }
    for(i = 0; i < POST_PORADI.length; i++){
      k = POST_PORADI[i];
      if(!(rez.post[k] > 0) || STRAIGHTS[k].d > rez.kostek) continue;
      tab += pravRadek(t("pravidla.post." + k), fmt(rez.post[k]));
    }
    for(i = 0; i < PRESET_PORADI.length; i++){
      k = PRESET_PORADI[i];
      if(!kombZap(rez, k) || !kombVRezimu(rez, k)) continue;
      tab += pravRadek(t("stitek." + PRESETY[k].k), fmt(sazba(rez, k)));
    }
    /* Vlastní kombinace se sázejí jménem a za ním zápisem vzorů — týmž
       zápisem jako v nastavení, ať se ta dvě místa nerozejdou. */
    komb = kombinaceZap(rez);
    for(i = 0; i < komb.length; i++){
      tab += pravRadek(nazevKombinace(komb[i]) + " · " + zapisKombinace(komb[i]), fmt(komb[i].b));
    }
    out += "<table>" + (tab || pravRadek(t("pravidla.nicneboduje"), "—")) + "</table>";

    if(!pocetKombinaci(rez)) out += '<p class="note">' + esc(t("pravidla.pozn2")) + "</p>";
    if(!rez.vlastni) out += '<p class="note">' + t("rezim.pozn." + rez.id) + "</p>";
    return out;
  }

  /* ---------- dvě karty v okně s informacemi ---------- */
  var otevriNavod = null, otevriPravidla = null, prekresliPravidla = null;
  (function(){
    var tlac = $("infoseg").children;
    var karty = [$("cardrules"), $("cardguide")];
    /* Které pravidla se právě ukazují: null je aktivní režim (tlačítko „i“),
       jinak ten, u kterého se kleplo v nastavení. */
    var ukazujeme = null;
    function vyber(i){
      karty.forEach(function(k, j){ k.hidden = j !== i; });
      Array.prototype.forEach.call(tlac, function(b, j){ b.classList.toggle("on", j === i); });
      var telo = $("rulesmodal").querySelector(".modalbody");
      if(telo) telo.scrollTop = 0;
    }
    function kresli(){
      var rez = (ukazujeme && rezimPodleId(ukazujeme)) || aktRezim();
      $("pravidlarezim").textContent = nazevRezimu(rez);
      $("pravidlatelo").innerHTML = pravidlaHTML(rez);
    }
    Array.prototype.forEach.call(tlac, function(b, i){
      b.addEventListener("click", function(){ vyber(i); });
    });
    $("infobtn").addEventListener("click", function(){
      ukazujeme = null; zNastaveni = false; kresli(); vyber(0);
    });
    otevriNavod = function(){
      ukazujeme = null; zNastaveni = false; kresli();
      vyber(1);
      otevriModal("rulesmodal", null);
    };
    otevriPravidla = function(id){
      ukazujeme = id; kresli();
      vyber(0);
      /* Pravidla otevřená z nastavení jsou odbočka, ne odchod: zavírací cesta
         okna (křížek, tmavé pozadí i Escape) vrátí nastavení tam, kde bylo. */
      zNastaveni = true;
      otevriModal("rulesmodal", null);
    };
    prekresliPravidla = kresli;
    kresli();
  })();

  /* ---------- ovládání karty Herní režimy ----------
     Přepínače a výběry překreslují oddíl celý, protože mění, co je vidět;
     textová a číselná pole jen ukládají, jinak by uprostřed psaní ztratila
     kurzor. */
  (function(){
    if(!$("rezback")) return;
    $("rezback").addEventListener("click", naRezimSeznam);
    $("reznovy").addEventListener("click", function(){
      if(REZIMY.sez.length >= PRESET_REZ_PORADI.length + REZIMY_MAX) return;
      var rez = cistyRezim(null, novyIdRezimu(), VYCHOZI_REZIM);
      rez.nazev = t("rezim.beznazvu");
      REZIMY.sez.push(rez);
      ulozRezimy();
      naRezimDetail(rez.id);
    });
    $("reznazevpole").addEventListener("input", function(){
      var rez = editRezim();
      if(!rez) return;
      rez.nazev = $("reznazevpole").value.slice(0, NAZEV_MAX);
      ulozRezimy();
      $("reztitul").textContent = nazevRezimu(rez);
      var el = $("reznazev");
      if(el) el.textContent = nazevRezimu(aktRezim());
    });
    $("rezkostek").addEventListener("change", function(){
      var rez = editRezim();
      if(!rez) return;
      rez.kostek = parseInt($("rezkostek").value, 10) === 5 ? 5 : 6;
      /* Rozehraná hra tu být nemůže (přepnout režim jde jen nad prázdnou),
         ale prázdný hod se musí srovnat hned — jinak by se dál házelo
         šesti kostkami v pětikostkovém režimu. */
      if(REZIMY.akt === rez.id && gameEmpty()) S.rolls = [{thrown: rez.kostek, hot:false, items:[]}];
      if(kombNovy.length > rez.kostek) kombNovy = kombNovy.slice(0, rez.kostek);
      zmenaRezimu();
    });
    /* Rozšířený rozpad a práh: obojí sahá na tutéž tabulku, takže obojí musí
       jít přes zmenaRezimu(), ne jen překreslit nastavení. */
    $("rezrozs").addEventListener("click", function(){
      var rez = editRezim();
      if(rez) prepniRozs(rez);
    });
    $("rezstejzap").addEventListener("click", function(){
      var rez = editRezim();
      if(rez) prepniStejZaklad(rez);
    });
    $("rezprah").addEventListener("change", function(){
      var rez = editRezim();
      if(!rez) return;
      posunPrah(rez, parseInt($("rezprah").value, 10));
      zmenaRezimu();
    });
    /* Nová kombinace se zakládá rovnou s jedním vzorem: kombinace bez vzoru
       by neměla co bodovat a v seznamu by visela naprázdno. Dvojice
       libovolných stejných je nejmenší smysluplný vzor a v editoru se přepíše
       za pár klepnutí. */
    $("kombnovy").addEventListener("click", function(){
      var rez = editRezim();
      if(!rez || rez.v.length >= VLASTNI_MAX) return;
      var k = { id: newId(), n: dalsiJmenoKombinace(rez), b: 250, z: true,
                vz: [ cistyTvar({ v: [], t: [2] }) ] };
      rez.v.push(k);
      ulozRezimy();
      naKombiDetail(k.id);
    });
    $("kombback").addEventListener("click", naKombiZpet);
    $("kombnazevpole").addEventListener("input", function(){
      var k = editKombi();
      if(!k) return;
      k.n = $("kombnazevpole").value.slice(0, NAZEV_MAX);
      ulozRezimy();
      $("kombtitul").textContent = nazevKombinace(k);
      /* Jméno stojí i na čipu a v tabulce pravidel; celý editor se ale
         překreslovat nesmí, pole by uprostřed psaní ztratilo kurzor. */
      if(prekresliPravidla) prekresliPravidla();
      render();
    });
    /* Nápověda se přepíná na místě, ne dalším oknem: text je krátký a .msg
       pod řádkem je v tomhle okně zavedený vzor. */
    $("reznadinfo").addEventListener("click", function(){
      var el = $("reznadnapoveda");
      if(el.hidden) el.innerHTML = t("rezim.nad.napoveda");
      el.hidden = !el.hidden;
      $("reznadinfo").classList.toggle("on", !el.hidden);
    });
    $("reznad").addEventListener("change", function(){
      var rez = editRezim();
      if(!rez) return;
      var v = $("reznad").value;
      rez.nad = NAD_DRUHY.indexOf(v) >= 0 ? v : "x2";
      zmenaRezimu();
    });
  })();

  /* ---------- návod při prvním spuštění a po aktualizaci ----------
     číslo verze drží service worker, aplikace si o něj řekne zprávou —
     ať je verze jen na jednom místě. Když worker není k dispozici
     (jiný prohlížeč, otevřeno ze souboru), ukáže se návod jen poprvé. */
  var NKEY = "farkle-navod-v1";
  function zjistiVerzi(hotovo){
    if(!("serviceWorker" in navigator)){ hotovo(null); return; }
    var vyrizeno = false;
    function dokonci(v){
      if(vyrizeno) return;
      vyrizeno = true;
      clearTimeout(cas);
      hotovo(v);
    }
    var cas = setTimeout(function(){ dokonci(null); }, 2000);
    navigator.serviceWorker.ready.then(function(reg){
      var sw = reg.active;
      if(!sw){ dokonci(null); return; }
      var kanal = new MessageChannel();
      kanal.port1.onmessage = function(e){
        dokonci(e.data && e.data.verze ? e.data.verze : null);
      };
      sw.postMessage({ dotaz: "verze" }, [kanal.port2]);
    }).catch(function(){ dokonci(null); });
  }
  function zkontrolujNavod(){
    zjistiVerzi(function(verze){
      var znacka = verze || "bez-verze";
      var videno = null;
      try { videno = localStorage.getItem(NKEY); } catch(e){}
      if(videno === znacka) return;
      try { localStorage.setItem(NKEY, znacka); } catch(e){}
      otevriNavod();
    });
  }

  /* ---------- panel nastavení hry ---------- */
  (function(){
    var btn = $("gamebtn"), panel = $("setup");
    function open(show){
      panel.hidden = !show;
      btn.classList.toggle("on", show);
      btn.setAttribute("aria-expanded", show ? "true" : "false");
    }
    btn.addEventListener("click", function(){ open(panel.hidden); });
    /* klepnutí mimo panel ho zavře */
    document.addEventListener("click", function(e){
      if(panel.hidden) return;
      if(panel.contains(e.target) || btn.contains(e.target)) return;
      open(false);
    });
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && !panel.hidden) open(false);
    });
  })();

  /* ---------- harmonika v nastavení ----------
     Nativní <details> kvůli klávesnici a čtečce; výlučnost (jen jeden oddíl
     otevřený) si hlídáme sami, protože atribut name na <details> je v
     prohlížečích čerstvý a bez něj by zůstaly otevřené všechny.
     Při otevření okna se všechny zavřou, aby karta začínala vždycky stejně. */
  var setSekce = Array.prototype.slice.call(document.querySelectorAll("#setmodal .setsec"));
  setSekce.forEach(function(sec){
    sec.addEventListener("toggle", function(){
      if(!sec.open) return;
      setSekce.forEach(function(x){ if(x !== sec) x.open = false; });
    });
  });
  function zavriSekce(){ setSekce.forEach(function(x){ x.open = false; }); }

  /* ---------- dvě karty v okně nastavení ----------
     Stejný vzor jako dvě karty v okně s informacemi (#infoseg): přepínač
     přehazuje `hidden` a `.on`, obsah zůstává v DOMu, takže se nic
     nepřestavuje. Okno vždycky začíná na první kartě. */
  var naKartuNastaveni = null;
  (function(){
    var tlac = $("setseg").children;
    var karty = [$("setcardobecne"), $("setcardrezimy")];
    naKartuNastaveni = function(i){
      karty.forEach(function(k, j){ k.hidden = j !== i; });
      Array.prototype.forEach.call(tlac, function(b, j){ b.classList.toggle("on", j === i); });
      var telo = $("setmodal").querySelector(".modalbody");
      if(telo) telo.scrollTop = 0;
      /* Pás rizika stojí mimo obě karty, takže o přepnutí sám neví. */
      ukazRezPruh();
    };
    Array.prototype.forEach.call(tlac, function(b, i){
      b.addEventListener("click", function(){ naKartuNastaveni(i); });
    });
  })();

  /* ---------- rozdělaný vlastní vzor ----------
     Čipy 1–6 přidávají kostku s konkrétní hodnotou, čipy A–F kostku do skupiny
     „libovolná, ale stejná“. Do stavu vzoru se sahá jen odsud; hotový vzor
     projde stejnou očistou jako vzor z úložiště, takže se dovnitř nedostane
     nic, co by neprošlo i po reloadu. */
  (function(){
    var pips = $("kombpips");
    if(!pips) return;
    function pridej(kam, popis, zeton){
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = popis;
      b.dataset.value = popis;
      b.addEventListener("click", function(){
        var rez = editRezim();
        if(!rez || kombNovy.length >= rez.kostek) return;
        kombNovy.push(zeton);
        renderKombiNovy();
      });
      kam.appendChild(b);
    }
    [1,2,3,4,5,6].forEach(function(v){ pridej(pips, String(v), v); });
    var pism = $("kombpism");
    ["A","B","C","D","E","F"].forEach(function(p){ pridej(pism, p, p); });
    $("kombzrus").addEventListener("click", function(){
      kombNovy = [];
      renderKombiNovy();
    });
    $("kombpridat").addEventListener("click", function(){
      var k = editKombi();
      if(!k || k.vz.length >= VZORU_MAX) return;
      var cast = vzorZZetonu(kombNovy);
      /* Hotový vzor projde stejnou očistou jako vzor z úložiště, takže se
         dovnitř nedostane nic, co by neprošlo i po reloadu. */
      var vz = cistyTvar({ v: cast.v, t: cast.t });
      if(!vz) return;
      k.vz.push(vz);
      kombNovy = [];
      zmenaRezimu();
    });
  })();

  /* ---------- okna: pravidla a nastavení ---------- */
  function modalOpen(){ return !!document.querySelector(".modal:not([hidden])"); }
  var zavriModal = null, otevriModal = null;
  (function(){
    var otevrene = null, vyvolal = null;
    function zavri(){
      if(!otevrene) return;
      /* Návrat do nastavení místo prostého zavření. Musí se rozhodnout dřív,
         než se okno schová — otevriModal() si zavře, co je otevřené, sám. */
      if(otevrene.id === "rulesmodal" && vratDoNastaveni()) return;
      otevrene.hidden = true;
      var b = vyvolal;
      otevrene = null; vyvolal = null;
      if(b && document.contains(b)) b.focus();
    }
    function otevri(id, btn){
      zavri();
      var m = $(id);
      if(!m) return;
      m.hidden = false;
      otevrene = m; vyvolal = btn || null;
      var x = m.querySelector(".modalx");
      if(x) x.focus();
    }
    zavriModal = zavri; otevriModal = otevri;
    $("infobtn").addEventListener("click", function(){ otevri("rulesmodal", this); });
    $("setbtn").addEventListener("click", function(){ zavriSekce(); otevri("setmodal", this); });
    document.querySelectorAll("[data-close]").forEach(function(b){
      b.addEventListener("click", zavri);
    });
    /* klepnutí na tmavé pozadí mimo panel */
    document.addEventListener("click", function(e){ if(e.target === otevrene) zavri(); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape") zavri(); });
  })();

  /* ---------- světlý / tmavý režim ---------- */
  (function(){
    var btn = $("theme"), root = document.documentElement, TKEY = "farkle-theme";
    /* Vlastnost .hidden je jen na HTML prvcích — na potomcích <svg> zápis
       nic neudělá a atribut zůstane, jak byl v kódu. Slunce proto mělo
       hidden napořád a měsíc nikdy, takže tlačítko ukazovalo měsíc ve všech
       stavech. Atribut se tu proto přepíná ručně. */
    function vrstva(id, videt){
      var el = $(id);
      if(videt) el.removeAttribute("hidden"); else el.setAttribute("hidden", "");
    }
    function apply(mode){
      root.setAttribute("data-theme", mode);
      var light = mode === "light";
      vrstva("thsun", !light);
      vrstva("thmoon", light);
      var label = t(light ? "hlav.tmavyrezim" : "hlav.svetlyrezim");
      btn.title = label;
      btn.setAttribute("aria-label", label);
      try{ localStorage.setItem(TKEY, mode); }catch(e){}
    }
    btn.addEventListener("click", function(){
      apply(root.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
    naJazyk(function(){ apply(root.getAttribute("data-theme") === "light" ? "light" : "dark"); });
    var ulozeny = null;
    try{ ulozeny = localStorage.getItem(TKEY); }catch(e){}
    if(ulozeny === "light" || ulozeny === "dark"){
      apply(ulozeny);
    } else {
      var svetlo = false;
      try{ svetlo = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches; }catch(e){}
      apply(svetlo ? "light" : "dark");
    }
  })();

  /* ---------- jen na výšku ----------
     Manifest má orientation: portrait, což stačí nainstalované aplikaci na
     Androidu. Tohle je pokus navíc pro prohlížeč. iOS zamykání orientace
     nepodporuje vůbec — tam zbývá překryv #rot. */
  (function(){
    try{
      if(screen.orientation && typeof screen.orientation.lock === "function"){
        var p = screen.orientation.lock("portrait");
        if(p && typeof p.catch === "function") p.catch(function(){});
      }
    }catch(e){}
  })();

  /* ---------- celá obrazovka ----------
     Pozor: iOS Safari metodu requestFullscreen vystavuje, ale na jiném než
     video elementu nic neudělá. Ptáme se proto na fullscreenEnabled, což na
     iPhonu vrací false — tlačítko se tam skryje místo aby mátlo. */
  (function(){
    var btn = $("fs"), root = document.documentElement;
    var enter = root.requestFullscreen || root.webkitRequestFullscreen;
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    var allowed = (document.fullscreenEnabled !== undefined)
      ? document.fullscreenEnabled
      : (document.webkitFullscreenEnabled !== undefined ? document.webkitFullscreenEnabled : false);

    /* nainstalovaná aplikace už na celé obrazovce běží sama */
    var jakoAplikace = (window.matchMedia &&
        (matchMedia("(display-mode: fullscreen)").matches ||
         matchMedia("(display-mode: standalone)").matches)) ||
        navigator.standalone === true;

    var radek = $("fsrow");
    function pryc(){ radek.remove(); }
    if(!enter || !exit || !allowed || jakoAplikace){ pryc(); return; }

    function active(){ return document.fullscreenElement || document.webkitFullscreenElement || null; }
    /* Tlačítko hlásí stav, ne akci — „Zapnuto“ se čte líp než „Vypnout“.
       Co klik udělá, zůstává v title a aria-label. */
    function mark(){
      var on = !!active();
      btn.textContent = t(on ? "spol.zapnuto" : "nast.vypnuto");
      btn.classList.toggle("on", on);
      var label = t(on ? "fs.zpet" : "fs.zapnout");
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    function fail(){ pryc(); }   /* volání selhalo: řádek je k ničemu */

    btn.addEventListener("click", function(){
      try{
        var p = active() ? exit.call(document) : enter.call(root);
        if(p && typeof p.catch === "function") p.catch(fail);
      }catch(e){ fail(); }
    });
    ["fullscreenchange","webkitfullscreenchange"].forEach(function(ev){
      document.addEventListener(ev, mark);
    });
    naJazyk(mark);
    mark();
  })();

  /* ---------- nezhasínat displej ----------
     Zámek drží displej rozsvícený, ale jas ovlivnit neumí — API na to není.
     Po třech minutách bez doteku se proto zámek pustí a dál se o zhasnutí
     i zamčení stará systémový časovač, na který stránka nedosáhne.

     Prohlížeč zámek pouští sám pokaždé, když se stránka schová (zhasnutí,
     přepnutí do jiné aplikace, zamčení telefonu). Obsluha visibilitychange
     ho po návratu bere znovu, takže po odemčení telefonu nezhasínání naskočí
     samo — přepínač v nastavení se přitom nemění, ten žije v localStorage. */
  (function(){
    var radek = $("svitrow"), btn = $("svit");
    var SKEY = "farkle-svit-v1";
    var NECINNOST = 180000;   /* 3 minuty */

    if(!navigator.wakeLock || typeof navigator.wakeLock.request !== "function"){ radek.remove(); return; }

    /* zadame hlídá rozjetou žádost: request je asynchronní, takže dva doteky
       těsně po sobě by jinak vzaly dva zámky a pustil by se jen jeden */
    var zapnuto = false, zamek = null, casovac = null, cekaNaDotek = false, zadame = false;
    try{ zapnuto = localStorage.getItem(SKEY) === "1"; }catch(e){}

    function mark(){
      btn.textContent = t(zapnuto ? "spol.zapnuto" : "nast.vypnuto");
      btn.classList.toggle("on", zapnuto);
      var label = t(zapnuto ? "svit.nechat" : "svit.nezhasinat");
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    /* Podle specifikace stačí viditelná stránka, gesto se nevyžaduje. Když
       ho prohlížeč přesto chce, request spadne a zkusí se po prvním doteku. */
    function poDoteku(){
      if(cekaNaDotek) return;
      cekaNaDotek = true;
      document.addEventListener("pointerdown", function jednou(){
        document.removeEventListener("pointerdown", jednou, true);
        cekaNaDotek = false;
        vezmi();
      }, true);
    }
    function vezmi(){
      if(!zapnuto || zamek || zadame || document.hidden) return;
      var p;
      try{ p = navigator.wakeLock.request("screen"); }
      catch(e){ poDoteku(); return; }
      if(!p || typeof p.then !== "function"){ poDoteku(); return; }
      zadame = true;
      p.then(function(z){
        zadame = false;
        if(!zapnuto){ try{ z.release(); }catch(e){} return; }
        zamek = z;
        if(z && typeof z.addEventListener === "function"){
          z.addEventListener("release", function(){ if(zamek === z) zamek = null; });
        }
      }, function(){ zadame = false; poDoteku(); });
    }
    function pust(){
      if(!zamek) return;
      var z = zamek;
      zamek = null;
      try{ z.release(); }catch(e){}
    }
    function odpocet(){
      clearTimeout(casovac); casovac = null;
      if(!zapnuto || document.hidden) return;
      casovac = setTimeout(pust, NECINNOST);
    }
    function aktivita(){
      if(!zapnuto) return;
      vezmi();
      odpocet();
    }

    btn.addEventListener("click", function(){
      zapnuto = !zapnuto;
      try{ localStorage.setItem(SKEY, zapnuto ? "1" : "0"); }catch(e){}
      mark();
      if(zapnuto){ vezmi(); odpocet(); }
      else { clearTimeout(casovac); casovac = null; pust(); }
    });
    document.addEventListener("visibilitychange", function(){
      if(document.hidden){ clearTimeout(casovac); casovac = null; }
      else { vezmi(); odpocet(); }
    });
    document.addEventListener("pointerdown", aktivita, true);
    document.addEventListener("keydown", aktivita, true);

    naJazyk(mark);
    mark();
    if(zapnuto){ vezmi(); odpocet(); }
  })();

  /* ---------- vnitřní stránky boxu kola ---------- */
  var elSheets = $("sheets"), sheetBtns = Array.prototype.slice.call($("sheettabs").children), sheet = 0;
  function goSheet(i, smooth){
    sheet = Math.max(0, Math.min(sheetBtns.length - 1, i));
    var x = sheet * elSheets.clientWidth;
    var behavior = (smooth === false) ? "auto" : "smooth";
    if(typeof elSheets.scrollTo === "function"){ elSheets.scrollTo({left:x, behavior:behavior}); }
    else { elSheets.scrollLeft = x; }
    markSheets();
  }
  function markSheets(){
    sheetBtns.forEach(function(b, i){ b.classList.toggle("on", i === sheet); });
  }
  sheetBtns.forEach(function(b, i){ b.addEventListener("click", function(){ goSheet(i); }); });
  elSheets.addEventListener("scroll", function(){
    var i = Math.round(elSheets.scrollLeft / Math.max(1, elSheets.clientWidth));
    if(i !== sheet){ sheet = i; markSheets(); }
  }, {passive:true});

  /* ---------- stránky ---------- */
  var elPages = $("pages"), tabs = [$("tab0"), $("tab1"), $("tab2")], page = 0;
  function goTo(i, smooth){
    var novy = Math.max(0, Math.min(tabs.length - 1, i));
    /* Odchod na jinou stránku ruší návrat do žebříčku. Srovnává se se
       stávající stránkou, protože goTo se volá i po změně velikosti okna
       se stejným číslem — a to návrat rušit nemá. */
    if(novy !== page) zrusNav();
    page = novy;
    if(page === 2) renderP2();
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var behavior = (smooth === false || reduce) ? "auto" : "smooth";
    var x = page * elPages.clientWidth;
    if(typeof elPages.scrollTo === "function"){ elPages.scrollTo({ left:x, behavior:behavior }); }
    else { elPages.scrollLeft = x; }
    markTabs();
  }
  function markTabs(){
    tabs.forEach(function(t, i){ t.setAttribute("aria-selected", i === page ? "true" : "false"); });
  }
  tabs.forEach(function(t, i){ t.addEventListener("click", function(){ goTo(i); }); });
  elPages.addEventListener("scroll", function(){
    var i = Math.round(elPages.scrollLeft / Math.max(1, elPages.clientWidth));
    if(i !== page){ page = i; zrusNav(); markTabs(); }
  }, {passive:true});
  /* bez scroll-snapu si posun po změně šířky okna nikdo nesrovná sám */
  window.addEventListener("resize", function(){ goTo(page, false); goSheet(sheet, false); });
  document.addEventListener("keydown", function(e){
    var t = e.target.tagName;
    if(t === "INPUT" || t === "SELECT" || t === "TEXTAREA") return;
    if(modalOpen()) return;
    if(e.key === "ArrowRight") goTo(page + 1);
    if(e.key === "ArrowLeft") goTo(page - 1);
  });
  /* Kontextové menu je vypnuté všude kromě pole pro vložení zálohy ze
     schránky (#pastearea) — to na vkládání pravým tlačítkem/podržením
     spoléhá, protože čtení schránky přes JS je na iOS nespolehlivé. */
  document.addEventListener("contextmenu", function(e){
    if(e.target && e.target.id === "pastearea") return;
    e.preventDefault();
  });

  function statsHTML(rec){
    var busts = gFarkle(rec);
    var nej = gNejlepsiKolo(rec);
    var best = nej === null ? 0 : nej;
    var avg = gPrumer(rec);
    if(avg === null) avg = 0;
    return '<div><span>' + esc(t("souhrn.celkem")) + '</span><b>' + esc(fmt(rec.banked || 0)) + '</b></div>' +
           '<div><span>' + esc(t("souhrn.nejlepsi")) + '</span><b>' + fmt(best) + '</b></div>' +
           '<div><span>' + esc(t("souhrn.prumer")) + '</span><b>' + fmt(avg) + '</b></div>' +
           '<div><span>' + esc(t("souhrn.farklu")) + '</span><b>' + busts + '</b></div>';
  }
  function renderStats(){ $("stats").innerHTML = statsHTML(snapshot()); }

  /* ---------- odvozené údaje o jedné hře ----------
     Každá z nich sáhne nejdřív po předpočítaném čísle ze souhrnu a teprve
     když ho nemá, projde `turns`. Díky tomu zůstávají STATY, statHodnota(),
     zebricek() i renderHistList() beze změny a počítají stejně nad souhrny,
     nad plnými záznamy v propadu na localStorage i nad importovanými daty. */
  function gKol(g){
    if(typeof g.kol === "number") return g.kol;
    return (g.turns || []).length;
  }
  function gFarkle(g){
    if(typeof g.farklu === "number") return g.farklu;
    var n = 0;
    (g.turns || []).forEach(function(t){ if(t.bust) n++; });
    return n;
  }
  /* Farkle prvním hodem: kolo skončí farklem a nemá jediný bod (t.p === 0).
     Jiná kombinace nastat nemůže — kdyby v kole padl druhý hod (hot dice
     nebo pokračování), musel by před ním ležet aspoň jeden bodující odklad,
     takže by t.p bylo kladné. Netřeba sahat do rolls[]. Nula je tu platná
     a ukládá se jako nula (na rozdíl od gZtraceno níž) — je to prostá
     četnost jako farklu/kol/hodu, ne rekord, kde by nula matla. */
  function gFarklePrvni(g){
    if(typeof g.farkluprvni === "number") return g.farkluprvni;
    var n = 0;
    (g.turns || []).forEach(function(t){ if(t.bust && t.p === 0) n++; });
    return n;
  }
  /* Do žebříčku smí jen hry, kde k tomu opravdu došlo — nula by se jinak
     řadila na konec jako řada nul. Samostatná obálka, ne úprava
     gFarklePrvni: uložený souhrn i celkový součet mají nulu držet dál. */
  function gFarklePrvniRekord(g){ return gFarklePrvni(g) || null; }
  /* null je platná hodnota (hra bez jediného bodovaného kola), takže se
     nedá ptát na pravdivost — jen na to, jestli údaj vůbec je */
  function gNejlepsiKolo(g){
    if(g.nejlepsi !== undefined) return g.nejlepsi;
    var m = null;
    (g.turns || []).forEach(function(t){ if(!t.bust && (m === null || t.p > m)) m = t.p; });
    return m;
  }
  function gNejhorsiKolo(g){
    if(g.nejhorsi !== undefined) return g.nejhorsi;
    var m = null;
    (g.turns || []).forEach(function(t){ if(!t.bust && t.p > 0 && (m === null || t.p < m)) m = t.p; });
    return m;
  }
  function gSerie(g){
    if(typeof g.serie === "number") return g.serie;
    var nej = 0, b = 0;
    (g.turns || []).forEach(function(t){
      if(t.bust){ b = 0; } else { b++; if(b > nej) nej = b; }
    });
    return nej;
  }
  /* Počet hodů se rekonstruuje z popisu kola, protože turns[i] nese jen
     {p, bust} a k tomu kódy v c (starý záznam text v d). Obojí spojuje hody
     jedním oddělovačem a prázdné hody vyhazuje —
     u farklu je poslední hod prázdný z definice, proto se u něj přičítá
     jednička. Sedí to i na farkle prvním hodem: prázdný popis → jeden hod.
     Math.max(u, 1) je pojistka pro cizí zálohu s prázdným popisem u zapsaného
     kola; z aplikace takové kolo vzniknout nemůže. */
  function hodyVKole(tah){
    var u;
    if(typeof tah.c === "string"){ u = tah.c ? tah.c.split(HODY_ODD).length : 0; }
    else { u = tah.d ? String(tah.d).split(HODY_TXT).length : 0; }
    return tah.bust ? u + 1 : Math.max(u, 1);
  }
  function gNejvicHodu(g){
    if(g.hodu !== undefined) return g.hodu;
    var m = null;
    (g.turns || []).forEach(function(t){
      var h = hodyVKole(t);
      if(m === null || h > m) m = h;
    });
    return m;
  }
  /* Farkle, při kterém na stole nic neleželo, je nula — platná hodnota
     odlišná od null, která by v žebříčku ležela dole jako řada nul. Do téhle
     statistiky nepatří, takže nula a null splývají. Test na pravdivost je tu
     proto záměrný, na rozdíl od ostatních g*: souhrny uložené dřív nesou nulu
     a i ty se musí překlopit při čtení. */
  function gZtraceno(g){
    if(g.ztraceno !== undefined) return g.ztraceno || null;
    var m = null;
    (g.turns || []).forEach(function(t){ if(t.bust && t.p > 0 && (m === null || t.p > m)) m = t.p; });
    return m;
  }
  function gPrumer(g){
    var k = gKol(g);
    return k ? Math.round((g.banked || 0) / k) : null;
  }
  function gKolKCili(g){
    if(g.kolKCili !== undefined) return g.kolKCili;
    return (g.mode !== "rounds" && g.goal > 0 && (g.banked || 0) >= g.goal) ? gKol(g) : null;
  }
  function gBody(g){ return g.banked || 0; }
  /* Záznam bez `rezim` je hra z doby, kdy aplikace uměla jedna pravidla —
     a ta byla KCD2. Dopočítává se při čtení, stejně jako gKol(). */
  function gRezim(g){ return (typeof g.rezim === "string" && g.rezim) ? g.rezim : VYCHOZI_REZIM; }
  /* Název režimu pro hru z historie. Preset se přeloží podle id, vlastní veze
     svůj text s sebou — a když ho nemá (cizí záloha), řekne se to rovnou. */
  function nazevRezimuZaznamu(g){
    var id = gRezim(g);
    if(jePreset(id)) return t("rezim.n." + id);
    return (typeof g.rezimN === "string" && g.rezimN) ? g.rezimN.slice(0, NAZEV_MAX) : t("rezim.neznamy");
  }

  function cislo(v){ return String(v); }
  function fmtR(v){ return fmt(Math.round(v)); }
  function desetina(v){ return (Math.round(v * 10) / 10).toString().replace(".", kat("des")); }

  /* ---------- sledované statistiky ----------
     s: omezení na režim, m: hodnota jedné hry, a: způsob shrnutí,
     f: formát, dir: směr žebříčku, kol: dopsat do žebříčku počet kol */
  var STATY = [
    { n:"stat.n.pocet",                 a:"pocet",      f:cislo },
    { n:"stat.n.denmax",                a:"denMax",     f:cislo },
    { n:"stat.n.soucet",                a:"soucet",     f:fmt,      num:gBody },
    { n:"stat.n.maxbody",               m:gBody,        a:"max",   f:fmt,      kol:true },
    { n:"stat.n.maxbodybody",           m:gBody,        a:"max",   f:fmt,      s:"points" },
    { n:"stat.n.maxbodykola",           m:gBody,        a:"max",   f:fmt,      s:"rounds", kol:true },
    { n:"stat.n.prumer",                m:gPrumer,      a:"pomer", f:fmtR,     num:gBody, den:gKol },
    { n:"stat.n.prumerbody",            m:gPrumer,      a:"pomer", f:fmtR,     num:gBody, den:gKol, s:"points" },
    { n:"stat.n.prumerkola",            m:gPrumer,      a:"pomer", f:fmtR,     num:gBody, den:gKol, s:"rounds" },
    { n:"stat.n.maxhodu",               m:gNejvicHodu,  a:"max",   f:cislo,    kol:true },
    /* Obě „kola v jedné hře na body“ stojí na gKolKCili(), která u nedokončené
       hry vrací null — tím se počítají jen hry, které cíle doopravdy dosáhly,
       a žádný zvláštní výběr her k tomu není potřeba. */
    { n:"stat.n.minkol",                m:gKolKCili,    a:"min",   f:cislo,    s:"points" },
    { n:"stat.n.maxkol",                m:gKolKCili,    a:"max",   f:cislo,    s:"points" },
    { n:"stat.n.nejlepsikolo",          m:gNejlepsiKolo,a:"max",   f:fmt },
    { n:"stat.n.nejhorsikolo",          m:gNejhorsiKolo,a:"min",   f:fmt },
    { n:"stat.n.maxfarklu",             m:gFarkle,      a:"max",   f:cislo,    kol:true },
    { n:"stat.n.farkleprvni",           m:gFarklePrvniRekord, a:"soucet",f:cislo, num:gFarklePrvni, kol:true },
    { n:"stat.n.maxfarkleprvni",        m:gFarklePrvniRekord, a:"max",   f:cislo, kol:true },
    { n:"stat.n.ztraceno",              m:gZtraceno,    a:"max",   f:fmt,      kol:true },
    { n:"stat.n.serie",                 m:gSerie,       a:"max",   f:cislo,    kol:true },
    { n:"stat.n.farkluhra",             m:gFarkle,      a:"pomer", f:desetina, num:gFarkle, den:function(){ return 1; }, dir:"asc" },
    /* Třetí druh shrnutí vedle her a dnů: seskupuje podle režimu. Hodnota
       není číslo, ale název — formát se proto použije až v žebříčku,
       na počty her. */
    { n:"stat.n.rezim",                 a:"rezimMax",   f:cislo }
  ];

  /* ---------- seskupení podle herního režimu ----------
     Vrací pole režimů seřazené sestupně podle počtu her, při shodě od toho
     s novější hrou. Název se bere ze záznamu, ne z nastavení: smazaný vlastní
     režim musí zůstat čitelný. */
  function rezimyPodleHer(hry){
    var mapa = {}, poradi = [];
    hry.forEach(function(g){
      var k = gRezim(g), kdy = g.savedAt || 0;
      if(!mapa[k]){ mapa[k] = { id:k, nazev:nazevRezimuZaznamu(g), pocet:0, kdy:kdy }; poradi.push(k); }
      mapa[k].pocet++;
      if(kdy > mapa[k].kdy) mapa[k].kdy = kdy;
    });
    var v = poradi.map(function(k){ return mapa[k]; });
    v.sort(function(a, b){ return b.pocet - a.pocet || b.kdy - a.kdy; });
    return v;
  }

  /* ---------- seskupení po dnech ----------
     Den se bere z místního času, ne z UTC: hra dohraná v půl jedné v noci
     patří do dne, kdy ji hráč hrál. Vrací se pole dnů seřazené sestupně podle
     počtu her, při shodě od nejnovějšího dne. */
  function denKlic(d){
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) +
           "-" + ("0" + d.getDate()).slice(-2);
  }
  function dnyPodleHer(hry){
    var mapa = {};
    hry.forEach(function(g){
      var d = new Date(g.savedAt || 0), k = denKlic(d);
      if(!mapa[k]) mapa[k] = { den:k, kdy:new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), pocet:0 };
      mapa[k].pocet++;
    });
    var v = Object.keys(mapa).map(function(k){ return mapa[k]; });
    v.sort(function(a, b){ return b.pocet - a.pocet || b.kdy - a.kdy; });
    return v;
  }

  function vyberHry(def, hry){
    if(!def.s) return hry;
    return hry.filter(function(g){
      return def.s === "rounds" ? g.mode === "rounds" : g.mode !== "rounds";
    });
  }
  function statHodnota(def, hry){
    var v = vyberHry(def, hry);
    if(def.a === "pocet"){ return { txt: def.f(v.length) }; }
    if(def.a === "soucet"){
      var sc = 0;
      v.forEach(function(g){ sc += def.num(g); });
      return v.length ? { txt: def.f(sc) } : null;
    }
    /* jediná statistika, která neshrnuje hry, ale dny — datum se proto ukazuje
       bez času, žádná konkrétní hra za ním nestojí */
    if(def.a === "denMax"){
      var dny = dnyPodleHer(v);
      return dny.length ? { txt: def.f(dny[0].pocet), kdy: dny[0].kdy, den: true } : null;
    }
    /* Hodnotou je název nejhranějšího režimu; počet her se vejde do podřádku,
       aby se nemusel otevírat žebříček kvůli jednomu číslu. */
    if(def.a === "rezimMax"){
      var rezimy = rezimyPodleHer(v);
      return rezimy.length ? { txt: esc(rezimy[0].nazev), pod: tn("slovo.hra", rezimy[0].pocet) } : null;
    }
    if(def.a === "pomer"){
      var a = 0, b = 0;
      v.forEach(function(g){
        var d = def.den(g);
        if(d > 0){ a += def.num(g); b += d; }
      });
      return b ? { txt: def.f(a / b) } : null;
    }
    var nej = null;
    v.forEach(function(g){
      var x = def.m(g);
      if(x === null || x === undefined) return;
      if(!nej || (def.a === "max" ? x > nej.x : x < nej.x)) nej = { x:x, g:g };
    });
    /* vedle času se vrací i celý záznam — podřádek v seznamu statistik z něj
       skládá režim hry, jinak by ho musel dohledávat podruhé */
    return nej ? { txt: def.f(nej.x), kdy: nej.g.savedAt, g: nej.g } : null;
  }
  function zebricek(def, hry){
    if(def.a === "denMax") return dnyPodleHer(vyberHry(def, hry));
    if(def.a === "rezimMax") return rezimyPodleHer(vyberHry(def, hry));
    var dir = def.dir || (def.a === "min" ? "asc" : "desc");
    var v = vyberHry(def, hry).map(function(g){ return { g:g, x:def.m(g) }; })
      .filter(function(r){ return r.x !== null && r.x !== undefined; });
    v.sort(function(a, b){ return dir === "asc" ? a.x - b.x : b.x - a.x; });
    return v;
  }
  function jdeRozkliknout(def){ return def.a !== "pocet" && (def.a !== "soucet" || typeof def.m === "function"); }

  /* ---------- záloha historie ----------
     Soubor je čitelný text; poslední řádek nese data pro import.
     Kdyby ho někdo z přehledu smazal, import to pozná a řekne to. */
  var ZNACKA = "#DATA:";
  function datumProNazev(){
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  /* Plné záznamy pro zálohu. V režimu ls je má paměť rovnou, v režimu idb
     se skládají ze souhrnů a detailů. Detaily se čtou kurzorem, ne jedním
     getAll() přes celou polici — při tisících her by to byl jeden obří
     objekt navíc k textu zálohy, který se stejně musí složit. */
  function slozHry(hotovo){
    var hry = histAll().sort(function(a, b){ return (a.savedAt || 0) - (b.savedAt || 0); });
    if(rezim !== "idb"){ hotovo(hry); return; }
    if(!idb){ hotovo(null); return; }
    var tx;
    try{ tx = idb.transaction(DETAILY, "readonly"); }
    catch(e){ hotovo(null); return; }
    var mapa = {}, kur = tx.objectStore(DETAILY).openCursor();
    kur.onsuccess = function(){
      var c = kur.result;
      if(c){ mapa[c.value.id] = c.value.turns || []; c.continue(); return; }
      hotovo(hry.map(function(g){
        return { id: g.id, savedAt: g.savedAt, mode: g.mode, goal: g.goal,
                 roundGoal: g.roundGoal || null, banked: g.banked || 0,
                 turns: mapa[g.id] || [] };
      }));
    };
    kur.onerror = function(){ hotovo(null); };
  }

  /* Formát zálohy se nemění: nahoře čitelný přehled, dole řádek #DATA:.
     Soubor z dřívější verze musí jít naimportovat i potom. */
  function exportText(hry){
    var r = [];
    r.push(t("exp.nadpis"));
    r.push(t("exp.vytvoreno", { kdy: dt(Date.now()), n: hry.length }));
    r.push("");
    hry.forEach(function(rec, i){
      r.push((i + 1) + ") " + popisHry(rec));
      r.push("   " + t("exp.souhrn", {
        b: fmt(rec.banked || 0),
        nej: gNejlepsiKolo(rec) === null ? "\u2014" : fmt(gNejlepsiKolo(rec)),
        f: gFarkle(rec) }));
      var run = 0;
      (rec.turns || []).forEach(function(tah, k){
        if(!tah.bust) run += tah.p;
        /* Farkle stojí na konci závorky jako poslední hod, stejně jako
           v tabulce kol; ve sloupci bodů je nula, protože kolo nic nedalo. */
        var text = popisKola(tah);
        var popis = tah.bust ? ((text ? text + " \u00B7 " : "") + t("slovo.farkle")) : text;
        r.push("   " + (k + 1) + ". " + fmt(tah.bust ? 0 : (tah.p || 0)) +
               (popis ? "  (" + popis + ")" : "") + "   " + t("exp.mezisoucet", { b: fmt(run) }));
      });
      r.push("");
    });
    /* v čitelné části nechceme úzkou nezlomitelnou mezeru, v textovém
       souboru by se leckde zobrazila jako podivný znak */
    return r.join("\n").replace(/\u202F/g, " ") +
           "\n" + t("exp.oddelovac") + "\n" + ZNACKA + JSON.stringify(hry);
  }

  /* Skládání může chvíli trvat, proto se tlačítko po tu dobu zablokuje. */
  function sTextemZalohy(btn, puvodni, hotovo){
    btn.disabled = true;
    btn.textContent = t("zal.pripravuji");
    slozHry(function(hry){
      btn.disabled = false;
      btn.textContent = puvodni;
      if(hry === null){
        zalMsg(t("zal.neslozit"), true);
        return;
      }
      hotovo(exportText(hry));
    });
  }
  function parseZaloha(text){
    var i = text.lastIndexOf(ZNACKA);
    if(i < 0) return null;
    var radek = text.slice(i + ZNACKA.length).split("\n")[0].trim();
    var d;
    try{ d = JSON.parse(radek); }catch(e){ return null; }
    if(!Array.isArray(d)) return null;
    var out = [];
    d.forEach(function(g){
      if(!g || typeof g !== "object" || !Array.isArray(g.turns)) return;
      out.push({
        id: (typeof g.id === "string" && g.id) ? g.id : newId(),
        savedAt: typeof g.savedAt === "number" ? g.savedAt : Date.now(),
        mode: g.mode === "rounds" ? "rounds" : "points",
        goal: g.goal > 0 ? g.goal : 4000,
        roundGoal: g.roundGoal > 0 ? g.roundGoal : null,
        /* Režim může přijít z cizího telefonu, kde takový vlastní režim
           existuje a tady ne — proto se veze i jeho název. Obojí ořezané,
           obojí jde do stránky přes esc(). */
        rezim: (typeof g.rezim === "string" && g.rezim) ? g.rezim.slice(0, NAZEV_MAX) : VYCHOZI_REZIM,
        rezimN: (typeof g.rezimN === "string" && g.rezimN) ? g.rezimN.slice(0, NAZEV_MAX) : null,
        banked: typeof g.banked === "number" ? g.banked : 0,
        /* legitimní popis kola je do stovky znaků, delší je omyl */
        turns: g.turns.map(function(tah){ return kopieKola(tah, 300); })
      });
    });
    return out;
  }
  function stahni(nazev, text){
    try{
      var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = nazev; a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        if(a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1500);
      return true;
    }catch(e){ return false; }
  }
  /* writeText() vrací příslib; když ho prohlížeč odmítne (chybí oprávnění,
     stránka není zaostřená, iOS mimo gesto), nesmíme hlásit úspěch. Výsledek
     proto chodí callbackem. Propad na execCommand už běží mimo uživatelské
     gesto a v části prohlížečů selže taky — pak aspoň hláška nelže. */
  function doSchranky(text, hotovo){
    function nouzovka(){
      try{
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        hotovo(!!ok);
      }catch(e){ hotovo(false); }
    }
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){ hotovo(true); }, nouzovka);
        return;
      }
    }catch(e){}
    nouzovka();
  }

  var elZalMsg=$("zalmsg"), elImpBox=$("impbox"), elImpInfo=$("impinfo"), elImpFile=$("impfile");
  var elPasteBox=$("pastebox"), elPasteArea=$("pastearea");
  var nactene = null, repTimer = null;
  function zalMsg(text, spatne){
    elZalMsg.hidden = !text;
    elZalMsg.textContent = text || "";
    elZalMsg.classList.toggle("bad", !!spatne);
  }
  function novychZ(list){
    var mame = {};
    histAll().forEach(function(g){ mame[g.id] = true; });
    return list.filter(function(g){ return !mame[g.id]; });
  }
  function zavriImport(){
    nactene = null;
    elImpBox.hidden = true;
    clearTimeout(repTimer); repTimer = null;
    $("imprep").textContent = t("nast.nahraditvse");
  }
  function zavriVlozeni(){
    elPasteBox.hidden = true;
    elPasteArea.value = "";
  }
  function renderZaloha(){
    var prazdno = histAll().length === 0;
    $("expbtn").disabled = prazdno;
    $("copybtn").disabled = prazdno;
    zalMsg("");
    zavriImport();
    zavriVlozeni();
    resetMisto();
  }

  /* ---------- místo v úložišti a trvalost ----------
     persist() kvótu nezvětší, jen vyřadí data z automatického úklidu, kterým
     prohlížeče uvolňují místo. Ptát se smí až po interakci uživatele; v Safari
     to platí jen pro aplikaci přidanou na plochu. */
  var trvale = false;
  function zajistiTrvalost(){
    var st = null;
    try{ st = navigator.storage; }catch(e){}
    if(!st || typeof st.persist !== "function") return;
    try{
      if(typeof st.persisted === "function"){
        st.persisted().then(function(uz){
          if(uz){ trvale = true; return null; }
          return st.persist().then(function(v){ trvale = !!v; });
        }).catch(function(){});
        return;
      }
      st.persist().then(function(v){ trvale = !!v; }).catch(function(){});
    }catch(e){}
  }
  function velikost(b){
    if(b < 1024) return b + " B";
    if(b < 1048576) return Math.round(b / 1024) + " kB";
    if(b < 1073741824) return desetina(b / 1048576) + " MB";
    return desetina(b / 1073741824) + " GB";
  }
  /* ---------- údaj o zabraném místě ----------
     Dvě úrovně. Celek se plní sám při otevření nastavení: estimate() je
     jediné volání a nesahá na historii. Rozpis stojí víc — vzorek detailů
     z IndexedDB a projití cache — a počítá se až po rozbalení tlačítkem.

     estimate() měří celý původ, na github.io tedy i ostatní aplikace ze
     stejné adresy; proto „celkem z této adresy", ne „historie". */
  var VZOREK = 50;

  /* localStorage se měří přesně: klíč i hodnota se počítají a UTF-16 dává
     dva bajty na znak, což je i to, co si prohlížeč započítává do kvóty. */
  function lsBajtu(klice){
    var s = 0, i, v;
    try{
      for(i = 0; i < klice.length; i++){
        v = localStorage.getItem(klice[i]);
        if(v === null) continue;
        s += (klice[i].length + v.length) * 2;
      }
    }catch(e){ return null; }
    return s;
  }

  /* Zbytek localStorage: všechno pod prefixem farkle-, co si nebere žádný
     jiný řádek rozpisu. Průchodem přes klíče, ne pevným seznamem — jinak
     rozpis mlčky přehlédne klíč, který někdo časem přidá. Nejtučnější
     položkou tu bývá farkle-hist-v1-zaloha, přejmenovaná původní historie,
     kterou po migraci do IndexedDB držíme jako pojistku. */
  function lsZbytek(krome){
    var s = 0, i, k, v;
    try{
      for(i = 0; i < localStorage.length; i++){
        k = localStorage.key(i);
        if(!k || k.indexOf("farkle-") !== 0) continue;
        if(krome.indexOf(k) !== -1) continue;
        v = localStorage.getItem(k);
        if(v === null) continue;
        s += (k.length + v.length) * 2;
      }
    }catch(e){ return null; }
    return s;
  }

  /* Velikost historie: v režimu ls přesně z jednoho klíče, v režimu idb
     odhadem. IndexedDB velikost police nehlásí a přečíst všechny detaily
     stojí tolik co export, takže se souhrny sečtou celé (leží v paměti)
     a detaily se vzorkují prvními padesáti záznamy. */
  function velikostHistorie(hotovo){
    var pocet = histAll().length;
    if(rezim !== "idb" || !idb){
      hotovo({ pocet: pocet, bajtu: lsBajtu([HKEY]), presne: true });
      return;
    }
    var souhrnu = 0;
    try{
      HIST.forEach(function(g){ souhrnu += JSON.stringify(g).length; });
    }catch(e){ souhrnu = 0; }
    function vzdat(){ hotovo({ pocet: pocet, bajtu: null, presne: false }); }
    var tx, kur;
    try{ tx = idb.transaction(DETAILY, "readonly"); }catch(e){ vzdat(); return; }
    try{ kur = tx.objectStore(DETAILY).openCursor(); }catch(e){ vzdat(); return; }
    var n = 0, delka = 0;
    kur.onsuccess = function(){
      var c = kur.result;
      if(c && n < VZOREK){
        try{ delka += JSON.stringify(c.value).length; }catch(e){}
        n++;
        c.continue();
        return;
      }
      hotovo({ pocet: pocet, presne: false,
               bajtu: souhrnu + (n ? Math.round(delka / n * pocet) : 0) });
    };
    kur.onerror = vzdat;
  }

  /* Velikost samotné aplikace: součet těl všech odpovědí v cache, které si
     drží servisní pracovník. Filtr na kostky- je tu ze stejného důvodu jako
     při úklidu — na github.io leží v Cache API i cizí aplikace a započítat
     je pod „Aplikace" by byla lež. Chybějící nebo nečitelná odpověď se počítá
     jako nula; celý rozpis je odhad, ne účetnictví. */
  function velikostAppky(hotovo){
    var c = null;
    try{ c = window.caches; }catch(e){}
    if(!c || typeof c.keys !== "function"){ hotovo(null); return; }
    try{
      c.keys().then(function(jmena){
        var moje = jmena.filter(function(n){ return n.indexOf("kostky-") === 0; });
        if(!moje.length){ hotovo(0); return null; }
        return Promise.all(moje.map(function(jmeno){
          return c.open(jmeno).then(function(cache){
            return cache.keys().then(function(reqs){
              return Promise.all(reqs.map(function(r){
                return cache.match(r).then(function(resp){
                  if(!resp || !resp.blob) return 0;
                  return resp.blob().then(function(b){ return b.size || 0; },
                                          function(){ return 0; });
                }, function(){ return 0; });
              }));
            });
          }, function(){ return []; });
        })).then(function(pole){
          var s = 0;
          pole.forEach(function(kus){ kus.forEach(function(x){ s += x; }); });
          hotovo(s);
        });
      }).catch(function(){ hotovo(null); });
    }catch(e){ hotovo(null); }
  }

  function odhadMista(hotovo){
    var st = null;
    try{ st = navigator.storage; }catch(e){}
    if(!st || typeof st.estimate !== "function"){ hotovo(null); return; }
    try{
      st.estimate().then(function(o){
        hotovo(o && typeof o.usage === "number" ? o : null);
      }).catch(function(){ hotovo(null); });
    }catch(e){ hotovo(null); }
  }

  /* Plní všechny prvky s třídou misto, ne jedno id — kdyby se údaj někdy
     objevil i jinde, není co dopisovat. Skládá se z uzlů, ne z innerHTML. */
  function ukazMisto(radky){
    var pole = document.querySelectorAll(".misto");
    Array.prototype.forEach.call(pole, function(el){
      el.textContent = "";
      if(!radky || !radky.length){ el.hidden = true; return; }
      radky.forEach(function(r){
        var d = document.createElement("div"), b = document.createElement("b");
        d.className = "ml";
        b.textContent = r.k;
        d.appendChild(b);
        d.appendChild(document.createTextNode(" " + r.v));
        el.appendChild(d);
      });
      el.hidden = false;
    });
  }
  function celkemText(o){
    if(!o) return t("misto.nezjistit");
    return o.quota > 0
      ? t("misto.zdostupnych", { u: velikost(o.usage), q: velikost(o.quota) })
      : velikost(o.usage);
  }
  /* Celek nad tlačítkem. Volá se při každém otevření nastavení — čísla se
     mezi otevřeními mění a zastaralý údaj by mátl víc než chvilkové „Zjišťuji". */
  function celekMista(){
    var el = document.getElementById("mistocelkem");
    if(!el) return;
    el.textContent = t("nast.misto.zjistuji");
    odhadMista(function(o){ el.textContent = celkemText(o); });
  }
  /* Zavřený stav: rozpis schovaný, tlačítko holé. Volá se i při otevření
     nastavení, aby karta začínala vždycky stejně. */
  function resetMisto(){
    var b = document.getElementById("mistobtn");
    if(b){
      b.disabled = false;
      b.textContent = t("nast.misto.btn");
      b.classList.remove("on");
      b.setAttribute("aria-expanded", "false");
    }
    ukazMisto(null);
    celekMista();
  }
  function spoctiMisto(){
    var b = document.getElementById("mistobtn");
    if(b){ b.disabled = true; b.textContent = t("misto.pocitam"); }
    velikostHistorie(function(h){
      velikostAppky(function(appka){
        odhadMista(function(o){
          var radky = [];
          radky.push({ k: t("misto.historie"), v: h.pocet
            ? (tn("slovo.hra", h.pocet) + ", " + (h.bajtu === null
                ? t("misto.nezmeritmalo")
                : (h.presne ? velikost(h.bajtu) : t("misto.priblizne", { v: velikost(h.bajtu) }))))
            : t("misto.zadnahra") });
          var hra = lsBajtu([KEY]);
          radky.push({ k: t("misto.rozehrana"),
                       v: hra === null ? t("misto.nezmerit") : velikost(hra) });
          /* Prázdný koš v úložišti pořád leží, jen jako dvojznakové "[]" —
             pár desítek bajtů, které vypadají jako by v koši něco bylo.
             Když je prázdný, řekne se to rovnou. */
          var vKosi = kosAll().length + kosHistAll().length;
          var kose = lsBajtu([KKEY, KHKEY]);
          radky.push({ k: t("misto.kose"),
                       v: !vKosi ? t("misto.prazdne")
                          : (tn("slovo.hra", vKosi) +
                             (kose === null ? "" : ", " + velikost(kose))) });
          /* Historie v režimu ls sedí pod svým vlastním řádkem, dvakrát se
             počítat nesmí. V režimu idb pod tímhle klíčem nic není. */
          var zbytek = lsZbytek(rezim === "idb" ? [KEY, KKEY, KHKEY] : [KEY, KKEY, KHKEY, HKEY]);
          radky.push({ k: t("misto.nastaveni"),
                       v: zbytek === null ? t("misto.nezmerit") : velikost(zbytek) });
          radky.push({ k: t("misto.aplikace"),
                       v: appka === null
                          ? t("misto.nezmerit")
                          : t("misto.offline", { v: velikost(appka) }) });
          /* Když estimate() není, řádek se vynechá — selhání hlásí podtitulek
             nad tlačítkem a psát totéž dvakrát pod sebe nemá smysl. */
          if(o){
            radky.push({ k: t("misto.celkem"),
              v: celkemText(o) + (trvale ? ". " + t("misto.trvale") : "") });
          }
          ukazMisto(radky);
          if(b){
            b.disabled = false;
            b.textContent = t("nast.misto.btn");
            b.classList.add("on");
            b.setAttribute("aria-expanded", "true");
          }
        });
      });
    });
  }
  /* Tlačítko rozbaluje a zabaluje. Při rozbalení se rozpis pokaždé počítá
     znovu — jinak by po smazání her ukazoval stará čísla. */
  function prepniMisto(){
    var v = document.querySelector(".misto");
    if(v && !v.hidden){ resetMisto(); return; }
    spoctiMisto();
  }

  /* společné pro import ze souboru i ze schránky */
  /* Zdroj („soubor" nebo „text") je součástí klíče: čeština u obou vět
     skloňuje jinak a skládat je ze zvlášť přeložených kousků by slovosled
     zafixovalo česky. */
  function prijmiZalohu(text, zdroj){
    var list = parseZaloha(String(text || ""));
    if(!list){
      zavriImport();
      zalMsg(t("zal.nerozumim." + zdroj), true);
      return;
    }
    if(!list.length){
      zavriImport();
      zalMsg(t("zal.prazdno." + zdroj), true);
      return;
    }
    nactene = list;
    var nove = novychZ(list).length;
    elImpInfo.textContent = t("zal.info." + zdroj, {
      her: tn("slovo.hra", list.length), nove: tn("slovo.nova", nove) });
    $("impadd").disabled = nove === 0;
    $("impadd").textContent = nove ? t("zal.pridatn", { n: nove }) : t("zal.nenicopridat");
    elImpBox.hidden = false;
    zalMsg("");
  }

  $("expbtn").addEventListener("click", function(){
    sTextemZalohy($("expbtn"), t("nast.exp.btn"), function(text){
      var ok = stahni("farkle-history-" + datumProNazev() + ".txt", text);
      zalMsg(t(ok ? "zal.ukladase" : "zal.stazenineslo"), !ok);
    });
  });
  $("copybtn").addEventListener("click", function(){
    sTextemZalohy($("copybtn"), t("nast.kop.btn"), function(text){
      doSchranky(text, function(ok){
        zalMsg(t(ok ? "zal.veschrance" : "zal.schrankaneslo"), !ok);
      });
    });
  });
  $("impbtn").addEventListener("click", function(){
    zalMsg("");
    elImpFile.value = "";
    elImpFile.click();
  });
  elImpFile.addEventListener("change", function(){
    var f = elImpFile.files && elImpFile.files[0];
    if(!f) return;
    var fr = new FileReader();
    fr.onload = function(){
      zavriVlozeni();
      prijmiZalohu(fr.result, "soubor");
    };
    fr.onerror = function(){
      zavriImport();
      zalMsg(t("zal.souborneslo"), true);
    };
    fr.readAsText(f, "utf-8");
  });
  $("mistobtn").addEventListener("click", prepniMisto);
  $("pastebtn").addEventListener("click", function(){
    zalMsg("");
    zavriImport();
    elPasteBox.hidden = false;
    elPasteArea.focus();
  });
  $("pastecancel").addEventListener("click", function(){
    zavriImport();
    zavriVlozeni();
    zalMsg("");
  });
  $("pasteload").addEventListener("click", function(){
    var text = elPasteArea.value;
    if(!text.trim()){
      zalMsg(t("zal.poleprazdne"), true);
      return;
    }
    prijmiZalohu(text, "text");
  });
  $("impadd").addEventListener("click", function(){
    if(!nactene) return;
    var nove = novychZ(nactene);
    var pocet = nove.length;
    histWrite(histAll().concat(nove.map(proHistorii)), function(ok){
      if(!ok){
        zalMsg(t(klicSelhani("chyba.mistoulozit")) + ".", true);
        return;
      }
      zavriImport();
      zavriVlozeni();
      zalMsg(tn("zal.pridano", pocet));
      renderP2(); renderZaloha2();
    }, nove);
  });
  $("imprep").addEventListener("click", function(){
    if(!nactene) return;
    var b = $("imprep");
    if(!repTimer){
      b.textContent = t("zal.opravdunahradit");
      repTimer = setTimeout(function(){ repTimer = null; b.textContent = t("nast.nahraditvse"); }, 5000);
      return;
    }
    clearTimeout(repTimer); repTimer = null;
    var pocet = nactene.length;
    histWrite(nactene.map(proHistorii), function(ok){
      if(!ok){
        zalMsg(t(klicSelhani("chyba.mistoulozit")) + ".", true);
        return;
      }
      /* rozehraná hra se mohla vázat na záznam, který import smetl —
         kdeZaznam() to pozná sám, stačí překreslit */
      render();
      zavriImport();
      zavriVlozeni();
      zalMsg(t("zal.nahrazeno", { her: tn("slovo.hra", pocet) }));
      renderP2(); renderZaloha2();
    }, nactene);
  });
  /* po zápisu se mění jen zapnutost tlačítek, hlášku necháváme na obrazovce */
  function renderZaloha2(){
    var prazdno = histAll().length === 0;
    $("expbtn").disabled = prazdno;
    $("copybtn").disabled = prazdno;
  }

  /* ---------- stránka Statistiky ---------- */
  var segIdx = 0, delTimer = null;
  var elSeg=$("seg"), elStatList=$("statlist"), elHistList=$("histlist"),
      elP2List=$("p2list"), elP2Detail=$("p2detail"),
      elDetTitle=$("dettitle"), elDetBody=$("detbody");

  /* Podstránka detailu je jedna, ale dá se do ní přijít dvěma cestami: ze
     seznamu her, nebo ze žebříčku statistiky. Zásobník je proto jednoúrovňový
     — víc úrovní vzniknout nemůže, protože z detailu hry se dál nikam nejde. */
  var navZpet = null;   // null | { statIdx: i }
  /* Scroll seznamu a scroll žebříčku, než se z nich vyšlo do detailu —
     #p2list a #p2detail scrolluje společný rodič #page2, takže bez
     uložení by se po *Zpět* vždycky spadlo na 0 (viz doDetailu). */
  var scrollList = 0, scrollZebricek = 0;
  function zrusNav(){ navZpet = null; }
  function zpetNaSeznam(){
    clearTimeout(delTimer); delTimer = null;
    if(navZpet){
      var i = navZpet.statIdx;
      navZpet = null;
      otevriZebricek(i);
      $("page2").scrollTop = scrollZebricek;
      return;
    }
    elP2Detail.hidden = true;
    elP2List.hidden = false;
    renderP2();
    $("page2").scrollTop = scrollList;
  }
  function doDetailu(titulek){
    odpojPozorovatele();
    elDetTitle.textContent = titulek;
    elP2List.hidden = true;
    elP2Detail.hidden = false;
    elP2Detail.scrollTop = 0;
    $("page2").scrollTop = 0;
  }

  /* ---------- stránkování dlouhých seznamů ----------
     Historie i žebříček stavěly prvek na každou dohranou hru. Při tisících
     her je jediné, co se tu reálně zadrhne, počet prvků v DOM — ne výpočet.
     Vykresluje se proto po dávkách po KROK položkách.

     Stav se nikde nedrží: každé nové vykreslení seznamu začíná od začátku,
     takže návrat z detailu, přepnutí přepínače i import resetují stránkování
     samy od sebe. Klepnutí na značku naopak jen dolije další dávku a zbytek
     seznamu nechá být — přestavovat celý seznam by při tisících her stálo
     kvadraticky. */
  var KROK = 50;
  var pozorovatel = null;

  function odpojPozorovatele(){
    if(pozorovatel){ pozorovatel.disconnect(); pozorovatel = null; }
  }

  /* Roluje #page2, ne okno — kořenem pozorovatele tedy musí být ta stránka.
     Pozorovatel je vždycky nejvýš jeden: značka je na obrazovce taky jen jedna. */
  function sledujZnacku(el, spust){
    odpojPozorovatele();
    if(typeof IntersectionObserver !== "function") return;
    try{
      pozorovatel = new IntersectionObserver(function(zaznamy){
        for(var i = 0; i < zaznamy.length; i++){
          if(zaznamy[i].isIntersecting){ spust(); return; }
        }
      }, { root: $("page2"), rootMargin: "150px" });
      pozorovatel.observe(el);
    }catch(e){ pozorovatel = null; }
  }

  /* Jeden prvek, dvě cesty: rolování ho vystřelí přes pozorovatele, klepnutí
     funguje i tam, kde by pozorovatel selhal nebo vůbec nebyl. */
  function pridejZnacku(kam, zbyva, dalsi){
    var b = document.createElement("button");
    b.type = "button";
    b.className = "morerow";
    /* u poslední dávky by „dalších 13 · zbývá 13" jen mátlo */
    b.innerHTML = zbyva > KROK
      ? (esc(t("dalsi.dalsich", { n: KROK })) +
         '<span class="mz">' + esc(t("dalsi.zbyva", { n: zbyva })) + "</span>")
      : esc(t("dalsi.poslednich", { n: zbyva }));
    var spusteno = false;
    function spust(){
      if(spusteno) return;
      spusteno = true;
      odpojPozorovatele();
      b.remove();
      dalsi();
    }
    b.addEventListener("click", spust);
    kam.appendChild(b);
    sledujZnacku(b, spust);
  }

  /* Řádky se skládají do DocumentFragment a vkládají jedním zápisem,
     ať se nevyvolá padesát přepočtů rozvržení. Značka jde jinam než řádky:
     u žebříčku patří řádky do <tbody>, ale tlačítko pod tabulku. */
  function vypisDavku(kamRadky, kamZnacka, polozky, od, stavitel){
    var konec = Math.min(od + KROK, polozky.length);
    var frag = document.createDocumentFragment();
    for(var i = od; i < konec; i++) frag.appendChild(stavitel(polozky[i], i));
    kamRadky.appendChild(frag);
    var zbyva = polozky.length - konec;
    if(zbyva > 0){
      pridejZnacku(kamZnacka, zbyva, function(){
        vypisDavku(kamRadky, kamZnacka, polozky, konec, stavitel);
      });
    }
  }

  function renderP2(){
    odpojPozorovatele();
    var hry = histView(segIdx === 1);
    elStatList.hidden = segIdx !== 0;
    elHistList.hidden = segIdx !== 1;
    Array.prototype.forEach.call(elSeg.children, function(b, i){
      b.classList.toggle("on", i === segIdx);
    });
    renderFiltry();
    if(segIdx === 0) renderStatList(hry); else renderHistList(hry);
  }

  function renderStatList(hry){
    elStatList.innerHTML = "";
    if(!hry.length){
      elStatList.innerHTML = '<div class="empty">' +
        esc(t(histAll().length ? "stat.filtrprazdno" : "stat.zadnahra")) + '</div>';
      return;
    }
    STATY.forEach(function(def, i){
      var h = statHodnota(def, hry);
      var lze = jdeRozkliknout(def) && h;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "strow";
      b.disabled = !lze;
      b.innerHTML =
        '<span class="sn">' + esc(t(def.n)) +
          (h && h.pod ? '<span class="sd">' + esc(h.pod) + '</span>' : '') +
          (h && h.kdy ? '<span class="sd">' + (h.den
              ? dtDen(h.kdy)
              : dt(h.kdy) + (h.g ? ' \u00B7 ' + esc(nazevRezimuZaznamu(h.g)) +
                             ' \u00B7 ' + esc(popisTypuHry(h.g)) : '')) + '</span>' : '') +
        '</span>' +
        '<b class="sv">' + (h ? h.txt : "\u2014") + '</b>' +
        (lze ? '<span class="chev">\u00BB</span>' : '');
      if(lze){
        b.addEventListener("click", function(){
          scrollList = $("page2").scrollTop;
          otevriZebricek(i);
        });
      }
      elStatList.appendChild(b);
    });
  }

  function otevriZebricek(i){
    var def = STATY[i], hry = histView(false), v = zebricek(def, hry);
    navZpet = null;
    doDetailu(t(def.n));
    if(!v.length){
      elDetBody.innerHTML = '<div class="empty">' + esc(t("stat.beznadat")) + '</div>';
      return;
    }
    elDetBody.innerHTML = '<table><tbody></tbody></table>';
    vypisDavku(elDetBody.querySelector("tbody"), elDetBody, v, 0,
               def.a === "denMax" ? radekDne(def)
                                  : (def.a === "rezimMax" ? radekRezimu(def) : radekHry(def, i)));
  }
  /* Stavitel se vybírá napřed, ne uvnitř šablony — žebříček dnů nese jiná
     data než žebříček her a míchat obojí v jednom innerHTML by bylo horší
     ke čtení než dvě krátké funkce. */
  function radekHry(def, statIdx){
    return function(r, k){
      var tr = document.createElement("tr");
      tr.className = "klik";
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.innerHTML =
        '<td class="n">' + (k + 1) + '</td>' +
        '<td class="d">' + dt(r.g.savedAt) + ' \u00B7 ' + esc(nazevRezimuZaznamu(r.g)) +
          ' \u00B7 ' + esc(popisTypuHry(r.g)) +
          (def.kol ? ' \u00B7 ' + esc(tn("slovo.kolo", gKol(r.g))) : '') + '</td>' +
        '<td class="g">' + def.f(r.x) + '</td>' +
        '<td class="c">\u00BB</td>';
      function jdi(){
        scrollZebricek = $("page2").scrollTop;
        navZpet = { statIdx: statIdx };
        otevriHru(r.g.id);
      }
      tr.addEventListener("click", jdi);
      /* <tr> není tlačítko, Enter ani mezerník si sám neobslouží */
      tr.addEventListener("keydown", function(e){
        if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
          e.preventDefault();
          jdi();
        }
      });
      return tr;
    };
  }
  /* Jediné místo, kde se karta přepíná sama. Na rozdíl od prokliku do detailu
     hry je to tady smysl akce: chci vidět ty hry, ne jejich počet. */
  function radekDne(def){
    return function(r, k){
      var tr = document.createElement("tr");
      tr.className = "klik";
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.innerHTML =
        '<td class="n">' + (k + 1) + '</td>' +
        '<td class="d">' + dtDen(r.kdy) + '</td>' +
        '<td class="g">' + def.f(r.pocet) + '</td>' +
        '<td class="c">\u00BB</td>';
      function jdi(){
        FILTR.od = r.kdy;
        FILTR.do = konecDne(r.kdy);
        segIdx = 1;
        zrusNav();
        zpetNaSeznam();
      }
      tr.addEventListener("click", jdi);
      tr.addEventListener("keydown", function(e){
        if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
          e.preventDefault();
          jdi();
        }
      });
      return tr;
    };
  }

  /* Řádek žebříčku režimů se nikam neproklikává: filtr podle režimu není,
     takže by neměl kam vést. Proto ani třída klik, ani šipka. */
  function radekRezimu(def){
    return function(r, k){
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="n">' + (k + 1) + '</td>' +
        '<td class="d">' + esc(r.nazev) + '</td>' +
        '<td class="g">' + def.f(r.pocet) + '</td>' +
        '<td class="c"></td>';
      return tr;
    };
  }

  function renderHistList(hry){
    elHistList.innerHTML = "";
    if(!hry.length){
      elHistList.innerHTML = '<div class="empty">' +
        esc(t(histAll().length ? "stat.filtrprazdno" : "hist.prazdna")) + '</div>';
      return;
    }
    /* Den se porovnává se skutečně předchozí položkou v poli, ne s poslední
       vykreslenou — díky tomu čára správně vyjde i na hranici dávky po
       padesáti položkách, kde se stavitel spouští znovu od nuly. */
    vypisDavku(elHistList, elHistList, hry, 0, function(rec, i){
      var frag = document.createDocumentFragment();
      var pred = i > 0 ? hry[i - 1] : null;
      /* Při řazení podle bodů se čáry nekreslí vůbec — dny už v seznamu
         nejdou po sobě a čára by nad každou hrou hlásila jiné datum. */
      if(RAZENI.podle === "datum" &&
         (!pred || denKlic(new Date(pred.savedAt || 0)) !== denKlic(new Date(rec.savedAt || 0)))){
        var s = document.createElement("div");
        s.className = "dsep";
        s.textContent = dtDen(rec.savedAt);
        frag.appendChild(s);
      }
      var b = document.createElement("button");
      b.type = "button";
      b.className = "grow";
      b.innerHTML = '<span class="gn"><b>' + dt(rec.savedAt) + '</b>' +
        esc(nazevRezimuZaznamu(rec)) + ' \u00B7 ' + esc(popisTypuHry(rec)) +
        ' \u00B7 ' + esc(tn("slovo.kolo", gKol(rec))) +
        ' \u00B7 ' + esc(t("hist.farklex", { n: gFarkle(rec) })) + '</span>' +
        '<b class="gv">' + esc(fmt(rec.banked || 0)) + '</b>';
      b.addEventListener("click", function(){
        scrollList = $("page2").scrollTop;
        otevriHru(rec.id);
      });
      frag.appendChild(b);
      return frag;
    });
  }

  /* Hlavička a přechod na podstránku jsou hned ze souhrnu, tabulka kol až
     po dotažení detailu. Když má záznam `turns` už v ruce (propad na
     localStorage), jde všechno naráz a bez čekání. */
  function otevriHru(id){
    var hry = histAll(), i = histIndex(hry, id);
    if(i < 0) return;
    var sou = hry[i];
    doDetailu(t("hist.hraz", { kdy: dt(sou.savedAt) }));
    elDetBody.innerHTML =
      '<div class="tally" id="dtally"></div><div class="tallycap" id="dtallycap"></div>' +
      '<div class="stats">' + statsHTML(sou) + '</div>' +
      '<div id="detrows"><div class="empty">' + esc(t("hist.nactamkola")) + '</div></div>' +
      '<div class="archwrap"><button class="ghost arch" id="delgame" type="button" disabled>' +
        esc(t("hist.smazat")) + '</button></div>';
    tallyInto($("dtally"), $("dtallycap"), sou);
    var db = $("delgame");

    /* Do koše se ukládá celý záznam, jinak by se z něj vrátila hra bez kol.
       Dokud detail není v ruce, mazat nejde. */
    var plny = null;
    function sKoly(turns){
      if(turns === null){
        $("detrows").innerHTML = '<div class="empty">' + esc(t("hist.kolanejdou")) + '</div>';
        return;
      }
      plny = { id: sou.id, savedAt: sou.savedAt, mode: sou.mode, goal: sou.goal,
               roundGoal: sou.roundGoal || null, rezim: gRezim(sou), rezimN: sou.rezimN || null,
               banked: sou.banked || 0, turns: turns };
      $("detrows").innerHTML = turns.length
        ? ('<table><tbody>' + rowsHTML(turns) + '</tbody></table>')
        : '<div class="empty">' + esc(t("hist.zadnekolo")) + '</div>';
      db.disabled = false;
    }
    if(Array.isArray(sou.turns)) sKoly(sou.turns);
    else nactiDetail(id, sKoly);

    db.addEventListener("click", function(){
      if(!plny) return;
      if(!delTimer){
        db.classList.add("warn");
        db.textContent = t("hist.opravdu");
        delTimer = setTimeout(function(){
          delTimer = null;
          db.classList.remove("warn");
          db.textContent = t("hist.smazat");
        }, 4000);
        return;
      }
      clearTimeout(delTimer); delTimer = null;
      /* Dva zápisy za sebou. Když padne první, nemažeme vůbec — kopie v koši
         je jediná pojistka. Když padne druhý, vracíme i ten první, jinak by
         hra zůstala v historii i v koši, tedy dvakrát. */
      var predtim = kosHistAll();
      if(!kosHistPush(plny)){
        hlaskaNaTlacitku(db, t("chyba.dokose"), t("hist.smazat"));
        return;
      }
      histWrite(histAll().filter(function(g){ return g.id !== id; }), function(ok){
        if(!ok){
          kosHistWrite(predtim);
          hlaskaNaTlacitku(db, t(klicSelhani("chyba.mistosmazat")), t("hist.smazat"));
          return;
        }
        /* Vazba rozehrané hry na záznam se nepřetrhává: hra ví, že její
           záznam leží v koši, a tlačítko v Zápisu kol nabídne návrat. Kdyby
           se vazba zrušila, hra by vypadala jako nikdy neuložená a Nová hra
           by z ní udělala druhou kopii v koši rozehraných. */
        /* žebříček by po smazání ukazoval hru, která už neexistuje */
        zrusNav();
        zpetNaSeznam();
        render();
      });
    });
  }

  /* ---------- lišta filtrů ----------
     Popisek nese zvolený filtr, ať je vidět i bez otevření okna. Datum se
     píše co nejúsporněji: shodné části rozsahu se neopakují. */
  var elFbar = $("fbar"), elFdatum = $("fdatum"),
      elFtyp = $("ftyp"), elFraz = $("frazeni");
  function popisDatumu(){
    if(FILTR.od === null || FILTR.do === null) return t("filtr.datum");
    var a = new Date(FILTR.od), b = new Date(FILTR.do);
    if(denKlic(a) === denKlic(b)) return dtDen(FILTR.od);
    return kat("datumRozsah")(a, b);
  }
  function popisTypu(){
    if(FILTR.typ === null) return t("filtr.typhry");
    if(FILTR.typ === "points")
      return FILTR.hodnota === null ? t("filtr.nabody") : t("typhry.dobodu", { b: fmt(FILTR.hodnota) });
    if(FILTR.hodnota === null) return t("typhry.nakola");
    return FILTR.hodnota === 0
      ? (t("typhry.nakola") + " \u00B7 " + t("filtr.bezlimitu"))
      : t("filtr.nakolan", { n: FILTR.hodnota });
  }
  /* Popisky řazení jsou jen tady — z nich se plní nabídka i tlačítko, aby
     se stejný text nepsal dvakrát. Výchozí řazení se na tlačítko nepíše;
     tam zůstává holé „Řazení" bez mosazného rámu. */
  var RAZ_POPIS = {
    "datum:desc": "razeni.nejnovejsi",
    "datum:asc":  "razeni.nejstarsi",
    "body:desc":  "razeni.nejvic",
    "body:asc":   "razeni.nejmin"
  };
  function popisRazeni(){
    var k = RAZENI.podle + ":" + RAZENI.smer;
    return (k === "datum:desc" || !RAZ_POPIS[k]) ? t("filtr.razeni") : t(RAZ_POPIS[k]);
  }
  /* Na tlačítku zůstává krátký stálý popisek, aby se všechna vešla na jeden
     řádek; zvolený filtr nese mosazný rám. Plné znění jde do aria-label —
     čtečka ho přečte a testy mají co kontrolovat. */
  function popisTlacitka(el, txt, holy){
    el.setAttribute("aria-label", txt);
    el.classList.toggle("on", txt !== holy);
  }
  function renderFiltry(){
    var jsou = histAll().length > 0;
    elFbar.hidden = !jsou;
    if(!jsou) return;
    popisTlacitka(elFdatum, popisDatumu(), t("filtr.datum"));
    /* Typ hry a řazení dávají smysl jen nad seznamem her. Skrytá tlačítka
       z řádku vypadnou úplně a zbylá dvě se o jeho šířku podělí sama. */
    var vSeznamu = segIdx === 1;
    elFtyp.hidden = !vSeznamu;
    elFraz.hidden = !vSeznamu;
    popisTlacitka(elFtyp, popisTypu(), t("filtr.typhry"));
    popisTlacitka(elFraz, popisRazeni(), t("filtr.razeni"));
  }

  $("freset").addEventListener("click", function(){
    zrusFiltr();
    renderP2();
  });

  /* Okno výběru data. Rozsah je včetně obou krajních dnů; obrácené zadání se
     prohodí, místo aby se hlásila chyba. Prázdná pole filtr zruší. */
  (function(){
    var rezimDne = "den",
        elSegD = $("dateseg"), elOd = $("dateod"), elDo = $("datedo"),
        elDoRow = $("datedorow"), elOdL = $("dateodl");

    function isoDne(ms){ return ms === null ? "" : denKlic(new Date(ms)); }
    function zIso(s){
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
      return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null;
    }
    function nastavRezim(r){
      rezimDne = r;
      Array.prototype.forEach.call(elSegD.children, function(b, i){
        b.classList.toggle("on", (i === 0) === (r === "den"));
      });
      elDoRow.hidden = r === "den";
      elOdL.textContent = t(r === "den" ? "datum.den" : "datum.od");
    }
    Array.prototype.forEach.call(elSegD.children, function(b, i){
      b.addEventListener("click", function(){ nastavRezim(i === 0 ? "den" : "rozsah"); });
    });

    elFdatum.addEventListener("click", function(){
      var min = null, max = null;
      histAll().forEach(function(g){
        var t = g.savedAt || 0;
        if(min === null || t < min) min = t;
        if(max === null || t > max) max = t;
      });
      elOd.min = elDo.min = isoDne(min);
      elOd.max = elDo.max = isoDne(max);
      var jedenDen = FILTR.od !== null && FILTR.do !== null &&
                     denKlic(new Date(FILTR.od)) === denKlic(new Date(FILTR.do));
      nastavRezim(FILTR.od !== null && !jedenDen ? "rozsah" : "den");
      elOd.value = isoDne(FILTR.od);
      elDo.value = isoDne(FILTR.do);
      otevriModal("datemodal", this);
    });

    $("datezpet").addEventListener("click", function(){ zavriModal(); });
    $("dateok").addEventListener("click", function(){
      var od = zIso(elOd.value),
          konec = rezimDne === "den" ? od : zIso(elDo.value);
      if(od === null && konec === null){
        FILTR.od = null; FILTR.do = null;
      }else{
        if(od === null) od = konec;
        if(konec === null) konec = od;
        if(konec < od){ var p = od; od = konec; konec = p; }
        FILTR.od = od;
        FILTR.do = konecDne(konec);
      }
      zavriModal();
      renderP2();
    });
  })();

  /* Okno výběru typu hry. Výběr je dvoustupňový: nejdřív typ, teprve pak
     hodnota. První políčko přepínače je „Vše" — bez něj by šel filtr typu
     zapnout, ale ne vypnout jinak než tlačítkem Zrušit filtr, které by
     s ním shodilo i datum. */
  (function(){
    var typVolba = null,
        elSegT = $("typseg"), elVal = $("typval"),
        elValRow = $("typvalrow"), elValL = $("typvall");

    function typZIndexu(i){ return i === 0 ? null : (i === 1 ? "points" : "rounds"); }

    function nastavTyp(typ, hodnota){
      typVolba = typ;
      Array.prototype.forEach.call(elSegT.children, function(b, i){
        b.classList.toggle("on", typZIndexu(i) === typ);
      });
      elValRow.hidden = typ === null;
      if(typ === null){ elVal.innerHTML = ""; return; }
      elValL.textContent = t(typ === "points" ? "typ.cil" : "typ.limit");
      var s = '<option value="">' + esc(t("typ.vsechny")) + '</option>';
      hodnotyTypu(typ).forEach(function(x){
        s += '<option value="' + esc(String(x)) + '">' +
          esc(typ === "rounds"
            ? (x === 0 ? t("filtr.bezlimitu") : tn("slovo.kolo", x))
            : fmt(x)) +
          '</option>';
      });
      elVal.innerHTML = s;
      /* Hodnota z vypnutého filtru v nabídce být nemusí (hra mezitím zmizela
         z historie) — pak se spadne zpátky na „Všechny". */
      elVal.value = (hodnota === null || hodnota === undefined) ? "" : String(hodnota);
      if(elVal.selectedIndex < 0) elVal.value = "";
    }

    Array.prototype.forEach.call(elSegT.children, function(b, i){
      b.addEventListener("click", function(){ nastavTyp(typZIndexu(i), null); });
    });

    elFtyp.addEventListener("click", function(){
      nastavTyp(FILTR.typ, FILTR.hodnota);
      otevriModal("typmodal", this);
    });

    $("typzpet").addEventListener("click", function(){ zavriModal(); });
    $("typok").addEventListener("click", function(){
      FILTR.typ = typVolba;
      FILTR.hodnota = (typVolba === null || elVal.value === "") ? null : +elVal.value;
      zavriModal();
      renderP2();
    });
  })();

  /* Okno řazení. Nemá Použít — klepnutí na možnost je samo o sobě volba,
     další potvrzení by bylo jen krok navíc. */
  (function(){
    var tlac = Array.prototype.slice.call($("sortbtns").children);
    elFraz.addEventListener("click", function(){
      tlac.forEach(function(b){
        b.classList.toggle("on", b.getAttribute("data-podle") === RAZENI.podle &&
                                 b.getAttribute("data-smer") === RAZENI.smer);
      });
      otevriModal("sortmodal", this);
    });
    tlac.forEach(function(b){
      b.textContent = t(RAZ_POPIS[b.getAttribute("data-podle") + ":" + b.getAttribute("data-smer")]);
      b.addEventListener("click", function(){
        RAZENI.podle = b.getAttribute("data-podle");
        RAZENI.smer  = b.getAttribute("data-smer");
        zavriModal();
        renderP2();
      });
    });
  })();

  Array.prototype.forEach.call(elSeg.children, function(b, i){
    b.addEventListener("click", function(){
      segIdx = i;
      zrusNav();
      zpetNaSeznam();
    });
  });
  $("detback").addEventListener("click", zpetNaSeznam);

  function render(){
    var r = cur(), l = left(), pot = potTotal();

    var lock = locked();
    /* odemčená hra čeká na nové skončení — po smazání kola se automatické
       uložení pustí znovu a záznam v historii se aktualizuje */
    if(!lock && S.autoUlozeno){ S.autoUlozeno = false; }

    elScore.textContent = fmt(S.banked);
    elTotal.classList.toggle("won", lock);
    if(S.mode === "rounds"){
      elRestLabel.textContent = t("pocitadlo.odehranokol");
      elRest.textContent = S.roundGoal > 0
        ? t("pocitadlo.zkol", { n: S.turns.length, z: S.roundGoal })
        : S.turns.length;
    } else {
      var rest = S.goal - S.banked;
      elRestLabel.textContent = t(rest > 0 ? "pocitadlo.zbyva" : "pocitadlo.nadcil");
      elRest.textContent = fmt(Math.abs(rest));
    }
    elPot.textContent = fmt(pot);
    elTurnLabel.textContent = t("pocitadlo.kolonastole", { n: S.turns.length + 1 });

    elRollLine.innerHTML = t("pocitadlo.hodradek", {
        n: S.rolls.length, kostky: esc(tn("slovo.kostkami", r.thrown)) }) +
      (l < r.thrown ? ' <span style="color:var(--dim)">' + esc(t("pocitadlo.hodzbyva", { n: l })) + '</span>' : "");

    /* v zámku tlačítko zůstává živé, protože vede na zápis kol */
    elRollOn.disabled = !lock && r.items.length === 0;
    var popisRollu = lock ? t("pocitadlo.hraskoncila")
      : (r.items.length === 0
          ? t("pocitadlo.nejdriv")
          : (l > 0 ? t("pocitadlo.hazetdalx", { kostky: tn("slovo.kostkami", l) })
                   : t("pocitadlo.horke")));
    elRollOn.textContent = popisRollu;
    /* Riziko sedí na tlačítku Farkle a hází se zbylými kostkami — nebo při
       horkých kostkách znovu všemi šesti. Poškozený stav může dát nesmyslný
       počet, proto ten strop. Platí i pro první hod, kde ještě nic neleží:
       je to údaj o kostkách na stole, ne o rozhodnutí házet dál. */
    var kostekDal = (l > 0 && l <= kostek()) ? l : kostek();
    elBustRiz.textContent = lock ? ""
      : t("pocitadlo.farkleriziko", { p: desetina(tabulkaRizika()[kostekDal - 1]) });

    /* Zapsat nad rozehraným hodem, ze kterého se nic neodložilo, nejde: takové
       kolo by v popisu neslo o jeden hod míň, než kolika se doopravdy házelo,
       a statistika nejvíc hodů v kole by to nepoznala. V Farkle se po hodu
       stejně vždycky buď boduje, nebo farkluje — ven vedou Farkle a Zpět.
       Na prvním hodu kola se nic nemění, tam už tlačítko drží pot <= 0. */
    elBank.disabled = lock || pot <= 0 || r.items.length === 0;
    elBank.textContent = pot > 0 ? t("pocitadlo.zapsatx", { b: fmt(pot) }) : t("pocitadlo.zapsatapredat");
    elBust.disabled = lock;
    elUndo.disabled = !jdeZpet();

    elLock.hidden = !lock;
    if(lock){
      elLock.textContent = S.mode === "points"
        ? t("pocitadlo.konecbody", { b: fmt(S.goal) })
        : t("pocitadlo.koneckola", { n: S.roundGoal });
    }

    /* při nule kostek se čeká na „Házet dál“ (horké kostky) — ruční zadání
       se zamyká stejně jako zbytek klávesnice */
    var manLock = lock || l < 1;
    [elMToggle, $("mless"), $("mkost"), $("mmore"), $("madd")].forEach(function(b){ b.disabled = manLock; });
    elMnum.disabled = manLock;
    if(manLock && !elManual.hidden){ elManual.hidden = true; elMToggle.classList.remove("sel"); }
    if(manualDice > Math.max(1, l)) manualDice = Math.max(1, l);
    elMkost.textContent = tn("pocitadlo.kostzkr", l > 0 ? manualDice : 0);

    renderKombi(); renderKind(); renderFix(); renderRows(); renderStats(); renderTally(); renderArch();
    save();
  }

  /* ---------- události ---------- */
  elDataSingle.forEach(function(b){
    b.addEventListener("click", function(){
      var rez = aktRezim(), v = Number(b.dataset.single), body = rez.sam[v] || 0;
      if(!(body > 0)) return;
      keep(kodStejnych(1, v), body, 1);
    });
  });
  elDataStr.forEach(function(b){
    b.addEventListener("click", function(){
      var rez = aktRezim(), k = b.dataset.str, s = STRAIGHTS[k];
      if(!(rez.post[k] > 0)) return;
      keep(s.k, rez.post[k], s.d);
    });
  });
  /* Sazba se čte až při klepnutí, aby změna v nastavení platila hned. */
  elDataKombi.forEach(function(b){
    b.addEventListener("click", function(){
      var k = b.dataset.kombi;
      var rez = aktRezim();
      if(!kombZap(rez, k) || !kombVRezimu(rez, k)) return;
      keep(PRESETY[k].k, sazba(rez, k), PRESETY[k].d);
    });
  });
  elAddKind.addEventListener("click", function(){
    if(selValue === null) return;
    keep(kodStejnych(selCount, selValue), kindPoints(selValue, selCount), selCount);
    selValue = null; renderKind();
  });
  elMToggle.addEventListener("click", function(){
    var open = elManual.hidden;
    elManual.hidden = !open;
    elMToggle.classList.toggle("sel", open);
    if(open) elMnum.focus();
  });
  $("mless").addEventListener("click", function(){ manualDice = Math.max(1, manualDice - 1); render(); });
  $("mmore").addEventListener("click", function(){ manualDice = Math.min(Math.max(1, left()), manualDice + 1); render(); });
  $("madd").addEventListener("click", function(){
    var v = parseInt(elMnum.value, 10);
    if(!v || v <= 0){ elMnum.focus(); return; }
    keep("v", v, Math.min(manualDice, left()));
    elMnum.value = "";
  });
  elMnum.addEventListener("keydown", function(e){ if(e.key === "Enter") $("madd").click(); });

  elRollOn.addEventListener("click", rollOn);
  elBank.addEventListener("click", bank);
  $("bust").addEventListener("click", bust);
  $("undo").addEventListener("click", undo);
  $("fixturns").addEventListener("click", function(){
    fixMode = !fixMode;
    pendingDel = null;
    renderRows();
  });
  $("reset").addEventListener("click", reset);
  elArch.addEventListener("click", archive);
  $("newback").addEventListener("click", function(){ zavriModal(); });
  $("newdrop").addEventListener("click", function(){ zavriModal(); novaHra(); });
  /* Uložit a začít novou: wipe() teprve po potvrzeném zápisu, jinak by se
     hra ztratila v domnění, že je v historii. Po zápisu má S.archivedId
     hodnotu a kosPush() uvnitř novaHra() už zálohu nepotřebuje. */
  $("newsave").addEventListener("click", function(){
    var b = this;
    b.disabled = true;
    zapisHru(function(ok){
      b.disabled = false;
      if(!ok){
        hlaskaNaTlacitku(b, t(klicSelhani("chyba.mistoulozit")), t("nova.ulozit"));
        return;
      }
      zavriModal();
      novaHra();
    });
  });
  $("setbtn").addEventListener("click", function(){
    /* rozdělaná otázka ani vybraná karta se z minula nepřenášejí */
    ptamSeKos = null; ptamSeKosHist = null; ptamSeVzor = null;
    ptamSeRezim = null; ptamSeTvar = null; rezEdit = null; kombEdit = null;
    naKartuNastaveni(0);
    renderKos(); renderZaloha(); renderRezimy();
  });

  /* režim a cíl hry */
  var PRESETS = ["2000","4000","6000","8000","10000"];
  function syncGoalUI(){
    elModeSel.value = S.mode;
    var rounds = (S.mode === "rounds");
    elGoalSel.hidden = rounds;
    elRoundSel.hidden = !rounds;
    if(rounds){
      elGoalNum.hidden = true;
      var limit = S.roundGoal > 0;
      elRoundSel.value = limit ? "custom" : "none";
      elRoundNum.hidden = !limit;
      elRoundNum.value = limit ? S.roundGoal : "";
      return;
    }
    elRoundNum.hidden = true;
    var preset = PRESETS.indexOf(String(S.goal)) >= 0;
    elGoalSel.value = preset ? String(S.goal) : "custom";
    elGoalNum.hidden = preset;
    elGoalNum.value = S.goal;
  }
  /* Změna cíle, režimu i limitu může hru zamknout — a zamknutá hra je
     dohraná, takže se sem spouštěč patří stejně jako za bank() a bust(). */
  elModeSel.addEventListener("change", function(){
    S.mode = elModeSel.value;
    syncGoalUI();
    render();
    zkusAutoUlozit();
  });
  elGoalSel.addEventListener("change", function(){
    if(elGoalSel.value === "custom"){
      elGoalNum.hidden = false;
      elGoalNum.value = S.goal;
      elGoalNum.focus();
      elGoalNum.select();
    } else {
      S.goal = Number(elGoalSel.value);
      elGoalNum.hidden = true;
      render();
      zkusAutoUlozit();
    }
  });
  elGoalNum.addEventListener("input", function(){
    var v = parseInt(elGoalNum.value, 10);
    if(v && v > 0){ S.goal = v; render(); zkusAutoUlozit(); }
  });
  elRoundSel.addEventListener("change", function(){
    if(elRoundSel.value === "custom"){
      S.roundGoal = S.roundGoal > 0 ? S.roundGoal : Math.max(10, S.turns.length + 1);
      elRoundNum.hidden = false;
      elRoundNum.value = S.roundGoal;
      elRoundNum.focus();
      elRoundNum.select();
      render();
      zkusAutoUlozit();
    } else {
      S.roundGoal = null;
      elRoundNum.hidden = true;
      render();
    }
  });
  elRoundNum.addEventListener("input", function(){
    var v = parseInt(elRoundNum.value, 10);
    if(v && v > 0){ S.roundGoal = v; render(); zkusAutoUlozit(); }
  });

  /* ---------- přepínač jazyka ----------
     Volby se skládají z JAZYKY, ne z HTML: přidání jazyka se tak obejde bez
     zásahu do <body>. Do localStorage se zapisuje teprve tady — dokud
     uživatel na přepínač nesáhne, aplikace každý start následuje systém. */
  (function(){
    var sel = $("jazyksel");
    JAZYKY.forEach(function(kod){
      var o = document.createElement("option");
      o.value = kod;
      o.textContent = NAZVY[kod] || kod;
      sel.appendChild(o);
    });
    naJazyk(function(){ sel.value = jazyk; });
    sel.value = jazyk;
    sel.addEventListener("change", function(){ nastavJazyk(sel.value, true); });
  })();

  /* Co se skládá až za běhu, se po přepnutí musí přepsat vlastní funkcí.
     render() si stránku Zápisu kol dotáhne sám, renderP2() obstará statistiky
     i historii včetně filtrů. renderZaloha() se sem záměrně nedostal: zavírá
     rozpracovaný import a mazal by hlášku, což je na přepnutí jazyka příliš.
     Stavové popisky tří přepínačů nahoře se registrují uvnitř svých bloků —
     jejich mark() zvenku vidět není. */
  naJazyk(function(){ syncGoalUI(); render(); });
  naJazyk(function(){ renderP2(); });
  naJazyk(function(){ renderKos(); });
  naJazyk(function(){ renderRezimy(); if(prekresliPravidla) prekresliPravidla(); });
  /* resetMisto() sbalí případně otevřený rozpis a přepočítá „Zabrané místo“ —
     bez toho zůstane text zaseknutý na placeholderu „Zjišťuji…“, protože
     prelozStatiku() ho jen přepíše na (opět nepřeložený) placeholder, ale
     samo se nedopočítá. */
  naJazyk(resetMisto);

  $("toastx").addEventListener("click", schovejToast);
  (function(){
    var btn = $("auto");
    function mark(){
      btn.textContent = t(autoZap ? "spol.zapnuto" : "nast.vypnuto");
      btn.classList.toggle("on", autoZap);
      var label = t(autoZap ? "auto.vypnout" : "auto.zapnout");
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    btn.addEventListener("click", function(){
      autoZap = !autoZap;
      try{ localStorage.setItem(AUKEY, autoZap ? "1" : "0"); }catch(e){}
      mark();
    });
    naJazyk(mark);
    mark();
  })();

  /* ---------- start ---------- */
  /* o trvalost se říká až po prvním doteku, dřív ji prohlížeče odmítají */
  document.addEventListener("pointerdown", function jednou(){
    document.removeEventListener("pointerdown", jednou, true);
    zajistiTrvalost();
  }, true);

  load(function(){
    syncGoalUI(); render(); renderRezimy(); zkontrolujNavod();
    /* renderP2() čte historii, takže musí počkat na úložiště. V režimu ls
       se hotovo() zavolá ještě synchronně, takže se pořadí proti dřívějšku
       nemění. renderArch() se dřív o dokončení nezajímal — tlačítko
       Zápisu kol se tak spočítalo z prázdného HIST a ukazovalo „Zapsat do
       historie“ i u hry, která už uložená byla, dokud ho nepřepočítal
       nějaký jiný render(). */
    pripravUloziste(function(){ renderArch(); renderP2(); renderZaloha2(); });
  });

  /* ---------- offline režim ---------- */
  if("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    });
  }
})();
