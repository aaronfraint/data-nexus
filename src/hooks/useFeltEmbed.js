import { useEffect, useRef } from 'react'
import { Felt } from '@feltmaps/js-sdk'
import { useStore } from '../store/useStore'

export function useFeltEmbed(mapId) {
  const containerRef = useRef(null)
  const mountedRef = useRef(false)
  const setFelt = useStore((s) => s.setFelt)

  useEffect(() => {
    if (mountedRef.current || !containerRef.current) return
    mountedRef.current = true

    Felt.embed(containerRef.current, mapId, {
      uiControls: { showLegend: false },
    }).then(setFelt)
  }, [mapId, setFelt])

  return containerRef
}
