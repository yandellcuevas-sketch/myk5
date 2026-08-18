/**
 * utils.js — Formateo, validaciones y helpers globales para My K5
 */

// ─── Moneda ──────────────────────────────────────────────────────────────────

function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'RD$ 0';
  return 'RD$ ' + amount.toLocaleString('es-DO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatCurrencyDecimal(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'RD$ 0.00';
  return 'RD$ ' + amount.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrency(str) {
  if (typeof str === 'number') return str;
  const cleaned = String(str).replace(/[^0-9.,]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ─── Kilometraje ─────────────────────────────────────────────────────────────

function formatKm(km) {
  if (typeof km !== 'number' || isNaN(km)) return '0 km';
  return km.toLocaleString('es-DO') + ' km';
}

function parseKm(str) {
  if (typeof str === 'number') return str;
  const cleaned = String(str).replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// ─── Fechas ───────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

function formatDateISO(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

function formatDateTimeLocal(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(d, today)) return 'Hoy';
  if (isSameDay(d, yesterday)) return 'Ayer';

  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function formatDateFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDaysAgo(dateStr) {
  const days = daysSince(dateStr);
  if (days === null) return '';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

function getCurrentMonthLabel() {
  const now = new Date();
  return MONTHS_ES[now.getMonth()].toUpperCase();
}

function getMonthLabel(monthStr) {
  // monthStr: 'YYYY-MM'
  if (!monthStr) return '';
  const [, m] = monthStr.split('-');
  return MONTHS_SHORT[parseInt(m, 10) - 1] || '';
}

function isCurrentMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousMonthKey() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Validaciones ─────────────────────────────────────────────────────────────

function validatePositiveNumber(value, fieldName = 'Valor') {
  const n = parseFloat(value);
  if (isNaN(n)) return `${fieldName} debe ser un número válido.`;
  if (n < 0) return `${fieldName} no puede ser negativo.`;
  return null;
}

function validateKm(value, currentKm = 0) {
  const n = parseKm(value);
  if (n <= 0) return 'El kilometraje debe ser mayor a 0.';
  if (n < currentKm) {
    return `⚠️ Km inferior al actual (${formatKm(currentKm)}). ¿Es correcto?`;
  }
  return null;
}

function validateAmount(value) {
  if (typeof value === 'string' && value.trim() !== '' && !/\d/.test(value)) {
    return 'El monto debe ser un número positivo.';
  }
  const n = parseCurrency(value);
  if (isNaN(n) || n < 0) return 'El monto debe ser un número positivo.';
  return null;
}

// ─── Tendencia ────────────────────────────────────────────────────────────────

function calcTrend(current, previous) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return Math.round(pct);
}

function formatTrend(pct) {
  if (pct === null || pct === undefined) return '';
  const abs = Math.abs(pct);
  const arrow = pct < 0 ? '↓' : '↑';
  const cls = pct < 0 ? 'trend-down' : 'trend-up';
  return { text: `${arrow} ${abs}%`, cls, raw: pct };
}

// ─── Números ──────────────────────────────────────────────────────────────────

function formatLiters(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0 gal';
  return n.toFixed(2) + ' gal';
}

function formatCostPerKm(cost, km) {
  if (!km || km === 0) return null;
  return formatCurrencyDecimal(cost / km) + '/km';
}

// ─── Stores labels ───────────────────────────────────────────────────────────

const STORE_META = {
  fuel:        { icon: 'fuel',        label: 'Gasolina',      color: '#F59E0B' },
  wash:        { icon: 'wash',        label: 'Lavado',        color: '#3B82F6' },
  maintenance: { icon: 'maintenance', label: 'Mantenimiento', color: '#10B981' },
  expenses:    { icon: 'expense',     label: 'Gasto',         color: '#8B5CF6' },
  trips:       { icon: 'trip',        label: 'Viaje',         color: '#EC4899' },
};

const MAINTENANCE_TYPES = {
  oil:     { label: 'Aceite',         icon: 'oil' },
  tires:   { label: 'Gomas / Frenos', icon: 'tires' },
  battery: { label: 'Batería',        icon: 'battery' },
  other:   { label: 'Otro',           icon: 'other_maint' },
};

const WASH_TYPES = {
  exterior: { label: 'Exterior',  icon: 'exterior' },
  full:     { label: 'Completo',  icon: 'full_wash' },
  interior: { label: 'Interior',  icon: 'interior' },
  detail:   { label: 'Detailing', icon: 'detailing' },
};

const EXPENSE_CATEGORIES = {
  toll:      { label: 'Peaje',     icon: 'toll' },
  parking:   { label: 'Parqueo',   icon: 'parking' },
  insurance: { label: 'Seguro',    icon: 'insurance' },
  plate:     { label: 'Marbete',   icon: 'plate' },
  accessory: { label: 'Accesorio', icon: 'accessory' },
  fine:      { label: 'Multa',     icon: 'fine' },
  other:     { label: 'Otro',      icon: 'other_expense' },
};

// ─── DOM helpers ─────────────────────────────────────────────────────────────

function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

function qsAll(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') el.className = v;
    else if (k === 'innerHTML') el.innerHTML = v;
    else if (k === 'textContent') el.textContent = v;
    else el.setAttribute(k, v);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

function showToast(message, type = 'success', duration = 2800) {
  let container = qs('#toast-container');
  if (!container) {
    container = createElement('div', { id: 'toast-container' });
    document.body.appendChild(container);
  }
  const toast = createElement('div', { className: `toast toast-${type}`, textContent: message });
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showConfirm(message, onConfirm) {
  const overlay = createElement('div', { className: 'confirm-overlay' });
  const dialog = createElement('div', { className: 'confirm-dialog' });
  dialog.innerHTML = `
    <p class="confirm-message">${message}</p>
    <div class="confirm-actions">
      <button class="btn-secondary" id="confirm-cancel">Cancelar</button>
      <button class="btn-danger" id="confirm-ok">Eliminar</button>
    </div>
  `;
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const close = () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 250);
  };

  qs('#confirm-cancel', dialog).onclick = close;
  qs('#confirm-ok', dialog).onclick = () => { close(); onConfirm(); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

window.Utils = {
  // Currency
  formatCurrency,
  formatCurrencyDecimal,
  parseCurrency,
  // Km
  formatKm,
  parseKm,
  // Dates
  formatDateISO,
  formatDateTimeLocal,
  formatDateDisplay,
  formatDateFull,
  formatDaysAgo,
  daysSince,
  getCurrentMonthLabel,
  getMonthLabel,
  isCurrentMonth,
  getCurrentMonthKey,
  getPreviousMonthKey,
  isSameDay,
  MONTHS_ES,
  MONTHS_SHORT,
  // Validation
  validatePositiveNumber,
  validateKm,
  validateAmount,
  // Trend
  calcTrend,
  formatTrend,
  // Numbers
  formatLiters,
  formatCostPerKm,
  // Meta
  STORE_META,
  MAINTENANCE_TYPES,
  WASH_TYPES,
  EXPENSE_CATEGORIES,
  // DOM
  qs,
  qsAll,
  createElement,
  showToast,
  showConfirm,
};
