/**
 * maintenance.js — Registro de mantenimiento
 */

(function() {
  'use strict';

  const { formatCurrency, formatDateTimeLocal, parseCurrency, parseKm,
          formatKm, validateAmount, validateKm, showToast, showConfirm,
          qs, MAINTENANCE_TYPES } = Utils;

  function buildModalHTML(editData = null) {
    const now = new Date();
    const d = editData || {};
    const typeEntries = Object.entries(MAINTENANCE_TYPES);

    return `
      <div class="modal-overlay" id="modal-maint-overlay">
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-header">
            <span class="modal-title">🔧 ${editData ? 'Editar mantenimiento' : 'Registrar mantenimiento'}</span>
            <button class="modal-close" id="modal-maint-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-section">

              <!-- Tipo -->
              <div class="form-group">
                <label class="form-label">Tipo</label>
                <div class="chips-row" id="maint-type-chips">
                  ${typeEntries.map(([key, val]) => `
                    <button class="chip ${(d.type || 'oil') === key ? 'active' : ''}"
                      data-val="${key}">${val.emoji} ${val.label}</button>
                  `).join('')}
                </div>
              </div>

              <!-- Descripción (solo para "Otro") -->
              <div class="form-group" id="maint-desc-group" style="${(d.type && d.type !== 'other') ? 'display:none' : ''}">
                <label class="form-label">Descripción</label>
                <input class="form-input" type="text" id="maint-desc"
                  placeholder="Describe el mantenimiento..." value="${d.description || ''}" />
              </div>

              <!-- Km -->
              <div class="form-group">
                <label class="form-label">Kilometraje</label>
                <div class="form-suffix">
                  <input class="form-input" type="number" id="maint-km"
                    placeholder="Odómetro actual" inputmode="numeric" min="0"
                    value="${d.km || ''}" autocomplete="off" />
                  <span class="form-suffix-label">km</span>
                </div>
                <div class="form-error" id="maint-km-error"></div>
                <div class="form-hint" id="maint-km-hint"></div>
              </div>

              <!-- Costo -->
              <div class="form-group">
                <label class="form-label">Costo</label>
                <div class="form-prefix">
                  <span class="form-prefix-label">RD$</span>
                  <input class="form-input form-input-large" type="number"
                    id="maint-cost" placeholder="0" inputmode="decimal" min="0"
                    value="${d.cost || ''}" autocomplete="off" />
                </div>
                <div class="form-error" id="maint-cost-error"></div>
              </div>

              <!-- Próximo km (solo aceite) -->
              <div class="form-group" id="maint-next-km-group"
                style="${d.type === 'oil' || !d.type ? '' : 'display:none'}">
                <label class="form-label">Próximo cambio (km)</label>
                <div class="form-suffix">
                  <input class="form-input" type="number" id="maint-next-km"
                    placeholder="Ej. 53,000" inputmode="numeric" min="0"
                    value="${d.nextKm || ''}" autocomplete="off" />
                  <span class="form-suffix-label">km</span>
                </div>
                <div class="form-hint">El dashboard mostrará cuántos km faltan</div>
                <div class="form-error" id="maint-next-km-error"></div>
              </div>

              <!-- Fecha -->
              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input class="form-input" type="datetime-local" id="maint-date"
                  value="${d.date ? formatDateTimeLocal(new Date(d.date)) : formatDateTimeLocal(now)}" />
              </div>

              <!-- Optional -->
              <div class="optional-section">
                <button class="optional-toggle" id="maint-optional-toggle">
                  <span class="optional-toggle-icon">›</span>
                  Más detalles (opcional)
                </button>
                <div class="optional-fields" id="maint-optional-fields">
                  <div class="form-group">
                    <label class="form-label">Taller</label>
                    <input class="form-input" type="text" id="maint-workshop"
                      placeholder="Nombre del taller..." value="${d.workshop || ''}" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Notas</label>
                    <input class="form-input" type="text" id="maint-notes"
                      placeholder="Notas adicionales..." value="${d.notes || ''}" />
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div class="form-actions">
            ${editData ? `<button class="btn btn-danger" id="maint-delete-btn">Eliminar</button>` : ''}
            <button class="btn btn-primary btn-full" id="maint-save-btn">
              ${editData ? 'Guardar cambios' : 'Registrar mantenimiento'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function openModal(editData = null) {
    const container = qs('#modal-container');
    container.innerHTML = buildModalHTML(editData);

    const overlay = qs('#modal-maint-overlay');
    requestAnimationFrame(() => overlay.classList.add('open'));

    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => container.innerHTML = '', 350);
    };

    qs('#modal-maint-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // km hint
    DB.getSettings().then(s => {
      const hintEl = qs('#maint-km-hint');
      if (hintEl && s.lastKm > 0) {
        hintEl.textContent = `Actual: ${formatKm(s.lastKm)}`;
      }
    });

    // Type chips with dynamic field visibility
    const typeChips = qs('#maint-type-chips');
    if (typeChips) {
      typeChips.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          typeChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');

          const val = chip.dataset.val;
          const nextKmGroup = qs('#maint-next-km-group');
          const descGroup   = qs('#maint-desc-group');

          if (nextKmGroup) nextKmGroup.style.display = val === 'oil' ? '' : 'none';
          if (descGroup)   descGroup.style.display   = val === 'other' ? '' : 'none';
        });
      });
    }

    // Optional toggle
    setupOptionalToggle('#maint-optional-toggle', '#maint-optional-fields');

    // Delete
    const deleteBtn = qs('#maint-delete-btn');
    if (deleteBtn && editData) {
      deleteBtn.addEventListener('click', () => {
        showConfirm('¿Eliminar este registro de mantenimiento?', async () => {
          await DB.deleteMaintenance(editData.id);
          State.emit('data:changed');
          showToast('Registro eliminado', 'success');
          closeModal();
        });
      });
    }

    qs('#maint-save-btn').addEventListener('click', () => handleSave(editData, closeModal));
  }

  async function handleSave(editData, closeModal) {
    // Clear errors
    ['maint-km-error', 'maint-cost-error', 'maint-next-km-error'].forEach(id => {
      const el = qs('#' + id);
      if (el) el.textContent = '';
    });

    const settings = await DB.getSettings();
    const typeEl = qs('#maint-type-chips .chip.active');
    const type = typeEl ? typeEl.dataset.val : 'oil';

    // Cost
    const cost = parseCurrency(qs('#maint-cost').value);
    const costErr = validateAmount(qs('#maint-cost').value);
    if (costErr) {
      qs('#maint-cost-error').textContent = costErr;
      return;
    }

    // Km
    const km = qs('#maint-km').value ? parseKm(qs('#maint-km').value) : null;
    if (km && km < settings.lastKm) {
      qs('#maint-km-error').textContent = `⚠️ Km inferior al actual (${formatKm(settings.lastKm)})`;
    }

    // Next km (oil only)
    let nextKm = null;
    if (type === 'oil') {
      const nextKmVal = qs('#maint-next-km')?.value;
      if (nextKmVal) {
        nextKm = parseKm(nextKmVal);
        if (km && nextKm <= km) {
          qs('#maint-next-km-error').textContent = 'El próximo km debe ser mayor al actual.';
          return;
        }
      }
    }

    const dateVal = qs('#maint-date').value;
    const dateISO = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

    const record = {
      date:        dateISO,
      type:        type,
      description: type === 'other' ? (qs('#maint-desc')?.value.trim() || null) : null,
      km:          km,
      cost:        cost,
      nextKm:      nextKm,
      workshop:    qs('#maint-workshop')?.value.trim() || null,
      notes:       qs('#maint-notes')?.value.trim() || null,
    };

    try {
      const saveBtn = qs('#maint-save-btn');
      saveBtn.disabled = true;

      if (editData) {
        await DB.updateMaintenance({ ...record, id: editData.id });
      } else {
        await DB.addMaintenance(record);
      }

      State.emit('data:changed');
      showToast(editData ? 'Mantenimiento actualizado ✓' : '🔧 Mantenimiento registrado ✓', 'success');
      closeModal();
    } catch (e) {
      console.error('[Maintenance] Error:', e);
      showToast('Error al guardar.', 'error');
      const saveBtn = qs('#maint-save-btn');
      if (saveBtn) { saveBtn.disabled = false; }
    }
  }

  window.Maintenance = { openModal };

})();
