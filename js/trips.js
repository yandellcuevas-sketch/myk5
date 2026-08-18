/**
 * trips.js — Registro de viajes
 */

(function() {
  'use strict';

  const { formatDateTimeLocal, formatCurrency, parseCurrency, parseKm,
          formatKm, validateAmount, showToast, showConfirm, qs, EXPENSE_CATEGORIES } = Utils;

  function buildModalHTML(editData = null) {
    const now = new Date();
    const d = editData || {};
    const tripExpenses = d.tripExpenses || [];

    return `
      <div class="modal-overlay" id="modal-trip-overlay">
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-header">
            <span class="modal-title" style="display:flex;align-items:center;gap:8px;">${Icons.get('trip')} ${editData ? 'Editar viaje' : 'Registrar viaje'}</span>
            <button class="modal-close" id="modal-trip-close">${Icons.get('close')}</button>
          </div>
          <div class="modal-body">
            <div class="form-section">

              <!-- Origen → Destino -->
              <div class="form-group">
                <label class="form-label">Origen</label>
                <input class="form-input" type="text" id="trip-origin"
                  placeholder="Ciudad o lugar de salida" value="${d.origin || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Destino</label>
                <input class="form-input" type="text" id="trip-destination"
                  placeholder="Ciudad o lugar de llegada" value="${d.destination || ''}" />
                <div class="form-error" id="trip-dest-error"></div>
              </div>

              <!-- Km Inicial / Km Final -->
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Km inicial</label>
                  <div class="form-suffix">
                    <input class="form-input" type="number" id="trip-km-start"
                      placeholder="0" inputmode="numeric" min="0"
                      value="${d.kmStart || ''}" autocomplete="off" />
                    <span class="form-suffix-label">km</span>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Km final</label>
                  <div class="form-suffix">
                    <input class="form-input" type="number" id="trip-km-end"
                      placeholder="0" inputmode="numeric" min="0"
                      value="${d.kmEnd || ''}" autocomplete="off" />
                    <span class="form-suffix-label">km</span>
                  </div>
                </div>
              </div>
              <div class="form-error" id="trip-km-error"></div>

              <!-- Distancia calculada -->
              <div id="trip-distance-display" style="text-align:center;padding:var(--space-sm);display:none;">
                <span style="font-size:1.5rem;font-weight:700;" id="trip-distance-val">0 km</span>
                <span style="font-size:0.75rem;color:var(--text-muted);margin-left:6px;">recorridos</span>
              </div>

              <!-- Fecha -->
              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input class="form-input" type="datetime-local" id="trip-date"
                  value="${d.date ? formatDateTimeLocal(new Date(d.date)) : formatDateTimeLocal(now)}" />
              </div>

              <!-- Optional: gastos del viaje -->
              <div class="optional-section">
                <button class="optional-toggle" id="trip-optional-toggle">
                  <span class="optional-toggle-icon">›</span>
                  Gastos del viaje (opcional)
                </button>
                <div class="optional-fields" id="trip-optional-fields">
                  <div id="trip-expenses-list">
                    ${tripExpenses.map((e, i) => buildTripExpenseRow(e, i)).join('')}
                  </div>
                  <button class="btn btn-secondary btn-sm" id="trip-add-expense" style="margin-top:var(--space-sm);">
                    + Agregar gasto
                  </button>
                  <div id="trip-expenses-total" style="text-align:right;font-size:0.875rem;color:var(--text-muted);margin-top:var(--space-xs);">
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div class="optional-section">
                <button class="optional-toggle" id="trip-notes-toggle">
                  <span class="optional-toggle-icon">›</span>
                  Notas (opcional)
                </button>
                <div class="optional-fields" id="trip-notes-fields">
                  <div class="form-group">
                    <input class="form-input" type="text" id="trip-notes"
                      placeholder="Notas del viaje..." value="${d.notes || ''}" />
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div class="form-actions">
            ${editData ? `<button class="btn btn-danger" id="trip-delete-btn">Eliminar</button>` : ''}
            <button class="btn btn-primary btn-full" id="trip-save-btn">
              ${editData ? 'Guardar cambios' : 'Registrar viaje'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function buildTripExpenseRow(expData = {}, index = 0) {
    const categories = EXPENSE_CATEGORIES;
    const catOptions = Object.entries(categories)
      .map(([k, v]) => `<option value="${k}" ${(expData.category || 'toll') === k ? 'selected' : ''}>${v.label}</option>`)
      .join('');

    return `
      <div class="trip-expense-row" data-idx="${index}" style="
        display:flex;gap:var(--space-sm);align-items:center;margin-bottom:var(--space-sm);">
        <select class="form-input trip-exp-cat" style="flex:1.5;padding:10px 8px;">
          ${catOptions}
        </select>
        <div style="flex:1;position:relative;">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:0.875rem;">RD$</span>
          <input class="form-input trip-exp-amount" type="number"
            style="padding-left:36px;" placeholder="0" inputmode="decimal" min="0"
            value="${expData.amount || ''}" />
        </div>
        <button class="trip-exp-remove btn-icon" style="flex-shrink:0;" title="Eliminar">${Icons.get('trash')}</button>
      </div>
    `;
  }

  function openModal(editData = null) {
    const container = qs('#modal-container');
    container.innerHTML = buildModalHTML(editData);

    const overlay = qs('#modal-trip-overlay');
    requestAnimationFrame(() => overlay.classList.add('open'));

    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => container.innerHTML = '', 350);
    };

    qs('#modal-trip-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Km auto-calculate distance
    const kmStartEl = qs('#trip-km-start');
    const kmEndEl   = qs('#trip-km-end');
    const distDisplay = qs('#trip-distance-display');
    const distVal     = qs('#trip-distance-val');

    function updateDistance() {
      const start = parseKm(kmStartEl.value);
      const end   = parseKm(kmEndEl.value);
      if (start > 0 && end > start) {
        distVal.textContent = formatKm(end - start);
        distDisplay.style.display = 'block';
      } else {
        distDisplay.style.display = 'none';
      }
    }

    kmStartEl.addEventListener('input', updateDistance);
    kmEndEl.addEventListener('input', updateDistance);
    updateDistance();

    // Auto-fill km start from current
    DB.getSettings().then(s => {
      if (!kmStartEl.value && s.lastKm > 0) {
        kmStartEl.value = s.lastKm;
        updateDistance();
      }
    });

    // Optional toggles
    setupOptionalToggle('#trip-optional-toggle', '#trip-optional-fields');
    setupOptionalToggle('#trip-notes-toggle', '#trip-notes-fields');

    // Add expense
    const addExpBtn = qs('#trip-add-expense');
    if (addExpBtn) {
      addExpBtn.addEventListener('click', () => {
        const list = qs('#trip-expenses-list');
        const idx  = list.querySelectorAll('.trip-expense-row').length;
        const row  = document.createElement('div');
        row.innerHTML = buildTripExpenseRow({}, idx);
        list.appendChild(row.firstElementChild);
        attachRemoveHandlers();
        updateExpensesTotal();
      });
    }

    function attachRemoveHandlers() {
      qs('#trip-expenses-list')?.querySelectorAll('.trip-exp-remove').forEach(btn => {
        btn.onclick = () => {
          btn.closest('.trip-expense-row').remove();
          updateExpensesTotal();
        };
      });
      qs('#trip-expenses-list')?.querySelectorAll('.trip-exp-amount').forEach(input => {
        input.oninput = updateExpensesTotal;
      });
    }

    function updateExpensesTotal() {
      const rows = qs('#trip-expenses-list')?.querySelectorAll('.trip-expense-row') || [];
      let total = 0;
      rows.forEach(row => {
        const v = parseCurrency(row.querySelector('.trip-exp-amount')?.value || '0');
        total += v || 0;
      });
      const totalEl = qs('#trip-expenses-total');
      if (totalEl) {
        totalEl.textContent = total > 0 ? `Total gastos: ${formatCurrency(total)}` : '';
      }
    }

    attachRemoveHandlers();
    updateExpensesTotal();

    // Delete
    const deleteBtn = qs('#trip-delete-btn');
    if (deleteBtn && editData) {
      deleteBtn.addEventListener('click', () => {
        showConfirm('¿Eliminar este viaje?', async () => {
          await DB.deleteTrip(editData.id);
          State.emit('data:changed');
          showToast('Viaje eliminado', 'success');
          closeModal();
        });
      });
    }

    qs('#trip-save-btn').addEventListener('click', () => handleSave(editData, closeModal));
  }

  async function handleSave(editData, closeModal) {
    // Clear errors
    ['trip-dest-error', 'trip-km-error'].forEach(id => {
      const el = qs('#' + id);
      if (el) el.textContent = '';
    });

    const origin = qs('#trip-origin').value.trim();
    const dest   = qs('#trip-destination').value.trim();
    if (!dest) {
      qs('#trip-dest-error').textContent = 'Indica el destino del viaje.';
      return;
    }

    const kmStart = qs('#trip-km-start').value ? parseKm(qs('#trip-km-start').value) : null;
    const kmEnd   = qs('#trip-km-end').value   ? parseKm(qs('#trip-km-end').value)   : null;

    if (kmStart && kmEnd && kmEnd < kmStart) {
      qs('#trip-km-error').textContent = 'El km final no puede ser menor al km inicial.';
      return;
    }

    const dateVal = qs('#trip-date').value;
    const dateISO = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

    // Collect trip expenses
    const expenseRows = qs('#trip-expenses-list')?.querySelectorAll('.trip-expense-row') || [];
    const tripExpenses = [];
    expenseRows.forEach(row => {
      const amount = parseCurrency(row.querySelector('.trip-exp-amount')?.value || '0');
      const cat    = row.querySelector('.trip-exp-cat')?.value || 'other';
      if (amount > 0) tripExpenses.push({ category: cat, amount });
    });

    const record = {
      date:         dateISO,
      origin:       origin || null,
      destination:  dest,
      kmStart:      kmStart,
      kmEnd:        kmEnd,
      notes:        qs('#trip-notes')?.value.trim() || null,
      tripExpenses: tripExpenses,
    };

    try {
      const saveBtn = qs('#trip-save-btn');
      saveBtn.disabled = true;

      if (editData) {
        await DB.updateTrip({ ...record, id: editData.id });
      } else {
        await DB.addTrip(record);
      }

      State.emit('data:changed');
      showToast(editData ? 'Viaje actualizado ✓' : '🛣 Viaje registrado ✓', 'success');
      closeModal();
    } catch (e) {
      console.error('[Trips] Error:', e);
      showToast('Error al guardar.', 'error');
      const saveBtn = qs('#trip-save-btn');
      if (saveBtn) { saveBtn.disabled = false; }
    }
  }

  window.Trips = { openModal };

})();
