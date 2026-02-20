/*
import axios from 'axios';

class TelemetryService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.connected = false;
    this.onDataReceived = null;
    this.onLogReceived = null;
    this.polling = null;
  }

  async connect(config) {
    try {
      const response = await axios.post(`${this.baseURL}/api/connect`, {
        teamId: config.teamId,
        loraPort: config.loraPort,
        hyiPort: config.hyiPort
      });

      if (response.data.success) {
        this.connected = true;
        this.startPolling();
        
        if (this.onLogReceived) {
          this.onLogReceived('✅ Backend bağlantısı başarılı');
        }
        
        return true;
      } else {
        throw new Error(response.data.error || 'Bağlantı hatası');
      }
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Backend bağlantı hatası: ${error.message}`);
      }
      throw error;
    }
  }

  async disconnect() {
    try {
      this.connected = false;
      this.stopPolling();
      
      await axios.post(`${this.baseURL}/api/disconnect`);
      
      if (this.onLogReceived) {
        this.onLogReceived('🔌 Backend bağlantısı kapatıldı');
      }
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Bağlantı kesme hatası: ${error.message}`);
      }
    }
  }

  startPolling() {
    if (this.polling) return;

    this.polling = setInterval(async () => {
      try {
        const response = await axios.get(`${this.baseURL}/api/telemetry`);
        
        if (response.data.success && this.onDataReceived) {
          this.onDataReceived(response.data.data);
        }
        
        // Log mesajları al
        const logsResponse = await axios.get(`${this.baseURL}/api/logs`);
        if (logsResponse.data.success && logsResponse.data.logs.length > 0) {
          logsResponse.data.logs.forEach(log => {
            if (this.onLogReceived) {
              this.onLogReceived(log);
            }
          });
        }
        
      } catch (error) {
        // Bağlantı hatası durumunda sessizce devam et
        // console.error('Polling error:', error);
      }
    }, 1000);
  }

  stopPolling() {
    if (this.polling) {
      clearInterval(this.polling);
      this.polling = null;
    }
  }

  async setAutoSend(enabled) {
    try {
      await axios.post(`${this.baseURL}/api/auto-send`, { enabled });
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Otomatik gönderim ayarı hatası: ${error.message}`);
      }
    }
  }

  async sendManualPacket() {
    try {
      const response = await axios.post(`${this.baseURL}/api/send-packet`);
      if (response.data.success && this.onLogReceived) {
        this.onLogReceived('📤 Manuel HYİ paketi gönderildi');
      }
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Manuel gönderim hatası: ${error.message}`);
      }
    }
  }
}

export default TelemetryService;
*/

