import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function Pantalla4({ onBack }) {
  // Estado para cada archivo y cargado
  const [copilotFile, setCopilotFile] = useState(null);
  const [copilotLoaded, setCopilotLoaded] = useState(false);
  const [copilotData, setCopilotData] = useState([]);
  const [githubFile, setGithubFile] = useState(null);
  const [githubLoaded, setGithubLoaded] = useState(false);
  const [githubData, setGithubData] = useState([]);
  const [licenciasFile, setLicenciasFile] = useState(null);
  const [licenciasLoaded, setLicenciasLoaded] = useState(false);
  const [licenciasData, setLicenciasData] = useState([]);
  const [numLicenciasAdquiridas, setNumLicenciasAdquiridas] = useState('');
  
  // Filtros para la tabla de usuarios agregados
  const [githubFilter, setGithubFilter] = useState('');
  const [copilotFilter, setCopilotFilter] = useState('');
  const [licenciasFilter, setLicenciasFilter] = useState('');
  const [tipoLicenciaFilter, setTipoLicenciaFilter] = useState('');
  const [usuarioSearch, setUsuarioSearch] = useState('');

  // Handlers para seleccionar archivo
  const handleCopilotChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCopilotFile(e.target.files[0]);
      setCopilotLoaded(true);
      // Leer CSV Copilot con papaparse
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCopilotData(results.data);
        },
        error: () => setCopilotData([])
      });
    } else {
      setCopilotFile(null);
      setCopilotLoaded(false);
      setCopilotData([]);
    }
  };
  const handleGithubChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setGithubFile(e.target.files[0]);
      setGithubLoaded(true);
      // Leer CSV Github con papaparse
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setGithubData(results.data);
        },
        error: () => setGithubData([])
      });
    } else {
      setGithubFile(null);
      setGithubLoaded(false);
      setGithubData([]);
    }
  };
  const handleLicenciasChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLicenciasFile(e.target.files[0]);
      setLicenciasLoaded(true);
      // Leer Excel de licencias (hoja O-Licencias) con xlsx
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          // Leer la hoja "O-Licencias"
          const sheetName = 'O-Licencias';
          if (workbook.SheetNames.includes(sheetName)) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            setLicenciasData(jsonData);
            console.log('Hoja O-Licencias leída correctamente:', jsonData.length, 'registros');
          } else {
            console.warn('Hoja O-Licencias no encontrada. Hojas disponibles:', workbook.SheetNames);
            setLicenciasData([]);
          }
        } catch (error) {
          console.error('Error al leer Excel:', error);
          setLicenciasData([]);
        }
      };
      reader.readAsBinaryString(e.target.files[0]);
    } else {
      setLicenciasFile(null);
      setLicenciasLoaded(false);
      setLicenciasData([]);
    }
  };

  // Lógica para tabla resumen
  // Nº de Licencias Adquiridas: input
  // Nº de Licencias Copilot consumidas: total de login únicos en copilotData
  // Nº de Licencias Github consumidas: total con role (member/owner) menos los 'Suspended member'
  const copilotConsumidas = copilotData.length;
  let githubConsumidas = 0;
  if (githubData.length > 0) {
    // Debug: mostrar valores únicos de role y contar los 'Suspended member' exactos
    const allRoles = githubData.map(row => (row.role || row.Role || '').trim()).filter(Boolean);
    const uniqueRoles = Array.from(new Set(allRoles.map(r => r.toLowerCase())));
    const suspendedCount = allRoles.filter(r => r.replace(/\s+/g, '').toLowerCase() === 'suspendedmember').length;
    console.log('Roles únicos:', uniqueRoles);
    console.log('Total roles:', allRoles.length, 'Suspended member detectados:', suspendedCount);
    // Contar todas las filas con role definido, excluyendo 'Suspended member'
    githubConsumidas = allRoles.filter(role => role.replace(/\s+/g, '').toLowerCase() !== 'suspendedmember').length;
  }

  // --- Tabla de Usuarios Agregados ---
  // Obtener logins de github excluyendo suspended member
  let githubLogins = [];
  if (githubLoaded && githubData.length > 0) {
    githubLogins = githubData.filter(row => {
      const role = (row.role || row.Role || '').trim();
      if (!role) return false;
      return role.replace(/\s+/g, '').toLowerCase() !== 'suspendedmember';
    }).map(row => (row.login || row.Login || '').trim()).filter(Boolean);
  }
  // Obtener logins de copilot
  let copilotLogins = [];
  if (copilotLoaded && copilotData.length > 0) {
    copilotLogins = copilotData.map(row => (row.login || row.Login || '').trim()).filter(Boolean);
  }
  // Obtener login_licencias de Excel (solo estado=asignada, convertir mail a usuario_indra)
  let loginLicencias = [];
  if (licenciasLoaded && licenciasData.length > 0) {
    console.log('Total registros en licenciasData:', licenciasData.length);
    console.log('Primeras 5 filas licenciasData:', licenciasData.slice(0, 5));
    const filtradas = licenciasData.filter(row => {
      const estado = (row.Estado || row.estado || row.ESTADO || '').trim().toLowerCase();
      return estado === 'asignada';
    });
    console.log('Registros con estado "asignada":', filtradas.length);
    console.log('Primeras 5 con estado asignada:', filtradas.slice(0, 5));
    loginLicencias = filtradas.map(row => {
      const mail = (row.Mail || row.mail || row.MAIL || '').trim();
      if (!mail) return '';
      const usuario = mail.split('@')[0];
      return usuario ? `${usuario}_indra` : '';
    }).filter(Boolean);
    console.log('login_licencias generados:', loginLicencias.length);
    console.log('Primeros 10 login_licencias:', loginLicencias.slice(0, 10));
  }
  // Crear mapa de usuario a tipo de licencia, mail y empresa
  const usuarioToLicencia = new Map();
  const usuarioToMail = new Map();
  const usuarioToEmpresa = new Map();
  if (licenciasLoaded && licenciasData.length > 0) {
    licenciasData.forEach(row => {
      const estado = (row.Estado || row.estado || row.ESTADO || '').trim().toLowerCase();
      if (estado === 'asignada') {
        const mail = (row.Mail || row.mail || row.MAIL || '').trim();
        const licencia = (row.Licencia || row.licencia || row.LICENCIA || '').trim();
        const empresa = (row.Empresa || row.empresa || row.EMPRESA || '').trim();
        if (mail) {
          const usuario = mail.split('@')[0];
          const loginFormateado = usuario ? `${usuario}_indra` : '';
          if (loginFormateado) {
            if (licencia) {
              usuarioToLicencia.set(loginFormateado, licencia);
            }
            usuarioToMail.set(loginFormateado, mail);
            if (empresa) {
              usuarioToEmpresa.set(loginFormateado, empresa);
            }
          }
        }
      }
    });
  }

  // Unir y eliminar duplicados
  const usuariosAgregados = Array.from(new Set([...githubLogins, ...copilotLogins, ...loginLicencias]));

  // Construir filas para la tabla compleja
  const tablaUsuarios = usuariosAgregados.map(login => ({
    usuario: login,
    github: githubLogins.includes(login) ? 'YES' : 'NO',
    copilot: copilotLogins.includes(login) ? 'YES' : 'NO',
    licencias: loginLicencias.includes(login) ? 'YES' : 'NO',
    tipoLicencia: usuarioToLicencia.get(login) || '',
    mail: usuarioToMail.get(login) || '',
    empresa: usuarioToEmpresa.get(login) || '',
  }));

  // Filtrar tabla según los filtros seleccionados
  let tablaUsuariosFiltrada = [];
  if (githubLoaded && copilotLoaded) {
    tablaUsuariosFiltrada = tablaUsuarios.filter(row => {
      const githubOk = githubFilter ? row.github === githubFilter : true;
      const copilotOk = copilotFilter ? row.copilot === copilotFilter : true;
      const licenciasOk = licenciasFilter ? row.licencias === licenciasFilter : true;
      const tipoLicenciaOk = tipoLicenciaFilter ? row.tipoLicencia.toLowerCase().includes(tipoLicenciaFilter.toLowerCase()) : true;
      const usuarioOk = usuarioSearch ? row.usuario.toLowerCase().includes(usuarioSearch.toLowerCase()) : true;
      return githubOk && copilotOk && licenciasOk && tipoLicenciaOk && usuarioOk;
    });
  }

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '18px 0 18px 0', fontWeight: 700, fontSize: 22, color: '#fff', textAlign: 'left' }}>
        Estadísticas
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
        <button onClick={onBack} style={{ padding: '12px 28px', fontSize: 16, borderRadius: 8, background: '#23293a', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
          Volver al menú
        </button>
      </div>
      <div style={{ background: '#23293a', borderRadius: 12, padding: 24, marginTop: 24, color: '#fff', maxWidth: 700 }}>
        {/* Cargadores de archivos */}
        <form className="file-upload-form" style={{ marginBottom: 24 }}>
          <label className="file-upload-label">
            Seleccionar CSV Copilot
            <input
              className="file-upload-input"
              type="file"
              accept=".csv"
              onChange={handleCopilotChange}
            />
          </label>
          {copilotFile && <span style={{ color: '#7ed6df', fontWeight: 500 }}>{copilotFile.name}</span>}
          {copilotLoaded && <span style={{ color: '#4caf50', marginLeft: 8, fontSize: 20 }}>✔</span>}
        </form>
        <form className="file-upload-form" style={{ marginBottom: 24 }}>
          <label className="file-upload-label">
            Seleccionar CSV Github
            <input
              className="file-upload-input"
              type="file"
              accept=".csv"
              onChange={handleGithubChange}
            />
          </label>
          {githubFile && <span style={{ color: '#7ed6df', fontWeight: 500 }}>{githubFile.name}</span>}
          {githubLoaded && <span style={{ color: '#4caf50', marginLeft: 8, fontSize: 20 }}>✔</span>}
        </form>
        <form className="file-upload-form" style={{ marginBottom: 24 }}>
          <label className="file-upload-label">
            Seleccionar Excel Licencias
            <input
              className="file-upload-input"
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleLicenciasChange}
            />
          </label>
          {licenciasFile && <span style={{ color: '#7ed6df', fontWeight: 500 }}>{licenciasFile.name}</span>}
          {licenciasLoaded && <span style={{ color: '#4caf50', marginLeft: 8, fontSize: 20 }}>✔</span>}
        </form>

        {/* Input numérico de licencias adquiridas */}
        <div className="file-upload-form" style={{ marginBottom: 24 }}>
          <label className="file-upload-label" style={{ minWidth: 220 }}>
            Nº de Licencias Adquiridas
            <input
              type="number"
              min="0"
              value={numLicenciasAdquiridas}
              onChange={e => setNumLicenciasAdquiridas(e.target.value)}
              style={{
                marginLeft: 16,
                background: '#23293a',
                color: '#e0e6f3',
                border: '1px solid #2b5876',
                borderRadius: 6,
                padding: '7px 12px',
                fontSize: '1rem',
                outline: 'none',
                width: 120,
                MozAppearance: 'textfield',
                appearance: 'textfield',
              }}
              onWheel={e => e.target.blur()}
            />
          </label>
        </div>
        <style>{`
          /* Ocultar flechas en input number para Chrome, Safari, Edge */
          input[type=number]::-webkit-inner-spin-button, 
          input[type=number]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          /* Ocultar flechas en Firefox */
          input[type=number] {
            -moz-appearance: textfield;
          }
        `}</style>

        {/* Tabla resumen */}
        <div style={{ marginTop: 24 }}>
          <table className="dashboard-table" style={{ minWidth: 420, background: '#23293a' }}>
            <thead>
              <tr>
                <th style={{ width: 220 }}>Concepto</th>
                <th style={{ width: 120 }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Nº de Licencias Adquiridas</td>
                <td>{numLicenciasAdquiridas || '-'}</td>
              </tr>
              <tr>
                <td>Nº de Licencias Github consumidas</td>
                <td>{githubLoaded ? githubConsumidas : '-'}</td>
              </tr>
              <tr>
                <td>Nº de Licencias Copilot consumidas</td>
                <td>{copilotLoaded ? copilotConsumidas : '-'}</td>
              </tr>
              <tr>
                <td>Stock GitHub</td>
                <td style={{
                  fontWeight: 'bold',
                  color: numLicenciasAdquiridas && githubLoaded && (Number(numLicenciasAdquiridas) - githubConsumidas) > 0 ? '#4caf50' : '#ff6b6b'
                }}>{
                  numLicenciasAdquiridas && githubLoaded
                    ? Number(numLicenciasAdquiridas) - githubConsumidas
                    : '-'
                }</td>
              </tr>
              <tr>
                <td>Stock Copilot</td>
                <td style={{
                  fontWeight: 'bold',
                  color: numLicenciasAdquiridas && copilotLoaded && (Number(numLicenciasAdquiridas) - copilotConsumidas) > 0 ? '#4caf50' : '#ff6b6b'
                }}>{
                  numLicenciasAdquiridas && copilotLoaded
                    ? Number(numLicenciasAdquiridas) - copilotConsumidas
                    : '-'
                }</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabla Resumen de Combinaciones */}
        {githubLoaded && copilotLoaded && tablaUsuarios.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ color: '#fff', marginBottom: 12 }}>Resumen de Combinaciones</h3>
            <table className="dashboard-table" style={{ minWidth: 600, background: '#23293a', marginBottom: 40 }}>
              <thead>
                <tr>
                  <th style={{ width: 340 }}>Descripción</th>
                  <th style={{ width: 80 }}>Github</th>
                  <th style={{ width: 80 }}>Copilot</th>
                  <th style={{ width: 120 }}>Licencias Excel</th>
                  <th style={{ width: 80 }}>Cuenta</th>
                  <th style={{ width: 80 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Github, Copilot y Excel</td>
                  <td>YES</td>
                  <td>YES</td>
                  <td>YES</td>
                  <td>{tablaUsuarios.filter(r => r.github === 'YES' && r.copilot === 'YES' && r.licencias === 'YES').length}</td>
                  <td style={{ color: '#4caf50', fontWeight: 600 }}>OK</td>
                </tr>
                <tr>
                  <td>Github Copilot pero NO Excel</td>
                  <td>YES</td>
                  <td>YES</td>
                  <td>NO</td>
                  <td>{tablaUsuarios.filter(r => r.github === 'YES' && r.copilot === 'YES' && r.licencias === 'NO').length}</td>
                  <td style={{ color: '#ff4444', fontWeight: 600 }}>KO</td>
                </tr>
                <tr>
                  <td>Github Solo Repositorios, NO Excel</td>
                  <td>YES</td>
                  <td>NO</td>
                  <td>NO</td>
                  <td>{tablaUsuarios.filter(r => r.github === 'YES' && r.copilot === 'NO' && r.licencias === 'NO').length}</td>
                  <td style={{ color: '#ff4444', fontWeight: 600 }}>KO</td>
                </tr>
                <tr>
                  <td>Github Solo Repositorios y Excel</td>
                  <td>YES</td>
                  <td>NO</td>
                  <td>YES</td>
                  <td>{tablaUsuarios.filter(r => r.github === 'YES' && r.copilot === 'NO' && r.licencias === 'YES').length}</td>
                  <td style={{ color: '#4caf50', fontWeight: 600 }}>OK</td>
                </tr>
                <tr>
                  <td>No Github, pero sí Copilot y Excel</td>
                  <td>NO</td>
                  <td>YES</td>
                  <td>YES</td>
                  <td>{tablaUsuarios.filter(r => r.github === 'NO' && r.copilot === 'YES' && r.licencias === 'YES').length}</td>
                  <td style={{ color: '#ff4444', fontWeight: 600 }}>KO</td>
                </tr>
                <tr>
                  <td>No Github ni Copilot, pero sí Excel</td>
                  <td>NO</td>
                  <td>NO</td>
                  <td>YES</td>
                  <td>{tablaUsuarios.filter(r => r.github === 'NO' && r.copilot === 'NO' && r.licencias === 'YES').length}</td>
                  <td style={{ color: '#ff4444', fontWeight: 600 }}>KO</td>
                </tr>
                <tr>
                  <td>No Github, sí Copilot y No Excel</td>
                  <td>NO</td>
                  <td>YES</td>
                  <td>NO</td>
                  <td>{tablaUsuarios.filter(r => r.github === 'NO' && r.copilot === 'YES' && r.licencias === 'NO').length}</td>
                  <td style={{ color: '#ff4444', fontWeight: 600 }}>KO</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tabla de Usuarios Agregados */}
        {githubLoaded && copilotLoaded && tablaUsuarios.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: '#fff', margin: 0 }}>Usuarios Agregados ({tablaUsuariosFiltrada.length})</h3>
              <button
                onClick={() => {
                  const ws = XLSX.utils.json_to_sheet(tablaUsuariosFiltrada);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios Agregados');
                  XLSX.writeFile(wb, `usuarios_agregados_${new Date().toISOString().split('T')[0]}.xlsx`);
                }}
                className="upload-btn"
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                Exportar a Excel
              </button>
            </div>
            <div style={{ maxHeight: '500px', overflowY: 'auto', borderRadius: 12, fontSize: '0.85rem' }}>
              <table className="dashboard-table" style={{ minWidth: 420, background: '#23293a' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#23293a', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: 200, fontSize: '0.85rem' }}>
                      Usuario Agregado
                      <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={usuarioSearch}
                        onChange={e => setUsuarioSearch(e.target.value)}
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                    <th style={{ width: 100, fontSize: '0.85rem' }}>
                      GitHub
                      <select
                        value={githubFilter}
                        onChange={e => setGithubFilter(e.target.value)}
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="">Todos</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </th>
                    <th style={{ width: 100, fontSize: '0.85rem' }}>
                      Copilot
                      <select
                        value={copilotFilter}
                        onChange={e => setCopilotFilter(e.target.value)}
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="">Todos</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </th>
                    <th style={{ width: 100, fontSize: '0.85rem' }}>
                      Licencias
                      <select
                        value={licenciasFilter}
                        onChange={e => setLicenciasFilter(e.target.value)}
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="">Todos</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    </th>
                    <th style={{ width: 150, fontSize: '0.85rem' }}>
                      Tipo Licencia
                      <input
                        type="text"
                        placeholder="Buscar licencia..."
                        value={tipoLicenciaFilter}
                        onChange={e => setTipoLicenciaFilter(e.target.value)}
                        style={{ display: 'block', marginTop: 8, background: '#23293a', color: '#e0e6f3', border: '1px solid #2b5876', borderRadius: 6, padding: '5px 8px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tablaUsuariosFiltrada.map((row, idx) => (
                    <tr key={row.usuario + idx}>
                      <td>{row.usuario}</td>
                      <td>{row.github}</td>
                      <td>{row.copilot}</td>
                      <td>{row.licencias}</td>
                      <td>{row.tipoLicencia}</td>
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

export default Pantalla4;
