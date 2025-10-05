import React from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import AppShell from '../app/AppShell.jsx'
import Landing from '../pages/Landing.jsx'
import Catalog from '../pages/Catalog.jsx'
import RestaurantPage from '../pages/RestaurantPage.jsx'
import Menu from '../pages/Menu.jsx'
import Search from '../pages/Search.jsx'
import PaySuccess from '../pages/PaySuccess.jsx'
import PayMockSuccess from '../pages/PayMockSuccess.jsx'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AppShell />}>
        <Route path="/app" element={<Catalog />} />
        <Route path="/restaurants" element={<Catalog />} />
        <Route path="/restaurant/:slug" element={<RestaurantPage />} />
        <Route path="/restaurant/:slug/menu" element={<Menu />} />
        <Route path="/search" element={<Search />} />
        <Route path="/pay/success" element={<PaySuccess />} />
        <Route path="/pay/mock-success" element={<PayMockSuccess />} />
      </Route>
      <Route path="/r/:slug" element={<LegacyRestaurantRedirect />} />
      <Route path="/r/:slug/menu" element={<LegacyMenuRedirect />} />
      <Route path="/app/*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

export default function Router() {
  const inTelegram = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp)
  const RouterImpl = inTelegram ? HashRouter : BrowserRouter

  return (
    <RouterImpl>
      <AppRoutes />
    </RouterImpl>
  )
}

function LegacyRestaurantRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/restaurant/${slug}`} replace />
}

function LegacyMenuRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/restaurant/${slug}/menu`} replace />
}
