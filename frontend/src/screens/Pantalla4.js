import React, { useState } from 'react';
import Papa from 'papaparse';

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
  const [numLicenciasAdquiridas, setNumLicenciasAdquiridas] = useState('');

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
    } else {
      setLicenciasFile(null);
      setLicenciasLoaded(false);
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
                <td>{
                  numLicenciasAdquiridas && githubLoaded
                    ? Math.max(Number(numLicenciasAdquiridas) - githubConsumidas, 0)
                    : '-'
                }</td>
              </tr>
              <tr>
                <td>Stock Copilot</td>
                <td>{
                  numLicenciasAdquiridas && copilotLoaded
                    ? Math.max(Number(numLicenciasAdquiridas) - copilotConsumidas, 0)
                    : '-'
                }</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Pantalla4;
