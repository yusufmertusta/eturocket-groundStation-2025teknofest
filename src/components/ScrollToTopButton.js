import React, { useState, useEffect } from 'react';

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Custom ease-out scroll animation
  const scrollToTop = () => {
    const start = window.scrollY;
    const duration = 600; // ms
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    let startTime = null;

    function animateScroll(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      window.scrollTo(0, start * (1 - eased));
      if (progress < 1) {
        window.requestAnimationFrame(animateScroll);
      }
    }
    window.requestAnimationFrame(animateScroll);
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white rounded-full shadow-lg p-3 hover:bg-blue-700 transition-all focus:outline-none"
      aria-label="Sayfanın başına dön"
    >
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
};

export default ScrollToTopButton;
