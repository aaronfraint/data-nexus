/**
 * Builds a GEOID -> value lookup map from a LayerFeature array.
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

export const CHOROPLETH_COLORS = ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494']

/**
 * Builds an FSL numeric choropleth style for a polygon layer.
 * Uses quantile classification with a yellow-to-blue color ramp.
 */
export function buildFslChoroplethStyle(attribute) {
  return {
    version: '2.3',
    type: 'numeric',
    config: {
      numericAttribute: attribute,
      steps: { type: 'quantiles', count: 5 },
    },
    legend: {
      displayName: 'auto',
    },
    paint: {
      color: CHOROPLETH_COLORS,
      opacity: [0.8],
      strokeColor: ['#cccccc'],
      strokeWidth: [0.5],
    },
  }
}
