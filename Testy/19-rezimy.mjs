import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };
const spi = ms => new Promise(r => setTimeout(r, ms));

function app(opt){
  opt = opt || {};
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true,
    url: "https://x.test/", virtualConsole: vc,
    beforeParse(w){
      w.localStorage.setItem("farkle-jazyk-v1", opt.jazyk || "cs");
      w.localStorage.setItem("farkle-navod-v1", "bez-verze");
      if(opt.rezimy !== undefined) w.localStorage.setItem("farkle-rezimy-v1", JSON.stringify(opt.rezimy));
      if(opt.komb)  w.localStorage.setItem("farkle-kombinace-v1", JSON.stringify(opt.komb));
      if(opt.hry)   w.localStorage.setItem("farkle-hist-v1", JSON.stringify(opt.hry));
      if(opt.stav)  w.localStorage.setItem("farkle-solo-v3", JSON.stringify(opt.stav));
      w.__blob = null;
      w.URL.createObjectURL = b => { w.__blob = b; return "blob:test"; };
      w.URL.revokeObjectURL = () => {};
    } });
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const zmen = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const pis  = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event("input", { bubbles: true })); };
  return { w, d, $, klik, zmen, pis, pravidla: w.__pravidla,
    stav:   () => JSON.parse(w.localStorage.getItem("farkle-solo-v3") || "{}"),
    hist:   () => JSON.parse(w.localStorage.getItem("farkle-hist-v1") || "[]"),
    ulozeno:() => JSON.parse(w.localStorage.getItem("farkle-rezimy-v1") || "null"),
    stare:  () => w.localStorage.getItem("farkle-kombinace-v1"),
    rez:    () => w.__pravidla.aktRezim(),
    /* Seznam režimů se kreslí až s otevřeným oknem nastavení. */
    naSeznam(){ klik($("setbtn")); klik($("setseg").children[1]); },
    radek:  id => d.querySelector('[data-rezim="' + id + '"]'),
    /* v řádku režimu: [0] Pravidla, [1] Upravit, [2] Zvolit */
    tlacitka: id => [...d.querySelector('[data-rezim="' + id + '"]').querySelectorAll(".setbtns button")],
    zvol(id){ this.naSeznam(); klik(this.tlacitka(id)[2]); },
    uprav(id){ this.naSeznam(); klik(this.tlacitka(id)[1]); },
    pravidlaRezimu(id){ this.naSeznam(); klik(this.tlacitka(id)[0]); return $("pravidlatelo").textContent; },
    cipy:   () => [...$("strrow").children].filter(b => !b.hidden).map(b => b.textContent),
    postupky: () => [...d.querySelectorAll("[data-str]")].filter(b => !b.hidden).map(b => b.dataset.str),
    tabulka: () => [...$("pravidlatelo").querySelectorAll("tr")].map(tr => [...tr.children].map(td => td.textContent)),
    staty:  () => [...$("statlist").querySelectorAll(".strow")],
    /* pole v mřížce sazeb: počet kostek (1 = samostatná kostka) a hodnota */
    poleSazby: (pocet, v) =>
      d.querySelector('.trojgrid[data-skupina="' + pocet + '"]').querySelectorAll(".kombsazba")[v - 1],
    /* přepínače: samostatné kostky, celá sekce stejných čísel v základním
       pohledu, jedna podsekce v rozšířeném */
    prepnoutSam(){ klik($("rezsam").querySelector(".setbtns button")); },
    prepnoutStejne(){ klik($("rezstejzap")); },
    prepnoutStej(n){ klik(d.querySelector('[data-stej="' + n + '"] .setbtns button')); },
    rozsirit(){ klik($("rezrozs")); },
    nastavPrah(n){ zmen($("rezprah"), n); },
    /* hodnoty, které jsou v řadě čipů vidět */
    samo:   () => [...d.querySelectorAll("[data-single]")].filter(b => !b.hidden).map(b => b.dataset.single),
    /* čip jednoho počtu v mřížce Stejné hodnoty */
    pocet:  n => d.querySelector('#counts [data-count="' + n + '"]'),
    stitky: () => [...$("fix").querySelectorAll(".ent span")].map(x => x.textContent),
    jednicka(){ klik(d.querySelector('[data-single="1"]')); },
    doStatistik(){ klik($("tab2")); } };
}

/* ---------- vyčerpávající výčet nezávislý na aplikaci ----------
   Strážní test si pravidla odvodí sám ze sondy, ne z konstant v kódu. */
function farkleProcenta(P, rez, kostek){
  const out = [];
  for(let n = 1; n <= kostek; n++){
    const celkem = Math.pow(6, n);
    let farkle = 0;
    for(let i = 0; i < celkem; i++){
      const c = [0,0,0,0,0,0,0];
      let x = i;
      for(let j = 0; j < n; j++){ c[(x % 6) + 1]++; x = Math.floor(x / 6); }
      if(!boduje(P, rez, c)) farkle++;
    }
    out.push(Math.round(farkle / celkem * 1000) / 10);
  }
  return out;
}
function boduje(P, rez, c){
  for(let v = 1; v <= 6; v++){
    if(!c[v]) continue;
    /* Ptát se až do počtu, který padl: nad prahem se extrapoluje a u pevných
       bodů platí i počet, jehož vlastní šestice neexistuje. */
    for(let n = 1; n <= c[v]; n++){ if(P.kindPoints(v, n, rez) > 0) return true; }
  }
  for(const k in P.STRAIGHTS){
    if(!(rez.post[k] > 0)) continue;
    if(P.STRAIGHTS[k].v.every(v => c[v] > 0)) return true;
  }
  for(const k in P.PRESETY){
    if(rez.p[k] === undefined || P.PRESETY[k].d > rez.kostek) continue;
    if(P.PRESETY[k].je(c)) return true;
  }
  return false;
}

console.log("A) tři přednastavené režimy, výchozí KCD2");
{
  const a = app();
  ok(a.rez().id === "kcd2", "výchozí je KCD2: " + a.rez().id);
  ok(a.rez().kostek === 6, "hraje se šesti kostkami: " + a.rez().kostek);
  ok(a.ulozeno() === null, "bez zásahu se do úložiště nic nezapisuje");
  a.naSeznam();
  const ids = [...a.$("rezrows").children].map(r => r.dataset.rezim);
  ok(ids.join(",") === "kcd2,klasika,pet", "seznam drží tři presety v pořadí: " + ids.join(","));
  ok(a.$("reznazev").textContent === "(KCD)", "název zvoleného sedí na přepínači karet: " + a.$("reznazev").textContent);
  ok(a.tlacitka("kcd2")[2].disabled && a.tlacitka("kcd2")[2].textContent === "Zvoleno",
     "zvolený režim má tlačítko zamčené a hlásí stav: " + a.tlacitka("kcd2")[2].textContent);
  ok(!a.tlacitka("klasika")[2].disabled, "ostatní jdou zvolit");
  ok(a.radek("pet").querySelector(".t span").textContent === "5 kostek · 2 postupky",
     "podřádek říká, čím se režim liší: " + a.radek("pet").querySelector(".t span").textContent);
}

