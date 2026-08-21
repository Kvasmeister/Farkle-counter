/* Kouřová zkouška: naběhne aplikace vůbec?

   Proč to existuje: esbuild NEHLÁSÍ neznámé identifikátory. Co se nepodařilo
   naimportovat, bere jako globál prohlížeče — a chyba spadne až za běhu.
   Zapomenutý import se tak projeví teprve tím, že se rozsype osmnáct sad
   naráz a v hromadě výpisů se hledá, co se vlastně stalo.

   Tahle sada se pouští jako první a doběhne za dvě vteřiny. Když spadne,
   nemá smysl číst zbytek — aplikace se nespustila.
*/
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

const chyby = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => chyby.push(e.message));

const dom = new JSDOM(html, {
  runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/", virtualConsole: vc,
  beforeParse(w) {
    try {
      w.localStorage.setItem("farkle-jazyk-v1", "cs");
      w.localStorage.setItem("farkle-navod-v1", "bez-verze");
    } catch (e) {}
  }
});
const { window: w } = dom;
const d = w.document;

console.log("A) skript proběhl bez výjimky");
ok(chyby.length === 0, "žádná chyba při startu: " + (chyby.join(" | ") || "—"));

console.log("B) sondy pro ostatní sady stojí");
ok(!!w.__i18n, "window.__i18n je k dispozici");
ok(!!w.__pravidla, "window.__pravidla je k dispozici");
ok(!!(w.__pravidla && w.__pravidla.aktRezim()), "a vrací aktivní režim");

console.log("C) vykreslení doběhlo");
ok(d.getElementById("score").textContent === "0", "skóre je vykreslené: " + d.getElementById("score").textContent);
ok(d.getElementById("rows") !== null, "tabulka kol v DOMu je");
ok(d.querySelectorAll(".chip").length > 0, "klávesnice má čipy: " + d.querySelectorAll(".chip").length);
ok(/farkle|Farkle/.test(d.getElementById("bust").textContent), "tlačítko Farkle nese text");

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
