/* script.js – Portfolio interactivity */

// ── Navbar scroll effect ──────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── Mobile hamburger menu ─────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

// Close mobile menu when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// ── Scroll-reveal animation ───────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

// Apply reveal class to key elements after DOM is ready
const revealSelectors = [
  '.section-title',
  '.about-grid',
  '.skill-card',
  '.project-card',
  '.contact-grid',
];

revealSelectors.forEach(selector => {
  document.querySelectorAll(selector).forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });
});

// ── Contact form (demo – logs to console) ────────────────────────────────────
const form       = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name    = form.name.value.trim();
  const email   = form.email.value.trim();
  const message = form.message.value.trim();

  if (!name || !email || !message) {
    formStatus.textContent = 'Please fill in all fields.';
    formStatus.className   = 'form-status error';
    return;
  }

  // Simulate sending (replace with a real API call or service like EmailJS)
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  setTimeout(() => {
    formStatus.textContent = '✅ Message sent! I\'ll get back to you soon.';
    formStatus.className   = 'form-status';
    form.reset();
    btn.disabled    = false;
    btn.textContent = 'Send Message';
  }, 1200);
});

// ── Dynamic copyright year ────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();
