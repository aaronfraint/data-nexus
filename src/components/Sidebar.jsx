import { useState, useEffect, useCallback } from 'react'
import { GEO_TYPES } from '../config'
import {
  getNumericAttributes,
  buildFslChoroplethStyle,
  waitForMapIdle,
} from '../lib/feltUtils'
import GeoPicker from './GeoPicker'
import AttributePicker from './AttributePicker'
import ActiveLayers from './ActiveLayers'

export default function Sidebar({ felt, activeLayers, setActiveLayers, activeLayerId, setActiveLayerId }) {
  const [referenceLayers, setReferenceLayers] = useState([])
  const [selectedGeo, setSelectedGeo] = useState(null)
  const [attributes, setAttributes] = useState([])
  const [loading, setLoading] = useState(false)
  const [attrCollapsed, setAttrCollapsed] = useState(false)

  // Discover layers on mount — match by name against GEO_TYPES
  useEffect(() => {
    if (!felt) return

    async function discover() {
      const allLayers = await felt.getLayers()
      const matched = allLayers.filter((l) =>
        GEO_TYPES.some(
          (geo) => l.name.toLowerCase() === geo.toLowerCase()
        )
      )
      setReferenceLayers(matched)
    }

    discover()
  }, [felt])

  // Load attributes when a geography is selected
  useEffect(() => {
    if (!felt || !selectedGeo) return
    setAttributes([])
    setAttrCollapsed(false)
    getNumericAttributes(felt, selectedGeo.id).then((attrs) => {
      console.log(`Schema for "${selectedGeo.name}" (first 5):`)
      attrs.slice(0, 5).forEach((a) => console.log(`  id="${a.id}"  displayName="${a.displayName}"`))
      setAttributes(attrs)
    })
  }, [felt, selectedGeo])

  const handleSelectGeo = useCallback((layer) => {
    setSelectedGeo(layer)
  }, [])

  // Show only the selected layer, hide all others
  const handleSelectActive = useCallback(
    async (layerId) => {
      if (!felt) return
      setActiveLayerId(layerId)

      const toHide = activeLayers
        .filter((l) => l.id !== layerId)
        .map((l) => l.id)
      const visibility = { show: [layerId] }
      if (toHide.length > 0) visibility.hide = toHide

      await felt.setLayerVisibility(visibility)
    },
    [felt, activeLayers]
  )

  const handleAddLayers = useCallback(
    async (selectedAttrs) => {
      if (!felt || !selectedGeo) return
      setLoading(true)

      try {
        // Make the source layer visible so we can read its data
        await felt.setLayerVisibility({ show: [selectedGeo.id] })
        await waitForMapIdle(felt)

        // Read features to compute min/max per attribute
        const features = await felt.getRenderedFeatures({
          layerIds: [selectedGeo.id],
        })
        console.log(`getRenderedFeatures for "${selectedGeo.name}": ${features.length} features`)
        // Log raw property types for first feature
        if (features.length > 0) {
          const sample = features[0].properties
          const keys = Object.keys(sample).slice(0, 8)
          console.log('Sample feature properties (types):')
          keys.forEach((k) => console.log(`  ${k}: ${typeof sample[k]} = ${JSON.stringify(sample[k])}`))
        }

        let lastLayerId = null

        // Build GEOID → feature ID mapping (shared across all attrs from this source)
        const featureIdMap = {}
        if (features.length > 0) {
          const sample = features[0]
          console.log('Sample feature keys:', Object.keys(sample))
          console.log('Has geometry:', !!sample.geometry, 'type:', sample.geometry?.type)
        }
        for (const f of features) {
          const geoid = f.properties?.GEOID
          if (geoid != null) {
            featureIdMap[geoid] = f.bbox ?? null
          }
        }
        console.log(`featureIdMap: ${Object.keys(featureIdMap).length} entries (of ${features.length} features)`)

        for (const attr of selectedAttrs) {
          // Build GEOID → value map and compute min/max
          const dataMap = {}
          for (const f of features) {
            const geoid = f.properties?.GEOID
            const val = f.properties?.[attr.id]
            if (geoid != null && val != null && !isNaN(val)) {
              dataMap[geoid] = Number(val)
            }
          }
          const values = Object.values(dataMap)
          const min = values.length > 0 ? Math.min(...values) : 0
          const max = values.length > 0 ? Math.max(...values) : 0

          // Duplicate the source layer
          const result = await felt.duplicateLayer(selectedGeo.id)
          const newLayerId = typeof result === 'string' ? result : result?.id ?? result
          console.log('duplicateLayer returned:', result, '→ id:', newLayerId)

          // Rename it
          const layerName = `${selectedGeo.name} — ${attr.displayName || attr.id}`
          await felt.updateLayer({ id: newLayerId, name: layerName })

          // Apply choropleth style
          const style = buildFslChoroplethStyle(attr.id)
          console.log(`Applying style for "${attr.id}" on layer ${newLayerId}:`, JSON.stringify(style))
          await felt.setLayerStyle({ id: newLayerId, style })
          console.log(`Style applied successfully for "${attr.id}"`)

          lastLayerId = newLayerId

          setActiveLayers((prev) => [
            ...prev,
            {
              id: newLayerId,
              name: layerName,
              attribute: attr,
              sourceLayerId: selectedGeo.id,
              visible: false,
              min,
              max,
              data: dataMap,
              featureIdMap,
            },
          ])
        }

        // Hide the source layer and all layers except the last one added
        const allIds = activeLayers.map((l) => l.id)
        const hideIds = [...allIds, selectedGeo.id]
        await felt.setLayerVisibility({
          show: lastLayerId ? [lastLayerId] : [],
          hide: hideIds,
        })

        if (lastLayerId) setActiveLayerId(lastLayerId)
        setAttrCollapsed(true)
      } catch (err) {
        console.error('Error creating choropleth layers:', err)
      } finally {
        setLoading(false)
      }
    },
    [felt, selectedGeo, activeLayers, setActiveLayers]
  )

  const handleRemove = useCallback(
    async (layerId) => {
      if (!felt) return
      try {
        await felt.deleteLayer(layerId)
      } catch (err) {
        console.error('Error deleting layer:', err)
      }
      setActiveLayers((prev) => {
        const next = prev.filter((l) => l.id !== layerId)
        // If we removed the active layer, activate the first remaining one
        if (activeLayerId === layerId && next.length > 0) {
          const newActive = next[0].id
          setActiveLayerId(newActive)
          felt.setLayerVisibility({ show: [newActive] })
        } else if (next.length === 0) {
          setActiveLayerId(null)
        }
        return next
      })
    },
    [felt, activeLayerId, setActiveLayers]
  )

  return (
    <div className="sidebar">
      <h2>Data Nexus</h2>
      <GeoPicker
        referenceLayers={referenceLayers}
        selectedGeo={selectedGeo}
        onSelect={handleSelectGeo}
      />
      <AttributePicker
        attributes={attributes}
        selectedGeo={selectedGeo}
        onAddLayers={handleAddLayers}
        loading={loading}
        collapsed={attrCollapsed}
      />
      <ActiveLayers
        layers={activeLayers}
        activeId={activeLayerId}
        onSelect={handleSelectActive}
        onRemove={handleRemove}
      />
    </div>
  )
}
