
import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../App.css';

function Pantalla5({ onBack }) {
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
  const [fechaAltaFilter, setFechaAltaFilter] = useState('');
  const [fechaBajaFilter, setFechaBajaFilter] = useState('');
  const [proyectoFilter, setProyectoFilter] = useState('');
  const [licenciasUnicas, setLicenciasUnicas] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('Diciembre-25');
  const debounceMail = useRef();
  const debounceNombre = useRef();
  const debounceEmpresa = useRef();
  const debounceFechaAlta = useRef();
  const debounceFechaBaja = useRef();
  const debounceProyecto = useRef();
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
      console.log('Datos recibidos del Excel:', rows.length, 'filas');
      console.log('Primera fila:', rows[0]);
      console.log('Columnas disponibles:', rows[0] ? Object.keys(rows[0]) : []);
      // Los datos ya vienen normalizados del backend
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

  // Función para parsear fecha en formato español (dd/mm/yyyy o variantes)
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // Convertir a string si no lo es
    const str = String(dateStr).trim();
    if (str === '') return null;
    
    // Si es solo un número (serial de Excel), convertirlo a fecha
    if (/^\d+$/.test(str)) {
      const excelSerial = parseInt(str, 10);
      // Validar que sea un número razonable (entre 1 y 100000 aproximadamente)
      // Excel serial 1 = 1/1/1900, 45981 = aprox 2025
      if (excelSerial >= 1 && excelSerial <= 100000) {
        // Convertir serial de Excel a fecha
        // Excel cuenta desde 1/1/1900, pero tiene un bug: considera 1900 como año bisiesto
        const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
        const date = new Date(excelEpoch.getTime() + excelSerial * 24 * 60 * 60 * 1000);
        return date;
      }
      return null; // Número fuera de rango razonable
    }
    
    // Formato dd/mm/yyyy o dd-mm-yyyy
    const match1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match1) {
      const [, day, month, year] = match1;
      return new Date(year, month - 1, day);
    }
    // Formato yyyy-mm-dd
    const match2 = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (match2) {
      const [, year, month, day] = match2;
      return new Date(year, month - 1, day);
    }
    // Intentar Date.parse como fallback
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Función para formatear fecha a formato español dd/mm/yyyy
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = parseDate(dateStr);
    if (!date) return dateStr; // Si no se puede parsear, devolver el valor original
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filtros reactivos
  const [filteredData, setFilteredData] = useState([]);
  React.useEffect(() => {
    let filtered = data;
    if (mailFilter) filtered = filtered.filter(row => String(row.mail || '').toLowerCase().includes(mailFilter.toLowerCase()));
    if (nombreFilter) filtered = filtered.filter(row => String(row.nombre || '').toLowerCase().includes(nombreFilter.toLowerCase()));
    if (empresaFilter) filtered = filtered.filter(row => String(row.empresa || '').toLowerCase().includes(empresaFilter.toLowerCase()));
    if (licenciaFilter) filtered = filtered.filter(row => String(row.licencia || '').toLowerCase().includes(licenciaFilter.toLowerCase()));
    if (estadoFilter) filtered = filtered.filter(row => String(row.estado || '').toLowerCase().includes(estadoFilter.toLowerCase()));
    
    // Filtro de fecha con comparadores
    if (fechaAltaFilter) {
      try {
        const trimmed = fechaAltaFilter.trim();
        // Detectar operador: >, <, >=, <=, = (o sin operador asume =)
        const operatorMatch = trimmed.match(/^(>=?|<=?|=)?\s*(.+)$/);
        if (operatorMatch) {
          const operator = operatorMatch[1] || '=';
          const dateStr = operatorMatch[2];
          
          // Validar que dateStr tenga formato mínimo antes de parsear
          if (dateStr && dateStr.length >= 8) { // Mínimo dd/mm/yy = 8 caracteres
            const targetDate = parseDate(dateStr);
            
            if (targetDate) {
              filtered = filtered.filter(row => {
                try {
                  const rowDate = parseDate(row.fechaAlta);
                  if (!rowDate) return false; // Excluir fechas nulas/inválidas durante filtrado
                  
                  switch(operator) {
                    case '>': return rowDate > targetDate;
                    case '>=': return rowDate >= targetDate;
                    case '<': return rowDate < targetDate;
                    case '<=': return rowDate <= targetDate;
                    case '=': 
                    default: 
                      // Comparar solo fecha sin hora
                      return rowDate.toDateString() === targetDate.toDateString();
                  }
                } catch (err) {
                  console.warn('Error parsing row date:', row.fechaAlta, err);
                  return false;
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('Error in date filter:', fechaAltaFilter, err);
      }
    }
    
    // Filtro de fecha de baja con comparadores
    if (fechaBajaFilter) {
      try {
        const trimmed = fechaBajaFilter.trim();
        const operatorMatch = trimmed.match(/^(>=?|<=?|=)?\s*(.+)$/);
        if (operatorMatch) {
          const operator = operatorMatch[1] || '=';
          const dateStr = operatorMatch[2];
          
          if (dateStr && dateStr.length >= 8) {
            const targetDate = parseDate(dateStr);
            
            if (targetDate) {
              filtered = filtered.filter(row => {
                try {
                  const rowDate = parseDate(row.fechaBaja);
                  if (!rowDate) return false;
                  
                  switch(operator) {
                    case '>': return rowDate > targetDate;
                    case '>=': return rowDate >= targetDate;
                    case '<': return rowDate < targetDate;
                    case '<=': return rowDate <= targetDate;
                    case '=': 
                    default: 
                      return rowDate.toDateString() === targetDate.toDateString();
                  }
                } catch (err) {
                  console.warn('Error parsing row date:', row.fechaBaja, err);
                  return false;
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('Error in date filter:', fechaBajaFilter, err);
      }
    }
    
    if (proyectoFilter) filtered = filtered.filter(row => String(row.proyecto || '').toLowerCase().includes(proyectoFilter.toLowerCase()));
    
    // Ordenar: fechas válidas primero (más recientes primero), luego nulos/inválidos al final
    filtered.sort((a, b) => {
      const dateA = parseDate(a.fechaAlta);
      const dateB = parseDate(b.fechaAlta);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB - dateA; // Más reciente primero
    });
    
    setFilteredData(filtered);
  }, [data, mailFilter, nombreFilter, empresaFilter, licenciaFilter, estadoFilter, fechaAltaFilter, fechaBajaFilter, proyectoFilter]);

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
  const handleFechaAltaFilter = e => {
    const value = e.target.value;
    setFechaAltaFilter(value);
    if (debounceFechaAlta.current) clearTimeout(debounceFechaAlta.current);
    debounceFechaAlta.current = setTimeout(() => {
      setFechaAltaFilter(value.trim());
    }, 500);
  };
  const handleFechaBajaFilter = e => {
    const value = e.target.value;
    setFechaBajaFilter(value);
    if (debounceFechaBaja.current) clearTimeout(debounceFechaBaja.current);
    debounceFechaBaja.current = setTimeout(() => {
      setFechaBajaFilter(value.trim());
    }, 500);
  };
  const handleProyectoFilter = e => {
    const value = e.target.value;
    setProyectoFilter(value);
    if (debounceProyecto.current) clearTimeout(debounceProyecto.current);
    debounceProyecto.current = setTimeout(() => {
      setProyectoFilter(value.trim());
    }, 500);
  };
  // Select directo para licencia y estado
  const handleLicenciaFilter = e => {
    setLicenciaFilter(e.target.value);
  };
  const handleEstadoFilter = e => {
    setEstadoFilter(e.target.value);
  };

  const limpiarFiltros = () => {
    setMailFilter('');
    setNombreFilter('');
    setEmpresaFilter('');
    setLicenciaFilter('');
    setEstadoFilter('');
    setFechaAltaFilter('');
    setFechaBajaFilter('');
    setProyectoFilter('');
    // Limpiar inputs de texto
    document.querySelectorAll('input[type="text"]').forEach(input => {
      input.value = '';
    });
    // Resetear selects
    document.querySelectorAll('select').forEach(select => {
      if (select.name !== 'monthSelector') {
        select.selectedIndex = 0;
      }
    });
  };

  // --- Tabla de resumen por empresa y tipo de licencia ---
  let tablaResumen = [];
  let totales = {
    githubSolo: 0,
    copilotBusiness: 0,
    copilotEnterprise: 0,
    total: 0
  };

  if (filteredData.length > 0) {
    // Convertir mes seleccionado a año y mes
    const mesMap = {
      'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5,
      'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
    };
    const [mesNombre, yearStr] = selectedMonth.split('-');
    const mesSeleccionadoNum = mesMap[mesNombre];
    const yearSeleccionado = 2000 + parseInt(yearStr);
    
    // Fecha de referencia: un mes después del mes actual (Enero 2026)
    const fechaReferencia = new Date(2026, 0, 1);
    
    const empresaLicencias = {};
    
    filteredData.forEach(row => {
      const empresa = (row.empresa || '').trim();
      const licencia = (row.licencia || '').trim().toLowerCase();
      const estado = (row.estado || '').trim().toLowerCase();
      const fechaAlta = parseDate(row.fechaAlta);
      
      // Si fechaBaja es vacía, null, undefined o "-", usar fecha de referencia (Enero 2026)
      let fechaBaja = fechaReferencia;
      if (row.fechaBaja && row.fechaBaja.toString().trim() !== '-') {
        const parsedFechaBaja = parseDate(row.fechaBaja);
        if (parsedFechaBaja) {
          fechaBaja = parsedFechaBaja;
        }
      }
      
      // Verificar si la licencia debe contabilizarse en el mes seleccionado
      // Se contabiliza si:
      // 1. La fecha de alta coincide con el mes seleccionado (mismo mes y año), O
      // 2. La fecha de baja coincide con el mes seleccionado (mismo mes y año), O
      // 3. El mes seleccionado está entre fecha de alta y fecha de baja
      if (empresa && fechaAlta) {
        const mesAlta = fechaAlta.getMonth();
        const yearAlta = fechaAlta.getFullYear();
        const mesBaja = fechaBaja.getMonth();
        const yearBaja = fechaBaja.getFullYear();
        
        const coincideAlta = (mesAlta === mesSeleccionadoNum && yearAlta === yearSeleccionado);
        const coincideBaja = (mesBaja === mesSeleccionadoNum && yearBaja === yearSeleccionado);
        const mesSeleccionadoDate = new Date(yearSeleccionado, mesSeleccionadoNum, 1);
        const entreRango = fechaAlta <= mesSeleccionadoDate && mesSeleccionadoDate <= fechaBaja;
        
        const activa = coincideAlta || coincideBaja || entreRango;
        
        if (activa) {
          if (!empresaLicencias[empresa]) {
            empresaLicencias[empresa] = {
              githubSolo: 0,
              copilotBusiness: 0,
              copilotEnterprise: 0,
              total: 0
            };
          }
          
          // Clasificar según tipo de licencia
          if (licencia.includes('github') && !licencia.includes('copilot')) {
            // Github (solo repositorios)
            empresaLicencias[empresa].githubSolo++;
          } else if (licencia.includes('copilot business') || licencia === 'copilot') {
            // Github + Copilot Business (incluye "copilot" sin especificar)
            empresaLicencias[empresa].copilotBusiness++;
          } else if (licencia.includes('copilot enterprise')) {
            // Github + Copilot Enterprise
            empresaLicencias[empresa].copilotEnterprise++;
          }
        }
      }
    });
    
    // Calcular totales por empresa y construir array
    tablaResumen = Object.entries(empresaLicencias).map(([empresa, counts]) => {
      const total = counts.githubSolo + counts.copilotBusiness + counts.copilotEnterprise;
      totales.githubSolo += counts.githubSolo;
      totales.copilotBusiness += counts.copilotBusiness;
      totales.copilotEnterprise += counts.copilotEnterprise;
      totales.total += total;
      
      return {
        empresa,
        githubSolo: counts.githubSolo,
        copilotBusiness: counts.copilotBusiness,
        copilotEnterprise: counts.copilotEnterprise,
        total
      };
    }).sort((a, b) => b.total - a.total); // Ordenar por total descendente
  }

  // Generar array de meses desde Enero 2024 hasta Diciembre 2025
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const opcionesMeses = [];
  for (let year = 2024; year <= 2025; year++) {
    meses.forEach(mes => {
      opcionesMeses.push(`${mes}-${String(year).slice(-2)}`);
    });
  }

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '18px 0 18px 0', fontWeight: 700, fontSize: 22, color: '#fff', textAlign: 'left' }}>
        Previsión de Cobros
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
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={limpiarFiltros} style={{ padding: '12px 28px', fontSize: 16, borderRadius: 8, background: '#2b5876', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            Limpiar Filtros
          </button>
          <button onClick={onBack} style={{ padding: '12px 28px', fontSize: 16, borderRadius: 8, background: '#23293a', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            Volver al menú
          </button>
        </div>
      </div>
      
      {/* Selector de mes */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ color: '#b2becd', fontWeight: 500 }}>Mes de previsión:</label>
        <select
          name="monthSelector"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            background: '#23293a',
            color: '#e0e6f3',
            border: '1px solid #2b5876',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: '1rem',
            outline: 'none',
            cursor: 'pointer',
            transition: 'border 0.2s'
          }}
        >
          {opcionesMeses.map((mes, idx) => (
            <option key={idx} value={mes}>{mes}</option>
          ))}
        </select>
      </div>
      
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      {data.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h2 style={{ textAlign: 'center', margin: '30px 0 20px 0', color: '#fff' }}>Resumen de Licencias por Empresa ({selectedMonth})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="dashboard-table" style={{ tableLayout: 'auto', minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Empresa</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>Github (solo repositorios)</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>Github + Copilot Business</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }}>Github + Copilot Enterprise</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 'bold' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {tablaResumen.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '12px 16px' }}>{row.empresa}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>{row.githubSolo}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>{row.copilotBusiness}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>{row.copilotEnterprise}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 'bold' }}>{row.total}</td>
                  </tr>
                ))}
                <tr style={{ background: '#2b5876', fontWeight: 'bold', borderTop: '2px solid #7ed6df' }}>
                  <td style={{ padding: '12px 16px' }}>TOTAL</td>
                  <td style={{ textAlign: 'center', padding: '12px 16px' }}>{totales.githubSolo}</td>
                  <td style={{ textAlign: 'center', padding: '12px 16px' }}>{totales.copilotBusiness}</td>
                  <td style={{ textAlign: 'center', padding: '12px 16px' }}>{totales.copilotEnterprise}</td>
                  <td style={{ textAlign: 'center', padding: '12px 16px' }}>{totales.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div>
          <h2 style={{ textAlign: 'center', margin: '30px 0 10px 0' }}>Detalle de licencias ({filteredData.length})</h2>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', fontSize: '0.8rem' }}>
            <table className="dashboard-table" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '150px', maxWidth: '150px', width: '150px', padding: '8px 4px', boxSizing: 'border-box' }}>
                  Mail
                  <div>
                    <input
                      type="text"
                      value={mailFilter}
                      onChange={handleMailFilter}
                      placeholder="Mail..."
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '4px 2px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </th>
                <th style={{ minWidth: '150px', maxWidth: '150px', width: '150px', padding: '8px 4px', boxSizing: 'border-box' }}>
                  Nombre completo
                  <div>
                    <input
                      type="text"
                      value={nombreFilter}
                      onChange={handleNombreFilter}
                      placeholder="Nombre..."
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '4px 6px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </th>
                <th style={{ minWidth: '130px', maxWidth: '130px', width: '130px', padding: '8px 4px', boxSizing: 'border-box' }}>
                  Empresa
                  <div>
                    <input
                      type="text"
                      value={empresaFilter}
                      onChange={handleEmpresaFilter}
                      placeholder="Empresa..."
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '4px 6px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </th>
                <th style={{ minWidth: '140px', maxWidth: '140px', width: '140px', padding: '8px 4px', boxSizing: 'border-box' }}>
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
                        padding: '4px 6px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Todas</option>
                      {licenciasUnicas.map((lic, idx) => (
                        <option key={idx} value={lic}>{lic}</option>
                      ))}
                    </select>
                  </div>
                </th>
                <th style={{ minWidth: '85px', maxWidth: '85px', width: '85px', padding: '8px 4px', boxSizing: 'border-box' }}>
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
                        padding: '4px 2px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Todos</option>
                      <option value="Asignada">Asignada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                </th>
                <th style={{ minWidth: '90px', maxWidth: '90px', width: '90px', padding: '8px 4px', boxSizing: 'border-box' }}>
                  Fecha alta
                  <div>
                    <input
                      type="text"
                      value={fechaAltaFilter}
                      onChange={handleFechaAltaFilter}
                      placeholder=">dd/mm/yy"
                      title="Ejemplos: >01/01/2024, <31/12/2023, >=15/06/2024, 01/01/2024"
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '4px 2px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </th>
                <th style={{ minWidth: '90px', maxWidth: '90px', width: '90px', padding: '8px 4px', boxSizing: 'border-box' }}>
                  Fecha baja
                  <div>
                    <input
                      type="text"
                      value={fechaBajaFilter}
                      onChange={handleFechaBajaFilter}
                      placeholder=">dd/mm/yy"
                      title="Ejemplos: >01/01/2024, <31/12/2023, >=15/06/2024, 01/01/2024"
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '4px 2px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </th>
                <th style={{ minWidth: '85px', maxWidth: '85px', width: '85px', padding: '8px 4px', boxSizing: 'border-box' }}>
                  Proyecto
                  <div>
                    <input
                      type="text"
                      value={proyectoFilter}
                      onChange={handleProyectoFilter}
                      placeholder="Proy..."
                      style={{
                        width: '100%',
                        marginTop: 6,
                        background: '#23293a',
                        color: '#e0e6f3',
                        border: '1px solid #2b5876',
                        borderRadius: 6,
                        padding: '4px 2px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        transition: 'border 0.2s',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <tr key={i}>
                  <td style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{row.mail}</td>
                  <td>{row.nombre}</td>
                  <td>{row.empresa}</td>
                  <td>{row.licencia}</td>
                  <td>{row.estado}</td>
                  <td>{formatDate(row.fechaAlta)}</td>
                  <td>{formatDate(row.fechaBaja)}</td>
                  <td>{row.proyecto}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pantalla5;
