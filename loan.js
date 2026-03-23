/* loan.js – Loan Calculator logic & interactivity */

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

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

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// ── Input elements ────────────────────────────────────────────────────────────
const amountSlider  = document.getElementById('loan-amount');
const amountNum     = document.getElementById('loan-amount-num');
const amountDisplay = document.getElementById('amount-display');

const rateSlider    = document.getElementById('interest-rate');
const rateNum       = document.getElementById('interest-rate-num');
const rateDisplay   = document.getElementById('rate-display');

const termSlider    = document.getElementById('loan-term');
const termNum       = document.getElementById('loan-term-num');
const termDisplay   = document.getElementById('term-display');

// ── Sync slider ↔ number input ────────────────────────────────────────────────
function syncPair(slider, numInput, displayEl, formatFn) {
  const update = (source) => {
    let v = parseFloat(source.value);
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    if (isNaN(v)) return;
    v = Math.min(Math.max(v, min), max);
    slider.value   = v;
    numInput.value = v;
    displayEl.textContent = formatFn(v);
    calculate();
  };

  slider.addEventListener('input',  () => update(slider));
  numInput.addEventListener('input', () => update(numInput));
  numInput.addEventListener('blur',  () => {
    if (numInput.value === '') numInput.value = slider.value;
  });
}

syncPair(amountSlider, amountNum, amountDisplay, (v) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
);

syncPair(rateSlider, rateNum, rateDisplay, (v) => `${v.toFixed(1)}%`);

syncPair(termSlider, termNum, termDisplay, (v) => `${v} ${v === 1 ? 'year' : 'years'}`);

// ── Donut chart ───────────────────────────────────────────────────────────────
const CIRC = 2 * Math.PI * 75; // circumference of r=75

function updateDonut(principal, totalInterest, monthly) {
  const total      = principal + totalInterest;
  const pFrac      = principal    / total;
  const iFrac      = totalInterest / total;

  const pLen = pFrac * CIRC;
  const iLen = iFrac * CIRC;

  const principalCircle = document.getElementById('donut-principal');
  const interestCircle  = document.getElementById('donut-interest');

  // Principal segment starts at 0°
  principalCircle.setAttribute('stroke-dasharray', `${pLen} ${CIRC - pLen}`);
  principalCircle.setAttribute('stroke-dashoffset', '0');

  // Interest segment starts right after principal
  interestCircle.setAttribute('stroke-dasharray', `${iLen} ${CIRC - iLen}`);
  interestCircle.setAttribute('stroke-dashoffset', `${-pLen}`);

  document.getElementById('donut-monthly').textContent = fmt(monthly);
}

function resetDonut() {
  const principalCircle = document.getElementById('donut-principal');
  const interestCircle  = document.getElementById('donut-interest');
  principalCircle.setAttribute('stroke-dasharray', `0 ${CIRC}`);
  interestCircle.setAttribute('stroke-dasharray',  `0 ${CIRC}`);
  document.getElementById('donut-monthly').textContent = '—';
}

// ── Amortization schedule (monthly then grouped by year) ─────────────────────
function buildAmortization(principal, monthlyRate, totalMonths, monthlyPayment) {
  const rows = [];
  let balance = principal;

  for (let year = 1; year <= Math.ceil(totalMonths / 12); year++) {
    const startBalance = balance;
    let yearPrincipal  = 0;
    let yearInterest   = 0;
    const monthsThisYear = Math.min(12, totalMonths - (year - 1) * 12);

    for (let m = 0; m < monthsThisYear; m++) {
      const interestCharge = balance * monthlyRate;
      const principalCharge = Math.min(monthlyPayment - interestCharge, balance);
      yearInterest   += interestCharge;
      yearPrincipal  += principalCharge;
      balance        -= principalCharge;
      if (balance < 0.005) balance = 0;
    }

    rows.push({
      year,
      openingBalance: startBalance,
      principalPaid:  yearPrincipal,
      interestPaid:   yearInterest,
      closingBalance: balance,
    });

    if (balance <= 0) break;
  }

  return rows;
}

// ── Core calculation ──────────────────────────────────────────────────────────
function calculate() {
  const errorEl = document.getElementById('calc-error');
  errorEl.textContent = '';

  const principal   = parseFloat(amountSlider.value);
  const annualRate  = parseFloat(rateSlider.value);
  const termYears   = parseInt(termSlider.value, 10);

  if (isNaN(principal) || principal <= 0) {
    errorEl.textContent = 'Please enter a valid loan amount.';
    return;
  }
  if (isNaN(annualRate) || annualRate <= 0) {
    errorEl.textContent = 'Please enter a valid interest rate.';
    return;
  }
  if (isNaN(termYears) || termYears <= 0) {
    errorEl.textContent = 'Please enter a valid loan term.';
    return;
  }

  const monthlyRate  = annualRate / 100 / 12;
  const totalMonths  = termYears * 12;

  // Monthly payment formula: M = P * [r(1+r)^n] / [(1+r)^n − 1]
  let monthlyPayment;
  if (monthlyRate === 0) {
    monthlyPayment = principal / totalMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    monthlyPayment = principal * (monthlyRate * factor) / (factor - 1);
  }

  const totalPayment  = monthlyPayment * totalMonths;
  const totalInterest = totalPayment - principal;

  // Update summary cards
  document.getElementById('monthly-payment').textContent  = fmt(monthlyPayment);
  document.getElementById('total-payment').textContent    = fmt(totalPayment);
  document.getElementById('total-interest').textContent   = fmt(totalInterest);
  document.getElementById('principal-amount').textContent = fmt(principal);

  // Update donut chart
  updateDonut(principal, totalInterest, monthlyPayment);

  // Build amortization table
  const rows = buildAmortization(principal, monthlyRate, totalMonths, monthlyPayment);
  const tbody = document.getElementById('amort-body');
  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${fmt(row.openingBalance)}</td>
      <td>${fmt(row.principalPaid)}</td>
      <td>${fmt(row.interestPaid)}</td>
      <td>${fmt(row.closingBalance)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Calculate button ──────────────────────────────────────────────────────────
document.getElementById('calculate-btn').addEventListener('click', calculate);

// ── Run on page load ──────────────────────────────────────────────────────────
calculate();

// ── Dynamic copyright year ────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();
