/* Progressive enhancement: original content remains available without JavaScript. */
(() => {
  'use strict';
  const art = document.querySelector('.hero .art');
  if (!art) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const slides = [
    ['chemistry', '01 / MATTER & MOLECULES', 'Small particles.', 'Infinite possibilities.', 'Discover the building blocks of our world.', '/explore/', 'Explore science'],
    ['space', '02 / FORCES & FRONTIERS', 'Big questions.', 'Beyond the horizon.', 'Explore physics, from everyday forces to distant worlds.', '/explore/', 'Follow your curiosity'],
    ['code', '03 / IDEAS INTO ACTION', 'Think it.', 'Code it. Create it.', 'Build your skills and turn a curious idea into something real.', '/skills/', 'Discover new skills']
  ];
  art.removeAttribute('aria-hidden');
  art.className = 'science-slider';
  art.setAttribute('role', 'region');
  art.setAttribute('aria-roledescription', 'carousel');
  art.setAttribute('aria-label', 'Science spotlight');
  const viewport = document.createElement('div');
  viewport.className = 'spotlight-viewport';
  const panels = slides.map(([kind, label, first, second, copy, href, cta], index) => {
    const panel = document.createElement('div');
    panel.className = 'spotlight-panel ' + kind;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-roledescription', 'slide');
    panel.setAttribute('aria-label', `${index + 1} of ${slides.length}`);
    const visual = document.createElement('div');
    visual.className = 'science-visual';
    visual.setAttribute('aria-hidden', 'true');
    visual.innerHTML = '<i></i><i></i><i></i><span>' + ({chemistry:'H₂O',space:'✦',code:'&lt;/&gt;'}[kind]) + '</span>';
    const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.textContent = label;
    const title = document.createElement('h2'); title.append(first, document.createElement('br'));
    const accent = document.createElement('em'); accent.textContent = second; title.append(accent);
    const description = document.createElement('p'); description.textContent = copy;
    const link = document.createElement('a'); link.href = href; link.textContent = cta + ' →';
    panel.append(visual, eyebrow, title, description, link);
    viewport.append(panel); return panel;
  });
  const controls = document.createElement('div'); controls.className = 'spotlight-controls';
  const button = (label, text, handler) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', label); b.textContent = text; b.onclick = handler; return b; };
  let current = 0, timer, paused = reduced.matches, hovering = false;
  const dots = slides.map((_, i) => button('Show spotlight ' + (i + 1), '•', () => { show(i); schedule(); }));
  const pause = button('Pause automatic slides', 'Pause', () => { paused = !paused; updatePause(); schedule(); });
  const status = document.createElement('span'); status.className = 'slider-sr'; status.setAttribute('aria-live', 'off');
  function updatePause() { pause.textContent = paused ? 'Play' : 'Pause'; pause.setAttribute('aria-label', paused ? 'Play automatic slides' : 'Pause automatic slides'); }
  function show(index) {
    current = (index + panels.length) % panels.length;
    panels.forEach((panel, i) => { panel.hidden = i !== current; panel.inert = i !== current; dots[i].setAttribute('aria-pressed', String(i === current)); });
    status.textContent = 'Spotlight ' + (current + 1) + ' of ' + panels.length;
  }
  function schedule() {
    clearTimeout(timer);
    if (!paused && !hovering && !document.hidden && !art.contains(document.activeElement)) timer = setTimeout(() => { show(current + 1); schedule(); }, 6500);
  }
  controls.append(button('Previous spotlight', '←', () => { show(current - 1); schedule(); }), ...dots, button('Next spotlight', '→', () => { show(current + 1); schedule(); }), pause);
  art.replaceChildren(viewport, controls, status);
  art.addEventListener('mouseenter', () => { hovering = true; schedule(); });
  art.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  art.addEventListener('focusin', () => { status.setAttribute('aria-live', 'polite'); schedule(); });
  art.addEventListener('focusout', () => setTimeout(() => { status.setAttribute('aria-live', art.contains(document.activeElement) ? 'polite' : 'off'); schedule(); }, 0));
  art.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show(current + (e.key === 'ArrowRight' ? 1 : -1)); schedule(); } });
  let start;
  viewport.addEventListener('touchstart', e => { start = [e.changedTouches[0].clientX, e.changedTouches[0].clientY]; }, {passive:true});
  viewport.addEventListener('touchend', e => { if (!start) return; const dx = e.changedTouches[0].clientX - start[0], dy = e.changedTouches[0].clientY - start[1]; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) { show(current + (dx < 0 ? 1 : -1)); schedule(); } start = null; }, {passive:true});
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { paused = reduced.matches; updatePause(); schedule(); });
  show(0); updatePause(); schedule();
  const topics = document.querySelector('#topics');
  if (topics) {
    topics.querySelectorAll('.symbol').forEach((symbol, index) => { symbol.textContent = ['Φ', 'H₂O', 'DNA', '</>'][index]; });
    topics.classList.add('topic-slider'); topics.id = 'topics';
    topics.setAttribute('aria-label', 'Explore science topics');
    const toolbar = document.createElement('div'); toolbar.className = 'topic-slider-controls';
    const prev = button('Previous science topics', '←', () => move(-1));
    const next = button('Next science topics', '→', () => move(1));
    [prev, next].forEach(b => b.setAttribute('aria-controls', 'topics'));
    function move(direction) { topics.scrollBy({left: direction * (topics.firstElementChild?.getBoundingClientRect().width + 18 || 300), behavior: reduced.matches ? 'instant' : 'smooth'}); }
    function edges() { prev.disabled = topics.scrollLeft <= 2; next.disabled = topics.scrollLeft + topics.clientWidth >= topics.scrollWidth - 2; }
    toolbar.append(prev, next); topics.before(toolbar);
    topics.addEventListener('scroll', edges, {passive:true}); window.addEventListener('resize', edges); edges();
  }
})();
