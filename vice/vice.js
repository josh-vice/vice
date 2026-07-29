/* Vice Suite pages — shared behavior.
   Scroll-reveal: elements marked .sr fade-slide in when they enter the
   viewport (the .reveal class only animates on page load, so below-fold
   content needs this). One-shot per element; disabled for reduced motion. */

function initScrollReveal() {
  const els = [...document.querySelectorAll('.sr')];
  if (els.length === 0) return;
  const revealAll = () => els.forEach((el) => el.classList.add('sr-in'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window) || window.innerHeight === 0) {
    revealAll();
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('sr-in');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -36px 0px', threshold: 0.05 });
  els.forEach((el) => io.observe(el));
  // Safety net: the reveal is decoration, visibility is not negotiable.
  // Whatever the observer missed becomes visible after 3 s regardless.
  setTimeout(revealAll, 3000);
}

/* Live server count (charts page): #vc-servers stays hidden unless the
   /api/vice-stats function answers with a positive number. */
async function initServerCount() {
  const el = document.getElementById('vc-servers');
  if (!el) return;
  try {
    const r = await fetch('/api/vice-stats', { signal: AbortSignal.timeout(8_000) });
    if (!r.ok) return;
    const { servers } = await r.json();
    if (Number.isFinite(servers) && servers > 0) {
      el.querySelector('b').textContent = servers.toLocaleString('en-US');
      el.hidden = false;
    }
  } catch { /* stat is optional — stay hidden */ }
}

function initAll() {
  initScrollReveal();
  initServerCount();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
