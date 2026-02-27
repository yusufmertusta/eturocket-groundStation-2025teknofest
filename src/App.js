
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScrollToTopButton from './components/ScrollToTopButton';


function App() {

  const [activeSection, setActiveSection] = useState('sistem-ayarları');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAutoScrolling = useRef(false);

  // Section IDs in order (should match Sidebar and Dashboard)
  const sectionIds = [
    'sistem-ayarları',
    'telemetri-verileri',
    'gps-konum-haritasi',
    'parasut-durum-ozeti',
    'veri-kaynak-durumu',
    '3d-modeller',
    'roket-3d-modeli',
    'payload-3d-modeli',
    'sivi-seviye-3d',
    'sivi-seviye-verileri',
    'sistem-loglari',
  ];

  // Scroll mekaniği
  // Custom ease-out animasyonu olacak şekilde güncellendi
  const handleNavigate = (id) => {
    setActiveSection(id);
    isAutoScrolling.current = true;
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
        } else {
          // End of auto-scroll
          isAutoScrolling.current = false;
          setActiveSection(id); // Ensure correct section is highlighted
        }
      }
      window.requestAnimationFrame(animateScroll);
    } else {
      isAutoScrolling.current = false;
    }
  };

  // Update active section on manual scroll
  useEffect(() => {
    function onScroll() {
      if (isAutoScrolling.current) return;
      // Find the section closest to the top
      let closestId = sectionIds[0];
      let minDist = Infinity;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top - 24); // 24px offset for scroll-mt-24
          if (rect.top - 24 <= 80 && dist < minDist) {
            minDist = dist;
            closestId = id;
          }
        }
      }
      setActiveSection(closestId);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionIds]);

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