import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const normalizeHeader = (value) => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
);

const normalizeCellValue = (value) => String(value ?? '').trim();
const EXCLUDED_PROJECTS = {
  MOBILITY: 'MOBBOR',
  ATM: 'DATM01',
};

const findColumn = (row, candidates) => {
  const entries = Object.keys(row || {});
  return entries.find((key) => candidates.includes(normalizeHeader(key))) || '';
};

function Pantalla6({ onBack }) {
  const [inducedFile, setInducedFile] = useState(null);
  const [employeesFile, setEmployeesFile] = useState(null);
  const [inducedLoaded, setInducedLoaded] = useState(false);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [inducedRows, setInducedRows] = useState([]);
  const [employeesRows, setEmployeesRows] = useState([]);
  const [processedRows, setProcessedRows] = useState([]);
  const [summary, setSummary] = useState({ active: 0, inactive: 0, mobility: 0, atm: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [usuarioFilter, setUsuarioFilter] = useState('');
  const [nombreFilter, setNombreFilter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [mercadoFilter, setMercadoFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [paisFilter, setPaisFilter] = useState('');
  const [proyectoFilter, setProyectoFilter] = useState('');
  const [activoFilter, setActivoFilter] = useState('');

  const uploadAndReadExcel = async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const params = new URLSearchParams({
      originalname: uploadRes.data.originalname,
      mode: 'raw',
    });

    if (typeof options.sheetIndex === 'number') {
      params.set('sheetIndex', String(options.sheetIndex));
    }

    if (options.sheetName) {
      params.set('sheetName', options.sheetName);
    }

    const readRes = await axios.get(`/api/read/${uploadRes.data.filename}?${params.toString()}`);
    return readRes.data.data || [];
  };

  const handleProcessFiles = async () => {
    if (!inducedFile || !employeesFile) {
      setError('Debes seleccionar los dos archivos Excel antes de procesar.');
      return;
    }

    setLoading(true);
    setError('');
  setInducedLoaded(false);
  setEmployeesLoaded(false);

    try {
      const [inducedData, employeesData] = await Promise.all([
        uploadAndReadExcel(inducedFile),
        uploadAndReadExcel(employeesFile, { sheetIndex: 0 }),
      ]);

      setInducedRows(inducedData);
      setEmployeesRows(employeesData);
      setInducedLoaded(true);
      setEmployeesLoaded(true);
    } catch (requestError) {
      console.error('Error cargando archivos de Check inducidas:', requestError);
      setError('No se pudieron leer los archivos seleccionados. Revisa que ambos Excels tengan cabeceras válidas.');
      setInducedRows([]);
      setEmployeesRows([]);
      setProcessedRows([]);
      setSummary({ active: 0, inactive: 0, mobility: 0, atm: 0 });
      setInducedLoaded(false);
      setEmployeesLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!inducedRows.length || !employeesRows.length) {
      setProcessedRows([]);
      setSummary({ active: 0, inactive: 0, mobility: 0, atm: 0 });
      return;
    }

    const inducedSample = inducedRows[0] || {};
    const employeesSample = employeesRows[0] || {};

    const inducedIdColumn = findColumn(inducedSample, ['id']);
    const inducedEmailColumn = findColumn(inducedSample, ['correo', 'mail', 'email']);
    const inducedNameColumn = findColumn(inducedSample, ['nombre']);
    const inducedCompanyColumn = findColumn(inducedSample, ['empresa', 'codempresa']);
    const inducedMarketColumn = findColumn(inducedSample, ['mercado']);
    const inducedClientColumn = findColumn(inducedSample, ['cliente']);
    const inducedCountryColumn = findColumn(inducedSample, ['pais']);
    const inducedProjectColumn = findColumn(inducedSample, ['codproyecto', 'codigoproyecto', 'proyecto']);
    const employeesIdColumn = findColumn(employeesSample, ['cdemplea']);

    if (!inducedIdColumn || !employeesIdColumn) {
      setError('No se encontró la columna ID en inducidas o cdemplea en empleados activos.');
      setProcessedRows([]);
      setSummary({ active: 0, inactive: 0, mobility: 0, atm: 0 });
      return;
    }

    const activeEmployees = new Set(
      employeesRows
        .map((row) => normalizeCellValue(row[employeesIdColumn]))
        .filter(Boolean)
    );

    let activeCount = 0;
    let inactiveCount = 0;
    let mobilityCount = 0;
    let atmCount = 0;

    const rows = inducedRows
      .map((row) => {
        const projectCode = normalizeCellValue(row[inducedProjectColumn]).toUpperCase();

        if (projectCode === EXCLUDED_PROJECTS.MOBILITY) {
          mobilityCount += 1;
          return null;
        }

        if (projectCode === EXCLUDED_PROJECTS.ATM) {
          atmCount += 1;
          return null;
        }

        const employeeId = normalizeCellValue(row[inducedIdColumn]);
        if (!employeeId) {
          return null;
        }

        const isActive = activeEmployees.has(employeeId);
        if (isActive) {
          activeCount += 1;
        } else {
          inactiveCount += 1;
        }

        return {
          nombre: normalizeCellValue(row[inducedNameColumn]),
          correo: normalizeCellValue(row[inducedEmailColumn]),
          id: employeeId,
          empresa: normalizeCellValue(row[inducedCompanyColumn]),
          mercado: normalizeCellValue(row[inducedMarketColumn]),
          cliente: normalizeCellValue(row[inducedClientColumn]),
          pais: normalizeCellValue(row[inducedCountryColumn]),
          proyecto: projectCode,
          activo: isActive ? 'SI' : 'NO',
        };
      })
      .filter(Boolean);

    setProcessedRows(rows);
    setSummary({ active: activeCount, inactive: inactiveCount, mobility: mobilityCount, atm: atmCount });
    setError('');
  }, [inducedRows, employeesRows]);

  const filteredRows = processedRows.filter((row) => {
    const nombreOk = nombreFilter ? row.nombre.toLowerCase().includes(nombreFilter.toLowerCase()) : true;
    const correoOk = usuarioFilter ? row.correo.toLowerCase().includes(usuarioFilter.toLowerCase()) : true;
    const idOk = idFilter ? row.id.toLowerCase().includes(idFilter.toLowerCase()) : true;
    const empresaOk = empresaFilter ? row.empresa.toLowerCase().includes(empresaFilter.toLowerCase()) : true;
    const mercadoOk = mercadoFilter ? row.mercado.toLowerCase().includes(mercadoFilter.toLowerCase()) : true;
    const clienteOk = clienteFilter ? row.cliente.toLowerCase().includes(clienteFilter.toLowerCase()) : true;
    const paisOk = paisFilter ? row.pais.toLowerCase().includes(paisFilter.toLowerCase()) : true;
    const proyectoOk = proyectoFilter ? row.proyecto.toLowerCase().includes(proyectoFilter.toLowerCase()) : true;
    const activoOk = activoFilter ? row.activo === activoFilter : true;
    return nombreOk && correoOk && idOk && empresaOk && mercadoOk && clienteOk && paisOk && proyectoOk && activoOk;
  });

  const resetFilters = () => {
    setUsuarioFilter('');
    setNombreFilter('');
    setIdFilter('');
    setEmpresaFilter('');
    setMercadoFilter('');
    setClienteFilter('');
    setPaisFilter('');
    setProyectoFilter('');
    setActivoFilter('');
  };

  const exportFilteredRows = () => {
    const exportData = filteredRows.map((row) => ({
      Nombre: row.nombre,
      Correo: row.correo,
      ID: row.id,
      'Cód. Empresa': row.empresa,
      Mercado: row.mercado,
      Cliente: row.cliente,
      País: row.pais,
      'Cód. proyecto': row.proyecto,
      Activo: row.activo,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Check inducidas');
    XLSX.writeFile(workbook, `check_inducidas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '18px 0 18px 0', fontWeight: 700, fontSize: 22, color: '#fff', textAlign: 'left' }}>
        Check inducidas
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
        <button onClick={handleProcessFiles} className="upload-btn" disabled={loading}>
          {loading ? 'Procesando...' : 'Cargar y cruzar archivos'}
        </button>
        <button onClick={resetFilters} style={{ padding: '12px 28px', fontSize: 16, borderRadius: 8, background: '#2b5876', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
          Limpiar filtros
        </button>
        <button onClick={onBack} style={{ padding: '12px 28px', fontSize: 16, borderRadius: 8, background: '#23293a', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
          Volver al menú
        </button>
      </div>

      <div style={{ background: '#23293a', borderRadius: 12, padding: 24, marginTop: 24, color: '#fff' }}>
        <form className="file-upload-form" style={{ marginBottom: 24 }}>
          <label className="file-upload-label">
            Seleccionar Excel Licencias Inducidas
            <input
              className="file-upload-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setInducedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
                setInducedLoaded(false);
                setProcessedRows([]);
                setSummary({ active: 0, inactive: 0, mobility: 0, atm: 0 });
                setError('');
              }}
            />
          </label>
          {inducedFile && <span style={{ color: '#7ed6df', fontWeight: 500 }}>{inducedFile.name}</span>}
          {inducedLoaded && <span style={{ color: '#4caf50', marginLeft: 8, fontSize: 20 }}>✔</span>}
        </form>

        <form className="file-upload-form" style={{ marginBottom: 24 }}>
          <label className="file-upload-label">
            Seleccionar Excel Empleados Activos
            <input
              className="file-upload-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setEmployeesFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
                setEmployeesLoaded(false);
                setProcessedRows([]);
                setSummary({ active: 0, inactive: 0, mobility: 0, atm: 0 });
                setError('');
              }}
            />
          </label>
          {employeesFile && <span style={{ color: '#7ed6df', fontWeight: 500 }}>{employeesFile.name}</span>}
          {employeesLoaded && <span style={{ color: '#4caf50', marginLeft: 8, fontSize: 20 }}>✔</span>}
        </form>

        <div style={{ color: '#b2becd', marginBottom: 24 }}>
          Se usará la primera pestaña del Excel de empleados activos. El cruce se hace por ID de inducidas frente a cdemplea.
        </div>

        {error && <div style={{ color: '#ff8a8a', marginBottom: 24 }}>{error}</div>}

        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: '#fff', marginBottom: 12 }}>Tabla Resumen</h3>
          <table className="dashboard-table" style={{ minWidth: 520, background: '#23293a' }}>
            <thead>
              <tr>
                <th style={{ width: 360 }}>Concepto</th>
                <th style={{ width: 140 }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Empleados con Licencia Inducida Activos</td>
                <td>{inducedLoaded && employeesLoaded ? summary.active : '-'}</td>
              </tr>
              <tr>
                <td>Empleados con Licencia Inducida No Activos</td>
                <td>{inducedLoaded && employeesLoaded ? summary.inactive : '-'}</td>
              </tr>
              <tr>
                <td>Mobility</td>
                <td>{inducedLoaded && employeesLoaded ? summary.mobility : '-'}</td>
              </tr>
              <tr>
                <td>ATM</td>
                <td>{inducedLoaded && employeesLoaded ? summary.atm : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {processedRows.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 16, flexWrap: 'wrap' }}>
              <h3 style={{ color: '#fff', margin: 0 }}>Usuarios agregados ({filteredRows.length})</h3>
              <button onClick={exportFilteredRows} className="upload-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                Exportar a Excel
              </button>
            </div>
            <div style={{ maxHeight: '520px', overflowY: 'auto', overflowX: 'auto', borderRadius: 12, fontSize: '0.85rem' }}>
              <table className="dashboard-table" style={{ minWidth: 980, background: '#23293a' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#23293a', zIndex: 1 }}>
                  <tr>
                    <th style={{ minWidth: 180 }}>
                      Nombre
                      <input
                        type="text"
                        value={nombreFilter}
                        onChange={(e) => setNombreFilter(e.target.value)}
                        placeholder="Nombre..."
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                    <th style={{ minWidth: 180 }}>
                      Correo
                      <input
                        type="text"
                        value={usuarioFilter}
                        onChange={(e) => setUsuarioFilter(e.target.value)}
                        placeholder="Correo..."
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                    <th style={{ minWidth: 120 }}>
                      ID
                      <input
                        type="text"
                        value={idFilter}
                        onChange={(e) => setIdFilter(e.target.value)}
                        placeholder="ID..."
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                    <th style={{ minWidth: 140 }}>
                      Empresa
                      <input
                        type="text"
                        value={empresaFilter}
                        onChange={(e) => setEmpresaFilter(e.target.value)}
                        placeholder="Empresa..."
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                    <th style={{ minWidth: 140 }}>
                      Mercado
                      <input
                        type="text"
                        value={mercadoFilter}
                        onChange={(e) => setMercadoFilter(e.target.value)}
                        placeholder="Mercado..."
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                    <th style={{ minWidth: 140 }}>
                      Cliente
                      <input
                        type="text"
                        value={clienteFilter}
                        onChange={(e) => setClienteFilter(e.target.value)}
                        placeholder="Cliente..."
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                    <th style={{ minWidth: 120 }}>
                      País
                      <input
                        type="text"
                        value={paisFilter}
                        onChange={(e) => setPaisFilter(e.target.value)}
                        placeholder="País..."
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                    <th style={{ minWidth: 140 }}>
                      Cód. proyecto
                      <input
                        type="text"
                        value={proyectoFilter}
                        onChange={(e) => setProyectoFilter(e.target.value)}
                        placeholder="Proyecto..."
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                    <th style={{ minWidth: 100 }}>
                      Activo
                      <select
                        value={activoFilter}
                        onChange={(e) => setActivoFilter(e.target.value)}
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="">Todos</option>
                        <option value="SI">SI</option>
                        <option value="NO">NO</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={`${row.id}-${index}`}>
                      <td>{row.nombre}</td>
                      <td>{row.correo}</td>
                      <td>{row.id}</td>
                      <td>{row.empresa}</td>
                      <td>{row.mercado}</td>
                      <td>{row.cliente}</td>
                      <td>{row.pais}</td>
                      <td>{row.proyecto}</td>
                      <td style={{ fontWeight: 700, color: row.activo === 'SI' ? '#4caf50' : '#ff8a8a' }}>{row.activo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Pantalla6;