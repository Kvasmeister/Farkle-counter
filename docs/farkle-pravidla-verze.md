# Farkle (kostky) — přehled běžně hraných verzí

Farkle je "push-your-luck" kostková hra: hodíš, odložíš bodující kostky, a buď si body necháš v bance, nebo riskuješ další hod se zbylými kostkami a přijdeš o všechno, když nic nebodovalo ("farkle"/"bust"). Je to starý folklorní rodinný hra bez jednotného kodexu pravidel, takže existuje spousta jmen pro prakticky totéž (Zilch, Zonk, Greed, 10 000/Dix Mille, Hot Dice, Squelch, Chicago...) — podle anglické Wikipedie jde skutečně jen o **alternativní názvy téže hry**, ne o odlišné verze pravidel. Proto je níže nenajdeš jako samostatné položky.

Zůstaly jen verze, které:
1. mají skutečně odlišnou, konzistentně zdokumentovanou mechaniku (ne jen jiné jméno pro farkle/bust nebo drobně jiná čísla v tabulce), a
2. hrají se s klasickými kostkami 1–6 (ne se speciálními symbolovými kostkami).

---

## 1. KCD2 (Kingdom Come: Deliverance II) — verze z počítadla

Implementace v minihře "Kostky" v KCD2 (a stejně už v prvním díle).

- **Počet kostek:** 6, házejí se najednou
- **Hráči:** 2
- **Cíl:** dosáhnout cílového skóre dřív než soupeř — cílové skóre se liší podle sázky/soupeře

**Co boduje:**
| Kombinace | Body |
|---|---|
| Samostatná 1 | 100 |
| Samostatná 5 | 50 |
| Trojice 2–6 | hodnota × 100 (např. 2-2-2 = 200) |
| Trojice 1 | 1 000 |
| Postupka 5 kostek (1–5 nebo 2–6) | boduje |
| Postupka 6 kostek (1–6) | boduje |

- **Čtveřice a víc stejných:** každá další kostka nad trojici hodnotu **zdvojnásobí** (4 stejné = 2×, 5 stejných = 4×, 6 stejných = 8×)
- **Tři páry nebodují** — na rozdíl od "klasické" verze níže tahle kombinace v KCD2 vůbec neexistuje
- **Hot dice:** obodování všech 6 kostek v rámci tahu → hráč sebere všechny a hází znovu, body se sčítají dál
- **Bust:** hod bez bodující kostky = ztráta bodů nastřádaných v aktuálním tahu (ne celkového skóre)
- Po každém hodu musí hráč odložit aspoň jednu bodující kostku
- **KCD2 navíc:** speciální (vážené) kostky a odznaky, které lze nasadit před zápasem a které mění pravděpodobnosti nebo dávají bonusy — nadstavba nad základní pravidla, ne jejich součást

---

## 2. Klasická/oficiální Farkle (komerční verze, PlayMonster / farkle.games)

Referenční "učebnicová" verze, na kterou se odkazují prakticky všechny ostatní jako na základ.

- **Počet kostek:** 6
- **Cíl:** první hráč na 10 000+ bodů; po jeho dosažení mají ostatní ještě jedno poslední kolo

**Bodovací tabulka:**
| Kombinace | Body |
|---|---|
| Samostatná 1 | 100 |
| Samostatná 5 | 50 |
| Trojice 2–6 | hodnota × 100 |
| Trojice 1 | 1 000 |
| Tři páry | 750 (běžné domácí varianty: 500 nebo 1 500) |
| Postupka 1–6 | 1 000 (běžná varianta: 1 500) |
| Čtyři/pět/šest stejných | ×2 / ×3 / ×4 hodnoty trojice (varianta: pevně 1 000 / 2 000 / 3 000) |

- **Hot dice:** obodování všech 6 kostek → nový hod se všemi 6, body se sčítají
- **Farkle:** žádná bodující kostka = ztráta bodů z tahu; časté domácí pravidlo "3 farkle v řadě = −1 000 bodů"
- **Nastupovací práh:** v mnoha domácnostech nutno v jednom tahu nasbírat aspoň 500 bodů, než se začnou počítat do celkového skóre
- Po každém hodu nutno odložit aspoň jednu bodující kostku

