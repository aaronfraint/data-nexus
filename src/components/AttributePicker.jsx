import { useState } from 'react'

export default function AttributePicker({
  attributes,
  selectedGeo,
  onAddLayers,
  loading,
  collapsed,
}) {
  const [checked, setChecked] = useState(new Set())
  const [open, setOpen] = useState(true)

  function toggle(attrId) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(attrId)) next.delete(attrId)
      else next.add(attrId)
      return next
    })
  }

  function handleAdd() {
    const selected = attributes.filter((a) => checked.has(a.id))
    onAddLayers(selected)
    setChecked(new Set())
  }

  if (!selectedGeo) return null

  // Auto-collapse when parent says so, but allow user to re-open
  const isOpen = collapsed ? open && !collapsed : open

  return (
    <div className="attribute-picker">
      <h3
        className="collapsible-header"
        onClick={() => setOpen((v) => !v)}
      >
        2. Select Attributes {isOpen ? '▾' : '▸'}
      </h3>
      {isOpen && (
        <>
          {attributes.length === 0 ? (
            <p className="muted">Loading attributes...</p>
          ) : (
            <>
              <div className="attr-list">
                {attributes.map((attr) => (
                  <label key={attr.id} className="attr-item">
                    <input
                      type="checkbox"
                      checked={checked.has(attr.id)}
                      onChange={() => toggle(attr.id)}
                    />
                    <span>{attr.displayName || attr.id}</span>
                  </label>
                ))}
              </div>
              <button
                className="add-button"
                disabled={checked.size === 0 || loading}
                onClick={handleAdd}
              >
                {loading ? 'Creating layers...' : `Add ${checked.size} Layer${checked.size !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