console.log("B) přepnutí režimu a jeho přežití reloadu");
{
  const a = app();
  a.zvol("klasika");
  ok(a.rez().id === "klasika", "přepnulo se: " + a.rez().id);
  ok(a.ulozeno().akt === "klasika", "a uložilo: " + JSON.stringify(a.ulozeno()));
  ok(a.$("reznazev").textContent === "(Klasické kostky)", "odznak se přepsal: " + a.$("reznazev").textContent);

  const b = app({ rezimy: a.ulozeno() });
  ok(b.rez().id === "klasika", "po reloadu platí dál: " + b.rez().id);

  /* neznámé id z cizí zálohy spadne na výchozí, ne na null */
  const c = app({ rezimy: { akt: "nesmysl", p: {}, v: [] } });
  ok(c.rez().id === "kcd2", "neznámé id spadne na KCD2: " + c.rez().id);
  const dd = app({ rezimy: "rozbito" });
  ok(dd.rez().id === "kcd2", "nesmysl místo objektu nic neshodí");
}

console.log("C) migrace ze starých kombinací navíc");
{
  const a = app({ komb: { p: { "3p": 500 }, v: [{ id: "v1", b: 1500, v: [1,1,1,5,5] }] } });
  ok(a.rez().id === "kcd2", "hraje se dál podle KCD2");
  ok(a.rez().p["3p"] === 500, "zapnutá kombinace se přestěhovala do režimu: " + JSON.stringify(a.rez().p));
  ok(a.rez().v.length === 1 && a.rez().v[0].b === 1500, "a vlastní vzor taky");
  ok(a.$("strrow").querySelectorAll(".chip-vlastni").length === 1, "čip vzoru je v klávesnici");
  a.zvol("klasika");
  ok(a.stare() !== null, "starý klíč se nemaže, je to záchranná síť");
  ok(a.ulozeno().p.kcd2.p["3p"] === 500, "a v novém klíči leží jako odchylka KCD2: " +
     JSON.stringify(a.ulozeno().p.kcd2.p));
  /* klasika si vede svoje: tři dvojice za 750, ne za 500 */
  ok(a.rez().p["3p"] === 750, "klasika má vlastní sazbu tří dvojic: " + a.rez().p["3p"]);
  ok(a.rez().v.length === 0, "a žádný cizí vlastní vzor: " + a.rez().v.length);
}

console.log("D) u presetu se ukládají jen odchylky");
{
  const a = app();
  a.uprav("kcd2");
  const pole = a.poleSazby(3, 2);
  a.pis(pole, 250);
  ok(a.ulozeno().p.kcd2.stej[3][2] === 250, "změněná trojice se uložila: " + JSON.stringify(a.ulozeno().p.kcd2));
  ok(a.ulozeno().p.kcd2.sam === undefined, "nedotčená pole v úložišti nejsou");
  ok(a.ulozeno().p.klasika === undefined && a.ulozeno().p.pet === undefined,
     "a nedotčené režimy vůbec: " + JSON.stringify(Object.keys(a.ulozeno().p)));

  /* Obnovit výchozí zahodí všechno a záznam režimu z úložiště zmizí */
  const btn = a.$("rezkonecrow").querySelector(".setbtns button");
  ok(btn.textContent === "Obnovit" && !btn.disabled, "u presetu je Obnovit výchozí: " + btn.textContent);
  a.klik(btn);
  ok(a.ulozeno().p.kcd2 === undefined, "po obnovení nezbyla žádná odchylka: " + JSON.stringify(a.ulozeno().p));
  ok(a.rez().stej[3][2] === 200, "a tabulka je zpátky výchozí: " + a.rez().stej[3][2]);
  ok(a.$("rezkonecrow").querySelector(".setbtns button").disabled,
     "nedotčený preset nemá co obnovovat, tlačítko je zašedlé");
}

console.log("E) strážní test: kindPoints proti ručně spočítané tabulce");
{
  const a = app();
  const P = a.pravidla, R = P.PRESET_REZIMY;
  /* KCD2 zdvojnásobuje, klasika násobí trojici */
  const cekej = (rez, v, n) => {
    const zaklad = v === 1 ? 1000 : v * 100;
    if(n === 3) return zaklad;
    if(rez.nad === "x2") return zaklad * Math.pow(2, n - 3);
    return zaklad * (n - 2);
  };
  let sedi = true, kde = "";
  ["kcd2", "klasika", "pet"].forEach(id => {
    for(let v = 1; v <= 6; v++){
      for(let n = 3; n <= 6; n++){
        const m = P.kindPoints(v, n, R[id]);
        if(m !== cekej(R[id], v, n)){ sedi = false; kde = id + " " + n + "×" + v + " = " + m; }
      }
    }
  });
  ok(sedi, "všechny tři presety počítají trojice a výš podle svého pravidla: " + kde);
  ok(P.kindPoints(5, 6, R.kcd2) === 4000 && P.kindPoints(1, 6, R.kcd2) === 8000,
     "šest pětek 4 000 a šest jedniček 8 000 jako dosud");
  ok(P.kindPoints(5, 6, R.klasika) === 2000, "klasika dává za šest pětek 2 000: " + P.kindPoints(5, 6, R.klasika));

  /* pevné body: hodnota kostky přestává hrát roli */
  const pevny = { kostek: 6, stej: { 3: [0,1000,200,300,400,500,600] },
                  nad: "pevne", nadP: [0,0,0,1000,1000,2000,3000] };
  ok(P.kindPoints(2, 4, pevny) === 1000 && P.kindPoints(6, 6, pevny) === 3000,
     "pevné body nezávisí na hodnotě: " + P.kindPoints(2, 4, pevny) + " / " + P.kindPoints(6, 6, pevny));
  ok(P.kindPoints(3, 3, pevny) === 300, "trojice se pevnými body neřídí");
}

console.log("F) pětikostkový režim");
{
  const a = app();
  a.zvol("pet");
  ok(a.stav().rolls[0].thrown === 5, "hází se pěti kostkami: " + a.stav().rolls[0].thrown);
  ok(/5 kostkami/.test(a.$("rollline").textContent), "a popis hodu to říká: " + a.$("rollline").textContent);
  const pocty = [...a.$("counts").children];   /* 1× až 6× */
  ok(pocty[5].hidden && !pocty[4].hidden, "čip 6× se skryje, 5× zůstane");
  ok(pocty[0].hidden && pocty[1].hidden, "1× ani 2× nejsou potřeba: jedničku a pětku nesou čipy, dvojice nebodují");
  ok(a.postupky().join(",") === "15,26", "šestikostková postupka 1–6 v řadě není: " + a.postupky().join(","));

  /* horké kostky se vracejí na pět, ne na šest */
  a.jednicka(); a.jednicka(); a.jednicka(); a.jednicka(); a.jednicka();
  a.klik(a.$("rollon"));
  ok(a.stav().rolls[1].thrown === 5 && a.stav().rolls[1].hot === true,
     "horké kostky hází pěti: " + JSON.stringify(a.stav().rolls[1]));

  /* hra uložená v šestikostkovém režimu se do pětikostkového ořízne */
  const b = app({ rezimy: { akt: "pet", p: {}, v: [] },
                  stav: { mode:"points", goal:4000, banked:0, turns:[],
                          rolls:[{ thrown:6, hot:false, items:[] }] } });
  ok(b.stav().rolls[0].thrown === 5, "uložený hod na šest kostek se ořízl: " + b.stav().rolls[0].thrown);
}

