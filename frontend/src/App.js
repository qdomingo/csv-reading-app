

import React, { useState } from 'react';
import './App.css';
import MenuScreen from './screens/MenuScreen';
import Pantalla1 from './screens/Pantalla1';
import Pantalla2 from './screens/Pantalla2';
import Pantalla3 from './screens/Pantalla3';

function App() {
  const [pantalla, setPantalla] = useState('menu');

  const handleNavigate = (destino) => setPantalla(destino);
  const handleBackToMenu = () => setPantalla('menu');

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <div className="app-title">Análisis GitHub Copilot</div>
      {pantalla === 'menu' && <MenuScreen onNavigate={handleNavigate} />}
      {pantalla === 'pantalla1' && <Pantalla1 onBack={handleBackToMenu} />}
      {pantalla === 'pantalla2' && <Pantalla2 onBack={handleBackToMenu} />}
      {pantalla === 'pantalla3' && <Pantalla3 onBack={handleBackToMenu} />}
    </div>
  );
}

export default App;
