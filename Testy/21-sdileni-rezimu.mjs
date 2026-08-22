import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

/* Vlastní režim v cílové aplikaci, se kterým se testy porovnávají — sazba za
   jedničku (150) je záměrně jiná než u všech tří přednastavených, aby žádné
   srovnání níž nesplynulo s presetem omylem. */
const MOJE_PRAVIDLA = { id:"rmoje", nazev:"Moje pravidla", kostek:6,
  sam:[0,150,0,0,0,50,0], stej:{3:[0,1000,200,300,400,500,600]}, rozs:false,
  nad:"x2", nadP:[0,0,0,1000,1000,2000,3000],
  post:{"15":500,"26":750,"16":1500}, p:{}, v:[] };

/* Sdílená data — tvar, jaký posílá venRezimSdileny(): plný režim, id se
   nečte vůbec, jméno u presetu i vlastního je vždycky materializované. */
const NOVY_RUZNY = { nazev:"Turnajová pravidla", kostek:6,
  sam:[0,200,0,0,0,100,0], stej:{3:[0,1000,200,300,400,500,600]}, rozs:false,
  nad:"x2", nadP:[0,0,0,1000,1000,2000,3000],
  post:{"15":500,"26":750,"16":1500}, p:{}, v:[] };
const STEJNE_JMENO_JINA_PRAVIDLA = { nazev:"Moje pravidla", kostek:6,
  sam:[0,175,0,0,0,50,0], stej:{3:[0,1000,200,300,400,500,600]}, rozs:false,
  nad:"x2", nadP:[0,0,0,1000,1000,2000,3000],
  post:{"15":500,"26":750,"16":1500}, p:{}, v:[] };
const FUNKCNE_STEJNE_JAKO_MOJE = { nazev:"Kopie", kostek:6,
  sam:[0,150,0,0,0,50,0], stej:{3:[0,1000,200,300,400,500,600]}, rozs:false,
  nad:"x2", nadP:[0,0,0,1000,1000,2000,3000],
  post:{"15":500,"26":750,"16":1500}, p:{}, v:[] };
const STEJNE_JAKO_KCD = { nazev:"Sdílené KCD", kostek:6,
  sam:[0,100,0,0,0,50,0], stej:{3:[0,1000,200,300,400,500,600]}, rozs:false,
  nad:"x2", nadP:[0,0,0,1000,1000,2000,3000],
  post:{"15":500,"26":750,"16":1500}, p:{}, v:[] };

function marker(pole){ return "Kostky — sdílené herní režimy\n#SDILENIREZIMU:" + JSON.stringify(pole); }

function app(opt){
  opt = opt || {};
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts:"dangerously", pretendToBeVisual:true, url:"https://x.test/",
    virtualConsole: vc,
    beforeParse(w){
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      if(opt.rezimy) w.localStorage.setItem("farkle-rezimy-v1", JSON.stringify(opt.rezimy));
      w.__blob = null;
      w.URL.createObjectURL = b => { w.__blob = b; return "blob:test"; };
      w.URL.revokeObjectURL = () => {};
    }});
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles:true }));
  return { w, d, $, klik,
    rezimy: () => JSON.parse(w.localStorage.getItem("farkle-rezimy-v1") || "null"),
    /* Řádek výběru ke sdílení podle názvu — renderSdilRows() staví jeden
       .setrow na režim, se jménem v <b> a přepínacím tlačítkem vedle. */
    radekSdil(nazev){
      return [...d.querySelectorAll("#rezsdilrows .setrow")]
        .find(r => r.querySelector("b").textContent === nazev);
    },
    vyberKesdileni(nazev){ klik(this.radekSdil(nazev).querySelector(".setbtns button")); },
    vlozAnacti(text){
      klik($("rezimpbtn"));
      klik($("rezimppastebtn"));
      $("rezimppastearea").value = text;
      klik($("rezimppasteload"));
    },
    nahledRadky(){ return [...$("rezimppreviewrows").children].map(x => x.textContent); }
  };
}

console.log("A) sdílet: bez výběru se nic nevygeneruje");
let a = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
a.klik(a.$("setbtn"));
a.klik(a.$("setseg").children[1]);
a.klik(a.$("rezsdilbtn"));
a.klik(a.$("rezsdilstahni"));
ok(a.w.__blob === null, "žádný soubor nevznikl");
ok(/Vyber aspoň jeden/.test(a.$("rezsdilzprava").textContent), "hláška: " + a.$("rezsdilzprava").textContent);

console.log("B) sdílet: vybraný vlastní i přednastavený režim jdou do souboru");
a.vyberKesdileni("Moje pravidla");
a.vyberKesdileni("KCD");
a.klik(a.$("rezsdilstahni"));
ok(a.w.__blob !== null, "soubor vznikl");
const textSdil = await a.w.__blob.text();
ok(/^Kostky — sdílené herní režimy/.test(textSdil), "hlavička souboru");
ok(/1\) .*(Moje pravidla|KCD)/.test(textSdil) && /2\) .*(Moje pravidla|KCD)/.test(textSdil),
   "oba vybrané jsou vyjmenovaní: " + textSdil.split("\n").slice(0,4).join(" | "));
const dataSdil = JSON.parse(textSdil.slice(textSdil.indexOf("#SDILENIREZIMU:") + "#SDILENIREZIMU:".length));
ok(dataSdil.length === 2, "v datech jsou dva režimy, je " + dataSdil.length);
ok(dataSdil.some(r => r.nazev === "Moje pravidla") && dataSdil.some(r => r.nazev === "KCD"),
   "jméno přednastaveného je taky materializované do dat");

