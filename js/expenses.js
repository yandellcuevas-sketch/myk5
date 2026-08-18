/**
 * expenses.js — Otros gastos (peaje, seguro, marbete, etc.)
 */

(function() {
  'use strict';

  const { formatDateTimeLocal, parseCurrency, validateAmount,
          showToast, showConfirm, qs, EXPENSE_CATEGORIES } = Utils;

  function buildModalHTML(editData = null) {
    const now = new Date();
    const d = editData || {};
    const categories = Object.entries(EXPENSE_CATEGORIES);

    return `
      <div class="modal-overlay" id="modal-exp-overlay">
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-header">
            <span class="modal-title" style="display:flex;align-items:center;gap:8px;">${Icons.get('expense')} ${editData ? 'Editar gasto' : 'Registrar gasto'}</span>
            <button class="modal-close" id="modal-exp-close">${Icons.get('close')}</button>
          </div>
          <div class="modal-body">
            <div class="form-section">

              <!-- Categoría -->
              <div class="form-group">
                <label class="form-label">Categoría</label>
                <div class="chips-row" id="exp-cat-chips">
                  ${categories.map(([key, val]) => `
                    <button class="chip ${(d.category || 'toll') === key ? 'active' : ''}"
                      data-val="${key}">${Icons.get(val.icon || 'expense')} ${val.label}</button>
                  `).join('')}
                </div>
              </div>

              <!-- Monto -->
              <div class="form-group">
                <label class="form-label">Monto</label>
                <div class="form-prefix">
                  <span class="form-prefix-label">RD$</span>
                  <input class="form-input form-input-large" type="number"
                    id="exp-amount" placeholder="0" inputmode="decimal" min="0"
                    value="${d.amount || ''}" autocomplete="off" />
                </div>
                <div class="form-error" id="exp-amount-error"></div>
              </div>

              <!-- Fecha -->
              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input class="form-input" type="datetime-local" id="exp-date"
                  value="${d.date ? formatDateTimeLocal(new Date(d.date)) : formatDateTimeLocal(now)}" />
              </div>

              <!-- Nota -->
              <div class="form-group">
                <label class="form-label">Nota <span style="color:var(--text-muted);font-weight:400;">(opcional)</span></label>
                <input class="form-input" type="text" id="exp-notes"
                  placeholder="Descripción breve..." value="${d.notes || ''}" />
              </div>

            </div>
          </div>
          <div class="form-actions">
            ${editData ? `<button class="btn btn-danger" id="exp-delete-btn">Eliminar</button>` : ''}
            <button class="btn btn-primary btn-full" id="exp-save-btn">
              ${editData ? 'Guardar cambios' : 'Registrar gasto'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function openModal(editData = null) {
    const container = qs('#modal-container');
    container.innerHTML = buildModalHTML(editData);

    const overlay = qs('#modal-exp-overlay');
    requestAnimationFrame(() => overlay.classList.add('open'));

    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => container.innerHTML = '', 350);
    };

    qs('#modal-exp-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Category chips
    setupChipsGroup('#exp-cat-chips');

    // Delete
    const deleteBtn = qs('#exp-delete-btn');
    if (deleteBtn && editData) {
      deleteBtn.addEventListener('click', () => {
        showConfirm('¿Eliminar este gasto?', async () => {
          await DB.deleteExpense(editData.id);
          State.emit('data:changed');
          showToast('Gasto eliminado', 'success');
          closeModal();
        });
      });
    }

    qs('#exp-save-btn').addEventListener('click', () => handleSave(editData, closeModal));
  }

  async function handleSave(editData, closeModal) {
    qs('#exp-amount-error').textContent = '';

    const amount = parseCurrency(qs('#exp-amount').value);
    const amountErr = validateAmount(qs('#exp-amount').value);
    if (amountErr || amount === 0) {
      qs('#exp-amount-error').textContent = amountErr || 'Ingresa el monto.';
      return;
    }

    const catEl  = qs('#exp-cat-chips .chip.active');
    const dateVal = qs('#exp-date').value;
    const dateISO = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

    const record = {
      date:     dateISO,
      category: catEl ? catEl.dataset.val : 'other',
      amount:   amount,
      notes:    qs('#exp-notes')?.value.trim() || null,
    };

    try {
      const saveBtn = qs('#exp-save-btn');
      saveBtn.disabled = true;

      if (editData) {
        await DB.updateExpense({ ...record, id: editData.id });
      } else {
        await DB.addExpense(record);
      }

      State.emit('data:changed');
      showToast(editData ? 'Gasto actualizado ✓' : '💰 Gasto registrado ✓', 'success');
      closeModal();
    } catch (e) {
      console.error('[Expenses] Error:', e);
      showToast('Error al guardar.', 'error');
      const saveBtn = qs('#exp-save-btn');
      if (saveBtn) { saveBtn.disabled = false; }
    }
  }

  window.Expenses = { openModal };

})();
