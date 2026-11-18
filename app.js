/* Gifts for Vojta — logic + animation.
   ─────────────────────────────────────────────────────────────
   FX: every effect has its own switch. Set it to false and that effect
   goes away; content and logic stay the same. Calm mode (or the system
   "reduce motion" setting) turns everything off at once.
   ───────────────────────────────────────────────────────────── */
const FX = {
  intro:        true,  // intro gift box that opens to reveal the page
  lenis:        true,  // smooth scrolling
  grain:        true,  // grain texture over the page
  cursor:       true,  // custom cursor with trail and emoji (mouse only)
  ribbon:       true,  // ribbon at the top = scroll progress
  floaters:     true,  // floating shapes with parallax
  heroBlob:     true,  // purple blob that follows the mouse
  titleLetters: true,  // title letter by letter + squash on hover
  letterUnfold: true,  // letter unfolds
  signature:    true,  // "Vojta" signature drawn as a stroke
  stickers:     true,  // sizes drop in like stickers and can be dragged
  marquee:      true,  // brand strip, speeds up with scroll
  sectionReveal:true,  // sections wipe in + staggered children
  numbers:      true,  // step numbers spin in
  headingWidth: true,  // section headings widen on scroll
  cardMagnet:   true,  // cards pulled toward the cursor
  cardTilt:     true,  // 3D tilt + glare + shifting shadow
  selectBurst:  true,  // confetti, squash and emoji on select
  giftBox:      true,  // step 3 gift box shakes and bursts
  dealCards:    true,  // ideas fly out of the box like dealt cards
  flip:         true,  // reshuffling ideas (FLIP)
  tagFloat:     true,  // brand tags bob
  tagRepel:     true,  // brand tags dodge the cursor
  ruleFlip:     true,  // rules: dot flips to an icon
  checkFx:      true,  // tick: checkmark draw + sparks
  meterFx:      true,  // thermometer fills with a spring
  approved:     true,  // 5/5: confetti cannon, stamp, shake
  sound:        true,  // sound on approval (off until switched on)
  nopeFx:       true,  // "not these": strikethrough, shake on hover
  heart:        true,  // beating heart in the footer
  easterEgg:    true,  // 5 clicks on the heart = raining gifts
  jelly:        true,  // jelly effect on buttons
  idle:         true,  // small idle motion so nothing is fully still
  gyro:         true,  // on phones, tilting moves shapes and cards
};