console.log("G) klávesnice se řídí režimem");
{
  const a = app();
  ok(a.postupky().join(",") === "15,26,16", "KCD2 nabízí všechny tři postupky");
  ok(a.$("strcap").textContent === "Postupky", "nadpis řady: " + a.$("strcap").textContent);
  ok([...a.$("strrow").children].pop() === a.$("mtoggle"), "čip vlastní je poslední");

  a.zvol("klasika");
  ok(a.postupky().join(",") === "16", "klasika má jen postupku 1–6: " + a.postupky().join(","));
  ok(a.$("strcap").textContent === "Postupky a kombinace",
     "s kombinací navíc se nadpis změní: " + a.$("strcap").textContent);
  /* fmt() odděluje tisíce úzkou nezlomitelnou mezerou, ne obyčejnou */
  ok(a.d.querySelector('[data-str="16"]').querySelector(".v").textContent === "1 000",
     "a postupka nese sazbu klasiky: " + a.d.querySelector('[data-str="16"]').querySelector(".v").textContent);
  ok([...a.$("strrow").children].pop() === a.$("mtoggle"), "čip vlastní zůstává poslední");

  /* režim úplně bez postupek: řada nezmizí, protože v ní bydlí čip vlastní */
  const b = app({ rezimy: { akt: "kcd2", p: { kcd2: { post: {} } }, v: [] } });
  ok(b.postupky().length === 0, "bez postupek není v řadě žádná");
  ok(b.$("strcap").textContent === "Kombinace", "nadpis se přeloží na Kombinace: " + b.$("strcap").textContent);
  ok(!b.$("strrow").hidden && [...b.$("strrow").children].pop() === b.$("mtoggle"),
     "řada zůstává a čip vlastní v ní taky");

  /* odložení postupky bere body z režimu, ne z konstanty */
  const c = app();
  c.zvol("klasika");
  c.klik(c.d.querySelector('[data-str="16"]'));
  ok(c.stav().rolls[0].items[0].p === 1000, "postupka 1–6 zapsala 1 000: " + c.stav().rolls[0].items[0].p);
  ok(c.stav().rolls[0].items[0].k === "s16", "a kód štítku se nemění");
}

console.log("H) okno pravidel ukazuje pravidla režimu");
{
  const a = app();
  ok(a.$("pravidlarezim").textContent === "KCD", "hlavička nese název: " + a.$("pravidlarezim").textContent);
  const t = a.tabulka();
  ok(t.some(r => r[0] === "Každá jednička" && r[1] === "100"), "jednička je v tabulce");
  ok(t.some(r => r[0] === "Šest stejných" && r[1] === "×8"),
     "KCD2 zdvojnásobuje: " + JSON.stringify(t.filter(r => /stejné/.test(r[0]))));
  ok(t.some(r => r[0] === "Postupka 1–6" && r[1] === "1 500"), "a postupky sedí: " +
     JSON.stringify(t.filter(r => /Postupka/.test(r[0]))));

  /* pravidla jiného režimu jdou otevřít z nastavení, aniž se přepne hra */
  const txt = a.pravidlaRezimu("pet");
  ok(a.$("pravidlarezim").textContent === "Pět kostek", "ukazují se pravidla vybraného režimu");
  ok(/5 kostkami/.test(txt), "text mluví o pěti kostkách");
  ok(!/Šest stejných/.test(txt), "šest stejných se v pětikostkovém režimu nenabízí");
  ok(/okamžitá výhra/.test(txt), "poznámka režimu je pod tabulkou");
  ok(a.rez().id === "kcd2", "a hra zůstala u KCD2: " + a.rez().id);

  /* poznámka klasiky uvádí piggyback jako jinou formu hraní */
  ok(/Piggyback/.test(a.pravidlaRezimu("klasika")), "klasika zmiňuje piggyback");

  /* přepsaná tabulka se v pravidlech projeví */
  const b = app({ rezimy: { akt: "kcd2", p: { kcd2: { troj: [0,1000,250,300,400,500,600] } }, v: [] } });
  const tb = b.tabulka();
  ok(tb.some(r => r[0] === "Tři dvojky" && r[1] === "250"),
     "neúměrná tabulka se vypíše po řádcích: " + JSON.stringify(tb.filter(r => /^Tři/.test(r[0]))));
  ok(!tb.some(r => /trojky \/ /.test(r[0])), "a slitý řádek s rozsahem tam není");
}

console.log("I) přepnout režim jde jen nad prázdnou hrou");
{
  const a = app();
  a.naSeznam();
  ok(a.$("rezzamek").hidden, "nad prázdnou hrou se nic nehlásí");
  a.jednicka();
  a.naSeznam();
  ok(!a.$("rezzamek").hidden && /Novou hrou/.test(a.$("rezzamek").textContent),
     "s odloženou kostkou se zámek ohlásí: " + a.$("rezzamek").textContent);
  ok(a.tlacitka("klasika")[2].disabled, "a tlačítko Zvolit je zamčené");
  a.klik(a.tlacitka("klasika")[2]);
  ok(a.rez().id === "kcd2", "klepnutí nic neudělá: " + a.rez().id);
  ok(!a.tlacitka("klasika")[1].disabled, "upravovat pravidla se ale nezakazuje");

  /* Nová hra zámek pustí */
  a.klik(a.$("tab1"));
  a.klik(a.$("reset")); a.klik(a.$("reset"));
  /* hra není v historii, takže se Nová hra ptá ještě jednou */
  a.klik(a.$("newdrop"));
  a.naSeznam();
  ok(a.$("rezzamek").hidden && !a.tlacitka("klasika")[2].disabled, "po Nové hře jde přepnout zase");
}

