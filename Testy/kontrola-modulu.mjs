/* Hledá v modulech jména, která nikde nevznikají — zapomenuté importy.

   Proč to existuje: esbuild neznámé identifikátory NEHLÁSÍ. Co se nepodařilo
   naimportovat, bere jako globál prohlížeče, a chyba spadne teprve za běhu,
   často až v odbočce, kterou zrovna nikdo neprošel. Přesně tak se při řezu 5
   ztratilo t() uvnitř cistaKombinace(): modul se přeložil, aplikace naběhla
   a rozsypalo se to teprve při načítání vlastních kombinací — osmnáct sad
   naráz a v hromadě výpisů nebylo poznat proč.

   Kontrola staví skutečný strom (acorn) a prochází rozsahy. Naivní hledání
   regulárním výrazem tohle neumí: uvozovka uvnitř regulárního výrazu
   (`/[&<>"]/g` v esc()) rozhodí každé vyprazdňování řetězců a kontrola pak
   hlásí stovky nesmyslů. Zkoušeno, zahozeno.

   node Testy/kontrola-modulu.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

const JS = path.join(fileURLToPath(new URL("..", import.meta.url)), "src", "js");

/* Co v prohlížeči opravdu existuje. Cokoli mimo tenhle seznam a mimo
   deklarace v souboru je zapomenutý import. */
const GLOBALY = new Set([
  "window", "document", "navigator", "localStorage", "console", "location", "screen",
  "history", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "matchMedia", "fetch", "caches",
  "indexedDB", "IDBKeyRange", "Blob", "File", "FileReader", "URL", "TextEncoder",
  "CustomEvent", "Event", "MessageChannel", "MessagePort", "MutationObserver", "IntersectionObserver", "AbortController",
  "Object", "Array", "String", "Number", "Boolean", "Math", "JSON", "Date", "RegExp",
  "Error", "TypeError", "RangeError", "Promise", "Set", "Map", "WeakMap", "Symbol",
  "Function", "Intl", "Infinity", "NaN", "undefined", "globalThis", "self",
  "isNaN", "isFinite", "parseInt", "parseFloat", "encodeURIComponent",
  "decodeURIComponent", "structuredClone", "performance", "alert", "confirm"
]);

function soubory(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? soubory(path.join(dir, e.name))
      : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []);
}

/* Jména zavedená jedním uzlem (deklarace, parametr, destrukturace). */
function jmenaVzoru(uzel, kam) {
  if (!uzel) return;
  switch (uzel.type) {
    case "Identifier": kam.add(uzel.name); break;
    case "ObjectPattern": uzel.properties.forEach((p) =>
      jmenaVzoru(p.type === "RestElement" ? p.argument : p.value, kam)); break;
    case "ArrayPattern": uzel.elements.forEach((el) => jmenaVzoru(el, kam)); break;
    case "AssignmentPattern": jmenaVzoru(uzel.left, kam); break;
    case "RestElement": jmenaVzoru(uzel.argument, kam); break;
  }
}

/* var a function se vytahují na začátek funkce, let/const/parametry patří
   svému bloku. Kdo tohle nerozliší, hlásí falešně. */
function zavedeneV(uzel) {
  const kam = new Set();
  if (uzel.type === "VariableDeclaration") uzel.declarations.forEach((d) => jmenaVzoru(d.id, kam));
  if (uzel.type === "FunctionDeclaration" || uzel.type === "ClassDeclaration") jmenaVzoru(uzel.id, kam);
  if (uzel.type === "ImportDeclaration") uzel.specifiers.forEach((s) => jmenaVzoru(s.local, kam));
  return kam;
}

