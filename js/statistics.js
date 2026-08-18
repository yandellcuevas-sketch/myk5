/**
 * statistics.js — Estadísticas y gráficas
 */

(function() {
  'use strict';

  const { formatCurrency, formatCurrencyDecimal, formatKm,
          getMonthLabel, getCurrentMonthKey, qs, createElement,
          STORE_META } = Utils;

  let currentPeriod = 'month';
  let chartInstances = {};

  function init() {
    const periodBtns = qs('#stats-period-selector');
    if (periodBtns) {
      periodBtns.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          periodBtns.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentPeriod = btn.dataset.period;
          refresh();
        });
      });
    }
  }

  async function refresh() {
    const content = qs('#stats-content');
    if (!content) return;

    content.innerHTML = '<div style="display:flex;justify-content:center;padding:var(--space-2xl);"><div class="spinner"></div></div>';

    try {
      // Load Chart.js lazily
      await ensureChartJs();

      const now = new Date();
      const costs = await DB.getTotalCost(currentPeriod, now);
      const monthlyData = await DB.getMonthlyData();
      const settings = await DB.getSettings();
      const allFuel = await DB.getAllFuel();

      content.innerHTML = '';

      // ─── Cost total card ───────────────────────────────────
      content.appendChild(buildCostCard(costs, settings));

      // ─── Distribution ──────────────────────────────────────
      if (costs.total > 0) {
        content.appendChild(buildDistributionCard(costs));
      }

      // ─── Monthly chart ─────────────────────────────────────
      if (monthlyData.length > 1) {
        content.appendChild(buildMonthlyChart(monthlyData));
      }

      // ─── Fuel stats ────────────────────────────────────────
      const fuelStats = buildFuelStats(allFuel, currentPeriod, now);
      if (fuelStats) {
        content.appendChild(fuelStats);
      }

      // ─── Empty message ─────────────────────────────────────
      if (costs.total === 0 && monthlyData.length <= 1) {
        content.innerHTML = '';
        content.appendChild(buildEmptyStats());
      }

      // Add bottom padding
      const spacer = createElement('div', {});
      spacer.style.height = 'var(--space-2xl)';
      content.appendChild(spacer);

    } catch (e) {
      console.error('[Statistics] Error:', e);
      content.innerHTML = '';
      content.appendChild(buildEmptyStats());
    }
  }

  function buildCostCard(costs, settings) {
    const card = createElement('div', { className: 'stats-card' });
    const periodLabel = { month: 'Este mes', year: 'Este año', all: 'Histórico total' }[currentPeriod];

    card.innerHTML = `
      <div class="stats-card-header">
        <span class="stats-card-title">💳 Costo de tu K5 — ${periodLabel}</span>
      </div>
      <div style="font-size:2.5rem;font-weight:900;letter-spacing:-0.04em;color:var(--text-primary);margin-bottom:var(--space-sm);">
        ${formatCurrency(costs.total)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);margin-bottom:var(--space-sm);">
        ${buildCostLine('⛽ Gasolina', costs.fuel)}
        ${buildCostLine('🔧 Mantenimiento', costs.maintenance)}
        ${buildCostLine('🧽 Lavados', costs.wash)}
        ${buildCostLine('💰 Otros', costs.expenses + costs.trips)}
      </div>
      ${costs.total > 0 && settings.lastKm > 0 ? buildCostPerKm(costs.total, settings) : ''}
    `;
    return card;
  }

  function buildCostLine(label, amount) {
    return `
      <div style="padding:var(--space-sm);background:var(--bg-card-hover);border-radius:var(--radius-md);">
        <div style="font-size:0.6875rem;color:var(--text-muted);margin-bottom:2px;">${label}</div>
        <div style="font-size:1rem;font-weight:700;">${formatCurrency(amount)}</div>
      </div>
    `;
  }

  function buildCostPerKm(total, settings) {
    if (!settings.lastKm || settings.lastKm === 0) return '';
    // Very rough estimate — can't know how many km were driven in the period
    // Only show for 'all' period where we know total km
    if (currentPeriod !== 'all') return '';
    const costPerKm = total / settings.lastKm;
    return `
      <div style="margin-top:var(--space-sm);padding:var(--space-sm);background:var(--bg-card-hover);border-radius:var(--radius-md);text-align:center;">
        <div style="font-size:0.6875rem;color:var(--text-muted);">Costo aproximado por km</div>
        <div style="font-size:1.25rem;font-weight:700;color:var(--accent);">${formatCurrencyDecimal(costPerKm)}<span style="font-size:0.75rem;color:var(--text-muted);font-weight:400;">/km</span></div>
      </div>
    `;
  }

  function buildDistributionCard(costs) {
    const card = createElement('div', { className: 'stats-card' });

    const items = [
      { label: 'Gasolina',     value: costs.fuel,                    color: 'var(--color-fuel)' },
      { label: 'Mantenimiento', value: costs.maintenance,            color: 'var(--color-maint)' },
      { label: 'Lavados',      value: costs.wash,                    color: 'var(--color-wash)' },
      { label: 'Otros',        value: costs.expenses + costs.trips,  color: 'var(--color-expense)' },
    ].filter(i => i.value > 0);

    const total = items.reduce((s, i) => s + i.value, 0);

    const bars = items.map(i => {
      const pct = total > 0 ? (i.value / total * 100).toFixed(1) : 0;
      return `<div class="dist-bar-segment" style="width:${pct}%;background:${i.color};"></div>`;
    }).join('');

    const legend = items.map(i => {
      const pct = total > 0 ? (i.value / total * 100).toFixed(0) : 0;
      return `
        <div class="dist-legend-item">
          <div class="dist-legend-dot" style="background:${i.color};"></div>
          <span class="dist-legend-label">${i.label}</span>
          <span class="dist-legend-value">${formatCurrency(i.value)}</span>
          <span class="dist-legend-pct">${pct}%</span>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <div class="stats-card-header">
        <span class="stats-card-title">📊 Distribución de gastos</span>
      </div>
      <div class="dist-bar">${bars}</div>
      <div class="dist-legend" style="margin-top:var(--space-md);">${legend}</div>
    `;

    return card;
  }

  function buildMonthlyChart(monthlyData) {
    const card = createElement('div', { className: 'stats-card' });

    // Last 6 months
    const last6 = monthlyData.slice(-6);
    const labels = last6.map(m => getMonthLabel(m.month));
    const totals = last6.map(m => m.total);

    const canvasId = 'chart-monthly-' + Date.now();
    card.innerHTML = `
      <div class="stats-card-header">
        <span class="stats-card-title">📈 Gastos por mes</span>
      </div>
      <div class="chart-container">
        <canvas id="${canvasId}"></canvas>
      </div>
    `;

    // Render chart after DOM insertion
    requestAnimationFrame(() => {
      const canvas = qs('#' + canvasId);
      if (!canvas || !window.Chart) return;

      // Destroy previous instance
      if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
      }

      chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: totals,
            backgroundColor: 'rgba(200, 168, 75, 0.25)',
            borderColor: 'rgba(200, 168, 75, 0.8)',
            borderWidth: 2,
            borderRadius: 6,
            hoverBackgroundColor: 'rgba(200, 168, 75, 0.4)',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => formatCurrency(ctx.raw)
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.04)' },
              ticks: { color: '#8888A0', font: { size: 11 } },
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.04)' },
              ticks: {
                color: '#8888A0',
                font: { size: 11 },
                callback: v => 'RD$ ' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)
              },
              beginAtZero: true,
            }
          }
        }
      });
    });

    return card;
  }

  function buildFuelStats(allFuel, period, now) {
    let filtered = allFuel;
    if (period === 'month') {
      const key = getCurrentMonthKey();
      filtered = allFuel.filter(r => r.date && r.date.substring(0, 7) === key);
    } else if (period === 'year') {
      filtered = allFuel.filter(r => r.date && r.date.startsWith(now.getFullYear() + ''));
    }

    if (filtered.length === 0) return null;

    const totalAmount = filtered.reduce((s, r) => s + (r.amount || 0), 0);
    const totalLiters = filtered.reduce((s, r) => s + (r.liters || 0), 0);
    const avgPerLoad  = filtered.length > 0 ? totalAmount / filtered.length : 0;
    const avgPricePerLiter = totalLiters > 0 ? totalAmount / totalLiters : 0;

    const card = createElement('div', { className: 'stats-card' });
    card.innerHTML = `
      <div class="stats-card-header">
        <span class="stats-card-title">⛽ Estadísticas de gasolina</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);">
        ${buildStatItem('Total gastado', formatCurrency(totalAmount))}
        ${buildStatItem('Cargas', `${filtered.length}`)}
        ${totalLiters > 0 ? buildStatItem('Total galones', `${totalLiters.toFixed(2)} gal`) : ''}
        ${avgPricePerLiter > 0 ? buildStatItem('Precio prom./gal', formatCurrency(avgPricePerLiter)) : ''}
        ${buildStatItem('Promedio por carga', formatCurrency(avgPerLoad))}
      </div>
    `;
    return card;
  }

  function buildStatItem(label, value) {
    return `
      <div style="padding:var(--space-sm);background:var(--bg-card-hover);border-radius:var(--radius-md);">
        <div style="font-size:0.6875rem;color:var(--text-muted);margin-bottom:2px;">${label}</div>
        <div style="font-size:1rem;font-weight:700;">${value}</div>
      </div>
    `;
  }

  async function ensureChartJs() {
    if (window.Chart) return;
    return new Promise((resolve, reject) => {
      const script = createElement('script', { src: window.CHART_JS_URL });
      script.onload  = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function buildEmptyStats() {
    const div = createElement('div', { className: 'empty-state' });
    div.innerHTML = `
      <div class="empty-state-icon">📊</div>
      <div class="empty-state-title">Sin datos suficientes</div>
      <div class="empty-state-text">
        Las estadísticas aparecerán cuando registres algunos gastos de tu K5.
      </div>
      <button class="btn btn-primary btn-sm" onclick="window.openModal('fuel')">
        Registrar primera carga
      </button>
    `;
    return div;
  }

  window.Statistics = { init, refresh };

})();
