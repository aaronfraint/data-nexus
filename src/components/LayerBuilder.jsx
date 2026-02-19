import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { getAllFeatures, buildDataMap } from '../lib/feltUtils'

export function LayerBuilder({ onClose }) {
  const felt = useStore((s) => s.felt)
  const addVariable = useStore((s) => s.addVariable)

  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState('')
  const [schema, setSchema] = useState(null)
  const [selectedAttr, setSelectedAttr] = useState('')
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!felt) return
    felt.getLayers().then(setLayers)
  }, [felt])

  useEffect(() => {
    if (!felt || !selectedLayerId) return
    setLoadingSchema(true)
    setSchema(null)
    setSelectedAttr('')
    setError(null)

    felt
      .getLayerSchema(selectedLayerId)
      .then((s) => {
        const hasGeoid = s.attributes.some((a) => a.id === 'GEOID')
        if (!hasGeoid) {
          setError('This layer does not have a GEOID column.')
        }
        setSchema(s)
      })
      .finally(() => setLoadingSchema(false))
  }, [felt, selectedLayerId])

  async function handleAdd() {
    if (!felt || !selectedLayerId || !selectedAttr) return
    setLoadingData(true)
    setError(null)

    try {
      const features = await getAllFeatures(felt, selectedLayerId, ['GEOID', selectedAttr])
      const data = buildDataMap(features, 'GEOID', selectedAttr)

      const layer = layers.find((l) => l.id === selectedLayerId)
      const attrMeta = schema.attributes.find((a) => a.id === selectedAttr)

      addVariable(
        selectedLayerId,
        layer?.name ?? selectedLayerId,
        selectedAttr,
        attrMeta?.displayName ?? selectedAttr,
        data,
      )
      onClose()
    } catch (e) {
      setError('Failed to load feature data. Check the console for details.')
      console.error(e)
    } finally {
      setLoadingData(false)
    }
  }

  const numericAttrs = schema?.attributes.filter((a) => a.type === 'numeric') ?? []

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Add Variable</h2>

        <label>
          Layer
          <select
            value={selectedLayerId}
            onChange={(e) => setSelectedLayerId(e.target.value)}
          >
            <option value="">Select a layer...</option>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        {loadingSchema && <p className="hint">Loading schema...</p>}

        {schema && numericAttrs.length > 0 && (
          <label>
            Attribute
            <select
              value={selectedAttr}
              onChange={(e) => setSelectedAttr(e.target.value)}
            >
              <option value="">Select an attribute...</option>
              {numericAttrs.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                </option>
              ))}
            </select>
          </label>
        )}

        {schema && numericAttrs.length === 0 && (
          <p className="hint">No numeric attributes found on this layer.</p>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedLayerId || !selectedAttr || loadingData || !!error}
            className="btn-primary"
          >
            {loadingData ? 'Loading data...' : 'Add Variable'}
          </button>
        </div>
      </div>
    </div>
  )
}
