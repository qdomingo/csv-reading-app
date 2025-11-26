# Análisis Uso Copilot - Dashboard CSV/Excel

Este proyecto es una aplicación web para visualizar y analizar datos de uso de usuarios a partir de archivos CSV o Excel. Permite cargar archivos, filtrar y buscar información, y visualizar estadísticas en un dashboard moderno.

## Características principales
- Carga de archivos CSV o Excel (XLSX)
- Visualización de datos en tabla filtrable y buscable
- Gráficas de tarta para distribución de IDEs y actividad de usuarios
- Filtros avanzados integrados en la cabecera de la tabla
- Interfaz moderna y responsiva

## Estructura del proyecto
- `/backend`: Servidor Node.js (Express) para procesar archivos y exponer la API
- `/frontend`: Aplicación React para el dashboard y la visualización

## Instalación y ejecución local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/qdomingo/csv-reading-app.git
   cd csv-reading-app
   ```

2. Instala dependencias y ejecuta el backend:
   ```bash
   cd backend
   npm install
   npm start
   ```

3. Instala dependencias y ejecuta el frontend (en otra terminal):
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

4. Accede a la app en [http://localhost:3000](http://localhost:3000)

## Uso
- Sube un archivo CSV o Excel desde el dashboard.
- Filtra y busca por login, IDE o actividad desde la cabecera de la tabla.
- Visualiza las gráficas de distribución de IDEs y actividad de usuarios.

## Notas técnicas
- El backend mapea automáticamente las columnas relevantes del CSV, aunque los nombres tengan mayúsculas, espacios o guiones bajos.
- Los IDEs se agrupan por nombre base (sin versión) en las gráficas y filtros.
- Los archivos subidos se almacenan temporalmente en `/backend/uploads` (ignorado por git).

## Despliegue en Heroku

Puedes desplegar la aplicación en Heroku siguiendo estos pasos:

### 1. Prepara el proyecto

- Asegúrate de que el backend y el frontend estén en carpetas separadas (`/backend` y `/frontend`).
- El backend debe estar listo para producción (por ejemplo, usando variables de entorno para la configuración).
- El frontend debe compilarse en modo producción (`npm run build` en `/frontend`).

### 2. Configura el backend para servir el frontend

- Copia la carpeta `build` generada por React (`/frontend/build`) dentro de `/backend` o configura el backend para servir archivos estáticos desde esa carpeta.
- En tu archivo principal de Express (por ejemplo, `index.js` o `app.js`), agrega algo como:

  ```js
  // ...existing code...
  const path = require('path');
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
  // ...existing code...
  ```

### 3. Crea un repositorio Git y sube a Heroku

- Desde la raíz del proyecto (donde está la carpeta `/backend`):

  ```bash
  cd backend
  git init
  heroku create nombre-de-tu-app
  git add .
  git commit -m "Deploy app"
  git push heroku master
  ```

- Asegúrate de tener un archivo `Procfile` en `/backend` con el siguiente contenido:

  ```
  web: node index.js
  ```

  (Reemplaza `index.js` por el nombre de tu archivo principal si es diferente.)

### 4. Configura variables de entorno en Heroku

- Usa el dashboard de Heroku o el CLI para añadir variables necesarias (por ejemplo, `PORT`, etc.).

### 5. Accede a tu aplicación

- Una vez desplegada, Heroku te dará una URL pública para acceder a tu dashboard.

## Licencia
MIT
