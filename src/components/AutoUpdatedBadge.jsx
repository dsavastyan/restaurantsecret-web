// Checkmark shown next to a restaurant's name when its menu is kept current
// by an automated parser (see `autoUpdated` on the restaurant/menu API
// response). Uses the native `title` attribute for the tooltip, matching the
// pattern already used for icon buttons elsewhere (e.g. the restaurant
// website link in Catalog.jsx).
import React from 'react'

export default function AutoUpdatedBadge({ className = '' }) {
  return (
    <span
      className={`auto-updated-badge ${className}`.trim()}
      title="Постоянное обновление"
      aria-label="Постоянное обновление"
      role="img"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.14" />
        <path
          d="M7.5 12.5l3 3 6-6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