console.log("J) vlastní režim");
{
  const a = app();
  a.naSeznam();
  a.klik(a.$("reznovy"));
  ok(!a.$("rezdetail").hidden, "přidání rovnou otevře detail");
  ok(!a.$("reznazevrow").hidden, "vlastní režim má pole pro název");
  const id = a.ulozeno().v[0].id;
  ok(a.ulozeno().v.length === 1, "a uložil se celý: " + JSON.stringify(a.ulozeno().v[0]).slice(0, 60));
  a.pis(a.$("reznazevpole"), "Naše pravidla");
  ok(a.ulozeno().v[0].nazev === "Naše pravidla", "název se uložil");
  ok(a.$("reztitul").textContent === "Naše pravidla", "a přepsal se v hlavičce detailu");

  /* počet kostek, sazby i pravidlo pro čtyři a víc */
  a.zmen(a.$("rezkostek"), 5);
  ok(a.ulozeno().v[0].kostek === 5, "počet kostek se uložil: " + a.ulozeno().v[0].kostek);
  a.zmen(a.$("reznad"), "pevne");
  /* Kolik polí, tolik počtů nad prahem se do režimu vejde: práh na trojici
     a pět kostek dá čtyřku a pětku, na šesti kostkách by přibyla šestka. */
  ok(!a.$("reznadp").hidden && a.$("reznadp").children.length === 2,
     "pevné body odkryjí pole pro počty nad prahem: " + a.$("reznadp").children.length);
  a.zmen(a.$("rezkostek"), 6);
  ok(a.$("reznadp").children.length === 3, "na šesti kostkách jsou tři: " + a.$("reznadp").children.length);
  a.zmen(a.$("rezkostek"), 5);
  a.pis(a.poleSazby(1, 1), 0);
  ok(a.ulozeno().v[0].sam[1] === 0, "jednička se dá vypnout nulou: " + JSON.stringify(a.ulozeno().v[0].sam));

  /* zvolený režim smazat nejde */
  a.zvol(id);
  ok(a.rez().id === id, "vlastní režim jde zvolit");
  a.uprav(id);
  ok(/Zvolený režim smazat nejde/.test(a.$("rezkonecrow").textContent),
     "a pak ho nejde smazat: " + a.$("rezkonecrow").textContent);
  a.zvol("kcd2");
  a.uprav(id);
  const sm = a.$("rezkonecrow").querySelector(".setbtns button");
  ok(sm && sm.textContent === "Smazat", "po přepnutí zpět je Smazat k dispozici");
  a.klik(sm);
  ok(!a.$("rezlist").hidden && /Opravdu smazat režim/.test(a.radek(id).textContent),
     "mazání se ptá v seznamu: " + a.radek(id).textContent);
  a.klik(a.tlacitka(id)[0]);
  ok(a.ulozeno().v.length === 0 && !a.radek(id), "druhé klepnutí režim odstraní");
}

console.log("J2) strop dvaceti vlastních režimů");
{
  const vlastni = [];
  for(let i = 0; i < 21; i++) vlastni.push({ id: "r" + i, nazev: "R" + i, kostek: 6 });
  const a = app({ rezimy: { akt: "kcd2", p: {}, v: vlastni } });
  a.naSeznam();
  ok(a.$("rezrows").children.length === 23, "z jednadvaceti se načte dvacet: " + a.$("rezrows").children.length);
  ok(a.$("reznovy").disabled, "tlačítko Přidat je na stropu zamčené");
  ok(!a.$("rezstrop").hidden && /20/.test(a.$("rezstrop").textContent),
     "a strop se hlásí předem: " + a.$("rezstrop").textContent);
}

console.log("K) historie si nese režim");
{
  const a = app();
  a.zvol("klasika");
  a.klik(a.d.querySelector('[data-str="16"]'));
  a.klik(a.$("bank"));
  a.klik(a.$("arch"));
  ok(a.hist()[0].rezim === "klasika", "záznam veze id režimu: " + a.hist()[0].rezim);
  ok(a.hist()[0].rezimN === undefined || a.hist()[0].rezimN === null,
     "u presetu se název neukládá, přeloží se z id");
  a.klik(a.$("tab2")); a.klik(a.$("seg").children[1]);
  ok(/Klasické kostky/.test(a.$("histlist").textContent), "a seznam historie ho ukazuje");

  /* vlastní režim veze i svůj název, aby se dal přečíst po smazání */
  const b = app({ rezimy: { akt: "r1", p: {}, v: [{ id: "r1", nazev: "Naše pravidla", kostek: 6 }] } });
  b.jednicka(); b.klik(b.$("bank")); b.klik(b.$("arch"));
  ok(b.hist()[0].rezim === "r1" && b.hist()[0].rezimN === "Naše pravidla",
     "vlastní režim veze id i název: " + JSON.stringify(b.hist()[0].rezim) + " " + JSON.stringify(b.hist()[0].rezimN));
  const c = app({ rezimy: { akt: "kcd2", p: {}, v: [] }, hry: b.hist() });
  c.klik(c.$("tab2")); c.klik(c.$("seg").children[1]);
  ok(/Naše pravidla/.test(c.$("histlist").textContent),
     "a po smazání režimu zůstane hra čitelná: " + c.$("histlist").textContent.slice(0, 80));

  /* záznam z doby před režimy se čte jako KCD2 */
  const d = app({ hry: [{ id:"h1", savedAt: Date.now(), mode:"points", goal:4000, banked:300,
                          turns:[{ p:300, bust:false, c:"j,j,j" }] }] });
  d.klik(d.$("tab2")); d.klik(d.$("seg").children[1]);
  ok(/KCD/.test(d.$("histlist").textContent), "starý záznam se hlásí ke KCD: " +
     d.$("histlist").textContent.slice(0, 60));
}

console.log("L) záloha unese režim oběma směry");
{
  const a = app({ rezimy: { akt: "r1", p: {}, v: [{ id: "r1", nazev: "Naše pravidla", kostek: 6 }] } });
  a.jednicka(); a.klik(a.$("bank")); a.klik(a.$("arch"));
  a.klik(a.$("setbtn"));
  a.klik(a.$("seczal").querySelector("summary"));
  await spi(10);
  a.klik(a.$("expbtn"));
  await spi(40);
  const text = await a.w.__blob.text();
  ok(/Naše pravidla/.test(text), "název režimu je v čitelné části");
  ok(/"rezim":"r1"/.test(text) && /"rezimN":"Naše pravidla"/.test(text),
     "a obě pole v datovém řádku");

  const b = app();
  const f = new b.w.File([text], "zaloha.txt", { type: "text/plain" });
  Object.defineProperty(b.$("impfile"), "files", { value: [f], configurable: true });
  b.$("impfile").dispatchEvent(new b.w.Event("change"));
  await spi(60);
  b.klik(b.$("impadd"));
  await spi(40);
  ok(b.hist().length === 1 && b.hist()[0].rezim === "r1" && b.hist()[0].rezimN === "Naše pravidla",
     "import obojí zachoval: " + JSON.stringify(b.hist()[0] && { r: b.hist()[0].rezim, n: b.hist()[0].rezimN }));
  b.klik(b.$("tab2")); b.klik(b.$("seg").children[1]);
  ok(/Naše pravidla/.test(b.$("histlist").textContent),
     "a na cizím telefonu se hra přečte: " + b.$("histlist").textContent.slice(0, 80));
}

