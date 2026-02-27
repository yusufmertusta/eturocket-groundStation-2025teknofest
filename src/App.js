
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScrollToTopButton from './components/ScrollToTopButton';


function App() {

  // Now supports multiple active sections for side-by-side highlighting
  const [activeSection, setActiveSection] = useState(['sistem-ayarları']);
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
    setActiveSection([id]);
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
          setActiveSection([id]); // Ensure correct section is highlighted
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
      const scrollY = window.scrollY || window.pageYOffset;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      // If scrolled to (or near) bottom, highlight last section
      if (scrollY + windowHeight >= docHeight - 2) {
        setActiveSection([sectionIds[sectionIds.length - 1]]);
        return;
      }
      // Gather all section tops
      const sectionTops = sectionIds.map(id => {
        const el = document.getElementById(id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { id, top: rect.top - 24, bottom: rect.bottom - 24 };
      }).filter(Boolean);

      // Find all sections whose top is within the viewport (e.g., above 80px from top)
      const visibleSections = sectionTops.filter(s => s.top <= 80 && s.bottom > 40);

      // Group by top position (side-by-side = nearly same top)
      let groups = [];
      const threshold = 10; // px
      for (let i = 0; i < visibleSections.length; ++i) {
        const s = visibleSections[i];
        let found = false;
        for (let g of groups) {
          if (Math.abs(g[0].top - s.top) < threshold) {
            g.push(s);
            found = true;
            break;
          }
        }
        if (!found) groups.push([s]);
      }
      // Pick the group whose top is closest to the top of the viewport
      let active = [sectionIds[0]];
      let minDist = Infinity;
      for (let g of groups) {
        const dist = Math.abs(g[0].top);
        if (dist < minDist) {
          minDist = dist;
          active = g.map(s => s.id);
        }
      }
      setActiveSection(active);
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