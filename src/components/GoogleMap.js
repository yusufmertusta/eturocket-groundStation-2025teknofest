import React, { useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MapPin, Navigation } from 'lucide-react';

const MapComponent = ({ 
  rocketLat, 
  rocketLon, 
  rocketValid, 
  payloadLat, 
  payloadLon, 
  payloadValid,
  rocketAltitude,
  payloadAltitude 
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [rocketMarker, setRocketMarker] = useState(null);
  const [payloadMarker, setPayloadMarker] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat: 39.925019, lng: 32.836954 }, // Ankara koordinatları
      zoom: 15,
      mapTypeId: 'satellite',
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        {
          featureType: 'all',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    setMap(mapInstance);

    // InfoWindow oluştur
    const infoWindowInstance = new window.google.maps.InfoWindow();
    setInfoWindow(infoWindowInstance);

    return () => {
      if (rocketMarker) rocketMarker.setMap(null);
      if (payloadMarker) payloadMarker.setMap(null);
    };
  }, []);

  // Roket marker'ını güncelle
  useEffect(() => {
    if (!map || !infoWindow) return;

    // Eski marker'ı temizle
    if (rocketMarker) {
      rocketMarker.setMap(null);
    }

    if (rocketValid && rocketLat !== 0 && rocketLon !== 0) {
      const rocketPosition = { lat: rocketLat, lng: rocketLon };
      
      const newRocketMarker = new window.google.maps.Marker({
        position: rocketPosition,
        map: map,
        title: 'Roket Konumu',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        animation: window.google.maps.Animation.DROP
      });

      // Roket marker'ına tıklama olayı
      newRocketMarker.addListener('click', () => {
        const content = `
          <div style="padding: 10px; min-width: 200px;">
            <h3 style="margin: 0 0 10px 0; color: #ef4444; font-size: 16px;">
              🚀 Roket Konumu
            </h3>
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>Enlem:</strong> ${rocketLat.toFixed(6)}°
            </p>
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>Boylam:</strong> ${rocketLon.toFixed(6)}°
            </p>
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>İrtifa:</strong> ${rocketAltitude?.toFixed(1) || 'N/A'}m
            </p>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              Durum: ${rocketValid ? 'Geçerli' : 'Geçersiz'}
            </p>
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, newRocketMarker);
      });

      setRocketMarker(newRocketMarker);
    }
  }, [map, infoWindow, rocketLat, rocketLon, rocketValid, rocketAltitude]);

  // Payload marker'ını güncelle
  useEffect(() => {
    if (!map || !infoWindow) return;

    // Eski marker'ı temizle
    if (payloadMarker) {
      payloadMarker.setMap(null);
    }

    if (payloadValid && payloadLat !== 0 && payloadLon !== 0) {
      const payloadPosition = { lat: payloadLat, lng: payloadLon };
      
      const newPayloadMarker = new window.google.maps.Marker({
        position: payloadPosition,
        map: map,
        title: 'Payload Konumu',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#06b6d4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        animation: window.google.maps.Animation.DROP
      });

      // Payload marker'ına tıklama olayı
      newPayloadMarker.addListener('click', () => {
        const content = `
          <div style="padding: 10px; min-width: 200px;">
            <h3 style="margin: 0 0 10px 0; color: #06b6d4; font-size: 16px;">
              🛰️ Payload Konumu
            </h3>
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>Enlem:</strong> ${payloadLat.toFixed(6)}°
            </p>
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>Boylam:</strong> ${payloadLon.toFixed(6)}°
            </p>
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>İrtifa:</strong> ${payloadAltitude?.toFixed(1) || 'N/A'}m
            </p>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              Durum: ${payloadValid ? 'Geçerli' : 'Geçersiz'}
            </p>
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, newPayloadMarker);
      });

      setPayloadMarker(newPayloadMarker);
    }
  }, [map, infoWindow, payloadLat, payloadLon, payloadValid, payloadAltitude]);

  // Haritayı her iki konumu da gösterecek şekilde ayarla
  useEffect(() => {
    if (!map) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidPosition = false;

    if (rocketValid && rocketLat !== 0 && rocketLon !== 0) {
      bounds.extend({ lat: rocketLat, lng: rocketLon });
      hasValidPosition = true;
    }

    if (payloadValid && payloadLat !== 0 && payloadLon !== 0) {
      bounds.extend({ lat: payloadLat, lng: payloadLon });
      hasValidPosition = true;
    }

    if (hasValidPosition) {
      map.fitBounds(bounds);
      // Zoom seviyesini sınırla
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 18) map.setZoom(18);
        if (map.getZoom() < 10) map.setZoom(10);
        window.google.maps.event.removeListener(listener);
      });
    }
  }, [map, rocketLat, rocketLon, rocketValid, payloadLat, payloadLon, payloadValid]);

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
};

const render = (status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Harita yükleniyor...</p>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <Navigation className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-red-600 font-medium">Harita yüklenemedi</p>
            <p className="text-red-500 text-sm">Google Maps API anahtarı gerekli</p>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const GoogleMap = ({ 
  rocketLat, 
  rocketLon, 
  rocketValid, 
  payloadLat, 
  payloadLon, 
  payloadValid,
  rocketAltitude,
  payloadAltitude 
}) => {
  const [apiKey, setApiKey] = useState('');

  // API anahtarını environment variable'dan al
  useEffect(() => {
    const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
    setApiKey(key);
  }, []);

  if (!apiKey) {
    return (
      <div className="w-full h-96 bg-yellow-50 rounded-lg flex items-center justify-center">
        <div className="text-center p-6">
          <MapPin className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Google Maps API Anahtarı Gerekli</h3>
          <p className="text-yellow-700 text-sm mb-4">
            Harita görüntülemek için Google Maps API anahtarı gereklidir.
          </p>
          <div className="bg-yellow-100 p-3 rounded text-xs text-yellow-800">
            <p><strong>Kurulum:</strong></p>
            <p>1. .env dosyasına REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key ekleyin</p>
            <p>2. Uygulamayı yeniden başlatın</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">GPS Konum Haritası</h3>
        <p className="text-sm text-gray-600">
          Roket ve Payload GPS konumları
        </p>
        <div className="flex items-center justify-center space-x-6 mt-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Roket</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-cyan-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Payload</span>
          </div>
        </div>
      </div>
      
      <div className="h-56 sm:h-96 border border-gray-300 rounded-lg overflow-hidden">
        <Wrapper apiKey={apiKey} render={render}>
          <MapComponent
            rocketLat={rocketLat}
            rocketLon={rocketLon}
            rocketValid={rocketValid}
            payloadLat={payloadLat}
            payloadLon={payloadLon}
            payloadValid={payloadValid}
            rocketAltitude={rocketAltitude}
            payloadAltitude={payloadAltitude}
          />
        </Wrapper>
      </div>
    </div>
  );
};

export default GoogleMap;

