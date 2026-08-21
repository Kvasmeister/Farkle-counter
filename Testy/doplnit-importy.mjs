/* Doplní do modulů chybějící importy.

   Nehádá: zeptá se acornu (Testy/volna-jmena.mjs), která jména se v souboru
   nikde nezavádějí, a dohledá je v exportech ostatních modulů. Co nenajde,
   vypíše — to je buď globál k doplnění do seznamu, nebo opravdová chyba.

   Vzniklo při refaktoru, kde se z jednoho uzávěru krájely moduly: ruční
   odhad, co který kus potřebuje, selhal hned napoprvé (chybějící t()
   v cistaKombinace, viz docs/nalezy.md #4).

   node Testy/doplnit-importy.mjs           doplní
   node Testy/doplnit-importy.mjs --suche   jen ukáže, co by udělal
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { volnaJmena } from "./volna-jmena.mjs";

const JS = path.join(fileURLToPath(new URL("..", import.meta.url)), "src", "js");
const suche = process.argv.includes("--suche");

function soubory(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? soubory(path.join(dir, e.name))
      : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []);
}

/* mapa: exportované jméno -> soubor */
const kde = new Map();
const vsechny = soubory(JS);
for (const f of vsechny) {
  const s = fs.readFileSync(f, "utf8");
  const jmena = [];
  const m = /^export \{([\s\S]*?)\};$/m.exec(s);
  if (m) jmena.push(...m[1].split(","));
  /* i `export function X(){}` a `export var X` — init() funkce se jinak
     nedají najít a hlásily by se jako jména bez původu */
  for (const mm of s.matchAll(/^export\s+(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) {
    jmena.push(mm[1]);
  }
  for (const raw of jmena) {
    const n = raw.trim();
    if (!n) continue;
    if (kde.has(n)) {
      console.error("DVAKRÁT exportované jméno: " + n +
        " (" + path.relative(JS, kde.get(n)) + " i " + path.relative(JS, f) + ")");
      process.exit(2);
    }
    kde.set(n, f);
  }
}

let zmen = 0, chybi = 0;
for (const f of vsechny) {
  const s = fs.readFileSync(f, "utf8");
  const volna = volnaJmena(s);
  if (!volna.size) continue;

  const podleModulu = new Map();
  const nezname = [];
  for (const [n] of volna) {
    const cil = kde.get(n);
    if (!cil) { nezname.push(n); continue; }
    if (!podleModulu.has(cil)) podleModulu.set(cil, []);
    podleModulu.get(cil).push(n);
  }
  if (nezname.length) {
    chybi += nezname.length;
    console.log("? " + path.relative(JS, f) + "   BEZ PŮVODU: " + nezname.join(", "));
  }
  if (!podleModulu.size) continue;

  const radky = [];
  for (const [cil, jmena] of [...podleModulu].sort((a, b) => a[0].localeCompare(b[0]))) {
    let rel = path.relative(path.dirname(f), cil).split(path.sep).join("/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    jmena.sort();
    const jedna = "import { " + jmena.join(", ") + ' } from "' + rel + '";';
    radky.push(jedna.length <= 92 ? jedna
      : "import {\n  " + jmena.join(",\n  ") + '\n} from "' + rel + '";');
  }

  /* vložit za poslední existující import, jinak za úvodní blokový komentář */
  const lines = s.split("\n");
  let kam = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\b/.test(lines[i]) || /^\} from "/.test(lines[i])) kam = i + 1;
  }
  if (kam === 0) {
    const konecKom = lines.findIndex((r) => /\*\/\s*$/.test(r));
    kam = konecKom >= 0 ? konecKom + 1 : 0;
  }
  const novy = lines.slice(0, kam).concat(radky, lines.slice(kam)).join("\n");
  console.log((suche ? "= " : "+ ") + path.relative(JS, f));
  for (const r of radky) console.log("    " + r.split("\n")[0]);
  if (!suche) fs.writeFileSync(f, novy, "utf8");
  zmen++;
}

console.log("");
console.log(zmen + " souborů" + (chybi ? ", " + chybi + " jmen bez původu" : ""));
process.exit(chybi ? 1 : 0);
