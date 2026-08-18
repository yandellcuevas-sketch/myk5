/**
 * fuel.js — Registro y gestión de gasolina
 */

(function() {
  'use strict';

  const { formatCurrency, formatDateTimeLocal, formatDateISO, parseCurrency,
          parseKm, formatKm, validateAmount, validateKm, showToast,
          showConfirm, qs } = Utils;

  // ─── Modal HTML ───────────────────────────────────────────────

  function buildModalHTML(editData = null) {
    const now = new Date();
    const defaultDate = formatDateTimeLocal(now);
    const d = editData || {};

    return `
      <div class="modal-overlay" id="modal-fuel-overlay">
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-header">
            <span class="modal-title">⛽ ${editData ? 'Editar gasolina' : 'Registrar gasolina'}</span>
            <button class="modal-close" id="modal-fuel-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-section">

              <!-- Monto -->
              <div class="form-group">
                <label class="form-label">Monto</label>
                <div class="form-prefix">
                  <span class="form-prefix-label">RD$</span>
                  <input class="form-input form-input-large" type="number"
                    id="fuel-amount" placeholder="0" inputmode="decimal" min="0"
                    value="${d.amount || ''}" autocomplete="off" />
                </div>
                <div class="form-error" id="fuel-amount-error"></div>
              </div>

              <!-- Galones y tanque (row) -->
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Galones</label>
                  <div class="form-suffix">
                    <input class="form-input" type="number" id="fuel-liters"
                      placeholder="0.00" inputmode="decimal" min="0" step="0.01"
                      value="${d.liters || ''}" autocomplete="off" />
                    <span class="form-suffix-label">gal</span>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Tanque</label>
                  <div class="segment-control" id="fuel-tank-type">
                    <button class="segment-option ${!d.isFull || d.isFull === true ? 'active' : ''}"
                      data-val="true">Lleno</button>
                    <button class="segment-option ${d.isFull === false ? 'active' : ''}"
                      data-val="false">Parcial</button>
                  </div>
                </div>
              </div>

              <!-- Km -->
              <div class="form-group">
                <label class="form-label">Kilometraje</label>
                <div class="form-suffix">
                  <input class="form-input" type="number" id="fuel-km"
                    placeholder="Odómetro actual" inputmode="numeric" min="0"
                    value="${d.km || ''}" autocomplete="off" />
                  <span class="form-suffix-label">km</span>
                </div>
                <div class="form-error" id="fuel-km-error"></div>
                <div class="form-hint" id="fuel-km-hint"></div>
              </div>

              <!-- Date -->
              <div class="form-group">
                <label class="form-label">Fecha y hora</label>
                <input class="form-input" type="datetime-local" id="fuel-date"
                  value="${d.date ? formatDateTimeLocal(new Date(d.date)) : defaultDate}" />
              </div>

              <!-- Optional fields -->
              <div class="optional-section">
                <button class="optional-toggle" id="fuel-optional-toggle">
                  <span class="optional-toggle-icon">›</span>
                  Más detalles (opcional)
                </button>
                <div class="optional-fields" id="fuel-optional-fields">
                  <div class="form-group">
                    <label class="form-label">Gasolinera</label>
                    <input class="form-input" type="text" id="fuel-station"
                      placeholder="Ej. Isla, Puma, Gulf..." value="${d.station || ''}" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Notas</label>
                    <input class="form-input" type="text" id="fuel-notes"
                      placeholder="Notas adicionales..." value="${d.notes || ''}" />
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div class="form-actions">
            ${editData ? `<button class="btn btn-danger" id="fuel-delete-btn">Eliminar</button>` : ''}
            <button class="btn btn-primary btn-full" id="fuel-save-btn">
              ${editData ? 'Guardar cambios' : 'Registrar gasolina'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Open Modal ───────────────────────────────────────────────

  function openModal(editData = null) {
    const container = qs('#modal-container');
    container.innerHTML = buildModalHTML(editData);

    const overlay = qs('#modal-fuel-overlay');
    requestAnimationFrame(() => overlay.classList.add('open'));

    // Set current km hint
    DB.getSettings().then(s => {
      const hintEl = qs('#fuel-km-hint');
      if (hintEl && s.lastKm > 0) {
        hintEl.textContent = `Actual: ${formatKm(s.lastKm)}`;
      }
    });

    // Close handlers
    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => container.innerHTML = '', 350);
    };

    qs('#modal-fuel-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Tank type segment
    setupSegmentControl('#fuel-tank-type');

    // Optional toggle
    setupOptionalToggle('#fuel-optional-toggle', '#fuel-optional-fields');

    // Delete button (edit mode)
    const deleteBtn = qs('#fuel-delete-btn');
    if (deleteBtn && editData) {
      deleteBtn.addEventListener('click', () => {
        showConfirm('¿Eliminar este registro de gasolina?', async () => {
          await DB.deleteFuel(editData.id);
          State.emit('data:changed');
          showToast('Registro eliminado', 'success');
          closeModal();
        });
      });
    }

    // Save
    qs('#fuel-save-btn').addEventListener('click', () => handleSave(editData, closeModal));
  }

  // ─── Save ─────────────────────────────────────────────────────

  async function handleSave(editData, closeModal) {
    const amountInput = qs('#fuel-amount');
    const kmInput     = qs('#fuel-km');
    const dateInput   = qs('#fuel-date');
    const litersInput = qs('#fuel-liters');
    const tankEl      = qs('#fuel-tank-type .segment-option.active');

    // Clear errors
    qs('#fuel-amount-error').textContent = '';
    qs('#fuel-km-error').textContent     = '';

    // Validate amount
    const amount = parseCurrency(amountInput.value);
    const amountErr = validateAmount(amountInput.value);
    if (amountErr || amount === 0) {
      qs('#fuel-amount-error').textContent = amountErr || 'Ingresa el monto gastado.';
      amountInput.focus();
      return;
    }

    // Validate km (optional but warn if lower)
    const settings = await DB.getSettings();
    const km = kmInput.value ? parseKm(kmInput.value) : null;
    if (km !== null && km > 0) {
      const kmErr = validateKm(km, settings.lastKm);
      if (kmErr && km < settings.lastKm) {
        // Show warning, ask to confirm
        qs('#fuel-km-error').textContent = kmErr;
        // Still allow save — user is warned
      }
    }

    // Date
    const dateVal = dateInput.value;
    if (!dateVal) {
      showToast('Por favor indica la fecha.', 'error');
      return;
    }
    const dateISO = new Date(dateVal).toISOString();

    // Build record
    const record = {
      date:    dateISO,
      amount:  amount,
      liters:  litersInput.value ? parseFloat(litersInput.value) : null,
      km:      km,
      isFull:  tankEl ? tankEl.dataset.val === 'true' : true,
      station: qs('#fuel-station')?.value.trim() || null,
      notes:   qs('#fuel-notes')?.value.trim() || null,
    };

    try {
      const saveBtn = qs('#fuel-save-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando…';

      if (editData) {
        await DB.updateFuel({ ...record, id: editData.id });
      } else {
        await DB.addFuel(record);
      }

      State.emit('data:changed');
      showToast(editData ? 'Gasolina actualizada ✓' : '⛽ Gasolina registrada ✓', 'success');
      closeModal();
    } catch (e) {
      console.error('[Fuel] Error al guardar:', e);
      showToast('Error al guardar. Intenta de nuevo.', 'error');
      const saveBtn = qs('#fuel-save-btn');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar'; }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  function setupSegmentControl(selector) {
    const container = qs(selector);
    if (!container) return;
    container.querySelectorAll('.segment-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.segment-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function setupOptionalToggle(toggleSel, fieldsSel) {
    const toggle = qs(toggleSel);
    const fields = qs(fieldsSel);
    if (!toggle || !fields) return;
    toggle.addEventListener('click', () => {
      const isOpen = fields.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
    });
  }

  window.Fuel = { openModal };
  // Also expose helpers for other modules
  window.setupSegmentControl = setupSegmentControl;
  window.setupOptionalToggle = setupOptionalToggle;

})();
