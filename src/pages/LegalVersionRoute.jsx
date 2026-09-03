import React from 'react'
import { useParams } from 'react-router-dom'
import NotFound from './NotFound.jsx'
import { legalVersions } from './legal-versions/registry.js'

export default function LegalVersionRoute() {
  const { date } = useParams()
  const VersionComponent = legalVersions[date]
  if (!VersionComponent) return <NotFound />
  return <VersionComponent />
}