console.log("M) statistika Nejhranější režim");
{
  const kolo = { p: 300, bust: false, c: "j,j,j" };
  const hry = [
    { id:"h1", savedAt: 1000, mode:"points", goal:4000, banked:300, rezim:"klasika", turns:[kolo] },
    { id:"h2", savedAt: 2000, mode:"points", goal:4000, banked:300, rezim:"klasika", turns:[kolo] },
    { id:"h3", savedAt: 3000, mode:"points", goal:4000, banked:300, rezim:"pet",     turns:[kolo] },
    { id:"h4", savedAt: 4000, mode:"points", goal:4000, banked:300,                  turns:[kolo] }
  ];
  const a = app({ hry: hry });
  a.doStatistik();
  const radky = a.staty();
  ok(radky.length === 21, "jednadvacet statistik: " + radky.length);
  const posledni = radky[radky.length - 1];
  ok(posledni.querySelector(".sn").textContent.indexOf("Nejhranější režim") === 0,
     "a poslední je nejhranější režim: " + posledni.querySelector(".sn").textContent);
  ok(posledni.querySelector(".sv").textContent === "Klasické kostky",
     "hodnotou je název, ne číslo: " + posledni.querySelector(".sv").textContent);
  ok(/2 hry/.test(posledni.querySelector(".sd").textContent),
     "podřádek nese počet her: " + posledni.querySelector(".sd").textContent);

  a.klik(posledni);
  const zeb = [...a.$("detbody").querySelectorAll("tr")].map(tr => [...tr.children].map(td => td.textContent));
  ok(zeb.length === 3, "žebříček má tři režimy: " + JSON.stringify(zeb));
  ok(zeb[0][1] === "Klasické kostky" && zeb[0][2] === "2", "od nejhranějšího: " + JSON.stringify(zeb[0]));
  ok(zeb[1][2] === "1" && zeb[2][2] === "1", "pak po jedné");
  ok(zeb.some(r => r[1] === "KCD"), "hra bez pole rezim se počítá ke KCD: " + JSON.stringify(zeb));
  ok([...a.$("detbody").querySelectorAll("tr.klik")].length === 0,
     "řádky se neproklikávají, filtr podle režimu není");
}

console.log("N) strážní test: riziko farklu odvozené výčtem");
{
  const a = app();
  const P = a.pravidla, R = P.PRESET_REZIMY;
  const kcd2 = Object.assign({}, R.kcd2, { p: {} });
  ok(farkleProcenta(P, kcd2, 6).join(",") === P.RIZIKO.join(","),
     "RIZIKO sedí na výčet: " + farkleProcenta(P, kcd2, 6).join(","));
  const s3p = Object.assign({}, R.kcd2, { p: { "3p": 500 } });
  ok(farkleProcenta(P, s3p, 6).join(",") === P.RIZIKO_3P.join(","),
     "RIZIKO_3P taky: " + farkleProcenta(P, s3p, 6).join(","));
  /* klasika má tři dvojice zapnuté, takže platí druhá tabulka */
  ok(farkleProcenta(P, R.klasika, 6).join(",") === P.RIZIKO_3P.join(","),
     "klasika padá na tabulku se třemi dvojicemi: " + farkleProcenta(P, R.klasika, 6).join(","));
  /* počet kostek režimu tabulku nemění — riziko se ptá na hod, ne na hru */
  ok(farkleProcenta(P, R.pet, 5).join(",") === P.RIZIKO.slice(0, 5).join(","),
     "pětikostkový režim bere prvních pět hodnot: " + farkleProcenta(P, R.pet, 5).join(","));
}

console.log("N2) upravená pravidla se přepočítají výčtem");
{
  /* Režim bez jedniček a pětek nemá s konstantami nic společného; tabulka se
     musí spočítat líně a teprve pak se ukázat na tlačítku. */
  const a = app({ rezimy: { akt: "kcd2", p: { kcd2: { sam: [0,0,0,0,0,0,0] } }, v: [] } });
  const P = a.pravidla;
  ok(P.tabulka().join(",") === P.RIZIKO.join(","), "než výčet doběhne, platí konstanty jako odhad");
  await spi(60);
  const cekane = farkleProcenta(P, a.rez(), 6);
  ok(P.tabulka().join(",") === cekane.join(","),
     "po přepočtu sedí výčet: " + P.tabulka().join(",") + " vs " + cekane.join(","));
  ok(P.tabulka()[0] > 90, "bez jedniček a pětek je riziko na jedné kostce vysoké: " + P.tabulka()[0]);
}

console.log("O) samostatné kostky a stejná čísla v nastavení");
{
  const a = app();
  a.uprav("kcd2");
  ok(a.poleSazby(1, 1).value === "100" && a.poleSazby(1, 2).value === "0",
     "samostatná jednička 100, dvojka 0: " + a.poleSazby(1, 2).value);
  ok(a.poleSazby(3, 1).value === "1000", "trojice jedniček 1 000");
  ok(a.$("rezprah").value === "3", "práh stojí na trojici: " + a.$("rezprah").value);
  ok(!a.d.querySelector('.trojgrid[data-skupina="2"]'),
     "základní pohled ukazuje jedinou mřížku, ne pět");

  /* jednotlivá hodnota se vypne nulou */
  a.pis(a.poleSazby(1, 1), 0);
  ok(a.rez().sam[1] === 0 && a.rez().sam[5] === 50, "nula vypne jen tu jednu hodnotu");

  /* celá šestice přepínačem, a zpátky i s původními čísly */
  a.prepnoutSam();
  ok(a.rez().sam.join(",") === "0,0,0,0,0,0,0", "vypnutí vynuluje celou šestici: " + a.rez().sam.join(","));
  ok(!a.d.querySelector('.trojgrid[data-skupina="1"]'), "a pole zmizí");
  a.prepnoutSam();
  ok(a.rez().sam[5] === 50 && a.rez().sam[1] === 0,
     "zapnutí vrátí, co tam bylo, i s vypnutou jedničkou: " + a.rez().sam.join(","));

  /* práh stěhuje šestici sazeb, nevzniká druhá tabulka vedle první */
  a.nastavPrah(4);
  ok(a.rez().stej[3] === undefined && a.rez().stej[4] && a.rez().stej[4][2] === 200,
     "posun prahu vezme sazby s sebou: " + JSON.stringify(a.rez().stej));
  ok(a.poleSazby(4, 2).value === "200", "a mřížka je pod novým počtem");
  ok(a.pravidla.kindPoints(2, 3, a.rez()) === 0 && a.pravidla.kindPoints(2, 4, a.rez()) === 200,
     "pod prahem se neboduje, na prahu ano");

  /* vypnutí celé sekce a zpátky */
  a.prepnoutStejne();
  ok(Object.keys(a.rez().stej).length === 0, "vypnutí sekce sebere všechny počty");
  ok(a.$("rezprah").disabled, "a nabídka prahu ztuhne");
  a.prepnoutStejne();
  ok(a.rez().stej[4] && a.rez().stej[4][2] === 200,
     "zapnutí vrátí práh i sazby: " + JSON.stringify(a.rez().stej));
}