/*

// TelemetryService.js
class TelemetryService {
  constructor() {
    this.baseURL = 'http://localhost:8000/api';
    this.isConnected = false;
    this.onDataReceived = null;
    this.onLogReceived = null;
    this.telemetryInterval = null;
    this.logInterval = null;
  }

  // Mevcut COM portlarını al
  async getAvailablePorts() {
    try {
      const response = await fetch(`${this.baseURL}/ports`);
      const data = await response.json();
      return data.success ? data.ports : [];
    } catch (error) {
      console.error('Port listesi alınamadı:', error);
      return [];
    }
  }

  // Sisteme bağlan
  async connect(config) {
    try {
      const response = await fetch(`${this.baseURL}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: parseInt(config.teamId),
          loraPort: config.loraPort,
          hyiPort: config.hyiPort,
          autoSend: true
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        this.isConnected = true;
        this.startDataPolling();
        if (this.onLogReceived) {
          this.onLogReceived(`✅ ${data.message}`);
        }
        return true;
      } else {
        if (this.onLogReceived) {
          this.onLogReceived(`❌ ${data.message || data.error}`);
        }
        return false;
      }
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Bağlantı hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Bağlantıyı kes
  async disconnect() {
    try {
      const response = await fetch(`${this.baseURL}/disconnect`, {
        method: 'POST',
      });

      const data = await response.json();
      
      this.isConnected = false;
      this.stopDataPolling();
      
      if (this.onLogReceived) {
        this.onLogReceived(`🔌 ${data.success ? data.message : 'Bağlantı kesildi'}`);
      }
      
      return data.success;
    } catch (error) {
      this.isConnected = false;
      this.stopDataPolling();
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Bağlantı kesme hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Telemetri verilerini al
  async getTelemetryData() {
    try {
      const response = await fetch(`${this.baseURL}/telemetry`);
      const data = await response.json();
      
      if (data.success && this.onDataReceived) {
        // Backend'den gelen veriyi frontend formatına dönüştür
        const telemetryData = {
          altitude: data.data.altitude || 0.0,
          maxAltitude: data.data.max_altitude || 0.0,
          gpsAltitude: data.data.gps_altitude || 0.0,
          deltaY: data.data.delta_y || 0.0,
          fired: data.data.fired || false,
          gyroX: data.data.gyro_x || 0.0,
          gyroY: data.data.gyro_y || 0.0,
          gyroZ: data.data.gyro_z || 0.0,
          accelX: data.data.accel_x || 0.00,
          accelY: data.data.accel_y || 0.00,
          accelZ: data.data.accel_z || 0.00,
          pitch: data.data.pitch || 0.0,
          gpsLatitude: data.data.gps_latitude || 0.0,
          gpsLongitude: data.data.gps_longitude || 0.0,
          gpsValid: data.data.gps_valid || false,
          payloadGpsAltitude: data.data.payload_gps_altitude || 0.0,
          payloadLatitude: data.data.payload_latitude || 0.0,
          payloadLongitude: data.data.payload_longitude || 0.0,
          lastUpdate: data.data.last_update || null,
          packetCount: data.data.packet_count || 0
        };
        
        this.onDataReceived(telemetryData);
      }
      
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Telemetri verisi alınamadı:', error);
      return null;
    }
  }

  // Log mesajlarını al
  async getLogs() {
    try {
      const response = await fetch(`${this.baseURL}/logs`);
      const data = await response.json();
      
      if (data.success && data.logs.length > 0 && this.onLogReceived) {
        data.logs.forEach(log => {
          this.onLogReceived(log);
        });
      }
      
      return data.success ? data.logs : [];
    } catch (error) {
      console.error('Log mesajları alınamadı:', error);
      return [];
    }
  }

  // Otomatik gönderimi aç/kapat
  async setAutoSend(enabled) {
    try {
      const response = await fetch(`${this.baseURL}/auto-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();
      
      if (this.onLogReceived) {
        this.onLogReceived(data.success ? `⚙️ ${data.message}` : `❌ ${data.message || data.error}`);
      }
      
      return data.success;
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Otomatik gönderim hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Manuel paket gönder
  async sendManualPacket() {
    try {
      const response = await fetch(`${this.baseURL}/send-packet`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (this.onLogReceived) {
        this.onLogReceived(data.success ? `📤 ${data.message}` : `❌ ${data.message || data.error}`);
      }
      
      return data.success;
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Manuel gönderim hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Sistem durumunu kontrol et
  async checkSystemStatus() {
    try {
      const response = await fetch(`${this.baseURL}/../health`);
      const data = await response.json();
      
      if (data.status === 'healthy') {
        this.isConnected = data.running;
        return {
          running: data.running,
          connected: data.connected,
          telemetry: data.telemetry,
          timestamp: data.timestamp
        };
      }
      
      return null;
    } catch (error) {
      console.error('Sistem durumu kontrol edilemedi:', error);
      return null;
    }
  }

  // Veri polling'ini başlat
  startDataPolling() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
    }
    if (this.logInterval) {
      clearInterval(this.logInterval);
    }

    // Telemetri verilerini her 1 saniyede al
    this.telemetryInterval = setInterval(() => {
      if (this.isConnected) {
        this.getTelemetryData();
      }
    }, 500);

    // Log mesajlarını her 2 saniyede al
    this.logInterval = setInterval(() => {
      if (this.isConnected) {
        this.getLogs();
      }
    }, 1000);
  }

  // Veri polling'ini durdur
  stopDataPolling() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
  }

  // Bağlantı durumunu kontrol et
  getConnectionStatus() {
    return this.isConnected;
  }

  // Service'i temizle
  cleanup() {
    this.stopDataPolling();
    this.isConnected = false;
    this.onDataReceived = null;
    this.onLogReceived = null;
  }
}

export default TelemetryService;
*/


