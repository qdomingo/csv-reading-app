import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { parse } from 'csv-parse';

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const normalizeHeader = (value) => (
  typeof value === 'string'
    ? value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    : ''
);

const buildSheetObjects = (rows) => {
  if (!rows.length) {
    return [];
  }

  const headerRow = rows.find((row) => row.some((cell) => String(cell || '').trim() !== ''));
  if (!headerRow) {
    return [];
  }

  const headerIndex = rows.indexOf(headerRow);
  const headers = headerRow.map((cell, index) => {
    const value = String(cell || '').trim();
    return value || `columna_${index + 1}`;
  });

  return rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell || '').trim() !== ''))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? '';
      });
      return record;
    });
};

// Endpoint para subir archivo
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  // Guardar también el nombre original para detección de tipo
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// Endpoint para leer archivo subido
app.get('/api/read/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join('uploads', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  // Buscar el nombre original del archivo subido
  // Suponemos que el frontend envía el nombre original como query param si es necesario
  const originalname = req.query.originalname || '';
  const ext = path.extname(originalname || filename).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = xlsx.readFile(filePath);
    const rawMode = String(req.query.mode || '').toLowerCase() === 'raw';
    const requestedSheetName = String(req.query.sheetName || '').trim();
    const requestedSheetIndex = Number.parseInt(req.query.sheetIndex, 10);

    if (rawMode) {
      let sheetName = workbook.SheetNames[0];

      if (requestedSheetName && workbook.SheetNames.includes(requestedSheetName)) {
        sheetName = requestedSheetName;
      } else if (!Number.isNaN(requestedSheetIndex) && workbook.SheetNames[requestedSheetIndex]) {
        sheetName = workbook.SheetNames[requestedSheetIndex];
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const records = buildSheetObjects(rows);
      return res.json({ type: 'excel', sheetName, data: records });
    }

    const expected = {
      id: ['id', 'identificador', 'codigoempleado'],
      mail: ['mail', 'correo', 'email', 'correoelectronico'],
      nombre: ['nombrecompleto', 'nombre', 'fullname'],
      empresa: ['cliente', 'empresa', 'company'],
      codEmpresa: ['codempresa', 'codigoempresa'],
      licencia: ['licencia', 'license', 'tipolicencia'],
      estado: ['estado', 'status'],
      fechaAlta: ['fechaalta', 'fechadealta', 'fechainicio', 'startdate'],
      fechaBaja: ['fechabaja', 'fechadebaja', 'fechafin', 'enddate'],
      proyecto: ['proyecto', 'proyectos', 'codproyecto', 'codigoproyecto'],
      pais: ['pais', 'country'],
      mercado: ['mercado', 'market'],
      formacion: ['formacion', 'training'],
      origen: ['origen', 'origin']
    };
    const sheetCandidates = workbook.SheetNames.map((name, sheetIndex) => {
      const sheetRows = xlsx.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
      let bestHeader = null;
      for (let rowIndex = 0; rowIndex < Math.min(20, sheetRows.length); rowIndex++) {
        const row = sheetRows[rowIndex];
        const matched = new Set();
        row.forEach((cell) => {
          const normalized = normalizeHeader(String(cell || ''));
          Object.entries(expected).forEach(([key, aliases]) => {
            if (aliases.some((alias) => normalizeHeader(alias) === normalized)) matched.add(key);
          });
        });
        if (!bestHeader || matched.size > bestHeader.score) {
          bestHeader = { rowIndex, score: matched.size, matched };
        }
      }
      return { name, sheetIndex, rows: sheetRows, ...bestHeader };
    }).filter((candidate) => candidate.matched && candidate.matched.has('mail'));

    if (!sheetCandidates.length) {
      return res.status(400).json({ error: 'No se encontró una columna Mail, Correo o Email en el Excel.' });
    }

    // Preferir la hoja con más columnas reconocidas; en empate, mantener O-Licencias si existe.
    sheetCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aPreferred = a.name.trim().toLowerCase() === 'o-licencias';
      const bPreferred = b.name.trim().toLowerCase() === 'o-licencias';
      return Number(bPreferred) - Number(aPreferred) || a.sheetIndex - b.sheetIndex;
    });
    const { name: sheetName, rows, rowIndex: headerIndex } = sheetCandidates[0];
    const headers = rows[headerIndex].map((cell) => normalizeHeader(String(cell || '')));
    const columns = Object.fromEntries(Object.entries(expected).map(([key, aliases]) => [
      key,
      headers.flatMap((header, index) => aliases.some((alias) => normalizeHeader(alias) === header) ? [index] : [])
    ]));
    const readCell = (row, key) => {
      const indexes = columns[key] || [];
      // Si hay encabezados duplicados (como Licencia), toma el último que tenga contenido.
      for (const index of [...indexes].reverse()) {
        const value = row[index];
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
      }
      return '';
    };
    const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell || '').trim() !== ''));
    const normalizedResults = dataRows.map((row) => ({
      id: readCell(row, 'id'),
      mail: readCell(row, 'mail'),
      nombre: readCell(row, 'nombre'),
      empresa: readCell(row, 'empresa'),
      licencia: readCell(row, 'licencia'),
      estado: readCell(row, 'estado'),
      fechaAlta: readCell(row, 'fechaAlta'),
      fechaBaja: readCell(row, 'fechaBaja'),
      proyecto: readCell(row, 'proyecto'),
      pais: readCell(row, 'pais'),
      mercado: readCell(row, 'mercado'),
      codEmpresa: readCell(row, 'codEmpresa'),
      formacion: readCell(row, 'formacion'),
      origen: readCell(row, 'origen')
    })).filter((record) => Object.values(record).some((value) => String(value || '').trim() !== ''));
    return res.json({
      type: 'excel',
      sheetName,
      hasDateColumns: columns.fechaAlta.length > 0,
      sourceColumns: rows[headerIndex].map((header) => String(header || '').trim()).filter(Boolean),
      data: normalizedResults
    });
  } else if (ext === '.csv') {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => results.push(row))
      .on('end', () => {
        // Mapear columnas relevantes ignorando mayúsculas, espacios y guiones bajos
        const normalize = s => s.toLowerCase().replace(/\s|_/g, '');
        const firstRow = results[0] || {};
        const keys = Object.keys(firstRow);
        // Definir los nombres esperados para ambos tipos de CSV
        const expectedPantalla2 = {
          login: ['login'],
          name: ['name'],
          role: ['role']
        };
        const expectedPantalla1 = {
          login: ['login'],
          lastauthenticatedat: ['lastauthenticatedat', 'last authenticated at'],
          lastactivityat: ['lastactivityat', 'last activity at'],
          lastsurfaceused: ['lastsurfaceused', 'last surface used']
        };
        // Función para mapear columnas
        function getColMap(expected) {
          const colMap = {};
          for (const key of keys) {
            const norm = normalize(key);
            for (const exp in expected) {
              if (expected[exp].some(e => normalize(e) === norm)) {
                colMap[exp] = key;
              }
            }
          }
          // Si falta alguna columna, intentar buscar por coincidencia parcial
          for (const exp in expected) {
            if (!colMap[exp]) {
              const found = keys.find(k => normalize(k).includes(exp));
              if (found) colMap[exp] = found;
            }
          }
          return colMap;
        }
        // Detectar si es un CSV de Pantalla2 (tiene login y role)
        const colMap2 = getColMap(expectedPantalla2);
        const hasPantalla2 = colMap2.login && colMap2.role;
        if (hasPantalla2) {
          // Devolver login, name (si existe) y role
          const normalizedResults = results.map(row => ({
            login: row[colMap2.login] || '',
            name: colMap2.name ? (row[colMap2.name] || '') : '',
            role: row[colMap2.role] || ''
          }));
          return res.json({ type: 'csv', data: normalizedResults });
        }
        // Si no, intentar Pantalla1 (Copilot)
        const colMap1 = getColMap(expectedPantalla1);
        const normalizedResults = results.map(row => ({
          login: row[colMap1.login] || '',
          'last authenticated at': row[colMap1.lastauthenticatedat] || '',
          'last activity at': row[colMap1.lastactivityat] || '',
          'last surface used': row[colMap1.lastsurfaceused] || ''
        }));
        return res.json({ type: 'csv', data: normalizedResults });
      })
      .on('error', (err) => {
        res.status(500).json({ error: 'Error leyendo el archivo CSV' });
      });
  } else {
    res.status(400).json({ error: 'Tipo de archivo no soportado' });
  }
});

// Servir frontend en producción
const __dirname = path.resolve();
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
});
