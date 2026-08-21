import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

/* Jediná sada, která se na češtinu záměrně nepřišpendluje — testuje se tu
   právě to, co ostatní sady vypínají. Systémový jazyk se podstrkuje přes
   navigator; jsdom sám hlásí "en-US". */
function app(opt){
  opt = opt || {};
  const vc = new VirtualConsole();          // jsdom křičí na navigaci u blob odkazu
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/",
    virtualConsole: vc,
    beforeParse(w){
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      if(opt.ulozeny !== undefined){
        try { w.localStorage.setItem("farkle-jazyk-v1", opt.ulozeny); } catch(e){}
      }
      if("seznam" in opt){
        Object.defineProperty(w.navigator, "languages", { value: opt.seznam, configurable: true });
      }
      if("jeden" in opt){
        Object.defineProperty(w.navigator, "language", { value: opt.jeden, configurable: true });
      }
      if(opt.bezLS){
        Object.defineProperty(w, "localStorage", {
          get(){ throw new Error("localStorage zakázán"); }, configurable: true });
      }
      if(opt.hry){
        try { w.localStorage.setItem("farkle-hist-v1", JSON.stringify(opt.hry)); } catch(e){}
      }
      w.__blob = null;
      w.URL.createObjectURL = b => { w.__blob = b; return "blob:test"; };
      w.URL.revokeObjectURL = () => {};
    } });
  const w = dom.window, d = w.document;
  const $ = id => d.getElementById(id);
  return { w, d, i18n: w.__i18n, $,
           klik: el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })),
           hist: () => JSON.parse(w.localStorage.getItem("farkle-hist-v1") || "[]"),
           async soubor(text){
             const f = new w.File([text], "zaloha.txt", { type: "text/plain" });
             Object.defineProperty($("impfile"), "files", { value: [f], configurable: true });
             $("impfile").dispatchEvent(new w.Event("change"));
             await new Promise(r => setTimeout(r, 60));
           },
           wordmark: () => d.querySelector(".wordmark").textContent,
           sel: () => $("jazyksel"),
           prepni(kod){
             const s = $("jazyksel");
             s.value = kod;
             s.dispatchEvent(new w.Event("change", { bubbles: true }));
           } };
}
/* výchozí podoba jsdomu: en-US */
const CS = { seznam: ["cs-CZ", "en-US"], jeden: "cs-CZ" };
const EN = { seznam: ["en-US"], jeden: "en-US" };

console.log("A) detekce podle systému");
{
  const a = app(CS);
  ok(a.i18n.kod() === "cs", "cs-CZ vede na češtinu, je " + a.i18n.kod());
  ok(a.wordmark() === "Kostky", "wordmark zůstal český: " + a.wordmark());
  ok(a.d.title === "Kostky — počítadlo", "titulek zůstal český: " + a.d.title);

  const b = app(EN);
  ok(b.i18n.kod() === "en", "en-US vede na angličtinu, je " + b.i18n.kod());
  ok(b.wordmark() === "Dice", "wordmark se přeložil: " + b.wordmark());
  ok(b.d.title === "Dice — counter", "a s ním titulek stránky: " + b.d.title);

  const c = app({ seznam: ["en-GB"], jeden: "en-GB" });
  ok(c.i18n.kod() === "en", "en-GB má stejný primární subtag, je " + c.i18n.kod());

  const e = app({ seznam: ["de-DE"], jeden: "de-DE" });
  ok(e.i18n.kod() === "cs", "neznámý jazyk propadne na výchozí, je " + e.i18n.kod());
  ok(e.wordmark() === "Kostky", "a aplikace naběhne česky: " + e.wordmark());

  const f = app({ seznam: ["de-DE", "sk-SK", "en-GB", "cs-CZ"], jeden: "de-DE" });
  ok(f.i18n.kod() === "en", "ze seznamu vyhraje první podporovaný, je " + f.i18n.kod());
}

console.log("B) chybějící a prázdný seznam jazyků");
{
  const a = app({ seznam: undefined, jeden: "en-US" });
  ok(a.i18n.kod() === "en", "bez navigator.languages se použije language, je " + a.i18n.kod());

  const b = app({ seznam: [], jeden: "cs-CZ" });
  ok(b.i18n.kod() === "cs", "prázdný seznam taky, je " + b.i18n.kod());

  const c = app({ seznam: undefined, jeden: undefined });
  ok(c.i18n.kod() === "cs", "bez obojího zbývá výchozí jazyk, je " + c.i18n.kod());
  ok(c.$("score").textContent === "0", "a aplikace normálně naběhla");
}