console.log("O2) rozšířený rozpad na dvojice až šestice");
{
  const a = app();
  a.uprav("kcd2");
  ok(!a.$("rezprahrow").hidden, "základní pohled má práh");
  a.rozsirit();
  ok(a.$("rezprahrow").hidden, "rozšířený místo něj rozdělí sekci na podsekce");
  ok(a.d.querySelectorAll("[data-stej]").length === 5,
     "pět podsekcí, dvojice až šestice: " + a.d.querySelectorAll("[data-stej]").length);
  ok(a.ulozeno().p.kcd2.rozs === true, "volba se uložila");

  /* čtveřice se zapnou a dostanou čísla, se kterými jde pracovat */
  a.prepnoutStej(4);
  ok(a.rez().stej[4] && a.rez().stej[4][5] > 0,
     "zapnutá čtveřice není samá nula: " + JSON.stringify(a.rez().stej[4]));
  ok(a.pravidla.kindPoints(5, 4, a.rez()) === a.rez().stej[4][5],
     "a bodování ji bere z její vlastní šestice");

  /* pravidlo nad skupinou sedí u nejvyšší zapnuté */
  ok(a.d.querySelector('[data-stej="4"]').contains(a.$("reznadwrap")) && !a.$("reznadwrap").hidden,
     "řádek o vyšších počtech visí u čtveřic");
  ok(a.$("reznadtit").textContent === "Pět a víc stejných",
     "a mluví o pěti a víc: " + a.$("reznadtit").textContent);
  a.prepnoutStej(6);
  ok(a.$("reznadwrap").hidden,
     "se zapnutou šesticí není nad čím extrapolovat a řádek mizí");

  /* návrat do základního nechá nejnižší počet a zbytek odloží do paměti */
  a.prepnoutStej(6);
  a.rozsirit();
  ok(Object.keys(a.rez().stej).join(",") === "3",
     "v základním pohledu zůstane jediný práh: " + Object.keys(a.rez().stej).join(","));
  ok(a.$("rezprah").value === "3", "a nabídka ho ukazuje");
  a.rozsirit();
  ok(a.rez().stej[4] && a.rez().stej[4][5] > 0,
     "zpátky v rozšířeném se čtveřice vrátí i se sazbami: " + JSON.stringify(a.rez().stej[4]));
}

console.log("O3) stará pole dvoj a troj se čtou dál");
{
  /* Režim uložený verzí před sloučením nesl dvě pevná pole. Nedotčené pole
     v odchylkách presetu nestálo, takže se nesmí vzít jako vypnuté. */
  const a = app({ rezimy: { akt: "kcd2", p: { kcd2: { dvoj: [0,0,0,0,0,0,100] } }, v: [] } });
  ok(a.rez().stej[2] && a.rez().stej[2][6] === 100, "dvojice se přečetly: " + JSON.stringify(a.rez().stej[2]));
  ok(a.rez().stej[3] && a.rez().stej[3][2] === 200, "a trojice zůstaly výchozí");
  ok(a.rez().rozs === true, "dva zapnuté počty vynutí rozšířený pohled");
  const b = app({ rezimy: { akt: "kcd2", p: { kcd2: { troj: [0,0,0,0,0,0,0] } }, v: [] } });
  ok(Object.keys(b.rez().stej).length === 0,
     "výslovná šestice nul ale vypne: " + JSON.stringify(b.rez().stej));
}

console.log("P) řada samostatných hodnot: tři čipy, pak mřížka");
{
  /* výchozí KCD: jednička a pětka na čipech, 1× v počtech není potřeba */
  const a = app();
  ok(!a.$("singlerow").hidden && !a.$("singlecap").hidden, "řada čipů je vidět");
  ok(a.samo().join(",") === "1,5", "a jsou v ní jednička a pětka: " + a.samo().join(","));
  ok(a.pocet(1).hidden, "1× v počtech není potřeba");

  /* tři bodující hodnoty se do řady ještě vejdou */
  const b = app({ rezimy: { akt: "kcd2", p: { kcd2: { sam: [0,100,0,30,0,50,0] } }, v: [] } });
  ok(!b.$("singlerow").hidden && b.samo().join(",") === "1,3,5",
     "tři čipy zůstávají v řadě: " + b.samo().join(","));
  ok(b.pocet(1).hidden, "a 1× pořád není potřeba");

  /* čtvrtá už ne — řada mizí i s nadpisem a nastupuje 1× */
  const c = app({ rezimy: { akt: "kcd2", p: { kcd2: { sam: [0,100,20,30,0,50,0] } }, v: [] } });
  ok(c.$("singlerow").hidden && c.$("singlecap").hidden,
     "při čtyřech hodnotách řada mizí i s nadpisem");
  ok(!c.pocet(1).hidden, "a 1× se objeví v počtech");

  /* žádná samostatná hodnota: řada pryč a 1× taky, není co odkládat */
  const dd = app({ rezimy: { akt: "kcd2", p: { kcd2: { sam: [0,0,0,0,0,0,0] } }, v: [] } });
  ok(dd.$("singlerow").hidden && dd.pocet(1).hidden, "bez samostatných hodnot není ani řada, ani 1×");
}

console.log("P2) 2× v počtech se řídí dvojicemi");
{
  const a = app();
  ok(a.pocet(2).hidden, "bez dvojic 2× není");
  const b = app({ rezimy: { akt: "kcd2", p: { kcd2: { dvoj: [0,0,0,0,0,0,100] } }, v: [] } });
  ok(!b.pocet(2).hidden, "s dvojicí šestek se 2× objeví");
  ok(b.pravidla.kindPoints(6, 2, b.rez()) === 100 && b.pravidla.kindPoints(5, 2, b.rez()) === 0,
     "a boduje jen ta jedna hodnota");

  /* Bez jediné zapnuté skupiny nemá extrapolace od čeho počítat, takže
     nezbude ani 3×, ani vyšší počty — pevné body dávají smysl teprve nad
     nějakým prahem. */
  const c = app({ rezimy: { akt: "kcd2", p: { kcd2: { troj: [0,0,0,0,0,0,0], nad: "pevne" } }, v: [] } });
  ok(c.pocet(3).hidden && c.pocet(4).hidden, "bez zapnuté skupiny nezbude žádný počet");

  /* s dvojicemi jako prahem platí pevné body od trojice výš */
  const dd = app({ rezimy: { akt: "kcd2",
    p: { kcd2: { stej: { 2: [0,0,0,0,0,0,100] }, nad: "pevne" } }, v: [] } });
  ok(!dd.pocet(2).hidden && !dd.pocet(3).hidden && !dd.pocet(6).hidden,
     "dvojice jako práh a pevné body nad ní drží počty až do šesti");
}

