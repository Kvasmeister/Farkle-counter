/* Nasazení na GitHub Pages jedním příkazem.

   npm run deploy -- -m "co se změnilo"

   Postupně: složí index.html, ověří importy, pustí všech 20 sad, zkontroluje
   číslo verze proti nasazenému stavu, teprve pak commitne a pushne.

   Proč kontrola verze: `SOUBORY` se cachují pod jménem VERZE a service
   worker se aktivuje až podle ní. Nasadit nový index.html se starým číslem
   znamená, že zařízení, která už appku mají, si nechají tu svou — a nikdo
   nepozná proč. VERZE zvyšuje MAJITEL PROJEKTU, ne skript; tenhle jen
   odmítne pustit deploy, když se zapomnělo.
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

function krok(popis, fn) {
  process.stdout.write("  " + popis.padEnd(22, ".") + " ");
  try {
    const v = fn();
    console.log(v || "ok");
  } catch (e) {
    console.log("SELHALO");
    const out = (e.stdout || "") + (e.stderr || "");
    if (out) console.error("\n" + out.toString().slice(-3000));
    else console.error("\n" + e.message);
    process.exit(1);
  }
}

const node = (skript, ...a) =>
  execFileSync(process.execPath, [skript, ...a], { encoding: "utf8" });

console.log("");
krok("build", () => {
  const v = node("build.mjs");
  return v.trim().replace("index.html složen: ", "");
});
krok("kontrola importů", () => { node("Testy/kontrola-modulu.mjs"); });
krok("testy", () => {
  const v = node("Testy/vse.mjs");
  const m = /(\d+) sad · (\d+) kontrol/.exec(v);
  if (!/vše prošlo/.test(v)) throw new Error(v.slice(-2000));
  return m ? m[1] + " sad, " + m[2] + " kontrol" : "prošly";
});

/* ---- verze proti nasazenému stavu ---- */
function verzeZ(text) {
  const m = /const VERZE = "([^"]+)"/.exec(text);
  return m ? m[1] : null;
}
let nasazenaVerze = null, nasazenyIndex = null;
krok("stav na GitHubu", () => {
  execSync("git fetch -q origin", { stdio: "pipe" });
  try {
    nasazenaVerze = verzeZ(execSync("git show origin/main:sw.js", { encoding: "utf8" }));
    nasazenyIndex = execSync("git rev-parse origin/main:index.html", { encoding: "utf8" }).trim();
  } catch (e) { /* první nasazení */ }
  return nasazenaVerze || "(zatím nic)";
});

const mistniVerze = verzeZ(fs.readFileSync("sw.js", "utf8"));
const mistniIndex = execSync("git hash-object index.html", { encoding: "utf8" }).trim();
const indexSeZmenil = nasazenyIndex && mistniIndex !== nasazenyIndex;

krok("verze", () => {
  if (indexSeZmenil && mistniVerze === nasazenaVerze && !stejnaVerze) {
    throw new Error(
      "index.html se změnil, ale VERZE zůstala " + mistniVerze + ".\n\n" +
      "Zařízení, která aplikaci už mají, si nechají tu svou a nikdo nepozná proč.\n" +
      "Zvyš VERZE v sw.js (majitel projektu, ne skript), nebo — pokud je to\n" +
      "opravdu záměr — pusť znovu s  --stejna-verze.");
    }
  if (!indexSeZmenil) return mistniVerze + " (index.html beze změny)";
  return nasazenaVerze + " -> " + mistniVerze;
});

/* ---- commit a push ---- */
const zmeny = execSync("git status --porcelain", { encoding: "utf8" }).trim();
if (zmeny) {
  if (!zprava) {
    console.error('\nNecommitnuté změny:\n' + zmeny.split("\n").map((r) => "  " + r).join("\n"));
    console.error('\nPřidej zprávu:  npm run deploy -- -m "co se změnilo"');
    process.exit(1);
  }
  krok("commit", () => {
    execSync("git add -A", { stdio: "pipe" });
    execFileSync("git", ["commit", "-m", zprava], { stdio: "pipe" });
    return execSync("git log --oneline -1", { encoding: "utf8" }).trim();
  });
} else {
  console.log("  commit ................ (není co commitovat)");
}

const kPushnuti = execSync("git rev-list --count origin/main..HEAD", { encoding: "utf8" }).trim();
if (kPushnuti === "0") {
  console.log("  push .................. (nic nového, GitHub je aktuální)\n");
  process.exit(0);
}
krok("push (" + kPushnuti + " commitů)", () => {
  execSync("git push origin main", { stdio: "pipe" });
  return "main -> origin";
});

console.log("\n  https://kvasmeister.github.io/Farkle-counter/");
console.log("  Pages přestaví web zhruba do minuty.\n");