console.log("C) uložený kód přebíjí systém");
{
  const a = app(Object.assign({ ulozeny: "en" }, CS));
  ok(a.i18n.kod() === "en", "uložená angličtina vyhrála nad českým systémem, je " + a.i18n.kod());
  ok(a.wordmark() === "Dice", "a projevila se: " + a.wordmark());

  const b = app(Object.assign({ ulozeny: "cs" }, EN));
  ok(b.i18n.kod() === "cs", "a naopak, je " + b.i18n.kod());

  const c = app(Object.assign({ ulozeny: "xx" }, EN));
  ok(c.i18n.kod() === "en", "uložený nesmysl se ignoruje a propadne na systém, je " + c.i18n.kod());

  const e = app(Object.assign({ ulozeny: "" }, CS));
  ok(e.i18n.kod() === "cs", "prázdná hodnota taky, je " + e.i18n.kod());
}

console.log("D) při startu se nic neukládá");
{
  const a = app(EN);
  ok(a.w.localStorage.getItem("farkle-jazyk-v1") === null,
     "detekovaný jazyk se nezapsal: " + a.w.localStorage.getItem("farkle-jazyk-v1"));
  const b = app(CS);
  ok(b.w.localStorage.getItem("farkle-jazyk-v1") === null, "ani ten výchozí");
}

console.log("E) vypnuté localStorage nic neshodí");
{
  const a = app(Object.assign({ bezLS: true }, EN));
  ok(a.i18n.kod() === "en", "jazyk se určil ze systému, je " + a.i18n.kod());
  ok(a.wordmark() === "Dice", "a aplikace naběhla: " + a.wordmark());
}

console.log("F) atribut lang následuje jazyk");
{
  ok(app(CS).d.documentElement.lang === "cs", "čeština v <html lang>");
  ok(app(EN).d.documentElement.lang === "en", "angličtina v <html lang>");
}

console.log("G) sběr češtiny z DOMu proběhl před překladem");
{
  const a = app(EN);
  ok(a.i18n.I18N.cs.wordmark === "Kostky", "český wordmark je v katalogu: " + a.i18n.I18N.cs.wordmark);
  ok(a.i18n.I18N.cs.titulek === "Kostky — počítadlo", "a český titulek taky: " + a.i18n.I18N.cs.titulek);
}

console.log("H) anotovaný prvek se přeloží");
{
  const a = app(EN);
  ok(a.$("bank").textContent === "Bank and pass",
     "tlačítko v počítadle je anglicky: " + a.$("bank").textContent);
  ok(a.$("infobtn").getAttribute("aria-label") === "Rules",
     "a jeho aria-label taky: " + a.$("infobtn").getAttribute("aria-label"));
  ok(a.i18n.t("wordmark") === "Dice", "přeložený klíč vrací angličtinu");
  ok(a.i18n.t("titulek") === "Dice — counter", "i ten druhý");
  ok(a.i18n.t("neexistuje") === "neexistuje", "neznámý klíč se vrátí sám sebou");

  /* České „Zpět“ se v angličtině rozpadá na dvě slova: krok zpět
     v rozehraném kole je Undo, návrat v okně Back. Proto má #undo vlastní
     klíč a společný zůstává jen oknům. */
  ok(a.$("undo").textContent === "Undo", "krok zpět v kole: " + a.$("undo").textContent);
  ok(a.$("newback").textContent === "Back", "návrat v okně: " + a.$("newback").textContent);
}

console.log("I) propad do češtiny u klíče, který jazyk nemá");
{
  const a = app(EN);
  a.i18n.I18N.cs.zkouska = "česky";
  ok(a.i18n.t("zkouska") === "česky", "chybějící anglický klíč bere češtinu: " + a.i18n.t("zkouska"));
  a.i18n.I18N.en.zkouska = "anglicky";
  ok(a.i18n.t("zkouska") === "anglicky", "jakmile klíč přibude, vyhraje: " + a.i18n.t("zkouska"));
}

console.log("J) pluralizace");
{
  const c = app(CS), e = app(EN);
  c.i18n.I18N.cs.kolo = ["kolo", "kola", "kol"];
  e.i18n.I18N.cs.kolo = ["kolo", "kola", "kol"];
  e.i18n.I18N.en.kolo = ["round", "rounds"];

  ok(c.i18n.tn("kolo", 1) === "kolo", "1 kolo");
  ok(c.i18n.tn("kolo", 2) === "kola", "2 kola");
  ok(c.i18n.tn("kolo", 4) === "kola", "4 kola");
  ok(c.i18n.tn("kolo", 5) === "kol", "5 kol");
  ok(c.i18n.tn("kolo", 0) === "kol", "0 kol");
  ok(c.i18n.tn("kolo", 21) === "kol", "21 kol");

  ok(e.i18n.tn("kolo", 1) === "round", "1 round");
  ok(e.i18n.tn("kolo", 2) === "rounds", "2 rounds");
  ok(e.i18n.tn("kolo", 7) === "rounds", "7 rounds");

  /* jazyk s méně tvary, než jich klíč nabízí, bere poslední dostupný */
  e.i18n.I18N.en.hra = ["game"];
  ok(e.i18n.tn("hra", 5) === "game", "jediný tvar stačí: " + e.i18n.tn("hra", 5));

  /* propadlá česká trojice se řídí českým pravidlem, ne anglickým */
  e.i18n.I18N.cs.den = ["den", "dny", "dní"];
  ok(e.i18n.tn("den", 5) === "dní", "propad bere i pravidlo jazyka, ze kterého tvary jsou: " + e.i18n.tn("den", 5));
  ok(e.i18n.tn("den", 3) === "dny", "a to i uprostřed rozsahu: " + e.i18n.tn("den", 3));

  ok(c.i18n.tn("neexistuje", 3) === "neexistuje", "neznámý klíč se vrátí sám sebou");
}

