/**
 * db.js — IndexedDB centralizado para My K5
 * Schema versión 1
 */

const DB_NAME = 'myk5-db';
const DB_VERSION = 1;

let _db = null;

const STORES = {
  vehicle: 'vehicle',
  fuel: 'fuel',
  wash: 'wash',
  maintenance: 'maintenance',
  expenses: 'expenses',
  trips: 'trips',
  settings: 'settings',
};

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // vehicle: datos del vehículo (un solo registro, id=1)
      if (!db.objectStoreNames.contains(STORES.vehicle)) {
        db.createObjectStore(STORES.vehicle, { keyPath: 'id' });
      }

      // fuel: registros de gasolina
      if (!db.objectStoreNames.contains(STORES.fuel)) {
        const fuelStore = db.createObjectStore(STORES.fuel, { keyPath: 'id', autoIncrement: true });
        fuelStore.createIndex('date', 'date', { unique: false });
      }

      // wash: lavados
      if (!db.objectStoreNames.contains(STORES.wash)) {
        const washStore = db.createObjectStore(STORES.wash, { keyPath: 'id', autoIncrement: true });
        washStore.createIndex('date', 'date', { unique: false });
      }

      // maintenance: mantenimiento
      if (!db.objectStoreNames.contains(STORES.maintenance)) {
        const maintStore = db.createObjectStore(STORES.maintenance, { keyPath: 'id', autoIncrement: true });
        maintStore.createIndex('date', 'date', { unique: false });
      }

      // expenses: otros gastos
      if (!db.objectStoreNames.contains(STORES.expenses)) {
        const expStore = db.createObjectStore(STORES.expenses, { keyPath: 'id', autoIncrement: true });
        expStore.createIndex('date', 'date', { unique: false });
      }

      // trips: viajes
      if (!db.objectStoreNames.contains(STORES.trips)) {
        const tripStore = db.createObjectStore(STORES.trips, { keyPath: 'id', autoIncrement: true });
        tripStore.createIndex('date', 'date', { unique: false });
      }

      // settings: configuración global (id=1)
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };

    request.onerror = (event) => {
      console.error('[DB] Error abriendo base de datos:', event.target.error);
      reject(event.target.error);
    };
  });
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function tx(storeName, mode = 'readonly') {
  return _db.transaction([storeName], mode).objectStore(storeName);
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAll(storeName) {
  return openDB().then(() => promisify(tx(storeName).getAll()));
}

function getOne(storeName, id) {
  return openDB().then(() => promisify(tx(storeName).get(id)));
}

function put(storeName, record) {
  return openDB().then(() => promisify(tx(storeName, 'readwrite').put(record)));
}

function add(storeName, record) {
  return openDB().then(() => promisify(tx(storeName, 'readwrite').add(record)));
}

function remove(storeName, id) {
  return openDB().then(() => promisify(tx(storeName, 'readwrite').delete(id)));
}

function clearStore(storeName) {
  return openDB().then(() => promisify(tx(storeName, 'readwrite').clear()));
}

// ─── Settings ────────────────────────────────────────────────────────────────

async function getSettings() {
  await openDB();
  const s = await getOne(STORES.settings, 1);
  if (s) return s;
  const defaults = {
    id: 1,
    currency: 'RD$',
    lastKm: 0,
    oilAlertKm: null,      // km en que se hizo el último aceite
    oilNextKm: null,       // km programado para el próximo aceite
    lastWashDate: null,
    version: DB_VERSION,
    isDemo: false,
  };
  await put(STORES.settings, defaults);
  return defaults;
}

async function updateSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await put(STORES.settings, updated);
  return updated;
}

/**
 * Actualiza el kilometraje actual si el nuevo valor es mayor.
 * Retorna true si se actualizó, false si no.
 */
async function tryUpdateKm(newKm) {
  if (typeof newKm !== 'number' || isNaN(newKm) || newKm <= 0) return false;
  const settings = await getSettings();
  if (newKm > (settings.lastKm || 0)) {
    await updateSettings({ lastKm: newKm });
    return true;
  }
  return false;
}

// ─── Vehicle ─────────────────────────────────────────────────────────────────

async function getVehicle() {
  await openDB();
  const v = await getOne(STORES.vehicle, 1);
  if (v) return v;
  const defaults = {
    id: 1,
    nickname: 'My K5',
    make: 'Kia',
    model: 'K5',
    year: 2022,
    color: '',
    plate: '',
    purchaseDate: null,
    photoUrl: null,
  };
  await put(STORES.vehicle, defaults);
  return defaults;
}

async function saveVehicle(data) {
  const current = await getVehicle();
  return put(STORES.vehicle, { ...current, ...data, id: 1 });
}

