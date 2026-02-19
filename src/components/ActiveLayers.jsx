import { CHOROPLETH_COLORS } from '../config'

const gradientStyle = {
  background: `linear-gradient(to right, ${CHOROPLETH_COLORS.join(', ')})`,
}

function formatValue(v) {
  if (v == null) return '—'
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (Math.abs(v) < 0.01) return v.toExponential(1)
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function ColorRamp({ min, max }) {
  return (
    <div className="color-ramp">
      <div className="color-ramp-bar" style={gradientStyle} />
      <div className="color-ramp-labels">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  )
}

export default function ActiveLayers({ layers, activeId, onSelect, onRemove }) {
  if (layers.length === 0) return null

  const activeLayer = layers.find((l) => l.id === activeId)

  return (
    <div className="active-layers">
      <h3>Active Layers</h3>
      <ul className="layer-list">
        {layers.map((layer) => (
          <li key={layer.id} className={`layer-item ${activeId === layer.id ? 'active' : ''}`}>
            <label className="layer-toggle">
              <input
                type="radio"
                name="active-layer"
                checked={activeId === layer.id}
                onChange={() => onSelect(layer.id)}
              />
              <span className="layer-name">{layer.name}</span>
            </label>
            <button
              className="remove-button"
              onClick={() => onRemove(layer.id)}
              title="Remove layer"
            >
              &times;
            </button>
          </li>
        ))}
      </ul>
      {activeLayer && (
        <ColorRamp min={activeLayer.min} max={activeLayer.max} />
      )}
    </div>
  )
}
