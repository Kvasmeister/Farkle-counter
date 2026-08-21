import { JSDOM } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
/* návod se při prvním spuštění otevře sám — pro test hlavičky ho odbavíme */
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/",
  beforeParse(w){
    try {
      w.localStorage.setItem("farkle-navod-v1", "bez-verze");
      w.localStorage.setItem("farkle-jazyk-v1", "cs");
    } catch(e){}
  } });
const { window } = dom, d = window.document, $ = id => d.getElementById(id);
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };
const klik = el => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const esc  = () => d.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

console.log("A) hlavička");
ok(d.querySelectorAll(".top > button").length === 4, "čtyři tlačítka v liště, je " + d.querySelectorAll(".top > button").length);
ok($("fsrow") === null || d.contains($("fs")) , "celá obrazovka není v liště");
ok(!d.querySelector(".top #fs"), "tlačítko celé obrazovky se přesunulo z lišty");
ok($("tab2").textContent === "Statistiky", "třetí záložka: " + $("tab2").textContent);

console.log("B) nastavení hry pod kostkou");
ok($("setup").hidden, "panel skrytý");
klik($("gamebtn"));
ok(!$("setup").hidden && $("gamebtn").classList.contains("on"), "kostka panel otevřela");
klik($("gamebtn"));
ok($("setup").hidden, "kostka panel zavřela");

console.log("C) pravidla v okně");
ok($("rulesmodal").hidden, "okno skryté");
klik($("infobtn"));
ok(!$("rulesmodal").hidden, "„i“ otevřelo pravidla");
ok($("rulesmodal").textContent.includes("Postupka 1–6"), "obsah pravidel je uvnitř");
ok(d.activeElement === $("rulesmodal").querySelector(".modalx"), "zaostřeno na křížek");
esc();
ok($("rulesmodal").hidden, "Escape zavřel");
ok(d.activeElement === $("infobtn"), "zaostření se vrátilo na „i“");

console.log("D) nastavení v okně");
klik($("setbtn"));
ok(!$("setmodal").hidden, "kolo otevřelo nastavení");
klik($("setmodal"));                       // klepnutí na tmavé pozadí
ok($("setmodal").hidden, "klepnutí mimo panel zavřelo");
klik($("setbtn"));
klik($("setmodal").querySelector(".modalx"));
ok($("setmodal").hidden, "křížek zavřel");

console.log("E) obě okna se nepotkají");
klik($("infobtn"));
klik($("setbtn"));
ok($("rulesmodal").hidden && !$("setmodal").hidden, "otevřením druhého se první zavře");

console.log("F) šipky přes otevřené okno nepřepínají stránky");
const predtim = $("tab0").getAttribute("aria-selected");
d.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
ok($("tab0").getAttribute("aria-selected") === predtim, "stránka se nezměnila");
esc();

console.log("G) celá obrazovka");
ok($("fsrow") === null, "v jsdom (bez fullscreen API) se řádek odstranil, nezůstal mrtvý");
ok(!$("setmodal").hidden === false, "");

console.log("H) zámek kol pořád funguje (regrese)");
$("modesel").value = "rounds"; $("modesel").dispatchEvent(new window.Event("change"));
$("roundsel").value = "custom"; $("roundsel").dispatchEvent(new window.Event("change"));
$("roundnum").value = "1"; $("roundnum").dispatchEvent(new window.Event("input"));
klik(d.querySelector('[data-single="1"]')); klik($("bank"));
ok(!$("lock").hidden && $("bank").disabled, "po jednom kole zamčeno");

console.log("I) přepínač motivu mění ikonu");
/* Vlastnost .hidden na potomcích <svg> nic nedělá, atribut se musí přepnout
   ručně — bez toho tlačítko ukazovalo měsíc ve všech stavech. Kontroluje se
   proto atribut, ne el.hidden. */
{
  const vidno = id => !$(id).hasAttribute("hidden");
  const rezim = () => d.documentElement.getAttribute("data-theme");
  const doRezimu = chci => { if(rezim() !== chci) klik($("theme")); };

  doRezimu("dark");
  ok(vidno("thsun") && !vidno("thmoon"), "v tmavém svítí slunce, ne měsíc");
  ok($("theme").getAttribute("aria-label") === "Světlý režim",
     "a popisek zve do světlého: " + $("theme").getAttribute("aria-label"));

  klik($("theme"));
  ok(rezim() === "light", "klepnutí přepnulo na světlý");
  ok(vidno("thmoon") && !vidno("thsun"), "ve světlém je měsíc, ne slunce");
  ok($("theme").getAttribute("aria-label") === "Tmavý režim",
     "a popisek zve do tmavého: " + $("theme").getAttribute("aria-label"));

  klik($("theme"));
  ok(rezim() === "dark" && vidno("thsun") && !vidno("thmoon"), "a zpátky do tmavého i s ikonou");
  ok(window.localStorage.getItem("farkle-theme") === "dark",
     "volba se pamatuje: " + window.localStorage.getItem("farkle-theme"));
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
