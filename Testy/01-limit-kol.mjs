import { JSDOM } from "jsdom";
import fs from "fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
/* jsdom hlásí navigator.language "en-US"; bez přišpendlení by aplikace
   naběhla anglicky. Viz TESTS_README, past o jazyku. */
const cs = w => { try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){} };
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/", beforeParse: cs });
const { window } = dom;
const d = window.document;
const $ = id => d.getElementById(id);
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

// pomůcky: odehraj kolo (zapiš 100 bodů)
function kolo(){
  d.querySelector('[data-single="1"]').click();
  $("bank").click();
}
function farkle(){ $("bust").click(); }

console.log("A) výchozí stav = hra do bodů, žádný zámek");
ok($("lock").hidden, "pruh o konci hry skrytý");
ok($("roundsel").hidden, "volba počtu kol skrytá v režimu do bodů");

console.log("B) přepnutí na kola s limitem 3");
$("modesel").value = "rounds";
$("modesel").dispatchEvent(new window.Event("change"));
ok(!$("roundsel").hidden, "volba počtu kol se ukázala");
ok($("goalsel").hidden, "cíl v bodech se schoval");
$("roundsel").value = "custom";
$("roundsel").dispatchEvent(new window.Event("change"));
$("roundnum").value = "3";
$("roundnum").dispatchEvent(new window.Event("input"));
ok($("rest").textContent === "0 z 3", "skóre ukazuje „0 z 3“, je " + JSON.stringify($("rest").textContent));
ok($("tally").children.length === 3, "vrubovka má 3 zářezy, má " + $("tally").children.length);

console.log("C) tři kola jdou odehrát, čtvrté ne");
kolo(); kolo();
ok(!$("lock").hidden === false, "po 2 kolech ještě není zamčeno");
ok(!$("bank").disabled || true, "");
kolo();
ok(!$("lock").hidden, "po 3. kole pruh svítí");
ok($("bank").disabled && $("bust").disabled, "Zapsat / Farkle jsou zamčené");
ok(!$("rollon").disabled && /zobrazit zápis kol/.test($("rollon").textContent),
   "tlačítko hodu vede na zápis kol: " + $("rollon").textContent);
$("rollon").click();
ok($("tab1").getAttribute("aria-selected") === "true", "klik odvedl na Zápis kol");
$("tab0").click();
ok(d.querySelector('[data-single="1"]').disabled, "klávesnice zamčená");
ok($("mnum").disabled && $("madd").disabled, "ruční zadání zamčené");
ok($("score").textContent === "300", "skóre 300, je " + $("score").textContent);

console.log("D) klikání do zamčené hry nic nezapíše");
d.querySelector('[data-single="1"]').click();
farkle();
ok($("rows").children.length === 3, "pořád 3 kola, je " + $("rows").children.length);

console.log("E) Zpět na zapsaná kola nesahá");
ok($("undo").disabled, "v prázdném kole je Zpět zašedlé");
$("undo").click();
ok($("rows").children.length === 3, "pořád 3 kola, je " + $("rows").children.length);
ok(!$("lock").hidden, "a hra zůstává zamčená");
ok($("score").textContent === "300", "skóre se nezměnilo, je " + $("score").textContent);

console.log("E2) kolo se maže jedině přes Opravit");
$("fixturns").click();
d.querySelectorAll("#rows .delbtn")[2].click();
d.querySelector("#rows .cf .mini.danger").click();
ok($("lock").hidden, "po smazání kola je odemčeno");
ok($("rows").children.length === 2, "zbyla 2 kola");

console.log("F) zvýšení limitu je únikovka");
kolo();
ok(!$("lock").hidden, "zase zamčeno");
$("roundnum").value = "5";
$("roundnum").dispatchEvent(new window.Event("input"));
ok($("lock").hidden, "limit 5 odemkl hru");
ok($("tally").children.length === 5, "vrubovka se přizpůsobila na 5");

console.log("G) neomezeně kol");
$("roundsel").value = "none";
$("roundsel").dispatchEvent(new window.Event("change"));
ok($("rest").textContent === "3", "ukazuje jen počet kol: " + $("rest").textContent);
kolo(); kolo(); kolo();
ok($("lock").hidden, "bez limitu se nezamyká");

console.log("H) uložení a načtení stavu");
const raw = JSON.parse(window.localStorage.getItem("farkle-solo-v3"));
ok(raw.mode === "rounds" && raw.roundGoal === null, "roundGoal se uložil jako null");
ok(raw.archivedId === null, "archivedId je v uloženém stavu");
ok(raw.turns.length === 6, "6 kol v uložení");

console.log("I) migrace starého uložení bez nových polí");
const dom2 = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/",
  beforeParse(w){ cs(w); w.localStorage.setItem("farkle-solo-v3", JSON.stringify(
    { mode:"points", goal:4000, banked:1500, turns:[{p:1500,bust:false,d:"jednička"}], rolls:[{thrown:6,hot:false,items:[]}] })); } });
const d2 = dom2.window.document;
ok(d2.getElementById("score").textContent === "1 500".replace(" ","\u202F"), "staré skóre naběhlo: " + JSON.stringify(d2.getElementById("score").textContent));
const raw2 = JSON.parse(dom2.window.localStorage.getItem("farkle-solo-v3"));
ok(raw2.roundGoal === null && raw2.archivedId === null, "chybějící pole se doplnila");

