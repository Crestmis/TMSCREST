import { useState } from 'react'
import { ChevronRight, Filter } from 'lucide-react'

// Slim toggle that hides the summary strip + filter fields. Collapsed on every
// page load. The search box stays outside this, always visible.
export default function CollapsibleControls({ activeCount = 0, onClear, label = 'Filters and summary', children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="cc-wrap">
      <div className="cc-bar">
        <button className="cc-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <ChevronRight size={15} className={open ? 'cc-caret open' : 'cc-caret'} />
          <span>{label}</span>
          {activeCount > 0 && <span className="cc-count">{activeCount} active</span>}
        </button>
        {activeCount > 0 && onClear && (
          <button className="cc-clear" onClick={onClear}>
            <Filter size={13} /> Clear
          </button>
        )}
      </div>
      {open && <div className="cc-body">{children}</div>}
    </div>
  )
}
