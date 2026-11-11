import React from 'react'

interface LayerToggleProps {
  activeLayer: 'personal' | 'general' | 'dominio'
  setActiveLayer: (layer: 'personal' | 'general' | 'dominio') => void
}

export const LayerToggle: React.FC<LayerToggleProps> = ({ activeLayer, setActiveLayer }) => {
  return (
    <div className="bg-white p-4 rounded border border-gray-200 mb-6">
      <h3 className="font-semibold mb-4">Layer Selector</h3>
      <p className="text-sm text-gray-600 mb-4">
        The active layer determines which knowledge layers are queried and where new facts are stored.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setActiveLayer('general')}
          className={`px-4 py-2 rounded border ${
            activeLayer === 'general' ? 'bg-blue-100 text-blue-800 border-blue-500' : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          General (Shared)
        </button>
        <button
          onClick={() => setActiveLayer('personal')}
          className={`px-4 py-2 rounded border ${
            activeLayer === 'personal' ? 'bg-green-100 text-green-800 border-green-500' : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          Personal (Private)
        </button>
        <button
          onClick={() => setActiveLayer('dominio')}
          className={`px-4 py-2 rounded border ${
            activeLayer === 'dominio' ? 'bg-purple-100 text-purple-800 border-purple-500' : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          Domain (Project)
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Changing the layer may affect search results and where new facts are stored.
      </p>
    </div>
  )}
