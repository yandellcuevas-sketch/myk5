/**
 * state.js — Bus de eventos reactivo simple para My K5
 * Permite que los módulos se comuniquen sin acoplarse directamente.
 */

(function() {
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => {
      try { cb(data); }
      catch (e) { console.error(`[State] Error en listener "${event}":`, e); }
    });
  }

  /**
   * Eventos disponibles:
   * 'data:changed'       — cualquier registro fue creado/editado/eliminado
   * 'nav:change'         — cambio de sección (payload: { view })
   * 'km:updated'         — se actualizó el km actual (payload: { km })
   * 'modal:open'         — se abrió un modal (payload: { type })
   * 'modal:close'        — se cerró un modal
   * 'fab:open'           — se abrió el FAB menu
   * 'fab:close'          — se cerró el FAB menu
   */

  window.State = { on, off, emit };
})();
