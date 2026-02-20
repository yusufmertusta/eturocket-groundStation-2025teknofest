import React from 'react';
import { Gauge, MapPin, RotateCcw, Activity, Zap, Satellite } from 'lucide-react';
import DataCard from './DataCard';

const TelemetryGrid = ({ telemetryData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* İrtifa Verileri */}
      <DataCard 
        title="Mevcut İrtifa" 
        value={telemetryData.altitude} 
        unit="m" 
        type="number"
        icon={Gauge}
        status={telemetryData.altitude > 100 ? 'warning' : 'normal'}
      />
      
      <DataCard 
        title="Maksimum İrtifa" 
        value={telemetryData.maxAltitude} 
        unit="m" 
        type="number"
        icon={Gauge}
        status="success"
      />
      
      {/* GPS Verileri */}
      <DataCard 
        title="GPS Enlem" 
        value={telemetryData.gpsLatitude} 
        type="coordinate"
        icon={MapPin}
        status={telemetryData.gpsValid ? 'success' : 'error'}
      />
      
      <DataCard 
        title="GPS Boylam" 
        value={telemetryData.gpsLongitude} 
        type="coordinate"
        icon={MapPin}
        status={telemetryData.gpsValid ? 'success' : 'error'}
      />
      
      {/* Jiroskop Verileri */}
      <DataCard 
        title="Jiroskop X" 
        value={telemetryData.gyroX} 
        unit="dps" 
        type="number"
        icon={RotateCcw}
      />
      
      <DataCard 
        title="Jiroskop Y" 
        value={telemetryData.gyroY} 
        unit="dps" 
        type="number"
        icon={RotateCcw}
      />
      
      <DataCard 
        title="Jiroskop Z" 
        value={telemetryData.gyroZ} 
        unit="dps" 
        type="number"
        icon={RotateCcw}
      />
      
      {/* Diğer Veriler */}
      <DataCard 
        title="Delta Y" 
        value={telemetryData.deltaY} 
        unit="dps" 
        type="number"
        icon={Activity}
      />
      
      <DataCard 
        title="Paraşüt Durumu" 
        value={telemetryData.fired} 
        type="boolean" 
        icon={Zap}
        status={telemetryData.fired ? 'warning' : 'normal'}
      />
      
      <DataCard 
        title="GPS Durumu" 
        value={telemetryData.gpsValid} 
        type="boolean" 
        icon={Satellite}
        status={telemetryData.gpsValid ? 'success' : 'error'}
      />
      
      <DataCard 
        title="Paket Sayısı" 
        value={telemetryData.packetCount} 
        type="integer"
        icon={Activity}
      />
      
      <DataCard 
        title="Son Güncelleme" 
        value={telemetryData.lastUpdate || '--:--:--'} 
        type="string"
        icon={Activity}
      />
    </div>
  );
};

export default TelemetryGrid;