(() => {
  "use strict";

  /* ---------- mode ---------- */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let calmPref = null;
  try { calmPref = localStorage.getItem("vojta-calm"); } catch (e) {}
  const CALM = calmPref === "1" || (reduce && calmPref !== "0");
  const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const SMALL = matchMedia("(max-width: 600px)").matches;
  const HAS_GSAP = typeof window.gsap !== "undefined";
  if (CALM || !HAS_GSAP) Object.keys(FX).forEach(k => (FX[k] = false));
  if (!FINE) { FX.cursor = false; FX.cardMagnet = false; FX.tagRepel = false; }
  const DRAG = FX.stickers && FINE;
  if (DRAG) document.documentElement.classList.add("drag");
  if (typeof window.Lenis === "undefined") FX.lenis = false;
  const confettiFn = typeof window.confetti === "function" ? window.confetti : null;
  const ANY = Object.values(FX).some(Boolean);
  if (ANY) document.documentElement.classList.add("fx");
  if (!FX.grain) document.querySelector(".grain").style.display = "none";
  if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger, Flip, Draggable, InertiaPlugin);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const COLORS = ["#B9A1F2", "#FFE08A", "#FF5E5B", "#4B3A86", "#EBE2FF"];
  const center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };

  /* ---------- data and logic (unchanged) ---------- */
  const ITEMS = window.DATA.map((r, i) => ({ id: i, brand: r[0], name: r[1], cat: r[2], type: r[3], price: r[4], size: r[5], note: r[6], fav: !!r[7], verified: !!r[8], link: r[9], q: r[10] }));
  const TIERS = [
    { id: "t1", big: "Under 500 CZK", small: "A small treat, like socks", test: p => p < 500, emoji: "🪙" },
    { id: "t2", big: "500–1,000 CZK", small: "Beanie, cap, accessories", test: p => p >= 500 && p < 1000, emoji: "💸" },
    { id: "t3", big: "1,000–2,000 CZK", small: "Something proper, maybe split", test: p => p >= 1000 && p <= 2000, emoji: "💸" },
    { id: "t4", big: "Chipping in", small: "2,000 CZK and up, together", test: p => p > 2000, emoji: "🤝" }
  ];
  const CATS = [
    { id: "Na běh", big: "For running", small: "Running clothes and accessories", emoji: "🏃" },
    { id: "Na každý den", big: "For every day", small: "Tees, beanies, little things", emoji: "👕" },
    { id: "Na hory a výlety", big: "For the mountains", small: "Hikes and snowboarding", emoji: "🏔️" },
    { id: "Vůně", big: "Fragrance", small: "Czech perfume houses", emoji: "🧴" },
    { id: "Na posilovnu", big: "For the gym", small: "On, Lululemon and the like", emoji: "🏋️" },
    { id: "all", big: "Surprise me", small: "A bit of everything", emoji: "🎲" }
  ];
  const state = { tier: null, cat: null, open: false, seed: 0 };
  const fmt = n => n.toLocaleString("en-US");
  function shuffle(arr, seed) {
    const a = arr.slice(); let s = seed * 9301 + 49297;
    for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function cardHTML(it) {
    const url = it.link || ("https://www.google.com/search?q=" + encodeURIComponent(it.q));
    const tags = [it.type, it.size ? "size " + it.size : "", it.price >= 1000 ? "good to split" : ""].filter(Boolean).map(x => `<span class="tag">${x}</span>`).join("");
    const note = it.note;
    return `<article class="card" data-flip-id="c${it.id}" data-cursor="🎁">
    <div class="brand">${it.brand}</div>
    <h3>${it.name}</h3>
    <div>${note ? `<p class="note">${note}</p>` : ""}</div>
    <div><div class="tags">${tags}</div>
    <div class="row"><div class="price">~${fmt(it.price)} CZK<small>${it.verified ? "price checked" : "approx. price"}</small></div>
    <a class="go" href="${url}" target="_blank" rel="noopener" data-cursor="🛍️">${it.link ? "To the shop ↗" : "Find it ↗"}</a></div></div>
  </article>`;
  }

  /* ---------- confetti and sparks ---------- */
  function burstAt(x, y, opts = {}) {
    if (!confettiFn) return;
    const o = Object.assign({ particleCount: 46, spread: 75, startVelocity: 30, ticks: 140, scalar: .9, colors: COLORS, origin: { x: x / innerWidth, y: y / innerHeight }, disableForReducedMotion: false }, opts);
    if (SMALL) o.particleCount = Math.round(o.particleCount * .55);
    confettiFn(o);
  }
  function sparks(x, y, n = 8, dist = 46) {
    if (!HAS_GSAP) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span"); s.className = "spark";
      s.style.background = COLORS[i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 0];
      document.body.appendChild(s);
      const a = (i / n) * Math.PI * 2 + rand(-.3, .3), d = rand(dist * .6, dist);
      gsap.set(s, { x: x - 5, y: y - 5, scale: rand(.6, 1.2) });
      gsap.to(s, { x: x - 5 + Math.cos(a) * d, y: y - 5 + Math.sin(a) * d, scale: 0, duration: rand(.45, .7), ease: "power3.out", onComplete: () => s.remove() });
    }
  }
  function popEmoji(el, emoji) {
    const c = center(el), s = document.createElement("span");
    s.className = "pop-emoji"; s.textContent = emoji; document.body.appendChild(s);
    gsap.set(s, { x: c.x - 17, y: c.r.top - 10, scale: 0 });
    gsap.timeline({ onComplete: () => s.remove() })
      .to(s, { y: c.r.top - 90, scale: 1.7, rotation: rand(-30, 30), duration: .55, ease: "back.out(3)" })
      .to(s, { y: c.r.top - 130, opacity: 0, scale: 1, duration: .45, ease: "power2.in" }, "+=.15");
  }

  /* ---------- sound ---------- */
  let soundOn = false, actx = null;
  const soundBtn = $("#soundBtn");
  if (!FX.sound) soundBtn.hidden = true;
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.setAttribute("aria-pressed", soundOn);
    soundBtn.firstElementChild.textContent = soundOn ? "🔊" : "🔇";
    if (soundOn) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) {} }
  });
  function fanfare() {
    if (!soundOn || !actx) return;
    const t0 = actx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "triangle"; o.frequency.value = f;
      const t = t0 + i * .09;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .5);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .55);
    });
  }

  /* ---------- calm mode ---------- */
  const calmBtn = $("#calmBtn");
  calmBtn.setAttribute("aria-pressed", CALM ? "true" : "false");
  calmBtn.addEventListener("click", () => {
    try { localStorage.setItem("vojta-calm", CALM ? "0" : "1"); } catch (e) {}
    location.reload();
  });

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (FX.lenis) {
    lenis = new Lenis({ lerp: .1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const target = document.querySelector(a.getAttribute("href")); if (!target) return;
    if (lenis) { e.preventDefault(); lenis.scrollTo(target, { offset: -30, duration: 1.4 }); }
  });

  /* ---------- cursor ---------- */
  if (FX.cursor) {
    document.documentElement.classList.add("has-cursor");
    const blob = $("#cursorBlob"), emo = $("#cursorEmoji");
    const bx = gsap.quickTo(blob, "x", { duration: .18, ease: "power3" }), by = gsap.quickTo(blob, "y", { duration: .18, ease: "power3" });
    const trail = Array.from({ length: 7 }, (_, i) => {
      const d = document.createElement("span"); d.className = "trail"; document.body.appendChild(d);
      gsap.set(d, { scale: 1 - i * .11, opacity: .55 - i * .06 });
      return { x: gsap.quickTo(d, "x", { duration: .25 + i * .06, ease: "power3" }), y: gsap.quickTo(d, "y", { duration: .25 + i * .06, ease: "power3" }) };
    });
    addEventListener("pointermove", e => { bx(e.clientX); by(e.clientY); trail.forEach(t => { t.x(e.clientX); t.y(e.clientY); }); }, { passive: true });
    let hot = null;
    document.addEventListener("pointerover", e => {
      const el = e.target.closest("button, a, .sticker, [data-cursor]");
      if (el === hot) return; hot = el;
      if (el) {
        emo.textContent = el.dataset.cursor || (el.classList.contains("sticker") ? "✋" : "✨");
        gsap.to(blob, { scale: 2.8, backgroundColor: "#FFE08A", duration: .35, ease: "back.out(2)" });
        gsap.to(emo, { opacity: 1, duration: .2 });
      } else {
        gsap.to(blob, { scale: 1, backgroundColor: "#FF5E5B", duration: .3, ease: "power2.out" });
        gsap.to(emo, { opacity: 0, duration: .15 });
      }
    });
    document.addEventListener("pointerdown", () => { const s = gsap.getProperty(blob, "scale"); gsap.fromTo(blob, { scale: s * .6 }, { scale: s, duration: .45, ease: "elastic.out(1,.4)" }); });
  }

  /* ---------- ribbon ---------- */
  if (FX.ribbon) {
    const fill = $("#ribbonFill"), bow = $("#ribbonBow");
    const setFill = gsap.quickSetter(fill, "scaleX"), setBow = gsap.quickSetter(bow, "x", "px");
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: self => {
      setFill(self.progress); setBow(self.progress * (innerWidth - 46));
      gsap.to(bow, { rotation: gsap.utils.clamp(-25, 25, self.getVelocity() / 120), duration: .3, overwrite: "auto" });
    } });
  }

  /* ---------- floating shapes ---------- */
  if (FX.floaters) {
    $$(".fl").forEach((fl, i) => {
      const sp = +fl.dataset.speed || .4;
      gsap.to(fl, { y: () => -sp * 600, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true } });
      if (FX.idle) gsap.to(fl.firstElementChild, { rotation: rand(-18, 18), y: rand(-16, 16), x: rand(-10, 10), duration: rand(3, 5), ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * .3 });
    });
  }

  /* ---------- hero ---------- */
  const title = $("#title");
  let chars = [];
  if (FX.titleLetters) {
    const txt = title.textContent;
    title.setAttribute("aria-label", txt);
    title.innerHTML = txt.split(" ").map(w => `<span class="word" aria-hidden="true">${[...w].map(c => `<span class="ch">${c}</span>`).join("")}</span>`).join(" ");
    chars = $$(".ch", title);
    chars.forEach(ch => {
      ch.addEventListener("pointerenter", () => {
        if (gsap.isTweening(ch)) return;
        gsap.timeline()
          .to(ch, { scaleX: 1.35, scaleY: .7, fontVariationSettings: '"wdth" 125', duration: .14, ease: "power2.out" })
          .to(ch, { scaleX: 1, scaleY: 1, rotation: 0, fontVariationSettings: '"wdth" 100', duration: .9, ease: "elastic.out(1.2,.3)" });
      });
    });
  }
  const heroBlob = $("#heroBlob");
  if (FX.heroBlob && FINE) {
    const hx = gsap.quickTo(heroBlob, "x", { duration: 1.4, ease: "power3" }), hy = gsap.quickTo(heroBlob, "y", { duration: 1.4, ease: "power3" });
    addEventListener("pointermove", e => {
      const r = $("#hero").getBoundingClientRect();
      hx((e.clientX - (r.right - 40)) * .55); hy((e.clientY - (r.top + 90)) * .55);
    }, { passive: true });
  }
  const stickers = $$(".sticker");
  if (DRAG) {
    Draggable.create(stickers, {
      type: "x,y", inertia: true, edgeResistance: .7, bounds: "#wrap",
      onPress() { gsap.to(this.target, { scale: 1.12, rotation: rand(-8, 8), boxShadow: "8px 10px 0 #4B3A86", duration: .2 }); },
      onRelease() { gsap.to(this.target, { scale: 1, boxShadow: "3px 4px 0 #4B3A86", duration: .6, ease: "elastic.out(1,.4)" }); }
    });
  }

  function heroIn() {
    const tl = gsap.timeline();
    if (FX.titleLetters) tl.from(chars, { y: 90, scaleY: 1.7, scaleX: .5, opacity: 0, rotation: () => rand(-25, 25), duration: 1.1, ease: "elastic.out(1,.45)", stagger: .045 }, 0);
    tl.from(".hello", { y: 20, opacity: 0, rotation: -12, duration: .6, ease: "back.out(2)" }, .1);
    if (FX.heroBlob) tl.from(heroBlob, { scale: 0, duration: 1.4, ease: "elastic.out(1,.5)" }, 0);
    if (FX.letterUnfold) {
      tl.from("#letter", { rotationX: -100, scaleY: .2, transformOrigin: "50% 0%", transformPerspective: 900, opacity: 0, duration: 1, ease: "back.out(1.2)" }, .45)
        .from("#letter p", { opacity: 0, duration: .5 }, 1.1);
    }
    if (FX.signature) {
      const t = $("#sigText"); const len = 420;
      gsap.set(t, { strokeDasharray: len, strokeDashoffset: len, fillOpacity: 0 });
      tl.to(t, { strokeDashoffset: 0, duration: 1.4, ease: "power1.inOut" }, 1.4).to(t, { fillOpacity: 1, duration: .4 }, 2.5);
    }
    if (FX.stickers) {
      tl.from(stickers, { y: -260, rotation: () => rand(-50, 50), scale: 1.8, opacity: 0, duration: .9, ease: "bounce.out", stagger: .12 }, 1.2)
        .add(() => stickers.forEach((s, i) => gsap.delayedCall(i * .12, () => { const c = center(s); sparks(c.x, c.r.bottom, 6, 30); })), 1.85);
    }
    if (FX.idle && FX.titleLetters) gsap.delayedCall(4, function wave() {
      gsap.to(chars, { y: -12, duration: .25, ease: "power2.out", yoyo: true, repeat: 1, stagger: .04 });
      gsap.delayedCall(6, wave);
    });
  }

  /* ---------- intro gift box ---------- */
  function intro(done) {
    const ov = document.createElement("div"); ov.className = "intro"; ov.setAttribute("aria-hidden", "true");
    ov.innerHTML = `<svg viewBox="0 0 200 200"><g id="inBox"><rect class="f-coral s5" x="38" y="92" width="124" height="88" rx="10"/><rect class="f-butter s5" x="91" y="92" width="18" height="88"/></g><g id="inLid"><rect class="f-coral s5" x="28" y="66" width="144" height="30" rx="9"/><rect class="f-butter s5" x="91" y="66" width="18" height="30"/><path class="f-butter s5" d="M100 66 C80 28 50 38 62 58 C68 66 88 66 100 66 Z"/><path class="f-butter s5" d="M100 66 C120 28 150 38 138 58 C132 66 112 66 100 66 Z"/></g></svg>`;
    document.body.appendChild(ov);
    if (lenis) lenis.stop();
    const svg = $("svg", ov), lid = $("#inLid", ov);
    const finish = () => { tl.kill(); ov.remove(); if (lenis) lenis.start(); done(); };
    ov.addEventListener("click", finish);
    const tl = gsap.timeline({ onComplete: finish })
      .from(svg, { y: -300, scale: .6, duration: .7, ease: "bounce.out" })
      .to(svg, { rotation: 6, duration: .07, yoyo: true, repeat: 5 }, "+=.05")
      .to(svg, { scaleX: 1.15, scaleY: .85, duration: .12 })
      .to(lid, { y: -260, x: 120, rotation: 50, duration: .6, ease: "power2.out" })
      .to(svg, { scaleX: 1, scaleY: 1, duration: .3, ease: "back.out(3)" }, "<")
      .add(() => { const c = center(svg); burstAt(c.x, c.y, { particleCount: 120, spread: 110, startVelocity: 45 }); }, "<")
      .to(ov, { clipPath: "circle(0% at 50% 50%)", duration: .7, ease: "power3.in" }, "+=.15");
    gsap.set(ov, { clipPath: "circle(100% at 50% 50%)" });
  }

  /* ---------- brand strip ---------- */
  const mq = $("#marquee");
  const BRANDS = ["Ciele", "Another Cotton Lab", "UVU", "Carhartt WIP", "On", "Salomon", "Patagonia", "Nude Project", "Arket", "COS", "Arc'teryx", "Kintsugi", "Oraculum", "Falke"];
  mq.innerHTML = [...BRANDS, ...BRANDS].map(b => `<span>${b}</span>`).join("");
  if (FX.marquee) {
    const loop = gsap.to(mq, { xPercent: -50, ease: "none", duration: 32, repeat: -1 });
    const boost = v => { gsap.to(loop, { timeScale: 1 + Math.min(Math.abs(v), 60) / 6, duration: .2, overwrite: true }); gsap.to(loop, { timeScale: 1, duration: 1.4, delay: .3, ease: "power2.out" }); };
    if (lenis) lenis.on("scroll", e => boost(e.velocity));
    else ScrollTrigger.create({ start: 0, end: "max", onUpdate: s => boost(s.getVelocity() / 100) });
  }

  /* ---------- section reveals ---------- */
  function reveals() {
    $$(".step, .nope").forEach(sec => {
      const head = $(".step-head, h2", sec);
      if (FX.sectionReveal) {
        gsap.fromTo(head, { clipPath: "inset(-20% 100% -20% 0%)" }, { clipPath: "inset(-20% -10% -20% 0%)", duration: 1, ease: "power3.out", scrollTrigger: { trigger: sec, start: "top 82%" } });
        const kids = $$(".hint, .bubbles > *, .panel", sec);
        if (kids.length) gsap.from(kids, { y: 60, opacity: 0, rotation: () => rand(-4, 4), duration: .8, ease: "back.out(1.6)", stagger: .07, scrollTrigger: { trigger: sec, start: "top 78%" } });
      }
      const num = $(".num", sec);
      if (num && FX.numbers) {
        gsap.from(num, { scale: 0, rotation: -540, duration: 1.1, ease: "back.out(2.2)", scrollTrigger: { trigger: sec, start: "top 85%" } });
        num.parentElement.addEventListener("pointerenter", () => gsap.fromTo(num, { rotation: 0 }, { rotation: 360, duration: .7, ease: "back.out(2)" }));
      }
      const h2 = $("h2", sec);
      if (FX.headingWidth && h2) gsap.fromTo(h2, { fontVariationSettings: '"wdth" 75' }, { fontVariationSettings: '"wdth" 112', ease: "none", scrollTrigger: { trigger: sec, start: "top 90%", end: "top 25%", scrub: .6 } });
    });
  }

  /* ---------- tilt + magnet ---------- */
  function tiltable(el, { magnet = .22, max = 12, shadow = true } = {}) {
    if (!(FX.cardTilt || FX.cardMagnet)) return;
    el.classList.add("fx-on");
    gsap.set(el, { transformPerspective: 700 });
    const qx = gsap.quickTo(el, "x", { duration: .6, ease: "power3" }), qy = gsap.quickTo(el, "y", { duration: .6, ease: "power3" });
    const rx = gsap.quickTo(el, "rotationX", { duration: .5, ease: "power3" }), ry = gsap.quickTo(el, "rotationY", { duration: .5, ease: "power3" });
    const apply = e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      if (FX.cardMagnet) { qx(px * r.width * magnet); qy(py * r.height * magnet); }
      if (FX.cardTilt) {
        ry(px * max * 2); rx(-py * max * 2);
        el.style.setProperty("--gx", (px + .5) * 100 + "%"); el.style.setProperty("--gy", (py + .5) * 100 + "%");
        if (shadow) { el.style.setProperty("--sx", (5 - px * 16).toFixed(1) + "px"); el.style.setProperty("--sy", (6 - py * 16).toFixed(1) + "px"); }
      }
    };
    const reset = () => { qx(0); qy(0); rx(0); ry(0); el.style.setProperty("--sx", "5px"); el.style.setProperty("--sy", "6px"); };
    if (FINE) { el.addEventListener("pointermove", apply); el.addEventListener("pointerleave", reset); }
    else if (FX.cardTilt) { el.addEventListener("pointerdown", apply); el.addEventListener("pointerup", () => gsap.delayedCall(.25, reset)); el.addEventListener("pointercancel", reset); }
  }

  /* ---------- steps 1 and 2 ---------- */
  const tiersEl = $("#tiers"), catsEl = $("#cats");
  function makeBubble(o, onPick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "bubble"; b.setAttribute("aria-pressed", "false");
    b.dataset.cursor = o.emoji;
    b.innerHTML = `<span class="bubble-face"><span class="big">${o.big}</span><span class="small">${o.small}</span></span>`;
    b.addEventListener("click", () => onPick(b, o));
    tiltable(b);
    return b;
  }
  function pickFx(b, o) {
    if (!FX.selectBurst) return;
    const face = $(".bubble-face", b);
    gsap.timeline()
      .to(b, { scaleX: 1.12, scaleY: .84, duration: .09, ease: "power2.out" })
      .to(b, { scaleX: .94, scaleY: 1.1, duration: .12 })
      .to(b, { scaleX: 1, scaleY: 1, duration: .7, ease: "elastic.out(1,.35)" });
    gsap.fromTo(face, { rotationX: -90, transformPerspective: 500 }, { rotationX: 0, duration: .6, ease: "back.out(2)" });
    const c = center(b); burstAt(c.x, c.y, { particleCount: 40, spread: 80, startVelocity: 26, scalar: .8 });
    popEmoji(b, o.emoji);
  }
  function syncPressed() {
    $$(".bubble", tiersEl).forEach((b, i) => b.setAttribute("aria-pressed", state.tier === TIERS[i].id ? "true" : "false"));
    $$(".bubble", catsEl).forEach((b, i) => b.setAttribute("aria-pressed", state.cat === CATS[i].id ? "true" : "false"));
  }
  function glideTo(el) {
    if (!SMALL || !el) return;
    const top = el.getBoundingClientRect().top;
    if (top > 40 && top < innerHeight * .35) return; // already in view
    setTimeout(() => { if (lenis) lenis.scrollTo(el, { offset: -20, duration: 1.1 }); else el.scrollIntoView({ behavior: CALM ? "auto" : "smooth", block: "start" }); }, CALM ? 0 : 450);
  }
  TIERS.forEach(o => tiersEl.append(makeBubble(o, (b) => { state.tier = o.id; state.open = false; state.seed++; syncPressed(); pickFx(b, o); renderResults(); glideTo(state.cat ? $("#s3").closest(".step") : catsEl.closest(".step")); })));
  CATS.forEach(o => catsEl.append(makeBubble(o, (b) => { state.cat = o.id; state.open = false; state.seed++; syncPressed(); pickFx(b, o); renderResults(); glideTo(state.tier ? $("#s3").closest(".step") : tiersEl.closest(".step")); })));

  /* ---------- step 3: ideas ---------- */
  const stage = $("#giftStage"), waiting = $("#waiting"), body = $("#resultsBody"), giftbox = $("#giftbox");
  const pool = new Map();
  let revealed = false, busy = false, pending = false;
  let boxIdle = null;
  if (FX.giftBox && FX.idle) boxIdle = gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
    .to(giftbox, { rotation: -7, duration: .1 }).to(giftbox, { rotation: 7, duration: .1, repeat: 3, yoyo: true }).to(giftbox, { rotation: 0, duration: .3, ease: "elastic.out(1,.4)" })
    .to(giftbox, { y: -14, duration: .25, ease: "power2.out" }, "+=.3").to(giftbox, { y: 0, duration: .5, ease: "bounce.out" });

  function cardEl(it) {
    if (pool.has(it.id)) return pool.get(it.id);
    const w = document.createElement("div"); w.innerHTML = cardHTML(it).trim();
    const el = w.firstElementChild; pool.set(it.id, el);
    if (FX.cardTilt) tiltable(el, { magnet: .06, max: 6, shadow: false });
    return el;
  }
  const baseRot = i => (FX.flip || FX.dealCards) ? [-1, .8, 0][i % 3] : 0;

  function actionsHTML(n) {
    return `<button class="btn primary" id="again" type="button" ${n <= 3 || state.open ? "hidden" : ""}>Show others</button>
      <button class="btn" id="all" type="button" ${n <= 3 ? "hidden" : ""}>${state.open ? "Back to three" : "Show all (" + n + ")"}</button>`;
  }
  function ensureBody() {
    let cards = $(".cards", body);
    if (!cards) { body.innerHTML = `<div class="cards"></div><div class="actions"></div>`; cards = $(".cards", body); }
    return cards;
  }
  function wireActions() {
    const a = $("#again"); if (a) a.onclick = () => { state.seed++; renderResults(); };
    const b = $("#all"); if (b) b.onclick = () => { state.open = !state.open; renderResults(); };
  }

  function placeCards(list, mode, from) {
    const cards = ensureBody();
    const current = [...cards.children];
    const next = list.map(cardEl), keep = new Set(next);
    const st = (mode === "flip" && FX.flip && current.length) ? Flip.getState(current) : null;
    current.forEach(el => { if (!keep.has(el)) { if (st) el.style.display = "none"; else el.remove(); } });
    next.forEach((el, i) => { el.style.display = ""; cards.appendChild(el); });
    if (st) {
      const entering = next.filter(el => !current.includes(el));
      Flip.from(st, {
        targets: [...current, ...next], duration: .7, ease: "power3.inOut", absolute: true, stagger: .03,
        onEnter: els => gsap.fromTo(els, { opacity: 0, scale: .3, y: -80, rotation: () => rand(-30, 30) }, { opacity: 1, scale: 1, y: 0, rotation: (i, el) => baseRot(next.indexOf(el)), duration: .7, ease: "back.out(1.7)", stagger: .07 }),
        onLeave: els => gsap.to(els, { opacity: 0, scale: .3, y: 60, rotation: () => rand(-40, 40), duration: .45, ease: "power2.in" }),
        onComplete: () => { [...cards.children].forEach(el => { if (!keep.has(el)) { el.remove(); gsap.set(el, { clearProps: "all" }); el.style.display = ""; } }); next.forEach((el, i) => gsap.to(el, { rotation: baseRot(i), duration: .4 })); }
      });
      if (!entering.length) next.forEach((el, i) => gsap.to(el, { rotation: baseRot(i), duration: .5 }));
    } else if (mode === "deal" && FX.dealCards) {
      from = from || center(giftbox);
      next.forEach((el, i) => {
        const c = center(el);
        gsap.fromTo(el, { x: from.x - c.x, y: from.y - c.y, scale: .15, opacity: 0, rotation: (i - (next.length - 1) / 2) * 25 }, { x: 0, y: 0, scale: 1, opacity: 1, rotation: baseRot(i), duration: .95, ease: "back.out(1.3)", delay: i * .12 });
      });
    } else if (mode === "flip" && FX.flip) {
      gsap.fromTo(next, { opacity: 0, scale: .4, y: -60 }, { opacity: 1, scale: 1, y: 0, rotation: i => baseRot(i), duration: .7, ease: "back.out(1.7)", stagger: .08 });
    } else if (HAS_GSAP) next.forEach((el, i) => gsap.set(el, { rotation: baseRot(i) }));
  }

  function burstBox(then) {
    stage.style.display = "";
    if (boxIdle) boxIdle.pause();
    const lid = $("#gbLid");
    gsap.timeline({ onComplete: then })
      .to(giftbox, { rotation: -10, duration: .05 })
      .to(giftbox, { rotation: 10, x: 4, duration: .05, yoyo: true, repeat: 7 })
      .to(giftbox, { rotation: 0, x: 0, scaleX: 1.2, scaleY: .8, duration: .12 })
      .to(lid, { y: -150, x: 70, rotation: 55, opacity: 0, duration: .6, ease: "power2.out" })
      .to(giftbox, { scaleX: 1, scaleY: 1, duration: .25, ease: "back.out(3)" }, "<")
      .add(() => { const c = center(giftbox); burstAt(c.x, c.y, { particleCount: 110, spread: 100, startVelocity: 40 }); sparks(c.x, c.y, 14, 90); }, "<")
      .to(waiting, { opacity: 0, x: 30, duration: .3 }, "<")
      .to(giftbox, { scale: 0, opacity: 0, duration: .4, ease: "back.in(2)", delay: .35 })
      .add(() => { stage.style.display = "none"; gsap.set([giftbox, lid, waiting], { clearProps: "all" }); });
  }

  function renderResults() {
    if (busy) { pending = true; return; }
    if (!state.tier || !state.cat) {
      stage.style.display = "";
      waiting.textContent = !state.tier && !state.cat ? "First pick a budget and what it’s for." : !state.tier ? "Now just the budget up top." : "Now pick what it’s for.";
      if (FX.giftBox) gsap.fromTo(waiting, { y: 8, opacity: .3 }, { y: 0, opacity: 1, duration: .4, ease: "back.out(2)" });
      body.innerHTML = ""; return;
    }
    const tier = TIERS.find(t => t.id === state.tier);
    const pl = ITEMS.filter(i => tier.test(i.price) && (state.cat === "all" || i.cat === state.cat));
    if (!pl.length) {
      stage.style.display = "none";
      body.innerHTML = `<div class="empty">Nothing here yet. Try another budget, or <a href="#vlastni">come up with your own</a>. It just has to pass the test.</div>`;
      if (FX.flip) gsap.from($(".empty", body), { scale: .8, rotation: -3, opacity: 0, duration: .6, ease: "elastic.out(1,.5)" });
      return;
    }
    const favs = pl.filter(i => i.fav), rest = shuffle(pl.filter(i => !i.fav), state.seed);
    const ordered = [...favs, ...rest];
    const shown = state.open ? ordered : ordered.slice(0, 3);
    const first = !revealed;
    revealed = true;
    const finish = () => {
      $(".actions", body).innerHTML = actionsHTML(pl.length); wireActions();
      const vis = $$(".actions .btn:not([hidden])", body);
      if (FX.flip && vis.length) gsap.from(vis, { scale: .5, opacity: 0, duration: .5, ease: "back.out(2.5)", stagger: .06, delay: .3 });
    };
    if (first && FX.giftBox) {
      busy = true;
      ensureBody();
      const boxAt = center(giftbox);
      burstBox(() => { stage.style.display = "none"; placeCards(shown, "deal", boxAt); finish(); busy = false; if (pending) { pending = false; renderResults(); } });
    } else {
      stage.style.display = "none";
      placeCards(shown, first ? "deal" : "flip"); finish();
    }
  }

  /* ---------- step 4: taste ---------- */
  const cloud = $("#cloud");
  if (FX.tagFloat || FX.tagRepel) {
    $$(":scope > span", cloud).forEach(sp => {
      const w = document.createElement("span"); w.className = "tagw";
      sp.classList.add("pill"); cloud.insertBefore(w, sp); w.appendChild(sp);
    });
  }
  function initTaste() {
    const wraps = $$(".tagw", cloud);
    if (FX.tagFloat) wraps.forEach(w => gsap.to(w.firstElementChild, { y: rand(-7, 7), rotation: `+=${rand(-5, 5)}`, duration: rand(1.4, 2.6), ease: "sine.inOut", yoyo: true, repeat: -1, delay: rand(0, 1) }));
    if (FX.tagRepel) {
      const q = wraps.map(w => ({ w, x: gsap.quickTo(w, "x", { duration: .5, ease: "power3" }), y: gsap.quickTo(w, "y", { duration: .5, ease: "power3" }) }));
      cloud.addEventListener("pointermove", e => {
        q.forEach(o => {
          const r = o.w.getBoundingClientRect(), cx = r.left + r.width / 2 - gsap.getProperty(o.w, "x"), cy = r.top + r.height / 2 - gsap.getProperty(o.w, "y");
          const dx = cx - e.clientX, dy = cy - e.clientY, d = Math.hypot(dx, dy) || 1, R = 110;
          if (d < R) { const f = (R - d) / R * 42; o.x(dx / d * f); o.y(dy / d * f); } else { o.x(0); o.y(0); }
        });
      });
      cloud.addEventListener("pointerleave", () => q.forEach(o => { gsap.to(o.w, { x: 0, y: 0, duration: 1, ease: "elastic.out(1,.35)", overwrite: true }); }));
    }
    if (FX.ruleFlip) $$("#rules li").forEach(li => {
      const dot = $(".dot", li);
      li.addEventListener("pointerenter", () => {
        gsap.timeline().to(dot, { rotationY: 90, duration: .15, ease: "power2.in" })
          .add(() => { dot.textContent = li.dataset.icon; dot.style.background = "#FFE08A"; })
          .to(dot, { rotationY: 0, scale: 1.25, duration: .45, ease: "back.out(3)" });
        gsap.to(li, { x: 6, rotation: -.8, backgroundColor: "rgba(235,226,255,.7)", duration: .3 });
      });
      li.addEventListener("pointerleave", () => {
        gsap.timeline().to(dot, { rotationY: 90, scale: 1, duration: .15 })
          .add(() => { dot.textContent = ""; dot.style.background = ""; })
          .to(dot, { rotationY: 0, duration: .3, ease: "back.out(2)" });
        gsap.to(li, { x: 0, rotation: 0, backgroundColor: "rgba(235,226,255,0)", duration: .4 });
      });
    });
  }
  if (HAS_GSAP && (FX.tagFloat || FX.tagRepel || FX.ruleFlip)) ScrollTrigger.create({ trigger: "#vlastni", start: "top 95%", once: true, onEnter: initTaste });

  /* ---------- own-idea test ---------- */
  const TEST = [
    "Is it from a brand that mainly does one thing (running, outdoor, clothing)?",
    "Would Vojta wear it almost every day, for running or at the gym?",
    "Is the logo small, or is there none?",
    "Is the colour muted: black, grey, beige, olive?",
    "It’s not Nike or a mainstream fragrance?"
  ];
  const VERDICTS = ["Tick whatever applies.", "Hmm, probably not.", "Hmm, probably not.", "Maybe, think it over.", "Almost! I’d probably like it.", "Yes! I’d wear that."];
  const checks = TEST.map(() => false);
  const testEl = $("#test"), meter = $("#meter"), verdict = $("#verdict"), bulb = $("#bulb");
  const toggles = TEST.map((q, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "toggle"; b.setAttribute("aria-pressed", "false"); b.dataset.cursor = "✓";
    b.innerHTML = `<span class="box" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5 L10 18 L20 6"/></svg></span><span>${q}</span>`;
    b.addEventListener("click", () => { checks[i] = !checks[i]; updateTest(i); });
    testEl.append(b); return b;
  });
  function updateTest(changed) {
    const n = checks.filter(Boolean).length;
    toggles.forEach((b, i) => b.setAttribute("aria-pressed", checks[i] ? "true" : "false"));
    verdict.textContent = VERDICTS[n];
    if (changed != null && FX.checkFx) {
      const b = toggles[changed], box = $(".box", b), path = $("path", b);
      if (checks[changed]) {
        gsap.fromTo(box, { scale: .4, rotation: -30 }, { scale: 1, rotation: 0, duration: .7, ease: "elastic.out(1.2,.35)" });
        gsap.fromTo(path, { strokeDashoffset: 30 }, { strokeDashoffset: 0, duration: .35, ease: "power2.out", delay: .08 });
        const c = center(box); sparks(c.x, c.y, 9, 40);
      } else {
        gsap.to(path, { strokeDashoffset: 30, duration: .2 });
        gsap.fromTo(box, { scale: .8 }, { scale: 1, duration: .4, ease: "back.out(3)" });
      }
      gsap.fromTo(verdict, { scale: .85, rotation: -2 }, { scale: 1, rotation: 0, duration: .5, ease: "back.out(3)" });
    } else if (changed != null) {
      $("path", toggles[changed]).style.strokeDashoffset = checks[changed] ? 0 : 30;
    }
    if (FX.meterFx) {
      gsap.to(meter, { scaleX: n / TEST.length, duration: .8, ease: "elastic.out(1,.5)" });
      gsap.to(bulb, { backgroundColor: n === TEST.length ? "#FF5E5B" : "#B9A1F2", scale: 1 + n * .05, duration: .4, ease: "back.out(3)" });
    } else meter.style.transform = `scaleX(${n / TEST.length})`;
    if (n === TEST.length && changed != null && checks[changed]) celebrate();
  }
  function celebrate() {
    if (!FX.approved) return;
    fanfare();
    if (confettiFn) {
      const end = Date.now() + 1300;
      (function frame() {
        confettiFn({ particleCount: 7, angle: 60, spread: 60, startVelocity: 65, origin: { x: 0, y: .8 }, colors: COLORS });
        confettiFn({ particleCount: 7, angle: 120, spread: 60, startVelocity: 65, origin: { x: 1, y: .8 }, colors: COLORS });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
    const st = $("#stamp");
    gsap.timeline()
      .fromTo(st, { opacity: 0, scale: 4, rotation: -40, xPercent: -50, yPercent: -50 }, { opacity: 1, scale: 1, rotation: -12, duration: .32, ease: "power4.in" })
      .to("#wrap", { x: 12, y: -6, duration: .045, yoyo: true, repeat: 9, ease: "none", clearProps: "x,y" })
      .to(st, { opacity: 0, scale: 1.2, duration: .4, delay: 1.5 });
  }
  updateTest(null);

  /* ---------- not these ---------- */
  if (FX.nopeFx) {
    const lis = $$("#nopeList li");
    lis.forEach(li => { const s = document.createElement("span"); s.className = "strike"; s.setAttribute("aria-hidden", "true"); li.appendChild(s);
      li.addEventListener("pointerenter", () => gsap.fromTo(li, { x: -6 }, { x: 0, duration: .5, ease: "elastic.out(2,.2)", overwrite: true })); });
    gsap.timeline({ scrollTrigger: { trigger: "#nopeList", start: "top 85%" } })
      .from(lis, { scale: .5, opacity: 0, rotation: () => rand(-14, 14), duration: .5, ease: "back.out(2.5)", stagger: .07 })
      .to($$(".strike"), { scaleX: 1, duration: .35, ease: "power2.inOut", stagger: .08 }, "-=.2");
  }

  /* ---------- heart ---------- */
  const heart = $("#heart");
  heart.dataset.cursor = "💜";
  let beat = null, clicks = 0, clickTimer = null;
  if (FX.heart) beat = gsap.timeline({ repeat: -1, repeatDelay: .7 })
    .to(heart, { scale: 1.18, duration: .14, ease: "power2.out" }).to(heart, { scale: 1, duration: .16 })
    .to(heart, { scale: 1.12, duration: .12 }).to(heart, { scale: 1, duration: .4, ease: "elastic.out(1,.4)" });
  heart.addEventListener("click", () => {
    if (!HAS_GSAP || CALM) return;
    const c = center(heart); sparks(c.x, c.y, 10, 60);
    gsap.fromTo(heart, { rotation: -15 }, { rotation: 0, duration: .6, ease: "elastic.out(1.5,.3)" });
    clicks++; clearTimeout(clickTimer); clickTimer = setTimeout(() => (clicks = 0), 2500);
    if (clicks >= 5 && FX.easterEgg) { clicks = 0; giftRain(); }
  });
  function giftRain() {
    if (!confettiFn) return;
    let shapes = [];
    try { shapes = ["🎁", "🎀", "💜", "🧦"].map(t => confettiFn.shapeFromText({ text: t, scalar: 3 })); } catch (e) {}
    const end = Date.now() + 3200;
    (function frame() {
      confettiFn({ particleCount: 2, startVelocity: 0, gravity: .55, ticks: 380, origin: { x: Math.random(), y: -.05 }, shapes: shapes.length ? shapes : undefined, scalar: 3, flat: true });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  /* ---------- jelly buttons ---------- */
  if (FX.jelly) document.addEventListener("pointerover", e => {
    const el = e.target.closest(".btn, .go, .ctl, .toggle");
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget)) || gsap.isTweening(el)) return;
    gsap.timeline().to(el, { scaleX: 1.12, scaleY: .88, duration: .12 }).to(el, { scaleX: .96, scaleY: 1.05, duration: .12 }).to(el, { scaleX: 1, scaleY: 1, duration: .6, ease: "elastic.out(1,.35)" });
  });

  /* ---------- gyroscope (phones) ---------- */
  if (FX.gyro && !FINE && "DeviceOrientationEvent" in window && typeof DeviceOrientationEvent.requestPermission !== "function") {
    const fls = $$(".fl"), bubbles = $$(".bubble");
    const qf = fls.map(f => gsap.quickTo(f, "x", { duration: .8, ease: "power2" }));
    const qb = bubbles.map(b => ({ x: gsap.quickTo(b, "rotationY", { duration: .6 }), y: gsap.quickTo(b, "rotationX", { duration: .6 }) }));
    const hb = gsap.quickTo(heroBlob, "x", { duration: 1.2 });
    addEventListener("deviceorientation", e => {
      const g = gsap.utils.clamp(-30, 30, e.gamma || 0), bt = gsap.utils.clamp(-30, 30, (e.beta || 45) - 45);
      qf.forEach((q, i) => q(g * (1 + i % 3)));
      qb.forEach(q => { q.x(g / 3); q.y(-bt / 4); });
      hb(g * 3);
    }, { passive: true });
  }

  /* ---------- start ---------- */
  renderResults();
  if (HAS_GSAP) reveals();
  const go = () => { if (ANY && HAS_GSAP) heroIn(); };
  if (FX.intro) intro(go); else go();
  if (HAS_GSAP) addEventListener("load", () => ScrollTrigger.refresh());
})();
