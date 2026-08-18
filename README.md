# My K5 — Dashboard Personal para Kia K5

Aplicación web progresiva (PWA) para seguimiento personal del vehículo.

## 🚀 Ver en vivo

**[yandellcuevas-sketch.github.io/myk5](https://yandellcuevas-sketch.github.io/myk5/)**

## 📱 Características

- Dashboard con imagen del vehículo, kilometraje y gastos del mes
- Registro rápido de gasolina, lavados, mantenimiento y viajes
- Historial con timeline visual y filtros
- Estadísticas: distribución de gastos, gráficas mensuales
- Alertas de mantenimiento (aceite, lavado)
- Backup/restore en JSON + exportación CSV
- Funciona **100% offline** sin backend
- Instalable como app (PWA)

## 🛠 Tecnología

- HTML5 + CSS3 + JavaScript vanilla
- IndexedDB (persistencia local)
- Chart.js (gráficas, carga lazy)
- Service Worker (offline/PWA)
- Sin framework, sin dependencias de build

## 📂 Estructura

```
myk5/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   ├── app.css
│   ├── components.css
│   └── animations.css
├── js/
│   ├── app.js          # Inicialización y navegación
│   ├── db.js           # IndexedDB centralizado
│   ├── state.js        # Bus de eventos
│   ├── utils.js        # Utilidades y formateo
│   ├── dashboard.js    # Pantalla principal
│   ├── fuel.js         # Gasolina
│   ├── wash.js         # Lavados
│   ├── maintenance.js  # Mantenimiento
│   ├── expenses.js     # Otros gastos
│   ├── trips.js        # Viajes
│   ├── history.js      # Historial
│   ├── statistics.js   # Estadísticas
│   ├── vehicle.js      # Perfil del vehículo
│   └── backup.js       # Backup y restauración
└── assets/
    ├── images/
    │   └── k5.png      # ← Reemplaza esta imagen con tu foto del K5
    └── icons/          # Iconos PWA
```

## 🖼 Cambiar la imagen del K5

Simplemente reemplaza el archivo `assets/images/k5.png` con tu propia foto.
Recomendado: imagen con fondo transparente (PNG), aspecto horizontal.

## 💻 Ejecutar localmente

Abre `index.html` directamente en tu navegador, o usa un servidor local simple:

```bash
# Con Python
python -m http.server 8080

# Con Node.js
npx serve .
```

Luego abre: `http://localhost:8080`

## 🌐 Publicar en GitHub Pages

1. Ve a **Settings → Pages** en tu repositorio
2. Source: **Deploy from a branch**
3. Branch: **main** / **root**
4. Guarda y espera ~2 minutos
5. URL: `https://yandellcuevas-sketch.github.io/myk5/`

## 📦 Moneda

Todos los montos están en **RD$ (Peso dominicano)**.

---

Desarrollado con ♥ para uso personal.
