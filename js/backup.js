/**
 * backup.js — Exportar e importar datos
 */

(function() {
  'use strict';

  const { showToast, showConfirm } = Utils;

  // ─── Export JSON ──────────────────────────────────────────────

  async function exportJSON() {
    try {
      const data = await DB.exportBackup();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `my-k5-backup-${formatDateForFile()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('💾 Backup exportado correctamente', 'success');
    } catch (e) {
      console.error('[Backup] Error exportando JSON:', e);
      showToast('Error al exportar backup.', 'error');
    }
  }

  // ─── Export CSV ───────────────────────────────────────────────

  async function exportCSV() {
    try {
      const records = await DB.getAllRecords();
      if (records.length === 0) {
        showToast('No hay registros para exportar.', 'info');
        return;
      }

      const headers = ['Fecha', 'Tipo', 'Descripción', 'Monto (RD$)', 'Km', 'Notas'];
      const rows = records.map(r => [
        new Date(r.date).toLocaleDateString('es-DO'),
        getTypeLabel(r._store, r),
        getDescription(r),
        getAmount(r),
        r.km || r.kmEnd || '',
        r.notes || '',
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `my-k5-historial-${formatDateForFile()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('📊 CSV exportado correctamente', 'success');
    } catch (e) {
      console.error('[Backup] Error exportando CSV:', e);
      showToast('Error al exportar CSV.', 'error');
    }
  }

  // ─── Import JSON ──────────────────────────────────────────────

  async function importJSON(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = '';

    try {
      const text = await file.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        showToast('El archivo no es un JSON válido.', 'error');
        return;
      }

      // Validate
      if (!data || data.app !== 'myk5') {
        showToast('El archivo no es un backup válido de My K5.', 'error');
        return;
      }

      showConfirm(
        `¿Importar backup del ${new Date(data.exportedAt).toLocaleDateString('es-DO')}? Esto reemplazará TODOS tus datos actuales.`,
        async () => {
          try {
            await DB.importBackup(data);
            State.emit('data:changed');
            showToast('✅ Backup importado correctamente', 'success');
          } catch (e) {
            console.error('[Backup] Error importando:', e);
            showToast(`Error al importar: ${e.message}`, 'error', 5000);
          }
        }
      );

    } catch (e) {
      console.error('[Backup] Error leyendo archivo:', e);
      showToast('Error al leer el archivo.', 'error');
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  function formatDateForFile() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getTypeLabel(store, record) {
    const labels = {
      fuel:        'Gasolina',
      wash:        'Lavado',
      maintenance: 'Mantenimiento',
      expenses:    'Gasto',
      trips:       'Viaje',
    };
    return labels[store] || store;
  }

  function getDescription(record) {
    switch (record._store) {
      case 'fuel':   return record.station || 'Carga de gasolina';
      case 'wash':   return record.type    || 'Lavado';
      case 'maintenance': return record.type === 'other' ? (record.description || 'Otro') : (record.type || 'Mantenimiento');
      case 'expenses':    return record.category || 'Gasto';
      case 'trips':  return `${record.origin || ''} → ${record.destination || ''}`.trim();
      default:       return '';
    }
  }

  function getAmount(record) {
    switch (record._store) {
      case 'fuel':        return record.amount || 0;
      case 'wash':        return record.cost   || 0;
      case 'maintenance': return record.cost   || 0;
      case 'expenses':    return record.amount || 0;
      case 'trips': {
        return (record.tripExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      }
      default: return 0;
    }
  }

  window.Backup = { exportJSON, exportCSV, importJSON };

})();
