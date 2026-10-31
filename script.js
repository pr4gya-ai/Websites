/* ==========================================================================
   Vinea: interactions and motion.
   No libraries. Everything here switches off for visitors who choose "reduce motion".
   ========================================================================== */
(() => {
  const doc = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const header = $('#header');
  const progress = $('#progress');
  const menuPanel = $('#menuPanel');
  let menuOpen = false;

  /* ------------------------------------------------------------------
     1. Prepare text: split headings into lines, the footer word into letters
     ------------------------------------------------------------------ */
  $$('[data-split]').forEach((el) => {
    // Lines are separated by <br> in the HTML. Inline tags such as <em> are kept.
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map((html, i) => `<span class="line"><span style="--i:${i}">${html.trim()}</span></span>`).join('');
  });

  $$('[data-letters]').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    el.classList.add('letters');
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i);
      s.textContent = ch;
      el.appendChild(s);
    });
  });

  // Children of a [data-stagger] group animate one after another.
  $$('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      if (!child.matches('.reveal, .img-reveal')) child.classList.add('reveal');
      child.style.setProperty('--d', `${i * 0.1}s`);
      child.style.setProperty('--dd', `${i * 0.1}s`);
    });
  });

  /* ------------------------------------------------------------------
     2. Reveal on scroll (starts once the intro has finished)
     ------------------------------------------------------------------ */
  // Clipped images cannot use IntersectionObserver (a fully clipped element counts as invisible),
  // so the animation loop checks their position instead.
  let imgPending = [];

  function startReveals() {
    doc.classList.add('is-loaded');
    const all = $$('.reveal, .img-reveal, [data-split], .letters');
    const targets = all.filter((el) => !el.classList.contains('img-reveal'));
    if (reduce || !('IntersectionObserver' in window)) {
      all.forEach((el) => el.classList.add('visible'));
      return;
    }
    imgPending = all.filter((el) => el.classList.contains('img-reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     3. Intro curtain: a counter runs, the word lifts away, the curtain rises.
        Plays once per visit, never for reduced motion.
     ------------------------------------------------------------------ */
  const loader = $('#loader');
  let seen = false;
  try { seen = sessionStorage.getItem('vinea-intro') === '1'; } catch (e) { /* storage blocked: just play it */ }

  if (!loader || reduce || seen) {
    if (loader) loader.remove();
    startReveals();
  } else {
    const count = $('#loaderCount');
    const bar = $('.bar', loader);
    const duration = 1600;
    let t0 = null;
    document.body.style.overflow = 'hidden';

    const tick = (now) => {
      if (t0 === null) t0 = now;
      const p = clamp((now - t0) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      bar.style.transform = `scaleX(${eased})`;
      if (p < 1) { requestAnimationFrame(tick); return; }
      loader.classList.add('done');
      setTimeout(startReveals, 450);           // headline starts while the curtain is still rising
      setTimeout(() => {
        loader.remove();
        if (!menuOpen) document.body.style.overflow = '';
      }, 1200);
      try { sessionStorage.setItem('vinea-intro', '1'); } catch (e) { /* ignore */ }
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------
     4. Marquee: needs enough copies to fill any screen, then moves with scroll
     ------------------------------------------------------------------ */
  const marquee = $('.marquee');
  let marqueeX = 0;
  let marqueeHalf = 0;
  let marqueeHover = false;
  let marqueeDir = 1;

  function buildMarquee() {
    if (!marquee) return;
    $$('[data-clone]', marquee).forEach((n) => n.remove());
    const first = marquee.firstElementChild;
    marqueeHalf = first.offsetWidth;
    while (marquee.scrollWidth < innerWidth + marqueeHalf * 2) {
      const c = first.cloneNode(true);
      c.setAttribute('data-clone', '');
      c.setAttribute('aria-hidden', 'true');
      marquee.appendChild(c);
    }
  }
  if (marquee) {
    marquee.style.animation = 'none';
    buildMarquee();
    addEventListener('resize', buildMarquee);
    marquee.parentElement.addEventListener('mouseenter', () => { marqueeHover = true; });
    marquee.parentElement.addEventListener('mouseleave', () => { marqueeHover = false; });
  }

  /* ------------------------------------------------------------------
     5. One animation loop for everything that follows the scroll
     ------------------------------------------------------------------ */
  const parallax = reduce ? [] : $$('[data-parallax]').map((el) => ({
    el,
    host: el.parentElement,
    speed: parseFloat(el.dataset.parallax) || 0.08,
    isImg: el.tagName === 'IMG',
  }));

  let lastY = scrollY;
  let velocity = 0;
  let lastT = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    const y = scrollY;
    const dy = y - lastY;
    lastY = y;
    velocity += (dy - velocity) * 0.12;

    // Reading progress bar
    const max = doc.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

    // Header hides while reading down, returns as soon as you scroll up
    if (!menuOpen) {
      if (y > 140 && dy > 2) header.classList.add('hide');
      else if (dy < -2 || y <= 140) header.classList.remove('hide');
    }

    // Image wipes open once they are 12% into the screen
    if (imgPending.length) {
      imgPending = imgPending.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight * 0.88 && r.bottom > 0) { el.classList.add('visible'); return false; }
        return true;
      });
    }

    // Parallax
    for (const p of parallax) {
      const r = p.host.getBoundingClientRect();
      if (r.bottom < -250 || r.top > innerHeight + 250) continue;
      const offset = r.top + r.height / 2 - innerHeight / 2;
      let ty = -offset * p.speed;
      if (p.isImg) ty = clamp(ty, -r.height * 0.08, r.height * 0.08); // stay inside the spare picture area
      p.el.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)`;
    }

    // Marquee: runs left, speeds up with scroll, glides into reverse when you scroll up
    if (marquee && !reduce) {
      if (dy > 0.5) marqueeDir += (1 - marqueeDir) * 0.08;
      else if (dy < -0.5) marqueeDir += (-1 - marqueeDir) * 0.08;
      const speed = (60 + Math.abs(velocity) * 22) * (marqueeHover ? 0.15 : 1);
      marqueeX -= speed * marqueeDir * dt;
      if (marqueeX <= -marqueeHalf) marqueeX += marqueeHalf;
      if (marqueeX > 0) marqueeX -= marqueeHalf;
      const skew = clamp(-velocity * 0.18, -7, 7);
      marquee.style.transform = `translate3d(${marqueeX.toFixed(1)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
    }

    // Cursor follows with a little lag
    if (cursor) {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    }

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
     6. Cursor ring (mouse only)
     ------------------------------------------------------------------ */
  let cursor = null;
  let dot = null;
  let mx = 0;
  let my = 0;
  let cx = 0;
  let cy = 0;
  if (finePointer && !reduce) {
    cursor = document.createElement('div');
    cursor.id = 'cursor';
    dot = document.createElement('div');
    dot.id = 'cursorDot';
    cursor.setAttribute('aria-hidden', 'true');
    dot.setAttribute('aria-hidden', 'true');
    document.body.append(cursor, dot);

    addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!doc.classList.contains('cursor-on')) { cx = mx; cy = my; doc.classList.add('cursor-on'); }
      const interactive = e.target.closest && e.target.closest('a, button, input, select, textarea, label, .wine-card');
      doc.classList.toggle('cursor-link', !!interactive);
    }, { passive: true });
    addEventListener('pointerdown', () => doc.classList.add('cursor-down'));
    addEventListener('pointerup', () => doc.classList.remove('cursor-down'));
    document.addEventListener('mouseleave', () => doc.classList.remove('cursor-on'));

    // Magnetic buttons: they lean toward the pointer
    $$('.outline-button, button[type=submit], .mag').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.28;
        const yy = (e.clientY - (r.top + r.height / 2)) * 0.38;
        el.style.transform = `translate(${x.toFixed(1)}px, ${yy.toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  requestAnimationFrame(frame);

  /* ------------------------------------------------------------------
     7. Mobile navigation
     ------------------------------------------------------------------ */
  const menuBtn = $('#menuBtn');
  const toggleMenu = (open) => {
    menuOpen = open;
    menuPanel.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) header.classList.remove('hide');
    if (open) $('#closeMenu').focus(); else menuBtn.focus({ preventScroll: true });
  };
  $$('.menu-link', menuPanel).forEach((link, i) => {
    link.style.setProperty('--i', i);
    link.addEventListener('click', () => toggleMenu(false));
  });
  menuBtn.addEventListener('click', () => toggleMenu(true));
  $('#closeMenu').addEventListener('click', () => toggleMenu(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });

  /* ------------------------------------------------------------------
     8. Demo forms. Connect these to a backend or form provider for production.
     ------------------------------------------------------------------ */
  function showStatus(el, text) {
    el.textContent = text;
    el.classList.remove('status-in');
    void el.offsetWidth; // restart the animation
    el.classList.add('status-in');
  }

  $('#contactForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get('name');
    showStatus($('#contactStatus'), `Thank you, ${name}. Your message is ready to be connected to our team.`);
    event.currentTarget.reset();
  });
  $('#registerForm').addEventListener('submit', (event) => {
    event.preventDefault();
    showStatus($('#registerStatus'), 'Thank you for registering your interest. We’ll be in touch!');
    event.currentTarget.reset();
  });
})();