console.log("Q) kódy samostatných hodnot a dvojic");
{
  const a = app({ rezimy: { akt: "kcd2", p: { kcd2: { sam: [0,100,0,30,0,50,0], dvoj: [0,0,0,0,0,0,100] } }, v: [] } });
  /* trojka odložená čipem */
  a.klik(a.d.querySelector('[data-single="3"]'));
  ok(a.stav().rolls[0].items[0].k === "d3", "čip trojky ukládá kód d3: " + a.stav().rolls[0].items[0].k);
  ok(a.stitky()[0] === "trojka", "a čte se jako trojka: " + a.stitky()[0]);

  /* dvojice šestek přes mřížku */
  a.klik(a.pocet(2));
  a.klik(a.$("pips").children[5]);
  a.klik(a.$("addkind"));
  const it = a.stav().rolls[0].items[1];
  ok(it.k === "n26" && it.p === 100, "dvojice šestek je n26 za 100: " + JSON.stringify(it));
  ok(a.stitky()[1] === "2× 6", "a čte se jako 2× 6: " + a.stitky()[1]);

  /* táž hodnota přes 1× v mřížce dá týž kód jako čip */
  const b = app({ rezimy: { akt: "kcd2", p: { kcd2: { sam: [0,100,20,30,40,50,0] } }, v: [] } });
  ok(b.$("singlerow").hidden, "čtyři a víc hodnot: zadává se mřížkou");
  b.klik(b.pocet(1));
  b.klik(b.$("pips").children[2]);
  b.klik(b.$("addkind"));
  ok(b.stav().rolls[0].items[0].k === "d3", "1× 3 dá týž kód d3: " + b.stav().rolls[0].items[0].k);

  /* zapsané kolo veze kódy do historie a přečte se i po přepnutí jazyka */
  a.klik(a.$("bank"));
  ok(a.stav().turns[0].c === "d3,n26", "kolo veze oba kódy: " + a.stav().turns[0].c);
}

console.log("R) duplikace režimu");
{
  const a = app();
  a.uprav("klasika");
  a.klik(a.$("rezduplrow").querySelector(".setbtns button"));
  ok(a.ulozeno().v.length === 1, "kopie je vlastní režim: " + JSON.stringify(a.ulozeno().v.length));
  const kopie = a.ulozeno().v[0];
  ok(kopie.nazev === "Klasické kostky (kopie)", "název říká, odkud je: " + kopie.nazev);
  ok(kopie.id !== "klasika" && kopie.p["3p"] === 750, "má nové id a pravidla originálu");
  ok(!a.$("rezdetail").hidden && a.$("reztitul").textContent === kopie.nazev,
     "a rovnou se otevře její detail");
  a.naSeznam();
  ok(a.radek("klasika") && a.radek(kopie.id), "originál v seznamu zůstal vedle kopie");

  /* úprava kopie se originálu nedotkne */
  a.uprav(kopie.id);
  a.pis(a.poleSazby(3, 1), 500);
  ok(a.ulozeno().v[0].stej[3][1] === 500 && a.ulozeno().p.klasika === undefined,
     "originál zůstal nedotčený: " + JSON.stringify(a.ulozeno().p));

  /* vlastní vzory dostanou v kopii nová id */
  const b = app({ rezimy: { akt: "kcd2", p: { kcd2: { v: [{ id: "vz1", b: 1500, v: [1,1,1,5,5], z: true }] } }, v: [] } });
  b.uprav("kcd2");
  b.klik(b.$("rezduplrow").querySelector(".setbtns button"));
  ok(b.ulozeno().v[0].v.length === 1 && b.ulozeno().v[0].v[0].id !== "vz1",
     "vzor v kopii má nové id: " + JSON.stringify(b.ulozeno().v[0].v[0].id));
}

console.log("S) křížek v pravidlech vrací do nastavení");
{
  const a = app();
  a.naSeznam();
  a.klik(a.tlacitka("pet")[0]);
  ok(!a.$("rulesmodal").hidden && a.$("setmodal").hidden, "pravidla se otevřela místo nastavení");
  a.klik(a.$("rulesmodal").querySelector(".modalx"));
  ok(a.$("rulesmodal").hidden && !a.$("setmodal").hidden, "křížek vrátil nastavení");
  ok(!a.$("setcardrezimy").hidden, "a rovnou na kartu Herní režimy");

  /* pravidla otevřená tlačítkem i se prostě zavřou */
  const b = app();
  b.klik(b.$("infobtn"));
  b.klik(b.$("rulesmodal").querySelector(".modalx"));
  ok(b.$("rulesmodal").hidden && b.$("setmodal").hidden, "z lišty se okno jen zavře");

  /* návrat do rozdělaného detailu režimu */
  const c = app();
  c.uprav("pet");
  c.naSeznam();
  c.klik(c.tlacitka("pet")[0]);
  c.klik(c.$("rulesmodal").querySelector(".modalx"));
  ok(!c.$("setmodal").hidden && !c.$("rezlist").hidden, "vrací se tam, odkud se odešlo");
}

console.log("T) riziko na tlačítku Farkle");
{
  const a = app();
  ok(/3,1/.test(a.$("bustriz").textContent),
     "nad prázdným hodem je riziko na šesti kostkách: " + a.$("bustriz").textContent);
  a.jednicka();
  ok(/7,7/.test(a.$("bustriz").textContent),
     "po odložení kostky se přepočítá na pět: " + a.$("bustriz").textContent);
  ok(a.$("bust").firstChild.textContent === "Farkle",
     "popisek tlačítka zůstal svůj: " + a.$("bust").firstChild.textContent);

  /* Pětikostkový režim začíná na pátém sloupci téže tabulky. */
  const b = app();
  b.zvol("pet");
  ok(/7,7/.test(b.$("bustriz").textContent),
     "v pětikostkovém režimu se hází pěti: " + b.$("bustriz").textContent);
}

console.log("T2) pás rizika na spodní hraně detailu režimu");
{
  const a = app();
  a.uprav("kcd2");
  const pruh = a.$("rezriziko");
  ok(!pruh.hidden && /Riziko farklu/.test(pruh.textContent), "pás je vidět: " + pruh.textContent);
  ok(/1: 66,7 %/.test(pruh.textContent) && /6: 3,1 %/.test(pruh.textContent),
     "a nese celou křivku od jedné kostky po šest: " + pruh.textContent);
  /* Dvojtečka je tam proto, aby se „1 66,7 %“ nečetlo jako 166,7 %. */
  ok(!/d d/.test(pruh.textContent), "počet kostek se neslepí s procenty: " + pruh.textContent);

  /* Pás je patička okna, ne prvek karty — schovat se musí sám. */
  a.naSeznam();
  ok(pruh.hidden, "nad seznamem režimů pás mizí");
  a.uprav("kcd2");
  ok(!pruh.hidden, "a s detailem se vrátí");
  a.klik(a.$("setseg").children[0]);
  ok(pruh.hidden, "na kartě Obecné taky mizí");
  a.klik(a.$("setseg").children[1]);
  ok(!pruh.hidden, "a zpátky na kartě režimů je zase vidět");

  /* Kolik položek, tolik kostek režimu. */
  const b = app();
  b.uprav("pet");
  ok(b.$("rezriziko").textContent.split("·").length === 5,
     "pětikostkový režim má pět položek: " + b.$("rezriziko").textContent);

  /* Přepsaná tabulka pošle riziko na výčet; dokud neproběhne, pás to říká
     rovnou — konstanta by tam byla lež, ne odhad blízko pravdy. */
  const c = app();
  c.uprav("kcd2");
  c.prepnoutStejne();
  ok(/počítá se/.test(c.$("rezriziko").textContent),
     "bez trojic se čeká na dopočet: " + c.$("rezriziko").textContent);
  await spi(300);
  /* Bez trojic boduje jen jednička a pětka (postupky obě obsahují), takže
     farkle na šesti kostkách je (4/6)^6 = 8,8 % místo 3,1 %. */
  ok(/6: 8,8 %/.test(c.$("rezriziko").textContent),
     "po dopočtu je riziko na šesti kostkách o dost výš: " + c.$("rezriziko").textContent);
}

