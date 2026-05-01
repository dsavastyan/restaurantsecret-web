// src/lib/useMeta.js
// Lightweight hook to manage per-page <title>, <meta name="description">, and <link rel="canonical">.
// Call it at the top level of any page component.
import { useEffect } from 'react'

/**
 * @param {{ title?: string, description?: string, canonical?: string }} params
 */
export function useMeta({ title, description, canonical } = {}) {
  useEffect(() => {
    // Title
    if (title) {
      document.title = title
    }

    // Description
    if (description) {
      let el = document.querySelector('meta[name="description"]')
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', 'description')
        document.head.appendChild(el)
      }
      el.setAttribute('content', description)
    }

    // Canonical
    if (canonical) {
      let el = document.querySelector('link[rel="canonical"]')
      if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', 'canonical')
        document.head.appendChild(el)
      }
      el.setAttribute('href', canonical)
    }
  }, [title, description, canonical])
}
