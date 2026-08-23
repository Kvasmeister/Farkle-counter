/* Dvě kontroly importů, každá v jednom směru.

   1. Jméno, které v modulu nikde nevzniká — zapomenutý import.
      Esbuild neznámé identifikátory NEHLÁSÍ: co se nepodařilo naimportovat,
      bere jako globál prohlížeče, a chyba spadne teprve za běhu, často až
      v odbočce, kterou zrovna nikdo neprošel. Přesně tak se při řezu 5
      ztratilo t() uvnitř cistaKombinace(): modul se přeložil, aplikace
      naběhla a rozsypalo se to teprve při načítání vlastních kombinací —
      osmnáct sad naráz a v hromadě výpisů nebylo poznat proč.

   2. Naimportované jméno, které se v modulu nepoužije. Tohle nespadne nikdy,
      esbuild ho zahodí — jenže seznam importů je hlavička modulu a čte se
      jako výčet jeho závislostí. Po refaktoru, kde se importy doplňovaly
      automaticky, jich v hlavni.js zbylo 183 nepoužitých a v tom seznamu
      nešlo najít těch šedesát skutečných.

   Analýzu rozsahů pro obojí drží Testy/volna-jmena.mjs.

   node Testy/kontrola-modulu.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nepouziteImporty, volnaJmena } from "./volna-jmena.mjs";

const JS = path.join(fileURLToPath(new URL("..", import.meta.url)), "src", "js");

function soubory(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? soubory(path.join(dir, e.name))
      : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []);
}

let bezPuvodu = 0, navic = 0;
for (const f of soubory(JS)) {
  const zdroj = fs.readFileSync(f, "utf8");
  const volna = volnaJmena(zdroj);
  const zbytecne = nepouziteImporty(zdroj);
  if (!volna.size && !zbytecne.length) continue;
  bezPuvodu += volna.size;
  navic += zbytecne.length;
  console.log("");
  console.log(path.relative(JS, f).split(path.sep).join("/"));
  for (const [n, i] of [...volna].sort((a, b) => a[1].radek - b[1].radek)) {
    console.log("  řádek " + String(i.radek).padStart(4) + "   " + n + "   (" + i.pocet + "x) bez původu");
  }
  for (const i of zbytecne) {
    console.log("  řádek " + String(i.radek).padStart(4) + "   " + i.jmeno + "   naimportováno zbytečně");
  }
}

console.log("");
if (bezPuvodu) console.log(bezPuvodu + " jmen bez původu — chybí import?");
if (navic) console.log(navic + " naimportovaných jmen se nepoužívá — smazat z hlavičky");
if (!bezPuvodu && !navic) console.log("importy sedí: nic nechybí, nic nepřebývá");
process.exit(bezPuvodu + navic ? 1 : 0);