console.log("J2) doplňování hodnot do textu");
{
  const a = app(CS);
  a.i18n.I18N.cs.zkouska = "z {a} do {b}";
  ok(a.i18n.t("zkouska", { a: 1, b: 2 }) === "z 1 do 2", "hodnoty se doplní: " + a.i18n.t("zkouska", { a: 1, b: 2 }));
  ok(a.i18n.t("zkouska") === "z {a} do {b}", "bez hodnot zůstane text, jak je");
  ok(a.i18n.t("zkouska", { a: 1 }) === "z 1 do {b}",
     "nedodaná hodnota zůstane vidět: " + a.i18n.t("zkouska", { a: 1 }));
  ok(a.i18n.t("zkouska", { a: 0 }) === "z 0 do {b}", "nula je platná hodnota");

  /* pořadí se v jiném jazyce může obrátit — o to celé jde */
  a.i18n.I18N.en.zkouska = "from {a} to {b}";
  const e = app(EN);
  e.i18n.I18N.cs.zkouska = "z {a} do {b}";
  e.i18n.I18N.en.zkouska = "{b} \u2190 {a}";
  ok(e.i18n.t("zkouska", { a: 1, b: 2 }) === "2 \u2190 1",
     "jazyk si hodnoty umístí po svém: " + e.i18n.t("zkouska", { a: 1, b: 2 }));

  /* tn doplní počet samo, další hodnoty se dají přidat */
  a.i18n.I18N.cs.kus = ["{n} kus za {b}", "{n} kusy za {b}", "{n} kusů za {b}"];
  ok(a.i18n.tn("kus", 1, { b: "sto" }) === "1 kus za sto", "tn doplní {n} i ostatní: " + a.i18n.tn("kus", 1, { b: "sto" }));
  ok(a.i18n.tn("kus", 7, { b: "sto" }) === "7 kusů za sto", "a vybere správný tvar");
}

console.log("J3) plurály nahradily čtyři pomocné funkce");
{
  const a = app(CS);
  ok(a.i18n.tn("slovo.kolo", 1) === "1 kolo" && a.i18n.tn("slovo.kolo", 3) === "3 kola" &&
     a.i18n.tn("slovo.kolo", 11) === "11 kol", "kola: " + [1,3,11].map(n => a.i18n.tn("slovo.kolo", n)).join(", "));
  ok(a.i18n.tn("slovo.hra", 1) === "1 hra" && a.i18n.tn("slovo.hra", 2) === "2 hry" &&
     a.i18n.tn("slovo.hra", 9) === "9 her", "hry: " + [1,2,9].map(n => a.i18n.tn("slovo.hra", n)).join(", "));
  ok(a.i18n.tn("slovo.nova", 1) === "1 nová" && a.i18n.tn("slovo.nova", 4) === "4 nové" &&
     a.i18n.tn("slovo.nova", 0) === "0 nových", "nové: " + [1,4,0].map(n => a.i18n.tn("slovo.nova", n)).join(", "));
  /* instrumentál má jen dva tvary, třetí index spadne na poslední dostupný */
  ok(a.i18n.tn("slovo.kostkami", 1) === "1 kostkou" && a.i18n.tn("slovo.kostkami", 3) === "3 kostkami" &&
     a.i18n.tn("slovo.kostkami", 6) === "6 kostkami",
     "kostkami: " + [1,3,6].map(n => a.i18n.tn("slovo.kostkami", n)).join(", "));
}

