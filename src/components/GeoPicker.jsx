import { GEO_TYPES } from '../config'

export default function GeoPicker({ referenceLayers, selectedGeo, onSelect }) {
  // Match GEO_TYPES labels to actual layer names (case-insensitive contains)
  function findLayer(geoType) {
    return referenceLayers.find(
      (l) => l.name.toLowerCase().includes(geoType.toLowerCase())
    )
  }

  return (
    <div className="geo-picker">
      <h3>1. Choose Geography</h3>
      <div className="geo-buttons">
        {GEO_TYPES.map((geoType) => {
          const layer = findLayer(geoType)
          const isSelected = selectedGeo?.id === layer?.id
          return (
            <button
              key={geoType}
              className={`geo-button ${isSelected ? 'selected' : ''}`}
              disabled={!layer}
              onClick={() => layer && onSelect(layer)}
              title={layer ? layer.name : `${geoType} layer not found`}
            >
              {geoType}
            </button>
          )
        })}
      </div>
    </div>
  )
}
