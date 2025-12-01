
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../App.css';

function Pantalla2({ onBack }) {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loginSearch, setLoginSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const debounceLogin = useRef();
  const debounceName = useRef();

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
      // Nos quedamos con login, name y role
      rows = rows.map(row => ({
        login: row.login || row.Login || row.LOGIN || '',
        name: row.name || row.Name || row.NAME || '',
        role: row.role || row.Role || row.ROLE || '',
      }));
      setData(rows);
    } catch (err) {
      setError('Error al subir o procesar el archivo.');
    } finally {
      setLoading(false);
    }
  };

  // Filtros reactivos para login, name y role
  const [filteredData, setFilteredData] = useState([]);
  React.useEffect(() => {
    let filtered = data;
    if (loginSearch) {
      filtered = filtered.filter(row => (row.login || '').toLowerCase().includes(loginSearch.toLowerCase()));
    }
    if (nameSearch) {
      filtered = filtered.filter(row => (row.name || '').toLowerCase().includes(nameSearch.toLowerCase()));
    }
    if (roleFilter) {
      filtered = filtered.filter(row => (row.role || '').toLowerCase() === roleFilter.toLowerCase());
    }
    setFilteredData(filtered);
  }, [data, loginSearch, nameSearch, roleFilter]);

  // Handlers para los filtros con debounce
  const handleLoginSearch = e => {
    const value = e.target.value;
    setLoginSearch(value);
    if (debounceLogin.current) clearTimeout(debounceLogin.current);
    debounceLogin.current = setTimeout(() => {
      setLoginSearch(value.trim());
    }, 500);
  };
  const handleNameSearch = e => {
    const value = e.target.value;
    setNameSearch(value);
    if (debounceName.current) clearTimeout(debounceName.current);
    debounceName.current = setTimeout(() => {
      setNameSearch(value.trim());
    }, 500);
  };


  // Pie chart de roles (usando los valores originales del CSV)
  const pieRoleData = React.useMemo(() => {
    const roleMap = {};
    filteredData.forEach(row => {
      const role = (row.role || '').trim();
      if (!role) return;
      roleMap[role] = (roleMap[role] || 0) + 1;
    });
    return Object.entries(roleMap).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Colores para los roles (hasta 6 distintos)
  const pieColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#d0ed57'];



  // Obtener los roles únicos para el filtro
  const uniqueRoles = React.useMemo(() => {
    const setRoles = new Set();
    data.forEach(row => {
      if (row.role && row.role.trim()) setRoles.add(row.role.trim());
    });
    return Array.from(setRoles);
  }, [data]);

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '18px 0 18px 0', fontWeight: 700, fontSize: 22, color: '#fff', textAlign: 'left' }}>
        Análisis de Usuarios de Github
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
        <form className="file-upload-form" onSubmit={handleUpload} style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
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
            <h2 style={{ textAlign: 'center' }}>Distribución por Role</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieRoleData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ cx, cy, midAngle, outerRadius, percent, index }) => {
                    const RADIAN = Math.PI / 180;
                    const value = pieRoleData[index]?.value || 0;
                    const label = `${value} (${(percent * 100).toFixed(1)}%)`;
                    const radius = outerRadius + 24;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="#fff" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={15} fontWeight={700}>
                        {label}
                      </text>
                    );
                  }}
                >
                  {pieRoleData.map((entry, idx) => (
                    <Cell key={`cell-role-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
              Total: {filteredData.length}
            </div>
          </div>
        </div>
      )}

      {/* Tabla filtrada */}
      {filteredData.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <h2 style={{ textAlign: 'center', margin: '30px 0 10px 0' }}>Detalle de usuarios</h2>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ minWidth: 120 }}>
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
                <th style={{ minWidth: 120 }}>
                  name
                  <div>
                    <input
                      type="text"
                      value={nameSearch}
                      onChange={handleNameSearch}
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
                  role
                  <div>
                    <select
                      value={roleFilter}
                      onChange={e => setRoleFilter(e.target.value)}
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
                      {uniqueRoles.map(opt => (
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
                  <td>{row.login}</td>
                  <td>{row.name}</td>
                  <td>{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Pantalla2;