console.log("J4) čísla a data podle jazyka");
{
  const c = app(CS), e = app(EN);
  ok(c.i18n.kat("sep") === "\u202F", "čeština má úzkou nezlomitelnou mezeru");
  ok(e.i18n.kat("sep") === ",", "angličtina čárku: " + e.i18n.kat("sep"));
  ok(c.i18n.kat("des") === "," && e.i18n.kat("des") === ".", "desetinná značka se liší");

  const kdy = new Date(2026, 7, 7, 14, 30);
  ok(c.i18n.kat("datum")(kdy) === "7. 8. 2026", "české datum: " + c.i18n.kat("datum")(kdy));
  ok(c.i18n.kat("datumCas")(kdy) === "7. 8. 2026 \u00B7 14:30", "s časem: " + c.i18n.kat("datumCas")(kdy));
  ok(e.i18n.kat("datum")(kdy) === "Aug 7, 2026", "anglické datum: " + e.i18n.kat("datum")(kdy));
  ok(e.i18n.kat("datumCas")(kdy) === "Aug 7, 2026 \u00B7 14:30", "čas zůstává 24h: " + e.i18n.kat("datumCas")(kdy));

  /* rozsah dnů: shodné části se neopakují */
  const od = new Date(2026, 7, 3), doD = new Date(2026, 7, 9);
  ok(c.i18n.kat("datumRozsah")(od, doD) === "3.\u20139. 8. 2026",
     "český rozsah v jednom měsíci: " + c.i18n.kat("datumRozsah")(od, doD));
  ok(e.i18n.kat("datumRozsah")(od, doD) === "Aug 3 \u2013 9, 2026",
     "anglický rozsah taky: " + e.i18n.kat("datumRozsah")(od, doD));
  const jinyMesic = new Date(2026, 8, 2);
  ok(c.i18n.kat("datumRozsah")(od, jinyMesic) === "3. 8. \u2013 2. 9. 2026",
     "přes hranici měsíce se opakuje jen rok: " + c.i18n.kat("datumRozsah")(od, jinyMesic));
  ok(e.i18n.kat("datumRozsah")(od, jinyMesic) === "Aug 3 \u2013 Sep 2, 2026",
     "a v angličtině měsíc: " + e.i18n.kat("datumRozsah")(od, jinyMesic));

  /* projeví se to i v rozhraní: s textem se mění i oddělovač tisíců */
  ok(c.$("tallycap").textContent === "do cíle zbývá 4\u202F000",
     "vrubovka česky: " + c.$("tallycap").textContent);
  ok(e.$("tallycap").textContent === "4,000 left to the target",
     "a anglicky i s anglickým číslem: " + e.$("tallycap").textContent);
}

console.log("K) přepínač v nastavení");
{
  const a = app(CS);
  const volby = [...a.sel().options];
  ok(volby.length === a.i18n.JAZYKY.length,
     "voleb je tolik co jazyků, je " + volby.length);
  ok(volby.map(o => o.value).join(",") === a.i18n.JAZYKY.join(","),
     "a v pořadí podle JAZYKY: " + volby.map(o => o.value).join(","));
  ok(volby.map(o => o.textContent).join(" / ") === "Čeština / English",
     "názvy jsou endonyma: " + volby.map(o => o.textContent).join(" / "));
  ok(a.sel().value === "cs", "přepínač ukazuje běžící jazyk, je " + a.sel().value);
  ok(app(EN).sel().value === "en", "i když jazyk určil systém");

  a.prepni("en");
  ok(a.i18n.kod() === "en", "přepnutí změnilo jazyk za běhu, je " + a.i18n.kod());
  ok(a.wordmark() === "Dice", "a statický text s ním: " + a.wordmark());
  ok(a.d.documentElement.lang === "en", "atribut lang taky");
  ok(a.w.localStorage.getItem("farkle-jazyk-v1") === "en",
     "volba se uložila: " + a.w.localStorage.getItem("farkle-jazyk-v1"));

  /* návrat k češtině nepotřebuje reload — čeština sebraná z DOMu je v paměti */
  a.prepni("cs");
  ok(a.wordmark() === "Kostky", "návrat k češtině je okamžitý: " + a.wordmark());
  ok(a.d.title === "Kostky — počítadlo", "včetně titulku: " + a.d.title);
  ok(a.w.localStorage.getItem("farkle-jazyk-v1") === "cs", "a přepsal uloženou volbu");
}

console.log("L) volba přežije reload");
{
  const a = app(CS);
  a.prepni("en");
  const ulozeny = a.w.localStorage.getItem("farkle-jazyk-v1");
  /* nová instance se stejným localStorage a stejným systémovým jazykem */
  const b = app(Object.assign({ ulozeny }, CS));
  ok(b.i18n.kod() === "en", "po reloadu drží zvolený jazyk, je " + b.i18n.kod());
  ok(b.wordmark() === "Dice", "a projevuje se: " + b.wordmark());
  ok(b.sel().value === "en", "přepínač ho ukazuje: " + b.sel().value);
}

