// Checkmark shown next to a restaurant's name when its menu is kept current
// by an automated parser (see `autoUpdated` on the restaurant/menu API
// response). Ships its own tooltip bubble (state-driven, not the native
// `title` attribute) since native tooltips are slow to appear and don't work
// on tap, and this needs to read clearly on both the light catalog card and
// the dark menu hero.
import React, { useState } from 'react'

const TOOLTIP_TEXT = 'Постоянное обновление'

export default function AutoUpdatedBadge({ className = '' }) {
  const [open, setOpen] = useState(false)

  return (
    <span
      className={`auto-updated-badge ${open ? 'is-open' : ''} ${className}`.trim()}
      tabIndex={0}
      role="img"
      aria-label={TOOLTIP_TEXT}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(e) => {
        e.stopPropagation()
        setOpen((v) => !v)
      }}
    >
      <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
        <path
          d="M5 12.5l4.2 4.2L19 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="auto-updated-badge__tooltip" role="tooltip">
        {TOOLTIP_TEXT}
      </span>
    </span>
  )
}
