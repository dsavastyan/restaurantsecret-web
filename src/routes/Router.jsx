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
import PaymentResult from '../pages/PaymentResult.jsx'
import Login from '../pages/Login.tsx'
import Contact from '../pages/Contact.jsx'
import Legal from '../pages/Legal.jsx'
import Privacy from '../pages/Privacy.jsx'
import Tariffs from '../pages/Tariffs.jsx'
import AccountLayout from '../pages/account/Layout.tsx'
import AccountOverview from '../pages/account/Overview.tsx'
import AccountSubscription from '../pages/account/Subscription.tsx'
import AccountSubscription from '../pages/account/Subscription.tsx'
import SubscriptionHistoryPage from '../pages/account/SubscriptionHistoryPage.tsx'
import Favorites from '../pages/account/Favorites.tsx'

// Defines the route tree shared between BrowserRouter and HashRouter. Keeping
// this as a separate component makes it easier to unit test in isolation.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        {/* Публичные страницы */}
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="legal" element={<Legal />} />
        <Route path="tariffs" element={<Tariffs />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="contact" element={<Contact />} />
        <Route path="account" element={<AccountLayout />}>
          <Route index element={<AccountOverview />} />
          <Route path="subscription" element={<AccountSubscription />} />
          <Route path="subscription/history" element={<SubscriptionHistoryPage />} />
          <Route path="favorites" element={<Favorites />} />
        </Route>

        {/* Основной контент */}
        <Route path="catalog" element={<Catalog />} />
        <Route path="restaurants" element={<Catalog />} />
        <Route path="search" element={<Search />} />
        <Route path="restaurants/:slug" element={<RestaurantPage />} />
        <Route path="restaurants/:slug/menu" element={<Menu />} />
        <Route path="r/:slug" element={<RestaurantPage />} />
        <Route path="r/:slug/menu" element={<Menu />} />
        <Route path="pay/success" element={<PaySuccess />} />
        <Route path="payments/result" element={<PaymentResult />} />

        {/* AppShell зона с табами */}
        <Route path="app" element={<Outlet />}>
          <Route index element={<Catalog />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="search" element={<Search />} />
          <Route path="favorites" element={<div>TODO: Favorites</div>} />
          <Route path="profile" element={<div>TODO: Profile</div>} />
          <Route path="*" element={<Navigate to="catalog" replace />} />
        </Route>

        {/* Легаси-ссылки */}
        <Route path="restaurant/:slug" element={<LegacyRestaurantRedirect />} />
        <Route path="restaurant/:slug/menu" element={<LegacyMenuRedirect />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
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