console.log("M) přepnutí překreslí i to, co se skládá za běhu");
{
  /* Vyprázdněné místo se po přepnutí naplní jen tehdy, když překreslovací
     funkce opravdu proběhly — a naplní se anglicky, ne češtinou, kterou
     tam nechal poslední render. */
  const a = app(CS);
  const puvodniHod = a.$("rollline").innerHTML;
  const puvodniAuto = a.$("auto").textContent;
  a.$("rollline").innerHTML = "";
  a.$("auto").textContent = "";
  a.$("koslist").innerHTML = "";
  a.$("statlist").innerHTML = "";

  a.prepni("en");
  ok(a.$("rollline").innerHTML !== "" && a.$("rollline").innerHTML !== puvodniHod,
     "počítadlo se překreslilo anglicky: " + a.$("rollline").innerHTML);
  const stavyEn = [a.i18n.I18N.en["spol.zapnuto"], a.i18n.I18N.en["nast.vypnuto"]];
  ok(stavyEn.indexOf(a.$("auto").textContent) >= 0 &&
     a.$("auto").getAttribute("aria-label") === a.i18n.I18N.en["auto.zapnout"],
     "stavový popisek tlačítka taky: " + a.$("auto").textContent +
     " / " + a.$("auto").getAttribute("aria-label"));
  ok(a.$("koslist").innerHTML !== "", "obsah koše taky");
  ok(a.$("statlist").innerHTML !== "", "a stránka Statistik");

  a.prepni("cs");
  ok(a.$("rollline").innerHTML === puvodniHod && a.$("auto").textContent === puvodniAuto,
     "a návrat obnovil češtinu: " + a.$("auto").textContent);

  /* rozehraná hra přepnutím nesmí utrpět */
  const b = app(CS);
  b.d.querySelector('[data-single="1"]').dispatchEvent(new b.w.MouseEvent("click", { bubbles: true }));
  const pot = b.$("pot").textContent;
  b.prepni("en");
  ok(b.$("pot").textContent === pot, "odložené body zůstaly: " + b.$("pot").textContent);
  b.prepni("cs");
  ok(b.$("pot").textContent === pot, "a po návratu zpátky taky");
}

console.log("N) strážní kontrola struktury");
{
  const a = app(CS);
  const I = a.i18n.I18N;
  ok(a.i18n.JAZYKY.indexOf(a.i18n.VYCHOZI) >= 0, "VYCHOZI je v JAZYKY");
  ok(a.i18n.JAZYKY.every(k => typeof a.i18n.NAZVY[k] === "string" && a.i18n.NAZVY[k]),
     "každý jazyk má název do přepínače");
  ok(a.i18n.JAZYKY.every(k => I[k] && typeof I[k].plural === "function"),
     "každý jazyk má vlastní plural()");

  /* klíče dalších jazyků musí být podmnožinou češtiny — chytne překlep
     i osiřelý klíč po přejmenování */
  const chybi = [];
  a.i18n.JAZYKY.filter(k => k !== "cs").forEach(k => {
    Object.keys(I[k]).forEach(klic => { if(!(klic in I.cs)) chybi.push(k + "." + klic); });
  });
  ok(chybi.length === 0, "žádný osiřelý klíč: " + (chybi.join(", ") || "—"));

  /* každý klíč anotovaný v HTML musí po sběru v češtině existovat */
  const atributy = ["data-i18n", "data-i18n-html", "data-i18n-aria", "data-i18n-title", "data-i18n-ph"];
  const nesebrane = [];
  atributy.forEach(atr => {
    [...a.d.querySelectorAll("[" + atr + "]")].forEach(el => {
      const klic = el.getAttribute(atr);
      if(typeof I.cs[klic] !== "string") nesebrane.push(atr + "=" + klic);
    });
  });
  ok(nesebrane.length === 0, "všechny klíče z HTML se sebraly: " + (nesebrane.join(", ") || "—"));
  ok(typeof I.cs.wordmark === "string" && typeof I.cs.titulek === "string",
     "a sběr opravdu něco našel");

  /* Sebraný text nesmí být prázdný — prázdná hodnota znamená anotaci na
     prvku, který se plní až z JS, a v cizím jazyce by po ní zbylo prázdné
     místo místo textu. Průchod jde přes klíče z HTML, ne přes celý katalog:
     ten drží i položky, které textem nejsou (sep je úzká mezera). */
  const zHtml = new Set();
  atributy.forEach(atr => {
    [...a.d.querySelectorAll("[" + atr + "]")].forEach(el => zHtml.add(el.getAttribute(atr)));
  });
  const prazdne = [...zHtml].filter(k => typeof I.cs[k] === "string" && !I.cs[k].trim());
  ok(prazdne.length === 0, "žádný sebraný text není prázdný: " + (prazdne.join(", ") || "—"));

  /* Kolize klíčů. sberCestinu() bere první výskyt, takže dva prvky pod
     stejným klíčem s různým textem by druhý text tiše přepsaly češtinou
     toho prvního — a to i v češtině samotné. */
  const vzato = {}, kolize = [];
  const cilAtributu = { "data-i18n-aria": "aria-label", "data-i18n-title": "title", "data-i18n-ph": "placeholder" };
  atributy.forEach(atr => {
    [...a.d.querySelectorAll("[" + atr + "]")].forEach(el => {
      const klic = el.getAttribute(atr);
      const hod = atr === "data-i18n" ? el.textContent
                : atr === "data-i18n-html" ? el.innerHTML
                : el.getAttribute(cilAtributu[atr]);
      if(klic in vzato){ if(vzato[klic] !== hod) kolize.push(klic); }
      else vzato[klic] = hod;
    });
  });
  ok(kolize.length === 0, "žádný klíč nedrží dva různé texty: " + (kolize.join(", ") || "—"));

  /* Že se anotovalo doopravdy, ne jen wordmark. Číslo je záměrně nízko pod
     skutečností — hlídá vypadlou anotaci, ne přesný počet textů. */
  ok(Object.keys(vzato).length > 100, "anotovaných klíčů je přes sto: " + Object.keys(vzato).length);
  ok(atributy.every(atr => a.d.querySelector("[" + atr + "]")),
     "všech pět druhů anotace je v HTML použitých");

  a.i18n.JAZYKY.forEach(k => {
    ok(["sep", "des"].every(j => typeof I[k][j] === "string") &&
       ["datum", "datumCas", "datumRozsah"].every(j => typeof I[k][j] === "function"),
       "jazyk " + k + " má kompletní formátování čísel a dat");
  });

  /* Katalog každého dalšího jazyka musí češtinu pokrýt celou. Chybějící
     klíč se propadne a v jinak cizím rozhraní zůstane české slovo — což
     projde jak sběrem, tak kontrolou osiřelých klíčů výš, protože ta míří
     opačným směrem. Druh klíče se přitom měnit nesmí: text proti poli by
     v tn() skončil holým klíčem. */
  a.i18n.JAZYKY.filter(k => k !== "cs").forEach(k => {
    const nepokryte = Object.keys(I.cs).filter(klic => !(klic in I[k]));
    ok(nepokryte.length === 0,
       "jazyk " + k + " pokrývá celou češtinu: " + (nepokryte.join(", ") || "—"));
    const jinyDruh = Object.keys(I.cs).filter(klic =>
      klic in I[k] && Array.isArray(I.cs[klic]) !== Array.isArray(I[k][klic]));
    ok(jinyDruh.length === 0, "a nemění druh klíče: " + (jinyDruh.join(", ") || "—"));
    /* Kolik tvarů jazyk rozlišuje, řekne jeho vlastní plural(). */
    const tvaru = new Set([0, 1, 2, 3, 5, 11, 22, 101].map(n => I[k].plural(n))).size;
    const kratke = Object.keys(I[k]).filter(klic =>
      Array.isArray(I[k][klic]) && I[k][klic].length !== tvaru);
    ok(kratke.length === 0,
       "a jeho pole mají " + tvaru + " tvary: " + (kratke.join(", ") || "—"));
  });
}

