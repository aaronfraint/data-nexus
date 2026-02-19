/**
 * Fetches all features from a layer, handling pagination automatically.
 */
export async function getAllFeatures(felt, layerId, select) {
  const features = []
  let pagination = null

  do {
    const result = await felt.getFeatures({
      layerId,
      select,
      pageSize: 1000,
      ...(pagination ? { pagination } : {}),
    })
    features.push(...result.features)
    pagination = result.nextPage
  } while (pagination)

  return features
}

/**
 * Builds a GEOID -> value lookup map from a features array.
 */
export function buildDataMap(features, geoidKey, valueKey) {
  const map = {}
  for (const feature of features) {
    const geoid = feature.properties?.[geoidKey]
    const value = feature.properties?.[valueKey]
    if (geoid != null && value != null) {
      map[geoid] = value
    }
  }
  return map
}