// ─── Fuel ────────────────────────────────────────────────────────────────────

async function addFuel(record) {
  // record: { date, amount, liters, km, isFull, station, notes, isDemo }
  const id = await add(STORES.fuel, { ...record, createdAt: Date.now() });
  if (record.km) await tryUpdateKm(record.km);
  return id;
}

async function updateFuel(record) {
  await put(STORES.fuel, record);
  if (record.km) await tryUpdateKm(record.km);
}

async function deleteFuel(id) {
  return remove(STORES.fuel, id);
}

async function getAllFuel() {
  return getAll(STORES.fuel);
}

// ─── Wash ────────────────────────────────────────────────────────────────────

async function addWash(record) {
  const id = await add(STORES.wash, { ...record, createdAt: Date.now() });
  await updateSettings({ lastWashDate: record.date });
  return id;
}

async function updateWash(record) {
  return put(STORES.wash, record);
}

async function deleteWash(id) {
  return remove(STORES.wash, id);
}

async function getAllWash() {
  return getAll(STORES.wash);
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

async function addMaintenance(record) {
  // record: { date, type, km, cost, nextKm, nextDate, workshop, notes, isDemo }
  const id = await add(STORES.maintenance, { ...record, createdAt: Date.now() });
  if (record.km) await tryUpdateKm(record.km);
  if (record.type === 'oil' && record.nextKm) {
    await updateSettings({ oilAlertKm: record.km, oilNextKm: record.nextKm });
  }
  return id;
}

async function updateMaintenance(record) {
  await put(STORES.maintenance, record);
  if (record.km) await tryUpdateKm(record.km);
  if (record.type === 'oil' && record.nextKm) {
    await updateSettings({ oilAlertKm: record.km, oilNextKm: record.nextKm });
  }
}

async function deleteMaintenance(id) {
  return remove(STORES.maintenance, id);
}

async function getAllMaintenance() {
  return getAll(STORES.maintenance);
}

// ─── Expenses ────────────────────────────────────────────────────────────────

async function addExpense(record) {
  // record: { date, category, amount, notes, isDemo }
  return add(STORES.expenses, { ...record, createdAt: Date.now() });
}

async function updateExpense(record) {
  return put(STORES.expenses, record);
}

async function deleteExpense(id) {
  return remove(STORES.expenses, id);
}

async function getAllExpenses() {
  return getAll(STORES.expenses);
}

// ─── Trips ───────────────────────────────────────────────────────────────────

async function addTrip(record) {
  // record: { date, origin, destination, kmStart, kmEnd, notes, tripExpenses[], isDemo }
  const id = await add(STORES.trips, { ...record, createdAt: Date.now() });
  if (record.kmEnd) await tryUpdateKm(record.kmEnd);
  return id;
}

async function updateTrip(record) {
  await put(STORES.trips, record);
  if (record.kmEnd) await tryUpdateKm(record.kmEnd);
}

async function deleteTrip(id) {
  return remove(STORES.trips, id);
}

async function getAllTrips() {
  return getAll(STORES.trips);
}

// ─── Aggregated queries ───────────────────────────────────────────────────────

/**
 * Retorna todos los registros de todos los stores ordenados por fecha desc.
 * Cada registro incluye { _store, ...data }
 */
async function getAllRecords() {
  const [fuel, wash, maint, exp, trips] = await Promise.all([
    getAllFuel(),
    getAllWash(),
    getAllMaintenance(),
    getAllExpenses(),
    getAllTrips(),
  ]);

  const tagged = [
    ...fuel.map(r => ({ ...r, _store: 'fuel' })),
    ...wash.map(r => ({ ...r, _store: 'wash' })),
    ...maint.map(r => ({ ...r, _store: 'maintenance' })),
    ...exp.map(r => ({ ...r, _store: 'expenses' })),
    ...trips.map(r => ({ ...r, _store: 'trips' })),
  ];

  return tagged.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Calcula el total de gastos en un rango de fechas.
 * type: 'month' | 'year' | 'all'
 */
async function getTotalCost(type = 'all', referenceDate = new Date()) {
  const [fuel, wash, maint, exp, trips] = await Promise.all([
    getAllFuel(),
    getAllWash(),
    getAllMaintenance(),
    getAllExpenses(),
    getAllTrips(),
  ]);

  function inRange(dateStr) {
    if (type === 'all') return true;
    const d = new Date(dateStr);
    if (type === 'month') {
      return d.getFullYear() === referenceDate.getFullYear() &&
             d.getMonth() === referenceDate.getMonth();
    }
    if (type === 'year') {
      return d.getFullYear() === referenceDate.getFullYear();
    }
    return true;
  }

  const sum = (arr, key) => arr.filter(r => inRange(r.date)).reduce((acc, r) => acc + (r[key] || 0), 0);
  const tripExpSum = trips.filter(r => inRange(r.date)).reduce((acc, t) => {
    const te = (t.tripExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    return acc + te;
  }, 0);

  return {
    fuel: sum(fuel, 'amount'),
    wash: sum(wash, 'cost'),
    maintenance: sum(maint, 'cost'),
    expenses: sum(exp, 'amount'),
    trips: tripExpSum,
    get total() { return this.fuel + this.wash + this.maintenance + this.expenses + this.trips; }
  };
}

/**
 * Datos mensuales agrupados para gráficas.
 * Retorna array [{month: 'YYYY-MM', fuel, wash, maintenance, expenses, total}]
 */
async function getMonthlyData() {
  const [fuel, wash, maint, exp] = await Promise.all([
    getAllFuel(), getAllWash(), getAllMaintenance(), getAllExpenses()
  ]);

  const months = {};

  function addToMonth(dateStr, category, value) {
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { month: key, fuel: 0, wash: 0, maintenance: 0, expenses: 0, total: 0 };
    months[key][category] += value || 0;
    months[key].total += value || 0;
  }

  fuel.forEach(r => addToMonth(r.date, 'fuel', r.amount));
  wash.forEach(r => addToMonth(r.date, 'wash', r.cost));
  maint.forEach(r => addToMonth(r.date, 'maintenance', r.cost));
  exp.forEach(r => addToMonth(r.date, 'expenses', r.amount));

  return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
}

// ─── Backup / Restore ────────────────────────────────────────────────────────

async function exportBackup() {
  const [vehicle, fuel, wash, maint, exp, trips, settings] = await Promise.all([
    getVehicle(),
    getAllFuel(),
    getAllWash(),
    getAllMaintenance(),
    getAllExpenses(),
    getAllTrips(),
    getSettings(),
  ]);

  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'myk5',
    vehicle,
    fuel,
    wash,
    maintenance: maint,
    expenses: exp,
    trips,
    settings,
  };
}

async function importBackup(data) {
  // Validate
  if (!data || data.app !== 'myk5' || !data.version) {
    throw new Error('Archivo de backup inválido o corrupto.');
  }
  if (data.version > DB_VERSION) {
    throw new Error(`Versión del backup (${data.version}) es mayor que la versión actual (${DB_VERSION}). Actualiza la aplicación.`);
  }

  await openDB();

  // Clear all stores
  await Promise.all([
    clearStore(STORES.vehicle),
    clearStore(STORES.fuel),
    clearStore(STORES.wash),
    clearStore(STORES.maintenance),
    clearStore(STORES.expenses),
    clearStore(STORES.trips),
    clearStore(STORES.settings),
  ]);

  // Restore
  const restoreAll = async (storeName, records) => {
    if (!Array.isArray(records)) return;
    for (const r of records) {
      await put(storeName, r);
    }
  };

  if (data.vehicle) await put(STORES.vehicle, data.vehicle);
  await restoreAll(STORES.fuel, data.fuel);
  await restoreAll(STORES.wash, data.wash);
  await restoreAll(STORES.maintenance, data.maintenance);
  await restoreAll(STORES.expenses, data.expenses);
  await restoreAll(STORES.trips, data.trips);
  if (data.settings) await put(STORES.settings, data.settings);
}

async function clearDemoData() {
  const [fuel, wash, maint, exp, trips] = await Promise.all([
    getAllFuel(), getAllWash(), getAllMaintenance(), getAllExpenses(), getAllTrips()
  ]);
  const del = (store, arr) => Promise.all(arr.filter(r => r.isDemo).map(r => remove(store, r.id)));
  await Promise.all([
    del(STORES.fuel, fuel),
    del(STORES.wash, wash),
    del(STORES.maintenance, maint),
    del(STORES.expenses, exp),
    del(STORES.trips, trips),
  ]);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

window.DB = {
  open: openDB,
  // Settings
  getSettings,
  updateSettings,
  tryUpdateKm,
  // Vehicle
  getVehicle,
  saveVehicle,
  // Fuel
  addFuel, updateFuel, deleteFuel, getAllFuel,
  // Wash
  addWash, updateWash, deleteWash, getAllWash,
  // Maintenance
  addMaintenance, updateMaintenance, deleteMaintenance, getAllMaintenance,
  // Expenses
  addExpense, updateExpense, deleteExpense, getAllExpenses,
  // Trips
  addTrip, updateTrip, deleteTrip, getAllTrips,
  // Aggregate
  getAllRecords,
  getTotalCost,
  getMonthlyData,
  // Backup
  exportBackup,
  importBackup,
  clearDemoData,
  STORES,
};
