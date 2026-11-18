# Gifts for Vojta

A gift guide: budget → what it's for → ideas, then my taste in a nutshell and a test for your own idea.

## Files
- `index.html` – content and structure
- `styles.css` – look; the `.fx` class on `<html>` = animated version
- `app.js` – filter logic + all animations; the `FX` object at the top has a switch per effect
- `data.js` – English copy of the "Dárky" tab in the Google Sheet "Knihovna dárků pro Vojtu"
- `vendor/` – GSAP 3.13 (ScrollTrigger, Flip, Draggable, Inertia), Lenis 1.1, canvas-confetti 1.9

## Toning animations down
Set the matching key in `FX` in `app.js` to `false`. The "Calm mode" button (and the system "reduce motion" setting) turns everything off.
