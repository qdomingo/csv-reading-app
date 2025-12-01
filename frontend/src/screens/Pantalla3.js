import React from 'react';


function Pantalla3({ onBack }) {
  return (
    <div style={{ padding: 40 }}>
      <h2 style={{ textAlign: 'center', marginTop: 60 }}>Análisis Licencias</h2>
      <button onClick={onBack} style={{ marginTop: 40, padding: '12px 28px', fontSize: 18, borderRadius: 8, background: '#23293a', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
        Volver al menú
      </button>
    </div>
  );
}

export default Pantalla3;
