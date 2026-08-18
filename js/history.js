/**
 * history.js — Timeline del historial
 */

(function() {
  'use strict';

  const { formatCurrency, formatKm, formatDateDisplay, formatDateFull,
          showConfirm, showToast, qs, qsAll, createElement,
          STORE_META, MAINTENANCE_TYPES, WASH_TYPES, EXPENSE_CATEGORIES } = Utils;

  let currentFilter = 'all';

  function init() {
    // Filter chips
    const filtersEl = qs('#history-filters');
    if (filtersEl) {
      filtersEl.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          filtersEl.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          currentFilter = chip.dataset.filter;
          refresh();
        });
      });
    }
  }

  async function refresh() {
    const timeline = qs('#history-timeline');
    if (!timeline) return;

    timeline.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      let records = await DB.getAllRecords();

      // Filter
      if (currentFilter !== 'all') {
        records = records.filter(r => r._store === currentFilter);
      }

      // Update count
      const countEl = qs('#history-count-label');
      if (countEl) {
        countEl.textContent = records.length > 0
          ? `${records.length} registro${records.length !== 1 ? 's' : ''}`
          : '';
      }

      if (records.length === 0) {
        timeline.innerHTML = '';
        timeline.appendChild(buildEmptyState());
        return;
      }

      // Group by date
      const groups = groupByDate(records);
      timeline.innerHTML = '';

      groups.forEach(({ dateLabel, items }) => {
        const group = createElement('div', { className: 'timeline-group' });
        group.innerHTML = `<div class="timeline-date">${dateLabel}</div>`;

        items.forEach(record => {
          group.appendChild(buildTimelineItem(record));
        });

        timeline.appendChild(group);
      });

    } catch (e) {
      console.error('[History] Error:', e);
      timeline.innerHTML = '';
      timeline.appendChild(buildEmptyState());
    }
  }

  function groupByDate(records) {
    const dateMap = new Map();
    records.forEach(r => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const label = formatDateFull(r.date);
      if (!dateMap.has(key)) dateMap.set(key, { dateLabel: label, items: [] });
      dateMap.get(key).items.push(r);
    });
    return Array.from(dateMap.values());
  }

  function buildTimelineItem(record) {
    const meta = STORE_META[record._store] || { icon: 'other_maint', label: 'Registro', color: '#888' };

    const item = createElement('div', { className: 'timeline-item' });

    // Icon
    const iconDiv = createElement('div', { className: 'timeline-item-icon' });
    iconDiv.style.background = meta.color + '18';
    iconDiv.style.color = meta.color;
    iconDiv.innerHTML = Icons.get(meta.icon);

    // Body
    const body = createElement('div', { className: 'timeline-item-body' });
    body.innerHTML = `
      <div class="timeline-item-title">${getRecordTitle(record)}</div>
      <div class="timeline-item-sub">${getRecordSub(record)}</div>
    `;

    // Amount
    const amount = createElement('div', { className: 'timeline-item-amount' });
    const cost = getRecordAmount(record);
    amount.textContent = cost > 0 ? formatCurrency(cost) : '';

    // Demo badge
    if (record.isDemo) {
      const badge = createElement('span', { className: 'demo-badge', textContent: 'DEMO' });
      body.appendChild(badge);
    }

    // Delete button
    const deleteBtn = createElement('div', { className: 'timeline-item-delete' });
    deleteBtn.innerHTML = Icons.get('trash');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirm('¿Eliminar este registro?', () => deleteRecord(record));
    });

    item.appendChild(iconDiv);
    item.appendChild(body);
    item.appendChild(amount);
    item.appendChild(deleteBtn);

    // Click to edit
    item.addEventListener('click', (e) => {
      if (e.target === deleteBtn || deleteBtn.contains(e.target)) return;
      window.openModal(record._store === 'expenses' ? 'expense' : record._store, record);
    });

    // Long press → show delete on mobile
    let pressTimer;
    item.addEventListener('touchstart', () => {
      pressTimer = setTimeout(() => item.classList.add('show-delete'), 500);
    });
    item.addEventListener('touchend', () => clearTimeout(pressTimer));

    return item;
  }

  function getRecordTitle(record) {
    switch (record._store) {
      case 'fuel':
        return `Gasolina${record.station ? ` · ${record.station}` : ''}`;
      case 'wash': {
        const wType = WASH_TYPES[record.type];
        return `Lavado ${wType ? wType.label : ''}`;
      }
      case 'maintenance': {
        const mType = MAINTENANCE_TYPES[record.type];
        if (record.type === 'other' && record.description) return `${record.description}`;
        return `${mType ? mType.label : 'Mantenimiento'}`;
      }
      case 'expenses': {
        const cat = EXPENSE_CATEGORIES[record.category];
        return `${cat ? cat.label : 'Gasto'}${record.notes ? ` · ${record.notes}` : ''}`;
      }
      case 'trips': {
        const origin = record.origin || '';
        const dest   = record.destination || '';
        if (origin && dest) return `${origin} → ${dest}`;
        return `Viaje${dest ? ` a ${dest}` : ''}`;
      }
      default:
        return 'Registro';
    }
  }

  function getRecordSub(record) {
    const parts = [];

    switch (record._store) {
      case 'fuel':
        if (record.km) parts.push(formatKm(record.km));
        if (record.liters) parts.push(`${record.liters.toFixed(2)} gal`);
        if (record.isFull === false) parts.push('Parcial');
        break;
      case 'wash':
        break;
      case 'maintenance':
        if (record.km) parts.push(formatKm(record.km));
        if (record.nextKm && record.type === 'oil') parts.push(`Próximo: ${formatKm(record.nextKm)}`);
        if (record.workshop) parts.push(record.workshop);
        break;
      case 'expenses':
        break;
      case 'trips':
        if (record.kmStart && record.kmEnd) {
          parts.push(formatKm(record.kmEnd - record.kmStart) + ' recorridos');
        }
        if (record.tripExpenses && record.tripExpenses.length > 0) {
          const tripTotal = record.tripExpenses.reduce((s, e) => s + (e.amount || 0), 0);
          if (tripTotal > 0) parts.push('Gastos: ' + formatCurrency(tripTotal));
        }
        break;
    }

    if (record.notes && record._store !== 'expenses') {
      parts.push(record.notes);
    }

    return parts.join(' · ');
  }

  function getRecordAmount(record) {
    switch (record._store) {
      case 'fuel':        return record.amount || 0;
      case 'wash':        return record.cost || 0;
      case 'maintenance': return record.cost || 0;
      case 'expenses':    return record.amount || 0;
      case 'trips': {
        const tripTotal = (record.tripExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
        return tripTotal;
      }
      default: return 0;
    }
  }

  async function deleteRecord(record) {
    try {
      switch (record._store) {
        case 'fuel':        await DB.deleteFuel(record.id);        break;
        case 'wash':        await DB.deleteWash(record.id);        break;
        case 'maintenance': await DB.deleteMaintenance(record.id); break;
        case 'expenses':    await DB.deleteExpense(record.id);     break;
        case 'trips':       await DB.deleteTrip(record.id);        break;
      }
      State.emit('data:changed');
      showToast('Registro eliminado', 'success');
      refresh();
    } catch (e) {
      console.error('[History] Error eliminando:', e);
      showToast('Error al eliminar.', 'error');
    }
  }

  function buildEmptyState() {
    const div = createElement('div', { className: 'empty-state' });
    div.innerHTML = `
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">Sin registros</div>
      <div class="empty-state-text">
        ${currentFilter === 'all'
          ? 'Toca el botón + para registrar gasolina, lavados o mantenimiento.'
          : 'No hay registros en esta categoría todavía.'}
      </div>
    `;
    return div;
  }

  window.History = { init, refresh };

})();
