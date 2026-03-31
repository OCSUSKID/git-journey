/* portfolio.js – Portfolio Website Interactivity */
'use strict';

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── Dynamic year ──────────────────────────────────────────────────────────────
const footerYear = $('#footer-year');
if (footerYear) footerYear.textContent = new Date().getFullYear();

// ── Particle Canvas Background ────────────────────────────────────────────────
(function initCanvas() {
  const canvas = $('#bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  const PARTICLE_COUNT = 80;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randomParticle() {
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.5 + 0.5,
      vx: (Math.random() - .5) * .35,
      vy: (Math.random() - .5) * .35,
      a:  Math.random() * .6 + .15,
    };
  }

  function initParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, randomParticle);
  }

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${p.a})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      if (p.y < -5) p.y = H + 5;
      if (p.y > H + 5) p.y = -5;
    });

    // Draw connections between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99,102,241,${.12 * (1 - dist / 120)})`;
          ctx.lineWidth = .5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(drawParticles);
  }

  resize();
  initParticles();
  drawParticles();
  window.addEventListener('resize', () => { resize(); initParticles(); }, { passive: true });
})();

// ── Navbar scroll effect ───────────────────────────────────────────────────────
const navbar = $('#navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ── Hamburger menu ─────────────────────────────────────────────────────────────
const hamburger = $('#hamburger');
const navLinks  = $('#nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
  });

  $$('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Typed text effect ─────────────────────────────────────────────────────────
(function initTyped() {
  const el = $('#typed-text');
  if (!el) return;

  const phrases = [
    'build stunning UIs.',
    'craft clean APIs.',
    'design systems.',
    'love open-source.',
    'ship great products.',
  ];

  let phraseIdx = 0;
  let charIdx   = 0;
  let deleting  = false;
  let paused    = false;

  function tick() {
    const phrase = phrases[phraseIdx];

    if (!deleting) {
      el.textContent = phrase.slice(0, charIdx + 1);
      charIdx++;
      if (charIdx === phrase.length) {
        paused = true;
        setTimeout(() => { paused = false; deleting = true; loop(); }, 2000);
        return;
      }
    } else {
      el.textContent = phrase.slice(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        setTimeout(loop, 400);
        return;
      }
    }

    loop();
  }

  function loop() {
    if (paused) return;
    const speed = deleting ? 50 : 80;
    setTimeout(tick, speed);
  }

  loop();
})();

// ── Counter animation ──────────────────────────────────────────────────────────
function animateCounter(el) {
  const target  = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const start    = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ── Intersection Observer – scroll reveals ─────────────────────────────────────
const revealObs = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add('visible');

      // Counter animation
      entry.target.querySelectorAll('.stat-num[data-target]').forEach(animateCounter);

      revealObs.unobserve(entry.target);
    });
  },
  { threshold: 0.12 }
);

$$('.reveal').forEach(el => revealObs.observe(el));

// Observe hero stats (they're outside .reveal containers)
$$('.stat-num[data-target]').forEach(el => {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      animateCounter(el);
      obs.disconnect();
    }
  }, { threshold: .5 });
  obs.observe(el);
});

// ── Skills tabs ────────────────────────────────────────────────────────────────
$$('.skill-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.skill-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    $$('.skills-panel').forEach(panel => {
      const isTarget = panel.id === `panel-${tab.dataset.target}`;
      panel.hidden = !isTarget;
      if (isTarget) {
        // Re-observe skill bars in the newly shown panel
        panel.querySelectorAll('.skill-card').forEach(card => {
          card.classList.add('reveal');
          revealObs.observe(card);
          // Trigger immediately if already in view
          const rect = card.getBoundingClientRect();
          if (rect.top < window.innerHeight) {
            card.classList.add('visible');
          }
        });
      }
    });
  });
});

// ── Project filters ────────────────────────────────────────────────────────────
$$('.proj-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.proj-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    $$('.project-card').forEach(card => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden', !show);
    });
  });
});

// ── Contact form ───────────────────────────────────────────────────────────────
const contactForm = $('#contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();

    // Clear previous errors
    $$('.form-error').forEach(el => { el.textContent = ''; });
    const status = $('#form-status');
    status.textContent = '';
    status.className = 'form-status';

    const name    = $('#cf-name').value.trim();
    const email   = $('#cf-email').value.trim();
    const message = $('#cf-message').value.trim();

    let valid = true;

    if (!name) {
      $('#err-name').textContent = 'Please enter your name.';
      valid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]{2,}\.[^\s@]{2,}$/.test(email)) {
      $('#err-email').textContent = 'Please enter a valid email address.';
      valid = false;
    }

    if (!message) {
      $('#err-message').textContent = 'Please write a message.';
      valid = false;
    }

    if (!valid) return;

    const submitBtn  = $('#cf-submit');
    const btnText    = submitBtn.querySelector('.btn-text');
    const btnIcon    = submitBtn.querySelector('.btn-icon');
    submitBtn.disabled = true;
    btnText.textContent = 'Sending…';
    btnIcon.textContent = '⌛';

    // Simulate async send (replace with real fetch() when backend is ready)
    setTimeout(() => {
      contactForm.reset();
      submitBtn.disabled = false;
      btnText.textContent = 'Send Message';
      btnIcon.textContent = '→';
      status.textContent = '🎉 Message sent! I\'ll be in touch within 24 hours.';
      status.className = 'form-status success';
      showToast('✓ Message sent successfully!');

      // Clear success after 8 s
      setTimeout(() => { status.textContent = ''; status.className = 'form-status'; }, 8000);
    }, 1200);
  });
}

// ── Toast ──────────────────────────────────────────────────────────────────────
const toast = $('#portfolio-toast');
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Active nav link highlighting ───────────────────────────────────────────────
(function initActiveNav() {
  const sections = $$('section[id]');
  const navItems = $$('.nav-links a');

  const navHeight = getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim() || '72px';
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navItems.forEach(link => {
            link.classList.toggle(
              'active',
              link.getAttribute('href') === `#${entry.target.id}`
            );
          });
        }
      });
    },
    { rootMargin: `-${navHeight} 0px -60% 0px` }
  );

  sections.forEach(s => observer.observe(s));
})();
