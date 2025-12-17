
import React from 'react';

function MenuScreen({ onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 80 }}>
      <h2 style={{ marginBottom: 32 }}>¿Qué acción deseas realizar?</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, maxWidth: 700 }}>
        <button
          className="main-action-btn"
          style={{ marginBottom: 20, padding: '16px 32px', fontSize: 20, borderRadius: 8, background: '#23293a', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', minWidth: 260 }}
          onClick={() => onNavigate('pantalla1')}
        >Análisis Copilot</button>
        <button
          className="main-action-btn"
          style={{ marginBottom: 20, padding: '16px 32px', fontSize: 20, borderRadius: 8, background: '#2b5876', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', minWidth: 260 }}
          onClick={() => onNavigate('pantalla2')}
        >Análisis Github</button>
        <button
          className="main-action-btn"
          style={{ marginBottom: 20, padding: '16px 32px', fontSize: 20, borderRadius: 8, background: '#6a3093', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', minWidth: 260 }}
          onClick={() => onNavigate('pantalla3')}
        >Análisis Licencias</button>
        <button
          className="main-action-btn"
          style={{ marginBottom: 20, padding: '16px 32px', fontSize: 20, borderRadius: 8, background: '#1e3c72', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', minWidth: 260 }}
          onClick={() => onNavigate('pantalla4')}
        >Estadísticas</button>
        <button
          className="main-action-btn"
          style={{ marginBottom: 20, padding: '16px 32px', fontSize: 20, borderRadius: 8, background: '#4e4376', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', minWidth: 260 }}
          onClick={() => onNavigate('pantalla5')}
        >Previsión de Cobros</button>
      </div>
    </div>
  );
}

export default MenuScreen;
