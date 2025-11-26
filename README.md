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

## Licencia
MIT