function volnaJmena(zdroj) {
  const strom = acorn.parse(zdroj, { ecmaVersion: 2022, sourceType: "module", locations: true });
  const volna = new Map();

  /* Rozsah: [množina jmen, rodič]. Hledá se odspoda nahoru. */
  const koren = { jmena: new Set(), rodic: null };
  function zna(rozsah, jm) {
    for (let r = rozsah; r; r = r.rodic) if (r.jmena.has(jm)) return true;
    return false;
  }
  function sbirejHoisted(telo, kam) {
    /* var a function declarations z celého podstromu funkce, bez vnoření
       do dalších funkcí */
    walk.recursive(telo, null, {
      Function() {},                      /* dovnitř jiné funkce nechodit */
      VariableDeclaration(n, st, c) { if (n.kind === "var") jmenaVzoru(n.declarations[0].id, kam),
        n.declarations.forEach((d) => jmenaVzoru(d.id, kam)); },
      FunctionDeclaration(n) { jmenaVzoru(n.id, kam); },
      ClassDeclaration(n) { jmenaVzoru(n.id, kam); }
    });
  }

  function projdi(uzel, rozsah) {
    if (!uzel || typeof uzel.type !== "string") return;

    if (uzel.type === "Identifier") {
      if (!zna(rozsah, uzel.name) && !GLOBALY.has(uzel.name)) {
        const k = uzel.name;
        if (!volna.has(k)) volna.set(k, { pocet: 0, radek: uzel.loc.start.line });
        volna.get(k).pocet++;
      }
      return;
    }

    /* Nový rozsah u funkcí a bloků */
    let vlastni = rozsah;
    if (/Function/.test(uzel.type)) {
      vlastni = { jmena: new Set(), rodic: rozsah };
      uzel.params.forEach((p) => jmenaVzoru(p, vlastni.jmena));
      if (uzel.id) jmenaVzoru(uzel.id, vlastni.jmena);
      vlastni.jmena.add("arguments");
      vlastni.jmena.add("this");
      if (uzel.body.type === "BlockStatement") sbirejHoisted(uzel.body, vlastni.jmena);
    } else if (uzel.type === "BlockStatement" || uzel.type === "Program") {
      vlastni = { jmena: new Set(), rodic: rozsah };
      uzel.body.forEach((s) => zavedeneV(s).forEach((n) => vlastni.jmena.add(n)));
    } else if (uzel.type === "CatchClause") {
      vlastni = { jmena: new Set(), rodic: rozsah };
      jmenaVzoru(uzel.param, vlastni.jmena);
    } else if (uzel.type === "ForStatement" || uzel.type === "ForInStatement" ||
               uzel.type === "ForOfStatement") {
      vlastni = { jmena: new Set(), rodic: rozsah };
      const init = uzel.init || uzel.left;
      if (init && init.type === "VariableDeclaration") zavedeneV(init).forEach((n) => vlastni.jmena.add(n));
    }

    for (const klic of Object.keys(uzel)) {
      if (klic === "loc" || klic === "start" || klic === "end" || klic === "type") continue;
      /* u a.b se čte jen `a`; u {a: 1} jen hodnota */
      if (uzel.type === "MemberExpression" && klic === "property" && !uzel.computed) continue;
      if (uzel.type === "Property" && klic === "key" && !uzel.computed) continue;
      if (uzel.type === "ImportDeclaration") continue;
      if (uzel.type === "ExportNamedDeclaration" && !uzel.declaration) continue;
      const h = uzel[klic];
      if (Array.isArray(h)) h.forEach((x) => projdi(x, vlastni));
      else if (h && typeof h === "object") projdi(h, vlastni);
    }
  }

  /* Program: nejdřív posbírat vše, co soubor zavádí na nejvyšší úrovni */
  strom.body.forEach((s) => zavedeneV(s).forEach((n) => koren.jmena.add(n)));
  sbirejHoisted(strom, koren.jmena);
  strom.body.forEach((s) => projdi(s, koren));
  return volna;
}

let nalezu = 0;
for (const f of soubory(JS)) {
  const volna = volnaJmena(fs.readFileSync(f, "utf8"));
  if (!volna.size) continue;
  nalezu += volna.size;
  console.log("\n" + path.relative(JS, f).replace(/\\/g, "/"));
  for (const [n, i] of [...volna].sort((a, b) => a[1].radek - b[1].radek)) {
    console.log("  řádek " + String(i.radek).padStart(4) + "   " + n + "   (" + i.pocet + "x)");
  }
}

console.log(nalezu ? "\n" + nalezu + " jmen bez původu — chybí import?"
                   : "\nvšechna jména mají původ");
process.exit(nalezu ? 1 : 0);
