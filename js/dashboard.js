/**
 * dashboard.js — Dashboard principal de My K5
 */

(function() {
  'use strict';

  const { formatCurrency, formatKm, formatDaysAgo, formatTrend, calcTrend,
          getCurrentMonthLabel, qs, createElement, showToast,
          getCurrentMonthKey, getPreviousMonthKey, STORE_META } = Utils;

  async function init() {
    // Nothing special on init — refresh does all the work
  }

  async function refresh() {
    try {
      const [settings, fuel, wash, maint, exp, trips] = await Promise.all([
        DB.getSettings(),
        DB.getAllFuel(),
        DB.getAllWash(),
        DB.getAllMaintenance(),
        DB.getAllExpenses(),
        DB.getAllTrips(),
      ]);

      const vehicle = await DB.getVehicle();

      // ─── Header ────────────────────────────────────────────
      const nicknameEl = qs('#dash-nickname');
      if (nicknameEl) nicknameEl.textContent = vehicle.nickname || 'My K5';

      // ─── Km ────────────────────────────────────────────────
      const kmEl = qs('#dash-km');
      if (kmEl) {
        const km = settings.lastKm || 0;
        kmEl.textContent = km > 0 ? formatKm(km) : '—';
      }

      // ─── Month summary ─────────────────────────────────────
      const currentKey = getCurrentMonthKey();
      const prevKey    = getPreviousMonthKey();

      const monthlyData = await DB.getMonthlyData();
      const currentMonth = monthlyData.find(m => m.month === currentKey) || { total: 0 };
      const prevMonth    = monthlyData.find(m => m.month === prevKey)    || { total: 0 };

      const monthLabelEl  = qs('#dash-month-label');
      const monthAmountEl = qs('#dash-month-amount');
      const monthTrendEl  = qs('#dash-month-trend');

      if (monthLabelEl)  monthLabelEl.textContent  = getCurrentMonthLabel();
      if (monthAmountEl) monthAmountEl.textContent  = formatCurrency(currentMonth.total);

      if (monthTrendEl) {
        const trendPct = calcTrend(currentMonth.total, prevMonth.total);
        if (trendPct !== null && prevMonth.total > 0) {
          const t = formatTrend(trendPct);
          monthTrendEl.innerHTML = `
            <span class="trend-badge ${t.cls}">${t.text}</span>
            <div style="font-size:0.6875rem;color:var(--text-muted);margin-top:4px;text-align:right;">vs mes anterior</div>
          `;
        } else {
          monthTrendEl.innerHTML = '';
        }
      }

      // ─── Alerts ────────────────────────────────────────────
      renderAlerts(settings, settings.lastKm || 0);

      // ─── Metrics grid ──────────────────────────────────────
      const metricsEl = qs('#dash-metrics');
      if (!metricsEl) return;
      metricsEl.innerHTML = '';

      // Metric 1: Gasolina este mes
      const fuelThisMonth = fuel
        .filter(r => r.date && r.date.startsWith(currentKey.replace('-', '-').substring(0, 7)))
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      const fuelCard = buildMetricCard(
        Icons.get('fuel'),
        'Gasolina',
        fuelThisMonth > 0 ? formatCurrency(fuelThisMonth) : 'Sin registros',
        fuelThisMonth > 0 ? 'Este mes' : 'Registra tu primera carga',
        'var(--color-fuel)',
        false,
        () => window.openModal('fuel')
      );
      metricsEl.appendChild(fuelCard);

      // Metric 2: Último lavado
      const lastWash = [...wash].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const washCard = buildMetricCard(
        Icons.get('wash'),
        'Último lavado',
        lastWash ? formatDaysAgo(lastWash.date) : 'Sin registros',
        lastWash ? `${lastWash.type ? getWashTypeLabel(lastWash.type) : ''} · ${formatCurrency(lastWash.cost || 0)}` : 'Registra un lavado',
        'var(--color-wash)',
        isWashAlert(lastWash),
        () => window.openModal('wash')
      );
      metricsEl.appendChild(washCard);

      // Metric 3: Próximo aceite
      const oilKmLeft = settings.oilNextKm && settings.lastKm
        ? settings.oilNextKm - settings.lastKm
        : null;
      const isOilAlert = oilKmLeft !== null && oilKmLeft <= 1000 && oilKmLeft > 0;
      const isOilDue   = oilKmLeft !== null && oilKmLeft <= 0;

      const oilValue = oilKmLeft !== null
        ? (isOilDue ? '¡Vencido!' : formatKm(oilKmLeft))
        : 'Sin programar';
      const oilSub = oilKmLeft !== null
        ? `Próximo: ${formatKm(settings.oilNextKm)}`
        : 'Registra un cambio de aceite';

      const oilCard = buildMetricCard(
        Icons.get('oil'),
        'Próximo aceite',
        oilValue,
        oilSub,
        'var(--color-maint)',
        isOilAlert || isOilDue,
        () => window.openModal('maintenance')
      );
      metricsEl.appendChild(oilCard);

      // Metric 4: Km recorridos este mes
      const kmThisMonth = getKmThisMonth(fuel, maint, trips, currentKey);
      const kmCard = buildMetricCard(
        Icons.get('speedometer'),
        'Recorrido',
        kmThisMonth > 0 ? formatKm(kmThisMonth) : '—',
        'Este mes',
        'var(--color-trip)',
        false,
        null
      );
      metricsEl.appendChild(kmCard);

    } catch (e) {
      console.error('[Dashboard] Error al refrescar:', e);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  function buildMetricCard(iconSvg, label, value, sub, color, isAlert, onClick) {
    const card = createElement('div', {
      className: `metric-card${isAlert ? ' alert' : ''}`,
      ...(onClick ? { role: 'button', tabindex: '0' } : {})
    });

    card.innerHTML = `
      <div class="metric-card-emoji" style="color:${color};">${iconSvg}</div>
      <div class="metric-card-label">${label}</div>
      <div class="metric-card-value">${value}</div>
      ${sub ? `<div class="metric-card-sub">${sub}</div>` : ''}
    `;

    if (onClick) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', onClick);
    }

    return card;
  }

  function renderAlerts(settings, currentKm) {
    const alertsEl = qs('#dash-alerts');
    if (!alertsEl) return;
    alertsEl.innerHTML = '';

    // Oil alert
    if (settings.oilNextKm && currentKm) {
      const kmLeft = settings.oilNextKm - currentKm;
      if (kmLeft <= 1000 && kmLeft > 0) {
        alertsEl.appendChild(buildAlert(
          Icons.get('alert'),
          `Cambio de aceite próximo — Faltan ${formatKm(kmLeft)}`,
          'Registrar',
          () => window.openModal('maintenance')
        ));
      } else if (kmLeft <= 0) {
        alertsEl.appendChild(buildAlert(
          Icons.get('alert'),
          `Cambio de aceite vencido — ${formatKm(Math.abs(kmLeft))} de retraso`,
          'Registrar',
          () => window.openModal('maintenance')
        ));
      }
    }

    // Wash alert (> 14 days)
    if (settings.lastWashDate) {
      const days = Math.floor((Date.now() - new Date(settings.lastWashDate)) / 86400000);
      if (days > 14) {
        alertsEl.appendChild(buildAlert(
          Icons.get('wash'),
          `Último lavado hace ${days} días`,
          'Registrar',
          () => window.openModal('wash')
        ));
      }
    }
  }

  function buildAlert(icon, text, actionLabel, onClick) {
    const div = createElement('div', { className: 'alert-banner' });
    div.innerHTML = `
      <span class="alert-banner-icon">${icon}</span>
      <span class="alert-banner-text">${text}</span>
      ${onClick ? `<button class="alert-banner-action">${actionLabel}</button>` : ''}
    `;
    if (onClick) {
      div.querySelector('.alert-banner-action')?.addEventListener('click', onClick);
    }
    return div;
  }

  function isWashAlert(lastWash) {
    if (!lastWash) return false;
    const days = Math.floor((Date.now() - new Date(lastWash.date)) / 86400000);
    return days > 14;
  }

  function getWashTypeLabel(type) {
    const types = { exterior: 'Exterior', full: 'Completo', interior: 'Interior', detail: 'Detailing' };
    return types[type] || type;
  }

  function getKmThisMonth(fuel, maint, trips, monthKey) {
    // Get all km readings this month, compute max - min
    const allKm = [];
    const isThisMonth = (dateStr) => dateStr && dateStr.substring(0, 7) === monthKey;

    fuel.filter(r => isThisMonth(r.date) && r.km).forEach(r => allKm.push(r.km));
    maint.filter(r => isThisMonth(r.date) && r.km).forEach(r => allKm.push(r.km));
    trips.filter(r => isThisMonth(r.date)).forEach(r => {
      if (r.kmStart) allKm.push(r.kmStart);
      if (r.kmEnd)   allKm.push(r.kmEnd);
    });

    if (allKm.length < 2) return 0;
    return Math.max(...allKm) - Math.min(...allKm);
  }

  window.Dashboard = { init, refresh };

})();