console.log("C) importovat: nový odlišný režim se přijme beze změny jména");
let b = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
b.klik(b.$("setbtn"));
b.klik(b.$("setseg").children[1]);
b.vlozAnacti(marker([NOVY_RUZNY]));
ok(!b.$("rezimppreview").hidden, "náhled se ukázal");
ok(b.nahledRadky().some(t => t === "Turnajová pravidla"), "jméno beze změny: " + b.nahledRadky().join(" | "));
ok(!b.$("rezimppotvrdit").disabled, "potvrzovací tlačítko je aktivní");
b.klik(b.$("rezimppotvrdit"));
ok(b.rezimy().v.some(r => r.nazev === "Turnajová pravidla"), "režim přibyl");
ok(/Přidán 1 režim\./.test(b.$("rezimpzprava").textContent), "hláška: " + b.$("rezimpzprava").textContent);

console.log("D) importovat: shoda jména, jiná pravidla → přejmenuje se");
let c = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
c.klik(c.$("setbtn"));
c.klik(c.$("setseg").children[1]);
c.vlozAnacti(marker([STEJNE_JMENO_JINA_PRAVIDLA]));
ok(c.nahledRadky().some(t => /^Moje pravidla \(IMPORT - .+\)/.test(t)), "náhled ukazuje přejmenování: " + c.nahledRadky().join(" | "));
c.klik(c.$("rezimppotvrdit"));
const importovany = c.rezimy().v.find(r => r.nazev !== "Moje pravidla");
ok(importovany && /^Moje pravidla \(IMPORT - .+\)/.test(importovany.nazev),
   "uložený režim nese přejmenované jméno: " + (importovany && importovany.nazev));
ok(c.rezimy().v.some(r => r.nazev === "Moje pravidla"), "původní režim zůstal nedotčený");
ok(c.rezimy().v.length === 2, "přibyl jako druhý, celkem " + c.rezimy().v.length);

console.log("E) importovat: funkčně totožný s existujícím vlastním se odmítne");
let d = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
d.klik(d.$("setbtn"));
d.klik(d.$("setseg").children[1]);
d.vlozAnacti(marker([FUNKCNE_STEJNE_JAKO_MOJE]));
ok(d.nahledRadky().some(t => /Kopie/.test(t) && /Moje pravidla/.test(t)),
   "náhled vysvětlí shodu s existujícím: " + d.nahledRadky().join(" | "));
ok(d.$("rezimppotvrdit").disabled, "potvrdit je zamčené, nic se nedá přijmout");
d.klik(d.$("rezimppotvrdit"));
ok(d.rezimy().v.length === 1, "nic nepřibylo, pořád jeden vlastní režim");

console.log("F) importovat: funkčně totožný s přednastaveným (KCD) se taky odmítne");
let e = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
e.klik(e.$("setbtn"));
e.klik(e.$("setseg").children[1]);
e.vlozAnacti(marker([STEJNE_JAKO_KCD]));
ok(e.nahledRadky().some(t => /Sdílené KCD/.test(t) && /KCD/.test(t)),
   "náhled jmenuje kolidující přednastavený režim: " + e.nahledRadky().join(" | "));
e.klik(e.$("rezimppotvrdit"));
ok(e.rezimy().v.length === 1, "nic nepřibylo — shoda s presetem taky počítá");

console.log("G) importovat: víc položek najednou, různé osudy zvlášť");
let f = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
f.klik(f.$("setbtn"));
f.klik(f.$("setseg").children[1]);
f.vlozAnacti(marker([NOVY_RUZNY, FUNKCNE_STEJNE_JAKO_MOJE, STEJNE_JMENO_JINA_PRAVIDLA]));
ok(f.nahledRadky().length === 3, "tři řádky náhledu, je " + f.nahledRadky().length);
f.klik(f.$("rezimppotvrdit"));
ok(f.rezimy().v.length === 3, "přijaly se dvě z tří (plus původní), je " + f.rezimy().v.length);
ok(/Přidány 2 režimy\./.test(f.$("rezimpzprava").textContent), "hláška: " + f.$("rezimpzprava").textContent);

console.log("H) importovat: samé duplicity nepřidá nic a řekne to");
let g = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
g.klik(g.$("setbtn"));
g.klik(g.$("setseg").children[1]);
g.vlozAnacti(marker([FUNKCNE_STEJNE_JAKO_MOJE, STEJNE_JAKO_KCD]));
g.klik(g.$("rezimppotvrdit"));
ok(g.rezimy().v.length === 1, "nic nepřibylo");
ok(/Nic k importu/.test(g.$("rezimpzprava").textContent), "hláška: " + g.$("rezimpzprava").textContent);

console.log("I) otevření nastavení oba panely zavře a vynuluje");
let h = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
h.klik(h.$("setbtn"));
h.klik(h.$("setseg").children[1]);
h.klik(h.$("rezsdilbtn"));
h.vyberKesdileni("Moje pravidla");
h.vlozAnacti(marker([NOVY_RUZNY]));
h.klik(h.$("setmodal").querySelector(".modalx"));
h.klik(h.$("setbtn"));
ok(h.$("rezsdilbox").hidden && h.$("rezimpbox").hidden, "oba panely zase zavřené");

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
