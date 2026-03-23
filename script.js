/* script.js – Lumière Ecommerce Interactivity */

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── Dynamic copyright year ─────────────────────────────────────────────────────
$('#year').textContent = new Date().getFullYear();

// ── Announcement Bar ──────────────────────────────────────────────────────────
const announcementBar  = $('#announcement-bar');
const announcementClose = $('#announcement-close');
const navbar           = $('#navbar');

function removeAnnouncement() {
  announcementBar.classList.add('hidden');
  navbar.classList.add('announcement-gone');
  document.documentElement.style.setProperty('--announcement-height', '0px');
}

announcementClose.addEventListener('click', removeAnnouncement);

// ── Navbar Scroll Effect ───────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Mobile Hamburger Menu ─────────────────────────────────────────────────────
const hamburger = $('#hamburger');
const navLinks  = $('#nav-links');

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

// ── Search Toggle ─────────────────────────────────────────────────────────────
const searchToggle = $('#search-toggle');
const searchBar    = $('#search-bar');
const searchInput  = $('#search-input');
const searchClear  = $('#search-clear');

searchToggle.addEventListener('click', () => {
  const open = searchBar.classList.toggle('open');
  if (open) searchInput.focus();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchInput.focus();
  filterProductsBySearch('');
});

searchInput.addEventListener('input', () => {
  filterProductsBySearch(searchInput.value.trim().toLowerCase());
});

function filterProductsBySearch(query) {
  $$('.product-card').forEach(card => {
    const nameEl  = card.querySelector('.product-name');
    const brandEl = card.querySelector('.product-brand');
    const name  = nameEl  ? nameEl.textContent.toLowerCase()  : '';
    const brand = brandEl ? brandEl.textContent.toLowerCase() : '';
    if (!query || name.includes(query) || brand.includes(query)) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

// ── Category Cards → Filter ───────────────────────────────────────────────────
$$('.category-card').forEach(card => {
  card.addEventListener('click', (e) => {
    const filter = card.dataset.filter;
    if (filter) {
      e.preventDefault();
      applyFilter(filter);
      document.querySelector('#products').scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ── Product Filter Tabs ───────────────────────────────────────────────────────
const filterTabs = $$('.filter-tab');

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    applyFilter(tab.dataset.filter);
  });
});

function applyFilter(filter) {
  // Sync tabs
  filterTabs.forEach(t => {
    const isMatch = t.dataset.filter === filter;
    t.classList.toggle('active', isMatch);
    t.setAttribute('aria-selected', String(isMatch));
  });

  $$('.product-card').forEach(card => {
    if (filter === 'all' || card.dataset.category === filter) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

// ── Wishlist Toggle ───────────────────────────────────────────────────────────
$$('.product-wishlist').forEach(btn => {
  btn.addEventListener('click', () => {
    const active = btn.classList.toggle('active');
    btn.textContent = active ? '♥' : '♡';
  });
});

// ── Cart State ────────────────────────────────────────────────────────────────
let cart = [];

const cartToggle   = $('#cart-toggle');
const cartOverlay  = $('#cart-overlay');
const cartDrawer   = $('#cart-drawer');
const cartClose    = $('#cart-close');
const cartBody     = $('#cart-body');
const cartCount    = $('#cart-count');
const cartItemCount = $('#cart-item-count');
const cartTotal    = $('#cart-total');
const checkoutBtn  = $('#checkout-btn');

function openCart()  { cartDrawer.classList.add('open'); cartOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { cartDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); document.body.style.overflow = ''; }

cartToggle.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) return;
  showToast('🛍️ Redirecting to checkout…');
  setTimeout(() => { cart = []; renderCart(); closeCart(); }, 1400);
});

// Add to cart buttons
$$('.btn-add-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const id    = btn.dataset.id;
    const name  = btn.dataset.name;
    const price = parseFloat(btn.dataset.price);

    const existing = cart.find(item => item.id === id);
    if (existing) {
      existing.qty++;
    } else {
      // Get a background colour from the product image for the thumb
      const card = btn.closest('.product-card');
      const imgEl = card.querySelector('.product-img');
      const bg = (imgEl && imgEl.dataset.bg) ? imgEl.dataset.bg : 'linear-gradient(135deg,#a78bfa,#7c3aed)';
      const emojiEl = card.querySelector('.img-emoji');
      const emoji = emojiEl ? emojiEl.textContent : '🛍️';
      cart.push({ id, name, price, qty: 1, bg, emoji });
    }

    renderCart();
    showToast(`✓ ${name} added to cart`);
    openCart();
  });
});

function renderCart() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  cartCount.textContent = totalItems;
  cartItemCount.textContent = totalItems;
  cartTotal.textContent = `$${totalPrice.toFixed(2)}`;

  if (cart.length === 0) {
    cartBody.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    return;
  }

  cartBody.innerHTML = cart.map(item => {
    // Validate bg: only allow CSS gradient/color values (alphanumeric, parens, commas, spaces, #, %, -)
    const safeBg = /^[\w\s,#().%/-]+$/.test(item.bg) ? item.bg : 'linear-gradient(135deg,#a78bfa,#7c3aed)';
    const safeName = item.name.replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c]));
    return `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-thumb" style="background:${safeBg}">${item.emoji}</div>
      <div class="cart-item-info">
        <p class="cart-item-name">${safeName}</p>
        <p class="cart-item-price">$${item.price.toFixed(2)} each</p>
        <div class="cart-item-qty">
          <button class="qty-btn qty-dec" data-id="${item.id}" aria-label="Decrease quantity">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn qty-inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove ${safeName}">✕</button>
    </div>
  `;
  }).join('');

  // Quantity controls
  $$('.qty-inc', cartBody).forEach(btn => {
    btn.addEventListener('click', () => { changeQty(btn.dataset.id, 1); });
  });
  $$('.qty-dec', cartBody).forEach(btn => {
    btn.addEventListener('click', () => { changeQty(btn.dataset.id, -1); });
  });
  $$('.cart-item-remove', cartBody).forEach(btn => {
    btn.addEventListener('click', () => { removeItem(btn.dataset.id); });
  });
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeItem(id);
  else renderCart();
}

