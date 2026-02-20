import React from 'react';
import { Settings } from 'lucide-react';

const ConfigPanel = ({ 
  config, 
  setConfig, 
  isConnected, 
  autoSend, 
  onConnect, 
  onDisconnect, 
  onToggleAutoSend 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Konfigürasyon</h2>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Takım ID
            </label>
            <input
              type="text"
              value={config.teamId}
              onChange={(e) => setConfig({...config, teamId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isConnected}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LoRa Port
            </label>
            <input
              type="text"
              value={config.loraPort}
              onChange={(e) => setConfig({...config, loraPort: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isConnected}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HYİ Port
            </label>
            <input
              type="text"
              value={config.hyiPort}
              onChange={(e) => setConfig({...config, hyiPort: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isConnected}
            />
          </div>
          
          <div>
            {!isConnected ? (
              <button
                onClick={onConnect}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Bağlan
              </button>
            ) : (
              <button
                onClick={onDisconnect}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Bağlantıyı Kes
              </button>
            )}
          </div>
        </div>
        
        {isConnected && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => onToggleAutoSend(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Otomatik HYİ Gönderimi
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;