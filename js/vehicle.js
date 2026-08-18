/**
 * vehicle.js — Perfil del vehículo, ajustes y km manual
 */

(function() {
  'use strict';

  const { formatKm, formatDateFull, parseKm, showToast, showConfirm,
          qs, createElement } = Utils;

  function init() {
    // Edit button
    qs('#vehicle-edit-btn')?.addEventListener('click', openEditModal);

    // Photo input
    qs('#vehicle-photo-input')?.addEventListener('change', handlePhotoUpload);

    // Backup buttons
    qs('#btn-export-json')?.addEventListener('click', () => window.Backup.exportJSON());
    qs('#btn-export-csv')?.addEventListener('click',  () => window.Backup.exportCSV());
    qs('#btn-import-json')?.addEventListener('change', (e) => window.Backup.importJSON(e));

    // Km update
    qs('#btn-update-km')?.addEventListener('click', openKmModal);

    // Demo data
    qs('#btn-load-demo')?.addEventListener('click', loadDemoData);
    qs('#btn-clear-demo')?.addEventListener('click', clearDemoData);
  }

  async function refresh() {
    const [vehicle, settings] = await Promise.all([
      DB.getVehicle(),
      DB.getSettings(),
    ]);

    // Title
    const titleEl = qs('#vehicle-title');
    if (titleEl) titleEl.textContent = vehicle.nickname || 'My K5';

    const subtitleEl = qs('#vehicle-subtitle');
    if (subtitleEl) subtitleEl.textContent = `${vehicle.make || 'Kia'} ${vehicle.model || 'K5'} ${vehicle.year || ''}`.trim();

    // Photo
    if (vehicle.photoUrl) {
      const img = qs('#vehicle-img');
      if (img) img.src = vehicle.photoUrl;
    }

    // Stats grid
    const statsGrid = qs('#vehicle-stats-grid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        ${buildStat('Modelo', `${vehicle.make || 'Kia'} ${vehicle.model || 'K5'}`)}
        ${buildStat('Año', vehicle.year || '—')}
        ${buildStat('Km actual', formatKm(settings.lastKm || 0))}
        ${buildStat('Color', vehicle.color || '—')}
        ${buildStat('Placa', vehicle.plate || '—')}
        ${buildStat('Compra', vehicle.purchaseDate ? formatDateFull(vehicle.purchaseDate) : '—')}
      `;
    }

    // Settings list
    const settingsList = qs('#vehicle-settings-list');
    if (settingsList) {
      settingsList.innerHTML = `
        <button class="settings-item" id="vehicle-edit-btn-2">
          <span class="settings-item-icon">${Icons.get('edit')}</span>
          <div class="settings-item-body">
            <div class="settings-item-label">Editar perfil</div>
            <div class="settings-item-sub">Nombre, año, color, placa...</div>
          </div>
          <span class="settings-item-arrow">›</span>
        </button>
      `;
      qs('#vehicle-edit-btn-2')?.addEventListener('click', openEditModal);
    }

    // Demo data toggle
    checkDemoData();
  }

  async function checkDemoData() {
    const fuel = await DB.getAllFuel();
    const hasDemos = fuel.some(r => r.isDemo);
    const loadBtn  = qs('#btn-load-demo');
    const clearBtn = qs('#btn-clear-demo');
    if (loadBtn)  loadBtn.style.display  = hasDemos ? 'none' : '';
    if (clearBtn) clearBtn.style.display = hasDemos ? '' : 'none';
  }

  function buildStat(label, value) {
    return `
      <div class="vehicle-stat">
        <div class="vehicle-stat-label">${label}</div>
        <div class="vehicle-stat-value">${value}</div>
      </div>
    `;
  }

  // ─── Edit profile modal ───────────────────────────────────────

  async function openEditModal() {
    const vehicle = await DB.getVehicle();
    const container = qs('#modal-container');
    container.innerHTML = `
      <div class="modal-overlay" id="modal-vehicle-overlay">
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-header">
            <span class="modal-title" style="display:flex;align-items:center;gap:8px;">${Icons.get('car')} Editar perfil</span>
            <button class="modal-close" id="modal-vehicle-close">${Icons.get('close')}</button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-group">
                <label class="form-label">Apodo del vehículo</label>
                <input class="form-input" type="text" id="veh-nickname"
                  placeholder="My K5" value="${vehicle.nickname || ''}" />
              </div>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Marca</label>
                  <input class="form-input" type="text" id="veh-make"
                    placeholder="Kia" value="${vehicle.make || 'Kia'}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Modelo</label>
                  <input class="form-input" type="text" id="veh-model"
                    placeholder="K5" value="${vehicle.model || 'K5'}" />
                </div>
              </div>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Año</label>
                  <input class="form-input" type="number" id="veh-year"
                    placeholder="2022" inputmode="numeric"
                    value="${vehicle.year || ''}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Color</label>
                  <input class="form-input" type="text" id="veh-color"
                    placeholder="Ej. Blanco" value="${vehicle.color || ''}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Placa</label>
                <input class="form-input" type="text" id="veh-plate"
                  placeholder="Opcional" value="${vehicle.plate || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de compra</label>
                <input class="form-input" type="date" id="veh-purchase"
                  value="${vehicle.purchaseDate || ''}" />
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary btn-full" id="veh-save-btn">Guardar</button>
          </div>
        </div>
      </div>
    `;

    const overlay = qs('#modal-vehicle-overlay');
    requestAnimationFrame(() => overlay.classList.add('open'));

    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => container.innerHTML = '', 350);
    };

    qs('#modal-vehicle-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    qs('#veh-save-btn').addEventListener('click', async () => {
      const data = {
        nickname:     qs('#veh-nickname').value.trim() || 'My K5',
        make:         qs('#veh-make').value.trim() || 'Kia',
        model:        qs('#veh-model').value.trim() || 'K5',
        year:         parseInt(qs('#veh-year').value) || null,
        color:        qs('#veh-color').value.trim() || null,
        plate:        qs('#veh-plate').value.trim() || null,
        purchaseDate: qs('#veh-purchase').value || null,
      };

      await DB.saveVehicle(data);
      State.emit('data:changed');
      showToast('Perfil actualizado ✓', 'success');
      closeModal();
    });
  }

  // ─── Km manual update ────────────────────────────────────────

  async function openKmModal() {
    const settings = await DB.getSettings();
    const container = qs('#modal-container');

    container.innerHTML = `
      <div class="modal-overlay" id="modal-km-overlay">
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-header">
            <span class="modal-title" style="display:flex;align-items:center;gap:8px;">${Icons.get('speedometer')} Actualizar kilometraje</span>
            <button class="modal-close" id="modal-km-close">${Icons.get('close')}</button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div style="text-align:center;padding:var(--space-md);">
                <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:var(--space-xs);">Kilometraje actual registrado</div>
                <div style="font-size:2rem;font-weight:700;">${formatKm(settings.lastKm || 0)}</div>
              </div>
              <div class="form-group">
                <label class="form-label">Nuevo kilometraje</label>
                <div class="form-suffix">
                  <input class="form-input form-input-large" type="number" id="km-new-value"
                    placeholder="${settings.lastKm || 0}" inputmode="numeric" min="0"
                    value="${settings.lastKm || ''}" autocomplete="off" />
                  <span class="form-suffix-label">km</span>
                </div>
                <div class="form-hint">
                  Si el valor es inferior al actual, te pedirá confirmación.
                </div>
                <div class="form-error" id="km-error"></div>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary btn-full" id="km-save-btn">Actualizar</button>
          </div>
        </div>
      </div>
    `;

    const overlay = qs('#modal-km-overlay');
    requestAnimationFrame(() => overlay.classList.add('open'));

    const closeModal = () => {
      overlay.classList.remove('open');
      setTimeout(() => container.innerHTML = '', 350);
    };

    qs('#modal-km-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    qs('#km-save-btn').addEventListener('click', async () => {
      const errEl = qs('#km-error');
      errEl.textContent = '';

      const newKm = parseKm(qs('#km-new-value').value);
      if (!newKm || newKm <= 0) {
        errEl.textContent = 'Ingresa un kilometraje válido.';
        return;
      }

      const doUpdate = async () => {
        await DB.updateSettings({ lastKm: newKm });
        State.emit('data:changed');
        showToast('Kilometraje actualizado ✓', 'success');
        closeModal();
      };

      if (newKm < (settings.lastKm || 0)) {
        showConfirm(
          `¿Actualizar el kilometraje a ${formatKm(newKm)}? Es inferior al registrado actualmente (${formatKm(settings.lastKm)}).`,
          doUpdate
        );
      } else {
        await doUpdate();
      }
    });
  }

  // ─── Photo upload ─────────────────────────────────────────────

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen es muy grande (máx. 5 MB).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      await DB.saveVehicle({ photoUrl: dataUrl });

      // Update displayed images
      const imgs = [qs('#vehicle-img'), qs('#dash-car-img')];
      imgs.forEach(img => { if (img) img.src = dataUrl; });

      showToast('Foto actualizada ✓', 'success');
    };
    reader.readAsDataURL(file);
  }

  // ─── Demo data ────────────────────────────────────────────────

  async function loadDemoData() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lm = String(now.getMonth()).padStart(2, '0') || '12';
    const ly = now.getMonth() === 0 ? y - 1 : y;

    try {
      // Current month
      await DB.addFuel({ date: `${y}-${m}-05T09:00:00.000Z`, amount: 3000, liters: 5.3, km: 48320, isFull: true, station: 'Puma', isDemo: true });
      await DB.addFuel({ date: `${y}-${m}-12T17:30:00.000Z`, amount: 2800, liters: 4.9, km: 48650, isFull: true, isDemo: true });
      await DB.addFuel({ date: `${y}-${m}-18T08:00:00.000Z`, amount: 3200, liters: 5.5, km: 49100, isFull: false, station: 'Isla', isDemo: true });

      await DB.addWash({ date: `${y}-${m}-10T10:00:00.000Z`, type: 'full', cost: 700, isDemo: true });
      await DB.addWash({ date: `${y}-${m}-03T09:00:00.000Z`, type: 'exterior', cost: 400, isDemo: true });

      await DB.addMaintenance({ date: `${y}-${m}-01T09:00:00.000Z`, type: 'oil', km: 48000, cost: 4250, nextKm: 53000, workshop: 'Kia Oficial', isDemo: true });

      await DB.addExpense({ date: `${y}-${m}-08T12:00:00.000Z`, category: 'toll', amount: 200, notes: 'Autopista del Este', isDemo: true });
      await DB.addExpense({ date: `${y}-${m}-15T14:00:00.000Z`, category: 'parking', amount: 150, isDemo: true });

      await DB.addTrip({ date: `${y}-${m}-07T06:00:00.000Z`, origin: 'Santo Domingo', destination: 'Punta Cana', kmStart: 48320, kmEnd: 48518, tripExpenses: [{ category: 'toll', amount: 600 }, { category: 'parking', amount: 300 }], isDemo: true });

      // Previous month
      await DB.addFuel({ date: `${ly}-${lm}-05T09:00:00.000Z`, amount: 3500, liters: 6.1, km: 47200, isFull: true, isDemo: true });
      await DB.addFuel({ date: `${ly}-${lm}-18T16:00:00.000Z`, amount: 3000, liters: 5.2, km: 47800, isFull: true, isDemo: true });
      await DB.addWash({ date: `${ly}-${lm}-15T10:00:00.000Z`, type: 'full', cost: 700, isDemo: true });
      await DB.addExpense({ date: `${ly}-${lm}-20T10:00:00.000Z`, category: 'insurance', amount: 2800, notes: 'Seguro mensual', isDemo: true });

      await DB.updateSettings({ lastKm: 49100, oilNextKm: 53000, oilAlertKm: 48000 });

      State.emit('data:changed');
      showToast('🎭 Datos demo cargados', 'success');
    } catch (e) {
      console.error('[Vehicle] Error cargando demo:', e);
      showToast('Error cargando datos demo.', 'error');
    }
  }

  async function clearDemoData() {
    showConfirm('¿Eliminar todos los datos demo?', async () => {
      await DB.clearDemoData();
      State.emit('data:changed');
      showToast('Datos demo eliminados', 'success');
    });
  }

  window.Vehicle = { init, refresh };

})();
