import React, { useState } from "react";
import { ChevronDown, ChevronRight, Settings, BarChart2, MapPin, Layers, Box, FileText, List } from "lucide-react";

const sidebarItems = [
  { label: "Sistem Ayarları", id: "sistem-ayarları", icon: <Settings size={18} /> },
  { label: "Telemetri Verileri", id: "telemetri-verileri", icon: <BarChart2 size={18} /> },
  { label: "GPS Konum Haritası", id: "gps-konum-haritasi", icon: <MapPin size={18} /> },
  { label: "Paraşüt Durum Özeti", id: "parasut-durum-ozeti", icon: <Layers size={18} /> },
  { label: "Veri Kaynak Durumu", id: "veri-kaynak-durumu", icon: <List size={18} /> },
  {
    label: "3D Modeller",
    id: "3d-modeller",
    icon: <Box size={18} />,
    children: [
      { label: "Roket 3D Modeli", id: "roket-3d-modeli", icon: <Box size={16} /> },
      { label: "Payload 3D Modeli", id: "payload-3d-modeli", icon: <Box size={16} /> },
      { label: "Sıvı Seviye Sensörleri (3D)", id: "sivi-seviye-3d", icon: <Box size={16} /> },
    ],
  },
  { label: "Sıvı Seviye Verileri", id: "sivi-seviye-verileri", icon: <BarChart2 size={18} /> },
  { label: "Sistem Logları", id: "sistem-loglari", icon: <FileText size={18} /> },
];

const Sidebar = ({ onNavigate, activeId }) => {
  const [open3D, setOpen3D] = useState(true);

  return (
    <aside className="h-screen w-64 bg-white border-r shadow-sm fixed top-0 left-0 z-30 flex flex-col">
      <div className="px-6 py-4 border-b flex items-center font-bold text-lg text-blue-700 tracking-wide">
        Ground Station
        Navigation Menu
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {sidebarItems.map((item) =>
            item.children ? (
              <li key={item.id}>
                <button
                  className={`w-full flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 rounded transition group ${open3D ? "font-semibold" : ""}`}
                  onClick={() => setOpen3D((v) => !v)}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                  <span className="ml-auto">
                    {open3D ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                </button>
                {open3D && (
                  <ul className="ml-6 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <button
                          className={`w-full flex items-center px-3 py-2 text-gray-600 hover:bg-blue-100 rounded transition ${activeId === child.id ? "bg-blue-100 font-bold text-blue-700" : ""}`}
                          onClick={() => onNavigate(child.id)}
                        >
                          <span className="mr-2">{child.icon}</span>
                          {child.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ) : (
              <li key={item.id}>
                <button
                  className={`w-full flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 rounded transition ${activeId === item.id ? "bg-blue-100 font-bold text-blue-700" : ""}`}
                  onClick={() => onNavigate(item.id)}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            )
          )}
        </ul>
      </nav>
      <div className="px-6 py-3 border-t text-xs text-gray-400">v2.1</div>
    </aside>
  );
};

export default Sidebar;
