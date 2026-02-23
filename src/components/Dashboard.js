import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Settings, Send, RefreshCw, Satellite } from 'lucide-react';
import LiquidLevel3D from './LiquidLevel3D';
import Rocket3D from './Rocket3D';
import Payload3D from './Payload3D';
import GoogleMap from './GoogleMap';

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [autoSend, setAutoSend] = useState(true);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [config, setConfig] = useState({
    teamId: '68',
    loraPort: 'none',
    payloadGpsPort: 'none',
    hyiPort: 'none'
  });
  
  const [telemetryData, setTelemetryData] = useState({
    altitude: 0.0,
    max_altitude: 0.0,
    gps_altitude: 0.0,
    delta_y: 0.0,
    fired: false,
    p1: false,
    p2: false,
    gyro_x: 0.0,
    gyro_y: 0.0,
    gyro_z: 0.0,
    accel_x: 0.00,
    accel_y: 0.00,
    accel_z: 0.00,
    pitch: 0.0,
    gps_latitude: 0.0,
    gps_longitude: 0.0,
    gps_valid: false,
    payload_gps_altitude: 0.0,
    payload_latitude: 0.0,
    payload_longitude: 0.0,
    payload_gps_valid: false,
    payload_gyro_x: 0.0,
    payload_gyro_y: 0.0,
    payload_gyro_z: 0.0,
    last_update: null,
    packet_count: 0,
    payload_last_update: null,
    payload_packet_count: 0,
    all_liquid_data: "",
    liquid_levels: new Array(24).fill(0)
  });
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    lora: false,
    payload_gps: false,
    hyi: false
  });

  // Backend API base URL
  const API_BASE = 'http://localhost:8000/api';

  // Mevcut portları yükle
  const loadAvailablePorts = async () => {
    try {
      const response = await fetch(`${API_BASE}/ports`);
      const data = await response.json();
      if (data.success) {
        setAvailablePorts(data.ports);
        // İlk mevcut portları varsayılan olarak seç (sadece mevcut portlar varsa)
        if (data.ports.length > 0) {
          setConfig(prev => ({
            ...prev,
            loraPort: data.ports[0]?.port || 'none',
            payloadGpsPort: 'none',
            hyiPort: 'none'
          }));
        }
      }
    } catch (error) {
      console.error('Port listesi alınamadı:', error);
      addLog('❌ Port listesi alınamadı');
    }
  };

  // Telemetri verilerini al
  const fetchTelemetry = async () => {
    try {
      const response = await fetch(`${API_BASE}/telemetry`);
      const data = await response.json();
      if (data.success) {
        setTelemetryData(data.data);
      }
    } catch (error) {
      console.error('Telemetri alınamadı:', error);
    }
  };

  // Log mesajlarını al
  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/logs`);
      const data = await response.json();
      if (data.success && data.logs.length > 0) {
        setLogs(prev => [...prev, ...data.logs].slice(-50)); // Son 50 log
      }
    } catch (error) {
      console.error('Log alınamadı:', error);
    }
  };

  // Log ekle
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), { timestamp, message, id: Date.now() }]);
  };

  // Sistem durumunu kontrol et
  const checkSystemStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/../health`);
      const data = await response.json();
      if (data.status === 'healthy') {
        setIsConnected(data.running);
        setConnectionStatus(data.connected);
        if (data.telemetry) {
          setTelemetryData(data.telemetry);
        }
      }
    } catch (error) {
      console.error('Sistem durumu alınamadı:', error);
    }
  };

  // Component mount edildiğinde
  useEffect(() => {
    loadAvailablePorts();
    checkSystemStatus();
    
    // Periyodik veri alma
    const telemetryInterval = setInterval(fetchTelemetry, 500);
    const logInterval = setInterval(fetchLogs, 1000);
    const statusInterval = setInterval(checkSystemStatus, 5000);
    
    return () => {
      clearInterval(telemetryInterval);
      clearInterval(logInterval);
      clearInterval(statusInterval);
    };
  }, []);

  // Bağlantı kur
  const handleConnect = async () => {
    if (!config.loraPort && !config.payloadGpsPort && !config.hyiPort) {
      addLog('❌ En az bir port seçilmelidir');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: parseInt(config.teamId),
          loraPort: config.loraPort || 'none',
          payloadGpsPort: config.payloadGpsPort || 'none',
          hyiPort: config.hyiPort || 'none',
          autoSend: autoSend
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsConnected(true);
        addLog(`🔌 ${data.message}`);
      } else {
        addLog(`❌ ${data.message || data.error}`);
      }
    } catch (error) {
      addLog(`❌ Bağlantı hatası: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Bağlantıyı kes
  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/disconnect`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        setIsConnected(false);
        setConnectionStatus({ lora: false, payload_gps: false, hyi: false });
        addLog(`✅ ${data.message}`);
      } else {
        addLog(`❌ ${data.message || data.error}`);
      }
    } catch (error) {
      addLog(`❌ Bağlantı kesme hatası: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Otomatik gönderimi aç/kapat
  const toggleAutoSend = async (enabled) => {
    try {
      const response = await fetch(`${API_BASE}/auto-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();
      if (data.success) {
        setAutoSend(enabled);
        addLog(`⚙️ ${data.message}`);
      } else {
        addLog(`❌ ${data.message || data.error}`);
      }
    } catch (error) {
      addLog(`❌ Otomatik gönderim hatası: ${error.message}`);
    }
  };

  // Manuel paket gönder
  const sendManualPacket = async () => {
    try {
      const response = await fetch(`${API_BASE}/send-packet`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        addLog(`📤 ${data.message}`);
      } else {
        addLog(`❌ ${data.message || data.error}`);
      }
    } catch (error) {
      addLog(`❌ Manuel gönderim hatası: ${error.message}`);
    }
  };
  
  // Dışarı aktarma
  const exportData = async () => {
    try {
      const response = await fetch(`${API_BASE}/export`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telemetry_data_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        addLog('📥 Veriler dışarı aktarıldı');
      } else {
        const errorData = await response.json();
        addLog(`❌ Dışarı aktarma hatası: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      addLog(`❌ Dışarı aktarma hatası: ${error.message}`);
    }
  };





  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">TOBB ETU TEKNOFEST GROUND STATION</h1>
                <p className="text-xs sm:text-sm text-gray-600">Dual Port Interface Dashboard v2.1</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={loadAvailablePorts}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                title="Portları Yenile"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Portları Yenile</span>
              </button>
              {isConnected ? (
                <>
                  <Wifi className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">Sistem Aktif</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <span className="text-red-600 font-medium">Sistem Kapalı</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-6 space-y-6">
        {/* Connection Status */}
        {isConnected && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Bağlantı Durumu</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className={`flex items-center space-x-2 p-3 rounded-lg ${connectionStatus.lora ? 'bg-green-50' : 'bg-gray-50'}`}>
                <Activity className={`h-4 w-4 ${connectionStatus.lora ? 'text-green-600' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${connectionStatus.lora ? 'text-green-600' : 'text-gray-600'}`}>
                  LoRa: {connectionStatus.lora ? 'Bağlı' : 'Devre Dışı'}
                </span>
              </div>
              <div className={`flex items-center space-x-2 p-3 rounded-lg ${connectionStatus.payload_gps ? 'bg-green-50' : 'bg-gray-50'}`}>
                <Satellite className={`h-4 w-4 ${connectionStatus.payload_gps ? 'text-green-600' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${connectionStatus.payload_gps ? 'text-green-600' : 'text-gray-600'}`}>
                  Payload GPS: {connectionStatus.payload_gps ? 'Bağlı' : 'Devre Dışı'}
                </span>
              </div>
              <div className={`flex items-center space-x-2 p-3 rounded-lg ${connectionStatus.hyi ? 'bg-green-50' : 'bg-gray-50'}`}>
                <Send className={`h-4 w-4 ${connectionStatus.hyi ? 'text-green-600' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${connectionStatus.hyi ? 'text-green-600' : 'text-gray-600'}`}>
                  HYİ: {connectionStatus.hyi ? 'Bağlı' : 'Devre Dışı'}
                </span>
              </div>
              
            </div>
          </div>
        )}

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Sistem Ayarları</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Takım ID
              </label>
              <input
                type="number"
                value={config.teamId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                disabled={true}
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LoRa Port (Roket)
              </label>
              <select
                value={config.loraPort}
                onChange={(e) => setConfig(prev => ({...prev, loraPort: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isConnected}
              >
                <option value="">Port Seçin</option>
                <option value="none">Yok / Devre Dışı</option>
                {availablePorts.map((port) => (
                  <option key={port.port} value={port.port}>
                    {port.port} - {port.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payload GPS Port
              </label>
              <select
                value={config.payloadGpsPort}
                onChange={(e) => setConfig(prev => ({...prev, payloadGpsPort: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isConnected}
              >
                <option value="none">Yok / Devre Dışı</option>
                {availablePorts.map((port) => (
                  <option key={port.port} value={port.port}>
                    {port.port} - {port.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HYİ Port
              </label>
              <select
                value={config.hyiPort}
                onChange={(e) => setConfig(prev => ({...prev, hyiPort: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isConnected}
              >
                <option value="">Port Seçin</option>
                <option value="none">Yok / Devre Dışı</option>
                {availablePorts.map((port) => (
                  <option key={port.port} value={port.port}>
                    {port.port} - {port.description}
                  </option>
                ))}
              </select>
            </div>
            

            
            <div className="flex items-end">
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                                     disabled={loading || (!config.loraPort && !config.payloadGpsPort && !config.hyiPort)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wifi className="h-4 w-4" />
                  )}
                  <span>{loading ? 'Bağlanıyor...' : 'Bağlan'}</span>
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                  <span>{loading ? 'Kesiliyor...' : 'Bağlantıyı Kes'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => toggleAutoSend(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={!isConnected}
              />
              <span className="text-sm text-gray-700">Otomatik HYİ Gönderimi</span>
            </label>
            
            <button
              onClick={sendManualPacket}
              disabled={!isConnected}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              <span>Manuel Gönder</span>
            </button>

             <button
              onClick={exportData}
              disabled={!isConnected}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              <span>Dışarı Aktar</span>
            </button>

            
          </div>
        </div>

        {/* Telemetry Display */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Telemetri Verileri</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Roket Verileri */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">İrtifa</p>
              <p className="text-2xl font-bold text-blue-600">{telemetryData.altitude.toFixed(1)}m</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Max İrtifa</p>
              <p className="text-2xl font-bold text-green-600">{telemetryData.max_altitude.toFixed(1)}m</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Roket GPS İrtifa</p>
              <p className="text-2xl font-bold text-green-600">{telemetryData.gps_altitude.toFixed(1)}m</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Delta Y</p>
              <p className="text-2xl font-bold text-purple-600">{telemetryData.delta_y.toFixed(1)}</p>
            </div>
            
            <div className={`p-4 rounded-lg ${telemetryData.p1 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <p className="text-sm text-gray-600">Birincil Paraşüt (P1)</p>
              <p className={`text-2xl font-bold ${telemetryData.p1 ? 'text-red-600' : 'text-gray-600'}`}>
                {telemetryData.p1 ? 'AÇIK' : 'KAPALI'}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${telemetryData.p2 ? 'bg-orange-50' : 'bg-gray-50'}`}>
              <p className="text-sm text-gray-600">İkincil Paraşüt (P2)</p>
              <p className={`text-2xl font-bold ${telemetryData.p2 ? 'text-orange-600' : 'text-gray-600'}`}>
                {telemetryData.p2 ? 'AÇIK' : 'KAPALI'}
              </p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Jiroskop X</p>
              <p className="text-2xl font-bold text-yellow-600">{telemetryData.gyro_x.toFixed(1)}</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Jiroskop Y</p>
              <p className="text-2xl font-bold text-yellow-600">{telemetryData.gyro_y.toFixed(1)}</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Jiroskop Z</p>
              <p className="text-2xl font-bold text-yellow-600">{telemetryData.gyro_z.toFixed(1)}</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">İvme X</p>
              <p className="text-2xl font-bold text-orange-600">{telemetryData.accel_x.toFixed(2)}</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">İvme Y</p>
              <p className="text-2xl font-bold text-orange-600">{telemetryData.accel_y.toFixed(2)}</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">İvme Z</p>
              <p className="text-2xl font-bold text-orange-600">{telemetryData.accel_z.toFixed(2)}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Açı</p>
              <p className="text-2xl font-bold text-purple-600">{telemetryData.pitch.toFixed(1)}°</p>
            </div>  
            
            {/* Roket GPS */}
            <div className={`p-4 rounded-lg ${telemetryData.gps_valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-600">Roket GPS</p>
              <p className={`text-lg font-bold ${telemetryData.gps_valid ? 'text-green-600' : 'text-red-600'}`}>
                {telemetryData.gps_valid ? 'VALID' : 'INVALID'}
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Roket Enlem</p>
              <p className="text-lg font-bold text-blue-600">
                {telemetryData.gps_valid ? telemetryData.gps_latitude.toFixed(6) : 'N/A'}
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Roket Boylam</p>
              <p className="text-lg font-bold text-blue-600">
                {telemetryData.gps_valid ? telemetryData.gps_longitude.toFixed(6) : 'N/A'}
              </p>
            </div>

            {/* Payload GPS Verileri */}
            <div className={`p-4 rounded-lg ${telemetryData.payload_gps_valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-600">Payload GPS</p>
              <p className={`text-lg font-bold ${telemetryData.payload_gps_valid ? 'text-green-600' : 'text-red-600'}`}>
                {telemetryData.payload_gps_valid ? 'VALID' : 'INVALID'}
              </p>
            </div>

            <div className="bg-cyan-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Payload GPS İrtifa</p>
              <p className="text-lg font-bold text-cyan-600">
                {(telemetryData.payload_latitude !== 0 || telemetryData.payload_longitude !== 0 || telemetryData.payload_gps_altitude !== 0) 
                  ? telemetryData.payload_gps_altitude.toFixed(1) + 'm' 
                  : 'N/A'}
              </p>
            </div>

            <div className="bg-cyan-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Payload Enlem</p>
              <p className="text-lg font-bold text-cyan-600">
                {(telemetryData.payload_latitude !== 0 || telemetryData.payload_longitude !== 0 || telemetryData.payload_gps_altitude !== 0)
                  ? telemetryData.payload_latitude.toFixed(6)
                  : 'N/A'}
              </p>
            </div>

            <div className="bg-cyan-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Payload Boylam</p>
              <p className="text-lg font-bold text-cyan-600">
                {(telemetryData.payload_latitude !== 0 || telemetryData.payload_longitude !== 0 || telemetryData.payload_gps_altitude !== 0)
                  ? telemetryData.payload_longitude.toFixed(6)
                  : 'N/A'}
              </p>
            </div>
            
            {/* Paket Sayaçları */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Roket Paket Sayısı</p>
              <p className="text-2xl font-bold text-gray-600">{telemetryData.packet_count}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Payload Paket Sayısı</p>
              <p className="text-2xl font-bold text-gray-600">{telemetryData.payload_packet_count || 0}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Roket Son Güncelleme</p>
              <p className="text-lg font-bold text-gray-600">
                {telemetryData.last_update || 'N/A'}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Payload Son Güncelleme</p>
              <p className="text-lg font-bold text-gray-600">
                {telemetryData.payload_last_update || 'N/A'}
              </p>
            </div>

            {/* Payload Gyro Verileri */}
            <div className="bg-cyan-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Payload Gyro X</p>
              <p className="text-2xl font-bold text-cyan-600">{telemetryData.payload_gyro_x.toFixed(1)}°</p>
            </div>
            
            <div className="bg-cyan-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Payload Gyro Y</p>
              <p className="text-2xl font-bold text-cyan-600">{telemetryData.payload_gyro_y.toFixed(1)}°</p>
            </div>
            
            <div className="bg-cyan-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Payload Gyro Z</p>
              <p className="text-2xl font-bold text-cyan-600">{telemetryData.payload_gyro_z.toFixed(1)}°</p>
            </div>
          </div>
        </div>

        {/* GPS Data Comparison */}
        {telemetryData.gps_valid && (telemetryData.payload_latitude !== 0 || telemetryData.payload_longitude !== 0 || telemetryData.payload_gps_altitude !== 0) && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">GPS Veri Karşılaştırması</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Roket GPS</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-600">İrtifa:</span> <span className="font-medium">{telemetryData.gps_altitude.toFixed(1)}m</span></p>
                  <p><span className="text-gray-600">Enlem:</span> <span className="font-medium">{telemetryData.gps_latitude.toFixed(6)}°</span></p>
                  <p><span className="text-gray-600">Boylam:</span> <span className="font-medium">{telemetryData.gps_longitude.toFixed(6)}°</span></p>
                </div>
              </div>

              <div className="bg-cyan-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-cyan-800 mb-2">Payload GPS</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-600">İrtifa:</span> <span className="font-medium">{telemetryData.payload_gps_altitude.toFixed(1)}m</span></p>
                  <p><span className="text-gray-600">Enlem:</span> <span className="font-medium">{telemetryData.payload_latitude.toFixed(6)}°</span></p>
                  <p><span className="text-gray-600">Boylam:</span> <span className="font-medium">{telemetryData.payload_longitude.toFixed(6)}°</span></p>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800 mb-2">Farklar</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-600">İrtifa Farkı:</span> <span className="font-medium">{Math.abs(telemetryData.gps_altitude - telemetryData.payload_gps_altitude).toFixed(1)}m</span></p>
                  <p><span className="text-gray-600">Enlem Farkı:</span> <span className="font-medium">{Math.abs(telemetryData.gps_latitude - telemetryData.payload_latitude).toFixed(6)}°</span></p>
                  <p><span className="text-gray-600">Boylam Farkı:</span> <span className="font-medium">{Math.abs(telemetryData.gps_longitude - telemetryData.payload_longitude).toFixed(6)}°</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Google Maps Harita */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">GPS Konum Haritası</h2>
          <GoogleMap
            rocketLat={telemetryData.gps_latitude}
            rocketLon={telemetryData.gps_longitude}
            rocketValid={telemetryData.gps_valid}
            payloadLat={telemetryData.payload_latitude}
            payloadLon={telemetryData.payload_longitude}
            payloadValid={telemetryData.payload_gps_valid}
            rocketAltitude={telemetryData.gps_altitude}
            payloadAltitude={telemetryData.payload_gps_altitude}
          />
        </div>

        {/* Paraşüt Durum Özeti */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Paraşüt Durum Özeti</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <h3 className="text-sm font-medium text-blue-800 mb-2">HYİ Durum Değeri</h3>
              <div className="text-3xl font-bold text-blue-600">
                {telemetryData.p1 && telemetryData.p2 ? '4' : 
                 telemetryData.p1 && !telemetryData.p2 ? '2' : 
                 !telemetryData.p1 && telemetryData.p2 ? '3' : '1'}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {telemetryData.p1 && telemetryData.p2 ? 'Her ikisi de açık' : 
                 telemetryData.p1 && !telemetryData.p2 ? 'Sadece P1 açık' : 
                 !telemetryData.p1 && telemetryData.p2 ? 'Sadece P2 açık' : 'Her ikisi de kapalı'}
              </p>
            </div>

            <div className={`p-4 rounded-lg text-center ${telemetryData.p1 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <h3 className="text-sm font-medium mb-2">Birincil Paraşüt (P1)</h3>
              <div className={`text-3xl font-bold ${telemetryData.p1 ? 'text-red-600' : 'text-gray-600'}`}>
                {telemetryData.p1 ? 'AÇIK' : 'KAPALI'}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Bit değeri: {telemetryData.p1 ? '1' : '0'}
              </p>
            </div>

            <div className={`p-4 rounded-lg text-center ${telemetryData.p2 ? 'bg-orange-50' : 'bg-gray-50'}`}>
              <h3 className="text-sm font-medium mb-2">İkincil Paraşüt (P2)</h3>
              <div className={`text-3xl font-bold ${telemetryData.p2 ? 'text-orange-600' : 'text-gray-600'}`}>
                {telemetryData.p2 ? 'AÇIK' : 'KAPALI'}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Bit değeri: {telemetryData.p2 ? '1' : '0'}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <h3 className="text-sm font-medium text-purple-800 mb-2">Durum Tablosu</h3>
              <div className="text-xs text-purple-600 space-y-1">
                <div>1: Her ikisi kapalı</div>
                <div>2: Sadece P1 açık</div>
                <div>3: Sadece P2 açık</div>
                <div>4: Her ikisi açık</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Source Status */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Veri Kaynak Durumu</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Activity className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">LoRa (Roket Verisi)</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${connectionStatus.lora ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {connectionStatus.lora ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-600">Port:</span> <span className="font-medium">{config.loraPort || 'Seçilmedi'}</span></p>
                <p><span className="text-gray-600">Son Paket:</span> <span className="font-medium">{telemetryData.last_update || 'Henüz veri yok'}</span></p>
                <p><span className="text-gray-600">Toplam Paket:</span> <span className="font-medium">{telemetryData.packet_count}</span></p>
                <p><span className="text-gray-600">GPS Durumu:</span> 
                  <span className={`font-medium ${telemetryData.gps_valid ? 'text-green-600' : 'text-red-600'}`}>
                    {telemetryData.gps_valid ? 'Geçerli' : 'Geçersiz'}
                  </span>
                </p>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Satellite className="h-5 w-5 text-cyan-600" />
                <h3 className="font-medium text-gray-900">Payload GPS</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${connectionStatus.payload_gps ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {connectionStatus.payload_gps ? 'Aktif' : config.payloadGpsPort === 'none' ? 'Devre Dışı' : 'Pasif'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-600">Port:</span> <span className="font-medium">{config.payloadGpsPort === 'none' ? 'Devre Dışı' : config.payloadGpsPort || 'Seçilmedi'}</span></p>
                <p><span className="text-gray-600">Son Paket:</span> <span className="font-medium">{telemetryData.payload_last_update || 'Henüz veri yok'}</span></p>
                <p><span className="text-gray-600">Toplam Paket:</span> <span className="font-medium">{telemetryData.payload_packet_count || 0}</span></p>
                <p><span className="text-gray-600">GPS Durumu:</span> 
                  <span className={`font-medium ${telemetryData.payload_gps_valid ? 'text-green-600' : 'text-red-600'}`}>
                    {telemetryData.payload_gps_valid ? 'Geçerli' : 'Geçersiz'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Modeller */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Roket 3D Modeli */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Roket 3D Modeli</h2>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Kalibrasyon Bilgileri</h3>
              <div className="text-xs text-blue-700">
                <p><strong>Referans Değerler (Yüzeye Dik):</strong></p>
                <p>Gyro X: 83.7° | Gyro Y: 3.4° | Gyro Z: 111.1°</p>
                <p className="text-blue-600 mt-1">Bu değerler modelin yüzeye dik durumunu temsil eder</p>
              </div>
            </div>
            <Rocket3D 
              gyroX={telemetryData.gyro_x}
              gyroY={telemetryData.gyro_y}
              gyroZ={telemetryData.gyro_z}
              altitude={telemetryData.altitude}
              isConnected={isConnected}
            />
          </div>

          {/* Payload 3D Modeli */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payload 3D Modeli</h2>
            <div className="mb-4 p-3 bg-cyan-50 rounded-lg">
              <h3 className="text-sm font-medium text-cyan-800 mb-2">Kalibrasyon Bilgileri</h3>
              <div className="text-xs text-cyan-700">
                <p><strong>Referans Değerler (Yüzeye Dik):</strong></p>
                <p>Roll: 92.2° | Pitch: 0.3° | Yaw: -74.0°</p>
                <p className="text-cyan-600 mt-1">Bu değerler modelin yüzeye dik durumunu temsil eder</p>
              </div>
            </div>
            <Payload3D 
              gyroX={telemetryData.payload_gyro_x}
              gyroY={telemetryData.payload_gyro_y}
              gyroZ={telemetryData.payload_gyro_z}
              altitude={telemetryData.payload_gps_altitude}
              isConnected={isConnected && connectionStatus.payload_gps}
            />
          </div>
        </div>

        {/* Sıvı Seviye Sensörleri 3D Görselleştirme */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sıvı Seviye Sensörleri (3D)</h2>
          

          
          <LiquidLevel3D liquidData={telemetryData.all_liquid_data} />
        </div>

        {/* Sıvı Seviye Veri Tablosu */}
        {telemetryData.liquid_levels && telemetryData.liquid_levels.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sıvı Seviye Verileri</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-4">
              {telemetryData.liquid_levels.map((level, index) => (
                <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600 mb-2">Sensör {index + 1}</div>
                  <div className="text-2xl font-bold text-blue-600 mb-2">{level}</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        level < 50 ? 'bg-green-500' : 
                        level < 150 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(level / 255) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((level / 255) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-xs sm:text-sm text-blue-800 flex flex-wrap gap-x-3 gap-y-1">
                <span><strong>Toplam Sensör:</strong> {telemetryData.liquid_levels.length}</span>
                <span>|</span>
                <span><strong>Ortalama Seviye:</strong> {(telemetryData.liquid_levels.reduce((a, b) => a + b, 0) / telemetryData.liquid_levels.length).toFixed(1)}</span>
                <span>|</span>
                <span><strong>Maksimum Seviye:</strong> {Math.max(...telemetryData.liquid_levels)}</span>
                <span>|</span>
                <span><strong>Minimum Seviye:</strong> {Math.min(...telemetryData.liquid_levels)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Log Panel */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sistem Logları</h2>
          <div className="bg-gray-900 text-green-400 p-2 sm:p-4 rounded-lg h-48 sm:h-64 overflow-y-auto font-mono text-xs sm:text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">Henüz log mesajı yok...</p>
            ) : (
              logs.map((log, index) => (
                <div key={log.id || index} className="mb-1">
                  <span className="text-gray-500">{log.timestamp || new Date().toLocaleTimeString()}</span>{' '}
                  <span>{typeof log === 'string' ? log : log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;