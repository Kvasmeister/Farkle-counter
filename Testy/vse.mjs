/* Spouštěč všech testovacích sad.

   Dřív se pouštěly po jedné ručně. Sady jsou samostatné procesy schválně:
   každá si staví vlastní jsdom a sada 10 navíc fake-indexeddb, takže sdílený
   proces by je zamotal dohromady.

   Běží sekvenčně, ne paralelně: výstup by se jinak proplétal a u 19 sad
   by se v něm nedalo nic najít. Souhrn na konci je to, co se čte.

   node Testy/vse.mjs           všechny sady
   node Testy/vse.mjs 18 19     jen vyjmenované
*/
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const slozka = fileURLToPath(new URL(".", import.meta.url));
const vybrane = process.argv.slice(2);

const sady = fs.readdirSync(slozka)
  .filter((f) => /^\d\d-.*\.mjs$/.test(f))
  .sort()
  .filter((f) => !vybrane.length || vybrane.some((v) => f.startsWith(String(v).padStart(2, "0"))));

if (!sady.length) {
  console.error("žádná sada neodpovídá:", vybrane.join(" "));
  process.exit(2);
}

/* Sada se pouští v adresáři projektu, ne v Testy/ — index.html se hledá
   relativně k souboru testu, takže na tom nezáleží, ale ať je to zjevné. */
function spust(soubor) {
  return new Promise((hotovo) => {
    const start = Date.now();
    const p = spawn(process.execPath, [path.join(slozka, soubor)], {
      cwd: path.resolve(slozka, ".."),
      stdio: ["ignore", "pipe", "pipe"]
    });
    let out = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { out += d; });
    p.on("close", (kod) => hotovo({ soubor, kod, out, ms: Date.now() - start }));
  });
}

const vysledky = [];
for (const s of sady) {
  process.stdout.write(`… ${s}`);
  const v = await spust(s);
  vysledky.push(v);
  const ok = (v.out.match(/^\s*ok:/gm) || []).length;
  const chyb = (v.out.match(/^\s*CHYBA:/gm) || []).length;
  v.ok = ok; v.chyb = chyb;
  process.stdout.write(`\r${v.kod === 0 ? "✓" : "✗"} ${s.padEnd(24)} ${String(ok).padStart(4)} kontrol` +
    (chyb ? `  ${chyb} CHYB` : "") + `  ${(v.ms / 1000).toFixed(1)} s\n`);
}

/* Výpis padlých sad až na konci: co spadlo, má být poslední, co je vidět. */
const padle = vysledky.filter((v) => v.kod !== 0);
for (const v of padle) {
  console.log(`\n──── ${v.soubor} ────`);
  const radky = v.out.split("\n");
  radky.forEach((r, i) => {
    if (/^\s*CHYBA:/.test(r)) console.log(radky[i - 1] && /^[A-Z]\)/.test(radky[i - 1]) ? radky[i - 1] : "", r);
  });
  if (!/CHYBA:/.test(v.out)) console.log(v.out.slice(-2000));
}

const celkem = vysledky.reduce((a, v) => a + v.ok, 0);
const chyb = vysledky.reduce((a, v) => a + v.chyb, 0);
const cas = vysledky.reduce((a, v) => a + v.ms, 0) / 1000;
console.log(`\n${vysledky.length} sad · ${celkem} kontrol · ${cas.toFixed(1)} s`);
console.log(padle.length ? `${padle.length} sad spadlo, ${chyb} CHYB` : "vše prošlo");
process.exit(padle.length ? 1 : 0);
