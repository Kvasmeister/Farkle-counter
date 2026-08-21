import { JSDOM } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  CHYBA:", m); } else console.log("  ok:", m); };

function app(seed){
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/",
    beforeParse(w){
      /* návod se při prvním spuštění otevře sám a překryl by okna */
      try { w.localStorage.setItem("farkle-navod-v1", "bez-verze"); } catch(e){}
      try { w.localStorage.setItem("farkle-jazyk-v1", "cs"); } catch(e){}
      if(seed) seed(w);
    } });
  const w = dom.window, d = w.document;
  const $ = id => d.getElementById(id);
  const klik = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return { w, d, $, klik,
    kolo(){ klik(d.querySelector('[data-single="1"]')); klik($("bank")); },
    strana(){ return [0,1,2].findIndex(i => $("tab" + i).getAttribute("aria-selected") === "true"); },
    hist(){ return JSON.parse(w.localStorage.getItem("farkle-hist-v1") || "[]"); },
    kos(){ return JSON.parse(w.localStorage.getItem("farkle-kos-v1") || "[]"); } };
}

console.log("A) tlačítko je pod zápisem do historie a ptá se dvakrát");
{
  const a = app();
  const wrap = a.$("arch").parentNode;
  ok(wrap.contains(a.$("reset")), "Nová hra sedí ve stejném obalu jako zápis do historie");
  ok(wrap.children[0] === a.$("arch") && wrap.children[1] === a.$("reset"), "zápis je nad Novou hrou");
  const hlavicka = a.d.querySelector(".histbtns");
  ok(hlavicka.children.length === 1 && hlavicka.children[0] === a.$("fixturns"),
     "v hlavičce zůstalo jen Opravit, tlačítek " + hlavicka.children.length);

  a.kolo(); a.kolo();
  a.klik(a.$("reset"));
  ok(a.$("reset").textContent === "Opravdu nová?", "druhý stupeň: " + a.$("reset").textContent);
  ok(a.$("newmodal").hidden, "okno se po prvním klepnutí neotvírá");
  ok(a.$("score").textContent === "200", "a hra pořád běží");
}

console.log("B) neuložená hra si vyžádá okno se třemi cestami");
{
  const b = app();
  b.kolo(); b.kolo();
  b.klik(b.$("reset")); b.klik(b.$("reset"));
  ok(!b.$("newmodal").hidden, "okno je otevřené");
  const tl = b.d.querySelector(".newbtns").children;
  ok(tl.length === 3, "tři tlačítka, je " + tl.length);
  ok(tl[0].textContent === "Uložit a začít novou" && tl[1].textContent === "Začít novou bez uložení"
     && tl[2].textContent === "Zpět", "popisky: " + [...tl].map(x => x.textContent).join(" / "));
  ok(/nezapočítá do statistik/.test(b.$("newtext").textContent), "text varuje: " + b.$("newtext").textContent);
  ok(b.$("score").textContent === "200", "hra se zatím nesmazala");
}

console.log("C) Zpět nechá všechno být");
{
  const c = app();
  c.kolo(); c.kolo();
  c.klik(c.$("reset")); c.klik(c.$("reset"));
  c.klik(c.$("newback"));
  ok(c.$("newmodal").hidden, "okno se zavřelo");
  ok(c.$("score").textContent === "200" && c.$("rows").children.length === 2, "hra je celá");
  ok(c.kos().length === 0, "a nic nespadlo do koše");
  ok(c.$("reset").textContent === "Nová hra", "tlačítko je zpátky ve výchozím stavu");
}

console.log("D) Začít novou bez uložení: hra do koše, přesun na počítadlo");
{
  const dd = app();
  dd.kolo(); dd.kolo();
  dd.klik(dd.$("tab1"));
  dd.klik(dd.$("reset")); dd.klik(dd.$("reset"));
  dd.klik(dd.$("newdrop"));
  ok(dd.$("newmodal").hidden, "okno se zavřelo");
  ok(dd.$("score").textContent === "0" && dd.$("rows").children.length === 0, "hra je pryč");
  ok(dd.kos().length === 1 && dd.kos()[0].banked === 200, "leží v koši");
  ok(dd.hist().length === 0, "do historie se nezapsala");
  ok(dd.strana() === 0, "jsme na počítadle, strana " + dd.strana());
}

