# Recept kategorizálási szabályok (MODX -> Receptsarok)

Ez a dokumentum emberi (szerkesztői) áttekintést ad arról, hogy a rendszer hogyan választ kategóriát egy új recepthez.

## Kategóriák

- `levesek`
- `zoldsegetelek`
- `haletelek`
- `husetelek`
- `egytaletelek`
- `koretek-italok-hidegkonyha`
- `sos-edes-sutemenyek-desszertek-tesztak`

## Döntési sorrend (prioritás)

A rendszer felülről lefelé halad, és az első biztos találatot elfogadja:

1. **Kézi kategória (review map)**
   - Ha van kézzel megadott kategória (`magazin-recipe-category-review`), az azonnal nyer.

2. **Forrásútvonal-bizonyíték (`sourcePath proof`)**
   - Ha a `sourcePath` tartalmaz olyan tokeneket, amelyek egy kategória-azonosító részei, az erős bizonyíték.
   - Példa: `.../desszertek/...` -> `sos-edes-sutemenyek-desszertek-tesztak`.

3. **"Töltött" szabály**
   - Ha a cím tartalmazza a `toltott` szót:
     - húsos töltelékjel esetén -> `husetelek`
     - zöldséges töltelékjel esetén -> `zoldsegetelek`
     - gyümölcs/dió/mag jelleg esetén -> `sos-edes-sutemenyek-desszertek-tesztak`
   - Ha csak annyi biztos, hogy "töltött", akkor **nem lehet leves** (a `levesek` tiltva van).

4. **Cím-bizonyíték (`title proof`)**
   - Ha a cím tartalmazza a `leves` szót (bármilyen összetételben), akkor -> `levesek`.
   - Ha a cím tartalmazza a `rakott` szót, akkor -> `egytaletelek`.

5. **Hozzávaló-bizonyíték (`ingredient proof`)**
   - Ha egyértelmű húsjel van a hozzávalókban -> `husetelek`
   - Ha egyértelmű hal-jel van -> `haletelek`
   - Ha erős zöldséges profil látszik és nincs leves-jel -> `zoldsegetelek`

6. **Súlyozott statisztikai modell**
   - A modell a cím + hozzávalók + searchTerms + instrukciók alapján pontoz.
   - Token- és bigram-alapú súlyozás.
   - A kategória csak akkor fogadódik el, ha a bizalom (`confidence`) és különbség (`margin`) elég magas.

7. **Ha továbbra sem egyértelmű**
   - A recept nem kerül automatikusan be.
   - Az `uncategorized review` listába kerül kézi ellenőrzésre.

## Külön szabály duplikátum esetén

Ha egy MODX recept már létező Receptsarok recepthez deduplikálódik:

- először a meglévő Receptsarok nyertes választódik ki (videó/tápérték/év szabályok szerint),
- a kategória sorrendje:
  1. kézi mapping
  2. vesztes receptek többségi kategóriája (ha egyértelmű)
  3. predikció
  4. ha még mindig bizonytalan -> kézi review

## Gyakorlati példák

- `kacsaleves` a címben -> `levesek`
- `rakott karfiol` a címben -> `egytaletelek`
- `.../desszertek/...` a forrásútvonalban -> desszert kategória
- `töltött paprika` + `marhahús` hozzávaló -> `husetelek`
- `töltött sütőtök` + zöldséges jelleg -> `zoldsegetelek`

