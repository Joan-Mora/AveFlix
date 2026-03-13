# AveFlix Live

## Descripción del Proyecto
AveFlix Live es una plataforma de capacitación corporativa tipo trivia multijugador en tiempo real (estilo Kahoot), construida para sesiones presenciales.

La experiencia separa la pantalla proyectada del facilitador (Host) de las pantallas móviles de los operarios (Players), sincronizando fases del juego mediante Firebase Realtime Database:

1. `LOBBY`
2. `QUESTION`
3. `VOTING_RESULTS`
4. `FEEDBACK_LOOP`
5. `LEADERBOARD`

Stack principal:

1. React + TypeScript + Vite + Tailwind CSS
2. React Router para vistas Host/Player
3. Firebase Realtime Database para sincronización de estado
4. react-qr-code para acceso rápido de jugadores por QR

## Topología Frontend
Rutas clave de la aplicación:

1. `/`: entrada principal del sistema (menú/creación de sala para Host)
2. `/host/:roomId`: vista de control proyectada para el facilitador
3. `/play/:roomId`: vista móvil para jugadores

Nota operativa: el flujo inicia en `/` y, al crear una sala, redirige al Host a `/host/:roomId`.

## Puesta en Marcha Local
### 1) Instalar dependencias
```bash
npm install
```

### 2) Configurar variables de entorno
Crear un archivo `.env` en la raíz, tomando como base `.env.example`.

Variables requeridas:

1. `VITE_FIREBASE_API_KEY`
2. `VITE_FIREBASE_AUTH_DOMAIN`
3. `VITE_FIREBASE_DATABASE_URL`
4. `VITE_FIREBASE_PROJECT_ID`
5. `VITE_FIREBASE_STORAGE_BUCKET`
6. `VITE_FIREBASE_MESSAGING_SENDER_ID`
7. `VITE_FIREBASE_APP_ID`
8. `VITE_FIREBASE_MEASUREMENT_ID`

### 3) Levantar entorno de desarrollo
```bash
npm run dev
```

## Despliegue en Render (Static Site)
Checklist recomendado:

1. Subir el repositorio a GitHub (sin secretos, nunca commitear `.env`).
2. En Render, crear un nuevo servicio tipo Static Site.
3. Conectar el repositorio y seleccionar la rama objetivo.
4. Definir comandos:
   Build Command: `npm run build`
   Publish Directory: `dist`
5. Abrir la pestaña Environment y crear estas 8 variables exactamente:
   `VITE_FIREBASE_API_KEY`
   `VITE_FIREBASE_AUTH_DOMAIN`
   `VITE_FIREBASE_DATABASE_URL`
   `VITE_FIREBASE_PROJECT_ID`
   `VITE_FIREBASE_STORAGE_BUCKET`
   `VITE_FIREBASE_MESSAGING_SENDER_ID`
   `VITE_FIREBASE_APP_ID`
   `VITE_FIREBASE_MEASUREMENT_ID`
6. Guardar variables y ejecutar el primer deploy.
7. Validar en la URL pública de Render:
   `/` crea sala
   `/host/:roomId` muestra control Host
   `/play/:roomId` permite unión desde móviles

## Verificación de Build de Producción
Antes de publicar cambios:

```bash
npm run build
npm run preview
```

Si ambos comandos pasan, el artefacto de producción está listo para despliegue.

## Troubleshooting
### Error 404 al recargar la página (SPA Routing)
Problema: al ser un Static Site, Render no entiende por sí solo las rutas dinámicas de React Router si se recarga la página directamente en rutas como `/play/ABCD12` o `/host/ABCD12`.

Solución en Render:

1. Ir al servicio en Render.
2. Abrir la pestaña Redirects/Rewrites.
3. Crear una regla con:
   Source: `/*`
   Destination: `/index.html`
   Action: `Rewrite`

### Pantalla en blanco o crash inicial
Problema: variables de entorno faltantes o mal copiadas durante el build o el arranque.

Solución:

1. Verificar que existan las 8 variables `VITE_FIREBASE_...` en Render.
2. Confirmar que sus valores coincidan exactamente con Firebase.
3. Evitar comillas extra o espacios en blanco al final de cada valor.

### Desconexiones o datos que no cargan (Firebase Rules)
Problema: Firebase Realtime Database puede bloquear lecturas o escrituras si las reglas ya no permiten acceso.

Solución:

1. Abrir Firebase Console.
2. Entrar a Realtime Database.
3. Revisar la pestaña Reglas.
4. Si se configuró en Modo de prueba, recordar que ese acceso temporal expira.
5. Extender la ventana temporal o configurar reglas públicas/autenticadas según el entorno de uso.
