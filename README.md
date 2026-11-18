# Dárky pro Vojtu

Průvodce dárky: rozpočet → na co → tipy, pod tím vkus v kostce a test vlastního nápadu.

## Soubory
- `index.html` – obsah a struktura (texty se nemění)
- `styles.css` – vzhled; třída `.fx` na `<html>` = animovaná verze
- `app.js` – logika filtrů + všechny animace; nahoře objekt `FX` s vypínači
- `data.js` – kopie listu „Dárky“ z Google Sheets „Knihovna dárků pro Vojtu“
- `vendor/` – GSAP 3.13 (ScrollTrigger, Flip, Draggable, Inertia), Lenis 1.1, canvas-confetti 1.9

## Ztlumení animací
V `app.js` nastavte příslušný klíč v `FX` na `false`. Tlačítko „Klidná verze“ (a systémové „omezit pohyb“) vypne vše.
