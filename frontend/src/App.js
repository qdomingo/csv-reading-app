
import React, { useState, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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


function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [filename, setFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ideFilter, setIdeFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [loginSearch, setLoginSearch] = useState('');
  const [loginFilter, setLoginFilter] = useState('');
  const debounceRef = useRef();
  // Buscador reactivo para login
  const handleLoginSearch = (e) => {
    const value = e.target.value;
    setLoginSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoginFilter(value.trim());
    }, 1000);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Selecciona un archivo');
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
      setFilename(uploadRes.data.filename);
      // Leer datos, enviando el nombre original como query param
      const readRes = await axios.get(`/api/read/${uploadRes.data.filename}?originalname=${encodeURIComponent(uploadRes.data.originalname)}`);
      setData(readRes.data.data);
      setColumns(readRes.data.data.length > 0 ? Object.keys(readRes.data.data[0]) : []);
    } catch (err) {
      setError('Error al subir o leer el archivo');
    }
    setLoading(false);
  };


  // --- Gráfica de IDEs usados (last surface used) ---
  let pieIdeData = [];
  let ideOptions = [];
  if (data.length > 0) {
    // Agrupar IDEs por nombre base (sin versión), y todos los JetBrains como 'jetbrains'
    const getIdeBase = (ide) => {
      if (!ide) return 'Desconocido';
      const parts = ide.split('/');
      let base = parts[0].toLowerCase();
      if (base.startsWith('jetbrains')) return 'jetbrains';
      return base;
    };
    const ideCount = {};
    data.forEach(row => {
      const ideRaw = row['last surface used'] || 'Desconocido';
      const ide = getIdeBase(ideRaw);
      ideCount[ide] = (ideCount[ide] || 0) + 1;
    });
    const sorted = Object.entries(ideCount).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);
    const otros = sorted.slice(3);
    let otrosCount = 0;
    otros.forEach(([k, v]) => { otrosCount += v; });
    pieIdeData = top3.map(([name, value]) => ({ name, value }));
    if (otrosCount > 0) pieIdeData.push({ name: 'Varios', value: otrosCount });
    ideOptions = sorted.map(([name]) => name);
  }

  // --- Gráfica de actividad (last activity at) ---
  let pieActivityData = [];
  if (data.length > 0) {
    const now = new Date();
    let day = 0, week = 0, month = 0, year = 0, never = 0;
    data.forEach(row => {
      const val = row['last activity at'];
      if (!val || val.trim() === '' || val.toLowerCase() === 'never') {
        never++;
        return;
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) { never++; return; }
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      if (diff <= 1) day++;
      else if (diff <= 7) week++;
      else if (diff <= 31) month++;
      else if (diff <= 366) year++;
      else never++;
    });
    pieActivityData = [
      { name: 'Último día', value: day },
      { name: 'Última semana', value: week },
      { name: 'Último mes', value: month },
      { name: 'Último año', value: year },
      { name: 'Nunca', value: never },
    ];
  }

  // --- Filtros y tabla ---
  const getIdeBase = (ide) => {
    if (!ide) return 'Desconocido';
    const parts = ide.split('/');
    return parts[0].toLowerCase();
  };
  const filteredData = data.filter(row => {
    let ideOk = true, actOk = true, loginOk = true;
    if (ideFilter) ideOk = getIdeBase(row['last surface used']) === ideFilter;
    if (activityFilter) {
      const now = new Date();
      const val = row['last activity at'];
      if (!val || val.trim() === '' || val.toLowerCase() === 'never') {
        actOk = activityFilter === 'Nunca';
      } else {
        const d = new Date(val);
        if (isNaN(d.getTime())) actOk = activityFilter === 'Nunca';
        else {
          const diff = (now - d) / (1000 * 60 * 60 * 24);
          if (diff <= 1) actOk = activityFilter === 'Último día';
          else if (diff <= 7) actOk = activityFilter === 'Última semana';
          else if (diff <= 31) actOk = activityFilter === 'Último mes';
          else if (diff <= 366) actOk = activityFilter === 'Último año';
          else actOk = activityFilter === 'Nunca';
        }
      }
    }
    if (loginFilter) loginOk = (row['login'] || '').toLowerCase().includes(loginFilter.toLowerCase());
    return ideOk && actOk && loginOk;
  });

  const pieColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#d0ed57'];


  // Calcular totales para las gráficas
  const totalIde = pieIdeData.reduce((acc, cur) => acc + cur.value, 0);
  const totalActivity = pieActivityData.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <div className="app-title">Análisis Uso Copilot</div>
      <form className="file-upload-form" onSubmit={handleUpload}>
        <label className="file-upload-label">
          Seleccionar archivo CSV/Excel
          <input
            className="file-upload-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
          />
        </label>
        <button className="upload-btn" type="submit" disabled={loading}>
          {loading ? 'Cargando...' : 'Subir y mostrar'}
        </button>
        {file && <span style={{ color: '#7ed6df', fontWeight: 500 }}>{file.name}</span>}
      </form>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      {data.length > 0 && (
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 30 }}>
          <div style={{ flex: 1, minWidth: 320, height: 370 }}>
            <h2 style={{ textAlign: 'center' }}>Distribución de IDEs usados</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieIdeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderCustomLabel(pieIdeData, totalIde)}
                >
                  {pieIdeData.map((entry, idx) => (
                    <Cell key={`cell-ide-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
              Total: {totalIde}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 320, height: 370 }}>
            <h2 style={{ textAlign: 'center' }}>Actividad de usuarios por periodo</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieActivityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderCustomLabel(pieActivityData, totalActivity)}
                >
                  {pieActivityData.map((entry, idx) => (
                    <Cell key={`cell-act-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
              Total: {totalActivity}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}


      {/* Tabla filtrada */}
      {data.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <h2 style={{ textAlign: 'center', margin: '30px 0 10px 0' }}>Detalle de usuarios y actividad</h2>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>
                  login
                  <div>
                    <input
                      type="text"
                      value={loginSearch}
                      onChange={handleLoginSearch}
                      placeholder="Buscar login..."
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
                <th>
                  last authenticated at
                </th>
                <th>
                  last activity at
                  <div>
                    <select
                      value={activityFilter}
                      onChange={e => setActivityFilter(e.target.value)}
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
                      <option value="Último día">Último día</option>
                      <option value="Última semana">Última semana</option>
                      <option value="Último mes">Último mes</option>
                      <option value="Último año">Último año</option>
                      <option value="Nunca">Nunca</option>
                    </select>
                  </div>
                </th>
                <th>
                  last surface used
                  <div>
                    <select
                      value={ideFilter}
                      onChange={e => setIdeFilter(e.target.value)}
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
                      {ideOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <tr key={i}>
                  <td>{row['login']}</td>
                  <td>{row['last authenticated at']}</td>
                  <td>{row['last activity at']}</td>
                  <td>{row['last surface used']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
