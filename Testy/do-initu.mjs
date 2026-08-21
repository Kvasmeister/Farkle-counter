/* Přesune příkazy z nejvyšší úrovně modulu do pojmenované init() funkce.

   Proč: v jednom uzávěru se vedlejší efekty spouštěly tím, že se k nim došlo
   — pořadí určovalo pořadí řádků. Pod moduly je pořadí vyhodnocení dané
   grafem importů, ne zdrojem, takže by se rozešlo. Modul proto při importu
   nedělá nic a app.js volá init() tam, kde ten kód dřív stál.

   Přesouvá se všechno, co není deklarace ani import/export: IIFE, navěšení
   posluchačů, forEach přes prvky. Pořadí mezi nimi zůstává.

   node Testy/do-initu.mjs src/js/ui/neco.js initNeco
*/
import fs from "node:fs";
import * as acorn from "acorn";

const [, , cesta, jmeno] = process.argv;
if (!cesta || !jmeno) {
  console.error("použití: node Testy/do-initu.mjs <soubor> <jmenoInitu>");
  process.exit(2);
}

const zdroj = fs.readFileSync(cesta, "utf8");
const strom = acorn.parse(zdroj, { ecmaVersion: 2022, sourceType: "module" });

const DEKLARACE = new Set([
  "FunctionDeclaration", "VariableDeclaration", "ClassDeclaration",
  "ImportDeclaration", "ExportNamedDeclaration", "ExportDefaultDeclaration",
  "ExportAllDeclaration", "EmptyStatement"
]);

const presunout = strom.body.filter((n) => !DEKLARACE.has(n.type));
if (!presunout.length) {
  console.log("  " + cesta + ": žádné příkazy k přesunu");
  process.exit(0);
}

/* Komentář těsně nad příkazem patří k němu — jinak by zůstal viset nad
   prázdným místem a vysvětloval kód, který je jinde. */
function zacatekSKomentarem(n, predchozi) {
  const pred = zdroj.slice(predchozi, n.start);
  /* Hledá se OD KONCE. Dřív to byl jeden regulární výraz zleva a ten si
     vybral hlavičku modulu jako komentář prvního příkazu — do init() se
     pak nasypal celý soubor včetně deklarací. */
  const konecKom = pred.lastIndexOf("*/");
  if (konecKom < 0) return n.start;
  /* za komentářem už smí být jen bílé znaky, jinak k příkazu nepatří */
  if (/\S/.test(pred.slice(konecKom + 2))) return n.start;
  const zacKom = pred.lastIndexOf("/*", konecKom);
  if (zacKom < 0) return n.start;
  if (pred.slice(zacKom + 2, konecKom).includes("*/")) return n.start;
  return predchozi + zacKom;
}

const kusy = [];
let konecPredchozi = 0;
for (const n of presunout) {
  const zac = zacatekSKomentarem(n, konecPredchozi);
  kusy.push([zac, n.end]);
  konecPredchozi = n.end;
}

/* od konce, ať se posunuté indexy nerozbijí */
let out = zdroj;
const telo = [];
for (let i = kusy.length - 1; i >= 0; i--) {
  const [a, b] = kusy[i];
  telo.unshift(out.slice(a, b));
  out = out.slice(0, a) + out.slice(b);
}

/* export { ... } musí zůstat na konci souboru */
const mExport = /\nexport \{[^}]*\};\n?$/.exec(out);
const exportBlok = mExport ? mExport[0] : "";
if (exportBlok) out = out.slice(0, mExport.index);

const odsazene = telo
  .map((k) => k.split("\n").map((r) => (r.trim() ? "  " + r : r)).join("\n"))
  .join("\n\n");

out = out.replace(/\n+$/, "\n") +
  "\n/* Vedlejší efekty. Volá je app.js na místě, kde tenhle kód dřív stál —\n" +
  "   pořadí startu tím zůstává vidět na jednom místě, ne rozeseté po modulech. */\n" +
  "export function " + jmeno + "(){\n" + odsazene + "\n}\n" + exportBlok;

fs.writeFileSync(cesta, out, "utf8");
console.log("  " + cesta + ": " + presunout.length + " příkazů -> " + jmeno + "()");