console.log("E) Uložit a začít novou: zápis do historie a teprve pak smazání");
{
  const e = app();
  e.kolo(); e.kolo();
  e.klik(e.$("tab1"));
  e.klik(e.$("reset")); e.klik(e.$("reset"));
  e.klik(e.$("newsave"));
  ok(e.$("newmodal").hidden, "okno se zavřelo");
  ok(e.hist().length === 1 && e.hist()[0].banked === 200, "hra je v historii");
  ok(e.$("score").textContent === "0", "a rozehraná je pryč");
  ok(e.kos().length === 0, "do koše se zbytečně nekopírovala");
  ok(e.strana() === 0, "jsme na počítadle, strana " + e.strana());
}

console.log("F) hra už uložená v historii projde bez okna");
{
  const f = app();
  f.kolo(); f.kolo();
  f.klik(f.$("arch"));
  ok(f.$("arch").textContent === "Uloženo v historii", "zapsáno: " + f.$("arch").textContent);
  f.klik(f.$("tab1"));
  f.klik(f.$("reset")); f.klik(f.$("reset"));
  ok(f.$("newmodal").hidden, "žádné okno");
  ok(f.$("score").textContent === "0", "hra je pryč");
  ok(f.kos().length === 0, "zapsaná hra nešla zbytečně do koše");
  ok(f.strana() === 0, "jsme na počítadle, strana " + f.strana());
  ok(f.hist().length === 1, "v historii zůstala jedna hra");
}

console.log("G) prázdná hra se nepotvrzuje vůbec");
{
  const g = app();
  g.klik(g.$("tab1"));
  g.klik(g.$("reset"));
  ok(g.$("newmodal").hidden && g.$("reset").textContent === "Nová hra", "žádné ptaní");
  ok(g.strana() === 0, "jen přesun na počítadlo, strana " + g.strana());
}

console.log("H) nezapsané body na stole se v okně připomenou");
{
  const h = app();
  h.kolo();
  h.klik(h.d.querySelector('[data-str="15"]'));      /* 500 na stole */
  h.klik(h.$("reset")); h.klik(h.$("reset"));
  ok(/Na stole je 500 a propadne/.test(h.$("newtext").textContent), "text: " + h.$("newtext").textContent);
}

console.log("I) selhání zápisu v okně hru nesmaže");
{
  const i = app();
  i.kolo(); i.kolo();
  const proto = i.w.Storage.prototype, puv = proto.setItem;
  proto.setItem = function(k, v){ if(k === "farkle-hist-v1") throw new Error("QuotaExceeded"); return puv.call(this, k, v); };
  i.klik(i.$("reset")); i.klik(i.$("reset"));
  i.klik(i.$("newsave"));
  proto.setItem = puv;
  ok(!i.$("newmodal").hidden, "okno zůstalo otevřené");
  ok(i.$("score").textContent === "200", "hra zůstala rozehraná, skóre " + i.$("score").textContent);
  ok(/Nepodařilo se uložit/.test(i.$("newsave").textContent), "tlačítko to řeklo: " + i.$("newsave").textContent);
  ok(i.hist().length === 0, "v historii nic nepřibylo");
}

console.log("J) selhání zálohy do koše hru nesmaže");
{
  const j = app();
  j.kolo(); j.kolo();
  const proto = j.w.Storage.prototype, puv = proto.setItem;
  proto.setItem = function(k, v){ if(k === "farkle-kos-v1") throw new Error("QuotaExceeded"); return puv.call(this, k, v); };
  j.klik(j.$("reset")); j.klik(j.$("reset"));
  j.klik(j.$("newdrop"));
  proto.setItem = puv;
  ok(j.$("score").textContent === "200", "hra zůstala rozehraná, skóre " + j.$("score").textContent);
  ok(/Nepodařilo se zálohovat/.test(j.$("reset").textContent), "tlačítko to řeklo: " + j.$("reset").textContent);
}

console.log("K) Escape a klepnutí na pozadí se chovají jako Zpět");
{
  const k = app();
  k.kolo();
  k.klik(k.$("reset")); k.klik(k.$("reset"));
  k.d.dispatchEvent(new k.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  ok(k.$("newmodal").hidden && k.$("score").textContent === "100", "Escape zavřel a hru nechal");
  k.klik(k.$("reset")); k.klik(k.$("reset"));
  k.klik(k.$("newmodal"));
  ok(k.$("newmodal").hidden && k.$("score").textContent === "100", "klepnutí na pozadí taky");
}

console.log(fails ? `\n${fails} CHYB` : "\nvše prošlo");
process.exit(fails ? 1 : 0);
