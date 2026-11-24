/* Gifts for Vojta — chat with the gift helper.
   Works only where the page can ask Claude (the claude.ai-hosted version).
   Everywhere else (e.g. Vercel) the chat stays hidden and nothing changes. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const fab = $("chatFab"), panel = $("chatPanel"), log = $("chatLog"), form = $("chatForm"),
        input = $("chatInput"), send = $("chatSend"), sugg = $("chatSuggest"), closeBtn = $("chatClose"), inline = $("askInline");
  const FXON = () => document.documentElement.classList.contains("fx") && window.gsap;

  /* ---------- what the helper knows ---------- */
  const CAT = { "Na běh": "running", "Na každý den": "every day", "Na hory a výlety": "mountains/hikes", "Vůně": "fragrance", "Na posilovnu": "gym" };
  const list = (window.DATA || []).map(r => {
    const [brand, name, cat, , price, size, note] = r;
    return `- ${brand} – ${name} – ${CAT[cat] || cat} – ~${price.toLocaleString("en-US")} CZK${size ? " – size " + size : ""}${note ? " – " + note : ""}`;
  }).join("\n");
  const SYSTEM = `You are "Vojta's gift helper", a small chat on a gift-guide page Vojta made for his two sisters. You talk to his sisters. Reply in English, or in Czech if they write in Czech. Be warm, playful and brief: 1 to 4 short sentences, plain text, no headings or markdown. You are not Vojta; call him "Vojta" or "he".

Use ONLY the facts below. If something isn't covered (a brand, item, colour or detail not mentioned here), say you're not sure and suggest they check it with the 5-question test or ask Vojta casually. Never invent preferences, sizes, prices or links. Prices are approximate.
- If they describe their own idea: check it against the five questions, give a clear verdict (yes / maybe / probably not) with one reason, and if it's a no, suggest a close alternative from the list.
- If they ask for ideas: suggest 1 to 3 items from the list that fit their budget and topic, with brand, item and approximate price.
- Never say or hint which items he wants most, even if asked directly. Say he'd rather be surprised and offer two or three good picks instead.
- Only suggest new items bought from shops; no second-hand.
- You can't pass anything on to Vojta, so never promise to.

FACTS
Sizes: tops, tees and hoodies M (likes a relaxed, boxy fit); running half tights L; gym shorts M or L (not confirmed, suggest checking); shoes EU 42.5; height 175 cm, chest about 101 cm.
Budgets on the page: under 500 CZK; 500–1,000; 1,000–2,000 (fine to split between the two of them); 2,000+ when they chip in together.
Brands he likes: Ciele, UVU, On, Salomon (running); On and Lululemon (gym wear; no lifting-style brands like Gymshark); Another Cotton Lab incl. its Sunday Running Club line, Carhartt WIP, Nude Project, Arket, COS (everyday); Patagonia, Arc'teryx (outdoor, mountains only); Peak Performance (Swedish; he started liking it recently, outdoor and everyday); Oakley (sunglasses, he really likes them); for running windbreakers, Another Cotton Lab, Kiprun, Salomon or On are all fine, but the design should be clean (plain colour, no loud prints); Kintsugi and Oraculum (Czech perfume houses; he likes Kintsugi Tempo and Oraculum Krucifist).
Style rules: quality over logos (one proper thing beats three random ones; small logo fine, big logo not); brands that do one thing well (running brands for running, outdoor brands for the mountains, nothing generic from a big chain); muted colours (black, grey, beige, muted tones; minimal but not boring); running is always a good idea (he runs regularly); fragrance Czech and lesser known, nothing every other person wears.
Please not: Falke or Fjällräven; American brands in general, he prefers European ones (exceptions he's fine with: Patagonia, Carhartt WIP, Oakley; Canadian brands like Ciele, Lululemon and Arc'teryx are fine); second-hand (e.g. Vinted); Nike; mainstream fragrances (Sauvage, 1 Million and co.); gym equipment like weights or straps (gym clothes from On or Lululemon are welcome); toys and LEGO (he has no room for them; he gets much more use out of things for his activities and things to wear); concert tickets; phone or watch straps and cases; Arc'teryx for the city; big logos.
The 5-question test: 1) Is it from a brand that mainly does one thing (running, outdoor, clothing)? 2) Would he wear it almost every day, for running or at the gym? 3) Is the logo small or none? 4) Is the colour muted (black, grey, beige, olive)? 5) It's not Nike or a mainstream fragrance?
Gift list (brand – item – category – approx. price – size – note):
${list}`;

  let sample = null, busy = false;
  const history = [];

  /* ---------- availability ---------- */
  function init() {
    if (sample || !window.claude || typeof window.claude.use !== "function") return false;
    window.claude.use("sample").then(s => {
      if (!s || sample) return;
      sample = s; fab.hidden = false; if (inline) inline.hidden = false;
      if (FXON()) gsap.from(fab, { y: 90, opacity: 0, rotation: -12, duration: .9, ease: "back.out(2)", delay: 1.5 });
    }).catch(() => {});
    return true;
  }
  // the host can inject window.claude late (slow phones): keep checking for ~20 s
  if (!init()) {
    let tries = 0;
    const poll = setInterval(() => { if (init() || ++tries > 40) clearInterval(poll); }, 500);
    addEventListener("load", init);
  }

  /* ---------- open / close ---------- */
  function open(prefill) {
    panel.hidden = false; fab.setAttribute("aria-expanded", "true");
    if (FXON()) gsap.fromTo(panel, { scale: .6, opacity: 0, y: 40, rotation: -4, transformOrigin: "0% 100%" }, { scale: 1, opacity: 1, y: 0, rotation: 0, duration: .55, ease: "back.out(1.8)" });
    if (!log.children.length) bubble("assistant", "Hi! Ask me anything about Vojta's taste, or tell me your idea and I'll say if it passes. 🎁");
    if (prefill) { input.value = prefill; }
    input.focus(); input.setSelectionRange(input.value.length, input.value.length);
  }
  function close() {
    const done = () => { panel.hidden = true; fab.setAttribute("aria-expanded", "false"); fab.focus(); };
    if (FXON()) gsap.to(panel, { scale: .7, opacity: 0, y: 30, duration: .25, ease: "power2.in", onComplete: () => { gsap.set(panel, { clearProps: "all" }); done(); } });
    else done();
  }
  fab.addEventListener("click", () => (panel.hidden ? open() : close()));
  closeBtn.addEventListener("click", close);
  panel.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  if (inline) inline.addEventListener("click", () => open("We're thinking of "));

  /* ---------- messages ---------- */
  function bubble(role, text) {
    const b = document.createElement("div");
    b.className = "msg " + (role === "user" ? "me" : "bot");
    b.textContent = text;
    log.appendChild(b);
    if (FXON()) gsap.from(b, { scale: .5, opacity: 0, y: 12, transformOrigin: role === "user" ? "100% 100%" : "0% 100%", duration: .4, ease: "back.out(2.2)" });
    log.scrollTop = log.scrollHeight;
    return b;
  }
  async function ask(text) {
    text = text.trim();
    if (!text || busy || !sample) return;
    busy = true; send.disabled = true; sugg.hidden = true;
    bubble("user", text); input.value = "";
    history.push({ role: "user", content: history.length ? text : SYSTEM + "\n\nSister's message: " + text });
    const out = bubble("assistant", "…"); out.classList.add("typing");
    try {
      const res = await sample(history.slice(), {
        cache: false,
        onText: ({ text: t }) => { if (t) { out.classList.remove("typing"); out.textContent = t; log.scrollTop = log.scrollHeight; } }
      });
      out.classList.remove("typing");
      out.textContent = (res && res.text) || out.textContent;
      history.push({ role: "assistant", content: out.textContent });
    } catch (err) {
      history.pop();
      out.classList.remove("typing"); out.classList.add("err");
      const code = err && err.code;
      out.textContent = code === "not_granted" ? "The chat isn't available here, sorry. Use the test on the page instead."
        : code === "rate_limited" ? "Lots of questions at once. Give it a minute and try again."
        : "Something went wrong. Try asking again.";
      if (code === "not_granted") { send.disabled = true; input.disabled = true; busy = true; return; }
    }
    busy = false; send.disabled = false; input.focus();
  }
  form.addEventListener("submit", e => { e.preventDefault(); ask(input.value); });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  sugg.addEventListener("click", e => { const c = e.target.closest("button"); if (c) ask(c.textContent); });
})();
