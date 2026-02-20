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
import OnboardingWelcome from '../pages/OnboardingWelcome.tsx'
import OnboardingInstallApp from '../pages/OnboardingInstallApp.tsx'
import OnboardingProfile from '../pages/OnboardingProfile.tsx'
import Contact from '../pages/Contact.jsx'
import Legal from '../pages/Legal.jsx'
import Privacy from '../pages/Privacy.jsx'
import Tariffs from '../pages/Tariffs.jsx'
import Licenses from '../pages/Licenses.jsx'
import AccountLayout from '../pages/account/Layout.tsx'
import AccountOverview from '../pages/account/Overview.tsx'
import AccountSubscription from '../pages/account/Subscription.tsx'
import Feedback from '../pages/Feedback.jsx'

import SubscriptionHistoryPage from '../pages/account/SubscriptionHistoryPage.tsx'
import Favorites from '../pages/account/Favorites.tsx'
import Friends from '../pages/account/Friends.tsx'
import FriendFavorites from '../pages/account/FriendFavorites.tsx'
import Goals from '../pages/account/Goals.tsx'
import Statistics from '../pages/account/Statistics.tsx'
import PaymentMethods from '../pages/account/PaymentMethods.tsx'

// Defines the route tree shared between BrowserRouter and HashRouter. Keeping
// this as a separate component makes it easier to unit test in isolation.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        {/* Публичные страницы */}
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="onboarding/welcome" element={<OnboardingWelcome />} />
        <Route path="onboarding/install-app" element={<OnboardingInstallApp />} />
        <Route path="onboarding/profile/:step" element={<OnboardingProfile />} />
        <Route path="legal" element={<Legal />} />
        <Route path="tariffs" element={<Tariffs />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="licenses" element={<Licenses />} />
        <Route path="contact" element={<Contact />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="account" element={<AccountLayout />}>
          <Route index element={<AccountOverview />} />
          <Route path="profile" element={<AccountOverview />} />
          <Route path="subscription" element={<AccountSubscription />} />
          <Route path="subscription/history" element={<SubscriptionHistoryPage />} />
          <Route path="payment-methods/*" element={<PaymentMethods />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="friends" element={<Friends />} />
          <Route path="friends/:friendId" element={<FriendFavorites />} />
          <Route path="goals" element={<Goals />} />
          <Route path="statistics" element={<Statistics />} />
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
        <Route path="pay/result" element={<PaymentResult />} />
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
export default function Router({ children }) {
  const inTelegram = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp)
  const RouterImpl = inTelegram ? HashRouter : BrowserRouter

  return (
    <RouterImpl>
      <AppRoutes />
      {children}
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
