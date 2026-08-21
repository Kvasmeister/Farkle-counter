/* Nasazení na GitHub Pages jedním příkazem.

   npm run deploy -- -m "co se změnilo"
   npm run deploy -- --zkouska          projde všechno, ale nic neodešle

   Postupně: složí index.html, ověří importy, pustí všech 20 sad, zkontroluje
   číslo verze proti nasazenému stavu, teprve pak commitne a pushne. Když
   kterýkoli krok selže, neodešle se nic.

   VERZE SE ZVYŠUJE TADY, v sw.js — ne ve web UI GitHubu. Od napojení repa je
   GitHub cíl, ne místo, kde se edituje: úprava udělaná tam vytvoří commit,
   který lokálně není, push se odmítne jako non-fast-forward, a lokální sw.js
   by navíc poslal číslo verze zpátky.

   Proč se verze hlídá: `SOUBORY` se cachují pod jménem VERZE a service worker
   se aktivuje až podle ní. Nasadit nový index.html se starým číslem znamená,
   že zařízení, která aplikaci už mají, si nechají tu svou — a nikdo nepozná
   proč. Skript verzi NEZVYŠUJE, jen odmítne pustit deploy, když se zapomnělo.
*/
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOREN = path.join(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(KOREN);

const args = process.argv.slice(2);
const iZpravy = args.findIndex((a) => a === "-m" || a === "--zprava");
const zprava = iZpravy >= 0 ? args[iZpravy + 1] : null;
const stejnaVerze = args.includes("--stejna-verze");
const zkouska = args.includes("--zkouska");

function krok(popis, fn) {
  process.stdout.write("  " + popis.padEnd(22, ".") + " ");
  try {
    const v = fn();
    console.log(v || "ok");
  } catch (e) {
    console.log("SELHALO");
    const out = (e.stdout || "") + (e.stderr || "");
    console.error("");
    console.error(out ? out.toString().slice(-3000) : e.message);
    process.exit(1);
  }
}

const node = (skript, ...a) =>
  execFileSync(process.execPath, [skript, ...a], { encoding: "utf8" });
const git = (prikaz) => execSync(prikaz, { encoding: "utf8" }).trim();

console.log("");
krok("build", () => node("build.mjs").trim().replace("index.html složen: ", ""));
krok("kontrola importů", () => { node("Testy/kontrola-modulu.mjs"); });
krok("testy", () => {
  const v = node("Testy/vse.mjs");
  if (!/vše prošlo/.test(v)) throw new Error(v.slice(-2000));
  const m = /(\d+) sad · (\d+) kontrol/.exec(v);
  return m ? m[1] + " sad, " + m[2] + " kontrol" : "prošly";
});

/* ---- verze proti nasazenému stavu ---- */
function verzeZ(text) {
  const m = /const VERZE = "([^"]+)"/.exec(text);
  return m ? m[1] : null;
}

let nasazenaVerze = null;
let nasazenyIndex = null;
krok("stav na GitHubu", () => {
  execSync("git fetch -q origin", { stdio: "pipe" });
  try {
    nasazenaVerze = verzeZ(git("git show origin/main:sw.js"));
    nasazenyIndex = git("git rev-parse origin/main:index.html");
  } catch (e) { /* první nasazení, na dálku ještě nic není */ }
  return nasazenaVerze || "(zatím nic)";
});

const mistniVerze = verzeZ(fs.readFileSync("sw.js", "utf8"));
const mistniIndex = git("git hash-object index.html");
const indexSeZmenil = nasazenyIndex && mistniIndex !== nasazenyIndex;

krok("verze", () => {
  if (indexSeZmenil && mistniVerze === nasazenaVerze && !stejnaVerze) {
    throw new Error([
      "index.html se změnil, ale VERZE zůstala " + mistniVerze + ".",
      "",
      "Zařízení, která aplikaci už mají, si nechají tu svou a nikdo nepozná proč.",
      "Zvyš VERZE v sw.js (majitel projektu, ne skript), nebo — pokud je to",
      "opravdu záměr — pusť znovu s  --stejna-verze."
    ].join("\n"));
  }
  if (!indexSeZmenil) return mistniVerze + " (index.html beze změny)";
  return nasazenaVerze + " -> " + mistniVerze;
});

/* ---- commit a push ---- */
const zmeny = git("git status --porcelain");
const pocetZmen = zmeny ? zmeny.split("\n").length : 0;

if (zkouska) {
  console.log("  commit ................ nanečisto" +
    (pocetZmen ? " (" + pocetZmen + " změněných souborů)" : " (není co commitovat)"));
  console.log("  push .................. nanečisto (" +
    git("git rev-list --count origin/main..HEAD") + " commitů by odešlo)");
  console.log("");
  console.log("  Nic se neodeslalo. Naostro:  npm run deploy -- -m \"zpráva\"");
  console.log("");
  process.exit(0);
}

if (pocetZmen) {
  if (!zprava) {
    console.error("");
    console.error("Necommitnuté změny:");
    console.error(zmeny.split("\n").map((r) => "  " + r).join("\n"));
    console.error("");
    console.error("Přidej zprávu:  npm run deploy -- -m \"co se změnilo\"");
    process.exit(1);
  }
  krok("commit", () => {
    execSync("git add -A", { stdio: "pipe" });
    execFileSync("git", ["commit", "-m", zprava], { stdio: "pipe" });
    return git("git log --oneline -1");
  });
} else {
  console.log("  commit ................ (není co commitovat)");
}

const kPushnuti = git("git rev-list --count origin/main..HEAD");
if (kPushnuti === "0") {
  console.log("  push .................. (nic nového, GitHub je aktuální)");
  console.log("");
  process.exit(0);
}
krok("push (" + kPushnuti + " commitů)", () => {
  execSync("git push origin main", { stdio: "pipe" });
  return "main -> origin";
});

console.log("");
console.log("  https://kvasmeister.github.io/Farkle-counter/");
console.log("  Pages přestaví web zhruba do minuty.");
console.log("");
