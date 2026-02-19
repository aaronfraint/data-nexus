import { useState, useMemo, useEffect, useCallback, useRef } from 'react'

const WIDTH = 300
const HEIGHT = 280
const PADDING = { top: 12, right: 16, bottom: 36, left: 48 }
const PLOT_W = WIDTH - PADDING.left - PADDING.right
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom

function shortLabel(name) {
  const idx = name.indexOf('—')
  return idx !== -1 ? name.slice(idx + 1).trim() : name
}

function geoLabel(name) {
  const idx = name.indexOf('—')
  return idx !== -1 ? name.slice(0, idx).trim() : name
}

function formatTick(v) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  if (Math.abs(v) < 0.01 && v !== 0) return v.toExponential(1)
  return v.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function Scatterplot({ layers, felt, activeLayerId }) {
  const [hoveredGeoid, setHoveredGeoid] = useState(null)
  const [visibleGeoids, setVisibleGeoids] = useState(null) // null = show all
  const hoverTimerRef = useRef(null)

  // Group layers by sourceLayerId
  const sourceGroups = useMemo(() => {
    const groups = {}
    for (const l of layers) {
      if (!groups[l.sourceLayerId]) {
        groups[l.sourceLayerId] = {
          label: geoLabel(l.name),
          layers: [],
        }
      }
      groups[l.sourceLayerId].layers.push(l)
    }
    return groups
  }, [layers])

  const sourceIds = Object.keys(sourceGroups)

  const plottableSourceIds = sourceIds.filter(
    (id) => sourceGroups[id].layers.length >= 2
  )

  const [selectedSource, setSelectedSource] = useState(
    plottableSourceIds[0] ?? null
  )

  useEffect(() => {
    if (selectedSource && plottableSourceIds.includes(selectedSource)) return
    setSelectedSource(plottableSourceIds[0] ?? null)
  }, [plottableSourceIds.join(',')])

  const availableLayers = selectedSource
    ? sourceGroups[selectedSource]?.layers ?? []
    : []

  const [xId, setXId] = useState(null)
  const [yId, setYId] = useState(null)

  useEffect(() => {
    setXId(availableLayers[0]?.id ?? null)
    setYId(availableLayers[1]?.id ?? null)
  }, [selectedSource])

  useEffect(() => {
    const ids = new Set(availableLayers.map((l) => l.id))
    if (xId && !ids.has(xId)) setXId(availableLayers[0]?.id ?? null)
    if (yId && !ids.has(yId)) setYId(availableLayers[1]?.id ?? availableLayers[0]?.id ?? null)
  }, [availableLayers])

  const xLayer = availableLayers.find((l) => l.id === xId)
  const yLayer = availableLayers.find((l) => l.id === yId)

  // All points (unfiltered)
  const allPoints = useMemo(() => {
    if (!xLayer?.data || !yLayer?.data) return []
    const pts = []
    for (const geoid of Object.keys(xLayer.data)) {
      const xVal = xLayer.data[geoid]
      const yVal = yLayer.data[geoid]
      if (xVal != null && yVal != null) {
        pts.push({ geoid, x: xVal, y: yVal })
      }
    }
    return pts
  }, [xLayer, yLayer])

  // featureIdMap maps GEOID → bbox [minLng, minLat, maxLng, maxLat]
  const bboxMap = useMemo(() => {
    return xLayer?.featureIdMap ?? yLayer?.featureIdMap ?? {}
  }, [xLayer, yLayer])

  // Filter to only visible features
  const points = useMemo(() => {
    if (!visibleGeoids) return allPoints
    return allPoints.filter((p) => visibleGeoids.has(p.geoid))
  }, [allPoints, visibleGeoids])

  // Compute which GEOIDs are in the current viewport using stored bbox data
  const updateVisibleGeoids = useCallback(async () => {
    if (!felt || Object.keys(bboxMap).length === 0) return
    try {
      const vp = await felt.getViewport()
      const { latitude, longitude } = vp.center
      const zoom = vp.zoom

      // Approximate viewport bounds from center + zoom
      // ~4 tiles wide, ~3 tiles tall at 256px per tile
      const lngSpan = 360 / Math.pow(2, zoom) * 4
      const latSpan = lngSpan * 0.65

      const vpMinLng = longitude - lngSpan / 2
      const vpMaxLng = longitude + lngSpan / 2
      const vpMinLat = latitude - latSpan / 2
      const vpMaxLat = latitude + latSpan / 2

      const geoids = new Set()
      for (const [geoid, bbox] of Object.entries(bboxMap)) {
        if (!bbox) continue
        const [fMinLng, fMinLat, fMaxLng, fMaxLat] = bbox
        // Check if feature bbox overlaps viewport
        if (fMaxLng >= vpMinLng && fMinLng <= vpMaxLng &&
            fMaxLat >= vpMinLat && fMinLat <= vpMaxLat) {
          geoids.add(String(geoid))
        }
      }
      setVisibleGeoids(geoids)
    } catch {
      setVisibleGeoids(null)
    }
  }, [felt, bboxMap])

  // Listen for viewport changes
  useEffect(() => {
    if (!felt) return

    updateVisibleGeoids()

    const unsub = felt.onViewportMoveEnd({
      handler: () => updateVisibleGeoids(),
    })
    return () => unsub()
  }, [felt, updateVisibleGeoids])

  // Compute domains from VISIBLE points so axes rescale
  const xMin = points.length > 0 ? Math.min(...points.map((p) => p.x)) : (xLayer?.min ?? 0)
  const xMax = points.length > 0 ? Math.max(...points.map((p) => p.x)) : (xLayer?.max ?? 1)
  const yMin = points.length > 0 ? Math.min(...points.map((p) => p.y)) : (yLayer?.min ?? 0)
  const yMax = points.length > 0 ? Math.max(...points.map((p) => p.y)) : (yLayer?.max ?? 1)

  function sx(v) {
    if (xMax === xMin) return PADDING.left + PLOT_W / 2
    return PADDING.left + ((v - xMin) / (xMax - xMin)) * PLOT_W
  }

  function sy(v) {
    if (yMax === yMin) return PADDING.top + PLOT_H / 2
    return PADDING.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H
  }

  // Highlight layer management
  const allHighlightIdsRef = useRef(new Set())
  const activeHoverRef = useRef(null)

  const clearAllHighlights = useCallback(async () => {
    if (!felt || allHighlightIdsRef.current.size === 0) return
    const ids = [...allHighlightIdsRef.current]
    allHighlightIdsRef.current.clear()
    await Promise.allSettled(ids.map((id) => felt.deleteLayer(id)))
  }, [felt])

  const handlePointEnter = useCallback(
    (geoid) => {
      clearTimeout(hoverTimerRef.current)
      setHoveredGeoid(geoid)
      activeHoverRef.current = geoid

      if (!felt) return
      const bbox = bboxMap[geoid]
      if (!bbox) return

      ;(async () => {
        await clearAllHighlights()

        if (activeHoverRef.current !== geoid) return

        const [minLng, minLat, maxLng, maxLat] = bbox
        const geojson = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [minLng, minLat],
                  [maxLng, minLat],
                  [maxLng, maxLat],
                  [minLng, maxLat],
                  [minLng, minLat],
                ]],
              },
              properties: {},
            },
          ],
        }

        try {
          const result = await felt.createLayersFromGeoJson({
            source: { type: 'geoJsonData', data: geojson },
            name: '_highlight',
            geometryStyles: {
              Polygon: {
                paint: {
                  color: '#e74c3c',
                  opacity: 0.6,
                  strokeColor: '#e74c3c',
                  strokeWidth: 3,
                },
              },
            },
          })
          for (const l of result.layers) {
            allHighlightIdsRef.current.add(l.id)
          }
          if (result.layerGroup?.id) {
            allHighlightIdsRef.current.add(result.layerGroup.id)
          }
        } catch (err) {
          console.error('highlight error:', err)
        }
      })()
    },
    [felt, bboxMap, clearAllHighlights]
  )

  const handlePointLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => {
      setHoveredGeoid(null)
      activeHoverRef.current = null
      clearAllHighlights()
    }, 150)
  }, [clearAllHighlights])

  if (plottableSourceIds.length === 0) return null

  const hoveredPoint = hoveredGeoid
    ? points.find((p) => p.geoid === hoveredGeoid)
    : null

  return (
    <div className="scatterplot-overlay">
      <div className="scatter-geo-tabs">
        {sourceIds.map((id) => {
          const group = sourceGroups[id]
          const hasEnough = group.layers.length >= 2
          return (
            <button
              key={id}
              className={`scatter-geo-tab ${selectedSource === id ? 'active' : ''}`}
              disabled={!hasEnough}
              onClick={() => setSelectedSource(id)}
              title={
                hasEnough
                  ? `${group.layers.length} variables`
                  : 'Need 2+ variables to plot'
              }
            >
              {group.label}
            </button>
          )
        })}
      </div>
      <div className="scatter-controls">
        <label>
          X
          <select value={xId ?? ''} onChange={(e) => setXId(e.target.value)}>
            {availableLayers.map((l) => (
              <option key={l.id} value={l.id}>
                {shortLabel(l.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Y
          <select value={yId ?? ''} onChange={(e) => setYId(e.target.value)}>
            {availableLayers.map((l) => (
              <option key={l.id} value={l.id}>
                {shortLabel(l.name)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="scatter-count">
        {points.length} of {allPoints.length} in view
      </div>
      <svg width={WIDTH} height={HEIGHT} className="scatter-svg">
        {/* Axes */}
        <line
          x1={PADDING.left} y1={PADDING.top + PLOT_H}
          x2={PADDING.left + PLOT_W} y2={PADDING.top + PLOT_H}
          stroke="#ccc" strokeWidth={1}
        />
        <line
          x1={PADDING.left} y1={PADDING.top}
          x2={PADDING.left} y2={PADDING.top + PLOT_H}
          stroke="#ccc" strokeWidth={1}
        />

        {/* X ticks */}
        <text x={PADDING.left} y={HEIGHT - 4} fontSize={10} fill="#888" textAnchor="start">
          {formatTick(xMin)}
        </text>
        <text x={PADDING.left + PLOT_W} y={HEIGHT - 4} fontSize={10} fill="#888" textAnchor="end">
          {formatTick(xMax)}
        </text>

        {/* Y ticks */}
        <text x={PADDING.left - 6} y={PADDING.top + PLOT_H} fontSize={10} fill="#888" textAnchor="end" dominantBaseline="auto">
          {formatTick(yMin)}
        </text>
        <text x={PADDING.left - 6} y={PADDING.top + 4} fontSize={10} fill="#888" textAnchor="end" dominantBaseline="hanging">
          {formatTick(yMax)}
        </text>

        {/* Axis labels */}
        {xLayer && (
          <text x={PADDING.left + PLOT_W / 2} y={HEIGHT - 18} fontSize={10} fill="#555" textAnchor="middle" fontWeight={600}>
            {shortLabel(xLayer.name)}
          </text>
        )}
        {yLayer && (
          <text x={12} y={PADDING.top + PLOT_H / 2} fontSize={10} fill="#555" textAnchor="middle" fontWeight={600}
            transform={`rotate(-90, 12, ${PADDING.top + PLOT_H / 2})`}>
            {shortLabel(yLayer.name)}
          </text>
        )}

        {/* Points */}
        {points.map((p) => (
          <circle
            key={p.geoid}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={hoveredGeoid === p.geoid ? 5 : 2.5}
            fill={hoveredGeoid === p.geoid ? '#e74c3c' : '#253494'}
            fillOpacity={hoveredGeoid === p.geoid ? 1 : 0.5}
            stroke="#fff"
            strokeWidth={hoveredGeoid === p.geoid ? 1.5 : 0.3}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => handlePointEnter(p.geoid)}
            onMouseLeave={handlePointLeave}
          />
        ))}

        {/* Hovered point tooltip */}
        {hoveredPoint && (
          <g>
            <rect
              x={sx(hoveredPoint.x) + 8}
              y={sy(hoveredPoint.y) - 24}
              width={Math.max(
                (`${shortLabel(xLayer?.name ?? '')}: ${formatTick(hoveredPoint.x)}`).length * 5.5,
                (`${shortLabel(yLayer?.name ?? '')}: ${formatTick(hoveredPoint.y)}`).length * 5.5
              ) + 8}
              height={28}
              rx={3}
              fill="rgba(0,0,0,0.8)"
            />
            <text x={sx(hoveredPoint.x) + 12} y={sy(hoveredPoint.y) - 13} fontSize={9} fill="#fff">
              {shortLabel(xLayer?.name ?? '')}: {formatTick(hoveredPoint.x)}
            </text>
            <text x={sx(hoveredPoint.x) + 12} y={sy(hoveredPoint.y) - 3} fontSize={9} fill="#fff">
              {shortLabel(yLayer?.name ?? '')}: {formatTick(hoveredPoint.y)}
            </text>
          </g>
        )}

        {points.length === 0 && xLayer && yLayer && (
          <text x={PADDING.left + PLOT_W / 2} y={PADDING.top + PLOT_H / 2} fontSize={11} fill="#999" textAnchor="middle">
            No features in view
          </text>
        )}
      </svg>
    </div>
  )
}