---

## 3. Farkle s 5 kostkami ("Hot Dice")

Skutečně odlišná verze, ne jen přejmenování — mění se samotný počet kostek, a tím i celý prostor možných kombinací. Podle anglické Wikipedie je tohle dokonce historicky *původní* verze hry (šestikostková je pozdější rozšíření), dnes se jí často říká "Hot Dice".

- **Počet kostek:** 5 (místo 6)
- **Klíčový důsledek:** kombinace tří párů není možná (na 5 kostek se 3 páry nevejdou)
- **Bodování:** stejný základ jako klasika (1 = 100, 5 = 50, trojice = hodnota × 100, trojice jedniček = 1 000, postupka pěti kostek = boduje)
- **Instant win:** častá součást téhle verze — pokud hráč na první hod v tahu hodí pět stejných kostek najednou, okamžitě vyhrává celou hru bez ohledu na dosavadní skóre
- **Cíl:** bývá nižší než u šestikostkové verze (často 5 000 místo 10 000), protože se dá dosáhnout míň bodů za hod

---

## 4. Piggyback / High-Stakes Farkle

Odlišuje se ne bodovací tabulkou, ale samotnou strukturou tahu — hráč přebírá riziko po předchozím hráči.

- **Počet kostek:** 6, stejná bodovací tabulka jako klasická verze
- **Klíčová odlišnost:** na začátku svého tahu si hráč může vybrat:
  - hodit šesti čerstvými kostkami (jako obvykle), **nebo**
  - pokračovat v hodu tam, kde skončil předchozí hráč — tedy hodit jen těmi kostkami, které předchozímu hráči zbyly po jeho odloženích, a "piggybackovat" na jeho nastřádaných bodech
- **Příklad:** předchozí hráč odloží tři jedničky (1 000 bodů) a skončí tah se třemi zbývajícími kostkami. Další hráč může tyto tři kostky hodit — pokud alespoň jedna zabodovala, získává 1 000 bodů předchozího hráče plus cokoliv přihodí navíc. Pokud farkluje, nezíská nic.
- Tohle pravidlo zásadně mění mírů risku, který hráči podstupují — než co bodovat po vlastním hodu, řeší i to, kolik rizika nechávají "na stole" pro dalšího hráče
- Pokud předchozí hráč skončil na hot dice (všech 6 kostek zabodovalo), další hráč může piggybackovat se všemi 6 kostkami

---

## Rychlé srovnání

| Verze | Kostek | Tři páry | Postupka | Škálování 4/5/6 stejných | Co je jinak |
|---|---|---|---|---|---|
| **KCD2** | 6 | nebodují | boduje (i 5 z 6) | ×2 / ×4 / ×8 | vážené kostky a odznaky navíc |
| **Klasická Farkle** | 6 | 750 (var.) | 1 000 (var. 1500) | ×2 / ×3 / ×4 (var. pevné) | referenční/komerční verze |
| **5 kostek ("Hot Dice")** | 5 | nelze | boduje (5 z 5) | — | jiný počet kostek, možný instant win |
| **Piggyback / High-Stakes** | 6 | 750 (var.) | 1 000 (var. 1500) | ×2 / ×3 / ×4 (var. pevné) | jiná struktura tahu, ne bodování |

**Vynecháno záměrně:**
- **Zilch, Zonk, Greed, 10 000/Dix Mille, Squelch, Chicago** — podle Wikipedie jde jen o regionální/rodinná jména pro tutéž hru; žádný z nich nemá konzistentně zdokumentovaná odlišná pravidla, jen se u nich (stejně jako u "klasické" verze) drobně liší konkrétní čísla v tabulce zdroj od zdroje.
- **Cosmic Wimpout** — hraje se s 5 speciálními symbolovými kostkami (ne klasickými 1–6), takže nesplňuje podmínku "klasické kostky".