console.log("T3) tlačítka v seznamu režimů mají jednu šířku");
{
  /* Ptát se na přítomnost třídy nestačí: první pokus ji přidal, ale pravidlo
     `.rezbtn` prohrávalo v kaskádě s `.setrow .ghost{flex:0 0 auto}` a šířka
     se neuplatnila. Kontrola proto sahá na výsledek. */
  const a = app();
  a.naSeznam();
  const sirka = b => a.w.getComputedStyle(b).flexBasis;
  ok(sirka(a.tlacitka("kcd2")[0]) === "56px",
     "Pravidla mají pevnou šířku: " + sirka(a.tlacitka("kcd2")[0]));
  ok(a.tlacitka("kcd2").every(b => sirka(b) === "56px") &&
     a.tlacitka("pet").every(b => sirka(b) === "56px"),
     "a všechna tři tlačítka na každém řádku taky");
  ok(sirka(a.$("reznovy")) === "56px", "Přidat je stejně široké: " + sirka(a.$("reznovy")));
  /* Text se mění (Zvolit / Zvoleno), šířka ne — o to tu jde. */
  a.zvol("klasika");
  a.naSeznam();
  const zvoleno = a.tlacitka("klasika")[2];
  ok(zvoleno.textContent === "Zvoleno" && sirka(zvoleno) === "56px",
     "i po přepnutí na Zvoleno: " + zvoleno.textContent + " / " + sirka(zvoleno));
}

console.log("U) nápověda u čtyř a víc stejných");
{
  const a = app();
  a.uprav("kcd2");
  ok(a.$("reznadnapoveda").hidden, "nápověda je ve výchozím stavu schovaná");
  a.klik(a.$("reznadinfo"));
  ok(!a.$("reznadnapoveda").hidden && /zdvojnásobí/i.test(a.$("reznadnapoveda").textContent),
     "tlačítko i ji odkryje: " + a.$("reznadnapoveda").textContent.slice(0, 50));
  a.klik(a.$("reznadinfo"));
  ok(a.$("reznadnapoveda").hidden, "a druhé klepnutí ji zase schová");
  /* přepnutí režimu ji zavře, ať nevisí nad jiným pravidlem */
  a.klik(a.$("reznadinfo"));
  a.klik(a.$("rezback"));
  a.klik(a.tlacitka("pet")[1]);
  ok(a.$("reznadnapoveda").hidden, "přechod na jiný režim ji zavře");
}

console.log("V) strážní test: kindPoints čte svoji šestici a nad prahem extrapoluje");
{
  const a = app();
  const P = a.pravidla;
  const rez = { kostek: 6, sam: [0,100,20,30,40,50,60],
                stej: { 2: [0,0,0,0,0,0,111], 3: [0,1000,200,300,400,500,600] },
                nad: "x2", nadP: [0,0,0,1000,1000,2000,3000] };
  let sedi = true, kde = "";
  for(let v = 1; v <= 6; v++){
    if(P.kindPoints(v, 1, rez) !== rez.sam[v]){ sedi = false; kde = "1×" + v; }
    if(P.kindPoints(v, 2, rez) !== rez.stej[2][v]){ sedi = false; kde = "2×" + v; }
    if(P.kindPoints(v, 3, rez) !== rez.stej[3][v]){ sedi = false; kde = "3×" + v; }
  }
  ok(sedi, "každý zapnutý počet čte svoji šestici: " + kde);
  ok(P.kindPoints(5, 4, rez) === 1000, "nad nejvyšší skupinou se zdvojnásobuje: " + P.kindPoints(5, 4, rez));

  /* mezera v tabulce neboduje: práh na dvojici, trojice vypnuté */
  const mezera = { kostek: 6, sam: [0,0,0,0,0,0,0],
                   stej: { 2: [0,0,0,0,0,0,111], 4: [0,0,0,0,0,0,400] },
                   nad: "x2", nadP: [0,0,0,1000,1000,2000,3000] };
  ok(P.kindPoints(6, 3, mezera) === 0, "trojice mezi dvěma zapnutými počty neboduje");
  ok(P.kindPoints(6, 4, mezera) === 400, "čtveřice má svoji sazbu");
  ok(P.kindPoints(6, 5, mezera) === 800, "a pátá kostka ji zdvojnásobí");

  /* bez jediné zapnuté skupiny nemá extrapolace od čeho počítat */
  const bez = { kostek: 6, sam: [0,0,0,0,0,0,0], stej: {},
                nad: "x2", nadP: [0,0,0,1000,1000,2000,3000] };
  ok(P.kindPoints(5, 4, bez) === 0 && P.kindPoints(5, 6, bez) === 0,
     "prázdná tabulka nedá nic: " + P.kindPoints(5, 4, bez));
  bez.nad = "pevne";
  ok(P.kindPoints(5, 4, bez) === 0, "ani s pevnými body: není nad čím");

  /* pevné body platí i tam, kde sama skupina neboduje */
  const pevne = { kostek: 6, sam: [0,0,0,0,0,0,0], stej: { 3: [0,0,0,0,0,0,0] },
                  nad: "pevne", nadP: [0,0,0,1000,1000,2000,3000] };
  ok(P.kindPoints(5, 3, pevne) === 0 && P.kindPoints(5, 4, pevne) === 1000 &&
     P.kindPoints(2, 6, pevne) === 3000,
     "vypnutá trojice, ale čtyři a víc platí: " + P.kindPoints(5, 4, pevne));
}

console.log("V2) riziko se přepočítá, jakmile boduje dvojice");
{
  const a = app({ rezimy: { akt: "kcd2", p: { kcd2: { dvoj: [0,0,0,0,0,0,100] } }, v: [] } });
  const P = a.pravidla;
  ok(P.tabulka().join(",") === P.RIZIKO.join(","), "než výčet doběhne, platí konstanty");
  await spi(60);
  const cekane = farkleProcenta(P, a.rez(), 6);
  ok(P.tabulka().join(",") === cekane.join(","),
     "po přepočtu sedí výčet: " + P.tabulka().join(",") + " vs " + cekane.join(","));
  ok(P.tabulka()[1] < P.RIZIKO[1], "dvojice šestek riziko na dvou kostkách sníží: " +
     P.tabulka()[1] + " proti " + P.RIZIKO[1]);
}

console.log(fails ? "\n" + fails + " CHYB" : "\nvše prošlo");
process.exit(fails ? 1 : 0);
