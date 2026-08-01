# Kostky — počítadlo (PWA)

Nahraj **obsah** této složky do kořene repozitáře (ne složku samotnou):

```
index.html
manifest.webmanifest
sw.js
fonts/
icons/
```

Vše je odkazované relativně, takže to funguje i na projektovém webu
`uzivatel.github.io/repo/`. Nic se nenastavuje.

## Instalace

- **Android / Chrome** — v nabídce prohlížeče „Přidat na plochu“ nebo
  „Instalovat aplikaci“. Spustí se ve skutečném fullscreenu, tlačítko
  celé obrazovky se v aplikaci samo skryje.
- **iOS / Safari** — tlačítko Sdílet → „Přidat na plochu“. Spustí se bez
  lišt prohlížeče; stavová lišta s hodinami zůstane, obsah jde pod ni.

## Offline

Service worker uloží při první návštěvě všechny soubory, takže aplikace
funguje bez signálu. Rozehraná hra i volba motivu přežijí zavření.

## Aktualizace

Po jakékoli změně souborů **zvyš verzi** v `sw.js`:

```js
const VERZE = "kostky-v2";
```

Bez toho si zařízení nechají starou verzi z cache. Nová se načte při
druhém spuštění (první ji na pozadí stáhne).
