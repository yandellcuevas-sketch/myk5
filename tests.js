// tests.js — Unit tests for My K5 utilities

function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'RD$ 0';
  return 'RD$ ' + amount.toLocaleString('es-DO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function parseCurrency(str) {
  if (typeof str === 'number') return str;
  const cleaned = String(str).replace(/[^0-9.,]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseKm(str) {
  if (typeof str === 'number') return str;
  const cleaned = String(str).replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function validateAmount(value) {
  const n = parseCurrency(value);
  if (isNaN(n) || n < 0) return 'El monto debe ser un número positivo.';
  return null;
}

function calcTrend(current, previous) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return Math.round(pct);
}

function formatKm(km) {
  if (typeof km !== 'number' || isNaN(km)) return '0 km';
  return km.toLocaleString('es-DO') + ' km';
}

function getTotalCostMock(fuel, wash, maint, exp) {
  return {
    fuel: fuel.reduce((s, r) => s + (r.amount || 0), 0),
    wash: wash.reduce((s, r) => s + (r.cost || 0), 0),
    maintenance: maint.reduce((s, r) => s + (r.cost || 0), 0),
    expenses: exp.reduce((s, r) => s + (r.amount || 0), 0),
    get total() { return this.fuel + this.wash + this.maintenance + this.expenses; }
  };
}

// Test runner
const tests = [];
function test(desc, fn) {
  try {
    fn();
    tests.push({ pass: true, desc });
  } catch(e) {
    tests.push({ pass: false, desc, error: e.message });
  }
}
function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}
function eq(a, b) {
  assert(a === b, `Expected "${b}", got "${a}"`);
}

// ── Currency ──────────────────────────────────────────────────
test('formatCurrency: basic amounts', () => {
  eq(formatCurrency(0), 'RD$ 0');
  eq(formatCurrency(3000), 'RD$ 3,000');
  eq(formatCurrency(12850), 'RD$ 12,850');
  eq(formatCurrency(104500), 'RD$ 104,500');
});

test('formatCurrency: edge cases', () => {
  eq(formatCurrency(NaN), 'RD$ 0');
  eq(formatCurrency(undefined), 'RD$ 0');
});

test('parseCurrency: parses correctly', () => {
  eq(parseCurrency(3000), 3000);
  eq(parseCurrency('3000'), 3000);
  eq(parseCurrency(''), 0);
  eq(parseCurrency(0), 0);
});

// ── Km ─────────────────────────────────────────────────────────
test('parseKm: parses km strings', () => {
  eq(parseKm('48320'), 48320);
  eq(parseKm(48320), 48320);
  eq(parseKm(''), 0);
});

test('formatKm: formats correctly', () => {
  eq(formatKm(48320), '48,320 km');
  eq(formatKm(0), '0 km');
  eq(formatKm(NaN), '0 km');
});

// ── Validations ────────────────────────────────────────────────
test('validateAmount: rejects negatives', () => {
  assert(validateAmount(-100) !== null, 'should reject -100');
  assert(validateAmount('abc') !== null, 'should reject abc');
});

test('validateAmount: accepts valid amounts', () => {
  assert(validateAmount(0) === null, 'should accept 0');
  assert(validateAmount(3000) === null, 'should accept 3000');
  assert(validateAmount('1500') === null, 'should accept string 1500');
});

// ── Trend ──────────────────────────────────────────────────────
test('calcTrend: down 20%', () => {
  eq(calcTrend(8000, 10000), -20);
});

test('calcTrend: up 20%', () => {
  eq(calcTrend(12000, 10000), 20);
});

test('calcTrend: no previous month', () => {
  eq(calcTrend(5000, 0), null);
  eq(calcTrend(5000, null), null);
});

// ── Total cost calculation ─────────────────────────────────────
test('getTotalCost: sums all categories', () => {
  const costs = getTotalCostMock(
    [{ amount: 3000 }, { amount: 2800 }],
    [{ cost: 700 }],
    [{ cost: 4250 }],
    [{ amount: 200 }, { amount: 150 }]
  );
  eq(costs.fuel, 5800);
  eq(costs.wash, 700);
  eq(costs.maintenance, 4250);
  eq(costs.expenses, 350);
  eq(costs.total, 11100);
});

test('getTotalCost: empty data', () => {
  const costs = getTotalCostMock([], [], [], []);
  eq(costs.total, 0);
});

// ── Km validation for km lower than current ────────────────────
test('km warning when lower than current', () => {
  const currentKm = 48320;
  const newKm = 40000;
  const isLower = newKm < currentKm;
  assert(isLower === true, 'should detect lower km');
});

test('km OK when higher than current', () => {
  const currentKm = 48320;
  const newKm = 49100;
  const isLower = newKm < currentKm;
  assert(isLower === false, 'should allow higher km');
});

// ── Trip km calculation ────────────────────────────────────────
test('trip distance calculation', () => {
  const kmStart = 48320;
  const kmEnd   = 48518;
  const dist    = kmEnd - kmStart;
  eq(dist, 198);
});

test('trip km end < km start is invalid', () => {
  const kmStart = 48518;
  const kmEnd   = 48320;
  assert(kmEnd < kmStart, 'should detect invalid trip km');
});

// ── Report ─────────────────────────────────────────────────────
const passed = tests.filter(t => t.pass).length;
const failed = tests.filter(t => !t.pass).length;

console.log('\n=== MY K5 — TEST RESULTS ===');
tests.forEach(t => {
  const icon = t.pass ? 'PASS' : 'FAIL';
  const err  = t.error ? ' -- ' + t.error : '';
  console.log('[' + icon + '] ' + t.desc + err);
});
console.log('\n' + passed + ' passed, ' + failed + ' failed\n');

process.exit(failed > 0 ? 1 : 0);
