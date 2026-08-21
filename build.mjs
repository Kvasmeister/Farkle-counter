/* Skládá nasazovaný index.html ze zdrojů v src/.

   Proč build vůbec je: všech 18 jsdom sad staví DOM z řetězce
   (`new JSDOM(html, …)` bez `resources: "usable"`), takže jsdom nenačte
   `<script src>` a `<script type="module">` neumí vůbec. Kdyby se aplikace
   servírovala jako víc souborů, přišla by o celou testovací síť. Zdroj je
   proto modulární a výstup zůstává jeden soubor — pro testy, pro `SOUBORY`
   v sw.js i pro nahrávání přes GitHub web UI se nemění nic.

   src/index.html je skořápka s řádky `<!--@vloz cesta-->`. Každý takový
   řádek se nahradí obsahem souboru, doslova. Vkládá se po bajtech, nic se
   nepřepisuje ani nepřeformátovává — díky tomu je výstup prvního řezu
   bajt po bajtu shodný s původním ručně psaným index.html.

   node build.mjs            složí index.html
   node build.mjs --kontrola  jen ověří, že by se výstup nezměnil
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = fileURLToPath(new URL(".", import.meta.url));
const SRC = path.join(koren, "src");
const CIL = path.join(koren, "index.html");

const MARKER = /^<!--@vloz (.+?)-->$/;

/* Vkládání je rekurzivní: partial smí vložit další partial. Hlídá se cyklus,
   protože bez toho by se build zacyklil tiše a bez chybové hlášky. */
function slozit(soubor, cesta = []) {
  const plna = path.join(SRC, soubor);
  if (cesta.includes(plna)) {
    throw new Error("cyklus ve vkládání: " + [...cesta, plna].map((p) => path.relative(SRC, p)).join(" → "));
  }
  if (!fs.existsSync(plna)) {
    throw new Error("chybí zdroj: " + soubor + (cesta.length ? "  (vkládaný z " + path.relative(SRC, cesta[cesta.length - 1]) + ")" : ""));
  }
  const text = fs.readFileSync(plna, "utf8");
  return text.split("\n").map((radek) => {
    const m = MARKER.exec(radek);
    if (!m) return radek;
    /* Vložený soubor končí newlinem, marker byl celý řádek — proto se
       zahodí poslední prázdný prvek, jinak by přibyl prázdný řádek. */
    const vlozene = slozit(m[1], [...cesta, plna]);
    return vlozene.endsWith("\n") ? vlozene.slice(0, -1) : vlozene;
  }).join("\n");
}

const vysledek = slozit("index.html");

if (process.argv.includes("--kontrola")) {
  const dnesni = fs.existsSync(CIL) ? fs.readFileSync(CIL, "utf8") : null;
  if (dnesni === vysledek) {
    console.log("index.html je aktuální (" + vysledek.length + " znaků)");
    process.exit(0);
  }
  console.error("index.html NEODPOVÍDÁ zdrojům v src/ — spusť `npm run build`");
  process.exit(1);
}

fs.writeFileSync(CIL, vysledek, "utf8");
console.log("index.html složen: " + Buffer.byteLength(vysledek, "utf8") + " B, " +
  (vysledek.split("\n").length - 1) + " řádků");
