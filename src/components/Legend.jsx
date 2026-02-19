import { useStore } from '../store/useStore'
import { CHOROPLETH_COLORS } from '../lib/feltUtils'

export function Legend() {
  const felt = useStore((s) => s.felt)
  const variables = useStore((s) => s.variables)
  const removeVariable = useStore((s) => s.removeVariable)
  const setVariableVisibility = useStore((s) => s.setVariableVisibility)

  if (variables.length === 0) return null

  async function selectVariable(variable) {
    if (!felt) return
    const toHide = variables.filter((v) => v.id !== variable.id && v.feltLayerId).map((v) => v.feltLayerId)
    if (toHide.length > 0) await felt.setLayerVisibility({ hide: toHide })
    if (variable.feltLayerId) await felt.setLayerVisibility({ show: [variable.feltLayerId] })
    variables.forEach((v) => setVariableVisibility(v.id, v.id === variable.id))
  }

  function handleRemove(variable) {
    if (variable.feltLayerId && felt) felt.deleteLayer(variable.feltLayerId)
    removeVariable(variable.id)
  }

  // Newest variable at the top
  const ordered = [...variables].reverse()

  return (
    <div className="custom-legend">
      {ordered.map((v) => (
        <div
          key={v.id}
          className={`legend-item${v.visible ? '' : ' legend-item--hidden'}`}
          onClick={() => selectVariable(v)}
        >
          <span className="legend-radio">{v.visible ? '●' : '○'}</span>
          <div className="legend-ramp">
            {CHOROPLETH_COLORS.map((c) => (
              <div key={c} className="legend-swatch" style={{ background: c }} />
            ))}
          </div>
          <span className="legend-label">
            {v.layerName}: {v.attributeDisplayName}
          </span>
          <button
            className="legend-remove"
            onClick={(e) => { e.stopPropagation(); handleRemove(v) }}
            title="Remove variable"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
