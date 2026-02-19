import { useState } from 'react'
import { useFeltEmbed } from './hooks/useFeltEmbed'
import MapEmbed from './components/MapEmbed'
import Sidebar from './components/Sidebar'
import Scatterplot from './components/Scatterplot'

export default function App() {
  const { felt, containerRef } = useFeltEmbed()
  const [activeLayers, setActiveLayers] = useState([])
  const [activeLayerId, setActiveLayerId] = useState(null)

  return (
    <div className="app">
      <Sidebar
        felt={felt}
        activeLayers={activeLayers}
        setActiveLayers={setActiveLayers}
        activeLayerId={activeLayerId}
        setActiveLayerId={setActiveLayerId}
      />
      <div className="map-area">
        <MapEmbed containerRef={containerRef} />
        {activeLayers.length >= 2 && (
          <Scatterplot layers={activeLayers} felt={felt} activeLayerId={activeLayerId} />
        )}
      </div>
    </div>
  )
}
