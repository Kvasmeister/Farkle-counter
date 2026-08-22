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
      /* stahni() dává jméno souboru přes a.download, ne přes blob — jen
         zachytit, ne doopravdy kliknout (žádná navigace v jsdom). */
      w.__downloadName = null;
      w.HTMLAnchorElement.prototype.click = function(){ w.__downloadName = this.download; };
    }});
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles:true }));
  return { w, d, $, klik,
    rezimy: () => JSON.parse(w.localStorage.getItem("farkle-rezimy-v1") || "null"),
    /* Výběr ke sdílení běží přímo v hlavním seznamu (#rezrows), ne v
       samostatném panelu — řádek podle jména v <b>, stejná stavba jako
       normální řádek (rezRadek()/kombPopis()), jen s jiným obsahem tlačítek. */
    radekSdil(nazev){
      return [...d.querySelectorAll("#rezrows .setrow")]
        .find(r => r.querySelector("b").textContent === nazev);
    },
    vyberKesdileni(nazev){ klik(this.radekSdil(nazev).querySelector(".setbtns button")); },
    /* Volba importu (Vybrat soubor / Vložit text) sedí v liště, vkládací
       pole (#rezimppastedock) je dokované nad ní. */
    vlozAnacti(text){
      klik($("rezakcimp"));
      klik($("rezimptext"));
      $("rezimppastearea").value = text;
      klik($("rezimppasteload"));
    },
    nahledRadky(){ return [...$("rezimppreviewrows").children].map(x => x.textContent); },
    toastText(){ return $("toasttext").textContent; },
    toastVidet(){ return $("toast").hidden === false; },
    toastSpatne(){ return $("toast").classList.contains("bad"); }
  };
}

console.log("A) sdílet: bez výběru se nic nevygeneruje");
let a = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
a.klik(a.$("setbtn"));
a.klik(a.$("setseg").children[1]);
a.klik(a.$("rezakcsdil"));
ok(a.radekSdil("Moje pravidla").querySelectorAll(".setbtns button").length === 1,
   "v režimu výběru má řádek jedno tlačítko místo tří");
a.klik(a.$("rezakcstahni"));
ok(a.w.__blob === null, "žádný soubor nevznikl");
ok(a.toastVidet() && /Vyber aspoň jeden/.test(a.toastText()) && a.toastSpatne(),
   "chyba přes popup: " + a.toastText());
a.klik(a.$("toastx"));   // popup jde zavřít křížkem — a B potřebuje čistý stav

console.log("B) sdílet: vybraný vlastní i přednastavený režim jdou do souboru, jméno nese i čas");
a.vyberKesdileni("Moje pravidla");
a.vyberKesdileni("KCD");
a.klik(a.$("rezakcstahni"));
ok(a.w.__blob !== null, "soubor vznikl");
ok(/^farkle-rezimy-sdileni-\d{4}-\d{2}-\d{2}-\d{4}\.txt$/.test(a.w.__downloadName),
   "jméno souboru nese datum i čas na minuty: " + a.w.__downloadName);
const textSdil = await a.w.__blob.text();
ok(/^Kostky — sdílené herní režimy/.test(textSdil), "hlavička souboru");
ok(/1\) .*(Moje pravidla|KCD)/.test(textSdil) && /2\) .*(Moje pravidla|KCD)/.test(textSdil),
   "oba vybrané jsou vyjmenovaní: " + textSdil.split("\n").slice(0,4).join(" | "));
const dataSdil = JSON.parse(textSdil.slice(textSdil.indexOf("#SDILENIREZIMU:") + "#SDILENIREZIMU:".length));
ok(dataSdil.length === 2, "v datech jsou dva režimy, je " + dataSdil.length);
ok(dataSdil.some(r => r.nazev === "Moje pravidla") && dataSdil.some(r => r.nazev === "KCD"),
   "jméno přednastaveného je taky materializované do dat");
ok(a.$("rezakcnormal").hidden === false && a.$("rezakcvyber").hidden === true,
   "úspěšné uložení vrátilo lištu na Sdílet/Importovat");
ok(a.radekSdil("Moje pravidla").querySelectorAll(".setbtns button").length === 3,
   "a řádek zase má Pravidla/Upravit/Zvolit");
ok(!a.toastVidet(), "úspěšné stažení už žádnou hlášku negeneruje");

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
ok(!b.toastVidet(), "úspěšný import už žádnou hlášku negeneruje");

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
ok(!f.toastVidet(), "úspěšný import (i částečný) žádnou hlášku negeneruje");

