import { CHOROPLETH_COLORS } from '../config'

/**
 * Build an FSL (Felt Style Language) style object for a numeric choropleth.
 */
export function buildFslChoroplethStyle(attribute) {
  return {
    version: '2.3',
    type: 'numeric',
    config: {
      numericAttribute: attribute,
      steps: { type: 'jenks', count: 5 },
    },
    legend: { displayName: 'auto' },
    paint: {
      color: CHOROPLETH_COLORS,
      opacity: 0.8,
      strokeColor: '#cccccc',
      strokeWidth: 0.5,
    },
  }
}

/**
 * Discover layers inside the "Reference Data" layer group.
 * Returns an array of { id, name } for each layer in the group.
 */
export async function discoverReferenceLayers(felt, groupName) {
  const groups = await felt.getLayerGroups()
  const refGroup = groups.find(
    (g) => g.name.toLowerCase() === groupName.toLowerCase()
  )
  if (!refGroup) return { groupId: null, layers: [] }

  const allLayers = await felt.getLayers()
  const layers = allLayers.filter((l) => l.layerGroupId === refGroup.id)
  return { groupId: refGroup.id, layers }
}

/**
 * Get numeric attributes for a layer via its schema.
 */
export async function getNumericAttributes(felt, layerId) {
  const schema = await felt.getLayerSchema(layerId)
  if (!schema?.attributes) return []
  return schema.attributes.filter((a) => a.type === 'numeric')
}

/**
 * Read feature data from a visible layer's rendered tiles.
 * The layer must be visible for this to work.
 */
export async function readFeatureData(felt, layerId) {
  return felt.getRenderedFeatures({ layerIds: [layerId] })
}

/**
 * Wait for the map to finish rendering after a change.
 * Returns a promise that resolves on the next idle event.
 */
export function waitForMapIdle(felt) {
  return new Promise((resolve) => {
    const unsub = felt.onMapIdle({
      handler: () => {
        unsub()
        resolve()
      },
    })
  })
}
