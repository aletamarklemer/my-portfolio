// Lumina Noir — reveal-on-scroll animation with sibling stagger
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      const el = e.target;
      // stagger: delay by index among reveal siblings in the same parent
      const siblings = Array.from(el.parentElement.children)
        .filter(c => c.classList.contains('reveal'));
      const idx = siblings.indexOf(el);
      if (idx > 0) {
        el.style.transitionDelay = (Math.min(idx, 5) * 0.12) + 's';
        el.addEventListener('transitionend', () => {
          el.style.transitionDelay = '0s';
        }, { once: true });
      }
      el.classList.add('in');
      io.unobserve(el);
    }
  }
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => io.observe(el));
