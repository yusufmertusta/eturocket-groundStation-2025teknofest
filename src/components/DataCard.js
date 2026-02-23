import React from 'react';

const DataCard = ({ title, value, unit = '', type = 'number', icon: Icon, status = 'normal' }) => {
  const getStatusClasses = () => {
    const baseClasses = 'rounded-xl border-2 transition-all duration-300 hover:shadow-md';
    
    switch (status) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-200 text-green-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-200 text-red-800`;
      default:
        return `${baseClasses} bg-white border-gray-200 text-gray-800`;
    }
  };

  const formatValue = () => {
    switch (type) {
      case 'boolean':
        return value ? 'EVET' : 'HAYIR';
      case 'coordinate':
        return typeof value === 'number' ? value.toFixed(6) : value;
      case 'number':
        return typeof value === 'number' ? value.toFixed(1) : value;
      case 'integer':
        return value;
      default:
        return value;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'boolean': return 'Boolean';
      case 'coordinate': return 'Coordinate';
      case 'integer': return 'Integer';
      case 'string': return 'String';
      default: return 'Float';
    }
  };

  return (
    <div className={`p-3 sm:p-6 ${getStatusClasses()}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs sm:text-sm font-medium opacity-80">{title}</span>
        {Icon && <Icon size={16} className="opacity-60 flex-shrink-0" />}
      </div>
      
      <div className="flex items-baseline space-x-1">
        <span className="text-xl sm:text-3xl font-bold break-all">
          {formatValue()}
        </span>
        {unit && (
          <span className="text-base sm:text-lg opacity-60 font-medium">
            {unit}
          </span>
        )}
      </div>
      
      <div className="mt-2 text-xs opacity-50 font-medium">
        {getTypeLabel()}
      </div>
    </div>
  );
};

export default DataCard;