console.log("N2) strážní kontrola klíčů volaných z JS");
{
  const a = app(CS);
  const I = a.i18n.I18N, RUCNI = a.i18n.RUCNI;

  /* Ručně psaný katalog se v souboru vyřízne, aby definice klíče
     neplatila jako jeho použití.

     Hranice bere z popisků modulů, které esbuild sází nad každý slepený
     soubor. Dřív se řezalo podle "var RUCNI = {" a "for(var rucniKlic in
     RUCNI)", jenže esbuild druhý zápis přepisuje na "for (rucniKlic in
     RUCNI)" s vytaženým var — marker se tím rozpadl. Popisek modulu je
     stabilnější a řeže přesně na hranici souboru.

     Pozor, co tady NENÍ: anglický katalog zůstává uvnitř `mimoKatalog`,
     stejně jako dřív. Kontrola osiřelých klíčů je tím slabší, než vypadá —
     viz docs/nalezy.md #1. Zachováno schválně, aby řez nic nezměnil. */
  const zac = html.indexOf("// src/js/jazyky/cs.js");
  const kon = html.indexOf("// src/js/jazyky/en.js");
  ok(zac > 0 && kon > zac, "ručně psaný katalog je v souboru k nalezení");
  const mimoKatalog = html.slice(0, zac) + html.slice(kon);

  /* Každý klíč, se kterým se v JS volá t() nebo tn(), musí po sběru
     v češtině existovat — jinak by se v rozhraní objevil holý klíč. */
  const volane = new Set();
  let m;
  const re = /\b(?:t|tn)\(\s*"([^"]+)"/g;
  while((m = re.exec(html))) volane.add(m[1]);
  ok(volane.size > 60, "volaných klíčů je přes šedesát: " + volane.size);
  /* Klíč skládaný za běhu se v kódu objeví jako předpona ("zal.info." +
     zdroj) — pak stačí, když katalog má aspoň jeden klíč, který jí začíná. */
  const klice = Object.keys(I.cs);
  const chybejici = [...volane].filter(k => k.slice(-1) === "."
    ? !klice.some(x => x.indexOf(k) === 0 && x.length > k.length)
    : I.cs[k] === undefined);
  ok(chybejici.length === 0, "všechny volané klíče katalog má: " + (chybejici.join(", ") || "—"));

  /* Klíč z ručního katalogu, který nikdo nevolá, je pozůstatek po
     přejmenování. Klíče skládané za běhu (zal.info.soubor) se poznají
     podle toho, že se v kódu objeví jejich předpona. */
  function pouzity(klic){
    if(mimoKatalog.indexOf('"' + klic + '"') >= 0) return true;
    const casti = klic.split(".");
    for(let i = 1; i < casti.length; i++){
      if(mimoKatalog.indexOf('"' + casti.slice(0, i).join(".") + '."') >= 0) return true;
    }
    return false;
  }
  const osirele = Object.keys(RUCNI).filter(k => !pouzity(k));
  ok(osirele.length === 0, "žádný ručně psaný klíč nezůstal bez použití: " + (osirele.join(", ") || "—"));

  /* Sběr z DOMu bere jen klíče, které katalog ještě nemá. Ručně psaný
     klíč se stejným jménem jako anotace v HTML by proto text z <body>
     tiše přebil — a to i v češtině. */
  const zHtml = new Set();
  ["data-i18n", "data-i18n-html", "data-i18n-aria", "data-i18n-title", "data-i18n-ph"].forEach(atr => {
    [...a.d.querySelectorAll("[" + atr + "]")].forEach(el => zHtml.add(el.getAttribute(atr)));
  });
  const srazka = Object.keys(RUCNI).filter(k => zHtml.has(k));
  ok(srazka.length === 0, "ruční katalog se nepřekrývá s anotacemi v HTML: " + (srazka.join(", ") || "—"));
  ok(Object.keys(RUCNI).length > 100, "ručně psaných klíčů je přes sto: " + Object.keys(RUCNI).length);
}

