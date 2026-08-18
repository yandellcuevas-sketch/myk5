/**
 * wash.js — Registro de lavados
 */

(function() {
  'use strict';

  const { formatCurrency, formatDateTimeLocal, parseCurrency,
          validateAmount, showToast, showConfirm, qs, WASH_TYPES } = Utils;

  function buildModalHTML(editData = null) {
    const now = new Date();
    const d = editData || {};
    const washTypeEntries = Object.entries(WASH_TYPES);

    return `
      <div class="modal-overlay" id="modal-wash-overlay">
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-header">
            <span class="modal-title">🧽 ${editData ? 'Editar lavado' : 'Registrar lavado'}</span>
            <button class="modal-close" id="modal-wash-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-section">

              <!-- Tipo de lavado -->
              <div class="form-group">
                <label class="form-label">Tipo de lavado</label>
                <div class="chips-row" id="wash-type-chips">
                  ${washTypeEntries.map(([key, val]) => `
                    <button class="chip ${(d.type || 'exterior') === key ? 'active' : ''}"
                      data-val="${key}">${val.emoji} ${val.label}</button>
                  `).join('')}
                </div>
              </div>

              <!-- Costo -->
              <div class="form-group">
                <label class="form-label">Costo</label>
                <div class="form-prefix">
                  <span class="form-prefix-label">RD$</span>
                  <input class="form-input form-input-large" type="number"
                    id="wash-cost" placeholder="0" inputmode="decimal" min="0"
                    value="${d.cost || ''}" autocomplete="off" />
                </div>
                <div class="form-error" id="wash-cost-error"></div>
              </div>

              <!-- Fecha -->
              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input class="form-input" type="datetime-local" id="wash-date"
                  value="${d.date ? formatDateTimeLocal(new Date(d.date)) : formatDateTimeLocal(now)}" />
              </div>

              <!-- Optional -->
              <div class="optional-section">
                <button class="optional-toggle" id="wash-optional-toggle">
                  <span class="optional-toggle-icon">›</span>
                  Notas (opcional)
                </button>
                <div class="optional-fields" id="wash-optional-fields">
                  <div class="form-group">
                    <label class="form-label">Notas</label>
                    <input class="form-input" type="text" id="wash-notes"
                      placeholder="Dónde, cómo..." value="${d.notes || ''}" />
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div class="form-actions">
            ${editData ? `<button class="btn btn-danger" id="wash-delete-btn">Eliminar</button>` : ''}
            <button class="btn btn-primary btn-full" id="wash-save-btn">
              ${editData ? 'Guardar cambios' : 'Registrar lavado'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function openModal(editData = null) {
    const container = qs('#modal-container');
    container.innerHTML = buildModalHTML(editData);

    const overlay = qs('#modal-wash-overlay');
    requestAnimationFrame(() => overlay.classList.add('open'));

    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => container.innerHTML = '', 350);
    };

    qs('#modal-wash-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Type chips
    setupChipsGroup('#wash-type-chips');

    // Optional toggle
    setupOptionalToggle('#wash-optional-toggle', '#wash-optional-fields');

    // Delete
    const deleteBtn = qs('#wash-delete-btn');
    if (deleteBtn && editData) {
      deleteBtn.addEventListener('click', () => {
        showConfirm('¿Eliminar este registro de lavado?', async () => {
          await DB.deleteWash(editData.id);
          State.emit('data:changed');
          showToast('Registro eliminado', 'success');
          closeModal();
        });
      });
    }

    // Save
    qs('#wash-save-btn').addEventListener('click', () => handleSave(editData, closeModal));
  }

  async function handleSave(editData, closeModal) {
    qs('#wash-cost-error').textContent = '';

    const cost = parseCurrency(qs('#wash-cost').value);
    const costErr = validateAmount(qs('#wash-cost').value);
    if (costErr || cost === 0) {
      qs('#wash-cost-error').textContent = costErr || 'Ingresa el costo del lavado.';
      return;
    }

    const typeEl = qs('#wash-type-chips .chip.active');
    const dateVal = qs('#wash-date').value;
    const dateISO = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

    const record = {
      date:  dateISO,
      type:  typeEl ? typeEl.dataset.val : 'exterior',
      cost:  cost,
      notes: qs('#wash-notes')?.value.trim() || null,
    };

    try {
      const saveBtn = qs('#wash-save-btn');
      saveBtn.disabled = true;

      if (editData) {
        await DB.updateWash({ ...record, id: editData.id });
      } else {
        await DB.addWash(record);
      }

      State.emit('data:changed');
      showToast(editData ? 'Lavado actualizado ✓' : '🧽 Lavado registrado ✓', 'success');
      closeModal();
    } catch (e) {
      console.error('[Wash] Error:', e);
      showToast('Error al guardar.', 'error');
      const saveBtn = qs('#wash-save-btn');
      if (saveBtn) { saveBtn.disabled = false; }
    }
  }

  function setupChipsGroup(selector) {
    const container = qs(selector);
    if (!container) return;
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  window.Wash = { openModal };
  window.setupChipsGroup = setupChipsGroup;

})();
