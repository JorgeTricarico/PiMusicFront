# 🎵 PiMusic Frontend

<div align="center">

[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-118%20Tests%20Passing-success?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-f05032?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**Reproductor multimedia y cliente web de descargas de YouTube auto-hospedado, sin publicidad y optimizado para móviles y escritorio.**

[Características](#-características) •
[Inicio Rápido](#-inicio-rápido) •
[Despliegue con Docker](#-despliegue-con-docker) •
[Variables de Entorno](#-variables-de-entorno) •
[Atajos y Gestos](#-atajos-y-gestos) •
[Backend](#-backend)

</div>

---

## ✨ Características

* 🎬 **Streaming Fluido & Sin Anuncios**:
  - Reproductor con búfer avanzado y medidor de salud (*Buffer Health*).
  - Preselección de calidad (480p por defecto para inicio instantáneo, 720p HD recomendada, 1080p Full HD y Audio MP3).
  - Reproducción integrada dentro de la página, sin fondos negros invasivos ni publicidad externa.

* 📱 **Experiencia Móvil de Primera Clase (Mobile-First)**:
  - **Doble toque lateral (Double-Tap to Seek)**: Toca el lateral izquierdo o derecho del video para retroceder o adelantar 10 segundos con animaciones de ondas ripple.
  - **Gesto de deslizamiento (Swipe down)**: Arrastra el reproductor hacia abajo con el dedo para minimizarlo suavemente al `MiniPlayer`.
  - **PWA Instalable**: Agrega PiMusic a la pantalla de inicio de tu teléfono (Android / iOS) con manifest y modo standalone.
  - **MediaSession API**: Controla la música o video desde la pantalla de bloqueo, smartwatch o botones de auriculares Bluetooth.
  - **Banner de Portapapeles Automático**: Detecta automáticamente si tienes un enlace de YouTube copiado para analizarlo en 1 toque.

* 💻 **Experiencia de Escritorio Completa**:
  - **Atajos de teclado idénticos a YouTube**: <kbd>Espacio</kbd> / <kbd>K</kbd> (Play/Pause), <kbd>J</kbd> (-10s), <kbd>L</kbd> (+10s), <kbd>M</kbd> (Silenciar), <kbd>F</kbd> (Pantalla Completa), <kbd>T</kbd> (Modo Teatro panorámico), <kbd>0</kbd>-<kbd>9</kbd> (Saltar a porcentajes), <kbd>/</kbd> (Enfocar buscador), <kbd>?</kbd> (Guía de atajos).
  - **Control de volumen con la rueda del ratón** al pasar sobre el video.
  - **Modo Teatro panorámico** con ancho extendido de 7xl.

* 📁 **Gestión de Biblioteca en Raspberry Pi / Servidor**:
  - Explora el contenido almacenado en tu Raspberry Pi o servidor local.
  - Métricas de disco en tiempo real (espacio libre, porcentaje de uso).
  - Reproduce en streaming local o descarga a tu dispositivo a máxima velocidad de red LAN.
  - Eliminación segura con confirmación.

* 🛡️ **100% Privado y Desacoplado**:
  - Sin rastreadores de terceros ni telemetría invasiva.
  - Conexión flexible al backend mediante variables de entorno o desde el modal de Ajustes en la interfaz.

---

## 🚀 Inicio Rápido

### Requisitos Previos
* **Node.js**: v18.0 o superior (recomendado v20 LTS).
* **npm** o **pnpm**.
* Instancia en ejecución de [PiMusic-Backend](https://github.com/JorgeTricarico/PiMusic-Backend) (puerto 5000 por defecto).

### Instalación y Ejecución Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/JorgeTricarico/PiMusicFront.git
cd PiMusicFront

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (opcional)
cp .env.example .env

# 4. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000` y accesible en tu red local en `http://[IP-DE-TU-PC]:3000`.

### Ejecutar Pruebas Unitarias

```bash
npm test
```
*Incluye 118 pruebas unitarias y de integración pasando al 100% con Vitest.*

### Compilar para Producción

```bash
npm run build
```
Los archivos optimizados se generarán en el directorio `dist/`.

---

## 🐳 Despliegue con Docker

PiMusic Frontend incluye un `Dockerfile` multi-etapa ultraligero basado en **Nginx Alpine**:

### Usando Docker Compose

```bash
# Iniciar contenedor
docker compose up -d --build
```

El frontend estará escuchando en `http://localhost:3000`.

### Usando Docker directamente

```bash
# Construir imagen
docker build -t pimusic-frontend .

# Ejecutar contenedor en puerto 3000
docker run -d --name pimusic-frontend -p 3000:80 pimusic-frontend
```

---

## ⚙️ Variables de Entorno

Puedes crear un archivo `.env` en la raíz basándote en `.env.example`:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | URL absoluta del backend (ej: `http://192.168.1.50:5000`). Si se deja vacío, utiliza rutas relativas `/api` (ideal detrás de Nginx o en dev con proxy Vite). | `""` *(vacío)* |
| `VITE_BACKEND_URL` | Destino del proxy en desarrollo Vite (`npm run dev`). | `http://localhost:5000` |
| `PORT` | Puerto de escucha en desarrollo o Docker Compose. | `3000` |

> [!TIP]
> Si no defines `VITE_API_URL`, también puedes configurar o cambiar la dirección del servidor en caliente directamente desde el botón **Ajustes (⚙️)** en la interfaz web.

---

## ⌨️ Atajos y Gestos

### Teclado (Desktop)

| Tecla | Acción |
|---|---|
| <kbd>K</kbd> o <kbd>Espacio</kbd> | Alternar Reproducir / Pausar |
| <kbd>J</kbd> / <kbd>←</kbd> | Retroceder 10 segundos / 5 segundos |
| <kbd>L</kbd> / <kbd>→</kbd> | Adelantar 10 segundos / 5 segundos |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Subir / Bajar volumen 5% |
| <kbd>M</kbd> | Silenciar o restaurar volumen |
| <kbd>F</kbd> | Pantalla completa nativa |
| <kbd>T</kbd> | Alternar Modo Teatro panorámico |
| <kbd>0</kbd> a <kbd>9</kbd> | Saltar al 0%, 10%, ..., 90% de la duración |
| <kbd>/</kbd> | Enfocar rápidamente la barra de búsqueda |
| <kbd>?</kbd> | Ver modal de atajos de teclado |

### Gestos Táctiles (Móviles & Tablets)

* **Doble Toque Lateral**: Toca a la izquierda para retroceder 10s o a la derecha para adelantar 10s.
* **Deslizar Hacia Abajo**: Arrastra el reproductor hacia abajo para minimizarlo a la barra inferior sin interrumpir la reproducción.
* **Scroll sobre el Video (Desktop)**: Gira la rueda del ratón sobre el área del video para ajustar el volumen con precisión.

---

## 🔌 Backend

Este frontend se comunica con la API de alto rendimiento de **[PiMusic-Backend](https://github.com/JorgeTricarico/PiMusic-Backend)** (desarrollada en FastAPI + yt-dlp + FFmpeg con soporte para HTTP Range 206 y descargas segmentadas).

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta `LICENSE` para más detalles.
