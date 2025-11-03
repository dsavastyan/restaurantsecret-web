// Application-level router wiring. The Router component picks between
// BrowserRouter (regular web) and HashRouter (Telegram WebApp) and renders the
// full route tree.
import React from 'react'
import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import AppShell from '../app/AppShell.jsx'
import Landing from '../pages/Landing.jsx'
import Catalog from '../pages/Catalog.jsx'
import RestaurantPage from '../pages/RestaurantPage.jsx'
import Menu from '../pages/Menu.jsx'
import Search from '../pages/Search.jsx'
import PaySuccess from '../pages/PaySuccess.jsx'
import PayMockSuccess from '../pages/PayMockSuccess.jsx'
import Login from '../pages/Login.tsx'
import Account from '../pages/Account.tsx'

// Defines the route tree shared between BrowserRouter and HashRouter. Keeping
// this as a separate component makes it easier to unit test in isolation.
function AppRoutes() {
  return (
    <Routes>
      {/* Публичные маршруты */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/account" element={<Account />} />

      {/* Основной layout с Paywall и шапкой */}
      <Route element={<AppShell />}>
        <Route path="restaurants" element={<Catalog />} />
        <Route path="r/:slug" element={<RestaurantPage />} />
        <Route path="r/:slug/menu" element={<Menu />} />
        <Route path="search" element={<Search />} />
        <Route path="pay/success" element={<PaySuccess />} />
        <Route path="pay/mock-success" element={<PayMockSuccess />} />

        {/* AppShell зона с табами */}
        <Route path="app" element={<Outlet />}>
          <Route index element={<Catalog />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="search" element={<Search />} />
          <Route path="favorites" element={<div>TODO: Favorites</div>} />
          <Route path="profile" element={<div>TODO: Profile</div>} />
          <Route path="*" element={<Navigate to="catalog" replace />} />
        </Route>
      </Route>

      {/* Легаси-ссылки */}
      <Route path="/restaurant/:slug" element={<LegacyRestaurantRedirect />} />
      <Route path="/restaurant/:slug/menu" element={<LegacyMenuRedirect />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Chooses the router implementation based on the environment and mounts the
// AppRoutes component.
export default function Router() {
  const inTelegram = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp)
  const RouterImpl = inTelegram ? HashRouter : BrowserRouter

  return (
    <RouterImpl>
      <AppRoutes />
    </RouterImpl>
  )
}

// Redirect old `/restaurant/:slug` paths to the new `/r/:slug` structure.
function LegacyRestaurantRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/r/${slug}`} replace />
}

// Redirect old `/restaurant/:slug/menu` paths to `/r/:slug/menu`.
function LegacyMenuRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/r/${slug}/menu`} replace />
}