console.log("H) importovat: samé duplicity nepřidá nic a řekne to přes popup");
let g = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
g.klik(g.$("setbtn"));
g.klik(g.$("setseg").children[1]);
g.vlozAnacti(marker([FUNKCNE_STEJNE_JAKO_MOJE, STEJNE_JAKO_KCD]));
g.klik(g.$("rezimppotvrdit"));
ok(g.rezimy().v.length === 1, "nic nepřibylo");
ok(g.toastVidet() && /Nic k importu/.test(g.toastText()) && g.toastSpatne(),
   "hláška přes popup: " + g.toastText());

console.log("I) otevření nastavení vynuluje výběr, volbu importu i vkládací pole");
let h = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
h.klik(h.$("setbtn"));
h.klik(h.$("setseg").children[1]);
h.klik(h.$("rezakcsdil"));
h.vyberKesdileni("Moje pravidla");
h.vlozAnacti(marker([NOVY_RUZNY]));
h.klik(h.$("setmodal").querySelector(".modalx"));
h.klik(h.$("setbtn"));
ok(h.$("rezakcvyber").hidden && h.$("rezakcimpvolba").hidden && h.$("rezimppastedock").hidden,
   "všechny tři vedlejší stavy lišty/dokovaného pole zase zavřené");
ok(h.$("rezakcnormal").hidden === false, "lišta zpátky na Sdílet/Importovat");

console.log("J) karta Herní režimy ukáže lištu hned, bez nutnosti projít detailem");
let i = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
i.klik(i.$("setbtn"));
i.klik(i.$("setseg").children[1]);
ok(i.$("rezakcpruh").hidden === false, "lišta je vidět rovnou nad seznamem — dřív se ukázala až po Upravit/Přidat");

console.log("K) Přidat vlastní režim je při výběru ke sdílení celý schovaný");
let j = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
j.klik(j.$("setbtn"));
j.klik(j.$("setseg").children[1]);
ok(!j.$("reznovyrow").hidden, "mimo výběr je řádek vidět");
j.klik(j.$("rezakcsdil"));
ok(j.$("reznovyrow").hidden, "v režimu výběru je celý řádek schovaný, ne jen zamčené tlačítko");
j.klik(j.$("rezakczrusit"));
ok(!j.$("reznovyrow").hidden, "po zrušení výběru je řádek zase vidět");

console.log("L) volba importu je v liště, vkládací pole nad ní, Zrušit se vrátí do normálu");
let k = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
k.klik(k.$("setbtn"));
k.klik(k.$("setseg").children[1]);
k.klik(k.$("rezakcimp"));
ok(k.$("rezakcimpvolba").hidden === false && k.$("rezakcnormal").hidden === true,
   "Importovat přepne lištu na Vybrat soubor/Vložit text/Zrušit");
ok(k.$("rezimppastedock").hidden, "vkládací pole se samo neotevře");
k.klik(k.$("rezimptext"));
ok(!k.$("rezimppastedock").hidden, "Vložit text otevře dokované pole nad lištou");
k.klik(k.$("rezimpvolbazrusit"));
ok(k.$("rezakcnormal").hidden === false && k.$("rezakcimpvolba").hidden,
   "Zrušit v liště vrátí normální dvojici Sdílet/Importovat");
ok(k.$("rezimppastedock").hidden, "a zavře i dokované pole, kdyby zůstalo otevřené");

console.log("M) výběr ke sdílení a volba importu se vzájemně vylučují");
let l = app({ rezimy:{ akt:"kcd2", p:{}, v:[MOJE_PRAVIDLA] } });
l.klik(l.$("setbtn"));
l.klik(l.$("setseg").children[1]);
l.klik(l.$("rezakcimp"));
ok(!l.$("rezakcimpvolba").hidden, "volba importu otevřená");
l.klik(l.$("rezakcsdil"));
ok(l.$("rezakcimpvolba").hidden, "spuštění výběru ke sdílení zavře volbu importu");
ok(!l.$("rezakcvyber").hidden, "a přepne lištu na Uložit/Kopírovat/Zrušit");
l.klik(l.$("rezakcimp"));
ok(l.$("rezakcvyber").hidden, "otevření importu naopak ukončí výběr");
ok(!l.$("rezakcimpvolba").hidden, "a znovu otevře volbu importu");

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
