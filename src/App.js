
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import './App.css';


function App() {
  const [activeSection, setActiveSection] = useState('sistem-ayarları');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {/* hamburger hep görüncek*/}
      <button
        className="fixed top-4 left-4 z-40 bg-white border rounded-md shadow p-2 flex flex-col items-center justify-center"
        aria-label="Menüyü Aç/Kapat"
        onClick={() => setSidebarOpen((v) => !v)}
      >
        <span className="block w-6 h-0.5 bg-gray-700 mb-1 rounded"></span>
        <span className="block w-6 h-0.5 bg-gray-700 mb-1 rounded"></span>
        <span className="block w-6 h-0.5 bg-gray-700 rounded"></span>
      </button>
      <Sidebar
        onNavigate={handleNavigate}
        activeId={activeSection}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/*sidebar varken karartma yapılıyor*/}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-label="Menüyü Kapat"
        />
      )}
      <main className="flex-1 bg-gray-50 min-h-screen">
        <Dashboard activeSection={activeSection} />
      </main>
    </div>
  );
}

export default App;