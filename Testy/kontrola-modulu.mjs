/* Hledá v modulech jména, která nikde nevznikají — zapomenuté importy.

   Proč to existuje: esbuild neznámé identifikátory NEHLÁSÍ. Co se nepodařilo
   naimportovat, bere jako globál prohlížeče, a chyba spadne teprve za běhu,
   často až v odbočce, kterou zrovna nikdo neprošel. Přesně tak se při řezu 5
   ztratilo t() uvnitř cistaKombinace(): modul se přeložil, aplikace naběhla
   a rozsypalo se to teprve při načítání vlastních kombinací — osmnáct sad
   naráz a v hromadě výpisů nebylo poznat proč.

   Samotnou analýzu rozsahů drží Testy/volna-jmena.mjs.

   node Testy/kontrola-modulu.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { volnaJmena } from "./volna-jmena.mjs";

const JS = path.join(fileURLToPath(new URL("..", import.meta.url)), "src", "js");

function soubory(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? soubory(path.join(dir, e.name))
      : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []);
}

let nalezu = 0;
for (const f of soubory(JS)) {
  const volna = volnaJmena(fs.readFileSync(f, "utf8"));
  if (!volna.size) continue;
  nalezu += volna.size;
  console.log("");
  console.log(path.relative(JS, f).split(path.sep).join("/"));
  for (const [n, i] of [...volna].sort((a, b) => a[1].radek - b[1].radek)) {
    console.log("  řádek " + String(i.radek).padStart(4) + "   " + n + "   (" + i.pocet + "x)");
  }
}

console.log("");
console.log(nalezu ? nalezu + " jmen bez původu — chybí import?"
                   : "všechna jména mají původ");
process.exit(nalezu ? 1 : 0);
