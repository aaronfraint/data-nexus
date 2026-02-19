import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { buildDataMap, buildFslChoroplethStyle } from '../lib/feltUtils'

function waitForMapIdle(felt, timeout = 4000) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout)
    const unsub = felt.onMapIdle({
      handler: () => {
        clearTimeout(timer)
        unsub()
        resolve()
      },
    })
  })
}

export function LayerBuilder({ onClose }) {
  const felt = useStore((s) => s.felt)
  const variables = useStore((s) => s.variables)
  const referenceGroupId = useStore((s) => s.referenceGroupId)
  const setReferenceGroupId = useStore((s) => s.setReferenceGroupId)
  const addVariable = useStore((s) => s.addVariable)

  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState('')
  const [schema, setSchema] = useState(null)
  const [selectedAttr, setSelectedAttr] = useState('')
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!felt) return

    async function loadReferenceLayers() {
      const groups = await felt.getLayerGroups()
      const refGroup = groups.find(
        (g) => g.name?.toLowerCase() === 'reference data',
      )
      if (!refGroup) {
        const all = await felt.getLayers()
        setLayers(all)
        return
      }
      setReferenceGroupId(refGroup.id)
      const refLayers = await felt.getLayers({ ids: refGroup.layerIds })
      setLayers(refLayers.filter(Boolean))
    }

    loadReferenceLayers()
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
      // Step 1: ensure the source layer is visible, then wait for the map to
      // finish rendering tiles before reading features
      setLoadingStep('Reading features from map…')
      if (referenceGroupId) {
        await felt.setLayerGroupVisibility({ show: [referenceGroupId] })
      }
      await felt.setLayerVisibility({ show: [selectedLayerId] })
      await waitForMapIdle(felt)

      const features = await felt.getRenderedFeatures({ layerIds: [selectedLayerId] })
      console.log('[LayerBuilder] getRenderedFeatures count:', features.length)
      console.log('[LayerBuilder] first feature props:', features[0]?.properties)
      console.log('[LayerBuilder] selectedAttr:', selectedAttr)
      const data = buildDataMap(features, 'GEOID', selectedAttr)
      console.log('[LayerBuilder] data map size:', Object.keys(data).length)
      console.log('[LayerBuilder] sample data entry:', Object.entries(data)[0])

      const layer = layers.find((l) => l.id === selectedLayerId)
      const attrMeta = schema.attributes.find((a) => a.id === selectedAttr)
      const layerName = layer?.name ?? selectedLayerId
      const attrDisplayName = attrMeta?.displayName ?? selectedAttr

      // Step 2: hide reference data group and any existing variable layers
      if (referenceGroupId) {
        await felt.setLayerGroupVisibility({ hide: [referenceGroupId] })
      }
      const existingFeltLayerIds = variables.map((v) => v.feltLayerId).filter(Boolean)
      if (existingFeltLayerIds.length > 0) {
        await felt.setLayerVisibility({ hide: existingFeltLayerIds })
      }

      // Step 3: duplicate the original layer to create a new styled copy
      setLoadingStep('Creating map layer…')
      const newLayer = await felt.duplicateLayer(selectedLayerId)
      const newLayerId = newLayer?.id ?? null

      // Step 4: rename, style, and ensure the new layer is visible
      if (newLayerId) {
        await felt.updateLayer({ id: newLayerId, name: `${layerName}: ${attrDisplayName}` })
        await felt.setLayerStyle({
          id: newLayerId,
          style: buildFslChoroplethStyle(selectedAttr),
        })
        await felt.setLayerVisibility({ show: [newLayerId] })
      }

      addVariable(selectedLayerId, layerName, selectedAttr, attrDisplayName, data, newLayerId)
      onClose()
    } catch (e) {
      setError('Something went wrong. Check the console for details.')
      console.error(e)
    } finally {
      setLoadingData(false)
      setLoadingStep('')
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

        {selectedLayerId && schema && !error && (
          <p className="hint">
            Tip: zoom the map out to show all features before adding, so the
            scatterplot captures the full dataset.
          </p>
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
            {loadingData ? (loadingStep || 'Loading…') : 'Add Variable'}
          </button>
        </div>
      </div>
    </div>
  )
}
