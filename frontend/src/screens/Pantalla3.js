
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../App.css';

// Etiqueta personalizada: valor y porcentaje juntos al final de la línea de la porción, en blanco
const renderCustomLabel = (data, total) => ({ cx, cy, midAngle, outerRadius, percent, index }) => {
  const RADIAN = Math.PI / 180;
  const value = data[index]?.value || 0;
  const label = `${value} (${(percent * 100).toFixed(1)}%)`;
  // Posición al final de la línea
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={15} fontWeight={700}>
      {label}
    </text>
  );
};

function Pantalla3({ onBack }) {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Filtros
  const [mailFilter, setMailFilter] = useState('');
  const [nombreFilter, setNombreFilter] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [licenciaFilter, setLicenciaFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [licenciasUnicas, setLicenciasUnicas] = useState([]);
  const debounceMail = useRef();
  const debounceNombre = useRef();
  const debounceEmpresa = useRef();
  // No debounce for select filters

  // Handler para guardar el archivo seleccionado
  const handleFileChange = e => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  // Handler para subir el archivo al backend y procesar la respuesta
  const handleUpload = async e => {
    e.preventDefault();
    if (!file) {
      setError('Selecciona un archivo primero.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Leer datos, enviando el nombre original como query param
      const readRes = await axios.get(`/api/read/${uploadRes.data.filename}?originalname=${encodeURIComponent(uploadRes.data.originalname)}`);
      let rows = readRes.data.data || [];
      // Normalizar campos esperados de forma robusta
      const getField = (row, variants) => {
        // Busca la clave ignorando mayúsculas, espacios y acentos
        const normalize = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '').toLowerCase();
        const keys = Object.keys(row);
        for (const variant of variants) {
          const normVariant = normalize(variant);
          for (const key of keys) {
            if (normalize(key) === normVariant) return row[key];
          }
        }
        return '';
      };
      rows = rows.map(row => ({
        mail: getField(row, ['Mail']),
        nombre: getField(row, ['Nombre completo', 'Nombre', 'Nombrecompleto']),
        empresa: getField(row, ['Empresa']),
        licencia: getField(row, ['Licencia']),
        estado: getField(row, ['Estado']),
      }));
      setData(rows);
      // Calcular licencias únicas para el selector
      const licencias = Array.from(new Set(rows.map(r => r.licencia).filter(l => l)));
      setLicenciasUnicas(licencias);
    } catch (err) {
      setError('Error al subir o procesar el archivo.');
    } finally {
      setLoading(false);
    }
  };

  // Filtros reactivos
  const [filteredData, setFilteredData] = useState([]);
  React.useEffect(() => {
    let filtered = data;
    if (mailFilter) filtered = filtered.filter(row => (row.mail || '').toLowerCase().includes(mailFilter.toLowerCase()));
    if (nombreFilter) filtered = filtered.filter(row => (row.nombre || '').toLowerCase().includes(nombreFilter.toLowerCase()));
    if (empresaFilter) filtered = filtered.filter(row => (row.empresa || '').toLowerCase().includes(empresaFilter.toLowerCase()));
    if (licenciaFilter) filtered = filtered.filter(row => (row.licencia || '').toLowerCase().includes(licenciaFilter.toLowerCase()));
    if (estadoFilter) filtered = filtered.filter(row => (row.estado || '').toLowerCase().includes(estadoFilter.toLowerCase()));
    setFilteredData(filtered);
  }, [data, mailFilter, nombreFilter, empresaFilter, licenciaFilter, estadoFilter]);

  // Handlers para los filtros con debounce
  const handleMailFilter = e => {
    const value = e.target.value;
    setMailFilter(value);
    if (debounceMail.current) clearTimeout(debounceMail.current);
    debounceMail.current = setTimeout(() => {
      setMailFilter(value.trim());
    }, 500);
  };
  const handleNombreFilter = e => {
    const value = e.target.value;
    setNombreFilter(value);
    if (debounceNombre.current) clearTimeout(debounceNombre.current);
    debounceNombre.current = setTimeout(() => {
      setNombreFilter(value.trim());
    }, 500);
  };
  const handleEmpresaFilter = e => {
    const value = e.target.value;
    setEmpresaFilter(value);
    if (debounceEmpresa.current) clearTimeout(debounceEmpresa.current);
    debounceEmpresa.current = setTimeout(() => {
      setEmpresaFilter(value.trim());
    }, 500);
  };
  // Select directo para licencia y estado
  const handleLicenciaFilter = e => {
    setLicenciaFilter(e.target.value);
  };
  const handleEstadoFilter = e => {
    setEstadoFilter(e.target.value);
  };

  // --- Gráfica de estado de licencias ---
  let pieEstadoData = [];
  if (filteredData.length > 0) {
    const estadoCount = {};
    filteredData.forEach(row => {
      const estado = (row.estado || '').trim();
      if (estado) {
        // Normalizar a capitalizado (primera letra mayúscula, resto minúscula)
        const estadoNormalizado = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
        estadoCount[estadoNormalizado] = (estadoCount[estadoNormalizado] || 0) + 1;
      }
    });
    pieEstadoData = Object.entries(estadoCount).map(([name, value]) => ({ name, value }));
  }

  // --- Gráfica de empresas (top 5 + resto) ---
  let pieEmpresaData = [];
  if (filteredData.length > 0) {
    const empresaCount = {};
    filteredData.forEach(row => {
      const empresa = (row.empresa || '').trim();
      const estado = (row.estado || '').trim().toLowerCase();
      // Solo contar empresas con licencias asignadas
      if (empresa && estado === 'asignada') {
        empresaCount[empresa] = (empresaCount[empresa] || 0) + 1;
      }
    });
    const sorted = Object.entries(empresaCount).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const resto = sorted.slice(5);
    let restoCount = 0;
    resto.forEach(([k, v]) => { restoCount += v; });
    pieEmpresaData = top5.map(([name, value]) => ({ name, value }));
    if (restoCount > 0) pieEmpresaData.push({ name: 'Otras', value: restoCount });
  }

  const pieColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#d0ed57'];
  const totalEstado = pieEstadoData.reduce((acc, cur) => acc + cur.value, 0);
  const totalEmpresa = pieEmpresaData.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '18px 0 18px 0', fontWeight: 700, fontSize: 22, color: '#fff', textAlign: 'left' }}>
        Análisis Licencias
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
        <form className="file-upload-form" onSubmit={handleUpload} style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <label className="file-upload-label">
            Seleccionar archivo Excel
            <input
              className="file-upload-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </label>
          <button className="upload-btn" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : 'Subir y mostrar'}
          </button>
          {file && <span style={{ color: '#7ed6df', fontWeight: 500 }}>{file.name}</span>}
        </form>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onBack} style={{ padding: '12px 28px', fontSize: 16, borderRadius: 8, background: '#23293a', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            Volver al menú
          </button>
        </div>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      {filteredData.length > 0 && (
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 30 }}>
          <div style={{ flex: 1, minWidth: 320, height: 370 }}>
            <h2 style={{ color: '#fff', textAlign: 'center' }}>Estado de las licencias</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieEstadoData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderCustomLabel(pieEstadoData, totalEstado)}
                >
                  {pieEstadoData.map((entry, idx) => (
                    <Cell key={`cell-estado-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
              Total: {totalEstado}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 320, height: 370 }}>
            <h2 style={{ color: '#fff', textAlign: 'center' }}>Distribución por Empresa</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieEmpresaData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderCustomLabel(pieEmpresaData, totalEmpresa)}
                >
                  {pieEmpresaData.map((entry, idx) => (
                    <Cell key={`cell-empresa-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
              Total: {totalEmpresa}
            </div>
          </div>
        </div>
      )}

      {filteredData.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <h2 style={{ textAlign: 'center', margin: '30px 0 10px 0' }}>Detalle de licencias</h2>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ minWidth: 120 }}>
                  Mail
                  <div>
                    <input
                      type="text"
                      value={mailFilter}
                      onChange={handleMailFilter}
                      placeholder="Buscar mail..."
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                      }}
                    />
                  </div>
                </th>
                <th style={{ minWidth: 120 }}>
                  Nombre completo
                  <div>
                    <input
                      type="text"
                      value={nombreFilter}
                      onChange={handleNombreFilter}
                      placeholder="Buscar nombre..."
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                      }}
                    />
                  </div>
                </th>
                <th style={{ minWidth: 120 }}>
                  Empresa
                  <div>
                    <input
                      type="text"
                      value={empresaFilter}
                      onChange={handleEmpresaFilter}
                      placeholder="Buscar empresa..."
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                      }}
                    />
                  </div>
                </th>
                <th style={{ minWidth: 120 }}>
                  Licencia
                  <div>
                    <select
                      value={licenciaFilter}
                      onChange={handleLicenciaFilter}
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                      }}
                    >
                      <option value="">Todas</option>
                      {licenciasUnicas.map((lic, idx) => (
                        <option key={idx} value={lic}>{lic}</option>
                      ))}
                    </select>
                  </div>
                </th>
                <th style={{ minWidth: 120 }}>
                  Estado
                  <div>
                    <select
                      value={estadoFilter}
                      onChange={handleEstadoFilter}
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                      }}
                    >
                      <option value="">Todos</option>
                      <option value="Asignada">Asignada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <tr key={i}>
                  <td>{row.mail}</td>
                  <td>{row.nombre}</td>
                  <td>{row.empresa}</td>
                  <td>{row.licencia}</td>
                  <td>{row.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Pantalla3;

// final creación tabla licencias
