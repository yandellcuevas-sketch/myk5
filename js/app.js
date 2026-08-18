/**
 * app.js — Inicialización, navegación y FAB para My K5
 */

(async function() {
  'use strict';

  // ─── Wait for DOM ───────────────────────────────────────────
  if (document.readyState === 'loading') {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  }

  const { qs, qsAll } = Utils;

  // ─── Service Worker ─────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('[SW] Registrado:', reg.scope);
    } catch (e) {
      console.warn('[SW] No se pudo registrar:', e.message);
    }
  }

  // ─── Init DB ─────────────────────────────────────────────────
  try {
    await DB.open();
  } catch (e) {
    console.error('[App] Error inicializando DB:', e);
    Utils.showToast('Error al iniciar la base de datos. Recarga la página.', 'error', 5000);
    return;
  }

  // ─── Navigation ──────────────────────────────────────────────
  const views = {
    dashboard:  qs('#view-dashboard'),
    history:    qs('#view-history'),
    statistics: qs('#view-statistics'),
    vehicle:    qs('#view-vehicle'),
  };

  let currentView = 'dashboard';

  function navigateTo(view) {
    if (!views[view]) return;
    if (currentView === view) return;

    // Hide current
    if (views[currentView]) {
      views[currentView].classList.remove('active');
    }

    // Show new
    views[view].classList.add('active');
    currentView = view;

    // Update nav items
    qsAll('.nav-item[data-nav]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === view);
    });

    // Emit navigation event
    State.emit('nav:change', { view });
  }

  // Nav item clicks
  qsAll('.nav-item[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.nav));
  });

  // Dashboard settings icon → vehicle
  qs('#dash-settings-btn')?.addEventListener('click', () => navigateTo('vehicle'));

  // Expose navigate globally (for links in views)
  window.navigateTo = navigateTo;

  // ─── FAB menu ────────────────────────────────────────────────
  const fabBtn     = qs('#fab-btn');
  const fabMenu    = qs('#fab-menu');
  const fabOverlay = qs('#fab-overlay');
  let fabOpen = false;

  function openFab() {
    fabOpen = true;
    fabBtn.classList.add('open');
    fabMenu.classList.add('open');
    fabOverlay.classList.add('visible');
    State.emit('fab:open');
  }

  function closeFab() {
    fabOpen = false;
    fabBtn.classList.remove('open');
    fabMenu.classList.remove('open');
    fabOverlay.classList.remove('visible');
    State.emit('fab:close');
  }

  fabBtn.addEventListener('click', () => {
    if (fabOpen) closeFab();
    else openFab();
  });

  fabOverlay.addEventListener('click', closeFab);

  // FAB menu items
  qsAll('.fab-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      closeFab();
      setTimeout(() => openModal(action), 120);
    });
  });

  // ─── Modal dispatcher ─────────────────────────────────────────
  function openModal(type, editData = null) {
    switch (type) {
      case 'fuel':        Fuel.openModal(editData);        break;
      case 'wash':        Wash.openModal(editData);        break;
      case 'maintenance': Maintenance.openModal(editData); break;
      case 'expense':     Expenses.openModal(editData);    break;
      case 'trip':        Trips.openModal(editData);       break;
      default:
        console.warn('[App] Modal desconocido:', type);
    }
  }

  window.openModal = openModal;

  // ─── Data changed → refresh views ────────────────────────────
  State.on('data:changed', () => {
    Dashboard.refresh();
    if (currentView === 'history')    History.refresh();
    if (currentView === 'statistics') Statistics.refresh();
    if (currentView === 'vehicle')    Vehicle.refresh();
  });

  // ─── Refresh on navigation ────────────────────────────────────
  State.on('nav:change', ({ view }) => {
    switch (view) {
      case 'dashboard':   Dashboard.refresh();   break;
      case 'history':     History.refresh();     break;
      case 'statistics':  Statistics.refresh();  break;
      case 'vehicle':     Vehicle.refresh();     break;
    }
  });

  // ─── Initial load ─────────────────────────────────────────────
  await Dashboard.init();
  History.init();
  Statistics.init();
  Vehicle.init();

  // Initial dashboard render
  Dashboard.refresh();

  console.log('[App] My K5 lista ✓');

})();