console.log("O) anotovaná statika");
{
  /* Otisk všeho anotovaného. Průchod přes klíč, ne přes prvek: díky tomu
     projde i tehdy, když se prvky v HTML přeskládají. */
  const atributy = ["data-i18n", "data-i18n-html", "data-i18n-aria", "data-i18n-title", "data-i18n-ph"];
  const cilAtributu = { "data-i18n-aria": "aria-label", "data-i18n-title": "title", "data-i18n-ph": "placeholder" };
  function otisk(d, vynech){
    const out = [];
    atributy.forEach(atr => {
      [...d.querySelectorAll("[" + atr + "]")].forEach(el => {
        const klic = el.getAttribute(atr);
        if(vynech && vynech.indexOf(klic) >= 0) return;
        out.push(atr + "|" + klic + "|" +
          (atr === "data-i18n" ? el.textContent
           : atr === "data-i18n-html" ? el.innerHTML
           : el.getAttribute(cilAtributu[atr])));
      });
    });
    return out.join("\n");
  }

  /* Statika je přeložená celá. Neptáme se, jestli se text liší — část
     klíčů vyjde v obou jazycích stejně (Farkle, 1–5, čísla v tabulce
     pravidel) — ale jestli každý prvek nese přesně to, co má v katalogu
     jeho jazyk. Vynechaný klíč tím propadne, protože by v angličtině
     nesl češtinu. */
  const cs = app(CS), en = app(EN);
  const cilAtributu2 = cilAtributu;
  /* Tlačítko Házet dál si text hned po startu přepisuje render() podle
     stavu kola. Anotace na něm drží jen podobu před prvním vykreslením,
     takže do porovnání s katalogem nepatří. */
  const REZIE = ["pocitadlo.hazetdal"];
  function podleKatalogu(app, kod){
    const spatne = [];
    atributy.forEach(atr => {
      [...app.d.querySelectorAll("[" + atr + "]")].forEach(el => {
        const klic = el.getAttribute(atr);
        if(REZIE.indexOf(klic) >= 0) return;
        const text = atr === "data-i18n" ? el.textContent
                   : atr === "data-i18n-html" ? el.innerHTML
                   : el.getAttribute(cilAtributu2[atr]);
        if(text !== app.i18n.I18N[kod][klic]) spatne.push(atr + "=" + klic);
      });
    });
    return spatne;
  }
  ok(podleKatalogu(en, "en").length === 0,
     "každý anotovaný prvek nese anglický text z katalogu: " + (podleKatalogu(en, "en").join(", ") || "—"));
  ok(podleKatalogu(cs, "cs").length === 0,
     "a v češtině ten sebraný: " + (podleKatalogu(cs, "cs").join(", ") || "—"));
  ok(otisk(cs.d) !== otisk(en.d), "otisky obou jazyků se liší");

  /* pár míst adresně, ať se nedá projít shodou dvou stejně rozbitých otisků */
  ok(en.$("rulestitle").textContent === "Rules & how to play", "nadpis okna pravidel: " + en.$("rulestitle").textContent);
  ok(en.$("mnum").getAttribute("placeholder") === "points", "placeholder ručního zadání: " + en.$("mnum").getAttribute("placeholder"));
  ok(en.$("jazyksel").getAttribute("aria-label") === "Interface language", "aria-label přepínače taky");
  ok(en.$("gamebtn").getAttribute("title") === "Game settings", "a title v horní liště");

  /* Popisek kola nese číslo uvnitř věty, takže anotaci mít nemůže a skládá
     ho render(). Kontrola nad katalogem ho proto nechytí a stojí tu zvlášť. */
  ok(en.$("turnlabel").textContent === "Turn 1 — on the table",
     "popisek kola se skládá v angličtině: " + en.$("turnlabel").textContent);
  ok(cs.$("turnlabel").textContent === "Kolo 1 — na stole",
     "a v češtině: " + cs.$("turnlabel").textContent);

  /* data-i18n-html se zapisuje přes innerHTML — značky uvnitř musí přežít.
     Pravidla se od herních režimů skládají za běhu, takže tenhle odstavec
     stojí v návodu. */
  const p = cs.d.querySelector('[data-i18n-html="navod.rezimy.p1"]');
  ok(p && p.querySelector("b"), "odstavec návodu má po překladu pořád <b>");
  const chip = cs.d.querySelector('[data-single="1"]');
  ok(chip.querySelector("span.v") && chip.querySelector("span.v").textContent === "100",
     "hodnota v čipu přežila: " + (chip.querySelector("span.v") || {}).textContent);

  /* Cesta tam a zpátky. Kdyby sběr proběhl podruhé nad přeloženým textem,
     čeština by se ztratila právě tady.
     „Zabrané místo“ do porovnání nepatří: naJazyk(resetMisto) ho při
     přepnutí jazyka záměrně přepočítá (jinak zůstává zaseknuté na
     placeholderu), takže se po prvním přepnutí liší od panenského stavu
     před ním, i když je čeština v pořádku. */
  const MIMOOTISK = ["nast.misto.zjistuji"];
  const b = app(CS);
  const pred = otisk(b.d, MIMOOTISK);
  b.prepni("en");
  b.prepni("cs");
  ok(otisk(b.d, MIMOOTISK) === pred, "návrat z angličtiny obnoví statiku beze zbytku");
  ok(b.d.title === "Kostky — počítadlo", "včetně titulku: " + b.d.title);

  /* Anotace nesmí rozbít ovládání: čipy si po přepsání innerHTML drží
     obsluhu, protože se mění jen jejich vnitřek. */
  const c = app(CS);
  c.prepni("en");
  c.d.querySelector('[data-single="5"]').dispatchEvent(new c.w.MouseEvent("click", { bubbles: true }));
  ok(c.$("pot").textContent === "50", "čip po přepnutí jazyka pořád zapisuje: " + c.$("pot").textContent);
  const d15 = c.d.querySelector('[data-str="15"]');
  d15.dispatchEvent(new c.w.MouseEvent("click", { bubbles: true }));
  ok(c.$("pot").textContent === "550", "a postupka taky: " + c.$("pot").textContent);
}

