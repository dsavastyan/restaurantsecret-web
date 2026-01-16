import React from 'react'

export default function Licenses() {
  return (
    <main className="legal-page">
      <div className="container legal-container">
        <header className="legal-header">
          <p className="legal-eyebrow">Лицензии / Open source</p>
          <h1 className="legal-title">Открытые лицензии</h1>
          <p className="legal-updated">Перечень используемых open source компонентов.</p>
        </header>

        <article className="legal-content">
          <ul className="legal-list">
            <li>
              Leaflet → BSD-2-Clause (
              <a href="/third-party/leaflet-BSD-2-Clause.txt" target="_blank" rel="noreferrer">
                текст лицензии
              </a>
              )
            </li>
          </ul>
        </article>
      </div>
    </main>
  )
}