console.log("J) ruční zadání při nule zbývajících kostek (A-2)");
const dom3 = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/", beforeParse: cs });
const d3 = dom3.window.document;
const $3 = id => d3.getElementById(id);
for(let i = 0; i < 6; i++) d3.querySelector('[data-single="1"]').click();
ok($3("pot").textContent === "600", "šest jedniček = 600 na stole, je " + $3("pot").textContent);
ok($3("mkost").textContent === "0 kost.", "počítadlo kostek ukazuje nulu, ukazuje " + JSON.stringify($3("mkost").textContent));
ok($3("madd").disabled && $3("mnum").disabled && $3("mtoggle").disabled, "ruční zadání je zamčené");
$3("mnum").value = "5000";
$3("madd").click();
ok($3("pot").textContent === "600", "klik na Přidat nic nezapsal, na stole " + $3("pot").textContent);
const st3 = JSON.parse(dom3.window.localStorage.getItem("farkle-solo-v3"));
ok(!st3.rolls[0].items.some(i => i.d === 0), "v uložení není žádná položka s nula kostkami");
$3("rollon").click();
ok(!$3("madd").disabled && $3("mkost").textContent === "1 kost.", "po horkých kostkách se ruční zadání odemklo");
$3("mnum").value = "5000";
$3("madd").click();
ok($3("pot").textContent === "5\u202F600", "s kostkami k dispozici se ručně přidat dá, na stole " + $3("pot").textContent);


console.log("K) hra do bodů se po dosažení cíle zamkne");
{
  const dom4 = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/", beforeParse: cs });
  const w4 = dom4.window, d4 = w4.document, $4 = id => d4.getElementById(id);
  $4("goalsel").value = "custom";
  $4("goalsel").dispatchEvent(new w4.Event("change"));
  $4("goalnum").value = "200";
  $4("goalnum").dispatchEvent(new w4.Event("input"));
  ok($4("lock").hidden, "na začátku žádný zámek");

  /* postupka 1–5 je 500, tedy víc než cíl: dokud leží na stole, hra běží dál */
  d4.querySelector('[data-str="15"]').click();
  ok($4("lock").hidden, "body na stole zámek nespouští");
  ok(!$4("bank").disabled, "zapsat jde");

  $4("bank").click();
  ok($4("score").textContent === "500", "kolo se zapsalo celé i nad cíl, skóre " + $4("score").textContent);
  ok(!$4("lock").hidden, "po zapsání kola pruh svítí");
  ok(/Cíl 200 je dosažený/.test($4("lock").textContent), "text pruhu: " + $4("lock").textContent);
  ok($4("bank").disabled && $4("bust").disabled, "Zapsat a Farkle jsou zamčené");
  ok($4("total").classList.contains("won"), "skóre je zvýrazněné");
  ok(!$4("rollon").disabled && /zobrazit zápis kol/.test($4("rollon").textContent), "tlačítko hodu vede na zápis kol");
  $4("rollon").click();
  ok($4("tab1").getAttribute("aria-selected") === "true", "klik odvedl na Zápis kol");

  /* zvýšením cíle se hra zase odemkne — stejně jako u limitu kol */
  $4("goalnum").value = "1000";
  $4("goalnum").dispatchEvent(new w4.Event("input"));
  ok($4("lock").hidden && !$4("bust").disabled, "zvýšení cíle hru odemklo");
}

console.log("L) Zapsat nejde nad rozehraným hodem, ze kterého se nic neodložilo");
{
  const dom5 = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/", beforeParse: cs });
  const w5 = dom5.window, d5 = w5.document, $5 = id => d5.getElementById(id);

  ok($5("bank").disabled, "na prvním hodu kola je Zapsat zamčené i beze změny");
  d5.querySelector('[data-single="1"]').click();
  ok(!$5("bank").disabled, "po odložení jedničky jde zapsat");

  $5("rollon").click();
  ok($5("pot").textContent === "100", "na stole pořád leží 100");
  ok($5("bank").disabled, "po Házet dál je Zapsat zamčené");
  ok(/Nejdřív si z hodu něco odlož/.test($5("rollon").textContent),
     "vysvětlení nese tlačítko nad ním: " + $5("rollon").textContent);
  ok(!$5("bust").disabled, "Farkle se nezamyká");
  ok(!$5("undo").disabled, "Zpět taky ne");

  $5("undo").click();
  ok(!$5("bank").disabled, "po Zpět jde zapsat: prázdný hod je odebraný");

  /* a totéž po horkých kostkách — nový hod, nic odloženo, zapsat nejde */
  d5.querySelector('[data-str="15"]').click();
  d5.querySelector('[data-single="1"]').click();
  ok(!$5("bank").disabled, "šest kostek využitých, zapsat pořád jde");
  $5("rollon").click();
  ok(/Horké kostky/.test($5("rollon").textContent) || $5("bank").disabled, "hází se znovu všemi šesti");
  ok($5("bank").disabled, "po horkých kostkách je Zapsat zamčené");
  d5.querySelector('[data-single="5"]').click();
  ok(!$5("bank").disabled, "a po odložení pětky se odemkne");

  /* farkle uprostřed rozehraného hodu se zapsat dá a nese správný počet hodů */
  $5("bust").click();
  const st5 = JSON.parse(w5.localStorage.getItem("farkle-solo-v3"));
  const posledni = st5.turns[st5.turns.length - 1];
  ok(posledni.bust === true, "kolo skončilo farklem");
  /* kolo se ukládá v kódech, hody odděluje svislítko */
  ok(posledni.c.split("|").length === 2,
     "popis nese dva úseky, hody byly tři i s tím prohraným: " + posledni.c);
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
