import { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useStore } from '../store/useStore'

export function Scatterplot() {
  const variables = useStore((s) => s.variables)
  const xVariableId = useStore((s) => s.xVariableId)
  const yVariableId = useStore((s) => s.yVariableId)
  const setXVariable = useStore((s) => s.setXVariable)
  const setYVariable = useStore((s) => s.setYVariable)

  const xVar = variables.find((v) => v.id === xVariableId)
  const yVar = variables.find((v) => v.id === yVariableId)

  const points = useMemo(() => {
    if (!xVar || !yVar) return []
    console.log('[Scatterplot] all vars:', variables.map(v => `id=${v.id} attr=${v.attribute} dataSize=${Object.keys(v.data).length}`))
    console.log('[Scatterplot] xVar id:', xVar.id, 'data size:', Object.keys(xVar.data).length)
    console.log('[Scatterplot] yVar id:', yVar.id, 'data size:', Object.keys(yVar.data).length)
    const result = Object.entries(xVar.data)
      .filter(([geoid]) => geoid in yVar.data)
      .map(([geoid, x]) => ({ geoid, x: Number(x), y: Number(yVar.data[geoid]) }))
    console.log('[Scatterplot] matched points:', result.length)
    return result
  }, [xVar, yVar])

  const canPlot = xVariableId && yVariableId && xVariableId !== yVariableId

  return (
    <div className="scatterplot-panel">
      <div className="axis-selectors">
        <label>
          X Axis
          <select
            value={xVariableId ?? ''}
            onChange={(e) => setXVariable(e.target.value || null)}
          >
            <option value="">Select variable...</option>
            {variables.map((v) => (
              <option key={v.id} value={v.id}>
                {v.layerName} / {v.attributeDisplayName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Y Axis
          <select
            value={yVariableId ?? ''}
            onChange={(e) => setYVariable(e.target.value || null)}
          >
            <option value="">Select variable...</option>
            {variables.map((v) => (
              <option key={v.id} value={v.id}>
                {v.layerName} / {v.attributeDisplayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chart-area">
        {canPlot && points.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 24, bottom: 48, left: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                type="number"
                name={xVar?.attributeDisplayName}
                label={{
                  value: xVar?.attributeDisplayName,
                  position: 'insideBottom',
                  offset: -16,
                }}
              />
              <YAxis
                dataKey="y"
                type="number"
                name={yVar?.attributeDisplayName}
                label={{
                  value: yVar?.attributeDisplayName,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 16,
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="tooltip">
                      <div className="tooltip-geoid">GEOID: {d.geoid}</div>
                      <div>
                        {xVar?.attributeDisplayName}: {d.x.toLocaleString()}
                      </div>
                      <div>
                        {yVar?.attributeDisplayName}: {d.y.toLocaleString()}
                      </div>
                    </div>
                  )
                }}
              />
              <Scatter data={points} fill="#4f8ef7" opacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">
            {variables.length < 2
              ? 'Add at least 2 variables to plot'
              : canPlot && points.length === 0
                ? 'No matching GEOIDs found between the selected variables'
                : 'Select X and Y axes above'}
          </div>
        )}
      </div>
    </div>
  )
}