// TelemetryService.js - Updated for Dual COM Port Support
class TelemetryService {
  constructor() {
    this.baseURL = 'http://localhost:8000/api';
    this.isConnected = false;
    this.onDataReceived = null;
    this.onLogReceived = null;
    this.telemetryInterval = null;
    this.logInterval = null;
  }

  // Mevcut COM portlarını al
  async getAvailablePorts() {
    try {
      const response = await fetch(`${this.baseURL}/ports`);
      const data = await response.json();
      return data.success ? data.ports : [];
    } catch (error) {
      console.error('Port listesi alınamadı:', error);
      return [];
    }
  }

  // Sisteme bağlan
  async connect(config) {
    try {
      const response = await fetch(`${this.baseURL}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: parseInt(config.teamId),
          loraPort: config.loraPort,
          payloadGpsPort: config.payloadGpsPort || 'none',
          hyiPort: config.hyiPort,
          autoSend: true
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        this.isConnected = true;
        this.startDataPolling();
        if (this.onLogReceived) {
          this.onLogReceived(`✅ ${data.message}`);
        }
        return true;
      } else {
        if (this.onLogReceived) {
          this.onLogReceived(`❌ ${data.message || data.error}`);
        }
        return false;
      }
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Bağlantı hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Bağlantıyı kes
  async disconnect() {
    try {
      const response = await fetch(`${this.baseURL}/disconnect`, {
        method: 'POST',
      });

      const data = await response.json();
      
      this.isConnected = false;
      this.stopDataPolling();
      
      if (this.onLogReceived) {
        this.onLogReceived(`🔌 ${data.success ? data.message : 'Bağlantı kesildi'}`);
      }
      
      return data.success;
    } catch (error) {
      this.isConnected = false;
      this.stopDataPolling();
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Bağlantı kesme hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Telemetri verilerini al
  async getTelemetryData() {
    try {
      const response = await fetch(`${this.baseURL}/telemetry`);
      const data = await response.json();
      
      if (data.success && this.onDataReceived) {
        // Backend'den gelen veriyi frontend formatına dönüştür
        const telemetryData = {
          // Roket verileri
          altitude: data.data.altitude || 0.0,
          maxAltitude: data.data.max_altitude || 0.0,
          gpsAltitude: data.data.gps_altitude || 0.0,
          deltaY: data.data.delta_y || 0.0,
          fired: data.data.fired || false,
          gyroX: data.data.gyro_x || 0.0,
          gyroY: data.data.gyro_y || 0.0,
          gyroZ: data.data.gyro_z || 0.0,
          accelX: data.data.accel_x || 0.00,
          accelY: data.data.accel_y || 0.00,
          accelZ: data.data.accel_z || 0.00,
          pitch: data.data.pitch || 0.0,
          
          // Roket GPS verileri
          gpsLatitude: data.data.gps_latitude || 0.0,
          gpsLongitude: data.data.gps_longitude || 0.0,
          gpsValid: data.data.gps_valid || false,
          
          // Payload GPS verileri
          payloadGpsAltitude: data.data.payload_gps_altitude || 0.0,
          payloadLatitude: data.data.payload_latitude || 0.0,
          payloadLongitude: data.data.payload_longitude || 0.0,
          payloadGpsValid: data.data.payload_gps_valid || false,
          
          // Sıvı seviye verileri (ALL: formatından gelen)
          allLiquidData: data.data.all_liquid_data || "",
          liquidLevels: data.data.liquid_levels || [],
          
          // Zaman damgaları ve sayaçlar
          lastUpdate: data.data.last_update || null,
          packetCount: data.data.packet_count || 0,
          payloadLastUpdate: data.data.payload_last_update || null,
          payloadPacketCount: data.data.payload_packet_count || 0
        };
        
        this.onDataReceived(telemetryData);
      }
      
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Telemetri verisi alınamadı:', error);
      return null;
    }
  }

  // Log mesajlarını al
  async getLogs() {
    try {
      const response = await fetch(`${this.baseURL}/logs`);
      const data = await response.json();
      
      if (data.success && data.logs.length > 0 && this.onLogReceived) {
        data.logs.forEach(log => {
          this.onLogReceived(log);
        });
      }
      
      return data.success ? data.logs : [];
    } catch (error) {
      console.error('Log mesajları alınamadı:', error);
      return [];
    }
  }

  // Otomatik gönderimi aç/kapat
  async setAutoSend(enabled) {
    try {
      const response = await fetch(`${this.baseURL}/auto-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();
      
      if (this.onLogReceived) {
        this.onLogReceived(data.success ? `⚙️ ${data.message}` : `❌ ${data.message || data.error}`);
      }
      
      return data.success;
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Otomatik gönderim hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Manuel paket gönder
  async sendManualPacket() {
    try {
      const response = await fetch(`${this.baseURL}/send-packet`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (this.onLogReceived) {
        this.onLogReceived(data.success ? `📤 ${data.message}` : `❌ ${data.message || data.error}`);
      }
      
      return data.success;
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Manuel gönderim hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Export verilerini dışa aktar
  async exportData() {
    try {
      const response = await fetch(`${this.baseURL}/export/txt`);
      const data = await response.json();
      if (data.success) {
        const blob = new Blob([data.data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);  
        const a = document.createElement('a');
        a.href = url;
        a.download = `telemetry_data_${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (this.onLogReceived) {
          this.onLogReceived(`📥 Veri dışa aktarıldı: ${a.download}`)
          };
        return true;
      } else { 
        if (this.onLogReceived) {
          this.onLogReceived(`❌ Dışa aktarma hatası: ${data.message || data.error}`);
        }
        return false;
      } 
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Dışa aktarma hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Sıvı seviye verilerini al
  async getLiquidData() {
    try {
      const response = await fetch(`${this.baseURL}/telemetry`);
      const data = await response.json();
      
      if (data.success) {
        return {
          allLiquidData: data.data.all_liquid_data || "",
          liquidLevels: data.data.liquid_levels || [],
          timestamp: data.data.last_update || null
        };
      }
      
      return null;
    } catch (error) {
      console.error('Sıvı seviye verisi alınamadı:', error);
      return null;
    }
  }

  // Sistem durumunu kontrol et
  async checkSystemStatus() {
    try {
      const response = await fetch(`${this.baseURL}/../health`);
      const data = await response.json();
      
      if (data.status === 'healthy') {
        this.isConnected = data.running;
        return {
          running: data.running,
          connected: data.connected,
          telemetry: data.telemetry,
          timestamp: data.timestamp
        };
      }
      
      return null;
    } catch (error) {
      console.error('Sistem durumu kontrol edilemedi:', error);
      return null;
    }
  }

  // Bağlantı durumlarını kontrol et
  async getConnectionStatus() {
    try {
      const response = await fetch(`${this.baseURL}/../health`);
      const data = await response.json();
      
      if (data.status === 'healthy') {
        return {
          lora: data.connected.lora || false,
          payloadGps: data.connected.payload_gps || false,
          hyi: data.connected.hyi || false,
          overall: data.running || false
        };
      }
      
      return {
        lora: false,
        payloadGps: false,
        hyi: false,
        overall: false
      };
    } catch (error) {
      console.error('Bağlantı durumu kontrol edilemedi:', error);
      return {
        lora: false,
        payloadGps: false,
        hyi: false,
        overall: false
      };
    }
  }

  // Payload GPS veri kalitesini değerlendir
  evaluatePayloadGpsQuality(telemetryData) {
    if (!telemetryData.payloadGpsValid) {
      return {
        quality: 'invalid',
        message: 'Payload GPS verisi geçersiz',
        color: 'red'
      };
    }

    const hasRecentUpdate = telemetryData.payloadLastUpdate && 
      new Date() - new Date(telemetryData.payloadLastUpdate) < 10000; // 10 saniye

    if (!hasRecentUpdate) {
      return {
        quality: 'stale',
        message: 'Payload GPS verisi güncel değil',
        color: 'yellow'
      };
    }

    // Roket GPS ile karşılaştırma (eğer roket GPS'i de geçerliyse)
    if (telemetryData.gpsValid) {
      const altitudeDiff = Math.abs(telemetryData.gpsAltitude - telemetryData.payloadGpsAltitude);
      const latDiff = Math.abs(telemetryData.gpsLatitude - telemetryData.payloadLatitude);
      const lonDiff = Math.abs(telemetryData.gpsLongitude - telemetryData.payloadLongitude);

      // Eğer farklar çok büyükse uyarı ver
      if (altitudeDiff > 100 || latDiff > 0.01 || lonDiff > 0.01) {
        return {
          quality: 'divergent',
          message: 'Payload GPS roket GPS\'inden çok farklı',
          color: 'orange'
        };
      }
    }

    return {
      quality: 'good',
      message: 'Payload GPS verisi iyi',
      color: 'green'
    };
  }

  // GPS mesafe hesaplama (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // Roket ve payload arasındaki mesafeyi hesapla
  getDistanceBetweenRocketAndPayload(telemetryData) {
    if (!telemetryData.gpsValid || !telemetryData.payloadGpsValid) {
      return null;
    }

    return this.calculateDistance(
      telemetryData.gpsLatitude,
      telemetryData.gpsLongitude,
      telemetryData.payloadLatitude,
      telemetryData.payloadLongitude
    );
  }

  // Veri polling'ini başlat
  startDataPolling() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
    }
    if (this.logInterval) {
      clearInterval(this.logInterval);
    }

    // Telemetri verilerini her 500ms'de al
    this.telemetryInterval = setInterval(() => {
      if (this.isConnected) {
        this.getTelemetryData();
      }
    }, 500);

    // Log mesajlarını her 1 saniyede al
    this.logInterval = setInterval(() => {
      if (this.isConnected) {
        this.getLogs();
      }
    }, 1000);
  }

  // Veri polling'ini durdur
  stopDataPolling() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
  }

  // Bağlantı durumunu kontrol et
  getConnectionStatus() {
    return this.isConnected;
  }

  // Sıvı seviye verilerini JSON olarak dışa aktar
  async exportLiquidDataAsJson() {
    try {
      const liquidData = await this.getLiquidData();
      if (liquidData) {
        const jsonContent = JSON.stringify(liquidData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `liquid_data_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (this.onLogReceived) {
          this.onLogReceived(`📥 Sıvı seviye verisi JSON olarak dışa aktarıldı`);
        }
        return true;
      }
      return false;
    } catch (error) {
      if (this.onLogReceived) {
        this.onLogReceived(`❌ Sıvı veri dışa aktarma hatası: ${error.message}`);
      }
      return false;
    }
  }

  // Sıvı seviye verisi mevcut mu kontrol et
  hasLiquidData(telemetryData) {
    return telemetryData && 
           telemetryData.allLiquidData && 
           telemetryData.allLiquidData.length > 0 &&
           telemetryData.liquidLevels && 
           telemetryData.liquidLevels.length > 0;
  }

  // Sıvı seviye veri kalitesini değerlendir
  evaluateLiquidDataQuality(telemetryData) {
    if (!this.hasLiquidData(telemetryData)) {
      return {
        quality: 'no_data',
        message: 'Sıvı seviye verisi bulunamadı',
        color: 'red'
      };
    }

    const levels = telemetryData.liquidLevels;
    const validSensors = levels.filter(level => level > 0 && level <= 255).length;
    const totalSensors = levels.length;

    if (validSensors === 0) {
      return {
        quality: 'invalid',
        message: 'Tüm sensör verileri geçersiz',
        color: 'red'
      };
    }

    const validPercentage = (validSensors / totalSensors) * 100;

    if (validPercentage >= 80) {
      return {
        quality: 'excellent',
        message: `Mükemmel veri kalitesi (${validSensors}/${totalSensors} sensör)`,
        color: 'green'
      };
    } else if (validPercentage >= 60) {
      return {
        quality: 'good',
        message: `İyi veri kalitesi (${validSensors}/${totalSensors} sensör)`,
        color: 'blue'
      };
    } else if (validPercentage >= 40) {
      return {
        quality: 'fair',
        message: `Orta veri kalitesi (${validSensors}/${totalSensors} sensör)`,
        color: 'yellow'
      };
    } else {
      return {
        quality: 'poor',
        message: `Düşük veri kalitesi (${validSensors}/${totalSensors} sensör)`,
        color: 'orange'
      };
    }
  }

  // Service'i temizle
  cleanup() {
    this.stopDataPolling();
    this.isConnected = false;
    this.onDataReceived = null;
    this.onLogReceived = null;
  }
}

export default TelemetryService;