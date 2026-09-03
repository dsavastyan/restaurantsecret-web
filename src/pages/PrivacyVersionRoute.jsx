import React from 'react'
import { useParams } from 'react-router-dom'
import NotFound from './NotFound.jsx'
import { privacyVersions } from './legal-versions/registry.js'

export default function PrivacyVersionRoute() {
  const { date } = useParams()
  const VersionComponent = privacyVersions[date]
  if (!VersionComponent) return <NotFound />
  return <VersionComponent />
}
