
import React from 'react';

function MenuScreen({ onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 80 }}>
      <h2 style={{ marginBottom: 32 }}>¿Qué acción deseas realizar?</h2>
      <button
        className="main-action-btn"
        style={{ marginBottom: 20, padding: '16px 32px', fontSize: 20, borderRadius: 8, background: '#23293a', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        onClick={() => onNavigate('pantalla1')}
      >Análisis Copilot</button>
      <button
        className="main-action-btn"
        style={{ marginBottom: 20, padding: '16px 32px', fontSize: 20, borderRadius: 8, background: '#2b5876', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        onClick={() => onNavigate('pantalla2')}
      >Análisis Github</button>
      <button
        className="main-action-btn"
        style={{ marginBottom: 20, padding: '16px 32px', fontSize: 20, borderRadius: 8, background: '#6a3093', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        onClick={() => onNavigate('pantalla3')}
      >Análisis Licencias</button>
    </div>
  );
}

export default MenuScreen;
