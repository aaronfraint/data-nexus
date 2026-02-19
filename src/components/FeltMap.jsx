import { FELT_MAP_ID } from '../config'
import { useFeltEmbed } from '../hooks/useFeltEmbed'

export function FeltMap() {
  const containerRef = useFeltEmbed(FELT_MAP_ID)

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
