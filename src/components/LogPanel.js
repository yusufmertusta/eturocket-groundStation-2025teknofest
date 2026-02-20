import React, { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';

const LogPanel = ({ logs }) => {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Sistem Logları</h3>
          <span className="text-sm text-gray-500">
            ({logs.length} kayıt)
          </span>
        </div>
      </div>
      
      <div 
        ref={logRef}
        className="h-72 overflow-y-auto p-6 bg-gray-50 font-mono text-sm space-y-1"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 italic text-center py-8">
            Henüz log kaydı yok...
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex space-x-3 py-1">
              <span className="text-gray-500 flex-shrink-0 w-20">
                [{log.timestamp}]
              </span>
              <span className="text-gray-800 flex-1 break-words">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogPanel;
