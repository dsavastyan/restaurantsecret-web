import React from 'react'

export default function IOSLegalDocument({ children }) {
  return (
    <div className="ios-legal-document">
      <p className="ios-legal-document__brand">AnyEat</p>
      {children}
    </div>
  )
}
