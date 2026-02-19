import { useEffect, useRef, useState } from 'react'
import { Felt } from '@feltmaps/js-sdk'
import { FELT_MAP_ID } from '../config'

export function useFeltEmbed() {
  const containerRef = useRef(null)
  const [felt, setFelt] = useState(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    // Strict-mode-safe: skip the second mount in dev
    if (mountedRef.current) return
    mountedRef.current = true

    let instance = null

    async function embed() {
      if (!containerRef.current) return

      instance = await Felt.embed(containerRef.current, FELT_MAP_ID, {
        uiControls: { showLegend: false },
      })
      setFelt(instance)
    }

    embed()

    return () => {
      // Cleanup not strictly needed since we guard with mountedRef,
      // but keeps things tidy if the component fully unmounts
    }
  }, [])

  return { felt, containerRef }
}
