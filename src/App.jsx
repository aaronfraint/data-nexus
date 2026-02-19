import { useState } from 'react'
import { FeltMap } from './components/FeltMap'
import { LayerBuilder } from './components/LayerBuilder'
import { Scatterplot } from './components/Scatterplot'
import { useStore } from './store/useStore'

export default function App() {
  const felt = useStore((s) => s.felt)
  const variables = useStore((s) => s.variables)
  const removeVariable = useStore((s) => s.removeVariable)
  const [showBuilder, setShowBuilder] = useState(false)

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="app-title">Data Nexus</h1>
        <div className="variable-list">
          {variables.map((v) => (
            <div key={v.id} className="variable-chip">
              <span>
                {v.layerName} / {v.attributeDisplayName}
              </span>
              <button
                className="chip-remove"
                onClick={() => removeVariable(v.id)}
                title="Remove variable"
              >
                ×
              </button>
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
        </div>
        <div className="chart-panel">
          <Scatterplot />
        </div>
      </main>

      {showBuilder && <LayerBuilder onClose={() => setShowBuilder(false)} />}
    </div>
  )
}
