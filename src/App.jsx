import { useState } from 'react'
import { FeltMap } from './components/FeltMap'
import { LayerBuilder } from './components/LayerBuilder'
import { Legend } from './components/Legend'
import { Scatterplot } from './components/Scatterplot'
import { useStore } from './store/useStore'

export default function App() {
  const felt = useStore((s) => s.felt)
  const variables = useStore((s) => s.variables)
  const [showBuilder, setShowBuilder] = useState(false)

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="app-title">Data Nexus</h1>
        <div className="variable-list">
          {variables.map((v) => (
            <div key={v.id} className="variable-chip">
              <span>
                {v.layerName}: {v.attributeDisplayName}
              </span>
            </div>
          ))}
        </div>
        <button
          className="btn-primary"
          disabled={!felt}
          onClick={() => setShowBuilder(true)}
        >
          + Add Variable
        </button>
      </header>

      <main className="main">
        <div className="map-panel">
          <FeltMap />
          <Legend />
        </div>
        <div className="chart-panel">
          <Scatterplot />
        </div>
      </main>

      {showBuilder && <LayerBuilder onClose={() => setShowBuilder(false)} />}
    </div>
  )
}
