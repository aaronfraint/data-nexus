import { create } from 'zustand'

let nextId = 1

export const useStore = create((set) => ({
  felt: null,
  variables: [],
  xVariableId: null,
  yVariableId: null,
  referenceGroupId: null,

  setFelt: (felt) => set({ felt }),
  setReferenceGroupId: (id) => set({ referenceGroupId: id }),

  addVariable: (layerId, layerName, attribute, attributeDisplayName, data, feltLayerId = null) => {
    const id = String(nextId++)
    console.log('[Store] addVariable called, data size:', Object.keys(data).length, 'attr:', attribute)
    set((state) => {
      const next = [
        ...state.variables.map((v) => {
          console.log('[Store] preserving existing var id:', v.id, 'data size:', Object.keys(v.data).length)
          return { ...v, visible: false }
        }),
        { id, layerId, layerName, attribute, attributeDisplayName, data, feltLayerId, visible: true },
      ]
      return { variables: next }
    })
  },

  removeVariable: (id) =>
    set((state) => ({
      variables: state.variables.filter((v) => v.id !== id),
      xVariableId: state.xVariableId === id ? null : state.xVariableId,
      yVariableId: state.yVariableId === id ? null : state.yVariableId,
    })),

  setVariableVisibility: (id, visible) =>
    set((state) => ({
      variables: state.variables.map((v) => (v.id === id ? { ...v, visible } : v)),
    })),

  setXVariable: (id) => set({ xVariableId: id }),
  setYVariable: (id) => set({ yVariableId: id }),
}))
