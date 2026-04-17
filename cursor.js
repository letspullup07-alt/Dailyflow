/* ── DayFlow — Cursor Aura & Spotlight ── */
(function () {

  /* ── Create DOM elements ── */
  const aura = document.createElement('div');
  aura.id = 'cursorAura';
  document.body.appendChild(aura);

  const dot = document.createElement('div');
  dot.id = 'cursorDot';
  document.body.appendChild(dot);

  const trail = document.createElement('div');
  trail.id = 'cursorTrail';
  document.body.appendChild(trail);

  /* ── State ── */
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let ax = mx, ay = my;   /* aura position  — lags */
  let tx = mx, ty = my;   /* trail position — lags more */
  let dx = mx, dy = my;   /* dot  position  — instant */
  let isHoveringClickable = false;
  let isHoveringCard      = false;
  let isVisible           = true;

  /* ── Track mouse ── */
  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;

    /* Card spotlight — update CSS vars on the hovered card */
    const card = e.target.closest(
      '.card, .stat-card, .day-col, .auth-card, .brand-panel'
    );
    if (card) {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((mx - r.left) / r.width  * 100).toFixed(2)}%`);
      card.style.setProperty('--my', `${((my - r.top)  / r.height * 100).toFixed(2)}%`);
    }

    /* Button shimmer — update CSS vars on hovered button */
    const btn = e.target.closest(
      '.add-btn, .auth-btn, .btn-primary, .nav-btn, .mood-btn, .vtab, .ftab, .dc-add-btn, .today-btn, .social-btn, .atab'
    );
    if (btn) {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--bx', `${((mx - r.left) / r.width  * 100).toFixed(2)}%`);
      btn.style.setProperty('--by', `${((my - r.top)  / r.height * 100).toFixed(2)}%`);
    }

    /* Detect if hovering something interactive */
    isHoveringClickable = !!e.target.closest(
      'button, a, input, select, textarea, .task-item, .habit-row, .event-item, .wk-task, .user-pill, .mood-btn, .cup, .ftab, .vtab, .day-col'
    );
    isHoveringCard = !!card;
  });

  /* Hide when leaving window */
  document.addEventListener('mouseleave', () => {
    isVisible = false;
    aura.style.opacity  = '0';
    dot.style.opacity   = '0';
    trail.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    isVisible = true;
  });

  /* ── Lerp helper ── */
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ── Animation loop ── */
  function tick() {
    /* Dot: near-instant follow */
    dx = lerp(dx, mx, 0.55);
    dy = lerp(dy, my, 0.55);

    /* Aura: smooth lag */
    ax = lerp(ax, mx, 0.10);
    ay = lerp(ay, my, 0.10);

    /* Trail: extra lag */
    tx = lerp(tx, mx, 0.055);
    ty = lerp(ty, my, 0.055);

    if (isVisible) {
      /* Dot */
      dot.style.transform  = `translate(${dx}px, ${dy}px)`;

      /* Aura — expands on hover */
      const auraScale = isHoveringClickable ? 1.65 : (isHoveringCard ? 1.25 : 1);
      aura.style.transform = `translate(${ax}px, ${ay}px) translate(-50%,-50%) scale(${auraScale})`;
      aura.style.opacity   = '1';
      dot.style.opacity    = isHoveringClickable ? '0.6' : '0.9';

      /* Trail */
      trail.style.transform = `translate(${tx}px, ${ty}px) translate(-50%,-50%)`;
      trail.style.opacity   = '0.35';
    }

    requestAnimationFrame(tick);
  }

  /* Dot starts at exact position */
  dot.style.transform = `translate(${dx}px, ${dy}px)`;
  requestAnimationFrame(tick);

  /* ── Click ripple ── */
  document.addEventListener('click', e => {
    const ripple = document.createElement('div');
    ripple.className = 'cursor-ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top  = e.clientY + 'px';
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });

})();
