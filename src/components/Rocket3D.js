
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Kalibrasyon değerleri - yüzeye dik ve yukarı bakan hal için referans
const CALIBRATION_OFFSETS = {
  gyroX: 83.7,  // Referans Gyro X değeri
  gyroY: 3.4,   // Referans Gyro Y değeri  
  gyroZ: 111.1  // Referans Gyro Z değeri
};

const Rocket3D = ({ gyroX, gyroY, gyroZ, altitude, isConnected }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const rocketRef = useRef(null);
  // const controlsRef = useRef(null); // removed unused

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Camera setup
    const initWidth = mountRef.current.clientWidth || 400;
    const initHeight = mountRef.current.clientHeight || 300;
    const camera = new THREE.PerspectiveCamera(50, initWidth / initHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(initWidth, initHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    mountRef.current.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create rocket model
    const rocketGroup = new THREE.Group();
    
    // Rocket body (main cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff4444,
      shininess: 100
    });
    const rocketBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    rocketBody.position.y = 1.5;
    rocketBody.castShadow = true;
    rocketGroup.add(rocketBody);
    
    // Rocket nose cone
    const noseGeometry = new THREE.ConeGeometry(0.3, 1, 8);
    const noseMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff6666,
      shininess: 100
    });
    const noseCone = new THREE.Mesh(noseGeometry, noseMaterial);
    noseCone.position.y = 3.5;
    noseCone.castShadow = true;
    rocketGroup.add(noseCone);
    
    // Fins
    const finGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.3);
    const finMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeometry, finMaterial);
      const angle = (i * Math.PI) / 2;
      fin.position.x = Math.cos(angle) * 0.4;
      fin.position.z = Math.sin(angle) * 0.4;
      fin.position.y = 0.5;
      fin.rotation.y = angle;
      fin.castShadow = true;
      rocketGroup.add(fin);
    }
    
    // Engine nozzle
    const nozzleGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 8);
    const nozzleMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    nozzle.position.y = -0.25;
    nozzle.castShadow = true;
    rocketGroup.add(nozzle);
    
    // Position rocket
    rocketGroup.position.y = 0;
    scene.add(rocketGroup);
    
    rocketRef.current = rocketGroup;
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    // Mouse controls
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let cameraAngleX = 0;
    let cameraAngleY = 0;
    
    const onMouseDown = (event) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    
    const onMouseUp = () => {
      isMouseDown = false;
    };
    
    const onMouseMove = (event) => {
      if (isMouseDown) {
        const deltaX = event.clientX - mouseX;
        const deltaY = event.clientY - mouseY;
        
        cameraAngleX += deltaY * 0.01;
        cameraAngleY += deltaX * 0.01;
        
        // Limit vertical rotation
        cameraAngleX = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraAngleX));
        
        // Update camera position
        const radius = 10;
        camera.position.x = Math.sin(cameraAngleY) * Math.cos(cameraAngleX) * radius;
        camera.position.y = Math.sin(cameraAngleX) * radius;
        camera.position.z = Math.cos(cameraAngleY) * Math.cos(cameraAngleX) * radius;
        camera.lookAt(0, 0, 0);
        
        mouseX = event.clientX;
        mouseY = event.clientY;
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

  // Update rocket rotation based on gyro data with smooth transitions
  useEffect(() => {
    if (!rocketRef.current || !isConnected) return;
    
    // Convert gyro data to rotation (in degrees) with calibration
    const calibratedGyroX = (gyroX || 0) - CALIBRATION_OFFSETS.gyroX;
    const calibratedGyroY = (gyroY || 0) - CALIBRATION_OFFSETS.gyroY;
    const calibratedGyroZ = (gyroZ || 0) - CALIBRATION_OFFSETS.gyroZ;
    
    const targetRoll = calibratedGyroX * Math.PI / 180;   // X-axis rotation
    const targetPitch = calibratedGyroY * Math.PI / 180;  // Y-axis rotation  
    const targetYaw = calibratedGyroZ * Math.PI / 180;    // Z-axis rotation
    
    // Smooth rotation animation
    const animateRotation = () => {
      if (!rocketRef.current) return;
      
      const currentRoll = rocketRef.current.rotation.x;
      const currentPitch = rocketRef.current.rotation.z;
      const currentYaw = rocketRef.current.rotation.y;
      
      // Smooth interpolation (lerp)
      const lerpFactor = 0.1;
      rocketRef.current.rotation.x = currentRoll + (targetRoll - currentRoll) * lerpFactor;
      rocketRef.current.rotation.z = currentPitch + (targetPitch - currentPitch) * lerpFactor;
      rocketRef.current.rotation.y = currentYaw + (targetYaw - currentYaw) * lerpFactor;
      
      // Update altitude position with smooth transition
      const targetAltitude = Math.max(0, (altitude || 0) / 100);
      const currentAltitude = rocketRef.current.position.y;
      rocketRef.current.position.y = currentAltitude + (targetAltitude - currentAltitude) * lerpFactor;
      
      // Continue animation if there's still movement
      if (Math.abs(targetRoll - rocketRef.current.rotation.x) > 0.001 ||
          Math.abs(targetPitch - rocketRef.current.rotation.z) > 0.001 ||
          Math.abs(targetYaw - rocketRef.current.rotation.y) > 0.001 ||
          Math.abs(targetAltitude - rocketRef.current.position.y) > 0.001) {
        requestAnimationFrame(animateRotation);
      }
    };
    
    animateRotation();
    
  }, [gyroX, gyroY, gyroZ, altitude, isConnected]);

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Roket 3D Modeli</h3>
        <p className="text-sm text-gray-600">
          Gyro X: {gyroX?.toFixed(1) || '0.0'}° | 
          Gyro Y: {gyroY?.toFixed(1) || '0.0'}° | 
          Gyro Z: {gyroZ?.toFixed(1) || '0.0'}°
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Kalibrasyon: X-{CALIBRATION_OFFSETS.gyroX}°, Y-{CALIBRATION_OFFSETS.gyroY}°, Z-{CALIBRATION_OFFSETS.gyroZ}°
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Mouse ile kamera açısını değiştir
        </p>
      </div>
      
      <div ref={mountRef} className="w-full h-[240px] sm:h-[300px] lg:h-[380px] border border-gray-300 rounded-lg bg-gray-50" />
      
      {/* Gyro data visualization */}
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Gyro Verileri</h4>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="text-gray-600">Roll (X)</div>
            <div className="text-lg font-bold text-blue-600">{gyroX?.toFixed(1) || '0.0'}°</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, Math.max(0, ((gyroX || 0) + 180) / 3.6))}%` 
                }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Pitch (Y)</div>
            <div className="text-lg font-bold text-green-600">{gyroY?.toFixed(1) || '0.0'}°</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, Math.max(0, ((gyroY || 0) + 180) / 3.6))}%` 
                }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Yaw (Z)</div>
            <div className="text-lg font-bold text-red-600">{gyroZ?.toFixed(1) || '0.0'}°</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, Math.max(0, ((gyroZ || 0) + 180) / 3.6))}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rocket3D;