function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  renderCart();
}

// ── Toast Notification ────────────────────────────────────────────────────────
const toast = $('#toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ── Load More (demo) ──────────────────────────────────────────────────────────
$('#load-more').addEventListener('click', function() {
  showToast('✓ All products loaded');
  this.disabled = true;
  this.textContent = 'All Products Shown';
});

// ── Countdown Timer ───────────────────────────────────────────────────────────
function startCountdown() {
  // Countdown to this Sunday midnight (same day if today is Sunday, else next Sunday)
  function getTarget() {
    const now    = new Date();
    const target = new Date(now);
    const daysUntilSunday = now.getDay() === 0 ? 0 : (7 - now.getDay());
    target.setDate(now.getDate() + daysUntilSunday);
    target.setHours(23, 59, 59, 0);
    // If already past midnight Sunday end, target the following Sunday
    if (target <= now) {
      target.setDate(target.getDate() + 7);
    }
    return target;
  }

  function tick() {
    const diff = getTarget() - Date.now();
    if (diff <= 0) return;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    $('#cd-hours').textContent = String(h).padStart(2, '0');
    $('#cd-mins').textContent  = String(m).padStart(2, '0');
    $('#cd-secs').textContent  = String(s).padStart(2, '0');
  }

  tick();
  setInterval(tick, 1000);
}
startCountdown();

// ── Newsletter Form ───────────────────────────────────────────────────────────
const nlForm   = $('#newsletter-form');
const nlStatus = $('#nl-status');

nlForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#nl-email').value.trim();
  if (!email) {
    nlStatus.textContent = 'Please enter a valid email.';
    nlStatus.className = 'nl-status error';
    return;
  }
  const btn = nlForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Subscribing…';
  setTimeout(() => {
    nlStatus.textContent = '🎉 You\'re in! Check your inbox for a welcome gift.';
    nlStatus.className = 'nl-status';
    nlForm.reset();
    btn.disabled = false;
    btn.textContent = 'Subscribe';
  }, 1000);
});

// ── Scroll Reveal ─────────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

[
  '.section-title',
  '.product-card',
  '.category-card',
  '.testimonial-card',
  '.trust-list li',
  '.deals-text',
  '.deals-countdown',
].forEach(sel => {
  $$(sel).forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });
});