console.log("P) záloha přechází mezi jazyky");
{
  /* Čitelná část souboru se překládá, datový řádek ne — značka #DATA:
     musí zůstat jazykově neutrální, jinak by se anglicky vyvezená záloha
     v češtině nenačetla. Test vede soubor tam a zpátky. */
  const hry = [{ id: "g1", savedAt: Date.UTC(2026, 6, 1, 10, 0), mode: "points",
                 goal: 4000, roundGoal: null, banked: 150,
                 turns: [{ p: 150, bust: false, c: "j|p" }] }];
  const e = app(Object.assign({ hry: hry }, EN));
  e.klik(e.$("setbtn"));
  e.klik(e.$("expbtn"));
  await new Promise(r => setTimeout(r, 80));
  const text = await e.w.__blob.text();
  ok(text.indexOf("Dice \u2014 backup of the game history") === 0,
     "čitelná hlavička je anglicky: " + text.split("\n")[0]);
  ok(text.indexOf("total 150, best turn 150, farkles 0") >= 0, "i souhrn hry");
  ok(text.split("\n").filter(l => l.indexOf("#DATA:") === 0).length === 1,
     "datový řádek je pořád jeden a nepřeložený");

  const c = app(CS);
  c.klik(c.$("setbtn"));
  await c.soubor(text);
  ok(c.hist().length === 0 && !c.$("impbox").hidden, "nabídka importu se v češtině ukázala");
  ok(/V souboru 1 hra, z toho 1 nová/.test(c.$("impinfo").textContent),
     "a rozumí jí: " + c.$("impinfo").textContent);
  c.klik(c.$("impadd"));
  ok(c.hist().length === 1 && c.hist()[0].id === "g1",
     "anglicky vyvezená záloha se v češtině načetla, her: " + c.hist().length);

  /* a tatáž cesta opačně, ať se nedá projít shodou dvou stejných formátů */
  const c2 = app(Object.assign({ hry: hry }, CS));
  c2.klik(c2.$("setbtn"));
  c2.klik(c2.$("expbtn"));
  await new Promise(r => setTimeout(r, 80));
  const cesky = await c2.w.__blob.text();
  const e2 = app(EN);
  e2.klik(e2.$("setbtn"));
  await e2.soubor(cesky);
  ok(/The file holds 1 game, 1 new of them/.test(e2.$("impinfo").textContent),
     "česky vyvezená záloha se anglicky popíše: " + e2.$("impinfo").textContent);
  e2.klik(e2.$("impadd"));
  ok(e2.hist().length === 1, "a načte, her: " + e2.hist().length);
  ok(e2.$("zalmsg").textContent === "1 game added.",
     "hláška v jednotném čísle: " + e2.$("zalmsg").textContent);
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);