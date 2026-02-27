import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const LiquidLevel3D = ({ liquidData }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const rodsRef = useRef([]);
  // const controlsRef = useRef(null); // removed unused

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // Beyaz arkaplan
    // Camera setup - daha iyi görünüm için ayarlandı
    const initWidth = mountRef.current.clientWidth || 800;
    const initHeight = mountRef.current.clientHeight || Math.round(initWidth * 0.6);
    const camera = new THREE.PerspectiveCamera(40, initWidth / initHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(initWidth, initHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = false; // Gölgeleri kapat
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    mountRef.current.appendChild(renderer.domElement);
    
    // Lighting - daha aydınlık ortam
    const ambientLight = new THREE.AmbientLight(0x606060, 0.8);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = false; // Gölgeleri kapat
    scene.add(directionalLight);
    
    // Ek ışık kaynağı
    const pointLight = new THREE.PointLight(0xffffff, 0.6, 20);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);
    
    // En alta daire ekle
    const baseCircleGeometry = new THREE.CylinderGeometry(6, 6, 0.2, 32);
    const baseCircleMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x444444,
      transparent: true,
      opacity: 0.2
    });
    const baseCircle = new THREE.Mesh(baseCircleGeometry, baseCircleMaterial);
    baseCircle.receiveShadow = false; // Gölgeleri kapat
    baseCircle.position.y = -0.1;
    scene.add(baseCircle);
    
    // Create 24 rods in grid pattern
    const rods = [];
    let rodIndex = 0;
    
    // Grid arrangement: 2-3-3-4-4-3-3-2 rods per row from bottom to top
    const rodsPerRow = [2, 3, 3, 4, 4, 3, 3, 2];
    const gridSpacingX = 2.5; // Yatay aralık daraltıldı
    const gridSpacingY = 1.2; // Dikey aralık artırıldı
    const startY = -4.2; // Başlangıç pozisyonu
    
    // Sensör numaraları eşleştirmesi (çubuk index -> sensör numarası)
    // 1.satır: 1-4, 2.satır: 2-5-3, 3.satır: 7-6-12, 4.satır: 8-10-9-11
    // 5.satır: 13-15-16-18, 6.satır: 14-19-17, 7.satır: 22-20-23, 8.satır: 21-24
    const sensorMapping = [
      4, 1,           // 1. satır (2 çubuk) - 1↔4
      3, 5, 2,        // 2. satır (3 çubuk) - 2↔3, 5 sabit
      12, 6, 7,       // 3. satır (3 çubuk) - 7↔12, 6 sabit
      11, 9, 10, 8,   // 4. satır (4 çubuk) - 8↔11, 10↔9
      18, 16, 15, 13, // 5. satır (4 çubuk) - 13↔18, 15↔16
      17, 19, 14,     // 6. satır (3 çubuk) - 14↔17, 19 sabit
      23, 20, 22,     // 7. satır (3 çubuk) - 22↔23, 20 sabit
      24, 21          // 8. satır (2 çubuk) - 21↔24
    ];
    
    for (let row = 0; row < 8; row++) {
      const rodsInThisRow = rodsPerRow[row];
      const rowY = startY + (row * gridSpacingY);
      
      // Center the rods in each row
      const totalWidth = (rodsInThisRow - 1) * gridSpacingX;
      const startX = -totalWidth / 2;
      
      for (let col = 0; col < rodsInThisRow; col++) {
        if (rodIndex >= 24) break;
        
        const x = startX + (col * gridSpacingX);
        const y = 0; // Daire üzerinde
        const z = rowY;
        
        // Her çubuk için 8 bit segment oluştur
        const rodSegments = [];
        const segmentHeight = 0.4; // Her bit segment'inin yüksekliği
        // const totalRodHeight = 8 * segmentHeight; // removed unused
        
        for (let bit = 0; bit < 8; bit++) {
          const segmentGeometry = new THREE.CylinderGeometry(0.25, 0.25, segmentHeight, 12);
          const segmentMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.3
          });
          const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
          
          // Her segment'i çubuk boyunca yerleştir
          const segmentY = y + (bit * segmentHeight) + (segmentHeight / 2);
          segment.position.set(x, segmentY, z);
          segment.castShadow = false; // Gölgeleri kapat
          segment.receiveShadow = false; // Gölgeleri kapat
          scene.add(segment);
          
          rodSegments.push(segment);
        }
        
        // Liquid level indicator kaldırıldı - sadece segment'ler kullanılacak
        
        rods.push({ 
          segments: rodSegments, 
          baseY: y + 0.5, 
          angle: Math.atan2(z, x),
          position: { x, y, z },
          sensorNumber: sensorMapping[rodIndex] // Sensör numarasını ekle
        });
        rodIndex++;
      }
    }
    
    rodsRef.current = rods;
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    // Camera setup - tüm şekli ortalamak için
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, 0);
    
    // Camera controls
    let isRotating = false; // Otomatik döndürme kapatıldı
    let rotationSpeed = 0.0005;
    
    // Mouse controls
    // let mouseX = 0;
    // let mouseY = 0;
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let currentRotationAngle = 0; // Mevcut döndürme açısını takip et
    
    // Çubukların merkezi (hexagonal pattern'ın merkezi) - dairenin merkezi
    const centerX = 0; // Dairenin sağa kaydırılmış merkezi - dik eksen buradan geçiyor
    const centerY = 0;
    const centerZ = 0;
    
    const onMouseDown = (event) => {
      isMouseDown = true;
      isRotating = false;
      
      // Mevcut kamera pozisyonundan açıyı hesapla
      const dx = camera.position.x - centerX;
      const dz = camera.position.z - centerZ;
      currentRotationAngle = Math.atan2(dz, dx);
      
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
    };
    
    const onMouseUp = () => {
      isMouseDown = false;
      isRotating = false;
    };
    
    const onMouseMove = (event) => {
      if (isMouseDown) {
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        
        // Açıyı güncelle
        currentRotationAngle += deltaX * 0.01;
        const radius = Math.sqrt(
          Math.pow(camera.position.x - centerX, 2) + 
          Math.pow(camera.position.z - centerZ, 2)
        );
        
        // Kamera pozisyonunu güncelle
        camera.position.x = centerX + Math.cos(currentRotationAngle) * radius;
        camera.position.z = centerZ + Math.sin(currentRotationAngle) * radius;
        camera.position.y += deltaY * 0.01;
        
        // Y pozisyonunu sınırla
        camera.position.y = Math.max(2, Math.min(15, camera.position.y));
        
        camera.lookAt(centerX, centerY, centerZ);
        
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
      }
    };
    
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Touch support for mobile/tablet
    const onTouchStart = (e) => {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) onMouseDown(e.touches[0]);
    };
    const onTouchEnd = () => { onMouseUp(); };
    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) onMouseMove(e.touches[0]);
    };
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });

    // Responsive resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(mountRef.current);
    } else {
      window.addEventListener('resize', handleResize);
    }
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Otomatik döndürme - çubukların merkezi etrafında
      if (isRotating) {
        const time = Date.now() * rotationSpeed;
        currentRotationAngle = time; // Otomatik döndürme için açıyı güncelle
        
        camera.position.x = centerX + Math.cos(time) * 15;
        camera.position.z = centerZ + Math.sin(time) * 15;
        camera.lookAt(centerX, centerY, centerZ);
      }
      
      renderer.render(scene, camera);
    };
    animate();
    
    // Cleanup
    const mountNode = mountRef.current;
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      if (mountNode && renderer && renderer.domElement && mountNode.contains(renderer.domElement)) {
        mountNode.removeChild(renderer.domElement);
      }
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.dispose();
    };
  }, []);

  // Update liquid levels when data changes
  useEffect(() => {
    if (!rodsRef.current || !liquidData) return;
    
    // Parse 192-bit data into 24 8-bit values
    const levels = parseLiquidData(liquidData);
    
    rodsRef.current.forEach((rodData, index) => {
      const sensorNumber = rodData.sensorNumber;
      if (sensorNumber >= 1 && sensorNumber <= 24) {
        const level = levels[sensorNumber - 1]; // Sensör numarası 1-24, array index 0-23
        
        // Her çubuğun 8 bit'ini ayrı ayrı göster (yukarıdan aşağıya)
        rodData.segments.forEach((segment, bitIndex) => {
          // Bit değerini al (0 veya 1) - yukarıdan aşağıya sıralama
          const bitValue = (level >> (7 - bitIndex)) & 1;
          
          if (bitValue === 1) {
            // Bit 1 ise yanık (mavi su rengi)
            segment.material.color.setHex(0x0066ff);
            segment.material.opacity = 0.8;
          } else {
            // Bit 0 ise sönük (gri)
            segment.material.color.setHex(0x333333);
            segment.material.opacity = 0.3;
          }
        });
        
        // Liquid level indicator kaldırıldı - sadece segment'ler kullanılıyor
      }
    });
  }, [liquidData]);

  const parseLiquidData = (data) => {
    if (!data || data.length !== 192) return new Array(24).fill(0);
    
    // Convert 192-bit data to 24 8-bit values
    const levels = [];
    for (let i = 0; i < 24; i++) {
      const startBit = i * 8;
      const endBit = startBit + 8;
      const byte = data.substring(startBit, endBit);
      levels.push(parseInt(byte, 2));
    }
    return levels;
  };

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">3D Sıvı Seviye Sensörleri</h3>
        <p className="text-sm text-gray-600">
          {liquidData ? `24 sensör, ${liquidData.length} bit veri` : 'Veri bekleniyor...'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Mouse ile döndür
        </p>
      </div>
      
      <div ref={mountRef} className="w-full h-[280px] sm:h-[400px] lg:h-[540px] border border-gray-300 rounded-lg" />
      
      {/* Sensör değerleri tablosu */}
      {liquidData && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Sensör Değerleri (8-bit)</h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 text-xs">
            {rodsRef.current && rodsRef.current.map((rodData, index) => {
              const sensorNumber = rodData.sensorNumber;
              const level = parseLiquidData(liquidData)[sensorNumber - 1] || 0;
              return (
                <div key={index} className="text-center">
                  <div className="text-gray-600">S{sensorNumber}</div>
                  <div className="text-gray-900 font-mono">{level}</div>
                  <div className="text-xs text-gray-500">
                    {level.toString(2).padStart(8, '0')}
                  </div>
                  <div 
                    className="w-full h-2 bg-gray-200 rounded mt-1"
                    style={{
                      background: `linear-gradient(to top, 
                        rgb(0, ${Math.floor(level * 0.5)}, 255), 
                        transparent)`
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidLevel3D;
