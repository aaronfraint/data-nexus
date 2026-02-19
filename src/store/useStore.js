import { create } from 'zustand'

let nextId = 1

export const useStore = create((set) => ({
  felt: null,
  variables: [],
  xVariableId: null,
  yVariableId: null,

  setFelt: (felt) => set({ felt }),

  addVariable: (layerId, layerName, attribute, attributeDisplayName, data) => {
    const id = String(nextId++)
    set((state) => ({
      variables: [
        ...state.variables,
        { id, layerId, layerName, attribute, attributeDisplayName, data },
      ],
    }))
  },

  removeVariable: (id) =>
    set((state) => ({
      variables: state.variables.filter((v) => v.id !== id),
      xVariableId: state.xVariableId === id ? null : state.xVariableId,
      yVariableId: state.yVariableId === id ? null : state.yVariableId,
    })),

  setXVariable: (id) => set({ xVariableId: id }),
  setYVariable: (id) => set({ yVariableId: id }),
}))
