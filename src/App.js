
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScrollToTopButton from './components/ScrollToTopButton';


function App() {
  const [activeSection, setActiveSection] = useState('sistem-ayarları');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Scroll mekaniği
  // Custom ease-out animasyonu olacak şekilde güncellendi
  const handleNavigate = (id) => {
    setActiveSection(id);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const targetY = el.getBoundingClientRect().top + window.scrollY - 24; 
        const startY = window.scrollY;
        const distance = targetY - startY;
        const duration = 600;
        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
        let startTime = null;
        function animateScroll(timestamp) {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeOutCubic(progress);
          window.scrollTo(0, startY + distance * eased);
          if (progress < 1) {
            window.requestAnimationFrame(animateScroll);
          }
        }
        window.requestAnimationFrame(animateScroll);
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
        <ScrollToTopButton />
      </main>
    </div>
  );
}

export default App;