/* Bodování stejných čísel — kolik dá `count` kostek hodnoty `value`.

   Závisí na: pravidla/rezimy (aktRezim, nejvyssiStej)
   Nezávisí na: DOM, úložišti, jazyku

   Bodovací tabulka není konstanta, drží ji herní režim. Pod prahem a
   v mezerách tabulky se neboduje; nad nejvyšším zapnutým počtem se
   extrapoluje podle `nad` (x2 / nasobek / pevne). */
import { aktRezim, nejvyssiStej } from "./rezimy.js";

/* ---------- bodování ----------
   Bodovací tabulka není konstanta — řídí ji herní režim (CLAUDE.md část 14).
   Každá funkce tady proto bere pravidla; když je nedostane, vezme si
   aktivní režim sama, aby volající, kterých se to netýká, zůstali beze změny. */
function kindPoints(value, count, rez){
  rez = rez || aktRezim();
  /* Samostatná kostka má vlastní šestici, počty 2–6 leží v řídké mapě `stej`.
     Přítomnost klíče znamená „ten počet boduje“, nula uvnitř šestice mluví
     jen o jedné hodnotě — žádný zvláštní příznak vedle sazby, tedy ani stav,
     který si může protiřečit. */
  if(count === 1) return rez.sam[value] || 0;
  if(rez.stej[count]) return rez.stej[count][value] || 0;
  /* Nad nejvyšším nastaveným počtem se extrapoluje pravidlem `nad`; pod
     prahem a v mezerách tabulky se neboduje. */
  var m = nejvyssiStej(rez);
  if(m === null || count < m) return 0;
  /* tři pravidla, která se v praxi hrají: KCD2 zdvojnásobuje každou kostkou
     navíc, klasika násobí nejvyšší nastavenou skupinu, domácí varianta dává
     pevné body bez ohledu na hodnotu. Pevné body platí i tam, kde sama
     skupina neboduje, a to je správně. */
  if(rez.nad === "pevne") return rez.nadP[count] || 0;
  var base = rez.stej[m][value] || 0;
  if(rez.nad === "nasobek") return base * (count - m + 1);  /* o jednu víc: ×2, ×3, ×4 */
  return base * Math.pow(2, count - m);                     /* x2: ×2, ×4, ×8 */
}

export { kindPoints };
