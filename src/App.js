
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  const [activeSection, setActiveSection] = useState('sistem-ayarları');

  // Scroll mekaniği
  const handleNavigate = (id) => {
    setActiveSection(id);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <div className="flex">
      <Sidebar onNavigate={handleNavigate} activeId={activeSection} />
      <main className="flex-1 ml-64 bg-gray-50 min-h-screen">
        <Dashboard activeSection={activeSection} />
      </main>
    </div>
  );
}

export default App;