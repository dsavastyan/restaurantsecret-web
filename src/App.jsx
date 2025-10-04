import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Restaurant from './pages/Restaurant.jsx'
import Menu from './pages/Menu.jsx'
import Search from './pages/Search.jsx'

export default function App() {
  return (
    <div className="container">
      <header className="topbar">
        <Link to="/" className="brand">RestaurantSecret</Link>
        <form action="/search" method="get" className="search">
          <input name="q" placeholder="Найти блюдо..." aria-label="Search" />
        </form>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/r/:slug" element={<Restaurant />} />
          <Route path="/r/:slug/menu" element={<Menu />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </main>
    </div>
  )
}
