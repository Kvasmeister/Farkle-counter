/* Dopíše modulu `export { ... }` podle jeho deklarací nejvyšší úrovně.

   Vzniklo při refaktoru: moduly se z jednoho uzávěru krájely po kusech
   a ručně udržovaný seznam exportů by se rozešel hned. Bere se skutečný
   strom (acorn), ne odhad z regulárního výrazu.

   Co je deklarované jako `export function`, se do seznamu nepřidává —
   jinak by vznikl duplicitní export a soubor by se nepřeložil.

   node Testy/doplnit-exporty.mjs                všechny moduly v src/js
   node Testy/doplnit-exporty.mjs src/js/x.js    jen vyjmenované
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";

const JS = path.join(fileURLToPath(new URL("..", import.meta.url)), "src", "js");

function soubory(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? soubory(path.join(dir, e.name))
      : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []);
}

const cile = process.argv.length > 2 ? process.argv.slice(2) : soubory(JS);

for (const f of cile) {
  let s = fs.readFileSync(f, "utf8");
  s = s.replace(/\nexport \{[^}]*\};\n?$/, "\n");

  const strom = acorn.parse(s, { ecmaVersion: 2022, sourceType: "module" });
  const jmena = [];
  const uzExportovane = new Set();

  for (const n of strom.body) {
    if (n.type === "ExportNamedDeclaration" && n.declaration) {
      const d = n.declaration;
      if (d.type === "FunctionDeclaration") uzExportovane.add(d.id.name);
      if (d.type === "VariableDeclaration") {
        for (const v of d.declarations) if (v.id.type === "Identifier") uzExportovane.add(v.id.name);
      }
      continue;
    }
    if (n.type === "VariableDeclaration") {
      for (const d of n.declarations) if (d.id.type === "Identifier") jmena.push(d.id.name);
    }
    if (n.type === "FunctionDeclaration") jmena.push(n.id.name);
  }

  const vysledek = [...new Set(jmena)].filter((j) => !uzExportovane.has(j)).sort();
  const konec = vysledek.length ? "\nexport { " + vysledek.join(", ") + " };\n" : "";
  fs.writeFileSync(f, s.replace(/\n+$/, "\n") + konec, "utf8");
  if (process.argv.length > 2 || vysledek.length) {
    console.log("  " + path.relative(JS, f).split(path.sep).join("/") +
      "   " + (vysledek.length + uzExportovane.size) + " jmen");
  }
}
